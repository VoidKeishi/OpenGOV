// Render-time card dedup. The backend force-includes the procedure card (and
// legal fragments) on every turn so each answer is self-contained on the wire;
// rendered as-is that repeats identical boxes turn after turn. A card identical
// (by JSON) to one in the nearest earlier assistant turn is skipped; after a
// detour (error turn, fail-closed answer — both carry no cards) the window
// resets and the card shows again. Wire format and transcript cache unchanged.
import type { Card, Turn } from '../types';

/** Cards to render for a turn, with ORIGINAL indices so tick keys stay stable. */
export function visibleCards(prevCards: Card[], cards: Card[]): { card: Card; ci: number }[] {
  const seen = new Set(prevCards.map((c) => JSON.stringify(c)));
  return cards
    .map((card, ci) => ({ card, ci }))
    .filter(({ card }) => !seen.has(JSON.stringify(card)));
}

/** Cards of the nearest earlier assistant turn (user/check/notice turns are skipped). */
export function prevAssistantCards(turns: Turn[], i: number): Card[] {
  for (let j = i - 1; j >= 0; j--) {
    const t = turns[j];
    if (t && t.role === 'assistant') return t.cards;
  }
  return [];
}
