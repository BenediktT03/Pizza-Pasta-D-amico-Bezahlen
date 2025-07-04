/**
 * EATECH - Firebase Configuration
 * Version: 13.0.0
 * Description: Firebase Initialisierung und Konfiguration
 * Author: EATECH Development Team
 * Created: 2025-01-04
 * File Path: /packages/core/src/config/firebase.js
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
import { getFunctions } from 'firebase/functions';

// ============================================================================
// FIREBASE CONFIG
// ============================================================================

  const firebaseConfig = {
    apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmU",
    authDomain: "eatech-foodtruck.firebaseapp.com",
    databaseURL: "https://eatech-foodtruck-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "eatech-foodtruck",
    storageBucket: "eatech-foodtruck.firebasestorage.app",
    messagingSenderId: "261222802445",
    appId: "1:261222802445:web:edde22580422fbced22144",
    measurementId: "G-N0KHWJG9KP"
};


// ============================================================================
// INITIALIZE FIREBASE
// ============================================================================

let app;
let auth;
let database;
let storage;
let analytics;
let functions;

try {
    // Initialize Firebase App
    app = initializeApp(firebaseConfig);
    
    // Initialize Services
    auth = getAuth(app);
    database = getDatabase(app);
    storage = getStorage(app);
    functions = getFunctions(app, 'europe-west1');
    
    // Initialize Analytics only in production
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
        analytics = getAnalytics(app);
    }
    
    console.log('🔥 Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

// ============================================================================
// DATABASE HELPERS
// ============================================================================

/**
 * Get database reference with tenant context
 */
export function getTenantRef(path, tenantId = null) {
    if (tenantId) {
        return `tenants/${tenantId}/${path}`;
    }
    return path;
}

/**
 * Get current timestamp
 */
export function getTimestamp() {
    return new Date().toISOString();
}

// ============================================================================
// AUTH HELPERS
// ============================================================================

/**
 * Get current user
 */
export function getCurrentUser() {
    return auth.currentUser;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
    return !!auth.currentUser;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
    app,
    auth,
    database,
    storage,
    analytics,
    functions
};

// Re-export commonly used functions
export {
    // Auth
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail,
    sendEmailVerification
} from 'firebase/auth';

export {
    // Database
    ref,
    set,
    get,
    update,
    remove,
    push,
    onValue,
    off,
    query,
    orderByChild,
    orderByKey,
    orderByValue,
    limitToFirst,
    limitToLast,
    startAt,
    endAt,
    equalTo,
    serverTimestamp
} from 'firebase/database';

export {
    // Storage
    ref as storageRef,
    uploadBytes,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    listAll
} from 'firebase/storage';

export {
    // Functions
    httpsCallable
} from 'firebase/functions';

export default app;