/**
 * EATECH Order Service
 * Handles order creation and management
 * File Path: /apps/web/src/services/OrderService.js
 */

import { getDatabase, ref, push, set, update, onValue, off } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';

class OrderService {
  constructor() {
    this.db = getDatabase();
    this.functions = getFunctions();
    this.auth = getAuth();
  }

  /**
   * Create a new order
   */
  async createOrder(orderData) {
    try {
      const {
        tenantId,
        sessionId,
        tableId,
        tableName,
        customer,
        items,
        totals,
        paymentMethod,
        payment,
        notes,
        status = 'pending'
      } = orderData;

      // Generate order number
      const orderNumber = this.generateOrderNumber();

      // Create order object
      const order = {
        orderNumber,
        tenantId,
        sessionId,
        tableId,
        tableName,
        customer,
        items,
        totals,
        paymentMethod,
        payment,
        notes,
        status,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        statusHistory: [{
          status,
          timestamp: Date.now(),
          note: 'Order created'
        }]
      };

      // Save to database
      const ordersRef = ref(this.db, `tenants/${tenantId}/orders`);
      const newOrderRef = push(ordersRef);
      await set(newOrderRef, order);

      // Save order ID to session for tracking
      if (sessionId) {
        const sessionOrdersRef = ref(this.db, `tenants/${tenantId}/sessions/${sessionId}/orders/${newOrderRef.key}`);
        await set(sessionOrdersRef, true);
      }

      // Send notifications
      await this.sendOrderNotifications({
        orderId: newOrderRef.key,
        tenantId,
        order
      });

      return {
        id: newOrderRef.key,
        ...order
      };

    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(tenantId, orderId, newStatus, note = '') {
    try {
      const orderRef = ref(this.db, `tenants/${tenantId}/orders/${orderId}`);
      
      const updates = {
        status: newStatus,
        updatedAt: Date.now()
      };

      // Add to status history
      const statusUpdate = {
        status: newStatus,
        timestamp: Date.now(),
        note,
        updatedBy: this.auth.currentUser?.uid || 'system'
      };

      await update(orderRef, updates);
      
      // Update status history
      const historyRef = ref(this.db, `tenants/${tenantId}/orders/${orderId}/statusHistory`);
      await push(historyRef, statusUpdate);

      // Send status update notification
      await this.sendStatusNotification({
        tenantId,
        orderId,
        newStatus,
        note
      });

      return true;

    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(tenantId, orderId) {
    try {
      const orderRef = ref(this.db, `tenants/${tenantId}/orders/${orderId}`);
      
      return new Promise((resolve, reject) => {
        onValue(orderRef, (snapshot) => {
          if (snapshot.exists()) {
            resolve({
              id: orderId,
              ...snapshot.val()
            });
          } else {
            reject(new Error('Order not found'));
          }
        }, reject, { onlyOnce: true });
      });

    } catch (error) {
      console.error('Error getting order:', error);
      throw error;
    }
  }

  /**
   * Subscribe to order updates
   */
  subscribeToOrder(tenantId, orderId, callback) {
    const orderRef = ref(this.db, `tenants/${tenantId}/orders/${orderId}`);
    
    const listener = onValue(orderRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({
          id: orderId,
          ...snapshot.val()
        });
      }
    });

    // Return unsubscribe function
    return () => off(orderRef, 'value', listener);
  }

  /**
   * Get orders for a session
   */
  async getSessionOrders(tenantId, sessionId) {
    try {
      const sessionOrdersRef = ref(this.db, `tenants/${tenantId}/sessions/${sessionId}/orders`);
      
      const orderIds = await new Promise((resolve) => {
        onValue(sessionOrdersRef, (snapshot) => {
          resolve(snapshot.exists() ? Object.keys(snapshot.val()) : []);
        }, { onlyOnce: true });
      });

      // Fetch all orders
      const orders = await Promise.all(
        orderIds.map(orderId => this.getOrder(tenantId, orderId))
      );

      return orders;

    } catch (error) {
      console.error('Error getting session orders:', error);
      return [];
    }
  }

  /**
   * Generate order number
   */
  generateOrderNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `${year}${month}${day}-${random}`;
  }

  /**
   * Calculate order statistics
   */
  calculateOrderStats(orders) {
    const stats = {
      total: orders.length,
      pending: 0,
      preparing: 0,
      ready: 0,
      delivered: 0,
      cancelled: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      averagePreparationTime: 0
    };

    let totalPrepTime = 0;
    let prepTimeCount = 0;

    orders.forEach(order => {
      // Count by status
      stats[order.status] = (stats[order.status] || 0) + 1;
      
      // Calculate revenue
      stats.totalRevenue += order.totals.total;
      
      // Calculate preparation time
      const statusHistory = order.statusHistory || [];
      const createdTime = statusHistory.find(s => s.status === 'pending')?.timestamp;
      const readyTime = statusHistory.find(s => s.status === 'ready')?.timestamp;
      
      if (createdTime && readyTime) {
        totalPrepTime += (readyTime - createdTime);
        prepTimeCount++;
      }
    });

    // Calculate averages
    stats.averageOrderValue = stats.total > 0 ? stats.totalRevenue / stats.total : 0;
    stats.averagePreparationTime = prepTimeCount > 0 ? totalPrepTime / prepTimeCount / 60000 : 0; // in minutes

    return stats;
  }

  /**
   * Send order notifications
   */
  async sendOrderNotifications({ orderId, tenantId, order }) {
    try {
      const sendNotification = httpsCallable(this.functions, 'sendOrderNotification');
      
      await sendNotification({
        orderId,
        tenantId,
        order,
        type: 'new_order'
      });

      return true;
    } catch (error) {
      console.error('Error sending notifications:', error);
      // Don't throw - notifications are not critical
      return false;
    }
  }

  /**
   * Send status update notification
   */
  async sendStatusNotification({ tenantId, orderId, newStatus, note }) {
    try {
      const sendNotification = httpsCallable(this.functions, 'sendOrderNotification');
      
      await sendNotification({
        orderId,
        tenantId,
        status: newStatus,
        note,
        type: 'status_update'
      });

      return true;
    } catch (error) {
      console.error('Error sending status notification:', error);
      return false;
    }
  }

  /**
   * Estimate preparation time
   */
  estimatePreparationTime(items) {
    // Base time: 10 minutes
    let prepTime = 10;
    
    // Add time based on items
    items.forEach(item => {
      // Add 3 minutes per item
      prepTime += 3 * item.quantity;
      
      // Add extra time for complex items
      if (item.options && Object.keys(item.options).length > 2) {
        prepTime += 2;
      }
    });

    // Cap at 45 minutes
    return Math.min(prepTime, 45);
  }

  /**
   * Validate order data
   */
  validateOrderData(orderData) {
    const errors = [];

    if (!orderData.tenantId) {
      errors.push('Tenant ID is required');
    }

    if (!orderData.customer?.name) {
      errors.push('Customer name is required');
    }

    if (!orderData.customer?.phone) {
      errors.push('Customer phone is required');
    }

    if (!orderData.items || orderData.items.length === 0) {
      errors.push('Order must contain at least one item');
    }

    if (!orderData.paymentMethod) {
      errors.push('Payment method is required');
    }

    if (orderData.totals?.total <= 0) {
      errors.push('Order total must be greater than 0');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default new OrderService();