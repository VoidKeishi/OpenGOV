/**
 * Deterministic composition: engine → catalog lookup + interpolation. Pure and
 * framework-free so it is unit-tested directly. The LLM stage lives in the service
 * and may only APPEND findings (source:'llm'); it never touches these.
 */

import { Catalog, resolveError, ResolvedError } from '../errors/catalog';
import { assertKnownRules, FormSchema, validate } from './engine';
import type { Ctx } from './engine';

export interface ValidationError extends ResolvedError {
  source: 'engine' | 'llm';
}

export interface DeterministicResult {
  errors: ValidationError[];
  /** Catalog codes referenced by the schema but absent from the catalog → fail closed (422). */
  unknownCodes: { code: string; field: string }[];
}

export function runDeterministic(
  schema: FormSchema,
  fields: Record<string, string>,
  caseFacts: Record<string, unknown>,
  ctx: Ctx,
  catalog: Catalog,
): DeterministicResult {
  assertKnownRules(schema); // throws on unknown rule — engine exception → 422
  const hits = validate(schema, fields, caseFacts, ctx);
  const errors: ValidationError[] = [];
  const unknownCodes: { code: string; field: string }[] = [];
  for (const h of hits) {
    const resolved = resolveError(catalog, h.error, h.params, h.field);
    if (!resolved) {
      unknownCodes.push({ code: h.error, field: h.field });
      continue;
    }
    errors.push({ ...resolved, source: 'engine' });
  }
  return { errors, unknownCodes };
}
