/**
 * Order Event Types
 * Type definitions for order-related events
 */

import { Order, OrderStatus, OrderItem, OrderPayment } from '../models/order';
import { User } from '../models/user';
import { Location } from '../models/location';

// Base event interface
export interface BaseEvent {
  id: string;
  type: string;
  timestamp: Date;
  tenantId: string;
  metadata?: EventMetadata;
}

// Event metadata
export interface EventMetadata {
  userId?: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  source?: string;
  version?: string;
}

// === ORDER LIFECYCLE EVENTS ===

// Order created event
export interface OrderCreatedEvent extends BaseEvent {
  type: 'order.created';
  data: {
    order: Order;
    customer: {
      id?: string;
      name: string;
      email?: string;
      phone?: string;
      isNew: boolean;
    };
    location: {
      id: string;
      name: string;
    };
  };
}

// Order updated event
export interface OrderUpdatedEvent extends BaseEvent {
  type: 'order.updated';
  data: {
    orderId: string;
    previousState: Partial<Order>;
    currentState: Partial<Order>;
    changedFields: string[];
    updatedBy?: User;
  };
}

// Order status changed event
export interface OrderStatusChangedEvent extends BaseEvent {
  type: 'order.status_changed';
  data: {
    orderId: string;
    orderNumber: string;
    previousStatus: OrderStatus;
    currentStatus: OrderStatus;
    reason?: string;
    changedBy?: User;
    location: Location;
    notificationsSent?: {
      customer?: boolean;
      staff?: boolean;
      kitchen?: boolean;
    };
  };
}

// Order confirmed event
export interface OrderConfirmedEvent extends BaseEvent {
  type: 'order.confirmed';
  data: {
    order: Order;
    estimatedReadyTime: Date;
    preparationTime: number; // in minutes
    confirmedBy?: User;
  };
}

// Order preparing event
export interface OrderPreparingEvent extends BaseEvent {
  type: 'order.preparing';
  data: {
    orderId: string;
    orderNumber: string;
    startedAt: Date;
    estimatedCompletionTime: Date;
    station?: string;
    preparedBy?: User;
  };
}

// Order ready event
export interface OrderReadyEvent extends BaseEvent {
  type: 'order.ready';
  data: {
    orderId: string;
    orderNumber: string;
    readyAt: Date;
    preparationTime: number; // actual time in minutes
    pickupCode?: string;
    notificationSent: boolean;
  };
}

// Order completed event
export interface OrderCompletedEvent extends BaseEvent {
  type: 'order.completed';
  data: {
    order: Order;
    completedAt: Date;
    totalTime: number; // in minutes
    feedback?: {
      rating?: number;
      comment?: string;
    };
    metrics: {
      preparationTime: number;
      waitTime: number;
      deliveryTime?: number;
    };
  };
}

// Order cancelled event
export interface OrderCancelledEvent extends BaseEvent {
  type: 'order.cancelled';
  data: {
    orderId: string;
    orderNumber: string;
    cancelledAt: Date;
    reason: string;
    cancelledBy: 'customer' | 'staff' | 'system';
    refundInitiated: boolean;
    refundAmount?: number;
  };
}

// Order refunded event
export interface OrderRefundedEvent extends BaseEvent {
  type: 'order.refunded';
  data: {
    orderId: string;
    orderNumber: string;
    refundAmount: number;
    refundReason: string;
    refundMethod: string;
    refundedAt: Date;
    processedBy?: User;
  };
}

// === ORDER ITEM EVENTS ===

// Order item added event
export interface OrderItemAddedEvent extends BaseEvent {
  type: 'order.item_added';
  data: {
    orderId: string;
    item: OrderItem;
    addedBy?: User;
    currentTotal: number;
  };
}

// Order item updated event
export interface OrderItemUpdatedEvent extends BaseEvent {
  type: 'order.item_updated';
  data: {
    orderId: string;
    itemId: string;
    previousState: Partial<OrderItem>;
    currentState: Partial<OrderItem>;
    updatedBy?: User;
  };
}

// Order item removed event
export interface OrderItemRemovedEvent extends BaseEvent {
  type: 'order.item_removed';
  data: {
    orderId: string;
    itemId: string;
    item: OrderItem;
    removedBy?: User;
    reason?: string;
  };
}

// === PAYMENT EVENTS ===

// Order payment received event
export interface OrderPaymentReceivedEvent extends BaseEvent {
  type: 'order.payment_received';
  data: {
    orderId: string;
    orderNumber: string;
    payment: OrderPayment;
    receivedAt: Date;
  };
}

// Order payment failed event
export interface OrderPaymentFailedEvent extends BaseEvent {
  type: 'order.payment_failed';
  data: {
    orderId: string;
    orderNumber: string;
    paymentMethod: string;
    failureReason: string;
    attemptNumber: number;
    willRetry: boolean;
  };
}

// === DELIVERY EVENTS ===

// Order assigned to driver event
export interface OrderAssignedToDriverEvent extends BaseEvent {
  type: 'order.assigned_to_driver';
  data: {
    orderId: string;
    orderNumber: string;
    driver: {
      id: string;
      name: string;
      phone?: string;
      vehicle?: string;
    };
    assignedAt: Date;
    estimatedDeliveryTime: Date;
  };
}

// Order picked up by driver event
export interface OrderPickedUpByDriverEvent extends BaseEvent {
  type: 'order.picked_up_by_driver';
  data: {
    orderId: string;
    orderNumber: string;
    driverId: string;
    pickedUpAt: Date;
    location: {
      lat: number;
      lng: number;
    };
  };
}

// Order delivered event
export interface OrderDeliveredEvent extends BaseEvent {
  type: 'order.delivered';
  data: {
    orderId: string;
    orderNumber: string;
    deliveredAt: Date;
    deliveredBy: string;
    deliveryTime: number; // in minutes
    customerSignature?: string;
    photo?: string;
    location?: {
      lat: number;
      lng: number;
    };
  };
}

// === CUSTOMER EVENTS ===

// Customer arrived event
export interface CustomerArrivedEvent extends BaseEvent {
  type: 'order.customer_arrived';
  data: {
    orderId: string;
    orderNumber: string;
    arrivedAt: Date;
    notificationMethod?: 'app' | 'sms' | 'call' | 'in_person';
    location?: {
      lat: number;
      lng: number;
    };
  };
}

// Customer no show event
export interface CustomerNoShowEvent extends BaseEvent {
  type: 'order.customer_no_show';
  data: {
    orderId: string;
    orderNumber: string;
    expectedTime: Date;
    waitTime: number; // in minutes
    action: 'cancelled' | 'saved' | 'donated';
  };
}

// === KITCHEN EVENTS ===

// Kitchen alert event
export interface KitchenAlertEvent extends BaseEvent {
  type: 'order.kitchen_alert';
  data: {
    orderId: string;
    alertType: 'delayed' | 'out_of_stock' | 'special_request' | 'quality_issue';
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    station?: string;
    reportedBy?: User;
  };
}

// === RATING & FEEDBACK EVENTS ===

// Order rated event
export interface OrderRatedEvent extends BaseEvent {
  type: 'order.rated';
  data: {
    orderId: string;
    orderNumber: string;
    rating: {
      overall: number;
      food?: number;
      service?: number;
      delivery?: number;
    };
    feedback?: string;
    ratedAt: Date;
    customerId: string;
  };
}

// === VOICE ORDER EVENTS ===

// Voice order received event
export interface VoiceOrderReceivedEvent extends BaseEvent {
  type: 'order.voice_received';
  data: {
    sessionId: string;
    language: string;
    duration: number; // in seconds
    transcript: string;
    confidence: number;
  };
}

// Voice order processed event
export interface VoiceOrderProcessedEvent extends BaseEvent {
  type: 'order.voice_processed';
  data: {
    sessionId: string;
    orderId?: string;
    success: boolean;
    items?: Array<{
      product: string;
      quantity: number;
      confidence: number;
    }>;
    processingTime: number; // in ms
    errors?: string[];
  };
}

// === AGGREGATED EVENTS ===

// Daily order summary event
export interface DailyOrderSummaryEvent extends BaseEvent {
  type: 'order.daily_summary';
  data: {
    date: Date;
    locationId: string;
    summary: {
      totalOrders: number;
      totalRevenue: number;
      averageOrderValue: number;
      ordersByType: Record<string, number>;
      ordersByStatus: Record<string, number>;
      peakHour: string;
      topProducts: Array<{
        productId: string;
        productName: string;
        quantity: number;
        revenue: number;
      }>;
    };
  };
}

// === EVENT TYPE UNION ===

export type OrderEvent =
  | OrderCreatedEvent
  | OrderUpdatedEvent
  | OrderStatusChangedEvent
  | OrderConfirmedEvent
  | OrderPreparingEvent
  | OrderReadyEvent
  | OrderCompletedEvent
  | OrderCancelledEvent
  | OrderRefundedEvent
  | OrderItemAddedEvent
  | OrderItemUpdatedEvent
  | OrderItemRemovedEvent
  | OrderPaymentReceivedEvent
  | OrderPaymentFailedEvent
  | OrderAssignedToDriverEvent
  | OrderPickedUpByDriverEvent
  | OrderDeliveredEvent
  | CustomerArrivedEvent
  | CustomerNoShowEvent
  | KitchenAlertEvent
  | OrderRatedEvent
  | VoiceOrderReceivedEvent
  | VoiceOrderProcessedEvent
  | DailyOrderSummaryEvent;

// === EVENT HANDLERS ===

export type OrderEventHandler<T extends OrderEvent = OrderEvent> = (event: T) => void | Promise<void>;

// Event subscription options
export interface EventSubscriptionOptions {
  filter?: (event: OrderEvent) => boolean;
  async?: boolean;
  retryOnError?: boolean;
  maxRetries?: number;
}

// Event emitter interface
export interface OrderEventEmitter {
  emit<T extends OrderEvent>(event: T): void;
  on<T extends OrderEvent>(
    eventType: T['type'],
    handler: OrderEventHandler<T>,
    options?: EventSubscriptionOptions
  ): () => void;
  off<T extends OrderEvent>(eventType: T['type'], handler: OrderEventHandler<T>): void;
  once<T extends OrderEvent>(
    eventType: T['type'],
    handler: OrderEventHandler<T>
  ): void;
}

// === WEBHOOK PAYLOADS ===

// Webhook event wrapper
export interface WebhookEvent<T extends OrderEvent = OrderEvent> {
  id: string;
  type: 'webhook';
  event: T;
  signature: string;
  timestamp: Date;
  retries?: number;
}

// Webhook delivery status
export interface WebhookDeliveryStatus {
  eventId: string;
  webhookId: string;
  status: 'pending' | 'delivered' | 'failed';
  statusCode?: number;
  response?: string;
  error?: string;
  attempts: number;
  lastAttempt: Date;
  nextRetry?: Date;
}
