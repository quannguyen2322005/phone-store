# QN-Mobiles — dự án bán và quản lý điện thoại

Thư mục `frontend/` chứa website khách hàng và trang Admin; `backend/` chứa REST API Express/Mongoose.

## Yêu cầu

- Node.js 24 trở lên (LTS)
- MongoDB Community đang chạy cục bộ tại `mongodb://localhost:27017`

## Chạy toàn bộ hệ thống local

Không cần deploy hoặc đưa source code lên Internet. Website, API và MongoDB có thể chạy trên máy cá nhân.

Trong PowerShell:

```powershell
cd frontend
npm ci
cd ..\backend
npm ci
```

Nếu chưa có file `backend/.env`, tạo file từ mẫu:

```powershell
Copy-Item .env.example .env
```

Trong `backend/.env`, đặt `MONGODB_URI=mongodb://localhost:27017/phone_store`, một `JWT_SECRET` riêng, cùng `ADMIN_EMAIL` và `ADMIN_PASSWORD` (tối thiểu 12 ký tự). Không dùng giá trị mẫu của `.env.example` và không commit file `.env`. Backend tạo tài khoản Admin khi khởi động. Đảm bảo MongoDB Community đang chạy cục bộ.

Khởi chạy API và giao diện cùng lúc:

```powershell
npm run start:local
```

Mở `http://localhost:5000` cho cửa hàng hoặc `http://localhost:5000/admin` cho trang quản trị. Lệnh khởi động sẽ build frontend React rồi để Express phục vụ bản build. Kiểm tra API tại `http://localhost:5000/api/health`; dừng server bằng `Ctrl+C`.

Frontend được xây dựng bằng React, Vite và React Router. Để phát triển giao diện với Vite riêng, mở thêm một cửa sổ PowerShell:

```powershell
cd frontend
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal; Vite chuyển tiếp các yêu cầu `/api` đến backend tại `http://localhost:5000`. Backend vẫn phải chạy và kết nối được MongoDB. Khi deploy frontend độc lập lên Vercel, đặt thư mục gốc là `frontend`, lệnh build là `npm run build`, thư mục đầu ra là `dist`; có thể cấu hình `VITE_API_BASE_URL` nếu API không dùng URL Render mặc định. Với frontend khác origin trên Vercel, thêm domain frontend vào `CLIENT_ORIGINS` trong cấu hình backend để API chấp nhận CORS.

### Ảnh cho danh mục sản phẩm mẫu

Đặt ảnh chụp sản phẩm vào `frontend/public/images/products/`. Tên file dùng tên mẫu viết thường, thay khoảng trắng bằng dấu gạch ngang và dấu `+` bằng `plus`, ví dụ `iphone-17-pro-max.webp`, `samsung-galaxy-s25-plus.jpg`, `redmi-note-14-pro-plus-5g.webp` hoặc `google-pixel-9-pro-xl.png`. Hỗ trợ `.webp`, `.jpg`, `.jpeg` và `.png`. Mỗi mẫu dùng một tên file riêng; nếu chưa có ảnh, website tạm hiển thị ảnh mẫu cũ. Sau khi thêm ảnh, đăng nhập Admin và chọn **Thêm dữ liệu mẫu** để cập nhật các sản phẩm mẫu hiện có trong MongoDB. Thao tác này chỉ thay ảnh mẫu dùng chung trước đây, không ghi đè ảnh tùy chỉnh khác.

Trang quản trị dùng tài khoản MongoDB. Đặt `ADMIN_EMAIL` và `ADMIN_PASSWORD` trong `backend/.env`; backend tạo hoặc nâng tài khoản đó lên Admin khi khởi động. Đăng nhập tại `/login` bằng email và mật khẩu này. Mật khẩu được lưu dạng bcrypt trong MongoDB; API xác thực bằng JWT.

Sau khi đăng nhập Admin, trong mục **Sản phẩm**, chọn **Thêm dữ liệu mẫu** để thêm danh mục 50 điện thoại demo thuộc Apple, Samsung, Xiaomi, OPPO, OnePlus, vivo và Google Pixel. Thao tác có thể chạy lại an toàn, không ghi đè sản phẩm hiện có. Giỏ hàng và danh sách yêu thích dùng `localStorage`; đặt đơn và cập nhật kho cần backend cùng MongoDB đang chạy.

Tuỳ chọn: chạy API riêng bằng `npm run dev`, rồi mở `frontend/` bằng VS Code Live Server. Nếu Live Server dùng cổng `5500`, cho phép origin đó trong `CLIENT_ORIGINS` ở `.env`.

## Cấu trúc mã nguồn và kiểm tra chất lượng

- `frontend/src/App.jsx`: route, layout chung và trạng thái cart/toast.
- `frontend/src/components/`: header, footer, giỏ hàng, hero, thẻ và ảnh sản phẩm, icon.
- `frontend/src/pages/`: trang danh sách, chi tiết, giới thiệu, đăng nhập/đăng ký, tra cứu đơn và Admin.
- `frontend/src/hooks/`: hook giỏ hàng và số lượng trên header; `frontend/src/lib/`: đọc localStorage, đường dẫn ảnh và dữ liệu dùng chung.
- `backend/src/routes/`: các API Express; `backend/test/api.test.js`: kiểm thử API và kho hàng.

Chạy công cụ chất lượng từ từng package:

```powershell
cd backend
npm run build
npm run lint
npm test
npm run format

cd ..\frontend
npm run lint
npm test
npm run build
npm run format
```

Backend chạy CommonJS trực tiếp nên `npm run build` kiểm tra cú pháp entrypoint bằng Node. Backend test cần MongoDB cục bộ. Test chỉ kết nối `localhost`/`127.0.0.1`, dùng database riêng `qn_mobiles_node_test` và xóa database này khi chạy; không cấu hình test với MongoDB production. `npm run format` dùng Prettier ghi định dạng lại các file JavaScript/JSX trong package.

Workflow GitHub Actions chạy lint, test backend/frontend, build frontend, sau đó giữ nguyên smoke test đăng nhập Admin, dữ liệu mẫu, API và các route HTML. Workflow chỉ kiểm thử CI, không tự deploy ứng dụng lên cloud. Chạy local không yêu cầu push code hoặc tài khoản hosting.

## API chính

| Method | Endpoint | Quyền |
|---|---|---|
| GET | `/api/products?page=1&limit=12&brand=APPLE&minPrice=1000000&maxPrice=40000000&ram=12&storage=256GB&sort=price_asc` | Công khai |
| GET | `/api/products/:id` | Công khai |
| POST | `/api/products/seed` | Admin |
| POST / PATCH / DELETE | `/api/products[/:id]` | Admin |
| POST | `/api/orders` | Công khai |
| GET | `/api/orders` | Admin |
| PATCH | `/api/orders/:id/status` | Admin |
| POST | `/api/auth/register`, `/api/auth/login` | Công khai |
| GET | `/api/admin/overview` | Admin |

Các trạng thái đơn hàng dùng API là `pending`, `shipping`, `completed`, `cancelled`; phương thức nhận hàng là `delivery` hoặc `pickup`, thanh toán là `COD` hoặc `QR`. Chọn QR hiện ghi nhận phương thức thanh toán; tích hợp tạo mã QR/ngân hàng là bước tiếp theo, chưa có cổng thanh toán trong scaffold này.
