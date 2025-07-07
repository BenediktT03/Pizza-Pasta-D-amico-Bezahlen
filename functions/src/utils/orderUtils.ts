/**
 * EATECH - Order Utility Functions
 * Version: 1.0.0
 * Description: Utility functions for order processing, validation, and calculations
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/utils/orderUtils.ts
 */

import * as admin from 'firebase-admin';
import { 
  Order, 
  OrderStatus, 
  OrderItem, 
  PaymentStatus,
  DeliveryType,
  OrderTotals,
  OrderValidationResult,
  InventoryCheck
} from '../types/order.types';
import { Product, ProductInventory, ProductVariant } from '../types/product.types';
import { Customer } from '../types/customer.types';

// ============================================================================
// ORDER VALIDATION
// ============================================================================

/**
 * Validates an order before processing
 */
export async function validateOrder(order: Order): Promise<OrderValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation
  if (!order.tenantId) errors.push('Tenant ID is required');
  if (!order.customerId && order.customerInfo?.type !== 'guest') {
    errors.push('Customer ID is required for registered customers');
  }
  if (!order.items || order.items.length === 0) errors.push('Order must contain at least one item');

  // Validate items
  for (const item of order.items) {
    const itemErrors = await validateOrderItem(item);
    errors.push(...itemErrors);
  }

  // Validate delivery information
  if (order.deliveryType === DeliveryType.DELIVERY) {
    if (!order.delivery?.address) errors.push('Delivery address is required');
    if (!order.delivery?.scheduledTime) warnings.push('No delivery time specified');
  }

  // Validate payment information
  if (!order.payment?.method) errors.push('Payment method is required');

  // Validate totals
  const calculatedTotals = calculateOrderTotals(order);
  if (Math.abs(calculatedTotals.total - order.totals.total) > 0.01) {
    errors.push('Order total mismatch');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates a single order item
 */
async function validateOrderItem(item: OrderItem): Promise<string[]> {
  const errors: string[] = [];

  if (!item.productId) errors.push(`Item missing product ID`);
  if (!item.quantity || item.quantity <= 0) errors.push(`Invalid quantity for ${item.name}`);
  if (!item.price || item.price < 0) errors.push(`Invalid price for ${item.name}`);

  // Validate modifiers
  if (item.modifiers) {
    for (const modifier of item.modifiers) {
      if (!modifier.id || !modifier.name) {
        errors.push(`Invalid modifier for ${item.name}`);
      }
    }
  }

  return errors;
}

// ============================================================================
// ORDER CALCULATIONS
// ============================================================================

/**
 * Calculates order totals including taxes and discounts
 */
export function calculateOrderTotals(order: Order): OrderTotals {
  let subtotal = 0;
  let itemCount = 0;

  // Calculate items subtotal
  for (const item of order.items) {
    const itemTotal = calculateItemTotal(item);
    subtotal += itemTotal;
    itemCount += item.quantity;
  }

  // Apply discounts
  let discountAmount = 0;
  if (order.discounts && order.discounts.length > 0) {
    discountAmount = calculateDiscounts(subtotal, order.discounts);
  }

  // Calculate after discount
  const afterDiscount = Math.max(0, subtotal - discountAmount);

  // Add delivery fee
  const deliveryFee = order.delivery?.fee || 0;

  // Add service fee
  const serviceFee = calculateServiceFee(afterDiscount, order.tenantId);

  // Calculate tax
  const taxableAmount = afterDiscount + deliveryFee + serviceFee;
  const taxAmount = calculateTax(taxableAmount, order.payment?.taxRate || 7.7);

  // Calculate tip
  const tipAmount = order.payment?.tip || 0;

  // Final total
  const total = taxableAmount + taxAmount + tipAmount;

  return {
    subtotal,
    discounts: discountAmount,
    deliveryFee,
    serviceFee,
    tax: taxAmount,
    tip: tipAmount,
    total,
    itemCount,
    currency: order.currency || 'CHF'
  };
}

/**
 * Calculates total for a single item including modifiers
 */
export function calculateItemTotal(item: OrderItem): number {
  let itemPrice = item.price * item.quantity;

  // Add modifier prices
  if (item.modifiers && item.modifiers.length > 0) {
    for (const modifier of item.modifiers) {
      itemPrice += (modifier.price || 0) * item.quantity;
    }
  }

  // Add addon prices
  if (item.addons && item.addons.length > 0) {
    for (const addon of item.addons) {
      itemPrice += (addon.price || 0) * (addon.quantity || 1);
    }
  }

  return Math.round(itemPrice * 100) / 100;
}

/**
 * Calculates discount amount
 */
function calculateDiscounts(subtotal: number, discounts: any[]): number {
  let totalDiscount = 0;

  for (const discount of discounts) {
    if (discount.type === 'percentage') {
      totalDiscount += subtotal * (discount.value / 100);
    } else if (discount.type === 'fixed') {
      totalDiscount += discount.value;
    }
  }

  return Math.min(totalDiscount, subtotal); // Discount cannot exceed subtotal
}

/**
 * Calculates service fee
 */
function calculateServiceFee(amount: number, tenantId: string): number {
  // TODO: Fetch tenant-specific service fee configuration
  const serviceFeePercentage = 2.5; // Default 2.5%
  return Math.round(amount * (serviceFeePercentage / 100) * 100) / 100;
}

/**
 * Calculates tax amount
 */
function calculateTax(amount: number, taxRate: number): number {
  return Math.round(amount * (taxRate / 100) * 100) / 100;
}

// ============================================================================
// ORDER STATUS MANAGEMENT
// ============================================================================

/**
 * Determines next valid statuses for an order
 */
export function getNextValidStatuses(currentStatus: OrderStatus): OrderStatus[] {
  const statusFlow: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
    [OrderStatus.READY]: [OrderStatus.DELIVERING, OrderStatus.COMPLETED, OrderStatus.CANCELLED],
    [OrderStatus.DELIVERING]: [OrderStatus.COMPLETED, OrderStatus.FAILED],
    [OrderStatus.COMPLETED]: [OrderStatus.REFUNDED],
    [OrderStatus.CANCELLED]: [],
    [OrderStatus.FAILED]: [OrderStatus.REFUNDED],
    [OrderStatus.REFUNDED]: []
  };

  return statusFlow[currentStatus] || [];
}

/**
 * Validates status transition
 */
export function isValidStatusTransition(
  currentStatus: OrderStatus, 
  newStatus: OrderStatus
): boolean {
  const validStatuses = getNextValidStatuses(currentStatus);
  return validStatuses.includes(newStatus);
}

/**
 * Gets estimated preparation time
 */
export function getEstimatedPreparationTime(order: Order): number {
  // Base time in minutes
  let totalTime = 15;

  // Add time based on items
  for (const item of order.items) {
    // TODO: Fetch actual preparation time from product data
    totalTime += 5 * item.quantity;
  }

  // Add buffer for busy times
  const currentHour = new Date().getHours();
  if (currentHour >= 11 && currentHour <= 14) {
    totalTime *= 1.5; // Lunch rush
  } else if (currentHour >= 17 && currentHour <= 20) {
    totalTime *= 1.3; // Dinner rush
  }

  return Math.ceil(totalTime);
}

// ============================================================================
// ORDER FORMATTING
// ============================================================================

/**
 * Generates order number
 */
export function generateOrderNumber(tenantId: string): string {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${dateStr}-${random}`;
}

/**
 * Formats order for display
 */
export function formatOrderForDisplay(order: Order): any {
  return {
    orderNumber: order.orderNumber,
    status: formatStatus(order.status),
    items: order.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: formatPrice(item.price),
      modifiers: item.modifiers?.map(m => m.name).join(', '),
      total: formatPrice(calculateItemTotal(item))
    })),
    totals: {
      subtotal: formatPrice(order.totals.subtotal),
      discounts: order.totals.discounts > 0 ? formatPrice(order.totals.discounts) : null,
      deliveryFee: order.totals.deliveryFee > 0 ? formatPrice(order.totals.deliveryFee) : null,
      serviceFee: order.totals.serviceFee > 0 ? formatPrice(order.totals.serviceFee) : null,
      tax: formatPrice(order.totals.tax),
      tip: order.totals.tip > 0 ? formatPrice(order.totals.tip) : null,
      total: formatPrice(order.totals.total)
    },
    customer: order.customerInfo,
    delivery: order.delivery,
    createdAt: formatDateTime(order.createdAt),
    estimatedTime: order.estimatedCompletionTime ? formatDateTime(order.estimatedCompletionTime) : null
  };
}

/**
 * Formats price for display
 */
function formatPrice(amount: number, currency: string = 'CHF'): string {
  return `${currency} ${amount.toFixed(2)}`;
}

/**
 * Formats status for display
 */
function formatStatus(status: OrderStatus): string {
  const statusLabels: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]: 'Ausstehend',
    [OrderStatus.CONFIRMED]: 'Bestätigt',
    [OrderStatus.PREPARING]: 'In Zubereitung',
    [OrderStatus.READY]: 'Bereit',
    [OrderStatus.DELIVERING]: 'In Lieferung',
    [OrderStatus.COMPLETED]: 'Abgeschlossen',
    [OrderStatus.CANCELLED]: 'Storniert',
    [OrderStatus.FAILED]: 'Fehlgeschlagen',
    [OrderStatus.REFUNDED]: 'Erstattet'
  };

  return statusLabels[status] || status;
}

/**
 * Formats date/time for display
 */
function formatDateTime(date: Date | FirebaseFirestore.Timestamp): string {
  const d = date instanceof Date ? date : date.toDate();
  return d.toLocaleString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ============================================================================
// INVENTORY MANAGEMENT
// ============================================================================

/**
 * Checks inventory availability for order items
 */
export async function checkInventoryAvailability(
  order: Order,
  products: Map<string, Product>
): Promise<InventoryCheck> {
  const unavailableItems: string[] = [];
  const lowStockItems: string[] = [];
  const updates: Map<string, number> = new Map();

  for (const item of order.items) {
    const product = products.get(item.productId);
    if (!product) {
      unavailableItems.push(item.name);
      continue;
    }

    if (!product.inventory.trackInventory || product.inventory.infiniteStock) {
      continue;
    }

    const requiredQuantity = item.quantity;
    const availableQuantity = product.inventory.availableQuantity;

    if (availableQuantity < requiredQuantity) {
      unavailableItems.push(item.name);
    } else {
      // Track quantity to update
      const currentUpdate = updates.get(item.productId) || 0;
      updates.set(item.productId, currentUpdate + requiredQuantity);

      // Check if low stock after this order
      const remainingQuantity = availableQuantity - (currentUpdate + requiredQuantity);
      if (product.inventory.lowStockThreshold && 
          remainingQuantity <= product.inventory.lowStockThreshold) {
        lowStockItems.push(item.name);
      }
    }
  }

  return {
    available: unavailableItems.length === 0,
    unavailableItems,
    lowStockItems,
    updates: Array.from(updates.entries()).map(([productId, quantity]) => ({
      productId,
      quantity
    }))
  };
}

/**
 * Reserves inventory for an order
 */
export async function reserveInventory(
  orderId: string,
  items: OrderItem[],
  tenantId: string
): Promise<void> {
  const db = admin.firestore();
  const batch = db.batch();

  for (const item of items) {
    const productRef = db.collection('tenants').doc(tenantId)
      .collection('products').doc(item.productId);

    // Reserve inventory
    batch.update(productRef, {
      'inventory.reservedQuantity': admin.firestore.FieldValue.increment(item.quantity),
      'inventory.availableQuantity': admin.firestore.FieldValue.increment(-item.quantity)
    });

    // Log reservation
    const reservationRef = db.collection('tenants').doc(tenantId)
      .collection('inventoryReservations').doc();
    
    batch.set(reservationRef, {
      orderId,
      productId: item.productId,
      quantity: item.quantity,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      )
    });
  }

  await batch.commit();
}

/**
 * Releases reserved inventory
 */
export async function releaseInventory(
  orderId: string,
  tenantId: string
): Promise<void> {
  const db = admin.firestore();
  const batch = db.batch();

  // Get all reservations for this order
  const reservations = await db.collection('tenants').doc(tenantId)
    .collection('inventoryReservations')
    .where('orderId', '==', orderId)
    .get();

  for (const doc of reservations.docs) {
    const reservation = doc.data();
    
    // Update product inventory
    const productRef = db.collection('tenants').doc(tenantId)
      .collection('products').doc(reservation.productId);
    
    batch.update(productRef, {
      'inventory.reservedQuantity': admin.firestore.FieldValue.increment(-reservation.quantity),
      'inventory.availableQuantity': admin.firestore.FieldValue.increment(reservation.quantity)
    });

    // Delete reservation
    batch.delete(doc.ref);
  }

  await batch.commit();
}

// ============================================================================
// ORDER ANALYTICS
// ============================================================================

/**
 * Extracts analytics data from order
 */
export function extractOrderAnalytics(order: Order): any {
  const metrics = {
    orderId: order.id,
    tenantId: order.tenantId,
    timestamp: order.createdAt,
    dayOfWeek: new Date(order.createdAt).getDay(),
    hour: new Date(order.createdAt).getHours(),
    
    // Customer metrics
    customerId: order.customerId,
    customerType: order.customerInfo?.type || 'guest',
    isNewCustomer: order.customerInfo?.isFirstOrder || false,
    
    // Order metrics
    orderValue: order.totals.total,
    itemCount: order.totals.itemCount,
    averageItemValue: order.totals.total / order.totals.itemCount,
    
    // Product metrics
    products: order.items.map(item => ({
      productId: item.productId,
      category: item.category,
      quantity: item.quantity,
      revenue: calculateItemTotal(item)
    })),
    
    // Delivery metrics
    deliveryType: order.deliveryType,
    deliveryFee: order.totals.deliveryFee,
    deliveryTime: order.delivery?.actualDeliveryTime ? 
      (new Date(order.delivery.actualDeliveryTime).getTime() - 
       new Date(order.createdAt).getTime()) / 60000 : null, // in minutes
    
    // Payment metrics
    paymentMethod: order.payment?.method,
    paymentStatus: order.payment?.status,
    hasDiscount: order.totals.discounts > 0,
    discountAmount: order.totals.discounts,
    hasTip: order.totals.tip > 0,
    tipAmount: order.totals.tip,
    tipPercentage: order.totals.tip > 0 ? 
      (order.totals.tip / order.totals.subtotal) * 100 : 0,
    
    // Status metrics
    status: order.status,
    completionTime: order.completedAt ? 
      (new Date(order.completedAt).getTime() - 
       new Date(order.createdAt).getTime()) / 60000 : null, // in minutes
    
    // Channel metrics
    channel: order.channel || 'unknown',
    deviceType: order.metadata?.deviceType || 'unknown'
  };

  return metrics;
}

// ============================================================================
// ORDER NOTIFICATIONS
// ============================================================================

/**
 * Determines which notifications to send for order status change
 */
export function getNotificationsForStatusChange(
  oldStatus: OrderStatus,
  newStatus: OrderStatus
): string[] {
  const notifications: string[] = [];

  // Customer notifications
  switch (newStatus) {
    case OrderStatus.CONFIRMED:
      notifications.push('customer_order_confirmed');
      break;
    case OrderStatus.PREPARING:
      notifications.push('customer_order_preparing');
      break;
    case OrderStatus.READY:
      notifications.push('customer_order_ready');
      break;
    case OrderStatus.DELIVERING:
      notifications.push('customer_order_delivering');
      break;
    case OrderStatus.COMPLETED:
      notifications.push('customer_order_completed');
      break;
    case OrderStatus.CANCELLED:
      notifications.push('customer_order_cancelled');
      break;
    case OrderStatus.REFUNDED:
      notifications.push('customer_order_refunded');
      break;
  }

  // Staff notifications
  if (newStatus === OrderStatus.PENDING) {
    notifications.push('staff_new_order');
  }
  if (oldStatus === OrderStatus.READY && newStatus === OrderStatus.DELIVERING) {
    notifications.push('driver_order_ready');
  }

  return notifications;
}

// ============================================================================
// ORDER EXPORT
// ============================================================================

/**
 * Formats order for export
 */
export function formatOrderForExport(order: Order): any {
  return {
    'Order Number': order.orderNumber,
    'Date': formatDateTime(order.createdAt),
    'Status': formatStatus(order.status),
    'Customer Name': order.customerInfo?.name || 'Guest',
    'Customer Email': order.customerInfo?.email || '',
    'Customer Phone': order.customerInfo?.phone || '',
    'Delivery Type': order.deliveryType,
    'Payment Method': order.payment?.method || '',
    'Subtotal': order.totals.subtotal,
    'Discounts': order.totals.discounts,
    'Delivery Fee': order.totals.deliveryFee,
    'Service Fee': order.totals.serviceFee,
    'Tax': order.totals.tax,
    'Tip': order.totals.tip,
    'Total': order.totals.total,
    'Items': order.items.map(item => 
      `${item.quantity}x ${item.name} (${formatPrice(calculateItemTotal(item))})`
    ).join('; ')
  };
}