/**
 * @eatech/config
 * Centralized configuration management for the Eatech platform
 */

// Export all configuration modules
export * from './app.config';
export * from './firebase.config';
export * from './payment.config';
export * from './features.config';
export * from './locales.config';

// Re-export default configurations
export { default as appConfig } from './app.config';
export { default as firebaseConfig } from './firebase.config';
export { default as paymentConfig } from './payment.config';
export { default as featuresConfig } from './features.config';
export { default as localesConfig } from './locales.config';

// Environment utilities
export const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value || defaultValue || '';
};

export const getEnvBoolean = (key: string, defaultValue: boolean = false): boolean => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
};

export const getEnvNumber = (key: string, defaultValue?: number): number => {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  const parsed = value ? parseInt(value, 10) : defaultValue;
  if (parsed === undefined || isNaN(parsed)) {
    throw new Error(`Environment variable ${key} is not a valid number`);
  }
  return parsed;
};

// Configuration loader
export interface ConfigOptions {
  envFile?: string;
  validateEnv?: boolean;
  throwOnMissing?: boolean;
}

export const loadConfig = (options: ConfigOptions = {}): void => {
  const {
    envFile = '.env',
    validateEnv = true,
    throwOnMissing = true
  } = options;

  // Load environment variables
  if (typeof process !== 'undefined' && process.env) {
    try {
      require('dotenv').config({ path: envFile });
    } catch (error) {
      console.warn('Could not load dotenv:', error);
    }
  }

  // Validate required environment variables
  if (validateEnv) {
    const requiredEnvVars = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID'
    ];

    const missingVars = requiredEnvVars.filter(
      varName => !process.env[varName]
    );

    if (missingVars.length > 0) {
      const message = `Missing required environment variables: ${missingVars.join(', ')}`;
      if (throwOnMissing) {
        throw new Error(message);
      } else {
        console.warn(message);
      }
    }
  }
};

// Configuration validator
export const validateConfig = <T>(
  config: T,
  schema: any // Zod schema
): T => {
  try {
    return schema.parse(config);
  } catch (error) {
    console.error('Configuration validation failed:', error);
    throw error;
  }
};

// Export version
export const version = '1.0.0';
