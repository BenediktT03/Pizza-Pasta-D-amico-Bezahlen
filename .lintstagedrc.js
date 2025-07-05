module.exports = {
  // JavaScript/TypeScript files
  '*.{js,jsx,ts,tsx}': [
    'eslint --fix',
    'prettier --write',
    'jest --bail --findRelatedTests --passWithNoTests'
  ],
  
  // CSS/SCSS files
  '*.{css,scss}': [
    'stylelint --fix',
    'prettier --write'
  ],
  
  // JSON/YAML files
  '*.{json,yml,yaml}': [
    'prettier --write'
  ],
  
  // Markdown files
  '*.md': [
    'prettier --write',
    'markdownlint --fix'
  ],
  
  // Package.json sorting
  'package.json': [
    'sort-package-json',
    'prettier --write'
  ],
  
  // Image optimization
  '*.{png,jpeg,jpg,gif,svg}': [
    'imagemin-lint-staged'
  ]
};