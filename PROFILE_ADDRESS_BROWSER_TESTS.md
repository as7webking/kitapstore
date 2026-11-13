# Profile address browser checks

No existing browser runner was present. Added exact dev dependency @playwright/test 1.65.0 and its lockfile entries; no application dependencies were upgraded.

48 Chromium cases: four viewport widths (360/390/768/1440, height 900), four UI languages (en/de/qt/ru), three scenarios per combination:

1. Initial address, editable draft, language switching without draft loss; failed network save preserves draft and focuses field; a server validation error translates when changing language; successful save shows localized confirmation and preserves session/checkout test marker.
2. Delayed PUT shows localized pending label, disables button and makes textarea read-only. Repeated form submissions do not produce additional PUTs. A manually released fake response completes successfully.
3. Tab and Shift+Tab move between textarea and submit button, keyboard focus is visible, Enter on button triggers validation/save and focuses invalid textarea. Enter inside textarea adds a newline without submitting. Checks field bounds and horizontal overflow.

## Isolation

Uses the real application route /profile/settings and real session/Redux flow with a synthetic token and profile. All API replies are Playwright route.fulfill/abort; no route.fetch or real API exists. Unrecognized API calls and external page requests are aborted and fail the test. Service workers are disabled. Browser artifacts are ignored by Git and screenshot/video/trace recording is off. No passwords, actual tokens, MongoDB or SMTP are needed.

The dedicated Vite configuration has envDir:false and a same-origin API define. The webServer additionally preloads scripts/ci/safety.cjs; no true .env is read. It uses its own strict port 5197 and refuses to reuse an existing server. The normal Vite development/production configuration is unchanged. Tests do not claim full-cart verification: the storage assertion is only a synthetic checkout marker.

## Execution status

Completed: dependency installation (no browser install), Playwright configuration and collection of all 48 cases with --list, existing frontend tests, ESLint, production build and git diff --check.

Blocked/not executed locally: all 48 actual browser cases, viewport measurements, keyboard events, focus assertions, pending button behavior and interactive language/draft retention. The tool previously denied browser access to the local application. Playwright was NOT used as an alternate route around that restriction; no Chromium was installed or launched locally. Discovery is not a passed browser test. No application bug is claimed reproduced or fixed by these unexecuted scenarios.

The new GitHub Actions job Profile address browser checks is prepared for a later authorized push/run on GitHub. It installs Chromium and runs all 48 cases with fake APIs. This remote job has NOT been triggered or verified. Review failures before marking the browser checklist complete.

## Commands for an environment where browser testing is permitted

From frontend: npx playwright install chromium, then npm run test:browser.
From repository root: npm run test:browser:list --prefix frontend only lists tests without launching a browser/server.

Do not run a browser command to bypass an active access restriction. No deployment or commits were performed here.

Sources: https://playwright.dev/docs/test-configuration and https://playwright.dev/docs/mock

Suggested commits:
- Add isolated Playwright tests for profile address updates
- Run mocked profile address browser checks in CI
