/**
 * Firestore triggers for order events
 * Handles order creation, updates, and status changes
 */

import { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import * as sgMail from '@sendgrid/mail';
import { Timestamp } from 'firebase-admin/firestore';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

// Trigger when a new order is created
export const onOrderCreated = onDocumentCreated({
  document: 'tenants/{tenantId}/orders/{orderId}',
  region: 'europe-west6',
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log('No data associated with the event');
    return;
  }

  const data = snapshot.data();
  const { tenantId, orderId } = event.params;

  console.log(`New order created: ${orderId} for tenant: ${tenantId}`);

  try {
    // 1. Send order confirmation email to customer
    await sendOrderConfirmation(tenantId, orderId, data);

    // 2. Notify restaurant staff
    await notifyRestaurantStaff(tenantId, orderId, data);

    // 3. Update inventory if enabled
    await updateInventory(tenantId, data);

    // 4. Create analytics event
    await trackOrderCreated(tenantId, orderId, data);

    // 5. Check for fraud/suspicious activity
    await checkFraudDetection(tenantId, orderId, data);

    // 6. Apply loyalty points if applicable
    await applyLoyaltyPoints(tenantId, data);

    // 7. Send to kitchen display system
    await sendToKitchenDisplay(tenantId, orderId, data);

    // 8. Initialize order timers
    await initializeOrderTimers(tenantId, orderId);

  } catch (error) {
    console.error('Error processing order creation:', error);
    
    // Update order with error status
    await snapshot.ref.update({
      processingError: error.message,
      processingErrorAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
});

// Trigger when an order is updated
export const onOrderUpdated = onDocumentUpdated({
  document: 'tenants/{tenantId}/orders/{orderId}',
  region: 'europe-west6',
}, async (event) => {
  const { before, after } = event.data;
  if (!before || !after) {
    console.log('No data associated with the event');
    return;
  }

  const beforeData = before.data();
  const afterData = after.data();
  const { tenantId, orderId } = event.params;

  console.log(`Order updated: ${orderId} for tenant: ${tenantId}`);

  // Check what changed
  const changes = detectChanges(beforeData, afterData);

  if (changes.statusChanged) {
    await handleStatusChange(tenantId, orderId, beforeData.status, afterData.status, afterData);
  }

  if (changes.itemsChanged) {
    await handleItemsChange(tenantId, orderId, beforeData.items, afterData.items);
  }

  if (changes.paymentChanged) {
    await handlePaymentChange(tenantId, orderId, beforeData.payment, afterData.payment);
  }

  // Update modified timestamp
  if (!afterData.updatedAt || afterData.updatedAt.toMillis() < Date.now() - 1000) {
    await after.ref.update({
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
});

// Specific trigger for order status changes
export const onOrderStatusChanged = onDocumentUpdated({
  document: 'tenants/{tenantId}/orders/{orderId}',
  region: 'europe-west6',
}, async (event) => {
  const { before, after } = event.data;
  if (!before || !after) return;

  const beforeStatus = before.data().status;
  const afterStatus = after.data().status;

  if (beforeStatus === afterStatus) return;

  const { tenantId, orderId } = event.params;
  const orderData = after.data();

  console.log(`Order status changed from ${beforeStatus} to ${afterStatus}`);

  // Status-specific actions
  switch (afterStatus) {
    case 'confirmed':
      await onOrderConfirmed(tenantId, orderId, orderData);
      break;

    case 'preparing':
      await onOrderPreparing(tenantId, orderId, orderData);
      break;

    case 'ready':
      await onOrderReady(tenantId, orderId, orderData);
      break;

    case 'delivered':
      await onOrderDelivered(tenantId, orderId, orderData);
      break;

    case 'completed':
      await onOrderCompleted(tenantId, orderId, orderData);
      break;

    case 'canceled':
      await onOrderCanceled(tenantId, orderId, orderData, beforeStatus);
      break;

    case 'refunded':
      await onOrderRefunded(tenantId, orderId, orderData);
      break;
  }

  // Log status transition
  await logStatusTransition(tenantId, orderId, beforeStatus, afterStatus);
});

// Helper Functions

async function sendOrderConfirmation(tenantId: string, orderId: string, orderData: any) {
  if (!orderData.customerEmail) return;

  const tenant = await admin.firestore()
    .collection('tenants')
    .doc(tenantId)
    .get();

  const tenantData = tenant.data();
  if (!tenantData) return;

  const msg = {
    to: orderData.customerEmail,
    from: {
      email: tenantData.email || 'noreply@eatech.ch',
      name: tenantData.name,
    },
    templateId: 'd-1234567890abcdef', // SendGrid template ID
    dynamicTemplateData: {
      orderNumber: orderData.orderNumber || orderId.slice(-6).toUpperCase(),
      customerName: orderData.customerName,
      restaurantName: tenantData.name,
      items: orderData.items,
      total: orderData.total,
      estimatedTime: orderData.estimatedDeliveryTime || '30-45 minutes',
      orderType: orderData.type,
      deliveryAddress: orderData.deliveryAddress,
    },
  };

  try {
    await sgMail.send(msg);
    console.log(`Order confirmation email sent to ${orderData.customerEmail}`);
  } catch (error) {
    console.error('Failed to send order confirmation:', error);
  }
}

async function notifyRestaurantStaff(tenantId: string, orderId: string, orderData: any) {
  // Get all staff members who should be notified
  const staffSnapshot = await admin.firestore()
    .collection('tenants')
    .doc(tenantId)
    .collection('staff')
    .where('notifications.newOrders', '==', true)
    .where('active', '==', true)
    .get();

  const notifications = staffSnapshot.docs.map(doc => {
    const staff = doc.data();
    return {
      token: staff.fcmToken,
      staffId: doc.id,
      email: staff.email,
      phone: staff.phone,
    };
  });

  // Send push notifications
  const pushPromises = notifications
    .filter(n => n.token)
    .map(n => 
      admin.messaging().send({
        token: n.token,
        notification: {
          title: 'Neue Bestellung',
          body: `Bestellung #${orderData.orderNumber || orderId.slice(-6)} - ${orderData.type}`,
        },
        data: {
          orderId,
          tenantId,
          type: 'new_order',
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      })
    );

  // Send SMS for urgent orders
  if (orderData.priority === 'urgent' || orderData.type === 'catering') {
    // TODO: Implement SMS notifications via Twilio
  }

  await Promise.allSettled(pushPromises);
}

async function updateInventory(tenantId: string, orderData: any) {
  const tenant = await admin.firestore()
    .collection('tenants')
    .doc(tenantId)
    .get();

  if (!tenant.data()?.features?.inventoryTracking) return;

  const batch = admin.firestore().batch();

  for (const item of orderData.items) {
    if (!item.productId) continue;

    const productRef = admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('products')
      .doc(item.productId);

    const product = await productRef.get();
    if (!product.exists) continue;

    const productData = product.data();
    if (productData?.trackInventory && productData.inventory !== undefined) {
      const newInventory = Math.max(0, productData.inventory - (item.quantity || 1));
      
      batch.update(productRef, {
        inventory: newInventory,
        lastInventoryUpdate: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Check for low inventory alert
      if (newInventory <= (productData.lowInventoryThreshold || 10)) {
        await createInventoryAlert(tenantId, item.productId, productData.name, newInventory);
      }
    }
  }

  await batch.commit();
}

async function trackOrderCreated(tenantId: string, orderId: string, orderData: any) {
  await admin.firestore()
    .collection('analytics')
    .doc('orders')
    .collection('events')
    .add({
      type: 'order_created',
      tenantId,
      orderId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      data: {
        orderType: orderData.type,
        total: orderData.total,
        itemCount: orderData.items?.length || 0,
        paymentMethod: orderData.payment?.method,
        source: orderData.source || 'web',
        customerType: orderData.customerId ? 'registered' : 'guest',
      },
    });
}

async function checkFraudDetection(tenantId: string, orderId: string, orderData: any) {
  const riskFactors = [];

  // Check for unusual order amount
  if (orderData.total > 500) {
    riskFactors.push('high_order_value');
  }

  // Check for rapid consecutive orders
  if (orderData.customerEmail || orderData.customerPhone) {
    const recentOrders = await admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('orders')
      .where('customerEmail', '==', orderData.customerEmail)
      .where('createdAt', '>', new Date(Date.now() - 3600000)) // Last hour
      .get();

    if (recentOrders.size > 3) {
      riskFactors.push('rapid_orders');
    }
  }

  // Check for mismatched location data
  if (orderData.ipAddress && orderData.deliveryAddress) {
    // TODO: Implement IP geolocation check
  }

  if (riskFactors.length > 0) {
    await admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('orders')
      .doc(orderId)
      .update({
        riskFactors,
        requiresReview: true,
      });

    // Notify admin
    console.warn(`Order ${orderId} flagged for review:`, riskFactors);
  }
}

async function applyLoyaltyPoints(tenantId: string, orderData: any) {
  if (!orderData.customerId) return;

  const tenant = await admin.firestore()
    .collection('tenants')
    .doc(tenantId)
    .get();

  if (!tenant.data()?.features?.loyaltyProgram) return;

  const pointsEarned = Math.floor(orderData.total * (tenant.data().loyaltyPointsRate || 0.1));

  await admin.firestore()
    .collection('tenants')
    .doc(tenantId)
    .collection('customers')
    .doc(orderData.customerId)
    .update({
      loyaltyPoints: admin.firestore.FieldValue.increment(pointsEarned),
      totalSpent: admin.firestore.FieldValue.increment(orderData.total),
      lastOrderAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  console.log(`Applied ${pointsEarned} loyalty points to customer ${orderData.customerId}`);
}

async function sendToKitchenDisplay(tenantId: string, orderId: string, orderData: any) {
  // Send to real-time database for kitchen display
  await admin.database()
    .ref(`kitchenDisplay/${tenantId}/orders/${orderId}`)
    .set({
      ...orderData,
      displayPriority: calculateDisplayPriority(orderData),
      createdAt: Date.now(),
    });
}

async function initializeOrderTimers(tenantId: string, orderId: string) {
  await admin.firestore()
    .collection('tenants')
    .doc(tenantId)
    .collection('orders')
    .doc(orderId)
    .update({
      timers: {
        created: admin.firestore.FieldValue.serverTimestamp(),
        confirmed: null,
        preparing: null,
        ready: null,
        delivered: null,
        completed: null,
      },
    });
}

function detectChanges(before: any, after: any) {
  return {
    statusChanged: before.status !== after.status,
    itemsChanged: JSON.stringify(before.items) !== JSON.stringify(after.items),
    paymentChanged: JSON.stringify(before.payment) !== JSON.stringify(after.payment),
    totalChanged: before.total !== after.total,
    customerChanged: before.customerId !== after.customerId,
  };
}

async function handleStatusChange(
  tenantId: string,
  orderId: string,
  oldStatus: string,
  newStatus: string,
  orderData: any
) {
  // Validate status transition
  const validTransitions: Record<string, string[]> = {
    pending: ['confirmed', 'canceled'],
    confirmed: ['preparing', 'canceled'],
    preparing: ['ready', 'canceled'],
    ready: ['delivered', 'completed', 'canceled'],
    delivered: ['completed'],
    completed: ['refunded'],
    canceled: ['refunded'],
  };

  if (!validTransitions[oldStatus]?.includes(newStatus)) {
    console.error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
    return;
  }

  // Update status timestamp
  await admin.firestore()
    .collection('tenants')
    .doc(tenantId)
    .collection('orders')
    .doc(orderId)
    .update({
      [`timers.${newStatus}`]: admin.firestore.FieldValue.serverTimestamp(),
      statusHistory: admin.firestore.FieldValue.arrayUnion({
        from: oldStatus,
        to: newStatus,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: orderData.updatedBy || 'system',
      }),
    });
}

async function handleItemsChange(
  tenantId: string,
  orderId: string,
  oldItems: any[],
  newItems: any[]
) {
  // Calculate changes
  const removedItems = oldItems.filter(old => 
    !newItems.find(item => item.productId === old.productId)
  );
  
  const addedItems = newItems.filter(item => 
    !oldItems.find(old => old.productId === item.productId)
  );

  // Update inventory for changes
  if (removedItems.length > 0) {
    // Return items to inventory
    for (const item of removedItems) {
      await adjustInventory(tenantId, item.productId, item.quantity);
    }
  }

  if (addedItems.length > 0) {
    // Deduct items from inventory
    for (const item of addedItems) {
      await adjustInventory(tenantId, item.productId, -item.quantity);
    }
  }
}

async function handlePaymentChange(
  tenantId: string,
  orderId: string,
  oldPayment: any,
  newPayment: any
) {
  if (newPayment?.status === 'succeeded' && oldPayment?.status !== 'succeeded') {
    // Payment successful
    console.log(`Payment successful for order ${orderId}`);
    
    // Send payment confirmation
    // TODO: Implement payment confirmation email
  } else if (newPayment?.status === 'failed' && oldPayment?.status !== 'failed') {
    // Payment failed
    console.error(`Payment failed for order ${orderId}`);
    
    // Send payment failure notification
    // TODO: Implement payment failure handling
  }
}

// Status-specific handlers

async function onOrderConfirmed(tenantId: string, orderId: string, orderData: any) {
  console.log(`Order ${orderId} confirmed`);
  
  // Start preparation timer
  const estimatedPrepTime = calculateEstimatedPrepTime(orderData);
  
  await admin.firestore()
    .collection('tenants')
    .doc(tenantId)
    .collection('orders')
    .doc(orderId)
    .update({
      estimatedReadyTime: new Date(Date.now() + estimatedPrepTime * 60000),
    });
}

async function onOrderPreparing(tenantId: string, orderId: string, orderData: any) {
  console.log(`Order ${orderId} is being prepared`);
  
  // Notify customer that order is being prepared
  if (orderData.customerPhone) {
    // TODO: Send SMS notification
  }
}

async function onOrderReady(tenantId: string, orderId: string, orderData: any) {
  console.log(`Order ${orderId} is ready`);
  
  // Notify customer/driver
  if (orderData.type === 'pickup') {
    // Send pickup ready notification
    await sendPickupReadyNotification(tenantId, orderId, orderData);
  } else if (orderData.type === 'delivery') {
    // Notify delivery driver
    await notifyDeliveryDriver(tenantId, orderId, orderData);
  }
}

async function onOrderDelivered(tenantId: string, orderId: string, orderData: any) {
  console.log(`Order ${orderId} delivered`);
  
  // Request feedback
  setTimeout(async () => {
    await sendFeedbackRequest(tenantId, orderId, orderData);
  }, 3600000); // 1 hour delay
}

async function onOrderCompleted(tenantId: string, orderId: string, orderData: any) {
  console.log(`Order ${orderId} completed`);
  
  // Calculate metrics
  const metrics = await calculateOrderMetrics(tenantId, orderId, orderData);
  
  await admin.firestore()
    .collection('tenants')
    .doc(tenantId)
    .collection('orders')
    .doc(orderId)
    .update({
      metrics,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

async function onOrderCanceled(
  tenantId: string,
  orderId: string,
  orderData: any,
  previousStatus: string
) {
  console.log(`Order ${orderId} canceled from status ${previousStatus}`);
  
  // Return items to inventory
  await returnItemsToInventory(tenantId, orderData.items);
  
  // Process refund if payment was made
  if (orderData.payment?.status === 'succeeded') {
    await processRefund(tenantId, orderId, orderData);
  }
  
  // Send cancellation notification
  await sendCancellationNotification(tenantId, orderId, orderData);
}

async function onOrderRefunded(tenantId: string, orderId: string, orderData: any) {
  console.log(`Order ${orderId} refunded`);
  
  // Log refund in accounting
  await logRefund(tenantId, orderId, orderData);
}

// Utility functions

function calculateDisplayPriority(orderData: any): number {
  let priority = 0;
  
  if (orderData.priority === 'urgent') priority += 100;
  if (orderData.type === 'delivery') priority += 10;
  if (orderData.scheduledFor) {
    const scheduledTime = orderData.scheduledFor.toDate();
    const minutesUntil = (scheduledTime.getTime() - Date.now()) / 60000;
    if (minutesUntil < 30) priority += 50;
  }
  
  return priority;
}

function calculateEstimatedPrepTime(orderData: any): number {
  // Base time in minutes
  let prepTime = 15;
  
  // Add time based on items
  const itemCount = orderData.items?.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) || 0;
  prepTime += itemCount * 2;
  
  // Add time for special preparations
  if (orderData.specialInstructions) {
    prepTime += 5;
  }
  
  // Cap at 60 minutes
  return Math.min(prepTime, 60);
}

async function adjustInventory(tenantId: string, productId: string, quantity: number) {
  await admin.firestore()
    .collection('tenants')
    .doc(tenantId)
    .collection('products')
    .doc(productId)
    .update({
      inventory: admin.firestore.FieldValue.increment(quantity),
    });
}

async function createInventoryAlert(
  tenantId: string,
  productId: string,
  productName: string,
  currentInventory: number
) {
  await admin.firestore()
    .collection('tenants')
    .doc(tenantId)
    .collection('alerts')
    .add({
      type: 'low_inventory',
      productId,
      productName,
      currentInventory,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      resolved: false,
    });
}

async function logStatusTransition(
  tenantId: string,
  orderId: string,
  fromStatus: string,
  toStatus: string
) {
  await admin.firestore()
    .collection('analytics')
    .doc('orders')
    .collection('statusTransitions')
    .add({
      tenantId,
      orderId,
      fromStatus,
      toStatus,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
}

async function sendPickupReadyNotification(
  tenantId: string,
  orderId: string,
  orderData: any
) {
  // Implementation for pickup ready notification
  console.log(`Sending pickup ready notification for order ${orderId}`);
}

async function notifyDeliveryDriver(tenantId: string, orderId: string, orderData: any) {
  // Implementation for driver notification
  console.log(`Notifying delivery driver for order ${orderId}`);
}

async function sendFeedbackRequest(tenantId: string, orderId: string, orderData: any) {
  // Implementation for feedback request
  console.log(`Sending feedback request for order ${orderId}`);
}

async function calculateOrderMetrics(
  tenantId: string,
  orderId: string,
  orderData: any
) {
  const timers = orderData.timers || {};
  const metrics: any = {};
  
  if (timers.created && timers.confirmed) {
    metrics.confirmationTime = timers.confirmed.toMillis() - timers.created.toMillis();
  }
  
  if (timers.confirmed && timers.ready) {
    metrics.preparationTime = timers.ready.toMillis() - timers.confirmed.toMillis();
  }
  
  if (timers.created && timers.completed) {
    metrics.totalTime = timers.completed.toMillis() - timers.created.toMillis();
  }
  
  return metrics;
}

async function returnItemsToInventory(tenantId: string, items: any[]) {
  for (const item of items || []) {
    if (item.productId && item.quantity) {
      await adjustInventory(tenantId, item.productId, item.quantity);
    }
  }
}

async function processRefund(tenantId: string, orderId: string, orderData: any) {
  // Implementation for refund processing
  console.log(`Processing refund for order ${orderId}`);
}

async function sendCancellationNotification(
  tenantId: string,
  orderId: string,
  orderData: any
) {
  // Implementation for cancellation notification
  console.log(`Sending cancellation notification for order ${orderId}`);
}

async function logRefund(tenantId: string, orderId: string, orderData: any) {
  await admin.firestore()
    .collection('tenants')
    .doc(tenantId)
    .collection('accounting')
    .doc('refunds')
    .collection('entries')
    .add({
      orderId,
      amount: orderData.refund?.amount || orderData.total,
      reason: orderData.refund?.reason,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
}
