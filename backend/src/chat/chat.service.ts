import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ProcedureRecord } from '../db/types';
import { LLM_CLIENT } from '../openrouter/openrouter.module';
import type { LlmClient, LlmMessage } from '../openrouter/types';
import { ProceduresService } from '../procedures/procedures.service';
import { SessionsService } from '../sessions/sessions.service';
import { AgentTools, runChatTurn } from './agent';
import { buildCards, Card, numbersCoveredByCards } from './cards';
import { PORTAL_URL, SYSTEM_PROMPT, TOOL_DEFS } from './prompt';
import type { Emit } from './types';

const DEGRADED_MSG =
  'Xin lỗi, dịch vụ trả lời tự động tạm thời chưa sẵn sàng (chưa cấu hình mô hình ngôn ngữ). ' +
  `Bạn có thể tra cứu trực tiếp tại Cổng Dịch vụ công quốc gia ${PORTAL_URL}.`;
const ERROR_MSG = 'Xin lỗi, đã có lỗi khi xử lý câu hỏi. Vui lòng thử lại sau.';

/**
 * Chat orchestrator: runs the agent loop, then emits card events (numbers, read from
 * the record) and streams the prose answer as tokens. Enforces the cards-carry-numbers
 * contract (numbersCoveredByCards) and fails closed when the LLM is unavailable.
 */
@Injectable()
export class ChatService {
  private readonly log = new Logger('Chat');

  constructor(
    private readonly procedures: ProceduresService,
    private readonly sessions: SessionsService,
    @Inject(LLM_CLIENT) private readonly llm: LlmClient,
  ) {}

  async handleChat(sessionId: string | undefined, message: string, emit: Emit): Promise<void> {
    const session = sessionId ? this.sessions.getOrCreate(sessionId) : this.sessions.create();
    emit({ type: 'session', session_id: session.id });

    if (!message || !message.trim()) {
      this.streamProse('Bạn vui lòng nhập câu hỏi.', emit);
      emit({ type: 'done', cards_count: 0 });
      return;
    }

    if (!this.llm.available) {
      this.streamProse(DEGRADED_MSG, emit);
      emit({ type: 'done', cards_count: 0 });
      this.persist(session.id, message, DEGRADED_MSG);
      return;
    }

    const visited = new Map<string, ProcedureRecord>();
    const tools: AgentTools = {
      search_procedures: async ({ query }) =>
        (await this.procedures.search(query, 5)).map((h) => ({ code: h.code, name: h.name, via: h.via })),
      get_procedure: async ({ code }) => {
        const rec = this.procedures.getProcedure(code);
        if (rec) visited.set(code, rec);
        return rec ?? { error: 'not_found', code };
      },
      get_form_schema: async ({ code }) => this.procedures.getFormSchema(code) ?? { available: false, code },
      update_case_facts: async ({ facts }) => this.sessions.updateCaseFacts(session.id, facts),
    };

    let answer: string;
    try {
      const res = await runChatTurn({
        llm: this.llm,
        tools,
        system: SYSTEM_PROMPT,
        toolDefs: TOOL_DEFS,
        history: toLlmHistory(session.messages),
        userMessage: message,
        onToolCall: (name, args) => emit({ type: 'tool', name, args }),
      });
      answer = res.answer || DEGRADED_MSG;
    } catch (err) {
      this.log.error(`chat turn failed: ${(err as Error).message}`);
      this.streamProse(ERROR_MSG, emit);
      emit({ type: 'error', message: 'internal_error' });
      emit({ type: 'done', cards_count: 0 });
      return;
    }

    const cards: Card[] = [];
    for (const rec of visited.values()) cards.push(...buildCards(rec));

    const guard = numbersCoveredByCards(answer, cards);
    if (!guard.ok) {
      // Structured numbers must come from cards. Flag (don't crash) if the model leaked one.
      this.log.warn(`prose numbers not backed by cards: ${guard.offending.join(', ')}`);
      emit({ type: 'warning', message: `numbers_not_in_cards: ${guard.offending.join(',')}` });
    }

    for (const c of cards) emit({ type: 'card', payload: c });
    this.streamProse(answer, emit);
    emit({ type: 'done', cards_count: cards.length });
    this.persist(session.id, message, answer);
  }

  private persist(id: string, userMsg: string, answer: string): void {
    try {
      this.sessions.appendMessages(id, [
        { role: 'user', content: userMsg },
        { role: 'assistant', content: answer },
      ]);
    } catch (err) {
      this.log.warn(`persist failed for session ${id}: ${(err as Error).message}`);
    }
  }

  /** Simulated token streaming: chunk the final answer into word tokens (SSE events). */
  private streamProse(text: string, emit: Emit): void {
    for (const chunk of text.match(/\S+\s*|\s+/g) ?? [text]) {
      emit({ type: 'token', text: chunk });
    }
  }
}

function toLlmHistory(messages: { role: 'user' | 'assistant'; content: string }[]): LlmMessage[] {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}
