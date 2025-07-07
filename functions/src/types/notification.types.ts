/**
 * EATECH - Notification Type Definitions
 * Version: 1.0.0
 * Description: Type definitions for notification system
 * Author: EATECH Development Team
 * Created: 2025-01-09
 * File Path: /functions/src/types/notification.types.ts
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum NotificationType {
  // Order notifications
  ORDER_NEW = 'order_new',
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_PREPARING = 'order_preparing',
  ORDER_READY = 'order_ready',
  ORDER_COMPLETED = 'order_completed',
  ORDER_CANCELLED = 'order_cancelled',
  ORDER_REFUNDED = 'order_refunded',
  ORDER_DELAYED = 'order_delayed',
  
  // Payment notifications
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_FAILED = 'payment_failed',
  PAYMENT_REFUNDED = 'payment_refunded',
  
  // Customer notifications
  CUSTOMER_WELCOME = 'customer_welcome',
  CUSTOMER_BIRTHDAY = 'customer_birthday',
  CUSTOMER_MESSAGE = 'customer_message',
  
  // Marketing notifications
  PROMOTION_ACTIVE = 'promotion_active',
  PROMOTION_ENDING = 'promotion_ending',
  NEW_PRODUCT = 'new_product',
  SPECIAL_OFFER = 'special_offer',
  
  // Loyalty notifications
  POINTS_EARNED = 'points_earned',
  POINTS_EXPIRING = 'points_expiring',
  TIER_UPGRADE = 'tier_upgrade',
  REWARD_AVAILABLE = 'reward_available',
  
  // System notifications
  LOW_STOCK = 'low_stock',
  STAFF_ALERT = 'staff_alert',
  SYSTEM_ALERT = 'system_alert',
  MAINTENANCE = 'maintenance',
  
  // Review notifications
  REVIEW_REQUEST = 'review_request',
  REVIEW_RESPONSE = 'review_response',
  
  // Event notifications
  EVENT_REMINDER = 'event_reminder',
  EVENT_UPDATE = 'event_update',
  EVENT_CANCELLED = 'event_cancelled'
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
  WEBHOOK = 'webhook'
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  UNSUBSCRIBED = 'unsubscribed'
}

export enum EmailProvider {
  SENDGRID = 'sendgrid',
  MAILGUN = 'mailgun',
  SES = 'ses',
  SMTP = 'smtp'
}

export enum SMSProvider {
  TWILIO = 'twilio',
  NEXMO = 'nexmo',
  MESSAGEBIRD = 'messagebird',
  SINCH = 'sinch'
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Notification data
 */
export interface NotificationData {
  [key: string]: any;
  orderId?: string;
  orderNumber?: string;
  customerId?: string;
  customerName?: string;
  amount?: number;
  items?: number;
  productName?: string;
  promotionName?: string;
  points?: number;
  message?: string;
  link?: string;
  actionUrl?: string;
  imageUrl?: string;
}

/**
 * Notification
 */
export interface Notification {
  id: string;
  tenantId: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipientId: string;
  recipientType: 'customer' | 'staff' | 'admin';
  recipient: NotificationRecipient;
  subject?: string;
  content: NotificationContent;
  data?: NotificationData;
  priority: NotificationPriority;
  status: NotificationStatus;
  scheduledFor?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  metadata?: NotificationMetadata;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Notification recipient
 */
export interface NotificationRecipient {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  deviceTokens?: string[];
  preferences?: NotificationPreferences;
  timezone?: string;
  language?: string;
}

/**
 * Notification content
 */
export interface NotificationContent {
  title: string;
  body: string;
  html?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  attachments?: NotificationAttachment[];
  actions?: NotificationAction[];
  sound?: string;
  badge?: number;
  icon?: string;
  image?: string;
  color?: string;
}

/**
 * Notification attachment
 */
export interface NotificationAttachment {
  filename: string;
  url?: string;
  content?: string;
  contentType: string;
  size?: number;
}

/**
 * Notification action
 */
export interface NotificationAction {
  id: string;
  title: string;
  url?: string;
  action?: string;
  icon?: string;
  style?: 'default' | 'primary' | 'danger';
  requiresAuth?: boolean;
}

/**
 * Notification metadata
 */
export interface NotificationMetadata {
  campaignId?: string;
  segmentId?: string;
  source?: string;
  tags?: string[];
  tracking?: TrackingData;
  provider?: ProviderData;
}

/**
 * Tracking data
 */
export interface TrackingData {
  opens: number;
  clicks: number;
  conversions: number;
  unsubscribes: number;
  bounces: number;
  complaints: number;
  lastOpenedAt?: Date;
  lastClickedAt?: Date;
  links?: LinkTracking[];
}

/**
 * Link tracking
 */
export interface LinkTracking {
  url: string;
  clicks: number;
  uniqueClicks: number;
  lastClickedAt: Date;
}

/**
 * Provider data
 */
export interface ProviderData {
  provider: string;
  messageId: string;
  status?: string;
  response?: any;
  cost?: number;
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  channels: ChannelPreferences;
  types: TypePreferences;
  quiet_hours?: QuietHours;
  frequency?: FrequencyLimits;
  unsubscribed?: boolean;
  unsubscribedAt?: Date;
}

/**
 * Channel preferences
 */
export interface ChannelPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  in_app: boolean;
}

/**
 * Type preferences
 */
export interface TypePreferences {
  orders: boolean;
  marketing: boolean;
  loyalty: boolean;
  system: boolean;
  reviews: boolean;
  events: boolean;
}

/**
 * Quiet hours
 */
export interface QuietHours {
  enabled: boolean;
  start: string; // HH:mm
  end: string; // HH:mm
  timezone: string;
  days?: number[]; // 0-6 (Sunday-Saturday)
}

/**
 * Frequency limits
 */
export interface FrequencyLimits {
  daily?: number;
  weekly?: number;
  monthly?: number;
  perType?: Record<NotificationType, number>;
}

/**
 * Notification template
 */
export interface NotificationTemplate {
  id: string;
  tenantId: string;
  name: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  content: TemplateContent;
  variables: TemplateVariable[];
  active: boolean;
  version: number;
  isDefault: boolean;
  category?: string;
  tags?: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Template content
 */
export interface TemplateContent {
  text?: string;
  html?: string;
  mjml?: string;
  design?: any; // For visual editors
  components?: TemplateComponent[];
}

/**
 * Template component
 */
export interface TemplateComponent {
  type: 'header' | 'text' | 'button' | 'image' | 'divider' | 'social' | 'footer';
  props: Record<string, any>;
  content?: string;
  children?: TemplateComponent[];
}

/**
 * Template variable
 */
export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  required: boolean;
  defaultValue?: any;
  description?: string;
  format?: string;
}

/**
 * Notification campaign
 */
export interface NotificationCampaign {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: 'immediate' | 'scheduled' | 'triggered' | 'recurring';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  audience: CampaignAudience;
  content: CampaignContent;
  schedule?: CampaignSchedule;
  triggers?: CampaignTrigger[];
  goals?: CampaignGoal[];
  results?: CampaignResults;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Campaign audience
 */
export interface CampaignAudience {
  type: 'all' | 'segment' | 'list' | 'individual';
  segmentId?: string;
  listId?: string;
  recipientIds?: string[];
  filters?: AudienceFilter[];
  estimatedSize?: number;
  testGroup?: TestGroup;
}

/**
 * Audience filter
 */
export interface AudienceFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

/**
 * Test group
 */
export interface TestGroup {
  enabled: boolean;
  percentage: number;
  recipientIds?: string[];
}

/**
 * Campaign content
 */
export interface CampaignContent {
  channels: NotificationChannel[];
  templates: Record<NotificationChannel, string>;
  personalization?: PersonalizationRules;
  abTest?: ABTestConfig;
}

/**
 * Personalization rules
 */
export interface PersonalizationRules {
  enabled: boolean;
  rules: PersonalizationRule[];
}

/**
 * Personalization rule
 */
export interface PersonalizationRule {
  condition: string;
  modifications: Record<string, any>;
}

/**
 * A/B test config
 */
export interface ABTestConfig {
  enabled: boolean;
  variants: TestVariant[];
  winningCriteria: 'open_rate' | 'click_rate' | 'conversion_rate';
  testDuration?: number; // hours
  autoSelectWinner?: boolean;
}

/**
 * Test variant
 */
export interface TestVariant {
  id: string;
  name: string;
  percentage: number;
  templates: Record<NotificationChannel, string>;
}

/**
 * Campaign schedule
 */
export interface CampaignSchedule {
  startDate: Date;
  endDate?: Date;
  timezone: string;
  recurring?: RecurringSchedule;
  quietHours?: boolean;
  optimalTime?: boolean;
}

/**
 * Recurring schedule
 */
export interface RecurringSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  time?: string; // HH:mm
}

/**
 * Campaign trigger
 */
export interface CampaignTrigger {
  event: string;
  conditions?: TriggerCondition[];
  delay?: TriggerDelay;
  frequency?: TriggerFrequency;
}

/**
 * Trigger condition
 */
export interface TriggerCondition {
  field: string;
  operator: string;
  value: any;
}

/**
 * Trigger delay
 */
export interface TriggerDelay {
  amount: number;
  unit: 'minutes' | 'hours' | 'days';
}

/**
 * Trigger frequency
 */
export interface TriggerFrequency {
  max: number;
  per: 'hour' | 'day' | 'week' | 'month';
}

/**
 * Campaign goal
 */
export interface CampaignGoal {
  metric: 'opens' | 'clicks' | 'conversions' | 'revenue';
  target: number;
  deadline?: Date;
}

/**
 * Campaign results
 */
export interface CampaignResults {
  sent: number;
  delivered: number;
  opens: number;
  uniqueOpens: number;
  clicks: number;
  uniqueClicks: number;
  conversions: number;
  revenue: number;
  unsubscribes: number;
  bounces: number;
  complaints: number;
  byChannel: Record<NotificationChannel, ChannelResults>;
  byVariant?: Record<string, VariantResults>;
}

/**
 * Channel results
 */
export interface ChannelResults {
  sent: number;
  delivered: number;
  opens?: number;
  clicks?: number;
  failures: number;
  cost: number;
}

/**
 * Variant results
 */
export interface VariantResults {
  sent: number;
  opens: number;
  clicks: number;
  conversions: number;
  isWinner?: boolean;
}

/**
 * Notification log
 */
export interface NotificationLog {
  id: string;
  notificationId: string;
  action: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed' | 'bounced' | 'unsubscribed';
  timestamp: Date;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

/**
 * Push notification settings
 */
export interface PushNotificationSettings {
  tenantId: string;
  androidSettings?: AndroidSettings;
  iosSettings?: IOSSettings;
  webSettings?: WebPushSettings;
  vapidKeys?: VapidKeys;
}

/**
 * Android settings
 */
export interface AndroidSettings {
  icon: string;
  color: string;
  sound?: string;
  channelId?: string;
  channelName?: string;
  channelDescription?: string;
  priority?: 'default' | 'high';
  vibrationPattern?: number[];
}

/**
 * iOS settings
 */
export interface IOSSettings {
  sound?: string;
  badge?: boolean;
  alert?: boolean;
  criticalAlert?: boolean;
  threadId?: string;
  category?: string;
  interruptionLevel?: 'passive' | 'active' | 'time-sensitive' | 'critical';
}

/**
 * Web push settings
 */
export interface WebPushSettings {
  icon: string;
  badge?: string;
  vibrate?: number[];
  sound?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  renotify?: boolean;
}

/**
 * VAPID keys
 */
export interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

/**
 * SMS settings
 */
export interface SMSSettings {
  tenantId: string;
  provider: SMSProvider;
  senderId?: string;
  prefix?: string;
  suffix?: string;
  shortLinks?: boolean;
  unicode?: boolean;
  testMode?: boolean;
}

/**
 * Email settings
 */
export interface EmailSettings {
  tenantId: string;
  provider: EmailProvider;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  headers?: Record<string, string>;
  footer?: string;
  unsubscribeUrl?: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
  customDomain?: string;
}