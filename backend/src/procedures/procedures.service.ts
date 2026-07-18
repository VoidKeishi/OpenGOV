import { Inject, Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
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
}
