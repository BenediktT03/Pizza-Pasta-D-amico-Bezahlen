// apps/web/src/lib/firebase.ts
// Version: 2.0.0 - Secure Environment Variables with TypeScript
// Last Updated: January 2025

import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  setPersistence,
  browserLocalPersistence,
  connectAuthEmulator
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
  connectFirestoreEmulator,
  initializeFirestore
} from 'firebase/firestore';
import {
  getStorage,
  Storage,
  connectStorageEmulator
} from 'firebase/storage';
import {
  getFunctions,
  Functions,
  connectFunctionsEmulator
} from 'firebase/functions';
import { getMessaging, Messaging } from 'firebase/messaging';
import { getAnalytics, Analytics } from 'firebase/analytics';
import { getPerformance, Performance } from 'firebase/performance';

// Type definitions
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: Storage;
  functions: Functions;
  messaging: Messaging | null;
  analytics: Analytics | null;
  performance: Performance | null;
}

// Environment variable validation
const getEnvVar = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const validateEnvironment = (): FirebaseConfig => {
  try {
    return {
      apiKey: getEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY'),
      authDomain: getEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
      projectId: getEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
      storageBucket: getEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: getEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
      appId: getEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID'),
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
    };
  } catch (error) {
    console.error('Firebase configuration error:', error);
    throw error;
  }
};

// Get validated config
const firebaseConfig = validateEnvironment();

// Initialize Firebase
let app: FirebaseApp;
try {
  app = initializeApp(firebaseConfig);
  console.log('🔥 Firebase initialized successfully for Web App');
} catch (error) {
  console.error('❌ Error initializing Firebase:', error);
  throw error;
}

// Initialize Auth with persistence
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Error setting auth persistence:', error);
});

// Initialize Firestore with enhanced settings
export const db = initializeFirestore(app, {
  cacheSizeBytes: 50 * 1024 * 1024, // 50MB cache
  experimentalForceLongPolling: false,
  experimentalAutoDetectLongPolling: true,
});

// Initialize other services
export const storage = getStorage(app);
export const functions = getFunctions(app, 'europe-west1'); // Swiss region

// Conditional services (only in browser)
export const messaging = typeof window !== 'undefined' && 'Notification' in window
  ? getMessaging(app)
  : null;

export const analytics = typeof window !== 'undefined' && process.env.NODE_ENV === 'production'
  ? getAnalytics(app)
  : null;

export const performance = typeof window !== 'undefined' && process.env.NODE_ENV === 'production'
  ? getPerformance(app)
  : null;

// Enable offline persistence
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db)
    .then(() => {
      console.log('✅ Offline persistence enabled');
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('⚠️ Multiple tabs open, persistence only enabled in one');
      } else if (err.code === 'unimplemented') {
        console.warn('⚠️ Browser doesn\'t support offline persistence');
      }
    });
}

// Connect to emulators in development
if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
  console.log('🔧 Connecting to Firebase emulators...');

  if (!auth.config.emulator) {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  }

  // @ts-ignore - Firestore emulator connection check
  if (!db._delegate._databaseId.isDefaultDatabase) {
    connectFirestoreEmulator(db, 'localhost', 8080);
  }

  if (!storage.app.options.emulator) {
    connectStorageEmulator(storage, 'localhost', 9199);
  }

  if (!functions.app.options.emulator) {
    connectFunctionsEmulator(functions, 'localhost', 5001);
  }
}

// Multi-tenant helpers
export const tenantUtils = {
  /**
   * Get current tenant from URL or localStorage
   */
  getCurrentTenant: (): string | null => {
    if (typeof window === 'undefined') return null;

    // Check URL subdomain
    const hostname = window.location.hostname;
    const parts = hostname.split('.');

    // Handle localhost
    if (hostname.includes('localhost')) {
      return localStorage.getItem('currentTenant');
    }

    // Handle production subdomains
    if (parts.length >= 3) {
      const subdomain = parts[0];
      if (subdomain && !['www', 'app', 'admin', 'master'].includes(subdomain)) {
        return subdomain;
      }
    }

    // Fallback to localStorage
    return localStorage.getItem('currentTenant');
  },

  /**
   * Set current tenant
   */
  setCurrentTenant: (tenantId: string): void => {
    localStorage.setItem('currentTenant', tenantId);
  },

  /**
   * Clear current tenant
   */
  clearCurrentTenant: (): void => {
    localStorage.removeItem('currentTenant');
  },

  /**
   * Get tenant-specific collection reference
   */
  getTenantCollection: (tenantId: string, collection: string) => {
    return db.collection(`tenants/${tenantId}/${collection}`);
  }
};

// PWA helpers
export const pwaUtils = {
  /**
   * Check if app is installed as PWA
   */
  isPWA: (): boolean => {
    if (typeof window === 'undefined') return false;

    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-ignore - iOS specific
      window.navigator.standalone ||
      document.referrer.includes('android-app://')
    );
  },

  /**
   * Register service worker
   */
  registerServiceWorker: async (): Promise<ServiceWorkerRegistration | undefined> => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('✅ Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  },

  /**
   * Request notification permission
   */
  requestNotificationPermission: async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    return await Notification.requestPermission();
  }
};

// Export all services
const firebase: FirebaseServices = {
  app,
  auth,
  db,
  storage,
  functions,
  messaging,
  analytics,
  performance
};

export default firebase;
