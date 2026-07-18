import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { validate, collectLlmChecks, whenSatisfied, assertKnownRules, FormSchema, Ctx } from '../src/validation/engine';
import { loadCatalog, resolveError } from '../src/errors/catalog';

const ctx: Ctx = {
  provinces: {
    current: ['Thành phố Hà Nội'],
    defunct: [{ name: 'Hà Giang', merged_into: 'Tỉnh Tuyên Quang' }],
  },
};

/** Build a one-field schema for isolating a rule. */
function schema(name: string, rules: any[], label = name, cross?: any[]): FormSchema {
  return { procedure_code: 'TEST', form_ref: 'test', fields: { [name]: { label, rules } }, cross_field: cross };
}
function codes(hits: { error: string }[]): string[] {
  return hits.map((h) => h.error).sort();
}

test('required — empty fails, filled passes', () => {
  const s = schema('f', [{ rule: 'required', error: 'E_REQUIRED' }]);
  assert.deepEqual(codes(validate(s, { f: '' }, {}, ctx)), ['E_REQUIRED']);
  assert.deepEqual(codes(validate(s, { f: 'x' }, {}, ctx)), []);
});

test('pattern — full-match only, skipped when empty', () => {
  const s = schema('cccd', [{ rule: 'pattern', value: '[0-9]{12}', error: 'E_DINH_DANH_12' }]);
  assert.deepEqual(codes(validate(s, { cccd: '123' }, {}, ctx)), ['E_DINH_DANH_12']);
  assert.deepEqual(codes(validate(s, { cccd: '012345678901' }, {}, ctx)), []);
  assert.deepEqual(codes(validate(s, { cccd: '' }, {}, ctx)), []); // emptiness is required's job
});

test('date_not_future', () => {
  const s = schema('d', [{ rule: 'date_not_future', error: 'E_NGAY_TUONG_LAI' }]);
  assert.deepEqual(codes(validate(s, { d: '2999-01-01' }, {}, ctx)), ['E_NGAY_TUONG_LAI']);
  assert.deepEqual(codes(validate(s, { d: '2000-01-01' }, {}, ctx)), []);
});

test('date_before (cross-field)', () => {
  const s: FormSchema = {
    procedure_code: 'T', form_ref: 't',
    fields: { nam_sinh_me: { label: 'Năm sinh mẹ', rules: [] }, ngay_sinh_con: { label: 'Ngày sinh con', rules: [] } },
    cross_field: [{ rule: 'date_before', field: 'nam_sinh_me', before: 'ngay_sinh_con', error: 'E_ME_SINH_SAU_CON', attach_to: 'nam_sinh_me' }],
  };
  assert.deepEqual(codes(validate(s, { nam_sinh_me: '2020-01-01', ngay_sinh_con: '2000-01-01' }, {}, ctx)), ['E_ME_SINH_SAU_CON']);
  assert.deepEqual(codes(validate(s, { nam_sinh_me: '1980-01-01', ngay_sinh_con: '2000-01-01' }, {}, ctx)), []);
});

test('int_range', () => {
  const s = schema('n', [{ rule: 'int_range', min: 1, max: 20, error: 'E_SO_LUONG' }]);
  assert.deepEqual(codes(validate(s, { n: '0' }, {}, ctx)), ['E_SO_LUONG']);
  assert.deepEqual(codes(validate(s, { n: '25' }, {}, ctx)), ['E_SO_LUONG']);
  assert.deepEqual(codes(validate(s, { n: '5' }, {}, ctx)), []);
});

test('province_not_defunct — yields {old,new} params', () => {
  const s = schema('que', [{ rule: 'province_not_defunct', error: 'E_TINH_SAP_NHAP' }], 'Quê quán');
  const hits = validate(s, { que: 'Tỉnh Hà Giang' }, {}, ctx);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].params.old, 'Hà Giang');
  assert.equal(hits[0].params.new, 'Tỉnh Tuyên Quang');
  assert.deepEqual(codes(validate(s, { que: 'Thành phố Hà Nội' }, {}, ctx)), []);
});

test('no_district_level', () => {
  const s = schema('addr', [{ rule: 'no_district_level', error: 'E_CAP_HUYEN' }]);
  assert.deepEqual(codes(validate(s, { addr: 'Quận Ba Đình, Hà Nội' }, {}, ctx)), ['E_CAP_HUYEN']);
  assert.deepEqual(codes(validate(s, { addr: 'Phường Ba Đình, Hà Nội' }, {}, ctx)), []);
});

test('at_least_one_of (cross-field)', () => {
  const s: FormSchema = {
    procedure_code: 'T', form_ref: 't',
    fields: { ho_ten_me: { label: 'Họ tên mẹ', rules: [] }, ho_ten_cha: { label: 'Họ tên cha', rules: [] } },
    cross_field: [{ rule: 'at_least_one_of', fields: ['ho_ten_me', 'ho_ten_cha'], attach_to: 'ho_ten_me', error: 'E_KS_CHA_ME' }],
  };
  assert.deepEqual(codes(validate(s, { ho_ten_me: '', ho_ten_cha: '' }, {}, ctx)), ['E_KS_CHA_ME']);
  assert.deepEqual(codes(validate(s, { ho_ten_me: 'Nguyễn Thị A', ho_ten_cha: '' }, {}, ctx)), []);
});

test('number_lte_field', () => {
  const s = schema('a', [{ rule: 'number_lte_field', field: 'a', lte: 'b', error: 'E_SO_LUONG' }]);
  const s2 = { ...s, fields: { ...s.fields, b: { label: 'b', rules: [] } } };
  assert.deepEqual(codes(validate(s2, { a: '5', b: '3' }, {}, ctx)), ['E_SO_LUONG']);
  assert.deepEqual(codes(validate(s2, { a: '2', b: '3' }, {}, ctx)), []);
});

test('llm_check — engine never fires it, collectLlmChecks forwards it', () => {
  const s = schema('note', [{ rule: 'llm_check', check: 'date_in_words_matches', against: 'd', error: 'E_NGAY_CHU_LECH' }]);
  assert.deepEqual(codes(validate(s, { note: 'anything' }, {}, ctx)), []);
  const forwarded = collectLlmChecks(s, { note: 'x' }, {});
  assert.equal(forwarded.length, 1);
  assert.equal(forwarded[0].check, 'date_in_words_matches');
  assert.equal(forwarded[0].against, 'd');
});

test('when guard — {field, eq}', () => {
  const s = schema('so_luong', [{ rule: 'required', error: 'E_REQUIRED', when: { field: 'de_nghi', eq: 'Có' } }]);
  assert.deepEqual(codes(validate(s, { so_luong: '', de_nghi: 'Có' }, {}, ctx)), ['E_REQUIRED']);
  assert.deepEqual(codes(validate(s, { so_luong: '', de_nghi: 'Không' }, {}, ctx)), []);
});

test('when guard — {fact, eq}', () => {
  const s = schema('gcn_kh', [{ rule: 'required', error: 'E_GCN_KH_THIEU', when: { fact: 'da_dang_ky_ket_hon', eq: true } }]);
  assert.deepEqual(codes(validate(s, { gcn_kh: '' }, { da_dang_ky_ket_hon: true }, ctx)), ['E_GCN_KH_THIEU']);
  assert.deepEqual(codes(validate(s, { gcn_kh: '' }, { da_dang_ky_ket_hon: false }, ctx)), []);
});

test('when guard — {fact, in}', () => {
  const s = schema('doc', [{ rule: 'required', error: 'E_REQUIRED', when: { fact: 'loai', in: ['a', 'b'] } }]);
  assert.deepEqual(codes(validate(s, { doc: '' }, { loai: 'a' }, ctx)), ['E_REQUIRED']);
  assert.deepEqual(codes(validate(s, { doc: '' }, { loai: 'z' }, ctx)), []);
  assert.equal(whenSatisfied({ fact: 'loai', in: ['a', 'b'] }, {}, { loai: 'b' }), true);
  assert.equal(whenSatisfied({ field: 'x', eq: '1' }, { x: '1' }, {}), true);
});

test('assertKnownRules throws on an unknown rule', () => {
  const s = schema('f', [{ rule: 'made_up_rule', error: 'E_REQUIRED' }]);
  assert.throws(() => assertKnownRules(s), /unknown rule/);
});

test('catalog interpolation — E_TINH_SAP_NHAP renders {old}/{new}', () => {
  const catalog = loadCatalog(join(process.cwd(), '..', 'data', 'errors', 'catalog.json'));
  const r = resolveError(catalog, 'E_TINH_SAP_NHAP', { old: 'Hà Giang', new: 'Tỉnh Tuyên Quang', label: 'Quê quán' }, 'que');
  assert.ok(r, 'E_TINH_SAP_NHAP must exist in catalog');
  assert.match(r!.message, /Hà Giang/);
  assert.match(r!.suggestion, /Tỉnh Tuyên Quang/);
  assert.equal(r!.severity, 'error');
  // unknown code → null (fail-closed path)
  assert.equal(resolveError(catalog, 'E_DOES_NOT_EXIST', {}), null);
});
