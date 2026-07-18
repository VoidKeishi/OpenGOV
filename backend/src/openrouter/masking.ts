/**
 * PII masking for values sent to external LLM APIs (DESIGN.md §5 rule; ARCHITECTURE.md §4).
 * Conservative redaction: long digit runs (CCCD/định danh/phone), emails. The llm_check
 * stage only needs the *shape* of free text, not the raw identifiers.
 */

export function maskPII(input: string): string {
  return input
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/\d{5,}/g, (m) => '#'.repeat(m.length));
}

/** Mask every string value in a flat record (used before forwarding llm_check inputs). */
export function maskFields(fields: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) out[k] = typeof v === 'string' ? maskPII(v) : v;
  return out;
}
