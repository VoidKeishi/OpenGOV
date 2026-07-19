// Confirmed-prefill logic (WIDGET.md §12.4): fact→value resolution, candidate
// filtering against the live DOM, and the native-setter write path.
import { beforeEach, describe, expect, it } from 'vitest';
import { buildPrefillCandidates, prefillValue, resolveSelectValue, writeField } from '../../src/core/prefill';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('prefillValue', () => {
  it('passes string facts through (trimmed)', () => {
    expect(prefillValue({ fact: 'ho_ten_chu_ho' }, { ho_ten_chu_ho: '  Trần Văn B ' })).toBe('Trần Văn B');
  });

  it('missing / empty / object facts → null', () => {
    expect(prefillValue({ fact: 'x' }, {})).toBeNull();
    expect(prefillValue({ fact: 'x' }, { x: '' })).toBeNull();
    expect(prefillValue({ fact: 'x' }, { x: '   ' })).toBeNull();
    expect(prefillValue({ fact: 'x' }, { x: { nested: true } })).toBeNull();
    expect(prefillValue({ fact: 'x' }, { x: null })).toBeNull();
  });

  it('enum transform maps values; unmapped values pass through raw', () => {
    const entry = { fact: 'kenh_nop', transform: { enum: { truc_tuyen: 'Trực tuyến' } } };
    expect(prefillValue(entry, { kenh_nop: 'truc_tuyen' })).toBe('Trực tuyến');
    expect(prefillValue(entry, { kenh_nop: 'truc_tiep' })).toBe('truc_tiep');
  });

  it('coerces primitive non-strings', () => {
    expect(prefillValue({ fact: 'n' }, { n: 12 })).toBe('12');
    expect(prefillValue({ fact: 'b' }, { b: true })).toBe('true');
  });
});

describe('buildPrefillCandidates', () => {
  const MAP = {
    ho_ten_chu_ho: { fact: 'ho_ten_chu_ho' },
    so_dinh_danh_ca_nhan_chu_ho: { fact: 'so_dinh_danh_chu_ho' },
    y_kien_chu_ho_so_dinh_danh: { fact: 'so_dinh_danh_chu_ho' },
  };

  it('keeps only rows with a fact, a DOM field, and a differing value', () => {
    document.body.innerHTML = `
      <input name="ho_ten_chu_ho" value="">
      <input name="y_kien_chu_ho_so_dinh_danh" value="001099000111">
    `;
    // so_dinh_danh_ca_nhan_chu_ho: field absent → dropped
    // y_kien...: DOM already holds the target value → hidden (§12.4)
    const rows = buildPrefillCandidates(
      MAP,
      { ho_ten_chu_ho: 'Trần Văn B', so_dinh_danh_chu_ho: '001099000111' },
      document,
    );
    expect(rows).toEqual([
      { field: 'ho_ten_chu_ho', fact: 'ho_ten_chu_ho', value: 'Trần Văn B', current: '' },
    ]);
  });

  it('one fact can feed several fields', () => {
    document.body.innerHTML = `
      <input name="so_dinh_danh_ca_nhan_chu_ho" value="">
      <input name="y_kien_chu_ho_so_dinh_danh" value="">
    `;
    const rows = buildPrefillCandidates(MAP, { so_dinh_danh_chu_ho: '001099000111' }, document);
    expect(rows.map((r) => r.field)).toEqual([
      'so_dinh_danh_ca_nhan_chu_ho',
      'y_kien_chu_ho_so_dinh_danh',
    ]);
  });

  it('no facts → no rows', () => {
    document.body.innerHTML = `<input name="ho_ten_chu_ho" value="">`;
    expect(buildPrefillCandidates(MAP, {}, document)).toEqual([]);
  });

  it('select rows resolve the fact onto an option; unresolvable rows are dropped', () => {
    document.body.innerHTML = `
      <select name="moi_quan_he_voi_chu_ho">
        <option value="">--</option><option value="Vợ">Vợ</option><option value="Con">Con</option>
      </select>`;
    const map = { moi_quan_he_voi_chu_ho: { fact: 'moi_quan_he_voi_chu_ho' } };
    // model wrote a snake_case token — still resolves onto the "Con" option
    expect(
      buildPrefillCandidates(map, { moi_quan_he_voi_chu_ho: 'con_de' }, document)[0]?.value,
    ).toBe('Con');
    // nothing matches → no row (the preview never promises a dead write)
    expect(buildPrefillCandidates(map, { moi_quan_he_voi_chu_ho: 'hàng xóm' }, document)).toEqual([]);
  });
});

describe('resolveSelectValue', () => {
  const select = (): HTMLSelectElement => {
    document.body.innerHTML = `
      <select name="moi_quan_he_voi_chu_ho">
        <option value="">-- Chọn --</option>
        <option value="Chủ hộ">Chủ hộ</option><option value="Vợ">Vợ</option>
        <option value="Chồng">Chồng</option><option value="Con">Con</option>
        <option value="Cha">Cha</option><option value="Mẹ">Mẹ</option>
        <option value="Khác">Khác</option>
      </select>`;
    return document.querySelector('select')!;
  };

  it('exact option value passes through', () => {
    expect(resolveSelectValue(select(), 'Con')).toBe('Con');
  });

  it('case/diacritics-insensitive exact match', () => {
    expect(resolveSelectValue(select(), 'chồng')).toBe('Chồng');
    expect(resolveSelectValue(select(), 'chong')).toBe('Chồng');
  });

  it('unique word-boundary containment snaps ("con_de" → "Con", "chủ hộ mới" → "Chủ hộ")', () => {
    expect(resolveSelectValue(select(), 'con_de')).toBe('Con');
    expect(resolveSelectValue(select(), 'chủ hộ mới')).toBe('Chủ hộ');
  });

  it('ambiguous or unknown values → null (never guesses)', () => {
    expect(resolveSelectValue(select(), 'cha mẹ')).toBeNull();
    expect(resolveSelectValue(select(), 'hàng xóm')).toBeNull();
    expect(resolveSelectValue(select(), '')).toBeNull();
  });
});

describe('writeField', () => {
  it('writes inputs through the native setter and fires a bubbling input event', () => {
    document.body.innerHTML = `<form><input name="ho_ten_chu_ho" value=""></form>`;
    const el = document.querySelector('input')!;
    let seen = '';
    document.addEventListener('input', (e) => {
      seen = (e.target as HTMLInputElement).value;
    });
    expect(writeField(el, 'Trần Văn B')).toBe(true);
    expect(el.value).toBe('Trần Văn B');
    expect(seen).toBe('Trần Văn B');
  });

  it('selects get input + change events', () => {
    document.body.innerHTML = `
      <select name="gioi_tinh"><option value="">--</option><option value="Nam">Nam</option></select>`;
    const el = document.querySelector('select')!;
    const events: string[] = [];
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));
    expect(writeField(el, 'Nam')).toBe(true);
    expect(el.value).toBe('Nam');
    expect(events).toEqual(['input', 'change']);
  });

  it('refuses unknown elements', () => {
    document.body.innerHTML = `<div id="x"></div>`;
    expect(writeField(document.getElementById('x')!, 'v')).toBe(false);
  });
});
