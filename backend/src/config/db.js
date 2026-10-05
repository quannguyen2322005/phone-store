const mongoose = require("mongoose");

async function connectDatabase() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/phone_store";
  await mongoose.connect(uri);
  console.log(`Đã kết nối MongoDB: ${mongoose.connection.name}`);
}

module.exports = connectDatabase;
