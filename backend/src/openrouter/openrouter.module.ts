import { Global, Module, Provider } from '@nestjs/common';
import { AppConfigService } from '../config/config.module';
import { OpenRouterClient } from './openrouter.client';

/** Injection token for the LlmClient implementation. */
export const LLM_CLIENT = Symbol('LLM_CLIENT');

const llmProvider: Provider = {
  provide: LLM_CLIENT,
  useFactory: (cfg: AppConfigService) => new OpenRouterClient(cfg.config.openRouter),
  inject: [AppConfigService],
};

@Global()
@Module({
  providers: [llmProvider],
  exports: [llmProvider],
})
export class OpenRouterModule {}
