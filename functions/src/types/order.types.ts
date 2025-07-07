/**
 * EATECH Firebase Functions - Order Types
 * Version: 1.0.0
 * 
 * Type definitions for order-related data structures
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/types/order.types.ts
 */

import * as admin from 'firebase-admin';

// ============================================================================
// ORDER TYPES
// ============================================================================

export type OrderStatus = 
  | 'new'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'in_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'scheduled'
  | 'error'
  | 'payment_failed';

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partial_refund'
  | 'cancelled';

export type OrderType = 
  | 'pickup'
  | 'delivery'
  | 'dine_in'
  | 'drive_thru';

export type DeliveryStatus =
  | 'pending'
  | 'assigned'
  | 'picking_up'
  | 'in_transit'
  | 'delivered'
  | 'failed';

export type RefundStatus =
  | 'none'
  | 'requested'
  | 'approved'
  | 'processing'
  | 'completed'
  | 'failed';

// ============================================================================
// CUSTOMER TYPES
// ============================================================================

export interface Customer {
  name: string;
  email: string;
  phone: string;
  notifications?: {
    email: boolean;
    sms: boolean;
    push?: boolean;
  };
}

export interface DeliveryAddress {
  street: string;
  houseNumber: string;
  apartment?: string;
  postalCode: string;
  city: string;
  country?: string;
  instructions?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// ============================================================================
// PRODUCT TYPES
// ============================================================================

export interface OrderItemOption {
  id: string;
  name: string;
  choice: string;
  price: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  description?: string;
  price: number;
  basePrice: number;
  quantity: number;
  options?: OrderItemOption[];
  notes?: string;
  image?: string;
  category?: string;
}

// ============================================================================
// DISCOUNT TYPES
// ============================================================================

export interface Discount {
  id: string;
  type: 'percentage' | 'fixed' | 'voucher';
  code?: string;
  value: number;
  description?: string;
  appliedTo?: 'order' | 'delivery' | 'items';
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================

export interface PaymentMethod {
  type: 'card' | 'cash' | 'twint' | 'paypal' | 'invoice';
  provider?: 'stripe' | 'twint' | 'paypal';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

export interface PaymentDetails {
  paymentId: string;
  provider: string;
  method: PaymentMethod;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: admin.firestore.Timestamp;
  metadata?: Record<string, any>;
}

// ============================================================================
// DELIVERY TYPES
// ============================================================================

export interface DeliveryInfo {
  provider?: 'internal' | 'uber' | 'justeat' | 'deliveroo';
  deliveryId?: string;
  courier?: {
    name: string;
    phone?: string;
    photo?: string;
    vehicle?: string;
  };
  status: DeliveryStatus;
  estimatedTime?: Date;
  actualTime?: Date;
  trackingUrl?: string;
  fee: number;
  tip?: number;
  distance?: number;
  duration?: number;
  route?: {
    start: DeliveryAddress;
    end: DeliveryAddress;
    waypoints?: DeliveryAddress[];
  };
}

// ============================================================================
// MAIN ORDER TYPE
// ============================================================================

export interface Order {
  // Identifiers
  id: string;
  orderNumber: string;
  tenantId: string;
  userId?: string;
  
  // Customer info
  customer: Customer;
  
  // Order details
  items: OrderItem[];
  orderType: OrderType;
  scheduledTime?: Date | admin.firestore.Timestamp;
  notes?: string;
  
  // Pricing
  subtotal: number;
  tax: number;
  taxRate?: number;
  deliveryFee?: number;
  serviceFee?: number;
  tip?: number;
  discounts?: Discount[];
  total: number;
  currency: string;
  
  // Payment
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  paymentDetails?: PaymentDetails;
  
  // Status
  status: OrderStatus;
  statusHistory?: Record<string, admin.firestore.Timestamp>;
  
  // Delivery (if applicable)
  deliveryAddress?: DeliveryAddress;
  deliveryInfo?: DeliveryInfo;
  
  // Kitchen & preparation
  preparationTime?: number; // minutes
  estimatedReadyTime?: Date | admin.firestore.Timestamp;
  actualReadyTime?: Date | admin.firestore.Timestamp;
  kitchenNotes?: string;
  priority?: 'normal' | 'high' | 'urgent';
  
  // Refund (if applicable)
  refundStatus?: RefundStatus;
  refundAmount?: number;
  refundId?: string;
  refundReason?: string;
  refundedAt?: admin.firestore.Timestamp;
  
  // Loyalty
  loyaltyPointsAwarded?: number;
  loyaltyPointsUsed?: number;
  
  // Cancellation
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: admin.firestore.Timestamp;
  
  // Timestamps
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
  confirmedAt?: admin.firestore.Timestamp;
  preparingAt?: admin.firestore.Timestamp;
  readyAt?: admin.firestore.Timestamp;
  deliveredAt?: admin.firestore.Timestamp;
  completedAt?: admin.firestore.Timestamp;
  
  // Metadata
  metadata?: {
    source: 'web' | 'mobile' | 'pos' | 'phone' | 'api';
    platform?: string;
    version?: string;
    userAgent?: string;
    ip?: string;
    sessionId?: string;
  };
  
  // Reviews
  reviewed?: boolean;
  reviewId?: string;
  
  // Error handling
  error?: string;
  errorDetails?: any;
  
  // Archival
  archived?: boolean;
  archivedAt?: admin.firestore.Timestamp;
}

// ============================================================================
// INVENTORY TYPES
// ============================================================================

export interface InventoryItem {
  productId: string;
  name: string;
  sku?: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  unit: string;
  lowStockThreshold: number;
  outOfStockThreshold: number;
  restockAmount?: number;
  supplier?: string;
  lastRestocked?: admin.firestore.Timestamp;
  expiryDate?: Date;
}

export interface InventoryUpdate {
  productId: string;
  quantity: number;
  type: 'increment' | 'decrement' | 'set';
  reason: string;
  performedBy: string;
  timestamp: admin.firestore.Timestamp;
  previousStock?: number;
  newStock?: number;
  orderId?: string;
  notes?: string;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface OrderAnalytics {
  orderId: string;
  tenantId: string;
  revenue: number;
  profit?: number;
  preparationTime: number;
  deliveryTime?: number;
  customerSatisfaction?: number;
  dayOfWeek: number;
  hourOfDay: number;
  isRepeatCustomer: boolean;
  itemCount: number;
  categories: string[];
  paymentMethod: string;
  orderType: OrderType;
  weatherConditions?: string;
  specialEvents?: string[];
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface OrderNotification {
  orderId: string;
  type: 'order_confirmed' | 'order_preparing' | 'order_ready' | 'order_delivered' | 'order_cancelled';
  recipient: 'customer' | 'staff' | 'kitchen' | 'delivery';
  channel: 'email' | 'sms' | 'push' | 'in_app';
  status: 'pending' | 'sent' | 'failed';
  sentAt?: admin.firestore.Timestamp;
  error?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface OrderTotals {
  subtotal: number;
  tax: number;
  total: number;
  savings?: number;
}

export interface OrderFilters {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  orderType?: OrderType;
  dateFrom?: Date;
  dateTo?: Date;
  customerId?: string;
  minTotal?: number;
  maxTotal?: number;
  search?: string;
}

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<OrderStatus, number>;
  ordersByType: Record<OrderType, number>;
  topProducts: Array<{
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  peakHours: Array<{
    hour: number;
    orders: number;
  }>;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface OrderEvent {
  orderId: string;
  eventType: string;
  description: string;
  performedBy?: string;
  timestamp: admin.firestore.Timestamp;
  metadata?: Record<string, any>;
}

export interface OrderChange {
  field: string;
  oldValue: any;
  newValue: any;
  changedBy: string;
  changedAt: admin.firestore.Timestamp;
  reason?: string;
}

// ============================================================================
// QUEUE TYPES
// ============================================================================

export interface KitchenQueueItem {
  orderId: string;
  orderNumber: string;
  items: OrderItem[];
  priority: 'normal' | 'high' | 'urgent';
  orderType: OrderType;
  scheduledTime?: Date;
  startedAt?: admin.firestore.Timestamp;
  estimatedCompletionTime?: Date;
  station?: string;
  assignedTo?: string;
  status: 'queued' | 'preparing' | 'ready';
}

export interface DeliveryQueueItem {
  orderId: string;
  orderNumber: string;
  customer: Customer;
  deliveryAddress: DeliveryAddress;
  priority: 'normal' | 'high' | 'urgent';
  readyAt: admin.firestore.Timestamp;
  assignedTo?: string;
  status: 'pending' | 'assigned' | 'picked_up' | 'delivered';
  estimatedDeliveryTime?: Date;
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export interface OrderSystemTypes {
  Order: Order;
  OrderStatus: OrderStatus;
  OrderType: OrderType;
  OrderItem: OrderItem;
  Customer: Customer;
  DeliveryAddress: DeliveryAddress;
  PaymentStatus: PaymentStatus;
  PaymentDetails: PaymentDetails;
  DeliveryInfo: DeliveryInfo;
  OrderAnalytics: OrderAnalytics;
  OrderNotification: OrderNotification;
  InventoryItem: InventoryItem;
  InventoryUpdate: InventoryUpdate;
}