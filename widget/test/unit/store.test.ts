// Transcript cache behavior (WIDGET.md §8): keys, truncation, corrupt-cache
// tolerance, "Cuộc mới" cleanup.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearCurrentSession,
  getOpen,
  getSid,
  loadTranscript,
  saveTranscript,
  setOpen,
  setSid,
} from '../../src/core/store';
import type { Turn } from '../../src/types';

const turn = (i: number): Turn => ({
  role: 'user',
  prose: `câu ${i}`,
  cards: [],
  ticks: {},
  revealed: true,
});

beforeEach(() => {
  sessionStorage.clear();
});

describe('store', () => {
  it('sid round-trips under og.sid', () => {
    expect(getSid()).toBeNull();
    setSid('abc-123');
    expect(getSid()).toBe('abc-123');
    expect(sessionStorage.getItem('og.sid')).toBe('abc-123');
  });

  it('transcript round-trips under og.transcript.<sid> with v:1', () => {
    saveTranscript('s1', [turn(1), turn(2)]);
    const raw = JSON.parse(sessionStorage.getItem('og.transcript.s1')!);
    expect(raw.v).toBe(1);
    expect(loadTranscript('s1')).toHaveLength(2);
    expect(loadTranscript('s2')).toBeNull();
  });

  it('truncates to the last 30 turns before writing', () => {
    saveTranscript('s1', Array.from({ length: 45 }, (_, i) => turn(i)));
    const turns = loadTranscript('s1')!;
    expect(turns).toHaveLength(30);
    expect(turns[0]!.prose).toBe('câu 15');
    expect(turns[29]!.prose).toBe('câu 44');
  });

  it('corrupt JSON or wrong version → null (caller falls back to server restore)', () => {
    sessionStorage.setItem('og.transcript.s1', '{hỏng');
    expect(loadTranscript('s1')).toBeNull();
    sessionStorage.setItem('og.transcript.s1', JSON.stringify({ v: 2, turns: [] }));
    expect(loadTranscript('s1')).toBeNull();
    sessionStorage.setItem('og.transcript.s1', JSON.stringify({ v: 1, turns: 'x' }));
    expect(loadTranscript('s1')).toBeNull();
  });

  it('clearCurrentSession drops the sid AND its transcript ("Cuộc mới")', () => {
    setSid('s1');
    saveTranscript('s1', [turn(1)]);
    clearCurrentSession();
    expect(getSid()).toBeNull();
    expect(sessionStorage.getItem('og.transcript.s1')).toBeNull();
  });

  it('og.open round-trips', () => {
    expect(getOpen()).toBe(false);
    setOpen(true);
    expect(getOpen()).toBe(true);
    setOpen(false);
    expect(getOpen()).toBe(false);
  });
});
