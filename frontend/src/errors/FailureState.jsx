import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function FailureState({ kind = 'network', onRetry }) {
  const { t } = useTranslation('common');
  return <section role="alert" className="mx-auto w-full max-w-xl px-4 py-12 text-center">
    <h1 className="text-2xl font-semibold">{t(`${kind}_title`)}</h1>
    <p className="mt-4">{t(`${kind}_description`)}</p>
    <div className="mt-6 flex flex-wrap justify-center gap-4">
      {onRetry && <button type="button" onClick={onRetry} className="min-h-11 rounded bg-blue-600 px-4 py-2 text-white">{t(kind === 'network' ? 'retry' : 'reload_page')}</button>}
      <Link to="/" className="min-h-11 rounded border px-4 py-2">{t('back_home')}</Link>
    </div>
  </section>;
}
