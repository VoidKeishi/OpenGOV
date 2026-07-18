import { resolve } from 'node:path';

/** Runtime configuration, resolved once from env (see loadDotEnv). */
export interface AppConfig {
  port: number;
  dbPath: string;
  dataDir: string;
  schemasDir: string;
  errorsCatalogPath: string;
  /** Where the built widget bundle lives — served at GET /widget/opengov.js (WIDGET.md R3). */
  widgetDistDir: string;
  openRouter: OpenRouterConfig;
}

export interface OpenRouterConfig {
  /** Undefined when OPENROUTER_API_KEY is not set — the service runs key-optional. */
  apiKey: string | undefined;
  baseUrl: string;
  /** Cheap tier: routing, rerank, facts extraction, llm_check. */
  cheapModel: string;
  /**
   * Strong tier: answering, fix suggestions. Budget rule (19/07): both tiers run on
   * Gemini Flash — Claude Sonnet-class models burned the OpenRouter credit; the
   * fallback is a :free model so chat survives an empty balance.
   */
  strongModel: string;
  /** Used when a tier's primary model errors (network / http / no tool support / no credit). */
  fallbackModel: string;
  referer?: string;
  title: string;
}

export function loadConfig(): AppConfig {
  const cwd = process.cwd();
  const dataDir = process.env.OPENGOV_DATA_DIR ?? resolve(cwd, '..', 'data');
  return {
    port: Number(process.env.PORT ?? 3001),
    dbPath: process.env.OPENGOV_DB_PATH ?? resolve(cwd, 'var', 'opengov.db'),
    dataDir,
    schemasDir: process.env.OPENGOV_SCHEMAS_DIR ?? resolve(dataDir, 'schemas'),
    errorsCatalogPath: process.env.OPENGOV_ERRORS_PATH ?? resolve(dataDir, 'errors', 'catalog.json'),
    widgetDistDir: process.env.OPENGOV_WIDGET_DIST ?? resolve(cwd, '..', 'widget', 'dist'),
    openRouter: {
      apiKey: process.env.OPENROUTER_API_KEY || undefined,
      baseUrl: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
      cheapModel: process.env.OPENROUTER_CHEAP_MODEL ?? 'google/gemini-3.5-flash',
      strongModel: process.env.OPENROUTER_STRONG_MODEL ?? 'google/gemini-3.5-flash',
      // :free tier — keeps chat alive on zero balance and provider-diverse from Google.
      fallbackModel: process.env.OPENROUTER_FALLBACK_MODEL ?? 'tencent/hy3:free',
      referer: process.env.OPENROUTER_REFERER,
      title: process.env.OPENROUTER_TITLE ?? 'OpenGOV',
    },
  };
}
