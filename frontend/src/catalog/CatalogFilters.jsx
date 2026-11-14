import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { catalogSearch, defaults } from './query.js';

export default function CatalogFilters({ initialValues, languages, onApply, onReset }) {
  const { t } = useTranslation('catalog');
  const [values, setValues] = useState(initialValues);
  const change = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  const inputClass = 'w-full min-w-0 rounded border p-3 text-gray-700';
  return <form onSubmit={(event) => { event.preventDefault(); onApply(catalogSearch({ ...values, page: '1' })); }}
    className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    <label>{t('search')}<input type="search" name="q" maxLength={120} value={values.q} onChange={change} placeholder={t('search_books')} className={inputClass} /></label>
    <label>{t('book_language_filter')}<select name="language" value={values.language} onChange={change} className={inputClass}>
      <option value="">{t('all_languages')}</option>
      {[...new Set([values.language, ...languages])].filter(Boolean).map((language) => <option key={language} value={language}>{language}</option>)}
    </select></label>
    <label>{t('book_type')}<select name="type" value={values.type} onChange={change} className={inputClass}>
      <option value="">{t('all_types')}</option><option value="physical">{t('physical')}</option><option value="digital">{t('digital')}</option>
    </select></label>
    <label>{t('min_price')}<input type="number" name="minPrice" min="0" max="1000000" step="0.01" value={values.minPrice} onChange={change} className={inputClass} /></label>
    <label>{t('max_price')}<input type="number" name="maxPrice" min="0" max="1000000" step="0.01" value={values.maxPrice} onChange={change} className={inputClass} /></label>
    <label>{t('sort_by')}<select name="sort" value={values.sort} onChange={change} className={inputClass}>
      <option value="newest">{t('sort_newest')}</option><option value="price_asc">{t('sort_price_asc')}</option><option value="price_desc">{t('sort_price_desc')}</option>
    </select></label>
    <div className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-3">
      <button className="min-h-11 rounded bg-blue-600 text-white px-4 py-2" type="submit">{t('apply_filters')}</button>
      <button className="min-h-11 rounded border px-4 py-2" type="button" onClick={() => { setValues({ ...defaults }); onReset(); }}>{t('reset_filters')}</button>
    </div>
  </form>;
}
