// Deterministic display formatters (WIDGET.md §3.4): closed enums → Vietnamese,
// money/date/duration formatting, forward-compat fallbacks for unknown values.
import { describe, expect, it } from 'vitest';
import {
  clamp,
  curatedChannelLabel,
  feeTypeLabel,
  fmtDate,
  fmtDuration,
  fmtMoney,
  methodLabel,
} from '../../src/ui/format';

describe('methodLabel', () => {
  it('maps the verified crawl enums', () => {
    expect(methodLabel('ONLINE')).toBe('Nộp trực tuyến');
    expect(methodLabel('DIRECT')).toBe('Nộp trực tiếp');
    expect(methodLabel('POSTAL')).toBe('Nộp qua bưu chính');
  });
  it('falls back to the raw value / generic label', () => {
    expect(methodLabel('COURIER')).toBe('COURIER');
    expect(methodLabel(null)).toBe('Kênh nộp');
  });
});

describe('feeTypeLabel', () => {
  it('maps fee type codes; unknown → generic', () => {
    expect(feeTypeLabel('FEE')).toBe('Lệ phí');
    expect(feeTypeLabel('SERVICE_FEE')).toBe('Phí dịch vụ');
    expect(feeTypeLabel('PRICE_LEVEL')).toBe('Mức giá');
    expect(feeTypeLabel('XYZ')).toBe('Mức thu');
  });
});

describe('fmtMoney', () => {
  it('dot-groups VND', () => {
    expect(fmtMoney(10000)).toBe('10.000 đ');
    expect(fmtMoney(100000)).toBe('100.000 đ');
    expect(fmtMoney(0)).toBe('0 đ');
  });
  it('non-numbers → empty', () => {
    expect(fmtMoney('10000')).toBe('');
    expect(fmtMoney(null)).toBe('');
  });
});

describe('fmtDate', () => {
  it('ISO datetime → dd/mm/yyyy without timezone drift', () => {
    expect(fmtDate('2026-04-27T17:53:36.933Z')).toBe('27/04/2026');
    expect(fmtDate('2026-07-01')).toBe('01/07/2026');
  });
  it('non-ISO strings pass through, non-strings → empty', () => {
    expect(fmtDate('01/07/2026')).toBe('01/07/2026');
    expect(fmtDate(null)).toBe('');
  });
});

describe('fmtDuration', () => {
  it('formats qty + known unit', () => {
    expect(fmtDuration({ qty: 7, unit: 'WORKING_DAY' })).toBe('7 ngày làm việc');
    expect(fmtDuration({ qty: 60, unit: 'DAY' })).toBe('60 ngày');
    expect(fmtDuration({ qty: 1, unit: 'MONTH' })).toBe('1 tháng');
  });
  it('OTHER/unknown unit or missing qty → empty (caller falls back to source text)', () => {
    expect(fmtDuration({ qty: 3, unit: 'OTHER' })).toBe('');
    expect(fmtDuration({ unit: 'DAY' })).toBe('');
    expect(fmtDuration(null)).toBe('');
  });
});

describe('curatedChannelLabel', () => {
  it('maps curated channel keys; all/unknown → no prefix', () => {
    expect(curatedChannelLabel('truc_tuyen')).toBe('Trực tuyến');
    expect(curatedChannelLabel('truc_tiep')).toBe('Trực tiếp');
    expect(curatedChannelLabel('all')).toBe('');
    expect(curatedChannelLabel(undefined)).toBe('');
  });
});

describe('clamp', () => {
  it('truncates with ellipsis, keeps short strings intact', () => {
    expect(clamp('ngắn', 90)).toBe('ngắn');
    const long = 'a'.repeat(100);
    expect(clamp(long, 90)).toBe(`${'a'.repeat(90)}…`);
    expect(clamp(null, 5)).toBe('');
  });
});
