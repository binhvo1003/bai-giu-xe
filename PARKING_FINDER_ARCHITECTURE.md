# timbaixe.com — Kiến trúc MVP

timbaixe.com là bản đồ cộng đồng phi lợi nhuận giúp người đi xe máy tìm đúng cổng bãi giữ xe. Tài liệu này mô tả thiết kế đề xuất để triển khai [kế hoạch MVP](KE_HOACH_MVP.md). Năm phường thí điểm gồm Sài Gòn, Tân Định, Bến Thành, Cầu Ông Lãnh và Bảy Hiền. Hệ thống tiếp nhận đóng góp cả ngoài khu vực thí điểm.

## Thành phần và luồng dữ liệu

**Trạng thái triển khai (19/11/2026):** Repo đã có biểu mẫu gửi bãi, Worker API, migration Supabase và màn hình chủ dự án duyệt. Worker hiện tạo GeoJSON từ bảng bãi đã duyệt theo mỗi yêu cầu; bước xuất bản phiên bản lên R2/CDN và luồng ảnh vẫn thuộc phần tiếp theo. Chưa có dự án Supabase hoặc Worker được cấu hình trong repo, nên các API này chưa chạy với dữ liệu thật.

| Thành phần | Trách nhiệm trong MVP |
| --- | --- |
| React, Vite, TypeScript trên Cloudflare Pages | Phục vụ trang chủ có tiêu đề và phần giới thiệu bằng tiếng Việt ngay trong HTML ban đầu. React điều khiển tìm kiếm, bản đồ và bảng chi tiết. |
| MapLibre | Hiển thị bản đồ nền, ghim cổng vào và tuyến xem trước. Chọn nguồn tile có quyền sử dụng phù hợp. |
| Cloudflare Workers + Hono | Tiếp nhận đề xuất, kiểm tra ảnh, xử lý duyệt và xuất dữ liệu công khai. Làm trung gian khi dịch vụ địa chỉ hoặc tuyến cần khóa bí mật. |
| Supabase PostgreSQL + PostGIS | Lưu ghim cổng vào, phường, nội dung đã duyệt và đề xuất đang chờ. Supabase Auth xác thực chủ dự án khi kiểm duyệt. |
| Cloudflare R2 và CDN | Phục vụ GeoJSON và ảnh đã duyệt. Ảnh chờ kiểm chứng nằm trong vùng lưu trữ riêng tư. |

```text
Khách tìm bãi → Trang chủ → GeoJSON đã duyệt trên CDN → lọc và hiển thị
Khách nhập địa chỉ → dịch vụ tra địa chỉ → tọa độ điểm tìm
Khách gửi đề xuất → Worker → dữ liệu và ảnh chờ duyệt
Chủ dự án → xác thực → kiểm chứng → cập nhật DB → xuất bản lên CDN
Người dùng bấm Chỉ đường → tuyến miễn phí trên web hoặc mở Google Maps
```

## Tìm bãi và hiển thị trên điện thoại

| Cách tìm | Điểm tìm và thứ tự kết quả |
| --- | --- |
| Dùng vị trí của tôi | Xin quyền khi người dùng bấm nút. Tìm quanh GPS hiện tại. Nếu định vị thất bại, ô địa chỉ và nút “Chọn phường” vẫn dùng được. |
| Nhập địa chỉ quán | Tra địa chỉ thành tọa độ. Nếu có nhiều địa chỉ trùng, cho chọn đúng địa điểm. Sau khi xác định được điểm, hiển thị ngay các bãi gần đó. |
| Chọn phường | Nút riêng mở danh sách phường theo tên hiện hành. Lọc theo phường của cổng vào, xếp tên bãi A–Z theo tiếng Việt. |

Với GPS hoặc địa chỉ, trình duyệt tính khoảng cách đường chim bay từ điểm tìm đến từng cổng, lấy các bãi trong **1 km** kể cả bên kia ranh phường, rồi xếp từ gần đến xa. Khi không có kết quả, thông báo ghi bán kính vừa tìm và chỉ có nút **“Tìm xa hơn”**. Mỗi lần bấm tăng đúng **1 km** quanh cùng một điểm. Nếu tra địa chỉ thất bại, báo lỗi tra cứu để người dùng sửa địa chỉ.

Mỗi bãi có ký hiệu **P màu xanh** ở cổng xe máy. Danh sách bên dưới hiện tên và khoảng cách khi có điểm tìm. Chạm vào ghim hoặc dòng danh sách mở cùng một bảng chi tiết trượt lên từ dưới màn hình. Bảng hiển thị địa chỉ, giá vé như bãi niêm yết, giờ mở cửa và ảnh cổng vào. Nếu thiếu ảnh, ghi **“Chưa có ảnh”**.

## Dữ liệu và xuất bản

- **Bãi xe** có ID ổn định, tên, tọa độ cổng vào và mã phường. Ghim P, phép tính khoảng cách và điểm cuối tuyến dùng chung tọa độ này. Địa chỉ bằng chữ, giá vé dạng văn bản, giờ mở cửa và ảnh là tùy chọn. Lưu ngày kiểm chứng để theo dõi thay đổi.
- **Đề xuất** lưu loại đóng góp, ID bãi nếu sửa bãi đã có, nội dung đề nghị, ảnh đính kèm và trạng thái chờ, duyệt hoặc từ chối. Khi duyệt bãi mới, chủ dự án xác nhận phường của cổng vào. Người gửi chỉ cần cung cấp tên và ghim.
- **Bản công khai** ở giai đoạn thí điểm có thể là một tệp GeoJSON chứa toàn bộ bãi đã duyệt và tham chiếu đến ảnh công khai. Trình duyệt dùng cùng bản dữ liệu để tìm xuyên ranh và lập danh sách phường. Khi công bố bãi đầu tiên ở phường mới, cả phường và bãi xuất hiện trong cùng phiên bản.
- Sau khi duyệt, ghi thay đổi vào DB và đánh dấu cần xuất bản trong cùng giao dịch. Xuất tệp mới hoàn chỉnh rồi cập nhật phiên bản CDN. Nếu xuất lỗi, giữ phiên bản trước và thử lại. Chỉ tải ảnh khi mở chi tiết. Khi kích thước tệp thực tế gây chậm, chuyển sang ô bản đồ hoặc truy vấn PostGIS có cache, lấy đủ các ô giao với bán kính tìm.

## Đóng góp và quyền truy cập

Khách mở **Đóng góp → Thêm bãi xe** để ghim bãi mới. Từ bảng chi tiết của bãi đã có, khách gửi ảnh, sửa giá, bổ sung giờ hoặc báo sai. Tất cả các luồng này cho gửi nhanh không cần tài khoản.

| API đề xuất | Quyền và kết quả |
| --- | --- |
| POST /api/v1/contributions | Khách gửi đề xuất. Worker kiểm tra nội dung và tạo bản ghi chờ duyệt. |
| POST /api/v1/uploads | Khách gửi ảnh qua Worker. Giới hạn tần suất, kích thước, loại tệp và gắn ảnh riêng tư với đề xuất. |
| GET /api/v1/admin/contributions | Chủ dự án đã xác thực xem hàng chờ và ảnh cần kiểm chứng. |
| PATCH /api/v1/admin/contributions/{id} | Chỉ chủ dự án được duyệt hoặc từ chối. Yêu cầu duyệt lặp lại cùng đề xuất không tạo thêm bãi. |

Giữ khóa quản trị ở backend. Khách chỉ được ghi vào luồng đề xuất. Kiểm tra quyền sử dụng ảnh và thông tin nhận diện trước khi công khai. Không lưu lịch sử GPS của người tìm bãi.

## Chỉ đường và chi phí

Chỉ tính tuyến khi người dùng bấm **“Chỉ đường”**. Điểm cuối là cổng xe máy. Với GPS, điểm đầu là vị trí hiện tại. Với địa chỉ quán, điểm đầu là quán. Khi chọn phường, cho chọn **“Dùng vị trí của tôi”** hoặc **“Nhập điểm xuất phát”**.

Ngân sách **vẽ tuyến là 0 đồng/tháng**. Chỉ bật xem trước trên web khi đã xác minh dịch vụ hỗ trợ tuyến xe máy tại khu vực tìm và có cơ chế chặn phát sinh phí. Khi chưa có dịch vụ đáp ứng, hết hạn mức hoặc dịch vụ lỗi, mở Google Maps với đúng hai điểm. Khâu tra địa chỉ và tải tile có hạn mức riêng. Trước triển khai, thử địa chỉ tiếng Việt tại khu vực thí điểm, kiểm tra điều khoản, hạn mức và cách tính phí của từng nhà cung cấp.

## Thứ tự triển khai và nghiệm thu

1. Chuẩn bị dữ liệu thực địa trong năm phường, gồm hai bãi ở hai bên ranh phường. Kiểm tra ghim đúng cổng, tra đúng địa chỉ và phân biệt được kết quả theo bán kính với kết quả theo phường.
2. Thử trên điện thoại khi từ chối GPS, tìm ở 1 km rồi mở rộng lên 2 km và chọn phường. Đối chiếu ghim với danh sách, thứ tự và bảng chi tiết của bãi thiếu ảnh.
3. Gửi một bãi ngoài vùng thí điểm chỉ với tên và ghim. Thử từ chối và duyệt. Kiểm tra chỉ bãi, phường và ảnh đã duyệt mới xuất hiện công khai. Thử báo sai giá trên bãi đã có.
4. Kiểm tra cả ba cách xác định điểm đầu. Giả lập hết hạn mức tuyến và xác nhận Google Maps nhận đúng điểm đầu và cổng vào.
5. Kiểm tra HTML ban đầu của trang chủ và kiểm tra URL bằng Google Search Console sau khi ra mắt. Theo dõi tải GeoJSON, ảnh, tile và API. Mục tiêu 1.000 người dùng đồng thời cần được kiểm thử trên staging với cache nóng và lạnh trước khi công bố khả năng chịu tải.
