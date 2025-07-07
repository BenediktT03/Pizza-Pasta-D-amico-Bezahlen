# EATECH V3.0 Deployment Guide

**Comprehensive Production Deployment Guide**

**Version:** 3.0.0  
**Target Environment:** Production  
**Infrastructure:** Multi-Cloud (Vercel + Firebase + Cloudflare)  
**Last Updated:** Januar 2025

---

## 📋 Inhaltsverzeichnis

1. [Deployment Overview](#deployment-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Frontend Deployment](#frontend-deployment)
5. [Backend Deployment](#backend-deployment)
6. [Database Setup](#database-setup)
7. [CDN Configuration](#cdn-configuration)
8. [Monitoring Setup](#monitoring-setup)
9. [Security Configuration](#security-configuration)
10. [Go-Live Checklist](#go-live-checklist)

---

## 🏗️ Deployment Overview

EATECH V3.0 nutzt eine moderne Multi-Cloud-Architektur für maximale Performance, Skalierbarkeit und Ausfallsicherheit in der Schweiz.

### Architecture Stack
```
Frontend (PWA):    Vercel Edge Network
Backend:           Firebase Functions + Vercel API Routes  
Database:          Firebase Firestore (eur3 - Zurich)
File Storage:      Cloudflare R2 + Firebase Storage
CDN:               Cloudflare Global Network
Monitoring:        Sentry + DataDog + Custom Analytics
DNS:               Cloudflare DNS
```

### Deployment Environments
```
Development:    dev.eatech.ch
Staging:        staging.eatech.ch  
Production:     app.eatech.ch, api.eatech.ch
```

---

## 📋 Prerequisites

### Required Accounts & Services

```bash
# Primary Services
☐ Vercel Account (Pro Plan)
☐ Firebase Project (Blaze Plan)
☐ Cloudflare Account (Pro Plan) 
☐ GitHub Repository Access

# Monitoring & Analytics
☐ Sentry Account
☐ DataDog Account (optional)
☐ Plausible Analytics

# Payment & Communication
☐ Stripe Account (Switzerland)
☐ Twilio Account
☐ SendGrid Account
```

### Local Development Requirements

```bash
# Node.js & Package Managers
node --version      # v18.17.0+
npm --version       # 9.0.0+
pnpm --version      # 8.0.0+

# Development Tools
git --version       # 2.40.0+
docker --version    # 20.10.0+

# Firebase CLI
npm install -g firebase-tools
firebase --version  # 12.0.0+

# Vercel CLI
npm install -g @vercel/cli
vercel --version    # 28.0.0+
```

### Required Environment Variables

```bash
# Core Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.eatech.ch
NEXT_PUBLIC_API_URL=https://api.eatech.ch

# Firebase Configuration
FIREBASE_PROJECT_ID=eatech-prod
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@eatech-prod.iam.gserviceaccount.com
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=eatech-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=eatech-prod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=eatech-prod.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789

# Payment Services
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Communication Services
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
SENDGRID_API_KEY=SG...

# AI Services
OPENAI_API_KEY=sk-...

# Monitoring
SENTRY_DSN=https://...@o123456.ingest.sentry.io/...
SENTRY_AUTH_TOKEN=...
NEXT_PUBLIC_SENTRY_DSN=https://...

# Security
ENCRYPTION_KEY=... # 32 bytes hex
JWT_SECRET=... # Random 64 character string
COOKIE_SECRET=... # Random 64 character string

# CDN & Storage
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ZONE_ID=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
```

---

## 🌐 Environment Setup

### 1. Firebase Project Setup

```bash
# 1. Create Firebase Project
firebase projects:create eatech-prod --display-name "EATECH Production"

# 2. Set Default Project
firebase use eatech-prod

# 3. Enable Required Services
firebase open extensions # Enable:
# - Authentication
# - Firestore Database (eur3)
# - Cloud Functions
# - Cloud Storage
# - Cloud Messaging
# - Hosting
```

### 2. Firestore Database Configuration

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Multi-tenant security rules
    match /tenants/{tenantId} {
      allow read, write: if request.auth != null 
        && (request.auth.token.tenantId == tenantId 
        || 'admin' in request.auth.token.roles);
      
      match /{document=**} {
        allow read, write: if request.auth != null 
          && (request.auth.token.tenantId == tenantId
          || 'admin' in request.auth.token.roles);
      }
    }
    
    // Master collection (admin only)
    match /master/{document=**} {
      allow read, write: if request.auth != null 
        && 'superadmin' in request.auth.token.roles;
    }
    
    // Public read-only data
    match /public/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 3. Firestore Indexes

```bash
# Create composite indexes for performance
firebase firestore:indexes

# Key indexes needed:
# - tenants/{tenantId}/orders: tenantId ASC, createdAt DESC
# - tenants/{tenantId}/orders: tenantId ASC, status ASC, createdAt DESC  
# - tenants/{tenantId}/products: tenantId ASC, category ASC, sortOrder ASC
# - tenants/{tenantId}/analytics: tenantId ASC, date DESC
```

### 4. Authentication Configuration

```javascript
// Firebase Auth settings
const authConfig = {
  providers: [
    'phone', // Primary for customers
    'email', // For staff/admin
    'google.com' // Optional SSO
  ],
  
  // Phone Auth (Switzerland)
  phoneAuth: {
    recaptchaVerifierSize: 'invisible',
    defaultCountry: 'CH',
    allowedCountries: ['CH', 'AT', 'DE'], // DACH region
  },
  
  // Security settings
  security: {
    enableEmailLinkSignIn: false,
    enableAnonymousAuth: false,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: false
    }
  }
};
```

---

## 🚀 Frontend Deployment

### 1. Vercel Project Setup

```bash
# Connect repository to Vercel
vercel link

# Configure project settings
vercel env add NODE_ENV production
vercel env add NEXT_PUBLIC_APP_URL https://app.eatech.ch
vercel env add NEXT_PUBLIC_API_URL https://api.eatech.ch

# Add all environment variables
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY [value]
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN [value]
# ... (all other env vars)
```

### 2. Next.js Configuration

```javascript
// next.config.js
const withPWA = require('next-pwa');
const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
    serverComponentsExternalPackages: ['firebase-admin']
  },
  
  // PWA Configuration
  pwa: {
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
    buildExcludes: [/middleware-manifest\.json$/],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\.eatech\.ch\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          networkTimeoutSeconds: 10,
          expiration: {
            maxEntries: 256,
            maxAgeSeconds: 24 * 60 * 60 // 1 day
          }
        }
      },
      {
        urlPattern: /^https:\/\/storage\.eatech\.ch\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'image-cache',
          expiration: {
            maxEntries: 256,
            maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
          }
        }
      }
    ]
  },
  
  // Image Optimization
  images: {
    domains: [
      'storage.eatech.ch',
      'cdn.eatech.ch',
      'firebasestorage.googleapis.com'
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384]
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options', 
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ];
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: true
      }
    ];
  },
  
  // Performance
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  }
};

// Export with PWA and Sentry
module.exports = withSentryConfig(
  withPWA(nextConfig),
  {
    silent: true,
    org: 'eatech',
    project: 'eatech-web'
  }
);
```

### 3. Vercel Deployment Settings

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "regions": ["fra1", "cdg1"], // Europe regions
  "framework": "nextjs"
}
```

### 4. Build & Deploy Commands

```bash
# Development build
npm run dev

# Production build
npm run build
npm run start

# Deploy to Vercel
vercel --prod

# Deploy specific branches
vercel --prod --target production
```

---

## ⚙️ Backend Deployment

### 1. Firebase Functions Setup

```bash
# Initialize Functions
cd functions
npm install

# Set environment config
firebase functions:config:set \
  stripe.secret_key="sk_live_..." \
  twilio.account_sid="AC..." \
  twilio.auth_token="..." \
  sendgrid.api_key="SG..." \
  openai.api_key="sk-..."

# Deploy functions
firebase deploy --only functions
```

### 2. Cloud Functions Configuration

```javascript
// functions/src/index.ts
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getFunctions } from 'firebase-admin/functions';

// Initialize Firebase Admin
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.europe-west1.firebasedatabase.app`,
  storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
});

// Configure region for Switzerland/Europe
const functions = getFunctions('europe-west1');

// API Endpoints
export const api = functions.https.onRequest(app);
export const webhooks = functions.https.onRequest(webhookApp);

// Triggers
export const onOrderCreated = functions.firestore
  .document('tenants/{tenantId}/orders/{orderId}')
  .onCreate(async (snap, context) => {
    // Handle new order logic
  });

export const onUserCreated = functions.auth
  .user()
  .onCreate(async (user) => {
    // Handle new user registration
  });

// Scheduled Functions
export const dailyAnalytics = functions.pubsub
  .schedule('0 2 * * *')
  .timeZone('Europe/Zurich')
  .onRun(async (context) => {
    // Generate daily analytics
  });
```

### 3. API Routes Structure

```
functions/src/
├── api/
│   ├── auth/
│   │   ├── login.ts
│   │   ├── logout.ts
│   │   └── verify.ts
│   ├── tenants/
│   │   ├── create.ts
│   │   ├── update.ts
│   │   └── delete.ts
│   ├── orders/
│   │   ├── create.ts
│   │   ├── update.ts
│   │   └── status.ts
│   ├── products/
│   │   ├── create.ts
│   │   ├── update.ts
│   │   └── bulk.ts
│   ├── analytics/
│   │   ├── overview.ts
│   │   ├── revenue.ts
│   │   └── export.ts
│   ├── ai/
│   │   ├── emergency.ts
│   │   ├── pricing.ts
│   │   └── voice.ts
│   └── webhooks/
│       ├── stripe.ts
│       ├── twilio.ts
│       └── internal.ts
├── triggers/
│   ├── auth.triggers.ts
│   ├── order.triggers.ts
│   ├── analytics.triggers.ts
│   └── scheduled.triggers.ts
├── utils/
│   ├── validation.ts
│   ├── encryption.ts
│   ├── email.ts
│   └── sms.ts
└── middleware/
    ├── auth.ts
    ├── tenant.ts
    └── rate-limit.ts
```

---

## 💾 Database Setup

### 1. Firestore Collections Structure

```javascript
// Initialize collections with proper indexes
const initializeCollections = async () => {
  const db = getFirestore();
  
  // Create master collections
  await db.collection('tenants').doc('_init').set({ initialized: true });
  await db.collection('masterUsers').doc('_init').set({ initialized: true });
  await db.collection('systemConfig').doc('_init').set({ initialized: true });
  
  // Set up tenant template
  const tenantTemplate = {
    name: 'Template Tenant',
    status: 'template',
    createdAt: new Date(),
    settings: {
      language: 'de',
      timezone: 'Europe/Zurich',
      currency: 'CHF'
    }
  };
  
  await db.collection('tenants').doc('template').set(tenantTemplate);
};
```

### 2. Data Migration Script

```javascript
// scripts/migrate.js
const admin = require('firebase-admin');

const migrateToV3 = async () => {
  const db = admin.firestore();
  
  // Migrate orders to new structure
  const orders = await db.collectionGroup('orders').get();
  
  for (const doc of orders.docs) {
    const data = doc.data();
    
    // Add new fields for V3.0
    const updates = {
      'analytics.source': data.analytics?.source || { utm_source: 'direct' },
      'fulfillment.timing.estimatedAt': data.fulfillment?.timing?.estimatedAt || null,
      'ai.insights': {},
      'version': '3.0.0'
    };
    
    await doc.ref.update(updates);
  }
  
  console.log(`Migrated ${orders.size} orders`);
};
```

### 3. Backup Strategy

```bash
# Automated daily backups
gcloud firestore export gs://eatech-prod-backups/$(date +%Y-%m-%d) \
  --project=eatech-prod

# Backup verification script
#!/bin/bash
BACKUP_DATE=$(date +%Y-%m-%d)
BACKUP_PATH="gs://eatech-prod-backups/$BACKUP_DATE"

# Verify backup exists and is complete
gsutil -m stat $BACKUP_PATH/all_namespaces/all_kinds/all_namespaces_all_kinds.export_metadata

if [ $? -eq 0 ]; then
    echo "Backup $BACKUP_DATE verified successfully"
else
    echo "Backup $BACKUP_DATE failed verification"
    # Send alert
fi
```

---

## 🌐 CDN Configuration

### 1. Cloudflare Setup

```bash
# DNS Configuration
Domain: eatech.ch
Records:
- A @ 76.76.19.19 (Vercel)
- CNAME app 76.76.19.19 (Vercel)
- CNAME api 76.76.19.19 (Vercel)
- CNAME cdn [Cloudflare R2]
- CNAME storage [Firebase Storage]

# Page Rules
app.eatech.ch/*
- Cache Level: Standard
- Browser Cache TTL: 4 hours
- Edge Cache TTL: 2 hours

api.eatech.ch/api/*
- Cache Level: Bypass
- Disable Apps

cdn.eatech.ch/*
- Cache Level: Cache Everything
- Edge Cache TTL: 1 month
- Browser Cache TTL: 1 week
```

### 2. Image Optimization Pipeline

```javascript
// Cloudflare Worker for image resizing
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const params = url.searchParams;
    
    // Extract parameters
    const width = params.get('w') || 800;
    const quality = params.get('q') || 85;
    const format = params.get('f') || 'auto';
    
    // Construct Cloudflare Image URL
    const imageUrl = `https://cdn.eatech.ch/cdn-cgi/image/width=${width},quality=${quality},format=${format}${url.pathname}`;
    
    return fetch(imageUrl, {
      headers: {
        'Cache-Control': 'public, max-age=2592000', // 30 days
        'CF-Cache-Status': 'HIT'
      }
    });
  }
};
```

### 3. Static Asset Optimization

```bash
# Asset optimization pipeline
# Build script optimizes:
- Images: WebP/AVIF conversion
- CSS: Minification + PurgeCSS
- JavaScript: Minification + Tree shaking
- Fonts: Subsetting for Swiss languages

# Pre-cache critical assets
Critical Assets:
- Core CSS: ~15KB gzipped
- Essential JS: ~45KB gzipped  
- Fonts: Inter (DE/FR/IT/EN subsets)
- Icons: SVG sprite ~8KB
```

---

## 📊 Monitoring Setup

### 1. Sentry Configuration

```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Error Filtering
  beforeSend(event, hint) {
    // Filter out known issues
    if (event.exception) {
      const error = hint.originalException;
      if (error?.name === 'ChunkLoadError') {
        return null; // Don't report chunk load errors
      }
    }
    
    // Scrub sensitive data
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    
    return event;
  },
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  
  // User context
  initialScope: {
    tags: {
      component: 'web'
    }
  }
});
```

### 2. DataDog Integration

```javascript
// DataDog RUM
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: process.env.NEXT_PUBLIC_DATADOG_APP_ID,
  clientToken: process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN,
  site: 'datadoghq.eu', // EU servers
  service: 'eatech-web',
  env: process.env.NODE_ENV,
  
  // Sampling
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20,
  trackUserInteractions: true,
  trackResources: true,
  trackLongTasks: true,
  
  // Privacy
  defaultPrivacyLevel: 'mask-user-input'
});
```

### 3. Custom Analytics

```javascript
// Custom analytics collector
class AnalyticsCollector {
  constructor() {
    this.queue = [];
    this.batchSize = 50;
    this.flushInterval = 30000; // 30 seconds
    
    setInterval(() => this.flush(), this.flushInterval);
  }
  
  track(event, properties = {}) {
    this.queue.push({
      timestamp: Date.now(),
      event,
      properties: {
        ...properties,
        sessionId: this.getSessionId(),
        tenantId: this.getTenantId(),
        userId: this.getUserId(),
        platform: 'web',
        version: '3.0.0'
      }
    });
    
    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }
  
  async flush() {
    if (this.queue.length === 0) return;
    
    const events = [...this.queue];
    this.queue = [];
    
    try {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events })
      });
    } catch (error) {
      // Re-queue on failure
      this.queue.unshift(...events);
      console.error('Analytics flush failed:', error);
    }
  }
}
```

### 4. Performance Monitoring

```javascript
// Web Vitals monitoring
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

const vitalsLogger = (metric) => {
  // Send to analytics
  analytics.track('web_vital', {
    name: metric.name,
    value: metric.value,
    rating: getRating(metric),
    delta: metric.delta,
    id: metric.id
  });
  
  // Send to monitoring
  if (window.datadog) {
    window.datadog.addRumGlobalContext('vitals', {
      [metric.name]: metric.value
    });
  }
};

// Track all Core Web Vitals
getCLS(vitalsLogger);
getFID(vitalsLogger);
getFCP(vitalsLogger);
getLCP(vitalsLogger);
getTTFB(vitalsLogger);
```

---

## 🔒 Security Configuration

### 1. Content Security Policy

```javascript
// CSP Headers
const csp = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' 
    https://js.stripe.com 
    https://www.gstatic.com
    https://apis.google.com;
  style-src 'self' 'unsafe-inline'
    https://fonts.googleapis.com;
  font-src 'self'
    https://fonts.gstatic.com;
  img-src 'self' data: blob:
    https://storage.eatech.ch
    https://cdn.eatech.ch
    https://firebasestorage.googleapis.com;
  connect-src 'self'
    https://api.eatech.ch
    wss://ws.eatech.ch
    https://identitytoolkit.googleapis.com
    https://o123456.ingest.sentry.io;
  frame-src 'self'
    https://js.stripe.com
    https://www.google.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  block-all-mixed-content;
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();
```

### 2. Rate Limiting

```javascript
// Rate limiting middleware
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

const createRateLimit = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    message,
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
    }),
    keyGenerator: (req) => {
      // Use tenant ID + IP for more granular limits
      const tenantId = req.user?.tenantId || 'anonymous';
      return `${tenantId}:${req.ip}`;
    }
  });

// Different limits for different endpoints
export const authLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts'
);

export const apiLimit = createRateLimit(
  60 * 1000, // 1 minute
  100, // 100 requests
  'Too many API requests'
);

export const orderLimit = createRateLimit(
  60 * 1000, // 1 minute
  10, // 10 orders
  'Too many orders'
);
```

### 3. Data Encryption

```javascript
// Encryption service for sensitive data
import crypto from 'crypto';

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.secretKey = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  }
  
  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  decrypt(data) {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.secretKey,
      Buffer.from(data.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
    
    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

---

## ✅ Go-Live Checklist

### Pre-Deployment (1 Week Before)

```bash
# Infrastructure Verification
☐ All DNS records configured and propagated
☐ SSL certificates valid and auto-renewal enabled
☐ CDN configuration tested and optimized
☐ Load balancing configured and tested
☐ Backup systems verified and tested
☐ Monitoring and alerting systems active

# Security Verification
☐ Security headers configured and tested
☐ Rate limiting tested and tuned
☐ Authentication flows tested end-to-end
☐ HTTPS everywhere enforced
☐ API security audit completed
☐ Penetration testing completed

# Performance Verification  
☐ Core Web Vitals meet Google standards
☐ Lighthouse scores > 90 for all metrics
☐ Load testing completed (1000+ concurrent users)
☐ Database query optimization verified
☐ CDN cache hit rates > 85%
☐ Image optimization verified (WebP/AVIF)

# Compliance Verification
☐ GDPR/DSG compliance verified
☐ Data retention policies implemented
☐ Cookie consent implemented
☐ Privacy policy updated
☐ Terms of service finalized
☐ Swiss financial regulations compliance
```

### Deployment Day

```bash
# Morning Checklist (09:00 CET)
☐ Team synchronized and on standby
☐ Rollback plan documented and tested
☐ Monitoring dashboards prepared
☐ Customer support team briefed
☐ Emergency contact list updated

# Pre-Deployment (10:00 CET)
☐ Staging environment final smoke test
☐ Database migrations tested
☐ Feature flags verified
☐ Third-party services status checked
☐ Backup completed and verified

# Deployment Execution (11:00 CET)
☐ Enable maintenance mode if needed
☐ Deploy backend services first
☐ Run database migrations
☐ Deploy frontend applications
☐ Update DNS if needed
☐ Disable maintenance mode

# Post-Deployment Verification (11:30 CET)
☐ All services responding correctly
☐ Database connections healthy
☐ External integrations working
☐ Monitoring showing green status
☐ Sample transactions completed
☐ Customer support workflows tested

# Go-Live Announcement (12:00 CET)
☐ Update status page: "All systems operational"
☐ Internal team notification
☐ Customer communication sent
☐ Social media announcement
☐ Press release (if applicable)
```

### Post-Deployment (First 24 Hours)

```bash
# Immediate Monitoring (First 2 Hours)
☐ Error rates < 0.1%
☐ Response times < 200ms (95th percentile)
☐ Database performance stable
☐ CDN cache hit rate > 80%
☐ Memory and CPU usage normal

# Business Metrics (First 6 Hours)
☐ User registration flow working
☐ Order creation working
☐ Payment processing working
☐ Email/SMS notifications working
☐ Real-time updates functioning

# 24-Hour Review
☐ Full analytics review
☐ Customer feedback assessment
☐ Performance metrics analysis
☐ Error log review
☐ Team debrief and retrospective
```

---

## 🚨 Emergency Procedures

### Rollback Plan

```bash
# Immediate Rollback (< 5 minutes)
1. Revert Vercel deployment:
   vercel rollback [previous-deployment-url] --prod

2. Revert Firebase functions:
   firebase deploy --only functions --project eatech-prod-backup

3. Database rollback (if needed):
   gcloud firestore import gs://eatech-prod-backups/latest

4. Update status page:
   "Investigating issues - services temporarily degraded"

# Communication Plan
- Internal: Slack #incidents channel
- External: status.eatech.ch update
- Customers: In-app notification + email
- Support: Knowledge base article
```

### Incident Response

```bash
# Severity Levels
Critical (P0):  Complete service outage
High (P1):      Major feature broken
Medium (P2):    Minor feature issues  
Low (P3):       Cosmetic issues

# P0 Response (< 15 minutes)
1. Acknowledge incident in monitoring
2. Assemble incident response team
3. Create incident channel
4. Begin investigation
5. Update status page
6. Implement immediate fixes or rollback

# Communication Schedule
- P0: Updates every 15 minutes
- P1: Updates every 30 minutes  
- P2: Updates every 2 hours
- P3: Daily updates
```

---

## 📞 Support & Maintenance

### Contact Information

```bash
# Deployment Team
Lead Developer:     benedikt@thomma.ch
DevOps Engineer:    [TBD]
QA Engineer:        [TBD]

# Emergency Contacts
24/7 Hotline:       [TBD]
Incident Manager:   benedikt@thomma.ch
Security Team:      security@eatech.ch

# Service Providers
Vercel Support:     Pro Plan Support
Firebase Support:   Blaze Plan Support
Cloudflare Support: Pro Plan Support
```

### Maintenance Windows

```bash
# Regular Maintenance
Schedule:   Tuesday 02:00-04:00 CET
Frequency:  Weekly
Duration:   ~30 minutes typical

# Emergency Maintenance
Available:  24/7 with 2-hour notice
Duration:   As needed
Communication: Status page + email

# Planned Downtime
Major Updates:    Quarterly, with 1-week notice
Duration:         < 4 hours
Schedule:         Sunday 02:00-06:00 CET
```

---

*Last Updated: Januar 2025 - EATECH V3.0*  
*This document is maintained by the EATECH Development Team*