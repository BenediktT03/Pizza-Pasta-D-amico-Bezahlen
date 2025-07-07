/**
 * EATECH - Environment Configuration
 * Version: 1.0.0
 * Description: Environment-specific configuration and settings
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/config/environment.ts
 */

import * as functions from 'firebase-functions';
import * as dotenv from 'dotenv';
import { SYSTEM } from './constants';

// Load environment variables from .env file in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================

export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test'
}

/**
 * Gets the current environment
 */
export function getEnvironment(): Environment {
  const env = process.env.NODE_ENV || process.env.FUNCTIONS_ENV || 'development';
  
  switch (env.toLowerCase()) {
    case 'production':
    case 'prod':
      return Environment.PRODUCTION;
    case 'staging':
    case 'stage':
      return Environment.STAGING;
    case 'test':
    case 'testing':
      return Environment.TEST;
    default:
      return Environment.DEVELOPMENT;
  }
}

/**
 * Checks if running in production
 */
export function isProduction(): boolean {
  return getEnvironment() === Environment.PRODUCTION;
}

/**
 * Checks if running in development
 */
export function isDevelopment(): boolean {
  return getEnvironment() === Environment.DEVELOPMENT;
}

/**
 * Checks if running in test environment
 */
export function isTest(): boolean {
  return getEnvironment() === Environment.TEST;
}

/**
 * Checks if running in Firebase emulator
 */
export function isEmulator(): boolean {
  return process.env.FUNCTIONS_EMULATOR === 'true';
}

// ============================================================================
// CONFIGURATION INTERFACE
// ============================================================================

export interface EnvironmentConfig {
  // Environment
  environment: Environment;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
  isEmulator: boolean;
  
  // Firebase
  firebase: {
    projectId: string;
    databaseURL: string;
    storageBucket: string;
    region: string;
    apiKey?: string;
    authDomain?: string;
    messagingSenderId?: string;
    appId?: string;
  };
  
  // APIs
  apis: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    rateLimitPerMinute: number;
  };
  
  // Authentication
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
    refreshTokenExpiresIn: string;
    bcryptRounds: number;
    sessionDuration: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
  
  // Payment providers
  payment: {
    stripe: {
      secretKey: string;
      publishableKey: string;
      webhookSecret: string;
      apiVersion: string;
    };
    twint: {
      merchantId?: string;
      apiKey?: string;
      apiSecret?: string;
    };
  };
  
  // Communication services
  communication: {
    sendgrid: {
      apiKey: string;
      fromEmail: string;
      fromName: string;
      templatePath: string;
    };
    twilio: {
      accountSid: string;
      authToken: string;
      fromNumber: string;
      messagingServiceSid?: string;
    };
    fcm: {
      serverKey: string;
      senderId: string;
    };
  };
  
  // Storage
  storage: {
    cdn: {
      enabled: boolean;
      baseUrl: string;
      cacheDuration: number;
    };
    backup: {
      enabled: boolean;
      schedule: string;
      retention: number;
    };
  };
  
  // Monitoring
  monitoring: {
    sentry: {
      enabled: boolean;
      dsn?: string;
      environment: string;
      tracesSampleRate: number;
    };
    googleAnalytics: {
      enabled: boolean;
      measurementId?: string;
    };
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
  
  // Features
  features: {
    maintenance: boolean;
    registrationEnabled: boolean;
    orderingEnabled: boolean;
    paymentsEnabled: boolean;
    analyticsEnabled: boolean;
    aiEnabled: boolean;
    debugMode: boolean;
  };
  
  // Security
  security: {
    corsOrigins: string[];
    trustedProxies: string[];
    encryptionKey: string;
    apiKeyHeader: string;
    maxRequestSize: string;
    rateLimiting: boolean;
  };
  
  // Performance
  performance: {
    enableCaching: boolean;
    cacheTTL: number;
    compressionEnabled: boolean;
    minificationEnabled: boolean;
  };
}

// ============================================================================
// ENVIRONMENT CONFIGURATIONS
// ============================================================================

/**
 * Development configuration
 */
const developmentConfig: Partial<EnvironmentConfig> = {
  apis: {
    baseUrl: 'http://localhost:5001',
    timeout: 30000,
    retryAttempts: 1,
    rateLimitPerMinute: 1000
  },
  auth: {
    bcryptRounds: 10,
    maxLoginAttempts: 10,
    lockoutDuration: 5 * 60 * 1000 // 5 minutes
  },
  monitoring: {
    logLevel: 'debug',
    sentry: {
      enabled: false,
      environment: 'development',
      tracesSampleRate: 1.0
    }
  },
  features: {
    debugMode: true,
    maintenance: false
  },
  security: {
    corsOrigins: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    rateLimiting: false
  },
  performance: {
    enableCaching: false,
    minificationEnabled: false
  }
};

/**
 * Staging configuration
 */
const stagingConfig: Partial<EnvironmentConfig> = {
  apis: {
    baseUrl: 'https://staging-api.eatech.ch',
    timeout: 20000,
    retryAttempts: 2,
    rateLimitPerMinute: 500
  },
  auth: {
    bcryptRounds: 12,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000 // 15 minutes
  },
  monitoring: {
    logLevel: 'info',
    sentry: {
      enabled: true,
      environment: 'staging',
      tracesSampleRate: 0.5
    }
  },
  features: {
    debugMode: true,
    maintenance: false
  },
  security: {
    corsOrigins: ['https://staging.eatech.ch', 'https://staging-admin.eatech.ch'],
    rateLimiting: true
  },
  performance: {
    enableCaching: true,
    minificationEnabled: true
  }
};

/**
 * Production configuration
 */
const productionConfig: Partial<EnvironmentConfig> = {
  apis: {
    baseUrl: 'https://api.eatech.ch',
    timeout: 15000,
    retryAttempts: 3,
    rateLimitPerMinute: 300
  },
  auth: {
    bcryptRounds: 14,
    maxLoginAttempts: 3,
    lockoutDuration: 30 * 60 * 1000 // 30 minutes
  },
  monitoring: {
    logLevel: 'warn',
    sentry: {
      enabled: true,
      environment: 'production',
      tracesSampleRate: 0.1
    }
  },
  features: {
    debugMode: false,
    maintenance: false
  },
  security: {
    corsOrigins: ['https://eatech.ch', 'https://www.eatech.ch', 'https://admin.eatech.ch'],
    rateLimiting: true
  },
  performance: {
    enableCaching: true,
    minificationEnabled: true
  }
};

/**
 * Test configuration
 */
const testConfig: Partial<EnvironmentConfig> = {
  apis: {
    baseUrl: 'http://localhost:5001',
    timeout: 5000,
    retryAttempts: 0,
    rateLimitPerMinute: 10000
  },
  auth: {
    bcryptRounds: 4, // Fast for testing
    maxLoginAttempts: 100,
    lockoutDuration: 0
  },
  monitoring: {
    logLevel: 'error',
    sentry: {
      enabled: false,
      environment: 'test',
      tracesSampleRate: 0
    }
  },
  features: {
    debugMode: true,
    maintenance: false
  },
  security: {
    corsOrigins: ['*'],
    rateLimiting: false
  },
  performance: {
    enableCaching: false,
    minificationEnabled: false
  }
};

// ============================================================================
// CONFIGURATION BUILDER
// ============================================================================

/**
 * Gets configuration value from Firebase Functions config or environment variables
 */
function getConfigValue(key: string, defaultValue?: any): any {
  // Try Firebase Functions config first
  const keys = key.split('.');
  let value: any = functions.config();
  
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) break;
  }
  
  // Fallback to environment variable
  if (value === undefined) {
    const envKey = key.toUpperCase().replace(/\./g, '_');
    value = process.env[envKey];
  }
  
  return value !== undefined ? value : defaultValue;
}

/**
 * Builds the complete environment configuration
 */
export function buildConfig(): EnvironmentConfig {
  const env = getEnvironment();
  
  // Select base configuration based on environment
  let envConfig: Partial<EnvironmentConfig>;
  switch (env) {
    case Environment.PRODUCTION:
      envConfig = productionConfig;
      break;
    case Environment.STAGING:
      envConfig = stagingConfig;
      break;
    case Environment.TEST:
      envConfig = testConfig;
      break;
    default:
      envConfig = developmentConfig;
  }
  
  // Build complete configuration
  const config: EnvironmentConfig = {
    // Environment
    environment: env,
    isProduction: isProduction(),
    isDevelopment: isDevelopment(),
    isTest: isTest(),
    isEmulator: isEmulator(),
    
    // Firebase
    firebase: {
      projectId: getConfigValue('firebase.project_id', 'eatech-foodtruck'),
      databaseURL: getConfigValue('firebase.database_url', 'https://eatech-foodtruck-default-rtdb.europe-west1.firebasedatabase.app'),
      storageBucket: getConfigValue('firebase.storage_bucket', 'eatech-foodtruck.firebasestorage.app'),
      region: getConfigValue('firebase.region', 'europe-west1'),
      apiKey: getConfigValue('firebase.api_key'),
      authDomain: getConfigValue('firebase.auth_domain'),
      messagingSenderId: getConfigValue('firebase.messaging_sender_id'),
      appId: getConfigValue('firebase.app_id')
    },
    
    // APIs
    apis: {
      baseUrl: envConfig.apis?.baseUrl || 'http://localhost:5001',
      timeout: envConfig.apis?.timeout || 30000,
      retryAttempts: envConfig.apis?.retryAttempts || 3,
      rateLimitPerMinute: envConfig.apis?.rateLimitPerMinute || 300
    },
    
    // Authentication
    auth: {
      jwtSecret: getConfigValue('auth.jwt_secret', 'dev-secret-change-in-production'),
      jwtExpiresIn: getConfigValue('auth.jwt_expires_in', '24h'),
      refreshTokenExpiresIn: getConfigValue('auth.refresh_token_expires_in', '30d'),
      bcryptRounds: envConfig.auth?.bcryptRounds || 12,
      sessionDuration: getConfigValue('auth.session_duration', 24 * 60 * 60 * 1000),
      maxLoginAttempts: envConfig.auth?.maxLoginAttempts || 5,
      lockoutDuration: envConfig.auth?.lockoutDuration || 30 * 60 * 1000
    },
    
    // Payment providers
    payment: {
      stripe: {
        secretKey: getConfigValue('stripe.secret_key', ''),
        publishableKey: getConfigValue('stripe.publishable_key', ''),
        webhookSecret: getConfigValue('stripe.webhook_secret', ''),
        apiVersion: getConfigValue('stripe.api_version', '2023-10-16')
      },
      twint: {
        merchantId: getConfigValue('twint.merchant_id'),
        apiKey: getConfigValue('twint.api_key'),
        apiSecret: getConfigValue('twint.api_secret')
      }
    },
    
    // Communication services
    communication: {
      sendgrid: {
        apiKey: getConfigValue('sendgrid.api_key', ''),
        fromEmail: getConfigValue('sendgrid.from_email', 'noreply@eatech.ch'),
        fromName: getConfigValue('sendgrid.from_name', 'EATECH'),
        templatePath: getConfigValue('sendgrid.template_path', 'templates/email')
      },
      twilio: {
        accountSid: getConfigValue('twilio.account_sid', ''),
        authToken: getConfigValue('twilio.auth_token', ''),
        fromNumber: getConfigValue('twilio.from_number', ''),
        messagingServiceSid: getConfigValue('twilio.messaging_service_sid')
      },
      fcm: {
        serverKey: getConfigValue('fcm.server_key', ''),
        senderId: getConfigValue('fcm.sender_id', '')
      }
    },
    
    // Storage
    storage: {
      cdn: {
        enabled: getConfigValue('storage.cdn.enabled', false),
        baseUrl: getConfigValue('storage.cdn.base_url', ''),
        cacheDuration: getConfigValue('storage.cdn.cache_duration', 86400)
      },
      backup: {
        enabled: getConfigValue('storage.backup.enabled', true),
        schedule: getConfigValue('storage.backup.schedule', '0 3 * * *'),
        retention: getConfigValue('storage.backup.retention', 30)
      }
    },
    
    // Monitoring
    monitoring: {
      sentry: {
        enabled: envConfig.monitoring?.sentry?.enabled || false,
        dsn: getConfigValue('sentry.dsn'),
        environment: envConfig.monitoring?.sentry?.environment || env,
        tracesSampleRate: envConfig.monitoring?.sentry?.tracesSampleRate || 0.1
      },
      googleAnalytics: {
        enabled: getConfigValue('analytics.enabled', true),
        measurementId: getConfigValue('analytics.measurement_id')
      },
      logLevel: envConfig.monitoring?.logLevel || 'info'
    },
    
    // Features
    features: {
      maintenance: getConfigValue('features.maintenance', false),
      registrationEnabled: getConfigValue('features.registration_enabled', true),
      orderingEnabled: getConfigValue('features.ordering_enabled', true),
      paymentsEnabled: getConfigValue('features.payments_enabled', true),
      analyticsEnabled: getConfigValue('features.analytics_enabled', true),
      aiEnabled: getConfigValue('features.ai_enabled', true),
      debugMode: envConfig.features?.debugMode || false
    },
    
    // Security
    security: {
      corsOrigins: envConfig.security?.corsOrigins || ['*'],
      trustedProxies: getConfigValue('security.trusted_proxies', '').split(',').filter(Boolean),
      encryptionKey: getConfigValue('security.encryption_key', ''),
      apiKeyHeader: getConfigValue('security.api_key_header', 'X-API-Key'),
      maxRequestSize: getConfigValue('security.max_request_size', '10mb'),
      rateLimiting: envConfig.security?.rateLimiting !== false
    },
    
    // Performance
    performance: {
      enableCaching: envConfig.performance?.enableCaching !== false,
      cacheTTL: getConfigValue('performance.cache_ttl', 3600),
      compressionEnabled: envConfig.performance?.compressionEnabled !== false,
      minificationEnabled: envConfig.performance?.minificationEnabled !== false
    }
  };
  
  return config;
}

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================

/**
 * Validates the configuration
 */
export function validateConfig(config: EnvironmentConfig): void {
  const errors: string[] = [];
  
  // Check required values for production
  if (config.isProduction) {
    if (!config.auth.jwtSecret || config.auth.jwtSecret === 'dev-secret-change-in-production') {
      errors.push('JWT secret must be set in production');
    }
    
    if (!config.payment.stripe.secretKey) {
      errors.push('Stripe secret key must be set in production');
    }
    
    if (!config.communication.sendgrid.apiKey) {
      errors.push('SendGrid API key must be set in production');
    }
    
    if (!config.communication.twilio.accountSid || !config.communication.twilio.authToken) {
      errors.push('Twilio credentials must be set in production');
    }
    
    if (!config.security.encryptionKey) {
      errors.push('Encryption key must be set in production');
    }
  }
  
  // Throw error if validation fails
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

// ============================================================================
// CONFIGURATION INSTANCE
// ============================================================================

// Build and validate configuration
const config = buildConfig();

// Only validate in non-test environments
if (!isTest()) {
  validateConfig(config);
}

// Export the configuration
export const CONFIG = config;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Gets a specific configuration value
 */
export function getConfig<K extends keyof EnvironmentConfig>(key: K): EnvironmentConfig[K] {
  return CONFIG[key];
}

/**
 * Updates configuration (for testing purposes only)
 */
export function updateConfig(updates: Partial<EnvironmentConfig>): void {
  if (!isTest()) {
    throw new Error('Configuration can only be updated in test environment');
  }
  
  Object.assign(CONFIG, updates);
}

/**
 * Resets configuration to default (for testing purposes only)
 */
export function resetConfig(): void {
  if (!isTest()) {
    throw new Error('Configuration can only be reset in test environment');
  }
  
  const newConfig = buildConfig();
  Object.keys(CONFIG).forEach(key => {
    delete (CONFIG as any)[key];
  });
  Object.assign(CONFIG, newConfig);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  Environment,
  CONFIG,
  getEnvironment,
  isProduction,
  isDevelopment,
  isTest,
  isEmulator,
  buildConfig,
  validateConfig,
  getConfig,
  updateConfig,
  resetConfig
};