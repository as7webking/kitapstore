export const defaults = { q: '', language: '', type: '', minPrice: '', maxPrice: '', sort: 'newest', page: '1', pageSize: '12' };
export function catalogValues(search) {
  const params = new URLSearchParams(search);
  return Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, params.get(key) ?? value]));
}
export function catalogSearch(values) {
  const params = new URLSearchParams();
  for (const [key, fallback] of Object.entries(defaults)) if (values[key] !== '' && values[key] !== fallback) params.set(key, values[key]);
  return params;
}
export function changeCatalogPage(search, page) {
  return catalogSearch({ ...catalogValues(search), page: String(page) });
}
