import axios from 'axios';

export function readResource(url, nested, receive, request = axios.get) {
  let active = true;
  const controller = new AbortController();
  // Defer to the request promise: StrictMode/unmount can cancel before dispatch.
  Promise.resolve().then(() => active ? request(url, { signal: controller.signal }) : null)
    .then((response) => {
      if (active) receive({ data: nested ? response.data.data : response.data, loading: false, error: null });
    }).catch((error) => {
      if (active) receive({ data: null, loading: false, error: error.response?.status === 404 ? 'not_found' : 'network' });
    });
  return () => { active = false; controller.abort(); };
}
