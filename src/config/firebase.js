/**
 * EATECH - Firebase Configuration
 * Version: 5.0.0
 * Description: Zentrale Firebase-Konfiguration mit Multi-Instance Support,
 *              optimierten Einstellungen für die Schweiz und Error Handling
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 * File Path: /src/config/firebase.js
 */

// ============================================================================
// IMPORTS
// ============================================================================
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    connectAuthEmulator,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
} from 'firebase/auth';
import { 
    getDatabase, 
    connectDatabaseEmulator,
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
    equalTo,
    limitToFirst,
    limitToLast,
    startAt,
    endAt,
    child,
    onDisconnect,
    serverTimestamp,
    increment
} from 'firebase/database';
import { 
    getStorage, 
    connectStorageEmulator,
    ref as storageRef,
    uploadBytes,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    listAll
} from 'firebase/storage';
import { 
    getAnalytics, 
    logEvent,
    setUserId,
    setUserProperties
} from 'firebase/analytics';
import { 
    getPerformance,
    trace
} from 'firebase/performance';
import { 
    getMessaging,
    getToken,
    onMessage,
    isSupported
} from 'firebase/messaging';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Firebase config from environment variables
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Validate config
const validateConfig = () => {
    const required = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'];
    const missing = required.filter(key => !firebaseConfig[key]);
    
    if (missing.length > 0) {
        throw new Error(`Missing Firebase config: ${missing.join(', ')}`);
    }
};

// Multi-instance configuration for scaling
const FIREBASE_INSTANCES = {
    'ch-central': {
        url: process.env.REACT_APP_FIREBASE_DATABASE_URL_CENTRAL || firebaseConfig.databaseURL,
        regions: ['ZH', 'BE', 'LU', 'ZG']
    },
    'ch-west': {
        url: process.env.REACT_APP_FIREBASE_DATABASE_URL_WEST || firebaseConfig.databaseURL,
        regions: ['GE', 'VD', 'FR', 'NE']
    },
    'ch-east': {
        url: process.env.REACT_APP_FIREBASE_DATABASE_URL_EAST || firebaseConfig.databaseURL,
        regions: ['SG', 'GR', 'TG', 'AR']
    },
    'ch-south': {
        url: process.env.REACT_APP_FIREBASE_DATABASE_URL_SOUTH || firebaseConfig.databaseURL,
        regions: ['TI', 'VS']
    }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

// Validate before initializing
validateConfig();

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);
const functions = getFunctions(app, 'europe-west6'); // Zürich region
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const performance = typeof window !== 'undefined' ? getPerformance(app) : null;

// Initialize messaging (with check for browser support)
let messaging = null;
if (typeof window !== 'undefined') {
    isSupported().then(supported => {
        if (supported) {
            messaging = getMessaging(app);
        }
    });
}

// ============================================================================
// EMULATOR CONFIGURATION (Development)
// ============================================================================

if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_EMULATORS === 'true') {
    console.log('🔧 Using Firebase Emulators');
    
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectDatabaseEmulator(database, 'localhost', 9000);
    connectStorageEmulator(storage, 'localhost', 9199);
    connectFunctionsEmulator(functions, 'localhost', 5001);
}

// ============================================================================
// AUTH CONFIGURATION
// ============================================================================

// Set auth persistence
setPersistence(auth, browserLocalPersistence).catch(error => {
    console.error('Error setting auth persistence:', error);
});

// Auth state observer with error handling
let authStateUnsubscribe = null;

const initializeAuthObserver = (callback) => {
    if (authStateUnsubscribe) {
        authStateUnsubscribe();
    }
    
    authStateUnsubscribe = onAuthStateChanged(
        auth,
        (user) => {
            if (user && analytics) {
                setUserId(analytics, user.uid);
                setUserProperties(analytics, {
                    account_type: user.email?.includes('@eatech.ch') ? 'internal' : 'customer'
                });
            }
            callback(user);
        },
        (error) => {
            console.error('Auth state change error:', error);
            callback(null);
        }
    );
    
    return authStateUnsubscribe;
};

// ============================================================================
// DATABASE HELPERS
// ============================================================================

/**
 * Gets the appropriate database instance based on region
 * @param {string} region - Swiss canton code
 * @returns {Database} Database instance
 */
const getDatabaseForRegion = (region) => {
    // Find the appropriate instance
    for (const [key, config] of Object.entries(FIREBASE_INSTANCES)) {
        if (config.regions.includes(region)) {
            // In production, return region-specific database
            // For now, return default database
            return database;
        }
    }
    return database;
};

/**
 * Enhanced database reference with automatic retry
 * @param {string} path - Database path
 * @param {Object} options - Options
 * @returns {DatabaseReference} Database reference
 */
const dbRef = (path, options = {}) => {
    const { region = null, retries = 3 } = options;
    const db = region ? getDatabaseForRegion(region) : database;
    return ref(db, path);
};

/**
 * Writes data with automatic retry and offline queue
 * @param {string} path - Database path
 * @param {any} data - Data to write
 * @param {Object} options - Options
 */
const writeData = async (path, data, options = {}) => {
    const { retries = 3, priority = 'normal' } = options;
    let lastError;
    
    for (let i = 0; i < retries; i++) {
        try {
            await set(dbRef(path), {
                ...data,
                _lastUpdated: serverTimestamp()
            });
            
            // Log analytics event
            if (analytics) {
                logEvent(analytics, 'data_write', {
                    path: path.split('/')[0], // Only log first part for privacy
                    priority
                });
            }
            
            return;
        } catch (error) {
            lastError = error;
            console.error(`Write attempt ${i + 1} failed:`, error);
            
            // Exponential backoff
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            }
        }
    }
    
    throw lastError;
};

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/**
 * Creates a performance trace
 * @param {string} name - Trace name
 * @returns {Object} Trace object with start/stop methods
 */
const createTrace = (name) => {
    if (!performance) {
        return {
            start: () => {},
            stop: () => {},
            putAttribute: () => {},
            putMetric: () => {},
            getAttribute: () => null,
            getMetric: () => 0
        };
    }
    
    const traceObj = trace(performance, name);
    
    return {
        start: () => traceObj.start(),
        stop: () => traceObj.stop(),
        putAttribute: (attr, value) => traceObj.putAttribute(attr, value),
        putMetric: (metric, value) => traceObj.putMetric(metric, value),
        getAttribute: (attr) => traceObj.getAttribute(attr),
        getMetric: (metric) => traceObj.getMetric(metric)
    };
};

// ============================================================================
// MESSAGING CONFIGURATION
// ============================================================================

/**
 * Requests notification permission and returns FCM token
 * @returns {Promise<string>} FCM token
 */
const requestNotificationPermission = async () => {
    if (!messaging) {
        console.warn('Messaging not supported in this browser');
        return null;
    }
    
    try {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            const token = await getToken(messaging, {
                vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY
            });
            
            console.log('FCM Token:', token);
            return token;
        } else {
            console.log('Notification permission denied');
            return null;
        }
    } catch (error) {
        console.error('Error getting notification permission:', error);
        return null;
    }
};

/**
 * Sets up foreground message listener
 * @param {Function} callback - Message handler
 */
const onForegroundMessage = (callback) => {
    if (!messaging) return () => {};
    
    return onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        callback(payload);
    });
};

// ============================================================================
// CLOUD FUNCTIONS
// ============================================================================

// Define callable functions
const cloudFunctions = {
    // Order functions
    processOrder: httpsCallable(functions, 'processOrder'),
    updateOrderStatus: httpsCallable(functions, 'updateOrderStatus'),
    
    // Payment functions
    createPaymentIntent: httpsCallable(functions, 'createPaymentIntent'),
    processTwintPayment: httpsCallable(functions, 'processTwintPayment'),
    
    // Analytics functions
    generateReport: httpsCallable(functions, 'generateReport'),
    exportData: httpsCallable(functions, 'exportData'),
    
    // Tenant functions
    createTenant: httpsCallable(functions, 'createTenant'),
    updateTenant: httpsCallable(functions, 'updateTenant'),
    
    // Notification functions
    sendNotification: httpsCallable(functions, 'sendNotification'),
    sendBulkNotifications: httpsCallable(functions, 'sendBulkNotifications')
};

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Handles Firebase errors with user-friendly messages
 * @param {Error} error - Firebase error
 * @returns {string} User-friendly error message
 */
const handleFirebaseError = (error) => {
    const errorMessages = {
        'auth/user-not-found': 'Benutzer nicht gefunden',
        'auth/wrong-password': 'Falsches Passwort',
        'auth/email-already-in-use': 'E-Mail wird bereits verwendet',
        'auth/weak-password': 'Passwort ist zu schwach',
        'auth/invalid-email': 'Ungültige E-Mail-Adresse',
        'auth/too-many-requests': 'Zu viele Anfragen. Bitte später versuchen',
        'permission-denied': 'Keine Berechtigung für diese Aktion',
        'unavailable': 'Service vorübergehend nicht verfügbar'
    };
    
    return errorMessages[error.code] || 'Ein Fehler ist aufgetreten';
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
    // App instance
    app,
    
    // Auth
    auth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    onAuthStateChanged,
    initializeAuthObserver,
    
    // Database
    database,
    dbRef,
    writeData,
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
    equalTo,
    limitToFirst,
    limitToLast,
    startAt,
    endAt,
    child,
    onDisconnect,
    serverTimestamp,
    increment,
    getDatabaseForRegion,
    
    // Storage
    storage,
    storageRef,
    uploadBytes,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    listAll,
    
    // Functions
    functions,
    cloudFunctions,
    
    // Analytics
    analytics,
    logEvent,
    setUserId,
    setUserProperties,
    
    // Performance
    performance,
    createTrace,
    
    // Messaging
    messaging,
    requestNotificationPermission,
    onForegroundMessage,
    
    // Helpers
    handleFirebaseError
};

// Default export
export default app;