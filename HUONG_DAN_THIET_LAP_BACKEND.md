# Hướng dẫn thiết lập backend cho timbaixe.com

Tài liệu này dành cho chủ dự án. Mục tiêu là để bạn tự nhập bãi trên website, kiểm tra ghim rồi duyệt trước khi bãi xuất hiện công khai. Mã hiện nằm trong repo; tài khoản và tài nguyên đám mây chưa được tạo hoặc kết nối trong phiên làm việc này.

## Bạn cần tạo gì?

| Nơi | Cần làm | Chưa cần làm |
| --- | --- | --- |
| Supabase | Một project PostgreSQL, chạy migration, tạo một tài khoản quản trị | Tạo bảng bằng tay, tạo Storage bucket |
| Cloudflare | Worker `timbaixe-api` cho backend và Worker `tim-bai-xe` cho website | Tạo R2 bucket |

Worker hiện tạo GeoJSON trực tiếp từ bảng bãi đã duyệt trong Supabase. Ảnh và xuất bản qua R2/CDN chưa được lập trình, nên tạo bucket lúc này không giúp luồng nhập bãi chạy được.

## 1. Tạo project Supabase

1. Mở [Supabase Dashboard](https://supabase.com/dashboard), tạo project mới, ví dụ tên `timbaixe`. Chọn khu vực **Southeast Asia (Singapore)** để gần người dùng TP.HCM. Lưu mật khẩu database trong trình quản lý mật khẩu; mã ứng dụng hiện không dùng mật khẩu này. [Các khu vực Supabase](https://supabase.com/docs/guides/platform/regions)
2. Trong project, mở **SQL Editor**. Mở tệp [migration của repo](supabase/migrations/20261119_parking_contributions.sql), dán toàn bộ nội dung và chạy **một lần**. Tệp tạo PostGIS, bảng đề xuất chờ duyệt, bảng bãi đã duyệt, giới hạn gửi và hàm duyệt. [SQL Editor và database](https://supabase.com/docs/guides/database/overview)
3. Kiểm tra trong **Table Editor** có ba bảng `parking_contributions`, `parkings`, `parking_submission_limits`. Ban đầu chúng rỗng. Nếu migration báo lỗi, giữ nguyên thông báo lỗi và gửi mình; đừng chỉnh SQL hoặc tạo bảng thủ công để thử vượt lỗi.
4. Mở **Authentication → Users → Add user → Create new user**. Tạo tài khoản email/mật khẩu cho chính bạn; chọn xác nhận email ngay nếu Dashboard có tùy chọn đó. Sao chép **User ID** (UUID) của tài khoản, vì Worker chỉ cho ID này duyệt bãi. [Quản lý người dùng Supabase](https://supabase.com/docs/guides/auth/users)
5. Mở **Connect** hoặc **Settings → API Keys** và ghi lại ba giá trị: **Project URL**, khóa **Publishable** bắt đầu bằng `sb_publishable_`, và khóa **Secret** bắt đầu bằng `sb_secret_`. Khóa Secret chỉ đặt ở Worker, tuyệt đối không đưa vào GitHub, Pages build variables hoặc tin nhắn chat. [Khóa API Supabase](https://supabase.com/docs/guides/getting-started/api-keys)

> Worker backend dùng tên biến `SUPABASE_SERVICE_ROLE_KEY` để tương thích mã đã viết; hãy điền **khóa Secret mới** `sb_secret_…` vào biến này. Khóa Publishable công khai của frontend đã nằm trong [src/config.ts](src/config.ts). Không cần lấy khóa `anon` hoặc `service_role` đời cũ. [Hướng dẫn chuyển sang khóa mới](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)

## 2. Đăng nhập Cloudflare và tạo Worker

Tại thư mục gốc của repo, chạy:

```sh
npm install
npx wrangler login
npm run deploy:api
```

Lệnh đăng nhập mở trình duyệt để bạn cho phép Wrangler dùng tài khoản Cloudflare. Nếu trình duyệt không mở hoặc luồng callback không hoàn tất, chạy `npx wrangler login --device` và làm theo mã xác nhận hiện trên terminal. [Đăng nhập Wrangler](https://developers.cloudflare.com/workers/wrangler/commands/general/)

`npm run deploy:api` dùng [wrangler.api.jsonc](wrangler.api.jsonc) để **tạo/triển khai Worker `timbaixe-api`**, nên không cần tạo Worker bằng tay. Sao chép URL Worker mà Wrangler in ra, dạng `https://timbaixe-api.<tài-khoản>.workers.dev`. Lần đầu Worker có thể trả `503 Máy chủ chưa được cấu hình` cho đến khi bạn thêm đủ secrets. [Triển khai Worker](https://developers.cloudflare.com/workers/wrangler/commands/workers/)

Trong **Cloudflare Dashboard → Workers & Pages → timbaixe-api → Settings → Variables and Secrets**, thêm các giá trị sau với loại **Secret**, rồi chọn Deploy. Bạn cũng có thể dùng `npx wrangler secret put <TÊN_BIẾN>` từng biến; lệnh sẽ hỏi giá trị kín trong terminal. [Cấu hình Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)

| Tên biến Worker | Giá trị cần điền |
| --- | --- |
| `SUPABASE_URL` | **Project URL gốc**, dạng `https://<project-ref>.supabase.co`; không thêm `/rest/v1`, `/auth/v1` hoặc đường dẫn khác |
| `SUPABASE_SERVICE_ROLE_KEY` | Khóa **Secret** `sb_secret_…` của Supabase |
| `ADMIN_USER_ID` | User ID của tài khoản quản trị vừa tạo |
| `RATE_LIMIT_SALT` | Chuỗi ngẫu nhiên dài, riêng cho dự án |
| `ALLOWED_ORIGINS` | Các origin website được gọi API, cách nhau bằng dấu phẩy, ví dụ `https://tim-bai-xe.binhvo1003.workers.dev,https://timbaixe.com` |

Nếu cần tạo `RATE_LIMIT_SALT`, chạy `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` trên máy của bạn và sao chép kết quả vào Secret. Không thêm dấu `/` cuối vào `ALLOWED_ORIGINS`.

**Lỗi hiện tại:** API đã có tên của cả năm secret nhưng truy vấn Supabase trả `PGRST125: Invalid path specified in request URL`. Hãy sửa riêng secret `SUPABASE_URL` thành Project URL gốc lấy trong **Supabase → Connect**, rồi mở lại `https://timbaixe-api.binhvo1003.workers.dev/api/v1/parking.geojson`. Nếu còn 503, giữ nguyên thông báo để kiểm tra tiếp. [Mã lỗi PostgREST](https://supabase.com/docs/guides/api/rest/postgrest-error-codes), [Supabase Project URL](https://supabase.com/docs/reference/javascript/initializing/)

## 3. Triển khai website trên Worker `tim-bai-xe`

Website đã được kết nối với repo qua **Cloudflare Workers Builds**. Mã ứng dụng nằm trên nhánh **`develop`**; nhánh `main` chưa có `package.json`. Worker frontend tên `tim-bai-xe`, khác với Worker backend `timbaixe-api`.

Trong **Workers & Pages → tim-bai-xe → Settings → Builds**, đặt:

| Mục Workers Builds | Giá trị |
| --- | --- |
| Git branch | `develop` |
| Build command | `npm run build` |
| Deploy command | `npm run deploy:web` hoặc mặc định `npx wrangler deploy` |
| Root directory | Gốc repo |

Workers Builds **không có ô Output directory**. Tệp [wrangler.jsonc](wrangler.jsonc) ở gốc repo khai báo `dist` là static assets cho Worker website, nên cả lệnh deploy mặc định lẫn `npm run deploy:web` đều đưa giao diện lên `tim-bai-xe`. Backend dùng tệp [wrangler.api.jsonc](wrangler.api.jsonc) và lệnh `npm run deploy:api` riêng. [Cấu hình Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [Worker static assets](https://developers.cloudflare.com/workers/static-assets/)

Worker `tim-bai-xe` chỉ phục vụ static assets, nên mục **Settings → Variables and Secrets** dành cho runtime sẽ báo không thể thêm biến. Không cần thêm biến ở đó. Ba giá trị công khai dưới đây đã được khai báo trong [src/config.ts](src/config.ts) cho bản production; Cloudflare chỉ cần chạy build và deploy từ nhánh `develop`. Nếu chuyển sang project Supabase khác, có thể thay tệp này hoặc dùng **Settings → Builds → Build variables and secrets** để ghi đè lúc build. [Biến build của Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)

| Giá trị công khai trong frontend | Giá trị hiện tại |
| --- | --- |
| URL API | `https://timbaixe-api.binhvo1003.workers.dev` |
| Supabase Project URL | `https://jiqohwewwopyssncraad.supabase.co` |
| Supabase Publishable key | Khóa công khai `sb_publishable_…` trong `src/config.ts` |

Trong **Settings → Domains & Routes** của Worker `tim-bai-xe`, bật `workers.dev`. URL website hiện là `https://tim-bai-xe.binhvo1003.workers.dev`. Thêm chính xác origin này vào `ALLOWED_ORIGINS` của Worker backend. Nếu gắn `timbaixe.com`, thêm cả `https://timbaixe.com`. [Quản lý workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)

## 4. Kiểm tra trước khi nhập bãi thật

1. Mở `<URL_WORKER>/api/v1/parking.geojson`. Khi chưa duyệt bãi nào, kết quả đúng là `{"type":"FeatureCollection","features":[]}`.
2. Mở URL website `https://tim-bai-xe.binhvo1003.workers.dev`, vào **Đóng góp**, chạm bản đồ để ghim cổng, điền tên bãi và gửi. Trang phải báo đề xuất đang chờ; bãi **chưa** xuất hiện trong phần tìm kiếm.
3. Vào **Quản trị**, đăng nhập bằng tài khoản Supabase đã tạo. Mở ghim đề xuất, xác nhận tên phường hiện hành rồi chọn **Duyệt bãi**. Tải lại trang: bãi và phường của nó mới xuất hiện công khai. Với bãi thử, chọn **Từ chối** để không đưa dữ liệu giả lên bản đồ.
4. Nếu trình duyệt báo lỗi CORS, kiểm tra `ALLOWED_ORIGINS` khớp origin đang mở và không có dấu `/` cuối. Nếu báo `503`, kiểm tra đủ năm Worker secrets và migration.

## Khi bạn thiết lập xong

Nhắn mình **Project URL của Supabase** và trạng thái bạn đã tạo tài khoản quản trị/chạy migration hay chưa. URL hai Worker đã được xác định ở trên. **Không gửi** mật khẩu database, mật khẩu quản trị, khóa `sb_secret_…` hay `RATE_LIMIT_SALT` trong chat.
