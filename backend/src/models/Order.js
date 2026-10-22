const mongoose = require("mongoose");
const ORDER_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true },
  image: { type: String, default: "" },
  variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
  storage: { type: String, required: true },
  color: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  code: { type: String, unique: true, sparse: true, match: ORDER_CODE_PATTERN },
  customer: {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254, default: "" },
    address: { type: String, trim: true, maxlength: 300, default: "" }
  },
  items: {
    type: [orderItemSchema],
    validate: [(items) => items.length > 0, "Đơn hàng cần có ít nhất một sản phẩm."]
  },
  subtotal: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  deliveryMethod: { type: String, enum: ["delivery", "pickup"], required: true },
  paymentMethod: { type: String, enum: ["COD", "QR"], required: true },
  paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
  status: { type: String, enum: ["pending", "shipping", "completed", "cancelled"], default: "pending" },
  note: { type: String, trim: true, maxlength: 500, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
