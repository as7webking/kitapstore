const mongoose = require('mongoose');
const snapshot = new mongoose.Schema({ title: String, author: String, slug: String, desc: String, language: String, type: String }, { _id: false });
const item = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  quantity: { type: Number, required: true, min: 1, max: 99, validate: Number.isInteger },
  unitPriceCents: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  shippingCents: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  lineTotalCents: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  snapshot: { type: snapshot, required: true },
}, { _id: false });
const order = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' }, // Read-only compatibility with old documents.
  items: { type: [item], default: undefined },
  idempotencyKey: String, requestHash: String, cartVersion: Number,
  currency: { type: String, enum: ['EUR'] },
  subtotalCents: Number, shippingTotalCents: Number, totalCents: Number, address: String,
  status: { type: String, default: 'Order Placed', enum: ['Order Placed', 'Out for delivery', 'Delivered', 'Canceled'] },
}, { timestamps: true });
order.index({ user: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
module.exports = mongoose.model('order', order);
