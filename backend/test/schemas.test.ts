import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { listSchemaIndex } from '../src/procedures/procedures.service';

const schemasDir = join(process.cwd(), '..', 'data', 'schemas');

test('listSchemaIndex returns the R1 contract for every authored schema', () => {
  const index = listSchemaIndex(schemasDir);
  assert.equal(index.length, 3);
  const codes = index.map((s) => s.procedure_code);
  assert.deepEqual(codes, ['1.004222', '2.001610', '2.001955']);
  for (const entry of index) {
    assert.equal(typeof entry.form_ref, 'string');
    assert.ok(entry.form_ref.length > 0);
    assert.ok(Array.isArray(entry.field_keys) && entry.field_keys.length > 0);
  }
});

test('1.004222 entry matches the clone form contract', () => {
  const tt = listSchemaIndex(schemasDir).find((s) => s.procedure_code === '1.004222');
  assert.ok(tt);
  assert.equal(tt.form_ref, 'dang-ky-thuong-tru');
  assert.equal(tt.field_keys.length, 11);
  assert.ok(tt.field_keys.includes('so_dinh_danh_ca_nhan'));
  assert.ok(tt.field_keys.includes('noi_dung_de_nghi'));
});

test('missing directory degrades to an empty index', () => {
  assert.deepEqual(listSchemaIndex(join(schemasDir, 'khong-ton-tai')), []);
});
