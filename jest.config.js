const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './apps/web',
});

// Custom Jest configuration
const customJestConfig = {
  // Test environment
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/tests/setup/global.setup.js'
  ],

  // Module name mapping for absolute imports and path aliases
  moduleNameMapper: {
    // Handle CSS imports (with CSS modules)
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',

    // Handle CSS imports (without CSS modules)
    '^.+\\.(css|sass|scss)$': 'identity-obj-proxy',

    // Handle image imports
    '^.+\\.(png|jpg|jpeg|gif|webp|avif|ico|bmp|svg)$': '<rootDir>/tests/__mocks__/fileMock.js',

    // Handle module aliases
    '^@/(.*)$': '<rootDir>/apps/web/src/$1',
    '^@admin/(.*)$': '<rootDir>/apps/admin/src/$1',
    '^@master/(.*)$': '<rootDir>/apps/master/src/$1',
    '^@ui/(.*)$': '<rootDir>/packages/ui/src/$1',
    '^@core/(.*)$': '<rootDir>/packages/core/src/$1',
    '^@types/(.*)$': '<rootDir>/packages/types/src/$1',
    '^@utils/(.*)$': '<rootDir>/packages/utils/src/$1',
    '^@analytics/(.*)$': '<rootDir>/packages/analytics/src/$1',
    '^@ai/(.*)$': '<rootDir>/packages/ai/src/$1',

    // Handle API routes
    '^@/pages/api/(.*)$': '<rootDir>/apps/web/src/pages/api/$1',

    // Handle Firebase Functions
    '^@functions/(.*)$': '<rootDir>/functions/src/$1',
  },

  // Test match patterns
  testMatch: [
    '<rootDir>/apps/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/apps/**/?(*.)+(spec|test).{js,jsx,ts,tsx}',
    '<rootDir>/packages/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/packages/**/?(*.)+(spec|test).{js,jsx,ts,tsx}',
    '<rootDir>/functions/**/__tests__/**/*.{js,ts}',
    '<rootDir>/functions/**/?(*.)+(spec|test).{js,ts}',
    '<rootDir>/tests/**/?(*.)+(spec|test).{js,jsx,ts,tsx}',
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/cypress/',
    '<rootDir>/build/',
    '<rootDir>/dist/',
  ],

  // Transform files
  transform: {
    // Use babel-jest to transpile tests with the next/babel preset
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },

  // Transform ignore patterns
  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'apps/**/*.{js,jsx,ts,tsx}',
    'packages/**/*.{js,jsx,ts,tsx}',
    'functions/src/**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/build/**',
    '!**/dist/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/*.config.{js,ts}',
    '!**/jest.setup.js',
    '!**/tests/**',
    '!**/cypress/**',
    '!**/*.stories.{js,jsx,ts,tsx}',
    '!**/storybook-static/**',
    '!apps/web/src/pages/_*.{js,jsx,ts,tsx}', // Exclude Next.js special files
    '!apps/web/src/pages/api/**', // API routes tested separately
  ],

  // Coverage thresholds for Swiss QA standards (>80%)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Stricter thresholds for critical components
    'apps/web/src/components/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    'apps/admin/src/pages/': {
      branches: 82,
      functions: 82,
      lines: 82,
      statements: 82,
    },
    'apps/master/src/': {
      branches: 88,
      functions: 88,
      lines: 88,
      statements: 88,
    },
    'packages/core/src/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'functions/src/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary',
    'clover',
  ],

  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',

  // Global setup and teardown
  globalSetup: '<rootDir>/tests/setup/global-setup.js',
  globalTeardown: '<rootDir>/tests/setup/global-teardown.js',

  // Test timeout
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Run tests in parallel
  maxWorkers: '50%',

  // Error handling
  bail: false, // Don't stop on first test failure

  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/test-results',
        filename: 'report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'EATECH V3.0 Test Results',
      },
    ],
  ],

  // Watch mode configuration
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Roots
  roots: [
    '<rootDir>/apps',
    '<rootDir>/packages',
    '<rootDir>/functions',
    '<rootDir>/tests',
  ],

  // Projects configuration for monorepo
  projects: [
    // Web App (Customer PWA)
    {
      displayName: 'Web App',
      testMatch: ['<rootDir>/apps/web/**/?(*.)+(spec|test).{js,jsx,ts,tsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: [
        '<rootDir>/jest.setup.js',
        '<rootDir>/tests/setup/web.setup.js'
      ],
    },

    // Admin Dashboard
    {
      displayName: 'Admin Dashboard',
      testMatch: ['<rootDir>/apps/admin/**/?(*.)+(spec|test).{js,jsx,ts,tsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: [
        '<rootDir>/jest.setup.js',
        '<rootDir>/tests/setup/admin.setup.js'
      ],
    },

    // Master Control System
    {
      displayName: 'Master Control',
      testMatch: ['<rootDir>/apps/master/**/?(*.)+(spec|test).{js,jsx,ts,tsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: [
        '<rootDir>/jest.setup.js',
        '<rootDir>/tests/setup/master.setup.js'
      ],
    },

    // Core Package
    {
      displayName: 'Core Package',
      testMatch: ['<rootDir>/packages/core/**/?(*.)+(spec|test).{js,ts}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/node.setup.js'],
    },

    // Firebase Functions
    {
      displayName: 'Firebase Functions',
      testMatch: ['<rootDir>/functions/**/?(*.)+(spec|test).{js,ts}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/functions.setup.js'],
    },

    // AI Package
    {
      displayName: 'AI Services',
      testMatch: ['<rootDir>/packages/ai/**/?(*.)+(spec|test).{js,ts}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/ai.setup.js'],
    },

    // Analytics Package
    {
      displayName: 'Analytics',
      testMatch: ['<rootDir>/packages/analytics/**/?(*.)+(spec|test).{js,ts}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/analytics.setup.js'],
    },
  ],

  // Global variables
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
      },
    },
  },

  // Swiss-specific test configuration
  testEnvironmentOptions: {
    customExportConditions: [''],
    url: 'https://app.eatech.ch',
  },
};

// Create the final Jest config
module.exports = createJestConfig(customJestConfig);
