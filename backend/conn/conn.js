const mongoose = require("mongoose");

async function connectDatabase() {
  await mongoose.connect(process.env.URI, { serverSelectionTimeoutMS: 5000 });
  console.log("Connected to Database");
}

module.exports = connectDatabase;
