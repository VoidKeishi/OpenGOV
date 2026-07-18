/**
 * Record projection for the LLM context (DESIGN.md §6). get_procedure feeds the model a
 * slimmed record — roughly half the merged size — while the full record stays server-side
 * for card building. Curated structures supersede their raw counterparts; internal
 * bookkeeping (review block, traceability codes) never helps the model answer.
 */

import type { ProcedureRecord } from '../db/types';

const LEGAL_NAME_MAX = 120;

export function projectRecordForLlm(record: ProcedureRecord): Record<string, any> {
  const out: Record<string, any> = { ...record };
  const isFull = record.structuring_level === 'full';

  delete out.review;
  delete out.state;
  delete out.source_id;

  if (isFull) {
    // Curated `steps` supersede the verbatim step blobs 1:1. `checklist_raw` stays:
    // its per-case document enumerations (đồng sở hữu, Giấy khai sinh…) carry legal
    // detail the situational curated checklist deliberately abstracts away.
    delete out.steps_raw;
  }

  if (Array.isArray(out.legal_basis)) {
    out.legal_basis = out.legal_basis.map((b: any) => ({
      ...b,
      name: typeof b?.name === 'string' && b.name.length > LEGAL_NAME_MAX
        ? `${b.name.slice(0, LEGAL_NAME_MAX)}…`
        : b?.name,
    }));
  }

  if (out.checklist && Array.isArray(out.checklist.groups)) {
    out.checklist = {
      ...out.checklist,
      groups: out.checklist.groups.map((g: any) => ({
        ...g,
        items: Array.isArray(g?.items)
          ? g.items.map((it: any) => {
              const { source_component_code: _drop, ...rest } = it ?? {};
              return rest;
            })
          : g?.items,
      })),
    };
  }

  return out;
}
