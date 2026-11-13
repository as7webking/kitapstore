import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { translateMessage } from '../../i18n/index.js';
import { addressSubmission } from '../../auth/profileAddress.js';

export default function AddressForm({ initialAddress = '' }) {
  const { t } = useTranslation('profile');
  const [address, setAddress] = useState(initialAddress);
  const [state, setState] = useState({ pending: false, error: '', success: false });
  const [submit] = useState(() => addressSubmission());
  const active = useRef(true);
  const input = useRef(null);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  return <form noValidate aria-busy={state.pending} onSubmit={(event) => {
    event.preventDefault();
    void submit(address, (next) => {
      if (!active.current) return;
      setState(next);
      if (next.success && typeof next.address === 'string') setAddress(next.address);
      if (next.error) input.current?.focus();
    });
  }}>
    <div className="mt-4">
      <label htmlFor="profile-address">{t('address')}</label>
      <textarea ref={input} id="profile-address" name="address" autoComplete="street-address" required
        maxLength={500} rows="5" readOnly={state.pending} aria-invalid={Boolean(state.error)}
        aria-describedby={state.error ? 'profile-address-error' : undefined}
        className="p-2 rounded bg-zinc-700 mt-2 font-semibold"
        placeholder={t('address')} value={address} onChange={(event) => {
          setAddress(event.target.value); setState({ pending: false, error: '', success: false });
        }} />
    </div>
    {state.error && <p id="profile-address-error" role="alert">{translateMessage(state.error)}</p>}
    {state.success && <p role="status" aria-live="polite">{t('address_updated')}</p>}
    <div className="mt-4 flex justify-end">
      <button type="submit" disabled={state.pending}
        className="bg-yellow-400 text-zinc-700 font-semibold px-3 py-2 rounded hover:bg-yellow-200 disabled:opacity-60">
        {t(state.pending ? 'saving_address' : 'update')}
      </button>
    </div>
  </form>;
}
