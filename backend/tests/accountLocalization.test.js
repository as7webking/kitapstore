const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const nodemailer = require('nodemailer');
const User = require('../models/user');
const { apiMessages, withMessageCodes } = require('../middleware/apiMessages');
const { forgotPassword } = require('../controllers/passwordResetController');
const { accountLanguage, passwordResetEmail } = require('../utils/accountEmail');
const catalog = require('../../shared/apiCodes.json');
const legacyCodes = require('../utils/legacyApiCodes.json');

test('API codes are additive, stable for messages and field errors, with explicit-code priority', () => {
  const body = { message: 'Check the highlighted fields.', errors: { email: 'Enter a valid email address.', password: 'Passwords must match.' } };
  const result = withMessageCodes(body);
  assert.equal(result.message, body.message); assert.deepEqual(result.errors, body.errors);
  assert.equal(result.code, 'VALIDATION_FAILED');
  assert.deepEqual(result.fieldCodes, { email: 'EMAIL_INVALID', password: 'PASSWORD_CONFIRMATION_MISMATCH' });
  assert.equal(withMessageCodes({ code: 'CREDENTIALS_INVALID', message: 'New wording' }).code, 'CREDENTIALS_INVALID');
  assert.equal(withMessageCodes({ error: 'Mail send failed' }).code, 'MAIL_SEND_FAILED');
  assert.equal(withMessageCodes({ message: 'Unrecognized error' }).code, 'API_ERROR');
  assert.deepEqual(withMessageCodes({ token: 'synthetic' }), { token: 'synthetic' });
  assert.deepEqual(withMessageCodes([]), []);
  for (const code of Object.keys(catalog)) assert.match(code, /^[A-Z][A-Z0-9_]+$/);
  for (const code of Object.values(legacyCodes)) assert.ok(Object.hasOwn(catalog, code));
});

test('reset email templates cover four languages, minute plurals and English fallback', () => {
  const link = 'https://example.test/reset-password#token=synthetic';
  const subjects = { en: 'Reset your KitapStore password', de: 'Ihr KitapStore-Passwort zurücksetzen', qt: 'KitapStore şifreñizni yañartıñız', ru: 'Сброс пароля KitapStore' };
  for (const language of ['en', 'de', 'qt', 'ru']) {
    for (const minutes of [1, 2, 5, 21, 30, 120]) {
      const mail = passwordResetEmail(language, link, minutes);
      assert.equal(mail.subject, subjects[language]); assert.ok(mail.text.includes(link));
      assert.ok(mail.text.includes(String(minutes))); assert.doesNotMatch(mail.text, /{{|undefined/);
    }
  }
  assert.match(passwordResetEmail('ru', link, 1).text, /1 минуту/);
  assert.match(passwordResetEmail('ru', link, 2).text, /2 минуты/);
  assert.match(passwordResetEmail('ru', link, 5).text, /5 минут /);
  assert.match(passwordResetEmail('en', link, 1).text, /1 minute /);
  for (const value of [undefined, null, 'tr', 'crh-Latn', 'DE', {}, ['ru'], '__proto__']) {
    assert.equal(accountLanguage(value), 'en');
    assert.deepEqual(passwordResetEmail(value, link, 30), passwordResetEmail('en', link, 30));
  }
});

test('HTTP recovery carries language to mocked mail and keeps identical public replies in every language', async () => {
  const originalFind = User.findOne, originalUpdate = User.updateOne, originalTransport = nodemailer.createTransport;
  const originalUrl = process.env.FRONTEND_URL, originalTtl = process.env.PASSWORD_RESET_TTL_MINUTES;
  const env = Object.fromEntries(['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS'].map((key) => [key, process.env[key]]));
  process.env.FRONTEND_URL = 'https://shop.example.test'; process.env.PASSWORD_RESET_TTL_MINUTES = '30';
  Object.assign(process.env, { EMAIL_HOST: 'smtp.example.test', EMAIL_USER: 'test@example.test', EMAIL_PASS: 'synthetic' });
  const deliveries = [], updates = [];
  User.findOne = (query) => ({ select: async () => new RegExp(query.email.$regex, 'i').test('reader@example.test') ? { _id: 'synthetic', email: 'reader@example.test' } : null });
  User.updateOne = async (query, update) => { updates.push(update); };
  nodemailer.createTransport = () => ({ sendMail: async (mail) => { deliveries.push(mail); } });
  const app = express(); app.use(apiMessages); app.use(express.json()); app.post('/forgot-password', forgotPassword);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const post = async (body) => {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/forgot-password`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  };
  try {
    for (const language of ['en', 'de', 'qt', 'ru', 'unsupported']) {
      const before = deliveries.length;
      const known = await post({ email: 'reader@example.test', language });
      const unknown = await post({ email: 'missing@example.test', language });
      assert.equal(known.status, 202); assert.deepEqual(known, unknown);
      assert.equal(known.body.code, 'PASSWORD_RESET_REQUESTED'); assert.equal(deliveries.length, before + 1);
      const delivered = deliveries.at(-1), link = delivered.text.match(/https:\/\/[^\s]+/)[0];
      const expected = passwordResetEmail(language, link, 30);
      assert.equal(delivered.subject, expected.subject); assert.equal(delivered.text, expected.text);
      const token = new URLSearchParams(new URL(link).hash.slice(1)).get('token');
      assert.match(token, /^[a-f0-9]{64}$/);
      assert.equal(updates.at(-1).$set.resetPasswordTokenHash, require('node:crypto').createHash('sha256').update(token).digest('hex'));
    }
    const invalid = await post({ email: 'invalid', language: 'de' });
    assert.equal(invalid.status, 400); assert.equal(invalid.body.code, 'VALIDATION_FAILED');
    assert.equal(invalid.body.fieldCodes.email, 'EMAIL_INVALID');
  } finally {
    User.findOne = originalFind; User.updateOne = originalUpdate; nodemailer.createTransport = originalTransport;
    for (const [key, value] of Object.entries({ ...env, FRONTEND_URL: originalUrl, PASSWORD_RESET_TTL_MINUTES: originalTtl })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await new Promise((resolve) => server.close(resolve));
  }
});
