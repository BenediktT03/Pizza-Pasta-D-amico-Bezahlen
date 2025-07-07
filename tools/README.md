# 🛠️ EATECH V3.0 - Development Tools & Scripts

> **Comprehensive development toolkit for the EATECH foodtruck order system**

This directory contains all the development tools, scripts, and configurations needed to build, test, deploy, and maintain the EATECH platform.

## 📁 Directory Structure

```
tools/
├── scripts/           # Automation scripts
│   ├── build-all.sh          # Complete build automation
│   ├── deploy.sh             # Multi-environment deployment
│   ├── setup-dev.sh          # Developer environment setup
│   ├── generate-types.js     # TypeScript type generation
│   ├── backup-data.sh        # Firebase data backup
│   └── restore-data.sh       # Firebase data restoration
├── config/            # Configuration files
│   ├── webpack.base.js       # Webpack base configuration
│   ├── jest.config.js        # Jest testing configuration
│   ├── eslint.config.js      # ESLint linting rules
│   └── prettier.config.js    # Prettier formatting rules
└── README.md          # This documentation
```

## 🚀 Quick Start

### For New Developers

```bash
# 1. Clone the repository
git clone https://github.com/BenediktT03/Eatech.git
cd Eatech

# 2. Run the automated setup
chmod +x tools/scripts/setup-dev.sh
./tools/scripts/setup-dev.sh

# 3. Start development
npm run dev
```

### For Existing Developers

```bash
# Build all applications
./tools/scripts/build-all.sh

# Deploy to staging
./tools/scripts/deploy.sh --env staging

# Create a backup
./tools/scripts/backup-data.sh --env production --compress
```

## 🔧 Scripts Reference

### Build Scripts

#### `build-all.sh` - Complete Build Automation

**Purpose**: Builds all applications and packages in the correct order with optimization and validation.

**Usage**:
```bash
./tools/scripts/build-all.sh [OPTIONS]

Options:
  --skip-tests       Skip running tests
  --skip-lint        Skip linting
  --analyze-bundle   Analyze bundle sizes
  --clean            Clean previous builds and exit
  --help, -h         Show help message
```

**Examples**:
```bash
# Standard build
./tools/scripts/build-all.sh

# Quick build without tests
./tools/scripts/build-all.sh --skip-tests --skip-lint

# Production build with analysis
./tools/scripts/build-all.sh --analyze-bundle

# Clean previous builds
./tools/scripts/build-all.sh --clean
```

**Features**:
- ✅ Cross-platform compatibility (Windows/Mac/Linux)
- ✅ Prerequisite checking (Node.js, npm, Turbo)
- ✅ Dependency installation and validation
- ✅ TypeScript type checking
- ✅ ESLint code quality checks
- ✅ Automated type generation
- ✅ Test execution
- ✅ Package building in dependency order
- ✅ Application building with optimization
- ✅ Firebase Functions building
- ✅ Build artifact creation and validation
- ✅ Bundle analysis and compression
- ✅ Performance optimization
- ✅ Comprehensive logging

### Deployment Scripts

#### `deploy.sh` - Multi-Environment Deployment

**Purpose**: Automated deployment to development, staging, or production environments with rollback support.

**Usage**:
```bash
./tools/scripts/deploy.sh [OPTIONS] [COMMAND]

Commands:
  deploy              Deploy to specified environment (default)
  rollback            Rollback to previous deployment
  status              Show deployment status
  list                List recent deployments

Options:
  -e, --env ENVIRONMENT    Target environment (development|staging|production)
  -f, --force             Force deployment even with uncommitted changes
  --skip-backup           Skip creating backup
  --skip-tests            Skip running tests
  --dry-run               Show what would be deployed without actually deploying
  --rollback-id ID        Rollback to specific deployment ID
  -h, --help              Show help message
```

**Examples**:
```bash
# Deploy to production
./tools/scripts/deploy.sh --env production

# Deploy to staging with force
./tools/scripts/deploy.sh --env staging --force

# Dry run deployment
./tools/scripts/deploy.sh --env production --dry-run

# Rollback to specific deployment
./tools/scripts/deploy.sh rollback --env production --rollback-id 20250107_143022

# Check deployment status
./tools/scripts/deploy.sh status --env production
```

**Features**:
- ✅ Multi-environment support (dev/staging/prod)
- ✅ Automatic backup creation before deployment
- ✅ Pre-deployment testing and validation
- ✅ Git status and branch validation
- ✅ Vercel deployment for frontend apps
- ✅ Firebase Functions deployment
- ✅ CDN cache invalidation
- ✅ Post-deployment health checks
- ✅ Rollback capabilities
- ✅ Slack/Discord notifications
- ✅ Deployment logging and auditing
- ✅ Performance monitoring integration

### Development Setup Scripts

#### `setup-dev.sh` - Developer Environment Setup

**Purpose**: Automated setup of complete development environment for new team members.

**Usage**:
```bash
./tools/scripts/setup-dev.sh [OPTIONS]

Options:
  --help, -h    Show help message
```

**What it installs/configures**:
- ✅ System requirements validation
- ✅ Package managers (Homebrew on macOS, apt on Linux)
- ✅ Node.js and npm via NVM
- ✅ Git configuration and aliases
- ✅ Development tools (VS Code, Docker, etc.)
- ✅ Project dependencies
- ✅ Environment files setup
- ✅ VS Code workspace and extensions
- ✅ Git hooks for code quality
- ✅ Firebase configuration
- ✅ Development aliases and shortcuts
- ✅ Documentation generation

**Features**:
- ✅ Interactive prompts for choices
- ✅ Cross-platform support
- ✅ Idempotent (safe to run multiple times)
- ✅ Comprehensive error handling
- ✅ Progress tracking and logging
- ✅ Rollback on failure
- ✅ Customizable installation options

### Type Generation Scripts

#### `generate-types.js` - TypeScript Type Generation

**Purpose**: Automatically generates TypeScript types from Firebase schema, API endpoints, and component props.

**Usage**:
```bash
node tools/scripts/generate-types.js [OPTIONS]

Options:
  --help, -h      Show help message
  --watch, -w     Watch for changes and regenerate
  --clean         Clean generated types before generation
  --check         Only run TypeScript check without generation
```

**Examples**:
```bash
# Generate types once
node tools/scripts/generate-types.js

# Watch mode for development
node tools/scripts/generate-types.js --watch

# Clean and regenerate
node tools/scripts/generate-types.js --clean

# Type check only
node tools/scripts/generate-types.js --check
```

**Generated Types**:
- 🔥 **Firebase types**: All Firestore collections and documents
- 🌐 **API types**: Request/response types for all endpoints
- ⚛️ **Component types**: React component prop types
- 🔧 **Utility types**: Helper types and type utilities
- 📡 **WebSocket types**: Real-time event types

**Features**:
- ✅ Automatic type inference from schema
- ✅ Cross-reference validation
- ✅ Documentation generation
- ✅ TypeScript compilation checking
- ✅ Watch mode for development
- ✅ Incremental generation
- ✅ Error handling and validation

### Data Management Scripts

#### `backup-data.sh` - Firebase Data Backup

**Purpose**: Comprehensive backup solution for all Firebase services with encryption and cloud storage options.

**Usage**:
```bash
./tools/scripts/backup-data.sh [OPTIONS]

Options:
  -e, --env ENVIRONMENT       Target environment (development|staging|production)
  -t, --type TYPE            Backup type (full|firestore|storage|auth|functions|config)
  -r, --retention DAYS       Retention period in days (default: 30)
  -c, --compress             Compress backup with gzip
  -s, --encrypt              Encrypt backup (requires BACKUP_ENCRYPTION_KEY)
  --no-verify                Skip backup verification
  --upload                   Upload backup to cloud storage
  --quiet                    Suppress console output
  -h, --help                 Show help message
```

**Examples**:
```bash
# Full production backup with compression and cloud upload
./tools/scripts/backup-data.sh --env production --compress --upload

# Firestore only backup for staging
./tools/scripts/backup-data.sh --env staging --type firestore --retention 7

# Encrypted backup with compression
./tools/scripts/backup-data.sh --env production --encrypt --compress --quiet
```

**Backup Components**:
- 🔥 **Firestore**: All collections and subcollections
- 📁 **Storage**: All files and metadata
- 👤 **Authentication**: User accounts and settings
- ⚡ **Functions**: Source code and configuration
- ⚙️ **Configuration**: Firebase and app settings

**Features**:
- ✅ Incremental and full backup support
- ✅ Compression with gzip and Brotli
- ✅ AES-256 encryption
- ✅ Cloud storage integration
- ✅ Automatic cleanup of old backups
- ✅ Integrity verification
- ✅ Parallel processing for speed
- ✅ Detailed logging and monitoring
- ✅ Slack/email notifications

#### `restore-data.sh` - Firebase Data Restoration

**Purpose**: Comprehensive restore solution with safety checks and selective restoration options.

**Usage**:
```bash
./tools/scripts/restore-data.sh [OPTIONS]

Options:
  -e, --env ENVIRONMENT       Target environment (development|staging|production)
  -t, --type TYPE            Restore type (full|firestore|storage|auth|functions|config)
  -b, --backup-id ID         Backup ID to restore
  --list                     List available backups
  --dry-run                  Show what would be restored without actually restoring
  --force                    Skip safety prompts
  --no-verify                Skip backup verification
  --no-safety-backup         Skip creating safety backup before restore
  --quiet                    Suppress console output
  -h, --help                 Show help message
```

**Examples**:
```bash
# List available backups
./tools/scripts/restore-data.sh --list --env production

# Dry run restore
./tools/scripts/restore-data.sh --env staging --backup-id 20250107_143022 --dry-run

# Firestore only restore
./tools/scripts/restore-data.sh --env development --type firestore --backup-id 20250107_143022

# Force restore to production
./tools/scripts/restore-data.sh --env production --backup-id 20250107_143022 --force
```

**Safety Features**:
- ✅ Production environment confirmation
- ✅ Automatic safety backup before restore
- ✅ Dry run mode for testing
- ✅ Backup integrity verification
- ✅ Selective component restoration
- ✅ Rollback capabilities
- ✅ Detailed logging and auditing

## ⚙️ Configuration Files

### `webpack.base.js` - Webpack Configuration

**Purpose**: Shared Webpack configuration for all React applications with optimizations and development features.

**Features**:
- ✅ TypeScript and JavaScript support
- ✅ React and JSX processing
- ✅ CSS Modules and SCSS support
- ✅ Tailwind CSS integration
- ✅ Asset optimization and compression
- ✅ Code splitting and tree shaking
- ✅ Service Worker generation
- ✅ Bundle analysis tools
- ✅ Development server with HMR
- ✅ Environment-specific builds

**Usage**:
```javascript
const { createReactConfig } = require('./tools/config/webpack.base');

module.exports = createReactConfig({
    mode: 'production',
    entry: './src/index.tsx',
    outputPath: path.resolve(__dirname, 'dist'),
    serviceWorker: true,
    analyze: true
});
```

### `jest.config.js` - Testing Configuration

**Purpose**: Comprehensive Jest configuration for unit, integration, and E2E testing.

**Features**:
- ✅ Multi-project support
- ✅ TypeScript and JSX support
- ✅ React Testing Library integration
- ✅ Coverage reporting and thresholds
- ✅ Module mocking and aliases
- ✅ Parallel test execution
- ✅ Watch mode for development
- ✅ Environment-specific configurations

**Test Types Supported**:
- 🧪 **Unit Tests**: Component and function testing
- 🔗 **Integration Tests**: API and service integration
- 🌐 **E2E Tests**: Full application workflows
- 📱 **React Tests**: Component rendering and interaction
- 🚀 **Node Tests**: Server-side functionality

### `eslint.config.js` - Linting Configuration

**Purpose**: Comprehensive ESLint configuration for code quality and consistency.

**Features**:
- ✅ TypeScript support with type checking
- ✅ React and JSX best practices
- ✅ Accessibility rules (jsx-a11y)
- ✅ Import/export organization
- ✅ Prettier integration
- ✅ Testing library rules
- ✅ Environment-specific overrides
- ✅ Performance optimizations

**Rule Categories**:
- 🔧 **TypeScript**: Type safety and best practices
- ⚛️ **React**: Component and hook rules
- ♿ **Accessibility**: WCAG compliance
- 📦 **Imports**: Organization and dependency management
- 🧪 **Testing**: Test-specific rules
- 🎨 **Style**: Code formatting via Prettier

### `prettier.config.js` - Code Formatting

**Purpose**: Consistent code formatting across all file types in the project.

**Features**:
- ✅ File-type specific formatting
- ✅ Import organization
- ✅ Package.json formatting
- ✅ Markdown and documentation
- ✅ Configuration file formatting
- ✅ Environment-specific settings

**Supported File Types**:
- 📝 **Code**: TypeScript, JavaScript, JSX, TSX
- 🎨 **Styles**: CSS, SCSS, SASS, LESS
- 📄 **Documents**: Markdown, HTML, XML
- ⚙️ **Config**: JSON, YAML, TOML
- 🗃️ **Data**: GraphQL, SQL
- 📦 **Package**: package.json, lock files

## 🔄 Development Workflow

### Daily Development

```bash
# 1. Start development
npm run dev

# 2. Make changes and test
npm run test:watch

# 3. Check code quality
npm run lint
npm run type-check

# 4. Commit changes
git add .
git commit -m "feat(orders): add voice ordering support"
git push
```

### Building and Testing

```bash
# Build all applications
./tools/scripts/build-all.sh

# Run all tests
npm run test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Generate and check types
node tools/scripts/generate-types.js
npm run type-check
```

### Deployment Process

```bash
# 1. Deploy to staging
./tools/scripts/deploy.sh --env staging

# 2. Run smoke tests
npm run test:smoke

# 3. Deploy to production
./tools/scripts/deploy.sh --env production

# 4. Monitor deployment
./tools/scripts/deploy.sh status --env production
```

### Backup and Maintenance

```bash
# Create regular backup
./tools/scripts/backup-data.sh --env production --compress --upload

# List recent backups
./tools/scripts/restore-data.sh --list --env production

# Clean old builds and dependencies
./tools/scripts/build-all.sh --clean
npm run clean
```

## 🌍 Environment Variables

### Required Environment Variables

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=eatech-prod
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@eatech-prod.iam.gserviceaccount.com

# Deployment Tokens
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
FIREBASE_TOKEN=your_firebase_token

# Backup Configuration
BACKUP_ENCRYPTION_KEY=your_32_byte_encryption_key

# Notification Webhooks
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Cloud Storage
CLOUDFLARE_API_TOKEN=your_cloudflare_token
CLOUDFLARE_ZONE_ID=your_zone_id
```

### Environment Files

```
.env.example          # Template with all variables
.env.local           # Local development (gitignored)
.env.development     # Development environment
.env.staging         # Staging environment
.env.production      # Production environment
```

## 🚨 Troubleshooting

### Common Issues

#### Build Failures

```bash
# Clear all caches and rebuild
./tools/scripts/build-all.sh --clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Type Errors

```bash
# Regenerate types and check
node tools/scripts/generate-types.js --clean
npm run type-check
```

#### Test Failures

```bash
# Run tests with verbose output
npm run test -- --verbose
npm run test -- --detectOpenHandles
```

#### Deployment Issues

```bash
# Check deployment status
./tools/scripts/deploy.sh status --env production

# Rollback if needed
./tools/scripts/deploy.sh rollback --env production --rollback-id BACKUP_ID
```

### Performance Issues

#### Bundle Size

```bash
# Analyze bundle size
./tools/scripts/build-all.sh --analyze-bundle

# Check for duplicate dependencies
npm ls --depth=0
npx duplicate-package-checker-webpack-plugin
```

#### Memory Issues

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"
npm run build
```

### Debug Mode

```bash
# Enable debug logging
export DEBUG=eatech:*
npm run dev

# Enable verbose npm logging
npm run build --loglevel verbose
```

## 📋 Maintenance Tasks

### Weekly Tasks

```bash
# Update dependencies
npm update
npm audit fix

# Clean old backups
# (Automatic via retention policy)

# Generate fresh types
node tools/scripts/generate-types.js --clean
```

### Monthly Tasks

```bash
# Full dependency audit
npm audit
npm outdated

# Performance review
./tools/scripts/build-all.sh --analyze-bundle

# Backup verification
./tools/scripts/restore-data.sh --list --env production
```

### Quarterly Tasks

```bash
# Major dependency updates
npx npm-check-updates -u
npm install

# Security audit
npm audit --audit-level high

# Documentation update
# Update this README and other docs
```

## 🤝 Contributing

Please read [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines on:

- 🔄 Development workflow
- 📝 Commit message format
- 🧪 Testing requirements
- 📚 Documentation standards
- 🔍 Code review process

## 📞 Support

### Getting Help

- 📧 **Email**: benedikt@thomma.ch
- 💬 **Discord**: [Coming Soon]
- 📚 **Documentation**: https://docs.eatech.ch
- 🐛 **Issues**: https://github.com/BenediktT03/Eatech/issues

### Reporting Issues

1. Check existing issues first
2. Use issue templates
3. Provide reproduction steps
4. Include environment details
5. Add relevant logs

## 📄 License

This project is proprietary software. All rights reserved.

## 🏆 Credits

**EATECH V3.0** - Revolutionary Foodtruck Order System
- **Author**: Benedikt Thomma
- **Email**: benedikt@thomma.ch
- **Version**: 3.0.0
- **Last Updated**: January 2025

---

*Built with ❤️ for the Swiss foodtruck industry*
