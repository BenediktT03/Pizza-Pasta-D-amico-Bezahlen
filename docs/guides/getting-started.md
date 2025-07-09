# 🚀 Getting Started with EATECH

Welcome to EATECH! This guide will help you get up and running with the platform in under 30 minutes.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v20.x LTS or higher
- **npm** v10.x or higher
- **Git** for version control
- **VS Code** (recommended) or your preferred IDE
- **Firebase CLI** (`npm install -g firebase-tools`)

## Quick Start

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/eatech/eatech-v3.git

# Navigate to the project directory
cd eatech-v3

# Check Node version
node --version  # Should be v20.x or higher
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# This will automatically:
# - Install root dependencies
# - Bootstrap all packages
# - Set up git hooks
```

### 3. Firebase Setup

#### Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project"
3. Name it (e.g., "eatech-dev")
4. Enable Google Analytics (optional)
5. Wait for project creation

#### Enable Required Services

In your Firebase project, enable:

1. **Authentication**
   - Email/Password
   - Google Sign-In
   - Phone Authentication

2. **Firestore Database**
   - Start in test mode (for development)
   - Choose location: europe-west6 (Zurich)

3. **Storage**
   - Start in test mode
   - Same location as Firestore

4. **Functions**
   - Upgrade to Blaze plan (required for functions)

#### Get Configuration

1. Go to Project Settings → General
2. Scroll to "Your apps" → Add app → Web
3. Register app with nickname "EATECH Web"
4. Copy the configuration

### 4. Environment Configuration

Create `.env.local` files:

```bash
# Copy example files
cp .env.local.example .env.local
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
```

Update `.env.local` with your Firebase config:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Development Settings
VITE_USE_EMULATORS=true
VITE_API_URL=http://localhost:5001
```

### 5. Start Development

```bash
# Start Firebase emulators
npm run emulators

# In a new terminal, start the development servers
npm run dev

# This starts:
# - Customer Web App: http://localhost:5173
# - Admin Dashboard: http://localhost:5174
# - Kitchen Display: http://localhost:5176
# - Firebase Emulators UI: http://localhost:4000
```

## Project Structure Overview

```
eatech/
├── apps/                    # Applications
│   ├── web/                # Customer-facing app
│   ├── admin/              # Restaurant admin dashboard
│   ├── kitchen/            # Kitchen display system
│   └── master/             # Platform administration
├── packages/               # Shared packages
│   ├── core/              # Business logic & services
│   ├── ui/                # Reusable UI components
│   ├── types/             # TypeScript definitions
│   └── utils/             # Utility functions
└── services/              # Backend services
    ├── functions/         # Firebase Cloud Functions
    └── workers/           # Cloudflare Workers
```

## Your First Changes

### 1. Create a Simple Component

Create a new component in the UI package:

```typescript
// packages/ui/src/components/Welcome/Welcome.tsx
import React from 'react';
import styles from './Welcome.module.css';

interface WelcomeProps {
  name: string;
}

export const Welcome: React.FC<WelcomeProps> = ({ name }) => {
  return (
    <div className={styles.container}>
      <h1>Welcome to EATECH, {name}! 🍕</h1>
      <p>Start building amazing restaurant experiences.</p>
    </div>
  );
};
```

Create the styles:

```css
/* packages/ui/src/components/Welcome/Welcome.module.css */
.container {
  text-align: center;
  padding: 2rem;
  background-color: var(--color-primary-light);
  border-radius: 8px;
  margin: 2rem 0;
}
```

Export the component:

```typescript
// packages/ui/src/index.ts
export { Welcome } from './components/Welcome/Welcome';
```

### 2. Use the Component

Use your new component in the web app:

```typescript
// apps/web/src/pages/Home.tsx
import { Welcome } from '@eatech/ui';

export const Home = () => {
  return (
    <div>
      <Welcome name="Developer" />
      {/* Rest of your page */}
    </div>
  );
};
```

### 3. Test Your Changes

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests for specific package
npm run test:ui
```

## Common Development Tasks

### Adding a New Route

```typescript
// apps/web/src/router.tsx
import { NewPage } from './pages/NewPage';

const routes = [
  // ... existing routes
  {
    path: '/new-page',
    element: <NewPage />,
  },
];
```

### Creating an API Endpoint

```typescript
// services/functions/src/http/api.ts
app.get('/api/hello', authenticate, async (req, res) => {
  const { tenantId } = req.user;
  
  res.json({
    message: 'Hello from EATECH API',
    tenantId,
  });
});
```

### Adding a Firestore Collection

```typescript
// packages/types/src/models/example.ts
export interface Example {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// packages/core/src/services/example/example.service.ts
export class ExampleService {
  async create(data: Omit<Example, 'id'>): Promise<Example> {
    const doc = await db.collection('examples').add({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    return { id: doc.id, ...data };
  }
}
```

## Debugging Tips

### Enable Debug Mode

Add to your `.env.local`:

```env
VITE_DEBUG=true
```

This enables verbose logging throughout the application.

### Using Browser DevTools

1. **React DevTools**: Install the browser extension
2. **Network Tab**: Monitor API calls
3. **Console**: Check for errors and debug logs

### Firebase Emulator UI

Access the emulator UI at http://localhost:4000 to:
- View and edit Firestore data
- Check Authentication users
- Monitor Cloud Functions logs

## Best Practices

### 1. Type Safety

Always define types for your data:

```typescript
// Good
interface Product {
  id: string;
  name: string;
  price: number;
}

const product: Product = {
  id: '123',
  name: 'Pizza',
  price: 15.99,
};

// Avoid
const product = {
  id: '123',
  name: 'Pizza',
  price: 15.99,
}; // Type is inferred but not explicit
```

### 2. Component Organization

Keep components small and focused:

```typescript
// Good: Single responsibility
export const PriceDisplay: React.FC<{ price: number }> = ({ price }) => (
  <span className={styles.price}>CHF {price.toFixed(2)}</span>
);

// Avoid: Doing too much
export const ProductCard = ({ product, user, cart, ... }) => {
  // Hundreds of lines of code...
};
```

### 3. Use Shared Packages

Leverage the monorepo structure:

```typescript
// Good: Use shared utilities
import { formatCurrency } from '@eatech/utils';
import { Button } from '@eatech/ui';
import { Product } from '@eatech/types';

// Avoid: Duplicating code
const formatCurrency = (amount) => `CHF ${amount.toFixed(2)}`;
```

## Deployment Preview

To preview your changes in a production-like environment:

```bash
# Build all packages
npm run build

# Preview the build
npm run preview

# Run production build locally
npm run serve:prod
```

## Getting Help

### Resources

- **Documentation**: Check the `/docs` folder
- **Type Definitions**: Hover over any imported item in VS Code
- **Examples**: Look at existing implementations in the codebase

### Commands Reference

```bash
# Development
npm run dev              # Start all dev servers
npm run dev:web          # Start only web app
npm run emulators        # Start Firebase emulators

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report

# Building
npm run build            # Build all packages
npm run build:web        # Build specific app

# Linting & Formatting
npm run lint             # Check for linting errors
npm run lint:fix         # Fix linting errors
npm run format           # Format code with Prettier

# Type Checking
npm run type-check       # Check TypeScript types
```

## Next Steps

Now that you have EATECH running locally:

1. **Explore the Apps**: Try out the different applications
2. **Read the Architecture**: Understand how everything fits together
3. **Join the Community**: Connect with other developers
4. **Build Something**: Start with a small feature or improvement

### Suggested First Projects

1. **Add a new product category**: Extend the menu system
2. **Create a dashboard widget**: Add analytics to the admin panel
3. **Improve accessibility**: Add ARIA labels and keyboard navigation
4. **Write tests**: Increase code coverage for existing features

## Troubleshooting

### Common Issues

**Port already in use**
```bash
# Kill process on port
lsof -ti:5173 | xargs kill
```

**Module not found errors**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

**Firebase emulator issues**
```bash
# Reset emulator data
rm -rf .firebase/
npm run emulators
```

For more issues, check the [Troubleshooting Guide](../TROUBLESHOOTING.md).

---

Welcome to the EATECH community! We're excited to see what you'll build. 🚀

If you have questions, reach out on our [Slack channel](https://eatech.slack.com) or open a [GitHub issue](https://github.com/eatech/eatech-v3/issues).
