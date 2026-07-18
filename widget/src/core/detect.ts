// Procedure detection by DOM match against the schema index (WIDGET.md §6.1).
// Pure: caller passes the document, pathname and last-known procedure code.
//
// Deliberate deviation from §6.1's literal wording: we count DISTINCT field
// names present, not matching elements — a 2-input radio group is one field,
// and §11's acceptance line says "≥3 field".

import type { DetectState, SchemaIndexEntry } from '../types';
import { findField } from './capture';

export function detect(
  schemas: SchemaIndexEntry[],
  doc: ParentNode,
  pathname: string,
  lastProcedureCode: string | null,
): DetectState {
  let best: SchemaIndexEntry | null = null;
  let bestCount = 0;
  for (const schema of schemas) {
    let count = 0;
    for (const key of schema.field_keys) {
      if (findField(doc, key)) count++;
    }
    if (count > bestCount) {
      best = schema;
      bestCount = count;
    }
  }
  if (best && bestCount >= 3) return { kind: 'DETECTED_READY', schema: best };

  const byPath = schemas.find((s) => s.form_ref && pathname.includes(s.form_ref));
  if (byPath) return { kind: 'DETECTED_NOFIELDS', schema: byPath };

  if (lastProcedureCode) {
    const byFacts = schemas.find((s) => s.procedure_code === lastProcedureCode);
    if (byFacts) return { kind: 'DETECTED_NOFIELDS', schema: byFacts };
  }
  return { kind: 'NONE' };
}
