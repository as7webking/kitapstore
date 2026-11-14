const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const Jobs = require('../models/resetMailJob');
const User = require('../models/user');
const { encryptPayload, decryptPayload, encryptionKey } = require('../utils/resetMailCrypto');
const { enqueuePasswordReset, RETENTION_MS } = require('../services/resetMailQueue');
const { createResetMailWorker, LEASE_MS } = require('../services/resetMailWorker');
const { installFakeResetMailQueue, matches, apply, query } = require('./helpers/resetMailQueue');
const { forgotPassword } = require('../controllers/passwordResetController');
const userId = '507f1f77bcf86cd799439011';
function setup() {
  const previous = Object.fromEntries(['RESET_MAIL_ENCRYPTION_KEY', 'FRONTEND_URL', 'PASSWORD_RESET_TTL_MINUTES'].map((key) => [key, process.env[key]]));
  process.env.RESET_MAIL_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64');
  process.env.FRONTEND_URL = 'https://shop.example.test'; process.env.PASSWORD_RESET_TTL_MINUTES = '30';
  let user = { _id: userId, email: 'reader@example.test', password: 'synthetic hash', authProvider: 'local' };
  const queue = installFakeResetMailQueue({ snapshot: () => ({ ...user }), rollback: (before) => { user = before; } });
  const oldFind = User.findOne, oldUpdate = User.updateOne;
  User.findOne = (filter) => query(() => matches(user, filter) ? { ...user } : null);
  User.updateOne = async (filter, update) => {
    if (!matches(user, filter)) return { matchedCount: 0 }; apply(user, update); return { matchedCount: 1 };
  };
  return { ...queue, get user() { return user; }, restore() {
    User.findOne = oldFind; User.updateOne = oldUpdate; queue.restore();
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  } };
}
const email = 'reader@example.test';

test('queue encryption rejects tampering, wrong job binding and missing key; sensitive fields are hidden', () => {
  const previous = process.env.RESET_MAIL_ENCRYPTION_KEY;
  try {
    process.env.RESET_MAIL_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64');
    assert.throws(() => encryptionKey({ RESET_MAIL_ENCRYPTION_KEY: process.env.RESET_MAIL_ENCRYPTION_KEY, JWT_SECRET: process.env.RESET_MAIL_ENCRYPTION_KEY }));
    const value = { token: 'a'.repeat(64), email };
    const encrypted = encryptPayload(value, 'job1');
    assert.deepEqual(decryptPayload(encrypted, 'job1'), value);
    assert.ok(!encrypted.includes(email)); assert.ok(!encrypted.includes(value.token));
    assert.throws(() => decryptPayload(encrypted, 'job2'));
    const altered = Buffer.from(encrypted, 'base64'); altered[30] ^= 1;
    assert.throws(() => decryptPayload(altered.toString('base64'), 'job1'));
    delete process.env.RESET_MAIL_ENCRYPTION_KEY; assert.throws(() => encryptionKey());
    assert.equal(Jobs.schema.path('payload').options.select, false);
    assert.equal(Jobs.schema.path('tokenHash').options.select, false);
    assert.ok(Jobs.schema.indexes().some(([keys, options]) => keys.deleteAt === 1 && options.expireAfterSeconds === 0));
  } finally { if (previous === undefined) delete process.env.RESET_MAIL_ENCRYPTION_KEY; else process.env.RESET_MAIL_ENCRYPTION_KEY = previous; }
});

test('enqueue commits hash and encrypted outbox together, rollback preserves previous token and job', async () => {
  const state = setup();
  try {
    await enqueuePasswordReset(email, 'de');
    const oldHash = state.user.resetPasswordTokenHash, oldPayload = state.records[0].payload;
    state.setFailCreate(true);
    await assert.rejects(enqueuePasswordReset(email, 'ru'));
    assert.equal(state.user.resetPasswordTokenHash, oldHash);
    assert.equal(state.records.length, 1); assert.equal(state.records[0].payload, oldPayload); assert.equal(state.records[0].status, 'pending');
    state.setFailCreate(false);
    await enqueuePasswordReset(email, 'ru');
    assert.equal(state.records[0].status, 'cancelled'); assert.equal(state.records[0].payload, undefined);
    assert.notEqual(state.user.resetPasswordTokenHash, oldHash);
    const payload = decryptPayload(state.records[1].payload, state.records[1]._id);
    assert.equal(crypto.createHash('sha256').update(payload.token).digest('hex'), state.user.resetPasswordTokenHash);
  } finally { state.restore(); }
});

test('worker retries a durable job after restart, then clears secrets and never resends completed work', async () => {
  const state = setup(); let time = Date.now() + 1000, calls = 0;
  try {
    await enqueuePasswordReset(email, 'qt');
    const first = createResetMailWorker({ now: () => time, send: async () => { calls++; throw new Error('synthetic SMTP failure'); } });
    assert.equal(await first.runOne(), true); assert.equal(state.records[0].status, 'pending'); assert.equal(calls, 1);
    assert.equal(await first.runOne(), false);
    time += 30001;
    const next = createResetMailWorker({ now: () => time, send: async (to, subject, text, options) => {
      calls++; assert.equal(to, email); assert.match(subject, /şifre/); assert.match(text, /UTC/); assert.ok(options.messageId);
    } });
    assert.equal(await next.runOne(), true); assert.equal(state.records[0].status, 'sent');
    assert.equal(state.records[0].payload, undefined); assert.equal(state.records[0].tokenHash, undefined);
    assert.equal(state.records[0].deleteAt.getTime(), time + RETENTION_MS); assert.ok(state.user.resetPasswordTokenHash);
    assert.equal(await next.runOne(), false); assert.equal(calls, 2);
  } finally { state.restore(); }
});

test('worker lease recovery is exclusive and attempts are bounded after crashes or SMTP failures', async () => {
  const state = setup(); let time = Date.now() + 1000, calls = 0;
  try {
    await enqueuePasswordReset(email, 'en');
    const job = state.records[0]; job.status = 'processing'; job.leaseId = 'crashed'; job.leaseUntil = new Date(time + LEASE_MS); job.attempts = 1;
    const worker = createResetMailWorker({ now: () => time, send: async () => { calls++; throw new Error('failure'); } });
    assert.equal(await worker.runOne(), false);
    time += LEASE_MS + 1;
    await Promise.all([worker.runOne(), createResetMailWorker({ now: () => time, send: async () => { assert.fail('Lease must be exclusive'); } }).runOne()]);
    assert.equal(calls, 1); assert.equal(job.attempts, 2);
    time += 60001; await worker.runOne();
    assert.equal(calls, 2); assert.equal(job.status, 'dead'); assert.equal(job.payload, undefined);
    assert.equal(state.user.resetPasswordTokenHash, undefined); assert.equal(await worker.runOne(), false);
  } finally { state.restore(); }
});

test('worker skips expired, superseded, consumed and unknown-account jobs without SMTP', async () => {
  const state = setup(); let time = Date.now() + 1000, calls = 0;
  const worker = createResetMailWorker({ now: () => time, send: async () => { calls++; } });
  try {
    await enqueuePasswordReset(email, 'en'); await enqueuePasswordReset(email, 'de');
    assert.equal(state.records[0].payload, undefined); await worker.runOne(); assert.equal(calls, 1);
    await enqueuePasswordReset(email, 'ru'); delete state.user.resetPasswordTokenHash;
    await worker.runOne(); assert.equal(calls, 1);
    await enqueuePasswordReset('missing@example.test', 'ru'); await worker.runOne(); assert.equal(calls, 1);
    await enqueuePasswordReset(email, 'en'); time += 1800001;
    await worker.runOne(); assert.equal(calls, 1); assert.equal(state.records.at(-1).payload, undefined);
    assert.equal(state.records.at(-1).status, 'cancelled');
  } finally { state.restore(); }
});

test('old in-flight failure cannot erase the newer token or alter its queued job', async () => {
  const state = setup(); let started, fail;
  const sending = new Promise((resolve) => { started = resolve; });
  const failure = new Promise((resolve, reject) => { fail = reject; });
  try {
    await enqueuePasswordReset(email, 'en'); state.records[0].attempts = 2;
    const running = createResetMailWorker({ send: async () => { started(); await failure; } }).runOne();
    await sending;
    await enqueuePasswordReset(email, 'ru');
    const hash = state.user.resetPasswordTokenHash;
    fail(new Error('synthetic old SMTP failure')); await running;
    assert.equal(state.user.resetPasswordTokenHash, hash); assert.equal(state.records[1].status, 'pending');
    assert.ok(state.records[1].payload); assert.equal(state.records[0].status, 'cancelled');
  } finally { state.restore(); }
});

test('queue outage has the same neutral unavailable response for known and unknown email and recovers', async () => {
  const state = setup(); const responses = [];
  const response = () => ({ code: 200, set() { return this; }, status(value) { this.code = value; return this; }, json(body) { responses.push({ status: this.code, body }); } });
  try {
    state.setOffline(true);
    await forgotPassword({ body: { email } }, response());
    await forgotPassword({ body: { email: 'missing@example.test' } }, response());
    assert.deepEqual(responses[0], responses[1]); assert.equal(responses[0].status, 503); assert.equal(state.records.length, 0);
    state.setOffline(false); await forgotPassword({ body: { email } }, response());
    assert.equal(responses.at(-1).status, 202); assert.equal(state.records.length, 1);
  } finally { state.restore(); }
});

test('replacement after decryption but before SMTP prevents dispatch', async () => {
  const state = setup(); const original = Jobs.exists; let calls = 0;
  try {
    await enqueuePasswordReset(email, 'en');
    Jobs.exists = () => query(async () => { await enqueuePasswordReset(email, 'de'); return false; });
    await createResetMailWorker({ send: async () => { calls++; } }).runOne();
    assert.equal(calls, 0); assert.equal(state.records[0].status, 'cancelled'); assert.equal(state.records[1].status, 'pending');
    assert.equal(state.user.resetPasswordTokenHash, state.records[1].tokenHash);
  } finally { Jobs.exists = original; state.restore(); }
});

test('lost acknowledgement after SMTP is recoverable with the same Message-ID and no token rotation', async () => {
  const state = setup(); let time = Date.now() + 1000;
  const original = Jobs.updateOne; const messages = [];
  try {
    await enqueuePasswordReset(email, 'en');
    const hash = state.user.resetPasswordTokenHash;
    Jobs.updateOne = async (filter, update) => {
      if (update.$set?.status === 'sent') throw new Error('synthetic acknowledgement failure');
      return original(filter, update);
    };
    const send = async (to, subject, text, options) => { messages.push(options.messageId); };
    await assert.rejects(createResetMailWorker({ now: () => time, send }).runOne());
    assert.equal(state.records[0].status, 'processing');
    Jobs.updateOne = original; time += LEASE_MS + 1;
    await createResetMailWorker({ now: () => time, send }).runOne();
    assert.equal(state.records[0].status, 'sent'); assert.equal(messages.length, 2);
    assert.equal(messages[0], messages[1]); assert.equal(state.user.resetPasswordTokenHash, hash);
  } finally { Jobs.updateOne = original; state.restore(); }
});

test('worker CLI refuses missing encryption configuration before database connection without leaking secrets', () => {
  const { spawnSync } = require('node:child_process');
  const path = require('node:path');
  const result = spawnSync(process.execPath, [path.join(__dirname, '../workers/resetMail.js')], {
    env: { ...process.env, APP_ENV: 'development', URI: 'mongodb://127.0.0.1:1/synthetic', JWT_SECRET: 'synthetic', FRONTEND_URL: 'https://example.test', RESET_MAIL_ENCRYPTION_KEY: '', TRUST_PROXY_HOPS: '0', CORS_ORIGINS: '', VERCEL: '' },
    encoding: 'utf8', timeout: 5000,
  });
  assert.equal(result.status, 1); assert.match(result.stderr, /worker could not start/);
  assert.doesNotMatch(result.stderr, /mongodb|synthetic|127\.0\.0\.1|token=|password/);
  assert.doesNotMatch(result.stdout, /Connected|worker started/);
});

test('consuming a token while the final lease lookup is pending prevents sending', async () => {
  const state = setup(); const original = Jobs.exists; let sent = 0;
  try {
    await enqueuePasswordReset(email, 'en');
    Jobs.exists = (filter) => query(async () => {
      const owned = await original(filter);
      // Simulate the atomic successful reset while this queue round-trip completes.
      delete state.user.resetPasswordTokenHash;
      delete state.user.resetPasswordExpires;
      state.user.sessionVersion = 1;
      return owned;
    });
    await createResetMailWorker({ send: async () => { sent++; } }).runOne();
    assert.equal(sent, 0); assert.equal(state.records[0].status, 'cancelled');
    assert.equal(state.records[0].payload, undefined); assert.equal(state.user.sessionVersion, 1);
  } finally { Jobs.exists = original; state.restore(); }
});

test('expired lease cannot be renewed, retry or clear a token; another worker recovers it', async (context) => {
  const state = setup(); let time = Date.now() + 1000, renew, cleared = 0, started, complete;
  context.mock.method(global, 'setInterval', (callback) => { renew = callback; return { unref() {} }; });
  context.mock.method(global, 'clearInterval', () => { cleared++; });
  const sending = new Promise((resolve) => { started = resolve; });
  const result = new Promise((resolve) => { complete = resolve; });
  try {
    await enqueuePasswordReset(email, 'en');
    const running = createResetMailWorker({ now: () => time, send: async () => { started(); await result; } }).runOne();
    await sending;
    const leaseUntil = state.records[0].leaseUntil.getTime();
    time = leaseUntil + 1;
    await renew(); // Event-loop pause/network delay must not resurrect this lease.
    assert.equal(state.records[0].leaseUntil.getTime(), leaseUntil);
    complete(); await running;
    assert.equal(state.records[0].status, 'processing'); assert.ok(state.user.resetPasswordTokenHash);
    assert.equal(cleared, 1);
    let recovered = 0;
    await createResetMailWorker({ now: () => time, send: async () => { recovered++; } }).runOne();
    assert.equal(recovered, 1); assert.equal(state.records[0].status, 'sent');
    assert.equal(state.records[0].payload, undefined); assert.equal(cleared, 2);
  } finally { complete?.(); state.restore(); }
});

test('late SMTP failure after lease expiry cannot finalize the job or clear its token', async () => {
  const state = setup(); let time = Date.now() + 1000, started, reject;
  const sending = new Promise((resolve) => { started = resolve; });
  const failure = new Promise((resolve, fail) => { reject = fail; });
  try {
    await enqueuePasswordReset(email, 'ru'); state.records[0].attempts = 2;
    const running = createResetMailWorker({ now: () => time, send: async () => { started(); await failure; } }).runOne();
    await sending;
    time += LEASE_MS + 1;
    const before = state.user.resetPasswordTokenHash;
    reject(new Error('synthetic delayed failure')); await running;
    assert.equal(state.records[0].status, 'processing');
    assert.equal(state.user.resetPasswordTokenHash, before); assert.ok(state.records[0].payload);
    let sent = 0;
    await createResetMailWorker({ now: () => time, send: async () => { sent++; } }).runOne();
    assert.equal(sent, 0); assert.equal(state.records[0].status, 'dead');
    assert.equal(state.records[0].payload, undefined); assert.equal(state.user.resetPasswordTokenHash, undefined);
  } finally { state.restore(); }
});

test('lease expiring during the last user lookup prevents SMTP and leaves work recoverable', async () => {
  const state = setup(); const original = User.findOne; let time = Date.now() + 1000, sent = 0, lookups = 0;
  try {
    await enqueuePasswordReset(email, 'en');
    User.findOne = (filter) => query(async () => {
      const user = await original(filter);
      if (++lookups === 2) time = state.records[0].leaseUntil.getTime() + 1;
      return user;
    });
    await createResetMailWorker({ now: () => time, send: async () => { sent++; } }).runOne();
    assert.equal(sent, 0); assert.equal(state.records[0].status, 'processing');
    assert.ok(state.records[0].payload); assert.ok(state.user.resetPasswordTokenHash);
    User.findOne = original;
    await createResetMailWorker({ now: () => time, send: async () => { sent++; } }).runOne();
    assert.equal(sent, 1); assert.equal(state.records[0].status, 'sent');
  } finally { User.findOne = original; state.restore(); }
});

test('heartbeat extends live lease and in-flight renewal does not leak after completion', async (context) => {
  const state = setup(); let time = Date.now() + 1000, renew, started, complete;
  context.mock.method(global, 'setInterval', (callback) => { renew = callback; return { unref() {} }; });
  context.mock.method(global, 'clearInterval', () => {});
  const sending = new Promise((resolve) => { started = resolve; });
  const gate = new Promise((resolve) => { complete = resolve; });
  try {
    await enqueuePasswordReset(email, 'de');
    const running = createResetMailWorker({ now: () => time, send: async () => { started(); await gate; } }).runOne();
    await sending;
    const initial = state.records[0].leaseUntil.getTime();
    time += 60000; await renew();
    assert.ok(state.records[0].leaseUntil.getTime() > initial);
    time = initial + 1;
    complete(); await running;
    assert.equal(state.records[0].status, 'sent'); assert.equal(state.records[0].payload, undefined);
    await renew(); // Delayed callback cannot restore lease metadata on a terminal record.
    assert.equal(state.records[0].leaseUntil, undefined); assert.equal(state.records[0].payload, undefined);
  } finally { complete?.(); state.restore(); }
});

test('a stale sender cannot overwrite another worker lease or erase its valid token', async () => {
  const state = setup(); let time = Date.now() + 1000, firstStarted, secondStarted, firstFail, secondDone;
  const firstGate = new Promise((resolve, reject) => { firstFail = reject; });
  const secondGate = new Promise((resolve) => { secondDone = resolve; });
  const firstSending = new Promise((resolve) => { firstStarted = resolve; });
  const secondSending = new Promise((resolve) => { secondStarted = resolve; });
  try {
    await enqueuePasswordReset(email, 'en');
    const first = createResetMailWorker({ now: () => time, send: async () => { firstStarted(); await firstGate; } }).runOne();
    await firstSending;
    time += LEASE_MS + 1;
    const second = createResetMailWorker({ now: () => time, send: async () => { secondStarted(); await secondGate; } }).runOne();
    await secondSending;
    const lease = state.records[0].leaseId, hash = state.user.resetPasswordTokenHash;
    firstFail(new Error('synthetic stale sender')); await first;
    assert.equal(state.records[0].leaseId, lease); assert.equal(state.records[0].status, 'processing');
    assert.equal(state.user.resetPasswordTokenHash, hash);
    secondDone(); await second;
    assert.equal(state.records[0].status, 'sent'); assert.equal(state.records[0].payload, undefined);
    assert.equal(state.user.resetPasswordTokenHash, hash);
  } finally { secondDone?.(); state.restore(); }
});
