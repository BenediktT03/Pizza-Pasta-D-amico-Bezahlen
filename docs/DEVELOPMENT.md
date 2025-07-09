# 🛠️ EATECH Development Guide

## Getting Started

This guide will help you set up your development environment for working on the EATECH platform.

## Prerequisites

### Required Software
- **Node.js**: v20.x LTS (use `.nvmrc`)
- **npm**: v10.x or higher
- **Git**: Latest version
- **VS Code**: Recommended IDE
- **Firebase CLI**: `npm install -g firebase-tools`
- **Docker Desktop**: For local services

### Recommended VS Code Extensions
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "dsznajder.es7-react-js-snippets",
    "firefox-devtools.vscode-firefox-debug",
    "github.copilot",
    "eamodio.gitlens",
    "wix.vscode-import-cost",
    "styled-components.vscode-styled-components",
    "mikestead.dotenv"
  ]
}
```

## Initial Setup

### 1. Clone the Repository
```bash
git clone https://github.com/eatech/eatech-v3.git
cd eatech-v3
```

### 2. Install Node Version
```bash
# Using nvm
nvm install
nvm use

# Verify version
node --version # Should match .nvmrc
```

### 3. Install Dependencies
```bash
# Install all dependencies
npm install

# Bootstrap monorepo packages
npm run bootstrap

# Install git hooks
npm run prepare
```

### 4. Firebase Setup

#### Login to Firebase
```bash
firebase login
```

#### Select Project
```bash
# List available projects
firebase projects:list

# Use development project
firebase use eatech-dev
```

#### Start Emulators
```bash
# Start all emulators
npm run emulators

# Or start specific emulators
firebase emulators:start --only auth,firestore,functions
```

### 5. Environment Configuration

Copy example environment files:
```bash
# Root environment
cp .env.local.example .env.local

# App-specific environments
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
cp apps/master/.env.example apps/master/.env.local
cp apps/kitchen/.env.example apps/kitchen/.env.local
```

Update the `.env.local` files with your development values.

## Development Workflow

### Starting Development Servers

#### All Applications
```bash
# Start all apps in development mode
npm run dev

# This starts:
# - Web app: http://localhost:5173
# - Admin app: http://localhost:5174
# - Master app: http://localhost:5175
# - Kitchen app: http://localhost:5176
# - Landing page: http://localhost:5177
```

#### Individual Applications
```bash
# Web app only
npm run dev:web

# Admin dashboard only
npm run dev:admin

# Kitchen display only
npm run dev:kitchen
```

#### Backend Services
```bash
# Firebase emulators
npm run emulators

# Functions in watch mode
npm run serve:functions

# Workers locally
npm run dev:workers
```

### Code Structure

#### Creating a New Component
```bash
# Use the component generator
npm run generate:component Button

# This creates:
# - packages/ui/src/components/Button/Button.tsx
# - packages/ui/src/components/Button/Button.module.css
# - packages/ui/src/components/Button/Button.test.tsx
# - packages/ui/src/components/Button/index.ts
```

#### Component Template
```tsx
import React from 'react';
import { cn } from '@eatech/utils';
import styles from './ComponentName.module.css';

export interface ComponentNameProps {
  children: React.ReactNode;
  className?: string;
}

export const ComponentName: React.FC<ComponentNameProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={cn(styles.container, className)}>
      {children}
    </div>
  );
};

ComponentName.displayName = 'ComponentName';

export default ComponentName;
```

### Testing

#### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test Button.test.tsx

# Run tests for specific package
npm run test:web
npm run test:core
npm run test:ui
```

#### Writing Tests
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Linting and Formatting

#### Run Linters
```bash
# ESLint
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check
```

#### Format Code
```bash
# Format all files
npm run format

# Check formatting
npm run format:check
```

### Git Workflow

#### Branch Naming
- `feature/` - New features (e.g., `feature/voice-ordering`)
- `fix/` - Bug fixes (e.g., `fix/payment-error`)
- `chore/` - Maintenance tasks (e.g., `chore/update-deps`)
- `docs/` - Documentation (e.g., `docs/api-guide`)

#### Commit Messages
Follow conventional commits:
```bash
# Features
git commit -m "feat(voice): add Swiss German support"

# Fixes
git commit -m "fix(payment): resolve TWINT timeout issue"

# Documentation
git commit -m "docs(api): update authentication section"

# Chores
git commit -m "chore(deps): update React to v19"
```

#### Pull Request Process
1. Create feature branch from `develop`
2. Make changes and commit
3. Push branch and create PR
4. Ensure CI passes
5. Request review
6. Merge after approval

## Working with Packages

### Package Structure
```
packages/
├── core/          # Business logic and services
├── ui/            # Shared UI components
├── types/         # TypeScript types
├── utils/         # Utility functions
├── config/        # Configuration
└── testing/       # Testing utilities
```

### Using Packages
```typescript
// Import from packages
import { Button, Card } from '@eatech/ui';
import { useAuth, useFirestore } from '@eatech/core';
import { Order, Product } from '@eatech/types';
import { formatCurrency, validateEmail } from '@eatech/utils';
```

### Creating a New Package
```bash
# Create package structure
mkdir packages/new-package
cd packages/new-package

# Initialize package
npm init -y

# Update package.json name
# "@eatech/new-package"
```

## API Development

### Local API Testing
```bash
# Start functions emulator
firebase emulators:start --only functions

# API available at
# http://localhost:5001/eatech-dev/us-central1/api
```

### Using Thunder Client / Postman
Import the collection from `tests/api/eatech.postman_collection.json`

### Creating New Endpoints
```typescript
// services/functions/src/http/api.ts
app.get('/products', authenticate, async (req, res) => {
  try {
    const { tenantId } = req.user;
    const products = await getProducts(tenantId);
    res.json({ data: products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Database Development

### Firestore Emulator
```bash
# Start Firestore emulator
firebase emulators:start --only firestore

# Access UI at
# http://localhost:4000/firestore
```

### Security Rules Development
```javascript
// firestore.rules
match /tenants/{tenantId}/orders/{orderId} {
  allow read: if request.auth != null && 
    request.auth.token.tenantId == tenantId;
  allow write: if request.auth != null && 
    request.auth.token.tenantId == tenantId &&
    hasRole('admin');
}
```

### Data Modeling
```typescript
// Best practices for Firestore
interface Product {
  id: string;
  tenantId: string;
  name: LocalizedString; // Subcollection for translations
  price: Money; // Embedded object
  modifiers: Modifier[]; // Array of objects
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Performance Optimization

### Bundle Analysis
```bash
# Analyze bundle size
npm run analyze:web
npm run analyze:admin

# This opens a visual representation of the bundle
```

### Lighthouse Testing
```bash
# Run Lighthouse CI
npm run lighthouse

# Or use Chrome DevTools Lighthouse tab
```

### Performance Best Practices
1. **Code Splitting**: Use dynamic imports
2. **Lazy Loading**: Load components on demand
3. **Image Optimization**: Use WebP with fallbacks
4. **Caching**: Implement service worker caching
5. **Bundle Size**: Keep chunks under 250KB

## Debugging

### VS Code Debugging
Use the included `.vscode/launch.json` configurations:
- Debug Web App
- Debug Admin App
- Debug Functions
- Debug Tests

### React DevTools
```bash
# Install React DevTools
npm install -g react-devtools

# Run standalone DevTools
react-devtools
```

### Firebase Debugging
```bash
# Enable debug logging
firebase functions:log --debug

# Tail function logs
firebase functions:log --tail
```

## Common Issues

### Module Resolution
```bash
# Clear module cache
rm -rf node_modules
npm install
```

### TypeScript Errors
```bash
# Rebuild TypeScript
npm run build:types

# Check for type errors
npm run type-check
```

### Firebase Emulator Issues
```bash
# Kill all Java processes (emulators)
pkill -f java

# Clear emulator data
rm -rf .firebase/emulators/

# Restart emulators
npm run emulators
```

## Best Practices

### Code Style
1. Use functional components with hooks
2. Implement proper error boundaries
3. Use TypeScript strictly
4. Write tests for critical paths
5. Document complex logic

### State Management
```typescript
// Use Zustand for local state
const useCartStore = create((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ 
    items: [...state.items, item] 
  })),
}));

// Use React Query for server state
const { data, error, isLoading } = useQuery({
  queryKey: ['products', tenantId],
  queryFn: () => fetchProducts(tenantId),
});
```

### Error Handling
```typescript
// Consistent error handling
try {
  const result = await someOperation();
  return { success: true, data: result };
} catch (error) {
  console.error('Operation failed:', error);
  return { 
    success: false, 
    error: error.message,
    code: error.code || 'UNKNOWN_ERROR'
  };
}
```

### Security
1. Never commit secrets
2. Validate all inputs
3. Sanitize user content
4. Use proper CORS settings
5. Implement rate limiting

## Resources

### Documentation
- [React Docs](https://react.dev)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)
- [Firebase Docs](https://firebase.google.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

### Internal Resources
- [Architecture Guide](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- [Testing Guide](./TESTING.md)
- [Security Guidelines](./SECURITY.md)

### Community
- Slack: [eatech.slack.com](https://eatech.slack.com)
- GitHub Discussions: [github.com/eatech/discussions](https://github.com/eatech/discussions)

---

Happy coding! 🚀
