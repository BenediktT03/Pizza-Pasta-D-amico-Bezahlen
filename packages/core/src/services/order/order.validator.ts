import { Order, OrderItem, CreateOrderData } from '@eatech/types';
import { firestoreService } from '../database/firestore.service';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface OrderTotals {
  subtotal: number;
  tax: number;
  total: number;
}

/**
 * Validate order data
 */
export function validateOrder(data: CreateOrderData): ValidationResult {
  const errors: string[] = [];

  // Validate required fields
  if (!data.tenantId) {
    errors.push('Tenant ID is required');
  }

  if (!data.type) {
    errors.push('Order type is required');
  }

  if (!data.items || data.items.length === 0) {
    errors.push('Order must contain at least one item');
  }

  // Validate items
  if (data.items) {
    data.items.forEach((item, index) => {
      if (!item.productId) {
        errors.push(`Item ${index + 1}: Product ID is required`);
      }
      if (!item.name) {
        errors.push(`Item ${index + 1}: Product name is required`);
      }
      if (item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
      }
      if (item.price < 0) {
        errors.push(`Item ${index + 1}: Price cannot be negative`);
      }
    });
  }

  // Validate customer info based on order type
  if (data.type === 'delivery') {
    if (!data.deliveryAddress) {
      errors.push('Delivery address is required for delivery orders');
    }
    if (!data.customerPhone && !data.customerEmail) {
      errors.push('Customer contact (phone or email) is required for delivery orders');
    }
  }

  if (data.type === 'dine-in' && !data.tableNumber) {
    errors.push('Table number is required for dine-in orders');
  }

  // Validate payment info if provided
  if (data.paymentMethod) {
    const validPaymentMethods = ['cash', 'card', 'twint', 'invoice'];
    if (!validPaymentMethods.includes(data.paymentMethod)) {
      errors.push(`Invalid payment method: ${data.paymentMethod}`);
    }
  }

  // Validate scheduling
  if (data.scheduledFor && new Date(data.scheduledFor) < new Date()) {
    errors.push('Scheduled time cannot be in the past');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate order totals
 */
export function calculateOrderTotals(
  items: OrderItem[],
  taxRate: number = 0.077 // Swiss VAT 7.7%
): OrderTotals {
  let subtotal = 0;

  items.forEach(item => {
    const itemTotal = item.price * item.quantity;
    
    // Apply modifiers if any
    if (item.modifiers) {
      item.modifiers.forEach(modifier => {
        if (typeof modifier === 'object' && 'price' in modifier) {
          subtotal += modifier.price * item.quantity;
        }
      });
    }
    
    subtotal += itemTotal;
  });

  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Generate unique order number
 */
export async function generateOrderNumber(tenantId: string): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // Get today's order count for the tenant
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));
  
  const orders = await firestoreService.queryDocuments('orders', {
    where: [
      { field: 'tenantId', operator: '==', value: tenantId },
      { field: 'createdAt', operator: '>=', value: startOfDay },
      { field: 'createdAt', operator: '<=', value: endOfDay },
    ],
  });

  const orderCount = orders.length + 1;
  const orderNumber = `${year}${month}${day}-${String(orderCount).padStart(4, '0')}`;
  
  return orderNumber;
}

/**
 * Validate order status transition
 */
export function isValidStatusTransition(
  currentStatus: Order['status'],
  newStatus: Order['status']
): boolean {
  const validTransitions: Record<Order['status'], Order['status'][]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: [],
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
}

/**
 * Calculate preparation time estimate
 */
export function calculatePreparationTime(items: OrderItem[]): number {
  // Base time in minutes
  let totalTime = 10;

  // Add time based on number of items
  totalTime += items.length * 3;

  // Add time for complex items (this would ideally come from product data)
  items.forEach(item => {
    // Add more time for certain categories or based on item properties
    if (item.category === 'pizza') {
      totalTime += 15;
    } else if (item.category === 'pasta') {
      totalTime += 12;
    } else if (item.category === 'grill') {
      totalTime += 20;
    }
  });

  // Round to nearest 5 minutes
  return Math.ceil(totalTime / 5) * 5;
}

/**
 * Validate delivery address
 */
export function validateDeliveryAddress(address: any): ValidationResult {
  const errors: string[] = [];

  if (!address) {
    errors.push('Delivery address is required');
    return { isValid: false, errors };
  }

  if (!address.street) {
    errors.push('Street address is required');
  }

  if (!address.city) {
    errors.push('City is required');
  }

  if (!address.postalCode) {
    errors.push('Postal code is required');
  } else if (!/^\d{4}$/.test(address.postalCode)) {
    errors.push('Invalid Swiss postal code format');
  }

  // Validate Swiss phone number if provided
  if (address.phone && !/^(\+41|0041|0)[1-9]\d{8}$/.test(address.phone.replace(/\s/g, ''))) {
    errors.push('Invalid Swiss phone number format');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if order can be modified
 */
export function canModifyOrder(order: Order): boolean {
  // Orders can only be modified in certain states
  const modifiableStatuses: Order['status'][] = ['pending', 'confirmed'];
  
  if (!modifiableStatuses.includes(order.status)) {
    return false;
  }

  // Check if order is not too old (e.g., 30 minutes)
  const orderAge = Date.now() - new Date(order.createdAt).getTime();
  const maxAge = 30 * 60 * 1000; // 30 minutes
  
  return orderAge < maxAge;
}

/**
 * Calculate delivery fee
 */
export function calculateDeliveryFee(
  distance: number, // in km
  orderTotal: number
): number {
  // Free delivery for orders above certain amount
  if (orderTotal >= 50) {
    return 0;
  }

  // Base fee
  let fee = 5;

  // Add distance-based fee
  if (distance > 3) {
    fee += Math.ceil((distance - 3) * 2);
  }

  // Max delivery fee
  return Math.min(fee, 15);
}

/**
 * Validate special instructions
 */
export function validateSpecialInstructions(instructions: string): ValidationResult {
  const errors: string[] = [];
  
  if (instructions.length > 500) {
    errors.push('Special instructions must be less than 500 characters');
  }

  // Check for inappropriate content (basic check)
  const inappropriateWords = ['spam', 'test', 'xxx'];
  const lowerInstructions = instructions.toLowerCase();
  
  if (inappropriateWords.some(word => lowerInstructions.includes(word))) {
    errors.push('Special instructions contain inappropriate content');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Merge similar items in order
 */
export function mergeOrderItems(items: OrderItem[]): OrderItem[] {
  const mergedItems = new Map<string, OrderItem>();

  items.forEach(item => {
    // Create unique key based on product and modifiers
    const key = `${item.productId}-${JSON.stringify(item.modifiers || [])}`;
    
    if (mergedItems.has(key)) {
      const existing = mergedItems.get(key)!;
      existing.quantity += item.quantity;
      if (item.notes && existing.notes) {
        existing.notes = `${existing.notes}, ${item.notes}`;
      } else if (item.notes) {
        existing.notes = item.notes;
      }
    } else {
      mergedItems.set(key, { ...item });
    }
  });

  return Array.from(mergedItems.values());
}
