#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const Table = require('cli-table3');
const gzipSize = require('gzip-size');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

// Configuration
const config = {
  apps: ['web', 'admin', 'master', 'kitchen', 'landing'],
  budgets: {
    web: {
      total: 500 * 1024,      // 500 KB
      js: 300 * 1024,         // 300 KB
      css: 100 * 1024,        // 100 KB
      initial: 200 * 1024     // 200 KB initial load
    },
    admin: {
      total: 800 * 1024,      // 800 KB
      js: 500 * 1024,         // 500 KB
      css: 150 * 1024,        // 150 KB
      initial: 300 * 1024     // 300 KB initial load
    },
    master: {
      total: 600 * 1024,      // 600 KB
      js: 400 * 1024,         // 400 KB
      css: 100 * 1024,        // 100 KB
      initial: 250 * 1024     // 250 KB initial load
    },
    kitchen: {
      total: 400 * 1024,      // 400 KB
      js: 250 * 1024,         // 250 KB
      css: 80 * 1024,         // 80 KB
      initial: 150 * 1024     // 150 KB initial load
    },
    landing: {
      total: 300 * 1024,      // 300 KB
      js: 180 * 1024,         // 180 KB
      css: 80 * 1024,         // 80 KB
      initial: 100 * 1024     // 100 KB initial load
    }
  },
  criticalPackages: [
    'react',
    'react-dom',
    'firebase',
    '@tanstack/react-query',
    'zustand',
    'framer-motion'
  ]
};

class BundleAnalyzer {
  constructor() {
    this.results = new Map();
    this.recommendations = [];
  }

  async analyze() {
    console.log(chalk.cyan.bold('\n📊 EATECH Bundle Analyzer\n'));

    // Build all apps if not already built
    await this.buildApps();

    // Analyze each app
    for (const app of config.apps) {
      console.log(chalk.yellow(`\n🔍 Analyzing ${app} app...\n`));
      await this.analyzeApp(app);
    }

    // Display results
    this.displayResults();
    this.generateRecommendations();
    this.displayRecommendations();
    this.checkBudgets();

    // Export detailed report
    this.exportReport();
  }

  async buildApps() {
    console.log(chalk.yellow('🔨 Building apps for analysis...\n'));

    for (const app of config.apps) {
      const appPath = path.join('apps', app);
      if (!fs.existsSync(path.join(appPath, 'dist'))) {
        console.log(chalk.gray(`  Building ${app}...`));
        try {
          execSync('npm run build', {
            cwd: appPath,
            stdio: 'pipe'
          });
          console.log(chalk.green(`  ✅ ${app} built`));
        } catch (error) {
          console.log(chalk.red(`  ❌ Failed to build ${app}`));
        }
      } else {
        console.log(chalk.gray(`  ✓ ${app} already built`));
      }
    }
  }

  async analyzeApp(app) {
    const distPath = path.join('apps', app, 'dist');
    
    if (!fs.existsSync(distPath)) {
      console.log(chalk.red(`  ❌ No dist folder found for ${app}`));
      return;
    }

    const stats = {
      totalSize: 0,
      gzipSize: 0,
      files: [],
      chunks: [],
      modules: [],
      duplicates: [],
      largeModules: []
    };

    // Analyze all files
    this.analyzeDirectory(distPath, stats);

    // Parse Vite/Webpack stats if available
    const statsFile = path.join(distPath, 'stats.json');
    if (fs.existsSync(statsFile)) {
      const buildStats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
      this.parseBuildStats(buildStats, stats);
    }

    // Check for common issues
    this.checkCommonIssues(app, stats);

    this.results.set(app, stats);
  }

  analyzeDirectory(dir, stats, baseDir = dir) {
    const items = fs.readdirSync(dir);

    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        this.analyzeDirectory(fullPath, stats, baseDir);
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        const relativePath = path.relative(baseDir, fullPath);
        
        if (['.js', '.css', '.html'].includes(ext)) {
          const content = fs.readFileSync(fullPath);
          const size = stat.size;
          const gzipped = gzipSize.sync(content);

          stats.files.push({
            path: relativePath,
            size,
            gzipSize: gzipped,
            type: ext.slice(1)
          });

          stats.totalSize += size;
          stats.gzipSize += gzipped;

          // Check for large files
          if (gzipped > 50 * 1024) { // 50KB
            stats.largeModules.push({
              path: relativePath,
              size: gzipped,
              type: 'file'
            });
          }

          // Analyze JS files for imports
          if (ext === '.js') {
            this.analyzeJsFile(fullPath, content.toString(), stats);
          }
        }
      }
    });
  }

  analyzeJsFile(filePath, content, stats) {
    // Check for common large dependencies
    config.criticalPackages.forEach(pkg => {
      if (content.includes(pkg)) {
        if (!stats.modules.find(m => m.name === pkg)) {
          stats.modules.push({
            name: pkg,
            files: [filePath]
          });
        } else {
          const module = stats.modules.find(m => m.name === pkg);
          module.files.push(filePath);
        }
      }
    });

    // Check for duplicate code patterns
    const codePatterns = [
      /import\s+.*\s+from\s+['"]([^'"]+)['"]/g,
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
    ];

    codePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.includes('node_modules')) {
          const pkgName = importPath.split('node_modules/')[1].split('/')[0];
          if (!stats.duplicates.includes(pkgName)) {
            stats.duplicates.push(pkgName);
          }
        }
      }
    });
  }

  parseBuildStats(buildStats, stats) {
    // Parse Vite/Webpack specific stats
    if (buildStats.assets) {
      buildStats.assets.forEach(asset => {
        stats.chunks.push({
          name: asset.name,
          size: asset.size,
          chunkNames: asset.chunkNames || []
        });
      });
    }

    if (buildStats.modules) {
      buildStats.modules.forEach(module => {
        if (module.size > 10000) { // 10KB
          stats.largeModules.push({
            name: module.name,
            size: module.size,
            type: 'module'
          });
        }
      });
    }
  }

  checkCommonIssues(app, stats) {
    // Check for common bundle issues
    const issues = [];

    // Large bundle size
    if (stats.gzipSize > config.budgets[app].total) {
      issues.push({
        type: 'size',
        severity: 'error',
        message: `Bundle size exceeds budget: ${this.formatSize(stats.gzipSize)} > ${this.formatSize(config.budgets[app].total)}`
      });
    }

    // Duplicate dependencies
    if (stats.duplicates.length > 5) {
      issues.push({
        type: 'duplicates',
        severity: 'warning',
        message: `Found ${stats.duplicates.length} potentially duplicate dependencies`
      });
    }

    // Large modules
    stats.largeModules.forEach(module => {
      if (module.size > 100 * 1024) { // 100KB
        issues.push({
          type: 'large-module',
          severity: 'warning',
          message: `Large module: ${module.name || module.path} (${this.formatSize(module.size)})`
        });
      }
    });

    stats.issues = issues;
  }

  generateRecommendations() {
    for (const [app, stats] of this.results) {
      const recommendations = [];

      // Check for React in production mode
      const hasReactDev = stats.files.some(f => 
        f.path.includes('react') && f.path.includes('development')
      );
      if (hasReactDev) {
        recommendations.push({
          app,
          type: 'optimization',
          priority: 'high',
          message: 'React is running in development mode',
          solution: 'Ensure NODE_ENV=production when building'
        });
      }

      // Check for missing code splitting
      if (stats.files.filter(f => f.type === 'js').length < 3) {
        recommendations.push({
          app,
          type: 'optimization',
          priority: 'medium',
          message: 'Limited code splitting detected',
          solution: 'Use dynamic imports for routes and large components'
        });
      }

      // Check for large libraries
      const largeLibs = {
        'moment': 'Consider using date-fns or dayjs',
        'lodash': 'Use lodash-es and import only needed functions',
        'firebase': 'Import only required Firebase services',
        'rxjs': 'Import only required operators'
      };

      Object.entries(largeLibs).forEach(([lib, solution]) => {
        if (stats.modules.find(m => m.name === lib)) {
          recommendations.push({
            app,
            type: 'dependency',
            priority: 'medium',
            message: `Large library detected: ${lib}`,
            solution
          });
        }
      });

      // Check for missing compression
      const compressionRatio = stats.gzipSize / stats.totalSize;
      if (compressionRatio > 0.4) {
        recommendations.push({
          app,
          type: 'optimization',
          priority: 'low',
          message: 'Compression could be improved',
          solution: 'Enable better minification and tree-shaking'
        });
      }

      recommendations.forEach(rec => this.recommendations.push(rec));
    }
  }

  displayResults() {
    console.log(chalk.cyan.bold('\n📊 Bundle Analysis Results\n'));

    const summaryTable = new Table({
      head: [
        chalk.cyan('App'),
        chalk.cyan('Total Size'),
        chalk.cyan('Gzip Size'),
        chalk.cyan('Files'),
        chalk.cyan('Issues')
      ],
      style: { head: [], border: [] }
    });

    for (const [app, stats] of this.results) {
      summaryTable.push([
        app,
        this.formatSize(stats.totalSize),
        this.formatSize(stats.gzipSize),
        stats.files.length,
        stats.issues ? stats.issues.length : 0
      ]);
    }

    console.log(summaryTable.toString());

    // Detailed breakdown for each app
    for (const [app, stats] of this.results) {
      console.log(chalk.yellow(`\n📦 ${app} Breakdown:\n`));

      const fileTable = new Table({
        head: [chalk.cyan('File'), chalk.cyan('Size'), chalk.cyan('Gzip')],
        style: { head: [], border: [] }
      });

      // Show top 10 largest files
      const sortedFiles = [...stats.files]
        .sort((a, b) => b.gzipSize - a.gzipSize)
        .slice(0, 10);

      sortedFiles.forEach(file => {
        fileTable.push([
          file.path,
          this.formatSize(file.size),
          this.formatSize(file.gzipSize)
        ]);
      });

      console.log(fileTable.toString());
    }
  }

  displayRecommendations() {
    if (this.recommendations.length === 0) return;

    console.log(chalk.cyan.bold('\n💡 Recommendations\n'));

    const grouped = this.recommendations.reduce((acc, rec) => {
      if (!acc[rec.priority]) acc[rec.priority] = [];
      acc[rec.priority].push(rec);
      return acc;
    }, {});

    ['high', 'medium', 'low'].forEach(priority => {
      if (grouped[priority]) {
        console.log(chalk.yellow(`${priority.toUpperCase()} Priority:\n`));
        
        grouped[priority].forEach(rec => {
          const icon = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';
          console.log(`  ${icon} [${rec.app}] ${rec.message}`);
          console.log(chalk.gray(`     → ${rec.solution}\n`));
        });
      }
    });
  }

  checkBudgets() {
    console.log(chalk.cyan.bold('\n📏 Budget Status\n'));

    const budgetTable = new Table({
      head: [
        chalk.cyan('App'),
        chalk.cyan('Budget'),
        chalk.cyan('Actual'),
        chalk.cyan('Status'),
        chalk.cyan('Difference')
      ],
      style: { head: [], border: [] }
    });

    for (const [app, stats] of this.results) {
      const budget = config.budgets[app].total;
      const actual = stats.gzipSize;
      const status = actual <= budget ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
      const diff = actual - budget;
      const diffStr = diff > 0 
        ? chalk.red(`+${this.formatSize(diff)}`)
        : chalk.green(`-${this.formatSize(Math.abs(diff))}`);

      budgetTable.push([
        app,
        this.formatSize(budget),
        this.formatSize(actual),
        status,
        diffStr
      ]);
    }

    console.log(budgetTable.toString());
  }

  exportReport() {
    const report = {
      timestamp: new Date().toISOString(),
      results: Object.fromEntries(this.results),
      recommendations: this.recommendations,
      budgets: config.budgets
    };

    const reportPath = path.join(process.cwd(), 'bundle-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    this.generateHtmlReport(report);

    console.log(chalk.gray(`\n📄 Reports saved:`));
    console.log(chalk.gray(`   - JSON: ${reportPath}`));
    console.log(chalk.gray(`   - HTML: bundle-analysis-report.html\n`));
  }

  generateHtmlReport(report) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>EATECH Bundle Analysis Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 40px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 { color: #333; }
    h2 { color: #666; margin-top: 30px; }
    .metric {
      display: inline-block;
      margin: 10px 20px 10px 0;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 4px;
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #007bff;
    }
    .metric-label {
      font-size: 14px;
      color: #666;
    }
    .chart-container {
      position: relative;
      height: 400px;
      margin: 30px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
    }
    .status-pass { color: #28a745; }
    .status-fail { color: #dc3545; }
    .recommendation {
      margin: 15px 0;
      padding: 15px;
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      border-radius: 4px;
    }
    .rec-high { border-left-color: #dc3545; background: #f8d7da; }
    .rec-medium { border-left-color: #ffc107; background: #fff3cd; }
    .rec-low { border-left-color: #28a745; background: #d4edda; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔬 EATECH Bundle Analysis Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
    
    <h2>📊 Overview</h2>
    <div>
      ${Object.entries(report.results).map(([app, stats]) => `
        <div class="metric">
          <div class="metric-label">${app}</div>
          <div class="metric-value">${this.formatSize(stats.gzipSize)}</div>
        </div>
      `).join('')}
    </div>

    <h2>📈 Bundle Sizes</h2>
    <div class="chart-container">
      <canvas id="bundleChart"></canvas>
    </div>

    <h2>📏 Budget Status</h2>
    <table>
      <tr>
        <th>App</th>
        <th>Budget</th>
        <th>Actual</th>
        <th>Status</th>
      </tr>
      ${Object.entries(report.results).map(([app, stats]) => {
        const budget = report.budgets[app].total;
        const pass = stats.gzipSize <= budget;
        return `
          <tr>
            <td>${app}</td>
            <td>${this.formatSize(budget)}</td>
            <td>${this.formatSize(stats.gzipSize)}</td>
            <td class="${pass ? 'status-pass' : 'status-fail'}">
              ${pass ? '✅ PASS' : '❌ FAIL'}
            </td>
          </tr>
        `;
      }).join('')}
    </table>

    <h2>💡 Recommendations</h2>
    ${report.recommendations.map(rec => `
      <div class="recommendation rec-${rec.priority}">
        <strong>[${rec.app}]</strong> ${rec.message}<br>
        <small>→ ${rec.solution}</small>
      </div>
    `).join('')}

    <script>
      const ctx = document.getElementById('bundleChart').getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ${JSON.stringify(Object.keys(report.results))},
          datasets: [{
            label: 'Bundle Size (KB)',
            data: ${JSON.stringify(Object.values(report.results).map(s => Math.round(s.gzipSize / 1024)))},
            backgroundColor: '#007bff'
          }, {
            label: 'Budget (KB)',
            data: ${JSON.stringify(Object.keys(report.results).map(app => Math.round(report.budgets[app].total / 1024)))},
            backgroundColor: '#28a745'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
    </script>
  </div>
</body>
</html>
    `;

    fs.writeFileSync('bundle-analysis-report.html', html);
  }

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }
}

// Run webpack-bundle-analyzer for detailed view
async function runWebpackAnalyzer(app) {
  console.log(chalk.cyan(`\n🔍 Opening webpack-bundle-analyzer for ${app}...\n`));
  
  const statsFile = path.join('apps', app, 'dist', 'stats.json');
  
  if (!fs.existsSync(statsFile)) {
    console.log(chalk.red('❌ No stats.json found. Build with --stats flag first.'));
    return;
  }

  execSync(`npx webpack-bundle-analyzer ${statsFile}`, {
    stdio: 'inherit'
  });
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const app = args[1];

  switch (command) {
    case 'visualize':
      if (!app || !config.apps.includes(app)) {
        console.log(chalk.red('❌ Please specify a valid app: ' + config.apps.join(', ')));
        return;
      }
      await runWebpackAnalyzer(app);
      break;
    default:
      const analyzer = new BundleAnalyzer();
      await analyzer.analyze();
  }
}

// Run
main().catch(error => {
  console.error(chalk.red('❌ Error:'), error.message);
  process.exit(1);
});
