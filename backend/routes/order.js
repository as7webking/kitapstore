const { requireAdmin } = require('../utils/jwt');
const router = require('express').Router();
const { authentificateToken } = require('./userAuth');
const Order = require('../models/order');
const { checkout, historyRows, validId } = require('../services/checkout');

router.post('/place-order', authentificateToken, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const result = await checkout(req.user.id, req.user.version || 0, req.body, req.get('Idempotency-Key'));
    return res.json({ status: 'Success', code: 'ORDER_CREATED', message: 'Order placed successfully.', ...result });
  } catch (error) {
    return res.status(error.status || 503).json({ code: error.status ? error.code : 'ORDER_UNAVAILABLE', message: 'Could not place your order. Please try again.' });
  }
});
router.get('/get-order-history', authentificateToken, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).populate('book', '-pdf').sort({ createdAt: -1 }).lean();
    return res.json({ status: 'Success', data: orders.flatMap(historyRows) });
  } catch { return res.status(503).json({ code: 'ORDER_UNAVAILABLE', message: 'Could not load orders. Please try again.' }); }
});
router.get('/get-all-orders', authentificateToken, requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find().populate('book', '-pdf').populate('user', 'username email address avatar').sort({ createdAt: -1 }).lean();
    return res.json({ status: 'Success', data: orders.flatMap(historyRows) });
  } catch { return res.status(503).json({ code: 'ORDER_UNAVAILABLE', message: 'Could not load orders. Please try again.' }); }
});
router.put('/update-status/:id', authentificateToken, requireAdmin, async (req, res) => {
  if (!validId(req.params.id) || !['Order Placed', 'Out for delivery', 'Delivered', 'Canceled'].includes(req.body?.status)) {
    return res.status(400).json({ code: 'ORDER_STATUS_INVALID', message: 'Invalid order status.' });
  }
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { $set: { status: req.body.status } }, { runValidators: true, new: true });
    if (!order) return res.status(404).json({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
    return res.json({ status: 'Success', message: 'Status updated successfully' });
  } catch { return res.status(503).json({ code: 'ORDER_UNAVAILABLE', message: 'Could not update order. Please try again.' }); }
});
module.exports = router;
