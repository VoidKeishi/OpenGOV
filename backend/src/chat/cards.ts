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

// --- card selection (answer tail [[CARDS: <code>=<types>]], DESIGN.md §6) ---

const SELECTABLE_TYPES = new Set([
  'procedure',
  'checklist',
  'fees',
  'processing',
  'deadlines',
  'legal_basis',
  'legal_fragments',
]);

/** Emission order is canonical and independent of the order the model wrote. */
const EMIT_ORDER = ['procedure', 'checklist', 'fees', 'processing', 'deadlines', 'legal_basis', 'legal_fragments'];

const CARDS_TAIL_RE = /\[\[CARDS:[^\]]*\]\]/gi;

export interface ParsedCardsTail {
  cleaned: string;
  /** null = no parseable tail found (caller falls back + warns). */
  selections: Map<string, Set<string>> | null;
}

/**
 * Extract the model's card selections from the answer tail and strip every
 * [[CARDS:...]] occurrence from the prose. Must run before the number guard,
 * streaming, and history persistence — the tail never reaches the wire.
 */
export function parseCardsTail(answer: string): ParsedCardsTail {
  const matches = answer.match(CARDS_TAIL_RE) ?? [];
  const cleaned = answer.replace(CARDS_TAIL_RE, '').replace(/\s+$/, '').trim();
  if (!matches.length) return { cleaned, selections: null };

  const body = matches[matches.length - 1]!.replace(/^\[\[CARDS:/i, '').replace(/\]\]$/, '');
  const selections = new Map<string, Set<string>>();
  for (const part of body.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const code = part.slice(0, eq).trim();
    if (!code) continue;
    const types = new Set(
      part
        .slice(eq + 1)
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => SELECTABLE_TYPES.has(t)),
    );
    if (types.size) selections.set(code, types);
  }
  return { cleaned, selections: selections.size ? selections : null };
}

/**
 * Build the turn's cards from the model's selections. Unknown codes/types are ignored;
 * `procedure` is force-included and `legal_fragments` force-appended (they carry the
 * source_url + doc codes that citations and golden-qa rely on). On follow-up turns the
 * model answers from history without re-calling get_procedure, so tail codes outside
 * this turn's `visited` map are resolved from the DB via `resolveRecord` — the tail is
 * the model's card request, not a log of tool calls. No usable selection but procedures
 * were visited → lean fail-safe: procedure + fragments of the last visit. Out-of-scope
 * records (structuring_level !== 'full') emit the limited metadata card only.
 */
export function selectCards(
  visited: Map<string, ProcedureRecord>,
  selections: Map<string, Set<string>> | null,
  caseFacts: Record<string, unknown>,
  resolveRecord?: (code: string) => ProcedureRecord | null,
): Card[] {
  const records = new Map(visited);
  let effective: Map<string, Set<string>> | null = null;
  if (selections) {
    for (const code of selections.keys()) {
      if (!records.has(code)) {
        const rec = resolveRecord?.(code);
        if (rec) records.set(code, rec);
      }
    }
    effective = new Map([...selections].filter(([code]) => records.has(code)));
  }
  if (!effective?.size) {
    const last = [...visited.keys()].pop();
    if (!last) return [];
    effective = new Map([[last, new Set(['procedure'])]]);
  }

  const cards: Card[] = [];
  for (const [code, types] of effective) {
    const record = records.get(code)!;
    if (record.structuring_level !== 'full') {
      cards.push(
        metadataCard({
          code,
          name: record.name,
          executing_agency: record.executing_agency ?? null,
          source_url: record.source?.url ?? '',
        }),
      );
      continue;
    }
    const wanted = new Set(types);
    wanted.add('procedure');
    if (Array.isArray(record.legal_fragments) && record.legal_fragments.length) wanted.add('legal_fragments');
    for (const type of EMIT_ORDER) {
      if (!wanted.has(type)) continue;
      const card = buildCardOfType(record, type, caseFacts);
      if (card) cards.push(card);
    }
  }
  return cards;
}

function buildCardOfType(record: ProcedureRecord, type: string, caseFacts: Record<string, unknown>): Card | null {
  if (type === 'checklist') return buildChecklistCard(record, caseFacts);
  const all = buildCards(record);
  return all.find((c) => c.type === type) ?? null;
}

// --- deterministic checklist card (WIDGET.md §10 R2) ---

type When = { fact: string; eq?: unknown; in?: unknown[] } | null | undefined;

/**
 * Condition mini-language (DATA.md §3): exactly `eq` and `in`, over case_facts only.
 * Missing fact → 'unknown' (fail-open: keep with the "tùy trường hợp" badge).
 */
export function evalWhen(when: When, facts: Record<string, unknown>): 'yes' | 'no' | 'unknown' {
  if (when == null) return 'yes';
  const value = facts[when.fact];
  if (value === undefined) return 'unknown';
  if ('eq' in when) return value === when.eq ? 'yes' : 'no';
  if (Array.isArray(when.in)) return when.in.includes(value) ? 'yes' : 'no';
  return 'unknown';
}

/**
 * Filter the curated checklist against session case_facts into the tick-able card.
 * Group/item `when` not satisfied → dropped; unverifiable (missing fact) → kept with
 * `conditional: true` (a checklist that hides documents is worse than one that
 * over-shows). Quantities ride in the card, so they clear the numbers guard.
 */
export function buildChecklistCard(record: ProcedureRecord, caseFacts: Record<string, unknown>): Card | null {
  const groups: any[] = record.checklist?.groups;
  if (!Array.isArray(groups) || !groups.length) return null;

  const outGroups: Record<string, any>[] = [];
  for (const g of groups) {
    const groupVerdict = evalWhen(g?.when, caseFacts);
    if (groupVerdict === 'no') continue;
    const items: Record<string, any>[] = [];
    for (const it of Array.isArray(g?.items) ? g.items : []) {
      const itemVerdict = evalWhen(it?.when, caseFacts);
      if (itemVerdict === 'no') continue;
      items.push({
        id: it?.id,
        label: it?.label,
        quantity: it?.quantity,
        kind: it?.kind,
        conditional: itemVerdict === 'unknown' || groupVerdict === 'unknown',
      });
    }
    if (!items.length) continue;
    outGroups.push({ id: g?.id, label: g?.label, type: g?.type, items });
  }

  if (!outGroups.length) return null;
  return { type: 'checklist', payload: { code: record.code, groups: outGroups } };
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
