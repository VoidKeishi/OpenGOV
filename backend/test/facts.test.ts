import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCaseFacts } from '../src/chat/facts';

const SCHEMA = {
  truong_hop: {
    type: 'enum',
    values: ['so_huu', 'nhan_than', 'thue_muon_o_nho', 'tin_nguong_ton_giao', 'tro_giup_xa_hoi', 'don_vi_dong_quan'],
  },
  kenh_nop: { type: 'enum', values: ['truc_tiep', 'truc_tuyen'] },
  chua_thanh_nien: { type: 'boolean' },
  ho_ten_chu_ho: { type: 'string' },
  so_dinh_danh_chu_ho: { type: 'string' },
};

test('normalizeCaseFacts — exact keys/values pass through', () => {
  const r = normalizeCaseFacts(
    { truong_hop: 'nhan_than', kenh_nop: 'truc_tuyen', chua_thanh_nien: false, ho_ten_chu_ho: 'Trần Văn B' },
    SCHEMA,
  );
  assert.deepEqual(r.rejected, {});
  assert.deepEqual(r.accepted, {
    truong_hop: 'nhan_than',
    kenh_nop: 'truc_tuyen',
    chua_thanh_nien: false,
    ho_ten_chu_ho: 'Trần Văn B',
  });
});

test('normalizeCaseFacts — paraphrased enum snaps to the single containing match (live-observed)', () => {
  const r = normalizeCaseFacts({ truong_hop: 'co_quan_he_nhan_than' }, SCHEMA);
  assert.equal(r.accepted.truong_hop, 'nhan_than');
});

test('normalizeCaseFacts — invented keys rejected with the valid-key list', () => {
  const r = normalizeCaseFacts({ chu_ho: 'Trần Văn B', quan_he_voi_chu_ho: 'con' }, SCHEMA);
  assert.deepEqual(r.accepted, {});
  assert.match(r.rejected.chu_ho!, /unknown_key/);
  assert.match(r.rejected.chu_ho!, /ho_ten_chu_ho/);
});

test('normalizeCaseFacts — ambiguous / unknown enum values rejected with allowed list', () => {
  const r = normalizeCaseFacts({ kenh_nop: 'truc' }, SCHEMA); // matches both values → ambiguous
  assert.equal('kenh_nop' in r.accepted, false);
  assert.match(r.rejected.kenh_nop!, /truc_tiep, truc_tuyen/);
});

test('normalizeCaseFacts — boolean coercion from strings; empty string facts rejected', () => {
  const r = normalizeCaseFacts({ chua_thanh_nien: 'true', so_dinh_danh_chu_ho: '  ' }, SCHEMA);
  assert.equal(r.accepted.chua_thanh_nien, true);
  assert.equal(r.rejected.so_dinh_danh_chu_ho, 'empty_value');
});
