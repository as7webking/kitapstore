// Get all orders (admin)
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate({
        path: "book",
        select: "title slug price desc image isDeleted",
      })
      .populate({
        path: "user",
        select: "email name",
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

router.get(
  "/get-all-orders",
  verifyToken,
  verifyAdmin,
  getAllOrders
);
