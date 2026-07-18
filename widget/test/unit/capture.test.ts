// Capture contract table (WIDGET.md §6.3).
import { beforeEach, describe, expect, it } from 'vitest';
import { captureFields, fieldLabel, pickMainForm } from '../../src/core/capture';

function dom(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('captureFields', () => {
  it('radio group: unchecked → "", checked → its value', () => {
    const doc = dom(`
      <input type="radio" name="gioi_tinh" value="Nam">
      <input type="radio" name="gioi_tinh" value="Nữ">
      <input type="radio" name="khac" value="a" checked>
      <input type="radio" name="khac" value="b">
    `);
    expect(captureFields(doc.body)).toEqual({ gioi_tinh: '', khac: 'a' });
  });

  it('radio: checked later in the group overrides the "" placeholder', () => {
    const doc = dom(`
      <input type="radio" name="g" value="x">
      <input type="radio" name="g" value="y" checked>
    `);
    expect(captureFields(doc.body)).toEqual({ g: 'y' });
  });

  it('checkbox: unchecked is EXACTLY "" (never "false"), checked uses value or "on"', () => {
    const doc = dom(`
      <input type="checkbox" name="a" value="Đã đồng ý">
      <input type="checkbox" name="b" value="Đã đồng ý" checked>
      <input type="checkbox" name="c" checked>
    `);
    expect(captureFields(doc.body)).toEqual({ a: '', b: 'Đã đồng ý', c: 'on' });
  });

  it('skips file/submit/button/reset/image inputs', () => {
    const doc = dom(`
      <input type="file" name="giay_to">
      <input type="submit" name="nop">
      <input type="button" name="btn">
      <input type="reset" name="rst">
      <input type="image" name="img">
      <input type="text" name="ok" value="1">
    `);
    expect(captureFields(doc.body)).toEqual({ ok: '1' });
  });

  it('captures select, textarea, date, hidden, disabled, readonly — value verbatim, no trim', () => {
    const doc = dom(`
      <select name="s"><option value="">--</option><option value="Vợ" selected>Vợ</option></select>
      <textarea name="t">  giữ nguyên khoảng trắng  </textarea>
      <input type="date" name="d" value="2026-07-19">
      <input type="hidden" name="h" value="HS-1">
      <input type="text" name="dis" value="x" disabled>
      <input type="text" name="ro" value=" y " readonly>
    `);
    expect(captureFields(doc.body)).toEqual({
      s: 'Vợ',
      t: '  giữ nguyên khoảng trắng  ',
      d: '2026-07-19',
      h: 'HS-1',
      dis: 'x',
      ro: ' y ',
    });
  });

  it('member-table keys outside the schema are captured as-is', () => {
    const doc = dom(`
      <input type="text" name="thanh_vien_0_ho_ten" value="Nguyễn Văn A">
      <input type="text" name="thanh_vien_1_ho_ten" value="">
    `);
    expect(captureFields(doc.body)).toEqual({
      thanh_vien_0_ho_ten: 'Nguyễn Văn A',
      thanh_vien_1_ho_ten: '',
    });
  });
});

describe('pickMainForm', () => {
  const KEYS = ['ho_ten_khai_sinh', 'ngay_sinh', 'so_dinh_danh_ca_nhan'];

  it('picks the form containing the most distinct schema fields', () => {
    const doc = dom(`
      <form id="decoy"><input type="search" name="tim_kiem"></form>
      <form id="main">
        <input name="ho_ten_khai_sinh"><input name="ngay_sinh">
      </form>
    `);
    const picked = pickMainForm(doc, KEYS) as HTMLFormElement;
    expect(picked.id).toBe('main');
  });

  it('no form contains schema fields → whole document', () => {
    const doc = dom(`
      <form><input name="tim_kiem"></form>
      <input name="ho_ten_khai_sinh" value="ngoài form">
    `);
    expect(pickMainForm(doc, KEYS)).toBe(doc);
  });

  it('distinct names decide, not element count (radio group counts once)', () => {
    const doc = dom(`
      <form id="radios">
        <input type="radio" name="ngay_sinh" value="a">
        <input type="radio" name="ngay_sinh" value="b">
        <input type="radio" name="ngay_sinh" value="c">
      </form>
      <form id="two">
        <input name="ho_ten_khai_sinh"><input name="so_dinh_danh_ca_nhan">
      </form>
    `);
    const picked = pickMainForm(doc, KEYS) as HTMLFormElement;
    expect(picked.id).toBe('two');
  });
});

describe('fieldLabel', () => {
  it('resolves <label for>', () => {
    const doc = dom(`
      <label for="x">  Số định danh
        cá nhân </label>
      <input id="x" name="so_dinh_danh_ca_nhan">
    `);
    expect(fieldLabel(doc, 'so_dinh_danh_ca_nhan')).toBe('Số định danh cá nhân');
  });

  it('resolves wrapping <label>', () => {
    const doc = dom(`<label><input type="checkbox" name="dong_y"> Đồng ý</label>`);
    expect(fieldLabel(doc, 'dong_y')).toBe('Đồng ý');
  });

  it('resolves preceding sibling <label>', () => {
    const doc = dom(`<label>Ngày sinh</label><input name="ngay_sinh">`);
    expect(fieldLabel(doc, 'ngay_sinh')).toBe('Ngày sinh');
  });

  it('no label / no field → null', () => {
    const doc = dom(`<input name="khong_nhan">`);
    expect(fieldLabel(doc, 'khong_nhan')).toBeNull();
    expect(fieldLabel(doc, 'khong_ton_tai')).toBeNull();
  });
});
