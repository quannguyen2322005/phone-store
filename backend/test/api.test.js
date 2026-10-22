const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { after, before, test } = require("node:test");
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Product = require("../src/models/Product");
const Order = require("../src/models/Order");

let app;
let server;
let baseUrl;
let product;
let customerToken;
let adminToken;
let createdOrderId;
let variantId;
const testId = crypto.randomBytes(5).toString("hex");
const customerEmail = `customer-${testId}@example.test`;
const adminEmail = `admin-${testId}@example.test`;
const customerPassword = `Customer-${testId}-Aa1!`;
const adminPassword = `Admin-${testId}-Aa1!`;

function testDatabaseUri(uri) {
  const match = uri.match(/^(mongodb:\/\/(?:[^/@]+@)?(?:localhost|127\.0\.0\.1)(?::\d+)?)(?:\/[^?]*)?(\?.*)?$/i);
  if (!match) throw new Error("Test API chỉ chạy với MongoDB cục bộ để tránh xóa nhầm dữ liệu từ xa.");
  return `${match[1]}/qn_mobiles_node_test${match[2] || ""}`;
}

async function send(path, { method = "GET", body, token } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { response, data: await response.json() };
}

async function createOrder(quantity) {
  return send("/api/orders", {
    method: "POST",
    body: {
      customer: { name: "Khách kiểm thử", phone: "0901234567", address: "Địa chỉ kiểm thử" },
      items: [{ productId: String(product._id), variantId, quantity }],
      deliveryMethod: "delivery",
      paymentMethod: "COD",
    },
  });
}

before(async () => {
  require("dotenv").config();
  const configuredUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/phone_store";
  // Database cố định chỉ ở loopback để dropDatabase không thể chạm dữ liệu cửa hàng hoặc MongoDB từ xa.
  process.env.MONGODB_URI = testDatabaseUri(configuredUri);
  process.env.JWT_SECRET ||= crypto.randomBytes(32).toString("hex");

  app = require("../server");
  const connectDatabase = require("../src/config/db");
  await connectDatabase();
  await mongoose.connection.dropDatabase();
  await Promise.all([User.syncIndexes(), Product.syncIndexes(), Order.syncIndexes()]);

  await User.create({ name: "Quản trị kiểm thử", email: adminEmail, password: adminPassword, role: "admin" });
  product = await Product.create({
    name: "Điện thoại kiểm thử",
    brand: "APPLE",
    variants: [{ storage: "128GB", color: "Đen", price: 5000000, originalPrice: 5000000, stock: 5 }],
  });
  variantId = String(product.variants[0]._id);

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

test("đăng ký, đăng nhập sai và đăng nhập đúng", async () => {
  const registration = await send("/api/auth/register", {
    method: "POST",
    body: { name: "Khách kiểm thử", email: customerEmail, password: customerPassword },
  });
  assert.equal(registration.response.status, 201);
  assert.equal(registration.data.user.email, customerEmail);

  const wrongLogin = await send("/api/auth/login", {
    method: "POST",
    body: { email: customerEmail, password: "Sai-mat-khau" },
  });
  assert.equal(wrongLogin.response.status, 401);
  assert.equal(wrongLogin.data.message, "Email hoặc mật khẩu chưa chính xác.");

  const customerLogin = await send("/api/auth/login", {
    method: "POST",
    body: { email: customerEmail, password: customerPassword },
  });
  assert.equal(customerLogin.response.status, 200);
  customerToken = customerLogin.data.token;

  const adminLogin = await send("/api/auth/login", {
    method: "POST",
    body: { email: adminEmail, password: adminPassword },
  });
  assert.equal(adminLogin.response.status, 200);
  adminToken = adminLogin.data.token;
});

test("khách hàng không có quyền truy cập API quản trị", async () => {
  const result = await send("/api/admin/overview", { token: customerToken });
  assert.equal(result.response.status, 403);
  assert.deepEqual(result.data, { message: "Bạn không có quyền quản trị." });
});

test("tạo đơn trừ đúng số lượng tồn kho", async () => {
  const result = await createOrder(2);
  assert.equal(result.response.status, 201);
  assert.match(result.data.order.code, /^[A-HJ-NP-Z2-9]{8}$/);
  assert.equal(result.data.order.total, 10000000);
  createdOrderId = result.data.order._id;

  const updatedProduct = await Product.findById(product._id);
  assert.equal(updatedProduct.stock, 3);
  assert.equal(updatedProduct.variants.id(variantId).stock, 3);
});

test("đơn vượt tồn kho trả 409 và không đổi kho", async () => {
  const result = await createOrder(4);
  assert.equal(result.response.status, 409);
  const updatedProduct = await Product.findById(product._id);
  assert.equal(updatedProduct.stock, 3);
  assert.equal(updatedProduct.variants.id(variantId).stock, 3);
});

test("hủy đơn hoàn kho đúng một lần", async () => {
  const cancel = () =>
    send(`/api/orders/${createdOrderId}/status`, {
      method: "PATCH",
      token: adminToken,
      body: { status: "cancelled" },
    });

  const firstCancellation = await cancel();
  assert.equal(firstCancellation.response.status, 200);
  assert.equal(firstCancellation.data.order.status, "cancelled");
  let updatedProduct = await Product.findById(product._id);
  assert.equal(updatedProduct.stock, 5);
  assert.equal(updatedProduct.variants.id(variantId).stock, 5);

  const repeatedCancellation = await cancel();
  assert.equal(repeatedCancellation.response.status, 200);
  updatedProduct = await Product.findById(product._id);
  assert.equal(updatedProduct.stock, 5);
  assert.equal(updatedProduct.variants.id(variantId).stock, 5);
});
