const { test } = require('node:test');
const assert = require('node:assert/strict');
const { smokeStaging } = require('../scripts/smokeStaging');
const origin = 'https://api.example.test';
const reply = (path) => path.endsWith('/healthz')
  ? new Response('{"status":"ready"}', { headers: { 'content-type': 'application/json' } }) : new Response('API OK');
test('smoke sends only two anonymous GETs to fixed paths with redirect refusal', async () => {
  const requests = [];
  const results = await smokeStaging(origin, { fetcher: async (url, options) => {
    requests.push(url); assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error');
    assert.equal(options.credentials, 'omit'); assert.equal(options.body, undefined);
    assert.equal(options.headers.Authorization, undefined); return reply(url);
  } });
  assert.deepEqual(requests, [origin + '/healthz', origin + '/api/v1/test']);
  assert.ok(results.every((result) => result.ok));
});
test('invalid origins fail before any network call', async () => {
  for (const value of ['http://api.example.test', origin + '/', origin + '/orders', origin + '?token=private',
    'https://user:private@api.example.test', 'https://localhost', origin + '#private', 'invalid']) {
    let called = false;
    await assert.rejects(smokeStaging(value, { fetcher: () => { called = true; } }));
    assert.equal(called, false);
  }
});
test('HTTP 200 alone does not pass: rejects HTML, wrong JSON, empty body and oversized responses', async () => {
  for (const create of [() => new Response('<html>Deployment Protection</html>'),
    () => new Response('{"status":"unavailable"}', { headers: { 'content-type': 'application/json' } }),
    () => new Response(''), () => new Response('x'.repeat(4097))]) {
    const result = await smokeStaging(origin, { fetcher: async () => create() });
    assert.ok(result.every(({ ok }) => !ok));
  }
});
test('status, redirects and network failures remain sanitized and do not stop the next GET', async () => {
  for (const mode of ['status', 'redirect', 'offline']) {
    let count = 0;
    const results = await smokeStaging(origin, { fetcher: async (url) => {
      if (++count > 1) return reply(url);
      if (mode === 'offline') throw new Error('private-token-and-credentials');
      return new Response('private-body', { status: mode === 'status' ? 503 : 302 });
    } });
    assert.deepEqual(results.map(({ ok }) => ok), [false, true]);
    assert.doesNotMatch(JSON.stringify(results), /private/);
  }
});
test('timeout aborts stuck requests and body reads', async () => {
  for (const body of [false, true]) {
    const signals = [];
    const results = await smokeStaging(origin, { timeoutMs: 10, fetcher: async (url, options) => {
      signals.push(options.signal);
      if (!body) return new Promise(() => {});
      return new Response(new ReadableStream({ start() {} }), { headers: { 'content-type': 'application/json' } });
    } });
    assert.ok(results.every(({ ok }) => !ok)); assert.ok(signals.every((signal) => signal.aborted));
  }
});
