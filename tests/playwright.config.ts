import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://demo-restaurant.eatech.ch',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',

    /* Maximum time each action can take */
    actionTimeout: 15000,

    /* Locale and timezone for Swiss market */
    locale: 'de-CH',
    timezoneId: 'Europe/Zurich',

    /* Emulate real user behavior */
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 EATECH-E2E-Test',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 EATECH-E2E-Test'
      },
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 13'],
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1 EATECH-E2E-Test'
      },
    },

    /* Test against branded browsers. */
    {
      name: 'Microsoft Edge',
      use: { 
        ...devices['Desktop Edge'], 
        channel: 'msedge' 
      },
    },
    {
      name: 'Google Chrome',
      use: { 
        ...devices['Desktop Chrome'], 
        channel: 'chrome' 
      },
    },

    /* Test specific scenarios */
    {
      name: 'authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/auth/user.json',
      },
      testMatch: /.*\.authenticated\.spec\.ts/,
    },
    {
      name: 'admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/auth/admin.json',
      },
      testMatch: /.*admin.*\.spec\.ts/,
    },
    {
      name: 'swiss-german',
      use: {
        ...devices['Desktop Chrome'],
        locale: 'gsw-CH', // Swiss German
      },
      testMatch: /.*voice.*\.spec\.ts/,
    },
    {
      name: 'french',
      use: {
        ...devices['Desktop Chrome'],
        locale: 'fr-CH',
      },
    },
    {
      name: 'italian',
      use: {
        ...devices['Desktop Chrome'],
        locale: 'it-CH',
      },
    },

    /* Accessibility testing */
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        // Enable accessibility testing
        contextOptions: {
          reducedMotion: 'reduce',
          forcedColors: 'active',
        },
      },
      testMatch: /.*accessibility.*\.spec\.ts/,
    },

    /* Performance testing setup */
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--enable-precise-memory-info',
            '--disable-dev-shm-usage',
            '--no-sandbox',
          ],
        },
      },
      testMatch: /.*performance.*\.spec\.ts/,
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* Global timeout */
  timeout: 60 * 1000,

  /* Global setup */
  globalSetup: './tests/global-setup.ts',

  /* Global teardown */
  globalTeardown: './tests/global-teardown.ts',

  /* Output folder for test artifacts */
  outputDir: 'test-results/',

  /* Maximum time the whole test suite can run */
  globalTimeout: process.env.CI ? 60 * 60 * 1000 : undefined, // 1 hour on CI
});

// Custom test fixtures
export { test as base } from '@playwright/test';

export const test = base.extend({
  // Add Swiss phone number generator
  swissPhoneNumber: async ({}, use) => {
    const number = `+41 79 ${Math.floor(Math.random() * 900 + 100)} ${Math.floor(Math.random() * 90 + 10)} ${Math.floor(Math.random() * 90 + 10)}`;
    await use(number);
  },

  // Add test tenant context
  tenantContext: async ({ context }, use) => {
    await context.addCookies([{
      name: 'test-tenant',
      value: 'demo-restaurant',
      domain: '.eatech.ch',
      path: '/'
    }]);
    await use(context);
  },

  // Add authenticated page
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: 'tests/auth/user.json'
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // Add admin page
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: 'tests/auth/admin.json'
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // Mock voice input
  mockVoiceInput: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.mockVoiceInput = (text) => {
        window.dispatchEvent(new CustomEvent('mock-voice-input', { 
          detail: { transcript: text }
        }));
      };
    });
    await use(page);
  },

  // Performance metrics collector
  performanceMetrics: async ({ page }, use) => {
    const metrics = [];
    
    page.on('load', async () => {
      const perf = await page.evaluate(() => ({
        timing: performance.timing,
        memory: (performance as any).memory,
        resources: performance.getEntriesByType('resource').length
      }));
      metrics.push(perf);
    });

    await use(metrics);
  },

  // Network interceptor for API mocking
  apiMocker: async ({ page }, use) => {
    const mocks = new Map();

    await page.route('**/api/**', async (route, request) => {
      const url = request.url();
      const mockResponse = mocks.get(url);
      
      if (mockResponse) {
        await route.fulfill({
          status: mockResponse.status || 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponse.body)
        });
      } else {
        await route.continue();
      }
    });

    const mockApi = {
      mock: (url, response) => mocks.set(url, response),
      clear: () => mocks.clear()
    };

    await use(mockApi);
  },
});

// Environment-specific configurations
if (process.env.TEST_ENV === 'staging') {
  module.exports.use.baseURL = 'https://staging.eatech.ch';
} else if (process.env.TEST_ENV === 'production') {
  module.exports.use.baseURL = 'https://eatech.ch';
}

// Mobile-specific viewport sizes for Swiss market
export const swissDevices = {
  'Swiss Mobile': {
    viewport: { width: 375, height: 812 }, // iPhone X/XS/11 Pro
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
  },
  'Swiss Tablet': {
    viewport: { width: 768, height: 1024 }, // iPad
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
  },
  'Swiss Desktop': {
    viewport: { width: 1920, height: 1080 }, // Full HD
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
};
