/**
 * EATECH Core Firebase Configuration
 * Version: 3.0.0
 * 
 * Centralized Firebase configuration for all apps
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /packages/core/src/config/firebase.js
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getPerformance } from 'firebase/performance';
import { getDatabase } from 'firebase/database';
import { getMessaging, isSupported as isMessagingSupported } from 'firebase/messaging';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID || process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app, 'europe-west6'); // Zurich region
const rtdb = getDatabase(app);

// Initialize Analytics (only in browser and production)
let analytics = null;
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

// Initialize Performance Monitoring (only in production)
let performance = null;
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  performance = getPerformance(app);
}

// Initialize Messaging (only in browser)
let messaging = null;
if (typeof window !== 'undefined') {
  isMessagingSupported().then(supported => {
    if (supported) {
      messaging = getMessaging(app);
    }
  });
}

// Connect to emulators in development
const useEmulator = process.env.VITE_USE_FIREBASE_EMULATOR === 'true' || 
                   process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

if (useEmulator && process.env.NODE_ENV === 'development') {
  // Auth emulator
  if (!auth._canInitEmulator) {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  }
  
  // Firestore emulator
  if (!db._settings?.host?.includes('localhost')) {
    connectFirestoreEmulator(db, 'localhost', 8080);
  }
  
  // Storage emulator
  if (!storage._bucket?.includes('localhost')) {
    connectStorageEmulator(storage, 'localhost', 9199);
  }
  
  // Functions emulator
  if (!functions._customDomain) {
    connectFunctionsEmulator(functions, 'localhost', 5001);
  }
  
  console.log('🔧 Firebase Emulators connected');
}

// Helper functions
export const isEmulator = () => useEmulator && process.env.NODE_ENV === 'development';

// Collections references
export const collections = {
  // Core collections
  tenants: 'tenants',
  customers: 'customers',
  orders: 'orders',
  products: 'products',
  categories: 'categories',
  reviews: 'reviews',
  
  // Location & Events
  locations: 'locations',
  events: 'events',
  
  // System collections
  config: 'config',
  features: 'features',
  analytics: 'analytics',
  logs: 'logs',
  
  // Support
  notifications: 'notifications',
  supportTickets: 'support_tickets',
  
  // Nested collections
  getStaff: (tenantId) => `tenants/${tenantId}/staff`,
  getInvoices: (tenantId) => `tenants/${tenantId}/invoices`,
  getSettings: (tenantId) => `tenants/${tenantId}/settings`,
  getFavorites: (customerId) => `customers/${customerId}/favorites`,
  getPaymentMethods: (customerId) => `customers/${customerId}/payment_methods`,
  getLoyalty: (customerId, tenantId) => `customers/${customerId}/loyalty/${tenantId}`
};

// Timestamp helper
export const timestamp = () => {
  if (isEmulator()) {
    return new Date();
  }
  return getFirestore().FieldValue.serverTimestamp();
};

// Export services
export {
  app,
  auth,
  db,
  storage,
  functions,
  rtdb,
  analytics,
  performance,
  messaging
};

// Export Firebase types
export * from 'firebase/app';
export * from 'firebase/auth';
export * from 'firebase/firestore';
export * from 'firebase/storage';
export * from 'firebase/functions';
export * from 'firebase/database';

// Default export
export default {
  app,
  auth,
  db,
  storage,
  functions,
  rtdb,
  analytics,
  performance,
  messaging,
  collections,
  isEmulator,
  timestamp
};