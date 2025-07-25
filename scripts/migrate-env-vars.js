#!/usr/bin/env node

// Environment Variable Migration Script
// Run: node scripts/migrate-env-vars.js

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset}  ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset}  ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset}  ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset}  ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.magenta}${msg}${colors.reset}\n`)
};

// Environment templates for each app
const envTemplates = {
  admin: {
    path: 'apps/admin/.env.local',
    template: `# Admin App Environment Variables
# Generated by migration script on ${new Date().toISOString()}

# Firebase Configuration
VITE_FIREBASE_API_KEY={{API_KEY}}
VITE_FIREBASE_AUTH_DOMAIN={{AUTH_DOMAIN}}
VITE_FIREBASE_PROJECT_ID={{PROJECT_ID}}
VITE_FIREBASE_STORAGE_BUCKET={{STORAGE_BUCKET}}
VITE_FIREBASE_MESSAGING_SENDER_ID={{MESSAGING_SENDER_ID}}
VITE_FIREBASE_APP_ID={{APP_ID}}
VITE_FIREBASE_MEASUREMENT_ID={{MEASUREMENT_ID}}

# API Configuration
VITE_API_URL=https://api.eatech.ch
VITE_WS_URL=wss://ws.eatech.ch

# Feature Flags
VITE_ENABLE_VOICE=true
VITE_ENABLE_AI=true
VITE_ENABLE_ANALYTICS=true

# Development
VITE_USE_EMULATORS=false
VITE_DEBUG_MODE=false
`
  },
  master: {
    path: 'apps/master/.env.local',
    template: `# Master App Environment Variables
# Generated by migration script on ${new Date().toISOString()}

# Firebase Configuration
VITE_FIREBASE_API_KEY={{API_KEY}}
VITE_FIREBASE_AUTH_DOMAIN={{AUTH_DOMAIN}}
VITE_FIREBASE_PROJECT_ID={{PROJECT_ID}}
VITE_FIREBASE_STORAGE_BUCKET={{STORAGE_BUCKET}}
VITE_FIREBASE_MESSAGING_SENDER_ID={{MESSAGING_SENDER_ID}}
VITE_FIREBASE_APP_ID={{APP_ID}}
VITE_FIREBASE_MEASUREMENT_ID={{MEASUREMENT_ID}}

# Master Control Specific
VITE_MASTER_API_KEY={{MASTER_API_KEY}}
VITE_MASTER_SECRET={{MASTER_SECRET}}

# API Configuration
VITE_API_URL=https://api.eatech.ch
VITE_WS_URL=wss://ws.eatech.ch

# Development
VITE_USE_EMULATORS=false
VITE_DEBUG_MODE=false
`
  },
  web: {
    path: 'apps/web/.env.local',
    template: `# Web App Environment Variables
# Generated by migration script on ${new Date().toISOString()}

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY={{API_KEY}}
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN={{AUTH_DOMAIN}}
NEXT_PUBLIC_FIREBASE_PROJECT_ID={{PROJECT_ID}}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET={{STORAGE_BUCKET}}
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID={{MESSAGING_SENDER_ID}}
NEXT_PUBLIC_FIREBASE_APP_ID={{APP_ID}}
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID={{MEASUREMENT_ID}}

# App Configuration
NEXT_PUBLIC_APP_URL=https://app.eatech.ch
NEXT_PUBLIC_API_URL=https://api.eatech.ch
NEXT_PUBLIC_WS_URL=wss://ws.eatech.ch

# Feature Flags
NEXT_PUBLIC_ENABLE_VOICE=true
NEXT_PUBLIC_ENABLE_AI=true
NEXT_PUBLIC_ENABLE_PWA=true
NEXT_PUBLIC_ENABLE_BLOCKCHAIN=false

# Development
NEXT_PUBLIC_USE_EMULATORS=false
`
  }
};

// Extract Firebase config from source files
async function extractFirebaseConfig() {
  log.header('🔍 Extracting Firebase Configuration');

  // Try to find existing config in source files
  const configPaths = [
    'apps/admin/src/services/firebase/firebaseConfig.js',
    'apps/master/src/services/firebase/config.js',
    'apps/web/src/lib/firebase.ts'
  ];

  for (const configPath of configPaths) {
    const fullPath = path.join(process.cwd(), configPath);
    if (fs.existsSync(fullPath)) {
      log.info(`Reading ${configPath}...`);
      const content = fs.readFileSync(fullPath, 'utf8');

      // Extract config values using regex
      const configRegex = /apiKey:\s*["']([^"']+)["']|authDomain:\s*["']([^"']+)["']|projectId:\s*["']([^"']+)["']|storageBucket:\s*["']([^"']+)["']|messagingSenderId:\s*["']([^"']+)["']|appId:\s*["']([^"']+)["']/g;

      let match;
      const config = {};
      while ((match = configRegex.exec(content)) !== null) {
        if (match[1]) config.apiKey = match[1];
        if (match[2]) config.authDomain = match[2];
        if (match[3]) config.projectId = match[3];
        if (match[4]) config.storageBucket = match[4];
        if (match[5]) config.messagingSenderId = match[5];
        if (match[6]) config.appId = match[6];
      }

      if (Object.keys(config).length > 0) {
        log.success(`Found Firebase config in ${configPath}`);
        return config;
      }
    }
  }

  log.warning('Could not extract Firebase config from source files');
  return null;
}

// Create .env files
async function createEnvFiles(firebaseConfig) {
  log.header('📝 Creating Environment Files');

  // Generate master secret
  const masterSecret = Buffer.from('eatech-master-2025').toString('base64');
  const masterApiKey = crypto.randomBytes(32).toString('hex');

  for (const [app, config] of Object.entries(envTemplates)) {
    const envPath = path.join(process.cwd(), config.path);

    // Check if file already exists
    if (fs.existsSync(envPath)) {
      const overwrite = await question(`${colors.yellow}File ${config.path} already exists. Overwrite? (y/N): ${colors.reset}`);
      if (overwrite.toLowerCase() !== 'y') {
        log.info(`Skipping ${config.path}`);
        continue;
      }
    }

    // Replace placeholders
    let content = config.template;
    if (firebaseConfig) {
      content = content
        .replace('{{API_KEY}}', firebaseConfig.apiKey || 'YOUR_API_KEY_HERE')
        .replace('{{AUTH_DOMAIN}}', firebaseConfig.authDomain || 'YOUR_AUTH_DOMAIN_HERE')
        .replace('{{PROJECT_ID}}', firebaseConfig.projectId || 'YOUR_PROJECT_ID_HERE')
        .replace('{{STORAGE_BUCKET}}', firebaseConfig.storageBucket || 'YOUR_STORAGE_BUCKET_HERE')
        .replace('{{MESSAGING_SENDER_ID}}', firebaseConfig.messagingSenderId || 'YOUR_MESSAGING_SENDER_ID_HERE')
        .replace('{{APP_ID}}', firebaseConfig.appId || 'YOUR_APP_ID_HERE')
        .replace('{{MEASUREMENT_ID}}', firebaseConfig.measurementId || 'YOUR_MEASUREMENT_ID_HERE');
    }

    // Add master-specific values
    if (app === 'master') {
      content = content
        .replace('{{MASTER_API_KEY}}', masterApiKey)
        .replace('{{MASTER_SECRET}}', masterSecret);
    }

    // Create directory if it doesn't exist
    const dir = path.dirname(envPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(envPath, content);
    log.success(`Created ${config.path}`);
  }
}

// Update .gitignore
async function updateGitignore() {
  log.header('🔒 Updating .gitignore');

  const gitignorePath = path.join(process.cwd(), '.gitignore');
  let gitignoreContent = '';

  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  }

  const envPatterns = [
    '# Environment variables',
    '.env',
    '.env.local',
    '.env.production',
    '.env.development',
    '*.env',
    '',
    '# App-specific env files',
    'apps/*/.env',
    'apps/*/.env.local',
    'apps/*/.env.production',
    'apps/*/.env.development'
  ];

  // Check if patterns already exist
  const patternsToAdd = envPatterns.filter(pattern =>
    pattern === '' || !gitignoreContent.includes(pattern)
  );

  if (patternsToAdd.length > 0) {
    gitignoreContent += '\n' + patternsToAdd.join('\n') + '\n';
    fs.writeFileSync(gitignorePath, gitignoreContent);
    log.success('Updated .gitignore with environment file patterns');
  } else {
    log.info('.gitignore already contains environment file patterns');
  }
}

// Create backup of original files
async function backupOriginalFiles() {
  log.header('💾 Creating Backups');

  const backupDir = path.join(process.cwd(), 'backups', new Date().toISOString().split('T')[0]);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const filesToBackup = [
    'apps/admin/src/services/firebase/firebaseConfig.js',
    'apps/master/src/services/firebase/config.js',
    'apps/web/src/lib/firebase.ts'
  ];

  for (const file of filesToBackup) {
    const sourcePath = path.join(process.cwd(), file);
    if (fs.existsSync(sourcePath)) {
      const destPath = path.join(backupDir, file.replace(/\//g, '_'));
      fs.copyFileSync(sourcePath, destPath);
      log.success(`Backed up ${file}`);
    }
  }

  log.info(`Backups saved to ${backupDir}`);
}

// Main migration function
async function migrate() {
  console.clear();
  log.header('🚀 EATECH Environment Variable Migration Tool');
  console.log('This tool will help you migrate from hardcoded Firebase config to environment variables.\n');

  try {
    // Step 1: Extract existing config
    const firebaseConfig = await extractFirebaseConfig();

    if (!firebaseConfig) {
      log.warning('Could not extract Firebase config automatically.');
      const manual = await question('Would you like to enter the values manually? (y/N): ');

      if (manual.toLowerCase() === 'y') {
        firebaseConfig = {};
        firebaseConfig.apiKey = await question('Firebase API Key: ');
        firebaseConfig.authDomain = await question('Firebase Auth Domain: ');
        firebaseConfig.projectId = await question('Firebase Project ID: ');
        firebaseConfig.storageBucket = await question('Firebase Storage Bucket: ');
        firebaseConfig.messagingSenderId = await question('Firebase Messaging Sender ID: ');
        firebaseConfig.appId = await question('Firebase App ID: ');
        firebaseConfig.measurementId = await question('Firebase Measurement ID (optional): ');
      }
    }

    // Step 2: Create backup
    const backup = await question('\nCreate backup of original files? (Y/n): ');
    if (backup.toLowerCase() !== 'n') {
      await backupOriginalFiles();
    }

    // Step 3: Create .env files
    await createEnvFiles(firebaseConfig);

    // Step 4: Update .gitignore
    await updateGitignore();

    // Step 5: Show next steps
    log.header('✅ Migration Complete!');
    console.log('\nNext steps:');
    console.log('1. Review the generated .env.local files in each app directory');
    console.log('2. Add any missing values (marked as YOUR_XXX_HERE)');
    console.log('3. Copy .env.local to .env.production for production values');
    console.log('4. Update your Firebase config files to use the new environment variables');
    console.log('5. Test each app to ensure Firebase is connecting properly');
    console.log('\nImportant: Never commit .env files to version control!');

  } catch (error) {
    log.error(`Migration failed: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run migration
migrate();
