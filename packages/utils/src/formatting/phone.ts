import { parsePhoneNumber, formatPhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js';

/**
 * Format a phone number according to Swiss conventions
 * @param phoneNumber The phone number to format
 * @param countryCode The country code (default: CH)
 * @returns Formatted phone number
 */
export function formatPhone(
  phoneNumber: string,
  countryCode: CountryCode = 'CH'
): string {
  try {
    const parsed = parsePhoneNumber(phoneNumber, countryCode);
    if (!parsed) return phoneNumber;
    
    // For Swiss numbers, use national format without country code
    if (countryCode === 'CH' && parsed.country === 'CH') {
      return parsed.formatNational();
    }
    
    // For international numbers, use international format
    return parsed.formatInternational();
  } catch {
    return phoneNumber;
  }
}

/**
 * Format a Swiss mobile number
 * @param phoneNumber The phone number to format
 * @returns Formatted Swiss mobile number
 */
export function formatSwissMobile(phoneNumber: string): string {
  try {
    const parsed = parsePhoneNumber(phoneNumber, 'CH');
    if (!parsed || parsed.country !== 'CH') return phoneNumber;
    
    // Format as: 079 123 45 67
    const national = parsed.nationalNumber.toString();
    if (national.length === 9) {
      return `0${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5, 7)} ${national.slice(7)}`;
    }
    
    return parsed.formatNational();
  } catch {
    return phoneNumber;
  }
}

/**
 * Format a Swiss landline number
 * @param phoneNumber The phone number to format
 * @returns Formatted Swiss landline number
 */
export function formatSwissLandline(phoneNumber: string): string {
  try {
    const parsed = parsePhoneNumber(phoneNumber, 'CH');
    if (!parsed || parsed.country !== 'CH') return phoneNumber;
    
    // Format based on area code length
    const national = parsed.nationalNumber.toString();
    
    // 2-digit area codes (e.g., 044 for Zurich)
    if (national.startsWith('4') || national.startsWith('3') || national.startsWith('2')) {
      if (national.length === 9) {
        return `0${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5, 7)} ${national.slice(7)}`;
      }
    }
    
    // 3-digit area codes (e.g., 091 for Ticino)
    if (national.length === 9) {
      return `0${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
    }
    
    return parsed.formatNational();
  } catch {
    return phoneNumber;
  }
}

/**
 * Format phone number for display (with spaces)
 * @param phoneNumber The phone number to format
 * @param countryCode The country code
 * @returns Formatted phone number with spaces
 */
export function formatPhoneDisplay(
  phoneNumber: string,
  countryCode: CountryCode = 'CH'
): string {
  try {
    const parsed = parsePhoneNumber(phoneNumber, countryCode);
    if (!parsed) return phoneNumber;
    
    if (countryCode === 'CH' && parsed.country === 'CH') {
      const type = parsed.getType();
      
      if (type === 'MOBILE') {
        return formatSwissMobile(phoneNumber);
      } else {
        return formatSwissLandline(phoneNumber);
      }
    }
    
    return parsed.formatInternational();
  } catch {
    return phoneNumber;
  }
}

/**
 * Format phone number for storage (E.164 format)
 * @param phoneNumber The phone number to format
 * @param countryCode The country code
 * @returns Phone number in E.164 format
 */
export function formatPhoneForStorage(
  phoneNumber: string,
  countryCode: CountryCode = 'CH'
): string {
  try {
    const parsed = parsePhoneNumber(phoneNumber, countryCode);
    if (!parsed) return phoneNumber;
    
    return parsed.format('E.164');
  } catch {
    return phoneNumber;
  }
}

/**
 * Format phone number as clickable tel: link
 * @param phoneNumber The phone number
 * @param countryCode The country code
 * @returns Phone number formatted for tel: links
 */
export function formatPhoneForLink(
  phoneNumber: string,
  countryCode: CountryCode = 'CH'
): string {
  try {
    const parsed = parsePhoneNumber(phoneNumber, countryCode);
    if (!parsed) return phoneNumber.replace(/[^+\d]/g, '');
    
    return parsed.format('E.164');
  } catch {
    return phoneNumber.replace(/[^+\d]/g, '');
  }
}

/**
 * Validate phone number
 * @param phoneNumber The phone number to validate
 * @param countryCode The country code
 * @returns Whether the phone number is valid
 */
export function validatePhone(
  phoneNumber: string,
  countryCode: CountryCode = 'CH'
): boolean {
  try {
    return isValidPhoneNumber(phoneNumber, countryCode);
  } catch {
    return false;
  }
}

/**
 * Validate Swiss mobile number
 * @param phoneNumber The phone number to validate
 * @returns Whether it's a valid Swiss mobile number
 */
export function validateSwissMobile(phoneNumber: string): boolean {
  try {
    const parsed = parsePhoneNumber(phoneNumber, 'CH');
    if (!parsed || parsed.country !== 'CH') return false;
    
    return parsed.getType() === 'MOBILE';
  } catch {
    return false;
  }
}

/**
 * Get phone number type
 * @param phoneNumber The phone number
 * @param countryCode The country code
 * @returns The type of phone number
 */
export function getPhoneType(
  phoneNumber: string,
  countryCode: CountryCode = 'CH'
): 'MOBILE' | 'FIXED_LINE' | 'UNKNOWN' {
  try {
    const parsed = parsePhoneNumber(phoneNumber, countryCode);
    if (!parsed) return 'UNKNOWN';
    
    const type = parsed.getType();
    if (type === 'MOBILE') return 'MOBILE';
    if (type === 'FIXED_LINE' || type === 'FIXED_LINE_OR_MOBILE') return 'FIXED_LINE';
    
    return 'UNKNOWN';
  } catch {
    return 'UNKNOWN';
  }
}

/**
 * Extract country code from phone number
 * @param phoneNumber The phone number
 * @returns The country code or null
 */
export function extractCountryCode(phoneNumber: string): CountryCode | null {
  try {
    const parsed = parsePhoneNumber(phoneNumber);
    return parsed ? parsed.country || null : null;
  } catch {
    return null;
  }
}

/**
 * Parse phone number parts
 * @param phoneNumber The phone number
 * @param countryCode The country code
 * @returns Object with phone number parts
 */
export function parsePhoneParts(
  phoneNumber: string,
  countryCode: CountryCode = 'CH'
): {
  countryCode: string | null;
  areaCode: string | null;
  localNumber: string | null;
  extension: string | null;
  isValid: boolean;
} {
  try {
    const parsed = parsePhoneNumber(phoneNumber, countryCode);
    if (!parsed) {
      return {
        countryCode: null,
        areaCode: null,
        localNumber: null,
        extension: null,
        isValid: false
      };
    }
    
    const national = parsed.nationalNumber.toString();
    let areaCode = null;
    let localNumber = national;
    
    // Extract area code for Swiss numbers
    if (parsed.country === 'CH') {
      if (national.length >= 9) {
        areaCode = national.slice(0, 2);
        localNumber = national.slice(2);
      }
    }
    
    return {
      countryCode: parsed.countryCallingCode ? `+${parsed.countryCallingCode}` : null,
      areaCode,
      localNumber,
      extension: parsed.ext || null,
      isValid: true
    };
  } catch {
    return {
      countryCode: null,
      areaCode: null,
      localNumber: null,
      extension: null,
      isValid: false
    };
  }
}

/**
 * Mask phone number for privacy
 * @param phoneNumber The phone number to mask
 * @param countryCode The country code
 * @returns Masked phone number (e.g., +41 79 *** ** 67)
 */
export function maskPhone(
  phoneNumber: string,
  countryCode: CountryCode = 'CH'
): string {
  try {
    const parsed = parsePhoneNumber(phoneNumber, countryCode);
    if (!parsed) return phoneNumber;
    
    const formatted = parsed.formatInternational();
    const parts = formatted.split(' ');
    
    if (parts.length >= 3) {
      // Keep country code and first part, mask middle parts
      const masked = parts.map((part, index) => {
        if (index === 0 || index === parts.length - 1) return part;
        if (index === 1) return part.slice(0, 2) + '*'.repeat(part.length - 2);
        return '*'.repeat(part.length);
      });
      
      return masked.join(' ');
    }
    
    // Fallback: mask middle portion
    const len = formatted.length;
    const visibleStart = Math.floor(len * 0.3);
    const visibleEnd = Math.floor(len * 0.2);
    
    return formatted.slice(0, visibleStart) +
           '*'.repeat(len - visibleStart - visibleEnd) +
           formatted.slice(-visibleEnd);
  } catch {
    return phoneNumber;
  }
}

// Export all phone utilities
export default {
  formatPhone,
  formatSwissMobile,
  formatSwissLandline,
  formatPhoneDisplay,
  formatPhoneForStorage,
  formatPhoneForLink,
  validatePhone,
  validateSwissMobile,
  getPhoneType,
  extractCountryCode,
  parsePhoneParts,
  maskPhone
};
