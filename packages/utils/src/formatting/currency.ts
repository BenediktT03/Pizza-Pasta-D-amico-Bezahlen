// Currency formatting utilities

export interface CurrencyConfig {
  code: string;
  symbol: string;
  symbolPosition: 'before' | 'after';
  decimalSeparator: string;
  thousandsSeparator: string;
  decimals: number;
}

// Swiss Franc and Euro configurations
export const currencyConfigs: Record<string, CurrencyConfig> = {
  CHF: {
    code: 'CHF',
    symbol: 'CHF',
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: "'",
    decimals: 2
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    symbolPosition: 'after',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    decimals: 2
  },
  USD: {
    code: 'USD',
    symbol: '$',
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimals: 2
  }
};

/**
 * Format a number as currency
 * @param amount The amount to format
 * @param currency The currency code (CHF, EUR, USD)
 * @param locale Optional locale for formatting
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency: string = 'CHF',
  locale?: string
): string {
  // Use Intl.NumberFormat if locale is provided
  if (locale) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  // Use custom formatting for Swiss style
  const config = currencyConfigs[currency] || currencyConfigs.CHF;
  
  // Round to specified decimals
  const rounded = Math.round(amount * Math.pow(10, config.decimals)) / Math.pow(10, config.decimals);
  
  // Split into integer and decimal parts
  const [integerPart, decimalPart = ''] = rounded.toFixed(config.decimals).split('.');
  
  // Add thousands separators
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, config.thousandsSeparator);
  
  // Combine parts
  const formattedNumber = decimalPart
    ? `${formattedInteger}${config.decimalSeparator}${decimalPart}`
    : formattedInteger;
  
  // Add currency symbol
  if (config.symbolPosition === 'before') {
    return `${config.symbol} ${formattedNumber}`;
  } else {
    return `${formattedNumber} ${config.symbol}`;
  }
}

/**
 * Format currency for Swiss German locale
 * @param amount The amount to format
 * @param currency The currency code
 * @returns Formatted currency string in Swiss German style
 */
export function formatSwissCurrency(amount: number, currency: string = 'CHF'): string {
  return formatCurrency(amount, currency, 'de-CH');
}

/**
 * Parse a currency string to number
 * @param value The currency string to parse
 * @param currency The currency code
 * @returns The numeric value
 */
export function parseCurrency(value: string, currency: string = 'CHF'): number {
  const config = currencyConfigs[currency] || currencyConfigs.CHF;
  
  // Remove currency symbol and whitespace
  let cleaned = value.replace(config.symbol, '').trim();
  
  // Replace decimal separator with dot
  if (config.decimalSeparator !== '.') {
    cleaned = cleaned.replace(config.decimalSeparator, '.');
  }
  
  // Remove thousands separators
  cleaned = cleaned.replace(new RegExp(`\\${config.thousandsSeparator}`, 'g'), '');
  
  // Parse to number
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format a number as a percentage
 * @param value The value to format (0-1 or 0-100)
 * @param decimals Number of decimal places
 * @param isDecimal Whether the input is in decimal form (0-1) or percentage form (0-100)
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number,
  decimals: number = 0,
  isDecimal: boolean = true
): string {
  const percentage = isDecimal ? value * 100 : value;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Calculate price with tax
 * @param amount The base amount
 * @param taxRate The tax rate (as percentage, e.g., 7.7 for 7.7%)
 * @returns Object with base, tax, and total amounts
 */
export function calculateWithTax(
  amount: number,
  taxRate: number
): {
  base: number;
  tax: number;
  total: number;
} {
  const tax = amount * (taxRate / 100);
  const total = amount + tax;
  
  return {
    base: amount,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100
  };
}

/**
 * Calculate price from total including tax
 * @param total The total amount including tax
 * @param taxRate The tax rate (as percentage)
 * @returns Object with base, tax, and total amounts
 */
export function calculateFromTotal(
  total: number,
  taxRate: number
): {
  base: number;
  tax: number;
  total: number;
} {
  const base = total / (1 + taxRate / 100);
  const tax = total - base;
  
  return {
    base: Math.round(base * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: total
  };
}

/**
 * Apply discount to amount
 * @param amount The original amount
 * @param discount The discount (percentage or fixed amount)
 * @param isPercentage Whether the discount is a percentage
 * @returns The discounted amount
 */
export function applyDiscount(
  amount: number,
  discount: number,
  isPercentage: boolean = true
): number {
  if (isPercentage) {
    return Math.round(amount * (1 - discount / 100) * 100) / 100;
  } else {
    return Math.round((amount - discount) * 100) / 100;
  }
}

/**
 * Calculate tips
 * @param amount The bill amount
 * @param tipPercentage The tip percentage
 * @returns Object with tip amount and total
 */
export function calculateTip(
  amount: number,
  tipPercentage: number
): {
  bill: number;
  tip: number;
  total: number;
} {
  const tip = amount * (tipPercentage / 100);
  
  return {
    bill: amount,
    tip: Math.round(tip * 100) / 100,
    total: Math.round((amount + tip) * 100) / 100
  };
}

/**
 * Round to nearest 5 cents (Swiss rounding)
 * @param amount The amount to round
 * @returns The rounded amount
 */
export function roundToNearestFiveCents(amount: number): number {
  return Math.round(amount * 20) / 20;
}

/**
 * Format price range
 * @param min Minimum price
 * @param max Maximum price
 * @param currency Currency code
 * @returns Formatted price range string
 */
export function formatPriceRange(
  min: number,
  max: number | null,
  currency: string = 'CHF'
): string {
  if (max === null || max === min) {
    return formatCurrency(min, currency);
  }
  
  return `${formatCurrency(min, currency)} - ${formatCurrency(max, currency)}`;
}

// Export all currency utilities
export default {
  formatCurrency,
  formatSwissCurrency,
  parseCurrency,
  formatPercentage,
  calculateWithTax,
  calculateFromTotal,
  applyDiscount,
  calculateTip,
  roundToNearestFiveCents,
  formatPriceRange,
  currencyConfigs
};
