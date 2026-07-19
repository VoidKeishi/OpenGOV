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
  | { type: 'chips'; items: string[] } // quick-reply suggestions for this turn (Pha 2)
  | { type: 'token'; text: string }
  | { type: 'warning'; message: string }
  | { type: 'done'; cards_count: number }
  | { type: 'error'; message: string };

// --- GET /health ---

export interface Health {
  status: string;
  llm_available: boolean;
}

// --- GET /schemas (backend R1, extended for Pha 2) ---

/** Conversation→form mapping entry (DATA.md §4 prefill). */
export interface PrefillMapEntry {
  fact: string;
  transform?: { enum?: Record<string, string> };
}

export interface SchemaIndexEntry {
  procedure_code: string;
  form_ref: string;
  field_keys: string[];
  /** Pha 2: relative wizard path on the embedding portal. Absent on old backends. */
  form_path?: string;
  /** Pha 2: confirmed-prefill map. Absent → prefill feature stays off. */
  prefill?: Record<string, PrefillMapEntry>;
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

/** One field written by the confirmed-prefill flow (Pha 2) — kept for undo. */
export interface PrefillRow {
  field: string;
  label: string;
  value: string;
  /** case_facts key the value came from — shown as the provenance line. */
  fact: string;
  /** DOM value before the write (undo restores it). */
  prev: string;
}

export interface PrefillTurnResult {
  procedure_code: string;
  rows: PrefillRow[];
  undone: boolean;
}

export interface Turn {
  role: 'user' | 'assistant' | 'check' | 'notice' | 'prefill';
  prose: string;
  cards: Card[];
  check?: CheckTurnResult;
  /** Pha 2: quick-reply chips of this assistant turn (rendered only while it is the last turn). */
  chips?: string[];
  /** Pha 2: what the confirmed-prefill flow wrote (role 'prefill' turns). */
  prefill?: PrefillTurnResult;
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
