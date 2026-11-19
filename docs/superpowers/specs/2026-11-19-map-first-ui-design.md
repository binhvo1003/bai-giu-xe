# Thiết kế lại giao diện timbaixe.com

## Mục đích

Người tìm bãi xe máy tại TP.HCM cần thấy bản đồ cổng vào ngay khi mở trang, chọn một trong ba cách tìm và nhận ra bãi phù hợp nhanh trên điện thoại. Bản hiện tại đặt nội dung trong khung rộng tối đa 1.200 px và để phần bản đồ cao cố định; trên màn hình rộng, nhiều vùng trắng không phục vụ việc tìm bãi. Người dùng muốn thay đổi màu sắc, bố cục và sử dụng tốt diện tích màn hình.

## Mục tiêu và giới hạn

- Bản đồ là vùng chính, chiếm phần diện tích còn lại sau khi dành chỗ cho công cụ tìm và danh sách.
- Làm rõ thứ bậc: địa điểm cần tìm → bãi tìm được → cổng vào → chỉ đường.
- Giữ ba cách tìm trong MVP: vị trí hiện tại, địa chỉ, phường; giữ bán kính tăng 1 km quanh cùng điểm, thứ tự kết quả và bộ phường từ dữ liệu đã duyệt.
- Không đưa bãi minh họa chưa kiểm chứng vào dữ liệu công khai. Khi GeoJSON rỗng, giao diện nói rõ chưa có bãi được duyệt và vẫn cho thử tìm kiếm.
- Chỉ thay đổi giao diện và các tương tác phục vụ giao diện. Biểu mẫu đóng góp, quản trị duyệt và dữ liệu thực địa thuộc các phase sau.

## Các hướng đã cân nhắc

1. **Bản đồ chiếm phần lớn màn hình — đã chọn.** Desktop dùng thanh công cụ và danh sách bên trái, bản đồ giãn hết chiều ngang còn lại. Điện thoại ưu tiên tìm kiếm gọn, bản đồ và danh sách liên tiếp. Người dùng luôn thấy mối liên hệ giữa ghim và kết quả.
2. **Trang nội dung theo cột.** Giới thiệu và tìm kiếm trên cùng, bản đồ ở phần dưới. Dễ trình bày mục tiêu cộng đồng nhưng đẩy bản đồ xuống sâu và cần cuộn nhiều khi đang tìm cổng vào.

## Cấu trúc màn hình

Desktop từ khoảng 900 px: thanh đầu trang cao gọn, dưới là vùng làm việc lấp chiều cao cửa sổ. Cột trái rộng khoảng 380–420 px chứa tìm kiếm ở trên, danh sách kết quả cuộn độc lập ở dưới. Bản đồ bên phải chiếm toàn bộ phần còn lại, có chú giải nhỏ “P là cổng xe máy vào” và nút định vị của bản đồ. Không dùng khung 1.200 px cho vùng làm việc.

MVP đặt danh sách dưới bản đồ trên điện thoại. Trên desktop, danh sách chuyển vào cột trái theo bố cục bản đồ lớn đã chọn; ghim và dòng kết quả vẫn mở cùng một bảng chi tiết.

```text
┌──────────────────────────── timbaixe.com ─────────────────────────────┐
│ Tìm đúng cổng vào                      Bản đồ cộng đồng TP.HCM        │
├───────────────────────┬──────────────────────────────────────────────┤
│ Nhập điểm đến         │                                              │
│ [Địa chỉ ...] [Tìm]   │                 BẢN ĐỒ                       │
│ [Dùng vị trí] [Phường] │              P   P   P                       │
│ Kết quả / trạng thái  │                                              │
│ Bãi 1          450 m  │                           P = cổng xe máy   │
│ Bãi 2          800 m  │                                              │
└───────────────────────┴──────────────────────────────────────────────┘
```

Điện thoại: đầu trang chỉ còn thương hiệu và mô tả một dòng. Ô địa chỉ là thao tác chính; nút vị trí và chọn phường nằm ngay dưới, không giấu trong menu. Bản đồ có chiều cao khoảng 40–50% màn hình và chiều cao tối thiểu để thao tác ghim. Danh sách ở ngay dưới bản đồ. Khi mở một bãi, bảng chi tiết trượt lên từ cạnh dưới, có nút đóng rõ ràng và nội dung cuộn được. Tôn trọng vùng an toàn ở cuối màn hình.

```text
┌──────────────────────┐
│ P  timbaixe.com       │
│ Tìm đúng cổng vào     │
│ [Nhập điểm đến] [Tìm] │
│ [Vị trí] [Chọn phường]│
├──────────────────────┤
│                      │
│       BẢN ĐỒ         │
│          P           │
│                      │
├──────────────────────┤
│ Bãi gần điểm đến     │
│ [Tên bãi]     450 m   │
└──────────────────────┘
```

## Màu sắc và chữ

- Nền ứng dụng `#F4F7F6`, mặt công cụ `#FFFFFF`, chữ chính `#17312E`, chữ phụ `#526863`, đường chia `#D9E3DF`.
- Xanh của ký hiệu **P** `#1769B4`, tương phản với nền bản đồ và đúng quy ước MVP. Ghim được chọn có viền đậm và kích thước lớn hơn, không dùng màu khác làm sai nghĩa.
- Nút hành động chính xanh lá đậm `#086B60`; màu chú ý `#A34324` chỉ dùng cho lỗi hoặc cảnh báo. Không dùng màu để truyền tải thông tin một mình.
- Dùng **Be Vietnam Pro** khi tải được, dự phòng bằng font hệ thống hỗ trợ dấu tiếng Việt. Cỡ chữ nội dung tối thiểu 16 px trên điện thoại; nhãn phụ tối thiểu 13–14 px với độ tương phản đủ đọc.
- Bề mặt và đường chia có vai trò phân nhóm. Hạn chế đổ bóng; bản đồ, ghim và tên bãi là điểm nhấn thị giác.

## Trạng thái và tương tác

- Trước khi tìm: tiêu đề danh sách cho biết đây là các bãi đã kiểm chứng. Nếu chưa có dữ liệu, nói rõ chưa có bãi được duyệt; không hiển thị số lượng hay ghim giả.
- Khi tìm địa chỉ: giữ ô nhập và danh sách địa điểm cần chọn gần nhau. Đang tìm có phản hồi rõ. Lỗi định vị hướng người dùng tới địa chỉ hoặc phường.
- Khi không có bãi quanh một điểm: nêu bán kính hiện tại và chỉ đưa hành động “Tìm xa hơn”; mỗi lần tăng đúng 1 km quanh điểm cũ. Khi chọn phường, dùng thông báo rỗng riêng, không hiển thị hành động tăng bán kính.
- Chạm ghim hoặc dòng kết quả mở cùng một bảng chi tiết. Dòng và ghim của bãi được chọn cùng có trạng thái rõ. Bảng giữ tên, địa chỉ, giá niêm yết, giờ mở cửa, ảnh hoặc “Chưa có ảnh”, và “Chỉ đường”.
- Nút bấm có vùng chạm tối thiểu 44 × 44 px, trạng thái focus thấy được, nhãn tiếng Việt rõ ràng. Bảng chi tiết có thể đóng bằng nút, Escape và chạm nền; trả focus về phần tử vừa mở. Chuyển động giảm hoặc tắt theo `prefers-reduced-motion`.

## Triển khai và kiểm tra

Sửa cấu trúc `src/App.tsx` và hệ thống kiểu trong `src/style.css`, cập nhật màu chủ đề HTML nếu cần; không thêm thư viện giao diện. Giữ các hàm lọc và dữ liệu hiện có. Kiểm tra ở màn hình điện thoại, tablet và desktop: vùng làm việc lấp chiều rộng, không có cuộn ngang, bản đồ dùng được; thử GPS bị từ chối, địa chỉ có nhiều gợi ý, bán kính 1 → 2 km, phường rỗng, bãi thiếu ảnh và bảng chi tiết. Dữ liệu công khai rỗng hiện tại là trạng thái kiểm tra chính; dữ liệu thử chỉ dùng trong kiểm tra cục bộ.

## Quyết định còn lại cho lúc triển khai

Chi tiết kích thước theo breakpoint, biểu tượng SVG và cách cột trái cuộn có thể điều chỉnh sau khi xem màn hình thực tế, miễn giữ cấu trúc và hành vi ở trên.
