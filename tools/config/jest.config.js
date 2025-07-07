// /tools/config/jest.config.js
// EATECH V3.0 - Jest Testing Configuration
// Comprehensive test configuration for all packages and apps

const path = require('path');

// Get project root
const projectRoot = path.resolve(__dirname, '../..');

/**
 * Base Jest configuration
 */
const baseConfig = {
    // Test environment
    testEnvironment: 'jsdom',

    // Root directory
    rootDir: projectRoot,

    // Module paths
    roots: [
        '<rootDir>/apps',
        '<rootDir>/packages',
        '<rootDir>/functions'
    ],

    // Test match patterns
    testMatch: [
        '<rootDir>/**/__tests__/**/*.{js,jsx,ts,tsx}',
        '<rootDir>/**/*.(test|spec).{js,jsx,ts,tsx}'
    ],

    // Files to ignore
    testPathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/.next/',
        '<rootDir>/dist/',
        '<rootDir>/build/',
        '<rootDir>/coverage/',
        '<rootDir>/.turbo/'
    ],

    // Module file extensions
    moduleFileExtensions: [
        'ts',
        'tsx',
        'js',
        'jsx',
        'json',
        'node'
    ],

    // Module name mapping (aliases)
    moduleNameMapper: {
        // CSS Modules
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',

        // Static assets
        '\\.(jpg|jpeg|png|gif|webp|avif|svg)$': '<rootDir>/tools/config/__mocks__/fileMock.js',
        '\\.(mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/tools/config/__mocks__/fileMock.js',

        // Application aliases
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@components/(.*)$': '<rootDir>/src/components/$1',
        '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@services/(.*)$': '<rootDir>/src/services/$1',
        '^@types/(.*)$': '<rootDir>/src/types/$1',
        '^@styles/(.*)$': '<rootDir>/src/styles/$1',

        // Package aliases
        '^@eatech/core(.*)$': '<rootDir>/packages/core/src$1',
        '^@eatech/ui(.*)$': '<rootDir>/packages/ui/src$1',
        '^@eatech/types(.*)$': '<rootDir>/packages/types/src$1',
        '^@eatech/utils(.*)$': '<rootDir>/packages/utils/src$1',
        '^@eatech/analytics(.*)$': '<rootDir>/packages/analytics/src$1',
        '^@eatech/ai(.*)$': '<rootDir>/packages/ai/src$1'
    },

    // Transform configuration
    transform: {
        // TypeScript and JavaScript files
        '^.+\\.(ts|tsx|js|jsx)$': [
            'babel-jest',
            {
                presets: [
                    [
                        '@babel/preset-env',
                        {
                            targets: { node: 'current' },
                            modules: 'commonjs'
                        }
                    ],
                    [
                        '@babel/preset-react',
                        {
                            runtime: 'automatic'
                        }
                    ],
                    '@babel/preset-typescript'
                ],
                plugins: [
                    '@babel/plugin-proposal-class-properties',
                    '@babel/plugin-proposal-object-rest-spread',
                    '@babel/plugin-transform-runtime'
                ]
            }
        ],

        // SVG files as React components
        '^.+\\.svg$': '<rootDir>/tools/config/__mocks__/svgTransform.js'
    },

    // Files to ignore in transform
    transformIgnorePatterns: [
        'node_modules/(?!((@eatech|@testing-library|@firebase|firebase)/.*|.*\\.mjs$))'
    ],

    // Setup files
    setupFilesAfterEnv: [
        '<rootDir>/tools/config/jest.setup.js'
    ],

    // Module directories
    moduleDirectories: [
        'node_modules',
        '<rootDir>/node_modules',
        '<rootDir>/packages'
    ],

    // Coverage configuration
    collectCoverage: false,
    collectCoverageFrom: [
        'apps/**/*.{ts,tsx,js,jsx}',
        'packages/**/*.{ts,tsx,js,jsx}',
        'functions/**/*.{ts,tsx,js,jsx}',
        '!**/*.d.ts',
        '!**/*.config.{js,ts}',
        '!**/*.stories.{js,ts,tsx}',
        '!**/node_modules/**',
        '!**/dist/**',
        '!**/build/**',
        '!**/coverage/**',
        '!**/__tests__/**',
        '!**/__mocks__/**',
        '!**/test/**'
    ],
    coverageDirectory: '<rootDir>/coverage',
    coverageReporters: [
        'text',
        'lcov',
        'html',
        'json-summary'
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
        }
    },

    // Test timeout
    testTimeout: 10000,

    // Verbose output
    verbose: false,

    // Clear mocks between tests
    clearMocks: true,

    // Restore mocks after each test
    restoreMocks: true,

    // Error on deprecated features
    errorOnDeprecated: true,

    // Max worker processes
    maxWorkers: '50%',

    // Cache directory
    cacheDirectory: '<rootDir>/node_modules/.cache/jest',

    // Watch plugins
    watchPlugins: [
        'jest-watch-typeahead/filename',
        'jest-watch-typeahead/testname'
    ],

    // Global variables
    globals: {
        'ts-jest': {
            useESM: true
        }
    }
};

/**
 * Configuration for React applications
 */
const reactConfig = {
    ...baseConfig,
    displayName: 'React Apps',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: [
        '<rootDir>/tools/config/jest.setup.js',
        '<rootDir>/tools/config/jest.react.setup.js'
    ],
    moduleNameMapper: {
        ...baseConfig.moduleNameMapper,
        // Mock Next.js specific modules
        '^next/image$': '<rootDir>/tools/config/__mocks__/nextImage.js',
        '^next/router$': '<rootDir>/tools/config/__mocks__/nextRouter.js',
        '^next/head$': '<rootDir>/tools/config/__mocks__/nextHead.js'
    }
};

/**
 * Configuration for Node.js/Functions
 */
const nodeConfig = {
    ...baseConfig,
    displayName: 'Node.js/Functions',
    testEnvironment: 'node',
    testMatch: [
        '<rootDir>/functions/**/__tests__/**/*.{js,ts}',
        '<rootDir>/functions/**/*.(test|spec).{js,ts}',
        '<rootDir>/packages/**/node/**/*.{test,spec}.{js,ts}'
    ],
    setupFilesAfterEnv: [
        '<rootDir>/tools/config/jest.node.setup.js'
    ],
    moduleNameMapper: {
        // Remove browser-specific mappings
        '^@eatech/core(.*)$': '<rootDir>/packages/core/src$1',
        '^@eatech/types(.*)$': '<rootDir>/packages/types/src$1',
        '^@eatech/utils(.*)$': '<rootDir>/packages/utils/src$1'
    }
};

/**
 * Configuration for integration tests
 */
const integrationConfig = {
    ...baseConfig,
    displayName: 'Integration Tests',
    testMatch: [
        '<rootDir>/**/*.integration.(test|spec).{js,jsx,ts,tsx}'
    ],
    testTimeout: 30000,
    setupFilesAfterEnv: [
        '<rootDir>/tools/config/jest.setup.js',
        '<rootDir>/tools/config/jest.integration.setup.js'
    ]
};

/**
 * Configuration for E2E tests
 */
const e2eConfig = {
    ...baseConfig,
    displayName: 'E2E Tests',
    testEnvironment: 'node',
    testMatch: [
        '<rootDir>/**/*.e2e.(test|spec).{js,ts}'
    ],
    testTimeout: 60000,
    setupFilesAfterEnv: [
        '<rootDir>/tools/config/jest.e2e.setup.js'
    ],
    // Disable coverage for E2E tests
    collectCoverage: false
};

/**
 * Multi-project configuration
 */
const multiProjectConfig = {
    projects: [
        // React applications
        {
            ...reactConfig,
            roots: ['<rootDir>/apps/web', '<rootDir>/apps/admin', '<rootDir>/apps/master'],
            testMatch: [
                '<rootDir>/apps/**/__tests__/**/*.{js,jsx,ts,tsx}',
                '<rootDir>/apps/**/*.(test|spec).{js,jsx,ts,tsx}'
            ]
        },

        // Packages
        {
            ...baseConfig,
            displayName: 'Packages',
            roots: ['<rootDir>/packages'],
            testMatch: [
                '<rootDir>/packages/**/__tests__/**/*.{js,jsx,ts,tsx}',
                '<rootDir>/packages/**/*.(test|spec).{js,jsx,ts,tsx}'
            ]
        },

        // Functions
        {
            ...nodeConfig,
            roots: ['<rootDir>/functions']
        },

        // Integration tests
        integrationConfig,

        // E2E tests (when enabled)
        ...(process.env.RUN_E2E_TESTS === 'true' ? [e2eConfig] : [])
    ],

    // Global configuration
    coverageDirectory: '<rootDir>/coverage',
    collectCoverageFrom: baseConfig.collectCoverageFrom
};

/**
 * Get configuration based on environment
 */
function getConfig() {
    const testType = process.env.TEST_TYPE;

    switch (testType) {
        case 'unit':
            return baseConfig;
        case 'integration':
            return integrationConfig;
        case 'e2e':
            return e2eConfig;
        case 'react':
            return reactConfig;
        case 'node':
            return nodeConfig;
        default:
            return multiProjectConfig;
    }
}

module.exports = getConfig();
