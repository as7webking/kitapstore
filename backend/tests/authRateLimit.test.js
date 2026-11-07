const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const Counters = require('../models/authRateLimit');
const { createAuthLimiter, consumeAttempt } = require('../middleware/authRateLimit');
const { apiMessages } = require('../middleware/apiMessages');
const { installFakeRateLimits } = require('./helpers/rateLimitStore');
const fake = installFakeRateLimits(100000);
after(() => fake.restore());

function response() {
  return { statusCode: 200, headers: {}, body: null,
    set(key, value) { this.headers[key.toLowerCase()] = value; return this; },
    status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } };
}

test('atomic consumption across new limiter instances never allows more than the threshold', async () => {
  const a = createAuthLimiter({ scope: 'parallel', limit: 5, windowMs: 60000 });
  const b = createAuthLimiter({ scope: 'parallel', limit: 5, windowMs: 60000 });
  let allowed = 0;
  const replies = await Promise.all(Array.from({ length: 80 }, async (_, index) => {
    const res = response(); await (index % 2 ? a : b)({ ip: '192.0.2.8' }, res, () => { allowed++; }); return res;
  }));
  assert.equal(allowed, 5); assert.equal(replies.filter((r) => r.statusCode === 429).length, 75);
  const limited = replies.find((r) => r.statusCode === 429);
  assert.deepEqual(limited.body, { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.', retryAfter: 60 });
  assert.equal(limited.headers['retry-after'], '60');
  const restarted = createAuthLimiter({ scope: 'parallel', limit: 5, windowMs: 60000 });
  const res = response(); await restarted({ ip: '192.0.2.8' }, res, () => assert.fail('Restart must not reset quota'));
  assert.equal(res.statusCode, 429);
  const doc = [...fake.records.entries()].find(([key]) => key.startsWith('auth-v1:parallel:'));
  assert.equal(doc[1].count, 6); // Saturated to limit + 1, avoiding numeric overflow.
  assert.ok(!doc[0].includes('192.0.2.8'));
});

test('windows start at first attempt; expired documents reset without waiting for TTL', async () => {
  fake.setNow(200000);
  assert.equal((await consumeAttempt('expiry', 'ip', 1, 1001)).allowed, true);
  fake.setNow(200001);
  assert.deepEqual(await consumeAttempt('expiry', 'ip', 1, 1001), { allowed: false, retryAfter: 1 });
  fake.setNow(201000);
  assert.equal((await consumeAttempt('expiry', 'ip', 1, 1001)).allowed, false);
  fake.setNow(201001); // Exactly at expiration; the stale document still exists.
  assert.deepEqual(await consumeAttempt('expiry', 'ip', 1, 1001), { allowed: true, retryAfter: 2 });
  fake.cleanup(); // Must not remove the counter that has just started its new window.
  assert.equal((await consumeAttempt('expiry', 'ip', 1, 1001)).allowed, false);
  fake.setNow(202002); fake.cleanup(); // TTL removed an expired document before next request.
  assert.equal((await consumeAttempt('expiry', 'ip', 1, 1001)).allowed, true);
  assert.ok(Counters.schema.indexes().some(([keys, options]) => keys.until === 1 && options.expireAfterSeconds === 0));
});

test('scopes and IPs are isolated, IPv4-mapped addresses share quota and insert race retries once', async () => {
  assert.equal((await consumeAttempt('signup', '198.51.100.1', 1, 1000)).allowed, true);
  assert.equal((await consumeAttempt('signup', '::ffff:198.51.100.1', 1, 1000)).allowed, false);
  assert.equal((await consumeAttempt('signin', '198.51.100.1', 1, 1000)).allowed, true);
  assert.equal((await consumeAttempt('signup', '198.51.100.2', 1, 1000)).allowed, true);
  fake.setDuplicateOnce();
  assert.equal((await consumeAttempt('insert-race', 'ip', 1, 1000)).allowed, true);
  assert.equal((await consumeAttempt('insert-race', 'ip', 1, 1000)).allowed, false);
});

test('outages fail closed with sanitized 503; recovering storage keeps the prior count', async () => {
  const limiter = createAuthLimiter({ scope: 'outage', limit: 1, windowMs: 60000 });
  await limiter({ ip: 'ip' }, response(), () => {});
  fake.setOffline(true);
  try {
    const res = response(); await limiter({ ip: 'ip' }, res, () => assert.fail('Cannot bypass DB'));
    assert.equal(res.statusCode, 503); assert.equal(res.body.code, 'RATE_LIMIT_UNAVAILABLE');
    assert.equal(res.headers['cache-control'], 'no-store'); assert.equal(res.headers['retry-after'], undefined);
    assert.doesNotMatch(JSON.stringify(res.body), /synthetic|private|connection|mongodb/);
  } finally { fake.setOffline(false); }
  const res = response(); await limiter({ ip: 'ip' }, res, () => assert.fail('Outage must not reset quota'));
  assert.equal(res.statusCode, 429);
  const original = Counters.collection.findOneAndUpdate;
  try {
    Counters.collection.findOneAndUpdate = async () => null;
    const invalid = response(); await limiter({ ip: 'ip' }, invalid, () => assert.fail('Malformed DB result'));
    assert.equal(invalid.statusCode, 503);
  } finally { Counters.collection.findOneAndUpdate = original; }
  // A write may commit even if its acknowledgement times out. Refuse this
  // request and retain the count rather than retrying it against local memory.
  const uncertain = createAuthLimiter({ scope: 'uncertain-write', limit: 1, windowMs: 60000 });
  try {
    Counters.collection.findOneAndUpdate = async (...args) => {
      await original.apply(Counters.collection, args);
      throw new Error('synthetic acknowledgement timeout');
    };
    const ambiguous = response(); await uncertain({ ip: 'ip' }, ambiguous, () => assert.fail('Unacknowledged write'));
    assert.equal(ambiguous.statusCode, 503);
  } finally { Counters.collection.findOneAndUpdate = original; }
  const afterTimeout = response(); await uncertain({ ip: 'ip' }, afterTimeout, () => assert.fail('Committed attempt must stay counted'));
  assert.equal(afterTimeout.statusCode, 429);
});

test('two HTTP backend instances share one quota and preserve response/code/header contract', async () => {
  const apps = Array.from({ length: 2 }, () => {
    const app = express(); app.use(apiMessages);
    app.use(createAuthLimiter({ scope: 'http-shared', limit: 5, windowMs: 15000 }));
    app.post('/', (req, res) => res.json({ ok: true })); return app;
  });
  const servers = apps.map((app) => app.listen(0, '127.0.0.1'));
  await Promise.all(servers.map((server) => new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); })));
  try {
    const replies = await Promise.all(Array.from({ length: 20 }, async (_, i) => {
      const res = await fetch(`http://127.0.0.1:${servers[i % 2].address().port}/`, { method: 'POST' });
      return { status: res.status, body: await res.json(), retry: res.headers.get('retry-after') };
    }));
    assert.equal(replies.filter((r) => r.status === 200).length, 5);
    for (const reply of replies.filter((r) => r.status === 429)) {
      assert.equal(reply.body.code, 'RATE_LIMITED'); assert.equal(reply.retry, '15'); assert.equal(reply.body.retryAfter, 15);
    }
  } finally { await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve)))); }
});
