/**
 * System Event Types
 * Type definitions for system-wide events
 */

import { BaseEvent, EventMetadata } from './order.events';
import { User, UserRole } from '../models/user';
import { Tenant, TenantPlan, TenantStatus } from '../models/tenant';
import { Location } from '../models/location';

// === USER EVENTS ===

// User registered event
export interface UserRegisteredEvent extends BaseEvent {
  type: 'user.registered';
  data: {
    user: User;
    registrationMethod: 'email' | 'social' | 'invite';
    source?: string;
    referrer?: string;
    verificationRequired: boolean;
  };
}

// User verified event
export interface UserVerifiedEvent extends BaseEvent {
  type: 'user.verified';
  data: {
    userId: string;
    verifiedAt: Date;
    verificationType: 'email' | 'phone';
  };
}

// User logged in event
export interface UserLoggedInEvent extends BaseEvent {
  type: 'user.logged_in';
  data: {
    userId: string;
    loginMethod: 'password' | 'social' | 'sso' | 'magic_link';
    device: {
      type: 'mobile' | 'tablet' | 'desktop';
      os?: string;
      browser?: string;
    };
    location?: {
      country?: string;
      city?: string;
      ip: string;
    };
    isFirstLogin: boolean;
  };
}

// User logged out event
export interface UserLoggedOutEvent extends BaseEvent {
  type: 'user.logged_out';
  data: {
    userId: string;
    logoutType: 'manual' | 'timeout' | 'forced';
    sessionDuration: number; // in minutes
  };
}

// User profile updated event
export interface UserProfileUpdatedEvent extends BaseEvent {
  type: 'user.profile_updated';
  data: {
    userId: string;
    updatedFields: string[];
    previousValues?: Record<string, any>;
    currentValues?: Record<string, any>;
  };
}

// User password changed event
export interface UserPasswordChangedEvent extends BaseEvent {
  type: 'user.password_changed';
  data: {
    userId: string;
    changedBy: 'user' | 'admin' | 'system';
    requiresLogout: boolean;
  };
}

// User role changed event
export interface UserRoleChangedEvent extends BaseEvent {
  type: 'user.role_changed';
  data: {
    userId: string;
    previousRole: UserRole;
    newRole: UserRole;
    changedBy: User;
    reason?: string;
  };
}

// User suspended event
export interface UserSuspendedEvent extends BaseEvent {
  type: 'user.suspended';
  data: {
    userId: string;
    suspendedBy: User;
    reason: string;
    suspendedUntil?: Date;
  };
}

// User deleted event
export interface UserDeletedEvent extends BaseEvent {
  type: 'user.deleted';
  data: {
    userId: string;
    deletedBy: 'user' | 'admin' | 'system';
    reason?: string;
    dataRetention: {
      anonymized: boolean;
      retainedData?: string[];
    };
  };
}

// === TENANT EVENTS ===

// Tenant created event
export interface TenantCreatedEvent extends BaseEvent {
  type: 'tenant.created';
  data: {
    tenant: Tenant;
    createdBy: User;
    initialPlan: TenantPlan;
    trialDays?: number;
  };
}

// Tenant updated event
export interface TenantUpdatedEvent extends BaseEvent {
  type: 'tenant.updated';
  data: {
    tenantId: string;
    updatedFields: string[];
    updatedBy: User;
  };
}

// Tenant plan changed event
export interface TenantPlanChangedEvent extends BaseEvent {
  type: 'tenant.plan_changed';
  data: {
    tenantId: string;
    previousPlan: TenantPlan;
    newPlan: TenantPlan;
    changeType: 'upgrade' | 'downgrade';
    effectiveDate: Date;
    changedBy: User;
    reason?: string;
  };
}

// Tenant status changed event
export interface TenantStatusChangedEvent extends BaseEvent {
  type: 'tenant.status_changed';
  data: {
    tenantId: string;
    previousStatus: TenantStatus;
    newStatus: TenantStatus;
    reason: string;
    changedBy: User;
  };
}

// Tenant limit exceeded event
export interface TenantLimitExceededEvent extends BaseEvent {
  type: 'tenant.limit_exceeded';
  data: {
    tenantId: string;
    limitType: 'users' | 'products' | 'orders' | 'storage' | 'api_calls';
    currentUsage: number;
    limit: number;
    action: 'blocked' | 'warned' | 'auto_upgraded';
  };
}

// Tenant trial ending event
export interface TenantTrialEndingEvent extends BaseEvent {
  type: 'tenant.trial_ending';
  data: {
    tenantId: string;
    trialEndsAt: Date;
    daysRemaining: number;
    recommendedPlan?: TenantPlan;
  };
}

// Tenant suspended event
export interface TenantSuspendedEvent extends BaseEvent {
  type: 'tenant.suspended';
  data: {
    tenantId: string;
    reason: 'payment_failed' | 'terms_violation' | 'abuse' | 'request';
    suspendedBy: User;
    suspendedUntil?: Date;
    canReactivate: boolean;
  };
}

// Tenant deleted event
export interface TenantDeletedEvent extends BaseEvent {
  type: 'tenant.deleted';
  data: {
    tenantId: string;
    deletedBy: User;
    reason: string;
    dataArchived: boolean;
    archiveLocation?: string;
  };
}

// === LOCATION EVENTS ===

// Location created event
export interface LocationCreatedEvent extends BaseEvent {
  type: 'location.created';
  data: {
    location: Location;
    createdBy: User;
    isFirstLocation: boolean;
  };
}

// Location updated event
export interface LocationUpdatedEvent extends BaseEvent {
  type: 'location.updated';
  data: {
    locationId: string;
    updatedFields: string[];
    significantChanges?: string[];
    updatedBy: User;
  };
}

// Location opened event
export interface LocationOpenedEvent extends BaseEvent {
  type: 'location.opened';
  data: {
    locationId: string;
    openedAt: Date;
    scheduledOpen?: Date;
    openedBy?: User;
    isAutomatic: boolean;
  };
}

// Location closed event
export interface LocationClosedEvent extends BaseEvent {
  type: 'location.closed';
  data: {
    locationId: string;
    closedAt: Date;
    scheduledClose?: Date;
    closedBy?: User;
    isAutomatic: boolean;
    reason?: string;
  };
}

// Location temporarily closed event
export interface LocationTemporarilyClosedEvent extends BaseEvent {
  type: 'location.temporarily_closed';
  data: {
    locationId: string;
    reason: string;
    closedUntil?: Date;
    affectedOrders?: number;
    notificationsSent: boolean;
  };
}

// === SECURITY EVENTS ===

// Suspicious activity detected event
export interface SuspiciousActivityDetectedEvent extends BaseEvent {
  type: 'security.suspicious_activity';
  data: {
    activityType: 'multiple_failed_logins' | 'unusual_location' | 'rapid_requests' | 'data_scraping';
    userId?: string;
    ipAddress: string;
    details: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    actionTaken?: 'logged' | 'warned' | 'blocked' | 'banned';
  };
}

// Security breach attempt event
export interface SecurityBreachAttemptEvent extends BaseEvent {
  type: 'security.breach_attempt';
  data: {
    attemptType: 'sql_injection' | 'xss' | 'csrf' | 'brute_force' | 'unauthorized_access';
    targetResource?: string;
    attackVector?: string;
    blocked: boolean;
    sourceIp: string;
    userId?: string;
  };
}

// Access denied event
export interface AccessDeniedEvent extends BaseEvent {
  type: 'security.access_denied';
  data: {
    userId?: string;
    resource: string;
    action: string;
    reason: string;
    requiredPermission?: string;
  };
}

// === PAYMENT EVENTS ===

// Payment method added event
export interface PaymentMethodAddedEvent extends BaseEvent {
  type: 'payment.method_added';
  data: {
    userId: string;
    tenantId?: string;
    methodType: string;
    last4?: string;
    brand?: string;
    isDefault: boolean;
  };
}

// Payment failed event
export interface PaymentFailedEvent extends BaseEvent {
  type: 'payment.failed';
  data: {
    paymentId: string;
    orderId?: string;
    amount: number;
    currency: string;
    failureReason: string;
    failureCode?: string;
    willRetry: boolean;
    retryAt?: Date;
  };
}

// Subscription payment failed event
export interface SubscriptionPaymentFailedEvent extends BaseEvent {
  type: 'payment.subscription_failed';
  data: {
    tenantId: string;
    subscriptionId: string;
    amount: number;
    attemptNumber: number;
    nextRetry?: Date;
    willSuspend: boolean;
    suspendAt?: Date;
  };
}

// === SYSTEM EVENTS ===

// System maintenance scheduled event
export interface SystemMaintenanceScheduledEvent extends BaseEvent {
  type: 'system.maintenance_scheduled';
  data: {
    maintenanceId: string;
    startTime: Date;
    endTime: Date;
    affectedServices: string[];
    impactLevel: 'none' | 'minimal' | 'partial' | 'full';
    description: string;
  };
}

// System error event
export interface SystemErrorEvent extends BaseEvent {
  type: 'system.error';
  data: {
    errorCode: string;
    errorMessage: string;
    service: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    stackTrace?: string;
    affectedUsers?: number;
    recoveryAction?: string;
  };
}

// System performance degraded event
export interface SystemPerformanceDegradedEvent extends BaseEvent {
  type: 'system.performance_degraded';
  data: {
    service: string;
    metric: 'response_time' | 'error_rate' | 'throughput' | 'cpu' | 'memory';
    currentValue: number;
    threshold: number;
    duration: number; // in seconds
    impact: string;
  };
}

// Database backup completed event
export interface DatabaseBackupCompletedEvent extends BaseEvent {
  type: 'system.backup_completed';
  data: {
    backupId: string;
    backupType: 'full' | 'incremental' | 'differential';
    size: number; // in bytes
    duration: number; // in seconds
    location: string;
    retention: number; // in days
  };
}

// === INTEGRATION EVENTS ===

// Integration connected event
export interface IntegrationConnectedEvent extends BaseEvent {
  type: 'integration.connected';
  data: {
    tenantId: string;
    integrationType: string;
    integrationName: string;
    connectedBy: User;
    permissions?: string[];
  };
}

// Integration disconnected event
export interface IntegrationDisconnectedEvent extends BaseEvent {
  type: 'integration.disconnected';
  data: {
    tenantId: string;
    integrationType: string;
    integrationName: string;
    disconnectedBy: User;
    reason?: string;
  };
}

// Integration sync completed event
export interface IntegrationSyncCompletedEvent extends BaseEvent {
  type: 'integration.sync_completed';
  data: {
    tenantId: string;
    integrationType: string;
    syncType: 'full' | 'incremental';
    recordsSynced: number;
    duration: number; // in seconds
    errors?: number;
    nextSync?: Date;
  };
}

// === NOTIFICATION EVENTS ===

// Notification sent event
export interface NotificationSentEvent extends BaseEvent {
  type: 'notification.sent';
  data: {
    notificationId: string;
    recipientId: string;
    channel: 'email' | 'sms' | 'push' | 'in_app';
    template: string;
    subject?: string;
    success: boolean;
    error?: string;
  };
}

// Notification bounced event
export interface NotificationBouncedEvent extends BaseEvent {
  type: 'notification.bounced';
  data: {
    notificationId: string;
    recipientId: string;
    channel: 'email' | 'sms';
    bounceType: 'hard' | 'soft';
    reason: string;
    willRetry: boolean;
  };
}

// === ANALYTICS EVENTS ===

// Analytics report generated event
export interface AnalyticsReportGeneratedEvent extends BaseEvent {
  type: 'analytics.report_generated';
  data: {
    reportId: string;
    reportType: string;
    tenantId?: string;
    requestedBy: User;
    parameters: Record<string, any>;
    format: 'pdf' | 'excel' | 'csv';
    size: number; // in bytes
    generationTime: number; // in seconds
  };
}

// Analytics milestone reached event
export interface AnalyticsMilestoneReachedEvent extends BaseEvent {
  type: 'analytics.milestone_reached';
  data: {
    tenantId: string;
    milestoneType: 'orders' | 'revenue' | 'customers' | 'products';
    milestone: number;
    achievedAt: Date;
    previousMilestone?: number;
    timeToReach?: number; // in days
  };
}

// === EVENT TYPE UNION ===

export type SystemEvent =
  // User events
  | UserRegisteredEvent
  | UserVerifiedEvent
  | UserLoggedInEvent
  | UserLoggedOutEvent
  | UserProfileUpdatedEvent
  | UserPasswordChangedEvent
  | UserRoleChangedEvent
  | UserSuspendedEvent
  | UserDeletedEvent
  // Tenant events
  | TenantCreatedEvent
  | TenantUpdatedEvent
  | TenantPlanChangedEvent
  | TenantStatusChangedEvent
  | TenantLimitExceededEvent
  | TenantTrialEndingEvent
  | TenantSuspendedEvent
  | TenantDeletedEvent
  // Location events
  | LocationCreatedEvent
  | LocationUpdatedEvent
  | LocationOpenedEvent
  | LocationClosedEvent
  | LocationTemporarilyClosedEvent
  // Security events
  | SuspiciousActivityDetectedEvent
  | SecurityBreachAttemptEvent
  | AccessDeniedEvent
  // Payment events
  | PaymentMethodAddedEvent
  | PaymentFailedEvent
  | SubscriptionPaymentFailedEvent
  // System events
  | SystemMaintenanceScheduledEvent
  | SystemErrorEvent
  | SystemPerformanceDegradedEvent
  | DatabaseBackupCompletedEvent
  // Integration events
  | IntegrationConnectedEvent
  | IntegrationDisconnectedEvent
  | IntegrationSyncCompletedEvent
  // Notification events
  | NotificationSentEvent
  | NotificationBouncedEvent
  // Analytics events
  | AnalyticsReportGeneratedEvent
  | AnalyticsMilestoneReachedEvent;

// === EVENT HANDLERS ===

export type SystemEventHandler<T extends SystemEvent = SystemEvent> = (event: T) => void | Promise<void>;

// System event emitter interface
export interface SystemEventEmitter {
  emit<T extends SystemEvent>(event: T): void;
  on<T extends SystemEvent>(
    eventType: T['type'],
    handler: SystemEventHandler<T>
  ): () => void;
  off<T extends SystemEvent>(eventType: T['type'], handler: SystemEventHandler<T>): void;
  once<T extends SystemEvent>(
    eventType: T['type'],
    handler: SystemEventHandler<T>
  ): void;
}

// === AUDIT LOG ===

// Audit log entry
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  event: SystemEvent | OrderEvent;
  actor?: {
    id: string;
    type: 'user' | 'system' | 'integration';
    name: string;
  };
  resource?: {
    type: string;
    id: string;
    name?: string;
  };
  changes?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}
