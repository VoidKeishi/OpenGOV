# WIDGET.md — Spec widget nhúng OpenGOV

> Spec để hiện thực `widget/`. Ngữ cảnh use case: [DESIGN.md](DESIGN.md) §2. Backend contract bên dưới lấy từ code thật trong `backend/src/` — khi lệch nhau, code backend là chuẩn.

## Phạm vi

- **Pha 1 (buildable ngay)**: một bundle JS duy nhất, nhúng bằng một thẻ script → bong bóng chat + panel, hỏi đáp SSE với gen-UI card, nút "Kiểm tra hồ sơ" đọc DOM form → `/validate`.
- **Pha 2 (outline, làm sau khi Pha 1 tích hợp xong)**: web components + client SDK cho cổng tích hợp chủ động.

## Pha 1

### Embed contract

```html
<script src="https://<host>/opengov.js"
        data-backend="http://localhost:3001"
        data-scope="1.004222,2.001610,2.001955"></script>
```

- `data-backend` (bắt buộc): base URL backend.
- `data-scope` (tùy chọn): giới hạn mã thủ tục ưu tiên gợi ý; không có thì mọi thủ tục trong KB.
- Script tự chèn bong bóng chat góc phải-dưới; **không yêu cầu gì khác từ trang chủ nhà** (không global, không CSS ngoài, không framework).

### Stack & đóng gói

- Preact hoặc vanilla TS + Vite, build **một file IIFE** `opengov.js` (không ESM để tương thích chèn thẳng).
- Toàn bộ UI trong **Shadow DOM** (style không leak hai chiều); font hệ thống, không tải font ngoài.
- Không phụ thuộc gì vào trang host ngoài `document` chuẩn.

### Backend contract (đã chạy thật)

**`POST /sessions`** → `{ "session_id": string }`. **`GET /sessions/:id`** → `{ messages, case_facts }` (khôi phục hội thoại). Widget giữ `session_id` trong `sessionStorage` → sống qua điều hướng trang trong cùng tab.

**`POST /chat`** body `{ "session_id"?: string, "message": string }` — SSE (`Content-Type: text/event-stream`). Mỗi event là dòng `data: <JSON>`:

```ts
type ChatEvent =
  | { type: 'session'; session_id: string }   // ghi lại nếu chưa có
  | { type: 'token';   text: string }          // stream chữ — append vào bubble đang mở
  | { type: 'card';    payload: Card }         // render card dưới bubble hiện tại
  | { type: 'tool';    name: string; args: any } // hiển thị trạng thái "đang tra cứu…" (không bắt buộc render chi tiết)
  | { type: 'warning'; message: string }
  | { type: 'done';    cards_count: number }
  | { type: 'error';   message: string };
// kết thúc stream: server gửi `event: end` rồi đóng kết nối
```

Card `{ type, payload }` với `type`: `procedure` (tên, mã, cơ quan, link cổng), `fees`, `processing`, `deadlines`, `legal_basis`, `legal_fragments` (trích đoạn + `source_url` — render nút mở nguồn). Payload đọc thẳng từ CSDL — widget hiển thị nguyên trạng, **không tự tính toán lại số liệu**.

**`POST /validate`** body `{ "procedure_code": string, "fields": Record<string,string>, "case_facts": Record<string,unknown> }` →

```ts
{ errors: Array<{
    field?: string;      // khóa field trong schema; không có = lỗi cấp hồ sơ
    code: string;        // ví dụ E_TINH_SAP_NHAP, ERR-DN-02
    type: string; severity: 'error' | 'warning' | 'info';
    message: string; suggestion: string;   // tiếng Việt, hiển thị nguyên văn
    source: 'engine' | 'llm';
} > }
```

Thủ tục chưa có schema hoặc schema hỏng → HTTP 422 `{message}` — hiển thị message, không retry.

### Kiểm tra hồ sơ — bắt DOM

1. Xác định thủ tục của trang hiện tại: map từ URL/slug trang (cấu hình trong widget) hoặc từ `case_facts.procedure_code` của session.
2. Thu thập field: `querySelectorAll('input[name],select[name],textarea[name]')` trong form chính → `{ [name]: value }` (checkbox: `"true"/"false"`; radio: value đã chọn). Khóa `name` snake_case của form chính là khóa schema (`data/schemas/<code>.form.json`, mục `form_ref`) — đây là contract tích hợp, không cần mapping thêm ở Pha 1.
3. Gửi `/validate` kèm `case_facts` từ session (nếu có) → render kết quả **trong panel chat**: nhóm theo field, icon theo `severity`, click item cuộn + focus tới field trên trang (`scrollIntoView`).

### UX states (bắt buộc đủ)

- **Đang stream**: con trỏ nhấp nháy trong bubble; disable ô nhập tới `event: end`.
- **0 lỗi validate**: thông điệp xanh "Không phát hiện lỗi trong các mục đã kiểm tra" (nói rõ phạm vi — chỉ các trường có rule).
- **Degraded (backend thiếu OPENROUTER_API_KEY)**: chat trả lời degrade kèm link cổng chính thức — hiển thị nguyên văn; validate vẫn đủ lỗi tất định.
- **Backend không tới được / SSE đứt**: thông điệp lỗi + nút thử lại; không nuốt lỗi im lặng.
- **Không tìm thấy form trên trang**: nút "Kiểm tra hồ sơ" ẩn hoặc disabled kèm tooltip.

### Acceptance Pha 1

- Nhúng vào **một trang HTML trắng** chỉ có thẻ script + một form mẫu → chat được với backend local, "Kiểm tra hồ sơ" trả lỗi đúng field.
- Không leak style: trang host không đổi giao diện khi thêm script; widget không vỡ khi host có CSS reset mạnh.
- `sessionStorage` giữ hội thoại khi chuyển trang cùng origin.
- Bundle tự chứa, không request nào ngoài `data-backend`.

## Pha 2 (outline)

- `<opengov-field-hint field="ten_doanh_nghiep">`: custom element gắn cạnh field, hiện hint từ schema và lỗi inline khi blur (debounce gọi `/validate` với riêng field đó).
- `<opengov-check-button form-ref="...">`: đặt cạnh nút nộp của cổng, chạy validate toàn form, đổ lỗi vào các field-hint tương ứng.
- Client SDK mỏng (`createOpengovClient(baseUrl)`) bọc `/chat`/`/validate`/`/sessions` cho cổng muốn tự dựng UI.
- Prefill: đọc `case_facts` từ session → đổ vào form (mapping field→fact khai báo trong schema, không hardcode).
