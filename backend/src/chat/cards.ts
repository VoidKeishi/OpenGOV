/**
 * Gen-UI cards (ARCHITECTURE.md §2 principle 4): structured numbers — fees, deadlines,
 * agencies, freshness — are rendered straight from the record into card payloads. The
 * LLM stream carries prose only; numbersCoveredByCards() enforces that every digit that
 * appears in prose is backed by card data.
 */

import type { ProcedureRecord } from '../db/types';

export interface Card {
  type: string;
  payload: Record<string, any>;
}

export function buildCards(record: ProcedureRecord): Card[] {
  const code = record.code;
  const cards: Card[] = [];

  cards.push({
    type: 'procedure',
    payload: {
      code,
      name: record.name,
      executing_agency: record.executing_agency ?? null,
      promulgating_agency: record.promulgating_agency ?? null,
      category: record.category?.name ?? record.category_name ?? null,
      source_url: record.source?.url ?? null,
      updated_at: record.source?.updated_at ?? null,
      structuring_level: record.structuring_level ?? 'raw',
    },
  });

  if (Array.isArray(record.channels) && record.channels.length) {
    cards.push({
      type: 'fees',
      payload: {
        code,
        channels: record.channels.map((c: any) => ({ method: c.method, fees: c.fees ?? [] })),
        fee_notes: record.fee_notes ?? [],
      },
    });
    cards.push({
      type: 'processing',
      payload: {
        code,
        processing_cases: record.processing_cases ?? [],
        channels: record.channels.map((c: any) => ({ method: c.method, processing: c.processing })),
      },
    });
  }

  if (Array.isArray(record.deadlines) && record.deadlines.length) {
    cards.push({ type: 'deadlines', payload: { code, deadlines: record.deadlines } });
  }
  if (Array.isArray(record.legal_basis) && record.legal_basis.length) {
    cards.push({ type: 'legal_basis', payload: { code, legal_basis: record.legal_basis } });
  }
  if (Array.isArray(record.legal_fragments) && record.legal_fragments.length) {
    cards.push({
      type: 'legal_fragments',
      payload: {
        code,
        fragments: record.legal_fragments.map((f: any) => ({
          id: f.id,
          article: f.article,
          doc_code: f.doc_code,
          doc_title: f.doc_title,
          title: f.title,
          source_url: f.source_url,
          retrieved_at: f.retrieved_at,
        })),
      },
    });
  }

  return cards;
}

/** A card for a procedure known only from catalog metadata (out-of-scope, fail-closed). */
export function metadataCard(meta: {
  code: string;
  name: string;
  executing_agency: string | null;
  source_url: string;
}): Card {
  return {
    type: 'procedure',
    payload: {
      code: meta.code,
      name: meta.name,
      executing_agency: meta.executing_agency,
      source_url: meta.source_url,
      limited: true,
    },
  };
}

/** Contiguous digit tokens in prose, separators (., ,) stripped: "10.000đ" → "10000". */
export function extractProseNumbers(prose: string): string[] {
  const out: string[] = [];
  for (const m of prose.matchAll(/\d[\d.,]*/g)) {
    const digits = m[0].replace(/\D/g, '');
    if (digits) out.push(digits);
  }
  return out;
}

/** All digits present across the card payloads, concatenated. */
export function cardDigitString(cards: Card[]): string {
  return JSON.stringify(cards.map((c) => c.payload)).replace(/\D/g, '');
}

/**
 * Every numeric token in prose must be backed by card data (its digits appear in some
 * card). Permissive by design (a card's digit string is a superset), so it flags only
 * numbers with no card backing at all — the "LLM invented a figure" case.
 */
export function numbersCoveredByCards(prose: string, cards: Card[]): { ok: boolean; offending: string[] } {
  const digits = cardDigitString(cards);
  const offending = extractProseNumbers(prose).filter((n) => !digits.includes(n));
  return { ok: offending.length === 0, offending };
}
