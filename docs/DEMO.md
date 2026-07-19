# DEMO.md — Kịch bản demo + checklist test theo 3 thủ tục pilot

> Mục đích: một tài liệu vừa để **test bằng tay** (mỗi bước có "Kỳ vọng" — pass/fail rõ ràng), vừa để **demo** trọn năng lực widget. Khung 5 hồi tóm tắt: [WIDGET.md](WIDGET.md) §9. Chi tiết wire/thiết kế từng tính năng: [WIDGET.md](WIDGET.md), [ARCHITECTURE.md](ARCHITECTURE.md).

## 0. Chuẩn bị

- **URL demo**: https://opengov-vaic.vercel.app (clone cổng + widget đã nhúng). Backend: https://opengov.duckdns.org — kiểm tra `/health` trả `llm_available: true` trước khi demo (nếu `false` → chat degraded, phần validate vẫn chạy đủ).
- **Phiên theo tab**: mỗi tab trình duyệt là một phiên độc lập (sessionStorage). Muốn làm lại từ đầu: bấm nút **Cuộc mới** (góc panel) hoặc mở tab mới. Reload trang **không** mất hội thoại — transcript, card, tick checklist đều khôi phục (đây cũng là một điểm demo).
- **Toggle "Phase 2 preview"**: công tắc nhỏ trong dải banner MÔI TRƯỜNG DEMO, mặc định OFF, lưu theo trình duyệt. Chỉ bật khi demo kịch bản C3 (field-hint + nút kiểm tra gắn trong trang).
- **Wizard nộp trực tuyến** có 4 bước: *Thông tin chung → Tờ khai → Giấy tờ đính kèm → Xem lại & Nộp*. Mọi tính năng trên form (kiểm tra, điền giúp, spotlight) hoạt động ở bước 2 **Tờ khai**.
- Số liệu nhập demo dùng danh tính giả (Trần Văn B, 001099000111…) — không dùng thông tin thật.

## 1. Bảng năng lực widget (để soát đủ khi test)

Cột "Demo tại" trỏ tới kịch bản có bước tương ứng ở mục 2–3.

| # | Năng lực | Demo tại |
|---|---|---|
| 1 | Nhúng 1 thẻ script, 1 file bundle (~19KB gzip), Shadow DOM — không phá CSS trang chủ, không request ra ngoài backend | A0 (nói khi mở trang) |
| 2 | Bubble + panel chat; mobile: sheet toàn màn hình ở 375px | D5 |
| 3 | Chat SSE streaming, hiện trạng thái đang tra cứu công cụ | A1 |
| 4 | Trả lời có căn cứ trong KB 3 thủ tục pilot; **fail-closed** ngoài KB → nhận là không có dữ liệu + link Cổng DVC quốc gia | A1, D1 |
| 5 | Số liệu (phí, thời hạn, số lượng) chỉ nằm trong card, prose chỉ nói định tính | A3, B1, C1 |
| 6 | Gen-UI cards: `procedure` (+ CTA "Nộp trực tuyến tại cổng này"), `checklist` tất định lọc theo tình huống (+ tick chuẩn bị, + CTA "Bắt đầu điền hồ sơ"), `fees`, thời hạn/deadline, `legal_fragments` (thu gọn, mở được nguồn), `guide` (chỉ vị trí trên trang) | A2–A3, B1–B2, C1 |
| 7 | Quick-reply chips: chips tĩnh màn chào + chips động do model đề xuất (guided intake trắc nghiệm) | A1–A2, B1 |
| 8 | Ghi nhớ tình huống (case facts) có kiểm soát server: khóa lạ bị từ chối kèm gợi ý, giá trị enum tự snap; các lượt sau không hỏi lại mục đã có | A2, A5 (ngầm — nói khi thuyết trình) |
| 9 | Khôi phục phiên sau reload (transcript + card + tick + kết quả kiểm tra); 2 tab = 2 phiên; nút Cuộc mới | D4 |
| 10 | Detect trang form theo bước wizard: nút kiểm tra ẩn ngoài trang thủ tục → disabled kèm tooltip "Mở bước Tờ khai để kiểm tra" → enabled ở bước Tờ khai | A4 |
| 11 | **Kiểm tra hồ sơ**: engine rule tất định + llm_check (che PII trước khi gửi LLM), lỗi nhóm theo field, 3 mức error/warning/info, sửa xong "Kiểm tra lại" → hộp xanh kèm dòng phạm vi đã kiểm | A6, B3, C2 |
| 12 | **Overlay spotlight**: click một lỗi → cuộn tới field + phủ mờ cả trang, viền sáng đúng ô sai, tự phai; card guide có nút "👁 Chỉ vị trí trên trang" dùng cùng overlay | A6, B2 |
| 13 | Rule "thời sự" trong engine: sáp nhập tỉnh 01/7/2025 (`E_TINH_SAP_NHAP` gợi ý đúng tỉnh mới), địa chỉ 2 cấp bỏ huyện (`E_CAP_HUYEN`) | A6, B3 |
| 14 | Kiểm tra chéo field (`cross_field`): vốn góp từng loại ≤ tổng vốn | B3 |
| 15 | Kiểm tra bằng LLM có ngữ cảnh: số tiền bằng chữ khớp bằng số, tên doanh nghiệp không vi phạm Điều 38 | B3 |
| 16 | Rule nghiệp vụ gate theo tình huống phiên: checkbox "ý kiến chủ sở hữu" chỉ bắt buộc khi thuê/mượn/ở nhờ hoặc nhân thân (ERR-TT-06) | A6 |
| 17 | **Điền giúp tôi (prefill có xác nhận)**: preview duyệt từng dòng, ghi qua native setter (React nhận giá trị thật), viền accent ô đã điền, "Hoàn tác toàn bộ", ghi lại vào transcript | A5 |
| 18 | Resolver fact → option select: lời đời thường ("con đẻ") khớp đúng option ("Con"); mơ hồ thì bỏ qua, không đoán bừa | A5 |
| 19 | **Assisted-fill intake**: bấm Điền giúp tôi khi hội thoại chưa có gì → widget tự nhờ trợ lý, trợ lý hỏi **từng câu một** (kèm chips), một câu trả lời chứa nhiều thông tin thì ghi đủ một lần, đủ rồi mời bấm lại nút | A5 |
| 20 | Web components Pha 2: `<opengov-field-hint>` báo lỗi inline ngay dưới ô khi blur; `<opengov-check-button>` cạnh nút nộp, lỗi đổ vào hint hoặc mở panel | C3 |
| 21 | Chống chịu: backend không key → chat degraded + banner, validate vẫn chạy; đứt mạng → nút Thử lại; lỗi 422 hiện nguyên văn không retry | D2–D3 (dự phòng, local) |

## 2. Kịch bản A — Đăng ký thường trú (1.004222) · **luồng mạnh nhất, demo chính**

Thủ tục duy nhất có đủ **prefill + assisted-fill**; chạy trọn "hỏi → checklist → điền → kiểm tra → sửa" trong một mạch. Thời lượng ~6–8 phút.

**A0 — Mở màn.** Vào trang chủ demo, chỉ ra: giao diện cổng nguyên bản, chỉ thêm đúng 1 thẻ script (commit tích hợp 1 dòng); bubble trợ lý góc màn hình.

**A1 — Intake bằng chip.**

| Bước | Thao tác | Kỳ vọng |
|---|---|---|
| 1 | Mở panel, bấm chip tĩnh **"Tôi muốn đăng ký thường trú"** | Prose stream mượt; trợ lý hỏi làm rõ tình huống, **một câu hỏi**, kèm hàng chips trắc nghiệm (vd: thuộc sở hữu / nhân thân / thuê mượn ở nhờ) |
| 2 | Bấm 1 chip để trả lời (chọn "Có quan hệ nhân thân với chủ hộ") | Chip gửi đi như tin nhắn; chips cũ biến mất ở lượt mới |

**A2 — Checklist lọc theo tình huống.**

| Bước | Thao tác | Kỳ vọng |
|---|---|---|
| 3 | Trả lời tiếp 1–2 câu làm rõ (vd: không sống trên tàu thuyền) | Card **checklist** hiện: chỉ nhóm giấy tờ đúng trường hợp nhân thân (tờ khai CT01 + giấy tờ chứng minh quan hệ), các nhóm sở hữu/thuê mượn/tôn giáo… **không** hiện; mục chưa rõ tình huống đánh dấu "tùy trường hợp" |
| 4 | Tick vài mục "đã chuẩn bị" trong checklist | Tick giữ nguyên qua các lượt sau (và cả sau reload — xem D4) |

**A3 — Phí + trích nguồn.**

| Bước | Thao tác | Kỳ vọng |
|---|---|---|
| 5 | Hỏi: *"Lệ phí bao nhiêu, nộp online có rẻ hơn không?"* | Prose **không chứa con số**; card fees: online 10.000đ/lần vs trực tiếp 20.000đ/lần + diện miễn phí (TT 75/2022/TT-BTC); trích đoạn pháp lý thu gọn, bấm mở được đúng nguồn |

**A4 — Điều hướng vào form + detect.**

| Bước | Thao tác | Kỳ vọng |
|---|---|---|
| 6 | Hỏi *"nộp ở đâu?"* hoặc dùng CTA **"Nộp trực tuyến tại cổng này"** trên procedure card | Trợ lý hướng dẫn thao tác **tại cổng demo** (không đẩy sang dichvucong.gov.vn); CTA mở `/nop-truc-tuyen/dang-ky-thuong-tru` |
| 7 | Ở bước 1 *Thông tin chung*, nhìn hàng nút trong panel | Nút **✓ Kiểm tra hồ sơ** disabled, tooltip "Mở bước Tờ khai để kiểm tra" |
| 8 | Bấm **Tiếp tục** sang bước 2 *Tờ khai* | Nút kiểm tra enabled; xuất hiện thêm nút **📝 Điền giúp tôi** |

**A5 — Assisted-fill: hội thoại chưa có dữ liệu → hỏi từng bước → điền có xác nhận.** (Làm ở tab MỚI để chứng minh từ con số 0 — hoặc tiếp phiên A1–A4 thì trợ lý đã biết trường hợp, sẽ hỏi ít câu hơn.)

| Bước | Thao tác | Kỳ vọng |
|---|---|---|
| 9 | Bấm **📝 Điền giúp tôi** khi chưa kể gì với trợ lý | Widget **tự gửi hộ** tin nhắn "Điền giúp tôi tờ khai trên trang này (thủ tục 1.004222)…"; KHÔNG có thông báo cụt "chưa có thông tin"; trợ lý hỏi **đúng một câu** (kèm chips nếu là câu lựa chọn), không hỏi dồn |
| 10 | Trả lời gộp nhiều ý một câu: *"Tôi về ở với bố tên Trần Văn B, tôi là con đẻ, số định danh của bố là 001099000111"* | Trợ lý ghi nhận đủ cả 4 ý một lần (tên chủ hộ, quan hệ, số định danh chủ hộ, trường hợp nhân thân), không hỏi lại mục đã kể; không hỏi họ tên/số định danh của **chính người khai** (cổng tự điền từ tài khoản) |
| 11 | Khi trợ lý báo đủ và mời bấm nút → bấm lại **📝 Điền giúp tôi** | Preview "Điền từ hội thoại — anh/chị duyệt từng dòng": ~4 dòng (họ tên chủ hộ, quan hệ với chủ hộ, 2 ô số định danh chủ hộ), mỗi dòng có checkbox + giá trị + "từ hội thoại (tên fact)"; ô quan hệ là **select** — giá trị "con đẻ" đã tự khớp thành option **"Con"** |
| 12 | Bỏ tick 1 dòng, bấm **Điền giúp tôi** | Chỉ các dòng đang tick được ghi; ô được điền viền accent; transcript thêm lượt "Đã điền N trường…" |
| 13 | Bấm **Hoàn tác toàn bộ** | Giá trị cũ trở lại, viền accent gỡ hết. (Điền lại lần nữa để tiếp A6.) |

**A6 — Kiểm tra hồ sơ + spotlight (điểm nhấn).** Cài lỗi chủ đích vào bước Tờ khai:

- *Số định danh cá nhân*: nhập 11 số (vd `00109900011`).
- *Họ tên chủ hộ*: xóa trống (nếu vừa prefill thì xóa đi).
- *Nội dung đề nghị*: `Đăng ký thường trú tại thôn 3, huyện Vị Xuyên, tỉnh Hà Giang`.
- Checkbox *"Ý kiến của chủ sở hữu chỗ ở hợp pháp: Đã đồng ý"*: bỏ tick (phiên đã ghi trường hợp *nhân thân* ở A5 → rule gate kích hoạt).

| Bước | Thao tác | Kỳ vọng |
|---|---|---|
| 14 | Bấm **✓ Kiểm tra hồ sơ** | Kết quả nhóm theo field, đủ 3 loại phát hiện: `E_DINH_DANH_12` (phải đủ 12 số), `E_REQUIRED`, `E_TINH_SAP_NHAP` — "Hà Giang không còn là tỉnh hiện hành, từ 01/7/2025 đã sáp nhập vào **Tuyên Quang**", `E_CAP_HUYEN` (warning — bỏ cấp huyện, địa chỉ 2 cấp), `ERR-TT-06` (cần ý kiến đồng ý của chủ sở hữu) |
| 15 | **Click từng dòng lỗi** | Trang cuộn tới field, **overlay phủ mờ toàn trang + viền sáng đúng ô sai**, tự phai sau vài giây |
| 16 | Sửa hết lỗi theo gợi ý, tick lại checkbox, bấm **Kiểm tra lại** | Hộp xanh "không phát hiện lỗi" + dòng ghi rõ phạm vi đã kiểm tra |
| 17 | Đi tiếp bước 3 → 4 → **Nộp hồ sơ** | Wizard nhận đủ giá trị (kể cả ô do widget điền — chứng minh ghi vào React state thật), ra trang hoàn thành với mã hồ sơ |

## 3. Kịch bản B — Thành lập doanh nghiệp tư nhân (2.001610) · biến thể checklist + validate "khó"

Thế mạnh: checklist nhiều biến thể (4 loại đăng ký × 5 kiểu ủy quyền), form dài nhất với các rule không thủ tục nào khác có: kiểm tra chéo vốn, llm_check tiền bằng chữ và tên doanh nghiệp. ~4–5 phút.

**B1 — Intake biến thể.**

| Bước | Thao tác | Kỳ vọng |
|---|---|---|
| 1 | Chip tĩnh **"Phí thành lập doanh nghiệp tư nhân?"** | Card fees so sánh theo kênh: trực tuyến 100.000đ (miễn lệ phí 50.000đ) vs trực tiếp/bưu chính 150.000đ; prose không số |
| 2 | *"Tôi có hộ kinh doanh, muốn chuyển lên doanh nghiệp"* | Trợ lý hỏi làm rõ bằng chips (loại đăng ký / ai nộp hồ sơ); checklist ra đúng biến thể **chuyển đổi từ hộ kinh doanh** (thêm bản sao GCN hộ kinh doanh; miễn lệ phí lần đầu); kể thêm "tôi nhờ dịch vụ nộp hộ" → nhóm giấy tờ ủy quyền xuất hiện thêm |

**B2 — Guide + spotlight.**

| Bước | Thao tác | Kỳ vọng |
|---|---|---|
| 3 | Vào `/nop-truc-tuyen/dang-ky-thanh-lap-dntn` bước Tờ khai, hỏi: *"Mã ngành cấp 4 điền ở ô nào?"* | Card **guide** kèm nút **"👁 Chỉ vị trí trên trang"** → bấm → spotlight đúng ô mã ngành. (Nếu đang ở bước khác: card ghi chú kèm link mở trang biểu mẫu) |

**B3 — Validate đặc thù.** Cài lỗi: mã ngành 1 = `123` (3 số); *Vốn đầu tư bằng số* = `2000000000` nhưng *bằng chữ* = `Một tỷ đồng`; *Góp vốn bằng đồng VN* = `3000000000` (vượt tổng); *Tên doanh nghiệp* = `Doanh nghiệp tư nhân Công an Việt Nam`; *địa chỉ trụ sở* ghi `huyện Gia Lâm` + `tỉnh Hà Giang`; *ngày cấp hộ chiếu* = ngày tương lai.

| Bước | Thao tác | Kỳ vọng |
|---|---|---|
| 4 | **✓ Kiểm tra hồ sơ** | `ERR-DN-06` (mã ngành phải đúng cấp 4, chỉ dẫn tra cứu), `E_SO_CHU_LECH` (bằng chữ lệch bằng số — llm_check, PII đã che trước khi gửi LLM), `E_GOP_VON_VUOT_TONG` (cross-field), `ERR-DN-02` (tên DN dùng tên lực lượng vũ trang — llm_check), `E_TINH_SAP_NHAP` + `E_CAP_HUYEN`, `E_NGAY_TUONG_LAI` |
| 5 | Click lỗi bất kỳ → sửa → **Kiểm tra lại** | Spotlight đúng ô; hộp xanh khi sạch lỗi |

## 4. Kịch bản C — Đăng ký nội quy lao động (2.001955) · tư vấn "có phải làm không" + Pha 2

Thế mạnh: gate nghiệp vụ (dưới 10 lao động không bắt buộc đăng ký), thời hạn 2 chiều, miễn phí, và là kịch bản gọn nhất để demo **Phase 2 preview**. ~3–4 phút.

**C1 — Tư vấn đúng luật.**

| Bước | Thao tác | Kỳ vọng |
|---|---|---|
| 1 | *"Công ty tôi có 8 người, có phải đăng ký nội quy lao động không?"* | Trợ lý trả lời **không bắt buộc** (căn cứ Điều 118/119 BLLĐ 2019), kèm trích đoạn pháp lý mở được nguồn — không bịa nghĩa vụ |
| 2 | *"Vậy nếu 25 người thì cần gì, bao lâu, tốn bao nhiêu?"* | Checklist gồm nội quy + văn bản đề nghị, mục văn bản góp ý công đoàn/văn bản kỷ luật riêng chỉ hiện khi kể là có (hoặc gắn "tùy trường hợp"); card thời hạn: nộp trong 10 ngày từ ngày ban hành, hiệu lực sau 15 ngày; card phí: miễn phí mọi kênh |

**C2 — Validate mức info.** Vào `/nop-truc-tuyen/dang-ky-noi-quy-lao-dong` bước Tờ khai; nhập *Tổng số lao động* = `8`, *Mã số doanh nghiệp* = 9 số, *Ngày ban hành nội quy* = ngày tương lai.

| Bước | Thao tác | Kỳ vọng |
|---|---|---|
| 3 | **✓ Kiểm tra hồ sơ** | `ERR-NQ-01` mức **info** (chỉ bắt buộc từ 10 NLĐ — tư vấn, không chặn), `E_MST_10`, `E_NGAY_TUONG_LAI` — thấy đủ 3 mức độ error/info (warning đã thấy ở A/B) |

**C3 — Phase 2 preview (web components trong trang).** Bật toggle **Phase 2 preview** ở banner demo, reload trang Tờ khai.

| Bước | Thao tác | Kỳ vọng |
|---|---|---|
| 4 | Nhập mã số doanh nghiệp 9 số rồi **blur** (click ra ngoài) | Lỗi đỏ inline hiện **ngay dưới ô** (không cần mở panel); sửa đủ 10 số, blur lại → lỗi biến mất |
| 5 | Bấm nút **Kiểm tra hồ sơ** do cổng gắn cạnh "Tiếp tục" | Lỗi đổ vào từng field-hint tương ứng; lỗi không có hint (hoặc tắt hint) → panel trợ lý tự mở hiện kết quả |
| 6 | Tắt toggle, reload | Trang không còn bất kỳ element `opengov-*` nào — về đúng Pha 1 |

## 5. Kịch bản D — xuyên suốt & dự phòng

| # | Thao tác | Kỳ vọng |
|---|---|---|
| D1 | Hỏi ngoài KB: *"Thủ tục nhận nuôi con nuôi cần giấy tờ gì?"* | Trợ lý nói thẳng không có trong dữ liệu, đưa link Cổng DVC quốc gia — **không bịa**. Tương tự, 2 thủ tục ngoài pilot trên clone (khai sinh, giấy phép xây dựng) chỉ có link cổng thật, nút kiểm tra không hiện |
| D2 | (Local, dự phòng khi LLM sập) Chạy backend không có API key | Chat trả thông báo degraded + banner; **✓ Kiểm tra hồ sơ vẫn chạy đủ** — engine validate không phụ thuộc LLM |
| D3 | Tắt mạng giữa lượt chat (DevTools offline) | Bubble lỗi + nút **Thử lại** hoạt động khi có mạng lại |
| D4 | Sau kịch bản A: reload trang; mở thêm tab mới | Tab cũ: transcript + card + tick + kết quả kiểm tra khôi phục nguyên vẹn. Tab mới: phiên trắng độc lập. Nút **Cuộc mới** → về màn chào, phiên mới |
| D5 | Thu viewport 375px (hoặc điện thoại thật) | Panel thành sheet toàn màn hình, thu nhỏ được; click lỗi tự thu sheet rồi cuộn tới field |

## 6. Điểm nói thêm khi thuyết trình (kỹ thuật "vô hình", không có bước bấm)

- **Chi phí tích hợp**: toàn bộ widget vào cổng bằng **1 dòng script** (commit `5a8d40f`); Pha 2 web components là commit tích hợp riêng, default OFF.
- **Chống bịa số liệu**: mọi con số đi qua card lấy thẳng từ dữ liệu đã review (có `source_quote`/`source_component_code` truy vết về dichvucong.gov.vn + văn bản pháp luật); guard chặn số lạ trong prose.
- **Ghi nhớ tình huống có kiểm soát**: fact do model ghi bị server đối chiếu schema — khóa lạ từ chối kèm gợi ý, enum snap về giá trị đúng; kèm guard tất định bắt trường hợp model "nói đã ghi nhận" mà không gọi công cụ (đã bắt được 2 lần khi thử live).
- **An toàn thao tác ghi**: widget không bao giờ tự điền/tự nộp — mọi ghi vào form đều qua preview duyệt từng dòng, có hoàn tác, có ghi vết trong phiên; giá trị mơ hồ với ô select thì bỏ qua chứ không đoán.
- **PII**: llm_check che số định danh/thông tin cá nhân trước khi gửi LLM.
- **Chống chịu**: không key vẫn chạy validate; hỏng detect thì widget tự ẩn tính năng liên quan, không vỡ trang.
