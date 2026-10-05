const mongoose = require("mongoose");

async function connectDatabase() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri && process.env.NODE_ENV === "production") {
    throw new Error("Hãy cấu hình MONGODB_URI hoặc MONGO_URI trong môi trường production.");
  }
  const connectionUri = uri || "mongodb://localhost:27017/phone_store";
  await mongoose.connect(connectionUri);
  console.log(`Đã kết nối MongoDB: ${mongoose.connection.name}`);
}

module.exports = connectDatabase;
