// apps/admin/src/services/firebase/firebaseConfig.js
// Version: 2.0.0 - Secure Environment Variables
// Last Updated: January 2025

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';

// Validate environment variables
const validateEnvVars = () => {
  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ];

  const missing = required.filter(key => !import.meta.env[key]);

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    throw new Error(`Missing Firebase configuration: ${missing.join(', ')}`);
  }
};

// Validate before initializing
validateEnvVars();

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID // Optional
};

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully for Admin App');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Initialize Analytics only in production
export const analytics = import.meta.env.PROD && firebaseConfig.measurementId
  ? getAnalytics(app)
  : null;

// Multi-tenant configuration
export const tenantConfig = {
  // Get current tenant from subdomain or localStorage
  getCurrentTenant: () => {
    // First check URL subdomain
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];

    if (subdomain && subdomain !== 'admin' && subdomain !== 'www') {
      return subdomain;
    }

    // Fallback to localStorage
    return localStorage.getItem('currentTenant') || null;
  },

  // Set current tenant
  setCurrentTenant: (tenantId) => {
    localStorage.setItem('currentTenant', tenantId);
  }
};

// Firestore settings for better offline support
import { enableIndexedDbPersistence, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';

// Enable offline persistence
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      // The current browser doesn't support persistence
      console.warn('Firestore persistence not supported in this browser');
    }
  });
}

// Export configured Firebase app
export default app;
