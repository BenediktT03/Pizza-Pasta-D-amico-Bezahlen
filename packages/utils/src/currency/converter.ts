/**
 * Currency conversion utilities
 */

// Exchange rate cache
interface ExchangeRateCache {
  rates: Record<string, number>;
  lastUpdated: Date;
  baseCurrency: string;
}

let rateCache: ExchangeRateCache | null = null;

// Mock exchange rates (in production, these would come from an API)
const MOCK_RATES: Record<string, Record<string, number>> = {
  CHF: {
    CHF: 1.0,
    EUR: 1.03,
    USD: 1.10,
    GBP: 1.25
  },
  EUR: {
    EUR: 1.0,
    CHF: 0.97,
    USD: 1.07,
    GBP: 1.21
  },
  USD: {
    USD: 1.0,
    CHF: 0.91,
    EUR: 0.93,
    GBP: 1.13
  },
  GBP: {
    GBP: 1.0,
    CHF: 0.80,
    EUR: 0.83,
    USD: 0.88
  }
};

/**
 * Convert amount between currencies
 * @param amount The amount to convert
 * @param fromCurrency The source currency
 * @param toCurrency The target currency
 * @param customRate Optional custom exchange rate
 * @returns The converted amount
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  customRate?: number
): Promise<number> {
  if (fromCurrency === toCurrency) return amount;
  
  // Use custom rate if provided
  if (customRate) {
    return amount * customRate;
  }
  
  // Get exchange rate
  const rate = await getExchangeRate(fromCurrency, toCurrency);
  return amount * rate;
}

/**
 * Convert amount between currencies synchronously
 * @param amount The amount to convert
 * @param fromCurrency The source currency
 * @param toCurrency The target currency
 * @param customRate Optional custom exchange rate
 * @returns The converted amount
 */
export function convertCurrencySync(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  customRate?: number
): number {
  if (fromCurrency === toCurrency) return amount;
  
  // Use custom rate if provided
  if (customRate) {
    return amount * customRate;
  }
  
  // Use mock rates for sync conversion
  const fromRates = MOCK_RATES[fromCurrency];
  if (!fromRates || !fromRates[toCurrency]) {
    throw new Error(`Exchange rate not available for ${fromCurrency} to ${toCurrency}`);
  }
  
  return amount * fromRates[toCurrency];
}

/**
 * Get exchange rate between two currencies
 * @param fromCurrency The source currency
 * @param toCurrency The target currency
 * @returns The exchange rate
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) return 1;
  
  // In production, this would fetch from an API
  // For now, use mock rates
  const fromRates = MOCK_RATES[fromCurrency];
  if (!fromRates || !fromRates[toCurrency]) {
    throw new Error(`Exchange rate not available for ${fromCurrency} to ${toCurrency}`);
  }
  
  return fromRates[toCurrency];
}

/**
 * Get all available exchange rates for a currency
 * @param baseCurrency The base currency
 * @returns Object with all exchange rates
 */
export async function getAllExchangeRates(
  baseCurrency: string
): Promise<Record<string, number>> {
  // In production, this would fetch from an API
  return MOCK_RATES[baseCurrency] || {};
}

/**
 * Format amount with multiple currencies
 * @param amount The amount in base currency
 * @param baseCurrency The base currency
 * @param targetCurrencies Array of target currencies to show
 * @returns Array of formatted amounts
 */
export async function formatMultiCurrency(
  amount: number,
  baseCurrency: string,
  targetCurrencies: string[]
): Promise<Array<{ currency: string; amount: number; formatted: string }>> {
  const results = [];
  
  for (const currency of targetCurrencies) {
    const convertedAmount = await convertCurrency(amount, baseCurrency, currency);
    
    results.push({
      currency,
      amount: convertedAmount,
      formatted: new Intl.NumberFormat('de-CH', {
        style: 'currency',
        currency: currency
      }).format(convertedAmount)
    });
  }
  
  return results;
}

/**
 * Calculate currency conversion with fees
 * @param amount The amount to convert
 * @param fromCurrency The source currency
 * @param toCurrency The target currency
 * @param feePercentage The conversion fee percentage
 * @returns Object with conversion details
 */
export async function calculateConversionWithFees(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  feePercentage: number = 0
): Promise<{
  originalAmount: number;
  convertedAmount: number;
  fee: number;
  totalAmount: number;
  exchangeRate: number;
}> {
  const rate = await getExchangeRate(fromCurrency, toCurrency);
  const convertedAmount = amount * rate;
  const fee = convertedAmount * (feePercentage / 100);
  const totalAmount = convertedAmount - fee;
  
  return {
    originalAmount: amount,
    convertedAmount,
    fee,
    totalAmount,
    exchangeRate: rate
  };
}

/**
 * Get historical exchange rate (mock implementation)
 * @param fromCurrency The source currency
 * @param toCurrency The target currency
 * @param date The date for the rate
 * @returns The historical exchange rate
 */
export async function getHistoricalRate(
  fromCurrency: string,
  toCurrency: string,
  date: Date
): Promise<number> {
  // In production, this would fetch historical data
  // For now, return current rate with small variation
  const currentRate = await getExchangeRate(fromCurrency, toCurrency);
  const daysSinceToday = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  const variation = 1 + (Math.sin(daysSinceToday) * 0.02); // ±2% variation
  
  return currentRate * variation;
}

/**
 * Currency conversion calculator with rounding
 * @param amount The amount to convert
 * @param fromCurrency The source currency
 * @param toCurrency The target currency
 * @param roundingPrecision Number of decimal places
 * @returns The converted and rounded amount
 */
export async function convertAndRound(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  roundingPrecision: number = 2
): Promise<number> {
  const converted = await convertCurrency(amount, fromCurrency, toCurrency);
  const factor = Math.pow(10, roundingPrecision);
  
  return Math.round(converted * factor) / factor;
}

/**
 * Validate currency code
 * @param currencyCode The currency code to validate
 * @returns Whether the currency code is valid
 */
export function isValidCurrencyCode(currencyCode: string): boolean {
  // ISO 4217 currency codes are 3 uppercase letters
  if (!/^[A-Z]{3}$/.test(currencyCode)) return false;
  
  // Check against known currencies
  const knownCurrencies = ['CHF', 'EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK'];
  return knownCurrencies.includes(currencyCode);
}

/**
 * Get currency symbol
 * @param currencyCode The currency code
 * @returns The currency symbol
 */
export function getCurrencySymbol(currencyCode: string): string {
  const symbols: Record<string, string> = {
    CHF: 'CHF',
    EUR: '€',
    USD: '$',
    GBP: '£',
    JPY: '¥',
    CAD: 'C$',
    AUD: 'A$',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr'
  };
  
  return symbols[currencyCode] || currencyCode;
}

/**
 * Get currency name
 * @param currencyCode The currency code
 * @param locale The locale for the name
 * @returns The currency name
 */
export function getCurrencyName(
  currencyCode: string,
  locale: string = 'en'
): string {
  try {
    const formatter = new Intl.DisplayNames([locale], { type: 'currency' });
    return formatter.of(currencyCode) || currencyCode;
  } catch {
    // Fallback names
    const names: Record<string, string> = {
      CHF: 'Swiss Franc',
      EUR: 'Euro',
      USD: 'US Dollar',
      GBP: 'British Pound',
      JPY: 'Japanese Yen',
      CAD: 'Canadian Dollar',
      AUD: 'Australian Dollar',
      SEK: 'Swedish Krona',
      NOK: 'Norwegian Krone',
      DKK: 'Danish Krone'
    };
    
    return names[currencyCode] || currencyCode;
  }
}

// Export all currency converter utilities
export default {
  convertCurrency,
  convertCurrencySync,
  getExchangeRate,
  getAllExchangeRates,
  formatMultiCurrency,
  calculateConversionWithFees,
  getHistoricalRate,
  convertAndRound,
  isValidCurrencyCode,
  getCurrencySymbol,
  getCurrencyName
};
