const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { asyncHandler } = require("../utils/asyncHandler");

const requireAuth = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : "";
  if (!token) return res.status(401).json({ message: "Vui lòng đăng nhập để tiếp tục." });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });
  }
  const user = await User.findById(payload.sub).select("name email role");
  if (!user) return res.status(401).json({ message: "Tài khoản không còn tồn tại." });
  req.user = user;
  return next();
});

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Bạn không có quyền quản trị." });
  return next();
}

module.exports = { requireAuth, requireAdmin };
