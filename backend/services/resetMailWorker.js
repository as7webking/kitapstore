const crypto = require('node:crypto');
const Jobs = require('../models/resetMailJob');
const User = require('../models/user');
const sendEmail = require('../utils/mailer');
const { decryptPayload } = require('../utils/resetMailCrypto');
const { resetSettings, RETENTION_MS } = require('./resetMailQueue');
const { passwordResetEmail } = require('../utils/accountEmail');
const MAX_ATTEMPTS = 3, LEASE_MS = 300000, SAFETY_MS = 30000;
function createResetMailWorker({ jobs = Jobs, users = User, send = sendEmail, now = Date.now } = {}) {
  const owner = (job) => ({ _id: job._id, status: 'processing', leaseId: job.leaseId });
  async function finish(job, status, clearToken = false) {
    const result = await jobs.updateOne(owner(job), { $set: { status, deleteAt: new Date(now() + RETENTION_MS) }, $unset: { payload: '', tokenHash: '', leaseId: '', leaseUntil: '' } });
    if (clearToken && result.matchedCount && job.user && /^[a-f0-9]{64}$/.test(job.tokenHash || '')) {
      await users.updateOne({ _id: job.user, resetPasswordTokenHash: job.tokenHash }, { $unset: { resetPasswordTokenHash: '', resetPasswordExpires: '' } });
    }
  }
  async function runOne() {
    await jobs.updateMany({ status: { $in: ['pending', 'processing'] }, expiresAt: { $lte: new Date(now()) } }, {
      $set: { status: 'cancelled', deleteAt: new Date(now() + RETENTION_MS) },
      $unset: { payload: '', tokenHash: '', leaseId: '', leaseUntil: '' },
    });
    const job = await jobs.findOneAndUpdate({ expiresAt: { $gt: new Date(now()) }, $or: [
      { status: 'pending', availableAt: { $lte: new Date(now()) } },
      { status: 'processing', leaseUntil: { $lte: new Date(now()) } },
    ] }, { $set: { status: 'processing', leaseId: crypto.randomUUID(), leaseUntil: new Date(now() + LEASE_MS) }, $inc: { attempts: 1 } }, { new: true, sort: { availableAt: 1, _id: 1 } }).select('+payload +tokenHash');
    if (!job) return false;
    let leaseLost = false, renewing = false;
    const heartbeat = setInterval(async () => {
      if (renewing) return;
      renewing = true;
      try { const updated = await jobs.updateOne(owner(job), { $set: { leaseUntil: new Date(now() + LEASE_MS) } }); if (!updated.matchedCount) leaseLost = true; }
      catch { leaseLost = true; }
      finally { renewing = false; }
    }, 30000);
    heartbeat.unref();
    try {
      if (!job.user || job.attempts > MAX_ATTEMPTS || job.expiresAt.getTime() <= now() + SAFETY_MS) {
        await finish(job, job.attempts > MAX_ATTEMPTS ? 'dead' : 'cancelled', true); return true;
      }
      let payload;
      try { payload = decryptPayload(job.payload, job._id); }
      catch { await finish(job, 'dead', true); return true; }
      const validUser = async () => users.findOne({ _id: job.user, resetPasswordTokenHash: job.tokenHash,
        resetPasswordExpires: { $gt: new Date(now() + SAFETY_MS) }, authProvider: { $in: ['local', null] }, password: { $type: 'string' } }).select('email');
      const user = await validUser();
      if (!user || user.email !== payload.email || typeof payload.token !== 'string' || !/^[a-f0-9]{64}$/.test(payload.token) || crypto.createHash('sha256').update(payload.token).digest('hex') !== job.tokenHash) {
        await finish(job, 'cancelled', true); return true;
      }
      const { url } = resetSettings();
      url.hash = new URLSearchParams({ token: payload.token }).toString();
      const mail = passwordResetEmail(job.language, url.toString(), 0, job.expiresAt);
      // Recheck after decryption/template work, immediately before starting SMTP.
      const currentUser = await validUser();
      if (leaseLost || !await jobs.exists({ ...owner(job), leaseUntil: { $gt: new Date(now()) } }) || !currentUser || currentUser.email !== payload.email || job.expiresAt.getTime() <= now() + SAFETY_MS) {
        await finish(job, 'cancelled', true); return true;
      }
      try {
        await send(user.email, mail.subject, mail.text, { messageId: `<reset-${job._id}@kitapstore.invalid>` });
      } catch {
        if (leaseLost) return true;
        const delay = 30000 * 2 ** (job.attempts - 1);
        if (job.attempts >= MAX_ATTEMPTS || now() + delay + SAFETY_MS >= job.expiresAt.getTime()) await finish(job, 'dead', true);
        else await jobs.updateOne(owner(job), { $set: { status: 'pending', availableAt: new Date(now() + delay) }, $unset: { leaseId: '', leaseUntil: '' } });
        return true;
      }
      if (!leaseLost) await finish(job, 'sent');
      return true;
    } finally { clearInterval(heartbeat); }
  }
  return { runOne };
}
module.exports = { createResetMailWorker, MAX_ATTEMPTS, LEASE_MS, SAFETY_MS };
