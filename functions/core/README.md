# @eatech/core

> Shared business logic and services for EATECH platform

## Overview

The Core package contains all shared business logic, models, services, and utilities used across the EATECH platform. It provides a centralized location for:

- Firebase configuration and services
- Data models and validation schemas
- Business logic and calculations
- API service layers
- Utility functions
- Constants and configurations

## Installation

This package is part of the EATECH monorepo and is automatically available to all apps:

```bash
# From root of monorepo
npm install
```

## Usage

### Firebase Services

```javascript
import { db, auth, storage, collections } from '@eatech/core/config/firebase';

// Use Firestore
const tenants = await db.collection(collections.tenants).get();

// Use Auth
const user = await auth.currentUser;

// Use Storage
const url = await storage.ref('images/logo.png').getDownloadURL();
```

### Models

```javascript
import { Order, Product, Customer } from '@eatech/core/models';

// Create new order
const order = new Order({
  tenantId: 'tenant123',
  customerId: 'customer456',
  items: []
});

// Validate order
const isValid = order.validate();
```

### Services

```javascript
import { AuthService, PaymentService, NotificationService } from '@eatech/core/services';

// Authentication
await AuthService.login(email, password);
await AuthService.logout();

// Payments
await PaymentService.processPayment(order, paymentMethod);

// Notifications
await NotificationService.sendOrderConfirmation(order);
```

### Utilities

```javascript
import { formatPrice, validateEmail, calculateDistance } from '@eatech/core/utils';

// Format price in CHF
const price = formatPrice(25.50); // "CHF 25.50"

// Validate email
const isValid = validateEmail('user@example.com');

// Calculate distance
const distance = calculateDistance(coord1, coord2); // in km
```

## Structure

```
packages/core/
├── src/
│   ├── config/         # Configuration files
│   │   ├── firebase.js # Firebase setup
│   │   ├── constants.js
│   │   └── environment.js
│   ├── models/         # Data models
│   │   ├── Order.js
│   │   ├── Product.js
│   │   ├── Customer.js
│   │   ├── Tenant.js
│   │   └── Event.js
│   ├── services/       # Business services
│   │   ├── auth/
│   │   ├── database/
│   │   ├── payment/
│   │   ├── notification/
│   │   └── cdn/
│   ├── utils/          # Utility functions
│   │   ├── validators.js
│   │   ├── formatters.js
│   │   ├── calculations.js
│   │   └── helpers.js
│   └── index.js        # Main export
└── package.json
```

## Key Features

### 1. Firebase Integration
- Pre-configured Firebase services
- Emulator support for development
- Type-safe collection references
- Optimized for performance

### 2. Data Models
- Strongly typed models
- Built-in validation
- Serialization/deserialization
- Relationships handling

### 3. Business Logic
- Order calculations
- Pricing algorithms
- Tax calculations
- Distance calculations
- Opening hours logic

### 4. Payment Processing
- Stripe integration
- Twint support
- Invoice generation
- Payment validation

### 5. Notifications
- Email templates
- SMS integration
- Push notifications
- Multi-language support

## API Reference

### Firebase Config

```javascript
// Services
export const app;        // Firebase app instance
export const auth;       // Auth service
export const db;         // Firestore
export const storage;    // Cloud Storage
export const functions;  // Cloud Functions
export const rtdb;       // Realtime Database

// Helpers
export const collections;  // Collection names
export const timestamp;    // Server timestamp
export const isEmulator;   // Check if using emulator
```

### Models

```javascript
// Order Model
class Order {
  constructor(data);
  validate();
  calculateTotal();
  addItem(product, quantity, options);
  removeItem(itemId);
  updateStatus(status);
  toFirestore();
  static fromFirestore(doc);
}

// Product Model
class Product {
  constructor(data);
  validate();
  isAvailable();
  updateStock(quantity);
  calculatePrice(options);
  toFirestore();
  static fromFirestore(doc);
}

// Customer Model
class Customer {
  constructor(data);
  validate();
  addFavorite(productId);
  removeFavorite(productId);
  updateLoyaltyPoints(points);
  toFirestore();
  static fromFirestore(doc);
}
```

### Services

```javascript
// Auth Service
AuthService.login(email, password);
AuthService.logout();
AuthService.register(userData);
AuthService.resetPassword(email);
AuthService.updateProfile(data);

// Payment Service
PaymentService.createPaymentIntent(amount);
PaymentService.processPayment(order, method);
PaymentService.refund(paymentId, amount);
PaymentService.validateCard(cardData);

// Notification Service
NotificationService.sendEmail(template, data);
NotificationService.sendSMS(phone, message);
NotificationService.sendPush(userId, notification);
NotificationService.sendOrderUpdate(order);
```

### Utilities

```javascript
// Validators
validateEmail(email);
validatePhone(phone);
validateSwissPostalCode(code);
validateIBAN(iban);

// Formatters
formatPrice(amount, currency);
formatDate(date, format);
formatPhone(phone);
formatAddress(address);

// Calculations
calculateDistance(from, to);
calculateDeliveryFee(distance);
calculateTax(amount, rate);
calculateLoyaltyPoints(order);

// Helpers
generateOrderNumber();
generateInvoiceNumber();
parseQueryString(query);
debounce(func, delay);
```

## Environment Variables

The core package uses the following environment variables:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

# Feature Flags
VITE_USE_FIREBASE_EMULATOR=false

# API Keys
STRIPE_SECRET_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
SENDGRID_API_KEY=
```

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## Best Practices

1. **Always use models** for data consistency
2. **Validate data** before Firebase operations
3. **Handle errors** appropriately
4. **Use TypeScript** for better type safety
5. **Cache expensive operations** when possible
6. **Follow the single responsibility principle**

## Migration Guide

### From v2 to v3

1. Update imports:
```javascript
// Old
import firebase from '@eatech/core/firebase';

// New
import { db, auth } from '@eatech/core/config/firebase';
```

2. Use new collection references:
```javascript
// Old
db.collection('tenants')

// New
db.collection(collections.tenants)
```

3. Update model usage:
```javascript
// Old
const order = { items: [] };

// New
const order = new Order({ items: [] });
```

## License

Copyright © 2025 EATECH. All rights reserved.