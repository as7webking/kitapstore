import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './browser-tests',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
  timeout: 30000,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    baseURL: 'http://127.0.0.1:5197',
    serviceWorkers: 'block',
    trace: 'off', screenshot: 'off', video: 'off',
  },
  projects: [360, 390, 768, 1440].map((width) => ({
    name: `chromium-${width}`, use: { viewport: { width, height: 900 } },
  })),
  webServer: {
    command: 'node --require ../scripts/ci/safety.cjs node_modules/vite/bin/vite.js --config vite.browser.config.js --host 127.0.0.1 --port 5197 --strictPort',
    url: 'http://127.0.0.1:5197',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
