import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildChecklistCard, evalWhen } from '../src/chat/cards';
import type { ProcedureRecord } from '../src/db/types';

// Real reviewed curated checklist — the contract the filter must honor (DATA.md §3).
const curated = JSON.parse(
  readFileSync(join(process.cwd(), '..', 'data', 'curated', '1.004222.json'), 'utf8'),
);
const record: ProcedureRecord = {
  code: '1.004222',
  name: 'Đăng ký thường trú',
  source: { url: 'https://dichvucong.gov.vn/x' },
  structuring_level: 'full',
  checklist: curated.checklist,
};

const groupIds = (card: any): string[] => card.payload.groups.map((g: any) => g.id);
const itemIds = (card: any, groupId: string): string[] =>
  card.payload.groups.find((g: any) => g.id === groupId)?.items.map((it: any) => it.id) ?? [];

test('evalWhen — eq/in operators and the missing-fact case', () => {
  assert.equal(evalWhen(null, {}), 'yes');
  assert.equal(evalWhen({ fact: 'a', eq: 1 }, { a: 1 }), 'yes');
  assert.equal(evalWhen({ fact: 'a', eq: 1 }, { a: 2 }), 'no');
  assert.equal(evalWhen({ fact: 'a', eq: 1 }, {}), 'unknown');
  assert.equal(evalWhen({ fact: 'a', in: ['x', 'y'] }, { a: 'y' }), 'yes');
  assert.equal(evalWhen({ fact: 'a', in: ['x', 'y'] }, { a: 'z' }), 'no');
  assert.equal(evalWhen({ fact: 'a', in: ['x'] }, {}), 'unknown');
});

test('empty facts — every group kept (fail-open), every conditional item flagged', () => {
  const card = buildChecklistCard(record, {})!;
  assert.ok(card);
  // All 7 groups survive: the 6 case groups have unverifiable `when` → kept.
  assert.equal(card.payload.groups.length, curated.checklist.groups.length);
  const toKhai = card.payload.groups.find((g: any) => g.id === 'to_khai');
  // Both CT01 and CT02 kept, each conditional (viet_kieu_khong_ho_chieu unknown).
  assert.deepEqual(
    toKhai.items.map((it: any) => it.conditional),
    [true, true],
  );
  // Group-level unknown propagates to unconditional items inside.
  const soHuu = card.payload.groups.find((g: any) => g.id === 'ho_so_so_huu');
  assert.ok(soHuu.items.every((it: any) => it.conditional === true));
  // Internal keys stripped from the wire payload.
  for (const g of card.payload.groups) {
    assert.equal('when' in g, false);
    for (const it of g.items) {
      assert.equal('when' in it, false);
      assert.equal('source_component_code' in it, false);
    }
  }
});

test('truong_hop=thue_muon_o_nho — only the matching case group survives', () => {
  const card = buildChecklistCard(record, { truong_hop: 'thue_muon_o_nho' })!;
  const ids = groupIds(card);
  assert.ok(ids.includes('ho_so_thue_muon_o_nho'));
  for (const dropped of ['ho_so_so_huu', 'ho_so_nhan_than', 'ho_so_tin_nguong_ton_giao', 'ho_so_tro_giup_xa_hoi', 'ho_so_don_vi_dong_quan']) {
    assert.equal(ids.includes(dropped), false, `${dropped} must be dropped`);
  }
  // Items of the satisfied group are unconditional.
  const thueMuon = card.payload.groups.find((g: any) => g.id === 'ho_so_thue_muon_o_nho');
  assert.ok(thueMuon.items.every((it: any) => it.conditional === false));
});

test('viet_kieu_khong_ho_chieu=false — CT01 kept, CT02 dropped (and vice versa)', () => {
  const ct01 = buildChecklistCard(record, { viet_kieu_khong_ho_chieu: false })!;
  assert.deepEqual(itemIds(ct01, 'to_khai'), ['to_khai_ct01']);
  const ct02 = buildChecklistCard(record, { viet_kieu_khong_ho_chieu: true })!;
  assert.deepEqual(itemIds(ct02, 'to_khai'), ['to_khai_ct02']);
});

test('song_tren_phuong_tien=true within a satisfied group — both vehicle items kept unconditionally', () => {
  const card = buildChecklistCard(record, { truong_hop: 'so_huu', song_tren_phuong_tien: true })!;
  const ids = itemIds(card, 'ho_so_so_huu');
  assert.ok(ids.includes('xac_nhan_noi_dau_do_phuong_tien'));
  assert.ok(ids.includes('dang_ky_dang_kiem_phuong_tien'));
  const soHuu = card.payload.groups.find((g: any) => g.id === 'ho_so_so_huu');
  assert.ok(soHuu.items.every((it: any) => it.conditional === false));
});

test('in operator — synthetic group filtered by membership', () => {
  const synthetic: ProcedureRecord = {
    code: 'x',
    name: 'x',
    source: { url: 'u' },
    structuring_level: 'full',
    checklist: {
      groups: [
        {
          id: 'g',
          type: 'ALL_OF',
          when: { fact: 'uy_quyen', in: ['ca_nhan', 'to_chuc'] },
          items: [{ id: 'i', label: 'Văn bản ủy quyền', quantity: { original: 1, copy: 0 }, kind: 'nop' }],
        },
      ],
    },
  };
  assert.ok(buildChecklistCard(synthetic, { uy_quyen: 'ca_nhan' }));
  assert.equal(buildChecklistCard(synthetic, { uy_quyen: 'khong' }), null);
  const unknown = buildChecklistCard(synthetic, {})!;
  assert.equal(unknown.payload.groups[0].items[0].conditional, true);
});

test('record without curated checklist — no card', () => {
  const raw: ProcedureRecord = { code: 'y', name: 'y', source: { url: 'u' }, structuring_level: 'raw' };
  assert.equal(buildChecklistCard(raw, {}), null);
});
