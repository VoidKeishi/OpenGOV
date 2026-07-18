/**
 * backend/src/errors/catalog.ts — pure loader + interpolation for the error catalog
 * (data/errors/catalog.json, DATA.md §4). Holds both engine codes (E_*) and the
 * advisory ERR-* codes. Messages/suggestions are Vietnamese with {param} interpolation.
 */

import { readFileSync } from 'node:fs';

export interface CatalogEntry {
  type: 'missing' | 'format' | 'invalid_value' | 'conflict';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion: string;
  /** Documentation of the detection rule; advisory entries are never engine-fired. */
  detection?: string;
}

export type Catalog = Record<string, CatalogEntry>;

export interface ResolvedError {
  field?: string;
  code: string;
  type: string;
  severity: string;
  message: string;
  suggestion: string;
}

/** Load and strip `_`-prefixed metadata keys. */
export function loadCatalog(path: string): Catalog {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  const out: Catalog = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith('_')) continue;
    out[k] = v as CatalogEntry;
  }
  return out;
}

/** Replace {key} tokens with params[key]; unknown tokens are left intact for debuggability. */
export function interpolate(template: string, params: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, key) => (key in params ? params[key] : m));
}

/**
 * Resolve a catalog code + params into a rendered error, or null if the code is
 * unknown (the caller then fails closed — 422 generic, never an LLM improvisation).
 */
export function resolveError(
  catalog: Catalog,
  code: string,
  params: Record<string, string>,
  field?: string,
): ResolvedError | null {
  const entry = catalog[code];
  if (!entry) return null;
  return {
    field,
    code,
    type: entry.type,
    severity: entry.severity,
    message: interpolate(entry.message, params),
    suggestion: interpolate(entry.suggestion, params),
  };
}
