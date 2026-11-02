import { useTranslation } from 'react-i18next';
import { changeLanguage, htmlLanguages, languages } from './index.js';

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation('common');
  const selected = languages.find(({ code }) => code === i18n.language) || languages[0];
  return (
    <div className="relative ml-2 shrink-0 text-xs" lang={htmlLanguages[selected.code]}>
      <label className="sr-only" htmlFor="site-language">{t('language')}</label>
      <select id="site-language" value={selected.code} onChange={(event) => { void changeLanguage(event.target.value); }}
        aria-describedby={!selected.complete ? 'language-fallback' : undefined}
        className="max-w-[108px] rounded bg-zinc-700 px-1 py-2 text-white outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:max-w-none">
        {languages.map(({ code, label }) => <option key={code} value={code} lang={htmlLanguages[code]}>{label}</option>)}
      </select>
      {!selected.complete && <span id="language-fallback" role="status" className="block max-w-[108px] text-[9px] leading-tight text-zinc-200 sm:max-w-[160px]">{t('fallback_notice')}</span>}
    </div>
  );
}
