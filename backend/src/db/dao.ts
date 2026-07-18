import { Inject, Injectable } from '@nestjs/common';
import type { Database } from 'better-sqlite3';
import { DB } from './database.provider';
import { normalizeSearch } from './normalize';
import {
  ChatMessage,
  ProcedureMeta,
  ProcedureRecord,
  ProvincesCtx,
  SearchHit,
  SessionRow,
} from './types';

/** Keep at most this many chat turns (user+assistant messages) per session. */
const MAX_MESSAGES = 40; // ~20 turns

/**
 * Typed data-access object over the synchronous better-sqlite3 connection.
 * All SQL lives here; every consumer above is framework-agnostic (ARCHITECTURE.md §6).
 */
@Injectable()
export class Dao {
  constructor(@Inject(DB) private readonly db: Database) {}

  getProcedureMeta(code: string): ProcedureMeta | null {
    const row = this.db
      .prepare(
        `SELECT code, name, category_name, executing_agency, structuring_level, source_url, source_updated_at
         FROM procedures WHERE code = ?`,
      )
      .get(code) as ProcedureMeta | undefined;
    return row ?? null;
  }

  getProcedureRecord(code: string): ProcedureRecord | null {
    const row = this.db.prepare(`SELECT record FROM procedures WHERE code = ?`).get(code) as
      | { record: string }
      | undefined;
    return row ? (JSON.parse(row.record) as ProcedureRecord) : null;
  }

  /** Exact-match fast path: colloquial phrase → pinned procedure code(s). */
  aliasExact(query: string): SearchHit[] {
    const norm = normalizeSearch(query);
    const rows = this.db
      .prepare(
        `SELECT DISTINCT a.procedure_code AS code, p.name, p.category_name, p.executing_agency
         FROM aliases a JOIN procedures p ON p.code = a.procedure_code
         WHERE a.alias_norm = ?`,
      )
      .all(norm) as Omit<SearchHit, 'via'>[];
    return rows.map((r) => ({ ...r, via: 'alias' as const }));
  }

  /** FTS5 discovery over pre-normalized columns. Returns up to `limit` best matches. */
  ftsSearch(query: string, limit = 20): SearchHit[] {
    const match = buildFtsMatch(query);
    if (!match) return [];
    const rows = this.db
      .prepare(
        `SELECT f.code AS code, p.name, p.category_name, p.executing_agency, f.rank AS rank
         FROM procedures_fts f JOIN procedures p ON p.code = f.code
         WHERE procedures_fts MATCH ?
         ORDER BY f.rank
         LIMIT ?`,
      )
      .all(match, limit) as Omit<SearchHit, 'via'>[];
    return rows.map((r) => ({ ...r, via: 'fts' as const }));
  }

  getProvinces(): ProvincesCtx {
    const rows = this.db
      .prepare(`SELECT name, status, merged_into FROM provinces`)
      .all() as { name: string; status: string; merged_into: string | null }[];
    return {
      current: rows.filter((r) => r.status === 'current').map((r) => r.name),
      defunct: rows
        .filter((r) => r.status === 'defunct')
        .map((r) => ({ name: r.name, merged_into: r.merged_into ?? '' })),
    };
  }

  // --- sessions ---

  createSession(id: string): SessionRow {
    this.db.prepare(`INSERT INTO sessions (id) VALUES (?)`).run(id);
    return this.getSession(id)!;
  }

  getSession(id: string): SessionRow | null {
    const row = this.db
      .prepare(`SELECT id, created_at, updated_at, messages, case_facts FROM sessions WHERE id = ?`)
      .get(id) as
      | { id: string; created_at: string; updated_at: string | null; messages: string; case_facts: string }
      | undefined;
    if (!row) return null;
    return {
      id: row.id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      messages: JSON.parse(row.messages) as ChatMessage[],
      case_facts: JSON.parse(row.case_facts) as Record<string, any>,
    };
  }

  appendMessages(id: string, toAdd: ChatMessage[]): void {
    const s = this.getSession(id);
    if (!s) throw new Error(`session ${id} not found`);
    const messages = [...s.messages, ...toAdd].slice(-MAX_MESSAGES);
    this.db
      .prepare(`UPDATE sessions SET messages = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(JSON.stringify(messages), id);
  }

  updateCaseFacts(id: string, patch: Record<string, any>): Record<string, any> {
    const s = this.getSession(id);
    if (!s) throw new Error(`session ${id} not found`);
    const merged = { ...s.case_facts, ...patch };
    this.db
      .prepare(`UPDATE sessions SET case_facts = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(JSON.stringify(merged), id);
    return merged;
  }
}

/**
 * Build an FTS5 MATCH expression from a raw query: normalize, split into tokens,
 * keep alphanumerics, OR the prefix terms. Returns null when nothing usable.
 */
export function buildFtsMatch(query: string): string | null {
  const tokens = normalizeSearch(query)
    .split(' ')
    .map((t) => t.replace(/[^a-z0-9]/g, ''))
    .filter((t) => t.length >= 2);
  if (tokens.length === 0) return null;
  return tokens.map((t) => `"${t}"*`).join(' OR ');
}
