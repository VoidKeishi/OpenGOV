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
| Hệ thống tài liệu | README, PROBLEM (đề bài gốc), docs/DESIGN, docs/WIDGET, CLAUDE.md gốc | (commit này) |

## Còn lại (thứ tự phụ thuộc)

1. **Widget Pha 1** — build `widget/` theo spec [docs/WIDGET.md](docs/WIDGET.md); acceptance: chạy với backend local trên trang HTML trắng.
2. **Deploy backend public** (Railway/Fly…) + cấu hình `OPENROUTER_API_KEY` → `/chat` chạy live; chạy `pnpm --dir backend golden-qa`, tune prompt/alias tới khi pass-rate ≥ 90% (30 câu trong `data/golden-qa.json`).
3. **Tích hợp Pha 1** — commit **một dòng** thẻ script vào `dichvucong/` (bằng chứng chi phí tích hợp — xem [docs/DESIGN.md](docs/DESIGN.md) §4); chụp diff cho tài liệu.
4. **Tích hợp Pha 2** — web components + mapping field→schema trên ít nhất 1 trang form; toggle "Phase 2 preview" trong clone để xem cả hai mức.
5. **One-pager** — `docs/ONE_PAGER.md` (vấn đề, giải pháp, người dùng mục tiêu, lộ trình triển khai) + kịch bản demo; viết sau khi chốt URL public.
6. **Gia cố dữ liệu** (không chặn demo): review từng item theo checklist đầy đủ `tools/etl/STRUCTURING.md` §4; tinh chỉnh `expect` từng câu golden-QA; tách sub-fact nhóm giấy tờ tín ngưỡng (thường trú).

## Definition of done (map "What We Need to Deliver" trong PROBLEM.md)

- [ ] URL public: clone + widget + backend live; luồng tối thiểu *nêu nhu cầu → nhận hướng dẫn từng bước → kiểm tra thông tin đã điền* chạy trọn với 3 thủ tục pilot.
- [x] Tài liệu kiến trúc: sơ đồ hệ thống + model/API — [docs/DESIGN.md](docs/DESIGN.md) §3 + [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- [ ] One-pager: vấn đề, giải pháp, người dùng mục tiêu, lộ trình triển khai.
- [x] Dữ liệu từ nguồn công khai: dichvucong.gov.vn (crawl + trích dẫn) + biểu mẫu hành chính theo lĩnh vực.
- [ ] Commit tích hợp Pha 1 (diff một dòng) tồn tại và được chụp lại.
- [ ] Golden QA ≥ 90% trên `/chat` live (bằng chứng độ chính xác).
