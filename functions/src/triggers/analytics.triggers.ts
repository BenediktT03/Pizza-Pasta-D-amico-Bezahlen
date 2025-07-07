/**
 * EATECH Firebase Functions - Analytics Triggers
 * Version: 1.0.0
 * 
 * Analytics data collection and processing triggers
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/triggers/analytics.triggers.ts
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { AnalyticsService } from '../services/AnalyticsService';
import { AIPredictionService } from '../services/AIPredictionService';
import { logger } from '../utils/logger';

// Services
const analyticsService = new AnalyticsService();
const aiService = new AIPredictionService();

// Types
interface AnalyticsEvent {
  eventType: string;
  tenantId?: string;
  userId?: string;
  timestamp: admin.firestore.Timestamp;
  properties: Record<string, any>;
  sessionId?: string;
  deviceInfo?: DeviceInfo;
  location?: GeoLocation;
}

interface DeviceInfo {
  platform: string;
  browser?: string;
  version?: string;
  os?: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

interface GeoLocation {
  country: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

// ============================================================================
// ANALYTICS EVENT TRIGGER
// ============================================================================
export const onAnalyticsEvent = functions
  .region('europe-west1')
  .firestore
  .document('analytics/events/raw/{eventId}')
  .onCreate(async (snapshot, context) => {
    const event = snapshot.data() as AnalyticsEvent;
    const { eventId } = context.params;

    try {
      logger.info('Processing analytics event', { eventId, eventType: event.eventType });

      // Validate event
      if (!event.eventType || !event.timestamp) {
        logger.error('Invalid analytics event', { eventId });
        return;
      }

      // Process based on event type
      switch (event.eventType) {
        case 'page_view':
          await processPageView(event);
          break;
        case 'order_placed':
          await processOrderEvent(event);
          break;
        case 'item_viewed':
          await processItemView(event);
          break;
        case 'search_performed':
          await processSearch(event);
          break;
        case 'user_action':
          await processUserAction(event);
          break;
        default:
          await processGenericEvent(event);
      }

      // Update processed status
      await snapshot.ref.update({
        processed: true,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    } catch (error) {
      logger.error('Error processing analytics event', { error, eventId });
      
      await snapshot.ref.update({
        processed: false,
        error: error.message,
        errorAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });

// ============================================================================
// HOURLY AGGREGATION
// ============================================================================
export const aggregateHourlyStats = functions
  .region('europe-west1')
  .pubsub
  .schedule('0 * * * *') // Every hour
  .onRun(async (context) => {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    try {
      logger.info('Starting hourly analytics aggregation');

      // Get all tenants
      const tenantsSnapshot = await admin.firestore()
        .collection('tenants')
        .where('status', '==', 'active')
        .get();

      const aggregationPromises = tenantsSnapshot.docs.map(async (tenantDoc) => {
        const tenantId = tenantDoc.id;
        
        // Aggregate tenant-specific stats
        await aggregateTenantStats(tenantId, hourAgo, now);
      });

      await Promise.all(aggregationPromises);

      // Aggregate platform-wide stats
      await aggregatePlatformStats(hourAgo, now);

      logger.info('Hourly analytics aggregation completed');
    } catch (error) {
      logger.error('Error in hourly analytics aggregation', { error });
      throw error;
    }
  });

// ============================================================================
// DAILY ANALYTICS REPORT
// ============================================================================
export const generateDailyReport = functions
  .region('europe-west1')
  .pubsub
  .schedule('0 2 * * *') // 2 AM daily
  .timeZone('Europe/Zurich')
  .onRun(async (context) => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    yesterday.setHours(0, 0, 0, 0);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    try {
      logger.info('Generating daily analytics report');

      // Get all active tenants
      const tenantsSnapshot = await admin.firestore()
        .collection('tenants')
        .where('status', '==', 'active')
        .get();

      for (const tenantDoc of tenantsSnapshot.docs) {
        const tenantId = tenantDoc.id;
        const tenant = tenantDoc.data();

        // Generate tenant report
        const report = await generateTenantDailyReport(tenantId, yesterday, todayStart);
        
        // Store report
        await admin.firestore()
          .collection('tenants')
          .doc(tenantId)
          .collection('analytics')
          .doc(`daily_${yesterday.toISOString().split('T')[0]}`)
          .set(report);

        // Run AI predictions
        if (tenant.features?.aiPredictions) {
          await runDailyPredictions(tenantId, report);
        }
      }

      // Generate platform report
      const platformReport = await generatePlatformDailyReport(yesterday, todayStart);
      
      await admin.firestore()
        .collection('analytics')
        .doc('reports')
        .collection('daily')
        .doc(yesterday.toISOString().split('T')[0])
        .set(platformReport);

      logger.info('Daily analytics report completed');
    } catch (error) {
      logger.error('Error generating daily report', { error });
      throw error;
    }
  });

// ============================================================================
// REAL-TIME METRICS UPDATE
// ============================================================================
export const updateRealtimeMetrics = functions
  .region('europe-west1')
  .firestore
  .document('tenants/{tenantId}/orders/{orderId}')
  .onWrite(async (change, context) => {
    const { tenantId } = context.params;
    
    try {
      // Update real-time metrics
      const metricsRef = admin.firestore()
        .collection('tenants')
        .doc(tenantId)
        .collection('analytics')
        .doc('realtime');

      const metrics = await calculateRealtimeMetrics(tenantId);
      
      await metricsRef.set({
        ...metrics,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

    } catch (error) {
      logger.error('Error updating realtime metrics', { error, tenantId });
    }
  });

// ============================================================================
// PROCESSING FUNCTIONS
// ============================================================================
async function processPageView(event: AnalyticsEvent) {
  const sessionRef = admin.firestore()
    .collection('analytics')
    .doc('sessions')
    .collection(event.sessionId || 'anonymous')
    .doc(event.timestamp.toDate().toISOString());

  await sessionRef.set({
    ...event,
    type: 'page_view',
    processedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Update page view counter
  if (event.properties.page) {
    const pageStatsRef = admin.firestore()
      .collection('analytics')
      .doc('pageStats')
      .collection(event.properties.page)
      .doc(event.timestamp.toDate().toISOString().split('T')[0]);

    await pageStatsRef.set({
      views: admin.firestore.FieldValue.increment(1),
      uniqueUsers: admin.firestore.FieldValue.arrayUnion(event.userId || event.sessionId)
    }, { merge: true });
  }
}

async function processOrderEvent(event: AnalyticsEvent) {
  if (!event.tenantId) return;

  // Update revenue metrics
  const revenueRef = admin.firestore()
    .collection('tenants')
    .doc(event.tenantId)
    .collection('analytics')
    .doc('revenue')
    .collection(event.timestamp.toDate().toISOString().split('T')[0])
    .doc('hourly');

  const hour = event.timestamp.toDate().getHours();
  
  await revenueRef.set({
    [`hours.${hour}.count`]: admin.firestore.FieldValue.increment(1),
    [`hours.${hour}.revenue`]: admin.firestore.FieldValue.increment(event.properties.total || 0),
    totalOrders: admin.firestore.FieldValue.increment(1),
    totalRevenue: admin.firestore.FieldValue.increment(event.properties.total || 0)
  }, { merge: true });

  // Update product metrics
  if (event.properties.items) {
    for (const item of event.properties.items) {
      await updateProductMetrics(event.tenantId, item);
    }
  }
}

async function processItemView(event: AnalyticsEvent) {
  if (!event.tenantId || !event.properties.itemId) return;

  const itemStatsRef = admin.firestore()
    .collection('tenants')
    .doc(event.tenantId)
    .collection('analytics')
    .doc('products')
    .collection(event.properties.itemId)
    .doc(event.timestamp.toDate().toISOString().split('T')[0]);

  await itemStatsRef.set({
    views: admin.firestore.FieldValue.increment(1),
    uniqueUsers: admin.firestore.FieldValue.arrayUnion(event.userId || event.sessionId)
  }, { merge: true });
}

async function processSearch(event: AnalyticsEvent) {
  const searchTerm = event.properties.query?.toLowerCase();
  if (!searchTerm) return;

  const searchStatsRef = admin.firestore()
    .collection('analytics')
    .doc('searches')
    .collection(event.timestamp.toDate().toISOString().split('T')[0])
    .doc(searchTerm);

  await searchStatsRef.set({
    count: admin.firestore.FieldValue.increment(1),
    results: event.properties.resultsCount || 0,
    clicked: event.properties.clicked || false,
    tenants: admin.firestore.FieldValue.arrayUnion(event.tenantId)
  }, { merge: true });
}

async function processUserAction(event: AnalyticsEvent) {
  const actionRef = admin.firestore()
    .collection('analytics')
    .doc('userActions')
    .collection(event.timestamp.toDate().toISOString().split('T')[0])
    .doc(event.properties.action || 'unknown');

  await actionRef.set({
    count: admin.firestore.FieldValue.increment(1),
    users: admin.firestore.FieldValue.arrayUnion(event.userId || event.sessionId),
    properties: admin.firestore.FieldValue.arrayUnion(JSON.stringify(event.properties))
  }, { merge: true });
}

async function processGenericEvent(event: AnalyticsEvent) {
  // Store in general events collection
  await admin.firestore()
    .collection('analytics')
    .doc('events')
    .collection(event.eventType)
    .add({
      ...event,
      processedAt: admin.firestore.FieldValue.serverTimestamp()
    });
}

// ============================================================================
// AGGREGATION FUNCTIONS
// ============================================================================
async function aggregateTenantStats(tenantId: string, startTime: Date, endTime: Date) {
  // Get all events for the tenant in the time range
  const eventsSnapshot = await admin.firestore()
    .collection('analytics')
    .doc('events')
    .collection('raw')
    .where('tenantId', '==', tenantId)
    .where('timestamp', '>=', startTime)
    .where('timestamp', '<', endTime)
    .get();

  const stats = {
    pageViews: 0,
    uniqueUsers: new Set(),
    orders: 0,
    revenue: 0,
    avgOrderValue: 0,
    topProducts: {},
    deviceTypes: {},
    locations: {}
  };

  eventsSnapshot.forEach(doc => {
    const event = doc.data() as AnalyticsEvent;
    
    if (event.eventType === 'page_view') {
      stats.pageViews++;
    }
    
    if (event.userId) {
      stats.uniqueUsers.add(event.userId);
    }
    
    if (event.eventType === 'order_placed') {
      stats.orders++;
      stats.revenue += event.properties.total || 0;
    }
    
    if (event.deviceInfo) {
      stats.deviceTypes[event.deviceInfo.deviceType] = 
        (stats.deviceTypes[event.deviceInfo.deviceType] || 0) + 1;
    }
    
    if (event.location?.country) {
      stats.locations[event.location.country] = 
        (stats.locations[event.location.country] || 0) + 1;
    }
  });

  if (stats.orders > 0) {
    stats.avgOrderValue = stats.revenue / stats.orders;
  }

  // Store aggregated stats
  await admin.firestore()
    .collection('tenants')
    .doc(tenantId)
    .collection('analytics')
    .doc('hourly')
    .collection(startTime.toISOString().split('T')[0])
    .doc(startTime.getHours().toString())
    .set({
      ...stats,
      uniqueUsers: stats.uniqueUsers.size,
      period: {
        start: startTime,
        end: endTime
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
}

async function aggregatePlatformStats(startTime: Date, endTime: Date) {
  // Aggregate stats across all tenants
  const tenantsSnapshot = await admin.firestore()
    .collection('tenants')
    .where('status', '==', 'active')
    .get();

  const platformStats = {
    totalTenants: tenantsSnapshot.size,
    totalOrders: 0,
    totalRevenue: 0,
    totalUsers: new Set(),
    avgOrderValue: 0
  };

  for (const tenantDoc of tenantsSnapshot.docs) {
    const hourlyStats = await admin.firestore()
      .collection('tenants')
      .doc(tenantDoc.id)
      .collection('analytics')
      .doc('hourly')
      .collection(startTime.toISOString().split('T')[0])
      .doc(startTime.getHours().toString())
      .get();

    if (hourlyStats.exists) {
      const data = hourlyStats.data();
      platformStats.totalOrders += data.orders || 0;
      platformStats.totalRevenue += data.revenue || 0;
      
      if (data.uniqueUsers) {
        data.uniqueUsers.forEach(user => platformStats.totalUsers.add(user));
      }
    }
  }

  if (platformStats.totalOrders > 0) {
    platformStats.avgOrderValue = platformStats.totalRevenue / platformStats.totalOrders;
  }

  // Store platform stats
  await admin.firestore()
    .collection('analytics')
    .doc('platform')
    .collection('hourly')
    .doc(`${startTime.toISOString()}`)
    .set({
      ...platformStats,
      totalUsers: platformStats.totalUsers.size,
      period: {
        start: startTime,
        end: endTime
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
}

// ============================================================================
// REPORT GENERATION
// ============================================================================
async function generateTenantDailyReport(tenantId: string, startDate: Date, endDate: Date) {
  // Collect all hourly stats for the day
  const hourlyStatsSnapshot = await admin.firestore()
    .collection('tenants')
    .doc(tenantId)
    .collection('analytics')
    .doc('hourly')
    .collection(startDate.toISOString().split('T')[0])
    .get();

  const dailyStats = {
    date: startDate.toISOString().split('T')[0],
    orders: 0,
    revenue: 0,
    uniqueUsers: new Set(),
    pageViews: 0,
    avgOrderValue: 0,
    peakHour: null,
    deviceBreakdown: {},
    topProducts: [],
    conversionRate: 0
  };

  hourlyStatsSnapshot.forEach(doc => {
    const hourData = doc.data();
    dailyStats.orders += hourData.orders || 0;
    dailyStats.revenue += hourData.revenue || 0;
    dailyStats.pageViews += hourData.pageViews || 0;
    
    if (hourData.uniqueUsers) {
      hourData.uniqueUsers.forEach(user => dailyStats.uniqueUsers.add(user));
    }
  });

  // Calculate additional metrics
  if (dailyStats.orders > 0) {
    dailyStats.avgOrderValue = dailyStats.revenue / dailyStats.orders;
  }
  
  if (dailyStats.pageViews > 0 && dailyStats.uniqueUsers.size > 0) {
    dailyStats.conversionRate = (dailyStats.orders / dailyStats.uniqueUsers.size) * 100;
  }

  // Get top products
  dailyStats.topProducts = await getTopProducts(tenantId, startDate, endDate);

  return {
    ...dailyStats,
    uniqueUsers: dailyStats.uniqueUsers.size,
    generatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
}

async function generatePlatformDailyReport(startDate: Date, endDate: Date) {
  const tenantReports = [];
  
  const tenantsSnapshot = await admin.firestore()
    .collection('tenants')
    .where('status', '==', 'active')
    .get();

  for (const tenantDoc of tenantsSnapshot.docs) {
    const reportDoc = await admin.firestore()
      .collection('tenants')
      .doc(tenantDoc.id)
      .collection('analytics')
      .doc(`daily_${startDate.toISOString().split('T')[0]}`)
      .get();

    if (reportDoc.exists) {
      tenantReports.push({
        tenantId: tenantDoc.id,
        ...reportDoc.data()
      });
    }
  }

  // Aggregate platform metrics
  const platformReport = {
    date: startDate.toISOString().split('T')[0],
    totalTenants: tenantReports.length,
    totalOrders: tenantReports.reduce((sum, r) => sum + r.orders, 0),
    totalRevenue: tenantReports.reduce((sum, r) => sum + r.revenue, 0),
    totalUsers: tenantReports.reduce((sum, r) => sum + r.uniqueUsers, 0),
    avgOrderValue: 0,
    topTenants: tenantReports
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(t => ({ tenantId: t.tenantId, revenue: t.revenue }))
  };

  if (platformReport.totalOrders > 0) {
    platformReport.avgOrderValue = platformReport.totalRevenue / platformReport.totalOrders;
  }

  return platformReport;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
async function updateProductMetrics(tenantId: string, item: any) {
  const productRef = admin.firestore()
    .collection('tenants')
    .doc(tenantId)
    .collection('analytics')
    .doc('products')
    .collection(item.id)
    .doc('metrics');

  await productRef.set({
    totalSold: admin.firestore.FieldValue.increment(item.quantity),
    totalRevenue: admin.firestore.FieldValue.increment(item.price * item.quantity),
    lastSold: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

async function getTopProducts(tenantId: string, startDate: Date, endDate: Date) {
  const productsSnapshot = await admin.firestore()
    .collection('tenants')
    .doc(tenantId)
    .collection('analytics')
    .doc('products')
    .collection('metrics')
    .orderBy('totalSold', 'desc')
    .limit(10)
    .get();

  return productsSnapshot.docs.map(doc => ({
    productId: doc.id,
    ...doc.data()
  }));
}

async function calculateRealtimeMetrics(tenantId: string) {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  // Get recent orders
  const recentOrdersSnapshot = await admin.firestore()
    .collection('tenants')
    .doc(tenantId)
    .collection('orders')
    .where('createdAt', '>=', hourAgo)
    .get();

  const metrics = {
    ordersLastHour: recentOrdersSnapshot.size,
    revenueLastHour: 0,
    avgOrderTime: 0,
    activeOrders: 0
  };

  recentOrdersSnapshot.forEach(doc => {
    const order = doc.data();
    metrics.revenueLastHour += order.total || 0;
    
    if (['new', 'confirmed', 'preparing'].includes(order.status)) {
      metrics.activeOrders++;
    }
  });

  return metrics;
}

async function runDailyPredictions(tenantId: string, dailyReport: any) {
  try {
    // Run demand prediction
    const demandPrediction = await aiService.predictDemand({
      tenantId,
      historicalData: dailyReport,
      horizon: 7 // 7 days
    });

    // Run revenue forecast
    const revenueForecast = await aiService.forecastRevenue({
      tenantId,
      currentRevenue: dailyReport.revenue,
      trend: 'daily'
    });

    // Store predictions
    await admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('analytics')
      .doc('predictions')
      .set({
        demand: demandPrediction,
        revenue: revenueForecast,
        generatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

  } catch (error) {
    logger.error('Error running AI predictions', { error, tenantId });
  }
}

// ============================================================================
// EXPORT ALL TRIGGERS
// ============================================================================
export const analyticsTriggers = {
  onAnalyticsEvent,
  aggregateHourlyStats,
  generateDailyReport,
  updateRealtimeMetrics
};