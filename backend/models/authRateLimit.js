const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  _id: String,
  count: Number,
  until: Date,
  observedAt: Date,
}, { collection: 'auth_rate_limits', bufferCommands: false, versionKey: false });
// Cleanup only: a stale document is reset atomically even when TTL is delayed.
schema.index({ until: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model('AuthRateLimit', schema);
