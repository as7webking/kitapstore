const { test } = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config = () => ({});
const Book = require('../models/book');
const { catalogOptions, catalogPage } = require('../services/catalog');
const { app } = require('../app');
const fixtures = [
  { _id: '1', title: 'Alpha', author: 'Reader [x]', language: 'en', type: 'physical', price: 10, createdAt: 2, pdf: 'private' },
  { _id: '2', title: 'Beta', author: 'Reader [x]', language: 'en', type: 'digital', price: 20, createdAt: 3, pdf: 'private' },
  { _id: '3', title: 'Gamma', author: 'Other', language: 'de', type: 'physical', price: 10, createdAt: 1 },
  { _id: '4', title: 'Hidden', author: 'Reader [x]', language: 'ru', type: 'physical', price: 0, createdAt: 4, isDeleted: true },
];
function matches(doc, filter) {
  return Object.entries(filter).every(([key, value]) => key === '$or' ? value.some((part) => matches(doc, part))
    : value?.$regex !== undefined ? new RegExp(value.$regex, value.$options).test(doc[key])
      : value && typeof value === 'object' ? Object.entries(value).every(([op, n]) => op === '$ne' ? doc[key] !== n : op === '$gte' ? doc[key] >= n : op === '$lte' ? doc[key] <= n : false)
        : doc[key] === value);
}
function fakeBooks() {
  return {
    find(filter) {
      let data = fixtures.filter((doc) => matches(doc, filter)).map((doc) => ({ ...doc }));
      return { select(fields) { assert.equal(fields, '-pdf'); data.forEach((doc) => delete doc.pdf); return this; },
        sort(fields) { data.sort((a, b) => { for (const [key, direction] of Object.entries(fields)) if (a[key] !== b[key]) return (a[key] > b[key] ? 1 : -1) * direction; return 0; }); return this; },
        skip(n) { data = data.slice(n); return this; }, limit(n) { data = data.slice(0, n); return this; },
        then(resolve, reject) { return Promise.resolve(data).then(resolve, reject); } };
    },
    countDocuments: async (filter) => fixtures.filter((doc) => matches(doc, filter)).length,
    distinct: async (key, filter) => [...new Set(fixtures.filter((doc) => matches(doc, filter)).map((doc) => doc[key]))],
  };
}
test('catalog rejects malformed filters and escapes literal title/author search', () => {
  for (const query of [{ q: {} }, { q: ['x', 'y'] }, { q: 'x'.repeat(121) }, { type: 'admin' }, { sort: '$where' },
    { page: '0' }, { page: '-1' }, { page: '1.2' }, { page: '10001' }, { pageSize: '49' }, { language: 'x'.repeat(81) },
    { minPrice: 'NaN' }, { minPrice: '-1' }, { minPrice: '1e2' }, { minPrice: '1.001' }, { minPrice: '1000001' },
    { minPrice: '20', maxPrice: '10' }, { unknown: 'value' }]) assert.throws(() => catalogOptions(query), { status: 400 });
  const options = catalogOptions({ q: ' [x] ', minPrice: '0', maxPrice: '20.00', type: 'digital' });
  assert.equal(options.filter.$or[1].author.$regex, '\\[x\\]'); assert.equal(options.filter.price.$gte, 0);
});
test('filtered page has stable sorting, totals and no PDF/deleted entries', async () => {
  const books = fakeBooks();
  const first = await catalogPage(books, { sort: 'price_asc', pageSize: '1' });
  const second = await catalogPage(books, { sort: 'price_asc', pageSize: '1', page: '2' });
  assert.equal(first.data[0]._id, '1'); assert.equal(second.data[0]._id, '3');
  assert.deepEqual(first.pagination, { page: 1, pageSize: 1, total: 3, totalPages: 3 });
  assert.deepEqual(first.languages, ['de', 'en']); assert.equal(first.data[0].pdf, undefined);
  const filtered = await catalogPage(books, { q: '[x]', language: 'en', type: 'digital', minPrice: '20', maxPrice: '20' });
  assert.deepEqual(filtered.data.map((doc) => doc._id), ['2']);
  assert.equal((await catalogPage(books, { q: 'alpha' })).data[0]._id, '1');
  assert.equal((await catalogPage(books, { sort: 'newest' })).data[0]._id, '2');
  assert.equal((await catalogPage(books, { sort: 'price_desc' })).data[0]._id, '2');
  assert.equal((await catalogPage(books, { maxPrice: '0' })).pagination.total, 0);
  assert.deepEqual((await catalogPage(books, { page: '10' })).data, []);
  assert.equal((await catalogPage(books, { q: 'No match' })).pagination.totalPages, 0);
});
test('HTTP aliases preserve legacy shapes and reject invalid parameters', async () => {
  const original = { find: Book.find, countDocuments: Book.countDocuments, distinct: Book.distinct, findOne: Book.findOne };
  Object.assign(Book, fakeBooks());
  Book.findOne = (filter) => { const result = fixtures.find((doc) => matches(doc, filter)); return { select: async () => { if (!result) return null; const copy = { ...result }; delete copy.pdf; return copy; } }; };
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const prefix of ['/api/v1', '/api/v1/books']) {
      for (const path of ['/catalog?pageSize=1', '/get-all-books?pageSize=1']) {
        const response = await fetch(base + prefix + path); assert.equal(response.status, 200);
        const body = await response.json(); assert.equal(body.data.length, 1); assert.equal(body.pagination.total, 3);
      }
      for (const route of ['/get-recent-books', '/get-popular-books']) {
        const body = await (await fetch(base + prefix + route)).json();
        assert.ok(body.data.every((doc) => !doc.isDeleted && doc.pdf === undefined));
      }
      const list = await (await fetch(base + prefix + '/get-all-books')).json(); assert.equal(list.data.length, 3); assert.equal(list.pagination, undefined);
      const search = await (await fetch(base + prefix + '/search?q=%5Bx%5D')).json(); assert.ok(Array.isArray(search)); assert.equal(search.length, 2); assert.ok(search.every((doc) => !doc.pdf));
      assert.equal((await fetch(base + prefix + '/catalog?page=-1')).status, 400);
      assert.equal((await fetch(base + prefix + '/search?q=x&q=y')).status, 400);
      assert.equal((await fetch(base + prefix + '/get-book-by-slug/hidden')).status, 404);
      assert.equal((await (await fetch(base + prefix + '/get-book-by-id/4')).json()).data, null);
    }
    Book.find = () => { throw new Error('private query detail'); };
    const failed = await fetch(base + '/api/v1/books/catalog'); assert.equal(failed.status, 503); assert.doesNotMatch(await failed.text(), /private query detail/);
  } finally { await new Promise((resolve) => server.close(resolve)); Object.assign(Book, original); }
});
