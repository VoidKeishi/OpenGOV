# context.md — Why this project exists

> Read this before any implementation work. It defines what we are judged on and what "done" means.

## The hackathon problem

Citizens completing Vietnamese administrative procedures (đăng ký khai sinh, đăng ký thường trú, giấy phép xây dựng...) face three pain points:

1. **Don't know what to prepare** — which documents, forms, which office.
2. **Don't know if they filled things in correctly** — errors are only discovered after an official reviews the application.
3. **Repeated in-person trips** — support bottlenecks, applications returned for corrections.

## Required capabilities (from the organizers)

1. **Guided intake** — user describes their need in plain language → AI asks clarifying questions → returns a document checklist + step-by-step process with examples.
2. **Pre-submission checking** — user's filled-in data is checked for missing fields, common errors, and data conflicts → fixes suggested before submission.
3. **Seamless integration** — embeds into existing public-service portals via API / widget / chatbot. No new app install.

## Deliverables

- **Working live demo at a public URL** (not a mockup). Minimum flow: enter a need → receive step-by-step guidance → check filled-in information.
- **Architecture documentation** — system diagram, models and APIs used.
- **One-page summary** — problem, solution, target users, deployment roadmap.
- Data sourced from public sources: `dichvucong.gov.vn` and the catalog of administrative forms by sector.

## Judging criteria (optimize for these, in this order of team priority)

1. **Accuracy & completeness** of guidance vs. current regulations.
2. **Error/omission detection** in the user's filled-in application.
3. **Integration feasibility** into existing public-service systems + concrete pilot roadmap.
4. **UX for non-technical citizens.**

## Our solution: OpenGOV

An AI assistant that embeds into existing public-service portals and helps citizens submit applications **correct and complete on the first attempt** ("đúng và đủ ngay lần đầu").

### Positioning / differentiators (do not dilute these)

- **Pre-submission checking is the core**, not generic Q&A. Q&A is commoditized (Google/ChatGPT); rule-based per-procedure validation is not. Competitors (trợ lý ảo tỉnh, VNeID chatbot, iHanoi) do not do this.
- **Procedures are structured into machine-readable rules/schemas** (conditions, required documents, required fields, cross-field constraints) — not pure RAG over legal text. Checking is deterministic, verifiable, hallucination-free.
- **Embed-first by design** — built as a widget/API from day one, not an app "to be integrated later".

### Pilot scope (deliberate, not a capability limit)

2–3 procedures: **đăng ký khai sinh**, **đăng ký thường trú**, **giấy phép xây dựng nhà ở riêng lẻ**. Architecture must scale to other procedures via data, not code.

### Integration phases (demo covers Phase 1 + Phase 2)

- **Phase 1 — script embed (~1h portal-dev effort):** one `<script>` tag → chat bubble with generative UI (procedure cards, checklists, step guides). Because the script shares the page, it reads form DOM state → pre-submission check results render *inside the chat window*.
- **Phase 2 — API + components (deliberate integration):** portal calls `POST /validate` and uses our web components → inline field highlighting + fix suggestions *on the portal's own form*, check button next to the portal's submit button, prefill from conversation context.
- **Phase 3 — insights (roadmap only, not in demo):** analytics on common questions/errors feed back to portal operators to improve the original forms.

### Architecture principles (3 processing tiers)

1. **Client (plain JS):** form capture + deterministic rules (required, format, cross-field constraints).
2. **SLM tier (sovereign, self-hosted — roadmap; demo may stub with LLM API behind the same interface):** PII extraction/masking, field→schema mapping, intent routing. PII never reaches external LLM APIs unmasked.
3. **LLM API:** procedure knowledge grounded in the structured KB with source citations; generates fix suggestions from masked data.

### Non-goals

- No portal redesign proposals. The clone exists to host the widget, not to showcase our UI vision.
- No standalone mobile/desktop app.
- No coverage beyond the pilot procedures for the demo.