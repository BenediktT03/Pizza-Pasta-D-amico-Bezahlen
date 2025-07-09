/**
 * API Response Types
 * Type definitions for API response structures
 */

import { z } from 'zod';
import { User, AuthUser, StaffMember } from '../models/user';
import { Tenant } from '../models/tenant';
import { Product, ProductCategory } from '../models/product';
import { Order, OrderEvent } from '../models/order';
import { Payment, PaymentIntent, Refund } from '../models/payment';
import { Location } from '../models/location';

// Base response structure
export interface BaseResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
  meta?: ResponseMeta;
}

// Error response
export interface ErrorResponse {
  code: string;
  message: string;
  details?: ErrorDetail[];
  stack?: string; // Only in development
}

// Error detail
export interface ErrorDetail {
  field?: string;
  code: string;
  message: string;
}

// Response metadata
export interface ResponseMeta {
  timestamp: Date;
  requestId: string;
  version: string;
  deprecation?: DeprecationNotice;
}

// Deprecation notice
export interface DeprecationNotice {
  message: string;
  deprecatedAt: Date;
  removeAt?: Date;
  alternative?: string;
}

// Pagination response
export interface PaginationResponse<T> extends BaseResponse<T[]> {
  pagination: PaginationMeta;
}

// Pagination metadata
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// === AUTH RESPONSES ===

// Login response
export interface LoginResponse extends BaseResponse<AuthUser> {
  token: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

// Register response
export interface RegisterResponse extends BaseResponse<User> {
  requiresVerification: boolean;
  verificationSent: boolean;
}

// Forgot password response
export interface ForgotPasswordResponse extends BaseResponse {
  emailSent: boolean;
  expiresIn: number;
}

// Reset password response
export interface ResetPasswordResponse extends BaseResponse {
  passwordChanged: boolean;
  requiresLogin: boolean;
}

// Verify email response
export interface VerifyEmailResponse extends BaseResponse {
  verified: boolean;
  user?: User;
}

// Refresh token response
export interface RefreshTokenResponse extends BaseResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

// === USER RESPONSES ===

// User response
export interface UserResponse extends BaseResponse<User> {}

// Users list response
export interface UsersListResponse extends PaginationResponse<User> {}

// User created response
export interface UserCreatedResponse extends BaseResponse<User> {
  inviteSent?: boolean;
}

// User updated response
export interface UserUpdatedResponse extends BaseResponse<User> {
  changedFields: string[];
}

// User deleted response
export interface UserDeletedResponse extends BaseResponse {
  deletedAt: Date;
  dataReassigned?: boolean;
}

// === TENANT RESPONSES ===

// Tenant response
export interface TenantResponse extends BaseResponse<Tenant> {}

// Tenants list response
export interface TenantsListResponse extends PaginationResponse<Tenant> {}

// Tenant created response
export interface TenantCreatedResponse extends BaseResponse<Tenant> {
  defaultDataCreated?: boolean;
  setupUrl?: string;
}

// Tenant updated response
export interface TenantUpdatedResponse extends BaseResponse<Tenant> {
  changedFields: string[];
}

// Tenant deleted response
export interface TenantDeletedResponse extends BaseResponse {
  deletedAt: Date;
  dataArchived?: boolean;
}

// === PRODUCT RESPONSES ===

// Product response
export interface ProductResponse extends BaseResponse<Product> {}

// Products list response
export interface ProductsListResponse extends PaginationResponse<Product> {
  categories?: ProductCategory[];
}

// Product search response
export interface ProductSearchResponse extends BaseResponse<Product[]> {
  totalResults: number;
  searchTime: number; // in ms
  suggestions?: string[];
}

// Product created response
export interface ProductCreatedResponse extends BaseResponse<Product> {
  published: boolean;
}

// Product updated response
export interface ProductUpdatedResponse extends BaseResponse<Product> {
  changedFields: string[];
  priceChanged?: boolean;
}

// Product deleted response
export interface ProductDeletedResponse extends BaseResponse {
  deletedAt: Date;
  archivedData?: boolean;
}

// Bulk update response
export interface BulkUpdateResponse extends BaseResponse {
  updated: number;
  failed: number;
  errors?: Array<{
    id: string;
    error: string;
  }>;
}

// === ORDER RESPONSES ===

// Order response
export interface OrderResponse extends BaseResponse<Order> {}

// Orders list response
export interface OrdersListResponse extends PaginationResponse<Order> {
  summary?: OrdersSummary;
}

// Orders summary
export interface OrdersSummary {
  totalAmount: number;
  averageAmount: number;
  count: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}

// Order created response
export interface OrderCreatedResponse extends BaseResponse<Order> {
  inventoryUpdated: boolean;
  promotionsApplied?: string[];
  estimatedReadyTime?: Date;
}

// Order updated response
export interface OrderUpdatedResponse extends BaseResponse<Order> {
  changedFields: string[];
  notifications?: NotificationResult[];
}

// Order cancelled response
export interface OrderCancelledResponse extends BaseResponse<Order> {
  cancelledAt: Date;
  refundInitiated?: boolean;
  inventoryRestocked?: boolean;
}

// Order status response
export interface OrderStatusResponse extends BaseResponse {
  orderId: string;
  status: string;
  progress: number;
  estimatedTime?: Date;
  events: OrderEvent[];
}

// === PAYMENT RESPONSES ===

// Payment response
export interface PaymentResponse extends BaseResponse<Payment> {}

// Payments list response
export interface PaymentsListResponse extends PaginationResponse<Payment> {
  summary?: PaymentsSummary;
}

// Payments summary
export interface PaymentsSummary {
  totalAmount: number;
  count: number;
  byMethod: Record<string, number>;
  byStatus: Record<string, number>;
}

// Payment created response
export interface PaymentCreatedResponse extends BaseResponse<Payment> {
  requiresAction?: boolean;
  actionUrl?: string;
  clientSecret?: string;
}

// Payment processed response
export interface PaymentProcessedResponse extends BaseResponse<Payment> {
  processed: boolean;
  transactionId: string;
}

// Refund response
export interface RefundResponse extends BaseResponse<Refund> {
  refundedAmount: number;
  remainingAmount: number;
}

// Payment intent response
export interface PaymentIntentResponse extends BaseResponse<PaymentIntent> {
  clientSecret: string;
  publishableKey?: string;
}

// === LOCATION RESPONSES ===

// Location response
export interface LocationResponse extends BaseResponse<Location> {}

// Locations list response
export interface LocationsListResponse extends PaginationResponse<Location> {
  nearestLocation?: Location & { distance: number };
}

// Location created response
export interface LocationCreatedResponse extends BaseResponse<Location> {
  activated: boolean;
  validationWarnings?: string[];
}

// Location updated response
export interface LocationUpdatedResponse extends BaseResponse<Location> {
  changedFields: string[];
  requiresReview?: boolean;
}

// Location deleted response
export interface LocationDeletedResponse extends BaseResponse {
  deletedAt: Date;
  ordersTransferred?: number;
}

// Location availability response
export interface LocationAvailabilityResponse extends BaseResponse {
  locationId: string;
  isOpen: boolean;
  currentHours?: {
    open: string;
    close: string;
  };
  nextOpen?: Date;
  specialHours?: any;
}

// === ANALYTICS RESPONSES ===

// Analytics response
export interface AnalyticsResponse extends BaseResponse<AnalyticsData> {
  generated: Date;
  cached: boolean;
}

// Analytics data
export interface AnalyticsData {
  metrics: Record<string, MetricData>;
  comparison?: Record<string, MetricData>;
  insights?: Insight[];
}

// Metric data
export interface MetricData {
  value: number;
  change?: number;
  changePercent?: number;
  trend?: 'up' | 'down' | 'stable';
  data?: Array<{
    date: Date;
    value: number;
  }>;
}

// Insight
export interface Insight {
  type: 'info' | 'warning' | 'success' | 'alert';
  title: string;
  description: string;
  metric?: string;
  actionable?: boolean;
}

// === REPORT RESPONSES ===

// Report response
export interface ReportResponse extends BaseResponse {
  reportId: string;
  status: 'generating' | 'ready' | 'failed';
  downloadUrl?: string;
  expiresAt?: Date;
  emailSent?: boolean;
}

// === INVENTORY RESPONSES ===

// Inventory update response
export interface InventoryUpdateResponse extends BaseResponse {
  productId: string;
  previousQuantity: number;
  newQuantity: number;
  adjustment: number;
  lowStock?: boolean;
}

// Bulk inventory response
export interface BulkInventoryResponse extends BaseResponse {
  updated: number;
  failed: number;
  warnings?: string[];
  errors?: Array<{
    productId: string;
    error: string;
  }>;
}

// === NOTIFICATION RESPONSES ===

// Notification response
export interface NotificationResponse extends BaseResponse {
  notificationId: string;
  sent: number;
  failed: number;
  scheduled?: boolean;
  results?: NotificationResult[];
}

// Notification result
export interface NotificationResult {
  recipientId: string;
  status: 'sent' | 'failed' | 'pending';
  error?: string;
  sentAt?: Date;
}

// === IMPORT/EXPORT RESPONSES ===

// Import response
export interface ImportResponse extends BaseResponse {
  importId: string;
  status: 'processing' | 'completed' | 'failed';
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  errors?: ImportError[];
}

// Import error
export interface ImportError {
  row: number;
  field?: string;
  value?: any;
  error: string;
}

// Export response
export interface ExportResponse extends BaseResponse {
  exportId: string;
  status: 'processing' | 'ready' | 'failed';
  downloadUrl?: string;
  expiresAt?: Date;
  recordCount?: number;
}

// === VOICE ORDER RESPONSES ===

// Voice order response
export interface VoiceOrderResponse extends BaseResponse<Order> {
  transcript: string;
  confidence: number;
  language: string;
  processingTime: number; // in ms
  interpretedItems?: Array<{
    text: string;
    product?: Product;
    quantity: number;
    confidence: number;
  }>;
}

// === SEARCH RESPONSES ===

// Global search response
export interface GlobalSearchResponse extends BaseResponse {
  results: SearchResultGroup[];
  totalResults: number;
  searchTime: number; // in ms
}

// Search result group
export interface SearchResultGroup {
  type: 'products' | 'orders' | 'customers' | 'locations';
  count: number;
  results: SearchResult[];
}

// Search result
export interface SearchResult {
  id: string;
  type: string;
  title: string;
  description?: string;
  url?: string;
  score: number;
  highlights?: Record<string, string[]>;
}

// === WEBHOOK RESPONSES ===

// Webhook response
export interface WebhookResponse extends BaseResponse<Webhook> {}

// Webhook
export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  headers?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt?: Date;
  failureCount?: number;
}

// Webhook test response
export interface WebhookTestResponse extends BaseResponse {
  webhookId: string;
  status: number;
  headers: Record<string, string>;
  body: any;
  responseTime: number; // in ms
}

// === HEALTH CHECK RESPONSES ===

// Health check response
export interface HealthCheckResponse extends BaseResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  services: ServiceHealth[];
}

// Service health
export interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  error?: string;
  lastCheck: Date;
}

// === VALIDATION SCHEMAS ===

// Base response schema
export const baseResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.object({
      field: z.string().optional(),
      code: z.string(),
      message: z.string(),
    })).optional(),
  }).optional(),
  meta: z.object({
    timestamp: z.date(),
    requestId: z.string(),
    version: z.string(),
  }).optional(),
});

// Pagination response schema
export const paginationResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(z.any()),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

// === RESPONSE HELPERS ===

// Success response helper
export function successResponse<T>(data: T, meta?: Partial<ResponseMeta>): BaseResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date(),
      requestId: generateRequestId(),
      version: 'v1',
      ...meta,
    },
  };
}

// Error response helper
export function errorResponse(
  code: string,
  message: string,
  details?: ErrorDetail[],
  meta?: Partial<ResponseMeta>
): BaseResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date(),
      requestId: generateRequestId(),
      version: 'v1',
      ...meta,
    },
  };
}

// Pagination response helper
export function paginationResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  meta?: Partial<ResponseMeta>
): PaginationResponse<T> {
  const totalPages = Math.ceil(total / limit);
  
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    meta: {
      timestamp: new Date(),
      requestId: generateRequestId(),
      version: 'v1',
      ...meta,
    },
  };
}

// Generate request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
