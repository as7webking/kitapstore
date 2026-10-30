const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// All test credentials are synthetic; never connect tests to the developer database.
process.env.URI = 'mongodb://127.0.0.1:1/kitapstore_test';
process.env.JWT_SECRET = 'test-only-secret';
process.env.GOOGLE_CLIENT_ID = '';
process.env.GOOGLE_CLIENT_SECRET = '';
process.env.EMAIL_USER = '';
process.env.EMAIL_PASS = '';
const { validateEnv } = require('../config/env');
const { createToken, verifyToken } = require('../utils/jwt');
const { app, start } = require('../app');

test('required environment is validated without disclosing connection details', () => {
  assert.throws(() => validateEnv({}), /URI, JWT_SECRET/);
  assert.throws(() => validateEnv({ URI: 'private-value', JWT_SECRET: 'x' }), /URI must be/);
  assert.throws(() => validateEnv({ URI: process.env.URI, JWT_SECRET: 'x', PORT: '-1' }), /PORT/);
  assert.equal(validateEnv(process.env).port, 1001);
});

test('CLI fails before listening when required settings are missing', () => {
  for (const key of ['URI', 'JWT_SECRET']) {
    const result = spawnSync(process.execPath, [path.join(__dirname, '../app.js')], {
      env: { ...process.env, [key]: '' }, encoding: 'utf8', timeout: 10000,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, new RegExp(`Missing required environment variables: ${key}`));
    assert.doesNotMatch(result.stdout, /Server running/);
  }
});

function authenticate(token, id) {
  let status, body, next = false;
  const req = { headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(id ? { id } : {}) } };
  const res = { status(code) { status = code; return this; }, json(value) { body = value; return this; } };
  verifyToken(req, res, () => { next = true; });
  return { req, status, body, next };
}

test('JWT creation and verification share identity, secret and expiry', () => {
  const user = { _id: '507f1f77bcf86cd799439011', role: 'user', username: 'reader' };
  const token = createToken(user);
  const result = authenticate(token);
  assert.equal(result.next, true);
  assert.equal(result.req.user.id, user._id);
  assert.equal(result.req.headers.id, user._id);
  assert.equal(result.req.user.exp - result.req.user.iat, 7 * 24 * 60 * 60);
  assert.equal(authenticate(token, 'another-user').status, 403);
  assert.equal(authenticate().status, 401);
  assert.equal(authenticate(jwt.sign({ id: user._id }, 'wrong-secret')).status, 401);
  assert.equal(authenticate(jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: -1 })).status, 401);
  assert.equal(authenticate(jwt.sign({ authClaims: [] }, process.env.JWT_SECRET)).status, 401);
});

test('HTTP listening follows database connection; failures are sanitized', async () => {
  const originalConnect = mongoose.connect;
  const originalListen = app.listen;
  const events = [];
  try {
    mongoose.connect = async () => { events.push('database'); };
    app.listen = () => { events.push('listen'); return 'server'; };
    assert.equal(await start(), 'server');
    assert.deepEqual(events, ['database', 'listen']);
    events.length = 0;
    mongoose.connect = async () => { throw new Error('sensitive-connection-string'); };
    await assert.rejects(start(), (error) => {
      assert.match(error.message, /MongoDB connection failed/);
      assert.doesNotMatch(error.message, /sensitive/);
      return true;
    });
    assert.deepEqual(events, []);
  } finally {
    mongoose.connect = originalConnect;
    app.listen = originalListen;
  }
});

test('book and post validation hooks work with installed Mongoose', async () => {
  const Book = require('../models/book');
  const Post = require('../models/post');
  const book = new Book({ title: 'Test Book', author: 'Author', url: 'cover.jpg', price: 10, desc: 'Text', language: 'ru', type: 'physical', shippingPrice: 0 });
  await book.validate();
  book.type = 'digital';
  await assert.rejects(book.validate(), /PDF/);
  const post = new Post({ title: 'Test Post', content: 'Sample content' });
  await post.validate();
  assert.equal(post.slug, 'test-post');
  assert.equal(post.excerpt, 'Sample content');
  assert.equal(require('../models/user').schema.path('cart').caster?.options?.ref ?? require('../models/user').schema.path('cart').embeddedSchemaType.options.ref, 'Book');
});

test('API smoke: public health, disabled OAuth, legacy and namespaced protected routes', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    assert.equal(await (await fetch(`${origin}/api/v1/test`)).text(), 'API OK');
    // Exercise ordinary registration/login without OAuth, SMTP or a real database.
    const User = require('../models/user');
    const findOne = User.findOne;
    const save = User.prototype.save;
    let savedUser;
    try {
      User.findOne = async () => savedUser || null;
      User.prototype.save = async function () { savedUser = this; return this; };
      const credentials = { username: 'reader', email: 'reader@example.test', password: 'test-password', address: 'Test address' };
      const post = (route) => fetch(`${origin}/api/v1/user/${route}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials),
      });
      assert.equal((await post('sign-up')).status, 200);
      assert.notEqual(savedUser.password, credentials.password);
      const login = await post('sign-in');
      assert.equal(login.status, 200);
      const session = await login.json();
      assert.equal(authenticate(session.token).req.user.id, session.id);
      assert.equal((await post('sign-up')).status, 400);
    } finally {
      User.findOne = findOne;
      User.prototype.save = save;
    }
    for (const provider of ['google', 'facebook']) {
      const response = await fetch(`${origin}/api/v1/user/auth/${provider}`);
      assert.equal(response.status, 503);
    }
    for (const route of ['get-user-cart', 'cart/get-user-cart', 'get-order-history', 'orders/get-order-history', 'get-favourite-books', 'favourites/get-favourite-books']) {
      assert.equal((await fetch(`${origin}/api/v1/${route}`)).status, 401, route);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

after(() => mongoose.disconnect());
