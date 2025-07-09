# Contributing to EATECH

🎉 First off, thanks for taking the time to contribute! 🎉

The following is a set of guidelines for contributing to EATECH and its packages, which are hosted in the [EATECH Organization](https://github.com/eatech) on GitHub.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How Can I Contribute?](#how-can-i-contribute)
- [Styleguides](#styleguides)
- [Commit Messages](#commit-messages)
- [Pull Requests](#pull-requests)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/eatech.git`
3. Add upstream remote: `git remote add upstream https://github.com/eatech/eatech.git`
4. Create a feature branch: `git checkout -b feature/amazing-feature`

## Development Setup

### Prerequisites

- Node.js 18.19.0+ (use `.nvmrc`)
- npm 9.0.0+
- Firebase CLI
- Git

### Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Start development
npm run dev
```

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# All tests with coverage
npm run test:all
```

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **Screenshots** (if applicable)
- **System details** (OS, browser, Node version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear title and description**
- **Use case** (why is this needed?)
- **Possible implementation**
- **Alternative solutions**

### Your First Code Contribution

Unsure where to begin? Look for issues labeled:

- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `documentation` - Documentation improvements

### Pull Requests

1. Follow the [styleguides](#styleguides)
2. Update documentation as needed
3. Add tests for new features
4. Ensure all tests pass
5. Update the CHANGELOG.md
6. Submit PR with clear description

## Styleguides

### Git Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Tests
- `chore`: Maintenance
- `ci`: CI/CD changes

Examples:
```bash
feat(voice): add Swiss German voice recognition
fix(payment): resolve Twint integration timeout
docs(api): update authentication endpoints
```

### TypeScript Styleguide

- Use TypeScript strict mode
- No `any` types (use `unknown` if needed)
- Prefer interfaces over types for objects
- Use meaningful variable names
- Document complex functions

```typescript
// Good
interface UserOrder {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  currency: 'CHF';
}

// Bad
type order = {
  id: any;
  items: any[];
}
```

### React/JSX Styleguide

- Use functional components with hooks
- One component per file
- Use TypeScript for all components
- Props interface/type must be defined

```tsx
// Good
interface ButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  onClick, 
  disabled = false, 
  children 
}) => {
  return (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
};
```

### CSS Styleguide

- Use CSS Modules for component styles
- Follow BEM naming when not using modules
- Mobile-first approach
- Use CSS variables for theming

```css
/* Good */
.button {
  --button-padding: 0.5rem 1rem;
  padding: var(--button-padding);
}

.button--primary {
  background-color: var(--color-primary);
}

/* Mobile-first */
.container {
  padding: 1rem;
}

@media (min-width: 768px) {
  .container {
    padding: 2rem;
  }
}
```

## Project Structure

```
eatech/
├── apps/           # Applications
├── packages/       # Shared packages
├── services/       # Backend services
├── docs/          # Documentation
└── tests/         # E2E tests
```

### Branch Strategy

- `main` - Production ready code
- `develop` - Development branch
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent fixes

## Testing Guidelines

- Write tests for all new features
- Maintain >80% code coverage
- Use meaningful test descriptions
- Test edge cases

```typescript
describe('OrderService', () => {
  describe('calculateTotal', () => {
    it('should calculate total with Swiss VAT', () => {
      // Test implementation
    });

    it('should handle empty cart', () => {
      // Test implementation
    });
  });
});
```

## Documentation

- Update README.md for significant changes
- Document all public APIs
- Include JSDoc for complex functions
- Update architecture docs for structural changes

## Review Process

All submissions require review:

1. Automated tests must pass
2. Code review by maintainer
3. Documentation updated
4. CHANGELOG.md updated

## Community

- 💬 [Discord](https://discord.gg/eatech)
- 📧 [Email](mailto:dev@eatech.ch)
- 🐦 [Twitter](https://twitter.com/eatech_ch)

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project website

Thank you for contributing to EATECH! 🚀🇨🇭
