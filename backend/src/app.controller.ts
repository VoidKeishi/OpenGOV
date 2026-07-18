import { Controller, Get, Inject } from '@nestjs/common';
import { AppConfigService } from './config/config.module';
import { LLM_CLIENT } from './openrouter/openrouter.module';
import type { LlmClient } from './openrouter/types';

@Controller()
export class AppController {
  constructor(
    private readonly cfg: AppConfigService,
    @Inject(LLM_CLIENT) private readonly llm: LlmClient,
  ) {}

  @Get('health')
  health() {
    return {
      status: 'ok',
      db: this.cfg.config.dbPath,
      llm_available: this.llm.available,
      models: {
        cheap: this.cfg.config.openRouter.cheapModel,
        strong: this.cfg.config.openRouter.strongModel,
      },
    };
  }
}
