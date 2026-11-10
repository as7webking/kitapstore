require('dotenv').config({ path: require('node:path').join(__dirname, '../.env'), quiet: true });
const mongoose = require('mongoose');
const { validateWorkerEnv } = require('../config/env');
const connectDatabase = require('../conn/conn');
const Jobs = require('../models/resetMailJob');
const { createResetMailWorker } = require('../services/resetMailWorker');
const { startupError, startupMessage } = require('../utils/startupErrors');
async function prepareWorker({ validate = validateWorkerEnv, connect = connectDatabase,
  initialize = () => Jobs.init(), disconnect = () => mongoose.disconnect() } = {}) {
  validate();
  try { await connect(); }
  catch {
    await Promise.resolve().then(disconnect).catch(() => {});
    throw startupError('STARTUP_DATABASE', 'MongoDB connection failed. Check URI, database credentials and network access.');
  }
  try { await initialize(); }
  catch {
    await Promise.resolve().then(disconnect).catch(() => {});
    throw startupError('STARTUP_QUEUE', 'Recovery queue preparation failed. Check database permissions and queue indexes.');
  }
}
async function startWorker() {
  await prepareWorker();
  let stopping = false;
  const stop = () => { stopping = true; };
  process.once('SIGTERM', stop); process.once('SIGINT', stop);
  const worker = createResetMailWorker();
  console.log('Recovery mail worker started');
  try {
    while (!stopping) {
      try { if (await worker.runOne()) continue; }
      catch { console.warn('Recovery mail worker could not process a job.'); }
      if (!stopping) await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } finally {
    process.removeListener('SIGTERM', stop); process.removeListener('SIGINT', stop);
    await mongoose.disconnect();
  }
}
if (require.main === module) startWorker().catch((error) => { console.error('Recovery mail worker could not start. ' + startupMessage(error)); process.exitCode = 1; });
module.exports = { startWorker, prepareWorker };
