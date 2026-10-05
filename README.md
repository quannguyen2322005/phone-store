# Quân Nguyễn mobile store — dự án bán và quản lý điện thoại

Thư mục `frontend/` chứa website khách hàng và trang Admin; `backend/` chứa REST API Express/Mongoose. 

## Yêu cầu

- Node.js 18 trở lên
- MongoDB Community đang chạy cục bộ tại `mongodb://localhost:27017`

## Chạy Backend

Trong terminal:

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Sửa `backend/.env`: thay giá trị mẫu `JWT_SECRET` bằng chuỗi bí mật ngẫu nhiên riêng và điền cả `ADMIN_EMAIL` lẫn `ADMIN_PASSWORD` (tối thiểu 12 ký tự). Backend sẽ tạo tài khoản Admin từ hai biến này khi khởi động; không có mật khẩu Admin mặc định trong mã nguồn.

```powershell
npm run dev
```

API mặc định chạy tại `http://localhost:5000`; kiểm tra bằng `http://localhost:5000/api/health`.

## Chạy Frontend

Mở thư mục `frontend/` bằng VS Code Live Server (mặc định `http://localhost:5500`) hoặc một static web server. CORS mặc định cho phép `localhost:5500` và `127.0.0.1:5500`; chỉnh `CLIENT_ORIGINS` trong `.env` nếu frontend dùng host/port khác. Có thể đổi API URL bằng cách khai báo `window.PHONE_STORE_API_URL` trước `js/api.js`.

- Cửa hàng: `frontend/index.html`
- Chi tiết: `frontend/product-detail.html?id=<productId>`
- Quản lý: `frontend/admin.html`

Đăng nhập Admin bằng thông tin trong `.env`, vào mục **Sản phẩm** và chọn **Thêm dữ liệu mẫu** để tạo 8 điện thoại mẫu. Giỏ hàng dùng `localStorage`; thao tác đặt đơn và cập nhật kho cần Backend/MongoDB đang chạy. Tài khoản khách có API đăng ký tại `POST /api/auth/register`; checkout hiện hỗ trợ đặt hàng không cần tài khoản.

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
