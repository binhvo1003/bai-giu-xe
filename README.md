# timbaixe.com

Bản đồ cộng đồng phi lợi nhuận giúp tìm cổng vào bãi giữ xe máy tại TP.HCM. Xem [kế hoạch MVP](KE_HOACH_MVP.md) và [kiến trúc](PARKING_FINDER_ARCHITECTURE.md).

## Chạy cục bộ

Yêu cầu Node.js 20.19+ hoặc 22.12+.

```sh
npm install
npm run dev
```

Mở địa chỉ do Vite in ra. Kiểm tra mã và bộ lọc:

```sh
npm run build
npm test
```

## Dữ liệu công khai

`public/parking.geojson` là bản xuất **chỉ gồm bãi đã được chủ dự án kiểm chứng và duyệt**. Tệp hiện rỗng vì chưa có dữ liệu thực địa được xác nhận. Mỗi bãi là GeoJSON Point tại cổng xe máy, với `id` ổn định và `properties` gồm `name`, `wardCode`, `wardName`; có thể thêm `address`, `price`, `hours`, `photoUrl`. Tên phường trong bộ chọn lấy từ chính các bãi trong tệp, nên phường mới chỉ xuất hiện khi bản xuất đã có bãi được duyệt.

Ví dụ cấu trúc (tọa độ chỉ minh họa, **không đưa vào bản công khai**):

```json
{"type":"Feature","id":"stable-id","geometry":{"type":"Point","coordinates":[106.7,10.78]},"properties":{"name":"Tên bãi","wardCode":"ward-code","wardName":"Sài Gòn","address":"Địa chỉ","price":"Giá niêm yết","hours":"Giờ mở cửa"}}
```

## Dịch vụ bản đồ khi phát triển

Ứng dụng hiện dùng tile OpenStreetMap và Nominatim để thử luồng tìm kiếm thủ công. Trước khi triển khai công khai, cần chọn nhà cung cấp có điều khoản, hạn mức và độ chính xác phù hợp theo Phase 1.3. Có thể đổi endpoint tra địa chỉ bằng `VITE_GEOCODE_URL`; endpoint cần trả về danh sách có `display_name`, `lon`, `lat` theo định dạng Nominatim. Không thêm khóa bí mật vào biến `VITE_` vì biến này hiện trong trình duyệt.

Chỉ đường hiện mở Google Maps với điểm đầu từ GPS hoặc địa chỉ và điểm cuối là tọa độ cổng. Khi chọn phường, người dùng chọn điểm xuất phát trước. Các luồng đóng góp, kiểm duyệt và xuất bản tự động thuộc Phase 3 và chưa được kết nối.
