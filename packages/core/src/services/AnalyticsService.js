/**
 * EATECH - Analytics Service
 * Version: 1.0.0
 * Description: Service für Analytics-Tracking und Reporting
 * Features: Event Tracking, Real-time Analytics, Custom Reports
 * 
 * Kapitel: Phase 4 - Advanced Features - Analytics Dashboard
 */

import { 
  getDatabase, 
  ref, 
  push, 
  set, 
  get, 
  query, 
  orderByChild, 
  startAt, 
  endAt,
  onValue,
  off
} from 'firebase/database';
import { format, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// CONSTANTS
// ============================================================================
const ANALYTICS_VERSION = '1.0.0';
const MAX_BATCH_SIZE = 100;
const ANALYTICS_RETENTION_DAYS = 90;

const EVENT_TYPES = {
  // Page Views
  PAGE_VIEW: 'page_view',
  PAGE_EXIT: 'page_exit',
  
  // Product Events
  PRODUCT_VIEW: 'product_view',
  PRODUCT_ADD_TO_CART: 'product_add_to_cart',
  PRODUCT_REMOVE_FROM_CART: 'product_remove_from_cart',
  
  // Order Events
  ORDER_STARTED: 'order_started',
  ORDER_COMPLETED: 'order_completed',
  ORDER_CANCELLED: 'order_cancelled',
  ORDER_PAYMENT_FAILED: 'order_payment_failed',
  
  // User Events
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_REGISTER: 'user_register',
  
  // Search Events
  SEARCH_PERFORMED: 'search_performed',
  SEARCH_RESULT_CLICKED: 'search_result_clicked',
  
  // Custom Events
  CUSTOM: 'custom'
};

// ============================================================================
// ANALYTICS SERVICE CLASS
// ============================================================================
export class AnalyticsService {
  constructor(firebaseApp) {
    this.db = getDatabase(firebaseApp);
    this.sessionId = this.generateSessionId();
    this.userId = null;
    this.tenantId = null;
    this.eventQueue = [];
    this.listeners = new Map();
    this.flushTimer = null;
    
    // Start session
    this.startSession();
    
    // Setup periodic flush
    this.startPeriodicFlush();
    
    // Setup page visibility tracking
    this.setupVisibilityTracking();
  }
  
  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  setUser(userId) {
    this.userId = userId;
  }
  
  setTenant(tenantId) {
    this.tenantId = tenantId;
  }
  
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  startSession() {
    this.trackEvent(EVENT_TYPES.PAGE_VIEW, {
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language
    });
  }
  
  setupVisibilityTracking() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent(EVENT_TYPES.PAGE_EXIT, {
          url: window.location.href,
          timeOnPage: this.getTimeOnPage()
        });
        this.flushEvents();
      }
    });
    
    window.addEventListener('beforeunload', () => {
      this.flushEvents();
    });
  }
  
  getTimeOnPage() {
    if (!this.pageStartTime) {
      this.pageStartTime = Date.now();
    }
    return Math.floor((Date.now() - this.pageStartTime) / 1000);
  }
  
  // ==========================================================================
  // EVENT TRACKING
  // ==========================================================================
  trackEvent(eventType, eventData = {}) {
    if (!this.tenantId) {
      console.warn('Analytics: Tenant ID not set');
      return;
    }
    
    const event = {
      id: uuidv4(),
      type: eventType,
      data: eventData,
      metadata: {
        sessionId: this.sessionId,
        userId: this.userId,
        tenantId: this.tenantId,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        clientTimestamp: Date.now()
      }
    };
    
    // Add to queue
    this.eventQueue.push(event);
    
    // Flush if queue is full
    if (this.eventQueue.length >= MAX_BATCH_SIZE) {
      this.flushEvents();
    }
  }
  
  // Specific tracking methods
  trackPageView(pagePath, pageTitle) {
    this.trackEvent(EVENT_TYPES.PAGE_VIEW, {
      path: pagePath,
      title: pageTitle || document.title
    });
  }
  
  trackProductView(product) {
    this.trackEvent(EVENT_TYPES.PRODUCT_VIEW, {
      productId: product.id,
      productName: product.name,
      productCategory: product.category,
      productPrice: product.price
    });
  }
  
  trackAddToCart(product, quantity = 1) {
    this.trackEvent(EVENT_TYPES.PRODUCT_ADD_TO_CART, {
      productId: product.id,
      productName: product.name,
      productCategory: product.category,
      productPrice: product.price,
      quantity,
      totalValue: product.price * quantity
    });
  }
  
  trackRemoveFromCart(product, quantity = 1) {
    this.trackEvent(EVENT_TYPES.PRODUCT_REMOVE_FROM_CART, {
      productId: product.id,
      productName: product.name,
      quantity
    });
  }
  
  trackOrderStarted(order) {
    this.trackEvent(EVENT_TYPES.ORDER_STARTED, {
      orderId: order.id,
      orderValue: order.total,
      itemCount: order.items.length
    });
  }
  
  trackOrderCompleted(order) {
    this.trackEvent(EVENT_TYPES.ORDER_COMPLETED, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderValue: order.total,
      itemCount: order.items.length,
      paymentMethod: order.paymentMethod,
      deliveryMethod: order.deliveryMethod,
      items: order.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price
      }))
    });
  }
  
  trackSearch(searchQuery, resultsCount) {
    this.trackEvent(EVENT_TYPES.SEARCH_PERFORMED, {
      query: searchQuery,
      resultsCount
    });
  }
  
  trackCustomEvent(eventName, eventData) {
    this.trackEvent(EVENT_TYPES.CUSTOM, {
      eventName,
      ...eventData
    });
  }
  
  // ==========================================================================
  // EVENT QUEUE MANAGEMENT
  // ==========================================================================
  startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flushEvents();
      }
    }, 10000); // Flush every 10 seconds
  }
  
  async flushEvents() {
    if (this.eventQueue.length === 0) {
      return;
    }
    
    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];
    
    try {
      // Send events to Firebase
      const batch = {};
      
      eventsToFlush.forEach(event => {
        const eventRef = `analytics/${event.metadata.tenantId}/events/${event.id}`;
        batch[eventRef] = event;
        
        // Also update aggregated data
        const hourKey = format(new Date(event.metadata.timestamp), 'yyyy-MM-dd-HH');
        const aggregateRef = `analytics/${event.metadata.tenantId}/aggregates/${hourKey}/${event.type}`;
        
        if (!batch[aggregateRef]) {
          batch[aggregateRef] = { count: 0 };
        }
        batch[aggregateRef].count++;
      });
      
      // Update database
      const updates = {};
      Object.entries(batch).forEach(([path, data]) => {
        updates[path] = data;
      });
      
      await set(ref(this.db), updates);
      
      console.log(`Analytics: Flushed ${eventsToFlush.length} events`);
    } catch (error) {
      console.error('Analytics: Failed to flush events', error);
      
      // Re-add events to queue
      this.eventQueue.unshift(...eventsToFlush);
    }
  }
  
  // ==========================================================================
  // ANALYTICS QUERIES
  // ==========================================================================
  async getAnalytics({ tenantId, startDate, endDate }) {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }
    
    const start = startDate || startOfDay(new Date());
    const end = endDate || endOfDay(new Date());
    
    try {
      // Fetch events
      const eventsRef = ref(this.db, `analytics/${tenantId}/events`);
      const eventsQuery = query(
        eventsRef,
        orderByChild('metadata/timestamp'),
        startAt(start.toISOString()),
        endAt(end.toISOString())
      );
      
      const eventsSnapshot = await get(eventsQuery);
      const events = [];
      
      eventsSnapshot.forEach(child => {
        events.push(child.val());
      });
      
      // Process analytics
      const analytics = this.processAnalytics(events, start, end);
      
      return analytics;
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      throw error;
    }
  }
  
  processAnalytics(events, startDate, endDate) {
    const summary = {
      totalRevenue: 0,
      totalOrders: 0,
      uniqueCustomers: new Set(),
      averageOrderValue: 0,
      averagePreparationTime: 0,
      averageRating: 0,
      conversionRate: 0,
      topProducts: {},
      topCategories: {},
      hourlyDistribution: {},
      paymentMethods: {}
    };
    
    const timeSeries = [];
    const products = {};
    const categories = {};
    
    // Process events
    events.forEach(event => {
      const timestamp = new Date(event.metadata.timestamp);
      
      switch (event.type) {
        case EVENT_TYPES.ORDER_COMPLETED:
          summary.totalRevenue += event.data.orderValue || 0;
          summary.totalOrders++;
          
          if (event.metadata.userId) {
            summary.uniqueCustomers.add(event.metadata.userId);
          }
          
          if (event.data.paymentMethod) {
            summary.paymentMethods[event.data.paymentMethod] = 
              (summary.paymentMethods[event.data.paymentMethod] || 0) + 1;
          }
          
          // Process items
          event.data.items?.forEach(item => {
            if (!products[item.productId]) {
              products[item.productId] = {
                id: item.productId,
                name: item.productName,
                revenue: 0,
                quantity: 0
              };
            }
            
            products[item.productId].revenue += item.price * item.quantity;
            products[item.productId].quantity += item.quantity;
          });
          
          // Hourly distribution
          const hour = timestamp.getHours();
          summary.hourlyDistribution[hour] = (summary.hourlyDistribution[hour] || 0) + 1;
          break;
          
        case EVENT_TYPES.PAGE_VIEW:
          // Track for conversion rate
          break;
      }
    });
    
    // Calculate averages
    if (summary.totalOrders > 0) {
      summary.averageOrderValue = summary.totalRevenue / summary.totalOrders;
    }
    
    summary.uniqueCustomers = summary.uniqueCustomers.size;
    
    // Generate time series data
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    days.forEach(day => {
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.metadata.timestamp);
        return format(eventDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      });
      
      let dayRevenue = 0;
      let dayOrders = 0;
      let dayCustomers = new Set();
      
      dayEvents.forEach(event => {
        if (event.type === EVENT_TYPES.ORDER_COMPLETED) {
          dayRevenue += event.data.orderValue || 0;
          dayOrders++;
          if (event.metadata.userId) {
            dayCustomers.add(event.metadata.userId);
          }
        }
      });
      
      timeSeries.push({
        timestamp: day.toISOString(),
        revenue: dayRevenue,
        orders: dayOrders,
        customers: dayCustomers.size,
        avgOrderValue: dayOrders > 0 ? dayRevenue / dayOrders : 0
      });
    });
    
    // Process categories
    Object.values(products).forEach(product => {
      const category = product.category || 'Uncategorized';
      
      if (!categories[category]) {
        categories[category] = {
          name: category,
          revenue: 0,
          quantity: 0
        };
      }
      
      categories[category].revenue += product.revenue;
      categories[category].quantity += product.quantity;
    });
    
    return {
      summary,
      timeSeries,
      products: Object.values(products),
      categories: Object.values(categories),
      performance: {
        conversionRate: this.calculateConversionRate(events),
        returningCustomers: this.calculateReturningCustomers(events),
        completionRate: this.calculateCompletionRate(events),
        avgSessionDuration: this.calculateAvgSessionDuration(events)
      },
      hourlyDistribution: summary.hourlyDistribution,
      paymentMethods: summary.paymentMethods
    };
  }
  
  calculateConversionRate(events) {
    const sessions = new Set();
    const conversions = new Set();
    
    events.forEach(event => {
      sessions.add(event.metadata.sessionId);
      
      if (event.type === EVENT_TYPES.ORDER_COMPLETED) {
        conversions.add(event.metadata.sessionId);
      }
    });
    
    return sessions.size > 0 ? (conversions.size / sessions.size) * 100 : 0;
  }
  
  calculateReturningCustomers(events) {
    const customerOrders = {};
    
    events.forEach(event => {
      if (event.type === EVENT_TYPES.ORDER_COMPLETED && event.metadata.userId) {
        if (!customerOrders[event.metadata.userId]) {
          customerOrders[event.metadata.userId] = 0;
        }
        customerOrders[event.metadata.userId]++;
      }
    });
    
    const returningCustomers = Object.values(customerOrders).filter(count => count > 1).length;
    const totalCustomers = Object.keys(customerOrders).length;
    
    return totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;
  }
  
  calculateCompletionRate(events) {
    const startedOrders = events.filter(e => e.type === EVENT_TYPES.ORDER_STARTED).length;
    const completedOrders = events.filter(e => e.type === EVENT_TYPES.ORDER_COMPLETED).length;
    
    return startedOrders > 0 ? (completedOrders / startedOrders) * 100 : 0;
  }
  
  calculateAvgSessionDuration(events) {
    const sessions = {};
    
    events.forEach(event => {
      const sessionId = event.metadata.sessionId;
      
      if (!sessions[sessionId]) {
        sessions[sessionId] = {
          start: event.metadata.timestamp,
          end: event.metadata.timestamp
        };
      } else {
        sessions[sessionId].end = event.metadata.timestamp;
      }
    });
    
    const durations = Object.values(sessions).map(session => {
      return (new Date(session.end) - new Date(session.start)) / 1000;
    });
    
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    
    return durations.length > 0 ? totalDuration / durations.length : 0;
  }
  
  // ==========================================================================
  // REAL-TIME ANALYTICS
  // ==========================================================================
  subscribeToRealtimeAnalytics(tenantId, callback) {
    const analyticsRef = ref(this.db, `analytics/${tenantId}/realtime`);
    
    const listener = onValue(analyticsRef, (snapshot) => {
      const data = snapshot.val() || {};
      callback(data);
    });
    
    this.listeners.set(`realtime_${tenantId}`, { ref: analyticsRef, listener });
    
    return () => this.unsubscribeFromRealtimeAnalytics(tenantId);
  }
  
  unsubscribeFromRealtimeAnalytics(tenantId) {
    const key = `realtime_${tenantId}`;
    const subscription = this.listeners.get(key);
    
    if (subscription) {
      off(subscription.ref, 'value', subscription.listener);
      this.listeners.delete(key);
    }
  }
  
  // ==========================================================================
  // REPORT GENERATION
  // ==========================================================================
  async generateReport(data, format = 'pdf') {
    // This would integrate with a report generation service
    // For now, return the data formatted for export
    
    const report = {
      title: 'EATECH Analytics Report',
      generated: new Date().toISOString(),
      tenant: data.tenant,
      period: data.period,
      data: {
        summary: data.summary,
        charts: {
          revenue: data.timeSeries,
          products: data.products,
          categories: data.categories,
          hourlyDistribution: data.hourlyDistribution,
          paymentMethods: data.paymentMethods
        },
        performance: data.performance
      }
    };
    
    if (format === 'pdf') {
      // Would call PDF generation service
      console.log('PDF generation not implemented yet');
    }
    
    return report;
  }
  
  // ==========================================================================
  // CLEANUP
  // ==========================================================================
  destroy() {
    // Flush remaining events
    this.flushEvents();
    
    // Clear timers
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Unsubscribe from all listeners
    this.listeners.forEach((subscription, key) => {
      off(subscription.ref, 'value', subscription.listener);
    });
    this.listeners.clear();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================
let analyticsInstance = null;

export function initializeAnalytics(firebaseApp) {
  if (!analyticsInstance) {
    analyticsInstance = new AnalyticsService(firebaseApp);
  }
  return analyticsInstance;
}

export function getAnalytics() {
  if (!analyticsInstance) {
    throw new Error('Analytics not initialized. Call initializeAnalytics first.');
  }
  return analyticsInstance;
}