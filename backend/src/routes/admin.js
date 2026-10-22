const express = require("express");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get("/overview", asyncHandler(async (req, res) => {
  const [revenue, newOrders, lowStock, productCount, lowStockProducts] = await Promise.all([
    Order.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]),
    Order.countDocuments({ status: "pending" }),
    Product.countDocuments({ stock: { $lte: 5 } }),
    Product.countDocuments(),
    Product.find({ stock: { $lte: 5 } }).sort({ stock: 1, _id: 1 }).limit(5).select("_id name stock")
  ]);
  const lowStockProductList = lowStockProducts.map(({ _id, name, stock }) => ({ id: String(_id), name, stock }));
  return res.json({
    revenue: revenue[0]?.total || 0,
    newOrders,
    lowStock,
    productCount,
    lowStockProducts: lowStockProductList
  });
}));

module.exports = router;
