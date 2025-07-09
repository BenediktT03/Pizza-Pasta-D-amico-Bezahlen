import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  // Use TypeScript preset
  preset: 'ts-jest',
  
  // Test environment
  testEnvironment: 'node',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
  
  // Module paths
  roots: ['<rootDir>/tests'],
  modulePaths: ['<rootDir>'],
  
  // Test patterns
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  
  // Transform files
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },
  
  // Module name mapper for aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@stores/(.*)$': '<rootDir>/src/stores/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg|webp)$': '<rootDir>/tests/__mocks__/fileMock.js'
  },
  
  // Coverage configuration
  collectCoverage: process.env.COVERAGE === 'true',
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'apps/*/src/**/*.{ts,tsx}',
    'packages/*/src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/*.test.{ts,tsx}',
    '!**/*.spec.{ts,tsx}',
    '!**/index.{ts,tsx}',
    '!**/*.stories.{ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80
    }
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/.next/',
    '/coverage/',
    '/test-results/'
  ],
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Global variables
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },
  
  // Verbose output
  verbose: true,
  
  // Max workers
  maxWorkers: process.env.CI ? 2 : '50%',
  
  // Projects for different test types
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      testEnvironment: 'node'
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: [
        '<rootDir>/tests/jest.setup.ts',
        '<rootDir>/tests/integration/setup.ts'
      ]
    },
    {
      displayName: 'Component Tests',
      testMatch: ['<rootDir>/tests/components/**/*.test.tsx'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: [
        '<rootDir>/tests/jest.setup.ts',
        '<rootDir>/tests/components/setup.tsx'
      ]
    }
  ],
  
  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }],
    ['jest-html-reporter', {
      pageTitle: 'EATECH Test Report',
      outputPath: 'test-results/test-report.html',
      includeFailureMsg: true,
      includeConsoleLog: true,
      theme: 'defaultTheme',
      dateFormat: 'yyyy-mm-dd HH:MM:ss'
    }]
  ],
  
  // Snapshot configuration
  snapshotSerializers: ['@emotion/jest/serializer'],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks between tests
  restoreMocks: true,
  
  // Error on deprecated APIs
  errorOnDeprecated: true,
  
  // Notify on first run
  notify: false,
  
  // Bail on first test failure in CI
  bail: process.env.CI ? 1 : 0
};

// Environment-specific configurations
if (process.env.TEST_ENV === 'integration') {
  config.testMatch = ['**/*.integration.test.ts'];
  config.testTimeout = 60000;
}

if (process.env.TEST_ENV === 'unit') {
  config.testMatch = ['**/*.unit.test.ts'];
  config.testTimeout = 10000;
}

if (process.env.CI) {
  config.maxWorkers = 2;
  config.bail = 1;
  config.verbose = false;
  config.collectCoverage = true;
}

export default config;

// Custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidEmail(): R;
      toBeValidSwissPhone(): R;
      toBeWithinRange(floor: number, ceiling: number): R;
      toHaveBeenCalledBefore(other: jest.Mock): R;
      toHaveBeenCalledAfter(other: jest.Mock): R;
    }
  }
}

// Export test utilities
export const testUtils = {
  // Generate test data
  generateTestUser: () => ({
    id: `user-${Date.now()}`,
    email: `test${Date.now()}@eatech.ch`,
    name: 'Test User',
    phone: `+4179${Math.floor(Math.random() * 10000000)}`,
    tenantId: 'test-tenant'
  }),
  
  generateTestOrder: () => ({
    id: `order-${Date.now()}`,
    orderNumber: `ORD-${Date.now()}`,
    items: [
      {
        productId: 'pizza-1',
        quantity: 2,
        price: 18.90
      }
    ],
    total: 37.80,
    status: 'pending',
    createdAt: new Date()
  }),
  
  generateTestProduct: () => ({
    id: `product-${Date.now()}`,
    name: 'Test Product',
    price: Math.floor(Math.random() * 50) + 10,
    category: 'test',
    available: true
  }),
  
  // Wait utilities
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock timers
  useFakeTimers: () => {
    jest.useFakeTimers();
    return {
      advance: (ms: number) => jest.advanceTimersByTime(ms),
      runAll: () => jest.runAllTimers(),
      restore: () => jest.useRealTimers()
    };
  },
  
  // Firebase test utils
  mockFirebase: () => ({
    auth: {
      currentUser: { uid: 'test-user-id' },
      signInWithEmailAndPassword: jest.fn(),
      signOut: jest.fn()
    },
    firestore: {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(),
          set: jest.fn(),
          update: jest.fn(),
          delete: jest.fn()
        })),
        where: jest.fn(() => ({
          get: jest.fn()
        }))
      }))
    }
  })
};
