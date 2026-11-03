const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const sendEmail = require('../utils/mailer');
const { trackBackgroundTask } = require('../utils/backgroundTasks');
const { passwordResetEmail } = require('../utils/accountEmail');
const { escapeRegex, passwordError, normalizeEmail, validEmail } = require('../utils/accountValidation');

const accepted = { message: 'If an account with this email can be recovered, you will receive a password reset link. Check your inbox and spam folder.' };
const invalidLink = { message: 'This reset link is invalid or has expired. Please request a new one.', invalidToken: true };
const localAccount = { authProvider: { $in: ['local', null] }, password: { $type: 'string' } };
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

function resetSettings() {
  const url = new URL('/reset-password', process.env.FRONTEND_URL || 'http://localhost:5173');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid frontend URL');
  const minutes = Number(process.env.PASSWORD_RESET_TTL_MINUTES || 30);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 120) throw new Error('Invalid reset lifetime');
  return { url, milliseconds: minutes * 60000 };
}

async function forgotPassword(req, res) {
  res.set('Cache-Control', 'no-store');
  const email = normalizeEmail(req.body?.email);
  if (!validEmail(email)) return res.status(400).json({ message: 'Check the highlighted fields.', errors: { email: 'Enter a valid email address.' } });
  try {
    const { url, milliseconds } = resetSettings();
    const user = await User.findOne({ ...localAccount, email: { $regex: `^${escapeRegex(email)}$`, $options: 'i' } }).select('_id email');
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(token);
      await User.updateOne({ _id: user._id }, { $set: {
        resetPasswordTokenHash: tokenHash,
        resetPasswordExpires: new Date(Date.now() + milliseconds),
      } });
      // Fragments are not sent to the frontend server or in HTTP referrers.
      url.hash = new URLSearchParams({ token }).toString();
      // Do not expose account existence via delivery errors or SMTP latency.
      const mail = passwordResetEmail(req.body?.language, url.toString(), milliseconds / 60000);
      trackBackgroundTask(sendEmail(user.email, mail.subject, mail.text)
        .catch(async () => {
          try {
            // A failed older delivery must not erase a newer request.
            await User.updateOne({ _id: user._id, resetPasswordTokenHash: tokenHash }, {
              $unset: { resetPasswordTokenHash: '', resetPasswordExpires: '' },
            });
          } catch { /* The expiry still prevents indefinite use. */ }
          console.warn('Password reset email could not be delivered. Check SMTP configuration.');
        }));
    }
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
