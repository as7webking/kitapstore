// Deliberately does not load dotenv. Supply staging variables via the process environment.
const mongoose = require('mongoose');
const slugify = require('slugify');
const Book = require('../models/book');
const DATABASE = 'kitapstore_test';

function validateSeedEnv(env) {
  if (env.APP_ENV !== 'staging') throw new Error('Seed requires APP_ENV=staging.');
  if (env.MONGODB_DB_NAME !== DATABASE) throw new Error('Seed requires MONGODB_DB_NAME=kitapstore_test.');
  let uri;
  try { uri = new URL(env.URI); } catch { throw new Error('Seed requires a valid MongoDB URI.'); }
  if (!['mongodb:', 'mongodb+srv:'].includes(uri.protocol) || !uri.hostname || uri.pathname !== `/${DATABASE}`) {
    throw new Error('Seed URI must select kitapstore_test.');
  }
}

function cover(number) {
  // Self-contained synthetic cover: no image service or remote download needed.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480"><rect width="360" height="480" fill="#334155"/><rect x="28" y="28" width="304" height="424" fill="none" stroke="#cbd5e1"/><text x="180" y="200" text-anchor="middle" fill="white" font-size="24">KITAPSTORE TEST</text><text x="180" y="250" text-anchor="middle" fill="white" font-size="40">${number}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function catalogFixtures() {
  return [
    ['Kitapstore Seed V1 Morning Stories', 'en', 12.5, 2],
    ['Kitapstore Seed V1 Kleine Geschichten', 'de', 14, 3],
    ['Kitapstore Seed V1 Eine Sammlung aussergewoehnlich langer Buchgeschichten', 'de', 19.99, 0],
    ['Kitapstore Seed V1 Qirim Masallari', 'qt', 9.5, 2],
    ['Kitapstore Seed V1 Testovye Istorii', 'ru', 11, 2.5],
    ['Kitapstore Seed V1 Complimentary Sample', 'en', 0, 0],
  ].map(([title, language, price, shippingPrice], index) => ({
    title, slug: slugify(title, { lower: true, strict: true }),
    author: `Synthetic Test Author ${index + 1}`,
    desc: 'Synthetic staging fixture for catalog and checkout testing. This is not a real publication.',
    language, price, shippingPrice, type: 'physical', url: cover(index + 1),
  }));
}

async function seedCatalog({ books = Book, fixtures = catalogFixtures() } = {}) {
  // Validate the entire fixture set before creating an index or inserting anything.
  for (const fixture of fixtures) await new books(fixture).validate();
  // An actual unique index is essential for concurrent/repeated runs.
  // Duplicate existing slugs cause a safe failure; nothing is deleted or repaired.
  await books.collection.createIndex({ slug: 1 }, { unique: true });
  let inserted = 0, skipped = 0;
  for (const fixture of fixtures) {
    try {
      const result = await books.updateOne({ slug: fixture.slug }, { $setOnInsert: fixture }, { upsert: true, timestamps: false });
      if (result.upsertedCount === 1) inserted++;
      else skipped++;
    } catch (error) {
      // A concurrent insertion can win the unique-slug race. Never overwrite it.
      if (error.code !== 11000 || !await books.exists({ slug: fixture.slug })) throw error;
      skipped++;
    }
  }
  return { inserted, skipped };
}

async function runSeed({ env = process.env, connect = (uri, options) => mongoose.connect(uri, options),
  databaseName = () => mongoose.connection.name, seed = seedCatalog,
  disconnect = () => mongoose.disconnect() } = {}) {
  validateSeedEnv(env);
  try {
    await connect(env.URI, { dbName: DATABASE, serverSelectionTimeoutMS: 5000 });
    if (databaseName() !== DATABASE) throw new Error('Unexpected database.');
    return await seed();
  } finally { await disconnect(); }
}

if (require.main === module) {
  runSeed().then(({ inserted, skipped }) => console.log(`Test catalog seed completed: ${inserted} inserted, ${skipped} skipped.`))
    .catch(() => {
      // Driver/validation errors can contain URI, credentials and document payloads.
      console.error('Test catalog seed failed. Check staging configuration, test database access and unique slug index.');
      process.exitCode = 1;
    });
}
module.exports = { validateSeedEnv, catalogFixtures, seedCatalog, runSeed };
