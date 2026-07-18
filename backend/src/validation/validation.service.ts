import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { Dao } from '../db/dao';
import { CatalogService } from '../errors/catalog.service';
import { maskFields } from '../openrouter/masking';
import { LLM_CLIENT } from '../openrouter/openrouter.module';
import type { LlmClient } from '../openrouter/types';
import { ProceduresService } from '../procedures/procedures.service';
import { collectLlmChecks } from './engine';
import { runDeterministic, ValidationError } from './validate';

const GENERIC_422 = 'Không thể kiểm tra hồ sơ do lỗi cấu hình xác thực. Vui lòng thử lại sau.';

export interface ValidateRequest {
  procedure_code: string;
  fields: Record<string, string>;
  case_facts: Record<string, unknown>;
}

/**
 * /validate pipeline (ARCHITECTURE.md §4, DATA.md §4):
 *   deterministic engine → catalog interpolation → llm_check stage (masked, append-only).
 * Advisory ERR-* codes (detection needs state DBs) are NOT engine rules — they surface
 * as chat/checklist guidance, never here. Unknown code / engine throw → 422 fail-closed.
 */
@Injectable()
export class ValidationService {
  private readonly log = new Logger('Validation');

  constructor(
    private readonly procedures: ProceduresService,
    private readonly dao: Dao,
    private readonly catalog: CatalogService,
    @Inject(LLM_CLIENT) private readonly llm: LlmClient,
  ) {}

  async validate(req: ValidateRequest): Promise<{ errors: ValidationError[] }> {
    const schema = this.procedures.getFormSchema(req.procedure_code);
    if (!schema) {
      throw new HttpException(
        { message: `Chưa có schema xác thực cho thủ tục ${req.procedure_code}.` },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    let det;
    try {
      det = runDeterministic(schema, req.fields, req.case_facts, { provinces: this.dao.getProvinces() }, this.catalog.raw);
    } catch (err) {
      this.log.error(`engine error for ${req.procedure_code}: ${(err as Error).message}`);
      throw new HttpException({ message: GENERIC_422 }, HttpStatus.UNPROCESSABLE_ENTITY);
    }
    if (det.unknownCodes.length) {
      this.log.error(`unknown catalog code(s): ${det.unknownCodes.map((u) => u.code).join(', ')}`);
      throw new HttpException({ message: GENERIC_422 }, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    let errors = det.errors;

    const checks = collectLlmChecks(schema, req.fields, req.case_facts);
    if (checks.length && this.llm.available) {
      try {
        errors = [...errors, ...(await this.runLlmChecks(checks, req.fields))];
      } catch (err) {
        // llm_check is best-effort; it may never fail the request or suppress engine hits.
        this.log.warn(`llm_check stage skipped: ${(err as Error).message}`);
      }
    }

    return { errors };
  }

  private async runLlmChecks(
    checks: { field: string; label: string; check: string; against?: string; error: string }[],
    fields: Record<string, string>,
  ): Promise<ValidationError[]> {
    const masked = maskFields(fields);
    const payload = checks.map((c) => ({
      field: c.field,
      label: c.label,
      check: c.check,
      value: masked[c.field] ?? '',
      against: c.against ? { field: c.against, value: masked[c.against] ?? '' } : null,
    }));

    const res = await this.llm.complete({
      tier: 'cheap',
      jsonMode: true,
      temperature: 0,
      maxTokens: 500,
      messages: [
        {
          role: 'system',
          content:
            'Bạn kiểm tra mâu thuẫn ngữ nghĩa trong hồ sơ hành chính. Giá trị đã được che (masked). ' +
            'Với mỗi mục, quyết định xem quy tắc "check" có bị VI PHẠM không. ' +
            'Trả về JSON {"results":[{"field":"...","fail":true|false}]}. Chỉ đánh fail khi chắc chắn có mâu thuẫn.',
        },
        { role: 'user', content: JSON.stringify(payload) },
      ],
    });

    const failed = parseFailures(res.content);
    const out: ValidationError[] = [];
    for (const c of checks) {
      if (!failed.has(c.field)) continue;
      const resolved = this.catalog.resolve(c.error, { label: c.label }, c.field);
      if (resolved) out.push({ ...resolved, source: 'llm' }); // llm may only APPEND, never suppress
    }
    return out;
  }
}

function parseFailures(content: string | null): Set<string> {
  const set = new Set<string>();
  if (!content) return set;
  try {
    const obj = JSON.parse(content);
    for (const r of obj?.results ?? []) if (r?.fail === true && typeof r.field === 'string') set.add(r.field);
  } catch {
    /* ignore malformed llm output — no llm hits appended */
  }
  return set;
}
