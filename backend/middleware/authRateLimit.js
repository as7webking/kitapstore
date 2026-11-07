const crypto = require('node:crypto');
const Counters = require('../models/authRateLimit');

async function consumeAttempt(scope, ip, limit, windowMs) {
  const normalizedIP = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  const _id = `auth-v1:${scope}:${crypto.createHash('sha256').update(normalizedIP).digest('hex')}`;
  const expired = { $lte: [{ $ifNull: ['$until', new Date(0)] }, '$$NOW'] };
  const pipeline = [{ $set: {
    count: { $cond: [expired, 1, { $min: [limit + 1, { $add: [{ $ifNull: ['$count', 0] }, 1] }] }] },
    until: { $cond: [expired, { $add: ['$$NOW', windowMs] }, '$until'] },
    observedAt: '$$NOW',
  } }];
  const options = {
    upsert: true, returnDocument: 'after', includeResultMetadata: false,
    writeConcern: { w: 'majority' }, timeoutMS: 3000,
  };
  let record;
  try {
    record = await Counters.collection.findOneAndUpdate({ _id }, pipeline, options);
  } catch (error) {
    if (error.code !== 11000) throw error;
    // Two processes may try to insert a new counter together. Retry the loser
    // against the same unique _id; do not create a separate local counter.
    record = await Counters.collection.findOneAndUpdate({ _id }, pipeline, options);
  }
  if (!record || !Number.isInteger(record.count) || record.count < 1 ||
      !(record.until instanceof Date) || !(record.observedAt instanceof Date) ||
      !Number.isFinite(record.until.getTime()) || !Number.isFinite(record.observedAt.getTime()) ||
      record.until <= record.observedAt) throw new Error('Invalid rate limit result');
  return { allowed: record.count <= limit, retryAfter: Math.max(1, Math.ceil((record.until - record.observedAt) / 1000)) };
}
function createAuthLimiter({ scope, limit, windowMs }) {
  if (!/^[a-z-]{1,40}$/.test(scope || '') || !Number.isSafeInteger(limit) || limit < 1 || limit >= Number.MAX_SAFE_INTEGER || !Number.isSafeInteger(windowMs) || windowMs < 1) {
    throw new Error('Invalid auth limiter configuration');
  }
  return async (req, res, next) => {
    try {
      const ip = req.ip || req.socket?.remoteAddress || 'unknown';
      const result = await consumeAttempt(scope, ip, limit, windowMs);
      if (result.allowed) return next();
      res.set('Retry-After', String(result.retryAfter));
      return res.status(429).json({ code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.', retryAfter: result.retryAfter });
    } catch {
      // No in-memory fallback: a database outage must not bypass account limits.
      return res.status(503).set('Cache-Control', 'no-store').json({ code: 'RATE_LIMIT_UNAVAILABLE', message: 'Request checking is unavailable. Please try again later.' });
    }
  };
}
module.exports = { createAuthLimiter, consumeAttempt };
