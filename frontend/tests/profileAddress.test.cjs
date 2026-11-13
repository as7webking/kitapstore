const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const esbuild = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const axios = require('axios').default;
const root = path.resolve(__dirname, '..');
const result = esbuild.buildSync({ stdin: { contents: `export * from './src/auth/profileAddress.js'; export {default as AddressForm} from './src/components/Profile/AddressForm.jsx'; export {changeLanguage, default as i18n, translateMessage} from './src/i18n/index.js';`, resolveDir: root },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic', define: { 'import.meta.env': '{"VITE_API_URL":"https://api.example.test"}' } });
const compiled = new Module(path.join(root, 'profile-address-test.cjs'));
compiled.filename = path.join(root, 'profile-address-test.cjs'); compiled.paths = Module._nodeModulePaths(root);
compiled._compile(result.outputFiles[0].text, compiled.filename);
const { addressSubmission, validAddress, AddressForm, changeLanguage, i18n, translateMessage } = compiled.exports;
test('address mutation sends only trimmed address; blocks double submission and allows retry after failure', async () => {
  let finish; let calls = 0; const states = [];
  const submit = addressSubmission(async (value) => { calls++; assert.equal(value, 'Test street'); return new Promise((resolve) => { finish = resolve; }); });
  const first = submit('  Test street ', (state) => states.push(state));
  await submit('Second street', () => assert.fail('must ignore duplicate'));
  assert.equal(calls, 1); assert.equal(states[0].pending, true);
  finish({ data: { address: 'Test street' } }); await first;
  assert.equal(states.at(-1).success, true);
  const failure = addressSubmission(async () => { throw { response: { data: { code: 'PROFILE_UPDATE_UNAVAILABLE' } } }; });
  await failure('Keep draft', (state) => states.push(state));
  assert.equal(states.at(-1).address, undefined); assert.equal(states.at(-1).pending, false);
  await failure('Keep draft', (state) => states.push(state));
  const original = axios.defaults.adapter;
  axios.defaults.adapter = async (config) => {
    assert.equal(config.method, 'put'); assert.equal(config.url, 'https://api.example.test/api/v1/user/get-user-information');
    assert.deepEqual(JSON.parse(config.data), { address: 'Only address' });
    return { data: { address: 'Only address' }, status: 200, headers: {}, config };
  };
  try { await addressSubmission()('Only address', () => {}); } finally { axios.defaults.adapter = original; }
});
test('validation and form labels/messages work in four languages without exposing server wording', async () => {
  for (const value of ['', '   ', null, {}, 'x'.repeat(501), 'bad\u0000address']) assert.equal(validAddress(value), false);
  assert.equal(validAddress('Test street\nBerlin'), true);
  let called = false; const states = [];
  await addressSubmission(async () => { called = true; })(' ', (state) => states.push(state));
  assert.equal(called, false); assert.equal(states[0].error, 'profile:address_invalid');
  for (const language of ['en', 'de', 'qt', 'ru']) {
    await changeLanguage(language);
    const html = renderToStaticMarkup(React.createElement(AddressForm, { initialAddress: 'Retained draft' }));
    assert.match(html, /Retained draft/); assert.match(html, /autoComplete="street-address"/i);
    assert.match(html, /for="profile-address"/); assert.match(html, /maxLength="500"/i);
    for (const [code, key] of [['PROFILE_ADDRESS_UPDATED', 'address_updated'], ['PROFILE_ADDRESS_INVALID', 'address_invalid'], ['PROFILE_FIELDS_INVALID', 'fields_invalid'], ['PROFILE_UPDATE_UNAVAILABLE', 'update_unavailable']]) {
      assert.equal(translateMessage({ code, message: 'untrusted server wording' }), i18n.t(`profile:${key}`));
    }
  }
  await changeLanguage('en');
});
