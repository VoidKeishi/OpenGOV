import { Logger } from '@nestjs/common';
import { OpenRouterConfig } from '../config/config';
import {
  LlmAssistantMessage,
  LlmClient,
  LlmMessage,
  LlmRequest,
  LlmToolCall,
  LlmToolDef,
  LlmUnavailableError,
} from './types';

/**
 * OpenRouter chat-completions client (OpenAI-compatible). Two tiers behind one
 * interface; on a primary-model error each call walks the fallback chain in
 * order. Key-optional: with no API key `available=false` and complete() throws
 * LlmUnavailableError so the chat layer can fail closed.
 */
export class OpenRouterClient implements LlmClient {
  private readonly log = new Logger('OpenRouter');
  constructor(private readonly cfg: OpenRouterConfig) {}

  get available(): boolean {
    return !!this.cfg.apiKey;
  }

  async complete(req: LlmRequest): Promise<LlmAssistantMessage> {
    if (!this.available) throw new LlmUnavailableError();
    const primary = req.tier === 'strong' ? this.cfg.strongModel : this.cfg.cheapModel;
    const chain = [primary, ...(this.cfg.fallbackModels ?? []).filter((m) => m && m !== primary)];
    let lastErr: unknown;
    for (let i = 0; i < chain.length; i++) {
      try {
        return await this.call(chain[i]!, req);
      } catch (err) {
        lastErr = err;
        if (i < chain.length - 1) {
          this.log.warn(`model ${chain[i]} failed (${(err as Error).message}); falling back to ${chain[i + 1]}`);
        }
      }
    }
    throw lastErr;
  }

  async smokeTestToolCalling(): Promise<{ ok: boolean; detail: string }> {
    if (!this.available) return { ok: false, detail: 'OPENROUTER_API_KEY not set — skipped' };
    const tool: LlmToolDef = {
      name: 'ping',
      description: 'Return a pong. Call this tool to acknowledge.',
      parameters: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] },
    };
    try {
      const res = await this.call(this.cfg.strongModel, {
        tier: 'strong',
        messages: [{ role: 'user', content: 'Call the ping tool with ok=true.' }],
        tools: [tool],
        tool_choice: 'required',
        maxTokens: 128,
      });
      const called = (res.tool_calls ?? []).some((c) => c.name === 'ping');
      return called
        ? { ok: true, detail: `${this.cfg.strongModel} supports function calling` }
        : { ok: false, detail: `${this.cfg.strongModel} did not emit a tool call` };
    } catch (err) {
      return { ok: false, detail: `smoke test error: ${(err as Error).message}` };
    }
  }

  private async call(model: string, req: LlmRequest): Promise<LlmAssistantMessage> {
    const body: Record<string, any> = {
      model,
      messages: req.messages.map(toOpenAIMessage),
      temperature: req.temperature ?? 0.2,
    };
    if (req.maxTokens) body.max_tokens = req.maxTokens;
    if (req.tools?.length) {
      body.tools = req.tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
      body.tool_choice = req.tool_choice ?? 'auto';
    }
    if (req.jsonMode) body.response_format = { type: 'json_object' };

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.cfg.apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': this.cfg.title,
    };
    if (this.cfg.referer) headers['HTTP-Referer'] = this.cfg.referer;

    const resp = await fetch(`${this.cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`OpenRouter ${resp.status}: ${text.slice(0, 300)}`);
    }
    const json = (await resp.json()) as any;
    const msg = json?.choices?.[0]?.message;
    if (!msg) throw new Error(`OpenRouter returned no message: ${JSON.stringify(json).slice(0, 200)}`);
    return {
      role: 'assistant',
      content: msg.content ?? null,
      tool_calls: parseToolCalls(msg.tool_calls),
    };
  }
}

function toOpenAIMessage(m: LlmMessage): Record<string, any> {
  if (m.role === 'tool') {
    return { role: 'tool', tool_call_id: m.tool_call_id, name: m.name, content: m.content ?? '' };
  }
  if (m.role === 'assistant' && m.tool_calls?.length) {
    return {
      role: 'assistant',
      content: m.content ?? '',
      tool_calls: m.tool_calls.map((c) => ({
        id: c.id,
        type: 'function',
        function: { name: c.name, arguments: JSON.stringify(c.arguments ?? {}) },
      })),
    };
  }
  return { role: m.role, content: m.content ?? '' };
}

function parseToolCalls(raw: any[]): LlmToolCall[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  return raw.map((c, i) => {
    let args: any = {};
    try {
      args = c.function?.arguments ? JSON.parse(c.function.arguments) : {};
    } catch {
      args = { _raw: c.function?.arguments };
    }
    return { id: c.id ?? `call_${i}`, name: c.function?.name ?? 'unknown', arguments: args };
  });
}
