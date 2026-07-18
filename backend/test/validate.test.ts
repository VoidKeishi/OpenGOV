import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { loadCatalog } from '../src/errors/catalog';
import { FormSchema, Ctx } from '../src/validation/engine';
import { runDeterministic } from '../src/validation/validate';

const catalog = loadCatalog(join(process.cwd(), '..', 'data', 'errors', 'catalog.json'));
const ctx: Ctx = {
  provinces: { current: ['Thành phố Hà Nội'], defunct: [{ name: 'Hà Giang', merged_into: 'Tỉnh Tuyên Quang' }] },
};

/** Fixture schema in the exact DATA.md §4 shape (khai-sinh-like), referencing real E_* codes. */
const schema: FormSchema = {
  procedure_code: 'FIXTURE',
  form_ref: 'fixture-form',
  fields: {
    ho_ten: { label: 'Họ và tên', rules: [{ rule: 'required', error: 'E_REQUIRED' }] },
    cccd: { label: 'Số định danh cá nhân', rules: [{ rule: 'pattern', value: '[0-9]{12}', error: 'E_DINH_DANH_12' }] },
    que_quan: {
      label: 'Quê quán',
      rules: [
        { rule: 'required', error: 'E_REQUIRED' },
        { rule: 'province_not_defunct', error: 'E_TINH_SAP_NHAP' },
        { rule: 'no_district_level', error: 'E_CAP_HUYEN' },
      ],
    },
    so_ban_sao: {
      label: 'Số lượng bản sao',
      rules: [{ rule: 'required', error: 'E_REQUIRED', when: { field: 'de_nghi_cap_ban_sao', eq: 'Có' } }],
    },
    de_nghi_cap_ban_sao: { label: 'Đề nghị cấp bản sao', rules: [] },
    ho_ten_me: { label: 'Họ tên mẹ', rules: [] },
    ho_ten_cha: { label: 'Họ tên cha', rules: [] },
  },
  cross_field: [
    { rule: 'at_least_one_of', fields: ['ho_ten_me', 'ho_ten_cha'], attach_to: 'ho_ten_me', error: 'E_KS_CHA_ME' },
  ],
};

const key = (e: { field?: string; code: string }) => `${e.field}:${e.code}`;

test('/validate fixture — returns the exact expected error set', () => {
  const { errors, unknownCodes } = runDeterministic(
    schema,
    {
      ho_ten: '',
      cccd: '123',
      que_quan: 'Quận Ba Đình, Tỉnh Hà Giang',
      de_nghi_cap_ban_sao: 'Có',
      so_ban_sao: '',
      ho_ten_me: '',
      ho_ten_cha: '',
    },
    {},
    ctx,
    catalog,
  );

  assert.equal(unknownCodes.length, 0);
  const got = errors.map(key).sort();
  assert.deepEqual(got, [
    'cccd:E_DINH_DANH_12',
    'ho_ten:E_REQUIRED',
    'ho_ten_me:E_KS_CHA_ME',
    'que_quan:E_CAP_HUYEN',
    'que_quan:E_TINH_SAP_NHAP',
    'so_ban_sao:E_REQUIRED',
  ]);

  // every error is fully rendered (interpolated message + suggestion + metadata)
  for (const e of errors) {
    assert.ok(e.message && e.message.length > 0, `${e.code} has message`);
    assert.ok(e.suggestion && e.suggestion.length > 0, `${e.code} has suggestion`);
    assert.equal(e.source, 'engine');
    assert.ok(['error', 'warning', 'info'].includes(e.severity));
  }
  const tinh = errors.find((e) => e.code === 'E_TINH_SAP_NHAP')!;
  assert.match(tinh.message, /Hà Giang/); // {old} interpolated
  assert.match(tinh.suggestion, /Tỉnh Tuyên Quang/); // {new} interpolated
});

test('/validate fixture — when-guards suppress conditional rules', () => {
  const { errors } = runDeterministic(
    schema,
    {
      ho_ten: 'Nguyễn Văn A',
      cccd: '012345678901',
      que_quan: 'Phường Ngọc Hà, Thành phố Hà Nội',
      de_nghi_cap_ban_sao: 'Không', // so_ban_sao required is guarded off
      so_ban_sao: '',
      ho_ten_me: 'Trần Thị B', // satisfies at_least_one_of
      ho_ten_cha: '',
    },
    {},
    ctx,
    catalog,
  );
  assert.deepEqual(errors.map(key).sort(), []);
});

test('/validate — unknown catalog code surfaces via unknownCodes (fail-closed 422 path)', () => {
  const bad: FormSchema = {
    procedure_code: 'X', form_ref: 'x',
    fields: { f: { label: 'F', rules: [{ rule: 'required', error: 'E_NOT_IN_CATALOG' }] } },
  };
  const { errors, unknownCodes } = runDeterministic(bad, { f: '' }, {}, ctx, catalog);
  assert.equal(errors.length, 0);
  assert.deepEqual(unknownCodes, [{ code: 'E_NOT_IN_CATALOG', field: 'f' }]);
});
