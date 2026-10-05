const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
const statuses = ["pending", "shipping", "completed", "cancelled"];

router.post("/", asyncHandler(async (req, res) => {
  const { customer, items, deliveryMethod, paymentMethod, note } = req.body;
  if (typeof customer?.name !== "string" || !customer.name.trim() ||
      typeof customer.phone !== "string" || !/^[+()\d\s.-]{8,20}$/.test(customer.phone)) {
    return res.status(400).json({ message: "Vui lòng nhập họ tên và số điện thoại hợp lệ." });
  }
  if (!["delivery", "pickup"].includes(deliveryMethod) || !["COD", "QR"].includes(paymentMethod)) {
    return res.status(400).json({ message: "Phương thức nhận hàng hoặc thanh toán không hợp lệ." });
  }
  if (deliveryMethod === "delivery" && (typeof customer.address !== "string" || !customer.address.trim())) {
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
  for (const [key, quantity] of requested) {
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
    const order = await Order.create({
      customer: {
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        email: typeof customer.email === "string" ? customer.email.trim() : "",
        address: typeof customer.address === "string" ? customer.address.trim() : ""
      },
      items: orderItems,
      subtotal,
      total: subtotal,
      deliveryMethod,
      paymentMethod,
      note: note || ""
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

router.get("/", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const filter = {};
  if (statuses.includes(req.query.status)) filter.status = req.query.status;
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter)
  ]);
  return res.json({ orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
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
  if (status === "cancelled" && order.status !== "cancelled") {
    const productIds = [...new Set(order.items.map((item) => String(item.product)))];
    const products = await Product.find({ _id: { $in: productIds } }).select("_id variants._id");
    const productMap = new Map(products.map((product) => [String(product._id), product]));
    const missingItem = order.items.find((item) =>
      !productMap.get(String(item.product))?.variants.id(item.variantId)
    );
    if (missingItem) {
      return res.status(409).json({ message: `Không thể hoàn kho cho sản phẩm ${missingItem.productName}; cần kiểm tra dữ liệu kho.` });
    }
    for (const item of order.items) {
      const restored = await Product.updateOne(
        { _id: item.product, "variants._id": item.variantId },
        { $inc: { stock: item.quantity, "variants.$.stock": item.quantity } }
      );
      if (!restored.matchedCount) {
        return res.status(409).json({ message: `Không thể hoàn kho cho sản phẩm ${item.productName}; cần kiểm tra dữ liệu kho.` });
      }
    }
  }
  order.status = status;
  await order.save();
  return res.json({ order });
}));

module.exports = router;
