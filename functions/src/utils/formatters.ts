/**
 * EATECH - Formatting Utility Functions
 * Version: 1.0.0
 * Description: Comprehensive formatting utilities for consistent data presentation
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/utils/formatters.ts
 */

import { format, formatDistance, formatRelative } from 'date-fns';
import { de, enUS, fr, it } from 'date-fns/locale';
import { OrderStatus, PaymentMethod } from '../types/order.types';
import { CustomerType } from '../types/customer.types';
import { ProductType } from '../types/product.types';

// ============================================================================
// CONSTANTS
// ============================================================================

const LOCALES = {
  de,
  en: enUS,
  fr,
  it
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  CHF: 'CHF',
  EUR: '€',
  USD: '$',
  GBP: '£'
};

const COUNTRY_CODES: Record<string, string> = {
  CH: 'Schweiz',
  DE: 'Deutschland',
  AT: 'Österreich',
  FR: 'Frankreich',
  IT: 'Italien',
  US: 'USA',
  GB: 'Vereinigtes Königreich'
};

// ============================================================================
// NUMBER FORMATTING
// ============================================================================

/**
 * Formats currency amount
 */
export function formatCurrency(
  amount: number,
  currency: string = 'CHF',
  locale: string = 'de-CH',
  options?: Intl.NumberFormatOptions
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  });
  
  return formatter.format(amount);
}

/**
 * Formats number with thousands separator
 */
export function formatNumber(
  value: number,
  locale: string = 'de-CH',
  options?: Intl.NumberFormatOptions
): string {
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options
  });
  
  return formatter.format(value);
}

/**
 * Formats percentage
 */
export function formatPercentage(
  value: number,
  decimals: number = 1,
  includeSign: boolean = true
): string {
  const formatted = value.toFixed(decimals);
  return includeSign ? `${formatted}%` : formatted;
}

/**
 * Formats file size
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

/**
 * Formats duration (e.g., "2h 30m")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}m`;
}

/**
 * Formats distance
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  
  const km = meters / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0)}km`;
}

// ============================================================================
// STRING FORMATTING
// ============================================================================

/**
 * Formats name (capitalizes first letter of each word)
 */
export function formatName(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Formats phone number
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Swiss format
  if (cleaned.startsWith('41')) {
    const number = cleaned.slice(2);
    if (number.length === 9) {
      return `+41 ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5, 7)} ${number.slice(7)}`;
    }
  }
  
  // German format
  if (cleaned.startsWith('49')) {
    const number = cleaned.slice(2);
    return `+49 ${number.slice(0, 3)} ${number.slice(3)}`;
  }
  
  // Default format (groups of 3)
  return cleaned.replace(/(\d{3})(?=\d)/g, '$1 ');
}

/**
 * Formats address
 */
export function formatAddress(address: {
  street: string;
  streetNumber?: string;
  additionalLine?: string;
  postalCode: string;
  city: string;
  state?: string;
  country?: string;
}): string {
  const lines: string[] = [];
  
  // Street line
  if (address.street) {
    lines.push(address.streetNumber ? 
      `${address.street} ${address.streetNumber}` : 
      address.street
    );
  }
  
  // Additional line
  if (address.additionalLine) {
    lines.push(address.additionalLine);
  }
  
  // City line
  const cityLine = [address.postalCode, address.city]
    .filter(Boolean)
    .join(' ');
  if (cityLine) {
    lines.push(cityLine);
  }
  
  // Country
  if (address.country && address.country !== 'CH') {
    lines.push(COUNTRY_CODES[address.country] || address.country);
  }
  
  return lines.join('\n');
}

/**
 * Truncates text with ellipsis
 */
export function truncateText(
  text: string, 
  maxLength: number, 
  suffix: string = '...'
): string {
  if (text.length <= maxLength) return text;
  
  const truncated = text.slice(0, maxLength - suffix.length);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + suffix;
}

/**
 * Formats list as string
 */
export function formatList(
  items: string[], 
  locale: string = 'de',
  type: 'conjunction' | 'disjunction' = 'conjunction'
): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  
  try {
    const formatter = new Intl.ListFormat(locale, { 
      style: 'long', 
      type 
    });
    return formatter.format(items);
  } catch {
    // Fallback for unsupported browsers
    const last = items[items.length - 1];
    const rest = items.slice(0, -1);
    const connector = type === 'conjunction' ? ' und ' : ' oder ';
    return rest.join(', ') + connector + last;
  }
}

// ============================================================================
// DATE/TIME FORMATTING
// ============================================================================

/**
 * Formats date
 */
export function formatDate(
  date: Date | string | number,
  formatStr: string = 'dd.MM.yyyy',
  locale: string = 'de'
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? 
    new Date(date) : date;
  
  return format(dateObj, formatStr, {
    locale: LOCALES[locale as keyof typeof LOCALES] || LOCALES.de
  });
}

/**
 * Formats time
 */
export function formatTime(
  date: Date | string | number,
  formatStr: string = 'HH:mm',
  locale: string = 'de'
): string {
  return formatDate(date, formatStr, locale);
}

/**
 * Formats date and time
 */
export function formatDateTime(
  date: Date | string | number,
  formatStr: string = 'dd.MM.yyyy HH:mm',
  locale: string = 'de'
): string {
  return formatDate(date, formatStr, locale);
}

/**
 * Formats relative time
 */
export function formatRelativeTime(
  date: Date | string | number,
  baseDate: Date = new Date(),
  locale: string = 'de'
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? 
    new Date(date) : date;
  
  return formatRelative(dateObj, baseDate, {
    locale: LOCALES[locale as keyof typeof LOCALES] || LOCALES.de
  });
}

/**
 * Formats time ago
 */
export function formatTimeAgo(
  date: Date | string | number,
  locale: string = 'de',
  addSuffix: boolean = true
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? 
    new Date(date) : date;
  
  return formatDistance(dateObj, new Date(), {
    locale: LOCALES[locale as keyof typeof LOCALES] || LOCALES.de,
    addSuffix
  });
}

/**
 * Formats business hours
 */
export function formatBusinessHours(
  hours: { open: string; close: string } | null,
  locale: string = 'de'
): string {
  if (!hours || !hours.open || !hours.close) {
    return locale === 'de' ? 'Geschlossen' : 'Closed';
  }
  
  return `${hours.open} - ${hours.close}`;
}

// ============================================================================
// STATUS & ENUM FORMATTING
// ============================================================================

/**
 * Formats order status
 */
export function formatOrderStatus(status: OrderStatus, locale: string = 'de'): string {
  const statusLabels: Record<string, Record<OrderStatus, string>> = {
    de: {
      [OrderStatus.PENDING]: 'Ausstehend',
      [OrderStatus.CONFIRMED]: 'Bestätigt',
      [OrderStatus.PREPARING]: 'In Zubereitung',
      [OrderStatus.READY]: 'Bereit',
      [OrderStatus.DELIVERING]: 'In Lieferung',
      [OrderStatus.COMPLETED]: 'Abgeschlossen',
      [OrderStatus.CANCELLED]: 'Storniert',
      [OrderStatus.FAILED]: 'Fehlgeschlagen',
      [OrderStatus.REFUNDED]: 'Erstattet'
    },
    en: {
      [OrderStatus.PENDING]: 'Pending',
      [OrderStatus.CONFIRMED]: 'Confirmed',
      [OrderStatus.PREPARING]: 'Preparing',
      [OrderStatus.READY]: 'Ready',
      [OrderStatus.DELIVERING]: 'Delivering',
      [OrderStatus.COMPLETED]: 'Completed',
      [OrderStatus.CANCELLED]: 'Cancelled',
      [OrderStatus.FAILED]: 'Failed',
      [OrderStatus.REFUNDED]: 'Refunded'
    }
  };
  
  return statusLabels[locale]?.[status] || statusLabels.en[status] || status;
}

/**
 * Formats payment method
 */
export function formatPaymentMethod(method: PaymentMethod, locale: string = 'de'): string {
  const methodLabels: Record<string, Record<PaymentMethod, string>> = {
    de: {
      [PaymentMethod.CASH]: 'Bargeld',
      [PaymentMethod.CARD]: 'Karte',
      [PaymentMethod.TWINT]: 'TWINT',
      [PaymentMethod.PAYPAL]: 'PayPal',
      [PaymentMethod.INVOICE]: 'Rechnung',
      [PaymentMethod.VOUCHER]: 'Gutschein',
      [PaymentMethod.CRYPTO]: 'Kryptowährung'
    },
    en: {
      [PaymentMethod.CASH]: 'Cash',
      [PaymentMethod.CARD]: 'Card',
      [PaymentMethod.TWINT]: 'TWINT',
      [PaymentMethod.PAYPAL]: 'PayPal',
      [PaymentMethod.INVOICE]: 'Invoice',
      [PaymentMethod.VOUCHER]: 'Voucher',
      [PaymentMethod.CRYPTO]: 'Cryptocurrency'
    }
  };
  
  return methodLabels[locale]?.[method] || methodLabels.en[method] || method;
}

/**
 * Formats customer type
 */
export function formatCustomerType(type: CustomerType, locale: string = 'de'): string {
  const typeLabels: Record<string, Record<CustomerType, string>> = {
    de: {
      [CustomerType.GUEST]: 'Gast',
      [CustomerType.REGISTERED]: 'Registriert',
      [CustomerType.VIP]: 'VIP',
      [CustomerType.CORPORATE]: 'Geschäftskunde',
      [CustomerType.WHOLESALE]: 'Großhändler'
    },
    en: {
      [CustomerType.GUEST]: 'Guest',
      [CustomerType.REGISTERED]: 'Registered',
      [CustomerType.VIP]: 'VIP',
      [CustomerType.CORPORATE]: 'Corporate',
      [CustomerType.WHOLESALE]: 'Wholesale'
    }
  };
  
  return typeLabels[locale]?.[type] || typeLabels.en[type] || type;
}

/**
 * Formats product type
 */
export function formatProductType(type: ProductType, locale: string = 'de'): string {
  const typeLabels: Record<string, Record<ProductType, string>> = {
    de: {
      [ProductType.FOOD]: 'Essen',
      [ProductType.BEVERAGE]: 'Getränk',
      [ProductType.DESSERT]: 'Dessert',
      [ProductType.SNACK]: 'Snack',
      [ProductType.COMBO]: 'Kombi-Menü',
      [ProductType.MERCHANDISE]: 'Merchandise',
      [ProductType.GIFT_CARD]: 'Geschenkkarte'
    },
    en: {
      [ProductType.FOOD]: 'Food',
      [ProductType.BEVERAGE]: 'Beverage',
      [ProductType.DESSERT]: 'Dessert',
      [ProductType.SNACK]: 'Snack',
      [ProductType.COMBO]: 'Combo',
      [ProductType.MERCHANDISE]: 'Merchandise',
      [ProductType.GIFT_CARD]: 'Gift Card'
    }
  };
  
  return typeLabels[locale]?.[type] || typeLabels.en[type] || type;
}

// ============================================================================
// SPECIAL FORMATTING
// ============================================================================

/**
 * Formats order number
 */
export function formatOrderNumber(orderNumber: string): string {
  // Format: ORD-20250108-1234 -> #1234
  const parts = orderNumber.split('-');
  return `#${parts[parts.length - 1]}`;
}

/**
 * Formats SKU
 */
export function formatSKU(sku: string): string {
  return sku.toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

/**
 * Formats credit card (masked)
 */
export function formatCreditCard(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\D/g, '');
  const last4 = cleaned.slice(-4);
  return `**** **** **** ${last4}`;
}

/**
 * Formats IBAN (masked)
 */
export function formatIBAN(iban: string, mask: boolean = true): string {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  
  if (mask && cleaned.length > 8) {
    const start = cleaned.slice(0, 4);
    const end = cleaned.slice(-4);
    const masked = '*'.repeat(cleaned.length - 8);
    return `${start} ${masked} ${end}`.replace(/(.{4})/g, '$1 ').trim();
  }
  
  return cleaned.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Formats QR code data
 */
export function formatQRCodeData(data: {
  type: string;
  id: string;
  amount?: number;
  reference?: string;
}): string {
  const parts = [
    `TYPE:${data.type}`,
    `ID:${data.id}`
  ];
  
  if (data.amount !== undefined) {
    parts.push(`AMOUNT:${data.amount.toFixed(2)}`);
  }
  
  if (data.reference) {
    parts.push(`REF:${data.reference}`);
  }
  
  return parts.join('|');
}

/**
 * Formats coordinates
 */
export function formatCoordinates(
  lat: number, 
  lng: number, 
  format: 'decimal' | 'dms' = 'decimal'
): string {
  if (format === 'decimal') {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
  
  // Convert to degrees, minutes, seconds
  const latDeg = Math.floor(Math.abs(lat));
  const latMin = Math.floor((Math.abs(lat) - latDeg) * 60);
  const latSec = ((Math.abs(lat) - latDeg - latMin / 60) * 3600).toFixed(2);
  const latDir = lat >= 0 ? 'N' : 'S';
  
  const lngDeg = Math.floor(Math.abs(lng));
  const lngMin = Math.floor((Math.abs(lng) - lngDeg) * 60);
  const lngSec = ((Math.abs(lng) - lngDeg - lngMin / 60) * 3600).toFixed(2);
  const lngDir = lng >= 0 ? 'E' : 'W';
  
  return `${latDeg}°${latMin}'${latSec}"${latDir}, ${lngDeg}°${lngMin}'${lngSec}"${lngDir}`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Numbers
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatFileSize,
  formatDuration,
  formatDistance,
  
  // Strings
  formatName,
  formatPhoneNumber,
  formatAddress,
  truncateText,
  formatList,
  
  // Date/Time
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatTimeAgo,
  formatBusinessHours,
  
  // Status/Enums
  formatOrderStatus,
  formatPaymentMethod,
  formatCustomerType,
  formatProductType,
  
  // Special
  formatOrderNumber,
  formatSKU,
  formatCreditCard,
  formatIBAN,
  formatQRCodeData,
  formatCoordinates,
  
  // Constants
  LOCALES,
  CURRENCY_SYMBOLS,
  COUNTRY_CODES
};