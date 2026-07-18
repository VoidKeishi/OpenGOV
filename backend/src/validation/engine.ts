/**
 * backend/src/validation/engine.ts — the deterministic rule engine (DATA.md §4).
 *
 * A single pure function over the authored schema. Closed rule set of exactly 10
 * rules; a schema referencing any other rule fails loudly at load time
 * (assertKnownRules). No framework, no deps. `llm_check` is skipped here and
 * forwarded to the LLM stage by the service (collectLlmChecks).
 */

import type { ProvincesCtx } from '../db/types';

export type WhenGuard =
  | { field: string; eq: unknown }
  | { field: string; in: unknown[] }
  | { fact: string; eq: unknown }
  | { fact: string; in: unknown[] };

export interface Rule {
  rule: string;
  error: string;
  when?: WhenGuard;
  // rule-specific params
  value?: string; // pattern
  field?: string; // date_before / number_lte_field / cross-field anchor
  before?: string; // date_before
  min?: number; // int_range
  max?: number; // int_range
  fields?: string[]; // at_least_one_of
  attach_to?: string; // at_least_one_of / cross-field render target
  lte?: string; // number_lte_field
  check?: string; // llm_check
  against?: string; // llm_check
}

export interface FieldSchema {
  label: string;
  rules: Rule[];
}

export interface FormSchema {
  procedure_code: string;
  form_ref: string;
  fields: Record<string, FieldSchema>;
  cross_field?: Rule[];
}

export interface RuleHit {
  field: string;
  error: string;
  params: Record<string, string>;
}

export interface Ctx {
  provinces: ProvincesCtx;
}

export const CLOSED_RULE_SET = [
  'required',
  'pattern',
  'date_not_future',
  'date_before',
  'int_range',
  'province_not_defunct',
  'no_district_level',
  'at_least_one_of',
  'number_lte_field',
  'llm_check',
] as const;

const RULE_SET = new Set<string>(CLOSED_RULE_SET);

/** Fail loudly at load time if a schema references a rule the engine doesn't implement. */
export function assertKnownRules(schema: FormSchema): void {
  const bad: string[] = [];
  for (const [name, f] of Object.entries(schema.fields ?? {})) {
    for (const r of f.rules ?? []) if (!RULE_SET.has(r.rule)) bad.push(`fields.${name}.${r.rule}`);
  }
  for (const r of schema.cross_field ?? []) if (!RULE_SET.has(r.rule)) bad.push(`cross_field.${r.rule}`);
  if (bad.length) {
    throw new Error(`FormSchema references unknown rule(s): ${bad.join(', ')}`);
  }
}

/** Main entry: run every deterministic rule, collect hits. Order: fields then cross_field. */
export function validate(
  schema: FormSchema,
  fields: Record<string, string>,
  caseFacts: Record<string, unknown>,
  ctx: Ctx,
): RuleHit[] {
  const hits: RuleHit[] = [];

  for (const [name, fieldSchema] of Object.entries(schema.fields ?? {})) {
    const value = fields[name] ?? '';
    const label = fieldSchema.label ?? name;
    for (const rule of fieldSchema.rules ?? []) {
      if (!whenSatisfied(rule.when, fields, caseFacts)) continue;
      const hit = applyRule(rule, name, label, value, fields, schema, ctx);
      if (hit) hits.push(hit);
    }
  }

  for (const rule of schema.cross_field ?? []) {
    if (!whenSatisfied(rule.when, fields, caseFacts)) continue;
    const anchor = rule.attach_to ?? rule.field ?? '';
    const label = schema.fields[anchor]?.label ?? anchor;
    const hit = applyRule(rule, anchor, label, fields[anchor] ?? '', fields, schema, ctx);
    if (hit) hits.push(hit);
  }

  return hits;
}

/** Which llm_check rules currently apply (when-guards satisfied) — forwarded to the LLM stage. */
export function collectLlmChecks(
  schema: FormSchema,
  fields: Record<string, string>,
  caseFacts: Record<string, unknown>,
): { field: string; label: string; check: string; against?: string; error: string }[] {
  const out: { field: string; label: string; check: string; against?: string; error: string }[] = [];
  for (const [name, fieldSchema] of Object.entries(schema.fields ?? {})) {
    for (const rule of fieldSchema.rules ?? []) {
      if (rule.rule !== 'llm_check') continue;
      if (!whenSatisfied(rule.when, fields, caseFacts)) continue;
      if (!(name in fields)) continue; // only when the field is present in the payload
      out.push({ field: name, label: fieldSchema.label ?? name, check: rule.check!, against: rule.against, error: rule.error });
    }
  }
  return out;
}

// --- rule dispatch ---

function applyRule(
  rule: Rule,
  field: string,
  label: string,
  value: string,
  fields: Record<string, string>,
  schema: FormSchema,
  ctx: Ctx,
): RuleHit | null {
  const base = { field, error: rule.error };
  switch (rule.rule) {
    case 'required':
      return value.trim() === '' ? { ...base, params: { label } } : null;

    case 'pattern': {
      if (value.trim() === '') return null; // emptiness is `required`'s job
      const re = new RegExp(`^(?:${rule.value})$`);
      return re.test(value) ? null : { ...base, params: { label } };
    }

    case 'date_not_future': {
      const d = parseDate(value);
      if (!d) return null;
      return d.getTime() > startOfToday() ? { ...base, params: { label } } : null;
    }

    case 'date_before': {
      const a = parseDate(fields[rule.field!] ?? '');
      const b = parseDate(fields[rule.before!] ?? '');
      if (!a || !b) return null;
      return a.getTime() < b.getTime() ? null : { ...base, params: { label } };
    }

    case 'int_range': {
      if (value.trim() === '') return null;
      const n = Number(value);
      const ok = Number.isInteger(n) && n >= rule.min! && n <= rule.max!;
      return ok ? null : { ...base, params: { label, min: String(rule.min), max: String(rule.max) } };
    }

    case 'province_not_defunct': {
      if (value.trim() === '') return null;
      const lc = value.toLowerCase();
      for (const d of ctx.provinces.defunct) {
        if (lc.includes(d.name.toLowerCase())) {
          return { ...base, params: { label, old: d.name, new: d.merged_into } };
        }
      }
      return null;
    }

    case 'no_district_level':
      return /(quận|huyện|thị xã)/i.test(value) ? { ...base, params: { label } } : null;

    case 'at_least_one_of': {
      const list = rule.fields ?? [];
      const anyPresent = list.some((f) => (fields[f] ?? '').trim() !== '');
      return anyPresent ? null : { ...base, params: { label } };
    }

    case 'number_lte_field': {
      const self = fields[rule.field ?? field] ?? '';
      const other = fields[rule.lte!] ?? '';
      if (self.trim() === '' || other.trim() === '') return null;
      const a = Number(self);
      const b = Number(other);
      if (Number.isNaN(a) || Number.isNaN(b)) return null;
      return a <= b ? null : { ...base, params: { label } };
    }

    case 'llm_check':
      return null; // handled by the LLM stage, never by the engine

    default:
      return null; // unreachable — assertKnownRules gates load
  }
}

export function whenSatisfied(
  when: WhenGuard | undefined,
  fields: Record<string, string>,
  caseFacts: Record<string, unknown>,
): boolean {
  if (!when) return true;
  const src: Record<string, unknown> = 'field' in when ? fields : caseFacts;
  const key = 'field' in when ? when.field : when.fact;
  const val = src[key];
  if ('eq' in when) return val === when.eq;
  if ('in' in when) return Array.isArray(when.in) && when.in.includes(val);
  return true;
}

// --- date helpers (accept ISO YYYY-MM-DD and Vietnamese DD/MM/YYYY) ---

function parseDate(raw: string): Date | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return utc(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return utc(+m[3], +m[2], +m[1]);
  return null;
}

function utc(y: number, mo: number, d: number): Date | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? dt : null;
}

function startOfToday(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}
