# ARCHITECTURE.md — OpenGOV Backend

> System doc for coding agents and judges. Read `PROBLEM.md` (repo root) first for the problem and judging criteria, then `docs/DESIGN.md` for the solution, use cases, and design decisions. All committed data shapes live in `docs/DATA.md` — that file is the schema contract; this file explains the system around it.

## 1. Source data reality (drives everything below)

Two source layers feed the knowledge base.

**Layer 1 — DVC crawl**, in `backend/data/crawl/` (see `manifest.json` for provenance):

- `catalog.jsonl` — 5,670 procedures, one JSON object per line. Well-structured metadata (code, name, categories, agencies, target type).
- `details/<code>.json` — 502 full procedure records, selected pilot-first (500 tiered + 2 delta-crawled via `crawl-dvc.mjs --codes` when the pilot scope changed). Each file is an API envelope `{code, data, message}`; everything meaningful is under `.data` (~78 keys).
- `provinces.json` — envelope containing the 34 post-merger provinces `{id, name, code, state}`.

**Layer 2 — curated external sources**, in `notes/knowledge-base/` (teammate-authored, 18/07/2026): per-pilot procedure sheets (verbatim portal content + statutory additions), legal research with article-level citations and source URLs, a 35-entry error catalog, and a 30-item golden Q&A set. This layer exists because the crawl alone cannot answer "why"/"what if" questions — conditions, exemptions, and sanctions live in the underlying legal documents (Luật Cư trú 2020, NĐ 154/2024, Luật DN 2020, NĐ 168/2025, BLLĐ 2019, NĐ 145/2020, …). It is converted into `data/` artifacts (curated overlays, `data/legal/` fragments, error catalog, golden QA — see DATA.md) with mandatory per-fragment provenance (`source_url`, `retrieved_at`), plus targeted web gap-fill for articles the error catalog cites but the research files lack.

Pilot scope (decided 18/07/2026): `1.004222` đăng ký thường trú, `2.001610` đăng ký thành lập DNTN, `2.001955` đăng ký nội quy lao động. (The earlier pilots 1.001193 khai sinh / 1.013225 GPXD stay in the KB as ordinary records.)

Verified facts every consumer must respect:

1. **Top-level `data.fees` and `data.profileComponents` are always `[]`.** Real fees live in `executionMethods[].fees`; the real document checklist lives in `executionCases[].profileComponents`.
2. **`executionCases` group names vary in meaning per procedure**: static headings for khai sinh ("* Giấy tờ phải nộp:"), true conditional cases for thường trú (8 groups), per-construction-type cases for GPXD (7 groups). Parsers must keep the grouping verbatim; only curation may interpret it.
3. **`executionSteps` is an array of named text blobs** `[{name, description}]` — 267/500 details have more than one. Never flatten to a single string.
4. **The `required` flag on checklist items is `false` everywhere** — meaningless, dropped.
5. **Processing time**: `executionMethods[].processingTimeUnit` is `OTHER` in 283/2,065 rows (including all of khai sinh); the reliable value there is `data.cases[].processingDay {qty, type}`. Enums (verified across all 500): `submissionMethod ∈ {ONLINE, POSTAL, DIRECT}`, time unit `∈ {OTHER, WORKING_DAY, DAY, HOUR, MONTH}`, fee type `∈ {SERVICE_FEE, FEE, PRICE_LEVEL}`.
6. **`legalBasisesDetails` is gold**: legal document codes (123/2015/NĐ-CP, 18/2026/NĐ-CP, …) enable source citations on every answer → judging criterion #1 (accuracy). Codes need `.trim()` (trailing spaces exist in source).
7. **`updatedAt`/`createdAt` are epoch-milliseconds** → convert to ISO-8601 at parse time. `updatedAt` powers the freshness display ("dữ liệu cập nhật ngày X"); legal bases include 2025–2026 documents, so freshness matters.
8. `requirementsAndConditions` is non-empty in 280/500 (e.g. thường trú) — carry it through.
9. Attachment binaries are WAF-gated and not downloadable; their refs `{id, fileName, bucketName, filePath}` are preserved as refs only.
10. Canonical source URL per procedure: `https://dichvucong.gov.vn/thu-tuc-hanh-chinh/<data.id>`.
11. **One procedure detail is a few thousand tokens** → fits in context whole. This kills the need for RAG chunking (principle 3).
12. Detail JSONs are semi-structured and unreliable at field level: steps are prose blobs, checklist items are free-text fragments. Raw JSON cannot directly power Q&A or validation — hence the build-time structuring below.

## 2. Core principles

1. **Two-track data.** Two artifacts with different trust requirements:
   - **Knowledge base** (broad, for Q&A): full catalog + normalized details for all 502, enriched for the pilots with traceable legal fragments (`data/legal/`). Minor imperfections acceptable — answers always carry source links.
   - **Validation schemas** (narrow, pilot procedures only): hand-authored from the official form templates (tờ khai) — crawled data has NO field-level form information. Declarative JSON rules: required (conditional on case facts), format/regex, domain checks (quê quán validated against the province list — catches pre-merger province names), cross-field constraints, conditional documents ("chưa đăng ký kết hôn → cần văn bản cam đoan").
2. **Structure offline, never at runtime.** All raw-text → structure conversion happens at build time with human review, committed to `data/`. Runtime never interprets raw text → deterministic, auditable.
3. **Full-procedure grounding, not RAG chunking.** Chunk-similarity retrieval is the #1 source of incomplete/hallucinated answers. Since each procedure fits in context: first find the *right procedure*, then load its *entire* normalized record. Retrieval is only for discovery: SQLite FTS5 over the catalog + a hand-authored alias table ("làm giấy khai sinh", "nhập hộ khẩu", …) + LLM rerank of the top-20. No vector DB — also avoids a dependency OpenRouter can't serve (no embeddings endpoint).
4. **Numbers never pass through the LLM.** Fees, deadlines, agencies render straight from the DB into gen-UI cards; the LLM only selects cards and writes connective prose. Cards cannot hallucinate figures.
5. **Fail-closed.** Questions outside pilot scope → answer from catalog metadata only (name, agency, source link) and say explicitly that detail is limited ("không có trong dữ liệu"). Never guess.

## 3. Repo & data layout

```
backend/data/crawl/     raw crawl — read-only input, never edited
data/                   committed, reviewed artifacts (the source of truth; see docs/DATA.md)
  procedures/           machine-owned (parser output, regenerable)
  curated/ schemas/ errors/ aliases.json golden-qa.json provinces.json   human-owned
tools/etl/              deterministic parser + STRUCTURING.md (curation guide)
backend/                NestJS service + seed scripts; backend/var/opengov.db is a build artifact
widget/                 chat widget (separate phase)
dichvucong/             portal clone — standalone workspace, must stay blind to this doc
```

Ownership rule: `data/procedures/` is regenerated by `tools/etl/parse.ts` — fix the parser, never the files. Everything else under `data/` is human-reviewed — never regenerate blindly.

## 4. Runtime components

### Chat service (NestJS, SSE streaming)
Agent loop with tools:
- `search_procedures(query)` — alias exact-match fast path → FTS5 → LLM rerank of top-20
- `get_procedure(code)` — merged record (base + curated overlay); the LLM receives a **projection** (drops `steps_raw` when curated steps exist, `review`/`state`, clamps `legal_basis[].name`; `checklist_raw` stays — its per-case document enumerations carry legal detail the situational curated checklist abstracts away) while the full record is kept server-side for card building
- `get_form_schema(code)` — validation schema for the procedure
- `update_case_facts(facts)` — see session memory

System prompt enforces: answer only from tool results; short answers (~120 words, clarify-first on vague intent, questions sourced from the record's `case_facts_schema`); always cite legal-basis codes + source link; out-of-KB → explicit "không có trong dữ liệu" + portal link; markdown restricted to the widget's mini-markdown subset. `maxTokens: 700` on the agent's completion calls is the safety net. Structured numbers (fees, deadlines, agencies, freshness date) are emitted as card payloads read verbatim from the record; the LLM stream carries prose only. The model selects which cards each turn shows via a machine-readable answer tail `[[CARDS: <code>=<types>]]` that the service parses and strips before the number guard, streaming, and history persistence (fail-safe: `procedure` + `legal_fragments` of the last-visited code + a `cards_tail_missing` warning). Selecting `checklist` builds the tick-able checklist card from the curated groups filtered against session case_facts (re-read after the turn; missing fact → keep item with `conditional: true`).

### Validation service
`POST /validate {procedure_code, fields, case_facts}` →
1. **Deterministic rule engine first** — one pure function over the authored schema (closed rule set, see DATA.md §4), no framework.
2. **LLM second stage** only for `llm_check` fields (free text, semantic conflicts), on masked values; it may append findings, never modify or suppress deterministic ones.
Error messages come from the pre-authored error catalog in `data/errors/` (grounded), not LLM-generated. Unknown catalog code or engine exception → 422 with a generic Vietnamese message — never an LLM improvisation.

### Session memory
One `sessions` table (SQLite — no Redis). Two layers per session:
- `messages[]` — raw history; truncate/summarize beyond ~20 turns.
- `case_facts` — structured object `{procedure_code, da_dang_ky_ket_hon, checklist_state, form_snapshot, …}`. The LLM updates facts via tool call instead of "remembering" through history. This object powers personalized checklists, prefill, and conditional validation rules.
Widget keeps `session_id` in `sessionStorage` → survives page navigation.

### OpenRouter layer
Two tiers behind one provider-agnostic interface:
- Cheap model (Gemini Flash class): routing, rerank, facts extraction, llm_check.
- Strong model: answering, fix suggestions. Budget decision 19/07: both tiers default to Gemini Flash (Claude Sonnet-class answering exhausted the OpenRouter credit) with a `:free` fallback (`tencent/hy3:free`) so chat survives an empty balance; Sonnet-class remains an env override (`OPENROUTER_STRONG_MODEL`) when budget allows.
Tool-calling support varies per model on OpenRouter — smoke-test the chosen main model's function calling at startup; configure a fallback model. PII rule from DESIGN.md §5 applies: values reaching external APIs for llm_check are masked first.

## 5. API surface

| Endpoint | Shape |
|---|---|
| `POST /chat` | `{session_id, message}` → SSE stream: prose tokens + card events `{type, payload}` |
| `POST /validate` | `{procedure_code, fields, case_facts}` → `{errors: [{field, code, type, severity, message, suggestion}]}` |
| `POST /sessions` | → `{session_id}` |
| `GET /sessions/:id` | → `{messages, case_facts}` |

## 6. Storage — better-sqlite3, raw SQL (decided)

Prisma is dropped. Every query that matters is either FTS5 (`MATCH` on a virtual table — un-modelable in Prisma, raw SQL either way), a JSON-blob read (`record`, `messages`, `case_facts`), or a key lookup: 5 tables, ~10 distinct statements. A small typed DAO over synchronous `better-sqlite3` beats a generated client wrapped around escape hatches — zero codegen, one native dep, single-file DB. No migration tooling is needed because **the DB is a cache, not a source of truth**: `backend/scripts/seed.ts` rebuilds `backend/var/opengov.db` from committed `data/` on every deploy (Railway/Fly build step).

Tables: `procedures` (merged record JSON + `structuring_level` 'raw'|'full'), `procedures_fts` (FTS5), `aliases`, `provinces` (current + defunct with `merged_into`), `sessions`. Full DDL in DATA.md §6.

**Vietnamese search note**: FTS5 `unicode61 remove_diacritics` does NOT fold `đ/Đ`. Normalize in JS — lowercase, NFD strip combining marks, `đ→d` — at seed time AND at query time, so "lam giay khai sinh" matches "làm giấy khai sinh".

## 7. Data flow

```
BUILD-TIME
backend/data/crawl/ (catalog.jsonl / details / provinces)
  → tools/etl/parse.ts (deterministic, all 502)        → data/procedures/*.json, provinces current
notes/knowledge-base/ (teammate KB) + web gap-fill
  → agent conversion + human verification               → data/curated/*.json, data/legal/*.json,
    (pilot only, per tools/etl/STRUCTURING.md)            schemas, errors, aliases, golden-qa,
                                                          provinces defunct
  → backend/scripts/seed.ts                             → backend/var/opengov.db

RUNTIME
widget (chat + DOM capture)
  → POST /chat     — tools → procedures DB / schemas;  ↔ sessions;  → OpenRouter
  → POST /validate → rule engine (schemas + error catalog) → llm_check stage (masked, OpenRouter)
```

## 8. ETL organization

**No batch pipeline.** The real LLM workload is 3 pilot documents, each needing careful human review — a pipeline costs more to build than it saves at 1 run × 3 documents. This is human-in-the-loop curation, not batch processing.

Split:
- **Deterministic parser** (`tools/etl/parse.ts`): normalizes the already-structured fields (identity, agencies, channels+fees, processing cases, legal basis trimmed, steps/checklist kept verbatim, epoch→ISO, source URL) for the ENTIRE 502-detail set. Plain TS, zero runtime deps, idempotent — rerun produces a byte-identical output (empty `git diff`).
- **Stage A2 — KB ingest (delta, after the pilot-scope decision)**: an agent converts `notes/knowledge-base/` into the `data/` artifacts (curated overlays, `data/legal/` fragments, error catalog, golden QA, aliases) and gap-fills missing legal fragments via web research — every fragment with mandatory `source_url` + `retrieved_at`, official portals preferred. Outputs land as `_draft`-marked files.
- **Structuring session via Claude Code, interactively**: pilot procedures only — verifies the converted artifacts against the sheets and raw details (every `when` condition, ONE_OF exclusivity, quantities, deadlines), numbers the steps per channel where the KB has not already. Rules and the committed session prompt live in `tools/etl/STRUCTURING.md`; outputs carry a `review` block (`reviewed_by`, `reviewed_at`, `method`).

Reproducibility artifacts: `tools/etl/parse.ts` + `tools/etl/STRUCTURING.md` + reviewed `data/` outputs. Scaling story (if judges ask): structuring currently runs semi-automated with 100% human review for the pilot; STRUCTURING.md's prompt + target schema wrap directly into a batch job (add JSON-schema validation + sampled review) when scaling to thousands of procedures.

## 9. Quality loop

- **Golden Q&A set as automated eval**: `backend/scripts/golden-qa.ts` runs 30 real-citizen questions through `/chat` — one conversational session per procedure block, mirroring real chat usage (follow-ups like "sau khi có giấy phép…" need the preceding turns) — and asserts expected procedure, must-mention phrases, and citation presence via normalized substring match on the current turn only (no LLM judge). `GOLDEN_QA_MIN=<pct>` turns the report into a gate. Run on every prompt/model change — no tuning by feel.
- **Freshness**: cards show `source.updated_at`; re-crawl cron is a roadmap item.

## 10. Build order

1. Deterministic parser + normalized `data/procedures/` + seeded DB (everything is blocked by this)
2. Chat with `get_procedure` + FTS discovery
3. `case_facts` (session memory)
4. Validation (schemas + rule engine + error catalog) — needs the curated/structuring pass
