/**
 * EATECH - Customer Type Definitions
 * Version: 1.0.0
 * Description: Complete type definitions for customer management
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/types/customer.types.ts
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
  DELETED = 'deleted',
  PENDING_VERIFICATION = 'pending_verification'
}

export enum CustomerType {
  GUEST = 'guest',
  REGISTERED = 'registered',
  VIP = 'vip',
  CORPORATE = 'corporate',
  WHOLESALE = 'wholesale'
}

export enum CustomerSegment {
  NEW = 'new',
  RETURNING = 'returning',
  FREQUENT = 'frequent',
  DORMANT = 'dormant',
  CHURNED = 'churned',
  HIGH_VALUE = 'high_value'
}

export enum PreferenceType {
  DIETARY = 'dietary',
  ALLERGEN = 'allergen',
  COMMUNICATION = 'communication',
  PAYMENT = 'payment',
  DELIVERY = 'delivery'
}

export enum CommunicationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WHATSAPP = 'whatsapp',
  NONE = 'none'
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say'
}

// ============================================================================
// CUSTOMER INTERFACES
// ============================================================================

export interface Customer {
  id: string;
  tenantId: string;
  status: CustomerStatus;
  type: CustomerType;
  segment?: CustomerSegment;
  profile: CustomerProfile;
  contact: CustomerContact;
  preferences: CustomerPreferences;
  addresses: CustomerAddress[];
  paymentMethods: CustomerPaymentMethod[];
  stats: CustomerStats;
  loyalty?: CustomerLoyalty;
  consent: CustomerConsent;
  tags: string[];
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date;
  deletedAt?: Date;
}

export interface CustomerProfile {
  firstName: string;
  lastName: string;
  displayName?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  avatar?: string;
  language: string;
  timezone: string;
  company?: string;
  vatId?: string;
}

export interface CustomerContact {
  email: string;
  emailVerified: boolean;
  phone?: string;
  phoneVerified: boolean;
  whatsapp?: string;
  alternativeEmail?: string;
  alternativePhone?: string;
}

export interface CustomerAddress {
  id: string;
  type: 'billing' | 'delivery' | 'both';
  isDefault: boolean;
  name: string;
  company?: string;
  street: string;
  streetNumber: string;
  additionalLine?: string;
  postalCode: string;
  city: string;
  state?: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  instructions?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerPaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'twint' | 'invoice' | 'sepa';
  isDefault: boolean;
  provider: string;
  details: {
    last4?: string;
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
    email?: string;
    iban?: string;
    accountHolder?: string;
  };
  billingAddress?: CustomerAddress;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerPreferences {
  dietary: DietaryPreference[];
  allergens: string[];
  favoriteProducts: string[];
  communicationChannels: CommunicationChannel[];
  marketingOptIn: boolean;
  notificationSettings: NotificationSettings;
  orderSettings: OrderSettings;
  privacySettings: PrivacySettings;
}

export interface DietaryPreference {
  type: 'vegetarian' | 'vegan' | 'gluten_free' | 'lactose_free' | 'halal' | 'kosher' | 'other';
  strictness: 'strict' | 'flexible' | 'preferred';
  notes?: string;
}

export interface NotificationSettings {
  orderUpdates: boolean;
  promotions: boolean;
  newsletter: boolean;
  productUpdates: boolean;
  systemNotifications: boolean;
  frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm
    end: string; // HH:mm
  };
}

export interface OrderSettings {
  defaultPaymentMethodId?: string;
  defaultDeliveryAddressId?: string;
  preferredDeliveryTime?: string;
  specialInstructions?: string;
  autoReorder?: {
    enabled: boolean;
    frequency?: 'weekly' | 'biweekly' | 'monthly';
    items?: string[];
  };
}

export interface PrivacySettings {
  dataCollection: boolean;
  analytics: boolean;
  thirdPartySharing: boolean;
  locationTracking: boolean;
  personalizedAds: boolean;
}

export interface CustomerStats {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate?: Date;
  firstOrderDate?: Date;
  favoriteCategory?: string;
  favoriteProduct?: string;
  orderFrequency?: number; // orders per month
  lifetimeValue: number;
  churnRisk?: number; // 0-100
  satisfactionScore?: number; // 0-100
}

export interface CustomerLoyalty {
  programId: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
  pointsExpiring?: {
    amount: number;
    date: Date;
  };
  lifetimePoints: number;
  memberSince: Date;
  benefits: LoyaltyBenefit[];
  history: LoyaltyTransaction[];
}

export interface LoyaltyBenefit {
  id: string;
  type: 'discount' | 'free_product' | 'free_delivery' | 'early_access' | 'birthday_reward';
  name: string;
  description: string;
  value?: number;
  expiresAt?: Date;
  usedAt?: Date;
}

export interface LoyaltyTransaction {
  id: string;
  type: 'earned' | 'redeemed' | 'expired' | 'adjusted';
  points: number;
  description: string;
  orderId?: string;
  createdAt: Date;
}

export interface CustomerConsent {
  termsAccepted: boolean;
  termsAcceptedAt?: Date;
  privacyPolicyAccepted: boolean;
  privacyPolicyAcceptedAt?: Date;
  marketingConsent: boolean;
  marketingConsentAt?: Date;
  dataProcessingConsent: boolean;
  dataProcessingConsentAt?: Date;
  cookieConsent?: {
    necessary: boolean;
    analytics: boolean;
    marketing: boolean;
    consentedAt: Date;
  };
}

// ============================================================================
// CUSTOMER ACTIVITY & BEHAVIOR
// ============================================================================

export interface CustomerActivity {
  customerId: string;
  tenantId: string;
  type: ActivityType;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  deviceInfo?: DeviceInfo;
  location?: LocationInfo;
  timestamp: Date;
}

export enum ActivityType {
  ACCOUNT = 'account',
  ORDER = 'order',
  BROWSE = 'browse',
  SEARCH = 'search',
  CART = 'cart',
  REVIEW = 'review',
  SUPPORT = 'support',
  REFERRAL = 'referral'
}

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
  deviceId?: string;
  appVersion?: string;
}

export interface LocationInfo {
  ip?: string;
  country?: string;
  city?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// ============================================================================
// CUSTOMER COMMUNICATION
// ============================================================================

export interface CustomerMessage {
  id: string;
  customerId: string;
  tenantId: string;
  channel: CommunicationChannel;
  type: MessageType;
  subject?: string;
  content: string;
  templateId?: string;
  variables?: Record<string, any>;
  status: MessageStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  clickedLinks?: string[];
  error?: string;
  metadata?: Record<string, any>;
}

export enum MessageType {
  TRANSACTIONAL = 'transactional',
  MARKETING = 'marketing',
  NOTIFICATION = 'notification',
  REMINDER = 'reminder',
  SURVEY = 'survey'
}

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  UNSUBSCRIBED = 'unsubscribed'
}

// ============================================================================
// CUSTOMER FEEDBACK
// ============================================================================

export interface CustomerFeedback {
  id: string;
  customerId: string;
  tenantId: string;
  type: FeedbackType;
  orderId?: string;
  productId?: string;
  rating: number; // 1-5
  title?: string;
  comment?: string;
  images?: string[];
  response?: {
    message: string;
    respondedBy: string;
    respondedAt: Date;
  };
  helpful?: {
    yes: number;
    no: number;
  };
  verified: boolean;
  featured: boolean;
  tags?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  createdAt: Date;
  updatedAt: Date;
}

export enum FeedbackType {
  ORDER = 'order',
  PRODUCT = 'product',
  SERVICE = 'service',
  DELIVERY = 'delivery',
  APP = 'app',
  GENERAL = 'general'
}

// ============================================================================
// CUSTOMER SUPPORT
// ============================================================================

export interface CustomerTicket {
  id: string;
  customerId: string;
  tenantId: string;
  orderId?: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: string;
  messages: TicketMessage[];
  attachments?: string[];
  resolution?: {
    summary: string;
    resolvedBy: string;
    resolvedAt: Date;
  };
  satisfaction?: {
    rating: number;
    comment?: string;
    ratedAt: Date;
  };
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}

export enum TicketCategory {
  ORDER_ISSUE = 'order_issue',
  PAYMENT_PROBLEM = 'payment_problem',
  DELIVERY_ISSUE = 'delivery_issue',
  PRODUCT_QUALITY = 'product_quality',
  TECHNICAL_SUPPORT = 'technical_support',
  ACCOUNT_HELP = 'account_help',
  REFUND_REQUEST = 'refund_request',
  OTHER = 'other'
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum TicketStatus {
  NEW = 'new',
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_CUSTOMER = 'waiting_customer',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export interface TicketMessage {
  id: string;
  sender: 'customer' | 'support' | 'system';
  senderName: string;
  message: string;
  attachments?: string[];
  internal: boolean;
  createdAt: Date;
}

// ============================================================================
// CUSTOMER IMPORT/EXPORT
// ============================================================================

export interface CustomerImportData {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface CustomerExportData extends Customer {
  orderCount: number;
  totalSpent: number;
  lastOrderDate?: Date;
  tags: string[];
  customFields?: Record<string, any>;
}   