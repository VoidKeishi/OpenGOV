# widget/ — Widget nhúng OpenGOV (Pha 1)

Spec đầy đủ (nguồn sự thật): [docs/WIDGET.md](../docs/WIDGET.md). Build ra **một file IIFE** `dist/opengov.js` (≤60KB gzip, hiện ~15KB), nhúng bằng một thẻ script:

```html
<script src="https://<backend-host>/widget/opengov.js?v=1"
        data-backend="https://<backend-host>"></script>
```

## Lệnh

| Lệnh | Việc |
|---|---|
| `pnpm --dir widget build` | typecheck + build IIFE + **gate kích thước gzip ≤60KB** (fail khi vượt) |
| `pnpm --dir widget watch` | rebuild khi sửa file |
| `pnpm --dir widget test` | unit (vitest + happy-dom): capture, detect, mini-markdown, SSE parser, store |
| `pnpm --dir widget e2e` | Playwright smoke — **tự spawn** backend degraded (:3210) + serve.mjs (:8790), cần `pnpm --dir backend build && pnpm --dir backend seed` trước và Google Chrome trên máy |
| `pnpm --dir widget serve` | harness thủ công: http://localhost:8787 (cần backend chạy ở :3001) |

## Harness thử nghiệm (`test/`)

`test/serve.mjs` phục vụ 3 việc — **chỉ dùng cho dev/test**, production do backend R3 đảm nhiệm:

1. Serve trang thử + `dist/` (token `%BACKEND%` trong HTML được thay bằng origin của chính nó; `?backend=<url>` để override — dùng cho kịch bản trỏ thẳng backend).
2. **Shim `GET /schemas`** dựng từ `data/schemas/*.form.json` theo đúng contract R1 `[{procedure_code, form_ref, field_keys}]` — backend nay đã có `GET /schemas` thật (`backend/src/procedures/schemas.controller.ts`); shim giữ lại để harness tự đứng, không phụ thuộc backend build mới.
3. Proxy transparent mọi request khác về backend (pipe 2 chiều, SSE sống).

Trang thử: `/` (acceptance — form 1.004222 đủ loại field), `/test/blank.html` (không form → nút check ẩn), `/nop-truc-tuyen/dang-ky-thuong-tru` (đúng path, thiếu field → nút disabled), `/test/reset.html` (host có `*{all:unset}`).

Hai đường e2e phải mock vì backend chưa có đường API tương ứng: rule checkbox gated cần `case_facts.truong_hop` (mock `GET /sessions/:id` — engine `/validate` vẫn thật); card `checklist` cần LLM key + R2, `legal_fragments` cần key (replay một lượt SSE đóng hộp đúng wire format).

## Ghi chú hiện thực (khác biệt có chủ đích so với câu chữ spec)

- **Detect đếm DISTINCT name**, không đếm phần tử DOM (§6.1 viết "số phần tử"): nhóm radio 2 input là 1 field — khớp ý "≥3 field" của acceptance §11.
- Checkbox unchecked capture thành chuỗi rỗng `""` (bắt buộc, để rule `required` phía engine bắn); nhiều checkbox trùng name → giá trị cuối thắng (edge ngoài spec).
- Transcript cache ghi debounce 300ms + **flush khi `pagehide`** — điều hướng ngay sau một lượt không mất dữ liệu.
- `data-scope` được parse nhưng chưa có hành vi ở Pha 1 (reserved theo §1).
