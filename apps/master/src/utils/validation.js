/**
 * EATECH Master Validation Utilities
 * Version: 1.0.0
 * 
 * Validation helpers für Master Control
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/utils/validation.js
 */

/**
 * Email Validation
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Password Validation for Master
 */
export const validatePassword = (password) => {
  // Master passwords must be extra secure
  const minLength = 12;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return {
    isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
    errors: {
      length: password.length < minLength ? `Mindestens ${minLength} Zeichen erforderlich` : null,
      uppercase: !hasUpperCase ? 'Mindestens ein Großbuchstabe erforderlich' : null,
      lowercase: !hasLowerCase ? 'Mindestens ein Kleinbuchstabe erforderlich' : null,
      number: !hasNumbers ? 'Mindestens eine Zahl erforderlich' : null,
      special: !hasSpecialChar ? 'Mindestens ein Sonderzeichen erforderlich' : null
    }
  };
};

/**
 * IP Address Validation
 */
export const validateIP = (ip) => {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([\da-f]{1,4}:){7}[\da-f]{1,4}$/i;
  
  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.');
    return parts.every(part => parseInt(part) >= 0 && parseInt(part) <= 255);
  }
  
  return ipv6Regex.test(ip);
};

/**
 * Session Token Validation
 */
export const validateSessionToken = (token) => {
  // Token should be 64 characters hex string
  const tokenRegex = /^[a-f0-9]{64}$/i;
  return tokenRegex.test(token);
};

/**
 * Sanitize Input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Validate Phone Number (Swiss format)
 */
export const validatePhoneNumber = (phone) => {
  // Swiss phone number formats
  const swissPhoneRegex = /^(\+41|0041|0)[1-9]\d{8}$/;
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  return swissPhoneRegex.test(cleanPhone);
};

/**
 * Validate Swiss Postal Code
 */
export const validateSwissPostalCode = (code) => {
  const postalCodeRegex = /^[1-9]\d{3}$/;
  return postalCodeRegex.test(code);
};

/**
 * Validate URL
 */
export const validateURL = (url) => {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

/**
 * Validate Date Range
 */
export const validateDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, error: 'Ungültiges Datum' };
  }
  
  if (start > end) {
    return { isValid: false, error: 'Startdatum muss vor Enddatum liegen' };
  }
  
  return { isValid: true };
};

/**
 * Validate Percentage
 */
export const validatePercentage = (value) => {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0 && num <= 100;
};

/**
 * Validate Swiss Currency Amount
 */
export const validateCurrencyAmount = (amount) => {
  // Swiss currency format: 1'234.56 or 1234.56
  const currencyRegex = /^\d{1,3}('?\d{3})*(\.\d{2})?$/;
  const cleanAmount = amount.toString().replace(/[CHF\s]/g, '');
  return currencyRegex.test(cleanAmount);
};

/**
 * Strong ID Validation
 */
export const validateStrongId = (id) => {
  // IDs should be alphanumeric with dashes/underscores, min 8 chars
  const idRegex = /^[a-zA-Z0-9_-]{8,}$/;
  return idRegex.test(id);
};