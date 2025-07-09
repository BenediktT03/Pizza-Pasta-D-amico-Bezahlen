#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const semver = require('semver');
const Table = require('cli-table3');

// Configuration
const config = {
  workspaces: ['apps/*', 'packages/*', 'services/*'],
  ignoreDeps: ['@types/node', 'typescript'], // Don't auto-update these
  groups: {
    react: ['react', 'react-dom', '@types/react', '@types/react-dom'],
    firebase: ['firebase', 'firebase-admin', 'firebase-functions'],
    testing: ['jest', '@testing-library/react', '@playwright/test', 'vitest'],
    build: ['vite', 'webpack', 'turbo', 'tsup', 'esbuild'],
    linting: ['eslint', 'prettier', '@typescript-eslint/*']
  }
};

class DependencyUpdater {
  constructor() {
    this.updates = [];
    this.errors = [];
    this.workspaces = this.findWorkspaces();
  }

  async run() {
    console.log(chalk.cyan.bold('\n📦 EATECH Dependency Update Tool\n'));

    // Check for outdated packages
    console.log(chalk.yellow('🔍 Checking for outdated dependencies...\n'));
    await this.checkOutdated();

    if (this.updates.length === 0) {
      console.log(chalk.green('✅ All dependencies are up to date!\n'));
      return;
    }

    // Display outdated packages
    this.displayOutdated();

    // Interactive update selection
    const updateStrategy = await this.selectUpdateStrategy();
    
    if (updateStrategy === 'none') {
      console.log(chalk.gray('\n👋 No updates selected. Exiting...\n'));
      return;
    }

    // Perform updates
    await this.performUpdates(updateStrategy);

    // Run tests after update
    if (await this.confirmRunTests()) {
      await this.runTests();
    }

    // Display summary
    this.displaySummary();
  }

  findWorkspaces() {
    const workspaces = [];
    
    // Root package.json
    workspaces.push({
      name: 'root',
      path: process.cwd(),
      packageJson: JSON.parse(fs.readFileSync('package.json', 'utf8'))
    });

    // Find all workspace packages
    config.workspaces.forEach(pattern => {
      const baseDir = pattern.replace('/*', '');
      if (fs.existsSync(baseDir)) {
        fs.readdirSync(baseDir).forEach(dir => {
          const pkgPath = path.join(baseDir, dir, 'package.json');
          if (fs.existsSync(pkgPath)) {
            workspaces.push({
              name: `${baseDir}/${dir}`,
              path: path.join(baseDir, dir),
              packageJson: JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
            });
          }
        });
      }
    });

    return workspaces;
  }

  async checkOutdated() {
    for (const workspace of this.workspaces) {
      try {
        const output = execSync('npm outdated --json', {
          cwd: workspace.path,
          encoding: 'utf8'
        });

        if (output) {
          const outdated = JSON.parse(output);
          Object.entries(outdated).forEach(([pkg, info]) => {
            if (!config.ignoreDeps.includes(pkg)) {
              this.updates.push({
                workspace: workspace.name,
                package: pkg,
                current: info.current,
                wanted: info.wanted,
                latest: info.latest,
                type: info.type,
                group: this.getPackageGroup(pkg)
              });
            }
          });
        }
      } catch (error) {
        // npm outdated returns non-zero exit code when packages are outdated
        if (error.stdout) {
          try {
            const outdated = JSON.parse(error.stdout);
            Object.entries(outdated).forEach(([pkg, info]) => {
              if (!config.ignoreDeps.includes(pkg)) {
                this.updates.push({
                  workspace: workspace.name,
                  package: pkg,
                  current: info.current,
                  wanted: info.wanted,
                  latest: info.latest,
                  type: info.type,
                  group: this.getPackageGroup(pkg)
                });
              }
            });
          } catch (parseError) {
            // Ignore parse errors
          }
        }
      }
    }
  }

  getPackageGroup(packageName) {
    for (const [group, packages] of Object.entries(config.groups)) {
      if (packages.some(pkg => {
        if (pkg.includes('*')) {
          const regex = new RegExp(pkg.replace('*', '.*'));
          return regex.test(packageName);
        }
        return pkg === packageName;
      })) {
        return group;
      }
    }
    return 'other';
  }

  displayOutdated() {
    const table = new Table({
      head: [
        chalk.cyan('Workspace'),
        chalk.cyan('Package'),
        chalk.cyan('Current'),
        chalk.cyan('Wanted'),
        chalk.cyan('Latest'),
        chalk.cyan('Type'),
        chalk.cyan('Group')
      ],
      style: { head: [], border: [] }
    });

    this.updates.forEach(update => {
      const isMajor = semver.major(update.latest) > semver.major(update.current);
      const latestColor = isMajor ? chalk.red : chalk.green;

      table.push([
        update.workspace,
        update.package,
        update.current,
        chalk.yellow(update.wanted),
        latestColor(update.latest),
        update.type,
        chalk.gray(update.group)
      ]);
    });

    console.log(table.toString());
    console.log(`\n📊 Found ${chalk.yellow(this.updates.length)} outdated dependencies\n`);
  }

  async selectUpdateStrategy() {
    const inquirer = await import('inquirer');
    
    const { strategy } = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'strategy',
        message: 'Select update strategy:',
        choices: [
          { name: '🔒 Safe updates only (patch + minor)', value: 'safe' },
          { name: '🚀 All updates including major', value: 'all' },
          { name: '🎯 Update by group', value: 'group' },
          { name: '✏️  Select individual packages', value: 'individual' },
          { name: '❌ Cancel', value: 'none' }
        ]
      }
    ]);

    if (strategy === 'group') {
      const groups = [...new Set(this.updates.map(u => u.group))];
      const { selectedGroups } = await inquirer.default.prompt([
        {
          type: 'checkbox',
          name: 'selectedGroups',
          message: 'Select groups to update:',
          choices: groups.map(g => ({ name: g, value: g }))
        }
      ]);
      return { strategy: 'group', groups: selectedGroups };
    }

    if (strategy === 'individual') {
      const { selectedPackages } = await inquirer.default.prompt([
        {
          type: 'checkbox',
          name: 'selectedPackages',
          message: 'Select packages to update:',
          choices: this.updates.map(u => ({
            name: `${u.package} (${u.current} → ${u.latest})`,
            value: u
          }))
        }
      ]);
      return { strategy: 'individual', packages: selectedPackages };
    }

    return strategy;
  }

  async performUpdates(strategy) {
    console.log(chalk.yellow('\n📥 Performing updates...\n'));

    let updates = [];

    if (typeof strategy === 'string') {
      switch (strategy) {
        case 'safe':
          updates = this.updates.filter(u => 
            !semver.major(u.latest) > semver.major(u.current)
          );
          break;
        case 'all':
          updates = this.updates;
          break;
      }
    } else if (strategy.strategy === 'group') {
      updates = this.updates.filter(u => strategy.groups.includes(u.group));
    } else if (strategy.strategy === 'individual') {
      updates = strategy.packages;
    }

    // Group updates by workspace
    const updatesByWorkspace = updates.reduce((acc, update) => {
      if (!acc[update.workspace]) acc[update.workspace] = [];
      acc[update.workspace].push(update);
      return acc;
    }, {});

    // Perform updates
    for (const [workspace, workspaceUpdates] of Object.entries(updatesByWorkspace)) {
      console.log(chalk.cyan(`\n📦 Updating ${workspace}...`));
      
      const packages = workspaceUpdates.map(u => `${u.package}@${u.latest}`).join(' ');
      const ws = this.workspaces.find(w => w.name === workspace);
      
      try {
        console.log(chalk.gray(`  Running: npm install ${packages}`));
        execSync(`npm install ${packages}`, {
          cwd: ws.path,
          stdio: 'inherit'
        });
        console.log(chalk.green(`  ✅ Updated ${workspaceUpdates.length} packages`));
      } catch (error) {
        console.log(chalk.red(`  ❌ Failed to update packages`));
        this.errors.push({ workspace, error: error.message });
      }
    }

    // Update lock file
    console.log(chalk.yellow('\n🔒 Updating lock file...'));
    try {
      execSync('npm install', { stdio: 'inherit' });
      console.log(chalk.green('✅ Lock file updated'));
    } catch (error) {
      console.log(chalk.red('❌ Failed to update lock file'));
    }
  }

  async confirmRunTests() {
    const inquirer = await import('inquirer');
    const { runTests } = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'runTests',
        message: 'Run tests to verify updates?',
        default: true
      }
    ]);
    return runTests;
  }

  async runTests() {
    console.log(chalk.yellow('\n🧪 Running tests...\n'));

    const testCommands = [
      { name: 'Type checking', cmd: 'npm run type-check' },
      { name: 'Linting', cmd: 'npm run lint' },
      { name: 'Unit tests', cmd: 'npm run test:unit' },
      { name: 'Build', cmd: 'npm run build' }
    ];

    for (const test of testCommands) {
      try {
        console.log(chalk.cyan(`Running ${test.name}...`));
        execSync(test.cmd, { stdio: 'inherit' });
        console.log(chalk.green(`✅ ${test.name} passed\n`));
      } catch (error) {
        console.log(chalk.red(`❌ ${test.name} failed\n`));
        this.errors.push({ test: test.name, error: 'Test failed' });
      }
    }
  }

  displaySummary() {
    console.log(chalk.cyan.bold('\n📊 Update Summary\n'));

    if (this.errors.length === 0) {
      console.log(chalk.green('✅ All updates completed successfully!'));
    } else {
      console.log(chalk.red(`❌ Completed with ${this.errors.length} errors:`));
      this.errors.forEach(error => {
        console.log(chalk.red(`  - ${error.workspace || error.test}: ${error.error}`));
      });
    }

    console.log(chalk.yellow('\n📝 Next steps:'));
    console.log(chalk.gray('  1. Review the changes in package.json files'));
    console.log(chalk.gray('  2. Test your application thoroughly'));
    console.log(chalk.gray('  3. Commit the updates: git add -A && git commit -m "chore: update dependencies"'));
    console.log('');
  }
}

// Additional utilities
async function checkSecurityVulnerabilities() {
  console.log(chalk.yellow('\n🔒 Checking for security vulnerabilities...\n'));
  
  try {
    execSync('npm audit', { stdio: 'inherit' });
  } catch (error) {
    console.log(chalk.red('\n⚠️  Security vulnerabilities found!'));
    console.log(chalk.yellow('Run "npm audit fix" to fix them\n'));
  }
}

async function cleanupNodeModules() {
  console.log(chalk.yellow('\n🧹 Cleaning up node_modules...\n'));
  
  const inquirer = await import('inquirer');
  const { confirm } = await inquirer.default.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'This will delete all node_modules folders. Continue?',
      default: false
    }
  ]);

  if (!confirm) return;

  const folders = [];
  function findNodeModules(dir) {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        if (item === 'node_modules') {
          folders.push(fullPath);
        } else if (item !== '.git') {
          findNodeModules(fullPath);
        }
      }
    });
  }

  findNodeModules(process.cwd());
  
  console.log(`Found ${folders.length} node_modules folders`);
  
  folders.forEach(folder => {
    console.log(chalk.gray(`  Removing ${folder}...`));
    fs.rmSync(folder, { recursive: true, force: true });
  });

  console.log(chalk.green('\n✅ Cleanup complete. Run "npm install" to reinstall\n'));
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'audit':
      await checkSecurityVulnerabilities();
      break;
    case 'clean':
      await cleanupNodeModules();
      break;
    default:
      const updater = new DependencyUpdater();
      await updater.run();
  }
}

// Run
main().catch(error => {
  console.error(chalk.red('❌ Error:'), error.message);
  process.exit(1);
});
