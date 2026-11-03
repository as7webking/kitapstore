const { test } = require('node:test');
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
const { i18n, english, translated, formatDate, formatNumber, changeLanguage, normalizeLanguage, savedLanguage, languageStorageKey, htmlLanguages, translateMessage, apiMessage, apiFieldErrors, AccountForm } = compiled.exports;
const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
test('English is default; all translated languages resolve with correct HTML language', async () => {
  assert.equal(i18n.language, 'en');
  assert.equal(normalizeLanguage('crh-Latn'), 'en');
  for (const language of ['de', 'qt', 'ru']) {
    await changeLanguage(language);
    assert.equal(i18n.resolvedLanguage, language);
    assert.equal(document.documentElement.lang, htmlLanguages[language]);
    assert.equal(i18n.t('auth:email'), translated[language].auth.email);
    assert.ok(i18n.hasResourceBundle(language, 'auth'));
    // A genuinely missing entry still falls back to English.
    const original = i18n.getResource(language, 'common', 'send');
    delete i18n.getResourceBundle(language, 'common').send;
    assert.equal(i18n.t('common:send'), english.common.send);
    i18n.addResource(language, 'common', 'send', original);
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
  for (const language of ['de', 'qt', 'ru']) {
    await changeLanguage(language);
    assert.equal(translateMessage(required), i18n.t('common:required', { field: i18n.t('auth:email') }));
    assert.equal(translateMessage(apiError), translated[language].messages.this_email_is_already_registered);
    const markup = renderToStaticMarkup(React.createElement(AccountForm, {
      fields: [{ name: 'email', label: 'auth:email', type: 'email' }], initialMessage: apiError,
      submitLabel: 'auth:send_reset_link', pendingLabel: 'auth:requesting_link', onSubmit: async () => {},
    }));
    assert.ok(markup.includes(translated[language].auth.email));
    assert.ok(markup.includes(translated[language].messages.this_email_is_already_registered));
    assert.equal(translateMessage('__proto__'), translated[language].common.unexpected_error);
  }
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

test('all catalogs have matching keys and interpolation parameters, including Russian plural forms', () => {
  const params = (value) => [...value.matchAll(/{{\s*([^}, ]+)(?:,[^}]+)?\s*}}/g)].map((match) => match[1]).sort();
  for (const [language, namespaces] of Object.entries(translated)) {
    assert.deepEqual(Object.keys(namespaces).sort(), Object.keys(english).sort());
    for (const [namespace, original] of Object.entries(english)) {
      const dict = namespaces[namespace];
      const extras = language === 'ru' && namespace === 'catalog' ? ['book_count_few', 'book_count_many'] : [];
      assert.deepEqual(Object.keys(dict).sort(), [...Object.keys(original), ...extras].sort());
      for (const [key, value] of Object.entries(dict)) {
        assert.equal(typeof value, 'string'); assert.ok(value.trim());
        assert.deepEqual(params(value), params(original[key] || original.book_count_other), `${language}:${namespace}:${key}`);
        if (language === 'qt') assert.doesNotMatch(value, /[А-Яа-яЁё]/);
      }
    }
  }
});

test('plural forms and localized number/date formatting are deterministic', async () => {
  for (const [language, expected] of Object.entries({ en: ['1 book', '2 books', '5 books', '21 books'], de: ['1 Buch', '2 Bücher', '5 Bücher', '21 Bücher'], qt: ['1 kitap', '2 kitap', '5 kitap', '21 kitap'], ru: ['1 книга', '2 книги', '5 книг', '21 книга'] })) {
    await changeLanguage(language);
    assert.deepEqual([1, 2, 5, 21].map((count) => i18n.t('catalog:book_count', { count })), expected);
    assert.ok(i18n.t('catalog:books_count', { count: 1234 }).includes(formatNumber(1234)));
  }
  assert.equal(formatNumber(1234.5, {}, 'de'), '1.234,5');
  assert.equal(formatNumber(1234.5, {}, 'ru'), '1\u00a0234,5');
  assert.equal(formatNumber(1234.5, {}, 'qt'), '1\u00a0234,5');
  assert.equal(formatDate(new Date(2026, 10, 2), 'qt'), '02.11.2026');
  assert.equal(formatDate(new Date(2026, 10, 2), 'de'), '2.11.2026');
  assert.equal(formatDate('invalid', 'ru'), '—');
  await changeLanguage('en');
});

test('API codes take priority over legacy wording, field codes and stored errors follow language', async () => {
  const codes = JSON.parse(fs.readFileSync(path.join(root, '../shared/apiCodes.json'), 'utf8'));
  const error = apiMessage({ code: 'EMAIL_INVALID', message: 'changed server wording' });
  const fields = apiFieldErrors({ fieldCodes: { password: 'PASSWORD_CONFIRMATION_MISMATCH' }, errors: { email: 'Enter a valid email address.' } });
  for (const language of ['en', 'de', 'qt', 'ru']) {
    await changeLanguage(language);
    for (const key of Object.values(codes)) assert.ok(i18n.exists(key, { lng: language, fallbackLng: false }), `${language}:${key}`);
    assert.equal(translateMessage(error), i18n.t('messages:enter_a_valid_email_address'));
    assert.equal(translateMessage(fields.password), i18n.t('messages:passwords_must_match'));
    assert.equal(translateMessage(fields.email), translateMessage(error));
    assert.equal(translateMessage({ code: 'EMAIL_INVALID', message: 'wrong wording' }), translateMessage(error));
    assert.equal(translateMessage(apiMessage({ code: 'FUTURE_CODE', message: 'Enter a valid email address.' })), translateMessage(error));
    assert.equal(translateMessage({ code: '__proto__' }), i18n.t('common:unexpected_error'));
  }
  await changeLanguage('en');
});
