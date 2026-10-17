const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/register", asyncHandler(async (req, res) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const { password } = req.body;
  if (!name || name.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== "string" ||
      password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ message: "Cần nhập họ tên (tối đa 100 ký tự), email hợp lệ và mật khẩu từ 8 đến 72 byte." });
  }
  if (await User.exists({ email })) {
    return res.status(409).json({ message: "Email này đã được sử dụng." });
  }
  const user = await User.create({ name, email, password });
  return res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}));

router.post("/login", asyncHandler(async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = req.body.password;
  if (!email || email.length > 254 || typeof password !== "string" || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ message: "Vui lòng nhập email và mật khẩu." });
  }
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Email hoặc mật khẩu chưa chính xác." });
  }
  const token = jwt.sign({}, process.env.JWT_SECRET, { subject: user.id, expiresIn: "12h" });
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}));

router.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));

module.exports = router;
