import { Inject, Injectable } from '@nestjs/common';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { AppConfigService } from '../config/config.module';
import { Dao } from '../db/dao';
import type { ProcedureRecord, SearchHit } from '../db/types';
import { LLM_CLIENT } from '../openrouter/openrouter.module';
import type { LlmClient } from '../openrouter/types';
import type { FormSchema } from '../validation/engine';
import { searchProcedures } from './search';

/** Discovery + record/schema access — backs the chat tools and the validation service. */
@Injectable()
export class ProceduresService {
  constructor(
    private readonly dao: Dao,
    @Inject(LLM_CLIENT) private readonly llm: LlmClient,
    private readonly cfg: AppConfigService,
  ) {}

  search(query: string, limit = 5): Promise<SearchHit[]> {
    return searchProcedures(query, { dao: this.dao, llm: this.llm }, limit);
  }

  getProcedure(code: string): ProcedureRecord | null {
    return this.dao.getProcedureRecord(code);
  }

  /** Loaded from disk each call so schemas can appear without a code change (task note). */
  getFormSchema(code: string): FormSchema | null {
    const path = join(this.cfg.config.schemasDir, `${code}.form.json`);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf8')) as FormSchema;
  }

  listSchemaIndex(): SchemaIndexEntry[] {
    return listSchemaIndex(this.cfg.config.schemasDir, this.cfg.config.formPathPrefix);
  }

  /**
   * Relative on-portal wizard path for codes that have a form schema; null otherwise.
   * Gates every Phase-2 on-portal affordance (CTA, guide) to the pilot procedures.
   */
  getFormPath(code: string): string | null {
    const schema = this.getFormSchema(code);
    return schema ? this.cfg.config.formPathPrefix + schema.form_ref : null;
  }
}

export interface SchemaIndexEntry {
  procedure_code: string;
  form_ref: string;
  field_keys: string[];
  /** Phase 2: relative wizard path on the embedding portal (prefix + form_ref). */
  form_path: string;
  /** Phase 2: conversation→form mapping, verbatim from the schema file (may be absent). */
  prefill?: Record<string, { fact: string; transform?: { enum?: Record<string, string> } }>;
}

/**
 * R1 (WIDGET.md §10): index of every authored form schema. The widget matches
 * DOM field names against `field_keys` to detect which procedure's form is on
 * the page; `form_path`/`prefill` power the Phase-2 CTA and confirmed-prefill
 * flows. Read from disk each call, same rationale as getFormSchema.
 */
export function listSchemaIndex(schemasDir: string, formPathPrefix = '/nop-truc-tuyen/'): SchemaIndexEntry[] {
  if (!existsSync(schemasDir)) return [];
  return readdirSync(schemasDir)
    .filter((f) => f.endsWith('.form.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(schemasDir, f), 'utf8')) as FormSchema)
    .map((s) => ({
      procedure_code: s.procedure_code,
      form_ref: s.form_ref,
      field_keys: Object.keys(s.fields ?? {}),
      form_path: formPathPrefix + s.form_ref,
      ...(s.prefill ? { prefill: s.prefill } : {}),
    }));
}
