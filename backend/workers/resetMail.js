require('dotenv').config({ path: require('node:path').join(__dirname, '../.env'), quiet: true });
const mongoose = require('mongoose');
const { validateEnv } = require('../config/env');
const { encryptionKey } = require('../utils/resetMailCrypto');
const { resetSettings } = require('../services/resetMailQueue');
const connectDatabase = require('../conn/conn');
const Jobs = require('../models/resetMailJob');
const { createResetMailWorker } = require('../services/resetMailWorker');
async function startWorker() {
  validateEnv(); encryptionKey(); resetSettings();
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) throw new Error('Worker requires configured email transport');
  try { await connectDatabase(); await Jobs.init(); }
  catch (error) { await mongoose.disconnect(); throw error; }
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
if (require.main === module) startWorker().catch(() => { console.error('Recovery mail worker could not start. Check configuration and database access.'); process.exitCode = 1; });
module.exports = { startWorker };
