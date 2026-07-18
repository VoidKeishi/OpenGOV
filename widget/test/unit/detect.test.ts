// Detection ladder (WIDGET.md §6.1) — distinct-name threshold, path and
// case-facts fallbacks.
import { beforeEach, describe, expect, it } from 'vitest';
import { detect } from '../../src/core/detect';
import type { SchemaIndexEntry } from '../../src/types';

const TT: SchemaIndexEntry = {
  procedure_code: '1.004222',
  form_ref: 'dang-ky-thuong-tru',
  field_keys: ['ho_ten_khai_sinh', 'ngay_sinh', 'gioi_tinh', 'so_dinh_danh_ca_nhan'],
};
const DN: SchemaIndexEntry = {
  procedure_code: '2.001610',
  form_ref: 'dang-ky-thanh-lap-dntn',
  field_keys: ['ten_doanh_nghiep', 'ma_so_thue', 'von_dau_tu'],
};
const SCHEMAS = [TT, DN];

function dom(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('detect', () => {
  it('≥3 distinct fields → DETECTED_READY with the best schema', () => {
    const doc = dom(`
      <input name="ho_ten_khai_sinh"><input name="ngay_sinh"><input name="so_dinh_danh_ca_nhan">
      <input name="ten_doanh_nghiep">
    `);
    const r = detect(SCHEMAS, doc, '/trang-bat-ky', null);
    expect(r).toEqual({ kind: 'DETECTED_READY', schema: TT });
  });

  it('radio group = ONE field: 2 distinct names stay under the threshold', () => {
    const doc = dom(`
      <input type="radio" name="gioi_tinh" value="Nam">
      <input type="radio" name="gioi_tinh" value="Nữ">
      <input name="ngay_sinh">
    `);
    const r = detect(SCHEMAS, doc, '/trang-bat-ky', null);
    expect(r.kind).toBe('NONE');
  });

  it('<3 fields but pathname contains form_ref → DETECTED_NOFIELDS', () => {
    const doc = dom(`<input name="chon_tinh">`);
    const r = detect(SCHEMAS, doc, '/nop-truc-tuyen/dang-ky-thuong-tru', null);
    expect(r).toEqual({ kind: 'DETECTED_NOFIELDS', schema: TT });
  });

  it('no DOM/path signal but session procedure_code has a schema → DETECTED_NOFIELDS', () => {
    const doc = dom(`<p>trang trống</p>`);
    const r = detect(SCHEMAS, doc, '/', '2.001610');
    expect(r).toEqual({ kind: 'DETECTED_NOFIELDS', schema: DN });
  });

  it('session procedure_code without schema → NONE', () => {
    const doc = dom(`<p>trang trống</p>`);
    expect(detect(SCHEMAS, doc, '/', '9.999999').kind).toBe('NONE');
  });

  it('nothing matches → NONE; empty schema list → NONE', () => {
    const doc = dom(`<input name="tim_kiem">`);
    expect(detect(SCHEMAS, doc, '/', null).kind).toBe('NONE');
    expect(detect([], doc, '/nop-truc-tuyen/dang-ky-thuong-tru', '1.004222').kind).toBe('NONE');
  });

  it('DOM match beats path when both present (READY wins)', () => {
    const doc = dom(`
      <input name="ten_doanh_nghiep"><input name="ma_so_thue"><input name="von_dau_tu">
    `);
    const r = detect(SCHEMAS, doc, '/nop-truc-tuyen/dang-ky-thuong-tru', null);
    expect(r).toEqual({ kind: 'DETECTED_READY', schema: DN });
  });
});
