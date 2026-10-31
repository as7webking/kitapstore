import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { restoreSession } from './session.js';

export default function RequireAuth({ admin = false }) {
  const { status, role } = useSelector((state) => state.auth);
  const location = useLocation();
  if (status === 'checking') return <p role="status" className="p-8 text-center">Checking your session…</p>;
  if (status === 'error') return <div role="alert" className="p-8 text-center"><p>Could not check your session. Please check your connection.</p><button onClick={restoreSession} className="mt-4 rounded bg-blue-400 px-6 py-2 text-white focus-visible:outline-2">Try again</button></div>;
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (admin && role !== 'admin') return <Navigate to="/profile" replace />;
  return <Outlet />;
}
