import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { 
  Order, 
  OrderStatus, 
  OrderItem,
  DailyOrderNumber,
  OrderValidation 
} from '@eatech/types';
import { paymentService } from './payment.service';
import { notificationService } from './notification.service';

interface CreateOrderParams {
  truckId: string;
  items: OrderItem[];
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  paymentMethodId?: string;
  scheduledFor?: Date;
  specialInstructions?: string;
  isVoiceOrder?: boolean;
  voiceTranscription?: string;
}

interface OrderUpdate {
  status?: OrderStatus;
  estimatedTime?: number;
  completedAt?: Date;
  cancelReason?: string;
}

export class OrderService {
  private db = admin.firestore();
  private realtimeDb = admin.database();
  
  // Configuration
  private readonly DAILY_ORDER_START = 100;
  private readonly MAX_ITEMS_PER_ORDER = 50;
  private readonly MAX_SPECIAL_INSTRUCTIONS_LENGTH = 200;
  private readonly ORDER_TIMEOUT_MINUTES = 60;

  /**
   * Create new order with validation
   */
  async createOrder(params: CreateOrderParams): Promise<Order> {
    try {
      // Validate order
      await this.validateOrder(params);

      // Get truck data
      const truck = await this.getTruck(params.truckId);
      if (!truck.isOpen) {
        throw new Error('Food truck is currently closed');
      }

      // Generate order number
      const dailyOrderNumber = await this.generateDailyOrderNumber(params.truckId);

      // Calculate totals
      const orderDetails = await this.calculateOrderTotals(params.items, params.truckId);

      // Create order document
      const orderId = this.generateOrderId();
      const order: Order = {
        id: orderId,
        truckId: params.truckId,
        dailyOrderNumber,
        orderNumber: dailyOrderNumber, // For display
        items: params.items,
        customerName: params.customerName,
        customerPhone: params.customerPhone,
        customerEmail: params.customerEmail,
        status: 'pending',
        totalAmount: orderDetails.total,
        subtotal: orderDetails.subtotal,
        vat: orderDetails.vat,
        vatRate: orderDetails.vatRate,
        createdAt: new Date(),
        estimatedTime: this.calculateEstimatedTime(params.items.length),
        isVoiceOrder: params.isVoiceOrder || false,
        voiceTranscription: params.voiceTranscription,
        specialInstructions: params.specialInstructions,
        scheduledFor: params.scheduledFor
      };

      // Save to Firestore
      await this.db
        .collection(`foodtrucks/${params.truckId}/orders`)
        .doc(orderId)
        .set(order);

      // Add to live orders for real-time updates
      await this.addToLiveOrders(order);

      // Update inventory
      await this.updateInventory(params.truckId, params.items);

      // Create payment intent if payment method provided
      if (params.paymentMethodId) {
        const paymentIntent = await paymentService.createPayment({
          amount: orderDetails.total,
          truckId: params.truckId,
          orderId: orderId,
          paymentMethodId: params.paymentMethodId,
          metadata: {
            orderNumber: dailyOrderNumber.toString(),
            customerName: params.customerName
          }
        });

        order.paymentIntentId = paymentIntent.id;
      }

      // Send notifications
      await this.sendOrderConfirmation(order);

      // Set up monitoring for unprocessed orders
      this.monitorOrderProcessing(orderId, params.truckId);

      return order;
    } catch (error) {
      logger.error('Failed to create order', { params, error });
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string, 
    truckId: string, 
    update: OrderUpdate
  ): Promise<void> {
    try {
      const orderRef = this.db
        .collection(`foodtrucks/${truckId}/orders`)
        .doc(orderId);

      const updateData: any = {
        ...update,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Add status-specific updates
      if (update.status === 'preparing') {
        updateData.startedPreparingAt = admin.firestore.FieldValue.serverTimestamp();
      } else if (update.status === 'ready') {
        updateData.readyAt = admin.firestore.FieldValue.serverTimestamp();
        
        // Trigger ready notification
        const order = await orderRef.get();
        await this.notifyOrderReady(order.data() as Order);
      } else if (update.status === 'completed') {
        updateData.completedAt = admin.firestore.FieldValue.serverTimestamp();
      } else if (update.status === 'cancelled') {
        updateData.cancelledAt = admin.firestore.FieldValue.serverTimestamp();
        
        // Process refund if paid
        const order = await orderRef.get();
        const orderData = order.data() as Order;
        if (orderData.paymentIntentId && orderData.paymentStatus === 'paid') {
          await paymentService.processRefund({
            paymentIntentId: orderData.paymentIntentId,
            reason: update.cancelReason || 'Order cancelled'
          });
        }
      }

      await orderRef.update(updateData);

      // Update live orders
      await this.updateLiveOrder(orderId, updateData);

      // Update analytics
      await this.updateOrderAnalytics(truckId, update.status);
    } catch (error) {
      logger.error('Failed to update order status', { orderId, truckId, update, error });
      throw error;
    }
  }

  /**
   * Generate daily order number
   */
  private async generateDailyOrderNumber(truckId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const counterRef = this.db
      .collection(`foodtrucks/${truckId}/counters`)
      .doc(today);

    try {
      const result = await this.db.runTransaction(async (transaction) => {
        const doc = await transaction.get(counterRef);
        
        let nextNumber: number;
        if (!doc.exists) {
          nextNumber = this.DAILY_ORDER_START;
          transaction.set(counterRef, {
            count: nextNumber,
            date: today,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          nextNumber = doc.data()!.count + 1;
          transaction.update(counterRef, {
            count: nextNumber,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
          });
        }
        
        return nextNumber;
      });

      return result;
    } catch (error) {
      logger.error('Failed to generate order number', { truckId, error });
      // Fallback to timestamp-based number
      return this.DAILY_ORDER_START + Math.floor(Date.now() / 1000) % 1000;
    }
  }

  /**
   * Validate order data
   */
  private async validateOrder(params: CreateOrderParams): Promise<void> {
    // Check items count
    if (!params.items || params.items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    if (params.items.length > this.MAX_ITEMS_PER_ORDER) {
      throw new Error(`Order cannot contain more than ${this.MAX_ITEMS_PER_ORDER} items`);
    }

    // Validate phone number (Swiss format)
    const phoneRegex = /^(\+41|0041|0)[1-9]\d{8}$/;
    if (!phoneRegex.test(params.customerPhone)) {
      throw new Error('Invalid Swiss phone number');
    }

    // Validate special instructions length
    if (params.specialInstructions && 
        params.specialInstructions.length > this.MAX_SPECIAL_INSTRUCTIONS_LENGTH) {
      throw new Error(`Special instructions too long (max ${this.MAX_SPECIAL_INSTRUCTIONS_LENGTH} characters)`);
    }

    // Validate products exist and are available
    const truck = await this.getTruck(params.truckId);
    for (const item of params.items) {
      const product = await this.getProduct(params.truckId, item.productId);
      
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      if (!product.available) {
        throw new Error(`Product ${product.name.de} is not available`);
      }

      if (item.quantity < 1 || item.quantity > 99) {
        throw new Error('Invalid quantity (must be between 1 and 99)');
      }
    }

    // Validate scheduled orders
    if (params.scheduledFor) {
      const scheduledTime = new Date(params.scheduledFor);
      const now = new Date();
      const maxAdvance = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Max 1 day in advance

      if (scheduledTime < now) {
        throw new Error('Cannot schedule orders in the past');
      }

      if (scheduledTime > maxAdvance) {
        throw new Error('Cannot schedule orders more than 24 hours in advance');
      }
    }
  }

  /**
   * Calculate order totals with VAT
   */
  private async calculateOrderTotals(
    items: OrderItem[], 
    truckId: string
  ): Promise<any> {
    let subtotal = 0;

    for (const item of items) {
      const product = await this.getProduct(truckId, item.productId);
      subtotal += product.price * item.quantity;
    }

    // Swiss VAT rates
    const vatRate = 2.5; // Takeaway rate (would be 7.7% for dine-in)
    const vat = Math.round(subtotal * vatRate / 100);
    const total = subtotal + vat;

    return {
      subtotal,
      vat,
      vatRate,
      total
    };
  }

  /**
   * Calculate estimated preparation time
   */
  private calculateEstimatedTime(itemCount: number): number {
    // Base time + time per item
    const baseTime = 10; // 10 minutes base
    const timePerItem = 2; // 2 minutes per item
    
    return baseTime + (itemCount * timePerItem);
  }

  /**
   * Add order to live collection for real-time updates
   */
  private async addToLiveOrders(order: Order): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    await this.db
      .collection('orders_live')
      .doc(today)
      .collection('orders')
      .doc(order.id)
      .set({
        ...order,
        ttl: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hour TTL
      });

    // Also update real-time database for instant updates
    await this.realtimeDb
      .ref(`live_orders/${order.truckId}/${order.id}`)
      .set({
        orderNumber: order.dailyOrderNumber,
        status: order.status,
        items: order.items.length,
        customerName: order.customerName,
        createdAt: order.createdAt.getTime(),
        estimatedTime: order.estimatedTime
      });
  }

  /**
   * Update live order status
   */
  private async updateLiveOrder(orderId: string, update: any): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    // Update Firestore live collection
    await this.db
      .collection('orders_live')
      .doc(today)
      .collection('orders')
      .doc(orderId)
      .update(update);

    // Update real-time database
    const updates: any = {};
    if (update.status) updates[`status`] = update.status;
    if (update.estimatedTime) updates[`estimatedTime`] = update.estimatedTime;
    
    // Find truck ID from order
    const orderSnapshot = await this.db
      .collectionGroup('orders')
      .where('id', '==', orderId)
      .limit(1)
      .get();
    
    if (!orderSnapshot.empty) {
      const order = orderSnapshot.docs[0].data();
      await this.realtimeDb
        .ref(`live_orders/${order.truckId}/${orderId}`)
        .update(updates);
    }
  }

  /**
   * Update inventory based on order
   */
  private async updateInventory(truckId: string, items: OrderItem[]): Promise<void> {
    const batch = this.db.batch();

    for (const item of items) {
      const inventoryRef = this.db
        .collection(`foodtrucks/${truckId}/inventory`)
        .doc(item.productId);

      batch.update(inventoryRef, {
        quantity: admin.firestore.FieldValue.increment(-item.quantity),
        lastSold: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    await batch.commit();
  }

  /**
   * Monitor order processing and escalate if needed
   */
  private monitorOrderProcessing(orderId: string, truckId: string): void {
    // Check after 5, 10, and 15 minutes
    const checkIntervals = [5, 10, 15];

    checkIntervals.forEach(minutes => {
      setTimeout(async () => {
        const order = await this.getOrder(orderId, truckId);
        
        if (order && order.status === 'pending') {
          await notificationService.handleOrderNotProcessed(orderId, truckId);
        }
      }, minutes * 60 * 1000);
    });
  }

  /**
   * Send order confirmation notification
   */
  private async sendOrderConfirmation(order: Order): Promise<void> {
    // To customer
    if (order.customerPhone) {
      await notificationService.send({
        type: 'order_confirmation',
        recipient: order.customerPhone,
        channel: 'sms',
        title: 'Bestellung bestätigt',
        body: `Ihre Bestellung ${order.dailyOrderNumber} wurde erhalten. Geschätzte Wartezeit: ${order.estimatedTime} Minuten.`,
        data: {
          orderId: order.id,
          orderNumber: order.dailyOrderNumber
        }
      });
    }

    // To truck kitchen display
    await this.db
      .collection('kitchen_updates')
      .doc(order.truckId)
      .update({
        newOrder: {
          id: order.id,
          number: order.dailyOrderNumber,
          items: order.items,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        }
      });
  }

  /**
   * Notify when order is ready
   */
  private async notifyOrderReady(order: Order): Promise<void> {
    // Customer notification
    await notificationService.send({
      type: 'order_ready',
      recipient: order.customerPhone,
      channel: 'push',
      title: '🎉 Ihre Bestellung ist fertig!',
      body: `Bestellung ${order.dailyOrderNumber} kann abgeholt werden.`,
      data: {
        orderId: order.id,
        orderNumber: order.dailyOrderNumber
      },
      priority: 'high'
    });

    // Voice announcement (if enabled)
    await this.triggerVoiceAnnouncement(order);
  }

  /**
   * Trigger voice announcement for ready orders
   */
  private async triggerVoiceAnnouncement(order: Order): Promise<void> {
    await this.db
      .collection('kitchen_updates')
      .doc(order.truckId)
      .update({
        voiceAnnouncement: {
          orderNumber: order.dailyOrderNumber,
          language: 'de', // Would be dynamic based on customer preference
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        }
      });
  }

  /**
   * Update order analytics
   */
  private async updateOrderAnalytics(truckId: string, status?: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const analyticsRef = this.db
      .collection('analytics')
      .doc(truckId)
      .collection('daily')
      .doc(today);

    const updates: any = {
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    };

    if (status === 'completed') {
      updates.completedOrders = admin.firestore.FieldValue.increment(1);
    } else if (status === 'cancelled') {
      updates.cancelledOrders = admin.firestore.FieldValue.increment(1);
    }

    await analyticsRef.update(updates);
  }

  /**
   * Get rush hour predictions
   */
  async getRushHourPrediction(truckId: string): Promise<any> {
    const historicalData = await this.getHistoricalOrderData(truckId, 30);
    
    // Analyze patterns
    const hourlyPatterns: Record<number, number> = {};
    
    historicalData.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hourlyPatterns[hour] = (hourlyPatterns[hour] || 0) + 1;
    });

    // Find peak hours
    const sortedHours = Object.entries(hourlyPatterns)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    const peakHours = sortedHours.map(([hour, count]) => ({
      hour: parseInt(hour),
      expectedOrders: Math.round(count / 30), // Average per day
      increase: `+${Math.round((count / 30 - 10) / 10 * 100)}%` // Compared to baseline
    }));

    return {
      peakHours,
      recommendations: this.generateRushHourRecommendations(peakHours)
    };
  }

  /**
   * Helper methods
   */
  private generateOrderId(): string {
    return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getTruck(truckId: string): Promise<any> {
    const doc = await this.db.collection('foodtrucks').doc(truckId).get();
    if (!doc.exists) {
      throw new Error('Food truck not found');
    }
    return { id: doc.id, ...doc.data() };
  }

  private async getProduct(truckId: string, productId: string): Promise<any> {
    const doc = await this.db
      .collection(`foodtrucks/${truckId}/products`)
      .doc(productId)
      .get();
    
    if (!doc.exists) {
      throw new Error('Product not found');
    }
    return { id: doc.id, ...doc.data() };
  }

  private async getOrder(orderId: string, truckId: string): Promise<Order | null> {
    const doc = await this.db
      .collection(`foodtrucks/${truckId}/orders`)
      .doc(orderId)
      .get();
    
    return doc.exists ? doc.data() as Order : null;
  }

  private async getHistoricalOrderData(truckId: string, days: number): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const snapshot = await this.db
      .collection(`foodtrucks/${truckId}/orders`)
      .where('createdAt', '>=', startDate)
      .get();

    return snapshot.docs.map(doc => doc.data());
  }

  private generateRushHourRecommendations(peakHours: any[]): string[] {
    const recommendations = [];

    if (peakHours[0]?.hour === 12) {
      recommendations.push('Bereiten Sie 10-15 Burger vor der Mittagszeit vor');
    }

    if (peakHours.some(h => h.expectedOrders > 30)) {
      recommendations.push('Erwägen Sie zusätzliches Personal während Stosszeiten');
    }

    recommendations.push('Erhöhen Sie die Preise während Stosszeiten um 10-15%');
    recommendations.push('Bereiten Sie populäre Beilagen im Voraus zu');

    return recommendations;
  }
}

// Export singleton instance
export const orderService = new OrderService();
