# Hướng dẫn thiết lập backend cho timbaixe.com

Tài liệu này dành cho chủ dự án. Mục tiêu là để bạn tự nhập bãi trên website, kiểm tra ghim rồi duyệt trước khi bãi xuất hiện công khai. Mã hiện nằm trong repo; tài khoản và tài nguyên đám mây chưa được tạo hoặc kết nối trong phiên làm việc này.

## Bạn cần tạo gì?

| Nơi | Cần làm | Chưa cần làm |
| --- | --- | --- |
| Supabase | Một project PostgreSQL, chạy migration, tạo một tài khoản quản trị | Tạo bảng bằng tay, tạo Storage bucket |
| Cloudflare | Đăng nhập Wrangler; triển khai một Worker từ repo; tạo hoặc cập nhật một Pages project cho website | Tạo Worker bằng tay trong Dashboard, tạo R2 bucket |

Worker hiện tạo GeoJSON trực tiếp từ bảng bãi đã duyệt trong Supabase. Ảnh và xuất bản qua R2/CDN chưa được lập trình, nên tạo bucket lúc này không giúp luồng nhập bãi chạy được.

## 1. Tạo project Supabase

1. Mở [Supabase Dashboard](https://supabase.com/dashboard), tạo project mới, ví dụ tên `timbaixe`. Chọn khu vực **Southeast Asia (Singapore)** để gần người dùng TP.HCM. Lưu mật khẩu database trong trình quản lý mật khẩu; mã ứng dụng hiện không dùng mật khẩu này. [Các khu vực Supabase](https://supabase.com/docs/guides/platform/regions)
2. Trong project, mở **SQL Editor**. Mở tệp [migration của repo](supabase/migrations/20261119_parking_contributions.sql), dán toàn bộ nội dung và chạy **một lần**. Tệp tạo PostGIS, bảng đề xuất chờ duyệt, bảng bãi đã duyệt, giới hạn gửi và hàm duyệt. [SQL Editor và database](https://supabase.com/docs/guides/database/overview)
3. Kiểm tra trong **Table Editor** có ba bảng `parking_contributions`, `parkings`, `parking_submission_limits`. Ban đầu chúng rỗng. Nếu migration báo lỗi, giữ nguyên thông báo lỗi và gửi mình; đừng chỉnh SQL hoặc tạo bảng thủ công để thử vượt lỗi.
4. Mở **Authentication → Users → Add user → Create new user**. Tạo tài khoản email/mật khẩu cho chính bạn; chọn xác nhận email ngay nếu Dashboard có tùy chọn đó. Sao chép **User ID** (UUID) của tài khoản, vì Worker chỉ cho ID này duyệt bãi. [Quản lý người dùng Supabase](https://supabase.com/docs/guides/auth/users)
5. Mở **Connect** hoặc **Settings → API Keys** và ghi lại ba giá trị: **Project URL**, khóa **Publishable** bắt đầu bằng `sb_publishable_`, và khóa **Secret** bắt đầu bằng `sb_secret_`. Khóa Secret chỉ đặt ở Worker, tuyệt đối không đưa vào GitHub, Pages build variables hoặc tin nhắn chat. [Khóa API Supabase](https://supabase.com/docs/guides/getting-started/api-keys)

> Tên biến trong repo hiện là `VITE_SUPABASE_ANON_KEY` và `SUPABASE_SERVICE_ROLE_KEY` để tương thích mã đã viết. Hãy điền **khóa Publishable mới** vào biến thứ nhất và **khóa Secret mới** vào biến thứ hai; không cần lấy khóa `anon` hoặc `service_role` đời cũ. [Hướng dẫn chuyển sang khóa mới](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)

## 2. Đăng nhập Cloudflare và tạo Worker

Tại thư mục gốc của repo, chạy:

```sh
npm install
npx wrangler login
npm run deploy:api
```

Lệnh đăng nhập mở trình duyệt để bạn cho phép Wrangler dùng tài khoản Cloudflare. Nếu trình duyệt không mở hoặc luồng callback không hoàn tất, chạy `npx wrangler login --device` và làm theo mã xác nhận hiện trên terminal. [Đăng nhập Wrangler](https://developers.cloudflare.com/workers/wrangler/commands/general/)

`npm run deploy:api` dùng [wrangler.jsonc](wrangler.jsonc) để **tạo/triển khai Worker `timbaixe-api`**, nên không cần tạo Worker bằng tay. Sao chép URL Worker mà Wrangler in ra, dạng `https://timbaixe-api.<tài-khoản>.workers.dev`. Lần đầu Worker có thể trả `503 Máy chủ chưa được cấu hình` cho đến khi bạn thêm đủ secrets. [Triển khai Worker](https://developers.cloudflare.com/workers/wrangler/commands/workers/)

Trong **Cloudflare Dashboard → Workers & Pages → timbaixe-api → Settings → Variables and Secrets**, thêm các giá trị sau với loại **Secret**, rồi chọn Deploy. Bạn cũng có thể dùng `npx wrangler secret put <TÊN_BIẾN>` từng biến; lệnh sẽ hỏi giá trị kín trong terminal. [Cấu hình Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)

| Tên biến Worker | Giá trị cần điền |
| --- | --- |
| `SUPABASE_URL` | Project URL của Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Khóa **Secret** `sb_secret_…` của Supabase |
| `ADMIN_USER_ID` | User ID của tài khoản quản trị vừa tạo |
| `RATE_LIMIT_SALT` | Chuỗi ngẫu nhiên dài, riêng cho dự án |
| `ALLOWED_ORIGINS` | Các origin website được gọi API, cách nhau bằng dấu phẩy, ví dụ `https://timbaixe.pages.dev,https://timbaixe.com` |

Nếu cần tạo `RATE_LIMIT_SALT`, chạy `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` trên máy của bạn và sao chép kết quả vào Secret. Không thêm dấu `/` cuối vào `ALLOWED_ORIGINS`. Khi chưa biết URL Pages, bạn có thể thêm bốn Secret đầu trước và cập nhật `ALLOWED_ORIGINS` sau bước 3.

## 3. Tạo hoặc cập nhật website Cloudflare Pages

Mã ứng dụng hiện đã được đẩy lên nhánh **`develop`** của repo `binhvo1003/tim-bai-xe`. Nhánh `main` vẫn chỉ có tài liệu ban đầu và **không có `package.json`**, nên Pages phải triển khai từ `develop` cho đến khi mã được nhập vào `main`.

Nếu chưa có Pages project, trong Cloudflare Dashboard chọn **Workers & Pages → Create application → Pages → Connect to Git**, chọn repo `tim-bai-xe`. Nếu đã có Pages project, mở project đó để sửa cấu hình. [Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/)

Trong **Pages project → Settings → Builds → Branch control**, đặt **Production branch = `develop`** rồi lưu và triển khai lại. Nếu log báo `ENOENT /opt/buildhome/repo/package.json`, kiểm tra trước tiên nhánh đang build: lỗi này xảy ra khi Pages lấy `main`. [Đổi nhánh production trong Cloudflare Pages](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/)

Đặt cấu hình build:

| Mục | Giá trị |
| --- | --- |
| Framework | React (Vite) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Gốc repo |
| `NODE_VERSION` nếu build dùng Node quá cũ | `22.23.4` |

Trong **Pages project → Settings → Environment variables**, đặt các biến **Production** sau rồi triển khai lại Pages. Các biến bắt đầu bằng `VITE_` sẽ nằm trong mã trình duyệt, nên chỉ dùng giá trị công khai ở đây. [Cấu hình build và biến Pages](https://developers.cloudflare.com/pages/configuration/build-configuration/)

| Tên biến Pages | Giá trị cần điền |
| --- | --- |
| `VITE_API_BASE_URL` | URL Worker ở bước 2, không có dấu `/` cuối |
| `VITE_SUPABASE_URL` | Project URL của Supabase |
| `VITE_SUPABASE_ANON_KEY` | Khóa **Publishable** `sb_publishable_…` của Supabase |

Sau lần deploy đầu, ghi lại origin Pages, ví dụ `https://timbaixe.pages.dev`, rồi thêm chính xác origin này vào `ALLOWED_ORIGINS` của Worker. Nếu gắn `timbaixe.com`, thêm cả `https://timbaixe.com` vào biến đó. Chỉ đổi DNS/gắn [custom domain](https://developers.cloudflare.com/pages/configuration/custom-domains/) sau khi bản `pages.dev` đã chạy đúng.

## 4. Kiểm tra trước khi nhập bãi thật

1. Mở `<URL_WORKER>/api/v1/parking.geojson`. Khi chưa duyệt bãi nào, kết quả đúng là `{"type":"FeatureCollection","features":[]}`.
2. Mở URL Pages, vào **Đóng góp**, chạm bản đồ để ghim cổng, điền tên bãi và gửi. Trang phải báo đề xuất đang chờ; bãi **chưa** xuất hiện trong phần tìm kiếm.
3. Vào **Quản trị**, đăng nhập bằng tài khoản Supabase đã tạo. Mở ghim đề xuất, xác nhận tên phường hiện hành rồi chọn **Duyệt bãi**. Tải lại trang: bãi và phường của nó mới xuất hiện công khai. Với bãi thử, chọn **Từ chối** để không đưa dữ liệu giả lên bản đồ.
4. Nếu trình duyệt báo lỗi CORS, kiểm tra `ALLOWED_ORIGINS` khớp origin đang mở và không có dấu `/` cuối. Nếu báo `503`, kiểm tra đủ năm Worker secrets và migration.

## Khi bạn thiết lập xong

Nhắn mình **Project URL của Supabase**, **URL Worker**, **URL Pages** và trạng thái bạn đã tạo tài khoản quản trị/chạy migration hay chưa. Các URL này có thể chia sẻ. **Không gửi** mật khẩu database, mật khẩu quản trị, khóa `sb_secret_…` hay `RATE_LIMIT_SALT` trong chat. Nếu bạn kết nối Supabase với phiên làm việc này và đăng nhập Wrangler trên máy, mình có thể kiểm tra cấu hình và hoàn tất các bước kỹ thuật còn lại.
