const { escapeRegex } = require('../utils/accountValidation');
const SORTS = { newest: { createdAt: -1, _id: -1 }, price_asc: { price: 1, _id: 1 }, price_desc: { price: -1, _id: 1 } };
function invalid() { return Object.assign(new Error('Invalid catalog parameters.'), { status: 400, code: 'CATALOG_PARAMETERS_INVALID' }); }
function catalogOptions(query = {}) {
  const allowed = ['q', 'language', 'type', 'minPrice', 'maxPrice', 'sort', 'page', 'pageSize'];
  for (const [key, value] of Object.entries(query)) if (!allowed.includes(key) || typeof value !== 'string') throw invalid();
  const q = (query.q || '').trim(), language = (query.language || '').trim(), type = query.type || '';
  const sort = query.sort || 'newest';
  if (q.length > 120 || language.length > 80 || !Object.hasOwn(SORTS, sort) || (type && !['physical', 'digital'].includes(type))) throw invalid();
  function integer(key, fallback, max) {
    if (query[key] === undefined) return fallback;
    if (!/^[1-9]\d*$/.test(query[key])) throw invalid();
    const value = Number(query[key]); if (!Number.isSafeInteger(value) || value > max) throw invalid(); return value;
  }
  function price(key) {
    if (!query[key]) return undefined;
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(query[key])) throw invalid();
    const value = Number(query[key]); if (!Number.isFinite(value) || value > 1000000) throw invalid(); return value;
  }
  const minPrice = price('minPrice'), maxPrice = price('maxPrice');
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) throw invalid();
  const filter = { isDeleted: { $ne: true } };
  if (q) filter.$or = ['title', 'author'].map((field) => ({ [field]: { $regex: escapeRegex(q), $options: 'i' } }));
  if (language) filter.language = language;
  if (type) filter.type = type;
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = { ...(minPrice !== undefined ? { $gte: minPrice } : {}), ...(maxPrice !== undefined ? { $lte: maxPrice } : {}) };
  }
  return { filter, sort: SORTS[sort], page: integer('page', 1, 10000), pageSize: integer('pageSize', 12, 48) };
}
async function catalogPage(books, query) {
  const { filter, sort, page, pageSize } = catalogOptions(query);
  const [data, total, languages] = await Promise.all([
    books.find(filter).select('-pdf').sort(sort).skip((page - 1) * pageSize).limit(pageSize),
    books.countDocuments(filter), books.distinct('language', { isDeleted: { $ne: true } }),
  ]);
  return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    languages: languages.filter((value) => typeof value === 'string' && value.trim()).sort() };
}
module.exports = { catalogOptions, catalogPage };
