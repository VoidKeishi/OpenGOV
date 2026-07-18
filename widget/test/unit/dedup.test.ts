// Card dedup vs the nearest earlier assistant turn (WIDGET.md §3.4): the
// backend re-emits the procedure/fragments cards every turn; render skips
// byte-identical repeats but keeps original indices (tick keys must not shift).
import { describe, expect, it } from 'vitest';
import { prevAssistantCards, visibleCards } from '../../src/core/dedup';
import type { Card, Turn } from '../../src/types';

const proc = { type: 'procedure', payload: { code: '1.004222', name: 'Đăng ký thường trú' } } as Card;
const procCopy = JSON.parse(JSON.stringify(proc)) as Card;
const fees = { type: 'fees', payload: { code: '1.004222', channels: [] } } as Card;
const checklistA = { type: 'checklist', payload: { code: '1.004222', groups: [{ id: 'g1' }] } } as Card;
const checklistB = { type: 'checklist', payload: { code: '1.004222', groups: [] } } as Card;

const turn = (role: Turn['role'], cards: Card[] = []): Turn => ({
  role,
  prose: '',
  cards,
  ticks: {},
  revealed: true,
});

describe('visibleCards', () => {
  it('shows everything when there is no previous assistant turn', () => {
    expect(visibleCards([], [proc, fees])).toEqual([
      { card: proc, ci: 0 },
      { card: fees, ci: 1 },
    ]);
  });

  it('skips cards identical to the previous turn, preserving original indices', () => {
    const shown = visibleCards([procCopy], [proc, fees]);
    expect(shown).toEqual([{ card: fees, ci: 1 }]);
  });

  it('keeps a card whose payload changed (checklist re-filtered by case_facts)', () => {
    const shown = visibleCards([checklistA], [checklistB]);
    expect(shown).toEqual([{ card: checklistB, ci: 0 }]);
  });

  it('can hide all cards of a turn', () => {
    expect(visibleCards([proc, fees], [procCopy])).toEqual([]);
  });
});

describe('prevAssistantCards', () => {
  it('skips user/check/notice turns in between', () => {
    const turns = [turn('assistant', [proc]), turn('user'), turn('check'), turn('assistant', [proc, fees])];
    expect(prevAssistantCards(turns, 3)).toEqual([proc]);
  });

  it('an assistant turn without cards resets the window (cards re-show after it)', () => {
    const turns = [turn('assistant', [proc]), turn('user'), turn('assistant'), turn('user'), turn('assistant', [proc])];
    expect(prevAssistantCards(turns, 4)).toEqual([]);
  });

  it('returns empty for the first turn', () => {
    expect(prevAssistantCards([turn('assistant', [proc])], 0)).toEqual([]);
  });
});
