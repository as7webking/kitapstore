const { test } = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config = () => ({});
process.env.JWT_SECRET = 'synthetic-access-check-secret';
process.env.GOOGLE_CLIENT_ID = ''; process.env.GOOGLE_CLIENT_SECRET = '';
process.env.EMAIL_USER = ''; process.env.EMAIL_PASS = '';
const User = require('../models/user');
const Book = require('../models/book');
const Order = require('../models/order');
const { createToken } = require('../utils/jwt');
const jwt = require('jsonwebtoken');
const { app } = require('../app');

function query(value, observe = () => {}) {
  const result = { select(fields) { observe('select', fields); return this; }, populate(...args) { observe('populate', args); return this; },
    lean() { return this; }, sort() { return this; }, limit() { return this; },
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } };
  return result;
}
test('HTTP access matrix scopes private operations to session and protects every API alias', async () => {
  const a = '507f1f77bcf86cd799439011', b = '507f1f77bcf86cd799439012', admin = '507f1f77bcf86cd799439013';
  const users = new Map([a, b, admin].map((id) => [id, { _id: id, role: id === admin ? 'admin' : 'user',
    email: `${id}@example.test`, username: id, sessionVersion: 0, cart: [], favourites: [] }]));
  const token = createToken(users.get(a)), adminToken = createToken(users.get(admin));
  const staleRole = jwt.sign({ id: a, role: 'admin', version: 0 }, process.env.JWT_SECRET);
  const saved = [];
  function patch(object, name, value) { saved.push(() => { object[name] = original; }); const original = object[name]; object[name] = value; }
  const writes = [], reads = [];
  patch(User, 'findById', (id) => { reads.push(String(id)); return query(users.get(String(id)) || null); });
  patch(User, 'updateOne', async (filter) => { writes.push(filter); return { modifiedCount: 1 }; });
  patch(User, 'findByIdAndUpdate', async (id) => { writes.push({ _id: id }); return {}; });
  patch(User, 'findByIdAndDelete', async (id) => { writes.push({ _id: id }); return null; });
  patch(Book, 'find', () => query([]));
  patch(Book, 'findById', () => query({ _id: b, isDeleted: false }));
  patch(Book, 'findByIdAndUpdate', async () => ({}));
  patch(Order, 'find', (filter) => { assert.equal(filter.user, a); return query([{ _id: 'own-order', user: a }]); });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(method, path, auth, headers = {}, body) {
    return fetch(base + path, { method, headers: { ...(auth ? { authorization: `Bearer ${auth}` } : {}), 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  }
  const privateRoutes = [
    ['GET', '/api/v1/user/get-user-information'], ['DELETE', '/api/v1/user/delete-account'], ['POST', '/api/v1/user/sign-out'],
    ...['/api/v1', '/api/v1/cart'].flatMap((prefix) => [['GET', `${prefix}/get-user-cart`], ['PUT', `${prefix}/add-to-cart`], ['PUT', `${prefix}/remove-from-cart/${b}`]]),
    ...['/api/v1', '/api/v1/favourites'].flatMap((prefix) => [['GET', `${prefix}/get-favourite-books`], ['PUT', `${prefix}/add-book-to-favourite`], ['PUT', `${prefix}/remove-book-from-favourite`]]),
    ...['/api/v1', '/api/v1/orders'].flatMap((prefix) => [['GET', `${prefix}/get-order-history`], ['POST', `${prefix}/place-order`]]),
  ];
  const adminRoutes = [
    ...['/api/v1', '/api/v1/books'].flatMap((prefix) => [['POST', `${prefix}/add-book`], ['PUT', `${prefix}/update-book`], ['DELETE', `${prefix}/delete-book`]]),
    ...['/api/v1', '/api/v1/orders'].flatMap((prefix) => [['GET', `${prefix}/get-all-orders`], ['PUT', `${prefix}/update-status/${b}`]]),
    ['POST', '/api/v1/blog/add-blog'],
  ];
  try {
    for (const [method, path] of [...privateRoutes, ...adminRoutes]) {
      const guest = await request(method, path, null, {}, method === 'GET' ? undefined : {});
      assert.equal(guest.status, 401, path); assert.equal(guest.headers.get('cache-control'), 'no-store');
      const spoof = await request(method, path, token, { id: b }, method === 'GET' ? undefined : { user: b, role: 'admin' });
      assert.equal(spoof.status, 403, path);
    }
    assert.equal(writes.length, 0);
    for (const [method, path] of adminRoutes) {
      const response = await request(method, path, staleRole, { role: 'admin' }, method === 'GET' ? undefined : { role: 'admin', user: b });
      assert.equal(response.status, 403, path);
    }
    const profile = await request('GET', `/api/v1/user/get-user-information?id=${b}&role=admin`, token);
    assert.equal(profile.status, 200); assert.equal((await profile.json())._id, a);
    for (const prefix of ['/api/v1', '/api/v1/orders']) {
      const response = await request('GET', `${prefix}/get-order-history?user=${b}`, token);
      assert.equal(response.status, 200); assert.equal((await response.json()).data[0].user, a);
    }
    for (const prefix of ['/api/v1', '/api/v1/cart']) {
      const response = await request('PUT', `${prefix}/add-to-cart`, token, { bookid: b }, { id: b, user: b, role: 'admin' });
      assert.equal(response.status, 200); assert.equal(writes.at(-1)._id, a);
      const cart = await request('GET', `${prefix}/get-user-cart?user=${b}`, token);
      assert.equal(cart.status, 200); assert.deepEqual((await cart.json()).data, []);
    }
    for (const prefix of ['/api/v1', '/api/v1/favourites']) {
      for (const action of ['add-book-to-favourite', 'remove-book-from-favourite']) {
        users.get(a).favourites = action === 'add-book-to-favourite' ? [] : [b];
        const response = await request('PUT', `${prefix}/${action}`, token, { bookid: b }, { id: b, user: b, role: 'admin' });
        assert.equal(response.status, 200); assert.equal(writes.at(-1)._id, a);
      }
    }
    const deletion = await request('DELETE', '/api/v1/user/delete-account', token, {}, { id: b });
    assert.equal(deletion.status, 404); assert.equal(writes.at(-1)._id, a);
    // Simulate demotion after token issuance: current database role must win.
    users.get(admin).role = 'user';
    assert.equal((await request('PUT', '/api/v1/books/update-book', adminToken, { bookid: b }, {})).status, 403);
    users.get(admin).role = 'admin';
    const adminWrite = await request('PUT', '/api/v1/books/update-book', adminToken, { bookid: b }, {});
    assert.equal(adminWrite.status, 200);
    assert.ok(!reads.includes(b));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    saved.reverse().forEach((restore) => restore());
  }
});

test('public catalog and favourite projections exclude private PDF payloads on all aliases', async () => {
  const saved = [];
  function patch(object, name, value) { const original = object[name]; saved.push(() => { object[name] = original; }); object[name] = value; }
  const book = { _id: '507f1f77bcf86cd799439012', title: 'Synthetic book', pdf: 'private-pdf-canary' };
  function projection(list) {
    let selected = false;
    const result = query(null);
    result.select = (fields) => { selected = fields.split(' ').includes('-pdf'); return result; };
    result.then = (resolve, reject) => {
      const data = { ...book }; if (selected) delete data.pdf;
      return Promise.resolve(list ? [data] : data).then(resolve, reject);
    };
    return result;
  }
  patch(Book, 'find', () => projection(true)); patch(Book, 'findById', () => projection(false)); patch(Book, 'findOne', () => projection(false));
  const user = { _id: '507f1f77bcf86cd799439011', role: 'user', sessionVersion: 0 };
  patch(User, 'findById', () => {
    const result = query(user);
    result.populate = (name, fields) => { assert.equal(name, 'favourites'); assert.equal(fields, '-pdf'); return query({ favourites: [{ title: book.title }] }); };
    return result;
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const prefix of ['/api/v1', '/api/v1/books']) for (const route of ['get-all-books', 'get-recent-books', 'get-popular-books', `get-book-by-id/${book._id}`, 'get-book-by-slug/synthetic', 'search?q=synthetic']) {
      const response = await fetch(`${base}${prefix}/${route}`);
      assert.equal(response.status, 200, route); assert.doesNotMatch(await response.text(), /private-pdf-canary|"pdf"/);
    }
    for (const prefix of ['/api/v1', '/api/v1/favourites']) {
      const response = await fetch(`${base}${prefix}/get-favourite-books`, { headers: { authorization: `Bearer ${createToken(user)}` } });
      assert.equal(response.status, 200); assert.doesNotMatch(await response.text(), /private-pdf-canary|"pdf"/);
    }
  } finally { await new Promise((resolve) => server.close(resolve)); saved.reverse().forEach((restore) => restore()); }
});
