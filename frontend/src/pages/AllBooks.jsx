import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApiResource } from '../errors/useApiResource.js';
import { API_BASE_URL } from '../config/api.js';
import { formatNumber } from '../i18n/index.js';
import BookCard from '../components/BookCard/BookCard';
import CatalogFilters from '../catalog/CatalogFilters.jsx';
import { catalogValues, changeCatalogPage } from '../catalog/query.js';

export default function AllBooks() {
  const { t } = useTranslation('catalog');
  const [params, setParams] = useSearchParams();
  const search = params.toString();
  const values = catalogValues(search);
  const { data, loading, error, retry } = useApiResource(`${API_BASE_URL}/api/v1/books/catalog?${search}`, false);
  const pagination = data?.pagination;
  return <div className="h-auto w-[90%] max-w-[1200px] mx-auto px-6 py-8">
    <h1 className="text-3xl text-gray-400">{t('all_books')}</h1>
    <CatalogFilters key={search} initialValues={values} languages={data?.languages || []}
      onApply={setParams} onReset={() => setParams({})} />
    {loading ? <p role="status" className="py-10">{t('loading')}</p> : error ?
      <div role="alert" className="py-10"><p>{t('catalog_error')}</p><button type="button" onClick={retry} className="min-h-11 rounded border px-4 py-2">{t('retry_catalog')}</button></div> : <>
        <p role="status" className="mt-6">{t('books_count', { count: pagination?.total || 0 })}</p>
        <div className="my-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {data?.data.map((item) => <BookCard key={item._id} data={item} />)}
        </div>
        {data?.data.length === 0 && <p className="text-zinc-400 text-center py-10">{t('no_books_found')}</p>}
        {pagination && pagination.totalPages > 0 && <nav aria-label={t('pagination')} className="flex flex-wrap items-center justify-center gap-4">
          <button type="button" disabled={pagination.page <= 1} className="min-h-11 rounded border px-4 py-2 disabled:opacity-50"
            onClick={() => setParams(changeCatalogPage(search, pagination.page - 1))}>{t('previous_page')}</button>
          <span>{t('page_of', { page: formatNumber(pagination.page), pages: formatNumber(pagination.totalPages) })}</span>
          <button type="button" disabled={pagination.page >= pagination.totalPages} className="min-h-11 rounded border px-4 py-2 disabled:opacity-50"
            onClick={() => setParams(changeCatalogPage(search, pagination.page + 1))}>{t('next_page')}</button>
        </nav>}
      </>}
  </div>;
}
