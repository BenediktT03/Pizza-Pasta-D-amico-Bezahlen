// apps/master/src/services/firebase/config.js
// Version: 2.0.0 - Secure Environment Variables
// Last Updated: January 2025

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';
import { getPerformance } from 'firebase/performance';

// Master-specific environment validation
const validateMasterEnvVars = () => {
  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_MASTER_API_KEY', // Master-specific API key
    'VITE_MASTER_SECRET'    // Master-specific secret
  ];

  const missing = required.filter(key => !import.meta.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    throw new Error(`Missing Master configuration: ${missing.join(', ')}`);
  }

  // Validate master access
  if (import.meta.env.VITE_MASTER_SECRET !== btoa('eatech-master-2025')) {
    throw new Error('Invalid Master secret');
  }
};

// Validate before initializing
validateMasterEnvVars();

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('🚀 Firebase initialized successfully for Master Control');
} catch (error) {
  console.error('❌ Error initializing Firebase:', error);
  throw error;
}

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Master-specific services
export const analytics = import.meta.env.PROD ? getAnalytics(app) : null;
export const performance = import.meta.env.PROD ? getPerformance(app) : null;

// Master Control specific configuration
export const masterConfig = {
  apiKey: import.meta.env.VITE_MASTER_API_KEY,
  apiUrl: import.meta.env.VITE_API_URL || 'https://api.eatech.ch',
  wsUrl: import.meta.env.VITE_WS_URL || 'wss://ws.eatech.ch',

  // Master permissions
  permissions: {
    canAccessAllTenants: true,
    canModifySystemConfig: true,
    canViewAnalytics: true,
    canManageFeatureFlags: true,
    canAccessBilling: true,
    canViewSystemHealth: true,
    canManageAI: true
  },

  // System limits
  limits: {
    maxConcurrentRequests: 100,
    requestTimeout: 30000, // 30 seconds
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxBatchSize: 500
  }
};

// Enhanced Firestore settings for Master
import {
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
  initializeFirestore
} from 'firebase/firestore';

// Custom Firestore settings for Master
const firestoreSettings = {
  cacheSizeBytes: 100 * 1024 * 1024, // 100MB cache for master
  experimentalForceLongPolling: false,
  experimentalAutoDetectLongPolling: true
};

// Apply custom settings
db._settings = firestoreSettings;

// Enable offline persistence with enhanced settings
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence not supported in this browser');
    }
  });
}

// Master-specific auth configuration
auth.useDeviceLanguage();

// Add custom claims checker for master users
export const checkMasterAccess = async (user) => {
  if (!user) return false;

  const idTokenResult = await user.getIdTokenResult();
  const claims = idTokenResult.claims;

  return claims.role === 'superadmin' || claims.role === 'admin';
};

// System health monitoring
export const systemHealth = {
  checkFirebaseConnection: async () => {
    try {
      const testDoc = await db.collection('_health').doc('check').get();
      return { connected: true, latency: Date.now() - testDoc.metadata.fromCache };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  },

  getServiceStatus: async () => {
    const services = {
      auth: { status: 'unknown' },
      firestore: { status: 'unknown' },
      storage: { status: 'unknown' },
      functions: { status: 'unknown' }
    };

    // Check each service
    try {
      await auth.currentUser?.reload();
      services.auth.status = 'operational';
    } catch (e) {
      services.auth.status = 'error';
    }

    try {
      await db.collection('_health').doc('test').get();
      services.firestore.status = 'operational';
    } catch (e) {
      services.firestore.status = 'error';
    }

    return services;
  }
};

export default app;
// Export configured Firebase app
