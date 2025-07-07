/**
 * EATECH - Application Constants
 * Version: 1.0.0
 * Description: Centralized constants for the EATECH platform
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/config/constants.ts
 */

// ============================================================================
// SYSTEM CONSTANTS
// ============================================================================

export const SYSTEM = {
  APP_NAME: 'EATECH',
  APP_VERSION: '3.0.0',
  API_VERSION: 'v3',
  MIN_NODE_VERSION: '18.0.0',
  DEFAULT_TIMEZONE: 'Europe/Zurich',
  DEFAULT_LOCALE: 'de-CH',
  DEFAULT_CURRENCY: 'CHF',
  SUPPORTED_LOCALES: ['de-CH', 'fr-CH', 'it-CH', 'en-US'],
  SUPPORTED_CURRENCIES: ['CHF', 'EUR', 'USD']
} as const;

// ============================================================================
// FIREBASE REGIONS
// ============================================================================

export const REGIONS = {
  PRIMARY: 'europe-west1',
  SECONDARY: 'europe-west3',
  STORAGE: 'eu',
  FUNCTIONS: ['europe-west1', 'europe-west3']
} as const;

// ============================================================================
// TIME CONSTANTS
// ============================================================================

export const TIME = {
  // Milliseconds
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
  
  // Timeouts
  DEFAULT_TIMEOUT: 30 * 1000, // 30 seconds
  LONG_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  
  // Cache durations
  CACHE_SHORT: 5 * 60, // 5 minutes
  CACHE_MEDIUM: 60 * 60, // 1 hour
  CACHE_LONG: 24 * 60 * 60, // 24 hours
  
  // Session durations
  SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  REFRESH_TOKEN_DURATION: 30 * 24 * 60 * 60 * 1000, // 30 days
  
  // Retention periods
  LOG_RETENTION_DAYS: 30,
  ANALYTICS_RETENTION_DAYS: 90,
  BACKUP_RETENTION_DAYS: 365
} as const;

// ============================================================================
// BUSINESS RULES
// ============================================================================

export const BUSINESS_RULES = {
  // Order limits
  MIN_ORDER_AMOUNT: 10.00,
  MAX_ORDER_AMOUNT: 10000.00,
  MAX_ITEMS_PER_ORDER: 100,
  MAX_QUANTITY_PER_ITEM: 99,
  
  // Delivery rules
  MAX_DELIVERY_DISTANCE_KM: 20,
  MIN_DELIVERY_TIME_MINUTES: 30,
  MAX_DELIVERY_TIME_MINUTES: 240,
  DELIVERY_TIME_BUFFER_MINUTES: 15,
  
  // Payment rules
  PAYMENT_TIMEOUT_MINUTES: 15,
  REFUND_WINDOW_DAYS: 14,
  CHARGEBACK_WINDOW_DAYS: 120,
  
  // Inventory rules
  LOW_STOCK_THRESHOLD: 10,
  CRITICAL_STOCK_THRESHOLD: 5,
  INVENTORY_RESERVE_MINUTES: 30,
  
  // Customer rules
  MAX_ADDRESSES_PER_CUSTOMER: 10,
  MAX_PAYMENT_METHODS_PER_CUSTOMER: 5,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  
  // Loyalty rules
  POINTS_PER_CHF: 1,
  POINTS_REDEMPTION_RATE: 0.01, // 1 point = 0.01 CHF
  MIN_POINTS_FOR_REDEMPTION: 100,
  POINTS_EXPIRY_DAYS: 365,
  
  // Review rules
  MIN_REVIEW_LENGTH: 10,
  MAX_REVIEW_LENGTH: 1000,
  REVIEW_EDIT_WINDOW_HOURS: 24,
  
  // Promotion rules
  MAX_DISCOUNT_PERCENTAGE: 50,
  MAX_VOUCHER_USES_PER_CUSTOMER: 1,
  PROMO_CODE_LENGTH: 8
} as const;

// ============================================================================
// TECHNICAL LIMITS
// ============================================================================

export const LIMITS = {
  // API limits
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE_SIZE: 20,
  MAX_BATCH_SIZE: 500,
  MAX_REQUEST_SIZE: 10 * 1024 * 1024, // 10MB
  
  // File upload limits
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_DOCUMENT_SIZE: 25 * 1024 * 1024, // 25MB
  MAX_FILES_PER_UPLOAD: 10,
  
  // Text limits
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 5000,
  MAX_NOTE_LENGTH: 1000,
  MAX_URL_LENGTH: 2048,
  
  // Search limits
  MAX_SEARCH_RESULTS: 1000,
  MAX_SEARCH_QUERY_LENGTH: 200,
  MIN_SEARCH_QUERY_LENGTH: 2,
  
  // Notification limits
  MAX_PUSH_NOTIFICATION_LENGTH: 1024,
  MAX_SMS_LENGTH: 160,
  MAX_EMAIL_SIZE: 25 * 1024 * 1024, // 25MB
  
  // Performance limits
  MAX_CONCURRENT_REQUESTS: 100,
  MAX_DB_CONNECTIONS: 50,
  QUERY_TIMEOUT_MS: 30000,
  
  // Security limits
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_DURATION_MINUTES: 30,
  MAX_API_KEY_AGE_DAYS: 365,
  MAX_SESSION_AGE_HOURS: 24
} as const;

// ============================================================================
// STATUS CODES
// ============================================================================

export const STATUS_CODES = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  
  // Redirection
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,
  
  // Client errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;

// ============================================================================
// ROLES & PERMISSIONS
// ============================================================================

export const ROLES = {
  // System roles
  SUPER_ADMIN: 'super_admin',
  SYSTEM_ADMIN: 'system_admin',
  
  // Tenant roles
  TENANT_OWNER: 'tenant_owner',
  TENANT_ADMIN: 'tenant_admin',
  TENANT_MANAGER: 'tenant_manager',
  
  // Staff roles
  CHEF: 'chef',
  COOK: 'cook',
  CASHIER: 'cashier',
  DRIVER: 'driver',
  SERVER: 'server',
  
  // Customer roles
  CUSTOMER: 'customer',
  VIP_CUSTOMER: 'vip_customer',
  GUEST: 'guest'
} as const;

export const PERMISSIONS = {
  // System permissions
  SYSTEM_MANAGE: 'system:manage',
  SYSTEM_VIEW: 'system:view',
  
  // Tenant permissions
  TENANT_CREATE: 'tenant:create',
  TENANT_UPDATE: 'tenant:update',
  TENANT_DELETE: 'tenant:delete',
  TENANT_VIEW: 'tenant:view',
  
  // Order permissions
  ORDER_CREATE: 'order:create',
  ORDER_UPDATE: 'order:update',
  ORDER_CANCEL: 'order:cancel',
  ORDER_VIEW: 'order:view',
  ORDER_REFUND: 'order:refund',
  
  // Product permissions
  PRODUCT_CREATE: 'product:create',
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_DELETE: 'product:delete',
  PRODUCT_VIEW: 'product:view',
  
  // Customer permissions
  CUSTOMER_CREATE: 'customer:create',
  CUSTOMER_UPDATE: 'customer:update',
  CUSTOMER_DELETE: 'customer:delete',
  CUSTOMER_VIEW: 'customer:view',
  
  // Report permissions
  REPORT_CREATE: 'report:create',
  REPORT_VIEW: 'report:view',
  REPORT_EXPORT: 'report:export',
  
  // Settings permissions
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_VIEW: 'settings:view'
} as const;

// ============================================================================
// REGEX PATTERNS
// ============================================================================

export const PATTERNS = {
  // Contact patterns
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  SWISS_PHONE: /^(\+41|0041|0)?[1-9]\d{8,9}$/,
  SWISS_MOBILE: /^(\+41|0041|0)?7[6-9]\d{7}$/,
  SWISS_POSTAL_CODE: /^[1-9][0-9]{3}$/,
  
  // Identifiers
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  ORDER_NUMBER: /^ORD-\d{8}-\d{4}$/,
  SKU: /^[A-Z0-9\-_]+$/,
  
  // Financial
  IBAN: /^CH\d{2}[0-9A-Z]{5}[0-9A-Z]{12}$/,
  CREDIT_CARD: /^\d{13,19}$/,
  CVV: /^\d{3,4}$/,
  
  // Security
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  API_KEY: /^[a-zA-Z0-9_-]{32,}$/,
  JWT_TOKEN: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
  
  // Web
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
} as const;

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
  // Generic
  INTERNAL_ERROR: 'Ein interner Fehler ist aufgetreten',
  NOT_FOUND: 'Ressource nicht gefunden',
  UNAUTHORIZED: 'Nicht autorisiert',
  FORBIDDEN: 'Zugriff verweigert',
  VALIDATION_FAILED: 'Validierung fehlgeschlagen',
  
  // Authentication
  INVALID_CREDENTIALS: 'Ungültige Anmeldedaten',
  TOKEN_EXPIRED: 'Token abgelaufen',
  ACCOUNT_LOCKED: 'Konto gesperrt',
  EMAIL_NOT_VERIFIED: 'E-Mail nicht verifiziert',
  
  // Business logic
  INSUFFICIENT_STOCK: 'Nicht genügend Lagerbestand',
  ORDER_CANNOT_BE_CANCELLED: 'Bestellung kann nicht storniert werden',
  PAYMENT_FAILED: 'Zahlung fehlgeschlagen',
  DELIVERY_NOT_AVAILABLE: 'Lieferung nicht verfügbar',
  MINIMUM_ORDER_NOT_MET: 'Mindestbestellwert nicht erreicht',
  
  // Validation
  REQUIRED_FIELD: 'Pflichtfeld',
  INVALID_EMAIL: 'Ungültige E-Mail-Adresse',
  INVALID_PHONE: 'Ungültige Telefonnummer',
  PASSWORD_TOO_WEAK: 'Passwort zu schwach',
  VALUE_TOO_LONG: 'Wert zu lang',
  VALUE_TOO_SHORT: 'Wert zu kurz',
  INVALID_FORMAT: 'Ungültiges Format'
} as const;

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================

export const SUCCESS_MESSAGES = {
  // Generic
  CREATED: 'Erfolgreich erstellt',
  UPDATED: 'Erfolgreich aktualisiert',
  DELETED: 'Erfolgreich gelöscht',
  SAVED: 'Erfolgreich gespeichert',
  
  // Orders
  ORDER_PLACED: 'Bestellung erfolgreich aufgegeben',
  ORDER_CONFIRMED: 'Bestellung bestätigt',
  ORDER_CANCELLED: 'Bestellung storniert',
  ORDER_REFUNDED: 'Bestellung erstattet',
  
  // Authentication
  LOGIN_SUCCESS: 'Erfolgreich angemeldet',
  LOGOUT_SUCCESS: 'Erfolgreich abgemeldet',
  PASSWORD_RESET: 'Passwort zurückgesetzt',
  EMAIL_VERIFIED: 'E-Mail verifiziert',
  
  // Notifications
  EMAIL_SENT: 'E-Mail gesendet',
  SMS_SENT: 'SMS gesendet',
  NOTIFICATION_SENT: 'Benachrichtigung gesendet'
} as const;

// ============================================================================
// FILE TYPES
// ============================================================================

export const FILE_TYPES = {
  // Images
  IMAGES: {
    ALLOWED: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    MIME_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    MAX_SIZE: 10 * 1024 * 1024 // 10MB
  },
  
  // Documents
  DOCUMENTS: {
    ALLOWED: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv'],
    MIME_TYPES: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ],
    MAX_SIZE: 25 * 1024 * 1024 // 25MB
  },
  
  // Videos
  VIDEOS: {
    ALLOWED: ['.mp4', '.avi', '.mov', '.wmv'],
    MIME_TYPES: ['video/mp4', 'video/x-msvideo', 'video/quicktime', 'video/x-ms-wmv'],
    MAX_SIZE: 100 * 1024 * 1024 // 100MB
  },
  
  // Audio
  AUDIO: {
    ALLOWED: ['.mp3', '.wav', '.ogg', '.m4a'],
    MIME_TYPES: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'],
    MAX_SIZE: 50 * 1024 * 1024 // 50MB
  }
} as const;

// ============================================================================
// COUNTRIES & LANGUAGES
// ============================================================================

export const COUNTRIES = {
  CH: { code: 'CH', name: 'Schweiz', phoneCode: '+41', currency: 'CHF' },
  DE: { code: 'DE', name: 'Deutschland', phoneCode: '+49', currency: 'EUR' },
  AT: { code: 'AT', name: 'Österreich', phoneCode: '+43', currency: 'EUR' },
  FR: { code: 'FR', name: 'Frankreich', phoneCode: '+33', currency: 'EUR' },
  IT: { code: 'IT', name: 'Italien', phoneCode: '+39', currency: 'EUR' },
  LI: { code: 'LI', name: 'Liechtenstein', phoneCode: '+423', currency: 'CHF' }
} as const;

export const LANGUAGES = {
  de: { code: 'de', name: 'Deutsch', locale: 'de-CH' },
  fr: { code: 'fr', name: 'Français', locale: 'fr-CH' },
  it: { code: 'it', name: 'Italiano', locale: 'it-CH' },
  en: { code: 'en', name: 'English', locale: 'en-US' }
} as const;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const FEATURES = {
  // Core features
  MULTI_TENANT: true,
  MULTI_LANGUAGE: true,
  MULTI_CURRENCY: true,
  
  // Payment features
  STRIPE_PAYMENTS: true,
  TWINT_PAYMENTS: true,
  INVOICE_PAYMENTS: true,
  CRYPTO_PAYMENTS: false,
  
  // Communication features
  EMAIL_NOTIFICATIONS: true,
  SMS_NOTIFICATIONS: true,
  PUSH_NOTIFICATIONS: true,
  WHATSAPP_NOTIFICATIONS: false,
  
  // Advanced features
  AI_PREDICTIONS: true,
  LOYALTY_PROGRAM: true,
  GIFT_CARDS: true,
  SUBSCRIPTIONS: true,
  TABLE_RESERVATIONS: true,
  EVENT_MANAGEMENT: true,
  
  // Integrations
  GOOGLE_CALENDAR_SYNC: true,
  ACCOUNTING_INTEGRATION: true,
  POS_INTEGRATION: true,
  DELIVERY_PARTNER_API: false
} as const;

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  SYSTEM,
  REGIONS,
  TIME,
  BUSINESS_RULES,
  LIMITS,
  STATUS_CODES,
  ROLES,
  PERMISSIONS,
  PATTERNS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  FILE_TYPES,
  COUNTRIES,
  LANGUAGES,
  FEATURES
};