import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { Dao } from '../src/db/dao';
import { AppConfigService } from '../src/config/config.module';
import { ProceduresService } from '../src/procedures/procedures.service';
import { SessionsService } from '../src/sessions/sessions.service';
import { ChatService } from '../src/chat/chat.service';
import { buildCards, numbersCoveredByCards } from '../src/chat/cards';
import { projectRecordForLlm } from '../src/chat/projection';
import type { ChatEvent } from '../src/chat/types';
import type { LlmAssistantMessage, LlmClient } from '../src/openrouter/types';

// --- stubs ---
function scriptedLlm(responses: LlmAssistantMessage[]): LlmClient {
  let i = 0;
  return {
    available: true,
    async complete() {
      return responses[Math.min(i++, responses.length - 1)];
    },
    async smokeTestToolCalling() {
      return { ok: true, detail: 'stub' };
    },
  };
}
const noLlm: LlmClient = {
  available: false,
  async complete() {
    throw new Error('unavailable');
  },
  async smokeTestToolCalling() {
    return { ok: false, detail: 'no key' };
  },
};

function harness(agentLlm: LlmClient) {
  const db = new Database(join(process.cwd(), 'var', 'opengov.db'));
  const cfg = new AppConfigService();
  const dao = new Dao(db as any);
  const procedures = new ProceduresService(dao, noLlm, cfg); // no-op rerank in tests
  const sessions = new SessionsService(dao);
  const chat = new ChatService(procedures, sessions, agentLlm);
  return { chat, procedures, sessions, close: () => db.close() };
}

async function run(chat: ChatService, message: string) {
  const events: ChatEvent[] = [];
  await chat.handleChat(undefined, message, (e) => events.push(e));
  const prose = events.filter((e) => e.type === 'token').map((e: any) => e.text).join('');
  const cards = events.filter((e) => e.type === 'card').map((e: any) => e.payload);
  const done = events.find((e) => e.type === 'done') as any;
  const sessionId = (events.find((e) => e.type === 'session') as any)?.session_id as string;
  const warnings = events.filter((e) => e.type === 'warning').map((e: any) => e.message);
  return { events, prose, cards, done, sessionId, warnings };
}

// --- pure card guard ---

test('numbersCoveredByCards — card-backed numbers pass, invented numbers flagged', () => {
  const record: any = {
    code: '1.004222', name: 'Đăng ký thường trú', executing_agency: 'Công an cấp Xã',
    source: { url: 'https://dichvucong.gov.vn/x', updated_at: '2026-04-27T00:00:00Z' },
    channels: [{ method: 'ONLINE', fees: [{ type: 'FEE', value_vnd: 10000, text: '' }], processing: { qty: 7, unit: 'WORKING_DAY' } }],
    deadlines: [{ id: 'd', label: 'x', qty: 60, unit: 'DAY', source_quote: 'q' }],
    legal_basis: [{ code: '68/2020/QH14', name: 'Luật Cư trú 2020' }],
  };
  const cards = buildCards(record);
  assert.ok(cards.some((c) => c.type === 'fees'));
  assert.equal(numbersCoveredByCards('Phí 10.000đ, xử lý 7 ngày, hạn 60 ngày. Căn cứ 68/2020/QH14.', cards).ok, true);
  const bad = numbersCoveredByCards('Phí là 999999 đồng.', cards);
  assert.equal(bad.ok, false);
  assert.ok(bad.offending.includes('999999'));
});

// --- integration: in-KB answer has cards + citation, and prose numbers ⊆ cards ---

test('/chat "nhập hộ khẩu" — answers with cards + citation; prose numbers all card-backed', async () => {
  const { chat, close } = harness(
    scriptedLlm([
      { role: 'assistant', content: null, tool_calls: [{ id: 'c1', name: 'search_procedures', arguments: { query: 'nhập hộ khẩu' } }] },
      { role: 'assistant', content: null, tool_calls: [{ id: 'c2', name: 'get_procedure', arguments: { code: '1.004222' } }] },
      {
        role: 'assistant',
        content:
          'Để nhập hộ khẩu (đăng ký thường trú), bạn chuẩn bị Tờ khai thay đổi thông tin cư trú và giấy tờ chứng minh chỗ ở hợp pháp. ' +
          'Phí, thời hạn và cơ quan tiếp nhận xem ở các thẻ bên dưới. ' +
          'Căn cứ: Luật Cư trú 2020 (68/2020/QH14). Tra cứu tại https://dichvucong.gov.vn.\n' +
          '[[CARDS: 1.004222=procedure,fees]]',
      },
    ]),
  );
  try {
    const { prose, cards, done, warnings } = await run(chat, 'nhập hộ khẩu cần giấy tờ gì');
    assert.ok((done?.cards_count ?? 0) > 0, 'emits at least one card');
    assert.ok(cards.some((c: any) => c.type === 'procedure' && c.payload.source_url), 'a procedure card carries source_url');
    // Selected subset + forced legal_fragments — nothing else.
    assert.deepEqual(
      cards.map((c: any) => c.type),
      ['procedure', 'fees', 'legal_fragments'],
      'only selected cards (plus forced fragments) are emitted, in canonical order',
    );
    assert.equal(warnings.includes('cards_tail_missing'), false);
    assert.doesNotMatch(prose, /\[\[CARDS/, 'the tail is stripped from the stream');
    assert.match(prose, /68\/2020\/QH14/, 'prose cites a legal code');
    assert.match(prose, /dichvucong\.gov\.vn/, 'prose links the portal');
    const guard = numbersCoveredByCards(prose, cards);
    assert.equal(guard.ok, true, `prose numbers must be card-backed; offending=${guard.offending.join(',')}`);
  } finally {
    close();
  }
});

// --- card selection: fail-safe, checklist filtering, tail hygiene ---

test('/chat missing [[CARDS]] tail — lean fail-safe (procedure + fragments) + warning', async () => {
  const { chat, close } = harness(
    scriptedLlm([
      { role: 'assistant', content: null, tool_calls: [{ id: 'c1', name: 'get_procedure', arguments: { code: '1.004222' } }] },
      { role: 'assistant', content: 'Anh/chị xem thông tin thủ tục ở thẻ bên dưới.' },
    ]),
  );
  try {
    const { cards, warnings } = await run(chat, 'đăng ký thường trú');
    assert.deepEqual(cards.map((c: any) => c.type), ['procedure', 'legal_fragments']);
    assert.ok(warnings.includes('cards_tail_missing'), 'selection failure is surfaced as a warning');
  } finally {
    close();
  }
});

test('/chat checklist card — filtered by case_facts updated in the same turn; tail not persisted', async () => {
  const { chat, sessions, close } = harness(
    scriptedLlm([
      { role: 'assistant', content: null, tool_calls: [{ id: 'c1', name: 'get_procedure', arguments: { code: '1.004222' } }] },
      {
        role: 'assistant',
        content: null,
        tool_calls: [{ id: 'c2', name: 'update_case_facts', arguments: { facts: { truong_hop: 'thue_muon_o_nho', viet_kieu_khong_ho_chieu: false } } }],
      },
      {
        role: 'assistant',
        content: 'Với trường hợp thuê nhà, anh/chị chuẩn bị theo thẻ giấy tờ bên dưới.\n[[CARDS: 1.004222=procedure,checklist]]',
      },
    ]),
  );
  try {
    const { cards, prose, sessionId } = await run(chat, 'tôi thuê nhà, muốn đăng ký thường trú');
    assert.deepEqual(cards.map((c: any) => c.type), ['procedure', 'checklist', 'legal_fragments']);
    const checklist = cards.find((c: any) => c.type === 'checklist') as any;
    const groupIds = checklist.payload.groups.map((g: any) => g.id);
    assert.ok(groupIds.includes('ho_so_thue_muon_o_nho'), 'matching case group present');
    assert.equal(groupIds.includes('ho_so_so_huu'), false, 'non-matching case group dropped');
    const toKhai = checklist.payload.groups.find((g: any) => g.id === 'to_khai');
    assert.deepEqual(toKhai.items.map((it: any) => it.id), ['to_khai_ct01'], 'CT01 selected, CT02 dropped');
    assert.doesNotMatch(prose, /\[\[CARDS/);
    const stored = sessions.get(sessionId);
    assert.ok(stored, 'session persisted');
    const lastAssistant = stored!.messages.filter((m) => m.role === 'assistant').pop();
    assert.doesNotMatch(lastAssistant!.content, /\[\[CARDS/, 'the tail is stripped from history');
  } finally {
    close();
  }
});

test('/chat follow-up turn — tail code resolved from DB when get_procedure was not re-called', async () => {
  const { chat, close } = harness(
    scriptedLlm([
      {
        role: 'assistant',
        content: 'Thủ tục này giải quyết trong ít ngày làm việc, xem thẻ bên dưới.\n[[CARDS: 1.004222=procedure,processing]]',
      },
    ]),
  );
  try {
    const { cards, warnings } = await run(chat, 'mất bao lâu thì xong?');
    assert.deepEqual(cards.map((c: any) => c.type), ['procedure', 'processing', 'legal_fragments']);
    assert.equal(warnings.includes('cards_tail_missing'), false);
  } finally {
    close();
  }
});

test('projection — LLM record drops raw blobs and review, cards keep the full record', () => {
  const { procedures, close } = harness(noLlm);
  try {
    const full = procedures.getProcedure('1.004222')!;
    assert.ok(full.steps_raw, 'seeded record still carries steps_raw');
    const projected = projectRecordForLlm(full) as any;
    assert.equal('steps_raw' in projected, false);
    assert.ok(projected.checklist_raw, 'checklist_raw kept — per-case legal detail lives there');
    assert.equal('review' in projected, false);
    assert.ok(projected.case_facts_schema, 'clarify-first questions survive projection');
    assert.ok(projected.legal_fragments?.length, 'legal fragments survive projection');
    for (const b of projected.legal_basis ?? []) {
      assert.ok(String(b.name ?? '').length <= 121, 'legal_basis names are clamped');
    }
    // The full record is untouched (cards read from it).
    assert.ok(full.checklist_raw && full.review);
    assert.ok(
      JSON.stringify(projected).length < JSON.stringify(full).length,
      'projection never exceeds the full record',
    );
  } finally {
    close();
  }
});

// --- integration: out-of-KB is fail-closed ---

test('/chat out-of-KB — says "không có trong dữ liệu" + portal link, no cards', async () => {
  const { chat, close } = harness(
    scriptedLlm([
      {
        role: 'assistant',
        content: 'Xin lỗi, thông tin này hiện không có trong dữ liệu. Vui lòng tra cứu tại https://dichvucong.gov.vn.',
      },
    ]),
  );
  try {
    const { prose, done } = await run(chat, 'thủ tục ly hôn thuận tình cần gì');
    assert.match(prose, /không có trong dữ liệu/);
    assert.match(prose, /dichvucong\.gov\.vn/);
    assert.equal(done?.cards_count, 0);
  } finally {
    close();
  }
});

// --- degraded mode (no API key) still fails closed with a portal link ---

test('/chat degraded (no LLM) — fail-closed message + portal link', async () => {
  const { chat, close } = harness(noLlm);
  try {
    const { prose, done } = await run(chat, 'bất kỳ câu hỏi nào');
    assert.match(prose, /Cổng Dịch vụ công|dichvucong\.gov\.vn/);
    assert.equal(done?.cards_count, 0);
  } finally {
    close();
  }
});
