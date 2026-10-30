require("dotenv").config({ path: require("path").join(__dirname, ".env"), quiet: true });
const express = require("express");
const { validateEnv } = require("./config/env");
const connectDatabase = require("./conn/conn");
const cors = require("cors");
const passport = require("passport");

const contactRoutes = require("./routes/contact");
const app = express();

// middlewares
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// routes
const bookRoutes = require("./routes/book");
const userRoutes = require("./routes/user");
const blogRoutes = require("./routes/blog");
const favouriteRoutes = require("./routes/favourite");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/order");

// passport
require("./config/passport");
app.use(passport.initialize());

// 🔥 two book routes
app.use("/api/v1", bookRoutes);        // ✅ old structure
app.use("/api/v1/books", bookRoutes);  // ✅ new structure

// rest
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/favourites", favouriteRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/blog", blogRoutes);

//contacct
app.use("/api/contact", contactRoutes);

// test
app.get("/api/v1/test", (req, res) => {
  res.send("API OK");
});

// Keep the existing flat URLs as aliases for older clients.
app.use("/api/v1", favouriteRoutes);
app.use("/api/v1", cartRoutes);
app.use("/api/v1", orderRoutes);

async function start() {
  const { port } = validateEnv();
  try {
    await connectDatabase();
  } catch {
    throw new Error("MongoDB connection failed. Check URI, database credentials and network access.");
  }
  return app.listen(port, () => console.log(`Server running on port ${port}`));
}

if (require.main === module) {
  start().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { app, start };
