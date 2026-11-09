const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
process.env.URI = 'mongodb://127.0.0.1:1/test';
process.env.JWT_SECRET = 'synthetic-reset-test-secret';
process.env.GOOGLE_CLIENT_ID = '';
process.env.GOOGLE_CLIENT_SECRET = '';
process.env.FRONTEND_URL = 'https://shop.example.test';
process.env.PASSWORD_RESET_TTL_MINUTES = '30';
process.env.EMAIL_HOST = 'smtp.example.test';
process.env.EMAIL_PORT = '587';
process.env.EMAIL_USER = 'test@example.test';
process.env.EMAIL_PASS = 'synthetic-smtp-password';
process.env.EMAIL_FROM = 'KitapStore <test@example.test>';
const { app } = require('../app');
const fakeRateLimits = require('./helpers/rateLimitStore').installFakeRateLimits();
after(() => fakeRateLimits.restore());
const User = require('../models/user');
const { createToken } = require('../utils/jwt');
const { createResetMailWorker } = require('../services/resetMailWorker');
const { installFakeResetMailQueue } = require('./helpers/resetMailQueue');
process.env.RESET_MAIL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');

test('recovery HTTP: private responses, hashed token, expiry, single use, revocation, races, SMTP failure and limits', async () => {
  const keys = ['findOne', 'findById', 'updateOne', 'findOneAndUpdate'];
  const originals = Object.fromEntries(keys.map((key) => [key, User[key]]));
  const originalTransport = nodemailer.createTransport;
  const originalWarning = console.warn;
  const warnings = [], mail = [], options = [];
  let mailFails = false, databaseFails = false;
  const queue = installFakeResetMailQueue();
  const worker = createResetMailWorker();
  const initialPassword = await bcrypt.hash('original-password', 12);
  const user = { _id: '507f1f77bcf86cd799439011', email: 'Reader@Example.com', username: 'Reader', password: initialPassword, role: 'user', authProvider: 'local', sessionVersion: 0 };
  const matches = (query) => Object.entries(query).every(([key, value]) => {
    if (value?.$regex) return new RegExp(value.$regex, value.$options).test(user[key]);
    if (value?.$in) return value.$in.includes(user[key] ?? null);
    if (value?.$type) return typeof user[key] === value.$type;
    if (value?.$gt) return user[key] > value.$gt;
    return String(user[key]) === String(value);
  });
  const apply = (update) => {
    Object.assign(user, update.$set);
    for (const key of Object.keys(update.$unset || {})) delete user[key];
    for (const [key, value] of Object.entries(update.$inc || {})) user[key] = (user[key] || 0) + value;
  };
  User.findOne = (query) => ({ session() { return this; }, select: async () => matches(query) ? { ...user } : null });
  User.findById = (id) => ({ select: async () => id === user._id ? { ...user } : null });
  User.updateOne = async (query, update) => { if (matches(query)) apply(update); return { modifiedCount: 1 }; };
  User.findOneAndUpdate = (query, update) => ({ select: async () => {
    if (databaseFails) throw new Error('synthetic database failure');
    if (!matches(query)) return null;
    const before = { ...user }; apply(update); return before;
  } });
  nodemailer.createTransport = (config) => { options.push(config); return { sendMail: async (message) => {
    if (mailFails) throw new Error('synthetic SMTP failure');
    mail.push(message);
  } }; };
  console.warn = (message) => warnings.push(message);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const origin = `http://127.0.0.1:${server.address().port}/api/v1/user`;
  const post = async (path, body) => {
    const response = await fetch(`${origin}/${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json(), headers: response.headers };
  };
  const tokenFromMail = () => {
    const link = mail.at(-1).text.match(/https:\/\/[^\s]+/)[0];
    const url = new URL(link);
    assert.equal(url.origin, process.env.FRONTEND_URL);
    assert.equal(url.pathname, '/reset-password');
    assert.equal(url.search, '');
    return new URLSearchParams(url.hash.slice(1)).get('token');
  };
  const payload = (token) => ({ token, password: 'new-password-123', confirmPassword: 'new-password-123' });
  try {
    assert.equal((await post('forgot-password', { email: { $ne: '' } })).status, 400);
    const known = await post('forgot-password', { email: ' READER@example.COM ' });
    assert.equal(known.status, 202); assert.equal(known.body.code, 'PASSWORD_RESET_REQUESTED');
    assert.equal(known.headers.get('cache-control'), 'no-store');
    assert.equal(mail.length, 0);
    await worker.runOne();
    const first = tokenFromMail();
    assert.match(first, /^[a-f0-9]{64}$/);
    assert.equal(user.resetPasswordTokenHash, crypto.createHash('sha256').update(first).digest('hex'));
    assert.notEqual(user.resetPasswordTokenHash, first);
    assert.ok(user.resetPasswordExpires > Date.now());
    assert.equal(options[0].requireTLS, true); assert.equal(options[0].debug, false); assert.equal(options[0].logger, false);
    assert.equal(mail[0].from, process.env.EMAIL_FROM);
    const unknown = await post('forgot-password', { email: 'missing@example.com' });
    assert.equal(unknown.status, known.status); assert.deepEqual(unknown.body, known.body);
    assert.equal(mail.length, 1);
    assert.equal((await post('reset-password', payload('invalid'))).status, 400);
    assert.equal((await post('reset-password', { ...payload(first), password: 'short', confirmPassword: 'short' })).status, 400);
    const mismatch = await post('reset-password', { ...payload(first), confirmPassword: 'different-password' });
    assert.equal(mismatch.status, 400); assert.equal(mismatch.body.fieldCodes.confirmPassword, 'PASSWORD_CONFIRMATION_MISMATCH'); assert.ok(mismatch.body.errors.confirmPassword);
    user.resetPasswordExpires = new Date(Date.now() - 1000);
    const expired = await post('reset-password', payload(first));
    assert.equal(expired.status, 400); assert.equal(expired.body.code, 'PASSWORD_RESET_TOKEN_INVALID'); assert.equal(expired.body.invalidToken, true);
    assert.equal(user.password, initialPassword);
    user.resetPasswordExpires = new Date(Date.now() + 60000);
    const oldSession = createToken(user);
    assert.equal((await post('reset-password', payload(first))).status, 200);
    assert.ok(await bcrypt.compare('new-password-123', user.password));
    assert.equal(await bcrypt.compare('original-password', user.password), false);
    assert.equal(user.resetPasswordTokenHash, undefined); assert.equal(user.resetPasswordExpires, undefined);
    const profile = await fetch(`${origin}/get-user-information`, { headers: { authorization: `Bearer ${oldSession}` } });
    assert.equal(profile.status, 401);
    const replay = await post('reset-password', payload(first));
    assert.equal(replay.status, 400); assert.deepEqual(replay.body, expired.body);
    assert.equal((await post('reset-password', payload('f'.repeat(64)))).status, 400);
    // A new email invalidates older requests; two submissions may consume the new token only once.
    assert.equal((await post('forgot-password', { email: user.email })).status, 202);
    await worker.runOne(); // Unknown-email job is discarded.
    await worker.runOne();
    const second = tokenFromMail();
    const results = await Promise.all([post('reset-password', payload(second)), post('reset-password', payload(second))]);
    assert.deepEqual(results.map((result) => result.status).sort(), [200, 400]);
    assert.equal(user.sessionVersion, 2);
    databaseFails = true;
    assert.equal((await post('reset-password', payload('e'.repeat(64)))).status, 503);
    databaseFails = false;
    mailFails = true;
    const failedDelivery = await post('forgot-password', { email: user.email, language: 'qt' });
    assert.equal(failedDelivery.status, known.status); assert.deepEqual(failedDelivery.body, known.body);
    await worker.runOne();
    assert.ok(user.resetPasswordTokenHash); // Retry keeps the same valid token.
    assert.equal(queue.records.at(-1).status, 'pending');
    assert.deepEqual(warnings, []);
    const limited = await post('forgot-password', { email: 'missing@example.com' });
    assert.equal(limited.status, 429); assert.equal(limited.body.code, 'RATE_LIMITED'); assert.ok(Number(limited.headers.get('retry-after')) > 0);
    assert.equal((await post('reset-password', payload(second))).status, 429);
    const malformed = await fetch(`${origin}/reset-password`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"password":',
    });
    assert.equal(malformed.status, 400); assert.deepEqual(await malformed.json(), { message: 'Invalid request.', code: 'INVALID_REQUEST' });
    assert.equal(User.schema.path('resetPasswordTokenHash').options.select, false);
    assert.equal(User.schema.path('resetPasswordExpires').options.select, false);
  } finally {
    queue.restore();
    Object.assign(User, originals); nodemailer.createTransport = originalTransport; console.warn = originalWarning;
    await new Promise((resolve) => server.close(resolve));
  }
});
