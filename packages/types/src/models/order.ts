/**
 * Order Model Types
 * Type definitions for order-related data structures
 */

import { z } from 'zod';
import { Product, ProductVariant, ProductAddon, ProductCustomization } from './product';
import { User } from './user';
import { PaymentMethod } from './payment';

// Order status enum
export enum OrderStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  DELIVERING = 'delivering',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

// Order type enum
export enum OrderType {
  DINE_IN = 'dine_in',
  TAKEAWAY = 'takeaway',
  DELIVERY = 'delivery',
  PICKUP = 'pickup',
  DRIVE_THRU = 'drive_thru',
  CATERING = 'catering',
}

// Order channel enum
export enum OrderChannel {
  WEB = 'web',
  APP = 'app',
  POS = 'pos',
  KIOSK = 'kiosk',
  PHONE = 'phone',
  THIRD_PARTY = 'third_party',
  VOICE = 'voice',
}

// Base order interface
export interface Order {
  id: string;
  tenantId: string;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  channel: OrderChannel;
  customer: OrderCustomer;
  items: OrderItem[];
  subtotal: number;
  discounts: OrderDiscount[];
  taxes: OrderTax[];
  fees: OrderFee[];
  tips?: number;
  total: number;
  payment: OrderPayment;
  fulfillment: OrderFulfillment;
  notes?: OrderNotes;
  timeline: OrderTimeline;
  metadata: OrderMetadata;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

// Order customer interface
export interface OrderCustomer {
  id?: string;
  isGuest: boolean;
  name: string;
  email?: string;
  phone?: string;
  address?: OrderAddress;
  loyaltyNumber?: string;
  notes?: string;
}

// Order address interface
export interface OrderAddress {
  street: string;
  streetNumber?: string;
  apartment?: string;
  city: string;
  postalCode: string;
  canton?: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  instructions?: string;
}

// Order item interface
export interface OrderItem {
  id: string;
  productId: string;
  product: Partial<Product>; // Snapshot of product at order time
  variantId?: string;
  variant?: ProductVariant;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discounts: ItemDiscount[];
  taxes: ItemTax[];
  total: number;
  addons: OrderItemAddon[];
  customizations: OrderItemCustomization[];
  notes?: string;
  status: OrderItemStatus;
  preparedAt?: Date;
  servedAt?: Date;
}

// Order item status enum
export enum OrderItemStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  READY = 'ready',
  SERVED = 'served',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

// Order item addon interface
export interface OrderItemAddon {
  id: string;
  addonId: string;
  addon: Partial<ProductAddon>;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Order item customization interface
export interface OrderItemCustomization {
  id: string;
  customizationId: string;
  customization: Partial<ProductCustomization>;
  selectedOptions: string[]; // Option IDs
  additionalPrice: number;
  notes?: string;
}

// Order discount interface
export interface OrderDiscount {
  id: string;
  type: 'percentage' | 'fixed' | 'voucher' | 'loyalty';
  code?: string;
  name: string;
  description?: string;
  amount: number;
  appliedTo: 'order' | 'items' | 'delivery';
  conditions?: DiscountCondition[];
}

// Discount condition interface
export interface DiscountCondition {
  type: 'min_amount' | 'max_amount' | 'items' | 'time' | 'customer';
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin';
  value: any;
}

// Item discount interface
export interface ItemDiscount {
  discountId: string;
  amount: number;
  reason?: string;
}

// Order tax interface
export interface OrderTax {
  id: string;
  name: string;
  rate: number;
  amount: number;
  inclusive: boolean;
}

// Item tax interface
export interface ItemTax {
  taxId: string;
  rate: number;
  amount: number;
}

// Order fee interface
export interface OrderFee {
  id: string;
  type: 'delivery' | 'service' | 'platform' | 'packaging' | 'small_order' | 'custom';
  name: string;
  description?: string;
  amount: number;
  taxable: boolean;
}

// Order payment interface
export interface OrderPayment {
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  currency: 'CHF' | 'EUR';
  transactionId?: string;
  paidAt?: Date;
  refunds: PaymentRefund[];
  splits?: PaymentSplit[];
}

// Payment status enum
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

// Payment refund interface
export interface PaymentRefund {
  id: string;
  amount: number;
  reason: string;
  status: 'pending' | 'processed' | 'failed';
  processedAt?: Date;
  transactionId?: string;
}

// Payment split interface
export interface PaymentSplit {
  id: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  paidBy?: string; // Customer ID or name
}

// Order fulfillment interface
export interface OrderFulfillment {
  type: OrderType;
  scheduledFor?: Date;
  estimatedReady?: Date;
  actualReady?: Date;
  assignedTo?: string; // Staff ID for delivery
  location?: OrderLocation;
  delivery?: DeliveryDetails;
  pickup?: PickupDetails;
  table?: TableDetails;
}

// Order location interface
export interface OrderLocation {
  id: string;
  name: string;
  address?: OrderAddress;
  phone?: string;
}

// Delivery details interface
export interface DeliveryDetails {
  address: OrderAddress;
  estimatedTime: Date;
  actualTime?: Date;
  distance?: number; // in km
  fee: number;
  driver?: DeliveryDriver;
  tracking?: TrackingInfo;
}

// Delivery driver interface
export interface DeliveryDriver {
  id: string;
  name: string;
  phone?: string;
  vehicle?: string;
  licensePlate?: string;
}

// Tracking info interface
export interface TrackingInfo {
  url?: string;
  currentLocation?: {
    lat: number;
    lng: number;
  };
  estimatedArrival?: Date;
  status: 'assigned' | 'picked_up' | 'on_the_way' | 'nearby' | 'delivered';
}

// Pickup details interface
export interface PickupDetails {
  location: OrderLocation;
  code?: string; // Pickup code
  scheduledTime: Date;
  readyTime?: Date;
  pickedUpTime?: Date;
  pickedUpBy?: string; // Name or ID
}

// Table details interface
export interface TableDetails {
  tableNumber: string;
  section?: string;
  seats?: number;
  server?: string; // Staff ID
  openedAt: Date;
  closedAt?: Date;
}

// Order notes interface
export interface OrderNotes {
  customer?: string;
  kitchen?: string;
  delivery?: string;
  internal?: string;
}

// Order timeline interface
export interface OrderTimeline {
  events: OrderEvent[];
}

// Order event interface
export interface OrderEvent {
  id: string;
  type: OrderEventType;
  status?: OrderStatus;
  description: string;
  actor?: OrderActor;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Order event type enum
export enum OrderEventType {
  CREATED = 'created',
  UPDATED = 'updated',
  STATUS_CHANGED = 'status_changed',
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_FAILED = 'payment_failed',
  ITEM_ADDED = 'item_added',
  ITEM_REMOVED = 'item_removed',
  ITEM_MODIFIED = 'item_modified',
  ASSIGNED = 'assigned',
  PREPARED = 'prepared',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  NOTE_ADDED = 'note_added',
  CUSTOMER_CONTACTED = 'customer_contacted',
}

// Order actor interface
export interface OrderActor {
  type: 'customer' | 'staff' | 'system' | 'driver';
  id?: string;
  name: string;
}

// Order metadata interface
export interface OrderMetadata {
  source?: string; // e.g., 'google', 'facebook', 'direct'
  campaign?: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  userAgent?: string;
  ipAddress?: string;
  voiceTranscript?: string; // For voice orders
  customFields?: Record<string, any>;
}

// Create order input
export interface CreateOrderInput {
  tenantId: string;
  type: OrderType;
  channel: OrderChannel;
  customer: Omit<OrderCustomer, 'id'>;
  items: CreateOrderItemInput[];
  fulfillment: Partial<OrderFulfillment>;
  payment?: {
    method: PaymentMethod;
    amount?: number;
  };
  notes?: Partial<OrderNotes>;
}

// Create order item input
export interface CreateOrderItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
  addons?: {
    addonId: string;
    quantity: number;
  }[];
  customizations?: {
    customizationId: string;
    selectedOptions: string[];
  }[];
  notes?: string;
}

// Update order input
export interface UpdateOrderInput {
  status?: OrderStatus;
  customer?: Partial<OrderCustomer>;
  items?: UpdateOrderItemInput[];
  fulfillment?: Partial<OrderFulfillment>;
  payment?: Partial<OrderPayment>;
  notes?: Partial<OrderNotes>;
}

// Update order item input
export interface UpdateOrderItemInput {
  id: string;
  quantity?: number;
  status?: OrderItemStatus;
  notes?: string;
}

// Validation schemas
export const orderSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  orderNumber: z.string(),
  type: z.nativeEnum(OrderType),
  status: z.nativeEnum(OrderStatus),
  channel: z.nativeEnum(OrderChannel),
  subtotal: z.number().min(0),
  total: z.number().min(0),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().optional(),
  cancelledAt: z.date().optional(),
});

// Helpers
export function calculateOrderTotal(order: Order): number {
  let total = order.subtotal;
  
  // Apply discounts
  order.discounts.forEach(discount => {
    if (discount.type === 'percentage') {
      total -= (total * discount.amount / 100);
    } else {
      total -= discount.amount;
    }
  });
  
  // Add taxes
  order.taxes.forEach(tax => {
    if (!tax.inclusive) {
      total += tax.amount;
    }
  });
  
  // Add fees
  order.fees.forEach(fee => {
    total += fee.amount;
  });
  
  // Add tips
  if (order.tips) {
    total += order.tips;
  }
  
  return Math.max(0, total);
}

export function isOrderEditable(order: Order): boolean {
  return [OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(order.status);
}

export function canCancelOrder(order: Order): boolean {
  return ![OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.REFUNDED].includes(order.status);
}

export function getOrderProgress(order: Order): number {
  const statusProgress: Record<OrderStatus, number> = {
    [OrderStatus.DRAFT]: 0,
    [OrderStatus.PENDING]: 10,
    [OrderStatus.CONFIRMED]: 20,
    [OrderStatus.PREPARING]: 40,
    [OrderStatus.READY]: 70,
    [OrderStatus.DELIVERING]: 80,
    [OrderStatus.COMPLETED]: 100,
    [OrderStatus.CANCELLED]: 0,
    [OrderStatus.REFUNDED]: 0,
    [OrderStatus.FAILED]: 0,
  };
  
  return statusProgress[order.status] || 0;
}
