import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.module';
import { loadDotEnv } from './config/dotenv';
import { LLM_CLIENT } from './openrouter/openrouter.module';
import type { LlmClient } from './openrouter/types';

async function bootstrap(): Promise<void> {
  loadDotEnv();
  const log = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { cors: true });
  const cfg = app.get(AppConfigService).config;
  const llm = app.get<LlmClient>(LLM_CLIENT);
  if (!llm.available) {
    log.warn('OPENROUTER_API_KEY not set — /chat runs in fail-closed degraded mode; /validate llm_check disabled.');
  }

  // Bind all interfaces so hosted platforms (Railway/Fly/Render) can route to it.
  await app.listen(cfg.port, '0.0.0.0');
  log.log(`OpenGOV backend listening on http://0.0.0.0:${cfg.port}`);

  // Smoke-test the main model's function calling AFTER listen (ARCHITECTURE.md §4) so a
  // slow or down LLM never blocks startup / the platform health check.
  void llm
    .smokeTestToolCalling()
    .then((s) => log.log(`function-calling smoke test: ${s.ok ? 'PASS' : 'SKIP/FAIL'} — ${s.detail}`))
    .catch((e) => log.warn(`function-calling smoke test error: ${(e as Error).message}`));
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
