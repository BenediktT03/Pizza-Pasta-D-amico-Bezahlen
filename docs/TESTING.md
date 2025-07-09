# 🧪 EATECH Testing Guide

## Overview

This guide covers testing strategies, tools, and best practices for the EATECH platform. We maintain high code quality through comprehensive testing at all levels.

## Testing Philosophy

- **Test Pyramid**: More unit tests, fewer E2E tests
- **Test-Driven Development (TDD)**: Write tests first when possible
- **Continuous Testing**: Tests run on every commit
- **Real-World Scenarios**: Test actual user workflows
- **Performance Matters**: Test speed and optimization

## Testing Stack

- **Unit Testing**: Jest + React Testing Library
- **Integration Testing**: Jest + Firebase Emulators
- **E2E Testing**: Playwright
- **Performance Testing**: Lighthouse CI + k6
- **Visual Testing**: Chromatic + Storybook
- **Security Testing**: OWASP ZAP + Custom Scripts

## Testing Structure

```
tests/
├── unit/                 # Unit tests (colocated with source)
├── integration/          # Integration tests
├── e2e/                  # End-to-end tests
├── performance/          # Performance tests
├── security/             # Security tests
├── fixtures/             # Test data
├── utils/                # Test utilities
└── config/               # Test configurations
```

## Unit Testing

### Setup

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### Writing Unit Tests

#### Component Testing
```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button Component', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('handles click events', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Styled</Button>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });
});
```

#### Hook Testing
```typescript
// useAuth.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';
import { AuthProvider } from '@/contexts/AuthContext';

const wrapper = ({ children }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth Hook', () => {
  it('provides authentication state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('handles login', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.login('user@example.com', 'password123');
    });
    
    expect(result.current.user).toEqual({
      email: 'user@example.com',
      id: expect.any(String),
    });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('handles logout', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    // First login
    await act(async () => {
      await result.current.login('user@example.com', 'password123');
    });
    
    // Then logout
    await act(async () => {
      await result.current.logout();
    });
    
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
```

#### Service Testing
```typescript
// orderService.test.ts
import { createOrder, calculateTotal } from './orderService';
import { db } from '@/config/firebase';

jest.mock('@/config/firebase');

describe('Order Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateTotal', () => {
    it('calculates order total correctly', () => {
      const items = [
        { productId: '1', quantity: 2, price: 10.50 },
        { productId: '2', quantity: 1, price: 15.00 },
      ];
      
      const total = calculateTotal(items);
      expect(total).toBe(36.00);
    });

    it('applies tax correctly', () => {
      const items = [{ productId: '1', quantity: 1, price: 100 }];
      const total = calculateTotal(items, { taxRate: 0.077 });
      
      expect(total).toBe(107.70);
    });

    it('applies discount correctly', () => {
      const items = [{ productId: '1', quantity: 1, price: 100 }];
      const total = calculateTotal(items, { discount: 10 });
      
      expect(total).toBe(90.00);
    });
  });

  describe('createOrder', () => {
    it('creates order with valid data', async () => {
      const mockAdd = jest.fn().mockResolvedValue({ id: 'order123' });
      db.collection.mockReturnValue({ add: mockAdd });

      const orderData = {
        items: [{ productId: '1', quantity: 1 }],
        customerId: 'user123',
        total: 25.50,
      };

      const orderId = await createOrder(orderData);

      expect(mockAdd).toHaveBeenCalledWith({
        ...orderData,
        status: 'pending',
        createdAt: expect.any(Date),
      });
      expect(orderId).toBe('order123');
    });

    it('validates required fields', async () => {
      await expect(createOrder({})).rejects.toThrow('Items required');
    });
  });
});
```

### Testing Best Practices

#### Arrange-Act-Assert Pattern
```typescript
it('should update product price', () => {
  // Arrange
  const product = { id: '1', name: 'Pizza', price: 20 };
  const newPrice = 25;
  
  // Act
  const updated = updateProductPrice(product, newPrice);
  
  // Assert
  expect(updated.price).toBe(25);
  expect(updated.id).toBe('1'); // Unchanged
});
```

#### Test Data Builders
```typescript
// tests/builders/product.builder.ts
export class ProductBuilder {
  private product = {
    id: 'prod_' + Math.random(),
    name: 'Test Product',
    price: 10,
    category: 'food',
    available: true,
  };

  withName(name: string) {
    this.product.name = name;
    return this;
  }

  withPrice(price: number) {
    this.product.price = price;
    return this;
  }

  unavailable() {
    this.product.available = false;
    return this;
  }

  build() {
    return { ...this.product };
  }
}

// Usage in tests
const product = new ProductBuilder()
  .withName('Margherita Pizza')
  .withPrice(18.50)
  .build();
```

## Integration Testing

### Firebase Emulator Testing
```typescript
// tests/integration/auth.test.ts
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { signInWithEmailAndPassword } from 'firebase/auth';

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'eatech-test',
    auth: {
      host: 'localhost',
      port: 9099,
    },
    firestore: {
      host: 'localhost',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('Authentication Integration', () => {
  it('creates user account and profile', async () => {
    const email = 'test@example.com';
    const password = 'password123';
    
    // Create user
    const { user } = await testEnv.authenticatedContext('user123')
      .auth()
      .createUserWithEmailAndPassword(email, password);
    
    // Verify user profile created
    const profile = await testEnv
      .authenticatedContext(user.uid)
      .firestore()
      .collection('users')
      .doc(user.uid)
      .get();
    
    expect(profile.exists).toBe(true);
    expect(profile.data().email).toBe(email);
  });
});
```

### API Integration Testing
```typescript
// tests/integration/api.test.ts
import request from 'supertest';
import { app } from '@/server';
import { createTestUser, createTestToken } from '@/tests/utils';

describe('Orders API Integration', () => {
  let authToken;
  let testUser;

  beforeEach(async () => {
    testUser = await createTestUser();
    authToken = await createTestToken(testUser);
  });

  describe('POST /api/orders', () => {
    it('creates order successfully', async () => {
      const orderData = {
        items: [
          { productId: 'prod_123', quantity: 2 }
        ],
        deliveryMethod: 'pickup',
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        status: 'pending',
        items: orderData.items,
        total: expect.any(Number),
      });
    });

    it('validates order data', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ items: [] }) // Empty items
        .expect(422);

      expect(response.body.error).toContain('Items required');
    });

    it('requires authentication', async () => {
      await request(app)
        .post('/api/orders')
        .send({ items: [] })
        .expect(401);
    });
  });
});
```

## End-to-End Testing

### Playwright Setup
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test Examples

#### Customer Journey Test
```typescript
// tests/e2e/customer-journey.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Customer Order Journey', () => {
  test('complete order from menu to payment', async ({ page }) => {
    // Navigate to menu
    await page.goto('/menu');
    
    // Search for pizza
    await page.fill('[data-testid="search-input"]', 'Margherita');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Add to cart
    await page.click('[data-testid="product-margherita"] >> text=Add to Cart');
    
    // Verify cart updated
    await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');
    
    // Go to checkout
    await page.click('[data-testid="cart-button"]');
    await page.click('text=Proceed to Checkout');
    
    // Fill delivery info
    await page.fill('[name="name"]', 'Test Customer');
    await page.fill('[name="phone"]', '+41791234567');
    await page.selectOption('[name="deliveryMethod"]', 'pickup');
    
    // Select payment method
    await page.click('[data-testid="payment-twint"]');
    
    // Place order
    await page.click('[data-testid="place-order"]');
    
    // Verify order confirmation
    await expect(page).toHaveURL(/\/order\/[A-Z0-9]+/);
    await expect(page.locator('h1')).toContainText('Order Confirmed');
  });
});
```

#### Voice Ordering Test
```typescript
// tests/e2e/voice-ordering.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Voice Ordering', () => {
  test.use({
    permissions: ['microphone'],
  });

  test('order via voice command', async ({ page }) => {
    await page.goto('/');
    
    // Start voice ordering
    await page.click('[data-testid="voice-order-button"]');
    
    // Grant microphone permission and simulate voice input
    await page.evaluate(() => {
      // Mock speech recognition
      window.mockSpeechRecognition({
        transcript: 'Ich möchte eine Margherita Pizza bestellen',
        confidence: 0.95,
      });
    });
    
    // Trigger recognition
    await page.click('[data-testid="start-listening"]');
    
    // Wait for processing
    await page.waitForSelector('[data-testid="voice-result"]');
    
    // Verify interpretation
    await expect(page.locator('[data-testid="voice-result"]'))
      .toContainText('1x Margherita Pizza');
    
    // Confirm order
    await page.click('[data-testid="confirm-voice-order"]');
    
    // Verify added to cart
    await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');
  });
});
```

### Page Object Model
```typescript
// tests/e2e/pages/MenuPage.ts
export class MenuPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/menu');
  }

  async searchProducts(query: string) {
    await this.page.fill('[data-testid="search-input"]', query);
    await this.page.press('[data-testid="search-input"]', 'Enter');
  }

  async addProductToCart(productName: string) {
    await this.page
      .locator(`[data-testid="product-card"]`, { hasText: productName })
      .locator('[data-testid="add-to-cart"]')
      .click();
  }

  async filterByCategory(category: string) {
    await this.page.click(`[data-testid="category-${category}"]`);
  }

  async getProductCount() {
    return await this.page.locator('[data-testid="product-card"]').count();
  }
}

// Usage
test('filter products by category', async ({ page }) => {
  const menuPage = new MenuPage(page);
  await menuPage.goto();
  
  await menuPage.filterByCategory('pizza');
  const count = await menuPage.getProductCount();
  
  expect(count).toBeGreaterThan(0);
});
```

## Performance Testing

### Lighthouse CI
```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:5173/',
        'http://localhost:5173/menu',
        'http://localhost:5173/checkout',
      ],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:pwa': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'interactive': ['error', { maxNumericValue: 3500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

### Load Testing with k6
```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up more
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    errors: ['rate<0.1'],             // Error rate under 10%
  },
};

export default function () {
  // Browse menu
  const menuRes = http.get('https://api.eatech.ch/v1/products');
  check(menuRes, {
    'menu loaded': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 500,
  });
  errorRate.add(menuRes.status !== 200);
  
  sleep(1);
  
  // Create order
  const orderData = JSON.stringify({
    items: [{ productId: 'prod_123', quantity: 1 }],
    deliveryMethod: 'pickup',
  });
  
  const orderRes = http.post('https://api.eatech.ch/v1/orders', orderData, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + __ENV.AUTH_TOKEN,
    },
  });
  
  check(orderRes, {
    'order created': (r) => r.status === 201,
    'order has ID': (r) => JSON.parse(r.body).id !== undefined,
  });
  errorRate.add(orderRes.status !== 201);
  
  sleep(2);
}
```

## Visual Testing

### Storybook Setup
```typescript
// .storybook/main.js
module.exports = {
  stories: ['../packages/ui/src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};
```

### Component Stories
```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger'],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Click me',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Click me',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
};

export const WithEmoji: Story = {
  args: {
    children: '🍕 Order Pizza',
  },
};
```

### Visual Regression Testing
```bash
# Run Chromatic
npm run chromatic

# This captures snapshots and compares with baseline
```

## Security Testing

### OWASP ZAP Integration
```typescript
// tests/security/zap-scan.js
const ZAPClient = require('zaproxy');

const zapOptions = {
  apiKey: process.env.ZAP_API_KEY,
  proxy: 'http://localhost:8080',
};

const zap = new ZAPClient(zapOptions);

async function runSecurityScan() {
  // Spider the application
  await zap.spider.scan('https://app.eatech.ch', {
    maxChildren: 10,
    recurse: true,
  });
  
  // Active scan
  await zap.ascan.scan('https://app.eatech.ch', {
    recurse: true,
    inScopeOnly: false,
  });
  
  // Wait for scan to complete
  while (await zap.ascan.status() < 100) {
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  // Get results
  const alerts = await zap.core.alerts({
    baseurl: 'https://app.eatech.ch',
  });
  
  // Check for high-risk vulnerabilities
  const highRiskAlerts = alerts.filter(alert => alert.risk === 'High');
  if (highRiskAlerts.length > 0) {
    console.error('High-risk vulnerabilities found:', highRiskAlerts);
    process.exit(1);
  }
}
```

## Test Data Management

### Fixtures
```typescript
// tests/fixtures/products.ts
export const productFixtures = {
  margherita: {
    id: 'prod_margherita',
    name: { de: 'Margherita Pizza' },
    price: 18.50,
    category: 'pizza',
    available: true,
  },
  quattroStagioni: {
    id: 'prod_quattro',
    name: { de: 'Quattro Stagioni' },
    price: 22.00,
    category: 'pizza',
    available: true,
  },
};

// tests/fixtures/users.ts
export const userFixtures = {
  customer: {
    id: 'user_customer',
    email: 'customer@example.com',
    role: 'customer',
    profile: {
      name: 'Test Customer',
      language: 'de',
    },
  },
  admin: {
    id: 'user_admin',
    email: 'admin@eatech.ch',
    role: 'admin',
    permissions: ['*'],
  },
};
```

### Database Seeding
```typescript
// tests/utils/seed.ts
import { productFixtures } from '../fixtures/products';
import { userFixtures } from '../fixtures/users';

export async function seedTestDatabase() {
  // Clear existing data
  await clearCollections(['products', 'users', 'orders']);
  
  // Seed products
  for (const product of Object.values(productFixtures)) {
    await db.collection('products').doc(product.id).set(product);
  }
  
  // Seed users
  for (const user of Object.values(userFixtures)) {
    await db.collection('users').doc(user.id).set(user);
  }
}

export async function clearCollections(collections: string[]) {
  for (const collection of collections) {
    const snapshot = await db.collection(collection).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
}
```

## Continuous Integration

### GitHub Actions Test Pipeline
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:unit -- --coverage
      
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    services:
      firebase:
        image: stripe/firebase-emulator:latest
        ports:
          - 9099:9099  # Auth
          - 8080:8080  # Firestore
          - 5001:5001  # Functions
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Test Reporting

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# Open coverage report
open coverage/lcov-report/index.html
```

### Test Results Dashboard
```typescript
// jest.config.js
module.exports = {
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml',
    }],
    ['jest-html-reporter', {
      pageTitle: 'EATECH Test Report',
      outputPath: 'test-results/index.html',
    }],
  ],
};
```

## Testing Checklist

### Before Commit
- [ ] All unit tests pass
- [ ] New code has tests
- [ ] Coverage meets threshold (80%)
- [ ] No console.log statements
- [ ] No commented test code

### Before Pull Request
- [ ] Integration tests pass
- [ ] E2E tests pass locally
- [ ] Visual regression tests pass
- [ ] Performance budgets met
- [ ] No security vulnerabilities

### Before Release
- [ ] Full E2E suite passes
- [ ] Performance tests pass
- [ ] Security scan clean
- [ ] Load tests successful
- [ ] Cross-browser testing complete

## Debugging Tests

### Debug Unit Tests
```bash
# Run specific test file in debug mode
node --inspect-brk node_modules/.bin/jest path/to/test.js --runInBand

# Then attach VS Code debugger
```

### Debug E2E Tests
```bash
# Run Playwright in debug mode
npx playwright test --debug

# Run specific test with UI mode
npx playwright test customer-journey --ui
```

### Common Issues

#### Flaky Tests
```typescript
// Bad: Timing-dependent test
await page.click('button');
await page.waitForTimeout(1000); // Avoid!
expect(await page.textContent('.result')).toBe('Success');

// Good: Wait for specific condition
await page.click('button');
await page.waitForSelector('.result', { state: 'visible' });
expect(await page.textContent('.result')).toBe('Success');
```

#### Test Isolation
```typescript
// Ensure tests don't affect each other
beforeEach(async () => {
  // Reset database state
  await seedTestDatabase();
  
  // Clear local storage
  await page.evaluate(() => localStorage.clear());
  
  // Reset mocks
  jest.clearAllMocks();
});
```

---

Remember: Good tests make good software! 🧪✨
