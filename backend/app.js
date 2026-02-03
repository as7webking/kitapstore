const express = require("express");
const cors = require("cors");
require("dotenv").config();
const passport = require("passport");

const app = express();

// Middlewares
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Import routes
const userRoutes = require("./routes/user");
const bookRoutes = require("./routes/book");
const favouriteRoutes = require("./routes/favourite");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/order");

// Passport config
require("./config/passport");
app.use(passport.initialize());

// Routes
app.use("/api/v1/user", userRoutes);      // <-- users routes
app.use("/api/v1/books", bookRoutes);
app.use("/api/v1/favourites", favouriteRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/orders", orderRoutes);
app.get("/api/v1/test", (req, res) => {
  res.send("API OK");
});

require("./conn/conn");

// Start server
const PORT = process.env.PORT || 1001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
