# Access control review

## Scope and findings

No AGENTS.md was found in the repository. The worktree was clean before this review.
Reviewed active Express mounts in backend/app.js and React RequireAuth/routes.
No private env files, real MongoDB connections, actual mail or deployment were used.

Existing safeguards retained:

- JWT verification validates session version against the current user; server role comes from MongoDB, not the request body or stale token role.
- A different client-supplied id header is rejected with 403. Legacy handlers receive the verified session id in that header.
- Registration explicitly creates role=user and whitelists fields.
- Cart operations scope reads/writes to session identity; checkout revalidates the user/cart inside the existing transaction implementation.
- Order history filters by session user. Global orders and status changes require current administrator role.
- React guards distinguish guest/checking/error/authenticated states; ordinary users cannot render guarded admin pages. Frontend guards are not a replacement for server checks.

Fixed two response confidentiality issues:

1. Public catalog list/search/detail responses and populated favourites could include pdf, exposing digital book content without a delivery entitlement check. All existing public catalog addresses now exclude pdf; favourite population does the same. URLs and metadata response shapes are retained. Implementing authorized digital delivery is a separate feature; no new download route was added.
2. Protected API responses now send Cache-Control: no-store, including authentication/authorization rejections. The middleware unit response stub was adjusted for this header.

## Automated checks

Backend access tests cover guests on account/cart/favourites/order/admin endpoints, mismatched id headers, user/role injection in bodies and query parameters, current-role demotion, own profile/cart/history/favourite/deletion scope, administrator mutation access, and public PDF projections. Both flat and namespaced book/cart/favourites/order mounts are exercised. Existing account tests also verify role injection during registration, expired/revoked sessions and login validation; checkout tests cover its ownership/transaction behavior with fake models.

Frontend test renders the actual RequireAuth component with Redux/router under en/de/qt/ru: guest/checking/error states hide protected content, a normal user cannot render admin content, and forged localStorage role does not bypass it. This is server-rendered component testing, not a real browser navigation test.

Results: 50 backend tests passed, 1 optional real MongoDB integration test skipped. In addition, the CLI test that intentionally attempts a MongoDB connection was excluded with --test-skip-pattern, per the no-database requirement. Frontend: 20 passed. Frontend lint: zero errors/warnings. Production Vercel-mode build with a synthetic HTTPS API URL passed. git diff --check passed. Existing browser-data freshness notices remain.

No successful live database/hosting/browser verification is claimed. PDF tests verify the applied query projections with fake models; repeat a smoke check in the isolated staging environment before real users. Unmounted legacy controller files were not treated as reachable API routes. Existing profile address forms reference a PUT endpoint that is not mounted in the active user router; implementing profile editing was outside this access-control change.

## Files and suggested commit

- backend/utils/jwt.js
- backend/routes/book.js
- backend/routes/favourite.js
- backend/tests/foundation.test.js
- backend/tests/accessControl.test.js
- frontend/tests/accessControl.test.cjs
- ACCESS_CONTROL_REVIEW.md

Suggested single commit: Protect private API responses and verify account access boundaries

No commit or push was performed.
