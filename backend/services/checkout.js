const crypto = require('node:crypto');
const mongoose = require('mongoose');
const User = require('../models/user');
const Book = require('../models/book');
const Order = require('../models/order');

class CheckoutError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
const validId = (value) => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
function cents(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || !Number.isSafeInteger(Math.round(value * 100)) || Math.abs(value * 100 - Math.round(value * 100)) > 1e-7) throw new CheckoutError('ORDER_PRICE_INVALID', 409);
  return Math.round(value * 100);
}
function requestItems(body) {
  if (!body || !Array.isArray(body.order) || !body.order.length || body.order.length > 100) throw new CheckoutError('ORDER_ITEMS_INVALID');
  const items = body.order.map((item) => {
    if (!item || typeof item !== 'object' || !validId(item._id)) throw new CheckoutError('ORDER_ITEMS_INVALID');
    const quantity = item.quantity === undefined ? 1 : item.quantity;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new CheckoutError('ORDER_QUANTITY_INVALID');
    return { book: item._id.toLowerCase(), quantity };
  }).sort((a, b) => a.book.localeCompare(b.book));
  if (new Set(items.map(({ book }) => book)).size !== items.length) throw new CheckoutError('ORDER_ITEMS_INVALID');
  return items;
}
function snapshotItems(items, books) {
  return items.map(({ book: id, quantity }) => {
    const book = books.find((entry) => String(entry._id) === id);
    if (!book || book.isDeleted || !['physical', 'digital'].includes(book.type) || (book.type === 'digital' && !book.pdf)) throw new CheckoutError('ORDER_BOOK_UNAVAILABLE', 409);
    if (book.type === 'digital' && quantity !== 1) throw new CheckoutError('ORDER_QUANTITY_INVALID');
    const unitPriceCents = cents(book.price);
    const shippingCents = book.type === 'physical' ? cents(book.shippingPrice) : 0;
    const lineTotalCents = (unitPriceCents + shippingCents) * quantity;
    if (!Number.isSafeInteger(lineTotalCents)) throw new CheckoutError('ORDER_PRICE_INVALID', 409);
    return { book: id, quantity, unitPriceCents, shippingCents, lineTotalCents,
      snapshot: { title: book.title, author: book.author, slug: book.slug, desc: book.desc, language: book.language, type: book.type } };
  });
}
function publicOrder(order) {
  return { _id: order._id, status: order.status, currency: order.currency, items: order.items,
    subtotalCents: order.subtotalCents, shippingTotalCents: order.shippingTotalCents, totalCents: order.totalCents, createdAt: order.createdAt };
}
async function checkout(userId, version, body, headerKey) {
  const items = requestItems(body);
  const requestHash = crypto.createHash('sha256').update(JSON.stringify(items)).digest('hex');
  const key = headerKey ?? body.idempotencyKey;
  if (key !== undefined && (typeof key !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(key))) throw new CheckoutError('ORDER_KEY_INVALID');
  await Order.init(); // Do not rely on uniqueness until the partial unique index is ready.
  let result;
  const replay = (order) => {
    if (order.requestHash !== requestHash) throw new CheckoutError('ORDER_KEY_CONFLICT', 409);
    result = { order: publicOrder(order), replayed: true };
  };
  try {
    await mongoose.connection.transaction(async (session) => {
      const user = await User.findById(userId).select('+sessionVersion').session(session);
      if (!user || (user.sessionVersion || 0) !== version) throw new CheckoutError('ORDER_SESSION_INVALID', 401);
      if (user.role !== 'user') throw new CheckoutError('ORDER_CUSTOMER_REQUIRED', 403);
      if (key) {
        const previous = await Order.findOne({ user: userId, idempotencyKey: key }).session(session);
        if (previous) { replay(previous); return; }
      }
      const cart = [...new Set(user.cart.map(String))].sort();
      if (!cart.length) {
        // Legacy clients have no key. A retry of the last checkout can still be recovered.
        const previous = !key && await Order.findOne({ user: userId, requestHash, cartVersion: (user.cartVersion || 0) - 1 }).session(session);
        if (previous) { replay(previous); return; }
        throw new CheckoutError('ORDER_CART_EMPTY', 409);
      }
      if (cart.length !== items.length || cart.some((id, i) => id !== items[i].book)) throw new CheckoutError('ORDER_CART_CHANGED', 409);
      if (typeof user.address !== 'string' || !user.address.trim() || user.address.length > 500) throw new CheckoutError('ORDER_ADDRESS_REQUIRED', 409);
      const books = await Book.find({ _id: { $in: cart } }).session(session).lean();
      const snapshots = snapshotItems(items, books);
      const subtotalCents = snapshots.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
      const shippingTotalCents = snapshots.reduce((sum, item) => sum + item.shippingCents * item.quantity, 0);
      const totalCents = subtotalCents + shippingTotalCents;
      if (!Number.isSafeInteger(totalCents)) throw new CheckoutError('ORDER_PRICE_INVALID', 409);
      const [created] = await Order.create([{
        user: userId, idempotencyKey: key || `legacy-${user.cartVersion || 0}-${requestHash}`,
        requestHash, cartVersion: user.cartVersion || 0, items: snapshots, currency: 'EUR',
        subtotalCents, shippingTotalCents, totalCents, address: user.address.trim(),
      }], { session });
      await User.updateOne({ _id: userId }, { $set: { cart: [] }, $inc: { cartVersion: 1 }, $addToSet: { orders: created._id } }, { session });
      result = { order: publicOrder(created), replayed: false };
    });
  } catch (error) {
    if (error.code === 11000) {
      const previous = await Order.findOne({ user: userId, ...(key ? { idempotencyKey: key } : { requestHash }) }).sort({ createdAt: -1 });
      if (previous) { replay(previous); return result; }
    }
    if (error instanceof CheckoutError) throw error;
    // No standalone fallback: partial orders are worse than an explicit unavailable response.
    throw new CheckoutError('ORDER_UNAVAILABLE', 503);
  }
  return result;
}
// Existing history clients expect one row with .book per line. New rows use frozen snapshots.
function historyRows(order) {
  if (!order.items?.length) return [{ ...order, book: order.book || { title: '', desc: '', price: null }, legacy: true }];
  return order.items.map((item, index) => ({ _id: order._id, lineId: `${order._id}-${index}`, createdAt: order.createdAt,
    status: order.status, user: order.user, quantity: item.quantity, totalCents: order.totalCents,
    lineTotalCents: item.lineTotalCents, currency: order.currency,
    book: { ...item.snapshot, _id: item.book, price: item.unitPriceCents / 100 },
  }));
}
module.exports = { CheckoutError, validId, cents, requestItems, snapshotItems, checkout, historyRows };
