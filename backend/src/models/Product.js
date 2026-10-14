const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  storage: { type: String, required: true, trim: true },
  color: { type: String, required: true, trim: true },
  colorHex: { type: String, default: "#d9d9d9", match: /^#[0-9a-fA-F]{6}$/ },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  image: { type: String, trim: true, default: "" }
}, { _id: true });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 140 },
  brand: { type: String, required: true, trim: true, uppercase: true, enum: ["APPLE", "SAMSUNG", "XIAOMI", "OPPO", "ONEPLUS", "VIVO", "GOOGLE"] },
  category: { type: String, required: true, trim: true, default: "Smartphone" },
  variants: {
    type: [variantSchema],
    validate: [(variants) => variants.length > 0, "Sản phẩm cần có ít nhất một phiên bản."]
  },
  // Hai trường này được tự tính từ biến thể rẻ nhất (xem hook bên dưới), không nhập tay.
  originalPrice: { type: Number, min: 0, default: 0 },
  salePrice: { type: Number, min: 0, default: 0 },
  specs: {
    screen: { type: String, trim: true, default: "" },
    chip: { type: String, trim: true, default: "" },
    ram: { type: String, trim: true, default: "" },
    battery: { type: String, trim: true, default: "" },
    camera: { type: String, trim: true, default: "" }
  },
  stock: { type: Number, min: 0, default: 0 },
  images: [{ type: String, trim: true }],
  description: { type: String, trim: true, default: "" },
  featured: { type: Boolean, default: false }
}, { timestamps: true });

productSchema.pre("validate", function syncInventoryAndPrice(next) {
  const variants = this.variants || [];
  this.stock = variants.reduce((total, variant) => total + variant.stock, 0);
  if (variants.length) {
    const cheapest = variants.reduce((best, variant) => (variant.price < best.price ? variant : best));
    this.salePrice = cheapest.price;
    this.originalPrice = Math.max(cheapest.originalPrice, cheapest.price);
  }
  next();
});

productSchema.index({ brand: 1, salePrice: 1 });
productSchema.index({ name: "text", brand: "text" });

module.exports = mongoose.model("Product", productSchema);
