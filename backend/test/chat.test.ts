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
  return { chat, close: () => db.close() };
}

async function run(chat: ChatService, message: string) {
  const events: ChatEvent[] = [];
  await chat.handleChat(undefined, message, (e) => events.push(e));
  const prose = events.filter((e) => e.type === 'token').map((e: any) => e.text).join('');
  const cards = events.filter((e) => e.type === 'card').map((e: any) => e.payload);
  const done = events.find((e) => e.type === 'done') as any;
  return { events, prose, cards, done };
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
          'Căn cứ: Luật Cư trú 2020 (68/2020/QH14). Tra cứu tại https://dichvucong.gov.vn.',
      },
    ]),
  );
  try {
    const { prose, cards, done } = await run(chat, 'nhập hộ khẩu cần giấy tờ gì');
    assert.ok((done?.cards_count ?? 0) > 0, 'emits at least one card');
    assert.ok(cards.some((c: any) => c.type === 'procedure' && c.payload.source_url), 'a procedure card carries source_url');
    assert.match(prose, /68\/2020\/QH14/, 'prose cites a legal code');
    assert.match(prose, /dichvucong\.gov\.vn/, 'prose links the portal');
    const guard = numbersCoveredByCards(prose, cards);
    assert.equal(guard.ok, true, `prose numbers must be card-backed; offending=${guard.offending.join(',')}`);
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
