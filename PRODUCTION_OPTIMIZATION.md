# Production build optimization

## Measured sizes

Vite production build, decimal kB. Same installed dependencies before and after.

| Resource | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Logo PNG | 1,073.66 kB | 43.22 kB | 96.0% |
| Hero | 2,028.83 kB PNG | 486.16 kB JPEG | 76.0% |
| Main JS | 510.84 kB | 456.17 kB | 10.7% |
| Main JS gzip | 160.95 kB | 148.52 kB | 7.7% |

The logo is resized from 1024×1024 to 256×256 using macOS sips. It remains PNG and is displayed at 40 CSS pixels high. Hero remains 1536×1024, encoded with sips JPEG quality 90. Original assets remain available in Git history. No layout classes or crop rules changed. Compression is lossy for hero; both outputs were visually inspected.

Route components now use React.lazy and a translated Suspense loading state. Navbar, footer, session lifecycle and Redux remain outside that boundary. Components are declared at module scope so switching language does not create new component identities. Public URLs, authentication guards and nested profile routes are unchanged. Home sections are delivered with the Home route; admin and account pages are not part of the initial main bundle. Shared dependencies may still be loaded by several routes. The combined JS size is not reduced by the same percentage as initial JS: splitting primarily defers delivery. There is no longer a >500 kB chunk warning.

All four language dictionaries remain eagerly available. Deferring those small files would introduce asynchronous language switching and unnecessary risk to active forms.

## Verification

- `npm run build --prefix frontend`: passed.
- `npm test --prefix frontend`: all 16 tests passed, including localization, form rendering/validation, session lifecycle and checkout state checks.
- `npm run lint --prefix frontend`: no errors, 8 existing hook dependency warnings.
- `git diff --check`: passed.
- Output logo and hero inspected visually; dimensions checked with sips.
- Browser access was rejected by the browser tool's URL security policy. Mobile rendering, interactive form retention and actual chunk requests have **not** been verified in a browser.
- Existing outdated Browserslist and baseline-data notices remain; no dependencies were updated.
- No backend changes, real mail, database connections, deployment or push.

## Manual mobile verification still needed

Run the frontend, then use a 390×844 viewport and a wider desktop viewport. Inspect the home hero and logo, expand the mobile menu, and switch between en/de/qt/ru. On signup and password recovery, enter data then switch language: values and translated errors should remain. Navigate directly to nested profile URLs and book detail URLs. With a test session and test cart, verify navigation preserves both. In Network, confirm Cart/Profile/admin chunks load only on relevant navigation. Repeat against `npm run preview --prefix frontend` after building.
