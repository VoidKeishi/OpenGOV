-- backend/src/db/schema.sql — OpenGOV SQLite schema (DATA.md §6).
-- Applied by backend/scripts/seed.ts (drop + recreate, rerunnable). The DB is a
-- cache rebuilt from committed data/ on every deploy — not a source of truth, so
-- there is no migration tooling.

DROP TABLE IF EXISTS procedures_fts;
DROP TABLE IF EXISTS aliases;
DROP TABLE IF EXISTS provinces;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS procedures;

CREATE TABLE procedures (
  code              TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  category_name     TEXT,
  executing_agency  TEXT,
  structuring_level TEXT NOT NULL DEFAULT 'raw',   -- 'raw' (497) | 'full' (3 pilots)
  source_url        TEXT NOT NULL,
  source_updated_at TEXT,
  record            TEXT NOT NULL                  -- full merged JSON (base + curated overlay)
);

CREATE VIRTUAL TABLE procedures_fts USING fts5(
  code UNINDEXED, name, aliases, category, agency
  -- all columns pre-normalized in JS: lowercase, NFD-strip diacritics, đ→d
  -- (FTS5 unicode61 remove_diacritics does NOT fold đ/Đ — normalize at seed AND at query time)
);

CREATE TABLE aliases (
  procedure_code TEXT NOT NULL REFERENCES procedures(code),
  alias          TEXT NOT NULL,
  alias_norm     TEXT NOT NULL                     -- exact-match fast path before FTS + rerank
);

CREATE TABLE provinces (
  name        TEXT PRIMARY KEY,
  code        TEXT,
  status      TEXT NOT NULL,                       -- 'current' | 'defunct'
  merged_into TEXT
);

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  messages   TEXT NOT NULL DEFAULT '[]',           -- JSON array, truncate to last ~20 turns
  case_facts TEXT NOT NULL DEFAULT '{}'            -- JSON incl. procedure_code, checklist_state, form_snapshot
);
