const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const esbuild = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const output = esbuild.buildSync({ stdin: { contents: `export * from './src/catalog/query.js'; export {default as CatalogFilters} from './src/catalog/CatalogFilters.jsx'; export {changeLanguage} from './src/i18n/index.js';`, resolveDir: root }, bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic' });
const compiled = new Module(path.join(root, 'catalog-test.cjs')); compiled.filename = path.join(root, 'catalog-test.cjs'); compiled.paths = Module._nodeModulePaths(root); compiled._compile(output.outputFiles[0].text, compiled.filename);
const { defaults, catalogValues, catalogSearch, changeCatalogPage, CatalogFilters, changeLanguage } = compiled.exports;
test('catalog URL roundtrip preserves filters and pagination without session/cart writes', () => {
  const values = { ...defaults, q: 'A & B', language: 'Qırımtatarca', type: 'physical', minPrice: '0', maxPrice: '20.50', sort: 'price_desc', page: '3' };
  const url = catalogSearch(values).toString(); assert.deepEqual(catalogValues(url), values);
  assert.deepEqual(catalogValues(changeCatalogPage(url, 4)), { ...values, page: '4' });
  assert.deepEqual(catalogValues(url), values); assert.equal(catalogSearch(defaults).toString(), '');
});
test('catalog controls render persisted values and translated labels in every locale', async () => {
  for (const language of ['en', 'de', 'qt', 'ru']) {
    await changeLanguage(language);
    const html = renderToStaticMarkup(React.createElement(CatalogFilters, { initialValues: { ...defaults, q: 'Saved draft', language: 'Book language', minPrice: '0' }, languages: ['Book language'], onApply() {}, onReset() {} }));
    assert.match(html, /Saved draft/); assert.match(html, /Book language/); assert.match(html, /name="minPrice"/); assert.match(html, /value="0"/);
  }
  await changeLanguage('en');
});
