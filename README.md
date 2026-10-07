# Quân Nguyễn mobile store — dự án bán và quản lý điện thoại

Thư mục `frontend/` chứa website khách hàng và trang Admin; `backend/` chứa REST API Express/Mongoose. 

## Yêu cầu

- Node.js 18 trở lên
- MongoDB Community đang chạy cục bộ tại `mongodb://localhost:27017`

## Chạy toàn bộ hệ thống local

Không cần deploy hoặc đưa source code lên Internet. Website, API và MongoDB có thể chạy trên máy cá nhân.

Trong PowerShell:

```powershell
cd backend
cd frontend
npm install
cd ..\backend
npm install
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

Đăng nhập Admin bằng thông tin trong `.env`. Trong mục **Sản phẩm**, chọn **Thêm dữ liệu mẫu** để thêm danh mục 50 điện thoại demo thuộc Apple, Samsung, Xiaomi, OPPO, OnePlus, vivo và Google Pixel. Thao tác có thể chạy lại an toàn, không ghi đè sản phẩm hiện có. Giỏ hàng và danh sách yêu thích dùng `localStorage`; đặt đơn và cập nhật kho cần backend cùng MongoDB đang chạy.

Tuỳ chọn: chạy API riêng bằng `npm run dev`, rồi mở `frontend/` bằng VS Code Live Server. Nếu Live Server dùng cổng `5500`, cho phép origin đó trong `CLIENT_ORIGINS` ở `.env`.

Workflow GitHub Actions chỉ chạy kiểm thử CI, không tự deploy ứng dụng lên cloud. Chạy local không yêu cầu push code hoặc tài khoản hosting.

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
