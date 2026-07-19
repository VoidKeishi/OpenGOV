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

// --- directive tail ([[CARDS/CHIPS/GUIDE: ...]], DESIGN.md §6) ---

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

/** Any [[KEY: ...]] directive line — unknown KEYs are stripped too (forward-compat). */
const DIRECTIVE_RE = /\[\[([A-Z_]+):([^\]]*)\]\]/gi;

const MAX_CHIPS = 3;
const MAX_CHIP_LEN = 60;

export interface ParsedDirectiveTail {
  cleaned: string;
  /** null = no parseable CARDS tail found (caller falls back + warns). */
  selections: Map<string, Set<string>> | null;
  /** Quick-reply suggestions ([[CHIPS: a | b]]); empty when absent. */
  chips: string[];
  /** UI guide target ([[GUIDE: <code>=<target>]]); null when absent. */
  guide: { code: string; target: string } | null;
}

/**
 * Extract every model directive from the answer tail and strip ALL [[KEY:...]]
 * occurrences from the prose (including unknown KEYs). Must run before the
 * number guard, streaming, and history persistence — no directive ever reaches
 * the wire. Last occurrence wins per directive.
 */
export function parseDirectiveTail(answer: string): ParsedDirectiveTail {
  let cardsBody: string | null = null;
  let chipsBody: string | null = null;
  let guideBody: string | null = null;
  for (const m of answer.matchAll(DIRECTIVE_RE)) {
    const key = m[1]!.toUpperCase();
    if (key === 'CARDS') cardsBody = m[2]!;
    else if (key === 'CHIPS') chipsBody = m[2]!;
    else if (key === 'GUIDE') guideBody = m[2]!;
    // unknown KEY: stripped below, otherwise ignored
  }
  const cleaned = answer.replace(DIRECTIVE_RE, '').replace(/\s+$/, '').trim();

  return {
    cleaned,
    selections: cardsBody != null ? parseCardsBody(cardsBody) : null,
    chips: chipsBody != null ? parseChipsBody(chipsBody) : [],
    guide: guideBody != null ? parseGuideBody(guideBody) : null,
  };
}

function parseCardsBody(body: string): Map<string, Set<string>> | null {
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
  return selections.size ? selections : null;
}

function parseChipsBody(body: string): string[] {
  return body
    .split('|')
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, MAX_CHIPS)
    .map((c) => (c.length > MAX_CHIP_LEN ? c.slice(0, MAX_CHIP_LEN - 1).trimEnd() + '…' : c));
}

function parseGuideBody(body: string): { code: string; target: string } | null {
  const eq = body.indexOf('=');
  if (eq < 0) return null;
  const code = body.slice(0, eq).trim();
  const target = body.slice(eq + 1).trim();
  return code && target ? { code, target } : null;
}

/**
 * Guide card (WIDGET.md §3.4): validated against the procedure's form schema —
 * target must be a schema field key or the `submit` anchor. Invalid target or no
 * schema → null (caller warns `guide_target_unknown`). The label lets the widget
 * render a meaningful line even when the target is on another wizard step.
 */
export function buildGuideCard(
  code: string,
  target: string,
  schema: { fields: Record<string, { label: string }> } | null,
  formPath: string | null,
): Card | null {
  if (!schema) return null;
  let label: string;
  if (target === 'submit') {
    label = 'Nút Nộp hồ sơ / Tiếp tục';
  } else if (schema.fields?.[target]?.label) {
    label = schema.fields[target]!.label;
  } else {
    return null;
  }
  return { type: 'guide', payload: { code, target, label, form_path: formPath } };
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
  resolveFormPath?: (code: string) => string | null,
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
    // Phase 2: on-portal CTA path rides on the cards the widget renders CTAs from.
    const formPath = resolveFormPath?.(code) ?? null;
    for (const type of EMIT_ORDER) {
      if (!wanted.has(type)) continue;
      const card = buildCardOfType(record, type, caseFacts);
      if (!card) continue;
      if (formPath && (card.type === 'procedure' || card.type === 'checklist')) {
        card.payload.form_path = formPath;
      }
      cards.push(card);
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
