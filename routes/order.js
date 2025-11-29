const router = require("express").Router();
const { authentificateToken } = require("./userAuth");
const Book = require("../models/book");
const Order = require("../models/order");
const User = require("../models/user");

//place order
router.post("/place-order", authentificateToken, async (req, res) => {
  try {
    const { id } = req.headers;
    const { order } = req.body;
    for (const orderData of order) {
      const newOrder = new Order({ user: id, book: orderData._id });
      const orderDataFromDb = await newOrder.save();
      //saving order in user model
      await User.findByIdAndUpdate(id, {
        $push: { cart: orderDataFromDb._id },
      });
      //clearing cart
      await User.findByIdAndUpdate(id, {
        $push: { cart: orderData._id },
      });
    }

    return res.json({
      status: "Success",
      message: "Book added to cart",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "An error occured" });
  }
});

//get order history of particular user
router.get("/get-order-history", authentificateToken, async (req, res) => {
  try {
    const { id } = req.headers;
    const userData = await User.findById(id).populate({
        path: "orders",
        populate: { path: "book" },
    });
    
    const ordersData = userData.orders.reverse();
    return res.json({
      status: "Success",
      data: ordersData,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "An error occured" });
  }
});

//get-all-orders --admin
router.get("/get-all-orders", authentificateToken, async (req, res) => {
  try {
    const userData = await Order.find()
    .populate({
        path: "book",
    })
    .populate({
        path: "user",
    })
    .sort({ createdAt: -1 });
    return res.json({
      status: "Success",
      data: userData,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "An error occured" });
  }
});

//update order --admin
router.put("/update-status/:id", authentificateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await Order.findByIdAndUpdate(id, { status: req.body.status });
    return res.json({
        status: "Success",
        message: "Status updated successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "An error occured" });
  }
});

module.exports = router;
