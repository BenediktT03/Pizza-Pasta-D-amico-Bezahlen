// App Information
export const APP_NAME = 'EATECH'
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '3.0.0'
export const APP_DESCRIPTION = 'Smart Foodtruck Ordering Platform'

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'
export const API_TIMEOUT = 30000 // 30 seconds
export const API_RETRY_ATTEMPTS = 3
export const API_RETRY_DELAY = 1000 // 1 second

// Swiss Configuration
export const DEFAULT_LOCALE = 'de-CH'
export const DEFAULT_CURRENCY = 'CHF'
export const VAT_RATE = 0.077 // 7.7% Swiss VAT
export const CURRENCY_SYMBOL = 'CHF'
export const DECIMAL_PLACES = 2

// Supported Languages
export const SUPPORTED_LOCALES = [
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
] as const

// Swiss Cantons
export const SWISS_CANTONS = [
  { code: 'ZH', name: 'Zürich' },
  { code: 'BE', name: 'Bern' },
  { code: 'LU', name: 'Luzern' },
  { code: 'UR', name: 'Uri' },
  { code: 'SZ', name: 'Schwyz' },
  { code: 'OW', name: 'Obwalden' },
  { code: 'NW', name: 'Nidwalden' },
  { code: 'GL', name: 'Glarus' },
  { code: 'ZG', name: 'Zug' },
  { code: 'FR', name: 'Fribourg' },
  { code: 'SO', name: 'Solothurn' },
  { code: 'BS', name: 'Basel-Stadt' },
  { code: 'BL', name: 'Basel-Landschaft' },
  { code: 'SH', name: 'Schaffhausen' },
  { code: 'AR', name: 'Appenzell Ausserrhoden' },
  { code: 'AI', name: 'Appenzell Innerrhoden' },
  { code: 'SG', name: 'St. Gallen' },
  { code: 'GR', name: 'Graubünden' },
  { code: 'AG', name: 'Aargau' },
  { code: 'TG', name: 'Thurgau' },
  { code: 'TI', name: 'Ticino' },
  { code: 'VD', name: 'Vaud' },
  { code: 'VS', name: 'Valais' },
  { code: 'NE', name: 'Neuchâtel' },
  { code: 'GE', name: 'Genève' },
  { code: 'JU', name: 'Jura' },
] as const

// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const

// Payment Methods
export const PAYMENT_METHODS = {
  CARD: 'card',
  TWINT: 'twint',
  POSTFINANCE: 'postfinance',
  CASH: 'cash',
} as const

// Delivery Types
export const DELIVERY_TYPES = {
  PICKUP: 'pickup',
  DELIVERY: 'delivery',
} as const

// Time Constants
export const MIN_PREPARATION_TIME = 15 // minutes
export const MAX_PREPARATION_TIME = 60 // minutes
export const DELIVERY_TIME_SLOTS = 15 // minute intervals
export const MAX_ADVANCE_ORDER_DAYS = 7 // days

// Business Hours (Swiss standard)
export const DEFAULT_BUSINESS_HOURS = {
  monday: { open: '11:00', close: '14:00', evening: { open: '17:00', close: '22:00' } },
  tuesday: { open: '11:00', close: '14:00', evening: { open: '17:00', close: '22:00' } },
  wednesday: { open: '11:00', close: '14:00', evening: { open: '17:00', close: '22:00' } },
  thursday: { open: '11:00', close: '14:00', evening: { open: '17:00', close: '22:00' } },
  friday: { open: '11:00', close: '14:00', evening: { open: '17:00', close: '23:00' } },
  saturday: { open: '11:00', close: '23:00' },
  sunday: { closed: true },
} as const

// Menu Categories
export const MENU_CATEGORIES = [
  { id: 'starters', name: 'Vorspeisen', icon: '🥗' },
  { id: 'mains', name: 'Hauptgerichte', icon: '🍕' },
  { id: 'burgers', name: 'Burgers', icon: '🍔' },
  { id: 'wraps', name: 'Wraps', icon: '🌯' },
  { id: 'salads', name: 'Salate', icon: '🥗' },
  { id: 'sides', name: 'Beilagen', icon: '🍟' },
  { id: 'desserts', name: 'Desserts', icon: '🍰' },
  { id: 'drinks', name: 'Getränke', icon: '🥤' },
  { id: 'specials', name: 'Tagesangebote', icon: '⭐' },
] as const

// Dietary Preferences
export const DIETARY_PREFERENCES = [
  { id: 'vegetarian', name: 'Vegetarisch', icon: '🌱' },
  { id: 'vegan', name: 'Vegan', icon: '🌿' },
  { id: 'gluten-free', name: 'Glutenfrei', icon: '🌾' },
  { id: 'lactose-free', name: 'Laktosefrei', icon: '🥛' },
  { id: 'halal', name: 'Halal', icon: '☪️' },
  { id: 'kosher', name: 'Kosher', icon: '✡️' },
] as const

// Allergens (EU Standard)
export const ALLERGENS = [
  { id: 'gluten', name: 'Gluten', icon: '🌾' },
  { id: 'crustaceans', name: 'Krebstiere', icon: '🦐' },
  { id: 'eggs', name: 'Eier', icon: '🥚' },
  { id: 'fish', name: 'Fisch', icon: '🐟' },
  { id: 'peanuts', name: 'Erdnüsse', icon: '🥜' },
  { id: 'soybeans', name: 'Soja', icon: '🌱' },
  { id: 'milk', name: 'Milch', icon: '🥛' },
  { id: 'nuts', name: 'Nüsse', icon: '🌰' },
  { id: 'celery', name: 'Sellerie', icon: '🥬' },
  { id: 'mustard', name: 'Senf', icon: '🌭' },
  { id: 'sesame', name: 'Sesam', icon: '🌾' },
  { id: 'sulphites', name: 'Sulfite', icon: '🍷' },
  { id: 'lupin', name: 'Lupinen', icon: '🌿' },
  { id: 'molluscs', name: 'Weichtiere', icon: '🦑' },
] as const

// Voice Commands
export const VOICE_COMMANDS = {
  ADD_TO_CART: ['hinzufügen', 'bestellen', 'add', 'order', 'ajouter', 'aggiungere'],
  REMOVE_FROM_CART: ['entfernen', 'löschen', 'remove', 'delete', 'supprimer', 'rimuovere'],
  VIEW_CART: ['warenkorb', 'zeigen', 'cart', 'show', 'panier', 'carrello'],
  CHECKOUT: ['bezahlen', 'kasse', 'pay', 'checkout', 'payer', 'pagare'],
  HELP: ['hilfe', 'help', 'aide', 'aiuto'],
  CANCEL: ['abbrechen', 'cancel', 'annuler', 'annullare'],
} as const

// PWA Configuration
export const PWA_CONFIG = {
  NAME: 'EATECH',
  SHORT_NAME: 'EATECH',
  DESCRIPTION: 'Smart Foodtruck Ordering',
  THEME_COLOR: '#FF6B6B',
  BACKGROUND_COLOR: '#FFFFFF',
  DISPLAY: 'standalone',
  ORIENTATION: 'portrait',
  START_URL: '/',
} as const

// Cache Configuration
export const CACHE_CONFIG = {
  NAME: 'eatech-cache-v1',
  STATIC_CACHE: 'eatech-static-v1',
  DYNAMIC_CACHE: 'eatech-dynamic-v1',
  MAX_ITEMS: 50,
  MAX_AGE: 60 * 60 * 24 * 7, // 7 days
} as const

// Feature Flags
export const FEATURES = {
  VOICE_COMMERCE: import.meta.env.VITE_FEATURE_VOICE_COMMERCE === 'true',
  OFFLINE_MODE: import.meta.env.VITE_FEATURE_OFFLINE_MODE === 'true',
  PUSH_NOTIFICATIONS: import.meta.env.VITE_FEATURE_PUSH_NOTIFICATIONS === 'true',
  MULTI_LANGUAGE: import.meta.env.VITE_FEATURE_MULTI_LANGUAGE === 'true',
  AI_RECOMMENDATIONS: import.meta.env.VITE_FEATURE_AI_RECOMMENDATIONS === 'true',
  LOYALTY_PROGRAM: import.meta.env.VITE_FEATURE_LOYALTY_PROGRAM === 'true',
} as const

// Analytics Events
export const ANALYTICS_EVENTS = {
  // Page Views
  PAGE_VIEW: 'page_view',
  
  // User Actions
  SIGN_UP: 'sign_up',
  LOGIN: 'login',
  LOGOUT: 'logout',
  
  // Product Actions
  VIEW_ITEM: 'view_item',
  ADD_TO_CART: 'add_to_cart',
  REMOVE_FROM_CART: 'remove_from_cart',
  
  // Order Actions
  BEGIN_CHECKOUT: 'begin_checkout',
  ADD_PAYMENT_INFO: 'add_payment_info',
  PURCHASE: 'purchase',
  REFUND: 'refund',
  
  // Voice Actions
  VOICE_COMMAND: 'voice_command',
  VOICE_ORDER_COMPLETE: 'voice_order_complete',
  
  // Search
  SEARCH: 'search',
  
  // Engagement
  SHARE: 'share',
  SELECT_CONTENT: 'select_content',
} as const

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.',
  SERVER_ERROR: 'Serverfehler. Bitte versuchen Sie es später erneut.',
  AUTH_ERROR: 'Authentifizierungsfehler. Bitte melden Sie sich erneut an.',
  VALIDATION_ERROR: 'Bitte überprüfen Sie Ihre Eingaben.',
  PAYMENT_ERROR: 'Zahlungsfehler. Bitte versuchen Sie es mit einer anderen Zahlungsmethode.',
  ORDER_ERROR: 'Bestellfehler. Bitte versuchen Sie es erneut.',
  CART_EMPTY: 'Ihr Warenkorb ist leer.',
  ITEM_UNAVAILABLE: 'Dieser Artikel ist derzeit nicht verfügbar.',
  MIN_ORDER_AMOUNT: 'Mindestbestellwert nicht erreicht.',
  MAX_ORDER_AMOUNT: 'Maximaler Bestellwert überschritten.',
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  ORDER_PLACED: 'Ihre Bestellung wurde erfolgreich aufgegeben!',
  PAYMENT_SUCCESS: 'Zahlung erfolgreich!',
  PROFILE_UPDATED: 'Profil erfolgreich aktualisiert.',
  PASSWORD_RESET: 'Passwort-Reset-E-Mail wurde gesendet.',
  ITEM_ADDED: 'Artikel zum Warenkorb hinzugefügt.',
  ITEM_REMOVED: 'Artikel aus dem Warenkorb entfernt.',
  PROMO_APPLIED: 'Gutscheincode wurde angewendet.',
} as const

// Validation Rules
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^(\+41|0041|0)?[1-9]\d{1,2}\s?\d{3}\s?\d{2}\s?\d{2}$/,
  POSTAL_CODE_REGEX: /^[1-9]\d{3}$/,
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  NOTES_MAX_LENGTH: 500,
} as const

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_ID: 'user_id',
  TENANT_ID: 'tenant_id',
  CART: 'cart',
  PREFERENCES: 'preferences',
  LANGUAGE: 'language',
  THEME: 'theme',
  LAST_ORDER: 'last_order',
  DEVICE_ID: 'device_id',
  PUSH_TOKEN: 'push_token',
} as const

// External URLs
export const EXTERNAL_URLS = {
  TERMS: 'https://eatech.ch/terms',
  PRIVACY: 'https://eatech.ch/privacy',
  SUPPORT: 'https://support.eatech.ch',
  HELP: 'https://help.eatech.ch',
  FACEBOOK: 'https://facebook.com/eatech',
  INSTAGRAM: 'https://instagram.com/eatech',
  TWITTER: 'https://twitter.com/eatech',
} as const

export default {
  APP_NAME,
  APP_VERSION,
  APP_DESCRIPTION,
  API_BASE_URL,
  DEFAULT_LOCALE,
  DEFAULT_CURRENCY,
  VAT_RATE,
  SUPPORTED_LOCALES,
  SWISS_CANTONS,
  ORDER_STATUS,
  PAYMENT_METHODS,
  DELIVERY_TYPES,
  MENU_CATEGORIES,
  DIETARY_PREFERENCES,
  ALLERGENS,
  VOICE_COMMANDS,
  PWA_CONFIG,
  CACHE_CONFIG,
  FEATURES,
  ANALYTICS_EVENTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  VALIDATION,
  STORAGE_KEYS,
  EXTERNAL_URLS,
}
