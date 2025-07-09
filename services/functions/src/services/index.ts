// Export all services for easy import
export { analyticsService } from './analytics.service';
export { featureFlagService } from './feature-flags.service';
export { notificationService } from './notification.service';
export { paymentService } from './payment.service';
export { orderService } from './order.service';
export { hacppService } from './haccp.service';
export { aiService } from './ai.service';
export { tenantService } from './tenant.service';
export { locationService } from './location.service';
export { inventoryService } from './inventory.service';

// Re-export types that services use
export type {
  FeatureFlag,
  FeatureContext,
  FeatureStatus
} from './feature-flags.service';

export type {
  NotificationPayload,
  EscalationStep
} from './notification.service';

export type {
  CreatePaymentParams,
  RefundParams
} from './payment.service';

export type {
  CreateOrderParams,
  OrderUpdate
} from './order.service';

export type {
  SensorReading,
  DigitalSignature
} from './haccp.service';

export type {
  VoiceOrderParams,
  DynamicPricingParams,
  ChatParams,
  PredictionParams
} from './ai.service';

export type {
  CreateTenantParams,
  TenantOnboardingStatus
} from './tenant.service';

export type {
  CreateLocationParams,
  NearbySearchParams,
  LocationUpdate
} from './location.service';

export type {
  UpdateInventoryParams,
  InventoryAlertConfig,
  InventoryPrediction
} from './inventory.service';
