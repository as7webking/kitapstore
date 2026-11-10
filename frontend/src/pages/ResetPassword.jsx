import { t, translateMessage, apiMessage } from '../i18n/index.js';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config/api.js';
import AccountForm from '../auth/AccountForm.jsx';
import { newPasswordFields, readResetToken } from '../auth/passwordReset.js';
import { clearSession } from '../auth/session.js';

function ResetPasswordForm({ location }) {
  const [token] = useState(() => readResetToken(location.hash));
  const [invalid, setInvalid] = useState(!token);
  const [message, setMessage] = useState('');
  useEffect(() => {
    // Keep the token in memory, removing it from the address bar and current history entry.
    if (location.hash) window.history.replaceState(window.history.state, '', location.pathname + location.search);
  }, [location.hash, location.pathname, location.search]);
  return (
    <section className="flex min-h-[80vh] items-center justify-center bg-zinc-700 px-4 py-8 sm:px-8">
      <div className="min-w-0 w-full max-w-md rounded-lg bg-gray-700 px-5 py-6 sm:px-8">
        <h1 className="text-xl text-zinc-100">{t("auth:choose_a_new_password")}</h1>
        {message ? <p role="status" aria-live="polite" className="mt-4 text-zinc-200">{translateMessage(message)}</p> : invalid ?
          <p role="alert" className="mt-4 text-red-200">{t("auth:this_reset_link_is_invalid_or_has_expired_please_request_a_new_one")}</p> :
          <AccountForm fields={newPasswordFields} submitLabel="auth:save_new_password" pendingLabel="auth:saving_password" onSubmit={async (values) => {
            try {
              const { data } = await axios.post(`${API_BASE_URL}/api/v1/user/reset-password`, { token, ...values });
              clearSession();
              setMessage(apiMessage(data));
            } catch (error) {
              if (error.response?.data?.invalidToken) setInvalid(true);
              else throw error;
            }
          }} />}
        {invalid && !message && <p className="mt-4"><Link to="/forgot-password" className="text-zinc-300 underline hover:text-blue-400 focus-visible:outline-2">{t("auth:request_a_new_reset_link")}</Link></p>}
        <p className="mt-5 text-center"><Link to="/login" className="text-zinc-300 underline hover:text-blue-400 focus-visible:outline-2">{t("auth:back_to_login")}</Link></p>
      </div>
    </section>
  );
}

// Opening another email link in the same tab must initialize its own token/state.
export default function ResetPassword() {
  const location = useLocation();
  return <ResetPasswordForm key={location.hash} location={location} />;
}
