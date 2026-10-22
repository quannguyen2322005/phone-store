# CLAUDE.md — Web quản lý và bán điện thoại

> File này là bản ghi nhớ dự án cho AI. Đọc toàn bộ trước khi làm bất cứ việc gì.
> Cuối mỗi buổi làm việc, cập nhật mục **Tiến độ** và **Ghi chú / vấn đề đang gặp**.

---

## 1. Tổng quan

Website cho cửa hàng điện thoại **QN-Mobiles**, gồm 2 phần:

1. **Trang khách hàng**: xem, tìm kiếm, lọc điện thoại; giỏ hàng; đặt hàng; xem lịch sử đơn.
2. **Trang quản trị (/admin)**: chủ shop và nhân viên quản lý sản phẩm, kho, đơn hàng, khách hàng, doanh thu.

Ngôn ngữ giao diện: **tiếng Việt**. Tiền tệ: **VNĐ**, hiển thị dạng `12.990.000đ`.

---

## 2. Công nghệ

**Backend** (thư mục `/server`)
- Node.js 24+ (LTS), Express.js 4
- MongoDB + Mongoose 8 (ODM)
- bcryptjs: băm mật khẩu
- jsonwebtoken (JWT): xác thực, phân quyền
- dotenv: đọc biến môi trường từ `.env`
- cors: cấu hình CORS (chỉ cho phép domain frontend)
- Nên có: helmet, express-rate-limit, zod (kiểm tra dữ liệu), multer (upload ảnh)

**Frontend** (thư mục `/client`)
- React 19, React Router 7, Vite 6
- Trang khách: CSS riêng (Custom CSS). Sẽ thêm Radix UI (chỉ phần hành vi: giỏ hàng, bộ lọc) ở bước sau, **chưa làm**
- Trang admin: **Mantine 8** (`@mantine/core`, `@mantine/hooks`, `@mantine/notifications`), tải riêng bằng `React.lazy` để khách không phải tải
- Icon: SVG dạng vector
- localStorage: **chỉ** lưu giỏ hàng, cài đặt giao diện (và token nếu chưa chuyển sang cookie httpOnly)

**Công cụ**: Git + GitHub, npm, Postman hoặc Thunder Client để thử API.

---

## 3. Cấu trúc thư mục

```
/
├── CLAUDE.md
├── README.md
├── .gitignore               # phải có: node_modules, .env, uploads
├── server/
│   ├── package.json
│   ├── .env                 # KHÔNG commit
│   ├── .env.example         # commit, chỉ có tên biến, không có giá trị thật
│   └── src/
│       ├── index.js         # khởi động server
│       ├── app.js           # cấu hình Express, middleware, routes
│       ├── config/          # kết nối DB, biến môi trường
│       ├── models/          # User, Product, Brand, Order, Cart (nếu lưu DB)
│       ├── controllers/     # xử lý logic từng chức năng
│       ├── routes/          # định nghĩa endpoint
│       ├── middleware/      # auth, phân quyền, validate, xử lý lỗi
│       └── utils/           # hàm dùng chung (tạo mã đơn, format...)
└── client/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx          # khai báo route
        ├── api/             # hàm gọi API (một chỗ duy nhất)
        ├── components/      # thành phần dùng lại (Header, ProductCard...)
        ├── pages/           # trang khách và trang admin
        ├── context/         # AuthContext, CartContext
        ├── hooks/
        ├── styles/          # CSS
        └── assets/icons/    # SVG
```

---

## 4. Vai trò và phân quyền

| Vai trò | Quyền |
|---|---|
| `customer` | Xem sản phẩm, giỏ hàng, đặt hàng, xem/hủy đơn của mình, sửa hồ sơ |
| `staff` | Xem và xử lý đơn hàng, cập nhật tồn kho, xem sản phẩm |
| `admin` | Toàn quyền: sản phẩm, kho, đơn, khách hàng, nhân viên, báo cáo doanh thu |

Quy tắc:
- Kiểm tra quyền **ở server** bằng middleware (`requireAuth`, `requireRole('admin')`). Ẩn nút ở frontend chỉ là phụ, không thay thế được.
- Người dùng tự đăng ký luôn là `customer`. Chỉ admin mới tạo/đổi role `staff`, `admin`.

---

## 5. Mô hình dữ liệu (Mongoose)

**User**: `name`, `email` (unique), `phone`, `passwordHash`, `role` (customer|staff|admin), `addresses[]`, `isActive`, `createdAt`

**Brand**: `name` (unique), `slug`, `logo`

**Product** (một mẫu điện thoại)
- `name`, `slug`, `brand` (ref Brand), `description`, `images[]`
- `specs`: màn hình, chip, RAM, camera, pin, hệ điều hành...
- `variants[]`: mỗi biến thể gồm `sku`, `storage` (128GB...), `color`, `price`, `salePrice`, `stock`
- `isActive`, `createdAt`

**Order**
- `orderCode` (ví dụ DH20261009-0001), `user` (ref User), `customerInfo` (tên, sđt, địa chỉ giao)
- `items[]`: `product`, `variantSku`, `name`, `color`, `storage`, `price` (giá tại thời điểm mua), `quantity`
- `totalAmount`, `paymentMethod` (cod|bank_transfer), `paymentStatus` (unpaid|paid)
- `status`: `pending` → `confirmed` → `shipping` → `completed`, hoặc `cancelled`
- `note`, `createdAt`, `updatedAt`

Giỏ hàng: lưu trong **localStorage** ở frontend (chỉ giữ productId, variantSku, quantity). Khi đặt hàng, server tự lấy giá thật từ DB.

---

## 6. API (tiền tố `/api`)

**Xác thực**
- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`

**Công khai**
- `GET /products` (hỗ trợ `?brand=&minPrice=&maxPrice=&search=&sort=&page=`)
- `GET /products/:slug`, `GET /brands`

**Khách hàng** (cần đăng nhập)
- `POST /orders` (tạo đơn), `GET /orders/my`, `GET /orders/my/:id`, `PATCH /orders/my/:id/cancel` (chỉ khi `pending`)
- `PATCH /users/me` (sửa hồ sơ)

**Quản trị** (`admin`, một số cho `staff`)
- Sản phẩm: `POST/PUT/DELETE /admin/products`, upload ảnh
- Kho: `PATCH /admin/products/:id/variants/:sku/stock`
- Đơn: `GET /admin/orders`, `PATCH /admin/orders/:id/status`
- Khách và nhân viên: `GET /admin/users`, `PATCH /admin/users/:id`
- Báo cáo: `GET /admin/reports/revenue?from=&to=`, `GET /admin/reports/top-products`

Định dạng lỗi thống nhất: `{ "message": "Mô tả lỗi bằng tiếng Việt" }` kèm mã HTTP đúng (400, 401, 403, 404, 500).

---

## 7. Quy tắc nghiệp vụ (bắt buộc tuân thủ)

1. **Giá và tổng tiền luôn tính ở server**, lấy từ DB. Không bao giờ tin giá frontend gửi lên.
2. Khi tạo đơn: kiểm tra `stock` đủ, **trừ kho cùng lúc** (dùng cập nhật nguyên tử, ví dụ `findOneAndUpdate` với điều kiện `stock >= quantity`) để tránh bán quá số lượng khi nhiều người đặt cùng lúc.
3. Hủy đơn (khi chưa giao): **cộng lại kho**.
4. Đơn đã `completed` hoặc `cancelled` thì không được đổi trạng thái nữa.
5. `OrderItem` lưu **bản sao** tên và giá tại thời điểm mua, để sửa giá sau này không làm sai đơn cũ.
6. Xóa sản phẩm: ưu tiên **ẩn** (`isActive=false`) thay vì xóa hẳn nếu đã có trong đơn hàng.
7. Doanh thu chỉ tính các đơn `completed`.

---

## 8. Bảo mật

- Mật khẩu băm bằng **bcryptjs** (salt rounds ≥ 10), không bao giờ trả `passwordHash` ra API.
- JWT có thời hạn (ví dụ 7 ngày), khóa bí mật lấy từ `.env` (`JWT_SECRET`), đủ dài và ngẫu nhiên.
- Token: ghi chú, localStorage dùng được cho giai đoạn đầu; **nên chuyển sang cookie httpOnly** khi đưa lên dùng thật.
- CORS: chỉ cho phép domain frontend (`CLIENT_URL`), không để `*` khi chạy thật.
- Dùng `helmet`, `express-rate-limit` (đặc biệt cho `/auth/login`), kiểm tra dữ liệu đầu vào bằng `zod`.
- Không ghi mật khẩu, token, chuỗi kết nối DB vào code hay log.
- Upload ảnh: giới hạn dung lượng và chỉ nhận jpg/png/webp.

---

## 9. Biến môi trường

File `server/.env` (không commit):
```
PORT=5000
MONGODB_URI=
JWT_SECRET=
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```
File `client/.env`:
```
VITE_API_URL=http://localhost:5000/api
```
Luôn cập nhật `.env.example` khi thêm biến mới.

---

## 10. Các trang giao diện

**Khách**: Trang chủ, Danh sách sản phẩm (lọc, tìm kiếm, sắp xếp, phân trang), Chi tiết sản phẩm (chọn dung lượng/màu), Giỏ hàng, Thanh toán/Đặt hàng, Đăng nhập/Đăng ký, Tài khoản, Đơn hàng của tôi.

**Admin** (`/admin/*`): Tổng quan (doanh thu, đơn mới, sắp hết hàng), Sản phẩm, Thương hiệu, Kho, Đơn hàng, Khách hàng, Nhân viên (chỉ admin), Báo cáo.

Yêu cầu giao diện: dùng tốt trên điện thoại, có trạng thái đang tải và thông báo lỗi rõ ràng, xác nhận trước khi xóa.

---

## 11. Quy ước code

- Đặt tên biến, hàm bằng tiếng Anh; thông báo hiển thị cho người dùng bằng tiếng Việt.
- Backend theo mô hình route → controller → model; không viết logic dài trong route.
- Mọi lời gọi API ở frontend đi qua thư mục `client/src/api/`.
- Dùng `async/await` và bắt lỗi bằng try/catch hoặc middleware xử lý lỗi chung.
- Thêm chú thích ngắn cho đoạn logic khó (trừ kho, tính tiền, phân quyền).
- Không cài thêm thư viện mới khi chưa hỏi tôi, nói rõ lý do nếu đề xuất.

---

## 12. Cách làm việc với AI

- Mỗi lần chỉ làm **một tính năng nhỏ**, xong thì dừng và nói cách kiểm tra.
- Chỉ sửa file liên quan, **không** tự ý đổi cấu trúc thư mục, schema database hay đổi tên hàng loạt.
- Trước khi sửa lớn, tóm tắt kế hoạch cho tôi duyệt.
- Gặp lỗi: giải thích nguyên nhân bằng tiếng Việt dễ hiểu rồi mới sửa.
- Không bịa thư viện hay hàm; không chắc thì nói rõ.
- Sau mỗi bước chạy được, nhắc tôi commit (gợi ý sẵn message).
- Cuối buổi: cập nhật file này.

Lệnh chạy từ thư mục gốc dự án (Node.js 24+):
```
cd frontend && npm ci && npm run dev        # giao diện Vite, mặc định http://localhost:5173
cd backend && npm ci && npm run start:local # build frontend + API, http://localhost:5000 (Windows)
```

---

## 13. Tiến độ

- [x] Khởi tạo `/server` và `/client`, kết nối MongoDB, chạy được cả hai
- [x] Model User + đăng ký/đăng nhập (bcryptjs + JWT), middleware phân quyền
- [ ] Model Brand, Product + CRUD (admin) + upload ảnh
- [x] Trang danh sách và chi tiết sản phẩm (khách), lọc/tìm kiếm
- [x] Giỏ hàng (localStorage) + trang đặt hàng
- [x] API tạo đơn: tính tiền ở server, trừ kho nguyên tử
- [ ] Đơn hàng của tôi + hủy đơn (cộng lại kho)
- [x] Trang admin: quản lý đơn hàng và đổi trạng thái
- [ ] Trang admin: quản lý kho, cảnh báo sắp hết hàng
- [ ] Quản lý khách hàng và nhân viên
- [ ] Báo cáo doanh thu
- [ ] Bảo mật: helmet, rate limit, validate, rà soát lại `.env`
- [ ] Deploy (frontend + backend + MongoDB Atlas)
- [x] Admin đăng nhập bằng JWT MongoDB + protected routes
- [x] Rà soát input API, giới hạn mật khẩu bcrypt, bỏ CSS admin cũ không còn dùng

---

## 14. Ghi chú / vấn đề đang gặp

(Cập nhật dần. Ví dụ: quyết định đã chốt, lỗi chưa sửa, việc cần hỏi lại.)

### Hiện trạng thực tế của code (cập nhật 10/10/2026)

Code đang chạy **khác** mục 3, 5, 6, 9 ở trên. Khi sửa code, **theo code thực tế**, không tự đổi cấu trúc cho giống tài liệu (xem mục 12). Muốn chuyển sang cấu trúc ở mục 3 thì phải hỏi tôi trước.

- **Thư mục:** `backend/` (thay cho `/server`) và `frontend/` (thay cho `/client`). Backend chưa có `controllers/`, logic nằm thẳng trong `backend/src/routes/`; API test ở `backend/test/`. `frontend/src/App.jsx` giữ routes, layout và trạng thái chung; storefront được tách vào `frontend/src/components/`, `frontend/src/pages/`, `frontend/src/hooks/` và `frontend/src/lib/`. CSS ở `frontend/css/styles.css`, gọi API qua `frontend/src/api.js`. Trang admin tách riêng ở `frontend/src/pages/AdminPage.jsx` (Mantine); hàm `money` dùng chung ở `frontend/src/format.js`.
- **Lệnh chạy:** cài dependency bằng `npm ci` ở cả `frontend/` và `backend/` để dùng đúng lockfile. Chạy toàn bộ trên Windows từ `backend/`: `npm run start:local`, rồi mở `http://localhost:5000` (admin ở `/admin`). Dev giao diện riêng: `cd frontend && npm run dev` trong cửa sổ terminal khác; backend vẫn cần chạy để API hoạt động.
- **Biến môi trường backend:** `PORT`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGINS`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (>= 12 ký tự, tạo/nâng tài khoản MongoDB admin lúc khởi động). Không dùng `CLIENT_URL` và `JWT_EXPIRES_IN` (JWT hết hạn sau 12 giờ). Frontend dùng `VITE_API_BASE_URL`.
- **Xác thực admin:** đăng nhập bằng email/mật khẩu MongoDB, backend cấp JWT và kiểm tra quyền `admin` từ MongoDB; protected routes xác minh phiên qua `/api/auth/me`.
- **Dữ liệu khác mục 5:**
  - `User.role` chỉ có `admin` và `customer` (chưa có `staff`); trường mật khẩu tên `password` (đã băm).
  - Chưa có model `Brand`; `Product.brand` là enum cố định (APPLE, SAMSUNG, XIAOMI, OPPO, ONEPLUS, VIVO, GOOGLE). Chưa có `slug`, dùng `_id`.
  - Mỗi biến thể có `price` và `originalPrice` (không có `salePrice`, `sku`); khóa biến thể là `_id`. `Product.salePrice`, `originalPrice`, `stock` do server **tự tính** từ các biến thể (không nhập tay).
  - `Order.status`: `pending`, `shipping`, `completed`, `cancelled` (chưa có `confirmed`). `paymentMethod`: `COD` hoặc `QR`. Chưa có `orderCode` và đơn chưa gắn với `user` (khách đặt không cần đăng nhập).
- **API thực tế:** `/api/auth/*`, `/api/products` (GET công khai; POST/PATCH/DELETE và `POST /products/seed` cho admin), `POST /api/orders` (công khai), `GET /api/orders` và `PATCH /api/orders/:id/status` (admin), `GET /api/admin/overview`. Chưa có: `/orders/my`, `/users/me`, upload ảnh, quản lý user/nhân viên, báo cáo doanh thu.
- **Đã làm 10/10/2026 (bước 1 thư viện UI):** viết lại trang Admin bằng Mantine: bảng, phân trang, thông báo, hộp xác nhận (xóa sản phẩm, hủy đơn), form sản phẩm có bảng phiên bản thay cho ô nhập JSON (giữ nguyên `_id` phiên bản để đơn cũ vẫn hoàn kho được). Đơn `completed` hoặc `cancelled` không còn ô đổi trạng thái. Đã cập nhật lockfile frontend để khớp các gói Mantine; build frontend đã chạy thành công ngày 14/10/2026.
- **Đã sửa 10/10/2026:** admin phân trang sản phẩm và đơn (20/trang); đổi trạng thái đơn nguyên tử để hủy đơn chỉ hoàn kho một lần (có hoàn tác nếu lỗi giữa chừng); giá bán tự tính từ biến thể rẻ nhất; `POST /products` chỉ nhận trường cho phép (giống PATCH); bỏ các số liệu và ưu đãi sai sự thật ở trang chủ.

### Việc còn tồn đọng

- Bảo mật: helmet và rate limit đã bật cho API, login, register, đặt hàng và tra cứu đơn. JWT admin vẫn lưu trong `localStorage`; chưa dùng schema validation library.
- Cần thêm index cho `Order` (`createdAt`, `status`, `items.product`).
- Giỏ hàng kiểm tra lại giá và tồn kho với server khi tải app/mở giỏ; khách có thể tra cứu đơn bằng mã và số điện thoại.
- Chưa có: upload ảnh, tích hợp tạo QR/ngân hàng thật, cổng thanh toán.
- Code: storefront đã được tách thành pages/components/hooks/lib; có test API cho xác thực, đặt/hủy đơn và hoàn kho, test frontend cho helper và CartDrawer. CSS admin cũ đã được xóa sau khi xác nhận không còn caller.
- Thư viện UI bước 2: thêm Radix UI cho giỏ hàng (Dialog) và bộ lọc, giữ CSS riêng của trang khách.
- Nội dung cần chủ shop xác nhận có đúng chính sách thật không: "Nhận máy trong ngày", "Đổi trả 30 ngày", "Hỗ trợ trả góp linh hoạt", các banner "Trả góp 0%", "Ưu đãi đến 3 triệu", "Quà tặng đến 2 triệu"; địa chỉ cửa hàng chưa có; ảnh banner đang lấy từ Unsplash.

### Kiểm tra CI/CD và chạy local (14/10/2026)

- Workflow duy nhất là `.github/workflows/ci.yml`. Workflow chạy khi push hoặc mở pull request vào `main`/`master`; cài backend/frontend, chạy lint và test, build frontend, khởi động MongoDB và API, rồi chạy smoke test đăng nhập admin, thêm dữ liệu mẫu, đọc sản phẩm/tổng quan admin và xác nhận các route trả HTML.
- Đã đồng bộ runtime về Node 24: `engines` của cả hai package là `>=24`; CI dùng Node 24 và cache dựa trên cả hai lockfile; README hướng dẫn cài dependencies đúng thứ tự.
- **Chưa có CD:** workflow không deploy lên hosting. README cũng ghi rõ deploy hiện làm riêng.
- Đã xác minh tại máy local với Node 24.21.0/npm 11.19.0: `npm ci --dry-run --offline` thành công ở cả `backend/` và `frontend/`; `npm run build` frontend thành công; kiểm tra cú pháp các file JavaScript backend thành công; `/api/health` trả `ok` và API sản phẩm trả 50 sản phẩm.
- CI kiểm tra luồng đặt/hủy đơn, hoàn kho và component CartDrawer bằng test tự động. Smoke test route frontend vẫn chỉ xác nhận server trả HTML chứa `#root`.
- Chưa chạy workflow trên GitHub Actions trong lần rà soát này; các xác minh nêu trên là tại môi trường local.
- Ảnh sản phẩm: đã thêm ảnh local cho các mẫu trong `frontend/public/images/products/`; ảnh banner vẫn dùng Unsplash.

### Rà soát Ponytail (17/10/2026)

- Đã chuyển trang admin về MongoDB Auth/JWT, bỏ Supabase Auth khỏi luồng frontend.
- Đã giới hạn input xác thực/đơn hàng, xử lý query tìm kiếm sai kiểu và tránh trả lỗi nội bộ HTTP 500 cho client. `.env.local` đã được Git bỏ qua.
- Đã xóa CSS admin cũ không còn được dùng, giảm CSS storefront build từ 42.14 KB xuống 37.62 KB (gzip 8.34 KB xuống 7.54 KB).
- Build frontend và kiểm tra cú pháp backend thành công. Chưa chạy test end-to-end hoặc workflow GitHub Actions.
- Việc cần xem xét trước deploy công khai: giao dịch/khôi phục kho khi process dừng giữa lúc đặt hoặc hủy đơn; mở rộng test cho cạnh tranh cập nhật kho.

### Công cụ chất lượng và lệnh kiểm tra (22/10/2026)

- Cả hai package có `npm run lint` và `npm run format`; frontend có `npm test` bằng Vitest/Testing Library, backend có `npm test` bằng `node:test`.
- Backend test chỉ dùng MongoDB loopback và database riêng `qn_mobiles_node_test`, sau đó xóa database test. Không dùng URI production để chạy test.
- Chạy frontend: `cd frontend; npm run lint; npm test; npm run build`. Chạy backend: `cd backend; npm run build; npm run lint; npm test` (build kiểm tra cú pháp entrypoint, test cần MongoDB cục bộ).
# Instructions for Codex Agent

- **Language Requirement**: Always output all thinking, reasoning processes, status updates, and action descriptions in Vietnamese.
