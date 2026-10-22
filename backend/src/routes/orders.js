const express = require("express");
const crypto = require("crypto");
const { rateLimit } = require("express-rate-limit");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
const statuses = ["pending", "shipping", "completed", "cancelled"];
const ORDER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ORDER_CODE_LENGTH = 8;
const ORDER_CODE_ATTEMPTS = 5;
const ORDER_RATE_LIMIT = { windowMs: 60 * 60 * 1000, limit: 10 };
const ORDER_LOOKUP_RATE_LIMIT = { windowMs: 15 * 60 * 1000, limit: 20 };
const orderRateLimit = rateLimit({
  ...ORDER_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Bạn gửi yêu cầu quá nhanh. Vui lòng thử lại sau." }
});
const orderLookupRateLimit = rateLimit({
  ...ORDER_LOOKUP_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Bạn đã tra cứu quá nhiều lần. Vui lòng thử lại sau." }
});

function generateOrderCode() {
  return Array.from({ length: ORDER_CODE_LENGTH }, () =>
    ORDER_CODE_ALPHABET[crypto.randomInt(ORDER_CODE_ALPHABET.length)]
  ).join("");
}

async function createOrderWithCode(orderData) {
  for (let attempt = 0; attempt < ORDER_CODE_ATTEMPTS; attempt += 1) {
    try {
      return await Order.create({ ...orderData, code: generateOrderCode() });
    } catch (error) {
      const codeCollision = error.code === 11000 && (error.keyPattern?.code || error.keyValue?.code);
      if (!codeCollision || attempt === ORDER_CODE_ATTEMPTS - 1) throw error;
    }
  }
  throw new Error("Không thể tạo mã đơn hàng.");
}

router.post("/", orderRateLimit, asyncHandler(async (req, res) => {
  const { customer, items, deliveryMethod, paymentMethod, note } = req.body;
  const customerName = typeof customer?.name === "string" ? customer.name.trim() : "";
  const customerPhone = typeof customer?.phone === "string" ? customer.phone.trim() : "";
  const customerEmail = typeof customer?.email === "string" ? customer.email.trim() : "";
  const customerAddress = typeof customer?.address === "string" ? customer.address.trim() : "";
  const phoneDigits = customerPhone.replace(/\D/g, "").length;
  if (!customerName || customerName.length > 100 || !/^[+()\d\s.-]{8,20}$/.test(customerPhone) ||
      phoneDigits < 8 || phoneDigits > 15) {
    return res.status(400).json({ message: "Vui lòng nhập họ tên và số điện thoại hợp lệ." });
  }
  if ((customer?.email != null && typeof customer.email !== "string") || customerEmail.length > 254 ||
      (customer?.address != null && typeof customer.address !== "string") || customerAddress.length > 300) {
    return res.status(400).json({ message: "Email hoặc địa chỉ nhận hàng không hợp lệ." });
  }
  if (!["delivery", "pickup"].includes(deliveryMethod) || !["COD", "QR"].includes(paymentMethod)) {
    return res.status(400).json({ message: "Phương thức nhận hàng hoặc thanh toán không hợp lệ." });
  }
  if (deliveryMethod === "delivery" && !customerAddress) {
    return res.status(400).json({ message: "Vui lòng nhập địa chỉ nhận hàng." });
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
    return res.status(400).json({ message: "Giỏ hàng không hợp lệ." });
  }

  const requested = new Map();
  for (const item of items) {
    if (!item || typeof item !== "object") {
      return res.status(400).json({ message: "Thông tin sản phẩm trong giỏ hàng không hợp lệ." });
    }
    if (!mongoose.isValidObjectId(item.productId) || !mongoose.isValidObjectId(item.variantId)) {
      return res.status(400).json({ message: "Sản phẩm hoặc phiên bản không hợp lệ." });
    }
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      return res.status(400).json({ message: "Số lượng mỗi phiên bản phải từ 1 đến 10." });
    }
    const key = `${item.productId}:${item.variantId}`;
    requested.set(key, (requested.get(key) || 0) + quantity);
  }
  for (const quantity of requested.values()) {
    if (quantity > 10) return res.status(400).json({ message: "Tổng số lượng mỗi phiên bản không được vượt quá 10." });
  }

  const reserved = [];
  const orderItems = [];
  try {
    for (const [key, quantity] of requested) {
      const [productId, variantId] = key.split(":");
      const product = await Product.findOneAndUpdate(
        { _id: productId, stock: { $gte: quantity }, variants: { $elemMatch: { _id: variantId, stock: { $gte: quantity } } } },
        { $inc: { stock: -quantity, "variants.$.stock": -quantity } },
        { new: true }
      );
      if (!product) {
        const error = new Error("Một sản phẩm vừa hết hàng hoặc không đủ số lượng. Vui lòng tải lại giỏ hàng.");
        error.status = 409;
        throw error;
      }
      reserved.push({ productId, variantId, quantity });
      const variant = product.variants.id(variantId);
      orderItems.push({
        product: product._id,
        productName: product.name,
        image: variant.image || product.images[0] || "",
        variantId: variant._id,
        storage: variant.storage,
        color: variant.color,
        price: variant.price,
        quantity
      });
    }
    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = await createOrderWithCode({
      customer: {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        address: customerAddress
      },
      items: orderItems,
      subtotal,
      total: subtotal,
      deliveryMethod,
      paymentMethod,
      note: typeof note === "string" ? note.trim().slice(0, 500) : ""
    });
    return res.status(201).json({ message: "Đặt hàng thành công.", order });
  } catch (error) {
    await Promise.all(reserved.map(({ productId, variantId, quantity }) =>
      Product.updateOne(
        { _id: productId, "variants._id": variantId },
        { $inc: { stock: quantity, "variants.$.stock": quantity } }
      )
    ));
    throw error;
  }
}));

router.get("/lookup", orderLookupRateLimit, asyncHandler(async (req, res) => {
  const { code, phone } = req.query;
  if (typeof code !== "string" || typeof phone !== "string") {
    return res.status(400).json({ message: "Vui lòng nhập mã đơn và số điện thoại." });
  }

  const normalizedCode = code.trim().toUpperCase();
  const phoneDigits = phone.replace(/\D/g, "");
  if (!/^[A-Z0-9]{8}$/.test(normalizedCode) || phone.trim().length < 8 || phone.trim().length > 20 ||
      phoneDigits.length < 8 || phoneDigits.length > 15) {
    return res.status(400).json({ message: "Mã đơn hoặc số điện thoại không hợp lệ." });
  }

  const phonePattern = new RegExp(`^${phoneDigits.split("").join("\\D*")}$`);
  const order = await Order.findOne({
    $and: [
      { "customer.phone": phonePattern },
      { $or: [
        { code: normalizedCode },
        { $expr: { $eq: [
          { $toUpper: { $substrCP: [{ $toString: "$_id" }, 16, 8] } },
          normalizedCode
        ] } }
      ] }
    ]
  }).select("code createdAt status paymentStatus paymentMethod deliveryMethod items.productName items.storage items.color items.quantity items.price total customer.name customer.phone customer.address").lean();

  if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng với thông tin này." });

  const maskText = (value) => value ? `${Array.from(value.trim())[0]}•••` : "";
  return res.json({ order: {
    code: order.code || String(order._id).slice(-8).toUpperCase(),
    createdAt: order.createdAt,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    deliveryMethod: order.deliveryMethod,
    items: order.items.map((item) => ({
      name: item.productName,
      storage: item.storage,
      color: item.color,
      quantity: item.quantity,
      price: item.price
    })),
    total: order.total,
    customer: {
      name: maskText(order.customer.name),
      phone: `••••••${order.customer.phone.replace(/\D/g, "").slice(-3)}`,
      address: maskText(order.customer.address)
    }
  } });
}));

router.get("/", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const filter = {};
  if (statuses.includes(req.query.status)) filter.status = req.query.status;
  if (req.query.q !== undefined && typeof req.query.q !== "string") {
    return res.status(400).json({ message: "Từ khóa tìm kiếm đơn hàng không hợp lệ." });
  }
  if (req.query.q?.length > 100) return res.status(400).json({ message: "Từ khóa tìm kiếm tối đa 100 ký tự." });
  const search = req.query.q?.trim();
  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { "customer.name": new RegExp(escapedSearch, "i") },
      { "customer.phone": new RegExp(escapedSearch, "i") }
    ];
  }
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter)
  ]);
  return res.json({ orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

router.patch("/:id/payment-status", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Mã đơn hàng không hợp lệ." });
  const paymentStatus = req.body?.paymentStatus;
  if (!["unpaid", "paid"].includes(paymentStatus)) {
    return res.status(400).json({ message: "Trạng thái thanh toán không hợp lệ." });
  }
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, status: { $ne: "cancelled" } },
    { $set: { paymentStatus } },
    { new: true, runValidators: true }
  );
  if (order) return res.json({ order });
  if (await Order.exists({ _id: req.params.id })) {
    return res.status(409).json({ message: "Không thể đổi thanh toán cho đơn đã hủy." });
  }
  return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
}));

router.patch("/:id/status", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Mã đơn hàng không hợp lệ." });
  const { status } = req.body;
  if (!statuses.includes(status)) return res.status(400).json({ message: "Trạng thái đơn hàng không hợp lệ." });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
  if (order.status === "cancelled" && status !== "cancelled") {
    return res.status(409).json({ message: "Đơn đã hủy không thể mở lại." });
  }
  if (order.status === "completed" && status !== "completed") {
    return res.status(409).json({ message: "Đơn đã hoàn thành không thể đổi trạng thái hoặc hoàn kho." });
  }
  if (order.status === status) return res.json({ order });

  const previousStatus = order.status;
  if (status === "cancelled") {
    const productIds = [...new Set(order.items.map((item) => String(item.product)))];
    const products = await Product.find({ _id: { $in: productIds } }).select("_id variants._id");
    const productMap = new Map(products.map((product) => [String(product._id), product]));
    const missingItem = order.items.find((item) =>
      !productMap.get(String(item.product))?.variants.id(item.variantId)
    );
    if (missingItem) {
      return res.status(409).json({ message: `Không thể hoàn kho cho sản phẩm ${missingItem.productName}; cần kiểm tra dữ liệu kho.` });
    }
  }

  // Đổi trạng thái nguyên tử: chỉ một request thắng nếu nhiều admin bấm cùng lúc,
  // nên kho chỉ được hoàn đúng một lần.
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, status: previousStatus },
    { $set: { status } },
    { new: false }
  );
  if (!claimed) {
    return res.status(409).json({ message: "Đơn hàng vừa được cập nhật bởi người khác. Vui lòng tải lại danh sách." });
  }

  if (status === "cancelled") {
    const restoredItems = [];
    try {
      for (const item of claimed.items) {
        const restored = await Product.updateOne(
          { _id: item.product, "variants._id": item.variantId },
          { $inc: { stock: item.quantity, "variants.$.stock": item.quantity } }
        );
        if (!restored.matchedCount) {
          const error = new Error(`Không thể hoàn kho cho sản phẩm ${item.productName}; cần kiểm tra dữ liệu kho.`);
          error.status = 409;
          throw error;
        }
        restoredItems.push(item);
      }
    } catch (error) {
      // Hoàn tác phần kho đã cộng và trả trạng thái đơn về như cũ.
      await Promise.all(restoredItems.map((item) => Product.updateOne(
        { _id: item.product, "variants._id": item.variantId },
        { $inc: { stock: -item.quantity, "variants.$.stock": -item.quantity } }
      )));
      await Order.updateOne({ _id: order._id }, { $set: { status: previousStatus } });
      throw error;
    }
  }
  return res.json({ order: await Order.findById(order._id) });
}));

module.exports = router;
