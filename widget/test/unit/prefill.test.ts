// Confirmed-prefill logic (WIDGET.md §12.4): fact→value resolution, candidate
// filtering against the live DOM, and the native-setter write path.
import { beforeEach, describe, expect, it } from 'vitest';
import { buildPrefillCandidates, prefillValue, writeField } from '../../src/core/prefill';

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
