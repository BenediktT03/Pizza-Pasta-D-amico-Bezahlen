import { z } from 'zod';
import { AppConfig } from '@eatech/types';

// Environment detection
export const getEnvironment = (): 'development' | 'staging' | 'production' => {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'development';
};

// App configuration schema
export const appConfigSchema = z.object({
  name: z.string().default('Eatech'),
  version: z.string().default('1.0.0'),
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  
  api: z.object({
    baseUrl: z.string().url(),
    timeout: z.number().default(30000),
    retries: z.number().default(3),
    version: z.string().default('v1')
  }),
  
  app: z.object({
    defaultLanguage: z.enum(['de', 'fr', 'it', 'en']).default('de'),
    defaultCurrency: z.enum(['CHF', 'EUR']).default('CHF'),
    defaultTimezone: z.string().default('Europe/Zurich'),
    dateFormat: z.string().default('dd.MM.yyyy'),
    timeFormat: z.string().default('HH:mm'),
    weekStartsOn: z.number().min(0).max(6).default(1) // Monday
  }),
  
  features: z.object({
    multiTenant: z.boolean().default(true),
    voiceOrdering: z.boolean().default(true),
    aiPricing: z.boolean().default(true),
    inventory: z.boolean().default(true),
    loyalty: z.boolean().default(true),
    analytics: z.boolean().default(true),
    marketing: z.boolean().default(true),
    reporting: z.boolean().default(true)
  }),
  
  limits: z.object({
    maxFileSize: z.number().default(10 * 1024 * 1024), // 10MB
    maxImageSize: z.number().default(5 * 1024 * 1024), // 5MB
    maxOrderItems: z.number().default(100),
    maxOrderAmount: z.number().default(10000),
    maxDeliveryRadius: z.number().default(20), // km
    sessionTimeout: z.number().default(30 * 60 * 1000), // 30 minutes
    otpValidityDuration: z.number().default(5 * 60 * 1000) // 5 minutes
  }),
  
  cache: z.object({
    enabled: z.boolean().default(true),
    ttl: z.number().default(60 * 60), // 1 hour in seconds
    maxSize: z.number().default(100) // Max items
  }),
  
  security: z.object({
    enableCSRF: z.boolean().default(true),
    enableRateLimit: z.boolean().default(true),
    maxLoginAttempts: z.number().default(5),
    lockoutDuration: z.number().default(15 * 60 * 1000), // 15 minutes
    passwordMinLength: z.number().default(8),
    passwordRequireUppercase: z.boolean().default(true),
    passwordRequireLowercase: z.boolean().default(true),
    passwordRequireNumbers: z.boolean().default(true),
    passwordRequireSpecial: z.boolean().default(true),
    sessionSecure: z.boolean().default(true),
    sameSite: z.enum(['strict', 'lax', 'none']).default('strict')
  }),
  
  urls: z.object({
    web: z.string().url(),
    admin: z.string().url(),
    master: z.string().url(),
    kitchen: z.string().url(),
    landing: z.string().url(),
    api: z.string().url(),
    cdn: z.string().url().optional(),
    docs: z.string().url().optional()
  }),
  
  contact: z.object({
    supportEmail: z.string().email(),
    supportPhone: z.string(),
    businessEmail: z.string().email(),
    businessPhone: z.string(),
    address: z.object({
      street: z.string(),
      city: z.string(),
      postalCode: z.string(),
      canton: z.string(),
      country: z.string().default('CH')
    })
  }),
  
  legal: z.object({
    companyName: z.string(),
    vatNumber: z.string(),
    registrationNumber: z.string(),
    termsUrl: z.string().url(),
    privacyUrl: z.string().url(),
    imprintUrl: z.string().url(),
    cookiePolicyUrl: z.string().url()
  }),
  
  social: z.object({
    facebook: z.string().url().optional(),
    instagram: z.string().url().optional(),
    twitter: z.string().url().optional(),
    linkedin: z.string().url().optional(),
    youtube: z.string().url().optional()
  }).optional(),
  
  seo: z.object({
    defaultTitle: z.string(),
    titleTemplate: z.string().default('%s | Eatech'),
    defaultDescription: z.string(),
    defaultKeywords: z.array(z.string()),
    defaultImage: z.string().url().optional(),
    twitterHandle: z.string().optional(),
    googleSiteVerification: z.string().optional(),
    bingSiteVerification: z.string().optional()
  }),
  
  analytics: z.object({
    googleAnalytics: z.string().optional(),
    plausible: z.object({
      domain: z.string().optional(),
      apiHost: z.string().url().optional()
    }).optional(),
    posthog: z.object({
      apiKey: z.string().optional(),
      apiHost: z.string().url().optional()
    }).optional(),
    sentry: z.object({
      dsn: z.string().optional(),
      environment: z.string().optional(),
      tracesSampleRate: z.number().min(0).max(1).default(0.1)
    }).optional()
  })
});

// Default app configuration
export const defaultAppConfig: AppConfig = {
  name: 'Eatech',
  version: '1.0.0',
  environment: getEnvironment(),
  
  api: {
    baseUrl: process.env.VITE_API_URL || 'https://api.eatech.ch',
    timeout: 30000,
    retries: 3,
    version: 'v1'
  },
  
  app: {
    defaultLanguage: 'de',
    defaultCurrency: 'CHF',
    defaultTimezone: 'Europe/Zurich',
    dateFormat: 'dd.MM.yyyy',
    timeFormat: 'HH:mm',
    weekStartsOn: 1
  },
  
  features: {
    multiTenant: true,
    voiceOrdering: true,
    aiPricing: true,
    inventory: true,
    loyalty: true,
    analytics: true,
    marketing: true,
    reporting: true
  },
  
  limits: {
    maxFileSize: 10 * 1024 * 1024,
    maxImageSize: 5 * 1024 * 1024,
    maxOrderItems: 100,
    maxOrderAmount: 10000,
    maxDeliveryRadius: 20,
    sessionTimeout: 30 * 60 * 1000,
    otpValidityDuration: 5 * 60 * 1000
  },
  
  cache: {
    enabled: true,
    ttl: 3600,
    maxSize: 100
  },
  
  security: {
    enableCSRF: true,
    enableRateLimit: true,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000,
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecial: true,
    sessionSecure: true,
    sameSite: 'strict'
  },
  
  urls: {
    web: process.env.VITE_WEB_URL || 'https://eatech.ch',
    admin: process.env.VITE_ADMIN_URL || 'https://admin.eatech.ch',
    master: process.env.VITE_MASTER_URL || 'https://master.eatech.ch',
    kitchen: process.env.VITE_KITCHEN_URL || 'https://kitchen.eatech.ch',
    landing: process.env.VITE_LANDING_URL || 'https://www.eatech.ch',
    api: process.env.VITE_API_URL || 'https://api.eatech.ch',
    cdn: process.env.VITE_CDN_URL,
    docs: process.env.VITE_DOCS_URL || 'https://docs.eatech.ch'
  },
  
  contact: {
    supportEmail: 'support@eatech.ch',
    supportPhone: '+41 44 123 45 67',
    businessEmail: 'hello@eatech.ch',
    businessPhone: '+41 44 123 45 68',
    address: {
      street: 'Bahnhofstrasse 1',
      city: 'Zürich',
      postalCode: '8001',
      canton: 'ZH',
      country: 'CH'
    }
  },
  
  legal: {
    companyName: 'Eatech AG',
    vatNumber: 'CHE-123.456.789',
    registrationNumber: 'CH-020.3.123.456-7',
    termsUrl: 'https://eatech.ch/terms',
    privacyUrl: 'https://eatech.ch/privacy',
    imprintUrl: 'https://eatech.ch/imprint',
    cookiePolicyUrl: 'https://eatech.ch/cookies'
  },
  
  social: {
    facebook: 'https://facebook.com/eatech',
    instagram: 'https://instagram.com/eatech',
    linkedin: 'https://linkedin.com/company/eatech',
    twitter: 'https://twitter.com/eatech'
  },
  
  seo: {
    defaultTitle: 'Eatech - Digital Restaurant Platform',
    titleTemplate: '%s | Eatech',
    defaultDescription: 'Die führende digitale Restaurantplattform in der Schweiz. Bestellen Sie online, per App oder Sprachbefehl.',
    defaultKeywords: ['restaurant', 'online bestellen', 'food delivery', 'schweiz', 'digital menu'],
    defaultImage: 'https://eatech.ch/og-image.jpg',
    twitterHandle: '@eatech'
  },
  
  analytics: {
    googleAnalytics: process.env.VITE_GA_ID,
    plausible: {
      domain: process.env.VITE_PLAUSIBLE_DOMAIN,
      apiHost: process.env.VITE_PLAUSIBLE_HOST
    },
    sentry: {
      dsn: process.env.VITE_SENTRY_DSN,
      environment: getEnvironment(),
      tracesSampleRate: 0.1
    }
  }
};

// Get app configuration
export const getAppConfig = (): AppConfig => {
  try {
    return appConfigSchema.parse(defaultAppConfig);
  } catch (error) {
    console.error('Invalid app configuration:', error);
    return defaultAppConfig;
  }
};

// Export default
export default getAppConfig();
