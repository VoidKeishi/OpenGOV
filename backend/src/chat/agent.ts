/**
 * Pure agent loop (ARCHITECTURE.md §4): iterate LLM ⇄ tools until the model produces a
 * final answer. Non-streaming per turn (complete()) so tool calls are detected cleanly;
 * the final answer is streamed to the client by the ChatService. Deps are injected so
 * this is testable with a stub LLM + stub tools.
 */

import type { LlmClient, LlmMessage, LlmToolDef } from '../openrouter/types';

export interface AgentTools {
  search_procedures(args: { query: string }): Promise<unknown>;
  get_procedure(args: { code: string }): Promise<unknown>;
  get_form_schema(args: { code: string }): Promise<unknown>;
  update_case_facts(args: { facts: Record<string, unknown> }): Promise<unknown>;
}

export interface RunTurnParams {
  llm: LlmClient;
  tools: AgentTools;
  system: string;
  toolDefs: LlmToolDef[];
  history: LlmMessage[];
  userMessage: string;
  maxIterations?: number;
  onToolCall?: (name: string, args: any) => void;
}

export interface RunTurnResult {
  answer: string;
  toolTrace: { name: string; args: any }[];
}

export async function runChatTurn(p: RunTurnParams): Promise<RunTurnResult> {
  const maxIterations = p.maxIterations ?? 6;
  const messages: LlmMessage[] = [
    { role: 'system', content: p.system },
    ...p.history,
    { role: 'user', content: p.userMessage },
  ];
  const toolTrace: { name: string; args: any }[] = [];

  for (let i = 0; i < maxIterations; i++) {
    const res = await p.llm.complete({
      tier: 'strong',
      messages,
      tools: p.toolDefs,
      tool_choice: 'auto',
      temperature: 0.2,
      // Safety net only — the prompt's ~120-word budget is the primary length
      // control. Must leave headroom for the [[CARDS:]] tail: a length-cut
      // answer loses card selection (700 proved too tight on deepseek).
      maxTokens: 1200,
    });

    if (!res.tool_calls || res.tool_calls.length === 0) {
      return { answer: res.content ?? '', toolTrace };
    }

    messages.push({ role: 'assistant', content: res.content ?? '', tool_calls: res.tool_calls });
    for (const call of res.tool_calls) {
      p.onToolCall?.(call.name, call.arguments);
      toolTrace.push({ name: call.name, args: call.arguments });
      const result = await dispatch(p.tools, call.name, call.arguments);
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        name: call.name,
        content: JSON.stringify(result ?? null),
      });
    }
  }

  // Ran out of iterations — ask once more for a final answer with no tools.
  const final = await p.llm.complete({ tier: 'strong', messages, temperature: 0.2, maxTokens: 1200 });
  return { answer: final.content ?? '', toolTrace };
}

async function dispatch(tools: AgentTools, name: string, args: any): Promise<unknown> {
  try {
    switch (name) {
      case 'search_procedures':
        return await tools.search_procedures({ query: String(args?.query ?? '') });
      case 'get_procedure':
        return await tools.get_procedure({ code: String(args?.code ?? '') });
      case 'get_form_schema':
        return await tools.get_form_schema({ code: String(args?.code ?? '') });
      case 'update_case_facts':
        return await tools.update_case_facts({ facts: args?.facts ?? {} });
      default:
        return { error: `unknown tool ${name}` };
    }
  } catch (err) {
    return { error: (err as Error).message };
  }
}
