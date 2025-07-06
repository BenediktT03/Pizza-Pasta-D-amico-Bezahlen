/**
 * EATECH - Kitchen Service
 * Version: 1.0.0
 * Description: Service für Kitchen Display System und Order Management
 * Features: Real-time Updates, Station Management, Prep Time Tracking
 * 
 * Kapitel: Phase 4 - Advanced Features - Kitchen Display
 */

import { 
  getDatabase, 
  ref, 
  push, 
  set, 
  get, 
  onValue, 
  off,
  query,
  orderByChild,
  startAt,
  endAt,
  serverTimestamp
} from 'firebase/database';
import { differenceInMinutes, addMinutes, isWithinInterval } from 'date-fns';

// ============================================================================
// CONSTANTS
// ============================================================================
const ORDER_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  QUALITY_CHECK: 'quality_check',
  READY: 'ready',
  PICKED_UP: 'picked_up',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

const STATION_TYPES = {
  GRILL: 'grill',
  FRYER: 'fryer',
  SALAD: 'salad',
  DRINKS: 'drinks',
  DESSERT: 'dessert',
  GENERAL: 'general'
};

const DEFAULT_PREP_TIMES = {
  [STATION_TYPES.GRILL]: 12,
  [STATION_TYPES.FRYER]: 8,
  [STATION_TYPES.SALAD]: 5,
  [STATION_TYPES.DRINKS]: 3,
  [STATION_TYPES.DESSERT]: 5,
  [STATION_TYPES.GENERAL]: 10
};

const PEAK_HOURS = [
  { start: '11:30', end: '13:30' },
  { start: '18:00', end: '21:00' }
];

// ============================================================================
// KITCHEN SERVICE CLASS
// ============================================================================
export class KitchenService {
  constructor(firebaseApp) {
    this.db = getDatabase(firebaseApp);
    this.listeners = new Map();
    this.prepTimeHistory = [];
    this.stationConfigs = {};
    this.currentTenantId = null;
  }
  
  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================
  setTenant(tenantId) {
    this.currentTenantId = tenantId;
    this.loadStationConfigs();
  }
  
  async loadStationConfigs() {
    if (!this.currentTenantId) return;
    
    try {
      const configRef = ref(this.db, `tenants/${this.currentTenantId}/kitchenConfig`);
      const snapshot = await get(configRef);
      
      this.stationConfigs = snapshot.val() || {
        stations: STATION_TYPES,
        prepTimes: DEFAULT_PREP_TIMES,
        peakHours: PEAK_HOURS
      };
    } catch (error) {
      console.error('Failed to load kitchen config:', error);
    }
  }
  
  async updateStationConfig(config) {
    if (!this.currentTenantId) return;
    
    const configRef = ref(this.db, `tenants/${this.currentTenantId}/kitchenConfig`);
    await set(configRef, {
      ...this.stationConfigs,
      ...config,
      updatedAt: serverTimestamp()
    });
    
    this.stationConfigs = { ...this.stationConfigs, ...config };
  }
  
  // ==========================================================================
  // ORDER MANAGEMENT
  // ==========================================================================
  async acceptOrder(orderId) {
    if (!this.currentTenantId) return;
    
    const orderRef = ref(this.db, `tenants/${this.currentTenantId}/orders/${orderId}`);
    const snapshot = await get(orderRef);
    const order = snapshot.val();
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Calculate estimated ready time
    const estimatedPrepTime = this.calculateEstimatedPrepTime(order.items);
    const estimatedReadyTime = addMinutes(new Date(), estimatedPrepTime);
    
    await set(orderRef, {
      ...order,
      status: ORDER_STATUSES.PREPARING,
      acceptedAt: serverTimestamp(),
      estimatedReadyTime: estimatedReadyTime.toISOString(),
      estimatedPrepTime
    });
    
    // Track for analytics
    this.trackOrderEvent(orderId, 'accepted');
  }
  
  async updateOrderStatus(orderId, status) {
    if (!this.currentTenantId) return;
    
    const orderRef = ref(this.db, `tenants/${this.currentTenantId}/orders/${orderId}`);
    const updates = {
      status,
      [`${status}At`]: serverTimestamp()
    };
    
    // Special handling for ready status
    if (status === ORDER_STATUSES.READY) {
      const snapshot = await get(orderRef);
      const order = snapshot.val();
      
      if (order?.acceptedAt) {
        const actualPrepTime = differenceInMinutes(new Date(), new Date(order.acceptedAt));
        updates.actualPrepTime = actualPrepTime;
        
        // Update prep time history
        this.updatePrepTimeHistory(order.items, actualPrepTime);
      }
      
      // Send notification
      await this.sendReadyNotification(orderId);
    }
    
    await set(orderRef, updates);
    this.trackOrderEvent(orderId, `status_${status}`);
  }
  
  async completeOrder(orderId) {
    await this.updateOrderStatus(orderId, ORDER_STATUSES.READY);
  }
  
  async markAsPickedUp(orderId) {
    await this.updateOrderStatus(orderId, ORDER_STATUSES.PICKED_UP);
  }
  
  async recallOrder(orderId) {
    await this.updateOrderStatus(orderId, ORDER_STATUSES.PREPARING);
  }
  
  async cancelOrder(orderId, reason) {
    if (!this.currentTenantId) return;
    
    const orderRef = ref(this.db, `tenants/${this.currentTenantId}/orders/${orderId}`);
    
    await set(orderRef, {
      status: ORDER_STATUSES.CANCELLED,
      cancelledAt: serverTimestamp(),
      cancellationReason: reason
    });
    
    this.trackOrderEvent(orderId, 'cancelled', { reason });
  }
  
  // ==========================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ==========================================================================
  subscribeToOrders(tenantId, callback) {
    const ordersRef = ref(this.db, `tenants/${tenantId}/orders`);
    
    // Query for active orders
    const activeOrdersQuery = query(
      ordersRef,
      orderByChild('status'),
      startAt(ORDER_STATUSES.PENDING),
      endAt(ORDER_STATUSES.READY)
    );
    
    const listener = onValue(activeOrdersQuery, (snapshot) => {
      const orders = [];
      
      snapshot.forEach(child => {
        const order = {
          id: child.key,
          ...child.val()
        };
        
        // Filter out old ready orders (> 30 minutes)
        if (order.status === ORDER_STATUSES.READY) {
          const readyTime = new Date(order.readyAt || order.updatedAt);
          const minutesSinceReady = differenceInMinutes(new Date(), readyTime);
          
          if (minutesSinceReady > 30) {
            return;
          }
        }
        
        orders.push(order);
      });
      
      callback(orders);
    });
    
    this.listeners.set(`orders_${tenantId}`, { ref: activeOrdersQuery, listener });
    
    return () => this.unsubscribeFromOrders(tenantId);
  }
  
  unsubscribeFromOrders(tenantId) {
    const key = `orders_${tenantId}`;
    const subscription = this.listeners.get(key);
    
    if (subscription) {
      off(subscription.ref, 'value', subscription.listener);
      this.listeners.delete(key);
    }
  }
  
  subscribeToStationOrders(tenantId, station, callback) {
    // This would subscribe to orders for a specific station
    // For now, using the general orders subscription
    return this.subscribeToOrders(tenantId, (orders) => {
      const stationOrders = orders.filter(order => 
        order.items?.some(item => item.station === station)
      );
      callback(stationOrders);
    });
  }
  
  // ==========================================================================
  // PREP TIME CALCULATIONS
  // ==========================================================================
  calculateEstimatedPrepTime(items) {
    if (!items || items.length === 0) return 10;
    
    // Group items by station
    const stationTimes = {};
    
    items.forEach(item => {
      const station = item.station || STATION_TYPES.GENERAL;
      const baseTime = this.stationConfigs.prepTimes?.[station] || DEFAULT_PREP_TIMES[station] || 10;
      const itemTime = baseTime * (item.complexity || 1);
      
      if (!stationTimes[station]) {
        stationTimes[station] = 0;
      }
      
      // Items at same station can be prepared in parallel to some extent
      stationTimes[station] += itemTime * 0.7;
    });
    
    // The total time is the maximum time among all stations
    let maxTime = Math.max(...Object.values(stationTimes));
    
    // Adjust for peak hours
    if (this.isPeakTime()) {
      maxTime *= 1.3; // 30% increase during peak
    }
    
    // Adjust based on current order volume
    const currentLoad = this.getCurrentLoad();
    if (currentLoad > 0.8) {
      maxTime *= 1.2; // 20% increase for high load
    }
    
    return Math.ceil(maxTime);
  }
  
  updatePrepTimeHistory(items, actualTime) {
    const entry = {
      timestamp: new Date().toISOString(),
      items: items.length,
      actualTime,
      peakTime: this.isPeakTime()
    };
    
    this.prepTimeHistory.push(entry);
    
    // Keep only last 100 entries
    if (this.prepTimeHistory.length > 100) {
      this.prepTimeHistory = this.prepTimeHistory.slice(-100);
    }
    
    // Update average prep times
    this.updateAveragePrepTimes();
  }
  
  updateAveragePrepTimes() {
    // Calculate rolling average of actual prep times
    if (this.prepTimeHistory.length < 10) return;
    
    const recentEntries = this.prepTimeHistory.slice(-20);
    const avgTime = recentEntries.reduce((sum, entry) => sum + entry.actualTime, 0) / recentEntries.length;
    
    // Update station configs with learned times
    // This would be more sophisticated in production
    console.log('Average prep time:', avgTime);
  }
  
  getAveragePrepTime() {
    if (this.prepTimeHistory.length === 0) return 15;
    
    const recentEntries = this.prepTimeHistory.slice(-10);
    return Math.round(
      recentEntries.reduce((sum, entry) => sum + entry.actualTime, 0) / recentEntries.length
    );
  }
  
  // ==========================================================================
  // KITCHEN METRICS
  // ==========================================================================
  isPeakTime() {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const peakHours = this.stationConfigs.peakHours || PEAK_HOURS;
    
    return peakHours.some(period => {
      return currentTime >= period.start && currentTime <= period.end;
    });
  }
  
  async getCurrentLoad() {
    if (!this.currentTenantId) return 0;
    
    try {
      const ordersRef = ref(this.db, `tenants/${this.currentTenantId}/orders`);
      const activeOrdersQuery = query(
        ordersRef,
        orderByChild('status'),
        startAt(ORDER_STATUSES.CONFIRMED),
        endAt(ORDER_STATUSES.QUALITY_CHECK)
      );
      
      const snapshot = await get(activeOrdersQuery);
      const activeOrders = snapshot.size || 0;
      
      // Assume kitchen capacity is 20 orders
      const capacity = this.stationConfigs.maxCapacity || 20;
      
      return Math.min(activeOrders / capacity, 1);
    } catch (error) {
      console.error('Failed to get current load:', error);
      return 0;
    }
  }
  
  async getKitchenStats(timeRange = 'today') {
    if (!this.currentTenantId) return null;
    
    const stats = {
      ordersCompleted: 0,
      ordersInProgress: 0,
      averagePrepTime: this.getAveragePrepTime(),
      peakTime: this.isPeakTime(),
      currentLoad: await this.getCurrentLoad(),
      stationMetrics: {}
    };
    
    // Get orders for time range
    const ordersRef = ref(this.db, `tenants/${this.currentTenantId}/orders`);
    const snapshot = await get(ordersRef);
    
    snapshot.forEach(child => {
      const order = child.val();
      
      if (order.status === ORDER_STATUSES.PICKED_UP || order.status === ORDER_STATUSES.DELIVERED) {
        stats.ordersCompleted++;
      } else if ([ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.PREPARING, ORDER_STATUSES.QUALITY_CHECK].includes(order.status)) {
        stats.ordersInProgress++;
      }
      
      // Station metrics
      if (order.items) {
        order.items.forEach(item => {
          const station = item.station || STATION_TYPES.GENERAL;
          
          if (!stats.stationMetrics[station]) {
            stats.stationMetrics[station] = {
              items: 0,
              avgPrepTime: 0
            };
          }
          
          stats.stationMetrics[station].items++;
        });
      }
    });
    
    return stats;
  }
  
  // ==========================================================================
  // NOTIFICATIONS
  // ==========================================================================
  async sendReadyNotification(orderId) {
    if (!this.currentTenantId) return;
    
    try {
      const orderRef = ref(this.db, `tenants/${this.currentTenantId}/orders/${orderId}`);
      const snapshot = await get(orderRef);
      const order = snapshot.val();
      
      if (!order) return;
      
      // This would integrate with notification service
      console.log(`Order ${order.orderNumber} is ready for pickup`);
      
      // In production, would send push notification, SMS, etc.
    } catch (error) {
      console.error('Failed to send ready notification:', error);
    }
  }
  
  // ==========================================================================
  // ANALYTICS
  // ==========================================================================
  trackOrderEvent(orderId, event, data = {}) {
    // This would integrate with analytics service
    console.log('Kitchen event:', { orderId, event, data });
  }
  
  // ==========================================================================
  // STATION MANAGEMENT
  // ==========================================================================
  async assignOrderToStation(orderId, station, items) {
    if (!this.currentTenantId) return;
    
    const assignmentRef = ref(this.db, `tenants/${this.currentTenantId}/stationAssignments/${station}/${orderId}`);
    
    await set(assignmentRef, {
      orderId,
      items,
      assignedAt: serverTimestamp(),
      status: 'pending'
    });
  }
  
  async updateStationAssignment(station, orderId, status) {
    if (!this.currentTenantId) return;
    
    const assignmentRef = ref(this.db, `tenants/${this.currentTenantId}/stationAssignments/${station}/${orderId}`);
    
    await set(assignmentRef, {
      status,
      updatedAt: serverTimestamp()
    });
  }
  
  subscribeToStationAssignments(station, callback) {
    if (!this.currentTenantId) return () => {};
    
    const stationRef = ref(this.db, `tenants/${this.currentTenantId}/stationAssignments/${station}`);
    
    const listener = onValue(stationRef, (snapshot) => {
      const assignments = [];
      
      snapshot.forEach(child => {
        assignments.push({
          id: child.key,
          ...child.val()
        });
      });
      
      callback(assignments);
    });
    
    this.listeners.set(`station_${station}`, { ref: stationRef, listener });
    
    return () => {
      const subscription = this.listeners.get(`station_${station}`);
      if (subscription) {
        off(subscription.ref, 'value', subscription.listener);
        this.listeners.delete(`station_${station}`);
      }
    };
  }
  
  // ==========================================================================
  // CLEANUP
  // ==========================================================================
  destroy() {
    // Unsubscribe from all listeners
    this.listeners.forEach((subscription) => {
      off(subscription.ref, 'value', subscription.listener);
    });
    this.listeners.clear();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================
let kitchenInstance = null;

export function initializeKitchen(firebaseApp) {
  if (!kitchenInstance) {
    kitchenInstance = new KitchenService(firebaseApp);
  }
  return kitchenInstance;
}

export function getKitchen() {
  if (!kitchenInstance) {
    throw new Error('Kitchen not initialized. Call initializeKitchen first.');
  }
  return kitchenInstance;
}