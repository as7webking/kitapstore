const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const esbuild = require('esbuild');
const output = esbuild.buildSync({ entryPoints: [path.join(__dirname, '../src/cart/checkout.js')], bundle: true, write: false, platform: 'node', format: 'cjs' });
const moduleUnderTest = new Module(__filename); moduleUnderTest._compile(output.outputFiles[0].text, __filename);
const { checkoutAttempt, cartTotalCents } = moduleUnderTest.exports;
test('checkout retries retain a user/cart-scoped key; body never sends catalog prices', () => {
  const memory = new Map(), storage = { getItem: (key) => memory.get(key), setItem: (key, value) => memory.set(key, value) };
  const cart = [{ _id: 'book1', price: 10, shippingPrice: 2, type: 'physical' }];
  const first = checkoutAttempt(cart, 'reader1', storage);
  assert.equal(checkoutAttempt(cart, 'reader1', storage).key, first.key);
  assert.deepEqual(first.order, [{ _id: 'book1', quantity: 1 }]);
  assert.notEqual(checkoutAttempt(cart, 'reader2', storage).key, first.key);
  assert.notEqual(checkoutAttempt([...cart, { _id: 'book2' }], 'reader1', storage).key, first.key);
  assert.ok(checkoutAttempt(cart, 'reader1', { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } }).key);
});
test('cart display includes physical delivery with integer-cent arithmetic', () => {
  assert.equal(cartTotalCents([{ price: 0.1, type: 'physical', shippingPrice: 0.2 }, { price: 10.25, type: 'digital', shippingPrice: 999 }]), 1055);
});
