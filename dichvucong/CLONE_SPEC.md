# CLONE_SPEC — Bản clone Cổng Dịch vụ công quốc gia (môi trường demo)

Hợp đồng triển khai. Code theo spec này + ảnh trong `captures/screens/` (đối chiếu pixel khi phân vân). Nội dung 3 thủ tục lấy từ `captures/content/*.html`. Không truy cập site thật.

## 0. Nguyên tắc chung

- Next.js App Router + TypeScript + Tailwind. Design tokens khai báo tại 1 chỗ (Tailwind theme), map từ mục 1.
- Dữ liệu thủ tục = JSON tĩnh trong `src/data/` (hoặc `data/` của package), trích từ `captures/content/`. Thêm thủ tục mới = thêm JSON, không sửa component.
- Asset tự vẽ 100% (SVG/CSS). Không copy binary từ site thật. Chi tiết mục 7.
- Mọi trang responsive: desktop 1440px, mobile 390px (ảnh `.mobile.png` là chuẩn đối chiếu).
- Tiếng Việt toàn bộ UI, dấu đầy đủ.

## 1. Design tokens (trích từ site thật — `captures/tokens.json`)

| Token | Giá trị | Dùng cho |
|---|---|---|
| `text-primary` | `#1E2F41` | chữ chính (xanh đen) |
| `brand` | `#CE7A58` | cam đất: nav active, nút phụ, link hover, icon |
| `brand-dark` | `#903938` | đỏ đô: wordmark, thanh footer cuối, tiêu đề khối |
| `accent` | `#FFC251` | vàng: CTA lớn trang chủ, nút "Dịch vụ công trực tuyến" |
| `text-muted` | `#495057` | chữ phụ |
| `line` | `#E2E2E2` | viền, kẻ bảng |
| `surface` | `#F5F5F5` | nền item list, nền nav |
| `white` | `#FFFFFF` | nền trang |

- Font: `"Nunito Sans"` (Google Fonts, self-host qua `next/font`), fallback `Inter, system-ui, sans-serif`. Cỡ chữ nền 16px; tiêu đề trang ~24–28px semi-bold; nav 15–16px.
- Bo góc nhỏ (4–6px), shadow rất nhẹ hoặc không. Tổng thể phẳng, hành chính, KHÔNG hiện đại hoá (không glassmorphism, không gradient ngoài các vùng có trong ảnh).

## 2. Khung trang dùng chung (mọi màn hình)

### 2.1 Header (nền trắng)
- Trái: quốc huy (SVG tự vẽ đơn giản hoá — vòng tròn đỏ, sao vàng, bánh răng + bông lúa cách điệu), cạnh đó wordmark 2 dòng: dòng 1 "CỔNG DỊCH VỤ CÔNG QUỐC GIA" (màu `brand-dark`, serif-style bold, chữ Ổ cách điệu có thể bỏ qua — dùng text thường), dòng 2 tagline "Kết nối, cung cấp thông tin và dịch vụ công mọi lúc, mọi nơi" (italic, màu `brand`).
- Phải: nút viền "Đăng nhập" (outline `brand`, chữ `brand`). Hành vi: mở trang/moDal đăng nhập giả — xem mục 6 (deviation).
- Mobile: quốc huy + wordmark thu gọn, nút hamburger mở drawer chứa nav.

### 2.2 Nav chính (thanh xám nhạt `surface`)
- Item đầu: ô vuông icon nhà nền `brand`, chữ trắng — link về Trang chủ.
- Các item: "Thông tin và dịch vụ ▾", "Thanh toán trực tuyến", "Phản ánh kiến nghị ▾", "Hỗ trợ ▾".
- Dropdown "Thông tin và dịch vụ": tối thiểu các mục "Thủ tục hành chính", "Dịch vụ công trực tuyến", "Tra cứu hồ sơ". Các dropdown khác có thể là link chết (href="#") — đủ để nhìn giống, không cần trang đích.
- Trang trong (không phải trang chủ) có thêm **sub-nav thanh cam** (`brand`, chữ trắng): "Thủ tục hành chính ▾ | Dịch vụ công trực tuyến | Dịch vụ công nổi bật | Tra cứu hồ sơ | Câu hỏi thường gặp"; item đang active nền đậm hơn. (Xem `dvc-truc-tuyen.desktop.png`.)

### 2.3 Breadcrumb (trang trong)
"Trang chủ › <mục> › <trang hiện tại>" — chữ nhỏ, link màu `text-muted`, phần tử cuối đậm.

### 2.4 Footer
- Dải trên nền trắng/kem: 2 khối link lớn có icon trống đồng tròn vàng (SVG tự vẽ pattern tròn đồng tâm): "Câu hỏi thường gặp" và "Hướng dẫn sử dụng" (link chết).
- Dải cuối nền `brand-dark`, chữ trắng, căn giữa: "Cơ quan chủ quản: Trung tâm dữ liệu quốc gia - Bộ Công an. Tổng đài hỗ trợ: 18001096".
- Ngay trên footer, mọi trang: **banner "MÔI TRƯỜNG DEMO"** — xem mục 6.

## 3. Màn hình

### 3.1 Trang chủ `/` (`home.desktop.png`, `home.mobile.png`)
1. **Hero** nền cam pattern trống đồng (tự vẽ: nền `#C0603E`→`brand` + SVG pattern hình học mờ lặp lại, KHÔNG copy ảnh thật): thanh search to ở giữa — input placeholder "Nhập từ khoá tìm kiếm thủ tục hành chính", nút phụ "Tìm kiếm nâng cao" (link chết), nút icon kính lúp. Submit → `/tim-kiem?keyword=...`.
2. Dưới search: 3 nút CTA vàng `accent`, chữ `text-primary` semi-bold: "Dịch vụ công trực tuyến" (→ `/dich-vu-cong-truc-tuyen`), "Thủ tục hành chính của Đảng" (link chết), "Dịch vụ công liên thông: Khai sinh, Khai tử" (link chết). Mobile: xếp dọc full-width.
3. **Carousel tin tức**: nền ảnh hoa sen mờ bên phải (thay bằng dải màu kem + SVG hoa cách điệu tự vẽ), 3 card tin (tiêu đề đậm + mô tả 2 dòng, mũi tên ‹ ›). Nội dung tin: lấy 3 tiêu đề bất kỳ từ `captures/content` hoặc đặt tin demo trung tính ("Thông báo nâng cấp hệ thống…"). Không cần logic carousel thật — auto-scroll không bắt buộc, nút ‹ › đổi slide là đủ.
4. **2 cột danh mục**: "CÔNG DÂN" và "DOANH NGHIỆP" (tiêu đề màu `brand`, gạch chân dày màu `brand`/`brand-dark`). Mỗi item: hàng nền `surface`, icon outline nhỏ + label. Danh sách item đúng theo ảnh (Công dân: Có con nhỏ, Học tập, Việc làm, Cư trú và giấy tờ tùy thân, Hôn nhân và gia đình, Điện lực, nhà ở, đất đai, Sức khỏe và y tế, Phương tiện và người lái, Hưu trí, Người thân qua đời, Giải quyết khiếu kiện; Doanh nghiệp: Khởi sự kinh doanh, Lao động và bảo hiểm xã hội, Tài chính doanh nghiệp, Điện lực, đất đai, xây dựng, Thương mại, quảng cáo, Sở hữu trí tuệ, đăng ký tài sản, Thành lập chi nhánh, văn phòng đại diện, Đấu thầu, mua sắm công, Tái cấu trúc doanh nghiệp, Giải quyết tranh chấp hợp đồng, Tạm dừng, chấm dứt hoạt động). Item "Có con nhỏ" → `/tim-kiem?keyword=đăng ký khai sinh`; "Cư trú và giấy tờ tùy thân" → `/tim-kiem?keyword=đăng ký thường trú`; "Điện lực, nhà ở, đất đai" → `/tim-kiem?keyword=giấy phép xây dựng`; còn lại link chết.

### 3.2 Kết quả tìm kiếm `/tim-kiem?keyword=...` (`tthc-search-khai-sinh.desktop.png`)
- Breadcrumb "Trang chủ › Dành cho công dân".
- Thanh search lặp lại (giữ keyword trong input) + nút vàng "Dịch vụ công trực tuyến" bên phải.
- Tiêu đề: `Có N kết quả cho từ khóa "<keyword>"`.
- List kết quả: mỗi hàng icon tài liệu màu `brand` + tên thủ tục (link màu `text-primary`, hover `brand`) → `/thu-tuc/<slug>`.
- Cuối: "Hiển thị [10 ▾] trên N văn bản" + phân trang "Trước / Sau" (demo 1 trang là đủ, nút Trước disabled).
- Logic search: filter client-side trên JSON thủ tục (match không dấu, contains). Ngoài 3 thủ tục pilot, seed thêm ~8 thủ tục "vỏ" (chỉ tên, không trang chi tiết — link chết hoặc trang "đang cập nhật") lấy tên từ ảnh search để list trông thật.

### 3.3 Danh sách DVC trực tuyến `/dich-vu-cong-truc-tuyen` (`dvc-truc-tuyen.desktop.png`)
- Có sub-nav cam (active: "Dịch vụ công trực tuyến"). Breadcrumb "Trang chủ › Dịch vụ công trực tuyến".
- Search bar + nút "Tìm kiếm" nền `brand`.
- 2 tab: "Công Dân" (active, gạch chân `brand`) | "Doanh nghiệp".
- List như 3.2 nhưng hiển thị 20 dòng/"Hiển thị [20 ▾] trên N văn bản". Nguồn: cùng JSON, 3 thủ tục pilot đứng đầu list.

### 3.4 Chi tiết thủ tục `/thu-tuc/<slug>` ×3 (`detail-khai-sinh.desktop.png`, `detail-thuong-tru.desktop.png`, `detail-gpxd-cap-moi-III-IV-nha-o-rieng-le.desktop.png`)
3 slug: `dang-ky-khai-sinh`, `dang-ky-thuong-tru`, `cap-gpxd-nha-o-rieng-le`. Toàn bộ nội dung trích từ `captures/content/<tương ứng>.html` vào JSON (giữ nguyên văn tiếng Việt, không tự viết lại).

Cấu trúc trang (2 cột, cột phải ~300px):
- Tiêu đề trang = tên thủ tục.
- **Bảng thông tin chung** (2 cột label/value, kẻ `line`): Mã thủ tục, Số quyết định, Cấp thực hiện, Loại thủ tục, Lĩnh vực, Trình tự thực hiện (nếu bảng thật gộp thì tách section riêng), Đối tượng thực hiện, Cơ quan thực hiện, Cơ quan có thẩm quyền, Địa chỉ tiếp nhận HS, Kết quả thực hiện, Căn cứ pháp lý (danh sách văn bản).
- **Các section theo thứ tự** (heading màu `brand-dark`, đậm):
  1. "Trình tự thực hiện" — đoạn văn/bullet dài (render từ JSON, giữ xuống dòng).
  2. "Cách thức thực hiện" — bảng: Hình thức nộp | Thời hạn giải quyết | Phí, lệ phí | Mô tả.
  3. "Thành phần hồ sơ" — bảng: Tên giấy tờ | Mẫu đơn, tờ khai | Số lượng (bản chính/bản sao). Có thể nhiều bảng theo trường hợp.
  4. "Căn cứ pháp lý" — bảng: Số ký hiệu | Trích yếu | Ngày ban hành | Cơ quan ban hành.
- **Cột phải (sidebar)**: khối "Cơ quan thực hiện", khối link cùng lĩnh vực (list thủ tục pilot khác), và **nút CTA "Nộp trực tuyến"** nền `brand`, chữ trắng, full-width → `/nop-truc-tuyen/<slug>`. (Trên site thật nút này đòi đăng nhập VNeID — deviation mục 6.)
- Mobile: sidebar tụt xuống dưới, bảng cuộn ngang trong container riêng.

### 3.5 Form nộp trực tuyến `/nop-truc-tuyen/<slug>` — QUAN TRỌNG NHẤT
Site thật giấu form sau đăng nhập VNeID nên KHÔNG có ảnh chụp; dựng lại từ mẫu tờ khai chính thức (mục 4) với khung nhìn đồng bộ portal (header/nav/footer như mọi trang, nền form trắng, viền `line`).

Cấu trúc chung cho cả 3 thủ tục — **wizard nhiều bước**, thanh bước ngang trên cùng (số tròn + label, bước active màu `brand`):

1. **Bước 1 — Thông tin chung**: chọn Tỉnh/Thành phố → Phường/Xã (2 select, mô hình hành chính 2 cấp — xem 4.0); cơ quan tiếp nhận suy ra theo thủ tục: khai sinh & GPXD → "UBND phường/xã <tên>", thường trú → "Công an phường/xã <tên>". Hiển thị thông tin người nộp (đọc từ fake user đăng nhập, mục 6) — họ tên, số định danh cá nhân, ngày sinh (readonly).
2. **Bước 2 — Tờ khai**: toàn bộ field theo mục 4 của thủ tục tương ứng, nhóm theo fieldset có legend. Controlled inputs; **chỉ validate trình duyệt native** (`required`, `type`, `maxlength`, `pattern` cho số định danh 12 số) — KHÔNG thêm logic kiểm tra chéo, KHÔNG thông báo lỗi tùy biến. Portal là form "câm" đúng như site thật.
3. **Bước 3 — Giấy tờ đính kèm**: list giấy tờ theo "Thành phần hồ sơ" của thủ tục, mỗi dòng nút "Chọn tệp" (input file, không upload thật — chỉ hiện tên file đã chọn) + checkbox "Bản sao điện tử".
4. **Bước 4 — Xem lại & Nộp**: render read-only toàn bộ giá trị đã nhập theo nhóm; checkbox cam kết "Tôi xin cam đoan những lời khai trên là đúng sự thật…" (required); nút "Nộp hồ sơ" nền `brand`.
- Điều hướng bước: nút "Quay lại" / "Tiếp tục"; state giữ trong React state (mất khi reload là chấp nhận được). Field `name`/`id` đặt tiếng Việt không dấu snake_case theo đúng tên trong mục 4 (vd `ho_ten_nguoi_duoc_khai_sinh`, `so_dinh_danh_ca_nhan_me`).

### 3.6 Xác nhận nộp `/nop-truc-tuyen/<slug>/hoan-thanh`
- Icon check tròn xanh lá, tiêu đề "Nộp hồ sơ thành công".
- Mã hồ sơ giả định dạng `DVC-<slug viết tắt>-<6 số>` (sinh ngẫu nhiên client), ngày giờ nộp, cơ quan tiếp nhận đã chọn.
- Ghi chú "Hồ sơ của bạn đã được chuyển đến cơ quan có thẩm quyền xử lý. Kết quả sẽ được thông báo qua Cổng." + nút "Về trang chủ" và "Nộp hồ sơ khác".

## 4. Field list 3 tờ khai (dựng lại từ mẫu chính thức hiện hành, đã kiểm chứng 07/2026)

### 4.0 Quy ước chung

- **Số định danh cá nhân / CCCD**: đúng 12 chữ số — `pattern="[0-9]{12}"`, `inputMode="numeric"`, `maxLength=12`.
- **Ngày**: `input type="date"`.
- **Địa chỉ hành chính 2 cấp** (mô hình từ 01/7/2025): Tỉnh/Thành phố (danh sách 34 tỉnh/thành sau sáp nhập — seed ~10 là đủ, có Hà Nội, TP. Hồ Chí Minh, Đà Nẵng, Huế…) → Phường/Xã (seed vài phường/xã mỗi tỉnh). **Không có cấp quận/huyện.**
- Select **Dân tộc**: Kinh, Tày, Thái, Mường, Khmer, Hoa, Nùng, H'Mông… (seed ~10). **Quốc tịch**: mặc định "Việt Nam".
- Label giữ NGUYÊN VĂN như in trên mẫu (kể cả số thứ tự "1.", "2." của CT01). Legend fieldset = tên section dưới đây.
- Req = `required` native. Field điều kiện phức tạp (chỉ bắt buộc khi thiếu ĐDCN…) → để optional, KHÔNG code logic điều kiện.

### 4.1 Tờ khai đăng ký khai sinh (mẫu theo Thông tư 04/2024/TT-BTP)

Fieldset theo thứ tự:

**Kính gửi**: select UBND phường/xã (từ bước 1 wizard, hiển thị lại readonly).

**A. Người yêu cầu**
| Label | Type | Req | Ghi chú |
|---|---|---|---|
| Họ, chữ đệm, tên người yêu cầu | text | ✔ | prefill từ fake user |
| Ngày, tháng, năm sinh | date | ✔ | |
| Giấy tờ tùy thân: loại | select | ✔ | CCCD / Số định danh cá nhân / Hộ chiếu |
| Giấy tờ tùy thân: số | text | ✔ | 12 số nếu CCCD/ĐDCN |
| Giấy tờ tùy thân: ngày cấp, cơ quan cấp | date + text | — | |
| Nơi cư trú | textarea | — | |
| Quan hệ với người được khai sinh | select | ✔ | cha / mẹ / ông / bà / người thân thích khác / tổ chức đang nuôi dưỡng |

**B. Người được khai sinh** (lead-in: "Đề nghị cơ quan đăng ký khai sinh cho người dưới đây:")
| Label | Type | Req | Ghi chú |
|---|---|---|---|
| Họ, chữ đệm, tên | text | ✔ | |
| Ngày, tháng, năm sinh | date | ✔ | |
| Ghi bằng chữ | text | ✔ | ngày sinh viết chữ, vd "Ngày mười lăm tháng ba năm hai nghìn hai mươi sáu" |
| Giới tính | select | ✔ | Nam / Nữ |
| Dân tộc | select | ✔ | |
| Quốc tịch | select | ✔ | default Việt Nam |
| Nơi sinh | textarea | ✔ | tên cơ sở y tế + địa chỉ, hoặc địa danh |
| Quê quán | text | ✔ | |

**C. Người mẹ** và **D. Người cha** (2 fieldset giống nhau; ghi chú dưới legend: "Ghi thông tin ít nhất của cha hoặc mẹ")
| Label | Type | Req | Ghi chú |
|---|---|---|---|
| Họ, chữ đệm, tên | text | — | |
| Năm sinh | date | — | |
| Dân tộc | select | — | |
| Quốc tịch | select | — | default Việt Nam |
| Nơi cư trú | textarea | — | |
| Giấy tờ tùy thân (số định danh cá nhân) | text | — | 12 số |

**E. Giấy chứng nhận kết hôn của cha, mẹ** (fieldset optional): Số (text) · Quyển số (text) · Đăng ký ngày (date) · Tại (text).

**F. Kết thúc**: Đề nghị cấp bản sao: radio Có/Không (✔) · Số lượng … bản (number, chỉ ý nghĩa khi Có, không cần ẩn/hiện) · Làm tại (text, prefill tên phường/xã) · Ngày (date, prefill hôm nay).

### 4.2 Tờ khai thay đổi thông tin cư trú — Mẫu CT01 (Thông tư 53/2025/TT-BCA, hiệu lực 01/7/2025) — dùng cho đăng ký thường trú

**Kính gửi**: select Công an phường/xã.

**Thông tin người kê khai** (field 1–6 của mẫu)
| Label (nguyên văn) | Type | Req | Ghi chú |
|---|---|---|---|
| 1. Họ, chữ đệm và tên khai sinh | text | ✔ | prefill fake user |
| 2. Ngày, tháng, năm sinh | date | ✔ | |
| 3. Giới tính | select | ✔ | Nam / Nữ |
| 4. Số định danh cá nhân | text 12 số | ✔ | UI: 12 ô rời hoặc 1 input pattern 12 số — chọn 1 input cho đơn giản |
| 5. Số điện thoại liên hệ | tel | — | |
| 6. Email | email | — | |

**Thông tin chủ hộ nơi chuyển đến** (field 7–9)
| Label | Type | Req | |
|---|---|---|---|
| 7. Họ, chữ đệm và tên chủ hộ | text | ✔ | |
| 8. Mối quan hệ với chủ hộ | select | ✔ | Chủ hộ / Vợ / Chồng / Con / Cha / Mẹ / Khác |
| 9. Số định danh cá nhân của chủ hộ | text 12 số | ✔ | |

**10. Nội dung đề nghị**: textarea ✔ — placeholder "Đăng ký thường trú tại: số nhà …, đường …, phường/xã …, tỉnh/TP …".

**11. Những thành viên trong hộ gia đình cùng thay đổi**: bảng động (nút "+ Thêm thành viên", xoá dòng): TT (auto) · Họ, chữ đệm và tên (text) · Ngày, tháng, năm sinh (date) · Giới tính (select) · Số định danh cá nhân (12 số) · Mối quan hệ với chủ hộ (text). Cả bảng optional.

**Ý kiến đồng ý** — 2 fieldset giống nhau: "Ý kiến của chủ hộ" và "Ý kiến của chủ sở hữu chỗ ở hợp pháp":
checkbox "Đã đồng ý" · Họ và tên (text) · Số định danh cá nhân (12 số). Tất cả optional (mẫu thật là ô ký tên/xác nhận VNeID — demo giả lập bằng checkbox).

### 4.3 Đơn đề nghị cấp giấy phép xây dựng — nhà ở riêng lẻ (Mẫu số 01, Phụ lục II, Nghị định 175/2024/NĐ-CP)

**Kính gửi**: select UBND phường/xã (từ 01/7/2025 UBND cấp xã cấp GPXD nhà ở riêng lẻ).

**1. Chủ đầu tư (Chủ hộ)**
| Label | Type | Req | |
|---|---|---|---|
| Tên chủ đầu tư (Chủ hộ) | text | ✔ | prefill fake user |
| Số định danh cá nhân | text 12 số | ✔ | |
| Người đại diện / Chức vụ | text ×2 | — | chỉ dùng cho tổ chức, để trống |
| Số điện thoại | tel | ✔ | |

**2. Địa điểm xây dựng**
| Label | Type | Req | |
|---|---|---|---|
| Lô đất số | text | ✔ | |
| Diện tích (m²) | number | ✔ | |
| Tại số nhà, đường/phố | text | ✔ | |
| Phường/xã | select | ✔ | |
| Tỉnh, thành phố | select | ✔ | 34 tỉnh/thành |

**3. Tổ chức/cá nhân lập, thẩm tra thiết kế xây dựng**
| Label | Type | Req | |
|---|---|---|---|
| Tên tổ chức/cá nhân lập thiết kế | text | ✔ | |
| Mã số chứng chỉ năng lực/hành nghề | text | — | |
| Chủ nhiệm, chủ trì thiết kế (tên + mã CCHN) | textarea | — | |
| Tên tổ chức/cá nhân thẩm tra thiết kế · mã CC · chủ trì thẩm tra | text + text + textarea | — | cả khối optional |

**4. Nội dung đề nghị cấp phép (nhà ở riêng lẻ)**
| Label | Type | Req | |
|---|---|---|---|
| Cấp công trình | select | ✔ | Cấp III / Cấp IV |
| Cốt xây dựng (m) | number | ✔ | |
| Khoảng lùi (m) | number | — | |
| Diện tích xây dựng tầng 1 (tầng trệt) (m²) | number | ✔ | |
| Tổng diện tích sàn (m²) | number | ✔ | kèm textarea "Diễn giải (tầng hầm, các tầng trên mặt đất, tầng lửng, tum)" optional |
| Chiều cao công trình (m) | number | ✔ | kèm textarea diễn giải optional |
| Số tầng | number | ✔ | kèm textarea diễn giải (số tầng hầm/nổi/lửng/tum) optional |

**5–6. Kết thúc**: Dự kiến thời gian hoàn thành công trình (… tháng, number ✔) · Tài liệu gửi kèm (textarea, prefill 2 dòng: "1 - Giấy tờ chứng minh quyền sử dụng đất; 2 - 02 bộ bản vẽ thiết kế xây dựng") · Làm tại + ngày (prefill).

## 5. Dữ liệu

- `src/data/thu-tuc/<slug>.json`: toàn bộ nội dung chi tiết thủ tục (mục 3.4) + danh sách giấy tờ (bước 3 form).
- `src/data/thu-tuc/index.json`: danh sách cho search/list (slug, tên, lĩnh vực, có trang chi tiết hay không).
- `src/data/form/<slug>.json`: schema hiển thị form (section → fields: name, label, type, required, options, pattern, placeholder) — form render data-driven từ file này.
- `src/data/co-quan.json`: vài tỉnh/thành + cơ quan tiếp nhận demo.

## 6. Deviations chủ ý (khác site thật — PHẢI có)

1. **Banner "MÔI TRƯỜNG DEMO"**: dải mảnh màu vàng `accent`, chữ `text-primary` đậm, cố định trên mọi trang (ngay trên footer hoặc dính đầu trang): "MÔI TRƯỜNG DEMO — Không phải Cổng Dịch vụ công quốc gia. Dữ liệu chỉ dùng minh hoạ.".
2. **Không auth thật**: nút "Đăng nhập" mở modal giả → bấm "Đăng nhập" là thành công ngay với user cố định: Nguyễn Văn A, số định danh 001099012345, ngày sinh 01/01/1999. Trạng thái lưu localStorage; khi đã đăng nhập, header hiện tên user thay nút. Vào `/nop-truc-tuyen/*` chưa đăng nhập → tự bật modal này.
3. **Không gửi dữ liệu đi đâu** — mọi thứ client-side.
4. Chỉ 3 thủ tục có trang chi tiết + form; thủ tục "vỏ" khác chỉ để list trông thật.
5. Asset tự vẽ (mục 7) — nhìn "giống", không cần giống từng pixel.

## 7. Asset tự vẽ

- `quoc-huy.svg`: đơn giản hoá — đĩa tròn đỏ `#DA251D`, viền bông lúa vàng cách điệu (2 cung đối xứng), sao vàng 5 cánh giữa, nửa bánh răng dưới. Mức chi tiết thấp là đủ (hiển thị 56–64px).
- `trong-dong.svg`: các vòng tròn đồng tâm + tia mặt trời giữa, 1 màu vàng đậm — dùng ở footer.
- Pattern hero: SVG tile hình học (vòng tròn/chữ S nối nhau) opacity ~8% trên nền cam.
- Icon danh mục/list: dùng bộ icon vẽ tay stroke 1.5px cùng style, hoặc lucide-react nếu muốn nhanh (được phép — icon generic không phải asset của portal).

## 8. Acceptance

- Hành trình đầy đủ, không lỗi console, desktop 1440 + mobile 390: Trang chủ → search "đăng ký khai sinh" → chi tiết → Nộp trực tuyến → (modal đăng nhập giả) → wizard 4 bước → xác nhận. Lặp lại được cho cả 3 thủ tục.
- `pnpm build` pass. Không fetch ra ngoài (trừ Google Fonts qua next/font lúc build).
- So màn hình với ảnh captures: khung, màu, bố cục phải nhận ra ngay là "cùng một trang web".
