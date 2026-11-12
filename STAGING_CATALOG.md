# Synthetic staging catalog

The script was prepared but NOT executed against MongoDB. Tests import its functions with fake database operations. No users/accounts/passwords are created. The normal backend/worker startup does not run this seed.

## Data

Six clearly named `Kitapstore Seed V1 ...` physical books: en/de/qt/ru, a long German title, zero/positive prices and zero/positive shipping. Authors and descriptions are synthetic. Covers are embedded SVG data URLs generated locally, without external downloads. These fixtures do not exercise digital PDF delivery or stock management.

## Guards

All three settings are mandatory:

- APP_ENV must be exactly staging.
- MONGODB_DB_NAME must be exactly kitapstore_test.
- URI must use mongodb:// or mongodb+srv:// and its path must be exactly /kitapstore_test.

The runner also checks the connected database name before any seed writes. This validates database selection, not the isolation of cluster/user permissions; use a dedicated test user with readWrite only on this database. No actual connection was tested.

## Running later, manually

1. Review the script and choose only the separate test database. Complete the Atlas network access and test user setup described in STAGING_DEPLOYMENT.md.
2. Supply URI, APP_ENV and MONGODB_DB_NAME through a trusted process environment, such as a shell session on the test backend host. Do not type credentials into command arguments/history or post them in chat.
3. From the repository root, run `npm run seed:catalog --prefix backend` only when explicitly ready to write synthetic test records. Do not add this command to Render Build/Start, worker startup, CI or Vercel deployment.
4. Expected output contains counts only: `Test catalog seed completed: N inserted, M skipped.` Errors contain no driver details, URI or document payload.
5. Open the test frontend catalog and verify the six fixtures. Repeating the command normally reports zero inserted and six skipped.

The script deliberately does NOT load .env, even when backend/.env exists. A shell does not automatically import .env; configure the process environment yourself. The script only needs these three database settings, not JWT or mail settings. Do not use the CI safety preload on the real seed invocation: that preload forbids external services by design.

## Preservation and failure behavior

Fixtures use deterministic slugs and `$setOnInsert` upserts. Existing documents with matching slugs are left unchanged, including title edits, price, deletion flag and timestamps. Other books are untouched. A unique slug index is required and created if absent; index errors abort instead of deleting or repairing existing records. Verify any index conflict manually in the test database.

The script is not transactional: if the connection fails midway, some test books may already be inserted. A retry skips those and inserts the rest. Parallel runs rely on the MongoDB unique slug index; duplicate-slug races skip an existing document. Records whose slug was manually changed are no longer recognized as the original fixture; do not change fixture slugs if you want later runs to skip them. No automatic cleanup/removal is provided.

## Verification

Five tests with fake writes/connect/disconnect cover configuration refusal before connect, real Mongoose fixture validation without connecting, repeated/concurrent runs, existing edits/deletion flags, unique-index/write failures, partial-run recovery and connected-database mismatch. No live seed, database connection or account creation was performed.

Suggested commit: Add a guarded seed script for the staging catalog
