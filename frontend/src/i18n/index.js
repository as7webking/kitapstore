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

export const languageStorageKey = 'kitapstore.language';
export const htmlLanguages = { en: 'en', de: 'de', qt: 'crh-Latn', ru: 'ru' };
export const languages = [
  { code: 'en', label: 'English', complete: true },
  { code: 'de', label: 'Deutsch', complete: false },
  { code: 'qt', label: 'Qırımtatarca', complete: false },
  { code: 'ru', label: 'Русский', complete: false },
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
  resources: { en: english, de: {}, qt: {}, ru: {} },
  lng: savedLanguage(), fallbackLng: 'en', supportedLngs: languages.map(({ code }) => code),
  load: 'currentOnly', ns: Object.keys(english), defaultNS: 'common',
  interpolation: { escapeValue: false }, returnNull: false, returnEmptyString: false,
  initAsync: false, react: { useSuspense: false },
});
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
// Legacy English API messages are adapted here until the API gains stable codes.
export function translateMessage(message) {
  if (!message) return '';
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
