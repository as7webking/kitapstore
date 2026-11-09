const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const express = require('express');
const mongoose = require('mongoose');
const { validateEnv } = require('../config/env');
const { validateDeployment, frontendOrigins } = require('../config/deployment');
const { apiMessages } = require('../middleware/apiMessages');
const { createAuthLimiter } = require('../middleware/authRateLimit');
const fakeRateLimits = require('./helpers/rateLimitStore').installFakeRateLimits();
after(() => fakeRateLimits.restore());
const { trackBackgroundTask, drainBackgroundTasks } = require('../utils/backgroundTasks');
const { forgotPassword } = require('../controllers/passwordResetController');
const staging = {
  APP_ENV: 'staging', URI: 'mongodb://127.0.0.1:1/kitapstore_test', MONGODB_DB_NAME: 'kitapstore_test',
  JWT_SECRET: 'synthetic-staging-secret-32-characters', FRONTEND_URL: 'https://shop.example.test',
  EMAIL_HOST: 'smtp.ethereal.email', EMAIL_PORT: '587', EMAIL_USER: 'synthetic', EMAIL_PASS: 'synthetic',
};

test('staging guards reject production database, real SMTP, bad origins and serverless runtime', () => {
  assert.equal(validateEnv(staging).port, 1001);
  for (const patch of [
    { URI: 'mongodb://private-host/kitapstore' }, { MONGODB_DB_NAME: 'kitapstore' },
    { EMAIL_HOST: 'smtp.production.example' }, { EMAIL_PORT: '465' }, { EMAIL_PASS: '' },
    { FRONTEND_URL: 'http://shop.example.test' }, { FRONTEND_URL: 'https://shop.example.test/reset-password' },
    { CORS_ORIGINS: 'https://*.vercel.app' }, { TRUST_PROXY_HOPS: 'true' }, { TRUST_PROXY_HOPS: '2' },
    { VERCEL: '1' }, { JWT_SECRET: 'short' }, { GOOGLE_CLIENT_ID: 'enabled' },
  ]) assert.throws(() => validateDeployment({ ...staging, ...patch }));
  assert.deepEqual(frontendOrigins({ ...staging, CORS_ORIGINS: 'https://preview.example.test' }), [staging.FRONTEND_URL, 'https://preview.example.test']);
});

test('real CLI stops safely on an unreachable synthetic test database before opening HTTP', () => {
  const result = spawnSync(process.execPath, [path.join(__dirname, '../app.js')], {
    env: { ...process.env, ...staging, VERCEL: '', GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', FACEBOOK_CLIENT_ID: '', FACEBOOK_CLIENT_SECRET: '', TRUST_PROXY_HOPS: '0', CORS_ORIGINS: '' },
    encoding: 'utf8', timeout: 12000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /MongoDB connection failed/);
  assert.doesNotMatch(result.stderr, /mongodb:\/\/|synthetic|password|127\.0\.0\.1/);
  assert.doesNotMatch(result.stdout, /Server running/);
});

test('shared proxy IP limits ignore spoofed leftmost forwarding', async () => {
  const app = express(); app.set('trust proxy', 1); app.use(apiMessages);
  app.use(createAuthLimiter({ scope: 'proxy-test', limit: 1, windowMs: 60000 })); app.get('/', (req, res) => res.json({ ok: true }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  try {
    const url = `http://127.0.0.1:${server.address().port}/`;
    assert.equal((await fetch(url, { headers: { 'x-forwarded-for': '192.0.2.1, 198.51.100.8' } })).status, 200);
    const second = await fetch(url, { headers: { 'x-forwarded-for': '192.0.2.2, 198.51.100.8' } });
    assert.equal(second.status, 429); assert.equal((await second.json()).code, 'RATE_LIMITED');
    assert.equal((await fetch(url, { headers: { 'x-forwarded-for': '198.51.100.9' } })).status, 200);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test('recovery responds after durable enqueue without HTTP-process SMTP', async () => {
  const queue = require('../services/resetMailQueue');
  const original = queue.enqueuePasswordReset;
  let committed = false;
  queue.enqueuePasswordReset = async () => { committed = true; };
  const app = express(); app.use(express.json()); app.post('/', forgotPassword);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'reader@example.test' }) });
    assert.equal(response.status, 202); assert.equal(committed, true);
    trackBackgroundTask(Promise.reject(new Error('synthetic failure')));
    await drainBackgroundTasks();
  } finally { queue.enqueuePasswordReset = original; await new Promise((resolve) => server.close(resolve)); }
});

test('CORS allows only exact configured origins; readiness follows database connectivity', async () => {
  const originalOrigin = process.env.FRONTEND_URL, originalExtra = process.env.CORS_ORIGINS;
  process.env.FRONTEND_URL = staging.FRONTEND_URL; process.env.CORS_ORIGINS = 'https://preview.example.test';
  const { app } = require('../app');
  const previousReady = mongoose.connection.readyState;
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  try {
    const url = `http://127.0.0.1:${server.address().port}`;
    for (const origin of [staging.FRONTEND_URL, 'https://preview.example.test']) {
      const response = await fetch(`${url}/api/v1/user/forgot-password`, { method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' } });
      assert.equal(response.status, 204); assert.equal(response.headers.get('access-control-allow-origin'), origin);
    }
    const denied = await fetch(`${url}/api/v1/test`, { headers: { origin: 'https://untrusted.vercel.app' } });
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
    mongoose.connection.readyState = 0;
    assert.equal((await fetch(`${url}/healthz`)).status, 503);
    mongoose.connection.readyState = 1;
    const ready = await fetch(`${url}/healthz`); assert.equal(ready.status, 200);
    assert.equal(ready.headers.get('cache-control'), 'no-store'); assert.deepEqual(await ready.json(), { status: 'ready' });
  } finally {
    mongoose.connection.readyState = previousReady;
    if (originalOrigin === undefined) delete process.env.FRONTEND_URL; else process.env.FRONTEND_URL = originalOrigin;
    if (originalExtra === undefined) delete process.env.CORS_ORIGINS; else process.env.CORS_ORIGINS = originalExtra;
    await new Promise((resolve) => server.close(resolve));
  }
});
