import { SwissCanton } from '../services/tenant/tenant.types';

/**
 * Email validation
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Swiss phone number validation
 */
export function isValidSwissPhone(phone: string): boolean {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Swiss phone patterns:
  // - Mobile: 07[6-9] XXX XX XX (10 digits total)
  // - Landline: 0XX XXX XX XX (10 digits total)
  // - With country code: +41 XX XXX XX XX or 0041 XX XXX XX XX
  
  // Check if it starts with Swiss country code
  if (cleaned.startsWith('41')) {
    return cleaned.length === 11; // 41 + 9 digits
  }
  
  if (cleaned.startsWith('0041')) {
    return cleaned.length === 13; // 0041 + 9 digits
  }
  
  // Local format
  if (cleaned.startsWith('0')) {
    return cleaned.length === 10;
  }
  
  return false;
}

/**
 * Format Swiss phone number
 */
export function formatSwissPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  // Handle country code formats
  if (cleaned.startsWith('41')) {
    const number = cleaned.substring(2);
    return `+41 ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5, 7)} ${number.slice(7)}`;
  }
  
  if (cleaned.startsWith('0041')) {
    const number = cleaned.substring(4);
    return `+41 ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5, 7)} ${number.slice(7)}`;
  }
  
  // Local format
  if (cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8)}`;
  }
  
  return phone;
}

/**
 * Swiss postal code validation
 */
export function isValidSwissPostalCode(postalCode: string): boolean {
  const cleaned = postalCode.replace(/\s/g, '');
  return /^[1-9]\d{3}$/.test(cleaned);
}

/**
 * Swiss canton validation
 */
export function isValidCanton(canton: string): boolean {
  return Object.values(SwissCanton).includes(canton as SwissCanton);
}

/**
 * IBAN validation (Swiss)
 */
export function isValidSwissIBAN(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  
  // Swiss IBAN format: CH + 2 check digits + 5 bank code + 12 account number
  if (!cleaned.startsWith('CH') || cleaned.length !== 21) {
    return false;
  }
  
  // Validate check digits using mod-97 algorithm
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (char) => (char.charCodeAt(0) - 55).toString());
  const remainder = BigInt(numeric) % 97n;
  
  return remainder === 1n;
}

/**
 * Swiss VAT number validation
 */
export function isValidSwissVAT(vat: string): boolean {
  const cleaned = vat.replace(/[.\s-]/g, '');
  
  // Swiss VAT format: CHE-XXX.XXX.XXX MWST
  const vatRegex = /^CHE\d{9}(MWST)?$/;
  return vatRegex.test(cleaned);
}

/**
 * Password strength validation
 */
export interface PasswordStrength {
  score: number; // 0-5
  feedback: string[];
  isValid: boolean;
}

export function validatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;
  
  // Length check
  if (password.length >= 8) score++;
  else feedback.push('Passwort muss mindestens 8 Zeichen lang sein');
  
  if (password.length >= 12) score++;
  
  // Uppercase check
  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Mindestens ein Grossbuchstabe erforderlich');
  
  // Lowercase check
  if (/[a-z]/.test(password)) score++;
  else feedback.push('Mindestens ein Kleinbuchstabe erforderlich');
  
  // Number check
  if (/\d/.test(password)) score++;
  else feedback.push('Mindestens eine Zahl erforderlich');
  
  // Special character check
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  else feedback.push('Mindestens ein Sonderzeichen empfohlen');
  
  return {
    score,
    feedback,
    isValid: score >= 4,
  };
}

/**
 * URL validation
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Domain validation
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
  return domainRegex.test(domain);
}

/**
 * Credit card validation (basic)
 */
export function isValidCreditCard(number: string): boolean {
  const cleaned = number.replace(/\s/g, '');
  
  // Check if it's only digits
  if (!/^\d+$/.test(cleaned)) return false;
  
  // Check length (most cards are 13-19 digits)
  if (cleaned.length < 13 || cleaned.length > 19) return false;
  
  // Luhn algorithm
  let sum = 0;
  let isEven = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * Menu item price validation
 */
export function isValidPrice(price: number): boolean {
  // Price must be positive and in Swiss Francs (rounded to 0.05)
  if (price < 0) return false;
  
  // Check if price is rounded to 0.05 CHF
  const rounded = Math.round(price * 20) / 20;
  return Math.abs(price - rounded) < 0.001;
}

/**
 * Round price to Swiss standard (0.05 CHF)
 */
export function roundToSwissPrice(price: number): number {
  return Math.round(price * 20) / 20;
}

/**
 * Opening hours validation
 */
export function isValidTimeFormat(time: string): boolean {
  // Format: HH:mm (24-hour)
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Date range validation
 */
export function isValidDateRange(startDate: Date, endDate: Date): boolean {
  return startDate <= endDate;
}

/**
 * Order quantity validation
 */
export function isValidQuantity(quantity: number, min: number = 1, max: number = 999): boolean {
  return Number.isInteger(quantity) && quantity >= min && quantity <= max;
}

/**
 * Swiss business registration number validation
 */
export function isValidUID(uid: string): boolean {
  // Swiss UID format: CHE-XXX.XXX.XXX
  const cleaned = uid.replace(/[.\s-]/g, '');
  const uidRegex = /^CHE\d{9}$/;
  return uidRegex.test(cleaned);
}

/**
 * Language code validation
 */
export function isValidLanguageCode(code: string): boolean {
  const validCodes = ['de', 'de-CH', 'fr', 'fr-CH', 'it', 'it-CH', 'en', 'en-US'];
  return validCodes.includes(code);
}

/**
 * File validation
 */
export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[]; // MIME types
  allowedExtensions?: string[];
}

export function validateFile(file: File, options: FileValidationOptions = {}): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Size validation
  if (options.maxSize && file.size > options.maxSize) {
    errors.push(`Datei ist zu gross (max. ${formatFileSize(options.maxSize)})`);
  }
  
  // Type validation
  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    errors.push(`Dateityp nicht erlaubt (erlaubt: ${options.allowedTypes.join(', ')})`);
  }
  
  // Extension validation
  if (options.allowedExtensions) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !options.allowedExtensions.includes(extension)) {
      errors.push(`Dateierweiterung nicht erlaubt (erlaubt: ${options.allowedExtensions.join(', ')})`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Sanitize input
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Validate coordinates
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Swiss coordinates validation (approximate bounds)
 */
export function isValidSwissCoordinate(lat: number, lng: number): boolean {
  // Approximate bounds for Switzerland
  return lat >= 45.8 && lat <= 47.8 && lng >= 5.9 && lng <= 10.5;
}

/**
 * Delivery radius validation
 */
export function isValidDeliveryRadius(radius: number): boolean {
  // Radius in kilometers, reasonable limits for Switzerland
  return radius > 0 && radius <= 50;
}

/**
 * Table number validation
 */
export function isValidTableNumber(tableNumber: string): boolean {
  // Allow alphanumeric table numbers
  return /^[A-Za-z0-9\-]+$/.test(tableNumber) && tableNumber.length <= 10;
}

/**
 * Order notes validation
 */
export function isValidOrderNote(note: string): boolean {
  return note.length <= 500; // Reasonable limit for order notes
}

/**
 * Discount validation
 */
export function isValidDiscount(discount: number, type: 'percentage' | 'fixed'): boolean {
  if (type === 'percentage') {
    return discount >= 0 && discount <= 100;
  }
  return discount >= 0;
}

/**
 * Kitchen time validation
 */
export function isValidPreparationTime(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes > 0 && minutes <= 180; // Max 3 hours
}

/**
 * Rating validation
 */
export function isValidRating(rating: number): boolean {
  return rating >= 1 && rating <= 5 && (Number.isInteger(rating) || rating % 0.5 === 0);
}
