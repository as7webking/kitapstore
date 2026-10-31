import axios from 'axios';
import store from '../store/index.js';
import { authActions } from '../store/auth.js';
import { API_BASE_URL } from '../config/api.js';

let expiryTimer;
let generation = 0;
export function tokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return Number.isFinite(payload.exp) ? payload.exp * 1000 : 0;
  } catch { return 0; }
}
export function clearSession(message = '') {
  generation += 1;
  clearTimeout(expiryTimer);
  for (const key of ['token', 'id', 'role']) localStorage.removeItem(key);
  store.dispatch(authActions.logout(message));
}
function scheduleExpiry(token) {
  clearTimeout(expiryTimer);
  const remaining = tokenExpiry(token) - Date.now();
  if (remaining <= 0) return clearSession('Your session expired. Please log in again.');
  expiryTimer = setTimeout(() => {
    if (localStorage.getItem('token') === token) clearSession('Your session expired. Please log in again.');
  }, Math.min(remaining, 2147483647));
}
function saveSession(token, user) {
  generation += 1;
  localStorage.setItem('token', token);
  localStorage.setItem('id', user._id);
  localStorage.setItem('role', user.role); // Compatibility only; never used to grant access.
  store.dispatch(authActions.authenticated({ ...user, id: user._id }));
  scheduleExpiry(token);
}
function isOurApi(config) {
  const url = new URL(config.url, window.location.origin);
  const origin = new URL(API_BASE_URL || '/', window.location.origin);
  return url.origin === origin.origin && url.pathname.startsWith('/api/');
}
axios.interceptors.request.use((config) => {
  if (!isOurApi(config)) return config;
  const token = config.sessionToken ?? localStorage.getItem('token');
  config.headers.delete('id');
  config.headers.delete('authorization');
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  config.sentSessionToken = token;
  return config;
});
axios.interceptors.response.use((response) => response, (error) => {
  const config = error.config;
  // A stale request must not sign out a newer login; form validation 401s are not session failures.
  if (config && isOurApi(config) && error.response?.status === 401 &&
      !config.url.endsWith('/sign-in') && config.sentSessionToken &&
      config.sentSessionToken === localStorage.getItem('token')) {
    clearSession('Your session expired. Please log in again.');
  }
  return Promise.reject(error);
});

export async function restoreSession() {
  const version = ++generation;
  const token = localStorage.getItem('token');
  if (!token) return clearSession();
  if (tokenExpiry(token) <= Date.now()) return clearSession('Your session expired. Please log in again.');
  store.dispatch(authActions.checking());
  try {
    const { data } = await axios.get(`${API_BASE_URL}/api/v1/user/get-user-information`, { sessionToken: token });
    if (version === generation && token === localStorage.getItem('token')) saveSession(token, data);
  } catch (error) {
    if (version !== generation) return;
    if (error.response?.status === 401) clearSession('Please log in again.');
    else store.dispatch(authActions.unavailable());
  }
}
export async function login(values) {
  const version = ++generation;
  const { data } = await axios.post(`${API_BASE_URL}/api/v1/user/sign-in`, values);
  if (version !== generation) return false;
  const { data: user } = await axios.get(`${API_BASE_URL}/api/v1/user/get-user-information`, { sessionToken: data.token });
  if (version !== generation) return false;
  saveSession(data.token, user);
  return true;
}
export async function logout() {
  const token = localStorage.getItem('token');
  if (!token) return clearSession();
  const version = generation;
  const isCurrent = () => version === generation && token === localStorage.getItem('token');
  try {
    await axios.post(`${API_BASE_URL}/api/v1/user/sign-out`, undefined, { sessionToken: token });
    if (isCurrent()) clearSession();
  } catch (error) {
    if (error.response?.status === 401) {
      if (isCurrent()) clearSession();
    } else throw error; // Retain the session and offer retry if server revocation failed.
  }
}
export function startSessionLifecycle() {
  // Preserve the existing OAuth callback handoff; no provider flow is added here.
  const callbackToken = window.location.pathname === '/profile' ? new URLSearchParams(window.location.search).get('token') : null;
  if (callbackToken) {
    const version = ++generation;
    axios.get(`${API_BASE_URL}/api/v1/user/get-user-information`, { sessionToken: callbackToken })
      .then(({ data }) => {
        if (version === generation) {
          saveSession(callbackToken, data);
          window.history.replaceState(null, '', window.location.pathname);
        }
      })
      .catch(() => { if (version === generation) clearSession('Please log in again.'); });
  } else restoreSession();
  const onStorage = (event) => { if (event.key === 'token' || event.key === null) restoreSession(); };
  const onFocus = () => {
    const token = localStorage.getItem('token');
    if (token && tokenExpiry(token) <= Date.now()) clearSession('Your session expired. Please log in again.');
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener('focus', onFocus);
  return () => {
    generation += 1;
    clearTimeout(expiryTimer);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('focus', onFocus);
  };
}
