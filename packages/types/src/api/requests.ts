/**
 * API Request Types
 * Type definitions for API request structures
 */

import { z } from 'zod';
import {
  UserRole,
  CreateUserInput,
  UpdateUserInput,
} from '../models/user';
import {
  CreateTenantInput,
  UpdateTenantInput,
} from '../models/tenant';
import {
  ProductType,
  ProductStatus,
  CreateProductInput,
  UpdateProductInput,
  Allergen,
} from '../models/product';
import {
  OrderType,
  OrderChannel,
  CreateOrderInput,
  UpdateOrderInput,
} from '../models/order';
import {
  PaymentMethod,
  CreatePaymentInput,
  ProcessPaymentInput,
  CreateRefundInput,
} from '../models/payment';
import {
  LocationType,
  CreateLocationInput,
  UpdateLocationInput,
} from '../models/location';

// Pagination request
export interface PaginationRequest {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Filter operators
export type FilterOperator = 
  | 'eq'    // equals
  | 'ne'    // not equals
  | 'gt'    // greater than
  | 'gte'   // greater than or equal
  | 'lt'    // less than
  | 'lte'   // less than or equal
  | 'in'    // in array
  | 'nin'   // not in array
  | 'like'  // like (for strings)
  | 'between' // between two values
  | 'exists' // field exists
  | 'null'   // is null
  | 'notNull'; // is not null

// Base filter
export interface BaseFilter {
  field: string;
  operator: FilterOperator;
  value: any;
}

// Date range filter
export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

// Location filter
export interface LocationFilter {
  lat: number;
  lng: number;
  radius: number; // in km
}

// === AUTH REQUESTS ===

// Login request
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceId?: string;
}

// Register request
export interface RegisterRequest extends CreateUserInput {
  agreedToTerms: boolean;
  marketingConsent?: boolean;
}

// Forgot password request
export interface ForgotPasswordRequest {
  email: string;
}

// Reset password request
export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

// Change password request
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Verify email request
export interface VerifyEmailRequest {
  token: string;
}

// Refresh token request
export interface RefreshTokenRequest {
  refreshToken: string;
}

// === USER REQUESTS ===

// List users request
export interface ListUsersRequest extends PaginationRequest {
  filters?: {
    role?: UserRole[];
    status?: string[];
    tenantId?: string;
    search?: string;
    createdAt?: DateRangeFilter;
  };
}

// Create user request
export interface CreateUserRequest extends CreateUserInput {
  sendWelcomeEmail?: boolean;
}

// Update user request
export interface UpdateUserRequest extends UpdateUserInput {
  userId: string;
}

// Delete user request
export interface DeleteUserRequest {
  userId: string;
  reassignTo?: string; // Reassign data to another user
}

// === TENANT REQUESTS ===

// List tenants request
export interface ListTenantsRequest extends PaginationRequest {
  filters?: {
    status?: string[];
    plan?: string[];
    search?: string;
    createdAt?: DateRangeFilter;
  };
}

// Create tenant request
export interface CreateTenantRequest extends CreateTenantInput {
  createDefaultData?: boolean;
}

// Update tenant request
export interface UpdateTenantRequest extends UpdateTenantInput {
  tenantId: string;
}

// Delete tenant request
export interface DeleteTenantRequest {
  tenantId: string;
  hardDelete?: boolean;
}

// === PRODUCT REQUESTS ===

// List products request
export interface ListProductsRequest extends PaginationRequest {
  filters?: {
    type?: ProductType[];
    status?: ProductStatus[];
    category?: string[];
    tags?: string[];
    allergens?: Allergen[];
    priceRange?: {
      min?: number;
      max?: number;
    };
    search?: string;
    tenantId?: string;
    locationId?: string;
  };
}

// Search products request
export interface SearchProductsRequest {
  query: string;
  filters?: ListProductsRequest['filters'];
  limit?: number;
  fuzzy?: boolean;
}

// Create product request
export interface CreateProductRequest extends CreateProductInput {
  publish?: boolean;
}

// Update product request
export interface UpdateProductRequest extends UpdateProductInput {
  productId: string;
}

// Delete product request
export interface DeleteProductRequest {
  productId: string;
  hardDelete?: boolean;
}

// Bulk update products request
export interface BulkUpdateProductsRequest {
  productIds: string[];
  updates: Partial<UpdateProductInput>;
}

// === ORDER REQUESTS ===

// List orders request
export interface ListOrdersRequest extends PaginationRequest {
  filters?: {
    type?: OrderType[];
    status?: string[];
    channel?: OrderChannel[];
    customerId?: string;
    tenantId?: string;
    locationId?: string;
    paymentMethod?: PaymentMethod[];
    dateRange?: DateRangeFilter;
    totalRange?: {
      min?: number;
      max?: number;
    };
    search?: string; // Search in order number, customer name, etc.
  };
}

// Create order request
export interface CreateOrderRequest extends CreateOrderInput {
  validateInventory?: boolean;
  applyPromotions?: boolean;
}

// Update order request
export interface UpdateOrderRequest extends UpdateOrderInput {
  orderId: string;
}

// Cancel order request
export interface CancelOrderRequest {
  orderId: string;
  reason: string;
  refundPayment?: boolean;
  restockItems?: boolean;
}

// === PAYMENT REQUESTS ===

// List payments request
export interface ListPaymentsRequest extends PaginationRequest {
  filters?: {
    status?: string[];
    method?: PaymentMethod[];
    orderId?: string;
    customerId?: string;
    tenantId?: string;
    dateRange?: DateRangeFilter;
    amountRange?: {
      min?: number;
      max?: number;
    };
  };
}

// Create payment request
export interface CreatePaymentRequest extends CreatePaymentInput {
  savePaymentMethod?: boolean;
}

// Process payment request
export interface ProcessPaymentRequest extends ProcessPaymentInput {
  notifyCustomer?: boolean;
}

// Refund payment request
export interface RefundPaymentRequest extends CreateRefundInput {
  notifyCustomer?: boolean;
}

// === LOCATION REQUESTS ===

// List locations request
export interface ListLocationsRequest extends PaginationRequest {
  filters?: {
    type?: LocationType[];
    status?: string[];
    tenantId?: string;
    nearBy?: LocationFilter;
    features?: string[];
    services?: string[];
    search?: string;
  };
}

// Create location request
export interface CreateLocationRequest extends CreateLocationInput {
  activate?: boolean;
}

// Update location request
export interface UpdateLocationRequest extends UpdateLocationInput {
  locationId: string;
}

// Delete location request
export interface DeleteLocationRequest {
  locationId: string;
  transferOrdersTo?: string; // Transfer open orders to another location
}

// === ANALYTICS REQUESTS ===

// Analytics date range
export type AnalyticsDateRange = 
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'last90days'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'lastYear'
  | 'custom';

// Get analytics request
export interface GetAnalyticsRequest {
  tenantId?: string;
  locationId?: string;
  dateRange: AnalyticsDateRange;
  customDateRange?: DateRangeFilter;
  metrics: string[];
  groupBy?: 'day' | 'week' | 'month' | 'year';
  compareWith?: AnalyticsDateRange;
}

// === REPORT REQUESTS ===

// Generate report request
export interface GenerateReportRequest {
  type: 'sales' | 'inventory' | 'customers' | 'products' | 'staff' | 'financial';
  format: 'pdf' | 'excel' | 'csv';
  dateRange: DateRangeFilter;
  tenantId?: string;
  locationId?: string;
  filters?: Record<string, any>;
  email?: string; // Email to send report to
}

// === INVENTORY REQUESTS ===

// Update inventory request
export interface UpdateInventoryRequest {
  productId: string;
  locationId?: string;
  adjustment: number; // Positive for increase, negative for decrease
  reason: 'sale' | 'return' | 'damage' | 'theft' | 'manual' | 'restock';
  notes?: string;
}

// Bulk update inventory request
export interface BulkUpdateInventoryRequest {
  updates: UpdateInventoryRequest[];
  validateStock?: boolean;
}

// === NOTIFICATION REQUESTS ===

// Send notification request
export interface SendNotificationRequest {
  recipients: string[]; // User IDs
  type: 'email' | 'sms' | 'push' | 'in_app';
  template: string;
  data: Record<string, any>;
  scheduledFor?: Date;
}

// === IMPORT/EXPORT REQUESTS ===

// Import data request
export interface ImportDataRequest {
  type: 'products' | 'customers' | 'orders';
  format: 'csv' | 'excel' | 'json';
  fileUrl: string;
  mapping?: Record<string, string>; // Field mapping
  options?: {
    updateExisting?: boolean;
    skipInvalid?: boolean;
    dryRun?: boolean;
  };
}

// Export data request
export interface ExportDataRequest {
  type: 'products' | 'customers' | 'orders' | 'payments';
  format: 'csv' | 'excel' | 'json';
  filters?: Record<string, any>;
  fields?: string[]; // Fields to include
}

// === VOICE ORDER REQUESTS ===

// Process voice order request
export interface ProcessVoiceOrderRequest {
  audioUrl?: string;
  audioData?: string; // Base64 encoded audio
  language: 'de' | 'fr' | 'it' | 'en';
  customerId?: string;
  locationId?: string;
}

// === SEARCH REQUESTS ===

// Global search request
export interface GlobalSearchRequest {
  query: string;
  types?: ('products' | 'orders' | 'customers' | 'locations')[];
  limit?: number;
  tenantId?: string;
}

// === WEBHOOK REQUESTS ===

// Register webhook request
export interface RegisterWebhookRequest {
  url: string;
  events: string[];
  secret?: string;
  active?: boolean;
  headers?: Record<string, string>;
}

// Update webhook request
export interface UpdateWebhookRequest {
  webhookId: string;
  url?: string;
  events?: string[];
  active?: boolean;
  headers?: Record<string, string>;
}

// Test webhook request
export interface TestWebhookRequest {
  webhookId: string;
  event: string;
  payload?: Record<string, any>;
}

// === VALIDATION SCHEMAS ===

// Common validation schemas
export const paginationSchema = z.object({
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export const dateRangeSchema = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

export const locationFilterSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius: z.number().positive(),
});

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
  deviceId: z.string().optional(),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1),
  agreedToTerms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
  marketingConsent: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
