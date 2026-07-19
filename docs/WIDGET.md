# WIDGET.md — Spec widget nhúng OpenGOV (build-ready)

> Spec để hiện thực `widget/`. Ngữ cảnh use case: [DESIGN.md](DESIGN.md) §2. Backend contract bên dưới lấy từ code thật trong `backend/src/` — **khi lệch nhau, code backend là chuẩn**. Mọi quyết định trong file này đã chốt qua phiên thiết kế 18–19/07/2026; build agent không cần hỏi thêm — chỗ nào spec im lặng thì chọn phương án ít code nhất không phá acceptance.

## 0. Phạm vi & bảng quyết định

- **Pha 1 (đã ship)**: một bundle JS duy nhất nhúng bằng một thẻ script → bong bóng chat + panel, hỏi đáp SSE với gen-UI card, nút "Kiểm tra hồ sơ" đọc DOM form → `/validate`.
- **Pha 2 (as-built ở §12)**: web components (`<opengov-field-hint>`, `<opengov-check-button>`) + prefill có xác nhận từ hội thoại + overlay spotlight chỉ vị trí trên trang + quick-reply chips.

| # | Quyết định | Lý do ngắn |
|---|---|---|
| 1 | Capture DOM **chỉ đọc bước đang mở** (không snapshot tích lũy) | Không state ngầm, kết quả luôn khớp cái đang nhìn, scroll-to-field luôn sống; khớp kịch bản demo (điền sai ở bước Tờ khai → check → sửa) |
| 2 | Detect thủ tục bằng **DOM-match** với `GET /schemas` (yêu cầu backend R1) | Embed zero-config → giữ lời hứa diff 1 dòng; portal-agnostic; chạy cả trên trang trắng acceptance |
| 3 | Checklist giấy tờ = **card `checklist` tất định** (yêu cầu backend R2), widget render tick được | Số lượng bản chính/bản sao không đi qua LLM (né guard `numbers_not_in_cards`); lọc theo tình huống audit được |
| 4 | **Preact + Vite**, 1 file IIFE, Shadow DOM, **≤60KB gzip** | UI nhiều state (stream/cards/tick) — component model rẻ hơn tự diff DOM; Preact ~4KB |
| 5 | Theme mặc định khớp cổng (accent `#ce7a58`/`#903938`), attr `data-accent` đổi màu | Trông như tính năng ruột của cổng (embed-first); đổi màu = 1 CSS variable, không rebuild |
| 6 | Desktop panel 380px góc phải; ≤640px sheet full màn hình | Pattern chat quen thuộc nhất với người dùng phổ thông |
| 7 | Lời văn render **mini-markdown tự viết, sanitized** — không lib markdown, không lib genUI | Phần "sinh động" đã do card system (gen-UI tất định) đảm nhiệm; escape HTML chặn XSS; giữ budget |
| 8 | Trong một lượt: **prose trên, cards dưới** (buffer cards, reveal sau stream) | Prose trỏ "xem thẻ bên dưới" — thứ tự đọc tự nhiên; SSE thật gửi cards trước nhưng cả lượt đến gần như cùng lúc |
| 9 | Khôi phục hội thoại bằng **cache transcript phía client** (sessionStorage) | Server chỉ lưu text — cache client giữ được cả cards/kết quả check/tick; `GET /sessions/:id` chỉ là fallback |
| 10 | Bundle host tại **chính backend** `/widget/opengov.js` (yêu cầu backend R3) | 1 deploy cho cả API + bundle; thẻ embed chỉ cần 1 host |
| 11 | Stream token giả lập giữ nguyên; bù bằng **trạng thái tool + timeout 30s** | Không đụng backend trước deadline; người dùng luôn thấy hệ thống đang tra cứu gì thật |

## 1. Embed contract

```html
<script src="https://<backend-host>/widget/opengov.js?v=<version>"
        data-backend="https://<backend-host>"
        data-scope="1.004222,2.001610,2.001955"
        data-accent="#ce7a58"></script>
```

- `data-backend` (bắt buộc): base URL backend. Thiếu → widget log lỗi console và không mount (không ném exception ra host).
- `data-scope` (tùy chọn): danh sách mã thủ tục ưu tiên gợi ý; không ảnh hưởng detect/validate.
- `data-accent` (tùy chọn): màu chủ đạo, đổ vào 1 CSS variable trong Shadow DOM; mặc định `#ce7a58`.
- Script tự chèn container + bong bóng góc phải-dưới. **Không yêu cầu gì khác từ trang chủ nhà**: không global (trừ 1 guard chống mount đôi), không CSS ngoài, không framework, không font tải ngoài.
- Idempotent: script chạy 2 lần chỉ mount 1 widget.

## 2. Kiến trúc bundle

- Preact + Vite, build **một file IIFE** `opengov.js` (không ESM, không code-splitting, không request asset phụ). CSS inline vào JS, inject `<style>` trong Shadow DOM.
- Toàn bộ UI trong **Shadow DOM (mode `open`)** trên 1 host element gắn `document.body` — style không leak hai chiều; widget phải sống sót khi host có CSS reset mạnh (`* { all: unset }` không xuyên được shadow; tự đặt đủ style cho mọi element mình render).
- Font hệ thống (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`).
- Budget **≤60KB gzip**; CI/`pnpm build` in kích thước, fail khi vượt.
- Palette (CSS variables trên `:host`): `--og-accent` (#ce7a58, override bằng `data-accent`), `--og-accent-dark` (#903938 — tự sinh bằng darken hoặc dùng mặc định khi accent bị override), `--og-surface` (#f5f5f5), `--og-ink` (#1e2f41), lỗi `#d13438`, warning `#b8860b`, ok `#2e7d32`.
- Chuỗi hiển thị tiếng Việt; code + comment tiếng Anh (quy ước repo).

## 3. Backend contract (as-built — đối chiếu `backend/src/`)

Base URL = `data-backend`. CORS đã mở toàn cục phía backend (`cors: true`), gọi cross-origin thẳng, không cần proxy.

### 3.1 `GET /health`

```json
{ "status": "ok", "db": "...", "llm_available": false, "models": { "cheap": "...", "strong": "..." } }
```

Gọi khi mở panel lần đầu mỗi phiên. `llm_available=false` → hiện banner degraded (§7). Lỗi mạng → coi như backend chết, hiện state OFFLINE.

### 3.2 `POST /sessions` · `GET /sessions/:id`

- `POST /sessions` → `{ "session_id": string }`.
- `GET /sessions/:id` → `{ messages: {role:'user'|'assistant', content:string}[], case_facts: Record<string,unknown> }`; **404 nếu id không tồn tại** → widget lặng lẽ bỏ id cũ, tạo phiên mới.
- `POST /chat` với `session_id` lạ sẽ tự tạo lại phiên rỗng (getOrCreate) — gửi id cũ không bao giờ lỗi.
- Server chỉ lưu **text** (cắt ~20 lượt gần nhất) + case_facts. Cards/kết quả validate không được lưu → khôi phục hiển thị dùng cache client (§8).

### 3.3 `POST /chat` — SSE qua POST

Body `{ "session_id"?: string, "message": string }`. Response `Content-Type: text/event-stream`.

**Bắt buộc dùng `fetch` + đọc `ReadableStream`** — `EventSource` không POST được. Parse: tách buffer theo `\n\n`; mỗi block dạng `data: <JSON>` → parse JSON; block `event: end` → kết thúc lượt, đóng reader.

```ts
type ChatEvent =
  | { type: 'session'; session_id: string } // luôn là event đầu — ghi lại nếu chưa có
  | { type: 'tool';    name: string; args: any }
  | { type: 'card';    payload: Card }
  | { type: 'chips';   items: string[] }    // gợi ý trả lời nhanh (≤3) cho câu hỏi làm rõ của lượt này
  | { type: 'token';   text: string }
  | { type: 'warning'; message: string }    // guard nội bộ (numbers_not_in_cards, guide_target_unknown) → console.debug, KHÔNG hiện UI
  | { type: 'done';    cards_count: number }
  | { type: 'error';   message: string };   // 'internal_error' → bubble lỗi chung
```

**Thứ tự thật của một lượt thành công**: `session` → `tool`×n (phát trong lúc agent loop chạy — đây là feedback duy nhất suốt 5–20s) → `card`×n → `chips` (nếu có) → `token`×n (stream giả lập: cả answer đã có sẵn rồi mới chunk theo từ) → `done` → `event: end`.

**Directive tail**: model kết thúc câu trả lời bằng các dòng máy-đọc dạng `[[KEY: ...]]` (mỗi directive một dòng, thứ tự tùy ý); backend parse rồi **strip toàn bộ khỏi answer trước khi** stream token, chạy guard số liệu và lưu history — widget và `GET /sessions/:id` không bao giờ thấy tail. Dòng `[[KEY lạ]]` cũng bị strip im lặng (forward-compat). Ba directive hiện có:

- `[[CARDS: <mã>=<type,...>]]` — chọn card. `procedure` luôn được kèm cho mỗi mã được chọn; `legal_fragments` tự thêm khi bản ghi có trích đoạn. Mã trong tail không cần `get_procedure` trong cùng lượt — lượt nối tiếp trả lời từ history vẫn ra card (backend tự đọc record từ DB theo mã). Tail thiếu/hỏng (mà đã tra thủ tục) → fallback `procedure` + `legal_fragments` của mã tra cuối + event `warning: cards_tail_missing`.
- `[[CHIPS: lựa chọn 1 | lựa chọn 2]]` — khi lượt này là câu hỏi làm rõ trắc nghiệm: tối đa 3 lựa chọn, mỗi cái ≤60 ký tự (backend clamp), là câu người dùng gửi-nguyên-văn được → event `chips`. Thiếu → không có chips, không sao (progressive enhancement).
- `[[GUIDE: <mã>=<target>]]` — khi answer hướng dẫn thao tác trên trang. `target` ∈ khóa field của form schema mã đó ∪ `{submit}` (nút Nộp/Tiếp tục). Hợp lệ → card `guide` (§3.4); sai mã/khóa → drop + `warning: guide_target_unknown`.

Hệ quả UI: (a) trạng thái chờ sống bằng event `tool`; (b) cards đến trước token — **buffer cards, render prose trước, reveal cards bên dưới bubble sau khi stream xong** (quyết định #8); (c) không có event nào trong 30s → coi như treo: abort fetch, hiện bubble lỗi + nút "Thử lại" (gửi lại message cũ).

Nhãn tiếng Việt cho event `tool` (hiện trong bubble chờ, thay thế nhau):

| `name` | Nhãn |
|---|---|
| `search_procedures` | Đang tìm thủ tục phù hợp… |
| `get_procedure` | Đang đọc dữ liệu thủ tục… |
| `get_form_schema` | Đang xem quy tắc biểu mẫu… |
| `update_case_facts` | Đang ghi nhớ tình huống của bạn… |
| khác (forward-compat) | Đang tra cứu… |

### 3.4 Card types & payload (từ `cards.ts`)

`Card = { type: string, payload: Record<string, any> }`. **Card type lạ → bỏ qua im lặng** (forward-compat). Payload đọc thẳng từ CSDL — widget **không tính lại số liệu**, chỉ format hiển thị bằng formatter tất định (`src/ui/format.ts`): enum → nhãn tiếng Việt (`ONLINE`→"Nộp trực tuyến", `DIRECT`→"Nộp trực tiếp", `POSTAL`→"Nộp qua bưu chính"; `WORKING_DAY`→"ngày làm việc", `DAY`→"ngày", `HOUR`→"giờ", `MONTH`→"tháng"; `FEE`→"Lệ phí", `SERVICE_FEE`→"Phí dịch vụ", `PRICE_LEVEL`→"Mức giá"), tiền `10000`→"10.000 đ", ngày ISO→"dd/mm/yyyy". Enum/field lạ → fallback hiển thị nguyên trạng hoặc bỏ qua, không bao giờ ném lỗi; key nội bộ (`id`, `case_code`, `type` của fee, `source_component_code`) không hiển thị. Mọi field payload đều có thể `null`/vắng — render phòng thủ.

| type | payload (rút gọn) | Render |
|---|---|---|
| `procedure` | `{code, name, executing_agency, promulgating_agency, category, source_url, updated_at, structuring_level, form_path?}` — biến thể out-of-scope: `{code, name, executing_agency, source_url, limited: true}` | Tên + mã + cơ quan + nút "Xem trên Cổng DVC" (`source_url`); dòng "Dữ liệu cập nhật: {dd/mm/yyyy}"; `limited` → badge "chỉ có thông tin cơ bản"; `form_path` (chỉ 3 pilot) → CTA "Nộp trực tuyến tại cổng này" (ẩn khi `location.pathname` đã là form_path) |
| `fees` | `{code, channels: [{method, fees: [{type, value_vnd, text}]}], fee_notes: [{channel, text}]}` | Nhóm theo nhãn kênh; mỗi dòng "Lệ phí: 10.000 đ" + `text` nguồn thu gọn; `fee_notes` prefix tên kênh khi ≠ `all` |
| `processing` | `{code, processing_cases: [...], channels: [{method, processing: {qty, unit}}]}` | "Nộp trực tuyến: 7 ngày làm việc" theo kênh; `processing_cases` chỉ render khi không có `channels` (tránh lặp số), ẩn `case_code`; unit `OTHER` → dùng `text` nguồn |
| `deadlines` | `{code, deadlines: [{id, label, qty, unit, from, source_quote}]}` | `label` đậm + "60 ngày kể từ {from}" + trích `source_quote` thu gọn; ẩn `id` |
| `legal_basis` | `{code, legal_basis: [{code, name}]}` | Mỗi dòng "{mã} — {tên rút gọn}" |
| `legal_fragments` | `{code, fragments: [{id, article, doc_code, doc_title, title, source_url, retrieved_at}]}` | **Thu gọn mặc định** ("Căn cứ pháp lý — n trích đoạn ▸"); mở ra từng đoạn có nút mở `source_url` |
| `checklist` (R2) | `{code, groups: [...], form_path?}` — xem §10 R2 | Checklist tick được (§5.4); `form_path` → CTA "Bắt đầu điền hồ sơ" cuối card (một CTA duy nhất, ẩn khi đang ở trang form) |
| `guide` (Pha 2) | `{code, target, label, form_path?}` — `target` = khóa field schema hoặc `submit` | Dòng chỉ dẫn "{label}" + nút "👁 Chỉ vị trí trên trang" (enabled khi target resolve được trên DOM → cuộn + overlay spotlight §12); target chưa có trên DOM → chú thích "(ở bước/trang khác)" + link "Mở trang biểu mẫu" khi có `form_path` |

**Dedup khi render** (`src/core/dedup.ts`): backend force-include card `procedure` (+ `legal_fragments`) mỗi lượt để answer trên wire tự chứa; widget **không render lại** card giống hệt (so sánh JSON) card ở lượt assistant gần nhất phía trước — hết cảnh procedure card lặp sau mỗi câu hỏi. Lượt assistant không có card (lỗi, fail-closed) reset cửa sổ so sánh → hỏi lại sau một quãng thì card hiện lại. Card có payload khác (vd checklist lọc lại theo case_facts mới) luôn render. Index card gốc được giữ khi lọc để khóa tick `"<cardIndex>:<itemId>"` không lệch. Wire + transcript cache không đổi.

### 3.5 `POST /validate`

Body `{ "procedure_code": string, "fields": Record<string,string>, "case_facts": Record<string,unknown> }`. `case_facts` lấy từ `GET /sessions/:id` ngay trước khi validate (có session) hoặc `{}`.

```ts
{ errors: Array<{
    field?: string;          // khóa schema; vắng = lỗi cấp hồ sơ
    code: string;            // E_REQUIRED, E_TINH_SAP_NHAP, ERR-DN-02…
    type: string;
    severity: 'error' | 'warning' | 'info';
    message: string;         // tiếng Việt — hiển thị nguyên văn
    suggestion: string;      // tiếng Việt — hiển thị nguyên văn
    source: 'engine' | 'llm';
} > }
```

- Engine chấm **mọi field trong schema** (field không gửi = rỗng) và **bỏ qua key lạ** → gửi thừa vô hại, gửi thiếu = báo thiếu. Đó là lý do nút check chỉ enabled khi đủ field trên DOM (§6.2).
- HTTP **422** `{message}` khi thủ tục chưa có schema / schema hỏng → hiện `message` nguyên văn dạng bubble lỗi, **không retry**.
- Lỗi mạng/5xx → bubble lỗi + nút "Thử lại".

## 4. Wireframe các màn chính

Đóng (bubble + badge khi trang có form kiểm được):

```
                                    ┌────┐
                                    │ 💬●│   ● = badge chấm accent
                                    └────┘
```

Panel desktop 380×min(640px, 85vh), neo góc phải-dưới:

```
┌─ OpenGOV — Trợ lý thủ tục ──────── ⟳  ─  ✕ ┐
│ ⚠ Chế độ giới hạn: hỏi đáp AI tạm nghỉ,     │  ← banner chỉ khi degraded
│   kiểm tra hồ sơ vẫn hoạt động.             │
│                                             │
│  Chào anh/chị! Tôi giúp gì được về thủ      │
│  tục hành chính?                            │
│  ┌──────────────────────────────┐           │
│  │ Tôi muốn đăng ký thường trú  │  (chip)   │
│  │ Phí thành lập doanh nghiệp?  │  (chip)   │
│  │ Thủ tục này cần giấy tờ gì?  │  (chip)   │
│  │ ✓ Kiểm tra hồ sơ trang này   │  (chip —  │
│  └──────────────────────────────┘  chỉ khi  │
│                                    detect)  │
├─────────────────────────────────────────────┤
│ [ ✓ Kiểm tra hồ sơ ]              ← nút cố định; ẩn/disabled/enabled
├─────────────────────────────────────────────┤
│ [ Nhập câu hỏi…                    ] [Gửi]  │
└─────────────────────────────────────────────┘
```

Một lượt trả lời (prose trên — cards reveal dưới sau khi stream xong):

```
│ Bạn cần chuẩn bị **Tờ khai CT01** và giấy   │
│ tờ chứng minh chỗ ở hợp pháp. Chi tiết ở    │
│ thẻ bên dưới.                               │
│ ┌─ Đăng ký thường trú (1.004222) ─────────┐ │
│ │ Cơ quan: Công an cấp xã                 │ │
│ │ [Xem trên Cổng DVC ↗]  Cập nhật: …      │ │
│ └─────────────────────────────────────────┘ │
│ ┌─ Giấy tờ cần chuẩn bị ──────────────────┐ │
│ │ ☑ Tờ khai CT01 (1 bản chính)            │ │
│ │ ☐ Giấy tờ chỗ ở hợp pháp — MỘT TRONG:   │ │
│ │    ☐ Sổ đỏ  ☐ HĐ thuê nhà ⓘtùy trường hợp│ │
│ └─────────────────────────────────────────┘ │
│ ▸ Căn cứ pháp lý — 3 trích đoạn             │
```

Bubble chờ (WAITING):

```
│ ◌ Đang đọc dữ liệu thủ tục…                 │
```

Kết quả kiểm tra hồ sơ (là một "lượt" trong transcript):

```
│ ┌─ Kết quả kiểm tra — 2 lỗi, 1 lưu ý ─────┐ │
│ │ ✕ Số định danh cá nhân                  │ │
│ │   Số định danh phải đủ 12 chữ số.       │ │
│ │   → Gợi ý: kiểm tra lại thẻ CCCD.       │ │
│ │ ✕ Nội dung đề nghị                      │ │
│ │   "Hà Giang" đã hợp nhất vào Tuyên Quang│ │
│ │   → Gợi ý: ghi "Tỉnh Tuyên Quang".      │ │
│ │ ⚠ … (warning/info nhóm sau error)       │ │
│ │ ── Kết quả dựa trên thông tin trên form.│ │
│ │ [Kể thêm tình huống để kiểm tra sâu hơn]│ │  ← chip, chỉ khi case_facts rỗng
│ └─────────────────────────────────────────┘ │
```

0 lỗi: hộp xanh "✓ Không phát hiện lỗi trong các mục đã kiểm tra" + dòng phạm vi "Đã kiểm tra n trường có quy tắc." (+ khi backend degraded: "Bước kiểm tra ngữ nghĩa bằng AI được bỏ qua.")

Mobile ≤640px: panel = sheet full màn hình (100dvh), header có nút thu nhỏ; bubble giữ nguyên khi thu.

## 5. Hành vi hội thoại

### 5.1 State machine một lượt chat

```
IDLE ──user gửi──▶ WAITING ──token đầu──▶ STREAMING ──event:end──▶ IDLE
  ▲                   │ (spinner + nhãn tool,        │ (append token,
  │                   │  input disabled)             │  input disabled)
  │                   ├─ event error ────────────────┤
  │                   ├─ fetch/parse lỗi ────────────┤──▶ IDLE + bubble lỗi [Thử lại]
  │                   └─ 30s không event nào ─▶ abort ┘
  └── mọi đường đều mở lại input khi kết thúc
```

- `event: end` mà chưa từng có token (edge) → coi như xong lượt rỗng, mở input.
- Cards buffer trong WAITING/STREAMING; reveal sau `event: end` (quyết định #8). `done.cards_count` chỉ để đối chiếu debug.
- Trong 1 lượt chỉ 1 request; không cho gửi song song.

### 5.2 Màn chào & chips

- 3 chip tĩnh màn chào: "Tôi muốn đăng ký thường trú", "Phí thành lập doanh nghiệp tư nhân?", "Thủ tục này cần giấy tờ gì?".
- Chip ngữ cảnh "✓ Kiểm tra hồ sơ trang này" chỉ hiện khi nút check đang enabled (§6.2) — bấm = bấm nút check. Chip "📝 Điền giúp tôi từ hội thoại" hiện khi prefill khả dụng (§12).
- **Chips động theo lượt** (event `chips`, Pha 2): render dưới prose của **lượt assistant cuối cùng**, chỉ khi state IDLE; bấm = gửi text đó như tin nhắn người dùng. Lượt mới bắt đầu → chips lượt cũ không render nữa (vẫn nằm trong transcript cache, vô hại).
- Bấm chip = gửi text đó như tin nhắn người dùng. Chips tĩnh ẩn sau lượt chat đầu tiên.

### 5.3 Mini-markdown (prose)

Tự viết, thứ tự xử lý: (1) escape toàn bộ HTML entity; (2) `**bold**`; (3) `[text](url)` + URL trần → `<a target="_blank" rel="noopener noreferrer">` (chỉ nhận `http/https`); (4) dòng bắt đầu `- `/`* ` → `<ul>`, `1. ` → `<ol>`; (5) xuống dòng còn lại → `<br>`. Không heading, không bảng, không code block, **không bao giờ render HTML thô từ model**.

Chịu lỗi khi model lỡ dùng markdown ngoài tập hỗ trợ (system prompt đã cấm nhưng render không được vỡ): dòng `#`–`######` + khoảng trắng → đoạn văn **in đậm** riêng; dòng chỉ gồm `---`/`***`/`___` (≥3 ký tự) → bỏ hẳn, không sinh `<br>`. `#khongcach` (không có khoảng trắng) giữ nguyên là text.

### 5.4 Card checklist (khi backend có R2)

- Nhóm theo `groups`; group `type: "ONE_OF"` hiện nhãn phụ "MỘT TRONG các giấy tờ sau".
- Mỗi item: checkbox tick được (state chỉ ở client, lưu trong transcript cache — không gửi server), nhãn + `quantity` ("1 bản chính, 1 bản sao" — chỉ hiện phần >0), item `conditional: true` → badge "ⓘ tùy trường hợp".
- Card `checklist` đến khi model chọn nó trong tail `[[CARDS:]]` (khi người dùng hỏi về giấy tờ/hồ sơ hoặc đã rõ tình huống) — backend build từ curated, lọc theo case_facts (§10 R2). Thủ tục không có curated checklist → không có card, checklist đến qua prose như cũ.

### 5.5 Độ bền

- `warning` event → `console.debug`, không UI.
- Card/event type lạ → bỏ qua im lặng.
- JSON parse lỗi 1 block SSE → bỏ block đó, tiếp tục đọc.

## 6. Kiểm tra hồ sơ (UC-3/UC-5)

### 6.1 Detect thủ tục của trang

Nguồn: `GET /schemas` (R1) — gọi 1 lần khi mount, cache trong bộ nhớ; refresh khi mở panel nếu lần trước lỗi. Endpoint chưa tồn tại (404/lỗi) → **tính năng check tự tắt** (nút ẩn, không lỗi UI) — widget build/chạy được trước khi backend nâng cấp.

```
detect():
  for mỗi schema s: matched(s) = số phần tử input/select/textarea có
      thuộc tính name ∈ s.field_keys đang có trong document
  best = schema có matched lớn nhất
  if matched(best) ≥ 3            → DETECTED_READY(best)
  elif URL.pathname chứa form_ref của schema nào đó
                                   → DETECTED_NOFIELDS(schema đó)   // đúng trang, sai bước
  elif session.case_facts.procedure_code có schema → DETECTED_NOFIELDS(schema đó)
  else                             → NONE
```

Re-scan (cập nhật trạng thái nút + badge bubble): poll `location.href` mỗi ~800ms (SPA navigation của Next.js không bắn event) + `MutationObserver` trên `document.body` debounce 300ms (wizard đổi bước). Chi phí mỗi lần scan là vài `querySelectorAll` — không đáng kể.

### 6.2 Trạng thái nút "Kiểm tra hồ sơ"

| Trạng thái detect | Nút trong panel | Bubble khi panel đóng |
|---|---|---|
| `NONE` | Ẩn | Không badge |
| `DETECTED_NOFIELDS` | Disabled + tooltip "Mở bước Tờ khai để kiểm tra" | Không badge |
| `DETECTED_READY` | Enabled | Badge chấm accent |

### 6.3 Contract capture DOM

Chạy lúc bấm nút, trên schema đã detect:

1. **Form chính** = `<form>` chứa nhiều field có `name ∈ field_keys` nhất; không có form nào chứa → dùng cả `document`.
2. Duyệt `input[name], select[name], textarea[name]` trong form chính, bỏ `type=file|submit|button|reset|image`:

| Loại | Giá trị gửi |
|---|---|
| radio | Nhóm cùng `name`: value của radio đang `checked`; chưa chọn → `""` |
| checkbox | `checked ? (value hoặc "on") : ""` — **unchecked bắt buộc là chuỗi rỗng** để rule `required` phía engine (bắn khi rỗng) hoạt động; tuyệt đối không gửi `"false"` |
| còn lại (kể cả select, textarea, date, number, hidden, readonly, disabled) | `.value` nguyên trạng, không trim (engine tự trim) |

3. Key lạ ngoài schema (vd `thanh_vien_0_ho_ten` của bảng thành viên, `chon_tinh`) gửi nguyên — engine bỏ qua, vô hại.
4. `case_facts`: có session → `GET /sessions/:id` lấy bản mới nhất; không có/lỗi → `{}`.
5. `POST /validate` → render kết quả thành một lượt trong transcript (wireframe §4).

### 6.4 Render kết quả & scroll-to-field

- Header đếm theo severity: "n lỗi, m cảnh báo" (info không vào đếm header). Sắp xếp error → warning → info; trong cùng mức giữ thứ tự backend.
- Mỗi item: icon severity, **label field** (tra từ DOM: `<label for>` hoặc text label gần nhất; không tìm được → dùng `errors[].field`), `message`, `suggestion` (tiền tố "→ Gợi ý:"), item `source: 'llm'` → badge nhỏ "AI".
- Item có `field` và field đang có trên DOM → click: `scrollIntoView({behavior:'smooth', block:'center'})` + `focus()` + **overlay spotlight** (§12 — phủ mờ trang, làm sáng phần tử, tự phai ~4s; nâng cấp từ flash outline Pha 1, vẫn không đụng class/style host). Field không còn trên DOM (đã chuyển bước) → item không click được, kèm chú thích "(ở bước khác)".
- Mobile (sheet full màn): click item → tự thu nhỏ panel rồi mới scroll.
- Sau kết quả, nút check thành "Kiểm tra lại" trong chính card kết quả (re-run, thêm lượt mới).
- `case_facts` rỗng lúc validate → dòng phạm vi + chip "Kể thêm tình huống để kiểm tra sâu hơn" → bấm = focus ô nhập với placeholder gợi ý ("VD: Tôi thuê nhà, muốn đăng ký vào nhà thuê").

## 7. UX states (bắt buộc đủ)

| State | Điều kiện | Hành vi |
|---|---|---|
| Đang chờ (WAITING) | Sau gửi, chưa có token | Spinner + nhãn tool (§3.3); input + nút check disabled |
| Đang stream | Có token | Con trỏ nhấp nháy cuối bubble; input disabled tới `event: end` |
| Degraded | `/health.llm_available == false` (check khi mở panel) | Banner cố định đầu panel "⚠ Chế độ giới hạn: hỏi đáp AI tạm nghỉ, kiểm tra hồ sơ vẫn hoạt động."; chat vẫn gửi được (backend trả message degrade — hiển thị nguyên văn); validate đầy đủ lỗi engine |
| Backend chết / SSE đứt / timeout 30s | fetch lỗi, stream đứt giữa chừng | Bubble lỗi "Không kết nối được với trợ lý." + nút [Thử lại] (gửi lại message cuối); không nuốt lỗi im lặng |
| 422 validate | Thủ tục chưa có schema | Hiện `message` nguyên văn, không retry |
| 0 lỗi validate | `errors.length == 0` | Hộp xanh + dòng phạm vi (§4) |
| Không detect form | §6.2 | Nút ẩn/disabled đúng bảng |
| Khôi phục transcript | Điều hướng/reload cùng tab | §8; render lại từ cache, giữ vị trí cuộn cuối |
| Mount lỗi | Thiếu `data-backend` | console.error, không mount, không ảnh hưởng host |

## 8. Session & khôi phục

- `session_id` + transcript lưu `sessionStorage` (per-tab): **đa tab = các phiên độc lập** — chấp nhận, không sync.
- Keys: `og.sid` (id), `og.transcript.<sid>` (JSON `{v:1, turns:[…]}` — mỗi turn gồm role, prose đã nhận, cards, kết quả validate, tick state), `og.open` (panel đang mở?).
- Điều hướng cùng tab → mount lại → đọc cache → render lại nguyên trạng (không gọi server). Cache mất/hỏng nhưng còn `og.sid` → `GET /sessions/:id` dựng lại **text-only** + dòng chú thích "Khôi phục lịch sử rút gọn."; 404 → phiên mới im lặng.
- Transcript cache cắt còn ~30 lượt gần nhất trước khi ghi (luôn ghi được, tránh vượt quota).
- Nút **⟳ "Cuộc mới"** trên header: xóa `og.sid` + transcript cũ, `POST /sessions` lấy id mới (lỗi → để `/chat` tự cấp qua event `session`), về màn chào.

## 9. Kịch bản demo end-to-end (5 hồi)

1. **UC-1 — intake**: mở clone → bubble → chip "Tôi muốn đăng ký thường trú" (hoặc gõ "chuyển hộ khẩu về nhà vợ") → agent hỏi làm rõ tình huống → trả lời → checklist card lọc theo tình huống, tick vài mục chuẩn bị xong.
2. **UC-2 — trích dẫn**: hỏi "lệ phí bao nhiêu, nộp online được không?" → prose định tính + cards `fees`/`processing`, mở `source_url` một trích đoạn luật.
3. **UC-3 + UC-5 — check**: vào Nộp trực tuyến, tới bước Tờ khai, điền sẵn lỗi: số định danh 11 số, bỏ trống trường bắt buộc, địa chỉ "huyện X, tỉnh Hà Giang" → bấm ✓ → lỗi nhóm theo field (E_DINH_DANH_12, E_REQUIRED, E_TINH_SAP_NHAP + gợi ý "đã hợp nhất vào Tuyên Quang") → click lỗi scroll-to-field → sửa → "Kiểm tra lại" → hộp xanh.
4. **Pha 2 preview** (khi đã build §12): bật toggle → field-hint inline + prefill có xác nhận từ hội thoại.
5. **Fail-closed**: hỏi câu ngoài KB ("thủ tục nuôi con nuôi?") → "không có trong dữ liệu" + link Cổng DVC. (Dự phòng: demo degraded bằng backend không key — validate vẫn chạy.)

Kịch bản chi tiết từng bước theo 3 thủ tục pilot, kèm bảng năng lực + kỳ vọng pass/fail để test bằng tay: [DEMO.md](DEMO.md).

## 10. Yêu cầu backend (phiên backend riêng — widget không chờ, tự degrade khi thiếu)

| # | Yêu cầu | Contract đề xuất | Widget khi thiếu |
|---|---|---|---|
| R1 *(mở rộng Pha 2)* | `GET /schemas` — index schema | `[{ "procedure_code": "1.004222", "form_ref": "dang-ky-thuong-tru", "field_keys": ["ho_ten_khai_sinh", …], "form_path": "/nop-truc-tuyen/dang-ky-thuong-tru", "prefill": { "<field>": { "fact": "<fact_key>", "transform?": {"enum": {…}} } } }]` — đọc từ `data/schemas/*.form.json` (mục `prefill` theo [DATA.md](DATA.md) §4); `form_path` = `OPENGOV_FORM_PATH_PREFIX` (default `/nop-truc-tuyen/`) + `form_ref` | Tính năng check ẩn; thiếu `prefill`/`form_path` → prefill/CTA tự tắt |
| R2 *(đã build)* | Card type `checklist` trong `/chat` | Model chọn `checklist` trong tail `[[CARDS:]]` → backend build card từ `data/curated/<code>.json` (đã merge vào record) lọc theo case_facts session (đọc lại **sau** agent turn để `update_case_facts` cùng lượt có hiệu lực): điều kiện `when` (`eq`/`in`) không thỏa → loại group/item; **thiếu fact → giữ, đánh `conditional: true`** (fail-open, cờ group truyền xuống item); group rỗng sau lọc → bỏ; payload: `{code, groups: [{id, label, type?: 'ONE_OF', items: [{id, label, quantity: {original, copy}, kind, conditional}]}]}` — strip `when`/`source_component_code`. Số lượng nằm trong card → thoát guard `numbers_not_in_cards` | Checklist qua prose như hiện tại |
| R3 | Serve bundle: `GET /widget/opengov.js` | Static từ `widget/dist/`, `Cache-Control: public, max-age=300`; embed dùng `?v=` cache-bust | Dev dùng `vite build --watch` + file local |
| R4 | (Backlog, không chặn) Stream token thật từ LLM | Pipe delta OpenRouter → bớt độ trễ cảm nhận | Đã bù bằng trạng thái tool |

## 11. Acceptance Pha 1 (đo được từng dòng)

Hạ tầng thử: trang HTML trắng `widget/test/acceptance.html` chỉ có thẻ script + một form mẫu đủ loại field (text, date, select, radio, checkbox, bảng `thanh_vien_<i>_<col>`, name trùng schema 1.004222) + backend local.

- [ ] Nhúng 1 thẻ script vào trang trắng → bubble hiện, chat được (backend degraded OK — hiện message degrade + banner).
- [ ] (Có OPENROUTER key) Hỏi lệ phí → prose stream xong reveal cards; số liệu chỉ nằm trong card; `legal_fragments` thu gọn, mở được nguồn.
- [ ] Form mẫu: định danh 11 số + bỏ trống 1 trường required + địa chỉ "huyện X, Hà Giang" → check trả đúng ≥3 lỗi tương ứng; click lỗi cuộn + focus + highlight đúng field; sửa hết → "Kiểm tra lại" ra hộp xanh kèm dòng phạm vi.
- [ ] Checkbox: bỏ tick một checkbox có rule `required` gated (hoặc field mô phỏng) → lỗi xuất hiện; tick → hết (chứng minh unchecked = `""`).
- [ ] Nút check: ẩn trên trang không form; disabled + tooltip khi URL khớp `form_ref` nhưng DOM <3 field; enabled khi ≥3 field; badge bubble đúng bảng §6.2.
- [ ] Reload / điều hướng cùng origin → transcript khôi phục đầy đủ cards + tick checklist + kết quả check; 2 tab = 2 phiên độc lập; "Cuộc mới" về màn chào với session mới.
- [ ] `/validate` mã không có schema → hiện message 422 nguyên văn, không retry; tắt backend giữa chừng → bubble lỗi + Thử lại hoạt động.
- [ ] Host có CSS reset mạnh → widget không vỡ; widget không đổi giao diện host (so ảnh chụp trước/sau khi thêm script).
- [ ] Bundle 1 file, không request nào ngoài `data-backend`; kích thước gzip ≤60KB (build in ra số).
- [ ] Viewport 375px: sheet full màn, thu nhỏ được; click lỗi tự thu nhỏ rồi cuộn.

### Acceptance Pha 2 (bổ sung 19/07)

- [ ] Lượt trả lời có `[[CHIPS:]]` → hàng chip hiện dưới prose lượt cuối, bấm chip gửi đúng text; lượt mới → chips cũ biến mất.
- [ ] Card `guide` với target đang có trên DOM → nút "Chỉ vị trí trên trang" bấm ra overlay spotlight (phủ mờ + viền accent) rồi tự phai; target ở bước khác → chú thích + link mở trang biểu mẫu.
- [ ] Prefill: có case_facts map được + đang ở trang form → chip "Điền giúp tôi"; preview từng dòng tick được; "Điền giúp tôi" chỉ ghi dòng tick, ô được điền viền accent, giá trị vào đúng React state (submit wizard thấy giá trị); "Hoàn tác" trả lại giá trị cũ + gỡ viền; lượt `prefill` được ghi vào transcript.
- [ ] `<opengov-field-hint>`: blur field sai → lỗi inline đúng field (debounce, không spam validate); sửa xong blur lại → lỗi biến mất.
- [ ] `<opengov-check-button>`: bấm → lỗi đổ vào các field-hint có mặt; lỗi không có hint (hoặc trang không gắn hint) → mở panel chat hiện kết quả check như Pha 1.
- [ ] Toggle "Phase 2 preview" trong clone OFF → trang không render bất kỳ element opengov-* nào (bằng Pha 1 thuần).

## QA

- **Unit (vitest)**: capture (`captureFields`) và detect (`detect`) là hàm thuần nhận danh sách phần tử/DOM stub — test đủ bảng §6.3 (radio chưa chọn, checkbox on/off, member-table, file bị bỏ, chọn form chính) và §6.1 (ngưỡng 3, tie-break URL). Mini-markdown: test escape HTML/XSS.
- **Playwright smoke** trên `acceptance.html` + backend local degraded: mount, chat degrade, check ra đúng lỗi, session sống qua reload, style không leak.
- Trước demo: chạy tay kịch bản §9 trên clone (checklist trong spec này là script).

## 12. Pha 2 (as-built 19/07)

Nguyên tắc an toàn (bất biến, từ [SOLUTION.md](../SOLUTION.md) §3): đọc (highlight/cuộn/focus) tự động nhưng chỉ chạy khi người dùng bấm; **ghi phải được người dùng duyệt**; không bao giờ tự nộp; thao tác hộ ghi lại trong phiên (turn `prefill` trong transcript).

### 12.1 Overlay spotlight (`src/core/overlay.ts`)

Một div duy nhất trong Shadow DOM của widget: `position:fixed` đặt theo `getBoundingClientRect()` của phần tử đích, viền 3px accent + bo góc, phủ mờ phần còn lại của trang bằng `box-shadow: 0 0 0 200vmax rgba(15,23,42,.5)`, `pointer-events:none` (người dùng vẫn thao tác được trang bên dưới), `z-index` dưới bubble/panel. Vòng đời: `scrollIntoView({block:'center'})` → đo rect → hiện, bám theo scroll/resize → tự phai sau ~4s và remove; gọi spotlight mới hủy overlay cũ. Dùng chung cho: click lỗi validate (§6.4), nút card `guide`, đánh dấu ô vừa prefill. Không đụng class/inline-style của host (trừ ô prefill — có track + hoàn tác). Overlay đánh số nhiều bước / click hộ vẫn là roadmap (wizard step là React state — không điều khiển được từ ngoài).

### 12.2 Guide — mức 3 "dẫn thao tác" phạm vi demo

Chỉ dẫn bằng lời trong prose + card `guide` (§3.4) do model chọn qua `[[GUIDE: <mã>=<target>]]` (§3.3). Kích hoạt bằng **nút bấm** trong chat (không auto-spotlight khi answer hiện — tránh giật màn hình và tránh phát lại khi restore transcript). Target hợp lệ do backend gác: khóa field schema hoặc `submit`.

### 12.3 Web components

Được define sẵn trong bundle Pha 1 lúc mount (`customElements.define`, guard định nghĩa đôi); cổng chỉ cần đặt markup — không thêm script nào khác. Giao tiếp components ↔ panel qua bus pub/sub nội bộ bundle (`src/core/bus.ts`).

- **`<opengov-field-hint field="<schema_key>" hint?="<text>">`**: shadow root riêng; tìm field theo `name`; lỗi inline khi blur (debounce 400ms, `POST /validate` cả form hiện có, lọc kết quả theo field mình) + nhận lỗi phân phối từ check-button qua bus; `hint` tĩnh (tùy chọn, cổng tự đặt) hiện khi chưa có lỗi.
- **`<opengov-check-button>`**: đặt cạnh nút nộp của cổng; validate toàn form → lỗi đổ vào các field-hint tương ứng; lỗi không có hint (hoặc trang không gắn hint nào) → fallback mở panel chat render kết quả check như Pha 1.

### 12.4 Prefill có xác nhận

Nguồn = `case_facts` session (prompt đã dặn model ghi cả fact danh tính/chủ hộ). Mapping khai báo trong `data/schemas/<code>.form.json` mục `prefill` ([DATA.md](DATA.md) §4), phân phối tới widget qua `GET /schemas` (R1 mở rộng). UX: chip "📝 Điền giúp tôi từ hội thoại" (hiện khi DETECTED_READY + ≥1 fact map được); panel preview **từng dòng** `field ← giá trị ← fact nguồn`, checkbox mặc định bật, dòng có giá trị DOM trùng sẵn thì ẩn; "Điền giúp tôi" chỉ ghi các dòng đang tick; ô được điền viền accent + turn `prefill` trong transcript kèm nút **Hoàn tác toàn bộ** (trả giá trị cũ, gỡ viền).

**Hội thoại chưa có gì để điền** (bấm nút khi session trống): widget KHÔNG hiện thông báo cụt — nó gửi hộ một tin nhắn nhờ trợ lý ("Điền giúp tôi tờ khai trên trang này (thủ tục <mã>). Hỏi tôi từng thông tin còn thiếu nhé."). Prompt (quy tắc 13) bắt model thu thập **từng bước**: mỗi lượt đúng một câu hỏi (nguyên văn `question` của fact, kèm chips khi là lựa chọn), ghi `update_case_facts` ngay trong lượt (một câu chứa nhiều fact thì ghi đủ), đủ fact string + `truong_hop` là dừng hỏi và mời bấm lại nút "📝 Điền giúp tôi" để xem preview. Backend hỗ trợ hai lớp tất định: (1) tiêm `case_facts` đã ghi vào mỗi lượt dưới dạng system note (lịch sử chỉ lưu text) — model không hỏi lại mục đã có; (2) answer nói "ghi nhận" mà lượt đó không gọi `update_case_facts` → một lượt sửa sai ép gọi (warning `facts_claim_without_call`).

**Ghi fact vào field `select`**: giá trị fact là lời tự nhiên ("con đẻ") còn select chỉ nhận đúng option — `resolveSelectValue` khớp option theo chuẩn hóa bỏ dấu/hoa-thường + word-boundary containment duy nhất ("con_de" → "Con"); mơ hồ hoặc không khớp → dòng không được đề xuất (không bao giờ hứa một lượt ghi chết); `writeField` xác nhận select thực nhận giá trị sau khi ghi.

*Deviation so outline cũ*: cột "nguồn" hiển thị tên fact (vd `moi_quan_he_voi_chu_ho`) chứ không trích câu gốc hội thoại — backend không track provenance fact→message; nâng cấp thuộc roadmap.

**Gotcha React (clone dùng controlled input)**: set qua native value setter (`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set`) rồi `dispatchEvent(new Event('input', {bubbles:true}))`; select thêm `change`. Cổng thật có `name` lệch khóa schema → file map selector riêng của cổng (roadmap, không build demo — clone trùng name).

### 12.5 Demo grounding

Widget chạy ngay trên cổng demo → system prompt hướng dẫn thao tác tại chỗ cho 3 pilot (không đẩy người dùng sang dichvucong.gov.vn); CTA `form_path` trên card procedure/checklist dẫn thẳng vào wizard của cổng đang nhúng (đường dẫn tương đối). Thủ tục ngoài phạm vi giữ fail-closed + link Cổng DVC quốc gia.

### 12.6 Tích hợp phía cổng (clone)

Toggle "Phase 2 preview" trong banner demo (localStorage `dvc-phase2`, default OFF, đọc sau mount). ON → bước Tờ khai render `<opengov-field-hint>` dưới từng field + `<opengov-check-button>` cạnh nút "Tiếp tục/Nộp hồ sơ". Commit tích hợp Pha 2 riêng, theo [DESIGN.md](DESIGN.md) §4.
