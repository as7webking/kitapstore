const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('Vercel serves deep SPA links while leaving API paths out of the HTML fallback', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const rewrite = config.rewrites[0];
  assert.equal(rewrite.destination, '/index.html'); assert.equal(config.outputDirectory, 'dist');
  const match = new RegExp(`^${rewrite.source}$`);
  for (const route of ['/', '/login', '/profile', '/forgot-password', '/reset-password', '/books/test-slug']) assert.ok(match.test(route), route);
  for (const route of ['/api', '/api/v1/test', '/api/contact']) assert.equal(match.test(route), false, route);
  assert.ok(config.headers[0].headers.some(({ key, value }) => key === 'Referrer-Policy' && value === 'no-referrer'));
});
