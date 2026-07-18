# dichvucong — bản clone Cổng Dịch vụ công quốc gia (môi trường demo)

Package độc lập. **Chỉ làm việc trong thư mục này** — không đọc, không import, không tham chiếu bất kỳ file nào ngoài `dichvucong/`.

- Nguồn sự thật duy nhất: `CLONE_SPEC.md` (hợp đồng triển khai) + `captures/` (ảnh chụp site thật, HTML nội dung 3 thủ tục, design tokens).
- Không truy cập site dichvucong.gov.vn — mọi thứ cần thiết đã nằm trong captures.
- Stack: Next.js App Router + TypeScript + Tailwind. Dữ liệu tĩnh JSON trong package. Không backend, không thư viện UI ngoài.
- Tái tạo asset (logo, icon, pattern) bằng SVG/CSS tự vẽ — không copy binary từ site thật.
- Đây là môi trường demo: không auth thật, không gửi hồ sơ thật. Mọi deviation chủ ý được liệt kê trong CLONE_SPEC.md.
