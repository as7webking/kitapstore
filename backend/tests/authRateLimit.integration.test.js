const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Counters = require('../models/authRateLimit');
const { consumeAttempt } = require('../middleware/authRateLimit');
const uri = process.env.RATE_LIMIT_TEST_URI;

test('optional real MongoDB: concurrent counters, stale expiration and TTL index', { skip: !uri }, async () => {
  // Never load backend/.env or use the application URI for this test.
  assert.equal(uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?/]*)/i)?.[1], 'kitapstore_rate_limit_test', 'Only the dedicated rate-limit test database is allowed');
  const client = new mongoose.mongo.MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
  const collection = client.db('kitapstore_rate_limit_test').collection(`limiter_test_${crypto.randomBytes(8).toString('hex')}`);
  const original = Counters.collection.findOneAndUpdate;
  let created = false;
  try {
    await client.connect();
    await collection.createIndex({ until: 1 }, { expireAfterSeconds: 0 }); created = true;
    Counters.collection.findOneAndUpdate = collection.findOneAndUpdate.bind(collection);
    const results = await Promise.all(Array.from({ length: 40 }, () => consumeAttempt('real-test', '192.0.2.50', 5, 60000)));
    assert.equal(results.filter((result) => result.allowed).length, 5);
    assert.equal(await collection.countDocuments({}), 1);
    await collection.updateMany({}, { $set: { until: new Date(0) } });
    assert.equal((await consumeAttempt('real-test', '192.0.2.50', 5, 60000)).allowed, true);
  } catch {
    throw new Error('Dedicated MongoDB rate-limit integration check failed; inspect the test database configuration without logging credentials');
  } finally {
    Counters.collection.findOneAndUpdate = original;
    try { if (created) await collection.drop(); } finally { await client.close(); }
  }
});
