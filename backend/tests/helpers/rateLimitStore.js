// Test-only atomic MongoDB collection substitute. Never connects to a database.
function createFakeRateLimitCollection(start = 0) {
  const records = new Map();
  let now = start, offline = false, duplicateOnce = false;
  const evaluate = (expression, document) => {
    if (expression instanceof Date) return expression;
    if (expression === '$$NOW') return new Date(now);
    if (typeof expression === 'string' && expression.startsWith('$')) return document[expression.slice(1)];
    if (Array.isArray(expression)) return expression.map((value) => evaluate(value, document));
    if (!expression || typeof expression !== 'object') return expression;
    const [operator, args] = Object.entries(expression)[0];
    const values = evaluate(args, document);
    if (operator === '$ifNull') return values[0] ?? values[1];
    if (operator === '$lte') return values[0] <= values[1];
    if (operator === '$cond') return values[0] ? values[1] : values[2];
    if (operator === '$min') return Math.min(...values);
    if (operator === '$add') {
      const sum = values.reduce((total, value) => total + Number(value), 0);
      return values.some((value) => value instanceof Date) ? new Date(sum) : sum;
    }
    throw new Error('Unsupported fake aggregation operator');
  };
  return {
    records,
    setNow(value) { now = value; },
    setOffline(value) { offline = value; },
    setDuplicateOnce() { duplicateOnce = true; },
    cleanup() { for (const [key, doc] of records) if (doc.until <= now) records.delete(key); },
    async findOneAndUpdate(filter, pipeline, options) {
      if (offline) throw new Error('synthetic database error with private connection details');
      if (duplicateOnce) { duplicateOnce = false; throw Object.assign(new Error('synthetic insert race'), { code: 11000 }); }
      if (options.returnDocument !== 'after' || options.includeResultMetadata !== false || options.upsert !== true || options.writeConcern.w !== 'majority') throw new Error('Unsafe counter options');
      const before = records.get(filter._id) || { _id: filter._id };
      const after = { ...before };
      // Mongo evaluates all expressions in one $set against the pre-update doc.
      for (const [key, expression] of Object.entries(pipeline[0].$set)) after[key] = evaluate(expression, before);
      records.set(filter._id, after);
      return structuredClone(after);
    },
  };
}
function installFakeRateLimits(start = 0) {
  const Counters = require('../../models/authRateLimit');
  const original = Counters.collection.findOneAndUpdate;
  const fake = createFakeRateLimitCollection(start);
  Counters.collection.findOneAndUpdate = fake.findOneAndUpdate.bind(fake);
  return { ...fake, restore() { Counters.collection.findOneAndUpdate = original; } };
}
module.exports = { createFakeRateLimitCollection, installFakeRateLimits };
