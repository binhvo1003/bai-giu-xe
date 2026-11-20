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

Chỉ đường hiện mở Google Maps với điểm đầu từ GPS hoặc địa chỉ và điểm cuối là tọa độ cổng. Khi chọn phường, người dùng chọn điểm xuất phát trước. Mã luồng đóng góp và kiểm duyệt đã có; cần cấu hình các dịch vụ bên dưới để sử dụng trên website.

## Nhập và duyệt bãi trên website

Xem [hướng dẫn thiết lập Supabase và Cloudflare](HUONG_DAN_THIET_LAP_BACKEND.md) để biết chính xác các tài nguyên và khóa cần tạo.

Ứng dụng có mục **Đóng góp → Thêm bãi xe**. Khách chỉ cần tên và ghim cổng xe máy trên bản đồ; địa chỉ, giá và giờ mở cửa là tùy chọn. Đề xuất được lưu ở trạng thái chờ. Chủ dự án mở **Quản trị**, đăng nhập bằng Supabase Auth, xem ghim và xác nhận phường trước khi duyệt hoặc từ chối. Chỉ bãi đã duyệt được xuất qua `GET /api/v1/parking.geojson`; phường mới xuất hiện trong bộ chọn từ cùng bản xuất này. Bản xuất hiện được tạo theo yêu cầu từ cơ sở dữ liệu; chưa có bước sao chép sang R2/CDN.

### Cấu hình Supabase và Worker

1. Tạo dự án Supabase. Chạy [migration](supabase/migrations/20261119_parking_contributions.sql) trong SQL Editor. Migration tạo bảng chờ, bảng bãi đã duyệt, giới hạn gửi và hàm duyệt có giao dịch.
2. Tạo tài khoản chủ dự án trong Supabase Auth; lấy **User ID** của tài khoản đó. Chỉ ID này có quyền xem và xử lý hàng chờ qua Worker.
3. Sao chép `.dev.vars.example` thành `.dev.vars`, điền URL Supabase, service role key, User ID, chuỗi ngẫu nhiên dài cho `RATE_LIMIT_SALT` và origin của giao diện. `.dev.vars` không được đưa vào Git.
4. Sao chép `.env.example` thành `.env.local`, điền URL Worker cục bộ, URL Supabase và publishable/anon key. Chỉ `VITE_SUPABASE_ANON_KEY` được đưa ra trình duyệt; **không** đặt service role key trong biến `VITE_`.
5. Chạy hai lệnh ở hai terminal:

```sh
npm run dev:api
npm run dev
```

Worker chạy tại `http://127.0.0.1:8787`; Vite dùng URL ghi trong `.env.local`. Nếu chưa có cấu hình, trang vẫn hiển thị GeoJSON tĩnh, nhưng biểu mẫu sẽ báo chưa kết nối máy chủ và không cho gửi.

Khi triển khai, đặt năm giá trị trong `.dev.vars.example` thành **Worker secrets** cho `timbaixe-api`, rồi chạy `npm run deploy:api` với `wrangler.api.jsonc`. Website chạy trên Worker `tim-bai-xe`; build bằng `npm run build` và triển khai bằng `npm run deploy:web` với `wrangler.jsonc`, tệp mặc định khai báo thư mục `dist` là static assets. [src/config.ts](src/config.ts) chứa URL API, Project URL Supabase và khóa Publishable công khai cho bản production; có thể ghi đè bằng `VITE_*` lúc build. Không đặt khóa Secret vào frontend. `ALLOWED_ORIGINS` ở backend phải chứa chính xác origin của website; không thêm dấu gạch chéo cuối. Xem [hướng dẫn thiết lập](HUONG_DAN_THIET_LAP_BACKEND.md) để kiểm tra từng bước.
