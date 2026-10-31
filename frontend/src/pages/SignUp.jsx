import { API_BASE_URL } from '../config/api.js';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import AccountForm from '../auth/AccountForm.jsx';

const fields = [
  { name: 'username', label: 'Username', autoComplete: 'username', maxLength: 50,
    validate: (v) => v.trim().length < 4 || !/^[\p{L}\p{N}_. -]+$/u.test(v.trim()) ? 'Use 4–50 letters, numbers, spaces, dots, dashes or underscores.' : '' },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', maxLength: 254,
    validate: (v) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? 'Enter a valid email address.' : '' },
  { name: 'password', label: 'Password', type: 'password', autoComplete: 'new-password',
    hint: 'At least 8 characters; up to 72 UTF-8 bytes.',
    validate: (v) => v.length < 8 || new TextEncoder().encode(v).length > 72 ? 'Use at least 8 characters and at most 72 UTF-8 bytes.' : '' },
  { name: 'address', label: 'Address', autoComplete: 'street-address', maxLength: 500 },
];
export default function SignUp() {
  const navigate = useNavigate();
  const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);
  if (isLoggedIn) return <Navigate to="/profile" replace />;
  return (
    <section className="flex min-h-[80vh] items-center justify-center bg-zinc-700 px-4 py-8 sm:px-8">
      <div className="w-full max-w-md rounded-lg bg-gray-700 px-5 py-6 sm:px-8">
        <h1 className="text-xl text-zinc-100">Sign Up</h1>
        <AccountForm fields={fields} submitLabel="Sign Up" pendingLabel="Creating account…" onSubmit={async (values) => {
          await axios.post(`${API_BASE_URL}/api/v1/user/sign-up`, values);
          navigate('/login', { replace: true, state: { message: 'Account created. You can now log in.' } });
        }} />
        <p className="mt-5 text-center text-zinc-300">Already have an account? <Link to="/login" className="underline hover:text-blue-400">Login</Link></p>
      </div>
    </section>
  );
}
