/**
 * EATECH V3.0 - AI Configuration
 * Zentrale Konfiguration für alle AI Services
 * Swiss Standards: FADP konform, Multi-Language Support
 */

import { z } from 'zod';

// Environment Schema mit Validation
const aiConfigSchema = z.object({
  // OpenAI Configuration
  openai: z.object({
    apiKey: z.string().min(1, 'OpenAI API Key ist erforderlich'),
    baseURL: z.string().url().default('https://api.openai.com/v1'),
    model: z.string().default('gpt-4-turbo'),
    maxTokens: z.number().default(2048),
    temperature: z.number().min(0).max(2).default(0.7),
    timeout: z.number().default(30000), // 30 seconds
    retries: z.number().default(3),
    organization: z.string().optional(),
  }),

  // Swiss Language Support
  languages: z.object({
    default: z.enum(['de-CH', 'fr-CH', 'it-CH', 'en-US']).default('de-CH'),
    supported: z.array(z.enum(['de-CH', 'fr-CH', 'it-CH', 'en-US'])).default([
      'de-CH', 'fr-CH', 'it-CH', 'en-US'
    ]),
    swissGerman: z.boolean().default(true), // Schweizerdeutsch Support
  }),

  // Emergency Detection & Response
  emergency: z.object({
    enabled: z.boolean().default(true),
    confidenceThreshold: z.number().min(0).max(1).default(0.85),
    maxResponseTime: z.number().default(5000), // 5 seconds
    fallbackActions: z.array(z.string()).default([
      'increase_staff',
      'adjust_prices',
      'modify_menu',
      'notify_management'
    ]),
    alertChannels: z.array(z.enum(['email', 'sms', 'webhook', 'slack'])).default(['email', 'sms']),
  }),

  // Price Optimization AI
  pricing: z.object({
    enabled: z.boolean().default(true),
    elasticityModel: z.string().default('demand-based'),
    updateFrequency: z.number().default(3600000), // 1 hour in ms
    maxPriceChange: z.number().min(0).max(1).default(0.20), // Max 20% change
    minProfitMargin: z.number().min(0).max(1).default(0.30), // Min 30% margin
    swissPricingRules: z.object({
      roundToCHF: z.boolean().default(true), // Round to .00, .50, .90
      vatIncluded: z.boolean().default(true), // 7.7% MWST included
      priceDisplay: z.enum(['gross', 'net']).default('gross'),
    }),
  }),

  // Demand Forecasting
  forecasting: z.object({
    enabled: z.boolean().default(true),
    horizonDays: z.number().min(1).max(30).default(7),
    weatherIntegration: z.boolean().default(true),
    eventIntegration: z.boolean().default(true),
    swissHolidays: z.boolean().default(true),
    modelUpdateFrequency: z.number().default(86400000), // 24 hours
    minDataPoints: z.number().default(30),
  }),

  // Voice Commerce AI
  voice: z.object({
    enabled: z.boolean().default(true),
    wakeWords: z.array(z.string()).default(['hey eatech', 'hoi eatech']),
    languages: z.array(z.string()).default(['de-CH', 'fr-CH', 'it-CH', 'en-US']),
    confidenceThreshold: z.number().min(0).max(1).default(0.8),
    maxSessionLength: z.number().default(300000), // 5 minutes
    swissGermanDialects: z.array(z.string()).default([
      'bernese', 'zurich', 'basel', 'aargau'
    ]),
    emotionDetection: z.boolean().default(true),
  }),

  // Wait Time Prediction
  waitTime: z.object({
    enabled: z.boolean().default(true),
    predictionWindow: z.number().default(900000), // 15 minutes
    accuracyTarget: z.number().min(0).max(1).default(0.90),
    factorsConsidered: z.array(z.string()).default([
      'current_queue',
      'kitchen_capacity',
      'staff_count',
      'order_complexity',
      'weather',
      'time_of_day'
    ]),
    swissTimePunctuality: z.boolean().default(true), // Swiss precision timing
  }),

  // Menu Optimization AI
  menu: z.object({
    enabled: z.boolean().default(true),
    optimizationCriteria: z.array(z.string()).default([
      'profitability',
      'popularity',
      'preparation_time',
      'ingredient_availability'
    ]),
    swissCuisinePreference: z.boolean().default(true),
    localIngredients: z.boolean().default(true),
    seasonalAdaptation: z.boolean().default(true),
  }),

  // Customer Insights
  insights: z.object({
    enabled: z.boolean().default(true),
    privacyMode: z.enum(['strict', 'balanced', 'permissive']).default('strict'),
    anonymization: z.boolean().default(true),
    dataRetentionDays: z.number().default(365), // FADP compliance
    swissPrivacyCompliance: z.boolean().default(true),
    gdprCompliance: z.boolean().default(true),
  }),

  // Performance & Caching
  performance: z.object({
    cacheEnabled: z.boolean().default(true),
    cacheTTL: z.number().default(300000), // 5 minutes
    batchProcessing: z.boolean().default(true),
    maxBatchSize: z.number().default(100),
    rateLimiting: z.object({
      enabled: z.boolean().default(true),
      requestsPerMinute: z.number().default(60),
      burstLimit: z.number().default(10),
    }),
  }),

  // Monitoring & Logging
  monitoring: z.object({
    enabled: z.boolean().default(true),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    metricsCollection: z.boolean().default(true),
    errorTracking: z.boolean().default(true),
    performanceTracking: z.boolean().default(true),
    swissDataCenter: z.boolean().default(true), // Data stays in Switzerland
  }),

  // Swiss Regional Settings
  regional: z.object({
    timezone: z.string().default('Europe/Zurich'),
    currency: z.string().default('CHF'),
    locale: z.string().default('de-CH'),
    dateFormat: z.string().default('DD.MM.YYYY'),
    timeFormat: z.string().default('HH:mm'),
    numberFormat: z.string().default('1\'234.56'), // Swiss number format
    cantons: z.array(z.string()).default([
      'AG', 'AI', 'AR', 'BE', 'BL', 'BS', 'FR', 'GE', 'GL', 'GR',
      'JU', 'LU', 'NE', 'NW', 'OW', 'SG', 'SH', 'SO', 'SZ', 'TG',
      'TI', 'UR', 'VD', 'VS', 'ZG', 'ZH'
    ]),
  }),
});

// Default Configuration
const defaultConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2048'),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000'),
    retries: parseInt(process.env.OPENAI_RETRIES || '3'),
    organization: process.env.OPENAI_ORGANIZATION,
  },
  languages: {
    default: (process.env.DEFAULT_LANGUAGE as any) || 'de-CH',
    supported: ['de-CH', 'fr-CH', 'it-CH', 'en-US'] as const,
    swissGerman: process.env.SWISS_GERMAN_SUPPORT !== 'false',
  },
  emergency: {
    enabled: process.env.AI_EMERGENCY_ENABLED !== 'false',
    confidenceThreshold: parseFloat(process.env.EMERGENCY_CONFIDENCE_THRESHOLD || '0.85'),
    maxResponseTime: parseInt(process.env.EMERGENCY_MAX_RESPONSE_TIME || '5000'),
    fallbackActions: ['increase_staff', 'adjust_prices', 'modify_menu', 'notify_management'],
    alertChannels: ['email', 'sms'] as const,
  },
  pricing: {
    enabled: process.env.AI_PRICING_ENABLED !== 'false',
    elasticityModel: process.env.PRICING_ELASTICITY_MODEL || 'demand-based',
    updateFrequency: parseInt(process.env.PRICING_UPDATE_FREQUENCY || '3600000'),
    maxPriceChange: parseFloat(process.env.MAX_PRICE_CHANGE || '0.20'),
    minProfitMargin: parseFloat(process.env.MIN_PROFIT_MARGIN || '0.30'),
    swissPricingRules: {
      roundToCHF: process.env.ROUND_TO_CHF !== 'false',
      vatIncluded: process.env.VAT_INCLUDED !== 'false',
      priceDisplay: (process.env.PRICE_DISPLAY as any) || 'gross',
    },
  },
  forecasting: {
    enabled: process.env.AI_FORECASTING_ENABLED !== 'false',
    horizonDays: parseInt(process.env.FORECAST_HORIZON_DAYS || '7'),
    weatherIntegration: process.env.WEATHER_INTEGRATION !== 'false',
    eventIntegration: process.env.EVENT_INTEGRATION !== 'false',
    swissHolidays: process.env.SWISS_HOLIDAYS !== 'false',
    modelUpdateFrequency: parseInt(process.env.MODEL_UPDATE_FREQUENCY || '86400000'),
    minDataPoints: parseInt(process.env.MIN_DATA_POINTS || '30'),
  },
  voice: {
    enabled: process.env.AI_VOICE_ENABLED !== 'false',
    wakeWords: ['hey eatech', 'hoi eatech'],
    languages: ['de-CH', 'fr-CH', 'it-CH', 'en-US'],
    confidenceThreshold: parseFloat(process.env.VOICE_CONFIDENCE_THRESHOLD || '0.8'),
    maxSessionLength: parseInt(process.env.VOICE_MAX_SESSION_LENGTH || '300000'),
    swissGermanDialects: ['bernese', 'zurich', 'basel', 'aargau'],
    emotionDetection: process.env.VOICE_EMOTION_DETECTION !== 'false',
  },
  waitTime: {
    enabled: process.env.AI_WAIT_TIME_ENABLED !== 'false',
    predictionWindow: parseInt(process.env.WAIT_TIME_PREDICTION_WINDOW || '900000'),
    accuracyTarget: parseFloat(process.env.WAIT_TIME_ACCURACY_TARGET || '0.90'),
    factorsConsidered: [
      'current_queue',
      'kitchen_capacity',
      'staff_count',
      'order_complexity',
      'weather',
      'time_of_day'
    ],
    swissTimePunctuality: process.env.SWISS_TIME_PUNCTUALITY !== 'false',
  },
  menu: {
    enabled: process.env.AI_MENU_ENABLED !== 'false',
    optimizationCriteria: [
      'profitability',
      'popularity',
      'preparation_time',
      'ingredient_availability'
    ],
    swissCuisinePreference: process.env.SWISS_CUISINE_PREFERENCE !== 'false',
    localIngredients: process.env.LOCAL_INGREDIENTS !== 'false',
    seasonalAdaptation: process.env.SEASONAL_ADAPTATION !== 'false',
  },
  insights: {
    enabled: process.env.AI_INSIGHTS_ENABLED !== 'false',
    privacyMode: (process.env.PRIVACY_MODE as any) || 'strict',
    anonymization: process.env.ANONYMIZATION !== 'false',
    dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || '365'),
    swissPrivacyCompliance: process.env.SWISS_PRIVACY_COMPLIANCE !== 'false',
    gdprCompliance: process.env.GDPR_COMPLIANCE !== 'false',
  },
  performance: {
    cacheEnabled: process.env.AI_CACHE_ENABLED !== 'false',
    cacheTTL: parseInt(process.env.AI_CACHE_TTL || '300000'),
    batchProcessing: process.env.AI_BATCH_PROCESSING !== 'false',
    maxBatchSize: parseInt(process.env.AI_MAX_BATCH_SIZE || '100'),
    rateLimiting: {
      enabled: process.env.AI_RATE_LIMITING_ENABLED !== 'false',
      requestsPerMinute: parseInt(process.env.AI_REQUESTS_PER_MINUTE || '60'),
      burstLimit: parseInt(process.env.AI_BURST_LIMIT || '10'),
    },
  },
  monitoring: {
    enabled: process.env.AI_MONITORING_ENABLED !== 'false',
    logLevel: (process.env.AI_LOG_LEVEL as any) || 'info',
    metricsCollection: process.env.AI_METRICS_COLLECTION !== 'false',
    errorTracking: process.env.AI_ERROR_TRACKING !== 'false',
    performanceTracking: process.env.AI_PERFORMANCE_TRACKING !== 'false',
    swissDataCenter: process.env.SWISS_DATA_CENTER !== 'false',
  },
  regional: {
    timezone: process.env.TIMEZONE || 'Europe/Zurich',
    currency: process.env.CURRENCY || 'CHF',
    locale: process.env.LOCALE || 'de-CH',
    dateFormat: process.env.DATE_FORMAT || 'DD.MM.YYYY',
    timeFormat: process.env.TIME_FORMAT || 'HH:mm',
    numberFormat: process.env.NUMBER_FORMAT || "1'234.56",
    cantons: [
      'AG', 'AI', 'AR', 'BE', 'BL', 'BS', 'FR', 'GE', 'GL', 'GR',
      'JU', 'LU', 'NE', 'NW', 'OW', 'SG', 'SH', 'SO', 'SZ', 'TG',
      'TI', 'UR', 'VD', 'VS', 'ZG', 'ZH'
    ],
  },
};

// Type definitions
export type AIConfig = z.infer<typeof aiConfigSchema>;
export type Language = 'de-CH' | 'fr-CH' | 'it-CH' | 'en-US';
export type Canton = typeof defaultConfig.regional.cantons[number];

// Configuration validation and export
let config: AIConfig;

try {
  config = aiConfigSchema.parse(defaultConfig);
} catch (error) {
  console.error('❌ AI Configuration validation failed:', error);
  throw new Error('AI Configuration ist ungültig. Überprüfen Sie die Umgebungsvariablen.');
}

// Configuration getters with type safety
export const getAIConfig = (): AIConfig => config;
export const getOpenAIConfig = () => config.openai;
export const getLanguageConfig = () => config.languages;
export const getEmergencyConfig = () => config.emergency;
export const getPricingConfig = () => config.pricing;
export const getForecastingConfig = () => config.forecasting;
export const getVoiceConfig = () => config.voice;
export const getWaitTimeConfig = () => config.waitTime;
export const getMenuConfig = () => config.menu;
export const getInsightsConfig = () => config.insights;
export const getPerformanceConfig = () => config.performance;
export const getMonitoringConfig = () => config.monitoring;
export const getRegionalConfig = () => config.regional;

// Helper functions for Swiss-specific features
export const formatSwissPrice = (price: number): string => {
  const { numberFormat, currency } = config.regional;
  if (numberFormat === "1'234.56") {
    return `${currency} ${price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "'")}`;
  }
  return `${currency} ${price.toFixed(2)}`;
};

export const roundToSwissPricing = (price: number): number => {
  if (!config.pricing.swissPricingRules.roundToCHF) return price;

  // Swiss pricing convention: .00, .50, .90
  const decimal = price % 1;
  const base = Math.floor(price);

  if (decimal <= 0.25) return base;
  if (decimal <= 0.70) return base + 0.50;
  return base + 0.90;
};

export const getSupportedLanguages = (): Language[] => {
  return config.languages.supported;
};

export const getDefaultLanguage = (): Language => {
  return config.languages.default;
};

export const isSwissGermanEnabled = (): boolean => {
  return config.languages.swissGerman;
};

// Export validated configuration
export default config;

// Configuration change listener for hot reloading in development
if (process.env.NODE_ENV === 'development') {
  process.on('SIGHUP', () => {
    console.log('🔄 Reloading AI configuration...');
    try {
      delete require.cache[__filename];
      console.log('✅ AI configuration reloaded successfully');
    } catch (error) {
      console.error('❌ Failed to reload AI configuration:', error);
    }
  });
}
