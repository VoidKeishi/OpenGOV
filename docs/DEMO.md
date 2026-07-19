# DEMO.md — Kịch bản demo + checklist test theo 3 thủ tục pilot

> Tài liệu này kể demo theo **trải nghiệm của người dân dùng cổng**, không theo thuật ngữ kỹ thuật — vừa là kịch bản thuyết trình, vừa là checklist test bằng tay (cột "Điều phải thấy" là điều kiện pass/fail). Chi tiết kỹ thuật của từng tính năng: [WIDGET.md](WIDGET.md), [ARCHITECTURE.md](ARCHITECTURE.md). Mã lỗi trong ngoặc chỉ dành cho người test đối chiếu — trên màn hình người dùng chỉ thấy lời nhắc dễ hiểu.

## Câu chuyện mà demo đang kể

Làm thủ tục hành chính lần đầu, người dân thường vấp đúng ba chỗ: **không biết hoàn cảnh của mình cần đúng những giấy tờ gì** (đọc danh mục chung thì mục nào cũng "tùy trường hợp"); **điền tờ khai sai những lỗi rất nhỏ** — thiếu một chữ số, ghi tên tỉnh đã sáp nhập — rồi bị trả hồ sơ sau nhiều ngày chờ; và **không có ai để hỏi** ngoài giờ hành chính. Trợ lý OpenGOV muốn đóng vai một cán bộ một cửa tận tình trực 24/7 ngay trên cổng: hỏi chuyện để hiểu hoàn cảnh, đưa đúng danh sách giấy tờ của riêng người đó, điền hộ nhưng luôn xin phép, và soát kỹ tờ khai **trước khi nộp** — để không ai phải đi lại lần hai.

Nền tảng phía sau, nói gọn một câu khi thuyết trình: một trợ lý AI hội thoại **chỉ được phép trả lời từ kho dữ liệu thủ tục đã qua người kiểm duyệt** (thu thập từ dichvucong.gov.vn và văn bản pháp luật, từng con số truy vết được về nguồn), cộng một **bộ soát lỗi tự động chạy ngay trên trang, không phụ thuộc AI**, đóng gói thành một mảnh ghép mà cổng chỉ cần thêm đúng 1 dòng mã. Ba thủ tục thí điểm: đăng ký thường trú, thành lập doanh nghiệp tư nhân, đăng ký nội quy lao động.

## 0. Chuẩn bị

- **Trang demo**: https://opengov-vaic.vercel.app — cổng dịch vụ công (bản demo) đã có sẵn trợ lý. Trước khi demo, mở https://opengov.duckdns.org/health và kiểm tra `llm_available: true` (nếu `false`: trợ lý chỉ nhắn tin báo bận, riêng phần kiểm tra hồ sơ vẫn hoạt động bình thường).
- **Mỗi tab trình duyệt là một cuộc trò chuyện riêng.** Muốn làm lại từ đầu: bấm nút **Cuộc mới** trong cửa sổ trợ lý, hoặc mở tab mới. Đóng trang mở lại **không mất** cuộc trò chuyện — đây cũng là một điểm để khoe (D4).
- **Công tắc "Phase 2 preview"** nằm trong dải banner MÔI TRƯỜNG DEMO, mặc định tắt. Chỉ bật khi demo kịch bản C3 (trợ giúp gắn thẳng vào trang tờ khai).
- Mẫu nộp trực tuyến đi qua 4 bước: *Thông tin chung → Tờ khai → Giấy tờ đính kèm → Xem lại & Nộp*. Mọi trợ giúp trên biểu mẫu (kiểm tra, điền giúp, chỉ chỗ) diễn ra ở bước 2 **Tờ khai**.
- Toàn bộ thông tin nhập demo là danh tính giả (Trần Văn B, 001099000111…) — không dùng thông tin thật.

## 1. Người dùng nhận được gì — bảng soát đủ khi test

Cột "Xem tại" trỏ tới bước demo tương ứng ở mục 2–5.

| # | Trải nghiệm | Xem tại |
|---|---|---|
| 1 | Không phải cài đặt gì: trợ lý có sẵn ngay trên cổng (phía cổng chỉ thêm đúng 1 dòng mã), giao diện cổng không đổi | A0 |
| 2 | Dùng được trên điện thoại: cửa sổ trợ lý mở thành màn hình riêng, thu gọn được | D5 |
| 3 | Trợ lý trả lời hiện chữ dần như người đang gõ, kèm dòng trạng thái "đang tra cứu" — không phải chờ màn hình trắng | A1 |
| 4 | Chỉ nói điều có trong dữ liệu chính thống; điều không biết thì **nói thẳng là không có** và chỉ đường sang Cổng DVC quốc gia — không bịa | A1, D1 |
| 5 | Mọi con số (lệ phí, thời hạn, số bản giấy tờ) nằm trong **thẻ thông tin** riêng, kèm đường dẫn mở được văn bản gốc để tự đối chiếu | A3, B1, C1 |
| 6 | Các thẻ thông tin: tóm tắt thủ tục (kèm nút "Nộp trực tuyến tại cổng này"), danh sách giấy tờ **đúng hoàn cảnh của mình** (tick đánh dấu đã chuẩn bị), lệ phí, thời hạn, trích dẫn luật, chỉ chỗ trên trang | A2–A3, B1–B2, C1 |
| 7 | Câu hỏi dạng lựa chọn có **nút bấm sẵn** — chạm một cái là trả lời, không phải gõ | A1–A2, B1 |
| 8 | Trợ lý **nhớ hoàn cảnh đã kể** (ở với ai, thuê hay nhà mình…) và không hỏi lại điều đã biết | A2, A5 |
| 9 | Đóng trang mở lại: cuộc trò chuyện, thẻ, tick còn nguyên; mỗi tab một cuộc riêng; bấm Cuộc mới là làm lại từ đầu | D4 |
| 10 | Nút **✓ Kiểm tra hồ sơ** tự biết mình đang ở đâu: không hiện khi lướt trang thường, mờ kèm nhắc "Mở bước Tờ khai để kiểm tra" khi chưa tới nơi, sáng lên khi vào đúng trang tờ khai | A4 |
| 11 | Kiểm tra xong chỉ **từng ô sai, lý do, cách sửa bằng lời dễ hiểu**; phân biệt rõ lỗi phải sửa — điều nên lưu ý — thông tin thêm | A6, B3, C2 |
| 12 | Bấm vào một lỗi: trang tự cuộn tới, **cả màn hình tối lại, chỉ ô sai sáng lên** vài giây — không phải tự dò | A6, B2 |
| 13 | Biết cả quy định mới nhất: tỉnh đã sáp nhập từ 01/7/2025 → nhắc đúng tên tỉnh mới; địa chỉ nay chỉ còn 2 cấp → nhắc bỏ cấp huyện | A6, B3 |
| 14 | Phát hiện các ô "đá nhau": vốn góp từng khoản cộng lại vượt tổng vốn đã khai | B3 |
| 15 | Hiểu cả ngữ nghĩa chứ không chỉ định dạng: số tiền bằng chữ không khớp bằng số, tên doanh nghiệp phạm điều cấm của luật | B3 |
| 16 | Chỉ đòi thứ thật sự cần theo hoàn cảnh: ví dụ ô "ý kiến chủ sở hữu chỗ ở" chỉ bắt buộc khi về ở nhờ nhà người khác | A6 |
| 17 | **"Điền giúp tôi"**: trước khi ghi chữ nào vào biểu mẫu đều cho xem trước từng dòng để tự duyệt, điền xong ô nào viền sáng ô đó, đổi ý có **Hoàn tác toàn bộ** — trợ lý không bao giờ tự ý điền hay tự nộp | A5 |
| 18 | Nói sao hiểu vậy: kể "con đẻ" → ô chọn tự về đúng mục "Con"; nếu lời kể mơ hồ, trợ lý để trống cho mình tự chọn chứ không đoán bừa | A5 |
| 19 | Chưa kể gì mà đã bấm Điền giúp tôi? Trợ lý **chủ động hỏi từng câu một** (có nút chọn sẵn), gom đủ thông tin rồi mời bấm lại — không hỏi dồn một tràng | A5 |
| 20 | (Bản xem trước Pha 2) Lỗi hiện **ngay dưới ô** vừa rời khỏi, và có nút kiểm tra ngay cạnh nút Nộp — không cần mở cửa sổ chat | C3 |
| 21 | Gặp sự cố vẫn không kẹt: mất mạng có nút Thử lại; hệ thống AI bận thì phần kiểm tra hồ sơ vẫn chạy bình thường | D2–D3 |

## 2. Kịch bản A — Đăng ký thường trú · **demo chính, ~6–8 phút**

*Nhân vật: một người vừa chuyển về quê sống cùng bố, lần đầu tự chuyển hộ khẩu. Nỗi lo rất thật: không biết cần giấy gì, sợ điền sai lại phải xin nghỉ làm đi lại lần nữa. Hồi này đi trọn hành trình: từ một câu hỏi bâng quơ đến bộ hồ sơ sạch lỗi được nộp xong.*

**A0 — Mở màn.** Vào trang chủ demo: đây là cổng dịch vụ công quen thuộc, không có gì thay đổi — chỉ thêm bong bóng trợ lý ở góc màn hình. (Nói: phía cổng chỉ phải thêm đúng 1 dòng mã.)

**A1 — Hỏi bâng quơ cũng được việc.**

| Bước | Làm gì | Điều phải thấy |
|---|---|---|
| 1 | Mở trợ lý, bấm nút gợi ý sẵn **"Tôi muốn đăng ký thường trú"** | Trợ lý trả lời trôi chảy, rồi hỏi lại **đúng một câu** để hiểu hoàn cảnh, kèm các nút chọn sẵn (nhà của mình / về ở với người thân / thuê, mượn, ở nhờ) |
| 2 | Chạm nút "Có quan hệ nhân thân với chủ hộ" | Câu trả lời được gửi đi như tin nhắn mình gõ; sang lượt mới các nút cũ tự biến mất |

**A2 — Danh sách giấy tờ đúng hoàn cảnh của MÌNH.**

| Bước | Làm gì | Điều phải thấy |
|---|---|---|
| 3 | Trả lời nốt 1–2 câu trợ lý hỏi thêm | Thẻ **danh sách giấy tờ** hiện ra: chỉ những thứ đúng trường hợp về ở với người thân (tờ khai CT01 + giấy tờ chứng minh quan hệ) — **không** bắt đọc cả rừng giấy tờ của các trường hợp khác; mục nào còn tùy hoàn cảnh thì ghi rõ "tùy trường hợp" |
| 4 | Tick vài mục "đã chuẩn bị xong" | Tick được lưu — lát nữa quay lại vẫn còn (xem D4) |

**A3 — Hỏi tiền nong, nhận số liệu có nguồn.**

| Bước | Làm gì | Điều phải thấy |
|---|---|---|
| 5 | Hỏi: *"Lệ phí bao nhiêu, nộp online có rẻ hơn không?"* | Lời trợ lý chỉ giải thích; **con số nằm trong thẻ riêng**: nộp online 10.000đ/lần — rẻ hơn nộp trực tiếp 20.000đ/lần, kèm các diện được miễn; bên dưới có trích dẫn quy định, bấm mở được văn bản gốc |

**A4 — Trợ lý biết mình đang đứng ở trang nào.**

| Bước | Làm gì | Điều phải thấy |
|---|---|---|
| 6 | Hỏi *"nộp ở đâu?"* hoặc bấm nút **"Nộp trực tuyến tại cổng này"** trên thẻ thủ tục | Trợ lý hướng dẫn nộp **ngay tại cổng đang mở** (không đẩy sang trang khác); nút đưa thẳng tới trang nộp trực tuyến |
| 7 | Đang ở bước 1 *Thông tin chung*, nhìn nút **✓ Kiểm tra hồ sơ** | Nút đang mờ, di chuột thấy nhắc "Mở bước Tờ khai để kiểm tra" |
| 8 | Bấm **Tiếp tục** sang bước 2 *Tờ khai* | Nút kiểm tra sáng lên; xuất hiện thêm nút **📝 Điền giúp tôi** |

**A5 — Chưa kể gì cũng nhờ điền được: trợ lý hỏi từng câu, điền phải được duyệt.** (Làm ở tab MỚI để cho thấy bắt đầu từ con số 0 — nếu tiếp phiên cũ, trợ lý đã biết hoàn cảnh nên sẽ hỏi ít câu hơn.)

| Bước | Làm gì | Điều phải thấy |
|---|---|---|
| 9 | Bấm **📝 Điền giúp tôi** khi chưa trò chuyện gì | Trợ lý không báo cụt lủn "chưa có thông tin" — thay vào đó tự bắt chuyện và hỏi **từng câu một** (có nút chọn khi là câu lựa chọn), tuyệt đối không hỏi dồn chục mục một lượt |
| 10 | Kể tự nhiên, gộp nhiều ý: *"Tôi về ở với bố tên Trần Văn B, tôi là con đẻ, số định danh của bố là 001099000111"* | Trợ lý ghi nhận đủ cả 4 ý trong một lần, không bắt nhắc lại; và **không hỏi** họ tên hay số định danh của chính mình — cổng đã tự điền từ tài khoản đăng nhập |
| 11 | Trợ lý báo đã đủ và mời bấm nút → bấm lại **📝 Điền giúp tôi** | Bảng xem trước "duyệt từng dòng trước khi ghi": ~4 dòng (tên chủ hộ, quan hệ, 2 ô số định danh chủ hộ), mỗi dòng ghi rõ giá trị + lấy từ đâu; ô "quan hệ với chủ hộ" là ô chọn — lời kể "con đẻ" đã tự về đúng mục **"Con"** |
| 12 | Bỏ chọn 1 dòng rồi bấm **Điền giúp tôi** | Chỉ những dòng mình duyệt mới được ghi vào mẫu; ô nào vừa điền viền sáng ô đó; trong hội thoại có dòng ghi lại "Đã điền N trường…" |
| 13 | Bấm **Hoàn tác toàn bộ** | Mọi ô trở về như cũ, viền sáng biến mất. (Điền lại lần nữa để làm tiếp A6.) |

**A6 — Kiểm tra hồ sơ + chỉ tận ô sai (điểm nhấn của cả buổi).** Cố tình điền sai ở bước Tờ khai:

- *Số định danh cá nhân*: gõ thiếu, chỉ 11 số (vd `00109900011`).
- *Họ tên chủ hộ*: xóa trống.
- *Nội dung đề nghị*: `Đăng ký thường trú tại thôn 3, huyện Vị Xuyên, tỉnh Hà Giang` (địa chỉ kiểu cũ).
- Ô *"Ý kiến của chủ sở hữu chỗ ở hợp pháp: Đã đồng ý"*: bỏ tick.

| Bước | Làm gì | Điều phải thấy |
|---|---|---|
| 14 | Bấm **✓ Kiểm tra hồ sơ** | Danh sách chỉ đích danh từng ô kèm cách sửa: số định danh phải đủ 12 số (E_DINH_DANH_12); họ tên chủ hộ đang bỏ trống (E_REQUIRED); **"Hà Giang không còn là tỉnh hiện hành — từ 01/7/2025 đã sáp nhập vào Tuyên Quang, vui lòng ghi Tuyên Quang"** (E_TINH_SAP_NHAP); lưu ý bỏ cấp huyện vì địa chỉ nay chỉ còn 2 cấp (E_CAP_HUYEN); và vì mình về **ở nhờ nhà bố** nên phải có ý kiến đồng ý của chủ sở hữu (ERR-TT-06) — đúng hoàn cảnh đã kể ở A5 |
| 15 | **Bấm vào từng dòng lỗi** | Trang tự cuộn tới nơi, **cả màn hình tối lại, đúng ô sai sáng lên** rồi tự trở lại bình thường — người không rành máy tính cũng tìm ra chỗ sửa |
| 16 | Sửa hết theo gợi ý, tick lại ô đồng ý, bấm **Kiểm tra lại** | Hộp xanh "không phát hiện lỗi", kèm ghi rõ đã kiểm tra những gì |
| 17 | Đi tiếp bước 3 → 4 → **Nộp hồ sơ** | Cổng nhận đủ mọi giá trị — kể cả các ô do trợ lý điền hộ — và ra trang hoàn thành với mã hồ sơ |

**Câu chốt hồi A**: từ "không biết bắt đầu từ đâu" đến hồ sơ nộp xong không một lỗi — trong một cuộc trò chuyện, không phải đọc trang hướng dẫn nào, và không có lần đi lại thứ hai.

## 3. Kịch bản B — Thành lập doanh nghiệp tư nhân · giấy tờ theo từng cảnh ngộ + soát lỗi "khó" (~4–5 phút)

*Nhân vật: chủ một hộ kinh doanh muốn "lên đời" thành doanh nghiệp, định nhờ dịch vụ nộp hộ. Cái khó của thủ tục này: mỗi cảnh ngộ một bộ giấy tờ khác nhau, và tờ khai doanh nghiệp dài với những lỗi mắt thường soát rất lâu mới thấy.*

**B1 — Mỗi cảnh ngộ một bộ giấy tờ khác nhau.**

| Bước | Làm gì | Điều phải thấy |
|---|---|---|
| 1 | Bấm nút gợi ý **"Phí thành lập doanh nghiệp tư nhân?"** | Thẻ lệ phí so sánh rõ: nộp trực tuyến 100.000đ (được miễn khoản lệ phí 50.000đ) — nộp trực tiếp/bưu điện 150.000đ |
| 2 | Kể: *"Tôi có hộ kinh doanh, muốn chuyển lên doanh nghiệp"*; trợ lý hỏi thì trả lời tiếp *"tôi nhờ dịch vụ nộp hộ"* | Trợ lý hỏi bằng nút chọn sẵn; danh sách giấy tờ ra đúng cảnh **chuyển đổi từ hộ kinh doanh** (thêm bản sao giấy đăng ký hộ kinh doanh, được miễn lệ phí lần đầu); vừa kể nhờ nộp hộ → danh sách **tự bổ sung** phần giấy ủy quyền |

**B2 — Hỏi "điền ở ô nào" là được chỉ tận nơi.**

| Bước | Làm gì | Điều phải thấy |
|---|---|---|
| 3 | Vào trang nộp trực tuyến của thủ tục, tới bước Tờ khai, hỏi: *"Mã ngành cấp 4 điền ở ô nào?"* | Thẻ hướng dẫn kèm nút **"👁 Chỉ vị trí trên trang"** → bấm → màn hình tối lại, đúng ô mã ngành sáng lên. (Nếu đang ở bước khác: thẻ ghi chú vị trí kèm đường dẫn mở trang tờ khai) |

**B3 — Những lỗi mắt thường khó soát.** Cố tình điền: mã ngành 1 = `123` (thiếu 1 số); *Vốn đầu tư bằng số* = `2000000000` nhưng *bằng chữ* ghi `Một tỷ đồng`; *Góp vốn bằng đồng VN* = `3000000000`; *Tên doanh nghiệp* = `Doanh nghiệp tư nhân Công an Việt Nam`; địa chỉ trụ sở ghi `huyện Gia Lâm` + `tỉnh Hà Giang`; *ngày cấp hộ chiếu* là một ngày tương lai.

| Bước | Làm gì | Điều phải thấy |
|---|---|---|
| 4 | Bấm **✓ Kiểm tra hồ sơ** | Bắt được cả những lỗi người thường dễ bỏ qua: mã ngành phải đúng 4 số kèm chỗ tra cứu (ERR-DN-06); **số tiền bằng chữ không khớp bằng số** (E_SO_CHU_LECH); **các khoản vốn góp cộng lại vượt tổng vốn** (E_GOP_VON_VUOT_TONG); **tên doanh nghiệp không được dùng tên lực lượng vũ trang** (ERR-DN-02); tỉnh cũ đã sáp nhập + thừa cấp huyện; ngày cấp không thể ở tương lai (E_NGAY_TUONG_LAI) |
| 5 | Bấm một lỗi → sửa dần → **Kiểm tra lại** | Mỗi lần bấm đều được cuộn tới + ô sai sáng lên; sạch lỗi thì ra hộp xanh |

**Câu chốt hồi B**: những lỗi mà chính cán bộ tiếp nhận cũng phải dò lâu — tiền bằng chữ lệch bằng số, vốn góp vượt tổng vốn, tên doanh nghiệp phạm điều cấm — được bắt trong một cú bấm, trước khi hồ sơ rời khỏi tay người nộp.

## 4. Kịch bản C — Đăng ký nội quy lao động · biết cả khi nào KHÔNG phải làm + bản xem trước Pha 2 (~3–4 phút)

*Nhân vật: chủ doanh nghiệp nhỏ 8 nhân viên, nghe đồn "phải đăng ký nội quy lao động không thì bị phạt" nhưng không chắc — và không muốn mất một buổi đi hỏi.*

**C1 — Đỡ được một thủ tục không cần làm.**

| Bước | Làm gì | Điều phải thấy |
|---|---|---|
| 1 | Hỏi: *"Công ty tôi có 8 người, có phải đăng ký nội quy lao động không?"* | Trợ lý trả lời **không bắt buộc** — quy định chỉ áp dụng từ 10 lao động trở lên — kèm trích dẫn mở được văn bản gốc; không vẽ thêm việc |
| 2 | Hỏi tiếp: *"Vậy nếu 25 người thì cần gì, bao lâu, tốn bao nhiêu?"* | Danh sách giấy tờ đúng cảnh (văn bản góp ý công đoàn chỉ hiện khi kể là có công đoàn); thẻ thời hạn: nộp trong 10 ngày từ ngày ban hành, nội quy có hiệu lực sau 15 ngày; thẻ phí: **miễn phí** mọi hình thức nộp |

**C2 — Lời nhắc đúng mức: có thứ là lỗi, có thứ chỉ là lưu ý.** Vào trang nộp trực tuyến của thủ tục, bước Tờ khai; điền *Tổng số lao động* = `8`, *Mã số doanh nghiệp* chỉ 9 số, *Ngày ban hành nội quy* là ngày tương lai.

| Bước | Làm gì | Điều phải thấy |
|---|---|---|
| 3 | Bấm **✓ Kiểm tra hồ sơ** | Mã số doanh nghiệp phải đủ 10 số và ngày ban hành không thể ở tương lai là **lỗi phải sửa**; riêng "8 lao động" là dòng **thông tin** nhẹ nhàng: dưới 10 người thì không bắt buộc đăng ký (ERR-NQ-01) — nhắc nhở đúng mức, không dọa nạt |

**C3 — Bản xem trước Pha 2: trợ giúp nằm ngay trong trang tờ khai.** Bật công tắc **Phase 2 preview** ở banner demo, tải lại trang Tờ khai.

| Bước | Làm gì | Điều phải thấy |
|---|---|---|
| 4 | Gõ mã số doanh nghiệp 9 số rồi bấm sang ô khác | Lời nhắc đỏ hiện **ngay dưới ô vừa rời** — không cần mở cửa sổ trợ lý; sửa đủ 10 số, rời ô → lời nhắc tự biến mất |
| 5 | Bấm nút **Kiểm tra hồ sơ** nằm cạnh nút "Tiếp tục" của cổng | Lỗi đổ về ngay dưới từng ô tương ứng; lỗi nào không gắn được dưới ô thì cửa sổ trợ lý tự mở hiện kết quả |
| 6 | Tắt công tắc, tải lại trang | Trang trở về nguyên trạng, không còn dấu vết trợ giúp gắn trong trang |

**Câu chốt hồi C**: trợ lý tốt không chỉ giúp làm thủ tục — còn cho biết khi nào **không cần** làm, đỡ hẳn một buổi đi hỏi.

## 5. Kịch bản D — các tình huống "đời thường" khác

| # | Làm gì | Điều phải thấy |
|---|---|---|
| D1 | Hỏi ngoài phạm vi: *"Thủ tục nhận nuôi con nuôi cần giấy tờ gì?"* | Trợ lý nói thẳng chưa có dữ liệu về thủ tục này và đưa đường dẫn Cổng DVC quốc gia — **thà nhận không biết chứ không bịa**. Hai thủ tục ngoài phạm vi thí điểm trên cổng demo (khai sinh, giấy phép xây dựng) cũng chỉ có đường dẫn cổng thật, nút kiểm tra không hiện |
| D2 | (Chạy tại chỗ, dùng khi hệ thống AI gặp sự cố) Backend không có khóa AI | Trợ lý nhắn đang gián đoạn + dải thông báo; riêng **✓ Kiểm tra hồ sơ vẫn chạy đầy đủ** — phần soát lỗi không phụ thuộc AI |
| D3 | Ngắt mạng giữa chừng một câu hỏi | Thông báo lỗi kèm nút **Thử lại**; có mạng lại là bấm chạy tiếp |
| D4 | Sau kịch bản A: tải lại trang; mở thêm tab mới | Tab cũ: cuộc trò chuyện, thẻ, tick, kết quả kiểm tra còn nguyên. Tab mới: cuộc trắng tinh, độc lập. Nút **Cuộc mới** → về màn chào |
| D5 | Thu màn hình về 375px (hoặc mở bằng điện thoại) | Trợ lý mở thành màn hình riêng, thu gọn được; bấm vào lỗi thì tự thu gọn rồi cuộn tới ô sai |

## 6. Điểm khác biệt công nghệ — kể theo mục tiêu (dùng khi thuyết trình, khán giả không nhìn thấy trực tiếp)

Mỗi ý nói theo cùng một khung: **vì người dùng cần gì → nền tảng phía sau làm gì** (một câu, không đi sâu).

- **Để cổng nào cũng đưa trợ lý lên được ngay trong ngày** → toàn bộ trợ lý là một mảnh ghép độc lập, tự chứa: cổng demo tích hợp bằng đúng 1 dòng mã (commit `5a8d40f`), không sửa gì thêm; phần trợ giúp gắn sâu trong trang (Pha 2) cũng chỉ là một công tắc bật/tắt.
- **Để người dân không bao giờ nhận thông tin bịa** — với thủ tục hành chính, một con số sai là một lần đi lại → AI không được tự nói theo trí nhớ của nó: chỉ được trả lời từ kho dữ liệu đã qua người kiểm duyệt, từng con số truy vết được về dichvucong.gov.vn và văn bản pháp luật; con số buộc phải nằm trong thẻ có dẫn nguồn, và có lớp chặn tự động không cho số lạ lọt vào lời trợ lý. Điều nằm ngoài kho thì trợ lý nhận là không biết.
- **Để "trợ lý nhớ hoàn cảnh của tôi" là thật chứ không phải cảm giác** → mỗi điều trợ lý ghi nhớ đều được máy chủ đối chiếu với danh mục cho phép — ghi sai chỗ là bị từ chối kèm gợi ý sửa; thậm chí có lớp chặn bắt đúng trường hợp AI *nói* "đã ghi nhận" nhưng thực tế chưa lưu (đã bắt được 2 lần khi thử nghiệm thật — người dùng không hề hay biết đã suýt mất thông tin).
- **Để "điền giúp" không bao giờ thành "điền bậy"** → trợ lý không có quyền tự điền hay tự nộp: mọi thao tác ghi vào biểu mẫu đi qua bảng duyệt từng dòng, có hoàn tác, có ghi vết trong cuộc trò chuyện; lời kể mơ hồ thì để trống cho người dùng tự chọn chứ không đoán.
- **Để kể chuyện riêng với trợ lý mà không lo lộ thông tin** → số định danh và thông tin cá nhân được che lại trước khi bất kỳ nội dung nào rời máy chủ đến dịch vụ AI trong bước soát lỗi ngữ nghĩa.
- **Để một sự cố kỹ thuật không làm người dân kẹt giữa chừng** → phần soát lỗi tờ khai chạy hoàn toàn không cần AI (AI bận vẫn kiểm tra được hồ sơ); bộ phận nào trục trặc thì tự ẩn đi, trang cổng không bao giờ vỡ vì trợ lý.
