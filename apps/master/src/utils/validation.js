/**
 * EATECH Validation Utilities
 * Version: 1.0.0
 *
 * Comprehensive validation functions for Master Control System
 *
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/utils/validation.js
 */

/**
 * Email validation
 */
export const validateEmail = (email) => {
  if (!email) return { isValid: false, error: 'E-Mail ist erforderlich' };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);

  if (!isValid) {
    return { isValid: false, error: 'Ungültige E-Mail-Adresse' };
  }

  // Additional checks
  if (email.length > 255) {
    return { isValid: false, error: 'E-Mail-Adresse ist zu lang' };
  }

  return { isValid: true, error: null };
};

/**
 * Password validation
 */
export const validatePassword = (password, options = {}) => {
  const {
    minLength = 12,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = true,
    disallowCommon = true
  } = options;

  if (!password) return { isValid: false, error: 'Passwort ist erforderlich' };

  const errors = [];

  if (password.length < minLength) {
    errors.push(`Mindestens ${minLength} Zeichen erforderlich`);
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Mindestens ein Großbuchstabe erforderlich');
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Mindestens ein Kleinbuchstabe erforderlich');
  }

  if (requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Mindestens eine Zahl erforderlich');
  }

  if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Mindestens ein Sonderzeichen erforderlich');
  }

  if (disallowCommon) {
    const commonPasswords = [
      'password', 'passwort', '12345678', 'qwertyui', 'admin123',
      'letmein', 'welcome', 'master123', 'eatech123'
    ];

    const lowerPassword = password.toLowerCase();
    if (commonPasswords.some(common => lowerPassword.includes(common))) {
      errors.push('Passwort ist zu häufig oder unsicher');
    }
  }

  return {
    isValid: errors.length === 0,
    error: errors.length > 0 ? errors.join('. ') : null,
    errors
  };
};

/**
 * Phone number validation (Swiss format)
 */
export const validatePhone = (phone) => {
  if (!phone) return { isValid: false, error: 'Telefonnummer ist erforderlich' };

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Swiss phone number patterns
  const swissPhoneRegex = /^(41|0041|0)?[1-9]\d{8}$/;
  const isValid = swissPhoneRegex.test(cleaned);

  if (!isValid) {
    return { isValid: false, error: 'Ungültige Schweizer Telefonnummer' };
  }

  return { isValid: true, error: null };
};

/**
 * URL validation
 */
export const validateURL = (url) => {
  if (!url) return { isValid: false, error: 'URL ist erforderlich' };

  try {
    const urlObj = new URL(url);

    // Check protocol
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { isValid: false, error: 'Nur HTTP/HTTPS URLs sind erlaubt' };
    }

    // Check for localhost in production
    if (process.env.NODE_ENV === 'production' &&
        (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1')) {
      return { isValid: false, error: 'Localhost URLs sind in Produktion nicht erlaubt' };
    }

    return { isValid: true, error: null };
  } catch (error) {
    return { isValid: false, error: 'Ungültige URL' };
  }
};

/**
 * IP Address validation
 */
export const validateIP = (ip) => {
  if (!ip) return { isValid: false, error: 'IP-Adresse ist erforderlich' };

  // IPv4 pattern
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // IPv6 pattern (simplified)
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

  const isValid = ipv4Regex.test(ip) || ipv6Regex.test(ip);

  if (!isValid) {
    return { isValid: false, error: 'Ungültige IP-Adresse' };
  }

  return { isValid: true, error: null };
};

/**
 * Date range validation
 */
export const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return { isValid: false, error: 'Start- und Enddatum sind erforderlich' };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, error: 'Ungültiges Datumsformat' };
  }

  if (start > end) {
    return { isValid: false, error: 'Startdatum muss vor dem Enddatum liegen' };
  }

  // Check if range is not too large (e.g., max 1 year)
  const oneYear = 365 * 24 * 60 * 60 * 1000;
  if (end - start > oneYear) {
    return { isValid: false, error: 'Datumsbereich darf maximal 1 Jahr umfassen' };
  }

  return { isValid: true, error: null };
};

/**
 * Number validation with range
 */
export const validateNumber = (value, options = {}) => {
  const {
    min = null,
    max = null,
    integer = false,
    positive = false,
    allowZero = true
  } = options;

  const num = Number(value);

  if (isNaN(num)) {
    return { isValid: false, error: 'Ungültige Zahl' };
  }

  if (integer && !Number.isInteger(num)) {
    return { isValid: false, error: 'Nur ganze Zahlen erlaubt' };
  }

  if (positive && num < 0) {
    return { isValid: false, error: 'Nur positive Zahlen erlaubt' };
  }

  if (!allowZero && num === 0) {
    return { isValid: false, error: 'Null ist nicht erlaubt' };
  }

  if (min !== null && num < min) {
    return { isValid: false, error: `Mindestwert ist ${min}` };
  }

  if (max !== null && num > max) {
    return { isValid: false, error: `Maximalwert ist ${max}` };
  }

  return { isValid: true, error: null };
};

/**
 * Text length validation
 */
export const validateTextLength = (text, options = {}) => {
  const {
    minLength = 0,
    maxLength = Infinity,
    required = true
  } = options;

  if (!text && required) {
    return { isValid: false, error: 'Text ist erforderlich' };
  }

  if (!text) {
    return { isValid: true, error: null };
  }

  const length = text.trim().length;

  if (length < minLength) {
    return { isValid: false, error: `Mindestens ${minLength} Zeichen erforderlich` };
  }

  if (length > maxLength) {
    return { isValid: false, error: `Maximal ${maxLength} Zeichen erlaubt` };
  }

  return { isValid: true, error: null };
};

/**
 * File validation
 */
export const validateFile = (file, options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = [],
    allowedExtensions = []
  } = options;

  if (!file) {
    return { isValid: false, error: 'Datei ist erforderlich' };
  }

  // Check file size
  if (file.size > maxSize) {
    const sizeMB = (maxSize / 1024 / 1024).toFixed(1);
    return { isValid: false, error: `Datei darf maximal ${sizeMB}MB groß sein` };
  }

  // Check file type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return { isValid: false, error: `Nur folgende Dateitypen erlaubt: ${allowedTypes.join(', ')}` };
  }

  // Check file extension
  if (allowedExtensions.length > 0) {
    const extension = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      return { isValid: false, error: `Nur folgende Dateiendungen erlaubt: ${allowedExtensions.join(', ')}` };
    }
  }

  return { isValid: true, error: null };
};

/**
 * Credit card validation (basic)
 */
export const validateCreditCard = (cardNumber) => {
  if (!cardNumber) {
    return { isValid: false, error: 'Kartennummer ist erforderlich' };
  }

  // Remove spaces and dashes
  const cleaned = cardNumber.replace(/[\s-]/g, '');

  // Check if only digits
  if (!/^\d+$/.test(cleaned)) {
    return { isValid: false, error: 'Kartennummer darf nur Zahlen enthalten' };
  }

  // Check length (most cards are 13-19 digits)
  if (cleaned.length < 13 || cleaned.length > 19) {
    return { isValid: false, error: 'Ungültige Kartennummer-Länge' };
  }

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned.charAt(i), 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  const isValid = sum % 10 === 0;

  return {
    isValid,
    error: isValid ? null : 'Ungültige Kartennummer'
  };
};

/**
 * Swiss postal code validation
 */
export const validateSwissPostalCode = (postalCode) => {
  if (!postalCode) {
    return { isValid: false, error: 'Postleitzahl ist erforderlich' };
  }

  // Swiss postal codes are 4 digits, 1000-9999
  const cleaned = postalCode.replace(/\s/g, '');
  const isValid = /^[1-9]\d{3}$/.test(cleaned);

  if (!isValid) {
    return { isValid: false, error: 'Ungültige Schweizer Postleitzahl' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate form data
 */
export const validateForm = (formData, validationRules) => {
  const errors = {};
  let isValid = true;

  Object.keys(validationRules).forEach(field => {
    const rules = validationRules[field];
    const value = formData[field];

    // Required check
    if (rules.required && !value) {
      errors[field] = `${rules.label || field} ist erforderlich`;
      isValid = false;
      return;
    }

    // Custom validation function
    if (rules.validate && value) {
      const result = rules.validate(value);
      if (!result.isValid) {
        errors[field] = result.error;
        isValid = false;
      }
    }
  });

  return { isValid, errors };
};apps/master/src/services/masterApi.service.js
