require("dotenv").config();
const express = require("express");
const cors = require("cors");
const passport = require("passport");

const contactRoutes = require("./routes/contact");
const app = express();

// middlewares
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// routes
const bookRoutes = require("./routes/book");
const userRoutes = require("./routes/user");
const favouriteRoutes = require("./routes/favourite");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/order");

// passport
require("./config/passport");
app.use(passport.initialize());

// 🔥 ВАЖНО — КНИГИ ДВАЖДЫ
app.use("/api/v1", bookRoutes);        // ✅ старый фронт
app.use("/api/v1/books", bookRoutes);  // ✅ новая структура

// остальные
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/favourites", favouriteRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/orders", orderRoutes);

//contacct
app.use("/api/contact", contactRoutes);

// test
app.get("/api/v1/test", (req, res) => {
  res.send("API OK");
});

// DB
require("./conn/conn");

// start
const PORT = process.env.PORT || 1001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});