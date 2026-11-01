const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');
const parser = require('@babel/parser');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const memory = new Map();
global.localStorage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: (key) => memory.delete(key) };
global.document = { documentElement: { lang: '' }, title: '' };
global.window = new EventTarget();
const result = esbuild.buildSync({
  stdin: { contents: "export * from './src/i18n/index.js'; export {default as i18n} from './src/i18n/index.js'; export {default as AccountForm} from './src/auth/AccountForm.jsx';", resolveDir: root },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic',
});
const compiled = new Module(path.join(root, 'i18n-test.cjs'));
compiled.filename = path.join(root, 'i18n-test.cjs'); compiled.paths = Module._nodeModulePaths(root);
compiled._compile(result.outputFiles[0].text, compiled.filename);
const { i18n, english, changeLanguage, normalizeLanguage, savedLanguage, languageStorageKey, htmlLanguages, translateMessage, AccountForm } = compiled.exports;
const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
after(() => { i18n.removeResourceBundle('de', 'auth'); i18n.removeResourceBundle('de', 'messages'); i18n.removeResourceBundle('de', 'common'); });

test('English is the initial/default language; qt is internal and fallback is explicit', async () => {
  assert.equal(i18n.language, 'en'); assert.equal(document.documentElement.lang, 'en');
  assert.equal(normalizeLanguage('crh-Latn'), 'en'); assert.equal(normalizeLanguage('qt'), 'qt');
  for (const language of ['de', 'qt', 'ru']) {
    await changeLanguage(language);
    assert.equal(i18n.language, language); assert.equal(i18n.resolvedLanguage, 'en');
    assert.equal(document.documentElement.lang, htmlLanguages[language]);
    assert.equal(i18n.t('auth:email'), 'Email');
    assert.equal(i18n.t('catalog:book_count', { count: 2 }), '2 books');
    assert.equal(i18n.hasResourceBundle(language, 'auth'), false);
    assert.match(i18n.t('common:fallback_notice'), /English.*translation coming soon/);
  }
  await changeLanguage('en');
});

test('language persists without changing session/cart keys; invalid or blocked storage is safe', async () => {
  localStorage.setItem('token', 'synthetic-session'); localStorage.setItem('cart', 'synthetic-cart');
  await changeLanguage('qt');
  assert.equal(localStorage.getItem(languageStorageKey), 'qt'); assert.equal(savedLanguage(), 'qt');
  assert.equal(localStorage.getItem('token'), 'synthetic-session'); assert.equal(localStorage.getItem('cart'), 'synthetic-cart');
  localStorage.setItem(languageStorageKey, 'ru');
  const event = new Event('storage'); Object.defineProperty(event, 'key', { value: languageStorageKey }); window.dispatchEvent(event);
  assert.equal(i18n.language, 'ru');
  localStorage.setItem(languageStorageKey, 'unsupported'); assert.equal(savedLanguage(), 'en');
  const storage = global.localStorage;
  try {
    global.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
    assert.equal(savedLanguage(), 'en'); await changeLanguage('qt'); assert.equal(document.documentElement.lang, 'crh-Latn');
  } finally { global.localStorage = storage; await changeLanguage('en'); }
});

test('stored field errors and legacy API errors translate at render time, not at creation', async () => {
  const required = { key: 'common:required', values: { fieldKey: 'auth:email' } };
  assert.equal(translateMessage(required), 'Email is required.');
  const apiError = 'This email is already registered.';
  assert.equal(translateMessage(apiError), apiError);
  // Test-only markers; production has no German translations in this stage.
  i18n.addResourceBundle('de', 'auth', { email: 'TEST EMAIL' });
  i18n.addResourceBundle('de', 'messages', { this_email_is_already_registered: 'TEST DUPLICATE' });
  i18n.addResourceBundle('de', 'common', { required: 'TEST REQUIRED {{field}}' });
  await changeLanguage('de');
  assert.equal(translateMessage(required), 'TEST REQUIRED TEST EMAIL');
  assert.equal(translateMessage(apiError), 'TEST DUPLICATE');
  const markup = renderToStaticMarkup(React.createElement(AccountForm, {
    fields: [{ name: 'email', label: 'auth:email', type: 'email' }], initialMessage: apiError,
    submitLabel: 'auth:send_reset_link', pendingLabel: 'auth:requesting_link', onSubmit: async () => {},
  }));
  assert.match(markup, /TEST EMAIL/); assert.match(markup, /TEST DUPLICATE/);
  assert.equal(translateMessage('__proto__'), english.common.unexpected_error);
  i18n.removeResourceBundle('de', 'auth'); i18n.removeResourceBundle('de', 'messages'); i18n.removeResourceBundle('de', 'common');
  await changeLanguage('en');
});

test('all source keys/aliases have English entries; JSX and English values contain no mixed UI language', () => {
  const namespaces = Object.keys(english);
  const keyPattern = new RegExp(`['"]((?:${namespaces.join('|')}):[a-z0-9_]+)['"]`, 'g');
  let references = 0;
  const inspect = (node, file) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'JSXText') assert.doesNotMatch(node.value, /[A-Za-zА-Яа-яЁё]/, `Untranslated JSX text in ${path.relative(root, file)}`);
    if (node.type === 'JSXAttribute' && ['placeholder', 'alt', 'title', 'aria-label'].includes(node.name.name) && node.value?.type === 'StringLiteral') {
      assert.doesNotMatch(node.value.value, /[A-Za-zА-Яа-яЁё]/, `Untranslated attribute in ${path.relative(root, file)}`);
    }
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'start', 'end', 'comments', 'leadingComments', 'trailingComments', 'extra', 'tokens'].includes(key)) continue;
      if (Array.isArray(value)) value.forEach((child) => inspect(child, file));
      else if (value && typeof value === 'object') inspect(value, file);
    }
  };
  for (const file of files(path.join(root, 'src')).filter((file) => /\.(jsx|js)$/.test(file))) {
    const source = fs.readFileSync(file, 'utf8');
    for (const [, key] of source.matchAll(keyPattern)) {
      references++;
      assert.ok(i18n.exists(key, { lng: 'en' }) || i18n.exists(key, { lng: 'en', count: 2 }), `Missing English key: ${key}`);
    }
    inspect(parser.parse(source, { sourceType: 'module', plugins: ['jsx'] }), file);
  }
  assert.ok(references > 200);
  const aliases = JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/messageAliases.json'), 'utf8'));
  for (const key of Object.values(aliases)) assert.ok(i18n.exists(key, { lng: 'en' }), key);
  for (const dict of Object.values(english)) for (const value of Object.values(dict)) {
    assert.equal(typeof value, 'string'); assert.ok(value.trim()); assert.doesNotMatch(value, /[А-Яа-яЁё]/);
  }
  for (const field of ['title', 'author', 'language', 'price']) assert.ok(i18n.exists(`catalog:${field}`, { lng: 'en' }));
  assert.equal(i18n.t('catalog:book_count', { count: 1 }), '1 book');
  assert.equal(i18n.t('catalog:book_count', { count: 2 }), '2 books');
});
