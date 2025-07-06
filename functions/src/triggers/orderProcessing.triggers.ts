/**
 * EATECH - Order Processing Triggers
 * Version: 5.4.0
 * Description: Firebase Cloud Functions für Bestellungsverarbeitung mit Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /functions/src/triggers/orderProcessing.triggers.ts
 * 
 * Features: Order lifecycle, payment processing, notifications, analytics
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { EventContext } from 'firebase-functions';
import { 
  Order, 
  OrderStatus, 
  PaymentStatus, 
  NotificationData,
  AnalyticsEvent,
  KitchenTicket,
  InventoryUpdate
} from '../types/order.types';

// Lazy loaded services
const emailService = () => import('../services/EmailService');
const smsService = () => import('../services/SMSService');
const pushNotificationService = () => import('../services/PushNotificationService');
const paymentProcessor = () => import('../services/PaymentProcessor');
const inventoryService = () => import('../services/InventoryService');
const analyticsService = () => import('../services/AnalyticsService');
const aiPredictionService = () => import('../services/AIPredictionService');
const loyaltyService = () => import('../services/LoyaltyService');
const kitchenDisplayService = () => import('../services/KitchenDisplayService');

// Lazy loaded utilities
const orderUtils = () => import('../utils/orderUtils');
const timeUtils = () => import('../utils/timeUtils');
const validationUtils = () => import('../utils/validationUtils');

interface OrderChange extends functions.Change<functions.database.DataSnapshot> {}

/**
 * Trigger: When a new order is created
 * Handles order validation, inventory checks, and initial processing
 */
export const onOrderCreated = functions
  .region('europe-west1')
  .database
  .ref('/tenants/{tenantId}/orders/{orderId}')
  .onCreate(async (snapshot, context) => {
    const { tenantId, orderId } = context.params;
    const order: Order = snapshot.val();
    
    try {
      functions.logger.info(`Processing new order: ${orderId} for tenant: ${tenantId}`);
      
      // Validate order data
      const { default: validationUtilsModule } = await validationUtils();
      await validationUtilsModule.validateOrder(order);
      
      // Check inventory availability
      const { default: inventoryServiceModule } = await inventoryService();
      const inventoryCheck = await inventoryServiceModule.checkAvailability(
        tenantId, 
        order.items
      );
      
      if (!inventoryCheck.available) {
        await handleInventoryShortage(tenantId, orderId, inventoryCheck.unavailableItems);
        return;
      }
      
      // Reserve inventory
      await inventoryServiceModule.reserveItems(tenantId, order.items, orderId);
      
      // Process payment if required
      if (order.paymentMethod !== 'cash') {
        await processOrderPayment(tenantId, orderId, order);
      }
      
      // Calculate estimated preparation time
      const { default: orderUtilsModule } = await orderUtils();
      const estimatedTime = await orderUtilsModule.calculatePreparationTime(
        order.items,
        tenantId
      );
      
      // Update order with calculated values
      await admin.database()
        .ref(`/tenants/${tenantId}/orders/${orderId}`)
        .update({
          status: OrderStatus.CONFIRMED,
          estimatedPreparationTime: estimatedTime,
          estimatedReadyTime: admin.database.ServerValue.TIMESTAMP + (estimatedTime * 60000),
          confirmedAt: admin.database.ServerValue.TIMESTAMP,
          updatedAt: admin.database.ServerValue.TIMESTAMP
        });
      
      // Send to kitchen
      await sendToKitchen(tenantId, orderId, order);
      
      // Send confirmation notifications
      await sendOrderConfirmationNotifications(tenantId, orderId, order);
      
      // Track analytics
      await trackOrderAnalytics(tenantId, 'order_created', order);
      
      // Update AI predictions
      await updateAIPredictions(tenantId, order);
      
      // Process loyalty points
      await processLoyaltyPoints(tenantId, order);
      
      functions.logger.info(`Order ${orderId} successfully processed`);
      
    } catch (error) {
      functions.logger.error(`Error processing order ${orderId}:`, error);
      await handleOrderError(tenantId, orderId, error);
    }
  });

/**
 * Trigger: When an order status changes
 * Handles status transitions and notifications
 */
export const onOrderStatusChanged = functions
  .region('europe-west1')
  .database
  .ref('/tenants/{tenantId}/orders/{orderId}/status')
  .onUpdate(async (change, context) => {
    const { tenantId, orderId } = context.params;
    const beforeStatus: OrderStatus = change.before.val();
    const afterStatus: OrderStatus = change.after.val();
    
    try {
      functions.logger.info(
        `Order ${orderId} status changed: ${beforeStatus} -> ${afterStatus}`
      );
      
      // Get full order data
      const orderSnapshot = await admin.database()
        .ref(`/tenants/${tenantId}/orders/${orderId}`)
        .once('value');
      const order: Order = orderSnapshot.val();
      
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }
      
      // Handle status-specific logic
      switch (afterStatus) {
        case OrderStatus.PREPARING:
          await handleOrderPreparing(tenantId, orderId, order);
          break;
          
        case OrderStatus.READY:
          await handleOrderReady(tenantId, orderId, order);
          break;
          
        case OrderStatus.PICKED_UP:
          await handleOrderPickedUp(tenantId, orderId, order);
          break;
          
        case OrderStatus.DELIVERED:
          await handleOrderDelivered(tenantId, orderId, order);
          break;
          
        case OrderStatus.CANCELLED:
          await handleOrderCancelled(tenantId, orderId, order, beforeStatus);
          break;
          
        case OrderStatus.REFUNDED:
          await handleOrderRefunded(tenantId, orderId, order);
          break;
      }
      
      // Send status update notifications
      await sendStatusUpdateNotifications(tenantId, orderId, order, afterStatus);
      
      // Track analytics
      await trackOrderAnalytics(tenantId, 'order_status_changed', {
        ...order,
        previousStatus: beforeStatus,
        newStatus: afterStatus
      });
      
      // Update kitchen display
      await updateKitchenDisplay(tenantId, orderId, order, afterStatus);
      
    } catch (error) {
      functions.logger.error(`Error handling status change for order ${orderId}:`, error);
    }
  });

/**
 * Trigger: When payment status changes
 * Handles payment processing and order confirmation
 */
export const onPaymentStatusChanged = functions
  .region('europe-west1')
  .database
  .ref('/tenants/{tenantId}/orders/{orderId}/paymentStatus')
  .onUpdate(async (change, context) => {
    const { tenantId, orderId } = context.params;
    const beforeStatus: PaymentStatus = change.before.val();
    const afterStatus: PaymentStatus = change.after.val();
    
    try {
      functions.logger.info(
        `Payment status changed for order ${orderId}: ${beforeStatus} -> ${afterStatus}`
      );
      
      const orderSnapshot = await admin.database()
        .ref(`/tenants/${tenantId}/orders/${orderId}`)
        .once('value');
      const order: Order = orderSnapshot.val();
      
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }
      
      switch (afterStatus) {
        case PaymentStatus.PAID:
          await handlePaymentSuccess(tenantId, orderId, order);
          break;
          
        case PaymentStatus.FAILED:
          await handlePaymentFailure(tenantId, orderId, order);
          break;
          
        case PaymentStatus.REFUNDED:
          await handlePaymentRefund(tenantId, orderId, order);
          break;
      }
      
      // Track payment analytics
      await trackOrderAnalytics(tenantId, 'payment_status_changed', {
        ...order,
        previousPaymentStatus: beforeStatus,
        newPaymentStatus: afterStatus
      });
      
    } catch (error) {
      functions.logger.error(`Error handling payment status change for order ${orderId}:`, error);
    }
  });

/**
 * Scheduled function: Process overdue orders
 * Runs every 5 minutes to check for orders that are taking too long
 */
export const processOverdueOrders = functions
  .region('europe-west1')
  .pubsub
  .schedule('every 5 minutes')
  .onRun(async () => {
    try {
      functions.logger.info('Processing overdue orders...');
      
      const tenantsSnapshot = await admin.database()
        .ref('/tenants')
        .once('value');
      
      const tenants = tenantsSnapshot.val();
      if (!tenants) return;
      
      for (const tenantId of Object.keys(tenants)) {
        await processOverdueOrdersForTenant(tenantId);
      }
      
      functions.logger.info('Overdue orders processing completed');
      
    } catch (error) {
      functions.logger.error('Error processing overdue orders:', error);
    }
  });

/**
 * Scheduled function: Generate order analytics
 * Runs daily to aggregate order statistics
 */
export const generateOrderAnalytics = functions
  .region('europe-west1')
  .pubsub
  .schedule('0 2 * * *') // 2 AM daily
  .timeZone('Europe/Zurich')
  .onRun(async () => {
    try {
      functions.logger.info('Generating daily order analytics...');
      
      const { default: analyticsServiceModule } = await analyticsService();
      await analyticsServiceModule.generateDailyOrderReport();
      
      functions.logger.info('Daily order analytics generation completed');
      
    } catch (error) {
      functions.logger.error('Error generating order analytics:', error);
    }
  });

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Process payment for an order
 */
async function processOrderPayment(tenantId: string, orderId: string, order: Order): Promise<void> {
  try {
    const { default: paymentProcessorModule } = await paymentProcessor();
    
    const paymentResult = await paymentProcessorModule.processPayment({
      orderId,
      amount: order.total,
      currency: 'CHF',
      paymentMethod: order.paymentMethod,
      customerData: order.customer,
      metadata: {
        tenantId,
        orderItems: order.items.length
      }
    });
    
    await admin.database()
      .ref(`/tenants/${tenantId}/orders/${orderId}`)
      .update({
        paymentStatus: paymentResult.status,
        paymentId: paymentResult.transactionId,
        paymentProcessedAt: admin.database.ServerValue.TIMESTAMP
      });
    
  } catch (error) {
    functions.logger.error(`Payment processing failed for order ${orderId}:`, error);
    
    await admin.database()
      .ref(`/tenants/${tenantId}/orders/${orderId}`)
      .update({
        paymentStatus: PaymentStatus.FAILED,
        paymentError: error.message,
        paymentFailedAt: admin.database.ServerValue.TIMESTAMP
      });
    
    throw error;
  }
}

/**
 * Send order to kitchen display system
 */
async function sendToKitchen(tenantId: string, orderId: string, order: Order): Promise<void> {
  try {
    const { default: kitchenDisplayServiceModule } = await kitchenDisplayService();
    
    const kitchenTicket: KitchenTicket = {
      orderId,
      orderNumber: order.orderNumber,
      items: order.items,
      specialInstructions: order.specialInstructions,
      priority: calculateOrderPriority(order),
      estimatedTime: order.estimatedPreparationTime,
      customerInfo: {
        name: order.customer.name,
        waitingNumber: order.waitingNumber
      }
    };
    
    await kitchenDisplayServiceModule.addTicket(tenantId, kitchenTicket);
    
  } catch (error) {
    functions.logger.error(`Failed to send order ${orderId} to kitchen:`, error);
  }
}

/**
 * Send order confirmation notifications
 */
async function sendOrderConfirmationNotifications(
  tenantId: string, 
  orderId: string, 
  order: Order
): Promise<void> {
  try {
    const notificationData: NotificationData = {
      orderId,
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      total: order.total,
      estimatedTime: order.estimatedPreparationTime,
      tenantName: order.restaurant.name
    };
    
    // Send email confirmation
    if (order.customer.email) {
      const { default: emailServiceModule } = await emailService();
      await emailServiceModule.sendOrderConfirmation(order.customer.email, notificationData);
    }
    
    // Send SMS if enabled
    if (order.customer.phone && order.notifications?.sms) {
      const { default: smsServiceModule } = await smsService();
      await smsServiceModule.sendOrderConfirmation(order.customer.phone, notificationData);
    }
    
    // Send push notification if enabled
    if (order.customer.deviceToken && order.notifications?.push) {
      const { default: pushServiceModule } = await pushNotificationService();
      await pushServiceModule.sendOrderConfirmation(order.customer.deviceToken, notificationData);
    }
    
  } catch (error) {
    functions.logger.error(`Failed to send confirmation notifications for order ${orderId}:`, error);
  }
}

/**
 * Handle order preparing status
 */
async function handleOrderPreparing(tenantId: string, orderId: string, order: Order): Promise<void> {
  try {
    // Update timestamps
    await admin.database()
      .ref(`/tenants/${tenantId}/orders/${orderId}`)
      .update({
        preparationStartedAt: admin.database.ServerValue.TIMESTAMP,
        updatedAt: admin.database.ServerValue.TIMESTAMP
      });
    
    // Confirm inventory consumption
    const { default: inventoryServiceModule } = await inventoryService();
    await inventoryServiceModule.consumeReservedItems(tenantId, orderId);
    
  } catch (error) {
    functions.logger.error(`Error handling order preparing for ${orderId}:`, error);
  }
}

/**
 * Handle order ready status
 */
async function handleOrderReady(tenantId: string, orderId: string, order: Order): Promise<void> {
  try {
    // Update timestamps
    await admin.database()
      .ref(`/tenants/${tenantId}/orders/${orderId}`)
      .update({
        readyAt: admin.database.ServerValue.TIMESTAMP,
        updatedAt: admin.database.ServerValue.TIMESTAMP
      });
    
    // Send ready notifications
    const notificationData: NotificationData = {
      orderId,
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      message: 'Ihre Bestellung ist bereit zur Abholung!'
    };
    
    if (order.customer.phone && order.notifications?.sms) {
      const { default: smsServiceModule } = await smsService();
      await smsServiceModule.sendOrderReady(order.customer.phone, notificationData);
    }
    
    if (order.customer.deviceToken && order.notifications?.push) {
      const { default: pushServiceModule } = await pushNotificationService();
      await pushServiceModule.sendOrderReady(order.customer.deviceToken, notificationData);
    }
    
  } catch (error) {
    functions.logger.error(`Error handling order ready for ${orderId}:`, error);
  }
}

/**
 * Handle order cancellation
 */
async function handleOrderCancelled(
  tenantId: string, 
  orderId: string, 
  order: Order, 
  previousStatus: OrderStatus
): Promise<void> {
  try {
    // Release reserved inventory
    const { default: inventoryServiceModule } = await inventoryService();
    await inventoryServiceModule.releaseReservedItems(tenantId, orderId);
    
    // Process refund if payment was made
    if (order.paymentStatus === PaymentStatus.PAID) {
      const { default: paymentProcessorModule } = await paymentProcessor();
      await paymentProcessorModule.processRefund({
        paymentId: order.paymentId,
        amount: order.total,
        reason: 'Order cancelled'
      });
    }
    
    // Update timestamps
    await admin.database()
      .ref(`/tenants/${tenantId}/orders/${orderId}`)
      .update({
        cancelledAt: admin.database.ServerValue.TIMESTAMP,
        cancelReason: order.cancelReason || 'Customer cancellation',
        updatedAt: admin.database.ServerValue.TIMESTAMP
      });
    
    // Remove from kitchen display
    const { default: kitchenDisplayServiceModule } = await kitchenDisplayService();
    await kitchenDisplayServiceModule.removeTicket(tenantId, orderId);
    
  } catch (error) {
    functions.logger.error(`Error handling order cancellation for ${orderId}:`, error);
  }
}

/**
 * Process loyalty points for order
 */
async function processLoyaltyPoints(tenantId: string, order: Order): Promise<void> {
  try {
    if (!order.customer.loyaltyMemberId) return;
    
    const { default: loyaltyServiceModule } = await loyaltyService();
    await loyaltyServiceModule.awardPoints(
      tenantId,
      order.customer.loyaltyMemberId,
      order.total,
      order.id
    );
    
  } catch (error) {
    functions.logger.error(`Error processing loyalty points for order ${order.id}:`, error);
  }
}

/**
 * Track order analytics
 */
async function trackOrderAnalytics(
  tenantId: string, 
  event: string, 
  order: Order | any
): Promise<void> {
  try {
    const { default: analyticsServiceModule } = await analyticsService();
    
    const analyticsEvent: AnalyticsEvent = {
      event,
      tenantId,
      orderId: order.id,
      timestamp: new Date().toISOString(),
      data: {
        orderValue: order.total,
        itemCount: order.items?.length || 0,
        paymentMethod: order.paymentMethod,
        customerType: order.customer.type || 'guest',
        preparationTime: order.actualPreparationTime,
        ...order
      }
    };
    
    await analyticsServiceModule.track(analyticsEvent);
    
  } catch (error) {
    functions.logger.error(`Error tracking analytics for order ${order.id}:`, error);
  }
}

/**
 * Update AI predictions based on new order data
 */
async function updateAIPredictions(tenantId: string, order: Order): Promise<void> {
  try {
    const { default: aiPredictionServiceModule } = await aiPredictionService();
    await aiPredictionServiceModule.updatePredictions(tenantId, {
      orderData: order,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    functions.logger.error(`Error updating AI predictions for order ${order.id}:`, error);
  }
}

/**
 * Calculate order priority based on various factors
 */
function calculateOrderPriority(order: Order): number {
  let priority = 0;
  
  // VIP customer
  if (order.customer.isVIP) priority += 10;
  
  // Large order
  if (order.total > 100) priority += 5;
  
  // Loyalty member
  if (order.customer.loyaltyMemberId) priority += 3;
  
  // Rush hour
  const hour = new Date().getHours();
  if ((hour >= 12 && hour <= 14) || (hour >= 18 && hour <= 20)) {
    priority += 2;
  }
  
  return Math.min(priority, 20); // Cap at 20
}

/**
 * Process overdue orders for a specific tenant
 */
async function processOverdueOrdersForTenant(tenantId: string): Promise<void> {
  try {
    const ordersSnapshot = await admin.database()
      .ref(`/tenants/${tenantId}/orders`)
      .orderByChild('status')
      .equalTo(OrderStatus.PREPARING)
      .once('value');
    
    const orders = ordersSnapshot.val();
    if (!orders) return;
    
    const now = Date.now();
    const overdueThreshold = 30 * 60 * 1000; // 30 minutes
    
    for (const [orderId, order] of Object.entries(orders) as [string, Order][]) {
      const preparationStarted = order.preparationStartedAt || order.confirmedAt;
      const estimatedCompletion = preparationStarted + (order.estimatedPreparationTime * 60 * 1000);
      
      if (now > estimatedCompletion + overdueThreshold) {
        await handleOverdueOrder(tenantId, orderId, order);
      }
    }
    
  } catch (error) {
    functions.logger.error(`Error processing overdue orders for tenant ${tenantId}:`, error);
  }
}

/**
 * Handle individual overdue order
 */
async function handleOverdueOrder(tenantId: string, orderId: string, order: Order): Promise<void> {
  try {
    // Mark as overdue
    await admin.database()
      .ref(`/tenants/${tenantId}/orders/${orderId}`)
      .update({
        isOverdue: true,
        overdueAt: admin.database.ServerValue.TIMESTAMP
      });
    
    // Notify customer
    const notificationData: NotificationData = {
      orderId,
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      message: 'Entschuldigung für die Verzögerung. Ihre Bestellung wird bald fertig sein.'
    };
    
    if (order.customer.phone) {
      const { default: smsServiceModule } = await smsService();
      await smsServiceModule.sendDelayNotification(order.customer.phone, notificationData);
    }
    
    // Notify restaurant staff
    // Implementation depends on staff notification system
    
  } catch (error) {
    functions.logger.error(`Error handling overdue order ${orderId}:`, error);
  }
}

/**
 * Handle inventory shortage
 */
async function handleInventoryShortage(
  tenantId: string, 
  orderId: string, 
  unavailableItems: string[]
): Promise<void> {
  try {
    await admin.database()
      .ref(`/tenants/${tenantId}/orders/${orderId}`)
      .update({
        status: OrderStatus.CANCELLED,
        cancelReason: `Nicht verfügbar: ${unavailableItems.join(', ')}`,
        cancelledAt: admin.database.ServerValue.TIMESTAMP
      });
    
    // Notify customer about unavailable items
    // Implementation depends on notification preferences
    
  } catch (error) {
    functions.logger.error(`Error handling inventory shortage for order ${orderId}:`, error);
  }
}

/**
 * Handle order processing errors
 */
async function handleOrderError(tenantId: string, orderId: string, error: any): Promise<void> {
  try {
    await admin.database()
      .ref(`/tenants/${tenantId}/orders/${orderId}`)
      .update({
        status: OrderStatus.ERROR,
        error: error.message,
        errorAt: admin.database.ServerValue.TIMESTAMP
      });
    
    // Notify admin about the error
    // Implementation depends on admin notification system
    
  } catch (updateError) {
    functions.logger.error(`Failed to update order ${orderId} with error status:`, updateError);
  }
}

/**
 * Send status update notifications
 */
async function sendStatusUpdateNotifications(
  tenantId: string,
  orderId: string,
  order: Order,
  newStatus: OrderStatus
): Promise<void> {
  // Implementation would send appropriate notifications based on status
  // This is a simplified version
  const messages = {
    [OrderStatus.PREPARING]: 'Ihre Bestellung wird zubereitet',
    [OrderStatus.READY]: 'Ihre Bestellung ist bereit zur Abholung',
    [OrderStatus.PICKED_UP]: 'Bestellung abgeholt - Vielen Dank!',
    [OrderStatus.DELIVERED]: 'Bestellung geliefert - Vielen Dank!'
  };
  
  const message = messages[newStatus];
  if (!message) return;
  
  try {
    if (order.customer.deviceToken && order.notifications?.push) {
      const { default: pushServiceModule } = await pushNotificationService();
      await pushServiceModule.sendStatusUpdate(order.customer.deviceToken, {
        orderId,
        orderNumber: order.orderNumber,
        status: newStatus,
        message
      });
    }
  } catch (error) {
    functions.logger.error(`Error sending status update notifications:`, error);
  }
}

/**
 * Update kitchen display system
 */
async function updateKitchenDisplay(
  tenantId: string,
  orderId: string,
  order: Order,
  newStatus: OrderStatus
): Promise<void> {
  try {
    const { default: kitchenDisplayServiceModule } = await kitchenDisplayService();
    
    if (newStatus === OrderStatus.READY || newStatus === OrderStatus.PICKED_UP) {
      await kitchenDisplayServiceModule.removeTicket(tenantId, orderId);
    } else {
      await kitchenDisplayServiceModule.updateTicketStatus(tenantId, orderId, newStatus);
    }
  } catch (error) {
    functions.logger.error(`Error updating kitchen display:`, error);
  }
}

/**
 * Handle payment success
 */
async function handlePaymentSuccess(tenantId: string, orderId: string, order: Order): Promise<void> {
  // Update order status to confirmed if payment was pending
  if (order.status === OrderStatus.PENDING_PAYMENT) {
    await admin.database()
      .ref(`/tenants/${tenantId}/orders/${orderId}`)
      .update({
        status: OrderStatus.CONFIRMED,
        paidAt: admin.database.ServerValue.TIMESTAMP
      });
  }
}

/**
 * Handle payment failure
 */
async function handlePaymentFailure(tenantId: string, orderId: string, order: Order): Promise<void> {
  // Cancel order if payment failed
  await admin.database()
    .ref(`/tenants/${tenantId}/orders/${orderId}`)
    .update({
      status: OrderStatus.CANCELLED,
      cancelReason: 'Payment failed',
      cancelledAt: admin.database.ServerValue.TIMESTAMP
    });
}

/**
 * Handle payment refund
 */
async function handlePaymentRefund(tenantId: string, orderId: string, order: Order): Promise<void> {
  // Update order status to refunded
  await admin.database()
    .ref(`/tenants/${tenantId}/orders/${orderId}`)
    .update({
      status: OrderStatus.REFUNDED,
      refundedAt: admin.database.ServerValue.TIMESTAMP
    });
}