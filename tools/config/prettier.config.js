// /tools/config/prettier.config.js
// EATECH V3.0 - Prettier Configuration
// Code formatting configuration for consistent code style

/**
 * Base Prettier configuration
 */
const baseConfig = {
  // Basic formatting
  semi: true,                          // Add semicolons at the end of statements
  singleQuote: true,                   // Use single quotes instead of double quotes
  quoteProps: 'as-needed',             // Only quote object properties when needed
  trailingComma: 'es5',                // Add trailing commas where valid in ES5
  tabWidth: 2,                         // Number of spaces per indentation level
  useTabs: false,                      // Use spaces instead of tabs

  // Line formatting
  printWidth: 100,                     // Line length limit
  endOfLine: 'lf',                     // Use Unix line endings
  insertPragma: false,                 // Don't insert @format pragma
  requirePragma: false,                // Don't require @format pragma

  // JSX formatting
  jsxSingleQuote: true,                // Use single quotes in JSX
  jsxBracketSameLine: false,           // Put > on new line in JSX

  // Function formatting
  arrowParens: 'avoid',                // Omit parens when possible

  // HTML formatting
  htmlWhitespaceSensitivity: 'css',    // Respect CSS display property

  // Vue formatting (if needed)
  vueIndentScriptAndStyle: false,      // Don't indent script and style tags in Vue

  // Embedded language formatting
  embeddedLanguageFormatting: 'auto',  // Auto-format embedded languages

  // Range formatting
  rangeStart: 0,                       // Format from start of file
  rangeEnd: Infinity,                  // Format to end of file

  // Parser selection
  parser: undefined                    // Auto-detect parser
};

/**
* Overrides for specific file types
*/
const overrides = [
  // TypeScript and JavaScript files
  {
      files: ['*.ts', '*.tsx', '*.js', '*.jsx'],
      options: {
          parser: 'typescript',
          printWidth: 100,
          tabWidth: 2,
          singleQuote: true,
          semi: true,
          trailingComma: 'es5',
          bracketSpacing: true,
          arrowParens: 'avoid'
      }
  },

  // JSON files
  {
      files: ['*.json', '*.jsonc'],
      options: {
          parser: 'json',
          printWidth: 100,
          tabWidth: 2,
          trailingComma: 'none',
          singleQuote: false
      }
  },

  // Package.json - special formatting
  {
      files: ['package.json', 'package-lock.json'],
      options: {
          parser: 'json-stringify',
          printWidth: 100,
          tabWidth: 2,
          trailingComma: 'none'
      }
  },

  // CSS, SCSS, LESS files
  {
      files: ['*.css', '*.scss', '*.sass', '*.less'],
      options: {
          parser: 'css',
          printWidth: 100,
          tabWidth: 2,
          singleQuote: true,
          semi: true
      }
  },

  // HTML files
  {
      files: ['*.html'],
      options: {
          parser: 'html',
          printWidth: 100,
          tabWidth: 2,
          htmlWhitespaceSensitivity: 'css',
          singleAttributePerLine: false
      }
  },

  // Markdown files
  {
      files: ['*.md', '*.mdx'],
      options: {
          parser: 'markdown',
          printWidth: 80,
          tabWidth: 2,
          proseWrap: 'always',
          singleQuote: false,
          trailingComma: 'none'
      }
  },

  // YAML files
  {
      files: ['*.yml', '*.yaml'],
      options: {
          parser: 'yaml',
          printWidth: 100,
          tabWidth: 2,
          singleQuote: true,
          bracketSpacing: true
      }
  },

  // GraphQL files
  {
      files: ['*.graphql', '*.gql'],
      options: {
          parser: 'graphql',
          printWidth: 100,
          tabWidth: 2
      }
  },

  // XML files
  {
      files: ['*.xml', '*.svg'],
      options: {
          parser: 'html',
          printWidth: 100,
          tabWidth: 2,
          xmlWhitespaceSensitivity: 'ignore'
      }
  },

  // Configuration files
  {
      files: [
          '.prettierrc',
          '.eslintrc',
          'tsconfig.json',
          'jsconfig.json',
          'webpack.config.*',
          'rollup.config.*',
          'vite.config.*',
          'tailwind.config.*',
          'postcss.config.*',
          'babel.config.*',
          'jest.config.*'
      ],
      options: {
          parser: 'json',
          printWidth: 100,
          tabWidth: 2,
          trailingComma: 'none'
      }
  },

  // React components - stricter formatting
  {
      files: ['**/components/**/*.{ts,tsx,js,jsx}'],
      options: {
          printWidth: 100,
          tabWidth: 2,
          singleQuote: true,
          jsxSingleQuote: true,
          semi: true,
          trailingComma: 'es5',
          bracketSpacing: true,
          jsxBracketSameLine: false,
          arrowParens: 'avoid'
      }
  },

  // Test files - more relaxed formatting
  {
      files: [
          '**/*.test.{ts,tsx,js,jsx}',
          '**/*.spec.{ts,tsx,js,jsx}',
          '**/__tests__/**/*.{ts,tsx,js,jsx}'
      ],
      options: {
          printWidth: 120,
          tabWidth: 2,
          singleQuote: true,
          semi: true,
          trailingComma: 'es5'
      }
  },

  // Stories files
  {
      files: ['**/*.stories.{ts,tsx,js,jsx}'],
      options: {
          printWidth: 120,
          tabWidth: 2,
          singleQuote: true,
          semi: true,
          trailingComma: 'es5'
      }
  },

  // Documentation files
  {
      files: ['docs/**/*.md', 'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md'],
      options: {
          parser: 'markdown',
          printWidth: 80,
          tabWidth: 2,
          proseWrap: 'always',
          singleQuote: false
      }
  },

  // Next.js specific files
  {
      files: [
          'next.config.*',
          'next-env.d.ts',
          'pages/**/*.{ts,tsx,js,jsx}',
          'app/**/*.{ts,tsx,js,jsx}'
      ],
      options: {
          printWidth: 100,
          tabWidth: 2,
          singleQuote: true,
          semi: true,
          trailingComma: 'es5',
          jsxBracketSameLine: false
      }
  },

  // Firebase files
  {
      files: [
          'firebase.json',
          'firestore.rules',
          'storage.rules',
          'functions/**/*.{ts,js}'
      ],
      options: {
          printWidth: 100,
          tabWidth: 2,
          singleQuote: true,
          semi: true,
          trailingComma: 'es5'
      }
  },

  // Shell scripts
  {
      files: ['*.sh'],
      options: {
          parser: 'sh',
          printWidth: 100,
          tabWidth: 2,
          useTabs: false
      }
  },

  // Docker files
  {
      files: ['Dockerfile*', 'docker-compose*.yml'],
      options: {
          tabWidth: 2,
          useTabs: false
      }
  }
];

/**
* Plugins configuration
*/
const plugins = [
  // Official Prettier plugins
  'prettier-plugin-organize-imports',  // Organize imports
  'prettier-plugin-packagejson',       // Format package.json

  // CSS/SCSS plugins
  '@prettier/plugin-xml',              // XML formatting

  // Additional plugins (optional)
  // 'prettier-plugin-tailwindcss',    // Tailwind CSS class sorting
  // 'prettier-plugin-prisma',         // Prisma schema formatting
  // 'prettier-plugin-solidity',       // Solidity formatting
];

/**
* Main configuration
*/
const config = {
  ...baseConfig,
  overrides,
  plugins
};

/**
* Environment-specific configurations
*/
const environments = {
  development: {
      ...config,
      // More relaxed formatting for development
      printWidth: 120,
      tabWidth: 2
  },

  production: {
      ...config,
      // Stricter formatting for production
      printWidth: 100,
      tabWidth: 2,
      requirePragma: false,
      insertPragma: false
  },

  ci: {
      ...config,
      // Consistent formatting for CI
      printWidth: 100,
      tabWidth: 2,
      endOfLine: 'lf',
      requirePragma: false,
      insertPragma: false
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

/**
* Prettier ignore patterns
* These patterns should be added to .prettierignore file
*/
const ignorePatterns = [
  // Dependencies
  'node_modules/',
  'yarn.lock',
  'package-lock.json',
  'pnpm-lock.yaml',

  // Build outputs
  'dist/',
  'build/',
  '.next/',
  '.nuxt/',
  '.turbo/',
  'out/',
  'coverage/',

  // Cache directories
  '.cache/',
  '.parcel-cache/',
  '.vscode/',
  '.idea/',

  // Generated files
  '*.min.js',
  '*.min.css',
  '*.bundle.js',
  'bundle-report.html',

  // Static assets
  'public/',
  'static/',
  'assets/',

  // Documentation builds
  'docs/.vuepress/dist/',
  'storybook-static/',

  // Logs
  '*.log',
  'logs/',

  // Environment files
  '.env*',

  // Firebase
  '.firebase/',
  'firebase-debug.log',

  // Temporary files
  'tmp/',
  'temp/',
  '*.tmp',
  '*.temp',

  // OS files
  '.DS_Store',
  'Thumbs.db',

  // Editor files
  '*.swp',
  '*.swo',
  '*~',

  // Certificate files
  '*.pem',
  '*.key',
  '*.crt',

  // Database files
  '*.db',
  '*.sqlite',

  // Archives
  '*.zip',
  '*.tar.gz',
  '*.rar',

  // Images (usually don't need formatting)
  '*.png',
  '*.jpg',
  '*.jpeg',
  '*.gif',
  '*.svg',
  '*.ico',
  '*.webp',
  '*.avif',

  // Fonts
  '*.woff',
  '*.woff2',
  '*.ttf',
  '*.eot',
  '*.otf',

  // Videos
  '*.mp4',
  '*.avi',
  '*.mov',
  '*.wmv',
  '*.flv',

  // Audio
  '*.mp3',
  '*.wav',
  '*.ogg',
  '*.flac'
];

// Export configuration
module.exports = getConfig();

// Export additional utilities
module.exports.baseConfig = baseConfig;
module.exports.overrides = overrides;
module.exports.plugins = plugins;
module.exports.environments = environments;
module.exports.ignorePatterns = ignorePatterns;
