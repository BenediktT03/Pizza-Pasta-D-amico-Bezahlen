// Firebase Configuration for Master Admin
import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  Auth,
  connectAuthEmulator 
} from 'firebase/auth';
import { 
  getFirestore, 
  Firestore,
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { 
  getFunctions, 
  Functions,
  connectFunctionsEmulator 
} from 'firebase/functions';
import { 
  getStorage, 
  Storage,
  connectStorageEmulator 
} from 'firebase/storage';
import { 
  getAnalytics, 
  Analytics,
  isSupported 
} from 'firebase/analytics';
import { 
  getPerformance, 
  Performance 
} from 'firebase/performance';

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
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;
let storage: Storage;
let analytics: Analytics | null = null;
let performance: Performance | null = null;

// Initialize app
app = initializeApp(firebaseConfig);

// Initialize Auth
auth = getAuth(app);

// Initialize Firestore with offline persistence for Master Admin
db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Initialize Functions
functions = getFunctions(app, 'europe-west1');

// Initialize Storage
storage = getStorage(app);

// Initialize Analytics (only in production)
if (import.meta.env.PROD) {
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
      performance = getPerformance(app);
    }
  });
}

// Connect to emulators in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectFunctionsEmulator(functions, 'localhost', 5001);
  connectStorageEmulator(storage, 'localhost', 9199);
}

// Master Admin specific configurations
export const MASTER_ADMIN_ROLE = 'master_admin';
export const MASTER_COLLECTIONS = {
  FEATURE_FLAGS: 'feature_flags',
  PLATFORM_ALERTS: 'platform_alerts',
  SYSTEM_MONITORING: 'system_monitoring',
  ANALYTICS_REALTIME: 'analytics_realtime',
  AUDIT_LOGS: 'audit_logs',
  DEPLOYMENTS: 'deployments',
  SUPPORT_TICKETS: 'support_tickets'
};

// Export instances
export { app, auth, db, functions, storage, analytics, performance };

// Helper function to verify master admin access
export const verifyMasterAdminAccess = async (): Promise<boolean> => {
  const user = auth.currentUser;
  if (!user) return false;
  
  try {
    const idTokenResult = await user.getIdTokenResult();
    return idTokenResult.claims.role === MASTER_ADMIN_ROLE;
  } catch (error) {
    console.error('Error verifying master admin access:', error);
    return false;
  }
};

// Helper function to get master admin token
export const getMasterAdminToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    const idTokenResult = await user.getIdTokenResult();
    if (idTokenResult.claims.role === MASTER_ADMIN_ROLE) {
      return await user.getIdToken();
    }
    return null;
  } catch (error) {
    console.error('Error getting master admin token:', error);
    return null;
  }
};
