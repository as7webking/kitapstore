const mongoose = require("mongoose");

async function connectDatabase() {
  await mongoose.connect(process.env.URI, { serverSelectionTimeoutMS: 5000, ...(process.env.MONGODB_DB_NAME ? { dbName: process.env.MONGODB_DB_NAME } : {}) });
  console.log("Connected to Database");
}

module.exports = connectDatabase;
