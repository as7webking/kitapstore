const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
process.env.URI = 'mongodb://127.0.0.1:1/kitapstore_test';
process.env.JWT_SECRET = 'synthetic-checkout-test';
process.env.GOOGLE_CLIENT_ID = ''; process.env.GOOGLE_CLIENT_SECRET = '';
const { app } = require('../app');
const User = require('../models/user'), Book = require('../models/book'), Order = require('../models/order');
const { createToken } = require('../utils/jwt');
const { requestItems, snapshotItems, cents, historyRows } = require('../services/checkout');
const id = '507f1f77bcf86cd799439011', bookId = '507f1f77bcf86cd799439012', otherId = '507f1f77bcf86cd799439013';
const physical = { _id: bookId, title: 'Original title', author: 'Author', desc: 'Description', language: 'en', slug: 'original-title', type: 'physical', price: 10.25, shippingPrice: 2.5, isDeleted: false };

test('checkout rejects malformed identifiers, duplicate items, invalid quantity and invalid catalog money', () => {
  for (const order of [null, {}, [], [{ _id: 'bad' }], [{ _id: bookId }, { _id: bookId }], [{ _id: bookId, quantity: 0 }], [{ _id: bookId, quantity: 1.5 }], [{ _id: bookId, quantity: '2' }], [{ _id: bookId, quantity: 100 }]]) {
    assert.throws(() => requestItems({ order }));
  }
  assert.deepEqual(requestItems({ order: [{ _id: bookId, price: -100, user: 'forged' }] }), [{ book: bookId, quantity: 1 }]);
  for (const value of [-1, NaN, Infinity, '10', 0.001, Number.MAX_SAFE_INTEGER]) assert.throws(() => cents(value));
  assert.equal(cents(0.29), 29);
  for (const book of [null, { ...physical, isDeleted: true }, { ...physical, price: -1 }, { ...physical, shippingPrice: undefined }, { ...physical, type: 'digital', pdf: '' }]) {
    assert.throws(() => snapshotItems([{ book: bookId, quantity: 1 }], book ? [book] : []));
  }
  assert.throws(() => snapshotItems([{ book: bookId, quantity: 2 }], [{ ...physical, type: 'digital', pdf: 'synthetic' }]));
});

test('order snapshots include quantities and shipping and do not follow later catalog edits', () => {
  const book = { ...physical };
  const [line] = snapshotItems([{ book: bookId, quantity: 2 }], [book]);
  assert.equal(line.unitPriceCents, 1025); assert.equal(line.shippingCents, 250); assert.equal(line.lineTotalCents, 2550);
  book.price = 999; book.title = 'Edited'; book.isDeleted = true;
  const [row] = historyRows({ _id: id, items: [line], currency: 'EUR', totalCents: 2550 });
  assert.equal(row.book.title, 'Original title'); assert.equal(row.book.price, 10.25); assert.equal(row.quantity, 2);
  assert.equal(historyRows({ _id: id, book: null })[0].legacy, true);
});

test('HTTP checkout: auth, cart membership, atomic rollback, retries, races, legacy and frozen history', async () => {
  // This adapter simulates atomic commit/rollback and serial transaction conflicts.
  // It is not a real MongoDB replica-set test and never opens a database connection.
  const originals = [];
  const replace = (obj, key, fn) => { originals.push(() => { obj[key] = old; }); const old = obj[key]; obj[key] = fn; };
  const clone = (value) => structuredClone(value);
  let store = { users: [{ _id: id, role: 'user', sessionVersion: 0, address: 'Test address', cart: [bookId], orders: [], cartVersion: 0 }, { _id: otherId, role: 'admin', sessionVersion: 0, cart: [], orders: [] }], books: [clone(physical)], orders: [] };
  let failUpdate = false, noTransactions = false, tail = Promise.resolve();
  const matches = (value, query = {}) => Object.entries(query).every(([key, expected]) => {
    const actual = value[key];
    if (expected?.$ne !== undefined) return Array.isArray(actual) ? !actual.includes(expected.$ne) : actual !== expected.$ne;
    return Array.isArray(actual) ? actual.includes(expected) : String(actual) === String(expected);
  });
  const query = (get) => {
    const q = { select() { return q; }, session() { return q; }, populate() { return q; }, sort() { return q; }, lean() { return q; }, then(resolve, reject) { return Promise.resolve().then(() => clone(get())).then(resolve, reject); } }; return q;
  };
  replace(User, 'findById', (key) => query(() => store.users.find((u) => u._id === String(key)) || null));
  replace(User, 'updateOne', async (filter, update) => {
    if (failUpdate) throw new Error('synthetic write failure');
    const user = store.users.find((entry) => matches(entry, filter));
    if (!user) return { matchedCount: 0, modifiedCount: 0 };
    Object.assign(user, update.$set);
    for (const [key, value] of Object.entries(update.$inc || {})) user[key] = (user[key] || 0) + value;
    for (const [key, value] of Object.entries(update.$addToSet || {})) if (!user[key].includes(value)) user[key].push(value);
    for (const [key, value] of Object.entries(update.$pull || {})) user[key] = user[key].filter((entry) => entry !== value);
    return { matchedCount: 1, modifiedCount: 1 };
  });
  replace(Book, 'findById', (key) => query(() => store.books.find((b) => b._id === key) || null));
  replace(Book, 'find', (filter) => query(() => store.books.filter((b) => filter._id.$in.includes(b._id))));
  replace(Order, 'init', async () => {});
  replace(Order, 'findOne', (filter) => query(() => [...store.orders].reverse().find((o) => matches(o, filter)) || null));
  replace(Order, 'find', (filter) => query(() => store.orders.filter((o) => matches(o, filter))));
  replace(Order, 'create', async ([values]) => {
    if (store.orders.some((o) => o.user === values.user && o.idempotencyKey === values.idempotencyKey)) throw Object.assign(new Error('duplicate'), { code: 11000 });
    const doc = { ...clone(values), _id: String(store.orders.length + 1).padStart(24, '0'), status: 'Order Placed' };
    store.orders.push(doc); return [doc];
  });
  replace(mongoose.connection, 'transaction', async (fn) => {
    if (noTransactions) throw new Error('Standalone transactions unsupported');
    const previous = tail; let unlock; tail = new Promise((resolve) => { unlock = resolve; }); await previous;
    const before = clone(store);
    try { return await fn({}); } catch (error) { store = before; throw error; } finally { unlock(); }
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const token = createToken(store.users[0]), admin = createToken(store.users[1]);
  const request = async (route, body, key, auth = token, method = 'POST', headers = {}) => {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/${route}`, { method, headers: { 'content-type': 'application/json', ...(auth ? { authorization: `Bearer ${auth}` } : {}), ...(key ? { 'Idempotency-Key': key } : {}), ...headers }, ...(method !== 'GET' ? { body: JSON.stringify(body || {}) } : {}) });
    return { status: res.status, data: await res.json() };
  };
  const payload = { order: [{ _id: bookId, quantity: 2, price: 0.01, shippingPrice: -999 }], total: 0.01, user: otherId };
  const key = 'synthetic-checkout-0001';
  try {
    assert.equal((await request('place-order', payload, key, null)).status, 401);
    assert.equal((await request('place-order', payload, key, token, 'POST', { id: otherId })).status, 403);
    assert.equal((await request('place-order', payload, key, admin)).status, 403);
    const wrong = await request('place-order', { order: [{ _id: otherId }] }, key);
    assert.equal(wrong.data.code, 'ORDER_CART_CHANGED'); assert.equal(store.orders.length, 0);
    failUpdate = true;
    assert.equal((await request('place-order', payload, key)).status, 503);
    assert.equal(store.orders.length, 0); assert.deepEqual(store.users[0].cart, [bookId]);
    failUpdate = false;
    noTransactions = true;
    assert.equal((await request('place-order', payload, key)).status, 503); assert.equal(store.orders.length, 0);
    noTransactions = false;
    const [first, retry] = await Promise.all([request('place-order', payload, key), request('orders/place-order', payload, key)]);
    assert.equal(first.status, 200); assert.equal(retry.status, 200); assert.equal(store.orders.length, 1);
    assert.equal(first.data.order._id, retry.data.order._id); assert.equal(retry.data.replayed, true);
    assert.equal(first.data.order.totalCents, 2550); assert.equal(first.data.order.subtotalCents, 2050);
    assert.equal(first.data.order.shippingTotalCents, 500); assert.equal(first.data.order.currency, 'EUR');
    assert.deepEqual(store.users[0].cart, []); assert.deepEqual(store.users[0].orders, [first.data.order._id]);
    assert.equal((await request('place-order', { order: [{ _id: bookId, quantity: 1 }] }, key)).data.code, 'ORDER_KEY_CONFLICT');
    assert.equal((await request('place-order', payload, 'synthetic-another-key')).data.code, 'ORDER_CART_EMPTY');
    store.books[0].title = 'Edited'; store.books[0].price = 999; store.books[0].isDeleted = true;
    const history = await request('get-order-history', null, null, token, 'GET');
    assert.equal(history.data.data[0].book.title, 'Original title'); assert.equal(history.data.data[0].book.price, 10.25);
    store.users[0].cart = [bookId];
    assert.equal((await request('place-order', payload, 'synthetic-new-attempt')).data.code, 'ORDER_BOOK_UNAVAILABLE');
    store.books = [clone(physical)];
    const twoKeys = await Promise.all([request('place-order', payload, 'synthetic-key-2222'), request('place-order', payload, 'synthetic-key-3333')]);
    assert.deepEqual(twoKeys.map((r) => r.status).sort(), [200, 409]); assert.equal(store.orders.length, 2);
    store.users[0].cart = [bookId];
    const legacy = await request('place-order', { order: [{ _id: bookId, price: 1 }] });
    const legacyRetry = await request('place-order', { order: [{ _id: bookId, price: 9 }] });
    assert.equal(legacyRetry.data.order._id, legacy.data.order._id); assert.equal(store.orders.length, 3);
    store.users[0].cart = [bookId]; // A later genuine purchase of the same book is allowed.
    assert.equal((await request('place-order', { order: [{ _id: bookId }] })).status, 200); assert.equal(store.orders.length, 4);
    store.users[0].cart = [];
    await Promise.all([request('add-to-cart', {}, null, token, 'PUT', { bookid: bookId }), request('cart/add-to-cart', {}, null, token, 'PUT', { bookid: bookId })]);
    assert.deepEqual(store.users[0].cart, [bookId]);
    assert.equal((await request('get-all-orders', null, null, token, 'GET')).status, 403);
    assert.equal((await request('update-status/' + id, { status: 'invalid' }, null, admin, 'PUT')).status, 400);
  } finally {
    originals.reverse().forEach((restore) => restore());
    await new Promise((resolve) => server.close(resolve));
  }
});
