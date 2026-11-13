const { test } = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config = () => ({});
process.env.JWT_SECRET = 'synthetic-profile-address-secret';
process.env.GOOGLE_CLIENT_ID = ''; process.env.GOOGLE_CLIENT_SECRET = '';
const User = require('../models/user');
const { createToken } = require('../utils/jwt');
const { app } = require('../app');
test('address PUT validates fields, scopes writes to the verified owner and preserves GET contract', async () => {
  const own = { _id: '507f1f77bcf86cd799439011', username: 'Synthetic', email: 'test@example.test', address: 'Old address', role: 'user', sessionVersion: 0 };
  const other = '507f1f77bcf86cd799439012';
  const original = { findById: User.findById, updateOne: User.updateOne };
  const writes = []; let fail = false, missing = false;
  User.findById = (id) => ({ select: async () => { assert.equal(id, own._id); return own; } });
  User.updateOne = async (filter, update, options) => {
    if (fail) throw new Error('private-driver-error');
    writes.push({ filter, update, options });
    if (!missing) own.address = update.$set.address;
    return { matchedCount: missing ? 0 : 1, modifiedCount: 1 };
  };
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const url = `http://127.0.0.1:${server.address().port}/api/v1/user/get-user-information`;
  const token = createToken(own);
  const put = (body, headers = {}, authenticated = true) => fetch(url, { method: 'PUT', headers: {
    'content-type': 'application/json', ...(authenticated ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: JSON.stringify(body) });
  try {
    assert.equal((await put({ address: 'New' }, {}, false)).status, 401);
    assert.equal((await put({ address: 'New' }, { id: other })).status, 403);
    for (const extra of [{ id: other }, { _id: other }, { user: other }, { role: 'admin' }, { email: 'changed@example.test' }, { $set: { role: 'admin' } }]) {
      const response = await put({ address: 'New', ...extra });
      assert.equal(response.status, 400); assert.equal((await response.json()).code, 'PROFILE_FIELDS_INVALID');
    }
    assert.equal(writes.length, 0); assert.equal(own.role, 'user');
    for (const address of [null, {}, 123, '', '   ', 'x'.repeat(501), 'Bad\u0000address']) {
      const response = await put({ address });
      assert.equal(response.status, 400);
      const body = await response.json(); assert.equal(body.fieldCodes.address, 'PROFILE_ADDRESS_INVALID');
    }
    assert.equal(writes.length, 0);
    const updated = await put({ address: '  Test Street 12\nBerlin  ' });
    assert.equal(updated.status, 200); assert.equal(updated.headers.get('cache-control'), 'no-store');
    assert.equal((await updated.json()).code, 'PROFILE_ADDRESS_UPDATED');
    assert.deepEqual(writes[0], { filter: { _id: own._id }, update: { $set: { address: 'Test Street 12\nBerlin' } }, options: { runValidators: true } });
    const profile = await (await fetch(url, { headers: { authorization: `Bearer ${token}` } })).json();
    assert.equal(profile.address, 'Test Street 12\nBerlin'); assert.equal(profile.role, 'user'); assert.equal(profile.sessionVersion, undefined);
    fail = true; const failure = await put({ address: 'Keep my draft' });
    assert.equal(failure.status, 503); assert.doesNotMatch(await failure.text(), /private-driver-error/);
    fail = false; missing = true; assert.equal((await put({ address: 'Missing user' })).status, 401);
  } finally { await new Promise((resolve) => server.close(resolve)); Object.assign(User, original); }
});
