import { t, translateMessage, apiMessage } from '../i18n/index.js';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import AccountForm from '../auth/AccountForm.jsx';
import { recoveryFields, requestPasswordReset } from '../auth/passwordReset.js';

export default function ForgotPassword() {
  const [message, setMessage] = useState('');
  return (
    <section className="flex min-h-[80vh] items-center justify-center bg-zinc-700 px-4 py-8 sm:px-8">
      <div className="w-full max-w-md rounded-lg bg-gray-700 px-5 py-6 sm:px-8">
        <h1 className="text-xl text-zinc-100">{t("auth:forgot_password")}</h1>
        {message ? <p role="status" aria-live="polite" className="mt-4 text-zinc-200">{translateMessage(message)}</p> : <>
          <p className="mt-3 text-sm text-zinc-300">{t("auth:enter_your_account_email_to_request_a_password_reset_link")}</p>
          <AccountForm fields={recoveryFields} submitLabel="auth:send_reset_link" pendingLabel="auth:requesting_link" onSubmit={async (values) => {
            const { data } = await requestPasswordReset(values);
            setMessage(apiMessage(data));
          }} />
        </>}
        <p className="mt-5 text-center"><Link to="/login" className="text-zinc-300 underline hover:text-blue-400 focus-visible:outline-2">{t("auth:back_to_login")}</Link></p>
      </div>
    </section>
  );
}
