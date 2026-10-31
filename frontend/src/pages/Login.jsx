import { API_BASE_URL } from '../config/api.js';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AccountForm from '../auth/AccountForm.jsx';
import { login } from '../auth/session.js';

const fields = [
  { name: 'username', label: 'Username or email', autoComplete: 'username', maxLength: 254 },
  { name: 'password', label: 'Password', type: 'password', autoComplete: 'current-password', maxLength: 1024 },
];
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, message } = useSelector((state) => state.auth);
  const requested = location.state?.from;
  const destination = typeof requested === 'string' && requested.startsWith('/') && !requested.startsWith('//') && !/^\/(login|signup)(?:[/?]|$)/i.test(requested) ? requested : '/profile';
  if (isLoggedIn) return <Navigate to={destination} replace />;
  return (
    <section className="flex min-h-[80vh] items-center justify-center bg-zinc-700 px-4 py-8 sm:px-8">
      <div className="w-full max-w-md rounded-lg bg-gray-700 px-5 py-6 sm:px-8">
        <h1 className="text-xl text-zinc-100">Login</h1>
        <AccountForm fields={fields} submitLabel="Log In" pendingLabel="Logging in…"
          initialMessage={location.state?.message || message}
          onSubmit={async (values) => { if (await login(values)) navigate(destination, { replace: true }); }} />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <a href={`${API_BASE_URL}/api/v1/user/auth/google`} className="flex min-h-11 flex-1 items-center justify-center rounded bg-red-500 px-3 py-2 text-white hover:bg-red-600 focus-visible:outline-2">Login with Google</a>
          <a href={`${API_BASE_URL}/api/v1/user/auth/facebook`} className="flex min-h-11 flex-1 items-center justify-center rounded bg-blue-700 px-3 py-2 text-white hover:bg-blue-800 focus-visible:outline-2">Login with Facebook</a>
        </div>
        <p className="mt-5 text-center text-zinc-300">Don&apos;t have an account? <Link to="/signup" className="underline hover:text-blue-400">Sign up</Link></p>
      </div>
    </section>
  );
}
