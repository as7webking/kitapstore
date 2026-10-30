// Origin only, without /api/v1. Empty value uses same-origin requests.
export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:1001").replace(/\/+$/, "");
