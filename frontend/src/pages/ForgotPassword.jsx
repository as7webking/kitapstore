import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config/api.js';
import AccountForm from '../auth/AccountForm.jsx';
import { recoveryFields } from '../auth/passwordReset.js';

export default function ForgotPassword() {
  const [message, setMessage] = useState('');
  return (
    <section className="flex min-h-[80vh] items-center justify-center bg-zinc-700 px-4 py-8 sm:px-8">
      <div className="w-full max-w-md rounded-lg bg-gray-700 px-5 py-6 sm:px-8">
        <h1 className="text-xl text-zinc-100">Forgot password?</h1>
        {message ? <p role="status" aria-live="polite" className="mt-4 text-zinc-200">{message}</p> : <>
          <p className="mt-3 text-sm text-zinc-300">Enter your account email to request a password reset link.</p>
          <AccountForm fields={recoveryFields} submitLabel="Send reset link" pendingLabel="Requesting link…" onSubmit={async (values) => {
            const { data } = await axios.post(`${API_BASE_URL}/api/v1/user/forgot-password`, values);
            setMessage(data.message);
          }} />
        </>}
        <p className="mt-5 text-center"><Link to="/login" className="text-zinc-300 underline hover:text-blue-400 focus-visible:outline-2">Back to login</Link></p>
      </div>
    </section>
  );
}
