// Per-process, fixed-window IP limits. No untrusted X-Forwarded-For header is used.
function createAuthLimiter({ limit, windowMs, now = Date.now }) {
  const clients = new Map();
  return (req, res, next) => {
    const time = now();
    for (const [key, value] of clients) if (value.until <= time) clients.delete(key);
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    let entry = clients.get(key);
    if (!entry) {
      // Bound memory; refuse new identities if the active window is saturated.
      if (clients.size >= 10000) return res.status(429).json({ message: 'Too many requests. Please try again later.' });
      entry = { count: 0, until: time + windowMs };
      clients.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > limit) {
      const retryAfter = Math.max(1, Math.ceil((entry.until - time) / 1000));
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ message: 'Too many attempts. Please try again later.', retryAfter });
    }
    next();
  };
}
module.exports = { createAuthLimiter };
