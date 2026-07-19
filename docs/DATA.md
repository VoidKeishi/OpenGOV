# DATA.md — Committed Data Artifact Contract

> The single source of truth for every JSON shape under `data/`, the SQLite schema, and the seed mapping. If code and this file disagree, this file wins — fix the code. Shape examples below use the khai sinh procedure (1.001193) — normative for SHAPE only; khai sinh itself is no longer in the pilot scope (§1).

## 1. Layout & ownership

```
data/
  procedures/<code>.json    # 502 — MACHINE-owned: output of tools/etl/parse.ts, regenerable at will
  curated/<code>.json       # 3 pilots — HUMAN-owned overlay (converted from notes/knowledge-base, verified)
  schemas/<code>.form.json  # 3 pilots — HUMAN-owned validation schemas
  legal/<code>.json         # 3 pilots — HUMAN-owned legal-source fragments (external sources, traceable)
  errors/catalog.json       # HUMAN-owned error catalog
  aliases.json              # HUMAN-owned (agent-drafted, human-approved)
  golden-qa.json            # HUMAN-owned eval set
  provinces.json            # current[]: machine (from crawl); defunct[]: human-verified
```

Pilot codes (demo scope, decided 18/07/2026):

| Code | Procedure | Clone form slug (`form_ref`) |
|---|---|---|
| `1.004222` | Đăng ký thường trú | `dang-ky-thuong-tru` |
| `2.001610` | Đăng ký thành lập doanh nghiệp tư nhân | `dang-ky-thanh-lap-dntn` |
| `2.001955` | Đăng ký nội quy lao động của doanh nghiệp | `dang-ky-noi-quy-lao-dong` |

(1.001193 khai sinh and 1.013225 GPXD were the earlier pilots; their clone flows remain in `dichvucong/` but they get no curated/schema/legal artifacts. Examples below that use khai sinh are **illustrative shape examples only**.)

**Source hierarchy for the human-owned artifacts**: the primary input is `notes/knowledge-base/` (teammate-authored, 18/07/2026) — per-procedure sheets with verbatim dichvucong.gov.vn content, legal research with article-level citations, a 35-entry error catalog, and a 30-item golden Q&A set. Conversion to the JSON shapes below is agent work; verification stays human (structuring session).

Machine-owned files: never hand-edit — fix `tools/etl/parse.ts` and rerun. Human-owned files: never regenerate blindly — they carry review state.

## 2. Normalized procedure record — `data/procedures/<code>.json`

Generated for all 502 details. Values below are the real ones for khai sinh (illustrative — see §1); comments show the raw-JSON source (all paths relative to the `.data` envelope member).

```jsonc
{
  "code": "1.001193",                                           // data.code
  "source_id": "019d2bfd-3fe0-70ac-b9d6-5e9e20d6eef7",          // data.id
  "name": "Thủ tục đăng ký khai sinh",                          // data.name
  "category": { "code": "G15-TP07", "name": "Hộ tịch" },        // data.category
  "promulgating_agency": "Bộ Tư pháp",                          // data.departmentPromulgateName
  "executing_agency": "Ủy ban nhân dân cấp xã",                 // unitGroupsExecuting[].name join "; ";
                                                                //   fallback: catalog record .departments join
  "subject_types": ["Công dân Việt Nam", "..."],                // subjectTypesDetails[].name
  "results": ["Giấy khai sinh"],                                // resultsDetails[].name
  "requirements": "",                                           // requirementsAndConditions.trim()
  "channels": [                                                 // executionMethods[]
    {
      "method": "ONLINE",                                       // submissionMethod: ONLINE | POSTAL | DIRECT
      "fees": [ { "type": "SERVICE_FEE", "value_vnd": 0, "text": "" } ],  // fees[]: type, value, description
      "processing": { "qty": 1, "unit": "OTHER" },              // processingTime + processingTimeUnit, raw
      "note": ""                                                // description
    }
  ],
  "processing_cases": [                                         // data.cases[].processingDay —
    { "case_code": "1.001193.01", "qty": 1, "unit": "WORKING_DAY" }  // authoritative when channels[].processing.unit == "OTHER"
  ],
  "legal_basis": [                                              // legalBasisesDetails[]; code AND name .trim()
    { "code": "123/2015/NĐ-CP", "name": "Nghị định số 123/2015/NĐ-CP ..." }
  ],
  "steps_raw": [                                                // executionSteps[] — VERBATIM, always an array
    { "name": "", "text": "- Nếu lựa chọn hình thức nộp hồ sơ trực tiếp..." }
  ],
  "checklist_raw": [                                            // executionCases[] — VERBATIM groups
    {
      "group": "* Giấy tờ phải nộp:",                           // executionCases[].name (meaning varies per procedure!)
      "items": [                                                // .profileComponents[]
        {
          "name": "- Giấy chứng sinh; trường hợp không có Giấy chứng sinh thì ...",
          "original_qty": 1, "copy_qty": 0,                     // originalQty / copyQty
          "code": "000.00.00.G15-KQ004389",                     // component code — curation traceability anchor
          "has_electronic_form": false, "is_processing_result": false,
          "attachments": []                                     // refs {id, fileName, bucketName, filePath} kept as-is
        }
      ]
    }
  ],
  "state": "UPDATED",                                           // data.state
  "source": {
    "url": "https://dichvucong.gov.vn/thu-tuc-hanh-chinh/019d2bfd-3fe0-70ac-b9d6-5e9e20d6eef7",
    "updated_at": "2026-04-13T12:36:31.512Z",                   // updatedAt epoch-ms → ISO-8601
    "created_at": "2026-04-06T...",                             // createdAt epoch-ms → ISO-8601
    "crawled_at": "2026-07-18T09:13:46.134Z"                    // manifest.startedAt
  }
}
```

Dropped deliberately (present in raw, no consumer): the checklist `required` flag (false everywhere — meaningless), top-level `fees`/`profileComponents` (always empty), `keywords` (empty), the `department*`/`is*` boolean flag zoo (`executing_agency` already answers "where"), `procedureProposal`.

## 3. Curated overlay — `data/curated/<code>.json`

Human-owned, pilots only. A separate file merged over the base record at seed time (never in-place edits — keeps `parse.ts` a rerunnable pure function). Produced per `tools/etl/STRUCTURING.md` — primary source is the per-procedure sheet + decision tree in `notes/knowledge-base/`, cross-checked against the raw detail JSON. The khai sinh instance below is an illustrative shape example.

```jsonc
{
  "code": "1.001193",
  "case_facts_schema": {                       // facts the bot elicits; drives checklist + conditional validation
    "kenh_nop":           { "type": "enum", "values": ["truc_tiep", "truc_tuyen", "buu_chinh"],
                            "question": "Anh/chị dự định nộp hồ sơ theo hình thức nào?" },
    "da_dang_ky_ket_hon": { "type": "boolean", "question": "Cha mẹ bé đã đăng ký kết hôn chưa?" },
    "co_giay_chung_sinh": { "type": "boolean", "question": "Anh/chị đã có Giấy chứng sinh của bé chưa?" },
    "nguoi_di_dang_ky":   { "type": "enum", "values": ["cha_me", "ong_ba_nguoi_than", "nguoi_duoc_uy_quyen"],
                            "question": "Ai là người trực tiếp đi đăng ký?" },
    "tre_bi_bo_roi":      { "type": "boolean", "question": null }   // null = only asked if the user raises it
  },
  "steps": [                                   // numbered, per-channel; channel: truc_tiep|truc_tuyen|buu_chinh|all
    { "n": 1, "title": "Nộp hồ sơ", "channel": "truc_tiep", "text": "..." },
    { "n": 1, "title": "Nộp hồ sơ trực tuyến", "channel": "truc_tuyen", "text": "..." },
    { "n": 2, "title": "Tiếp nhận và kiểm tra hồ sơ", "channel": "all", "text": "..." }
  ],
  "deadlines": [                               // structured numbers for gen-UI cards
    { "id": "han_khai_sinh", "label": "Thời hạn đăng ký khai sinh", "qty": 60, "unit": "DAY",
      "from": "ngày sinh con",
      "source_quote": "Trong thời hạn 60 ngày kể từ ngày sinh con..." }   // verbatim from steps_raw / legal text
  ],
  "fee_notes": [                               // semantics the raw value 0 hides (miễn/giảm, per-province)
    { "channel": "all", "text": "Miễn lệ phí đối với đăng ký khai sinh đúng hạn; ..." }
  ],
  "checklist": {
    "groups": [
      { "id": "chung_minh_viec_sinh", "type": "ONE_OF", "label": "Giấy tờ chứng minh việc sinh",
        "items": [
          { "id": "giay_chung_sinh", "label": "Giấy chứng sinh",
            "quantity": { "original": 1, "copy": 0 }, "kind": "nop",
            "source_component_code": "000.00.00.G15-KQ004389" },
          { "id": "van_ban_lam_chung", "label": "Văn bản của người làm chứng xác nhận về việc sinh",
            "when": { "fact": "co_giay_chung_sinh", "eq": false }, "kind": "nop",
            "source_component_code": "000.00.00.G15-KQ004389" }
        ] },
      { "id": "uy_quyen", "type": "ALL_OF",
        "when": { "fact": "nguoi_di_dang_ky", "eq": "nguoi_duoc_uy_quyen" },
        "items": [ { "id": "van_ban_uy_quyen", "label": "Văn bản ủy quyền được chứng thực ...",
                     "quantity": { "original": 1, "copy": 0 }, "kind": "nop",
                     "source_component_code": "000.00.00.G15-KQ003159" } ] },
      { "id": "xuat_trinh", "type": "ALL_OF", "label": "Giấy tờ phải xuất trình",
        "items": [ { "id": "giay_to_tuy_than", "label": "Hộ chiếu/CCCD/... còn giá trị sử dụng",
                     "kind": "xuat_trinh", "source_component_code": "000.00.00.G15-KQ004946" } ] }
    ]
  },
  "review": {
    "reviewed_by": "<tên người review>",
    "reviewed_at": "2026-07-19",
    "method": "Claude Code interactive session per tools/etl/STRUCTURING.md"
  }
}
```

Contract rules:

- **Fact types — exactly `enum`, `boolean`, `string`.** `enum`/`boolean` facts drive `when` conditions and conditional validation. `string` facts (identity data the user states in conversation: tên chủ hộ, số định danh…) exist for **prefill only** (§4 `prefill`) — they never appear in `when` conditions. Every fact carries a `question` (Vietnamese, verbatim usable by the bot) or `null`.
- **Condition mini-language — exactly two operators**, both over `case_facts` only: `{"fact": F, "eq": v}` and `{"fact": F, "in": [v, ...]}`. No other operators, no nesting, no field references.
- **Group types — exactly `ALL_OF` and `ONE_OF`**, each with optional `when`; items with optional `when`. `kind` is `nop` (submit) or `xuat_trinh` (present).
- **Missing fact → fail-open on display**: show the item with badge "tùy trường hợp". A checklist that hides documents is worse than one that over-shows.
- **Traceability is mandatory**: every item carries `source_component_code` (the raw component `code`) or a `source_quote` (verbatim sentence from `steps_raw`). Every `deadlines[]` entry carries `source_quote`. No untraceable content.
- Quantities are copied from `original_qty`/`copy_qty`, never invented. Document/legal names stay verbatim Vietnamese.
- Per-procedure mapping notes (facts from the knowledge-base decision trees):
  - **1.004222 thường trú**: the 6 hồ sơ cases map to one enum fact `truong_hop` (so_huu | nhan_than | thue_muon_o_nho | tin_nguong_ton_giao | tro_giup_xa_hoi | don_vi_dong_quan) plus boolean `song_tren_phuong_tien`; extra facts: `chua_thanh_nien`, `viet_kieu_khong_ho_chieu` (→ CT02 instead of CT01), fee-exemption group (TT 75/2022 Điều 4). Prefill string facts (mirror tờ khai CT01 fields, TT 53/2025/TT-BCA): `ho_ten_chu_ho`, `moi_quan_he_voi_chu_ho`, `so_dinh_danh_chu_ho`.
  - **2.001610 DNTN**: facts `loai_dang_ky` (co_ban | dn_xa_hoi | chuyen_doi_hkd | chuyen_doi_btxh_quy), `co_so_dinh_danh` (true → skip bản sao giấy tờ pháp lý, khoản 1 Điều 11 NĐ 168/2025), `uy_quyen` (khong | ca_nhan | to_chuc | buu_chinh_cong_ich | buu_chinh_khac), `co_tai_khoan_dddt`, `kenh_nop` (online → miễn lệ phí 50k, chỉ 100k phí công bố).
  - **2.001955 nội quy lao động**: facts `so_lao_dong` (≥10 → registration required at all, Điều 119 BLLĐ), `co_to_chuc_dai_dien` (→ văn bản góp ý required), `co_van_ban_ky_luat_rieng`, `co_chi_nhanh_khac_tinh` (→ post-registration obligation).

Chat's `get_procedure(code)` returns base + overlay merged. Gen-UI cards read only `channels[].fees`, `processing_cases`, `deadlines`, `executing_agency`, `legal_basis`, `source.updated_at`, `source.url` — all structured; the LLM never generates these numbers.

## 4. Validation schema — `data/schemas/<code>.form.json`

Field keys are the portal form's snake_case `name` attributes (see `dichvucong/src/data/form/<slug>.json`) — **this file IS the Phase-2 field-ID → schema mapping**. Sequencing: the schema for `1.004222` can be authored now (its clone form exists); schemas for `2.001610` and `2.001955` wait until the clone commits `dang-ky-thanh-lap-dntn.json` / `dang-ky-noi-quy-lao-dong.json` (field lists specced in `dichvucong/CLONE_SPEC.md` §4.4–4.5). Khai sinh below is an illustrative shape example:

```jsonc
{
  "procedure_code": "1.001193",
  "form_ref": "dang-ky-khai-sinh",             // clone form slug
  "fields": {
    "ho_ten_nguoi_yeu_cau": { "label": "Họ, chữ đệm, tên người yêu cầu",
      "rules": [ { "rule": "required", "error": "E_REQUIRED" } ] },
    "giay_to_tuy_than_so": { "label": "Giấy tờ tùy thân: số",
      "rules": [ { "rule": "required", "error": "E_REQUIRED" },
                 { "rule": "pattern", "value": "^[0-9]{12}$", "error": "E_DINH_DANH_12",
                   "when": { "field": "giay_to_tuy_than_loai", "in": ["CCCD", "Số định danh cá nhân"] } } ] },
    "ngay_sinh_nguoi_duoc_khai_sinh": { "label": "Ngày, tháng, năm sinh",
      "rules": [ { "rule": "required", "error": "E_REQUIRED" },
                 { "rule": "date_not_future", "error": "E_NGAY_TUONG_LAI" } ] },
    "ngay_sinh_ghi_bang_chu": { "label": "Ghi bằng chữ",
      "rules": [ { "rule": "required", "error": "E_REQUIRED" },
                 { "rule": "llm_check", "check": "date_in_words_matches",
                   "against": "ngay_sinh_nguoi_duoc_khai_sinh", "error": "E_NGAY_CHU_LECH" } ] },
    "que_quan": { "label": "Quê quán",
      "rules": [ { "rule": "required", "error": "E_REQUIRED" },
                 { "rule": "province_not_defunct", "error": "E_TINH_SAP_NHAP" },
                 { "rule": "no_district_level", "error": "E_CAP_HUYEN" } ] },
    "so_dinh_danh_ca_nhan_me": { "label": "Số định danh cá nhân (mẹ)",
      "rules": [ { "rule": "pattern", "value": "^[0-9]{12}$", "error": "E_DINH_DANH_12" } ] },
    "gcn_ket_hon_so": { "label": "Giấy chứng nhận kết hôn: Số",
      "rules": [ { "rule": "required", "error": "E_GCN_KH_THIEU",
                   "when": { "fact": "da_dang_ky_ket_hon", "eq": true } } ] },
    "so_luong_ban_sao": { "label": "Số lượng bản sao",
      "rules": [ { "rule": "required", "error": "E_REQUIRED",
                   "when": { "field": "de_nghi_cap_ban_sao", "eq": "Có" } },
                 { "rule": "int_range", "min": 1, "max": 20, "error": "E_SO_LUONG" } ] }
  },
  "cross_field": [
    { "rule": "at_least_one_of", "fields": ["ho_ten_me", "ho_ten_cha"], "error": "E_KS_CHA_ME",
      "attach_to": "ho_ten_me" },                                // which field the error renders on
    { "rule": "date_before", "field": "nam_sinh_me", "before": "ngay_sinh_nguoi_duoc_khai_sinh",
      "error": "E_ME_SINH_SAU_CON" }
  ],
  "prefill": {                                                   // OPTIONAL — Phase-2 conversation→form mapping
    "ho_ten_me": { "fact": "ho_ten_me" },                        // form field ← case_facts key (usually a string fact, §3)
    "kenh_nhan_kq": { "fact": "kenh_nop",                        // enum fact → form label via declarative transform
                      "transform": { "enum": { "truc_tuyen": "Trực tuyến", "truc_tiep": "Trực tiếp" } } }
  }
}
```

**`prefill` contract** (Phase 2, optional per schema): keys are form field names (must exist in `fields` or on the clone form); `fact` references a `case_facts_schema` key of the same procedure; optional `transform.enum` maps fact values to display labels — the only transform kind (no expressions, no concatenation; anything beyond enum→label stays out of scope). The backend serves this section verbatim in the `GET /schemas` index; the widget is the only consumer and every write requires explicit user confirmation (WIDGET.md §12). Multiple form fields may reference the same fact.

**Closed rule set — exactly 10 rules.** The engine implements these and nothing else; a schema referencing an unknown rule fails loudly at load time. `int_range` and `date_before` are usable in both `fields` and `cross_field`:

| Rule | Params | Meaning |
|---|---|---|
| `required` | — | non-empty after trim |
| `pattern` | `value` (regex) | full-match |
| `date_not_future` | — | parsed date ≤ today |
| `date_before` | `field`, `before` | field's date strictly before other field's |
| `int_range` | `min`, `max` | integer within range |
| `province_not_defunct` | — | value must not contain a defunct province name; hit yields `params {old, new}` |
| `no_district_level` | — | value must not contain `quận|huyện|thị xã` (2-level model since 01/07/2025) |
| `at_least_one_of` | `fields[]`, `attach_to` | cross-field: at least one non-empty |
| `number_lte_field` | `field`, `lte` | numeric ≤ another field's value |
| `llm_check` | `check`, `against?` | skipped by the engine, forwarded to the LLM stage with masked values |

Any rule (field or cross-field) accepts an optional `when` guard: `{"field"|"fact": name, "eq"|"in": value}` — `field` reads the submitted form values, `fact` reads `case_facts`.

Engine contract (no framework, no deps):

```ts
// backend/src/validation/engine.ts
type Ctx = { provinces: { current: string[]; defunct: { name: string; merged_into: string }[] } };
function validate(schema: FormSchema, fields: Record<string, string>,
                  caseFacts: Record<string, unknown>, ctx: Ctx): RuleHit[]
// RuleHit = { field: string, error: string /* catalog code */, params: Record<string, string> }
```

### Error catalog — `data/errors/catalog.json`

```jsonc
{
  "E_REQUIRED":      { "type": "missing", "severity": "error",
                       "message": "Trường \"{label}\" là bắt buộc.",
                       "suggestion": "Vui lòng điền {label} trước khi nộp." },
  "E_DINH_DANH_12":  { "type": "format", "severity": "error",
                       "message": "{label} phải gồm đúng 12 chữ số.",
                       "suggestion": "Kiểm tra lại số định danh cá nhân/CCCD: đủ 12 số, không có khoảng trắng hay ký tự khác." },
  "E_TINH_SAP_NHAP": { "type": "invalid_value", "severity": "error",
                       "message": "\"{old}\" không còn là tỉnh/thành phố hiện hành.",
                       "suggestion": "Từ 01/7/2025, {old} đã sáp nhập vào {new}. Vui lòng ghi \"{new}\"." },
  "E_CAP_HUYEN":     { "type": "invalid_value", "severity": "warning",
                       "message": "Địa chỉ hành chính hiện chỉ còn 2 cấp (tỉnh/thành phố và phường/xã).",
                       "suggestion": "Bỏ cấp quận/huyện/thị xã; ghi theo mẫu: phường/xã, tỉnh/thành phố." },
  "E_KS_CHA_ME":     { "type": "conflict", "severity": "error",
                       "message": "Tờ khai phải có thông tin của ít nhất cha hoặc mẹ.",
                       "suggestion": "Điền tối thiểu Họ tên của người mẹ hoặc người cha (mục C hoặc D)." }
}
```

`type ∈ {missing, format, invalid_value, conflict}`, `severity ∈ {error, warning, info}`. Messages/suggestions are Vietnamese with `{param}` interpolation (`{label}` always available; rule-specific params like `{old}`/`{new}` from the hit).

Catalog source: `notes/knowledge-base/error-catalog.md` (35 entries — `ERR-TT-01..12`, `ERR-DN-01..12`, `ERR-NQ-01..11`). Those IDs become the catalog codes; the sheet's "Thông báo lỗi" → `message`, "Cách sửa" → `suggestion`, 🔴→`error`, 🟡→`warning`, ℹ️→`info`. Entries may carry an optional `detection` string (the sheet's detection rule, kept as documentation). **Not every catalog entry is engine-checkable**: entries whose detection needs state databases (CSDL dân cư, danh sách DN toàn quốc, khu vực Điều 23…) are *advisory* — the chat/checklist surfaces them as guidance ("hệ thống sẽ đối chiếu X — kiểm tra trước trên VNeID"), the rule engine never fires them. The engine fires only rules from the closed set in the schema files.

`/validate` composition: engine → catalog lookup + interpolation → `{errors: [{field, code, type, severity, message, suggestion}]}`; then, only if the schema has `llm_check` fields present in the payload, the cheap-tier LLM runs on masked values and may append hits tagged `"source": "llm"` — it may never modify or suppress deterministic hits. Unknown catalog code or engine exception → 422 with a generic Vietnamese message (fail-closed).

## 5. Discovery & eval artifacts

### `data/aliases.json`
```jsonc
{
  "1.004222": ["nhập hộ khẩu", "đăng ký hộ khẩu", "chuyển hộ khẩu", "nhập khẩu cho vợ", "nhập khẩu cho con", "đăng ký thường trú"],
  "2.001610": ["thành lập doanh nghiệp tư nhân", "mở doanh nghiệp tư nhân", "đăng ký kinh doanh DNTN", "lập công ty tư nhân", "thành lập DNTN"],
  "2.001955": ["đăng ký nội quy lao động", "nộp nội quy lao động", "đăng ký nội quy công ty", "nội quy lao động doanh nghiệp"]
}
```
The alias exact-match fast path matters most for `2.001610`: plain FTS on "thành lập doanh nghiệp tư nhân" ranks province-specific SPECIFIC variants above the STANDARD record (verified 18/07/2026) — the alias row must pin the query to `2.001610`.

### `data/legal/<code>.json` — legal-source fragments (external sources)

Human-owned, pilots only. The second knowledge layer beyond the DVC crawl: article-level excerpts from the legal documents that govern the procedure, so chat answers and error suggestions can cite the actual provision instead of paraphrasing. Sourced from `notes/knowledge-base/research-*.md` plus targeted gap-fill web research; every fragment is traceable.

```jsonc
{
  "code": "1.004222",
  "fragments": [
    {
      "id": "cu-tru-d20-k3",
      "doc_code": "68/2020/QH14",                 // legal document, matches legal_basis[].code where possible
      "doc_title": "Luật Cư trú 2020",
      "article": "Điều 20 khoản 3",
      "title": "Điều kiện đăng ký thường trú khi thuê, mượn, ở nhờ",
      "text": "<trích đoạn NGẮN đúng phần liên quan — không chép cả điều dài>",
      "topics": ["dieu_kien", "thue_muon_o_nho"],  // free-form tags for the LLM to pick fragments
      "source_url": "https://...",                 // REQUIRED — official portal preferred (vanban.chinhphu.vn)
      "retrieved_at": "2026-07-18"
    }
  ],
  "review": { "reviewed_by": "...", "reviewed_at": "...", "method": "..." }
}
```

Contract rules: `source_url` + `retrieved_at` are mandatory on every fragment — a fragment without provenance does not get written; keep `text` to the minimal relevant excerpt (legal-normative documents are public state documents, but full-article dumps bloat the record and hurt grounding); `doc_code` should match a `legal_basis[].code` of the procedure when the document appears there. Known gap-fill targets (cited by the error catalog / golden QA but absent from the research files): Đ.122/124/125/127 BLLĐ 2019; Đ.17, Đ.37–39, Đ.188 Luật DN 2020; danh mục ngành nghề cấm (Luật Đầu tư 2020, Phụ lục I).

### `data/golden-qa.json`
Source: `notes/knowledge-base/golden-qa-set.md` — 30 authored Q&A with expected answers and citations; convert each to the shape below (`expect` values derive from the authored answer + its cited sources). ≥4 per pilot + discovery-phrasing + out-of-scope items.
```jsonc
[
  { "id": "qa-001", "category": "checklist",
    "question": "Tôi thuê phòng trọ, có đăng ký thường trú được không?",
    "expect": { "procedure_code": "1.004222",
                "must_mention_any": [["công chứng", "chứng thực"], ["diện tích"]],   // outer = AND, inner = OR
                "must_cite_any": ["68/2020/QH14"],
                "must_include_source_url": true } },
  { "id": "qa-028", "category": "out_of_scope",
    "question": "Thủ tục ly hôn thuận tình cần gì?",
    "expect": { "out_of_scope": true, "must_mention_any": [["không có trong dữ liệu", "chưa hỗ trợ chi tiết"]] } }
]
```
Runner (`backend/scripts/golden-qa.ts`): POST each question to `/chat`, collect full SSE text + card payloads, assert by diacritics-normalized substring match. Deterministic — no LLM judge.

### `data/provinces.json`
```jsonc
{
  "current": [ { "code": "01", "name": "Thành phố Hà Nội" } ],   // 34, from crawl rows
  "defunct": [ { "name": "Hà Giang", "merged_into": "Tỉnh Tuyên Quang" } ]  // ~29 pre-merger names, HUMAN-verified
}
```

## 6. SQLite schema & seed

`backend/src/db/schema.sql`, applied by `backend/scripts/seed.ts` (drop + recreate, rerunnable):

```sql
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
```

Seed mapping:

| Source | Target |
|---|---|
| `data/procedures/*.json` (+ merge `data/curated/<code>.json` where present → `structuring_level='full'`) | `procedures` + `procedures_fts` |
| `data/legal/<code>.json` | merged into the `record` JSON as key `legal_fragments` (no extra table, no DDL change) — `get_procedure` returns them with the record |
| `data/aliases.json` | `aliases` rows + concatenated into the FTS `aliases` column |
| `data/provinces.json` | `provinces` (both current and defunct) |
| `data/schemas/`, `data/errors/` | NOT seeded — the validation module reads these JSON files directly |

Output `backend/var/opengov.db` — gitignored build artifact. Deploy (Railway/Fly) runs the seed at build time, so every deploy is reproducible from committed `data/`.

## 7. ETL split — who produces what

Three inputs now feed `data/`: the DVC crawl (machine-parsed), the teammate knowledge base `notes/knowledge-base/` (converted by agent, verified by human), and targeted web gap-fill for missing legal fragments (agent with mandatory provenance).

| Content | `tools/etl/parse.ts` (deterministic, all 502) | KB conversion + structuring session (3 pilots) |
|---|---|---|
| Identity, category, agencies, subjects, results | ✅ from `data.*` structured fields | — |
| Channels, fees, processing time | ✅ `executionMethods[]` + `cases[].processingDay` → `processing_cases` | `fee_notes` where value 0 hides semantics |
| Steps | ✅ `steps_raw[{name,text}]` verbatim | numbered `steps[]` with per-channel variants |
| Document checklist | ✅ `checklist_raw` verbatim groups + component codes, qty, attachment refs | conditional `checklist.groups` + `case_facts_schema` |
| Deadlines ("60 ngày...") | — (buried in prose) | `deadlines[]` with `source_quote` |
| Legal basis | ✅ trimmed | — |
| Requirements | ✅ `requirementsAndConditions.trim()` | — |
| Freshness/provenance | ✅ epoch-ms → ISO, source URL, `crawled_at` | `review` block |
| Provinces | ✅ `current[]` from crawl | `defunct[]` merger map (human-verified) |
| Legal fragments (`data/legal/`) | — | ✅ converted from `research-*.md` + web gap-fill, provenance mandatory |
| Validation schemas, error catalog, aliases, golden QA | draft skeletons only (aliases) | ✅ converted from KB (`error-catalog.md`, `golden-qa-set.md`) + reviewed |
