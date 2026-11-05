const router = require('express').Router();
const User = require('../models/user');
const Book = require('../models/book');
const { authentificateToken } = require('./userAuth');
const { validId } = require('../services/checkout');
const customer = (req, res, next) => req.authUser.role === 'user' ? next()
  : res.status(403).json({ code: 'ORDER_CUSTOMER_REQUIRED', message: 'A customer account is required.' });
router.put('/add-to-cart', authentificateToken, customer, async (req, res) => {
  const bookid = req.headers.bookid;
  if (!validId(bookid)) return res.status(400).json({ code: 'ORDER_ITEMS_INVALID', message: 'Invalid book.' });
  try {
    const book = await Book.findById(bookid).select('_id isDeleted');
    if (!book || book.isDeleted) return res.status(409).json({ code: 'ORDER_BOOK_UNAVAILABLE', message: 'Book is unavailable.' });
    await User.updateOne({ _id: req.user.id, cart: { $ne: bookid } }, { $addToSet: { cart: bookid }, $inc: { cartVersion: 1 } });
    return res.json({ status: 'Success', message: 'Book added to cart' });
  } catch { return res.status(503).json({ code: 'ORDER_UNAVAILABLE', message: 'Could not update cart. Please try again.' }); }
});
router.put('/remove-from-cart/:bookid', authentificateToken, customer, async (req, res) => {
  if (!validId(req.params.bookid)) return res.status(400).json({ code: 'ORDER_ITEMS_INVALID', message: 'Invalid book.' });
  try {
    await User.updateOne({ _id: req.user.id, cart: req.params.bookid }, { $pull: { cart: req.params.bookid }, $inc: { cartVersion: 1 } });
    return res.json({ status: 'Success', message: 'Book removed from cart' });
  } catch { return res.status(503).json({ code: 'ORDER_UNAVAILABLE', message: 'Could not update cart. Please try again.' }); }
});
router.get('/get-user-cart', authentificateToken, customer, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('cart').lean();
    if (!user) return res.status(401).json({ code: 'ORDER_SESSION_INVALID', message: 'Please sign in again' });
    const ids = [...new Set(user.cart.map(String))].reverse();
    const books = await Book.find({ _id: { $in: ids } }).select('-pdf').lean();
    const data = ids.map((id) => {
      const book = books.find((entry) => String(entry._id) === id);
      return book ? { ...book, available: !book.isDeleted } : { _id: id, available: false, title: '', desc: '', price: 0 };
    });
    return res.json({ status: 'Success', data });
  } catch { return res.status(503).json({ code: 'ORDER_UNAVAILABLE', message: 'Could not load cart. Please try again.' }); }
});
module.exports = router;
