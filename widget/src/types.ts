// Shared contracts. Backend wire shapes mirror backend/src (as-built, snake_case).

/** Embed configuration read from the <script> tag's data attributes. */
export interface EmbedConfig {
  backend: string;
  /** data-scope: priority procedure codes. Parsed but reserved — no Pha 1 behavior. */
  scope: string[];
  accent: string | null;
}

// --- SSE events (POST /chat). Wire: `data: <JSON>` blocks, terminator `event: end`. ---

export interface Card {
  type: string;
  payload: Record<string, any>;
}

export type ChatEvent =
  | { type: 'session'; session_id: string }
  | { type: 'tool'; name: string; args: unknown }
  | { type: 'card'; payload: Card } // note: card kind is payload.type, fields payload.payload
  | { type: 'token'; text: string }
  | { type: 'warning'; message: string }
  | { type: 'done'; cards_count: number }
  | { type: 'error'; message: string };

// --- GET /health ---

export interface Health {
  status: string;
  llm_available: boolean;
}

// --- GET /schemas (backend R1; served by test shim until then) ---

export interface SchemaIndexEntry {
  procedure_code: string;
  form_ref: string;
  field_keys: string[];
}

// --- GET /sessions/:id ---

export interface SessionState {
  messages: { role: 'user' | 'assistant'; content: string }[];
  case_facts: Record<string, unknown>;
}

// --- POST /validate ---

export interface ValidationError {
  field?: string;
  code: string;
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion: string;
  source: 'engine' | 'llm';
}

export interface ValidateResponse {
  errors: ValidationError[];
}

// --- Detect (WIDGET.md §6.1) ---

export type DetectState =
  | { kind: 'NONE' }
  | { kind: 'DETECTED_NOFIELDS'; schema: SchemaIndexEntry }
  | { kind: 'DETECTED_READY'; schema: SchemaIndexEntry };

// --- Transcript cache (sessionStorage, §8). One serializable turn = one render model. ---

/** Result of a "Kiểm tra hồ sơ" run, stored as its own turn. */
export interface CheckTurnResult {
  procedure_code: string;
  errors: ValidationError[];
  checked_fields: number;
  /** llm_available at validate time — drives the degraded scope line. */
  llm_available: boolean;
  /** case_facts were empty at validate time — shows the "kể thêm tình huống" chip. */
  no_case_facts: boolean;
}

export interface Turn {
  role: 'user' | 'assistant' | 'check' | 'notice';
  prose: string;
  cards: Card[];
  check?: CheckTurnResult;
  /** Checklist tick state: "<cardIndex>:<itemId>" -> ticked. Client-only. */
  ticks: Record<string, boolean>;
  /** Cards hidden until the turn's stream ends (decision #8). */
  revealed: boolean;
  /** Set when the turn failed: renders the error box + [Thử lại]. */
  retry?: { action: 'chat'; message: string } | { action: 'check' };
  /** 422 from /validate: verbatim message, no retry offered. */
  noRetry?: boolean;
}

export interface TranscriptCache {
  v: 1;
  turns: Turn[];
}
