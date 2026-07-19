/**
 * Server-side validation for update_case_facts (Phase-2 hardening). On follow-up
 * turns the model no longer has case_facts_schema in context (history keeps text
 * only) and tends to invent keys ("chu_ho") or paraphrase enum values
 * ("co_quan_he_nhan_than"). Wrong facts are worse than missing ones: a mismatched
 * enum silently DROPS checklist groups (evalWhen 'no') instead of fail-opening.
 * So: unknown keys are rejected with the valid-key list (the agent loop feeds it
 * back to the model), enum values snap to the single containing match or get
 * rejected with the allowed values.
 */

export interface FactDef {
  type: string;
  values?: unknown[];
}

export interface NormalizedFacts {
  accepted: Record<string, unknown>;
  rejected: Record<string, string>;
}

export function normalizeCaseFacts(
  facts: Record<string, unknown>,
  schema: Record<string, FactDef>,
): NormalizedFacts {
  const accepted: Record<string, unknown> = {};
  const rejected: Record<string, string> = {};
  const validKeys = Object.keys(schema);

  for (const [key, raw] of Object.entries(facts ?? {})) {
    const def = schema[key];
    if (!def) {
      rejected[key] = `unknown_key — dùng đúng khóa trong case_facts_schema: ${validKeys.join(', ')}`;
      continue;
    }
    if (def.type === 'enum') {
      const values = (def.values ?? []).map(String);
      const s = String(raw).trim();
      if (values.includes(s)) {
        accepted[key] = s;
        continue;
      }
      // Paraphrase snap: exactly one enum value contained in (or containing) the input.
      const snapped = values.filter((v) => s.includes(v) || v.includes(s));
      if (snapped.length === 1) {
        accepted[key] = snapped[0];
        continue;
      }
      rejected[key] = `invalid_value — chọn một trong: ${values.join(', ')}`;
    } else if (def.type === 'boolean') {
      if (typeof raw === 'boolean') accepted[key] = raw;
      else if (raw === 'true' || raw === 'false') accepted[key] = raw === 'true';
      else rejected[key] = 'invalid_value — true hoặc false';
    } else {
      // string facts (identity data for prefill): keep verbatim
      const s = String(raw).trim();
      if (s) accepted[key] = s;
      else rejected[key] = 'empty_value';
    }
  }
  return { accepted, rejected };
}
