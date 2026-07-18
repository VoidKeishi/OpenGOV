/** Shapes read out of the SQLite cache. Records are stored as JSON blobs. */

export interface ProcedureMeta {
  code: string;
  name: string;
  category_name: string | null;
  executing_agency: string | null;
  structuring_level: 'raw' | 'full';
  source_url: string;
  source_updated_at: string | null;
}

/** The full merged record (base + curated overlay + legal_fragments). Loosely typed. */
export type ProcedureRecord = Record<string, any> & {
  code: string;
  name: string;
  source: { url: string; updated_at?: string | null };
  legal_fragments?: LegalFragment[];
};

export interface LegalFragment {
  id: string;
  doc_code: string;
  doc_title: string;
  article: string;
  title: string;
  text: string;
  topics?: string[];
  source_url: string;
  retrieved_at: string;
}

export interface SearchHit {
  code: string;
  name: string;
  category_name: string | null;
  executing_agency: string | null;
  via: 'alias' | 'fts' | 'rerank';
  rank?: number;
}

export interface SessionRow {
  id: string;
  created_at: string;
  updated_at: string | null;
  messages: ChatMessage[];
  case_facts: Record<string, any>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  ts?: string;
}

export interface ProvincesCtx {
  current: string[];
  defunct: { name: string; merged_into: string }[];
}
