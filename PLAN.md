# PLAN.md — OpenGOV monorepo, high-level plan

> Read `context.md` first. This file defines the repo structure, build order, and how the git history itself becomes demo evidence.

## Repo structure

```
opengov/
├── PLAN.md                  # this file
├── context.md               # problem, judging criteria, positioning
├── backend/                 # OpenGOV Backend — KB, chatbot, validation API
├── widget/                  # OpenGOV Widget — embeddable script + web components
├── dichvucong/              # portal clone (see dichvucong/plan.md)
├── tools/capture/           # Playwright scripts to screenshot the real portal
├── data/                    # procedure sheets, error catalogs, golden Q&A (non-tech team owns content)
└── docs/                    # deliverables: ARCHITECTURE.md, one-pager, integration guide
```

One repo, three deployables. Suggested tooling: pnpm workspaces, TypeScript everywhere.

## Packages

### 1. `backend/` — OpenGOV Backend

All data processing and LLM API calls live here. Nothing model-related in the frontend packages.

- **Stack:** NestJS + Prisma + PostgreSQL (or SQLite for hackathon speed — decide once, early).
- **Core modules:**
  - `procedures` — procedure schemas loaded from `data/` (conditions, documents, required fields, constraints). Data-driven: adding a procedure = adding data, not code.
  - `validation` — rule engine. `POST /validate` takes `{procedure_id, fields}` → returns `{errors: [{field, type, message, suggestion}]}`. Deterministic rules first; LLM only for free-text/semantic conflicts and phrasing suggestions.
  - `chat` — guided intake + Q&A. LLM grounded in the structured KB, every answer cites its source. Streaming responses.
  - `sessions` — conversation ↔ form context sync (enables Phase 2 prefill).
- **LLM integration:** single provider-agnostic interface. The SLM tier from `context.md` is stubbed with the same LLM API behind a separate interface — swap-ready, documented in ARCHITECTURE.md.

### 2. `widget/` — OpenGOV Widget

Everything a portal embeds. Two artifacts from one codebase:

- **Phase 1 artifact:** single JS bundle. `<script src=".../opengov.js" data-scope="hotich,cutru">` → chat bubble, chat window with generative UI (procedure cards, tickable checklists, step-by-step guides, deep-link buttons), and a "Kiểm tra hồ sơ" action that reads the host page's form DOM and renders results in-chat.
- **Phase 2 artifact:** web components (`<opengov-field-hint>`, `<opengov-check-button>`) + a small client SDK wrapping the backend API, for portals that integrate deliberately.
- **Stack:** Preact (or vanilla TS) + Vite, single-file IIFE bundle, Shadow DOM for style isolation. No framework assumptions about the host page.

### 3. `dichvucong/` — portal clone

Detailed plan in `dichvucong/plan.md`. Summary: a faithful clone of the relevant dichvucong.gov.vn screens, **built blind — zero knowledge of the widget** — then integrated in later commits to prove the zero-touch integration story.

## Build order

```
Step 0  Monorepo setup (workspaces, TS config, CI-less; deploy configs later)
Step 1  data/: procedure sheets + error catalogs for pilot procedures   ← blocks Step 2
Step 2  backend/: schemas + rule engine + /validate + chat (KB-grounded)
Step 3  widget/: Phase 1 bundle against the live backend
Step 4  dichvucong/: blind clone (parallelizable with 2–3 once capture is done)
Step 5  Integration commits (see below)
Step 6  Deploy: dichvucong + widget bundle on Vercel, backend on Railway/Fly → public URL
Step 7  docs/: ARCHITECTURE.md (system diagram, models, APIs), one-pager, demo script
```

Steps 2–3 and Step 4 can run in parallel; the clone must not import from or reference `widget/`.

## Integration commits — the narrative is evidence

The git history demonstrates integration feasibility for judges:

1. **Commit "blind clone complete"** — portal works standalone, no OpenGOV code anywhere.
2. **Commit "Phase 1: embed"** — diff is *one script tag*. This single-line diff is the proof of the "~1 hour portal-dev effort" claim. Screenshot the diff for the architecture doc.
3. **Commit(s) "Phase 2: deep integration"** — field-ID → schema mapping config + web components on the form pages + inline highlight rendering. Shows what deliberate integration costs (small, contained).

Demo toggle: the clone ships with a "Phase 2 preview" switch so judges see both depths live.

## Definition of done (maps to deliverables)

- [ ] Public URL: clone + widget + live backend, full flow (intake → guidance → check) works for all pilot procedures
- [ ] Phase 1 one-line-diff commit exists and is screenshotted
- [ ] Phase 2 inline highlighting works on at least one procedure form
- [ ] `docs/ARCHITECTURE.md` with system diagram + models/APIs
- [ ] One-pager (problem, solution, target users, deployment roadmap)
- [ ] Golden Q&A set passes against the chat endpoint (accuracy evidence)