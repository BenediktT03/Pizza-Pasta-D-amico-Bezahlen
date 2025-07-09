/**
 * @eatech/utils
 * Utility functions and helpers for the Eatech platform
 */

// Export all modules
export * from './validation';
export * from './formatting';
export * from './currency';
export * from './date';
export * from './swiss';

// Named exports for convenience
export {
  // Validation
  schemas,
  rules,
  validate
} from './validation';

export {
  // Formatting
  formatCurrency,
  formatDate,
  formatPhone,
  formatSwissCurrency,
  formatSwissPhone
} from './formatting';

export {
  // Currency
  formatCHF,
  parseCHF,
  convertCurrency,
  calculateSwissVAT,
  roundToSwissCash
} from './currency';

export {
  // Date/Time
  toSwissTimezone,
  fromSwissTimezone,
  getSwissTime,
  isOpen,
  getNextOpenTime,
  formatBusinessHours
} from './date';

export {
  // Swiss utilities
  SWISS_CANTONS,
  getCantonByCode,
  generateQRReference,
  validateSwissIBAN,
  SWISS_VAT_RATES,
  calculateVAT
} from './swiss';

// Re-export types
export type {
  // Validation types
  Canton,
  QRBillData,
  VATRate,
  CantonalTaxInfo,
  
  // Date types
  TimeSlot,
  BusinessHours,
  SpecialHours,
  
  // Currency types
  CurrencyConfig
} from './types';

// Type definitions
export interface UtilsConfig {
  defaultCurrency?: string;
  defaultLocale?: string;
  defaultTimezone?: string;
}

// Default configuration
export const defaultConfig: UtilsConfig = {
  defaultCurrency: 'CHF',
  defaultLocale: 'de-CH',
  defaultTimezone: 'Europe/Zurich'
};

// Version
export const version = '1.0.0';
