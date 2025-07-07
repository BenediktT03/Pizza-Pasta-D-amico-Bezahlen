/**
 * EATECH - Tenant Type Definitions
 * Version: 1.0.0
 * Description: Type definitions for multi-tenant system
 * Author: EATECH Development Team
 * Created: 2025-01-09
 * File Path: /functions/src/types/tenant.types.ts
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
  DELETED = 'deleted',
  PENDING = 'pending'
}

export enum SubscriptionPlan {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
  UNPAID = 'unpaid',
  TRIALING = 'trialing'
}

export enum SupportLevel {
  COMMUNITY = 'community',
  EMAIL = 'email',
  PRIORITY = 'priority',
  DEDICATED = 'dedicated'
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Main tenant interface
 */
export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address: TenantAddress;
  status: TenantStatus;
  plan: SubscriptionPlan;
  stripeCustomerId?: string;
  settings: TenantSettings;
  metadata?: TenantMetadata;
  createdAt: Date;
  updatedAt: Date;
  suspendedAt?: Date;
  suspensionReason?: string;
  deletedAt?: Date;
  deletionReason?: string;
}

/**
 * Tenant address
 */
export interface TenantAddress {
  street: string;
  city: string;
  postalCode: string;
  canton: string;
  country?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

/**
 * Tenant settings
 */
export interface TenantSettings {
  timezone: string;
  currency: string;
  language: string;
  features: TenantFeatures;
  branding: TenantBranding;
  notifications: NotificationSettings;
  integrations?: IntegrationSettings;
  customFields?: Record<string, any>;
}

/**
 * Tenant features
 */
export interface TenantFeatures {
  orders: boolean;
  products: boolean;
  customers: boolean;
  analytics: boolean;
  notifications: boolean;
  loyalty: boolean;
  events: boolean;
  ai: boolean;
  customDomain: boolean;
  whiteLabel: boolean;
  multiLocation?: boolean;
  api?: boolean;
  webhooks?: boolean;
}

/**
 * Tenant branding
 */
export interface TenantBranding {
  primaryColor: string;
  secondaryColor?: string;
  logo?: string;
  favicon?: string;
  font?: string;
  customCss?: string;
  emailTemplate?: string;
  invoiceTemplate?: string;
}

/**
 * Notification settings
 */
export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  push: boolean;
  emailProvider?: 'sendgrid' | 'mailgun' | 'ses';
  smsProvider?: 'twilio' | 'nexmo' | 'messagebird';
  webhookUrl?: string;
}

/**
 * Integration settings
 */
export interface IntegrationSettings {
  pos?: {
    provider: string;
    apiKey: string;
    syncEnabled: boolean;
  };
  accounting?: {
    provider: string;
    apiKey: string;
    syncEnabled: boolean;
  };
  delivery?: {
    provider: string;
    apiKey: string;
    enabled: boolean;
  };
  marketing?: {
    provider: string;
    apiKey: string;
    listId?: string;
  };
}

/**
 * Tenant metadata
 */
export interface TenantMetadata {
  industry?: string;
  employeeCount?: number;
  monthlyRevenue?: number;
  tags?: string[];
  notes?: string;
  referralSource?: string;
  onboardingCompleted?: boolean;
  lastLoginAt?: Date;
}

/**
 * Tenant subscription
 */
export interface TenantSubscription {
  id: string;
  tenantId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  features: SubscriptionFeatures;
  startDate: Date;
  endDate?: Date;
  renewalDate: Date;
  trialEndsAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  stripeSubscriptionId?: string;
  stripeSubscriptionItemId?: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  discounts?: SubscriptionDiscount[];
  addons?: SubscriptionAddon[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subscription features (limits)
 */
export interface SubscriptionFeatures {
  orders: number; // -1 for unlimited
  products: number;
  users: number;
  storage: number; // MB
  api_calls: number;
  sms: number;
  emails: number;
  analytics: boolean;
  customDomain: boolean;
  whiteLabel: boolean;
  support: SupportLevel;
}

/**
 * Subscription discount
 */
export interface SubscriptionDiscount {
  id: string;
  code: string;
  amount: number;
  type: 'percentage' | 'fixed';
  duration: 'once' | 'repeating' | 'forever';
  durationInMonths?: number;
  appliedAt: Date;
  expiresAt?: Date;
}

/**
 * Subscription addon
 */
export interface SubscriptionAddon {
  id: string;
  name: string;
  price: number;
  quantity: number;
  features?: Partial<SubscriptionFeatures>;
}

/**
 * Tenant usage tracking
 */
export interface TenantUsage {
  tenantId: string;
  current: UsageMetrics;
  limits: SubscriptionFeatures;
  period: {
    start: Date;
    end: Date;
  };
  history?: UsageHistory[];
  alerts?: UsageAlert[];
  lastUpdated: Date;
}

/**
 * Usage metrics
 */
export interface UsageMetrics {
  orders: number;
  storage: number; // MB
  api_calls: number;
  sms_sent: number;
  emails_sent: number;
  bandwidth?: number; // MB
  compute_time?: number; // minutes
}

/**
 * Usage history
 */
export interface UsageHistory {
  date: Date;
  metrics: UsageMetrics;
  cost?: number;
}

/**
 * Usage alert
 */
export interface UsageAlert {
  id: string;
  metric: keyof UsageMetrics;
  threshold: number;
  current: number;
  percentage: number;
  createdAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

/**
 * Tenant invoice
 */
export interface TenantInvoice {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  period: {
    start: Date;
    end: Date;
  };
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  dueDate: Date;
  paidAt?: Date;
  paymentMethod?: string;
  stripeInvoiceId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Invoice item
 */
export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  type: 'subscription' | 'usage' | 'addon' | 'credit';
  metadata?: Record<string, any>;
}

/**
 * Tenant user
 */
export interface TenantUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
  permissions?: string[];
  status: 'active' | 'inactive' | 'invited';
  lastLoginAt?: Date;
  invitedBy?: string;
  invitedAt?: Date;
  acceptedAt?: Date;
  deactivatedAt?: Date;
  deactivationReason?: string;
  metadata?: UserMetadata;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User role
 */
export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff',
  VIEWER = 'viewer',
  CUSTOM = 'custom'
}

/**
 * User metadata
 */
export interface UserMetadata {
  department?: string;
  position?: string;
  phone?: string;
  avatar?: string;
  preferences?: Record<string, any>;
}

/**
 * Tenant onboarding
 */
export interface TenantOnboarding {
  tenantId: string;
  currentStep: number;
  totalSteps: number;
  completedSteps: OnboardingStep[];
  skippedSteps: string[];
  startedAt: Date;
  completedAt?: Date;
  data: OnboardingData;
}

/**
 * Onboarding step
 */
export interface OnboardingStep {
  id: string;
  name: string;
  completed: boolean;
  completedAt?: Date;
  data?: Record<string, any>;
}

/**
 * Onboarding data
 */
export interface OnboardingData {
  businessInfo?: {
    type: string;
    cuisine?: string[];
    capacity?: number;
    operatingHours?: Record<string, any>;
  };
  menuImported?: boolean;
  paymentSetup?: boolean;
  staffInvited?: boolean;
  firstOrderReceived?: boolean;
}

/**
 * Tenant backup
 */
export interface TenantBackup {
  id: string;
  tenantId: string;
  type: 'manual' | 'scheduled' | 'migration';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  size: number; // bytes
  location: string;
  includes: {
    settings: boolean;
    products: boolean;
    customers: boolean;
    orders: boolean;
    analytics: boolean;
  };
  encryption: boolean;
  compression: boolean;
  createdAt: Date;
  completedAt?: Date;
  expiresAt: Date;
  error?: string;
}

/**
 * Tenant migration
 */
export interface TenantMigration {
  id: string;
  sourceTenantId: string;
  targetTenantId?: string;
  type: 'export' | 'import' | 'transfer';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  data: MigrationData;
  options: MigrationOptions;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * Migration data
 */
export interface MigrationData {
  products?: { total: number; migrated: number };
  customers?: { total: number; migrated: number };
  orders?: { total: number; migrated: number };
  settings?: { total: number; migrated: number };
  files?: { total: number; migrated: number };
}

/**
 * Migration options
 */
export interface MigrationOptions {
  includeProducts: boolean;
  includeCustomers: boolean;
  includeOrders: boolean;
  includeAnalytics: boolean;
  includeSettings: boolean;
  includeFiles: boolean;
  overwriteExisting: boolean;
  mappings?: Record<string, string>;
}

/**
 * Tenant activity log
 */
export interface TenantActivityLog {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * Tenant notification
 */
export interface TenantNotification {
  id: string;
  tenantId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: 'system' | 'billing' | 'usage' | 'security' | 'feature';
  title: string;
  message: string;
  actions?: NotificationAction[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  readBy?: string;
  readAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

/**
 * Notification action
 */
export interface NotificationAction {
  label: string;
  url?: string;
  action?: string;
  primary?: boolean;
}

/**
 * API key for tenant
 */
export interface TenantApiKey {
  id: string;
  tenantId: string;
  name: string;
  key: string;
  secret?: string;
  scopes: string[];
  rateLimit?: number;
  ipWhitelist?: string[];
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdBy: string;
  createdAt: Date;
  revokedAt?: Date;
  revokedBy?: string;
  revocationReason?: string;
}