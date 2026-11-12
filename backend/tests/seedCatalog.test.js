const { test } = require('node:test');
const assert = require('node:assert/strict');
const Book = require('../models/book');
const { validateSeedEnv, catalogFixtures, seedCatalog, runSeed } = require('../scripts/seedCatalog');
const env = { APP_ENV: 'staging', MONGODB_DB_NAME: 'kitapstore_test', URI: 'mongodb://synthetic.invalid/kitapstore_test' };
function fakeBooks(records = new Map()) {
  class Books { constructor(value) { this.value = value; } async validate() { await new Book(this.value).validate(); } }
  Books.collection = { createIndex: async (key, options) => { assert.deepEqual(key, { slug: 1 }); assert.equal(options.unique, true); } };
  Books.exists = async ({ slug }) => records.has(slug);
  Books.updateOne = async (filter, update, options) => {
    assert.equal(options.upsert, true);
    assert.equal(options.timestamps, false);
    assert.deepEqual(Object.keys(update), ['$setOnInsert']);
    if (records.has(filter.slug)) return { upsertedCount: 0 };
    records.set(filter.slug, structuredClone(update.$setOnInsert)); return { upsertedCount: 1 };
  };
  return Books;
}
test('seed refuses non-staging, missing or mismatched database before connecting', async () => {
  for (const patch of [{ APP_ENV: 'production' }, { APP_ENV: '' }, { MONGODB_DB_NAME: 'kitapstore' },
    { URI: 'mongodb://synthetic.invalid/kitapstore' }, { URI: '' }, { URI: 'https://synthetic.invalid/kitapstore_test' }]) {
    let called = false;
    await assert.rejects(runSeed({ env: { ...env, ...patch }, connect: () => { called = true; } }));
    assert.equal(called, false);
  }
  validateSeedEnv(env);
});
test('fixtures satisfy actual model validation; repeat and parallel runs preserve existing edits and deleted books', async () => {
  const fixtures = catalogFixtures();
  const original = { ...fixtures[0], title: 'Edited by tester', price: 777, isDeleted: true };
  const records = new Map([[fixtures[0].slug, original], ['unrelated', { title: 'Keep me' }]]);
  const books = fakeBooks(records);
  const result = await seedCatalog({ books });
  assert.deepEqual(result, { inserted: fixtures.length - 1, skipped: 1 });
  const snapshot = structuredClone(records);
  assert.deepEqual(await seedCatalog({ books }), { inserted: 0, skipped: fixtures.length });
  assert.deepEqual(records, snapshot);
  const empty = new Map(); const shared = fakeBooks(empty);
  const results = await Promise.all([seedCatalog({ books: shared }), seedCatalog({ books: shared })]);
  assert.equal(results.reduce((sum, result) => sum + result.inserted, 0), fixtures.length);
  assert.equal(empty.size, fixtures.length);
});
test('duplicate race is skipped only when the slug exists; index and write failures propagate without deletion', async () => {
  const books = fakeBooks(); const fixture = catalogFixtures()[0];
  books.updateOne = async () => { throw { code: 11000 }; };
  books.exists = async () => true;
  assert.deepEqual(await seedCatalog({ books, fixtures: [fixture] }), { inserted: 0, skipped: 1 });
  books.exists = async () => false;
  await assert.rejects(seedCatalog({ books, fixtures: [fixture] }));
  books.collection.createIndex = async () => { throw new Error('index conflict'); };
  await assert.rejects(seedCatalog({ books }), /index conflict/);
});
test('invalid fixtures produce no index/write; partial failure can be retried without replacing earlier inserts', async () => {
  const records = new Map(); const books = fakeBooks(records);
  let indexed = false; const init = books.collection.createIndex;
  books.collection.createIndex = async (...args) => { indexed = true; return init(...args); };
  await assert.rejects(seedCatalog({ books, fixtures: [{ ...catalogFixtures()[0], price: -1 }] }));
  assert.equal(indexed, false); assert.equal(records.size, 0);
  const write = books.updateOne; let calls = 0;
  books.updateOne = async (...args) => { if (++calls === 3) throw new Error('offline'); return write(...args); };
  await assert.rejects(seedCatalog({ books }), /offline/); assert.equal(records.size, 2);
  books.updateOne = write;
  const result = await seedCatalog({ books });
  assert.equal(result.skipped, 2); assert.equal(records.size, catalogFixtures().length);
});
test('runner checks connected database before writes and disconnects on success/failure', async () => {
  for (const mode of ['success', 'wrong-db', 'connect-fail', 'seed-fail']) {
    let writes = 0, closed = 0;
    const operation = runSeed({ env,
      connect: async (uri, options) => { assert.equal(uri, env.URI); assert.equal(options.dbName, 'kitapstore_test'); if (mode === 'connect-fail') throw new Error('fake'); },
      databaseName: () => mode === 'wrong-db' ? 'kitapstore' : 'kitapstore_test',
      seed: async () => { writes++; if (mode === 'seed-fail') throw new Error('fake'); return { inserted: 6, skipped: 0 }; },
      disconnect: async () => { closed++; },
    });
    if (mode === 'success') assert.equal((await operation).inserted, 6);
    else await assert.rejects(operation);
    assert.equal(writes, ['wrong-db', 'connect-fail'].includes(mode) ? 0 : 1);
    assert.equal(closed, 1);
  }
});
