/**
 * EATECH Cloud Functions
 * Version: 3.0.0
 * 
 * Main entry point for all Firebase Cloud Functions
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /functions/src/index.ts
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Set timezone to Switzerland
process.env.TZ = 'Europe/Zurich';

// Import function modules
import * as authTriggers from './triggers/auth.triggers';
import * as orderTriggers from './triggers/order.triggers';
import * as analyticsTriggers from './triggers/analytics.triggers';
import * as scheduledTriggers from './triggers/scheduled.triggers';
import * as webhooksApi from './api/webhooks';
import * as adminApi from './api/admin.api';
import * as publicApi from './api/public.api';

// ============================================
// AUTH TRIGGERS
// ============================================

// On user creation
export const onUserCreated = authTriggers.onUserCreated;

// On user deletion
export const onUserDeleted = authTriggers.onUserDeleted;

// On user role change
export const onUserRoleChanged = authTriggers.onUserRoleChanged;

// ============================================
// ORDER TRIGGERS
// ============================================

// On order created
export const onOrderCreated = orderTriggers.onOrderCreated;

// On order status updated
export const onOrderStatusUpdated = orderTriggers.onOrderStatusUpdated;

// On order completed
export const onOrderCompleted = orderTriggers.onOrderCompleted;

// ============================================
// ANALYTICS TRIGGERS
// ============================================

// Process analytics data
export const processAnalytics = analyticsTriggers.processAnalytics;

// Generate daily reports
export const generateDailyReports = analyticsTriggers.generateDailyReports;

// Update tenant statistics
export const updateTenantStats = analyticsTriggers.updateTenantStats;

// ============================================
// SCHEDULED FUNCTIONS
// ============================================

// Daily cleanup (runs at 3 AM)
export const dailyCleanup = scheduledTriggers.dailyCleanup;

// Weekly reports (runs every Monday at 8 AM)
export const weeklyReports = scheduledTriggers.weeklyReports;

// Monthly billing (runs on 1st of each month)
export const monthlyBilling = scheduledTriggers.monthlyBilling;

// Session cleanup (runs every hour)
export const sessionCleanup = scheduledTriggers.sessionCleanup;

// ============================================
// HTTP FUNCTIONS - WEBHOOKS
// ============================================

// Stripe webhook
export const stripeWebhook = functions
  .region('europe-west6')
  .runWith({
    timeoutSeconds: 60,
    memory: '512MB'
  })
  .https.onRequest(webhooksApi.stripeWebhook);

// Twilio webhook (SMS)
export const twilioWebhook = functions
  .region('europe-west6')
  .runWith({
    timeoutSeconds: 30,
    memory: '256MB'
  })
  .https.onRequest(webhooksApi.twilioWebhook);

// SendGrid webhook (Email events)
export const sendgridWebhook = functions
  .region('europe-west6')
  .runWith({
    timeoutSeconds: 30,
    memory: '256MB'
  })
  .https.onRequest(webhooksApi.sendgridWebhook);

// ============================================
// HTTP FUNCTIONS - ADMIN API
// ============================================

// Admin API endpoint
export const adminApi = functions
  .region('europe-west6')
  .runWith({
    timeoutSeconds: 300,
    memory: '1GB',
    minInstances: 1
  })
  .https.onRequest(adminApi.app);

// ============================================
// HTTP FUNCTIONS - PUBLIC API
// ============================================

// Public API endpoint
export const api = functions
  .region('europe-west6')
  .runWith({
    timeoutSeconds: 60,
    memory: '512MB',
    minInstances: 2
  })
  .https.onRequest(publicApi.app);

// ============================================
// CALLABLE FUNCTIONS
// ============================================

// Send order notification
export const sendOrderNotification = functions
  .region('europe-west6')
  .runWith({
    timeoutSeconds: 30,
    memory: '256MB'
  })
  .https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { orderId, type } = data;

    if (!orderId || !type) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required parameters'
      );
    }

    try {
      // Implementation would go here
      return { success: true, message: 'Notification sent' };
    } catch (error) {
      console.error('Error sending notification:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to send notification'
      );
    }
  });

// Generate invoice
export const generateInvoice = functions
  .region('europe-west6')
  .runWith({
    timeoutSeconds: 60,
    memory: '512MB'
  })
  .https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    // Check admin role
    if (context.auth.token.role !== 'admin' && 
        context.auth.token.role !== 'master_admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Insufficient permissions'
      );
    }

    const { tenantId, month, year } = data;

    try {
      // Implementation would go here
      return { 
        success: true, 
        invoiceUrl: 'https://storage.googleapis.com/invoices/...' 
      };
    } catch (error) {
      console.error('Error generating invoice:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to generate invoice'
      );
    }
  });

// Validate voucher code
export const validateVoucher = functions
  .region('europe-west6')
  .runWith({
    timeoutSeconds: 10,
    memory: '128MB'
  })
  .https.onCall(async (data, context) => {
    const { code, tenantId } = data;

    if (!code || !tenantId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required parameters'
      );
    }

    try {
      // Implementation would go here
      return { 
        valid: true, 
        discount: { 
          type: 'percentage', 
          value: 10 
        } 
      };
    } catch (error) {
      console.error('Error validating voucher:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to validate voucher'
      );
    }
  });

// ============================================
// STORAGE TRIGGERS
// ============================================

// Process uploaded images
export const processUploadedImage = functions
  .region('europe-west6')
  .runWith({
    timeoutSeconds: 120,
    memory: '2GB'
  })
  .storage.object().onFinalize(async (object) => {
    const filePath = object.name;
    const contentType = object.contentType;

    // Only process images
    if (!contentType?.startsWith('image/')) {
      return null;
    }

    console.log('Processing image:', filePath);

    try {
      // Image processing logic would go here
      // - Generate thumbnails
      // - Optimize images
      // - Update metadata
      return null;
    } catch (error) {
      console.error('Error processing image:', error);
      return null;
    }
  });

// ============================================
// REALTIME DATABASE TRIGGERS
// ============================================

// Track active users
export const trackActiveUsers = functions
  .region('europe-west6')
  .database.ref('/presence/{userId}')
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const isOnline = change.after.val()?.isOnline || false;

    try {
      // Update user's last seen timestamp
      await admin.firestore()
        .collection('customers')
        .doc(userId)
        .update({
          lastSeen: admin.firestore.FieldValue.serverTimestamp(),
          isOnline
        });
    } catch (error) {
      console.error('Error tracking user activity:', error);
    }
  });