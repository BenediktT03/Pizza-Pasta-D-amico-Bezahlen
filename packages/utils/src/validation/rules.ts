import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';

// Swiss-specific validation rules
export const swissValidation = {
  // Validate Swiss phone number
  isValidSwissPhone: (phone: string): boolean => {
    try {
      return isValidPhoneNumber(phone, 'CH');
    } catch {
      return false;
    }
  },

  // Format Swiss phone number
  formatSwissPhone: (phone: string): string => {
    try {
      const parsed = parsePhoneNumber(phone, 'CH');
      return parsed.formatInternational();
    } catch {
      return phone;
    }
  },

  // Validate Swiss postal code (1000-9999)
  isValidSwissPostalCode: (code: string): boolean => {
    const num = parseInt(code, 10);
    return /^[1-9]\d{3}$/.test(code) && num >= 1000 && num <= 9999;
  },

  // Validate Swiss IBAN
  isValidSwissIBAN: (iban: string): boolean => {
    const cleanIBAN = iban.replace(/\s/g, '');
    if (!/^CH\d{19}$/.test(cleanIBAN)) return false;
    
    // IBAN checksum validation
    const rearranged = cleanIBAN.substring(4) + cleanIBAN.substring(0, 4);
    const numeric = rearranged.replace(/[A-Z]/g, (char) => (char.charCodeAt(0) - 55).toString());
    
    let remainder = '';
    for (let i = 0; i < numeric.length; i++) {
      remainder = (parseInt(remainder + numeric[i], 10) % 97).toString();
    }
    
    return remainder === '1';
  },

  // Validate Swiss VAT number
  isValidSwissVAT: (vat: string): boolean => {
    const cleanVAT = vat.replace(/[^0-9]/g, '');
    return /^CHE\d{9}$/.test('CHE' + cleanVAT) || /^\d{6}$/.test(cleanVAT);
  },

  // Validate Swiss canton code
  isValidCanton: (canton: string): boolean => {
    const validCantons = [
      'AG', 'AI', 'AR', 'BE', 'BL', 'BS', 'FR', 'GE', 'GL', 'GR',
      'JU', 'LU', 'NE', 'NW', 'OW', 'SG', 'SH', 'SO', 'SZ', 'TG',
      'TI', 'UR', 'VD', 'VS', 'ZG', 'ZH'
    ];
    return validCantons.includes(canton.toUpperCase());
  }
};

// General validation rules
export const generalValidation = {
  // Email validation
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // URL validation
  isValidURL: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  // Credit card validation (Luhn algorithm)
  isValidCreditCard: (cardNumber: string): boolean => {
    const cleanNumber = cardNumber.replace(/\D/g, '');
    if (cleanNumber.length < 13 || cleanNumber.length > 19) return false;
    
    let sum = 0;
    let isEven = false;
    
    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNumber[i], 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  },

  // Password strength validation
  getPasswordStrength: (password: string): {
    score: number;
    feedback: string[];
  } => {
    let score = 0;
    const feedback: string[] = [];
    
    if (password.length >= 8) score++;
    else feedback.push('Password should be at least 8 characters');
    
    if (password.length >= 12) score++;
    
    if (/[a-z]/.test(password)) score++;
    else feedback.push('Add lowercase letters');
    
    if (/[A-Z]/.test(password)) score++;
    else feedback.push('Add uppercase letters');
    
    if (/[0-9]/.test(password)) score++;
    else feedback.push('Add numbers');
    
    if (/[^A-Za-z0-9]/.test(password)) score++;
    else feedback.push('Add special characters');
    
    return { score, feedback };
  },

  // Date validation
  isValidDate: (dateString: string): boolean => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  },

  // Age validation
  isMinimumAge: (birthDate: string, minimumAge: number): boolean => {
    const birth = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1 >= minimumAge;
    }
    
    return age >= minimumAge;
  }
};

// Business rules validation
export const businessValidation = {
  // Validate business hours
  isValidBusinessHours: (open: string, close: string): boolean => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(open) || !timeRegex.test(close)) return false;
    
    const [openHour, openMin] = open.split(':').map(Number);
    const [closeHour, closeMin] = close.split(':').map(Number);
    
    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour * 60 + closeMin;
    
    return openMinutes < closeMinutes;
  },

  // Validate price
  isValidPrice: (price: number): boolean => {
    return price >= 0 && Number.isFinite(price) && price === Math.round(price * 100) / 100;
  },

  // Validate quantity
  isValidQuantity: (quantity: number): boolean => {
    return Number.isInteger(quantity) && quantity > 0 && quantity <= 999;
  },

  // Validate discount percentage
  isValidDiscount: (discount: number): boolean => {
    return discount >= 0 && discount <= 100;
  },

  // Validate delivery radius (in km)
  isValidDeliveryRadius: (radius: number): boolean => {
    return radius > 0 && radius <= 50; // Max 50km delivery radius
  },

  // Validate minimum order amount
  isValidMinimumOrder: (amount: number): boolean => {
    return amount >= 0 && amount <= 1000; // Max 1000 CHF minimum order
  }
};

// Input sanitization rules
export const sanitization = {
  // Clean phone number
  cleanPhoneNumber: (phone: string): string => {
    return phone.replace(/[^\d+]/g, '');
  },

  // Clean postal code
  cleanPostalCode: (code: string): string => {
    return code.replace(/\D/g, '');
  },

  // Clean IBAN
  cleanIBAN: (iban: string): string => {
    return iban.replace(/\s/g, '').toUpperCase();
  },

  // Clean credit card number
  cleanCreditCard: (cardNumber: string): string => {
    return cardNumber.replace(/\D/g, '');
  },

  // Sanitize HTML input
  sanitizeHTML: (input: string): string => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    
    return input.replace(/[&<>"'/]/g, (char) => map[char]);
  },

  // Normalize whitespace
  normalizeWhitespace: (input: string): string => {
    return input.trim().replace(/\s+/g, ' ');
  },

  // Remove special characters (keep only alphanumeric and basic punctuation)
  removeSpecialChars: (input: string): string => {
    return input.replace(/[^a-zA-Z0-9\s.,!?-]/g, '');
  }
};

// Complex validation rules
export const complexValidation = {
  // Validate order timing
  isValidOrderTime: (
    scheduledTime: Date,
    businessHours: { open: string; close: string },
    minimumPreparationTime: number = 30
  ): boolean => {
    const now = new Date();
    const minTime = new Date(now.getTime() + minimumPreparationTime * 60000);
    
    if (scheduledTime < minTime) return false;
    
    const hours = scheduledTime.getHours();
    const minutes = scheduledTime.getMinutes();
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    const [openHour, openMin] = businessHours.open.split(':').map(Number);
    const [closeHour, closeMin] = businessHours.close.split(':').map(Number);
    
    const scheduledMinutes = hours * 60 + minutes;
    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour * 60 + closeMin;
    
    return scheduledMinutes >= openMinutes && scheduledMinutes <= closeMinutes;
  },

  // Validate delivery address within radius
  isWithinDeliveryRadius: (
    restaurantCoords: { lat: number; lng: number },
    deliveryCoords: { lat: number; lng: number },
    maxRadius: number
  ): boolean => {
    const R = 6371; // Earth's radius in km
    const dLat = (deliveryCoords.lat - restaurantCoords.lat) * Math.PI / 180;
    const dLon = (deliveryCoords.lng - restaurantCoords.lng) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(restaurantCoords.lat * Math.PI / 180) * 
      Math.cos(deliveryCoords.lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance <= maxRadius;
  }
};

// Export all validation rules
export default {
  ...swissValidation,
  ...generalValidation,
  ...businessValidation,
  ...sanitization,
  ...complexValidation
};
