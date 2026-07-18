# STRUCTURING.md — LLM-assisted curation of pilot procedures

> Reproducibility artifact: the committed prompt, conversion rules, and review checklist used to turn raw procedure text into the human-owned artifacts in `data/`. Target shapes are defined in `docs/DATA.md` (§3 curated overlay, §4 validation schema) — that file is the contract; this file is the method.

## 1. Scope & inputs

- Procedures: `1.001193` (đăng ký khai sinh), `1.004222` (đăng ký thường trú), `1.013225` (cấp GPXD mới — nhà ở riêng lẻ dùng case "(1.7)"). Optional if time allows: `1.009122` (GPXD có thời hạn).
- Inputs per procedure: `data/procedures/<code>.json` (parsed base — primary), `backend/data/crawl/details/<code>.json` (raw — for cross-checking), and for validation schemas the portal form definitions `dichvucong/src/data/form/<slug>.json` (read-only reference; do not modify anything under `dichvucong/`).
- Outputs: `data/curated/<code>.json`, `data/schemas/<code>.form.json`, finalized `data/errors/catalog.json`, `data/aliases.json`, `data/golden-qa.json`, verified `data/provinces.json` `defunct[]`.
- Mode: **interactive Claude Code session with a human reviewer approving each conditional group**. This is curation, not batch processing — every output file carries a filled `review` block.

## 2. Session prompt (committed verbatim — start each structuring session with this)

```
Read docs/DATA.md §3–§4 and tools/etl/STRUCTURING.md §3–§4 in full before touching anything.

For procedure <code>:
1. Read data/procedures/<code>.json. Cross-check anything ambiguous against
   backend/data/crawl/details/<code>.json (.data member).
2. Produce data/curated/<code>.json per DATA.md §3:
   - steps: number the steps_raw prose into per-channel steps (channel: truc_tiep |
     truc_tuyen | buu_chinh | all). Keep legal/document names verbatim Vietnamese.
   - checklist: convert checklist_raw into conditional groups (ALL_OF / ONE_OF with
     `when` conditions over case facts) following the conversion rules in
     STRUCTURING.md §3. Propose the case_facts_schema needed to drive them.
   - deadlines / fee_notes: extract only what has a verbatim source_quote.
3. Produce data/schemas/<code>.form.json per DATA.md §4, keying fields off the
   `name` attributes in dichvucong/src/data/form/<slug>.json. Use only the closed
   rule set from DATA.md §4. Every `error` ref must exist in data/errors/catalog.json —
   add catalog entries as needed.
4. Present each conditional group and each `when` condition to me one at a time,
   with the raw source text beside it, and wait for my approval before writing.
5. Fill the review block only after I approve; leave reviewed_by for me to confirm.
```

## 3. Conversion rules (binding)

1. **Traceability, no exceptions**: every checklist item carries `source_component_code` (raw component `code`) or a `source_quote` (verbatim sentence from `steps_raw`/`requirements`). Every deadline carries `source_quote`. An item that cannot be traced does not get written.
2. **Conditional phrasing → conditions**: "Trường hợp X thì Y" becomes a group/item with `when` on a case fact. "Nếu không có A thì nộp B" becomes a `ONE_OF` group [A, B(when not-A)]. Only the two operators from DATA.md §3 (`eq`, `in`) — if a condition doesn't fit them, model it as a new enum fact, don't invent operators.
3. **Channel variants**: paper form vs "mẫu điện tử tương tác" (interactive electronic form) → condition on fact `kenh_nop`; per-channel steps use the `channel` field, never duplicated prose.
4. **Numbers are copied, never composed**: quantities from `original_qty`/`copy_qty`; fees and day counts character-exact from source. If a number appears nowhere in the source, it does not appear in the output.
5. **Verbatim Vietnamese**: document names, legal document titles, agency names — no paraphrase, no "modernized" wording. Trim whitespace only.
6. **Group-name semantics differ per procedure** (see ARCHITECTURE.md §1.2): khai sinh's headings are display groups; thường trú's 8 groups are mutually exclusive cases → one enum fact `truong_hop`; GPXD's groups are construction types → pilot uses only "(1.7) nhà ở riêng lẻ".
7. **When in doubt, fail open**: if you cannot determine whether a document is conditional, keep it unconditional (always shown) and flag it for the reviewer — over-showing beats hiding.

## 4. Human review checklist (tick all before commit)

- [ ] Each `when` condition re-read against the raw source sentence it encodes.
- [ ] Each `ONE_OF` group verified actually exclusive (the source says "hoặc"/"thay thế", not "và").
- [ ] Quantities match `original_qty`/`copy_qty` in `checklist_raw`.
- [ ] Deadlines and fees cross-checked against `source_quote` and, where present, the legal text.
- [ ] Legal codes trimmed, names verbatim.
- [ ] Schema field keys all exist in the portal form definition (run the comparison script, don't eyeball).
- [ ] Every `error` code referenced by a schema exists in `data/errors/catalog.json`.
- [ ] `review` block filled (`reviewed_by`, `reviewed_at`, `method`).

## 5. Scaling note

For the pilot, this runs semi-automated with 100% human review. To scale to thousands of procedures: wrap the §2 prompt into a batch job, validate outputs against a JSON Schema of DATA.md §3, auto-reject untraceable items (§3.1 is mechanically checkable), and sample-review N% per batch. The prompt and target schema are already batch-ready; only the harness is missing.
