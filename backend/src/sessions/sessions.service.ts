import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Dao } from '../db/dao';
import type { ChatMessage, SessionRow } from '../db/types';

/** Session memory (ARCHITECTURE.md §4): messages[] (truncated ~20 turns) + case_facts. */
@Injectable()
export class SessionsService {
  constructor(private readonly dao: Dao) {}

  create(): SessionRow {
    return this.dao.createSession(randomUUID());
  }

  /** Return the session, creating it if the id is unknown (chat is resilient to lost ids). */
  getOrCreate(id: string): SessionRow {
    return this.dao.getSession(id) ?? this.dao.createSession(id);
  }

  get(id: string): SessionRow | null {
    return this.dao.getSession(id);
  }

  appendMessages(id: string, messages: ChatMessage[]): void {
    this.dao.appendMessages(id, messages);
  }

  updateCaseFacts(id: string, patch: Record<string, any>): Record<string, any> {
    return this.dao.updateCaseFacts(id, patch);
  }
}
