/**
 * Firebase Configuration Types
 * Type definitions for Firebase configuration
 */

import { z } from 'zod';

// Firebase app configuration
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  databaseURL?: string;
}

// Firebase admin configuration
export interface FirebaseAdminConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
  databaseURL?: string;
  storageBucket?: string;
}

// Firestore configuration
export interface FirestoreConfig {
  settings: FirestoreSettings;
  collections: FirestoreCollections;
  indexes: FirestoreIndex[];
  rules: FirestoreRules;
  backups: BackupConfig;
}

// Firestore settings
export interface FirestoreSettings {
  cacheSizeBytes?: number;
  experimentalAutoDetectLongPolling?: boolean;
  experimentalForceLongPolling?: boolean;
  ignoreUndefinedProperties?: boolean;
  merge?: boolean;
  host?: string;
  ssl?: boolean;
}

// Firestore collections configuration
export interface FirestoreCollections {
  tenants: CollectionConfig;
  users: CollectionConfig;
  products: CollectionConfig;
  orders: CollectionConfig;
  payments: CollectionConfig;
  locations: CollectionConfig;
  customers: CollectionConfig;
  analytics: CollectionConfig;
  audit: CollectionConfig;
}

// Collection configuration
export interface CollectionConfig {
  name: string;
  path: string;
  subcollections?: Record<string, CollectionConfig>;
  schema?: Record<string, FieldConfig>;
  ttl?: number; // in seconds
  sharding?: {
    enabled: boolean;
    shardKey: string;
    shardCount: number;
  };
}

// Field configuration
export interface FieldConfig {
  type: 'string' | 'number' | 'boolean' | 'timestamp' | 'geopoint' | 'reference' | 'array' | 'map';
  required?: boolean;
  indexed?: boolean;
  unique?: boolean;
  default?: any;
  validate?: (value: any) => boolean;
}

// Firestore index
export interface FirestoreIndex {
  collectionGroup: string;
  fields: IndexField[];
  queryScope: 'COLLECTION' | 'COLLECTION_GROUP';
}

// Index field
export interface IndexField {
  fieldPath: string;
  order?: 'ASCENDING' | 'DESCENDING';
  arrayConfig?: 'CONTAINS';
}

// Firestore security rules
export interface FirestoreRules {
  version: number;
  rules: string;
  testSuite?: RuleTest[];
}

// Rule test
export interface RuleTest {
  name: string;
  description?: string;
  resource: string;
  method: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth?: TestAuth;
  expectAllow: boolean;
}

// Test auth context
export interface TestAuth {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  claims?: Record<string, any>;
}

// Firebase Auth configuration
export interface FirebaseAuthConfig {
  providers: AuthProviderConfig[];
  settings: AuthSettings;
  templates: EmailTemplates;
  customClaims: CustomClaimsConfig;
  actions: ActionCodeSettings;
}

// Auth provider configuration
export interface AuthProviderConfig {
  providerId: string;
  enabled: boolean;
  options?: Record<string, any>;
}

// Auth settings
export interface AuthSettings {
  allowMultipleAccountsWithSameEmail: boolean;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumeric: boolean;
    requireNonAlphanumeric: boolean;
  };
  sessionDuration: number; // in seconds
  tokenExpirationTime: number; // in seconds
  phoneAuth?: {
    testPhoneNumbers?: Record<string, string>;
    reCaptchaVerifier?: boolean;
  };
}

// Email templates
export interface EmailTemplates {
  verifyEmail: EmailTemplate;
  resetPassword: EmailTemplate;
  emailChange: EmailTemplate;
  welcomeEmail?: EmailTemplate;
}

// Email template
export interface EmailTemplate {
  subject: string;
  from: string;
  replyTo?: string;
  html?: string;
  text?: string;
  templateId?: string; // for external email services
}

// Custom claims configuration
export interface CustomClaimsConfig {
  namespace?: string;
  claims: ClaimDefinition[];
}

// Claim definition
export interface ClaimDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  source: 'user' | 'tenant' | 'role' | 'custom';
  compute?: (user: any) => any;
}

// Action code settings
export interface ActionCodeSettings {
  url: string;
  handleCodeInApp?: boolean;
  iOS?: {
    bundleId: string;
    appStoreId?: string;
    minimumVersion?: string;
  };
  android?: {
    packageName: string;
    installApp?: boolean;
    minimumVersion?: string;
  };
  dynamicLinkDomain?: string;
}

// Firebase Storage configuration
export interface FirebaseStorageConfig {
  buckets: StorageBucket[];
  rules: StorageRules;
  lifecycle: LifecycleRule[];
}

// Storage bucket
export interface StorageBucket {
  name: string;
  location: string;
  storageClass: 'STANDARD' | 'NEARLINE' | 'COLDLINE' | 'ARCHIVE';
  cors?: CorsConfig[];
  lifecycle?: LifecycleRule[];
  versioning?: boolean;
  encryption?: {
    defaultKmsKeyName?: string;
  };
}

// CORS configuration
export interface CorsConfig {
  origin: string[];
  method: string[];
  responseHeader?: string[];
  maxAgeSeconds?: number;
}

// Lifecycle rule
export interface LifecycleRule {
  action: {
    type: 'Delete' | 'SetStorageClass' | 'AbortIncompleteMultipartUpload';
    storageClass?: string;
  };
  condition: {
    age?: number;
    createdBefore?: string;
    isLive?: boolean;
    matchesStorageClass?: string[];
    numNewerVersions?: number;
  };
}

// Storage rules
export interface StorageRules {
  version: number;
  rules: string;
}

// Firebase Functions configuration
export interface FirebaseFunctionsConfig {
  region: string | string[];
  runtime: 'nodejs18' | 'nodejs20';
  memory: '128MB' | '256MB' | '512MB' | '1GB' | '2GB' | '4GB' | '8GB';
  timeout: number; // in seconds
  maxInstances?: number;
  minInstances?: number;
  vpc?: {
    connector: string;
    egressSettings?: 'PRIVATE_RANGES_ONLY' | 'ALL_TRAFFIC';
  };
  environment?: Record<string, string>;
  secrets?: string[];
}

// Cloud Messaging configuration
export interface FirebaseMessagingConfig {
  vapidKey: string;
  senderId: string;
  defaultNotification?: {
    title?: string;
    body?: string;
    icon?: string;
    badge?: string;
    sound?: string;
    clickAction?: string;
  };
  topics?: MessagingTopic[];
}

// Messaging topic
export interface MessagingTopic {
  name: string;
  description?: string;
  condition?: string;
}

// Remote Config configuration
export interface FirebaseRemoteConfig {
  parameters: RemoteConfigParameter[];
  conditions: RemoteConfigCondition[];
  defaultValues: Record<string, any>;
  fetchTimeout?: number;
  minimumFetchInterval?: number;
}

// Remote config parameter
export interface RemoteConfigParameter {
  key: string;
  defaultValue: any;
  description?: string;
  valueType: 'string' | 'number' | 'boolean' | 'json';
  conditionalValues?: ConditionalValue[];
}

// Conditional value
export interface ConditionalValue {
  condition: string;
  value: any;
}

// Remote config condition
export interface RemoteConfigCondition {
  name: string;
  expression: string;
  tagColor?: string;
}

// Analytics configuration
export interface FirebaseAnalyticsConfig {
  enabled: boolean;
  debugMode?: boolean;
  userProperties: UserProperty[];
  customDimensions: CustomDimension[];
  conversion: ConversionEvent[];
  excludedEvents?: string[];
  sessionTimeout?: number; // in minutes
}

// User property
export interface UserProperty {
  name: string;
  type: 'string' | 'number' | 'boolean';
  description?: string;
}

// Custom dimension
export interface CustomDimension {
  name: string;
  scope: 'EVENT' | 'USER';
  description?: string;
}

// Conversion event
export interface ConversionEvent {
  name: string;
  value?: number;
  currency?: string;
}

// Performance monitoring configuration
export interface FirebasePerformanceConfig {
  enabled: boolean;
  instrumentationEnabled: boolean;
  dataCollectionEnabled: boolean;
  traces: CustomTrace[];
  metrics: CustomMetric[];
  urlPatterns?: UrlPattern[];
}

// Custom trace
export interface CustomTrace {
  name: string;
  metrics: string[];
  attributes?: Record<string, string>;
}

// Custom metric
export interface CustomMetric {
  name: string;
  unit?: string;
  range?: {
    min: number;
    max: number;
  };
}

// URL pattern
export interface UrlPattern {
  pattern: string;
  name: string;
  exclude?: boolean;
}

// Backup configuration
export interface BackupConfig {
  enabled: boolean;
  schedule: string; // cron expression
  retention: number; // in days
  location: string;
  collections?: string[];
  encryption?: boolean;
}

// Emulator configuration
export interface EmulatorConfig {
  auth?: {
    host: string;
    port: number;
  };
  firestore?: {
    host: string;
    port: number;
  };
  database?: {
    host: string;
    port: number;
  };
  functions?: {
    host: string;
    port: number;
  };
  storage?: {
    host: string;
    port: number;
  };
  hosting?: {
    host: string;
    port: number;
  };
  pubsub?: {
    host: string;
    port: number;
  };
  ui?: {
    enabled: boolean;
    host: string;
    port: number;
  };
}

// Configuration validation schemas
export const firebaseConfigSchema = z.object({
  apiKey: z.string(),
  authDomain: z.string(),
  projectId: z.string(),
  storageBucket: z.string(),
  messagingSenderId: z.string(),
  appId: z.string(),
  measurementId: z.string().optional(),
  databaseURL: z.string().optional(),
});

export const firebaseAdminConfigSchema = z.object({
  projectId: z.string(),
  privateKey: z.string(),
  clientEmail: z.string().email(),
  databaseURL: z.string().optional(),
  storageBucket: z.string().optional(),
});

// Helpers
export function validateFirebaseConfig(config: any): config is FirebaseConfig {
  try {
    firebaseConfigSchema.parse(config);
    return true;
  } catch {
    return false;
  }
}

export function getCollectionPath(
  collection: keyof FirestoreCollections,
  tenantId?: string,
  ...segments: string[]
): string {
  const basePath = tenantId ? `tenants/${tenantId}` : '';
  const collectionPath = collection;
  const additionalSegments = segments.join('/');
  
  return [basePath, collectionPath, additionalSegments]
    .filter(Boolean)
    .join('/');
}

export function buildSecurityRules(
  collections: FirestoreCollections,
  multiTenant: boolean = true
): string {
  // This would generate Firestore security rules based on collection config
  // Implementation would be quite complex
  return '';
}
