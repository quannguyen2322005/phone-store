const express = require("express");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get("/overview", asyncHandler(async (req, res) => {
  const [revenue, newOrders, lowStock, productCount] = await Promise.all([
    Order.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]),
    Order.countDocuments({ status: "pending" }),
    Product.countDocuments({ stock: { $lte: 5 } }),
    Product.countDocuments()
  ]);
  return res.json({
    revenue: revenue[0]?.total || 0,
    newOrders,
    lowStock,
    productCount
  });
}));

module.exports = router;
