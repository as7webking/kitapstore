import { t } from '../i18n/index.js';
import { API_BASE_URL } from '../config/api.js';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AccountForm from '../auth/AccountForm.jsx';
import { login } from '../auth/session.js';

const fields = [
  { name: 'username', label: "auth:username_or_email", autoComplete: 'username', maxLength: 254 },
  { name: 'password', label: "auth:password", type: 'password', autoComplete: 'current-password', maxLength: 1024 },
];
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, message } = useSelector((state) => state.auth);
  const requested = location.state?.from;
  const destination = typeof requested === 'string' && requested.startsWith('/') && !requested.startsWith('//') && !/^\/(login|signup)(?:[/?]|$)/i.test(requested) ? requested : "/profile";
  if (isLoggedIn) return <Navigate to={destination} replace />;
  return (
    <section className="flex min-h-[80vh] items-center justify-center bg-zinc-700 px-4 py-8 sm:px-8">
      <div className="w-full max-w-md rounded-lg bg-gray-700 px-5 py-6 sm:px-8">
        <h1 className="text-xl text-zinc-100">{t("auth:login")}</h1>
        <AccountForm fields={fields} submitLabel="auth:log_in" pendingLabel="auth:logging_in"
          initialMessage={location.state?.message || message}
          onSubmit={async (values) => { if (await login(values)) navigate(destination, { replace: true }); }} />
        <p className="mt-4 text-right"><Link to="/forgot-password" className="text-zinc-300 underline hover:text-blue-400 focus-visible:outline-2">{t("auth:forgot_password")}</Link></p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <a href={`${API_BASE_URL}/api/v1/user/auth/google`} className="flex min-h-11 flex-1 items-center justify-center rounded bg-red-500 px-3 py-2 text-white hover:bg-red-600 focus-visible:outline-2">{t("auth:login_with_google")}</a>
          <a href={`${API_BASE_URL}/api/v1/user/auth/facebook`} className="flex min-h-11 flex-1 items-center justify-center rounded bg-blue-700 px-3 py-2 text-white hover:bg-blue-800 focus-visible:outline-2">{t("auth:login_with_facebook")}</a>
        </div>
        <p className="mt-5 text-center text-zinc-300">{t("auth:don_t_have_an_account")}{" "}<Link to="/signup" className="underline hover:text-blue-400">{t("auth:sign_up")}</Link></p>
      </div>
    </section>
  );
}
