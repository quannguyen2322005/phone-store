const mongoose = require("mongoose");

async function connectDatabase() {
  const uri = (process.env.MONGODB_URI || process.env.MONGO_URI || "").trim();
  const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER === "true";
  if (isProduction && !uri) {
    throw new Error("Hãy cấu hình MONGODB_URI hoặc MONGO_URI trong môi trường production.");
  }
  if (isProduction && /^mongodb(?:\+srv)?:\/\/(localhost|127\.0\.0\.1)([:/]|$)/i.test(uri)) {
    throw new Error("Render không thể kết nối MongoDB localhost; hãy dùng URI MongoDB Atlas trong MONGODB_URI hoặc MONGO_URI.");
  }
  const connectionUri = uri || "mongodb://localhost:27017/phone_store";
  await mongoose.connect(connectionUri);
  console.log(`Đã kết nối MongoDB: ${mongoose.connection.name}`);
}

module.exports = connectDatabase;
