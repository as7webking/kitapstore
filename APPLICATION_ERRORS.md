# Application loading and error states

- Unknown React Router paths render a localized 404 with a home link. This is a client-side screen; the existing SPA hosting rewrite still returns index.html and does not set HTTP 404 status.
- A root React error boundary protects the app shell. A route boundary protects lazy pages; navigating to a different pathname/query starts a new boundary. Language changes update the fallback without resetting the boundary.
- Recognized dynamic-import/CSS preload failures display a specific message. Other render exceptions display a generic application error. Raw errors and request details are not rendered or logged by these components. Browser/React development tooling may still report errors independently.
- Reload is explicit and never automatic, avoiding reload loops. Reload requests a fresh document and retries failed lazy modules. No storage is cleared, but unsaved form values held only in memory can be lost on reload.
- Shared GET resource handling distinguishes loading, failure, genuine empty results and API 404. Retry only repeats a GET, never checkout/account mutations. Unmounted/obsolete requests are cancelled or ignored.
- Applied to catalog, recent/popular books, favourites, order lists, blog and book detail. Search has distinct loading/error/empty results and rejects stale responses. Cart GET errors no longer masquerade as an empty cart. Profile address loading has a retry and save failures retain the entered address.
- Session interceptors and checkout business logic are unchanged. Temporary network errors do not clear authentication or checkout attempt storage. Actual 401 responses and expired tokens retain their existing behavior.

## Checks

18 frontend tests passed, including new tests for successful empty GET, failure, retry, API 404, cancellation and late results; localized error fallback rendering for en/de/qt/ru; render-vs-chunk error classification and explicit reload action. Existing session test additionally covers an offline cart GET and preservation of authentication and checkout idempotency key.

Production build passed. ESLint has no errors; four existing hook warnings remain in legacy admin components, Admin page and UpdateBook. Dictionary key/parameter consistency checks passed. No dependency updates.

Browser access to the local application was previously blocked by tool security policy and was not retried. Actual client React exception capture, blocked chunk downloads after a deployment, browser offline/online recovery, clicking retry and host-level direct SPA URLs still require browser smoke tests. Tests render fallback markup and exercise boundary state logic; they do not claim a real browser crash was reproduced.

New qt text should be reviewed by a Crimean Tatar native speaker.

No private .env files were read or changed. No real database/mail, commits, push or deployment.

Suggested commit: Handle missing pages and recoverable application loading errors
