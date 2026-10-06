const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(48, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
  const filter = {};
  if (req.query.brand) {
    const brands = String(req.query.brand).split(",").map((brand) => brand.trim().toUpperCase()).filter(Boolean);
    if (brands.length) filter.brand = brands.length === 1 ? brands[0] : { $in: brands };
  }
  if (req.query.minPrice || req.query.maxPrice) {
    filter.salePrice = {};
    if (Number.isFinite(Number(req.query.minPrice))) filter.salePrice.$gte = Number(req.query.minPrice);
    if (Number.isFinite(Number(req.query.maxPrice))) filter.salePrice.$lte = Number(req.query.maxPrice);
  }
  if (req.query.ram) {
    const rams = String(req.query.ram).split(",").map((ram) => ram.trim()).filter(Boolean);
    const expressions = rams.map((ram) => new RegExp(`^${ram.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"));
    if (expressions.length) filter["specs.ram"] = expressions.length === 1 ? expressions[0] : { $in: expressions };
  }
  if (req.query.storage) {
    const storage = String(req.query.storage).split(",").map((value) => value.trim()).filter(Boolean);
    if (storage.length) filter["variants.storage"] = storage.length === 1 ? storage[0] : { $in: storage };
  }
  if (req.query.search?.trim()) filter.$text = { $search: String(req.query.search).trim() };

  const allowedSort = { price_asc: { salePrice: 1 }, price_desc: { salePrice: -1 }, newest: { createdAt: -1 } };
  const sort = allowedSort[req.query.sort] || { featured: -1, createdAt: -1 };
  const [products, total] = await Promise.all([
    Product.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter)
  ]);
  return res.json({ products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

router.post("/seed", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const samples = getSampleProducts();
  const operations = samples.map((sample) => ({
    updateOne: { filter: { name: sample.name }, update: { $setOnInsert: sample }, upsert: true }
  }));
  const result = await Product.bulkWrite(operations);
  const count = result.upsertedCount || 0;
  return res.json({
    message: count
      ? `Đã thêm ${count} sản phẩm mẫu mới.`
      : "Danh mục sản phẩm mẫu đã có đầy đủ, không thêm trùng.",
    count,
    totalSamples: samples.length
  });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Mã sản phẩm không hợp lệ." });
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm." });
  return res.json({ product });
}));

router.post("/", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  return res.status(201).json({ product });
}));

router.patch("/:id", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Mã sản phẩm không hợp lệ." });
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm." });
  const editable = ["name", "brand", "category", "variants", "originalPrice", "salePrice", "specs", "images", "description", "featured"];
  for (const key of editable) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) product[key] = req.body[key];
  }
  await product.save();
  return res.json({ product });
}));

router.delete("/:id", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Mã sản phẩm không hợp lệ." });
  const openOrder = await Order.exists({
    status: { $in: ["pending", "shipping"] },
    "items.product": req.params.id
  });
  if (openOrder) {
    return res.status(409).json({ message: "Không thể xóa sản phẩm đang nằm trong đơn hàng chưa hoàn tất." });
  }
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm." });
  return res.json({ message: "Đã xóa sản phẩm." });
}));

function getSampleProducts() {
  const makeVariants = (prices, colors) => prices.flatMap(([storage, price, stock]) =>
    colors.map(([color, colorHex], index) => ({
      storage, color, colorHex, price: price + index * 300000, originalPrice: price + index * 300000 + 1500000,
      stock: Math.max(0, stock - index * 2)
    }))
  );
  return [
    {
      name: "iPhone 17 Pro Max", brand: "APPLE", category: "Flagship", originalPrice: 37990000, salePrice: 34990000, featured: true,
      specs: { screen: "6.9 inch OLED, ProMotion", chip: "Apple A19 Pro", ram: "12GB", battery: "Pin lithium-ion", camera: "Hệ thống camera Pro 48MP" },
      images: ["https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=85"],
      variants: makeVariants([["256GB", 34990000, 15], ["512GB", 40990000, 10], ["1TB", 46990000, 5]], [["Titan Tự Nhiên", "#9c968d"], ["Titan Đen", "#343434"]]),
      description: "Siêu phẩm iPhone Pro với hiệu năng mạnh mẽ và hệ thống camera chuyên nghiệp."
    },
    {
      name: "iPhone 17", brand: "APPLE", category: "Flagship", originalPrice: 26990000, salePrice: 24990000, featured: true,
      specs: { screen: "6.3 inch OLED", chip: "Apple A19", ram: "8GB", battery: "Pin lithium-ion", camera: "Camera kép 48MP" },
      images: ["https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=900&q=85"],
      variants: makeVariants([["128GB", 24990000, 18], ["256GB", 27990000, 12], ["512GB", 33990000, 6]], [["Đen", "#282828"], ["Xanh Sương", "#b8c9cd"]]),
      description: "Thiết kế gọn nhẹ, màn hình sống động và trải nghiệm iOS mượt mà."
    },
    {
      name: "Samsung Galaxy S25 Ultra", brand: "SAMSUNG", category: "Flagship", originalPrice: 33990000, salePrice: 29990000, featured: true,
      specs: { screen: "6.9 inch Dynamic AMOLED 2X", chip: "Snapdragon 8 Elite", ram: "12GB", battery: "5000mAh", camera: "Camera chính 200MP" },
      images: ["https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=900&q=85"],
      variants: makeVariants([["256GB", 29990000, 14], ["512GB", 33990000, 8], ["1TB", 39990000, 4]], [["Titan Xám", "#8b8b88"], ["Titan Đen", "#292929"]]),
      description: "Flagship Galaxy với bút S Pen, camera độ phân giải cao và Galaxy AI."
    },
    {
      name: "Samsung Galaxy S25", brand: "SAMSUNG", category: "Flagship", originalPrice: 22990000, salePrice: 19990000, featured: false,
      specs: { screen: "6.2 inch Dynamic AMOLED 2X", chip: "Snapdragon 8 Elite", ram: "12GB", battery: "4000mAh", camera: "Camera chính 50MP" },
      images: ["https://images.unsplash.com/photo-1605236453806-6ff36851218e?auto=format&fit=crop&w=900&q=85"],
      variants: makeVariants([["256GB", 19990000, 16], ["512GB", 23990000, 9]], [["Xanh Navy", "#34445c"], ["Bạc", "#c6c7c5"]]),
      description: "Galaxy nhỏ gọn, hiệu năng flagship và các tính năng AI thông minh."
    },
    {
      name: "Xiaomi 15 Ultra", brand: "XIAOMI", category: "Flagship", originalPrice: 32990000, salePrice: 28990000, featured: true,
      specs: { screen: "6.73 inch AMOLED WQHD+", chip: "Snapdragon 8 Elite", ram: "16GB", battery: "5410mAh", camera: "Leica 50MP, cảm biến 1 inch" },
      images: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=85"],
      variants: makeVariants([["512GB", 28990000, 11], ["1TB", 32990000, 5]], [["Đen", "#292929"], ["Trắng", "#e8e7e4"]]),
      description: "Trải nghiệm nhiếp ảnh Leica và hiệu năng cao cấp trong thiết kế tinh tế."
    },
    {
      name: "Xiaomi 15", brand: "XIAOMI", category: "Flagship", originalPrice: 22990000, salePrice: 19990000, featured: false,
      specs: { screen: "6.36 inch AMOLED", chip: "Snapdragon 8 Elite", ram: "12GB", battery: "5240mAh", camera: "Leica 50MP" },
      images: ["https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=85"],
      variants: makeVariants([["256GB", 19990000, 16], ["512GB", 22990000, 8]], [["Xanh", "#657b8a"], ["Đen", "#292929"]]),
      description: "Flagship nhỏ gọn kết hợp camera Leica và sạc nhanh tiện lợi."
    },
    {
      name: "OPPO Find X8 Pro", brand: "OPPO", category: "Flagship", originalPrice: 29990000, salePrice: 26990000, featured: false,
      specs: { screen: "6.78 inch AMOLED", chip: "MediaTek Dimensity 9400", ram: "16GB", battery: "5910mAh", camera: "Hasselblad, camera tele 50MP" },
      images: ["https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=85"],
      variants: makeVariants([["512GB", 26990000, 10]], [["Đen", "#292929"], ["Trắng", "#e8e7e4"]]),
      description: "Thiết kế cao cấp, camera Hasselblad và pin dung lượng lớn."
    },
    {
      name: "OnePlus 13", brand: "ONEPLUS", category: "Flagship", originalPrice: 23990000, salePrice: 20990000, featured: false,
      specs: { screen: "6.82 inch AMOLED QHD+", chip: "Snapdragon 8 Elite", ram: "16GB", battery: "6000mAh", camera: "Hasselblad 50MP" },
      images: ["https://images.unsplash.com/photo-1605236453806-6ff36851218e?auto=format&fit=crop&w=900&q=85"],
      variants: makeVariants([["256GB", 20990000, 12], ["512GB", 23990000, 7]], [["Đen", "#292929"], ["Xanh", "#46645a"]]),
      description: "Hiệu năng flagship, màn hình sắc nét và thời lượng pin bền bỉ."
    },
    ...getAdditionalSampleProducts(makeVariants)
  ].map((product) => ({
    ...product,
    stock: product.variants.reduce((total, variant) => total + variant.stock, 0)
  }));
}

function getAdditionalSampleProducts(makeVariants) {
  const catalog = [
    ["iPhone 16 Pro Max", "APPLE", 32990000, "6.9 inch OLED ProMotion", "Apple A18 Pro", "8GB", "4685mAh", "Camera Pro 48MP"],
    ["iPhone 16 Pro", "APPLE", 28990000, "6.3 inch OLED ProMotion", "Apple A18 Pro", "8GB", "3582mAh", "Camera Pro 48MP"],
    ["iPhone 16 Plus", "APPLE", 24990000, "6.7 inch OLED", "Apple A18", "8GB", "4674mAh", "Camera kép 48MP"],
    ["iPhone 16", "APPLE", 21990000, "6.1 inch OLED", "Apple A18", "8GB", "3561mAh", "Camera kép 48MP"],
    ["iPhone 16e", "APPLE", 16990000, "6.1 inch OLED", "Apple A18", "8GB", "4005mAh", "Camera Fusion 48MP"],
    ["iPhone 15", "APPLE", 17990000, "6.1 inch OLED", "Apple A16 Bionic", "6GB", "3349mAh", "Camera chính 48MP"],
    ["iPhone 15 Pro", "APPLE", 23990000, "6.1 inch OLED ProMotion", "Apple A17 Pro", "8GB", "3274mAh", "Camera Pro 48MP"],
    ["Samsung Galaxy S25+", "SAMSUNG", 25990000, "6.7 inch Dynamic AMOLED 2X", "Snapdragon 8 Elite", "12GB", "4900mAh", "Camera chính 50MP"],
    ["Samsung Galaxy S24 Ultra", "SAMSUNG", 26990000, "6.8 inch Dynamic AMOLED 2X", "Snapdragon 8 Gen 3", "12GB", "5000mAh", "Camera chính 200MP"],
    ["Samsung Galaxy S24 FE", "SAMSUNG", 14990000, "6.7 inch Dynamic AMOLED 2X", "Exynos 2400e", "8GB", "4700mAh", "Camera chính 50MP"],
    ["Samsung Galaxy Z Fold6", "SAMSUNG", 36990000, "7.6 inch Dynamic AMOLED 2X", "Snapdragon 8 Gen 3", "12GB", "4400mAh", "Camera chính 50MP"],
    ["Samsung Galaxy Z Flip6", "SAMSUNG", 23990000, "6.7 inch Dynamic AMOLED 2X", "Snapdragon 8 Gen 3", "12GB", "4000mAh", "Camera kép 50MP"],
    ["Samsung Galaxy A56 5G", "SAMSUNG", 9990000, "6.7 inch Super AMOLED", "Exynos 1580", "8GB", "5000mAh", "Camera chính 50MP"],
    ["Samsung Galaxy A36 5G", "SAMSUNG", 7990000, "6.7 inch Super AMOLED", "Snapdragon 6 Gen 3", "8GB", "5000mAh", "Camera chính 50MP"],
    ["Samsung Galaxy A26 5G", "SAMSUNG", 5990000, "6.7 inch Super AMOLED", "Exynos 1380", "6GB", "5000mAh", "Camera chính 50MP"],
    ["Xiaomi 14T Pro", "XIAOMI", 15990000, "6.67 inch AMOLED 144Hz", "Dimensity 9300+", "12GB", "5000mAh", "Leica 50MP"],
    ["Redmi Note 14 Pro+ 5G", "XIAOMI", 10990000, "6.67 inch AMOLED", "Snapdragon 7s Gen 3", "8GB", "5110mAh", "Camera chính 200MP"],
    ["Redmi Note 14 Pro 5G", "XIAOMI", 8990000, "6.67 inch AMOLED", "Dimensity 7300 Ultra", "8GB", "5110mAh", "Camera chính 200MP"],
    ["Redmi Note 14", "XIAOMI", 4990000, "6.67 inch AMOLED", "Helio G99 Ultra", "8GB", "5500mAh", "Camera chính 108MP"],
    ["POCO X7 Pro", "XIAOMI", 8990000, "6.67 inch AMOLED 120Hz", "Dimensity 8400 Ultra", "12GB", "6000mAh", "Camera chính 50MP"],
    ["POCO F7 Ultra", "XIAOMI", 16990000, "6.67 inch AMOLED 120Hz", "Snapdragon 8 Elite", "12GB", "5300mAh", "Camera chính 50MP"],
    ["Redmi 14C", "XIAOMI", 2990000, "6.88 inch LCD", "MediaTek Helio G81 Ultra", "4GB", "5160mAh", "Camera chính 50MP"],
    ["OPPO Find X8", "OPPO", 22990000, "6.59 inch AMOLED", "Dimensity 9400", "16GB", "5630mAh", "Hasselblad 50MP"],
    ["OPPO Reno13 Pro 5G", "OPPO", 18990000, "6.83 inch AMOLED", "Dimensity 8350", "12GB", "5800mAh", "Camera chính 50MP"],
    ["OPPO Reno13 5G", "OPPO", 14990000, "6.59 inch AMOLED", "Dimensity 8350", "12GB", "5600mAh", "Camera chính 50MP"],
    ["OPPO Reno12 F 5G", "OPPO", 8990000, "6.67 inch AMOLED", "Dimensity 6300", "8GB", "5000mAh", "Camera chính 50MP"],
    ["OPPO A5 Pro 5G", "OPPO", 6990000, "6.67 inch LCD", "Dimensity 6300", "8GB", "5800mAh", "Camera chính 50MP"],
    ["OPPO A3x", "OPPO", 3990000, "6.67 inch LCD", "Snapdragon 6s Gen 1", "4GB", "5100mAh", "Camera chính 8MP"],
    ["OnePlus 13R", "ONEPLUS", 16990000, "6.78 inch AMOLED 120Hz", "Snapdragon 8 Gen 3", "12GB", "6000mAh", "Camera chính 50MP"],
    ["OnePlus 12", "ONEPLUS", 18990000, "6.82 inch AMOLED QHD+", "Snapdragon 8 Gen 3", "12GB", "5400mAh", "Hasselblad 50MP"],
    ["OnePlus Nord 4", "ONEPLUS", 10990000, "6.74 inch AMOLED 120Hz", "Snapdragon 7+ Gen 3", "12GB", "5500mAh", "Camera chính 50MP"],
    ["OnePlus Nord CE4 Lite", "ONEPLUS", 6990000, "6.67 inch AMOLED 120Hz", "Snapdragon 695", "8GB", "5500mAh", "Camera chính 50MP"],
    ["vivo X200 Pro", "VIVO", 29990000, "6.78 inch AMOLED", "Dimensity 9400", "16GB", "6000mAh", "ZEISS 50MP"],
    ["vivo V50", "VIVO", 13990000, "6.77 inch AMOLED", "Snapdragon 7 Gen 3", "12GB", "6000mAh", "ZEISS 50MP"],
    ["vivo V40", "VIVO", 11990000, "6.78 inch AMOLED", "Snapdragon 7 Gen 3", "12GB", "5500mAh", "ZEISS 50MP"],
    ["vivo Y100", "VIVO", 6990000, "6.67 inch AMOLED", "Snapdragon 685", "8GB", "5000mAh", "Camera chính 50MP"],
    ["vivo Y29", "VIVO", 5990000, "6.68 inch LCD", "Snapdragon 685", "8GB", "6500mAh", "Camera chính 50MP"],
    ["Google Pixel 9 Pro XL", "GOOGLE", 27990000, "6.8 inch OLED 120Hz", "Google Tensor G4", "16GB", "5060mAh", "Camera chính 50MP"],
    ["Google Pixel 9 Pro", "GOOGLE", 24990000, "6.3 inch OLED 120Hz", "Google Tensor G4", "16GB", "4700mAh", "Camera chính 50MP"],
    ["Google Pixel 9", "GOOGLE", 18990000, "6.3 inch OLED 120Hz", "Google Tensor G4", "12GB", "4700mAh", "Camera chính 50MP"],
    ["Google Pixel 9a", "GOOGLE", 12990000, "6.3 inch OLED", "Google Tensor G4", "8GB", "5100mAh", "Camera chính 48MP"],
    ["Google Pixel 8a", "GOOGLE", 9990000, "6.1 inch OLED 120Hz", "Google Tensor G3", "8GB", "4492mAh", "Camera chính 64MP"]
  ];
  const images = {
    APPLE: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=85",
    SAMSUNG: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=900&q=85",
    XIAOMI: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=85",
    OPPO: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=85",
    ONEPLUS: "https://images.unsplash.com/photo-1605236453806-6ff36851218e?auto=format&fit=crop&w=900&q=85",
    VIVO: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=85",
    GOOGLE: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=900&q=85"
  };
  const colors = {
    APPLE: [["Đen", "#282828"], ["Titan", "#9c968d"]],
    SAMSUNG: [["Đen", "#292929"], ["Bạc", "#c6c7c5"]],
    XIAOMI: [["Đen", "#292929"], ["Xanh", "#657b8a"]],
    OPPO: [["Đen", "#292929"], ["Xanh", "#46645a"]],
    ONEPLUS: [["Đen", "#292929"], ["Xanh", "#46645a"]],
    VIVO: [["Đen", "#292929"], ["Tím", "#8b79a6"]],
    GOOGLE: [["Đen", "#292929"], ["Trắng", "#e8e7e4"]]
  };

  return catalog.map(([name, brand, salePrice, screen, chip, ram, battery, camera]) => {
    const storagePrices = salePrice >= 20000000
      ? [["256GB", salePrice, 10], ["512GB", salePrice + 4000000, 6]]
      : [["128GB", salePrice, 12], ["256GB", salePrice + 2500000, 8]];
    return {
      name,
      brand,
      category: salePrice >= 20000000 ? "Flagship" : salePrice >= 8000000 ? "Tầm trung" : "Phổ thông",
      originalPrice: salePrice + 2000000,
      salePrice,
      featured: false,
      specs: { screen, chip, ram, battery, camera },
      images: [images[brand]],
      variants: makeVariants(storagePrices, colors[brand]),
      description: `${name} chính hãng, cấu hình ${ram} RAM, phù hợp cho nhu cầu sử dụng hằng ngày.`
    };
  });
}

module.exports = router;
