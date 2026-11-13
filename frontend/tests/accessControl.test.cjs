const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const esbuild = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { MemoryRouter, Routes, Route } = require('react-router-dom');
const { Provider } = require('react-redux');
const root = path.resolve(__dirname, '..');
// A forged compatibility storage role must never be sufficient for page access.
global.localStorage = { getItem: (key) => key === 'role' ? 'admin' : null, setItem() {}, removeItem() {} };
const output = esbuild.buildSync({ stdin: { contents: `export {default as RequireAuth} from './src/auth/RequireAuth.jsx'; export {changeLanguage} from './src/i18n/index.js';`, resolveDir: root },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic', define: { 'import.meta.env': '{}' } });
const compiled = new Module(path.join(root, 'access-test.cjs'));
compiled.filename = path.join(root, 'access-test.cjs'); compiled.paths = Module._nodeModulePaths(root);
compiled._compile(output.outputFiles[0].text, compiled.filename);
const { RequireAuth, changeLanguage } = compiled.exports;
function page(status, role, admin) {
  const store = { getState: () => ({ auth: { status, role } }), subscribe: () => () => {}, dispatch() {} };
  return renderToStaticMarkup(React.createElement(Provider, { store }, React.createElement(MemoryRouter, { initialEntries: ['/private'] },
    React.createElement(Routes, null, React.createElement(Route, { element: React.createElement(RequireAuth, { admin }) },
      React.createElement(Route, { path: '/private', element: React.createElement('p', null, 'PRIVATE-CONTENT-CANARY') }))))));
}
test('React guards deny guests, pending/error sessions and ordinary users on admin pages in every locale', async () => {
  for (const language of ['en', 'de', 'qt', 'ru']) {
    await changeLanguage(language);
    for (const status of ['guest', 'checking', 'error']) {
      assert.doesNotMatch(page(status, 'admin', false), /PRIVATE-CONTENT-CANARY/);
      assert.doesNotMatch(page(status, 'admin', true), /PRIVATE-CONTENT-CANARY/);
    }
    assert.doesNotMatch(page('authenticated', 'user', true), /PRIVATE-CONTENT-CANARY/);
    assert.match(page('authenticated', 'user', false), /PRIVATE-CONTENT-CANARY/);
    assert.match(page('authenticated', 'admin', true), /PRIVATE-CONTENT-CANARY/);
  }
  await changeLanguage('en');
});
