const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const esbuild = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { MemoryRouter } = require('react-router-dom');
const root = path.resolve(__dirname, '..');
const result = esbuild.buildSync({ stdin: { contents: `
export { ErrorBoundary } from './src/errors/ErrorBoundary.jsx';
export { isChunkError } from './src/errors/chunkError.js';
export { readResource } from './src/errors/readResource.js';
export { default as FailureState } from './src/errors/FailureState.jsx';
export { default as i18n, changeLanguage } from './src/i18n/index.js';`, resolveDir: root },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic' });
const bundle = new Module(path.join(root, 'errors-test.cjs'));
bundle.filename = path.join(root, 'errors-test.cjs'); bundle.paths = Module._nodeModulePaths(root);
bundle._compile(result.outputFiles[0].text, bundle.filename);
const { ErrorBoundary, isChunkError, readResource, FailureState, i18n, changeLanguage } = bundle.exports;
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('GET failures differ from empty results, support retry and discard cancelled responses', async () => {
  const received = [];
  const receive = (state) => received.push(state);
  readResource('/books', true, receive, async () => ({ data: { data: [] } }));
  await flush(); assert.deepEqual(received.pop(), { data: [], loading: false, error: null });
  readResource('/books', true, receive, async () => { throw new Error('private request detail'); });
  await flush(); assert.deepEqual(received.pop(), { data: null, loading: false, error: 'network' });
  readResource('/books', true, receive, async () => ({ data: { data: ['recovered'] } }));
  await flush(); assert.deepEqual(received.pop().data, ['recovered']);
  readResource('/missing', false, receive, async () => { throw { response: { status: 404 } }; });
  await flush(); assert.equal(received.pop().error, 'not_found');
  let resolveOld; let signal;
  const cancel = readResource('/old', true, receive, (url, options) => { signal = options.signal; return new Promise((resolve) => { resolveOld = resolve; }); });
  await flush(); cancel(); assert.equal(signal.aborted, true);
  resolveOld({ data: { data: ['stale'] } }); await flush(); assert.equal(received.length, 0);
  let dispatched = false;
  readResource('/unmounted', true, receive, () => { dispatched = true; })();
  await flush(); assert.equal(dispatched, false);
});

test('render and chunk errors use safe localized fallbacks and reload only on explicit action', async () => {
  let reloads = 0;
  global.window = { location: { reload: () => reloads++ } };
  for (const message of ['Failed to fetch dynamically imported module: private-url', 'Loading chunk 8 failed', 'Importing a module script failed']) assert.equal(isChunkError(new Error(message)), true);
  assert.equal(isChunkError(new Error('private render detail')), false);
  for (const language of ['en', 'de', 'qt', 'ru']) {
    await changeLanguage(language);
    for (const [kind, error] of [['application', new Error('private-canary')], ['chunk', new Error('Failed to fetch dynamically imported module: private-canary')]]) {
      const boundary = new ErrorBoundary({ children: 'child' });
      boundary.state = ErrorBoundary.getDerivedStateFromError(error);
      const fallback = boundary.render();
      assert.equal(fallback.props.kind, kind);
      const html = renderToStaticMarkup(React.createElement(MemoryRouter, null, fallback));
      assert.ok(html.includes(i18n.t(`common:${kind}_title`)));
      assert.doesNotMatch(html, /private-canary/);
      const before = reloads;
      fallback.props.onRetry(); assert.equal(reloads, before + 1);
    }
    const missing = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(FailureState, { kind: 'not_found' })));
    assert.ok(missing.includes(i18n.t('common:not_found_title')));
    assert.ok(missing.includes('href="/"'));
  }
  await changeLanguage('en');
});
