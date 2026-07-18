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

  // Smoke-test the main model's function calling at startup (ARCHITECTURE.md §4).
  const llm = app.get<LlmClient>(LLM_CLIENT);
  const smoke = await llm.smokeTestToolCalling();
  log.log(`function-calling smoke test: ${smoke.ok ? 'PASS' : 'SKIP/FAIL'} — ${smoke.detail}`);
  if (!llm.available) {
    log.warn('OPENROUTER_API_KEY not set — /chat runs in fail-closed degraded mode; /validate llm_check disabled.');
  }

  await app.listen(cfg.port);
  log.log(`OpenGOV backend listening on http://localhost:${cfg.port}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
