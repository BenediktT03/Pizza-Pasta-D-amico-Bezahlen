/**
 * Centralized test IDs for consistent testing across the EATECH platform
 */

// Layout Test IDs
export const LAYOUT_TEST_IDS = {
  HEADER: 'layout-header',
  MAIN_CONTENT: 'layout-main-content',
  SIDEBAR: 'layout-sidebar',
  FOOTER: 'layout-footer',
  NAVIGATION: 'layout-navigation',
  MOBILE_MENU: 'layout-mobile-menu',
  MOBILE_MENU_BUTTON: 'layout-mobile-menu-button',
} as const;

// Authentication Test IDs
export const AUTH_TEST_IDS = {
  LOGIN_FORM: 'auth-login-form',
  REGISTER_FORM: 'auth-register-form',
  RESET_PASSWORD_FORM: 'auth-reset-password-form',
  EMAIL_INPUT: 'auth-email-input',
  PASSWORD_INPUT: 'auth-password-input',
  CONFIRM_PASSWORD_INPUT: 'auth-confirm-password-input',
  SUBMIT_BUTTON: 'auth-submit-button',
  GOOGLE_BUTTON: 'auth-google-button',
  FACEBOOK_BUTTON: 'auth-facebook-button',
  ERROR_MESSAGE: 'auth-error-message',
  SUCCESS_MESSAGE: 'auth-success-message',
  LOGOUT_BUTTON: 'auth-logout-button',
  USER_MENU: 'auth-user-menu',
  USER_AVATAR: 'auth-user-avatar',
} as const;

// Form Test IDs
export const FORM_TEST_IDS = {
  FORM: 'form',
  INPUT: 'form-input',
  TEXTAREA: 'form-textarea',
  SELECT: 'form-select',
  CHECKBOX: 'form-checkbox',
  RADIO: 'form-radio',
  SUBMIT_BUTTON: 'form-submit-button',
  CANCEL_BUTTON: 'form-cancel-button',
  ERROR_MESSAGE: 'form-error-message',
  FIELD_ERROR: 'form-field-error',
  FIELD_LABEL: 'form-field-label',
  FIELD_HINT: 'form-field-hint',
} as const;

// Product Test IDs
export const PRODUCT_TEST_IDS = {
  LIST: 'product-list',
  CARD: 'product-card',
  NAME: 'product-name',
  DESCRIPTION: 'product-description',
  PRICE: 'product-price',
  IMAGE: 'product-image',
  ADD_TO_CART_BUTTON: 'product-add-to-cart-button',
  QUANTITY_INPUT: 'product-quantity-input',
  CATEGORY_FILTER: 'product-category-filter',
  SEARCH_INPUT: 'product-search-input',
  SORT_SELECT: 'product-sort-select',
  DETAILS_MODAL: 'product-details-modal',
} as const;

// Cart Test IDs
export const CART_TEST_IDS = {
  CONTAINER: 'cart-container',
  ITEM: 'cart-item',
  ITEM_NAME: 'cart-item-name',
  ITEM_PRICE: 'cart-item-price',
  ITEM_QUANTITY: 'cart-item-quantity',
  ITEM_TOTAL: 'cart-item-total',
  REMOVE_BUTTON: 'cart-remove-button',
  UPDATE_QUANTITY_BUTTON: 'cart-update-quantity-button',
  SUBTOTAL: 'cart-subtotal',
  TAX: 'cart-tax',
  TOTAL: 'cart-total',
  CHECKOUT_BUTTON: 'cart-checkout-button',
  EMPTY_MESSAGE: 'cart-empty-message',
  BADGE: 'cart-badge',
  TOGGLE_BUTTON: 'cart-toggle-button',
} as const;

// Order Test IDs
export const ORDER_TEST_IDS = {
  LIST: 'order-list',
  CARD: 'order-card',
  NUMBER: 'order-number',
  STATUS: 'order-status',
  DATE: 'order-date',
  TOTAL: 'order-total',
  ITEMS: 'order-items',
  DETAILS_BUTTON: 'order-details-button',
  CANCEL_BUTTON: 'order-cancel-button',
  TRACK_BUTTON: 'order-track-button',
  REORDER_BUTTON: 'order-reorder-button',
  RECEIPT_BUTTON: 'order-receipt-button',
  FILTER_STATUS: 'order-filter-status',
  FILTER_DATE: 'order-filter-date',
} as const;

// Payment Test IDs
export const PAYMENT_TEST_IDS = {
  METHOD_SELECT: 'payment-method-select',
  CARD_ELEMENT: 'payment-card-element',
  CARD_ERRORS: 'payment-card-errors',
  BILLING_FORM: 'payment-billing-form',
  SUBMIT_BUTTON: 'payment-submit-button',
  PROCESSING_MESSAGE: 'payment-processing-message',
  SUCCESS_MESSAGE: 'payment-success-message',
  ERROR_MESSAGE: 'payment-error-message',
  SAVED_CARDS: 'payment-saved-cards',
  ADD_CARD_BUTTON: 'payment-add-card-button',
  TWINT_QR: 'payment-twint-qr',
  POSTFINANCE_REDIRECT: 'payment-postfinance-redirect',
} as const;

// Admin Test IDs
export const ADMIN_TEST_IDS = {
  DASHBOARD: 'admin-dashboard',
  STATS_CARD: 'admin-stats-card',
  REVENUE_CHART: 'admin-revenue-chart',
  ORDERS_CHART: 'admin-orders-chart',
  RECENT_ORDERS: 'admin-recent-orders',
  TOP_PRODUCTS: 'admin-top-products',
  INVENTORY_ALERTS: 'admin-inventory-alerts',
  STAFF_ACTIVITY: 'admin-staff-activity',
  SETTINGS_FORM: 'admin-settings-form',
  EXPORT_BUTTON: 'admin-export-button',
} as const;

// Table Test IDs
export const TABLE_TEST_IDS = {
  CONTAINER: 'table-container',
  HEADER: 'table-header',
  ROW: 'table-row',
  CELL: 'table-cell',
  SORT_BUTTON: 'table-sort-button',
  PAGINATION: 'table-pagination',
  PAGE_SIZE_SELECT: 'table-page-size-select',
  SEARCH_INPUT: 'table-search-input',
  BULK_SELECT: 'table-bulk-select',
  BULK_ACTIONS: 'table-bulk-actions',
  NO_DATA: 'table-no-data',
  LOADING: 'table-loading',
} as const;

// Modal Test IDs
export const MODAL_TEST_IDS = {
  CONTAINER: 'modal-container',
  OVERLAY: 'modal-overlay',
  CONTENT: 'modal-content',
  HEADER: 'modal-header',
  TITLE: 'modal-title',
  CLOSE_BUTTON: 'modal-close-button',
  BODY: 'modal-body',
  FOOTER: 'modal-footer',
  CONFIRM_BUTTON: 'modal-confirm-button',
  CANCEL_BUTTON: 'modal-cancel-button',
} as const;

// Toast/Alert Test IDs
export const FEEDBACK_TEST_IDS = {
  TOAST_CONTAINER: 'toast-container',
  TOAST: 'toast',
  TOAST_MESSAGE: 'toast-message',
  TOAST_CLOSE: 'toast-close',
  ALERT: 'alert',
  ALERT_TITLE: 'alert-title',
  ALERT_MESSAGE: 'alert-message',
  ALERT_CLOSE: 'alert-close',
  LOADING_SPINNER: 'loading-spinner',
  LOADING_MESSAGE: 'loading-message',
  ERROR_BOUNDARY: 'error-boundary',
  ERROR_MESSAGE: 'error-message',
  ERROR_STACK: 'error-stack',
} as const;

// Voice Test IDs
export const VOICE_TEST_IDS = {
  BUTTON: 'voice-button',
  MODAL: 'voice-modal',
  TRANSCRIPT: 'voice-transcript',
  STATUS: 'voice-status',
  WAVE_ANIMATION: 'voice-wave-animation',
  ERROR_MESSAGE: 'voice-error-message',
  LANGUAGE_SELECT: 'voice-language-select',
  INSTRUCTIONS: 'voice-instructions',
  RESULTS: 'voice-results',
} as const;

// Kitchen Display Test IDs
export const KITCHEN_TEST_IDS = {
  ORDER_QUEUE: 'kitchen-order-queue',
  ORDER_CARD: 'kitchen-order-card',
  ORDER_TIMER: 'kitchen-order-timer',
  ORDER_ITEMS: 'kitchen-order-items',
  START_BUTTON: 'kitchen-start-button',
  COMPLETE_BUTTON: 'kitchen-complete-button',
  CANCEL_BUTTON: 'kitchen-cancel-button',
  FILTER_TABS: 'kitchen-filter-tabs',
  SOUND_TOGGLE: 'kitchen-sound-toggle',
  FULLSCREEN_TOGGLE: 'kitchen-fullscreen-toggle',
} as const;

// Master Admin Test IDs
export const MASTER_TEST_IDS = {
  TENANT_LIST: 'master-tenant-list',
  TENANT_CARD: 'master-tenant-card',
  TENANT_STATS: 'master-tenant-stats',
  BILLING_OVERVIEW: 'master-billing-overview',
  SYSTEM_HEALTH: 'master-system-health',
  DEPLOYMENT_STATUS: 'master-deployment-status',
  FEATURE_FLAGS: 'master-feature-flags',
  SUPPORT_TICKETS: 'master-support-tickets',
  ANALYTICS_DASHBOARD: 'master-analytics-dashboard',
  CREATE_TENANT_BUTTON: 'master-create-tenant-button',
} as const;

// Aggregate all test IDs
export const TEST_IDS = {
  layout: LAYOUT_TEST_IDS,
  auth: AUTH_TEST_IDS,
  form: FORM_TEST_IDS,
  product: PRODUCT_TEST_IDS,
  cart: CART_TEST_IDS,
  order: ORDER_TEST_IDS,
  payment: PAYMENT_TEST_IDS,
  admin: ADMIN_TEST_IDS,
  table: TABLE_TEST_IDS,
  modal: MODAL_TEST_IDS,
  feedback: FEEDBACK_TEST_IDS,
  voice: VOICE_TEST_IDS,
  kitchen: KITCHEN_TEST_IDS,
  master: MASTER_TEST_IDS,
} as const;

// Helper function to create custom test IDs with prefixes
export const createTestId = (prefix: string, id: string): string => {
  return `${prefix}-${id}`;
};

// Helper function to get data-testid attribute object
export const getTestIdProp = (testId: string): { 'data-testid': string } => {
  return { 'data-testid': testId };
};

// Type helpers for test IDs
export type LayoutTestId = typeof LAYOUT_TEST_IDS[keyof typeof LAYOUT_TEST_IDS];
export type AuthTestId = typeof AUTH_TEST_IDS[keyof typeof AUTH_TEST_IDS];
export type FormTestId = typeof FORM_TEST_IDS[keyof typeof FORM_TEST_IDS];
export type ProductTestId = typeof PRODUCT_TEST_IDS[keyof typeof PRODUCT_TEST_IDS];
export type CartTestId = typeof CART_TEST_IDS[keyof typeof CART_TEST_IDS];
export type OrderTestId = typeof ORDER_TEST_IDS[keyof typeof ORDER_TEST_IDS];
export type PaymentTestId = typeof PAYMENT_TEST_IDS[keyof typeof PAYMENT_TEST_IDS];
export type AdminTestId = typeof ADMIN_TEST_IDS[keyof typeof ADMIN_TEST_IDS];
export type TableTestId = typeof TABLE_TEST_IDS[keyof typeof TABLE_TEST_IDS];
export type ModalTestId = typeof MODAL_TEST_IDS[keyof typeof MODAL_TEST_IDS];
export type FeedbackTestId = typeof FEEDBACK_TEST_IDS[keyof typeof FEEDBACK_TEST_IDS];
export type VoiceTestId = typeof VOICE_TEST_IDS[keyof typeof VOICE_TEST_IDS];
export type KitchenTestId = typeof KITCHEN_TEST_IDS[keyof typeof KITCHEN_TEST_IDS];
export type MasterTestId = typeof MASTER_TEST_IDS[keyof typeof MASTER_TEST_IDS];

export type AnyTestId = 
  | LayoutTestId
  | AuthTestId
  | FormTestId
  | ProductTestId
  | CartTestId
  | OrderTestId
  | PaymentTestId
  | AdminTestId
  | TableTestId
  | ModalTestId
  | FeedbackTestId
  | VoiceTestId
  | KitchenTestId
  | MasterTestId;

// Default export
export default TEST_IDS;
