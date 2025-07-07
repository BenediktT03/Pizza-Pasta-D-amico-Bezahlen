/**
 * EATECH - Firebase Configuration
 * Version: 1.0.0
 * Description: Firebase configuration and initialization
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/config/firebase.config.ts
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// ============================================================================
// FIREBASE PROJECT CONFIGURATION
// ============================================================================

export const FIREBASE_CONFIG = {
  projectId: 'eatech-foodtruck',
  databaseURL: 'https://eatech-foodtruck-default-rtdb.europe-west1.firebasedatabase.app',
  storageBucket: 'eatech-foodtruck.firebasestorage.app',
  region: 'europe-west1',
  messagingSenderId: '261222802445',
  appId: '1:261222802445:web:edde22580422fbced22144'
};

// ============================================================================
// COLLECTION NAMES
// ============================================================================

export const COLLECTIONS = {
  // Core Collections
  TENANTS: 'tenants',
  USERS: 'users',
  CUSTOMERS: 'customers',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  PAYMENTS: 'payments',
  
  // Event & Catering
  EVENTS: 'events',
  BOOKINGS: 'bookings',
  VENUES: 'venues',
  
  // Inventory & Supply
  INVENTORY: 'inventory',
  SUPPLIERS: 'suppliers',
  PURCHASE_ORDERS: 'purchaseOrders',
  
  // Analytics & Reporting
  ANALYTICS: 'analytics',
  REPORTS: 'reports',
  METRICS: 'metrics',
  
  // Communication
  NOTIFICATIONS: 'notifications',
  MESSAGES: 'messages',
  TEMPLATES: 'templates',
  
  // Loyalty & Promotions
  LOYALTY_PROGRAMS: 'loyaltyPrograms',
  PROMOTIONS: 'promotions',
  VOUCHERS: 'vouchers',
  
  // System
  SETTINGS: 'settings',
  LOGS: 'logs',
  AUDIT_TRAIL: 'auditTrail',
  ERROR_LOGS: 'errorLogs',
  RATE_LIMITS: 'rateLimits',
  
  // AI & ML
  AI_MODELS: 'aiModels',
  PREDICTIONS: 'predictions',
  TRAINING_DATA: 'trainingData'
} as const;

// ============================================================================
// SUBCOLLECTION NAMES
// ============================================================================

export const SUBCOLLECTIONS = {
  // User subcollections
  USER_SESSIONS: 'sessions',
  USER_DEVICES: 'devices',
  USER_PREFERENCES: 'preferences',
  
  // Customer subcollections
  CUSTOMER_ADDRESSES: 'addresses',
  CUSTOMER_PAYMENT_METHODS: 'paymentMethods',
  CUSTOMER_ORDERS: 'orders',
  CUSTOMER_FAVORITES: 'favorites',
  CUSTOMER_REVIEWS: 'reviews',
  
  // Product subcollections
  PRODUCT_VARIANTS: 'variants',
  PRODUCT_REVIEWS: 'reviews',
  PRODUCT_INVENTORY: 'inventory',
  
  // Order subcollections
  ORDER_ITEMS: 'items',
  ORDER_STATUS_HISTORY: 'statusHistory',
  ORDER_TIMELINE: 'timeline',
  
  // Event subcollections
  EVENT_STAFF: 'staff',
  EVENT_EQUIPMENT: 'equipment',
  EVENT_TASKS: 'tasks',
  EVENT_DOCUMENTS: 'documents',
  
  // Tenant subcollections
  TENANT_LOCATIONS: 'locations',
  TENANT_STAFF: 'staff',
  TENANT_INTEGRATIONS: 'integrations',
  TENANT_BILLING: 'billing'
} as const;

// ============================================================================
// STORAGE PATHS
// ============================================================================

export const STORAGE_PATHS = {
  // Product images
  PRODUCT_IMAGES: 'products/{tenantId}/{productId}',
  PRODUCT_THUMBNAILS: 'products/{tenantId}/{productId}/thumbnails',
  
  // User uploads
  USER_AVATARS: 'users/{userId}/avatar',
  USER_DOCUMENTS: 'users/{userId}/documents',
  
  // Tenant assets
  TENANT_LOGOS: 'tenants/{tenantId}/logo',
  TENANT_BANNERS: 'tenants/{tenantId}/banners',
  TENANT_DOCUMENTS: 'tenants/{tenantId}/documents',
  
  // Order attachments
  ORDER_RECEIPTS: 'orders/{tenantId}/{orderId}/receipts',
  ORDER_INVOICES: 'orders/{tenantId}/{orderId}/invoices',
  
  // Event files
  EVENT_IMAGES: 'events/{tenantId}/{eventId}/images',
  EVENT_DOCUMENTS: 'events/{tenantId}/{eventId}/documents',
  
  // Reports
  REPORTS: 'reports/{tenantId}/{reportType}/{year}/{month}',
  EXPORTS: 'exports/{tenantId}/{exportType}',
  
  // Backups
  BACKUPS: 'backups/{tenantId}/{timestamp}',
  
  // Temp files
  TEMP: 'temp/{userId}'
} as const;

// ============================================================================
// REALTIME DATABASE PATHS
// ============================================================================

export const RTDB_PATHS = {
  // Live order tracking
  ACTIVE_ORDERS: 'activeOrders/{tenantId}',
  ORDER_QUEUE: 'orderQueue/{tenantId}',
  
  // Kitchen display
  KITCHEN_ORDERS: 'kitchen/{tenantId}/orders',
  KITCHEN_STATIONS: 'kitchen/{tenantId}/stations',
  
  // Live tracking
  DELIVERY_TRACKING: 'tracking/deliveries/{orderId}',
  DRIVER_LOCATIONS: 'tracking/drivers/{driverId}',
  
  // Real-time stats
  LIVE_STATS: 'stats/{tenantId}/live',
  PRESENCE: 'presence/{tenantId}',
  
  // Chat/Support
  SUPPORT_CHATS: 'chats/support/{chatId}',
  
  // Notifications
  USER_NOTIFICATIONS: 'notifications/users/{userId}',
  
  // System status
  SYSTEM_STATUS: 'system/status',
  SERVICE_HEALTH: 'system/health'
} as const;

// ============================================================================
// FIREBASE INITIALIZATION
// ============================================================================

/**
 * Initializes Firebase Admin SDK
 */
export function initializeFirebase(): admin.app.App {
  if (admin.apps.length === 0) {
    const app = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      databaseURL: FIREBASE_CONFIG.databaseURL,
      storageBucket: FIREBASE_CONFIG.storageBucket,
      projectId: FIREBASE_CONFIG.projectId
    });
    
    // Set Firestore settings
    const firestore = admin.firestore();
    firestore.settings({
      timestampsInSnapshots: true,
      ignoreUndefinedProperties: true
    });
    
    functions.logger.info('Firebase Admin SDK initialized');
    return app;
  }
  
  return admin.app();
}

// ============================================================================
// FIRESTORE HELPERS
// ============================================================================

/**
 * Gets a Firestore collection reference
 */
export function getCollection(collectionName: string): admin.firestore.CollectionReference {
  return admin.firestore().collection(collectionName);
}

/**
 * Gets a tenant-specific collection reference
 */
export function getTenantCollection(
  tenantId: string, 
  collectionName: string
): admin.firestore.CollectionReference {
  return admin.firestore()
    .collection(COLLECTIONS.TENANTS)
    .doc(tenantId)
    .collection(collectionName);
}

/**
 * Creates a Firestore batch
 */
export function createBatch(): admin.firestore.WriteBatch {
  return admin.firestore().batch();
}

/**
 * Creates a Firestore transaction
 */
export async function runTransaction<T>(
  updateFunction: (transaction: admin.firestore.Transaction) => Promise<T>
): Promise<T> {
  return admin.firestore().runTransaction(updateFunction);
}

// ============================================================================
// REALTIME DATABASE HELPERS
// ============================================================================

/**
 * Gets a Realtime Database reference
 */
export function getRTDBRef(path: string): admin.database.Reference {
  return admin.database().ref(path);
}

/**
 * Gets server timestamp for RTDB
 */
export function getRTDBTimestamp(): any {
  return admin.database.ServerValue.TIMESTAMP;
}

// ============================================================================
// STORAGE HELPERS
// ============================================================================

/**
 * Gets a Storage bucket reference
 */
export function getStorageBucket(): admin.storage.Bucket {
  return admin.storage().bucket();
}

/**
 * Gets a file reference in Storage
 */
export function getStorageFile(path: string): admin.storage.File {
  return admin.storage().bucket().file(path);
}

/**
 * Generates a signed URL for a file
 */
export async function generateSignedUrl(
  filePath: string,
  expirationMinutes: number = 60
): Promise<string> {
  const file = getStorageFile(filePath);
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + expirationMinutes * 60 * 1000
  });
  return url;
}

// ============================================================================
// FIELD VALUES
// ============================================================================

export const FieldValue = admin.firestore.FieldValue;
export const FieldPath = admin.firestore.FieldPath;
export const Timestamp = admin.firestore.Timestamp;
export const GeoPoint = admin.firestore.GeoPoint;

// ============================================================================
// EMULATOR CONFIGURATION
// ============================================================================

/**
 * Configures Firebase emulators for development
 */
export function configureEmulators(): void {
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
    process.env.FIREBASE_DATABASE_EMULATOR_HOST = 'localhost:9000';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
    process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';
    process.env.PUBSUB_EMULATOR_HOST = 'localhost:8085';
    
    functions.logger.info('Firebase emulators configured');
  }
}

// ============================================================================
// BACKUP CONFIGURATION
// ============================================================================

export const BACKUP_CONFIG = {
  // Collections to backup
  collections: [
    COLLECTIONS.TENANTS,
    COLLECTIONS.USERS,
    COLLECTIONS.CUSTOMERS,
    COLLECTIONS.PRODUCTS,
    COLLECTIONS.ORDERS,
    COLLECTIONS.EVENTS,
    COLLECTIONS.INVENTORY
  ],
  
  // Backup schedule
  schedule: {
    daily: '0 3 * * *',      // 3 AM daily
    weekly: '0 4 * * 0',     // 4 AM on Sundays
    monthly: '0 5 1 * *'     // 5 AM on 1st of month
  },
  
  // Retention periods (days)
  retention: {
    daily: 7,
    weekly: 30,
    monthly: 365
  }
};

// ============================================================================
// SECURITY RULES HELPERS
// ============================================================================

/**
 * Common security rule patterns
 */
export const SECURITY_PATTERNS = {
  // Check if user is authenticated
  isAuthenticated: 'request.auth != null',
  
  // Check if user owns the resource
  isOwner: 'request.auth.uid == resource.data.userId',
  
  // Check if user is admin
  isAdmin: 'request.auth.token.admin == true',
  
  // Check if user belongs to tenant
  belongsToTenant: 'request.auth.token.tenantId == resource.data.tenantId',
  
  // Check if data is valid
  hasRequiredFields: (fields: string[]) => 
    fields.map(f => `request.resource.data.keys().hasAll(['${f}'])`).join(' && ')
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Configuration
  FIREBASE_CONFIG,
  COLLECTIONS,
  SUBCOLLECTIONS,
  STORAGE_PATHS,
  RTDB_PATHS,
  BACKUP_CONFIG,
  SECURITY_PATTERNS,
  
  // Initialization
  initializeFirebase,
  configureEmulators,
  
  // Firestore helpers
  getCollection,
  getTenantCollection,
  createBatch,
  runTransaction,
  
  // RTDB helpers
  getRTDBRef,
  getRTDBTimestamp,
  
  // Storage helpers
  getStorageBucket,
  getStorageFile,
  generateSignedUrl,
  
  // Field values
  FieldValue,
  FieldPath,
  Timestamp,
  GeoPoint
};