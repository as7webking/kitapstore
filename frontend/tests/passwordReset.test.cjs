const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const esbuild = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { MemoryRouter } = require('react-router-dom');
const root = path.resolve(__dirname, '..');
const output = esbuild.buildSync({
  stdin: { contents: "export * from './src/auth/passwordReset.js'; export {changeLanguage} from './src/i18n/index.js'; export {default as ForgotPassword} from './src/pages/ForgotPassword.jsx'; export {default as ResetPassword} from './src/pages/ResetPassword.jsx';", resolveDir: root },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic',
  define: { 'import.meta.env': '{}' },
});
const compiled = new Module(path.join(root, 'password-reset-test.cjs'));
compiled.filename = path.join(root, 'password-reset-test.cjs');
compiled.paths = Module._nodeModulePaths(root); compiled._compile(output.outputFiles[0].text, compiled.filename);
const { recoveryFields, newPasswordFields, readResetToken, ForgotPassword, ResetPassword, requestPasswordReset, changeLanguage } = compiled.exports;

test('reset form rejects malformed links, invalid emails, weak and mismatched passwords', () => {
  assert.equal(readResetToken('#token=' + 'a'.repeat(64)), 'a'.repeat(64));
  for (const fragment of ['', '#token=short', '#token=' + 'g'.repeat(64)]) assert.equal(readResetToken(fragment), '');
  assert.ok(recoveryFields[0].validate('invalid'));
  assert.equal(recoveryFields[0].validate(' reader@example.com '), '');
  assert.ok(newPasswordFields[0].validate('short'));
  assert.ok(newPasswordFields[0].validate('😀'.repeat(19)));
  assert.equal(newPasswordFields[0].validate('new-password-123'), '');
  assert.ok(newPasswordFields[1].validate('different', { password: 'new-password-123' }));
  assert.equal(newPasswordFields[1].validate('new-password-123', { password: 'new-password-123' }), '');
});

test('recovery pages render labeled forms, confirmation, autocomplete and invalid-link action', () => {
  const render = (Component, route) => renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(Component)));
  const forgot = render(ForgotPassword, '/forgot-password');
  assert.match(forgot, /type="email"/); assert.match(forgot, /autoComplete="email"/); assert.match(forgot, /Send reset link/);
  const reset = render(ResetPassword, '/reset-password#token=' + 'a'.repeat(64));
  assert.match(reset, /Confirm password/); assert.equal((reset.match(/autoComplete="new-password"/g) || []).length, 2);
  assert.doesNotMatch(reset, /a{64}/);
  const invalid = render(ResetPassword, '/reset-password');
  assert.match(invalid, /invalid or has expired/); assert.match(invalid, /href="\/forgot-password"/);
  assert.doesNotMatch(invalid, /type="password"/);
});

test('recovery sends current selected language with English fallback through mocked Axios', async () => {
  const axios = require('axios'); const original = axios.post; const calls = [];
  axios.post = async (url, data) => { calls.push({ url, data }); return { data: { code: 'PASSWORD_RESET_REQUESTED' } }; };
  try {
    for (const language of ['en', 'de', 'qt', 'ru', 'unsupported']) {
      await changeLanguage(language);
      await requestPasswordReset({ email: 'reader@example.test' });
      assert.ok(calls.at(-1).url.endsWith('/api/v1/user/forgot-password'));
      assert.deepEqual(calls.at(-1).data, { email: 'reader@example.test', language: language === 'unsupported' ? 'en' : language });
    }
  } finally { axios.post = original; await changeLanguage('en'); }
});
