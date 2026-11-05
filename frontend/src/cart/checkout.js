export function checkoutAttempt(cart, userId, storage = globalThis.sessionStorage) {
  const order = cart.map(({ _id, quantity = 1 }) => ({ _id, quantity })).sort((a, b) => a._id.localeCompare(b._id));
  const fingerprint = JSON.stringify(order);
  const storageKey = `kitapstore.checkout.${userId}`;
  try {
    const saved = JSON.parse(storage?.getItem(storageKey) || 'null');
    if (saved?.fingerprint === fingerprint && /^[A-Za-z0-9_-]{16,128}$/.test(saved.key)) return { order, key: saved.key, storageKey };
  } catch { /* Keep the in-memory attempt if storage is unavailable. */ }
  const key = crypto.randomUUID();
  try { storage?.setItem(storageKey, JSON.stringify({ fingerprint, key })); } catch { /* The component retains its key during retries. */ }
  return { order, key, storageKey };
}
export function cartTotalCents(cart) {
  return cart.reduce((sum, book) => sum + (Math.round(Number(book.price) * 100) + (book.type === 'physical' ? Math.round(Number(book.shippingPrice || 0) * 100) : 0)) * (book.quantity || 1), 0);
}
