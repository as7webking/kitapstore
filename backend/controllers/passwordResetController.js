const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const resetQueue = require('../services/resetMailQueue');
const { passwordError, normalizeEmail, validEmail } = require('../utils/accountValidation');

const accepted = { message: 'If an account with this email can be recovered, you will receive a password reset link. Check your inbox and spam folder.' };
const invalidLink = { message: 'This reset link is invalid or has expired. Please request a new one.', invalidToken: true };
const localAccount = { authProvider: { $in: ['local', null] }, password: { $type: 'string' } };
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

async function forgotPassword(req, res) {
  res.set('Cache-Control', 'no-store');
  const email = normalizeEmail(req.body?.email);
  if (!validEmail(email)) return res.status(400).json({ message: 'Check the highlighted fields.', errors: { email: 'Enter a valid email address.' } });
  try {
    await resetQueue.enqueuePasswordReset(email, req.body?.language);
    return res.status(202).json(accepted);
  } catch {
    return res.status(503).json({ message: 'Password recovery is unavailable. Please try again later.' });
  }
}

async function resetPassword(req, res) {
  res.set('Cache-Control', 'no-store');
  const { token, password, confirmPassword } = req.body || {};
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json(invalidLink);
  const errors = {};
  const error = passwordError(password);
  if (error) errors.password = error;
  if (typeof confirmPassword !== 'string' || password !== confirmPassword) errors.confirmPassword = 'Passwords must match.';
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Check the highlighted fields.', errors });
  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    // One atomic update consumes the token, changes the password and revokes all JWTs.
    const user = await User.findOneAndUpdate({
      ...localAccount, resetPasswordTokenHash: hashToken(token), resetPasswordExpires: { $gt: new Date() },
    }, {
      $set: { password: hashedPassword },
      $unset: { resetPasswordTokenHash: '', resetPasswordExpires: '' },
      $inc: { sessionVersion: 1 },
    }, { new: false }).select('_id');
    if (!user) return res.status(400).json(invalidLink);
    return res.json({ message: 'Password updated. Please log in with your new password.' });
  } catch {
    return res.status(503).json({ message: 'Could not reset your password. Please try again.' });
  }
}

module.exports = { forgotPassword, resetPassword };
