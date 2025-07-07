/**
 * EATECH V3.0 - AI Package ESLint Configuration
 * Optimiert für TypeScript, Node.js und Swiss Standards
 */

module.exports = {
  root: true,

  // Environment Configuration
  env: {
    browser: true,
    es2022: true,
    node: true,
    jest: true,
    worker: true
  },

  // Parser Configuration
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    createDefaultProgram: true,
    ecmaFeatures: {
      jsx: true,
      globalReturn: false,
      impliedStrict: true
    }
  },

  // Extends Configuration
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:node/recommended',
    'plugin:security/recommended',
    'plugin:promise/recommended',
    'prettier' // Must be last to override other configs
  ],

  // Plugins
  plugins: [
    '@typescript-eslint',
    'import',
    'node',
    'security',
    'promise',
    'jsdoc',
    'unicorn'
  ],

  // Settings
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json'
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
      }
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx']
    }
  },

  // Global Rules
  rules: {
    // === TYPESCRIPT RULES ===
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true
      }
    ],
    '@typescript-eslint/prefer-readonly': 'error',
    '@typescript-eslint/prefer-readonly-parameter-types': 'off', // Too strict for AI services
    '@typescript-eslint/no-inferrable-types': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/strict-boolean-expressions': [
      'error',
      {
        allowString: false,
        allowNumber: false,
        allowNullableObject: false,
        allowNullableBoolean: false,
        allowNullableString: false,
        allowNullableNumber: false,
        allowAny: false
      }
    ],
    '@typescript-eslint/switch-exhaustiveness-check': 'error',
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', disallowTypeAnnotations: false }
    ],

    // === IMPORT RULES ===
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
            pattern: '@/**',
            group: 'internal',
            position: 'before'
          },
          {
            pattern: '*.{css,scss,sass,less}',
            group: 'index',
            position: 'after'
          }
        ],
        pathGroupsExcludedImportTypes: ['builtin', 'type']
      }
    ],
    'import/no-unresolved': 'error',
    'import/no-cycle': 'error',
    'import/no-self-import': 'error',
    'import/no-useless-path-segments': 'error',
    'import/no-deprecated': 'warn',
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: [
          '**/*.test.ts',
          '**/*.test.tsx',
          '**/*.spec.ts',
          '**/*.spec.tsx',
          '**/test/**',
          '**/tests/**',
          '**/__tests__/**',
          '**/*.config.js',
          '**/*.config.ts'
        ]
      }
    ],

    // === NODE.JS RULES ===
    'node/no-missing-import': 'off', // Handled by TypeScript
    'node/no-unsupported-features/es-syntax': 'off', // We transpile
    'node/no-unpublished-import': [
      'error',
      {
        allowModules: ['jest', '@types/jest', 'supertest']
      }
    ],
    'node/prefer-global/process': 'error',
    'node/prefer-global/console': 'error',
    'node/no-process-exit': 'error',

    // === SECURITY RULES ===
    'security/detect-object-injection': 'warn', // Can be noisy in AI context
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'warn', // AI services might need this
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-pseudoRandomBytes': 'error',

    // === PROMISE RULES ===
    'promise/always-return': 'error',
    'promise/no-return-wrap': 'error',
    'promise/param-names': 'error',
    'promise/catch-or-return': 'error',
    'promise/no-native': 'off', // We use native Promises
    'promise/no-nesting': 'warn',
    'promise/no-promise-in-callback': 'warn',
    'promise/no-callback-in-promise': 'warn',
    'promise/avoid-new': 'off', // Sometimes needed for AI services
    'promise/no-new-statics': 'error',
    'promise/no-return-in-finally': 'warn',
    'promise/valid-params': 'warn',

    // === JSDOC RULES ===
    'jsdoc/check-alignment': 'warn',
    'jsdoc/check-param-names': 'warn',
    'jsdoc/check-tag-names': 'warn',
    'jsdoc/check-types': 'warn',
    'jsdoc/require-description': 'warn',
    'jsdoc/require-param': 'warn',
    'jsdoc/require-param-description': 'warn',
    'jsdoc/require-param-type': 'off', // TypeScript provides types
    'jsdoc/require-returns': 'warn',
    'jsdoc/require-returns-description': 'warn',
    'jsdoc/require-returns-type': 'off', // TypeScript provides types

    // === UNICORN RULES (Moderner JS/TS) ===
    'unicorn/filename-case': [
      'error',
      {
        cases: {
          kebabCase: true,
          camelCase: true,
          pascalCase: true
        },
        ignore: ['\\.d\\.ts$', '\\.config\\.(js|ts)$']
      }
    ],
    'unicorn/no-null': 'off', // TypeScript handles null checks
    'unicorn/prevent-abbreviations': [
      'error',
      {
        replacements: {
          props: false,
          ref: false,
          params: false,
          args: false,
          env: false,
          req: false,
          res: false,
          ctx: false,
          db: false,
          ai: false,
          id: false,
          url: false,
          api: false,
          jwt: false,
          sms: false,
          otp: false,
          pdf: false,
          csv: false,
          json: false,
          xml: false,
          html: false,
          css: false,
          js: false,
          ts: false
        },
        checkFilenames: false
      }
    ],
    'unicorn/prefer-node-protocol': 'error',
    'unicorn/prefer-module': 'error',
    'unicorn/prefer-top-level-await': 'off', // Not always appropriate
    'unicorn/no-process-exit': 'error',

    // === GENERAL ESLint RULES ===
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-sequences': 'error',
    'no-void': 'error',
    'no-with': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-template': 'error',
    'prefer-rest-params': 'error',
    'prefer-spread': 'error',
    'no-duplicate-imports': 'error',
    'no-useless-constructor': 'error',
    'no-useless-rename': 'error',
    'symbol-description': 'error',

    // === NAMING CONVENTIONS (Swiss Standards) ===
    '@typescript-eslint/naming-convention': [
      'error',
      // camelCase für variables, functions, methods
      {
        selector: 'variableLike',
        format: ['camelCase'],
        leadingUnderscore: 'allow'
      },
      // PascalCase für Types, Classes, Interfaces
      {
        selector: 'typeLike',
        format: ['PascalCase']
      },
      // UPPER_CASE für constants
      {
        selector: 'variable',
        modifiers: ['const'],
        types: ['string', 'number', 'boolean'],
        format: ['UPPER_CASE', 'camelCase']
      },
      // PascalCase für Enums
      {
        selector: 'enum',
        format: ['PascalCase']
      },
      // PascalCase für Enum Members
      {
        selector: 'enumMember',
        format: ['PascalCase', 'UPPER_CASE']
      },
      // Interfaces mit 'I' prefix erlaubt (aber nicht erforderlich)
      {
        selector: 'interface',
        format: ['PascalCase'],
        custom: {
          regex: '^I[A-Z]',
          match: false
        }
      }
    ]
  },

  // Override Rules für specific file patterns
  overrides: [
    // Test Files
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      env: {
        jest: true
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-object-literal-type-assertion': 'off',
        'security/detect-object-injection': 'off',
        'no-console': 'off'
      }
    },

    // Configuration Files
    {
      files: ['**/*.config.js', '**/*.config.ts', '**/jest.config.*'],
      rules: {
        'import/no-extraneous-dependencies': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        'unicorn/prefer-module': 'off'
      }
    },

    // Declaration Files
    {
      files: ['**/*.d.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'import/no-duplicates': 'off'
      }
    },

    // AI Service Files (relaxed rules for ML/AI code)
    {
      files: [
        '**/services/**/*.ts',
        '**/models/**/*.ts',
        '**/training/**/*.ts',
        '**/inference/**/*.ts'
      ],
      rules: {
        '@typescript-eslint/no-magic-numbers': 'off', // ML models have many magic numbers
        'security/detect-object-injection': 'off', // Common in AI data processing
        'complexity': 'off', // AI algorithms can be complex
        'max-lines-per-function': 'off' // AI functions can be long
      }
    },

    // Emergency & Critical Services
    {
      files: ['**/emergency/**/*.ts', '**/critical/**/*.ts'],
      rules: {
        'no-console': 'off', // Emergency logging is important
        '@typescript-eslint/restrict-template-expressions': 'off',
        'unicorn/no-process-exit': 'off' // Emergency shutdown might need this
      }
    }
  ],

  // Ignore Patterns
  ignorePatterns: [
    'dist/',
    'build/',
    'coverage/',
    'node_modules/',
    '*.min.js',
    '*.bundle.js',
    '.eslintrc.js',
    'jest.config.js',
    'webpack.config.js',
    '**/*.generated.ts',
    '**/*.pb.ts', // Protocol Buffer generated files
    '**/vendor/**'
  ]
};
