const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const esbuild = require('esbuild');
const axios = require('axios').default;
const root = path.resolve(__dirname, '..');
const memory = new Map();
global.localStorage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: (key) => memory.delete(key) };
global.window = new EventTarget();
window.location = { origin: 'http://frontend.test', pathname: '/', search: '' };
const output = esbuild.buildSync({
  stdin: { contents: "export * from './src/auth/session.js'; export { default as store } from './src/store/index.js';", resolveDir: root },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  define: { 'import.meta.env': '{"VITE_API_URL":"http://api.test"}' },
});
const compiled = new Module(path.join(root, 'session-test-bundle.cjs'));
compiled.filename = path.join(root, 'session-test-bundle.cjs');
compiled.paths = Module._nodeModulePaths(root);
compiled._compile(output.outputFiles[0].text, compiled.filename);
const session = compiled.exports;
const token = (expires = Date.now() + 60000, marker = '') => 'header.' + Buffer.from(JSON.stringify({ exp: Math.floor(expires / 1000), marker })).toString('base64url') + '.signature';
const user = { _id: '507f1f77bcf86cd799439011', username: 'Reader', role: 'user' };
const response = (config, data, status = 200) => ({ config, data, status, headers: {}, statusText: '' });
const fail = (config, status) => { throw new axios.AxiosError('test failure', undefined, config, {}, response(config, { message: 'Test error' }, status)); };
let activeToken = token();
let mode = 'success';
let captured;
axios.defaults.adapter = async (config) => {
  captured = config;
  if (mode === 'offline') throw new axios.AxiosError('offline', 'ERR_NETWORK', config);
  if (config.url.endsWith('/sign-in')) return mode === 'badLogin' ? fail(config, 401) : response(config, { token: activeToken });
  if (mode === 'unauthorized') return fail(config, 401);
  if (config.url.endsWith('/sign-out')) return response(config, { message: 'Signed out' });
  return response(config, user);
};
after(() => session.clearSession());

test('browser session lifecycle: server role, reload, expiry, network failure, revocation and unrelated storage', async () => {
  localStorage.setItem('unrelated-preference', 'keep');
  localStorage.setItem('token', activeToken); localStorage.setItem('role', 'admin');
  await session.restoreSession();
  assert.equal(session.store.getState().auth.role, 'user');
  assert.equal(session.store.getState().auth.user.id, user._id);
  assert.equal(captured.headers.get('Authorization'), `Bearer ${activeToken}`);
  assert.equal(captured.headers.get('id'), undefined);
  mode = 'offline';
  await session.restoreSession();
  assert.equal(session.store.getState().auth.status, 'error');
  assert.equal(localStorage.getItem('token'), activeToken);
  mode = 'success'; await session.restoreSession();
  mode = 'badLogin';
  await assert.rejects(session.login({ username: 'Reader', password: 'wrong' }));
  assert.equal(localStorage.getItem('token'), activeToken);
  mode = 'offline';
  await assert.rejects(session.logout());
  assert.equal(localStorage.getItem('token'), activeToken);
  mode = 'success'; await session.logout();
  assert.equal(session.store.getState().auth.status, 'guest');
  assert.equal(localStorage.getItem('token'), null);
  assert.equal(localStorage.getItem('unrelated-preference'), 'keep');
  activeToken = token(Date.now() + 60000, 'fresh');
  await session.login({ username: 'Reader', password: 'correct' });
  assert.equal(session.store.getState().auth.status, 'authenticated');
  mode = 'unauthorized';
  await assert.rejects(axios.get('http://api.test/api/v1/cart/get-user-cart'));
  assert.equal(session.store.getState().auth.status, 'guest');
  localStorage.setItem('token', token(Date.now() - 5000));
  await session.restoreSession();
  assert.equal(localStorage.getItem('token'), null);
  assert.match(session.store.getState().auth.message, /expired/);
});

test('cross-tab logout, stale responses and foreign URLs do not leak or corrupt sessions', async () => {
  mode = 'success'; activeToken = token(Date.now() + 60000, 'first');
  await session.login({ username: 'Reader', password: 'correct' });
  const cleanup = session.startSessionLifecycle();
  await new Promise((resolve) => setImmediate(resolve));
  localStorage.removeItem('token');
  const event = new Event('storage'); Object.defineProperty(event, 'key', { value: 'token' });
  window.dispatchEvent(event);
  assert.equal(session.store.getState().auth.status, 'guest');
  cleanup();
  activeToken = token(Date.now() + 60000, 'second');
  await session.login({ username: 'Reader', password: 'correct' });
  await axios.get('https://foreign.test/api/private');
  assert.equal(captured.headers.get('Authorization'), undefined);
  // An old API response arriving after a new login must not remove the new token.
  const originalAdapter = axios.defaults.adapter;
  let rejectStale;
  axios.defaults.adapter = (config) => config.url.endsWith('/delayed') ? new Promise((resolve, reject) => {
    rejectStale = () => reject(new axios.AxiosError('expired old request', undefined, config, {}, response(config, {}, 401)));
  }) : originalAdapter(config);
  const stale = axios.get('http://api.test/api/delayed');
  await new Promise((resolve) => setImmediate(resolve));
  activeToken = token(Date.now() + 60000, 'third');
  await session.login({ username: 'Reader', password: 'correct' });
  rejectStale(); await assert.rejects(stale);
  assert.equal(localStorage.getItem('token'), activeToken);
  axios.defaults.adapter = originalAdapter;
});

test('late login and logout responses cannot revive or clear a newer session', async () => {
  mode = 'success';
  session.clearSession();
  const originalAdapter = axios.defaults.adapter;
  let finish;
  axios.defaults.adapter = (config) => config.url.endsWith('/sign-in') ? new Promise((resolve) => {
    finish = () => resolve(response(config, { token: token(Date.now() + 60000, 'cancelled-login') }));
  }) : originalAdapter(config);
  const pendingLogin = session.login({ username: 'Reader', password: 'correct' });
  await new Promise((resolve) => setImmediate(resolve));
  session.clearSession();
  finish();
  assert.equal(await pendingLogin, false);
  assert.equal(localStorage.getItem('token'), null);
  axios.defaults.adapter = originalAdapter;
  activeToken = token(Date.now() + 60000, 'before-logout');
  await session.login({ username: 'Reader', password: 'correct' });
  axios.defaults.adapter = (config) => config.url.endsWith('/sign-out') ? new Promise((resolve) => {
    finish = () => resolve(response(config, {}));
  }) : originalAdapter(config);
  const pendingLogout = session.logout();
  await new Promise((resolve) => setImmediate(resolve));
  activeToken = token(Date.now() + 60000, 'new-login');
  await session.login({ username: 'Reader', password: 'correct' });
  finish(); await pendingLogout;
  assert.equal(localStorage.getItem('token'), activeToken);
  assert.equal(session.store.getState().auth.status, 'authenticated');
  axios.defaults.adapter = originalAdapter;
});
