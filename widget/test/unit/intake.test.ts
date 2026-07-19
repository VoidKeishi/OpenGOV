import { describe, expect, it } from 'vitest';
import { BRANCH_CHIPS, BRANCH_LEAD, SEGMENT_CHIPS, inferSegment } from '../../src/core/intake';

describe('inferSegment', () => {
  it('maps each pilot procedure to its audience explicitly', () => {
    expect(inferSegment('1.004222')).toBe('ca_nhan');
    expect(inferSegment('2.001610')).toBe('doanh_nghiep');
    expect(inferSegment('2.001955')).toBe('doanh_nghiep');
  });

  it('returns null for unknown codes and missing input (no prefix guessing)', () => {
    expect(inferSegment('1.001193')).toBeNull(); // citizen-looking prefix, not a pilot
    expect(inferSegment('2.999999')).toBeNull();
    expect(inferSegment('')).toBeNull();
    expect(inferSegment(undefined)).toBeNull();
  });
});

describe('intake copy', () => {
  it('offers exactly the two segments', () => {
    expect(SEGMENT_CHIPS.map((s) => s.key)).toEqual(['ca_nhan', 'doanh_nghiep']);
  });

  it('every segment has branch chips and a lead line', () => {
    for (const { key } of SEGMENT_CHIPS) {
      expect(BRANCH_CHIPS[key].length).toBeGreaterThan(0);
      expect(BRANCH_LEAD[key]).toBeTruthy();
    }
  });

  it('branch chips are self-scoping messages (name their procedure)', () => {
    expect(BRANCH_CHIPS.ca_nhan.every((c) => c.includes('thường trú'))).toBe(true);
    expect(
      BRANCH_CHIPS.doanh_nghiep.every(
        (c) => c.includes('doanh nghiệp') || c.includes('nội quy lao động'),
      ),
    ).toBe(true);
  });
});
