const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
process.env.URI = 'mongodb://127.0.0.1:1/test';
process.env.JWT_SECRET = 'synthetic-account-test-secret';
process.env.GOOGLE_CLIENT_ID = '';
process.env.GOOGLE_CLIENT_SECRET = '';
process.env.EMAIL_USER = '';
process.env.EMAIL_PASS = '';
const { app } = require('../app');
const User = require('../models/user');
const { createToken } = require('../utils/jwt');
const { registration } = require('../utils/accountValidation');
const { createAuthLimiter } = require('../middleware/authRateLimit');

test('registration validates types, email, Unicode byte limits and trims values', () => {
  const valid = { username: ' Reader ', email: ' READER@Example.COM ', password: 'password123', address: ' Berlin ' };
  assert.deepEqual(registration(valid).values, { username: 'Reader', email: 'reader@example.com', password: 'password123', address: 'Berlin' });
  for (const body of [{}, null, [], 12, "invalid"]) {
    assert.equal(Object.keys(registration(body).errors).length, 4);
  }
  for (const value of [null, {}, 12, '        ', 'x', 'x'.repeat(73), '😀'.repeat(19)]) {
    assert.ok(registration({ ...valid, password: value }).errors.password);
  }
  assert.ok(registration({ ...valid, email: { $ne: '' } }).errors.email);
  assert.ok(registration({ ...valid, username: '<script>' }).errors.username);
});

test('rate limit counts attempts per IP, provides retry time and resets after its window', () => {
  let now = 0;
  const limit = createAuthLimiter({ limit: 2, windowMs: 1000, now: () => now });
  let allowed = 0, code, retry;
  const res = { set(_, value) { retry = value; }, status(value) { code = value; return this; }, json() {} };
  const request = (ip) => limit({ ip }, res, () => { allowed++; });
  request('a'); request('a'); request('a');
  assert.equal(allowed, 2); assert.equal(code, 429); assert.equal(retry, '1');
  request('b'); assert.equal(allowed, 3);
  now = 1001; request('a'); assert.equal(allowed, 4);
});

test('HTTP account lifecycle: normalized signup, duplicate races, login, permissions and revocation', async () => {
  const originals = { findOne: User.findOne, create: User.create, findById: User.findById, updateOne: User.updateOne };
  const users = [];
  let duplicateRace = false;
  const matches = (user, query) => query.$or ? query.$or.some((item) => matches(user, item)) : Object.entries(query).every(([key, value]) =>
    value?.$regex ? new RegExp(value.$regex, value.$options).test(user[key]) : String(user[key]) === String(value));
  User.findOne = (query) => {
    const user = users.find((item) => matches(item, query)) || null;
    return { then(resolve, reject) { return Promise.resolve(user).then(resolve, reject); }, select: async () => user };
  };
  User.create = async (values) => {
    if (duplicateRace) throw Object.assign(new Error('duplicate'), { code: 11000 });
    const user = new User(values);
    await user.validate();
    users.push(user);
    return user;
  };
  User.findById = (id) => ({ select: async () => users.find((user) => String(user._id) === id) || null });
  User.updateOne = async (query, update) => {
    const user = users.find((item) => String(item._id) === query._id);
    user.sessionVersion = (user.sessionVersion || 0) + update.$inc.sessionVersion;
    return { modifiedCount: 1 };
  };
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = async (route, body, token, method = 'POST', headers = {}) => {
    const response = await fetch(origin + '/api/v1/' + route, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, ...(body && method !== 'GET' ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json(), retry: response.headers.get('retry-after') };
  };
  const values = { username: ' Reader ', email: ' READER@Example.COM ', password: 'password123', address: ' Berlin ', role: 'admin', sessionVersion: 99 };
  try {
    const invalid = await request('user/sign-up', { email: 'bad' });
    assert.equal(invalid.status, 400); assert.ok(invalid.body.errors.password);
    assert.equal((await request('user/sign-up', values)).status, 201);
    assert.equal(users[0].email, 'reader@example.com'); assert.equal(users[0].username, 'Reader');
    assert.equal(users[0].role, 'user'); assert.equal(users[0].sessionVersion, 0);
    assert.notEqual(users[0].password, values.password); assert.ok(await bcrypt.compare(values.password, users[0].password));
    const duplicate = await request('user/sign-up', { ...values, username: 'Other', email: 'Reader@EXAMPLE.com' });
    assert.equal(duplicate.status, 409); assert.ok(duplicate.body.errors.email); assert.equal(duplicate.body.errors.username, undefined);
    duplicateRace = true;
    assert.equal((await request('user/sign-up', { ...values, username: 'Racer', email: 'race@example.com' })).status, 409);
    duplicateRace = false;
    assert.equal((await request('user/sign-in', { username: { $ne: null }, password: 'password123' })).status, 400);
    assert.equal((await request('user/sign-in', { username: 'Reader', password: 'wrong' })).status, 401);
    assert.equal((await request('user/sign-in', { username: 'Missing', password: 'wrong' })).status, 401);
    const login = await request('user/sign-in', { username: ' READER@example.com ', password: values.password });
    assert.equal(login.status, 200);
    const token = login.body.token;
    const profile = await request('user/get-user-information', null, token, 'GET');
    assert.equal(profile.status, 200); assert.equal(profile.body.email, 'reader@example.com');
    assert.equal(profile.body.password, undefined); assert.equal(profile.body.sessionVersion, undefined);
    assert.equal((await request('user/get-user-information', null, null, 'GET')).status, 401);
    assert.equal((await request('user/get-user-information', null, token, 'GET', { id: new mongoose.Types.ObjectId().toString() })).status, 403);
    const forgedRole = jwt.sign({ id: String(users[0]._id), role: 'admin', version: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    for (const [route, method] of [['get-all-orders', 'GET'], ['update-book', 'PUT'], ['delete-book', 'DELETE'], ['blog/add-blog', 'POST'], ['orders/update-status/anything', 'PUT']]) {
      assert.equal((await request(route, {}, forgedRole, method)).status, 403, route);
    }
    const expired = jwt.sign({ id: String(users[0]._id) }, process.env.JWT_SECRET, { expiresIn: -1 });
    assert.equal((await request('user/get-user-information', null, expired, 'GET')).status, 401);
    assert.equal((await request('user/sign-out', {}, token)).status, 200);
    assert.equal((await request('user/get-user-information', null, token, 'GET')).status, 401);
    const secondLogin = await request('user/sign-in', { username: 'Reader', password: values.password });
    assert.equal(secondLogin.status, 200);
    assert.equal((await request('user/get-user-information', null, secondLogin.body.token, 'GET')).status, 200);
    // Fresh database role overrides a token minted before demotion.
    users[0].role = 'admin'; const adminToken = createToken(users[0]); users[0].role = 'user';
    assert.equal((await request('orders/get-all-orders', null, adminToken, 'GET')).status, 403);
    users.length = 0;
    assert.equal((await request('user/get-user-information', null, secondLogin.body.token, 'GET')).status, 401);
    User.findById = () => ({ select: async () => { throw new Error('database unavailable'); } });
    assert.equal((await request('user/get-user-information', null, secondLogin.body.token, 'GET')).status, 503);
    let limited;
    for (let i = 0; i < 16; i++) { limited = await request('user/sign-in', {}); if (limited.status === 429) break; }
    assert.equal(limited.status, 429); assert.ok(Number(limited.retry) > 0);
    assert.equal((await request('user/sign-up', {})).status, 400); // fifth signup attempt
    assert.equal((await request('user/sign-up', {})).status, 429);
  } finally {
    Object.assign(User, originals);
    await new Promise((resolve) => server.close(resolve));
  }
});
after(() => mongoose.disconnect());
