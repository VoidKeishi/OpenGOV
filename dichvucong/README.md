# dichvucong — bản clone Cổng Dịch vụ công quốc gia (MÔI TRƯỜNG DEMO)

Bản clone tĩnh của dichvucong.gov.vn dùng làm môi trường demo. **Không phải cổng
thật** — mọi trang đều có banner "MÔI TRƯỜNG DEMO", đăng nhập là giả lập, hồ sơ
không được gửi đi đâu. Hợp đồng triển khai: `CLONE_SPEC.md`; nguồn đối chiếu:
`captures/` (ảnh chụp, HTML nội dung, design tokens).

## Chạy

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # build production
```

Deploy Vercel: đặt Root Directory = `dichvucong/` (package tự chứa, có
`pnpm-workspace.yaml` riêng để không dính monorepo cha).

## Hành trình demo

Trang chủ → tìm kiếm thủ tục → chi tiết thủ tục → "Nộp trực tuyến" → modal đăng
nhập giả (user cố định Nguyễn Văn A) → wizard 4 bước → xác nhận nộp với mã hồ sơ
giả `DVC-{KS|TT|XD|DN|NQ}-______`. Có 5 thủ tục đầy đủ: đăng ký khai sinh, đăng
ký thường trú (mẫu CT01), cấp GPXD nhà ở riêng lẻ, đăng ký thành lập doanh
nghiệp tư nhân (Sở Tài chính), đăng ký nội quy lao động (Sở Nội vụ). 3 thủ tục
sau cùng mang badge "Toàn trình" trong mọi danh sách; các thủ tục "vỏ" khác
hiển thị mờ kèm nhãn "Đang cập nhật" (không phải link).

## Dữ liệu

- `src/data/thu-tuc/*.json` — nội dung chi tiết 5 thủ tục, trích nguyên văn từ
  `captures/content/` (3 file `.html` + 2 file `.md`) bằng `pnpm extract`
  (script `scripts/extract-content.mjs`, output đã commit).
- `src/data/form/*.json` — schema 5 tờ khai (form render data-driven).
- `src/data/{co-quan,options,news}.json`, `src/data/thu-tuc/index.json` — dữ
  liệu seed demo.

Form là controlled form thuần, chỉ validate native của trình duyệt
(required/type/pattern) — đúng hành vi "form câm" của cổng thật. Asset trang
trí (trống đồng, pattern, hoa sen) là SVG tự vẽ; logo wordmark do người dùng
cung cấp (không chứa quốc huy).

## QA

```bash
node scripts/qa-journey.mjs   # hành trình đầy đủ ×5 thủ tục ×(1440px|390px),
                              # + kiểm badge "Toàn trình"/entry vỏ,
                              # fail nếu có lỗi console hoặc request ra ngoài
node scripts/qa-shot.mjs <path> <tên> [--full]   # chụp màn hình so với captures/screens
```

Cần Google Chrome cài sẵn (dùng `playwright-core` channel `chrome`) và dev
server đang chạy (`QA_BASE` để trỏ server khác, mặc định :3000).
