const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
  tokenHash: { type: String, required: true, select: false },
  payload: { type: String, required: true, select: false },
  language: String,
  expiresAt: { type: Date, required: true },
  deleteAt: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'processing', 'sent', 'cancelled', 'dead'], default: 'pending' },
  attempts: { type: Number, default: 0 },
  availableAt: { type: Date, required: true },
  leaseId: String, leaseUntil: Date,
}, { timestamps: true, bufferCommands: false });
schema.index({ deleteAt: 1 }, { expireAfterSeconds: 0 });
schema.index({ status: 1, availableAt: 1, leaseUntil: 1 });
schema.index({ user: 1, status: 1 });
module.exports = mongoose.model('ResetMailJob', schema);
