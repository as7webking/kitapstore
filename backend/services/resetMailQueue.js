const crypto = require('node:crypto');
const mongoose = require('mongoose');
const User = require('../models/user');
const Jobs = require('../models/resetMailJob');
const { encryptPayload, encryptionKey } = require('../utils/resetMailCrypto');
const { accountLanguage } = require('../utils/accountEmail');
const { escapeRegex } = require('../utils/accountValidation');
const RETENTION_MS = 86400000;
function resetSettings() {
  encryptionKey();
  const url = new URL('/reset-password', process.env.FRONTEND_URL || 'http://localhost:5173');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid frontend URL');
  const minutes = Number(process.env.PASSWORD_RESET_TTL_MINUTES || 30);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 120) throw new Error('Invalid reset lifetime');
  return { url, milliseconds: minutes * 60000 };
}
async function enqueuePasswordReset(email, language) {
  const { milliseconds } = resetSettings();
  await Jobs.init(); // Collection/index creation occurs before the transaction.
  const now = new Date(), expiresAt = new Date(now.getTime() + milliseconds);
  const _id = new mongoose.Types.ObjectId();
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await mongoose.connection.transaction(async (session) => {
    const user = await User.findOne({ authProvider: { $in: ['local', null] }, password: { $type: 'string' }, email: { $regex: `^${escapeRegex(email)}$`, $options: 'i' } }).session(session).select('_id email');
    // Enqueue for unknown email too: queue storage failures have the same response.
    // Such jobs are discarded by the worker without ever reaching SMTP.
    const payload = encryptPayload({ token, email: user?.email || email }, _id);
    if (user) {
      await User.updateOne({ _id: user._id }, { $set: { resetPasswordTokenHash: tokenHash, resetPasswordExpires: expiresAt } }, { session });
      await Jobs.updateMany({ user: user._id, status: { $in: ['pending', 'processing'] } }, {
        $set: { status: 'cancelled', deleteAt: new Date(now.getTime() + RETENTION_MS) },
        $unset: { payload: '', tokenHash: '', leaseId: '', leaseUntil: '' },
      }, { session });
    }
    await Jobs.create([{ _id, user: user?._id || null, tokenHash, payload, language: accountLanguage(language),
      expiresAt, deleteAt: expiresAt, availableAt: now, status: 'pending', attempts: 0 }], { session });
  }, { writeConcern: { w: 'majority' } });
}
module.exports = { enqueuePasswordReset, resetSettings, RETENTION_MS };
