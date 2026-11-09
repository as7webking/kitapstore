const mongoose = require('mongoose');
const Jobs = require('../../models/resetMailJob');
function matches(doc, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some((part) => matches(doc, part));
    const actual = doc[key];
    if (value && typeof value === 'object' && !(value instanceof Date) && !value._bsontype) {
      if ('$in' in value) return value.$in.includes(actual ?? null);
      if ('$gt' in value) return actual > value.$gt;
      if ('$lte' in value) return actual <= value.$lte;
      if ('$type' in value) return typeof actual === value.$type;
      if ('$regex' in value) return new RegExp(value.$regex, value.$options).test(actual);
    }
    return String(actual) === String(value);
  });
}
function apply(doc, update) {
  Object.assign(doc, update.$set);
  for (const key of Object.keys(update.$unset || {})) delete doc[key];
  for (const [key, value] of Object.entries(update.$inc || {})) doc[key] = (doc[key] || 0) + value;
}
function query(get) { const q = { select() { return q; }, session() { return q; }, then(resolve, reject) { return Promise.resolve().then(get).then(resolve, reject); } }; return q; }
function installFakeResetMailQueue({ snapshot = () => null, rollback = () => {} } = {}) {
  const records = [], restore = [];
  let offline = false, failCreate = false, tail = Promise.resolve();
  const patch = (obj, key, value) => { const before = obj[key]; restore.push(() => { obj[key] = before; }); obj[key] = value; };
  patch(Jobs, 'init', async () => { if (offline) throw new Error('synthetic queue unavailable'); });
  patch(Jobs, 'create', async ([doc]) => { if (offline || failCreate) throw new Error('synthetic queue unavailable'); records.push(doc); return [doc]; });
  patch(Jobs, 'updateMany', async (filter, update) => {
    if (offline) throw new Error('synthetic queue unavailable');
    let n = 0; for (const doc of records) if (matches(doc, filter)) { apply(doc, update); n++; } return { matchedCount: n };
  });
  patch(Jobs, 'updateOne', async (filter, update) => {
    if (offline) throw new Error('synthetic queue unavailable');
    const doc = records.find((entry) => matches(entry, filter)); if (!doc) return { matchedCount: 0 };
    apply(doc, update); return { matchedCount: 1 };
  });
  patch(Jobs, 'exists', (filter) => query(() => { if (offline) throw new Error('synthetic queue unavailable'); return records.some((doc) => matches(doc, filter)); }));
  patch(Jobs, 'findOneAndUpdate', (filter, update) => query(() => {
    if (offline) throw new Error('synthetic queue unavailable');
    const doc = records.find((entry) => matches(entry, filter)); if (!doc) return null;
    apply(doc, update); return { ...doc };
  }));
  patch(mongoose.connection, 'transaction', async (fn) => {
    const previous = tail; let release; tail = new Promise((resolve) => { release = resolve; }); await previous;
    const saved = records.map((doc) => ({ ...doc })), savedUser = snapshot();
    try { return await fn({}); } catch (error) { records.splice(0, records.length, ...saved); rollback(savedUser); throw error; } finally { release(); }
  });
  return { records, setOffline(value) { offline = value; }, setFailCreate(value) { failCreate = value; }, restore() { restore.reverse().forEach((fn) => fn()); } };
}
module.exports = { installFakeResetMailQueue, matches, apply, query };
