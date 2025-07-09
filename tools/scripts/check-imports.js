#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const chalk = require('chalk');
const Table = require('cli-table3');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

// Configuration
const config = {
  sourcePatterns: [
    'apps/*/src/**/*.{ts,tsx,js,jsx}',
    'packages/*/src/**/*.{ts,tsx,js,jsx}'
  ],
  ignorePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/*.test.*',
    '**/*.spec.*',
    '**/*.stories.*'
  ],
  aliases: {
    '@': 'src',
    '@components': 'src/components',
    '@services': 'src/services',
    '@utils': 'src/utils',
    '@hooks': 'src/hooks',
    '@stores': 'src/stores',
    '@types': 'src/types',
    '@config': 'src/config',
    '@eatech/core': 'packages/core/src',
    '@eatech/ui': 'packages/ui/src',
    '@eatech/types': 'packages/types/src',
    '@eatech/utils': 'packages/utils/src'
  },
  rules: {
    noCircularDependencies: true,
    noUnusedImports: true,
    noDuplicateImports: true,
    enforceImportOrder: true,
    noRestrictedImports: {
      patterns: [
        {
          pattern: 'apps/*/src/**',
          message: 'Direct imports between apps are not allowed'
        },
        {
          pattern: '../../../',
          message: 'Avoid deep relative imports, use aliases instead'
        }
      ]
    },
    importGroups: [
      'builtin',      // Node.js built-in modules
      'external',     // External packages
      'internal',     // Internal packages (@eatech/*)
      'parent',       // Parent imports
      'sibling',      // Sibling imports
      'index',        // Index imports
      'type'          // Type imports
    ]
  }
};

class ImportAnalyzer {
  constructor() {
    this.imports = new Map();
    this.errors = [];
    this.warnings = [];
    this.dependencies = new Map();
  }

  async analyze() {
    console.log(chalk.cyan.bold('\n🔍 EATECH Import Analyzer\n'));

    // Find all source files
    const files = this.findSourceFiles();
    console.log(chalk.gray(`Found ${files.length} files to analyze\n`));

    // Analyze each file
    for (const file of files) {
      await this.analyzeFile(file);
    }

    // Run checks
    this.checkCircularDependencies();
    this.checkUnusedImports();
    this.checkDuplicateImports();
    this.checkRestrictedImports();
    this.checkImportOrder();

    // Display results
    this.displayResults();
  }

  findSourceFiles() {
    const files = [];
    
    config.sourcePatterns.forEach(pattern => {
      const matches = glob.sync(pattern, {
        ignore: config.ignorePatterns
      });
      files.push(...matches);
    });

    return files;
  }

  async analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const ast = parse(content, {
        sourceType: 'module',
        plugins: [
          'typescript',
          'jsx',
          'decorators-legacy',
          'classProperties',
          'dynamicImport'
        ]
      });

      const imports = [];
      const exports = [];

      traverse(ast, {
        ImportDeclaration(path) {
          const source = path.node.source.value;
          const specifiers = path.node.specifiers.map(spec => {
            if (spec.type === 'ImportDefaultSpecifier') {
              return { name: 'default', local: spec.local.name };
            } else if (spec.type === 'ImportSpecifier') {
              return { name: spec.imported.name, local: spec.local.name };
            } else if (spec.type === 'ImportNamespaceSpecifier') {
              return { name: '*', local: spec.local.name };
            }
          });

          imports.push({
            source,
            specifiers,
            line: path.node.loc.start.line,
            type: this.getImportType(source, filePath)
          });
        },

        ExportNamedDeclaration(path) {
          if (path.node.declaration) {
            if (path.node.declaration.id) {
              exports.push(path.node.declaration.id.name);
            }
          }
          if (path.node.specifiers) {
            path.node.specifiers.forEach(spec => {
              exports.push(spec.exported.name);
            });
          }
        },

        ExportDefaultDeclaration() {
          exports.push('default');
        },

        CallExpression(path) {
          // Check for dynamic imports
          if (path.node.callee.type === 'Import') {
            const source = path.node.arguments[0].value;
            imports.push({
              source,
              specifiers: [],
              line: path.node.loc.start.line,
              type: 'dynamic',
              isDynamic: true
            });
          }
        }
      });

      this.imports.set(filePath, { imports, exports });
      
      // Build dependency graph
      imports.forEach(imp => {
        const resolvedPath = this.resolveImportPath(imp.source, filePath);
        if (resolvedPath) {
          if (!this.dependencies.has(filePath)) {
            this.dependencies.set(filePath, new Set());
          }
          this.dependencies.get(filePath).add(resolvedPath);
        }
      });

    } catch (error) {
      this.errors.push({
        file: filePath,
        message: `Failed to parse: ${error.message}`
      });
    }
  }

  getImportType(importPath, filePath) {
    if (importPath.startsWith('.')) return 'relative';
    if (importPath.startsWith('@eatech/')) return 'internal';
    if (importPath.startsWith('@/')) return 'alias';
    if (path.isAbsolute(importPath)) return 'absolute';
    if (this.isNodeBuiltin(importPath)) return 'builtin';
    return 'external';
  }

  isNodeBuiltin(module) {
    const builtins = [
      'fs', 'path', 'http', 'https', 'crypto', 'os', 'util', 'stream',
      'child_process', 'cluster', 'dns', 'events', 'net', 'querystring',
      'readline', 'repl', 'tls', 'url', 'vm', 'zlib'
    ];
    return builtins.includes(module.split('/')[0]);
  }

  resolveImportPath(importPath, fromFile) {
    // Handle aliases
    for (const [alias, target] of Object.entries(config.aliases)) {
      if (importPath.startsWith(alias)) {
        importPath = importPath.replace(alias, target);
      }
    }

    // Handle relative imports
    if (importPath.startsWith('.')) {
      const dir = path.dirname(fromFile);
      const resolved = path.resolve(dir, importPath);
      
      // Try different extensions
      const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
      for (const ext of extensions) {
        const fullPath = resolved + ext;
        if (fs.existsSync(fullPath)) {
          return fullPath;
        }
      }
      
      if (fs.existsSync(resolved)) {
        return resolved;
      }
    }

    return null;
  }

  checkCircularDependencies() {
    if (!config.rules.noCircularDependencies) return;

    console.log(chalk.yellow('🔄 Checking for circular dependencies...'));

    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];

    const detectCycle = (node, path = []) => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const dependencies = this.dependencies.get(node) || new Set();
      
      for (const dep of dependencies) {
        if (!visited.has(dep)) {
          detectCycle(dep, [...path]);
        } else if (recursionStack.has(dep)) {
          const cycleStart = path.indexOf(dep);
          const cycle = path.slice(cycleStart);
          cycle.push(dep);
          cycles.push(cycle);
        }
      }

      recursionStack.delete(node);
    };

    for (const [file] of this.dependencies) {
      if (!visited.has(file)) {
        detectCycle(file);
      }
    }

    cycles.forEach(cycle => {
      this.errors.push({
        type: 'circular-dependency',
        message: 'Circular dependency detected',
        files: cycle.map(f => path.relative(process.cwd(), f))
      });
    });
  }

  checkUnusedImports() {
    if (!config.rules.noUnusedImports) return;

    console.log(chalk.yellow('🗑️  Checking for unused imports...'));

    for (const [file, data] of this.imports) {
      const content = fs.readFileSync(file, 'utf8');
      
      data.imports.forEach(imp => {
        imp.specifiers.forEach(spec => {
          const regex = new RegExp(`\\b${spec.local}\\b`, 'g');
          const matches = content.match(regex);
          
          // Count should be > 1 (the import itself counts as 1)
          if (!matches || matches.length <= 1) {
            this.warnings.push({
              type: 'unused-import',
              file: path.relative(process.cwd(), file),
              line: imp.line,
              message: `Unused import: ${spec.local} from '${imp.source}'`
            });
          }
        });
      });
    }
  }

  checkDuplicateImports() {
    if (!config.rules.noDuplicateImports) return;

    console.log(chalk.yellow('👥 Checking for duplicate imports...'));

    for (const [file, data] of this.imports) {
      const sources = new Map();
      
      data.imports.forEach(imp => {
        if (!imp.isDynamic) {
          if (sources.has(imp.source)) {
            this.warnings.push({
              type: 'duplicate-import',
              file: path.relative(process.cwd(), file),
              line: imp.line,
              message: `Duplicate import from '${imp.source}'`
            });
          } else {
            sources.set(imp.source, imp);
          }
        }
      });
    }
  }

  checkRestrictedImports() {
    if (!config.rules.noRestrictedImports) return;

    console.log(chalk.yellow('🚫 Checking for restricted imports...'));

    for (const [file, data] of this.imports) {
      data.imports.forEach(imp => {
        config.rules.noRestrictedImports.patterns.forEach(restriction => {
          if (imp.source.match(restriction.pattern)) {
            this.errors.push({
              type: 'restricted-import',
              file: path.relative(process.cwd(), file),
              line: imp.line,
              message: `${restriction.message}: '${imp.source}'`
            });
          }
        });
      });
    }
  }

  checkImportOrder() {
    if (!config.rules.enforceImportOrder) return;

    console.log(chalk.yellow('📝 Checking import order...'));

    for (const [file, data] of this.imports) {
      let lastGroupIndex = -1;
      
      data.imports.forEach(imp => {
        const groupIndex = config.rules.importGroups.indexOf(imp.type);
        
        if (groupIndex < lastGroupIndex) {
          this.warnings.push({
            type: 'import-order',
            file: path.relative(process.cwd(), file),
            line: imp.line,
            message: `Import '${imp.source}' is not in the correct order`
          });
        }
        
        if (groupIndex !== -1) {
          lastGroupIndex = groupIndex;
        }
      });
    }
  }

  displayResults() {
    console.log('\n' + chalk.cyan.bold('📊 Analysis Results\n'));

    // Summary
    const table = new Table({
      head: [chalk.cyan('Metric'), chalk.cyan('Count')],
      style: { head: [], border: [] }
    });

    table.push(
      ['Total files analyzed', this.imports.size],
      ['Total imports', Array.from(this.imports.values()).reduce((sum, f) => sum + f.imports.length, 0)],
      ['Errors', chalk.red(this.errors.length)],
      ['Warnings', chalk.yellow(this.warnings.length)]
    );

    console.log(table.toString());

    // Errors
    if (this.errors.length > 0) {
      console.log(chalk.red.bold('\n❌ Errors:\n'));
      
      this.errors.forEach(error => {
        if (error.type === 'circular-dependency') {
          console.log(chalk.red('  Circular dependency:'));
          error.files.forEach((file, index) => {
            console.log(chalk.red(`    ${index === 0 ? '┌' : index === error.files.length - 1 ? '└' : '├'}─ ${file}`));
          });
        } else {
          console.log(chalk.red(`  ${error.file}:${error.line || '?'} - ${error.message}`));
        }
      });
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log(chalk.yellow.bold('\n⚠️  Warnings:\n'));
      
      this.warnings.forEach(warning => {
        console.log(chalk.yellow(`  ${warning.file}:${warning.line} - ${warning.message}`));
      });
    }

    // Success
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(chalk.green.bold('\n✅ All import checks passed!\n'));
    }

    // Export detailed report
    this.exportReport();
  }

  exportReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        filesAnalyzed: this.imports.size,
        totalImports: Array.from(this.imports.values()).reduce((sum, f) => sum + f.imports.length, 0),
        errors: this.errors.length,
        warnings: this.warnings.length
      },
      errors: this.errors,
      warnings: this.warnings,
      dependencies: Object.fromEntries(
        Array.from(this.dependencies.entries()).map(([file, deps]) => [
          path.relative(process.cwd(), file),
          Array.from(deps).map(d => path.relative(process.cwd(), d))
        ])
      )
    };

    const reportPath = path.join(process.cwd(), 'import-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(chalk.gray(`\n📄 Detailed report saved to: ${reportPath}\n`));
  }
}

// Additional utilities
function generateImportGraph() {
  console.log(chalk.cyan('\n📊 Generating import graph...\n'));
  
  const analyzer = new ImportAnalyzer();
  analyzer.findSourceFiles().forEach(file => analyzer.analyzeFile(file));
  
  // Generate DOT format for Graphviz
  let dot = 'digraph ImportGraph {\n';
  dot += '  rankdir=LR;\n';
  dot += '  node [shape=box];\n\n';
  
  for (const [file, deps] of analyzer.dependencies) {
    const shortFile = path.relative(process.cwd(), file).replace(/\\/g, '/');
    deps.forEach(dep => {
      const shortDep = path.relative(process.cwd(), dep).replace(/\\/g, '/');
      dot += `  "${shortFile}" -> "${shortDep}";\n`;
    });
  }
  
  dot += '}\n';
  
  fs.writeFileSync('import-graph.dot', dot);
  console.log(chalk.green('✅ Import graph saved to import-graph.dot'));
  console.log(chalk.gray('   View with: dot -Tsvg import-graph.dot -o import-graph.svg\n'));
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'graph':
      generateImportGraph();
      break;
    case 'fix':
      console.log(chalk.yellow('Auto-fix feature coming soon...'));
      break;
    default:
      const analyzer = new ImportAnalyzer();
      await analyzer.analyze();
      
      if (analyzer.errors.length > 0) {
        process.exit(1);
      }
  }
}

// Run
main().catch(error => {
  console.error(chalk.red('❌ Error:'), error.message);
  process.exit(1);
});
