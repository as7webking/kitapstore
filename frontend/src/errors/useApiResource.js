import { useEffect, useState, useCallback } from 'react';
import { readResource } from './readResource.js';
const pending = { data: null, loading: true, error: null };

// Only use for idempotent GET requests. Retry never repeats a mutation.
export function useApiResource(url, nested = true) {
  const [state, setState] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => readResource(url, nested, (result) => setState({ url, nested, attempt, ...result })), [url, nested, attempt]);
  // A different request must show loading immediately, without rendering old results.
  const current = state?.url === url && state.nested === nested && state.attempt === attempt ? state : pending;
  return { ...current, retry };
}
