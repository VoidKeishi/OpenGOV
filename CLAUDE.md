# CLAUDE.md — OpenGOV repo

## Nạp context đầu session (bắt buộc)

Đọc theo thứ tự: `PROBLEM.md` (đề bài + tiêu chí — bất biến, không sửa) → `SOLUTION.md` (tổng quan 3 trụ giải pháp) → `PLAN.md` (tiến độ + việc còn lại) → `docs/DESIGN.md` (use case, quyết định thiết kế). Sau đó theo mảng đang làm:

- Backend / dữ liệu: `docs/DATA.md` (contract mọi artifact `data/` — **nguồn sự thật duy nhất**, code lệch thì sửa code) + `docs/ARCHITECTURE.md` + `backend/CLAUDE.md`.
- Widget: `docs/WIDGET.md`.
- Clone cổng: `dichvucong/CLAUDE.md` + `dichvucong/CLONE_SPEC.md`.

## Nghĩa vụ duy trì tài liệu

Tài liệu là trạng thái của dự án — **tài liệu lỗi thời là bug**, sửa trong cùng phiên làm việc:

- Xong một hạng mục / đổi trạng thái → cập nhật `PLAN.md` (bảng Đã xong + danh sách Còn lại + DoD).
- Quyết định thiết kế mới hoặc thay đổi → ghi vào `docs/DESIGN.md` §6 (kèm trade-off), không chỉ để trong lịch sử chat; thay đổi ở tầm trụ cột giải pháp → cập nhật cả `SOLUTION.md`.
- Đổi scope, URL demo, cách chạy → cập nhật `README.md`.
- Đổi contract dữ liệu/API → `docs/DATA.md` / `docs/WIDGET.md` trước, code theo sau.

## Ràng buộc cứng

- **`dichvucong/` là môi trường demo độc lập**: không nhắc OpenGOV/widget/AI bên trong thư mục đó (trừ các commit tích hợp có chủ đích theo `docs/DESIGN.md` §4); nó có workspace pnpm và CLAUDE.md riêng.
- **Quyền sở hữu `data/`**: `data/procedures/` do `tools/etl/parse.ts` sinh — sửa parser, không sửa file; `data/curated/`, `data/legal/`, `data/schemas/`, `data/errors/`, `data/aliases.json`, `data/golden-qa.json`, `data/provinces.json` (`defunct[]`) là dữ liệu đã review — không regenerate/bulk-rewrite, mọi thay đổi phải giữ khối `review` và truy vết nguồn theo `docs/DATA.md`.
- `backend/var/` là build artifact (gitignored) — dựng lại bằng `pnpm --dir backend seed`. `backend/data/crawl/` là input thô read-only.
- `notes/` là ghi chú làm việc local (gitignored) — không commit, không tham chiếu từ file tracked.
- **Không dùng tên thật cá nhân trong file tracked** (kể cả `reviewed_by`, ví dụ trong docs) — dùng vai trò hoặc bí danh.
- Chuỗi hiển thị cho người dùng: tiếng Việt. Code, comment: English. Tài liệu gốc repo: tiếng Việt.
- Gotchas toolchain (pnpm `allowBuilds` cho better-sqlite3, NestJS build tsc→CJS, seed chạy `--experimental-strip-types`): xem `backend/CLAUDE.md`.
