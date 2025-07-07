/**
 * EATECH Firebase Functions - Scheduled Triggers
 * Version: 1.0.0
 * 
 * Scheduled tasks and cron jobs
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/triggers/scheduled.triggers.ts
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { EmailService } from '../services/EmailService';
import { AnalyticsService } from '../services/AnalyticsService';
import { InventoryService } from '../services/InventoryService';
import { AIPredictionService } from '../services/AIPredictionService';
import { logger } from '../utils/logger';

// Services
const emailService = new EmailService();
const analyticsService = new AnalyticsService();
const inventoryService = new InventoryService();
const aiService = new AIPredictionService();

// ============================================================================
// DAILY CLEANUP
// ============================================================================
export const dailyCleanup = functions
  .region('europe-west1')
  .pubsub
  .schedule('0 3 * * *') // 3 AM daily
  .timeZone('Europe/Zurich')
  .onRun(async (context) => {
    logger.info('Starting daily cleanup');

    try {
      // Clean up old analytics events (keep 90 days)
      await cleanupOldAnalytics();

      // Clean up expired sessions
      await cleanupExpiredSessions();

      // Clean up orphaned carts
      await cleanupOrphanedCarts();

      // Archive completed orders (older than 30 days)
      await archiveOldOrders();

      // Clean up temporary files
      await cleanupTempFiles();

      logger.info('Daily cleanup completed successfully');
    } catch (error) {
      logger.error('Error in daily cleanup', { error });
      throw error;
    }
  });

// ============================================================================
// INVENTORY CHECK
// ============================================================================
export const checkInventoryLevels = functions
  .region('europe-west1')
  .pubsub
  .schedule('0 8,14,20 * * *') // 8 AM, 2 PM, 8 PM
  .timeZone('Europe/Zurich')
  .onRun(async (context) => {
    logger.info('Starting inventory level check');

    try {
      const tenantsSnapshot = await admin.firestore()
        .collection('tenants')
        .where('status', '==', 'active')
        .where('features.inventory', '==', true)
        .get();

      const alerts = [];

      for (const tenantDoc of tenantsSnapshot.docs) {
        const tenantId = tenantDoc.id;
        const tenant = tenantDoc.data();
        
        // Check inventory levels
        const lowStockItems = await inventoryService.checkLowStock(tenantId);
        
        if (lowStockItems.length > 0) {
          alerts.push({
            tenantId,
            tenantName: tenant.name,
            lowStockItems,
            email: tenant.notificationEmail || tenant.email
          });
        }
      }

      // Send low stock alerts
      for (const alert of alerts) {
        await emailService.sendLowStockAlert({
          to: alert.email,
          tenantName: alert.tenantName,
          items: alert.lowStockItems
        });
      }

      logger.info(`Inventory check completed. ${alerts.length} alerts sent.`);
    } catch (error) {
      logger.error('Error in inventory check', { error });
      throw error;
    }
  });

// ============================================================================
// WEEKLY REPORTS
// ============================================================================
export const generateWeeklyReports = functions
  .region('europe-west1')
  .pubsub
  .schedule('0 6 * * 1') // Monday 6 AM
  .timeZone('Europe/Zurich')
  .onRun(async (context) => {
    logger.info('Generating weekly reports');

    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      const tenantsSnapshot = await admin.firestore()
        .collection('tenants')
        .where('status', '==', 'active')
        .where('subscription.features.weeklyReports', '==', true)
        .get();

      for (const tenantDoc of tenantsSnapshot.docs) {
        const tenantId = tenantDoc.id;
        const tenant = tenantDoc.data();

        // Generate report data
        const reportData = await generateTenantWeeklyReport(tenantId, startDate, endDate);
        
        // Store report
        await admin.firestore()
          .collection('tenants')
          .doc(tenantId)
          .collection('reports')
          .doc(`weekly_${startDate.toISOString().split('T')[0]}`)
          .set(reportData);

        // Send report email
        if (tenant.reportEmails && tenant.reportEmails.length > 0) {
          await emailService.sendWeeklyReport({
            to: tenant.reportEmails,
            tenantName: tenant.name,
            reportData,
            reportUrl: `${functions.config().app.url}/admin/reports/weekly/${reportData.id}`
          });
        }
      }

      logger.info('Weekly reports generated successfully');
    } catch (error) {
      logger.error('Error generating weekly reports', { error });
      throw error;
    }
  });

// ============================================================================
// SUBSCRIPTION RENEWAL CHECK
// ============================================================================
export const checkSubscriptionRenewals = functions
  .region('europe-west1')
  .pubsub
  .schedule('0 10 * * *') // 10 AM daily
  .timeZone('Europe/Zurich')
  .onRun(async (context) => {
    logger.info('Checking subscription renewals');

    try {
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Find expiring subscriptions
      const expiringSnapshot = await admin.firestore()
        .collection('tenants')
        .where('subscription.nextBillingDate', '>=', now)
        .where('subscription.nextBillingDate', '<=', sevenDaysFromNow)
        .get();

      for (const tenantDoc of expiringSnapshot.docs) {
        const tenant = tenantDoc.data();
        const daysUntilExpiry = Math.ceil(
          (tenant.subscription.nextBillingDate.toDate() - now) / (1000 * 60 * 60 * 24)
        );

        // Send appropriate reminder
        if (daysUntilExpiry <= 3 && !tenant.subscription.reminded3Days) {
          await emailService.sendSubscriptionReminder({
            to: tenant.billingEmail || tenant.email,
            tenantName: tenant.name,
            daysUntilExpiry,
            renewalUrl: `${functions.config().app.url}/billing/renew`
          });

          await tenantDoc.ref.update({
            'subscription.reminded3Days': true
          });
        } else if (daysUntilExpiry <= 7 && !tenant.subscription.reminded7Days) {
          await emailService.sendSubscriptionReminder({
            to: tenant.billingEmail || tenant.email,
            tenantName: tenant.name,
            daysUntilExpiry,
            renewalUrl: `${functions.config().app.url}/billing/renew`
          });

          await tenantDoc.ref.update({
            'subscription.reminded7Days': true
          });
        }
      }

      // Check for expired subscriptions
      const expiredSnapshot = await admin.firestore()
        .collection('tenants')
        .where('subscription.nextBillingDate', '<', now)
        .where('subscription.status', '==', 'active')
        .get();

      for (const tenantDoc of expiredSnapshot.docs) {
        await tenantDoc.ref.update({
          'subscription.status': 'expired',
          'status': 'suspended',
          'suspendedAt': admin.firestore.FieldValue.serverTimestamp()
        });

        // Notify tenant
        const tenant = tenantDoc.data();
        await emailService.sendSubscriptionExpired({
          to: tenant.billingEmail || tenant.email,
          tenantName: tenant.name,
          reactivateUrl: `${functions.config().app.url}/billing/reactivate`
        });
      }

      logger.info(`Subscription check completed. ${expiringSnapshot.size} expiring, ${expiredSnapshot.size} expired.`);
    } catch (error) {
      logger.error('Error checking subscriptions', { error });
      throw error;
    }
  });

// ============================================================================
// AI MODEL TRAINING
// ============================================================================
export const trainAIModels = functions
  .region('europe-west1')
  .pubsub
  .schedule('0 2 * * 0') // Sunday 2 AM
  .timeZone('Europe/Zurich')
  .onRun(async (context) => {
    logger.info('Starting AI model training');

    try {
      const tenantsSnapshot = await admin.firestore()
        .collection('tenants')
        .where('status', '==', 'active')
        .where('features.aiPredictions', '==', true)
        .get();

      for (const tenantDoc of tenantsSnapshot.docs) {
        const tenantId = tenantDoc.id;
        
        // Train demand prediction model
        await aiService.trainDemandModel(tenantId);
        
        // Train price optimization model
        await aiService.trainPriceModel(tenantId);
        
        // Train customer behavior model
        await aiService.trainCustomerModel(tenantId);
      }

      logger.info('AI model training completed');
    } catch (error) {
      logger.error('Error in AI model training', { error });
      throw error;
    }
  });

// ============================================================================
// BACKUP CRITICAL DATA
// ============================================================================
export const backupCriticalData = functions
  .region('europe-west1')
  .pubsub
  .schedule('0 4 * * *') // 4 AM daily
  .timeZone('Europe/Zurich')
  .onRun(async (context) => {
    logger.info('Starting critical data backup');

    try {
      const backupDate = new Date().toISOString().split('T')[0];
      
      // Backup tenant configurations
      await backupCollection('tenants', `backups/${backupDate}/tenants`);
      
      // Backup user profiles
      await backupCollection('users', `backups/${backupDate}/users`);
      
      // Backup active orders
      const activeOrdersSnapshot = await admin.firestore()
        .collectionGroup('orders')
        .where('status', 'in', ['new', 'confirmed', 'preparing', 'ready'])
        .get();

      const batch = admin.firestore().batch();
      activeOrdersSnapshot.forEach(doc => {
        const backupRef = admin.firestore()
          .collection(`backups/${backupDate}/activeOrders`)
          .doc(doc.id);
        batch.set(backupRef, doc.data());
      });
      await batch.commit();

      logger.info('Critical data backup completed');
    } catch (error) {
      logger.error('Error in data backup', { error });
      throw error;
    }
  });

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
async function cleanupOldAnalytics() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days ago

  const oldEventsSnapshot = await admin.firestore()
    .collection('analytics')
    .doc('events')
    .collection('raw')
    .where('timestamp', '<', cutoffDate)
    .limit(500) // Process in batches
    .get();

  const batch = admin.firestore().batch();
  oldEventsSnapshot.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  
  logger.info(`Cleaned up ${oldEventsSnapshot.size} old analytics events`);
}

async function cleanupExpiredSessions() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const expiredSessionsSnapshot = await admin.firestore()
    .collection('sessions')
    .where('lastActivity', '<', oneDayAgo)
    .limit(500)
    .get();

  const batch = admin.firestore().batch();
  expiredSessionsSnapshot.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  
  logger.info(`Cleaned up ${expiredSessionsSnapshot.size} expired sessions`);
}

async function cleanupOrphanedCarts() {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  
  const orphanedCartsSnapshot = await admin.firestore()
    .collectionGroup('carts')
    .where('updatedAt', '<', threeDaysAgo)
    .where('status', '==', 'active')
    .limit(500)
    .get();

  const batch = admin.firestore().batch();
  orphanedCartsSnapshot.forEach(doc => {
    batch.update(doc.ref, {
      status: 'abandoned',
      abandonedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  await batch.commit();
  
  logger.info(`Marked ${orphanedCartsSnapshot.size} carts as abandoned`);
}

async function archiveOldOrders() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const oldOrdersSnapshot = await admin.firestore()
    .collectionGroup('orders')
    .where('completedAt', '<', thirtyDaysAgo)
    .where('archived', '!=', true)
    .limit(100)
    .get();

  for (const doc of oldOrdersSnapshot.docs) {
    const order = doc.data();
    
    // Move to archive collection
    await admin.firestore()
      .collection('archive')
      .doc('orders')
      .collection(doc.ref.parent.parent!.id) // tenantId
      .doc(doc.id)
      .set({
        ...order,
        archivedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    
    // Update original with minimal data
    await doc.ref.update({
      archived: true,
      archivedAt: admin.firestore.FieldValue.serverTimestamp(),
      // Remove sensitive data
      customer: admin.firestore.FieldValue.delete(),
      paymentDetails: admin.firestore.FieldValue.delete()
    });
  }
  
  logger.info(`Archived ${oldOrdersSnapshot.size} old orders`);
}

async function cleanupTempFiles() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const tempFilesSnapshot = await admin.firestore()
    .collection('tempFiles')
    .where('createdAt', '<', oneDayAgo)
    .limit(500)
    .get();

  const batch = admin.firestore().batch();
  tempFilesSnapshot.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  
  logger.info(`Cleaned up ${tempFilesSnapshot.size} temporary files`);
}

async function generateTenantWeeklyReport(tenantId: string, startDate: Date, endDate: Date) {
  // Get order statistics
  const ordersSnapshot = await admin.firestore()
    .collection('tenants')
    .doc(tenantId)
    .collection('orders')
    .where('createdAt', '>=', startDate)
    .where('createdAt', '<', endDate)
    .get();

  const stats = {
    totalOrders: ordersSnapshot.size,
    totalRevenue: 0,
    avgOrderValue: 0,
    topProducts: {},
    dailyBreakdown: {},
    customerStats: {
      new: 0,
      returning: 0
    }
  };

  const customersSeen = new Set();

  ordersSnapshot.forEach(doc => {
    const order = doc.data();
    stats.totalRevenue += order.total || 0;
    
    // Daily breakdown
    const day = order.createdAt.toDate().toISOString().split('T')[0];
    if (!stats.dailyBreakdown[day]) {
      stats.dailyBreakdown[day] = { orders: 0, revenue: 0 };
    }
    stats.dailyBreakdown[day].orders++;
    stats.dailyBreakdown[day].revenue += order.total || 0;
    
    // Product stats
    order.items?.forEach((item: any) => {
      if (!stats.topProducts[item.name]) {
        stats.topProducts[item.name] = { quantity: 0, revenue: 0 };
      }
      stats.topProducts[item.name].quantity += item.quantity;
      stats.topProducts[item.name].revenue += item.price * item.quantity;
    });
    
    // Customer stats
    if (order.userId) {
      if (customersSeen.has(order.userId)) {
        stats.customerStats.returning++;
      } else {
        stats.customerStats.new++;
        customersSeen.add(order.userId);
      }
    }
  });

  if (stats.totalOrders > 0) {
    stats.avgOrderValue = stats.totalRevenue / stats.totalOrders;
  }

  // Sort top products
  const sortedProducts = Object.entries(stats.topProducts)
    .sort((a: any, b: any) => b[1].revenue - a[1].revenue)
    .slice(0, 10);

  return {
    id: `${tenantId}_${startDate.toISOString().split('T')[0]}`,
    tenantId,
    period: {
      start: startDate,
      end: endDate
    },
    ...stats,
    topProducts: sortedProducts,
    generatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
}

async function backupCollection(collectionName: string, backupPath: string) {
  const snapshot = await admin.firestore()
    .collection(collectionName)
    .get();

  const batch = admin.firestore().batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const backupRef = admin.firestore()
      .collection(backupPath)
      .doc(doc.id);
    
    batch.set(backupRef, {
      ...doc.data(),
      _backupMetadata: {
        originalPath: doc.ref.path,
        backupTimestamp: admin.firestore.FieldValue.serverTimestamp()
      }
    });
    
    batchCount++;
    
    // Commit batch every 500 documents
    if (batchCount >= 500) {
      await batch.commit();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }
  
  logger.info(`Backed up ${snapshot.size} documents from ${collectionName}`);
}

// ============================================================================
// EXPORT ALL TRIGGERS
// ============================================================================
export const scheduledTriggers = {
  dailyCleanup,
  checkInventoryLevels,
  generateWeeklyReports,
  checkSubscriptionRenewals,
  trainAIModels,
  backupCriticalData
};