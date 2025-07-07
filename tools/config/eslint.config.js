// /tools/config/eslint.config.js
// EATECH V3.0 - ESLint Configuration
// Comprehensive linting rules for TypeScript, React, and Node.js

const path = require('path');

// Get project root
const projectRoot = path.resolve(__dirname, '../..');

/**
 * Base ESLint configuration
 */
const baseConfig = {
    root: true,

    // Parser configuration
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true,
            modules: true,
            experimentalObjectRestSpread: true
        },
        project: [
            path.join(projectRoot, 'tsconfig.json'),
            path.join(projectRoot, 'apps/*/tsconfig.json'),
            path.join(projectRoot, 'packages/*/tsconfig.json'),
            path.join(projectRoot, 'functions/tsconfig.json')
        ],
        tsconfigRootDir: projectRoot
    },

    // Environment settings
    env: {
        browser: true,
        es6: true,
        node: true,
        jest: true,
        serviceworker: true
    },

    // Global variables
    globals: {
        React: 'readonly',
        JSX: 'readonly',
        NodeJS: 'readonly',
        RequestInit: 'readonly',
        RequestInfo: 'readonly'
    },

    // Plugin configuration
    plugins: [
        '@typescript-eslint',
        'react',
        'react-hooks',
        'jsx-a11y',
        'import',
        'prettier',
        'testing-library',
        'jest-dom'
    ],

    // Extended configurations
    extends: [
        'eslint:recommended',
        '@typescript-eslint/recommended',
        '@typescript-eslint/recommended-requiring-type-checking',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:jsx-a11y/recommended',
        'plugin:import/recommended',
        'plugin:import/typescript',
        'plugin:prettier/recommended'
    ],

    // Rule configuration
    rules: {
        // === TypeScript Rules ===
        '@typescript-eslint/no-unused-vars': [
            'error',
            {
                vars: 'all',
                args: 'after-used',
                ignoreRestSiblings: true,
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_'
            }
        ],
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-non-null-assertion': 'warn',
        '@typescript-eslint/prefer-const': 'error',
        '@typescript-eslint/no-var-requires': 'error',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-empty-function': 'warn',
        '@typescript-eslint/no-inferrable-types': 'error',
        '@typescript-eslint/ban-ts-comment': [
            'error',
            {
                'ts-expect-error': 'allow-with-description',
                'ts-ignore': 'allow-with-description',
                'ts-nocheck': true,
                'ts-check': false
            }
        ],
        '@typescript-eslint/consistent-type-imports': [
            'error',
            {
                prefer: 'type-imports',
                disallowTypeAnnotations: false
            }
        ],
        '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
        '@typescript-eslint/array-type': ['error', { default: 'array' }],
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
        '@typescript-eslint/prefer-optional-chain': 'error',
        '@typescript-eslint/no-unnecessary-type-assertion': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/await-thenable': 'error',

        // === React Rules ===
        'react/react-in-jsx-scope': 'off', // Not needed with React 17+
        'react/prop-types': 'off', // Using TypeScript for prop validation
        'react/display-name': 'warn',
        'react/no-array-index-key': 'warn',
        'react/no-deprecated': 'error',
        'react/no-direct-mutation-state': 'error',
        'react/no-find-dom-node': 'error',
        'react/no-is-mounted': 'error',
        'react/no-render-return-value': 'error',
        'react/no-string-refs': 'error',
        'react/no-unescaped-entities': 'error',
        'react/no-unknown-property': 'error',
        'react/no-unsafe': 'warn',
        'react/prefer-es6-class': 'error',
        'react/require-render-return': 'error',
        'react/self-closing-comp': 'error',
        'react/sort-comp': 'warn',
        'react/style-prop-object': 'error',
        'react/void-dom-elements-no-children': 'error',
        'react/jsx-boolean-value': ['error', 'never'],
        'react/jsx-closing-bracket-location': 'error',
        'react/jsx-closing-tag-location': 'error',
        'react/jsx-curly-spacing': ['error', 'never'],
        'react/jsx-equals-spacing': ['error', 'never'],
        'react/jsx-first-prop-new-line': ['error', 'multiline-multiprop'],
        'react/jsx-indent': ['error', 2],
        'react/jsx-indent-props': ['error', 2],
        'react/jsx-key': 'error',
        'react/jsx-max-props-per-line': ['warn', { maximum: 3 }],
        'react/jsx-no-bind': ['warn', { allowArrowFunctions: true }],
        'react/jsx-no-comment-textnodes': 'error',
        'react/jsx-no-duplicate-props': 'error',
        'react/jsx-no-target-blank': 'error',
        'react/jsx-no-undef': 'error',
        'react/jsx-pascal-case': 'error',
        'react/jsx-tag-spacing': 'error',
        'react/jsx-uses-react': 'off', // Not needed with React 17+
        'react/jsx-uses-vars': 'error',
        'react/jsx-wrap-multilines': [
            'error',
            {
                declaration: 'parens-new-line',
                assignment: 'parens-new-line',
                return: 'parens-new-line',
                arrow: 'parens-new-line',
                condition: 'parens-new-line',
                logical: 'parens-new-line',
                prop: 'parens-new-line'
            }
        ],

        // === React Hooks Rules ===
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',

        // === Accessibility Rules ===
        'jsx-a11y/alt-text': 'error',
        'jsx-a11y/anchor-has-content': 'error',
        'jsx-a11y/anchor-is-valid': 'error',
        'jsx-a11y/aria-activedescendant-has-tabindex': 'error',
        'jsx-a11y/aria-props': 'error',
        'jsx-a11y/aria-proptypes': 'error',
        'jsx-a11y/aria-role': 'error',
        'jsx-a11y/aria-unsupported-elements': 'error',
        'jsx-a11y/click-events-have-key-events': 'warn',
        'jsx-a11y/heading-has-content': 'error',
        'jsx-a11y/html-has-lang': 'error',
        'jsx-a11y/iframe-has-title': 'error',
        'jsx-a11y/img-redundant-alt': 'error',
        'jsx-a11y/interactive-supports-focus': 'warn',
        'jsx-a11y/label-has-associated-control': 'error',
        'jsx-a11y/mouse-events-have-key-events': 'warn',
        'jsx-a11y/no-access-key': 'error',
        'jsx-a11y/no-distracting-elements': 'error',
        'jsx-a11y/no-redundant-roles': 'error',
        'jsx-a11y/role-has-required-aria-props': 'error',
        'jsx-a11y/role-supports-aria-props': 'error',
        'jsx-a11y/scope': 'error',
        'jsx-a11y/tabindex-no-positive': 'error',

        // === Import Rules ===
        'import/order': [
            'error',
            {
                groups: [
                    'builtin',
                    'external',
                    'internal',
                    'parent',
                    'sibling',
                    'index',
                    'type'
                ],
                'newlines-between': 'always',
                alphabetize: {
                    order: 'asc',
                    caseInsensitive: true
                },
                pathGroups: [
                    {
                        pattern: 'react',
                        group: 'external',
                        position: 'before'
                    },
                    {
                        pattern: '@/**',
                        group: 'internal',
                        position: 'before'
                    },
                    {
                        pattern: '@eatech/**',
                        group: 'internal',
                        position: 'before'
                    }
                ],
                pathGroupsExcludedImportTypes: ['react']
            }
        ],
        'import/no-unresolved': 'error',
        'import/no-cycle': 'error',
        'import/no-self-import': 'error',
        'import/no-useless-path-segments': 'error',
        'import/newline-after-import': 'error',
        'import/no-duplicates': 'error',
        'import/no-extraneous-dependencies': [
            'error',
            {
                devDependencies: [
                    '**/*.test.{js,jsx,ts,tsx}',
                    '**/*.spec.{js,jsx,ts,tsx}',
                    '**/__tests__/**',
                    '**/*.stories.{js,jsx,ts,tsx}',
                    '**/jest.config.js',
                    '**/webpack.config.js',
                    '**/vite.config.js',
                    '**/tailwind.config.js',
                    '**/postcss.config.js'
                ]
            }
        ],

        // === General JavaScript Rules ===
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'no-debugger': 'error',
        'no-alert': 'error',
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-script-url': 'error',
        'no-void': 'error',
        'no-with': 'error',
        'prefer-const': 'error',
        'no-var': 'error',
        'no-duplicate-imports': 'error',
        'no-template-curly-in-string': 'error',
        'array-callback-return': 'error',
        'block-scoped-var': 'error',
        'complexity': ['warn', 10],
        'consistent-return': 'error',
        'curly': ['error', 'all'],
        'default-case': 'error',
        'dot-notation': 'error',
        'eqeqeq': ['error', 'always'],
        'guard-for-in': 'error',
        'max-classes-per-file': ['error', 1],
        'max-depth': ['warn', 4],
        'max-lines': ['warn', 300],
        'max-params': ['warn', 4],
        'no-empty': 'error',
        'no-empty-function': 'warn',
        'no-magic-numbers': [
            'warn',
            {
                ignore: [-1, 0, 1, 2, 100, 1000],
                ignoreArrayIndexes: true,
                enforceConst: true,
                detectObjects: false
            }
        ],
        'no-multi-assign': 'error',
        'no-nested-ternary': 'error',
        'no-param-reassign': 'error',
        'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
        'no-return-assign': 'error',
        'no-shadow': 'off', // Using @typescript-eslint/no-shadow instead
        '@typescript-eslint/no-shadow': 'error',
        'no-throw-literal': 'error',
        'no-underscore-dangle': 'off',
        'no-unneeded-ternary': 'error',
        'no-unused-expressions': 'error',
        'prefer-arrow-callback': 'error',
        'prefer-template': 'error',
        'radix': 'error',
        'spaced-comment': ['error', 'always'],
        'yoda': 'error',

        // === Prettier Integration ===
        'prettier/prettier': 'error'
    },

    // Settings
    settings: {
        react: {
            version: 'detect'
        },
        'import/resolver': {
            typescript: {
                alwaysTryTypes: true,
                project: [
                    path.join(projectRoot, 'tsconfig.json'),
                    path.join(projectRoot, 'apps/*/tsconfig.json'),
                    path.join(projectRoot, 'packages/*/tsconfig.json'),
                    path.join(projectRoot, 'functions/tsconfig.json')
                ]
            },
            node: {
                extensions: ['.js', '.jsx', '.ts', '.tsx']
            }
        },
        'import/parsers': {
            '@typescript-eslint/parser': ['.ts', '.tsx']
        }
    },

    // Override configurations for specific file patterns
    overrides: [
        // TypeScript files
        {
            files: ['*.ts', '*.tsx'],
            rules: {
                'no-undef': 'off' // TypeScript handles this
            }
        },

        // JavaScript files
        {
            files: ['*.js', '*.jsx'],
            rules: {
                '@typescript-eslint/no-var-requires': 'off',
                '@typescript-eslint/explicit-function-return-type': 'off'
            }
        },

        // Test files
        {
            files: [
                '**/__tests__/**/*',
                '**/*.{test,spec}.{js,jsx,ts,tsx}'
            ],
            extends: [
                'plugin:testing-library/react',
                'plugin:jest-dom/recommended'
            ],
            rules: {
                '@typescript-eslint/no-explicit-any': 'off',
                '@typescript-eslint/no-non-null-assertion': 'off',
                'no-magic-numbers': 'off',
                'max-lines': 'off',
                'testing-library/await-async-query': 'error',
                'testing-library/no-await-sync-query': 'error',
                'testing-library/no-debug': 'warn',
                'testing-library/no-dom-import': 'error',
                'testing-library/prefer-screen-queries': 'error',
                'testing-library/render-result-naming-convention': 'error'
            }
        },

        // Stories files
        {
            files: ['*.stories.{js,jsx,ts,tsx}'],
            rules: {
                'import/no-extraneous-dependencies': 'off',
                'no-magic-numbers': 'off',
                '@typescript-eslint/no-explicit-any': 'off'
            }
        },

        // Configuration files
        {
            files: [
                '*.config.{js,ts}',
                '.eslintrc.{js,ts}',
                'webpack.*.{js,ts}',
                'jest.*.{js,ts}',
                'tailwind.config.{js,ts}',
                'postcss.config.{js,ts}'
            ],
            rules: {
                'import/no-extraneous-dependencies': 'off',
                '@typescript-eslint/no-var-requires': 'off',
                'no-magic-numbers': 'off'
            }
        },

        // Node.js files (Functions, scripts)
        {
            files: [
                'functions/**/*.{js,ts}',
                'tools/scripts/**/*.{js,ts}',
                '**/node/**/*.{js,ts}'
            ],
            env: {
                node: true,
                browser: false
            },
            rules: {
                'no-console': 'off',
                '@typescript-eslint/no-var-requires': 'off'
            }
        },

        // Next.js specific files
        {
            files: [
                'apps/web/**/*.{js,jsx,ts,tsx}',
                'apps/admin/**/*.{js,jsx,ts,tsx}',
                'apps/master/**/*.{js,jsx,ts,tsx}'
            ],
            extends: ['next/core-web-vitals'],
            rules: {
                '@next/next/no-html-link-for-pages': 'off'
            }
        },

        // React component files
        {
            files: ['**/components/**/*.{jsx,tsx}'],
            rules: {
                'max-lines': ['warn', 200],
                'complexity': ['warn', 8]
            }
        },

        // Hook files
        {
            files: ['**/hooks/**/*.{js,jsx,ts,tsx}', 'use*.{js,jsx,ts,tsx}'],
            rules: {
                'react-hooks/rules-of-hooks': 'error',
                'react-hooks/exhaustive-deps': 'error'
            }
        }
    ],

    // Ignore patterns
    ignorePatterns: [
        'node_modules/',
        'dist/',
        'build/',
        '.next/',
        '.turbo/',
        'coverage/',
        '*.min.js',
        'public/',
        '.cache/',
        'storybook-static/'
    ]
};

/**
 * Configuration for different environments
 */
const environments = {
    development: {
        ...baseConfig,
        rules: {
            ...baseConfig.rules,
            'no-console': 'off',
            'no-debugger': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn'
        }
    },

    production: {
        ...baseConfig,
        rules: {
            ...baseConfig.rules,
            'no-console': 'error',
            'no-debugger': 'error',
            '@typescript-eslint/no-explicit-any': 'error'
        }
    },

    ci: {
        ...baseConfig,
        rules: {
            ...baseConfig.rules,
            'no-console': 'error',
            'no-debugger': 'error',
            '@typescript-eslint/no-explicit-any': 'error',
            'prettier/prettier': 'error'
        }
    }
};

/**
 * Get configuration based on environment
 */
function getConfig() {
    const env = process.env.NODE_ENV || 'development';
    const isCI = process.env.CI === 'true';

    if (isCI) {
        return environments.ci;
    }

    return environments[env] || environments.development;
}

module.exports = getConfig();
