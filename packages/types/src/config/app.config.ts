/**
 * Application Configuration Types
 * Type definitions for application configuration
 */

import { z } from 'zod';

// Environment types
export type Environment = 'development' | 'test' | 'staging' | 'production';

// Base configuration interface
export interface AppConfig {
  env: Environment;
  app: AppSettings;
  api: ApiSettings;
  auth: AuthSettings;
  database: DatabaseSettings;
  cache: CacheSettings;
  storage: StorageSettings;
  email: EmailSettings;
  sms: SmsSettings;
  push: PushSettings;
  payment: PaymentSettings;
  security: SecuritySettings;
  logging: LoggingSettings;
  monitoring: MonitoringSettings;
  features: FeatureFlags;
  localization: LocalizationSettings;
  performance: PerformanceSettings;
}

// App settings
export interface AppSettings {
  name: string;
  version: string;
  description?: string;
  url: string;
  adminUrl: string;
  apiUrl: string;
  cdnUrl?: string;
  cookieDomain: string;
  timezone: string;
  maintenanceMode: boolean;
  debugMode: boolean;
}

// API settings
export interface ApiSettings {
  baseUrl: string;
  version: string;
  timeout: number; // in milliseconds
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests?: boolean;
  };
  cors: {
    enabled: boolean;
    origins: string[];
    credentials: boolean;
    maxAge?: number;
  };
  pagination: {
    defaultLimit: number;
    maxLimit: number;
  };
  compression: boolean;
  documentation: {
    enabled: boolean;
    url?: string;
  };
}

// Auth settings
export interface AuthSettings {
  providers: AuthProvider[];
  jwt: JwtSettings;
  session: SessionSettings;
  mfa: MfaSettings;
  passwordPolicy: PasswordPolicy;
  oauth: OAuthSettings;
}

// Auth provider
export interface AuthProvider {
  type: 'local' | 'google' | 'facebook' | 'apple' | 'microsoft' | 'saml' | 'oidc';
  enabled: boolean;
  config?: Record<string, any>;
}

// JWT settings
export interface JwtSettings {
  secret: string;
  expiresIn: string; // e.g., '1h', '7d'
  refreshExpiresIn: string;
  algorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
  issuer?: string;
  audience?: string;
}

// Session settings
export interface SessionSettings {
  secret: string;
  name: string;
  maxAge: number; // in milliseconds
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  rolling: boolean;
}

// MFA settings
export interface MfaSettings {
  enabled: boolean;
  required: boolean;
  methods: ('totp' | 'sms' | 'email' | 'backup_codes')[];
  backupCodes: {
    count: number;
    length: number;
  };
}

// Password policy
export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventReuse: number; // number of previous passwords
  expiryDays?: number;
  preventCommon: boolean;
}

// OAuth settings
export interface OAuthSettings {
  google?: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
  };
  facebook?: {
    appId: string;
    appSecret: string;
    redirectUri: string;
    scopes: string[];
  };
  apple?: {
    clientId: string;
    teamId: string;
    keyId: string;
    privateKey: string;
    redirectUri: string;
  };
}

// Database settings
export interface DatabaseSettings {
  type: 'postgres' | 'mysql' | 'mongodb' | 'sqlite';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: {
    enabled: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
  pool?: {
    min: number;
    max: number;
    idle: number;
    acquire: number;
  };
  logging: boolean;
  synchronize: boolean;
  migrations: {
    enabled: boolean;
    path: string;
    runOnStartup: boolean;
  };
}

// Cache settings
export interface CacheSettings {
  type: 'redis' | 'memcached' | 'memory';
  enabled: boolean;
  host?: string;
  port?: number;
  password?: string;
  ttl: number; // default TTL in seconds
  keyPrefix: string;
  maxSize?: number; // for memory cache
}

// Storage settings
export interface StorageSettings {
  type: 'local' | 's3' | 'gcs' | 'azure';
  local?: {
    uploadDir: string;
    publicPath: string;
  };
  s3?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
    endpoint?: string; // for S3-compatible services
  };
  gcs?: {
    projectId: string;
    keyFilename: string;
    bucket: string;
  };
  azure?: {
    accountName: string;
    accountKey: string;
    containerName: string;
  };
  limits: {
    maxFileSize: number; // in bytes
    allowedMimeTypes: string[];
  };
}

// Email settings
export interface EmailSettings {
  provider: 'smtp' | 'sendgrid' | 'mailgun' | 'ses' | 'postmark';
  from: {
    name: string;
    email: string;
  };
  replyTo?: string;
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  sendgrid?: {
    apiKey: string;
  };
  mailgun?: {
    apiKey: string;
    domain: string;
    region?: 'us' | 'eu';
  };
  ses?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
  postmark?: {
    serverToken: string;
  };
  templates: {
    path: string;
    engine: 'handlebars' | 'ejs' | 'pug';
  };
}

// SMS settings
export interface SmsSettings {
  provider: 'twilio' | 'nexmo' | 'sns';
  enabled: boolean;
  from: string;
  twilio?: {
    accountSid: string;
    authToken: string;
    messagingServiceSid?: string;
  };
  nexmo?: {
    apiKey: string;
    apiSecret: string;
  };
  sns?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
}

// Push notification settings
export interface PushSettings {
  enabled: boolean;
  providers: {
    fcm?: {
      serverKey: string;
      senderId: string;
    };
    apns?: {
      keyId: string;
      teamId: string;
      bundleId: string;
      production: boolean;
      cert?: string;
      key?: string;
    };
    webPush?: {
      publicKey: string;
      privateKey: string;
      subject: string;
    };
  };
}

// Payment settings
export interface PaymentSettings {
  currency: 'CHF' | 'EUR';
  taxRate: number; // percentage
  providers: {
    stripe?: {
      publicKey: string;
      secretKey: string;
      webhookSecret: string;
      apiVersion: string;
    };
    twint?: {
      merchantId: string;
      apiKey: string;
      certificatePath?: string;
    };
    paypal?: {
      clientId: string;
      clientSecret: string;
      mode: 'sandbox' | 'live';
    };
  };
  fees: {
    platform: number; // percentage
    processing: number; // percentage
    fixed: number; // fixed amount
  };
}

// Security settings
export interface SecuritySettings {
  encryption: {
    algorithm: string;
    key: string;
    iv?: string;
  };
  hashing: {
    algorithm: 'bcrypt' | 'argon2' | 'scrypt';
    rounds?: number;
    memory?: number;
    parallelism?: number;
  };
  csrf: {
    enabled: boolean;
    secret: string;
    cookieName: string;
  };
  headers: {
    hsts: boolean;
    noSniff: boolean;
    xssProtection: boolean;
    frameOptions: 'DENY' | 'SAMEORIGIN';
  };
  rateLimit: {
    login: {
      points: number;
      duration: number; // in seconds
      blockDuration: number; // in seconds
    };
    api: {
      points: number;
      duration: number;
    };
  };
  allowedHosts: string[];
  trustedProxies: string[];
}

// Logging settings
export interface LoggingSettings {
  level: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  format: 'json' | 'pretty';
  outputs: LogOutput[];
  redactFields: string[];
  slowQueryThreshold?: number; // in milliseconds
}

// Log output
export interface LogOutput {
  type: 'console' | 'file' | 'syslog' | 'http';
  level?: string;
  file?: {
    path: string;
    maxSize: string; // e.g., '10m'
    maxFiles: number;
    compress: boolean;
  };
  syslog?: {
    host: string;
    port: number;
    protocol: 'tcp' | 'udp';
    facility: string;
  };
  http?: {
    url: string;
    headers?: Record<string, string>;
    batchSize?: number;
    flushInterval?: number; // in milliseconds
  };
}

// Monitoring settings
export interface MonitoringSettings {
  enabled: boolean;
  sentry?: {
    dsn: string;
    environment: string;
    tracesSampleRate: number;
    attachStacktrace: boolean;
    beforeSend?: string; // function name
  };
  datadog?: {
    apiKey: string;
    appKey: string;
    site: string;
    service: string;
    env: string;
  };
  newRelic?: {
    licenseKey: string;
    appName: string;
    distributed_tracing: boolean;
  };
  prometheus?: {
    enabled: boolean;
    port: number;
    path: string;
  };
  healthCheck: {
    enabled: boolean;
    path: string;
    interval: number; // in seconds
  };
}

// Feature flags
export interface FeatureFlags {
  multiTenant: boolean;
  multiLocation: boolean;
  voiceOrdering: boolean;
  aiPricing: boolean;
  loyaltyProgram: boolean;
  giftCards: boolean;
  tableReservation: boolean;
  inventoryManagement: boolean;
  kitchenDisplay: boolean;
  customerDisplay: boolean;
  offlineMode: boolean;
  pwa: boolean;
  darkMode: boolean;
  betaFeatures: boolean;
  maintenance: {
    enabled: boolean;
    message?: string;
    allowedIps?: string[];
  };
}

// Localization settings
export interface LocalizationSettings {
  defaultLocale: string;
  supportedLocales: string[];
  fallbackLocale: string;
  autoDetect: boolean;
  loadPath: string;
  saveMissing: boolean;
  updateFiles: boolean;
  dateTimeFormats: Record<string, Intl.DateTimeFormatOptions>;
  numberFormats: Record<string, Intl.NumberFormatOptions>;
}

// Performance settings
export interface PerformanceSettings {
  clustering: {
    enabled: boolean;
    workers?: number; // defaults to CPU count
  };
  caching: {
    pages: boolean;
    api: boolean;
    static: boolean;
    ttl: Record<string, number>;
  };
  optimization: {
    minifyJs: boolean;
    minifyCss: boolean;
    minifyHtml: boolean;
    compressImages: boolean;
    lazyLoading: boolean;
    preload: string[];
    prefetch: string[];
  };
  cdn: {
    enabled: boolean;
    url?: string;
    assets: string[];
  };
}

// Configuration validation schemas
export const environmentSchema = z.enum(['development', 'test', 'staging', 'production']);

export const appSettingsSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  url: z.string().url(),
  adminUrl: z.string().url(),
  apiUrl: z.string().url(),
  cdnUrl: z.string().url().optional(),
  cookieDomain: z.string(),
  timezone: z.string(),
  maintenanceMode: z.boolean(),
  debugMode: z.boolean(),
});

export const databaseSettingsSchema = z.object({
  type: z.enum(['postgres', 'mysql', 'mongodb', 'sqlite']),
  host: z.string(),
  port: z.number(),
  database: z.string(),
  username: z.string(),
  password: z.string(),
  ssl: z.object({
    enabled: z.boolean(),
    ca: z.string().optional(),
    cert: z.string().optional(),
    key: z.string().optional(),
  }).optional(),
  pool: z.object({
    min: z.number(),
    max: z.number(),
    idle: z.number(),
    acquire: z.number(),
  }).optional(),
  logging: z.boolean(),
  synchronize: z.boolean(),
  migrations: z.object({
    enabled: z.boolean(),
    path: z.string(),
    runOnStartup: z.boolean(),
  }),
});

// Configuration loader type
export type ConfigLoader = () => Promise<AppConfig> | AppConfig;

// Configuration validator type
export type ConfigValidator = (config: AppConfig) => boolean | string[];

// Environment-specific configuration
export type EnvironmentConfig = {
  [K in Environment]?: Partial<AppConfig>;
};

// Configuration source
export interface ConfigSource {
  type: 'file' | 'env' | 'remote' | 'database';
  path?: string;
  url?: string;
  priority: number;
}

// Configuration manager interface
export interface ConfigManager {
  load(sources: ConfigSource[]): Promise<AppConfig>;
  validate(config: AppConfig): boolean;
  get<T extends keyof AppConfig>(key: T): AppConfig[T];
  set<T extends keyof AppConfig>(key: T, value: AppConfig[T]): void;
  reload(): Promise<void>;
  watch(callback: (config: AppConfig) => void): () => void;
}
