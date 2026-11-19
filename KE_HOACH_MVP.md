# Kế hoạch MVP của timbaixe.com

timbaixe.com là bản đồ bãi giữ xe máy phi lợi nhuận. Cộng đồng chia sẻ những bãi họ biết, giúp nhau tìm đúng cổng vào và báo lại khi thông tin thay đổi. Chủ dự án kiểm chứng các đóng góp trước khi công khai.

## Khu vực thí điểm

Đợt đầu tập trung dữ liệu tại năm phường của TP.HCM. Khu vực Quận 1 cũ gồm Sài Gòn, Tân Định, Bến Thành và Cầu Ông Lãnh. Khu vực còn lại là phường Bảy Hiền. Nút “Chọn phường” dùng tên phường hiện hành theo [Nghị quyết 1685/NQ-UBTVQH15](https://chinhphu.vn/?classid=0&docid=214007&pageid=27160).

## Tìm và xem bãi

| Thao tác | Kết quả |
| --- | --- |
| Bấm “Dùng vị trí của tôi” và cấp quyền | Tìm quanh vị trí hiện tại trong bán kính 1 km. Khi định vị thất bại, người dùng vẫn tìm được bằng địa chỉ hoặc phường. |
| Nhập địa chỉ quán hoặc điểm đến | Hiện ngay các bãi trong bán kính 1 km quanh địa chỉ đó, kể cả bãi ở phường bên cạnh. |
| Bấm “Chọn phường” | Hiện các bãi thuộc phường đã chọn, danh sách xếp theo tên từ A đến Z. |

Với tìm theo GPS hoặc địa chỉ, danh sách xếp từ gần đến xa quanh điểm tìm. Khi không có kết quả, thông báo nêu bán kính vừa tìm và chỉ có một nút “Tìm xa hơn”. Mỗi lần bấm tăng bán kính thêm 1 km quanh cùng điểm tìm (1 km → 2 km → 3 km…).

Mỗi bãi có ký hiệu **P màu xanh** tại cổng xe máy chạy vào. Danh sách dưới bản đồ hiện tên bãi và khoảng cách khi có điểm tìm. Chạm vào ký hiệu P hoặc dòng trong danh sách sẽ mở bảng chi tiết trượt lên từ dưới màn hình.

Bảng chi tiết hiển thị tên, địa chỉ, giá vé theo cách bãi niêm yết, giờ mở cửa và ảnh cổng vào. Nếu thiếu ảnh, bãi vẫn xuất hiện và bảng ghi “Chưa có ảnh”.

## Xem tuyến đến cổng vào

Nút “Chỉ đường” cho xem tuyến xe máy đến tọa độ của ký hiệu P. Tìm bằng GPS thì xuất phát từ vị trí hiện tại. Tìm bằng địa chỉ thì xuất phát từ địa chỉ đã nhập. Khi chọn phường, người dùng được chọn “Dùng vị trí của tôi” hoặc “Nhập điểm xuất phát”.

Ngân sách vẽ tuyến là **0 đồng/tháng**. Ưu tiên vẽ tuyến xem trước trên timbaixe.com khi có dịch vụ hỗ trợ xe máy tại khu vực tìm và có thể chặn phát sinh phí. Nếu chưa có dịch vụ đáp ứng hoặc đã hết hạn mức miễn phí, nút “Chỉ đường” mở Google Maps với điểm xuất phát và tọa độ cổng vào đã chọn.

## Đóng góp và kiểm chứng

- **Bãi mới** — Người dùng mở mục “Đóng góp”, chọn “Thêm bãi xe”, nhập tên và ghim đúng cổng xe máy chạy vào. Hai thông tin này đủ để gửi. Địa chỉ bằng chữ, giá vé, giờ mở cửa và ảnh là tùy chọn.
- **Bãi ngoài khu vực thí điểm** — Hệ thống vẫn nhận đề xuất và đưa vào danh sách chờ chủ dự án kiểm chứng. Khi chủ dự án duyệt bãi đầu tiên ở một phường mới, hệ thống tự thêm phường đó vào mục “Chọn phường”.
- **Bãi đã có** — Từ bảng chi tiết, người dùng có thể gửi ảnh, bổ sung giá hoặc giờ mở cửa, hay báo thông tin sai. Mỗi đóng góp gắn với bãi đang xem.
- **Duyệt** — Khách gửi trực tiếp, không cần tài khoản. Đề xuất mới ở trạng thái chờ. Chủ dự án xem nội dung, kiểm chứng rồi duyệt hoặc từ chối. Chỉ nội dung được duyệt mới xuất hiện công khai.

## Checklist triển khai theo phase

Mỗi ô đánh dấu một đầu việc. Đánh dấu hoàn tất sau khi đã kiểm tra kết quả. Chủ dự án phụ trách kiểm chứng dữ liệu thực địa và duyệt nội dung. Các đầu việc xây dựng, tích hợp và kiểm thử thuộc phần kỹ thuật.

### Phase 1 — Dữ liệu thí điểm và dịch vụ bản đồ

- [ ] **1.1** Chọn các bãi mẫu ở năm phường. Chủ dự án kiểm tra ghim cổng vào, tên phường và thông tin hiện có. Chuẩn bị cả trường hợp thiếu ảnh và hai bãi ở hai bên ranh phường.
- [ ] **1.2** Thống nhất mẫu dữ liệu với ID bãi, tên, tọa độ cổng, mã phường và các trường tùy chọn. Xuất một tệp GeoJSON từ dữ liệu đã kiểm tra để dùng xuyên suốt các phase.
- [ ] **1.3** Thử nguồn bản đồ nền và dịch vụ tra địa chỉ với địa chỉ thật trong khu vực. Ghi lại độ chính xác, điều khoản, hạn mức và hành vi khi tra cứu thất bại.

**Nghiệm thu:** Từ một địa chỉ mẫu, xác định được điểm tìm và biết trước những bãi nào phải hiện theo bán kính hoặc theo phường.

### Phase 2 — Bản đồ tìm bãi trên điện thoại

- [ ] **2.1** Khởi tạo React + Vite + TypeScript, thêm MapLibre và trang chủ có tiêu đề, phần giới thiệu ngay trong HTML ban đầu. Ghi lệnh chạy cục bộ vào README.
- [ ] **2.2** Nạp GeoJSON của 1.2. Hiển thị P màu xanh đúng cổng vào và liên kết từng ghim với một dòng trong danh sách.
- [ ] **2.3** Nối GPS và tra địa chỉ. Lọc trong 1 km, xếp gần trước, kể cả bãi bên kia ranh. Khi rỗng chỉ hiện hành động “Tìm xa hơn”; mỗi lần bấm tăng đúng 1 km quanh điểm cũ.
- [ ] **2.4** Làm nút “Chọn phường”, lọc đúng phường và xếp tên A–Z. Mở cùng bảng chi tiết trượt lên từ ghim hoặc danh sách, hiện giá niêm yết, giờ và ảnh.

**Nghiệm thu:** Trên điện thoại, thử từ chối GPS rồi nhập địa chỉ, tìm từ 1 lên 2 km, chọn phường và mở bãi thiếu ảnh. So sánh kết quả với mẫu Phase 1.

### Phase 3 — Đóng góp, kiểm duyệt và xuất bản

- [ ] **3.1** Tạo schema Supabase/PostGIS cho bãi, phường, đề xuất và ảnh. Tách dữ liệu công khai khỏi hàng chờ và ảnh riêng tư. Thiết lập quyền quản trị cho chủ dự án.
- [ ] **3.2** Làm API và biểu mẫu “Đóng góp → Thêm bãi xe”. Khách gửi được chỉ với tên và ghim. Từ bảng chi tiết, cho gửi ảnh, sửa giá/giờ hoặc báo sai. Kiểm tra đầu vào và giới hạn gửi.
- [ ] **3.3** Làm màn hình duyệt/từ chối. Sau khi duyệt, xuất GeoJSON mới và cập nhật CDN. Cho phép thử lại khi xuất lỗi mà không tạo trùng bãi.
- [ ] **3.4** Nối bản đồ Phase 2 với dữ liệu xuất bản. Tạo danh sách phường từ cùng phiên bản dữ liệu.

**Nghiệm thu:** Khách gửi bãi ở phường mới và gửi ảnh. Trước khi duyệt, khách khác chưa thấy dữ liệu đó. Sau khi duyệt, phường mới và bãi xuất hiện cùng nhau. Đề xuất bị từ chối không làm thay đổi bản công khai.

### Phase 4 — Chỉ đường và thử thực địa

- [ ] **4.1** Nối nút “Chỉ đường” với Google Maps, truyền đúng điểm đầu của từng cách tìm và cổng vào làm điểm cuối. Khi tìm theo phường, cho chọn GPS hoặc nhập điểm xuất phát.
- [ ] **4.2** Kiểm tra dịch vụ vẽ tuyến xe máy tại TP.HCM. Chỉ bật xem trước trên web khi có cơ chế chặn phí ở mức 0 đồng/tháng. Nếu chưa có dịch vụ phù hợp, dùng phương án 4.1.
- [ ] **4.3** Thử trên điện thoại tại các bãi mẫu, đối chiếu điểm đến với cổng thật. Kiểm tra trường hợp dịch vụ lỗi hoặc hết hạn mức.

**Nghiệm thu:** Tìm từ địa chỉ quán sẽ cho tuyến từ quán đến cổng; GPS và chọn phường cũng truyền đúng điểm đầu. Người dùng mở được tuyến khi không còn lượt miễn phí.

### Phase 5 — Phát hành và theo dõi

- [ ] **5.1** Triển khai staging, chạy lại các kịch bản nghiệm thu Phase 2–4 trên dữ liệu đã duyệt. Kiểm tra quyền truy cập ảnh, trang quản trị và hạn mức dịch vụ.
- [ ] **5.2** Triển khai trang chủ tại timbaixe.com, kiểm tra HTTPS, định vị trên điện thoại, HTML ban đầu và URL công khai bằng Google Search Console.
- [ ] **5.3** Sau ra mắt, theo dõi lỗi tìm địa chỉ, tải dữ liệu, hạn mức và hàng chờ đóng góp. Kiểm thử tải trên staging trước khi công bố khả năng phục vụ 1.000 người đồng thời.

**Nghiệm thu:** Một người dùng mới mở tên miền, tìm và xem được bãi; một khách khác gửi được đề xuất để chủ dự án duyệt. Ghi nhận trạng thái lập chỉ mục của trang chủ trong Search Console.

**Phụ thuộc:** Có thể làm 1.1 và 1.3 song song. Khi chốt mẫu dữ liệu ở 1.2, có thể làm giao diện Phase 2 song song với schema 3.1. Luồng Google Maps ở 4.1 có thể bắt đầu ngay khi bảng chi tiết 2.4 dùng được. Chạy kiểm tra tích hợp 5.1 sau khi hoàn tất các luồng tìm bãi, kiểm duyệt và chỉ đường.

Chi tiết schema, API dự kiến và cách xuất bản dữ liệu nằm trong [tài liệu kiến trúc](PARKING_FINDER_ARCHITECTURE.md).
