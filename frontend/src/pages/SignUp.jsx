import { t } from '../i18n/index.js';
import { API_BASE_URL } from '../config/api.js';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import AccountForm from '../auth/AccountForm.jsx';

const fields = [
  { name: 'username', label: "auth:username", autoComplete: 'username', maxLength: 50,
    validate: (v) => v.trim().length < 4 || !/^[\p{L}\p{N}_. -]+$/u.test(v.trim()) ? "auth:use_4_50_letters_numbers_spaces_dots_dashes_or_underscores" : '' },
  { name: 'email', label: "auth:email", type: 'email', autoComplete: 'email', maxLength: 254,
    validate: (v) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "auth:enter_a_valid_email_address" : '' },
  { name: 'password', label: "auth:password", type: 'password', autoComplete: 'new-password',
    hint: "auth:at_least_8_characters_up_to_72_utf_8_bytes",
    validate: (v) => v.length < 8 || new TextEncoder().encode(v).length > 72 ? "auth:use_at_least_8_characters_and_at_most_72_utf_8_bytes" : '' },
  { name: 'address', label: "auth:address", autoComplete: 'street-address', maxLength: 500 },
];
export default function SignUp() {
  const navigate = useNavigate();
  const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);
  if (isLoggedIn) return <Navigate to="/profile" replace />;
  return (
    <section className="flex min-h-[80vh] items-center justify-center bg-zinc-700 px-4 py-8 sm:px-8">
      <div className="min-w-0 w-full max-w-md rounded-lg bg-gray-700 px-5 py-6 sm:px-8">
        <h1 className="text-xl text-zinc-100">{t("auth:sign_up_2")}</h1>
        <AccountForm fields={fields} submitLabel="auth:sign_up_2" pendingLabel="auth:creating_account" onSubmit={async (values) => {
          await axios.post(`${API_BASE_URL}/api/v1/user/sign-up`, values);
          navigate('/login', { replace: true, state: { message: 'auth:account_created' } });
        }} />
        <p className="mt-5 text-center text-zinc-300">{t("auth:already_have_an_account")}{" "}<Link to="/login" className="underline hover:text-blue-400">{t("auth:login")}</Link></p>
      </div>
    </section>
  );
}
