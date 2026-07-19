import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGuideCard, parseDirectiveTail } from '../src/chat/cards';

const SCHEMA = {
  fields: {
    so_dinh_danh_ca_nhan: { label: 'Số định danh cá nhân' },
    ho_ten_chu_ho: { label: 'Họ, chữ đệm và tên chủ hộ' },
  },
};

test('parseDirectiveTail — all three directives parsed and stripped', () => {
  const parsed = parseDirectiveTail(
    'Anh/chị nộp trực tuyến hay trực tiếp?\n' +
      '[[CARDS: 1.004222=procedure,fees]]\n' +
      '[[CHIPS: Tôi nộp trực tuyến | Tôi nộp trực tiếp]]\n' +
      '[[GUIDE: 1.004222=so_dinh_danh_ca_nhan]]',
  );
  assert.equal(parsed.cleaned, 'Anh/chị nộp trực tuyến hay trực tiếp?');
  assert.deepEqual([...parsed.selections!.get('1.004222')!], ['procedure', 'fees']);
  assert.deepEqual(parsed.chips, ['Tôi nộp trực tuyến', 'Tôi nộp trực tiếp']);
  assert.deepEqual(parsed.guide, { code: '1.004222', target: 'so_dinh_danh_ca_nhan' });
});

test('parseDirectiveTail — unknown [[KEY:]] lines are stripped silently', () => {
  const parsed = parseDirectiveTail('Trả lời.\n[[FOO: bar]]\n[[CARDS: 1.004222=procedure]]');
  assert.equal(parsed.cleaned, 'Trả lời.');
  assert.ok(parsed.selections?.has('1.004222'));
  assert.deepEqual(parsed.chips, []);
  assert.equal(parsed.guide, null);
});

test('parseDirectiveTail — chips capped at 3 and clamped to 60 chars', () => {
  const long = 'x'.repeat(80);
  const parsed = parseDirectiveTail(`Câu hỏi.\n[[CHIPS: a | b | c | d]]\n[[CHIPS: ${long} | ok]]`);
  // last CHIPS occurrence wins
  assert.equal(parsed.chips.length, 2);
  assert.equal(parsed.chips[1], 'ok');
  assert.ok(parsed.chips[0]!.length <= 60);
  assert.ok(parsed.chips[0]!.endsWith('…'));
});

test('parseDirectiveTail — no directives → cleaned passthrough, empty results', () => {
  const parsed = parseDirectiveTail('Chỉ có lời văn thôi.');
  assert.equal(parsed.cleaned, 'Chỉ có lời văn thôi.');
  assert.equal(parsed.selections, null);
  assert.deepEqual(parsed.chips, []);
  assert.equal(parsed.guide, null);
});

test('parseDirectiveTail — malformed guide body → null guide, still stripped', () => {
  const parsed = parseDirectiveTail('OK.\n[[GUIDE: khong-co-dau-bang]]');
  assert.equal(parsed.guide, null);
  assert.equal(parsed.cleaned, 'OK.');
});

test('buildGuideCard — field target resolves label from the schema', () => {
  const card = buildGuideCard('1.004222', 'so_dinh_danh_ca_nhan', SCHEMA, '/nop-truc-tuyen/dang-ky-thuong-tru');
  assert.ok(card);
  assert.equal(card!.type, 'guide');
  assert.deepEqual(card!.payload, {
    code: '1.004222',
    target: 'so_dinh_danh_ca_nhan',
    label: 'Số định danh cá nhân',
    form_path: '/nop-truc-tuyen/dang-ky-thuong-tru',
  });
});

test('buildGuideCard — submit anchor allowed; unknown key / missing schema rejected', () => {
  const submit = buildGuideCard('1.004222', 'submit', SCHEMA, null);
  assert.equal(submit!.payload.label, 'Nút Nộp hồ sơ / Tiếp tục');
  assert.equal(buildGuideCard('1.004222', 'khong_ton_tai', SCHEMA, null), null);
  assert.equal(buildGuideCard('9.999999', 'submit', null, null), null);
});
