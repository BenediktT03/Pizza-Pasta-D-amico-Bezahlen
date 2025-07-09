#!/usr/bin/env node

// Security Audit Script - Find Hardcoded Secrets
// Run: node scripts/security-audit.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
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
  header: (msg) => console.log(`\n${colors.bright}${colors.magenta}${msg}${colors.reset}\n`),
  detail: (msg) => console.log(`${colors.dim}   ${msg}${colors.reset}`)
};

// Patterns to search for potential secrets
const secretPatterns = [
  // API Keys
  { name: 'Firebase API Key', regex: /AIza[0-9A-Za-z\-_]{35}/g, severity: 'high' },
  { name: 'Generic API Key', regex: /api[_\-]?key[\s]*[:=][\s]*['"][0-9a-zA-Z\-_]{16,}['"]/gi, severity: 'medium' },
  { name: 'Stripe Key', regex: /(sk|pk)_(test|live)_[0-9a-zA-Z]{24,}/g, severity: 'critical' },
  { name: 'OpenAI Key', regex: /sk-[0-9a-zA-Z]{48}/g, severity: 'critical' },
  { name: 'AWS Key', regex: /AKIA[0-9A-Z]{16}/g, severity: 'critical' },

  // Auth & Tokens
  { name: 'Private Key', regex: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/g, severity: 'critical' },
  { name: 'OAuth Token', regex: /(oauth|bearer)[_\-\s]*token[\s]*[:=][\s]*['"][0-9a-zA-Z\-._~+\/]{16,}['"]/gi, severity: 'high' },
  { name: 'JWT Token', regex: /eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g, severity: 'medium' },

  // Database URLs
  { name: 'MongoDB URI', regex: /mongodb(\+srv)?:\/\/[^:]+:[^@]+@[^\/]+/g, severity: 'critical' },
  { name: 'PostgreSQL URL', regex: /postgres(ql)?:\/\/[^:]+:[^@]+@[^\/]+/g, severity: 'critical' },
  { name: 'Redis URL', regex: /redis:\/\/[^:]+:[^@]+@[^\/]+/g, severity: 'high' },

  // Firebase Specific
  { name: 'Firebase Project ID', regex: /projectId:\s*["'][a-z0-9\-]+["']/g, severity: 'low' },
  { name: 'Firebase Auth Domain', regex: /authDomain:\s*["'][a-z0-9\-]+\.firebaseapp\.com["']/g, severity: 'low' },
  { name: 'Firebase Storage', regex: /storageBucket:\s*["'][a-z0-9\-]+\.appspot\.com["']/g, severity: 'low' },

  // Other Secrets
  { name: 'Twilio Credentials', regex: /AC[a-z0-9]{32}|SK[a-z0-9]{32}/g, severity: 'high' },
  { name: 'SendGrid Key', regex: /SG\.[0-9a-zA-Z\-_]{22}\.[0-9a-zA-Z\-_]{43}/g, severity: 'high' },
  { name: 'Slack Webhook', regex: /https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[a-zA-Z0-9]+/g, severity: 'medium' },
  { name: 'Generic Secret', regex: /secret[\s]*[:=][\s]*['"][0-9a-zA-Z\-_]{8,}['"]/gi, severity: 'medium' },
  { name: 'Password', regex: /password[\s]*[:=][\s]*['"][^'"]{8,}['"]/gi, severity: 'high' }
];

// Files and directories to exclude
const excludePatterns = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  'public',
  '*.test.js',
  '*.spec.js',
  '*.test.ts',
  '*.spec.ts',
  '.env',
  '.env.*',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml'
];

// File extensions to scan
const includeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.json', '.yaml', '.yml', '.md'];

class SecurityAuditor {
  constructor() {
    this.findings = [];
    this.filesScanned = 0;
    this.startTime = Date.now();
  }

  shouldScanFile(filePath) {
    // Check if file should be excluded
    for (const pattern of excludePatterns) {
      if (filePath.includes(pattern) || filePath.endsWith(pattern)) {
        return false;
      }
    }

    // Check if file has includable extension
    const ext = path.extname(filePath);
    return includeExtensions.includes(ext);
  }

  scanFile(filePath) {
    if (!this.shouldScanFile(filePath)) return;

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      this.filesScanned++;

      // Check each pattern
      for (const pattern of secretPatterns) {
        const matches = content.match(pattern.regex);
        if (matches && matches.length > 0) {
          // Get line numbers for each match
          const lines = content.split('\n');
          matches.forEach(match => {
            let lineNumber = 1;
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].includes(match)) {
                lineNumber = i + 1;
                break;
              }
            }

            this.findings.push({
              file: filePath,
              line: lineNumber,
              pattern: pattern.name,
              severity: pattern.severity,
              match: this.maskSecret(match),
              context: this.getContext(lines, lineNumber - 1)
            });
          });
        }
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }

  maskSecret(secret) {
    if (secret.length <= 10) return secret;
    const visibleChars = 6;
    return secret.substring(0, visibleChars) + '...' + secret.substring(secret.length - visibleChars);
  }

  getContext(lines, lineIndex) {
    const start = Math.max(0, lineIndex - 1);
    const end = Math.min(lines.length, lineIndex + 2);
    return lines.slice(start, end).map((line, i) => ({
      number: start + i + 1,
      text: line.trim(),
      isTarget: i === lineIndex - start
    }));
  }

  scanDirectory(dirPath) {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory() && !excludePatterns.includes(item.name)) {
        this.scanDirectory(fullPath);
      } else if (item.isFile()) {
        this.scanFile(fullPath);
      }
    }
  }

  generateReport() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const groupedFindings = this.groupFindingsBySeverity();

    log.header('🔍 Security Audit Report');

    console.log(`Files scanned: ${colors.cyan}${this.filesScanned}${colors.reset}`);
    console.log(`Time taken: ${colors.cyan}${duration}s${colors.reset}`);
    console.log(`Total findings: ${colors.yellow}${this.findings.length}${colors.reset}\n`);

    // Summary by severity
    console.log(`${colors.bright}Summary by Severity:${colors.reset}`);
    console.log(`  Critical: ${colors.red}${groupedFindings.critical.length}${colors.reset}`);
    console.log(`  High: ${colors.yellow}${groupedFindings.high.length}${colors.reset}`);
    console.log(`  Medium: ${colors.blue}${groupedFindings.medium.length}${colors.reset}`);
    console.log(`  Low: ${colors.green}${groupedFindings.low.length}${colors.reset}\n`);

    // Detailed findings
    if (this.findings.length > 0) {
      log.header('📋 Detailed Findings');

      ['critical', 'high', 'medium', 'low'].forEach(severity => {
        const findings = groupedFindings[severity];
        if (findings.length > 0) {
          console.log(`\n${this.getSeverityColor(severity)}${colors.bright}${severity.toUpperCase()} SEVERITY${colors.reset}`);

          findings.forEach((finding, index) => {
            console.log(`\n${colors.bright}Finding #${index + 1}:${colors.reset} ${finding.pattern}`);
            console.log(`File: ${colors.cyan}${finding.file}:${finding.line}${colors.reset}`);
            console.log(`Match: ${colors.yellow}${finding.match}${colors.reset}`);

            if (finding.context) {
              console.log('Context:');
              finding.context.forEach(ctx => {
                const prefix = ctx.isTarget ? colors.red + '>' : ' ';
                console.log(`  ${prefix} ${colors.dim}${ctx.number}:${colors.reset} ${ctx.text}`);
              });
            }
          });
        }
      });
    } else {
      log.success('No potential secrets found! 🎉');
    }

    // Recommendations
    log.header('💡 Recommendations');
    console.log('1. Move all sensitive values to environment variables');
    console.log('2. Use .env files for local development');
    console.log('3. Use secure key management services for production');
    console.log('4. Add pre-commit hooks to prevent accidental commits');
    console.log('5. Regularly rotate all keys and secrets');
    console.log('6. Use tools like git-secrets or truffleHog in CI/CD\n');
  }

  groupFindingsBySeverity() {
    return {
      critical: this.findings.filter(f => f.severity === 'critical'),
      high: this.findings.filter(f => f.severity === 'high'),
      medium: this.findings.filter(f => f.severity === 'medium'),
      low: this.findings.filter(f => f.severity === 'low')
    };
  }

  getSeverityColor(severity) {
    switch (severity) {
      case 'critical': return colors.red;
      case 'high': return colors.yellow;
      case 'medium': return colors.blue;
      case 'low': return colors.green;
      default: return colors.reset;
    }
  }

  saveReport(outputPath) {
    const report = {
      timestamp: new Date().toISOString(),
      duration: ((Date.now() - this.startTime) / 1000).toFixed(2),
      filesScanned: this.filesScanned,
      totalFindings: this.findings.length,
      findings: this.findings,
      summary: {
        critical: this.findings.filter(f => f.severity === 'critical').length,
        high: this.findings.filter(f => f.severity === 'high').length,
        medium: this.findings.filter(f => f.severity === 'medium').length,
        low: this.findings.filter(f => f.severity === 'low').length
      }
    };

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    log.success(`Report saved to ${outputPath}`);
  }
}

// Check if git is available
function checkGitStatus() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      log.warning('Uncommitted changes detected. Consider committing before running audit.');
    }
  } catch (error) {
    log.warning('Git not available or not a git repository');
  }
}

// Main function
async function main() {
  console.clear();
  log.header('🛡️  EATECH Security Audit Tool');
  console.log('Scanning for hardcoded secrets and sensitive information...\n');

  // Check git status
  checkGitStatus();

  // Create auditor and run scan
  const auditor = new SecurityAuditor();
  const rootPath = process.cwd();

  log.info(`Starting scan from: ${rootPath}`);
  auditor.scanDirectory(rootPath);

  // Generate report
  auditor.generateReport();

  // Save JSON report
  const reportPath = path.join(rootPath, 'security-audit-report.json');
  auditor.saveReport(reportPath);

  // Exit with error code if critical findings
  const criticalCount = auditor.findings.filter(f => f.severity === 'critical').length;
  if (criticalCount > 0) {
    log.error(`\nFound ${criticalCount} critical security issues! Fix these immediately.`);
    process.exit(1);
  }
}

// Run audit
main().catch(error => {
  log.error(`Audit failed: ${error.message}`);
  process.exit(1);
});
