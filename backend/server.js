require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDatabase = require("./src/config/db");
const authRoutes = require("./src/routes/auth");
const productRoutes = require("./src/routes/products");
const orderRoutes = require("./src/routes/orders");
const adminRoutes = require("./src/routes/admin");
const User = require("./src/models/User");

const app = express();
const allowedOrigins = (process.env.CLIENT_ORIGINS || "http://localhost:5500,http://127.0.0.1:5500")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    const error = new Error("Origin này chưa được cho phép truy cập API.");
    error.status = 403;
    return callback(error);
  }
}));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => res.status(404).json({ message: "Không tìm thấy đường dẫn API." }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.status || (error.name === "ValidationError" ? 400 : 500);
  if (status >= 500) console.error(error);
  return res.status(status).json({ message: error.message || "Đã xảy ra lỗi máy chủ." });
});

async function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email && !password) return;
  if (!email || !password || password.length < 12) {
    throw new Error("ADMIN_EMAIL và ADMIN_PASSWORD (tối thiểu 12 ký tự) phải được cấu hình cùng nhau.");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    if (existingUser.role !== "admin") {
      existingUser.role = "admin";
      await existingUser.save();
    }
    return;
  }
  await User.create({ name: "Store Admin", email, password, role: "admin" });
  console.log(`Đã tạo tài khoản Admin từ ADMIN_EMAIL=${email}`);
}

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "replace-with-a-long-random-secret") {
    throw new Error("Hãy đặt JWT_SECRET thành một chuỗi bí mật riêng trong backend/.env trước khi khởi động.");
  }
  await connectDatabase();
  await bootstrapAdmin();
  const port = Number(process.env.PORT) || 5000;
  app.listen(port, () => console.log(`Phone Store API đang chạy tại http://localhost:${port}`));
}

if (require.main === module) {
  start().catch((error) => {
    console.error("Không thể khởi động API:", error);
    process.exitCode = 1;
  });
}

module.exports = app;
