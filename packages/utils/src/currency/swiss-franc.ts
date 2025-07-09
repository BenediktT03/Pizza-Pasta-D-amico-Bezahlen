/**
 * Swiss Franc (CHF) specific utilities
 */

// Swiss Franc denominations
export const CHF_COINS = [0.05, 0.10, 0.20, 0.50, 1.00, 2.00, 5.00];
export const CHF_NOTES = [10, 20, 50, 100, 200, 1000];

// Swiss VAT rates
export const SWISS_VAT_RATES = {
  standard: 8.1,      // Standard rate (as of 2024)
  reduced: 2.6,       // Reduced rate (food, books, newspapers)
  lodging: 3.8,       // Special rate for lodging
  exempt: 0          // Exempt items
};

/**
 * Round to nearest 5 cents (Swiss cash rounding)
 * @param amount The amount to round
 * @returns The rounded amount
 */
export function roundToSwissCash(amount: number): number {
  return Math.round(amount * 20) / 20;
}

/**
 * Calculate change for Swiss Franc payment
 * @param amountPaid The amount paid
 * @param amountDue The amount due
 * @returns Object with change amount and denomination breakdown
 */
export function calculateSwissChange(
  amountPaid: number,
  amountDue: number
): {
  changeAmount: number;
  denominations: Array<{ value: number; count: number; type: 'note' | 'coin' }>;
} {
  const roundedDue = roundToSwissCash(amountDue);
  const changeAmount = amountPaid - roundedDue;
  
  if (changeAmount < 0) {
    return {
      changeAmount: 0,
      denominations: []
    };
  }
  
  const denominations: Array<{ value: number; count: number; type: 'note' | 'coin' }> = [];
  let remainingChange = changeAmount;
  
  // Process notes first (from largest to smallest)
  for (let i = CHF_NOTES.length - 1; i >= 0; i--) {
    const note = CHF_NOTES[i];
    const count = Math.floor(remainingChange / note);
    
    if (count > 0) {
      denominations.push({ value: note, count, type: 'note' });
      remainingChange -= note * count;
    }
  }
  
  // Process coins (from largest to smallest)
  for (let i = CHF_COINS.length - 1; i >= 0; i--) {
    const coin = CHF_COINS[i];
    const count = Math.floor(remainingChange / coin);
    
    if (count > 0) {
      denominations.push({ value: coin, count, type: 'coin' });
      remainingChange -= coin * count;
    }
  }
  
  // Round any remaining tiny amounts
  if (remainingChange > 0.001) {
    denominations.push({ value: 0.05, count: 1, type: 'coin' });
  }
  
  return {
    changeAmount: roundToSwissCash(changeAmount),
    denominations
  };
}

/**
 * Format amount in Swiss Franc notation
 * @param amount The amount to format
 * @param options Formatting options
 * @returns Formatted string
 */
export function formatCHF(
  amount: number,
  options: {
    showCurrency?: boolean;
    showCents?: boolean;
    roundToCash?: boolean;
    groupThousands?: boolean;
  } = {}
): string {
  const {
    showCurrency = true,
    showCents = true,
    roundToCash = false,
    groupThousands = true
  } = options;
  
  let value = amount;
  if (roundToCash) {
    value = roundToSwissCash(value);
  }
  
  // Format the number
  const [integerPart, decimalPart = ''] = value.toFixed(2).split('.');
  
  // Add thousands separators (Swiss style with apostrophe)
  let formattedInteger = integerPart;
  if (groupThousands && integerPart.length > 3) {
    formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  }
  
  // Build the final string
  let result = formattedInteger;
  if (showCents || decimalPart !== '00') {
    result += `.${decimalPart}`;
  }
  
  if (showCurrency) {
    result = `CHF ${result}`;
  }
  
  return result;
}

/**
 * Parse Swiss Franc amount from string
 * @param value The string to parse
 * @returns The numeric value or null if invalid
 */
export function parseCHF(value: string): number | null {
  // Remove currency symbols and whitespace
  let cleaned = value.replace(/CHF/gi, '').trim();
  
  // Remove thousands separators (apostrophes)
  cleaned = cleaned.replace(/'/g, '');
  
  // Replace Swiss decimal comma with dot if present
  cleaned = cleaned.replace(',', '.');
  
  // Parse the number
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? null : parsed;
}

/**
 * Calculate Swiss VAT
 * @param amount The base amount
 * @param vatType The VAT type
 * @param isInclusive Whether the amount includes VAT
 * @returns Object with base, VAT, and total amounts
 */
export function calculateSwissVAT(
  amount: number,
  vatType: keyof typeof SWISS_VAT_RATES = 'standard',
  isInclusive: boolean = false
): {
  base: number;
  vat: number;
  total: number;
  rate: number;
} {
  const rate = SWISS_VAT_RATES[vatType];
  
  if (isInclusive) {
    // Amount includes VAT, calculate backwards
    const base = amount / (1 + rate / 100);
    const vat = amount - base;
    
    return {
      base: Math.round(base * 100) / 100,
      vat: Math.round(vat * 100) / 100,
      total: amount,
      rate
    };
  } else {
    // Amount excludes VAT, calculate forwards
    const vat = amount * (rate / 100);
    const total = amount + vat;
    
    return {
      base: amount,
      vat: Math.round(vat * 100) / 100,
      total: Math.round(total * 100) / 100,
      rate
    };
  }
}

/**
 * Validate Swiss bank account number
 * @param accountNumber The account number to validate
 * @returns Whether the account number is valid
 */
export function validateSwissBankAccount(accountNumber: string): boolean {
  // Remove any formatting
  const cleaned = accountNumber.replace(/[^0-9]/g, '');
  
  // Swiss bank account numbers are typically 12 digits
  if (cleaned.length !== 12) return false;
  
  // Basic checksum validation (simplified)
  let sum = 0;
  for (let i = 0; i < cleaned.length; i++) {
    sum += parseInt(cleaned[i], 10) * ((i % 2) + 1);
  }
  
  return sum % 10 === 0;
}

/**
 * Format Swiss QR-bill reference number
 * @param reference The reference number
 * @returns Formatted reference number
 */
export function formatQRReference(reference: string): string {
  // Remove any non-numeric characters
  const cleaned = reference.replace(/[^0-9]/g, '');
  
  // QR references are 27 digits, format as: XX XXXXX XXXXX XXXXX XXXXX XXXXX
  if (cleaned.length !== 27) return reference;
  
  const parts = [];
  parts.push(cleaned.slice(0, 2));
  
  for (let i = 2; i < 27; i += 5) {
    parts.push(cleaned.slice(i, i + 5));
  }
  
  return parts.join(' ');
}

/**
 * Generate Swiss payment slip reference (ESR)
 * @param customerId Customer ID
 * @param invoiceId Invoice ID
 * @returns ESR reference number
 */
export function generateESRReference(
  customerId: string,
  invoiceId: string
): string {
  // Simplified ESR reference generation
  const base = `${customerId.padStart(6, '0')}${invoiceId.padStart(10, '0')}`;
  
  // Calculate check digit using modulo 10 recursive
  let checkDigit = 0;
  const table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];
  
  for (const digit of base) {
    checkDigit = table[(checkDigit + parseInt(digit, 10)) % 10];
  }
  
  checkDigit = (10 - checkDigit) % 10;
  
  return `${base}${checkDigit}`;
}

// Export all Swiss Franc utilities
export default {
  CHF_COINS,
  CHF_NOTES,
  SWISS_VAT_RATES,
  roundToSwissCash,
  calculateSwissChange,
  formatCHF,
  parseCHF,
  calculateSwissVAT,
  validateSwissBankAccount,
  formatQRReference,
  generateESRReference
};
