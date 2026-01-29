import playwrightPackage from 'playwright/package.json' with { type: 'json' };
import { devices, type PlaywrightTestConfig } from 'playwright/test';

const isCI = !!process.env['CI'];
/**
 * See https://playwright.dev/docs/test-configuration.
 */
const config: PlaywrightTestConfig = {
  testDir: './tests',
  // FIXME: remove '-linux'
  snapshotPathTemplate:
    '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}-linux{ext}',
  /* Maximum time one test can run for. */
  timeout: 20 * 1000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 10000,
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: isCI,
  /* Retry on CI only */
  retries: isCI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: isCI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html', { open: 'never' }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1920, height: 1001 },

    permissions: ['clipboard-read', 'clipboard-write'],

    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 0,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',

    connectOptions: {
      wsEndpoint: 'ws://127.0.0.1:3000/',
      exposeNetwork: '<loopback>',
    },
  },
  projects: [
    {
      name: 'Demo',
      testMatch: 'Demo.spec.ts',
      use: { baseURL: 'http://127.0.0.1:9090' },
    },
    {
      name: 'WebpackExample',
      testMatch: 'webpack.spec.ts',
      use: { baseURL: 'http://serve-webpack-example:9090' },
    },
    {
      name: 'ExpressExample',
      testMatch: 'express.spec.ts',
      use: { baseURL: 'http://serve-express-example:9090' },
    },
  ],
  outputDir: 'test-results/',
  webServer: [
    {
      name: 'playwright-server',
      env: { PLAYWRIGHT_VERSION: playwrightPackage.version },
      command:
        'docker compose up --abort-on-container-exit --build playwright-server',
      url: 'http://127.0.0.1:3000/',
      stdout: 'pipe',
      timeout: 120 * 1000,
      gracefulShutdown: {
        signal: 'SIGINT',
        timeout: 120 * 1000,
      },
    },
    {
      name: 'npm run serve',
      command: 'npm run serve',
      url: 'http://localhost:9090/',
    },
  ],
};

export default config;
