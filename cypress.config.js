const { defineConfig } = require('cypress');

module.exports = defineConfig({
  // Project information
  projectId: 'eatech-v3-testing',

  // E2E Testing configuration
  e2e: {
    // Base URL for the application
    baseUrl: 'http://localhost:3000',

    // Spec patterns
    specPattern: [
      'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
      'apps/*/tests/e2e/**/*.cy.{js,jsx,ts,tsx}'
    ],

    // Support file
    supportFile: 'cypress/support/e2e.js',

    // Fixtures folder
    fixturesFolder: 'cypress/fixtures',

    // Screenshots folder
    screenshotsFolder: 'cypress/screenshots',

    // Videos folder
    videosFolder: 'cypress/videos',

    // Downloads folder
    downloadsFolder: 'cypress/downloads',

    // Setup node events
    setupNodeEvents(on, config) {
      // Task definitions
      on('task', {
        // Database seeding for tests
        seedDatabase: async (data) => {
          const { seedTestData } = require('./cypress/support/database');
          await seedTestData(data);
          return null;
        },

        // Clear test data
        clearDatabase: async () => {
          const { clearTestData } = require('./cypress/support/database');
          await clearTestData();
          return null;
        },

        // Firebase Auth setup
        setupTestUser: async (userConfig) => {
          const { createTestUser } = require('./cypress/support/auth');
          const user = await createTestUser(userConfig);
          return user;
        },

        // Swiss payment simulation
        simulateSwissPayment: async (paymentData) => {
          const { simulatePayment } = require('./cypress/support/payments');
          const result = await simulatePayment(paymentData);
          return result;
        },

        // Voice command simulation
        simulateVoiceCommand: async (command) => {
          const { processVoiceCommand } = require('./cypress/support/voice');
          const result = await processVoiceCommand(command);
          return result;
        },

        // Generate test QR codes
        generateQRCode: (data) => {
          const QRCode = require('qrcode');
          return QRCode.toDataURL(data);
        },

        // Log message for debugging
        log: (message) => {
          console.log('CYPRESS TASK:', message);
          return null;
        },

        // Get system time for timezone testing
        getSystemTime: () => {
          return new Date().toISOString();
        },

        // Swiss locale testing
        formatSwissCurrency: (amount) => {
          return new Intl.NumberFormat('de-CH', {
            style: 'currency',
            currency: 'CHF'
          }).format(amount);
        },
      });

      // Plugin configurations
      require('@cypress/code-coverage/task')(on, config);
      require('cypress-terminal-report/src/installLogsPrinter')(on);

      // Environment-specific configuration
      if (config.env.environment === 'staging') {
        config.baseUrl = 'https://staging.eatech.ch';
      } else if (config.env.environment === 'production') {
        config.baseUrl = 'https://app.eatech.ch';
      }

      return config;
    },

    // Experimental features
    experimentalStudio: true,
    experimentalWebKitSupport: true,

    // Test isolation
    testIsolation: true,

    // Browser launch options
    chromeWebSecurity: false,

    // Video recording
    video: true,
    videoCompression: 32,

    // Screenshots
    screenshotOnRunFailure: true,

    // Timeouts
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    pageLoadTimeout: 30000,

    // Viewport
    viewportWidth: 1280,
    viewportHeight: 720,

    // Retry configuration
    retries: {
      runMode: 2,
      openMode: 0,
    },

    // Wait for animations
    waitForAnimations: true,
    animationDistanceThreshold: 20,

    // Block hosts (for performance)
    blockHosts: [
      '*.google-analytics.com',
      '*.googletagmanager.com',
      '*.facebook.com',
      '*.twitter.com',
      '*.linkedin.com',
    ],

    // Include shadow DOM
    includeShadowDom: true,

    // Slow config thresholds
    slowTestThreshold: 10000,
  },

  // Component testing configuration
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },

    specPattern: [
      'apps/*/src/**/*.cy.{js,jsx,ts,tsx}',
      'packages/*/src/**/*.cy.{js,jsx,ts,tsx}'
    ],

    supportFile: 'cypress/support/component.js',

    viewportWidth: 1000,
    viewportHeight: 660,

    video: false,
    screenshotOnRunFailure: true,
  },

  // Environment variables
  env: {
    // Test environment
    environment: 'development',

    // API URLs
    apiUrl: 'http://localhost:3001/api',
    wsUrl: 'ws://localhost:3001',

    // Firebase configuration for testing
    firebase: {
      apiKey: 'demo-api-key',
      authDomain: 'demo-project.firebaseapp.com',
      projectId: 'demo-project',
      storageBucket: 'demo-project.appspot.com',
      messagingSenderId: '123456789',
      appId: 'demo-app-id',
    },

    // Test user credentials
    testUsers: {
      customer: {
        email: 'customer@test.eatech.ch',
        password: 'TestPassword123!',
      },
      admin: {
        email: 'admin@test.eatech.ch',
        password: 'AdminPassword123!',
      },
      master: {
        email: 'master@test.eatech.ch',
        password: 'MasterPassword123!',
      },
    },

    // Swiss-specific test data
    swissTestData: {
      cantons: ['ZH', 'BE', 'LU', 'UR', 'SZ', 'OW', 'NW', 'GL', 'ZG', 'FR', 'SO', 'BS', 'BL', 'SH', 'AR', 'AI', 'SG', 'GR', 'AG', 'TG', 'TI', 'VD', 'VS', 'NE', 'GE', 'JU'],
      phoneNumbers: ['+41791234567', '+41781234567', '+41761234567'],
      postcodes: ['8001', '3001', '4001', '9001', '1200'],
      iban: 'CH93 0076 2011 6238 5295 7',
      currencies: ['CHF'],
      languages: ['de', 'fr', 'it', 'en'],
    },

    // Payment test data
    paymentTestData: {
      stripe: {
        publicKey: 'pk_test_123456789',
        cardNumber: '4242424242424242',
        expiry: '12/27',
        cvc: '123',
      },
      twint: {
        phoneNumber: '+41791234567',
      },
    },

    // Feature flags for testing
    featureFlags: {
      voiceCommerce: true,
      aiPricing: true,
      blockchain: false,
      emergencyMode: true,
    },

    // Coverage configuration
    codeCoverage: {
      url: 'http://localhost:3001/__coverage__',
    },
  },

  // Global configuration
  watchForFileChanges: true,

  // Node version compatibility
  nodeVersion: 'system',

  // Reporter configuration
  reporter: 'cypress-multi-reporters',
  reporterOptions: {
    configFile: 'cypress-reporter-config.json',
  },

  // Browser configuration
  browsers: [
    {
      name: 'chrome',
      family: 'chromium',
      channel: 'stable',
      displayName: 'Chrome',
      version: '120.0.0.0',
      path: '',
      majorVersion: 120,
    },
    {
      name: 'firefox',
      family: 'firefox',
      channel: 'stable',
      displayName: 'Firefox',
      version: '118.0.0.0',
      path: '',
      majorVersion: 118,
    },
    {
      name: 'safari',
      family: 'webkit',
      channel: 'stable',
      displayName: 'Safari',
      version: '17.0.0.0',
      path: '',
      majorVersion: 17,
    },
  ],

  // User agent override for mobile testing
  userAgent: {
    mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    tablet: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  },

  // Swiss compliance testing configuration
  accessibility: {
    rules: {
      'color-contrast': { enabled: true },
      'keyboard-navigation': { enabled: true },
      'screen-reader': { enabled: true },
      'swiss-accessibility-standard': { enabled: true },
    },
  },

  // Performance testing thresholds
  performance: {
    thresholds: {
      firstContentfulPaint: 1500,
      largestContentfulPaint: 2500,
      cumulativeLayoutShift: 0.1,
      firstInputDelay: 100,
    },
  },

  // Multi-language testing
  localization: {
    defaultLanguage: 'de',
    supportedLanguages: ['de', 'fr', 'it', 'en'],
    swissGerman: true,
  },

  // Voice commerce testing
  voiceCommerce: {
    enabled: true,
    wakeWord: 'Hey EATECH',
    supportedLanguages: ['de', 'fr', 'it', 'en', 'gsw'], // gsw = Swiss German
    testCommands: [
      'Bestelle einen Burger',
      'Was ist das Tagesmenü?',
      'Wie lange dauert meine Bestellung?',
      'Storniere meine Bestellung',
    ],
  },

  // Emergency mode testing
  emergencyMode: {
    triggers: [
      'high-order-volume',
      'system-overload',
      'payment-issues',
      'staff-shortage',
    ],
    testScenarios: [
      'peak-hour-simulation',
      'system-failure-recovery',
      'payment-gateway-down',
    ],
  },

  // Swiss payment methods testing
  paymentMethods: {
    stripe: {
      enabled: true,
      testCards: {
        visa: '4242424242424242',
        mastercard: '5555555555554444',
        amex: '378282246310005',
        declined: '4000000000000002',
        insufficient: '4000000000009995',
      },
    },
    twint: {
      enabled: true,
      testPhones: ['+41791234567', '+41781234567'],
    },
    postfinance: {
      enabled: true,
      testCards: ['9496810000000001'],
    },
  },

  // FADP/DSGVO compliance testing
  dataProtection: {
    testScenarios: [
      'data-export',
      'data-deletion',
      'consent-management',
      'anonymization',
    ],
    swissCompliance: true,
    gdprCompliance: true,
  },
});
