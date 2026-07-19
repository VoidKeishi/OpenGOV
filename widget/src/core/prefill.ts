// Confirmed prefill (WIDGET.md §12.4): map session case_facts through the
// schema's declarative prefill map onto form fields. Reads are pure; the only
// write path is writeField(), which the UI calls after explicit confirmation.

import type { PrefillMapEntry } from '../types';
import { findField } from './capture';

/**
 * Resolve one prefill entry to the string that would be written, or null when
 * the fact is missing/unusable. `transform.enum` maps fact values to display
 * labels — the only transform kind (DATA.md §4).
 */
export function prefillValue(entry: PrefillMapEntry, caseFacts: Record<string, unknown>): string | null {
  const raw = caseFacts[entry.fact];
  if (raw == null || typeof raw === 'object') return null;
  const s = String(raw).trim();
  if (!s) return null;
  const mapped = entry.transform?.enum?.[s];
  return mapped ?? s;
}

/** Strip diacritics/case/punctuation so user phrasing matches option labels. */
function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[_\W]+/g, ' ')
    .trim();
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Resolve a free-text fact value onto one of a select's options: exact
 * normalized match first, then a unique word-boundary containment either way
 * ("con_de" → "Con"). Ambiguous or no match → null (the row is not offered).
 */
export function resolveSelectValue(el: HTMLSelectElement, value: string): string | null {
  const v = norm(value);
  if (!v) return null;
  const opts = Array.from(el.options).filter((o) => o.value.trim() !== '');
  const exact = opts.find((o) => norm(o.value) === v || norm(o.text) === v);
  if (exact) return exact.value;
  const hits = opts.filter((o) => {
    const ov = norm(o.text) || norm(o.value);
    if (!ov) return false;
    return (
      new RegExp(`(^| )${escapeRe(ov)}( |$)`).test(v) ||
      new RegExp(`(^| )${escapeRe(v)}( |$)`).test(ov)
    );
  });
  return hits.length === 1 ? hits[0]!.value : null;
}

export interface PrefillCandidate {
  field: string;
  fact: string;
  value: string;
  /** Current DOM value (becomes `prev` on apply — undo restores it). */
  current: string;
}

/**
 * Candidate rows for the preview: fact present, field on the current DOM, and
 * the value actually differs (already-identical fields are hidden, §12.4).
 */
export function buildPrefillCandidates(
  prefillMap: Record<string, PrefillMapEntry>,
  caseFacts: Record<string, unknown>,
  doc: ParentNode,
): PrefillCandidate[] {
  const out: PrefillCandidate[] = [];
  for (const [field, entry] of Object.entries(prefillMap)) {
    let value = prefillValue(entry, caseFacts);
    if (value == null) continue;
    const el = findField(doc, field);
    if (!el) continue;
    // Selects only accept their own option values — resolve the conversational
    // fact onto one (or drop the row) so the preview never promises a dead write.
    if (el instanceof HTMLSelectElement) {
      value = resolveSelectValue(el, value);
      if (value == null) continue;
    }
    const current = (el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value ?? '';
    if (current === value) continue;
    out.push({ field, fact: entry.fact, value, current });
  }
  return out;
}

/**
 * Write through the native value setter + dispatch `input` (and `change` for
 * selects) so React-controlled portal inputs pick the value up (§12.4 gotcha).
 * Returns false for elements it refuses to write (unknown tags).
 */
export function writeField(el: Element, value: string): boolean {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const proto = el instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, value);
    else (el as HTMLInputElement).value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  if (el instanceof HTMLSelectElement) {
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.value === value; // no matching option → the select rejected the write
  }
  return false;
}
