# GitHub Actions and Vercel preparation

## Workflow

`.github/workflows/ci.yml` runs on push, pull_request and manual dispatch. Two independent Ubuntu jobs use Node 24, npm lockfiles and npm cache. GitHub token permissions are read-only; checkout does not persist credentials. No repository secrets, deployment actions, Vercel tokens, databases or mail accounts are required.

- **Frontend checks**: npm ci, 19 frontend tests, ESLint with zero warnings, production build with VERCEL=1 and a synthetic HTTPS API origin.
- **Backend checks**: npm ci, CI guard tests, JavaScript syntax checks and backend tests. Backend has no configured lint/build scripts, so syntax checking is explicitly not described as ESLint or a compiled build. No dependencies were added.

The test/build steps preload `scripts/ci/safety.cjs`, which refuses common private env read APIs, blocks non-loopback TCP sockets and requires tests to replace Nodemailer's transport. It is a test guard, not an OS-level security sandbox. npm installation steps need registry network access and do not preload it. Backend tests use fake MongoDB models and fake SMTP; the CLI refusal test only attempts loopback port 1. RATE_LIMIT_TEST_URI is empty so the optional real MongoDB test is skipped. Never use this preload in deployed API/worker processes.

## Local verification

- Workflow YAML parsed successfully and both jobs found. actionlint and a GitHub-hosted runner are not available locally; YAML parsing is not full GitHub workflow validation.
- Frontend: 19 tests passed; lint zero errors/warnings; synthetic Vercel production build passed.
- Backend: 39 tests passed, 1 optional real MongoDB test skipped; syntax checks passed.
- CI safety: 2 tests passed, including env reads and rejection of outbound TCP/SMTP before dispatch.
- No real env files, external database or actual email was used. No commits/push/deployment.

The first GitHub run must verify action downloads, Ubuntu runner behavior, fresh npm ci against the lockfiles, npm caching and publication of both check statuses. Local installed dependencies were used for the test/build commands; do not describe that as a clean GitHub install. Actions versions are based on official checkout/setup-node v6 documentation:
https://github.com/actions/checkout/tree/v6
https://github.com/actions/setup-node/tree/v6

## What is ready for Vercel

Existing `frontend/vercel.json` already specifies Vite, npm ci, npm run build, dist, SPA rewrites and Referrer-Policy. CI validates a Vercel-mode production build including the shared source import. It does not publish its build or enable automatic deployments.

For the later separate test publication:

1. Commit and push only after the owner's decision. Check both CI jobs are green in GitHub Actions. In branch protection/rulesets, select **Frontend checks** and **Backend checks** as required checks if supported by the repository plan.
2. Use a separate Vercel test project with Root Directory `frontend`, Node 24.x, framework Vite. Keep the commands/output from frontend/vercel.json.
3. Enable **Include source files outside of the Root Directory in the Build Step** because frontend imports shared/apiCodes.json. Official reference: https://vercel.com/docs/monorepos/monorepo-faq
4. Set VITE_API_URL to the actual HTTPS origin of the separate test backend, without path or trailing slash. This variable is public. Do not copy api.example.test from CI and do not upload the synthetic CI build as a working application.
5. Put URI, JWT_SECRET, RESET_MAIL_ENCRYPTION_KEY and EMAIL_* only in the backend/worker host environment, never in Vercel frontend variables or Git.
6. Prepare Express and the separate mail worker on the persistent backend host, isolated kitapstore_test Atlas and Ethereal as described in STAGING_DEPLOYMENT.md. Confirm HTTPS/CORS/recovery link origin, transaction support, worker startup and outbound SMTP.
7. Only after that perform the separately authorized test publication and browser smoke checks. GitHub CI and Vercel Git integration are separate; required merge checks alone are not a guarantee that Vercel waits before building a pushed commit. Review the project's actual deployment controls before enabling automatic publication.

**Verdict:** CI configuration and frontend build preparation are ready for review. First remote CI run and external test services/settings remain unverified, so a complete working shop is not yet ready to publish with one click.

Suggested single commit: Add automated frontend and backend validation
