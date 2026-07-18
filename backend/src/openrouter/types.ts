/** Provider-agnostic LLM interface (ARCHITECTURE.md §4). OpenAI-compatible under the hood. */

export type Tier = 'cheap' | 'strong';

export interface LlmToolDef {
  name: string;
  description: string;
  parameters: Record<string, any>; // JSON Schema
}

export interface LlmToolCall {
  id: string;
  name: string;
  arguments: any; // parsed
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: LlmToolCall[];
  tool_call_id?: string; // role 'tool'
  name?: string; // role 'tool'
}

export interface LlmRequest {
  tier: Tier;
  messages: LlmMessage[];
  tools?: LlmToolDef[];
  tool_choice?: 'auto' | 'none' | 'required';
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface LlmAssistantMessage {
  role: 'assistant';
  content: string | null;
  tool_calls?: LlmToolCall[];
}

export interface LlmClient {
  /** False when no API key is configured — consumers degrade / fail-closed. */
  readonly available: boolean;
  complete(req: LlmRequest): Promise<LlmAssistantMessage>;
  smokeTestToolCalling(): Promise<{ ok: boolean; detail: string }>;
}

export class LlmUnavailableError extends Error {
  constructor(msg = 'LLM is unavailable (OPENROUTER_API_KEY not configured)') {
    super(msg);
    this.name = 'LlmUnavailableError';
  }
}
