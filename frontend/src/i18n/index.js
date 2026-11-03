import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import auth from './locales/en/auth.json';
import profile from './locales/en/profile.json';
import orders from './locales/en/orders.json';
import catalog from './locales/en/catalog.json';
import footer from './locales/en/footer.json';
import home from './locales/en/home.json';
import common from './locales/en/common.json';
import navigation from './locales/en/navigation.json';
import blog from './locales/en/blog.json';
import cart from './locales/en/cart.json';
import messages from './locales/en/messages.json';
import messageAliases from './messageAliases.json';
import apiMessages from '../../../shared/apiCodes.json';

import de_auth from './locales/de/auth.json';
import de_blog from './locales/de/blog.json';
import de_cart from './locales/de/cart.json';
import de_catalog from './locales/de/catalog.json';
import de_common from './locales/de/common.json';
import de_footer from './locales/de/footer.json';
import de_home from './locales/de/home.json';
import de_messages from './locales/de/messages.json';
import de_navigation from './locales/de/navigation.json';
import de_orders from './locales/de/orders.json';
import de_profile from './locales/de/profile.json';
import qt_auth from './locales/qt/auth.json';
import qt_blog from './locales/qt/blog.json';
import qt_cart from './locales/qt/cart.json';
import qt_catalog from './locales/qt/catalog.json';
import qt_common from './locales/qt/common.json';
import qt_footer from './locales/qt/footer.json';
import qt_home from './locales/qt/home.json';
import qt_messages from './locales/qt/messages.json';
import qt_navigation from './locales/qt/navigation.json';
import qt_orders from './locales/qt/orders.json';
import qt_profile from './locales/qt/profile.json';
import ru_auth from './locales/ru/auth.json';
import ru_blog from './locales/ru/blog.json';
import ru_cart from './locales/ru/cart.json';
import ru_catalog from './locales/ru/catalog.json';
import ru_common from './locales/ru/common.json';
import ru_footer from './locales/ru/footer.json';
import ru_home from './locales/ru/home.json';
import ru_messages from './locales/ru/messages.json';
import ru_navigation from './locales/ru/navigation.json';
import ru_orders from './locales/ru/orders.json';
import ru_profile from './locales/ru/profile.json';

export const translated = {
  de: { auth: de_auth, blog: de_blog, cart: de_cart, catalog: de_catalog, common: de_common, footer: de_footer, home: de_home, messages: de_messages, navigation: de_navigation, orders: de_orders, profile: de_profile },
  qt: { auth: qt_auth, blog: qt_blog, cart: qt_cart, catalog: qt_catalog, common: qt_common, footer: qt_footer, home: qt_home, messages: qt_messages, navigation: qt_navigation, orders: qt_orders, profile: qt_profile },
  ru: { auth: ru_auth, blog: ru_blog, cart: ru_cart, catalog: ru_catalog, common: ru_common, footer: ru_footer, home: ru_home, messages: ru_messages, navigation: ru_navigation, orders: ru_orders, profile: ru_profile },
};

export const languageStorageKey = 'kitapstore.language';
export const htmlLanguages = { en: 'en', de: 'de', qt: 'crh-Latn', ru: 'ru' };
export const languages = [
  { code: 'en', label: 'English', complete: true },
  { code: 'de', label: 'Deutsch', complete: true },
  { code: 'qt', label: 'Qırımtatarca', complete: true },
  { code: 'ru', label: 'Русский', complete: true },
];
export const english = { auth, profile, orders, catalog, footer, home, common, navigation, blog, cart, messages };
export function normalizeLanguage(value) {
  return Object.hasOwn(htmlLanguages, value) ? value : 'en';
}
export function savedLanguage() {
  try { return normalizeLanguage(globalThis.localStorage?.getItem(languageStorageKey)); }
  catch { return 'en'; }
}
const i18n = i18next.createInstance();
i18n.use(initReactI18next).init({
  resources: { en: english, ...translated },
  lng: savedLanguage(), fallbackLng: 'en', supportedLngs: languages.map(({ code }) => code),
  load: 'currentOnly', ns: Object.keys(english), defaultNS: 'common',
  interpolation: { escapeValue: false }, returnNull: false, returnEmptyString: false,
  initAsync: false, react: { useSuspense: false },
});
i18n.services.formatter.add('number', (value, language) => formatNumber(value, {}, language));
const pluralRule = i18n.services.pluralResolver.getRule.bind(i18n.services.pluralResolver);
i18n.services.pluralResolver.getRule = (language, options) => language === 'qt'
  ? { select: () => 'other', resolvedOptions: () => ({ pluralCategories: ['other'] }) }
  : pluralRule(language, options);

// qt is internal; unsupported Intl crh uses deliberate numeric formats, never Turkish text.
export function formatNumber(value, options = {}, language = i18n.language) {
  if (language === 'qt') return new Intl.NumberFormat('en-US', options).format(value)
    .replaceAll(',', '\u0000').replaceAll('.', ',').replaceAll('\u0000', '\u00a0');
  return new Intl.NumberFormat({ en: 'en-GB', de: 'de-DE', ru: 'ru-RU' }[language] || 'en-GB', options).format(value);
}
export function formatDate(value, language = i18n.language) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  if (language === 'qt') return [date.getDate(), date.getMonth() + 1, date.getFullYear()]
    .map((part) => String(part).padStart(2, '0')).join('.');
  return new Intl.DateTimeFormat({ en: 'en-GB', de: 'de-DE', ru: 'ru-RU' }[language] || 'en-GB').format(date);
}

function syncLanguage(language) {
  const selected = normalizeLanguage(language);
  try { globalThis.localStorage?.setItem(languageStorageKey, selected); } catch { /* Memory-only selection still works. */ }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = htmlLanguages[selected];
    document.title = i18n.t('common:site_title');
  }
}
i18n.on('languageChanged', syncLanguage);
syncLanguage(i18n.language);
if (typeof window !== 'undefined') window.addEventListener('storage', (event) => {
  if (event.key === languageStorageKey || event.key === null) {
    const next = savedLanguage();
    if (next !== i18n.language) void i18n.changeLanguage(next);
  }
});
export function changeLanguage(language) { return i18n.changeLanguage(normalizeLanguage(language)); }
export function t(key, options) { return i18n.t(key, options); }

// Store message keys/options, not rendered translations, so existing errors update.
// Prefer stable API codes; legacy English messages remain supported for older servers.
export function translateMessage(message) {
  if (!message) return '';
  if (typeof message === 'object' && !message.key) return translateMessage(apiMessage(message));
  if (typeof message === 'object' && message.key) {
    const options = { ...message.values };
    if (options.fieldKey) { options.field = translateMessage(options.fieldKey); delete options.fieldKey; }
    return t(message.key, options);
  }
  if (typeof message !== 'string') return t('common:unexpected_error');
  const key = Object.hasOwn(messageAliases, message) ? messageAliases[message] : message;
  return i18n.exists(key) ? t(key) : t('common:unexpected_error');
}
export default i18n;

// Store descriptors rather than rendered text so errors follow language changes.
export function apiMessage(data, fallback = 'common:unexpected_error') {
  if (data && typeof data.code === 'string' && Object.hasOwn(apiMessages, data.code)) {
    return { key: apiMessages[data.code] };
  }
  return typeof data?.message === 'string' ? data.message
    : typeof data?.error === 'string' ? data.error : fallback;
}
export function apiFieldErrors(data) {
  const errors = data?.errors && typeof data.errors === 'object' ? data.errors : {};
  const fieldCodes = data?.fieldCodes && typeof data.fieldCodes === 'object' ? data.fieldCodes : {};
  return Object.fromEntries([...new Set([...Object.keys(errors), ...Object.keys(fieldCodes)])]
    .map((field) => [field, apiMessage({ code: fieldCodes[field], message: errors[field] })]));
}
