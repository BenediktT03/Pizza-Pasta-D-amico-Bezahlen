/**
 * EATECH Firebase Cloud Functions
 * Main entry point for all cloud functions
 */

import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import { setGlobalOptions } from 'firebase-functions/v2';

// Initialize Firebase Admin
admin.initializeApp();

// Set global options for all functions
setGlobalOptions({
  region: 'europe-west6', // Zurich
  timeoutSeconds: 60,
  memory: '512MiB',
});

// HTTP Functions
export { api } from './http/api';
export { webhooks } from './http/webhooks';

// Scheduled Functions
export { dailyCleanup } from './scheduled/cleanup';
export { generateReports } from './scheduled/reports';

// Firestore Triggers
export { 
  onOrderCreated,
  onOrderUpdated,
  onOrderStatusChanged 
} from './triggers/orders';

export { 
  onUserCreated,
  onUserUpdated,
  onUserDeleted 
} from './triggers/users';

// Callable Functions
export { processVoiceOrder } from './callable/voice';
export { calculateDynamicPricing } from './callable/pricing';
export { generateQRCode } from './callable/qr';
export { sendNotification } from './callable/notifications';

// Background Functions
export { optimizeImages } from './background/images';
export { syncInventory } from './background/inventory';
export { processAnalytics } from './background/analytics';

// Auth Triggers
export { onAuthUserCreated } from './auth/onCreate';
export { onAuthUserDeleted } from './auth/onDelete';

// Storage Triggers
export { onImageUploaded } from './storage/images';
export { onDocumentUploaded } from './storage/documents';

// PubSub Topics
export { onOrderQueue } from './pubsub/orderQueue';
export { onNotificationQueue } from './pubsub/notificationQueue';
export { onEmailQueue } from './pubsub/emailQueue';

// Swiss-specific Functions
export { generateQRBill } from './swiss/qr-bill';
export { validateSwissVAT } from './swiss/vat-validator';
export { calculateCantonalTax } from './swiss/tax-calculator';

// Multi-tenant Functions
export { onTenantCreated } from './tenant/onCreate';
export { onTenantBillingUpdate } from './tenant/billing';
export { validateTenantLimits } from './tenant/limits';

// Export types
export * from './types';
