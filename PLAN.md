# PLAN.md — Trạng thái & việc còn lại

> Đề bài + tiêu chí: [PROBLEM.md](PROBLEM.md). Giải pháp + quyết định thiết kế: [docs/DESIGN.md](docs/DESIGN.md). File này là nguồn sự thật về **tiến độ** — cập nhật ngay khi một hạng mục đổi trạng thái.

## Đã xong

| Giai đoạn | Nội dung | Commit mốc |
|---|---|---|
| Clone cổng DVC | `dichvucong/` — clone tự chứa, 5 luồng nộp toàn trình (3 thủ tục pilot + 2 giữ lại), badge "Toàn trình", QA harness, deploy Vercel (Root Directory = `dichvucong/`) | `53c036f`, `dcdc726` |
| Crawl dữ liệu | Catalog 5.670 thủ tục + 502 chi tiết từ dichvucong.gov.vn, 34 tỉnh hiện hành | (xem `backend/data/crawl/manifest.json`) |
| ETL chuẩn hóa | `tools/etl/parse.ts` tất định, rerun được → `data/procedures/` 502 file; seed SQLite FTS5 | `bc881f1` |
| Chốt pilot + nguồn pháp lý | Pivot sang 1.004222 / 2.001610 / 2.001955; layer `data/legal/` bắt buộc `source_url` | `b4fb3dc` |
| Ingest tri thức | `data/curated/` ×3 + `data/legal/` ×3 (33 trích đoạn) + catalog lỗi + golden QA 30 câu + aliases | `1fc0d1e` |
| Review dữ liệu | Duyệt từng điều kiện `when`/ONE_OF (43 item truy vết được về nguồn); viết `data/schemas/` ×3; catalog 44 mã lỗi; điền 29 tỉnh giải thể (NQ 202/2025/QH15) → rule sáp nhập tỉnh hoạt động | `18ebbdd` |
| Backend service | NestJS + better-sqlite3: `POST /chat` (SSE, agent loop 4 tool, card số liệu không qua LLM), `POST /validate` (engine 10 rule + llm_check che PII), `/sessions`, `/health`; unit tests; runner golden-QA. Key LLM là tùy chọn (degrade có chủ đích) | `1c4c97b` → `170b1b3` |
| Hệ thống tài liệu | README, PROBLEM (đề bài gốc), docs/DESIGN, docs/WIDGET, CLAUDE.md gốc | `9e1a58b` |
| Thiết kế chi tiết widget | docs/WIDGET.md thành spec build-ready (capture DOM bước hiện tại, detect DOM-match, card checklist, UX states, acceptance, yêu cầu backend R1–R4); đồng bộ SOLUTION/DESIGN | `cb03fcd` |
| **Widget Pha 1** | `widget/` — Preact + Vite, 1 file IIFE `dist/opengov.js` **14.8KB gzip** (gate 60KB trong build), Shadow DOM, SSE client + 6 card + checklist, detect DOM-match, validate + scroll-to-field, transcript cache; 46 unit (vitest) + 72 check e2e (Playwright, tự spawn backend degraded) ALL PASS | `80b4a76` |
| Backend R1 + R3 | `GET /schemas` (index cho detect DOM-match) + serve `GET /widget/opengov.js` từ `widget/dist` (build trong Docker image) — 1 deploy cho cả API + bundle; 25 unit test | `c71dc4e` |
| **Tích hợp Pha 1** | Commit **1 file, +1 dòng** thẻ script vào `dichvucong/src/app/layout.tsx` — bằng chứng chi phí tích hợp theo DESIGN.md §4; verify e2e trên clone dev với backend prod (`opengov.duckdns.org`): detect NOFIELDS→READY theo bước wizard, validate form thật (E_DINH_DANH_12 + E_TINH_SAP_NHAP), scroll-to-field, chat LLM live + cards | `5a8d40f` |
| Deploy backend VPS | `https://opengov.duckdns.org` — Docker sau aaPanel, LLM live (`llm_available:true`), đủ /health /chat /validate /sessions /schemas /widget/opengov.js; quy trình update: `backend/CLAUDE.md` §Deploy | (hạ tầng ngoài repo) |
| **Strengthen harness chat + R2** | Backend: system prompt v2 (persona người dân, ngắn gọn ~120 từ, clarify-first, cấm markdown ngoài tập widget), model chọn card qua tail `[[CARDS:]]` (parse+strip, resolver theo mã cho lượt nối tiếp, fail-safe + warning), **card `checklist` tất định (R2)** lọc theo case_facts, projection record cho LLM, `maxTokens` 700, fix `structuring_level` không vào record. Widget: formatter tiếng Việt cho mọi card (hết leak `qty/unit/id/ONLINE`), mini-markdown chịu lỗi heading/`---`. Data: 2 gap-fill legal có provenance (Đ.118k4 BLLĐ, Đ.74k1-2 LDN). Hotfix sau thử live: cả 3 model chain là reasoning model → token suy nghĩ ăn `max_tokens` 700, answer đứt giữa từ + mất tail → tắt reasoning (`effort:"none"`), trần 1200, log `finish_reason=length`; widget dedup card trùng với lượt liền trước (hết procedure card lặp). 39 unit backend + 68 unit widget + e2e ALL PASS | (phiên 19/07) |
| **Tích hợp Pha 2** | Theo user-flow scenarios + PRD non-tech (notes/): (1) **Demo grounding** — prompt v3 biết widget chạy ngay trên cổng demo, 3 pilot hướng dẫn nộp tại chỗ, `form_path` tương đối trên card (env `OPENGOV_FORM_PATH_PREFIX`); (2) **tail directive hợp nhất** `[[CARDS/CHIPS/GUIDE:]]` → quick-reply chips (guided intake trắc nghiệm) + card `guide` (nút "Chỉ vị trí trên trang" → **overlay spotlight** phủ mờ + viền accent, dùng chung cho click lỗi validate); (3) **prefill có xác nhận** — fact danh tính string trong curated + map `prefill` trong schema → `GET /schemas` mở rộng → preview tick từng dòng, ghi qua native setter, viền accent + hoàn tác + turn log; (4) **web components** `<opengov-field-hint>`/`<opengov-check-button>` (lỗi inline khi blur, phân phối qua bus, fallback panel) + toggle "Phase 2 preview" trong clone (commit tích hợp riêng, default OFF); (5) hardening từ thử live: `update_case_facts` validate/normalize server-side (khóa lạ reject kèm gợi ý, enum diễn đạt lại snap về đúng giá trị) + prompt bắt gọi get_procedure trước; (6) luồng "Điền giúp tôi" khi hội thoại chưa có dữ liệu: widget gửi hộ tin nhắn nhờ trợ lý (hết notice cụt), model hỏi **từng câu một** (rule 13, chips kèm theo, một câu nhiều fact ghi đủ, đủ fact string + truong_hop thì mời bấm lại nút) + system note case_facts mỗi lượt (model không hỏi lại mục đã có) + guard tất định "nói ghi nhận mà không gọi update_case_facts → lượt sửa sai ép gọi" (nổ 2 lần khi thử live) + resolver fact tự nhiên → option của select ("con đẻ"→"Con"). 56 unit backend + 86 unit widget + e2e 16 scenario ALL PASS + clone QA 12/12 | (phiên 19/07) |
| **Intake phân nhánh cá nhân/doanh nghiệp** | Màn chào hỏi "cá nhân hay doanh nghiệp?" bằng 2 chip phân loại (client-only — không gọi LLM), chọn xong thu hẹp chips kịch bản theo nhánh (cá nhân: thường trú; doanh nghiệp: DNTN + nội quy lao động) + chip "↩ Chọn lại"; trên trang thủ tục đã detect thì nhánh tự suy từ `procedure_code` (map tường minh 3 pilot, không đoán prefix). `widget/src/core/intake.ts` + welcome App.tsx; 91 unit widget + e2e 17 scenario (thêm `segment-intake`) ALL PASS; trade-off ghi [docs/DESIGN.md](docs/DESIGN.md) §6 | (phiên 19/07) |

### Tự chấm acceptance widget §11 (docs/WIDGET.md)

| Dòng | Kết quả | Bằng chứng |
|---|---|---|
| Nhúng 1 thẻ script → bubble + chat degraded + banner | ✅ | e2e `mount/no-leak`, `degraded-chat` |
| (Cần OPENROUTER key) prose → reveal cards, số trong card, fragments mở nguồn | ◐ | Cơ chế reveal/fragments/tick pass qua SSE replay đúng wire (`cards-mocked`); lượt live chờ deploy + key (mục 2–3 dưới) |
| Form mẫu 3 lỗi → click cuộn+focus → sửa → hộp xanh + dòng phạm vi | ✅ | e2e `validate-flow` (8 lỗi 1 cảnh báo, E_DINH_DANH_12 / E_REQUIRED / E_TINH_SAP_NHAP) |
| Checkbox gated: bỏ tick → lỗi, tick → hết (unchecked = `""`) | ✅ | e2e `gated-checkbox` trên engine thật (case_facts seed qua mock `GET /sessions/:id`) + unit capture |
| Nút check ẩn / disabled+tooltip / enabled + badge | ✅ | e2e `detect-states` |
| Reload khôi phục cards+tick+kết quả; 2 tab độc lập; Cuộc mới | ✅ | e2e `restore/new-session`, tick trong `cards-mocked` |
| 422 nguyên văn không retry; đứt mạng → Thử lại | ✅ | e2e `validate-422`, `network-error-retry`, `offline` |
| CSS reset mạnh không vỡ; không đổi giao diện host | ✅ | e2e `hostile-reset` + assert stylesheet/font host |
| 1 file, không request ngoài data-backend, ≤60KB gzip | ✅ | gate build (14.8KB) + assert request-origin |
| 375px: sheet full màn, thu nhỏ, click lỗi tự thu rồi cuộn | ✅ | e2e `mobile-375` |

## Còn lại (thứ tự phụ thuộc)

1. **Push + Vercel deploy clone** — `git push` để Vercel build lại `dichvucong/` (giờ đã có thẻ script); kiểm tra widget trên URL Vercel công khai.
2. **Golden QA ≥ 90%** — runner đã nâng cấp (session theo khối thủ tục như hội thoại thật, gate `GOLDEN_QA_MIN`, fix đọc payload card); pass-rate 63% → 70% qua 3 vòng tune (prompt v2.2 + 2 gap-fill legal + resolver tail, đo trên claude-sonnet-5). **Credit OpenRouter đã cạn 19/07** → model chính đổi sang `deepseek/deepseek-v4-pro`, chuỗi fallback `tencent/hy3:free` → `nvidia/nemotron-3-ultra-550b-a55b:free`; **quy tắc: không chạy eval tự động khi chưa được duyệt ngân sách** — khi được duyệt (ưu tiên nạp thêm credit): chạy subset câu fail trước (rẻ), đạt rồi mới `GOLDEN_QA_MIN=90 BASE_URL=https://opengov.duckdns.org pnpm --dir backend golden-qa` làm evidence; lưu ý baseline 70% đo trên Sonnet — model mới cần đo lại. Xong → chấm nốt dòng ◐ acceptance §11 (manual replay kịch bản intake).
3. **One-pager** — `docs/ONE_PAGER.md` (vấn đề, giải pháp, người dùng mục tiêu, lộ trình triển khai); viết sau khi chốt URL public. Kịch bản demo chi tiết + checklist test theo 3 thủ tục: **đã có** tại [docs/DEMO.md](docs/DEMO.md) (19/07; khung 5 hồi tóm tắt vẫn ở [docs/WIDGET.md](docs/WIDGET.md) §9).
4. **Gia cố dữ liệu** (không chặn demo): review từng item theo checklist đầy đủ `tools/etl/STRUCTURING.md` §4 (gồm 3 fact string prefill mới thêm 19/07 — đánh dấu pending human review trong khối `review`); tinh chỉnh `expect` từng câu golden-QA; tách sub-fact nhóm giấy tờ tín ngưỡng (thường trú); thêm map `prefill` cho 2.001610/2.001955.

## Definition of done (map "What We Need to Deliver" trong PROBLEM.md)

- [ ] URL public: clone + widget + backend live; luồng tối thiểu *nêu nhu cầu → nhận hướng dẫn từng bước → kiểm tra thông tin đã điền* chạy trọn với 3 thủ tục pilot.
- [x] Tài liệu kiến trúc: sơ đồ hệ thống + model/API — [docs/DESIGN.md](docs/DESIGN.md) §3 + [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- [ ] One-pager: vấn đề, giải pháp, người dùng mục tiêu, lộ trình triển khai.
- [x] Dữ liệu từ nguồn công khai: dichvucong.gov.vn (crawl + trích dẫn) + biểu mẫu hành chính theo lĩnh vực.
- [x] Commit tích hợp Pha 1 (diff một dòng) tồn tại và được chụp lại — `5a8d40f` (`dichvucong/src/app/layout.tsx`, 1 file +1 dòng).
- [ ] Golden QA ≥ 90% trên `/chat` live (bằng chứng độ chính xác).
