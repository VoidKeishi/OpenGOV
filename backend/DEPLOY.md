# Triển khai OpenGOV backend

Dịch vụ backend là một ứng dụng NestJS + better-sqlite3. Cơ sở dữ liệu SQLite
(`backend/var/opengov.db`) **không được commit** — nó được dựng lại từ thư mục
`data/` bằng lệnh `pnpm seed` ngay khi build, nên mỗi lần deploy đều tái lập được
từ dữ liệu đã commit (xem `docs/ARCHITECTURE.md` §6).

Điểm quan trọng cần nhớ trước khi bắt đầu:

- **Build context phải là gốc repo**, không phải thư mục `backend/`. Lý do: cấu
  hình pnpm workspace (`pnpm-workspace.yaml`, trong đó có `allowBuilds: better-sqlite3`)
  và thư mục `data/` nằm ở gốc, cả hai đều cần cho bước cài đặt và seed.
- **Cần Node 22 trở lên** và pnpm 11.10.0 (đã ghim qua `corepack`). better-sqlite3
  là native module nên môi trường build phải biên dịch được (image `node:22-bookworm`
  đã có sẵn công cụ build).
- Ứng dụng lắng nghe trên `0.0.0.0:$PORT` (mặc định 3001) và **đã bật CORS** để
  widget gọi chéo domain được.

## Biến môi trường

| Biến | Bắt buộc | Mặc định | Ý nghĩa |
|---|---|---|---|
| `OPENROUTER_API_KEY` | Không* | — | Khóa OpenRouter (`sk-or-v1-...`). Thiếu key: server vẫn chạy nhưng `/chat` trả lời fail-closed (báo "không có trong dữ liệu" + link cổng) và `/validate` bỏ qua tầng `llm_check`. |
| `PORT` | Không | `3001` | Cổng lắng nghe (Railway/Fly/Render tự set biến này). |
| `OPENROUTER_STRONG_MODEL` | Không | `anthropic/claude-sonnet-4.5` | Model tầng mạnh (trả lời, gợi ý sửa). |
| `OPENROUTER_CHEAP_MODEL` | Không | `google/gemini-2.5-flash` | Model tầng rẻ (định tuyến, rerank, trích facts, llm_check). |
| `OPENROUTER_FALLBACK_MODEL` | Không | `google/gemini-2.5-flash` | Dùng khi model chính lỗi. |
| `OPENGOV_DB_PATH`, `OPENGOV_DATA_DIR` | Không | theo cwd | Ghi đè đường dẫn DB / thư mục data nếu bố cục khác. |

\* Không bắt buộc để **khởi động**, nhưng bắt buộc để `/chat` trả lời thật và để
golden-qa cho pass-rate có nghĩa. Lấy khóa tại <https://openrouter.ai/keys>.

Local: sao chép `backend/.env.example` → `backend/.env` rồi điền khóa (`.env` đã
gitignore). Trên nền tảng cloud: đặt khóa trong phần **Variables/Secrets**, đừng
đưa vào image.

---

## A. Chạy local (kiểm thử trước khi deploy)

```bash
# từ gốc repo
pnpm install                     # cài workspace (đã có allowBuilds better-sqlite3)
pnpm -C backend build            # tsc → dist/ (CommonJS)
pnpm -C backend seed             # dựng backend/var/opengov.db từ data/
echo "OPENROUTER_API_KEY=sk-or-..." > backend/.env   # tùy chọn
pnpm -C backend start            # http://localhost:3001

# kiểm tra
curl -s localhost:3001/health
# chạy eval (server phải đang chạy)
pnpm -C backend golden-qa
```

## B. Deploy bằng Docker (chuẩn, chạy được ở mọi nơi)

```bash
# BUILD TỪ GỐC REPO, chỉ định Dockerfile trong backend/
docker build -f backend/Dockerfile -t opengov-backend .

# chạy, truyền khóa lúc runtime (không nằm trong image)
docker run --rm -p 3001:3001 -e OPENROUTER_API_KEY=sk-or-... opengov-backend

curl -s localhost:3001/health
```

Image tự chạy `pnpm build` + `pnpm seed` trong lúc build, nên container khởi động
là đã có DB sẵn sàng.

## C. Railway (khuyến nghị — đơn giản nhất)

1. Push repo lên GitHub (nếu chưa).
2. Trên Railway: **New Project → Deploy from GitHub repo**, chọn repo này.
3. Trong **Settings → Build**:
   - **Builder**: Dockerfile
   - **Dockerfile Path**: `backend/Dockerfile`
   - **Root Directory**: để trống (build context = gốc repo — bắt buộc).
4. **Variables**: thêm `OPENROUTER_API_KEY`. (Railway tự cấp `PORT`; app đã đọc biến này.)
5. Deploy. Railway build image, chạy `node dist/src/main.js`, cấp một domain công khai.
6. Kiểm tra: `https://<app>.up.railway.app/health`.

## D. Fly.io (Dockerfile)

Tạo `fly.toml` ở gốc repo:

```toml
app = "opengov-backend"
primary_region = "sin"          # Singapore — gần VN

[build]
  dockerfile = "backend/Dockerfile"

[http_service]
  internal_port = 3001
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory = "512mb"
  cpus = 1
```

```bash
fly launch --no-deploy          # hoặc dùng fly.toml ở trên
fly secrets set OPENROUTER_API_KEY=sk-or-...
fly deploy
fly open                        # mở /… ; kiểm /health
```

Lưu ý Fly: build context mặc định là thư mục chứa `fly.toml` (gốc repo) — khớp yêu cầu.

## E. Render (Docker)

New → **Web Service** → chọn repo → Runtime **Docker** → **Dockerfile Path**
`backend/Dockerfile`, **Docker Build Context Directory** `.` (gốc). Thêm env
`OPENROUTER_API_KEY`. Render tự cấp `PORT`.

---

## Sau khi deploy

```bash
# 1) health
curl -s https://<domain>/health
# → {"status":"ok","llm_available":true,"models":{...}}   (llm_available=true nếu có khóa)

# 2) thử /validate (không cần khóa)
curl -s -X POST https://<domain>/validate -H 'Content-Type: application/json' \
  -d '{"procedure_code":"1.004222","fields":{},"case_facts":{}}'

# 3) chạy golden-qa lên server đã deploy
BASE_URL=https://<domain> pnpm -C backend golden-qa
```

**Nối widget:** trỏ thuộc tính embed `data-backend="https://<domain>"` (hợp đồng
nhúng trong `docs/WIDGET.md`). `/chat` là SSE (`text/event-stream`); nếu đặt sau
proxy/CDN, tắt buffering (app đã gửi header `X-Accel-Buffering: no`).

## Gỡ rối nhanh

- **`ERR_PNPM_IGNORED_BUILDS` / better-sqlite3 không mở được DB**: build context không
  phải gốc repo (thiếu `pnpm-workspace.yaml` → mất `allowBuilds`). Build lại với `-f backend/Dockerfile .`.
- **`SQLite DB not found`** khi khởi động: bước `pnpm seed` chưa chạy (hoặc `data/`
  không có trong context). Trong Docker, seed chạy ở tầng build; nếu deploy kiểu
  buildpack thì phải thêm `pnpm -C backend seed` vào lệnh build.
- **`/chat` chỉ trả câu fail-closed**: chưa set `OPENROUTER_API_KEY` (xem log:
  "OPENROUTER_API_KEY not set"). Thêm biến rồi redeploy.
- **Cập nhật dữ liệu** (curated/legal/aliases…): chỉ cần sửa `data/` và deploy lại —
  DB được seed lại mỗi lần build, không có bước migration.
