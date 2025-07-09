# 🔧 EATECH Troubleshooting Guide

## Overview

This guide helps you resolve common issues encountered while developing, deploying, or using the EATECH platform. Issues are organized by category with step-by-step solutions.

## Table of Contents

1. [Development Issues](#development-issues)
2. [Build & Deployment Issues](#build--deployment-issues)
3. [Firebase Issues](#firebase-issues)
4. [Authentication Issues](#authentication-issues)
5. [Database Issues](#database-issues)
6. [Payment Issues](#payment-issues)
7. [Performance Issues](#performance-issues)
8. [Voice Feature Issues](#voice-feature-issues)
9. [Mobile/PWA Issues](#mobilepwa-issues)
10. [Production Issues](#production-issues)

## Development Issues

### Node Version Mismatch

**Problem**: `Error: The engine "node" is incompatible with this module`

**Solution**:
```bash
# Check current version
node --version

# Use correct version with nvm
nvm use

# Or install if not available
nvm install
nvm use

# Verify
node --version # Should match .nvmrc
```

### Module Resolution Errors

**Problem**: `Cannot find module '@eatech/core'`

**Solution**:
```bash
# Clean install
rm -rf node_modules
rm package-lock.json
npm install

# Bootstrap monorepo
npm run bootstrap

# If still failing, check tsconfig paths
# Ensure tsconfig.json has correct paths mapping
```

### TypeScript Errors

**Problem**: `Type 'X' is not assignable to type 'Y'`

**Solution**:
```bash
# Rebuild types
npm run build:types

# Clear TypeScript cache
rm -rf dist
rm -rf .tsbuildinfo

# Check for type mismatches
npm run type-check

# Update type definitions
npm run generate:types
```

### Hot Module Replacement (HMR) Not Working

**Problem**: Changes not reflecting in browser

**Solution**:
```bash
# Kill all node processes
pkill -f node

# Clear Vite cache
rm -rf node_modules/.vite

# Restart dev server
npm run dev

# If using WSL, add to vite.config.ts:
server: {
  watch: {
    usePolling: true
  }
}
```

### Port Already in Use

**Problem**: `Error: Port 5173 is already in use`

**Solution**:
```bash
# Find process using port
lsof -i :5173

# Kill process
kill -9 <PID>

# Or use different port
npm run dev -- --port 5174
```

## Build & Deployment Issues

### Build Out of Memory

**Problem**: `JavaScript heap out of memory`

**Solution**:
```bash
# Increase Node memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Or in package.json
"scripts": {
  "build": "NODE_OPTIONS='--max-old-space-size=4096' vite build"
}

# For CI/CD, set in environment
```

### Build Fails with Module Errors

**Problem**: `Module not found: Error: Can't resolve`

**Solution**:
```bash
# Check import paths (case-sensitive on Linux)
# Wrong: import Button from './button'
# Right: import Button from './Button'

# Verify file exists
ls -la src/components/Button.tsx

# Check barrel exports
# Ensure index.ts exports are correct
```

### Docker Build Fails

**Problem**: Docker build errors

**Solution**:
```bash
# Clear Docker cache
docker system prune -a

# Build with no cache
docker build --no-cache -f infrastructure/docker/Dockerfile.web -t eatech/web .

# Check Docker daemon
docker info

# Increase Docker memory (Docker Desktop)
# Settings -> Resources -> Memory: 4GB+
```

### Deployment Timeout

**Problem**: `Error: Deploy timed out`

**Solution**:
```bash
# For Firebase
firebase deploy --only hosting --debug

# Increase timeout
firebase deploy --only functions --timeout 540

# Deploy in parts
firebase deploy --only hosting
firebase deploy --only functions:api
firebase deploy --only firestore
```

## Firebase Issues

### Firebase Initialization Error

**Problem**: `Error: Failed to initialize Firebase`

**Solution**:
```bash
# Verify Firebase CLI login
firebase login

# Check project selection
firebase projects:list
firebase use <project-id>

# Reinitialize
firebase init

# Check environment variables
echo $FIREBASE_PROJECT_ID
```

### Emulator Connection Issues

**Problem**: `Could not reach Cloud Firestore backend`

**Solution**:
```bash
# Start emulators with specific ports
firebase emulators:start --only firestore --port 8080

# Check if ports are free
lsof -i :8080
lsof -i :9099
lsof -i :5001

# Kill Java processes (emulators)
pkill -f java

# Clear emulator data
rm -rf .firebase/

# Use explicit config
const app = initializeApp({
  projectId: "demo-eatech",
  // ... other config
});

if (process.env.NODE_ENV === 'development') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
}
```

### Functions Deploy Error

**Problem**: `Error: Functions did not deploy properly`

**Solution**:
```bash
# Check function logs
firebase functions:log --only <function-name>

# Test locally first
npm run serve:functions

# Check Node version in functions
cd functions
node --version # Must match engines in package.json

# Common fixes:
# 1. Update dependencies
cd functions && npm update

# 2. Check for syntax errors
npm run lint:functions

# 3. Verify environment config
firebase functions:config:get
```

### Firestore Permission Denied

**Problem**: `Missing or insufficient permissions`

**Solution**:
```javascript
// Check security rules
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Add logging for debugging
    match /{document=**} {
      allow read, write: if request.auth != null
        && debug("Auth UID: " + request.auth.uid);
    }
  }
}

// Deploy rules
firebase deploy --only firestore:rules

// Test rules
npm run test:rules
```

## Authentication Issues

### Login Fails Silently

**Problem**: Login button clicked but nothing happens

**Solution**:
```javascript
// Add error handling
try {
  await signInWithEmailAndPassword(auth, email, password);
} catch (error) {
  console.error('Login error:', error);
  
  // Check specific error codes
  switch (error.code) {
    case 'auth/user-not-found':
      alert('User not found');
      break;
    case 'auth/wrong-password':
      alert('Invalid password');
      break;
    case 'auth/too-many-requests':
      alert('Too many attempts. Try later.');
      break;
    default:
      alert('Login failed: ' + error.message);
  }
}

// Enable debug mode
if (process.env.NODE_ENV === 'development') {
  window.firebase = firebase;
  firebase.auth().onAuthStateChanged(user => {
    console.log('Auth state:', user);
  });
}
```

### OAuth Redirect Issues

**Problem**: Social login redirects to wrong URL

**Solution**:
```bash
# Update authorized domains in Firebase Console
# Authentication -> Settings -> Authorized domains

# Add redirect URL to OAuth provider
# Google: https://console.cloud.google.com
# Apple: https://developer.apple.com

# Check redirect URL in code
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account'
});

// For popup instead of redirect
signInWithPopup(auth, provider);
```

### Token Expiration

**Problem**: User gets logged out unexpectedly

**Solution**:
```javascript
// Implement token refresh
auth.onIdTokenChanged(async (user) => {
  if (user) {
    const token = await user.getIdToken();
    // Store token with expiration
    localStorage.setItem('authToken', token);
    
    // Force refresh before expiration
    const tokenResult = await user.getIdTokenResult();
    const expirationTime = new Date(tokenResult.expirationTime).getTime();
    const now = new Date().getTime();
    const timeUntilExpiry = expirationTime - now;
    
    // Refresh 5 minutes before expiry
    setTimeout(async () => {
      await user.getIdToken(true);
    }, timeUntilExpiry - 5 * 60 * 1000);
  }
});
```

## Database Issues

### Slow Queries

**Problem**: Firestore queries taking too long

**Solution**:
```javascript
// Add composite indexes
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tenantId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}

// Deploy indexes
firebase deploy --only firestore:indexes

// Optimize queries
// Bad: Multiple queries
const pizzas = await db.collection('products').where('category', '==', 'pizza').get();
const pastas = await db.collection('products').where('category', '==', 'pasta').get();

// Good: Single query with IN
const products = await db.collection('products')
  .where('category', 'in', ['pizza', 'pasta'])
  .get();

// Use pagination
const first = await db.collection('products')
  .orderBy('name')
  .limit(20)
  .get();

const last = first.docs[first.docs.length - 1];
const next = await db.collection('products')
  .orderBy('name')
  .startAfter(last)
  .limit(20)
  .get();
```

### Real-time Updates Not Working

**Problem**: Changes not reflecting in real-time

**Solution**:
```javascript
// Check listener setup
useEffect(() => {
  const unsubscribe = db
    .collection('orders')
    .where('status', '==', 'pending')
    .onSnapshot(
      (snapshot) => {
        const orders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setOrders(orders);
      },
      (error) => {
        console.error('Snapshot error:', error);
        // Fallback to polling
        const interval = setInterval(fetchOrders, 5000);
        return () => clearInterval(interval);
      }
    );

  return () => unsubscribe();
}, []);

// Check WebSocket connection
// In browser console:
// Check Network tab for WebSocket connections
```

### Data Migration Issues

**Problem**: Need to update data structure

**Solution**:
```javascript
// Create migration script
// scripts/migrations/001_add_timestamps.js
const admin = require('firebase-admin');

async function migrate() {
  const batch = admin.firestore().batch();
  
  const products = await admin.firestore()
    .collection('products')
    .get();
  
  products.forEach(doc => {
    if (!doc.data().createdAt) {
      batch.update(doc.ref, {
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });
  
  await batch.commit();
  console.log(`Updated ${products.size} documents`);
}

// Run with backups
// 1. Export data first
// 2. Run migration
// 3. Verify results
```

## Payment Issues

### Stripe Integration Errors

**Problem**: `Stripe is not defined`

**Solution**:
```javascript
// Ensure Stripe.js is loaded
// public/index.html
<script src="https://js.stripe.com/v3/"></script>

// Or load dynamically
const loadStripe = () => {
  return new Promise((resolve) => {
    if (window.Stripe) {
      resolve(window.Stripe);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = () => resolve(window.Stripe);
    document.body.appendChild(script);
  });
};

// Initialize Stripe
const stripe = await loadStripe();
const stripeInstance = stripe(process.env.VITE_STRIPE_PUBLIC_KEY);
```

### Payment Declined

**Problem**: Payments failing in production

**Solution**:
```javascript
// Add detailed error handling
try {
  const { error, paymentIntent } = await stripe.confirmCardPayment(
    clientSecret,
    {
      payment_method: {
        card: elements.getElement(CardElement),
        billing_details: {
          name: customerName,
          email: customerEmail,
        },
      },
    }
  );

  if (error) {
    console.error('Payment error:', error);
    
    // Handle specific decline codes
    switch (error.decline_code) {
      case 'insufficient_funds':
        showError('Insufficient funds. Please try another card.');
        break;
      case 'lost_card':
        showError('This card has been reported lost.');
        break;
      case 'expired_card':
        showError('Your card has expired.');
        break;
      default:
        showError(error.message);
    }
  }
} catch (err) {
  console.error('Unexpected error:', err);
  showError('Payment processing failed. Please try again.');
}
```

### TWINT Integration Issues

**Problem**: TWINT QR code not generating

**Solution**:
```javascript
// Check TWINT configuration
const twintConfig = {
  merchantId: process.env.VITE_TWINT_MERCHANT_ID,
  apiKey: process.env.VITE_TWINT_API_KEY,
  environment: process.env.NODE_ENV === 'production' ? 'prod' : 'test'
};

// Verify merchant account
if (!twintConfig.merchantId) {
  throw new Error('TWINT merchant ID not configured');
}

// Generate QR with error handling
try {
  const qrResponse = await fetch('/api/twint/qr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: order.total,
      reference: order.id,
      message: `Order ${order.number}`
    })
  });

  if (!qrResponse.ok) {
    const error = await qrResponse.json();
    console.error('TWINT error:', error);
    throw new Error(error.message);
  }

  const { qrCode, transactionId } = await qrResponse.json();
  // Display QR code
} catch (error) {
  console.error('QR generation failed:', error);
  // Fallback to manual entry
  showTwintPhoneInput();
}
```

## Performance Issues

### Slow Initial Load

**Problem**: App takes too long to load

**Solution**:
```javascript
// 1. Analyze bundle size
npm run analyze

// 2. Implement code splitting
// routes.tsx
const Menu = lazy(() => import('./pages/Menu'));
const Checkout = lazy(() => import('./pages/Checkout'));

// 3. Optimize imports
// Bad
import { Button, Card, Modal } from '@eatech/ui';

// Good - if using only Button
import Button from '@eatech/ui/Button';

// 4. Enable compression
// vite.config.ts
import viteCompression from 'vite-plugin-compression';

plugins: [
  viteCompression({
    algorithm: 'gzip',
    threshold: 1024,
  })
]

// 5. Preload critical resources
<link rel="preload" href="/fonts/swiss.woff2" as="font" crossorigin>
<link rel="preconnect" href="https://firestore.googleapis.com">
```

### Memory Leaks

**Problem**: App becomes sluggish over time

**Solution**:
```javascript
// 1. Clean up listeners
useEffect(() => {
  const unsubscribe = subscribeToOrders();
  
  return () => {
    unsubscribe(); // Critical!
  };
}, []);

// 2. Clear timers
useEffect(() => {
  const timer = setInterval(pollStatus, 5000);
  
  return () => {
    clearInterval(timer);
  };
}, []);

// 3. Avoid memory leaks in closures
// Bad
const [data, setData] = useState([]);

useEffect(() => {
  fetchData().then(result => {
    setData(prev => [...prev, ...result]); // Grows infinitely
  });
}, [someDepedency]);

// Good
useEffect(() => {
  fetchData().then(result => {
    setData(result); // Replace, don't accumulate
  });
}, [someDepedency]);

// 4. Use Chrome DevTools Memory Profiler
// - Take heap snapshot
// - Perform actions
// - Take another snapshot
// - Compare for leaks
```

### Render Performance

**Problem**: UI feels laggy during updates

**Solution**:
```javascript
// 1. Use React.memo for expensive components
const ProductCard = React.memo(({ product }) => {
  return <div>...</div>;
}, (prevProps, nextProps) => {
  return prevProps.product.id === nextProps.product.id;
});

// 2. Optimize re-renders with useMemo
const expensiveCalculation = useMemo(() => {
  return products.reduce((total, product) => {
    return total + product.price * product.quantity;
  }, 0);
}, [products]);

// 3. Use virtualization for long lists
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={products.length}
  itemSize={100}
  width='100%'
>
  {({ index, style }) => (
    <div style={style}>
      <ProductCard product={products[index]} />
    </div>
  )}
</FixedSizeList>

// 4. Debounce expensive operations
const debouncedSearch = useMemo(
  () => debounce((query) => {
    searchProducts(query);
  }, 300),
  []
);
```

## Voice Feature Issues

### Microphone Permission Denied

**Problem**: Can't access microphone

**Solution**:
```javascript
// Check permission status
navigator.permissions.query({ name: 'microphone' })
  .then(result => {
    if (result.state === 'denied') {
      showError('Microphone access denied. Please enable in browser settings.');
    }
  });

// Request permission with error handling
try {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  // Success
  stream.getTracks().forEach(track => track.stop()); // Clean up
} catch (error) {
  console.error('Microphone error:', error);
  
  if (error.name === 'NotAllowedError') {
    showError('Please allow microphone access');
  } else if (error.name === 'NotFoundError') {
    showError('No microphone found');
  } else {
    showError('Microphone error: ' + error.message);
  }
}

// For iOS Safari
if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
  showInfo('Tap the microphone icon to start voice ordering');
}
```

### Speech Recognition Not Working

**Problem**: Voice commands not recognized

**Solution**:
```javascript
// Check browser support
if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
  showError('Voice ordering not supported in this browser. Please use Chrome or Safari.');
  return;
}

// Configure recognition properly
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.lang = 'de-CH'; // Swiss German
recognition.continuous = false;
recognition.interimResults = true;
recognition.maxAlternatives = 3;

// Handle all events
recognition.onstart = () => console.log('Started listening');
recognition.onerror = (event) => {
  console.error('Speech error:', event.error);
  
  switch (event.error) {
    case 'network':
      showError('Network error. Check your connection.');
      break;
    case 'no-speech':
      showError('No speech detected. Please try again.');
      break;
    case 'audio-capture':
      showError('Microphone error. Please check your device.');
      break;
    default:
      showError('Voice recognition error: ' + event.error);
  }
};

// Process results
recognition.onresult = (event) => {
  const results = event.results[event.results.length - 1];
  const transcript = results[0].transcript;
  const confidence = results[0].confidence;
  
  console.log(`Heard: "${transcript}" (confidence: ${confidence})`);
  
  if (confidence < 0.7) {
    showWarning('Not sure I understood. Please try again.');
  } else {
    processVoiceCommand(transcript);
  }
};
```

### Swiss German Recognition Issues

**Problem**: Swiss German not recognized correctly

**Solution**:
```javascript
// Implement custom processing for Swiss dialect
const swissGermanVariations = {
  'zmittag': ['mittag', 'mittagessen', 'lunch'],
  'znacht': ['abendessen', 'dinner', 'nachtessen'],
  'es bitzli': ['ein bisschen', 'ein wenig', 'etwas'],
  'merci vilmal': ['vielen dank', 'danke schön'],
};

function normalizeSwissGerman(transcript) {
  let normalized = transcript.toLowerCase();
  
  // Replace Swiss German variations
  Object.entries(swissGermanVariations).forEach(([swiss, variations]) => {
    if (normalized.includes(swiss)) {
      normalized = normalized.replace(swiss, variations[0]);
    }
  });
  
  return normalized;
}

// Use fallback to standard German if needed
if (confidence < 0.8) {
  recognition.lang = 'de-DE'; // Try standard German
  recognition.start();
}
```

## Mobile/PWA Issues

### PWA Not Installing

**Problem**: "Add to Home Screen" not appearing

**Solution**:
```javascript
// Check manifest.json
{
  "name": "EATECH Restaurant",
  "short_name": "EATECH",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#FF6B6B",
  "background_color": "#FFFFFF",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}

// Check service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered'))
      .catch(err => console.error('SW error:', err));
  });
}

// Listen for install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallButton();
});

// Trigger install
installButton.addEventListener('click', async () => {
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log('Install outcome:', outcome);
  deferredPrompt = null;
});
```

### Offline Mode Not Working

**Problem**: App doesn't work offline

**Solution**:
```javascript
// sw.js - Implement proper caching
const CACHE_NAME = 'eatech-v1';
const urlsToCache = [
  '/',
  '/menu',
  '/static/css/main.css',
  '/static/js/main.js',
  '/offline.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // Offline fallback
        return caches.match('/offline.html');
      })
  );
});
```

### iOS Safari Issues

**Problem**: Features not working on iOS

**Solution**:
```javascript
// 1. Fix viewport issues
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">

// 2. Handle safe areas
.container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

// 3. Fix touch events
element.addEventListener('touchstart', handleStart, { passive: true });
element.addEventListener('touchmove', handleMove, { passive: false });

// 4. Handle iOS quirks
if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
  // Disable bounce
  document.body.addEventListener('touchmove', (e) => {
    if (e.target.closest('.scrollable')) return;
    e.preventDefault();
  }, { passive: false });
  
  // Fix 100vh issue
  const setVH = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };
  setVH();
  window.addEventListener('resize', setVH);
}
```

## Production Issues

### High Error Rate

**Problem**: Errors spiking in production

**Solution**:
```javascript
// 1. Implement error boundaries
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
    
    // Log to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack
        }
      }
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}

// 2. Add global error handler
window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason);
  Sentry.captureException(event.reason);
});

// 3. Monitor specific errors
if (error.code === 'QUOTA_EXCEEDED') {
  // Clear old data
  clearOldCache();
} else if (error.message.includes('Network')) {
  // Show offline message
  showOfflineMessage();
}
```

### Database Quota Exceeded

**Problem**: Firestore quota limits hit

**Solution**:
```bash
# 1. Check current usage
firebase firestore:databases:get default

# 2. Implement data retention
# Cloud Function to clean old data
exports.cleanOldData = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90); // 90 days
    
    const batch = admin.firestore().batch();
    const oldOrders = await admin.firestore()
      .collection('orders')
      .where('completedAt', '<', cutoff)
      .limit(500)
      .get();
    
    oldOrders.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  });

# 3. Optimize queries
# Use select() to limit fields
const orders = await db.collection('orders')
  .select('id', 'status', 'total')
  .get();

# 4. Enable offline persistence
firebase.firestore().enablePersistence()
  .catch(err => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open
    } else if (err.code === 'unimplemented') {
      // Browser doesn't support
    }
  });
```

### SSL Certificate Issues

**Problem**: SSL certificate errors

**Solution**:
```bash
# 1. Check certificate status
openssl s_client -connect eatech.ch:443 -servername eatech.ch

# 2. Verify certificate chain
curl -v https://eatech.ch

# 3. For Cloudflare
# - Set SSL/TLS mode to "Full (strict)"
# - Enable "Always Use HTTPS"
# - Check Universal SSL status

# 4. Force renewal
certbot renew --force-renewal

# 5. Check DNS
dig eatech.ch
nslookup eatech.ch
```

## Getting Help

### Debug Mode

Enable debug mode for detailed logging:
```javascript
// Add to .env.local
VITE_DEBUG=true

// In app
if (import.meta.env.VITE_DEBUG === 'true') {
  window.DEBUG = true;
  console.log('Debug mode enabled');
  
  // Log all API calls
  window.fetch = new Proxy(window.fetch, {
    apply(target, thisArg, args) {
      console.log('Fetch:', args[0]);
      return target.apply(thisArg, args);
    }
  });
}
```

### Support Channels

1. **Documentation**: Check `/docs` folder
2. **GitHub Issues**: Search existing issues
3. **Slack**: #eatech-support channel
4. **Email**: support@eatech.ch
5. **Emergency**: For production issues, contact on-call engineer

### Diagnostic Information

When reporting issues, include:
```bash
# System info
node --version
npm --version
firebase --version

# Error logs
npm run logs:error

# Environment
echo $NODE_ENV

# Browser console errors
# Network tab HAR file
# Screenshots/recordings
```

---

Remember: Most issues have been encountered before. Check existing solutions first! 🔍
