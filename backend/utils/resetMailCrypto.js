const crypto = require('node:crypto');
function encryptionKey(env = process.env) {
  const value = env.RESET_MAIL_ENCRYPTION_KEY;
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(value)) throw new Error('Set RESET_MAIL_ENCRYPTION_KEY to a separate base64-encoded 32-byte key');
  if (value === env.JWT_SECRET) throw new Error('Recovery mail encryption requires a separate key');
  return Buffer.from(value, 'base64');
}
function encryptPayload(value, jobId) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(Buffer.from(String(jobId)));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}
function decryptPayload(value, jobId) {
  const data = Buffer.from(value, 'base64');
  if (data.length < 29) throw new Error('Invalid recovery job');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), data.subarray(0, 12));
  decipher.setAAD(Buffer.from(String(jobId))); decipher.setAuthTag(data.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8'));
}
module.exports = { encryptionKey, encryptPayload, decryptPayload };
