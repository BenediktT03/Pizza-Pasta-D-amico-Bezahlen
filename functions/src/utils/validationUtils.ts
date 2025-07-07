/**
 * EATECH - Validation Utility Functions
 * Version: 1.0.0
 * Description: Comprehensive validation utilities for data integrity
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/utils/validationUtils.ts
 */

import * as Joi from 'joi';
import { 
  Order, 
  OrderStatus, 
  DeliveryType,
  PaymentMethod 
} from '../types/order.types';
import { 
  Customer, 
  CustomerStatus, 
  CustomerType 
} from '../types/customer.types';
import { 
  Product, 
  ProductStatus, 
  ProductType 
} from '../types/product.types';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// Email validation schema
const emailSchema = Joi.string()
  .email({ tlds: { allow: true } })
  .lowercase()
  .trim()
  .max(255);

// Phone validation schema
const phoneSchema = Joi.string()
  .pattern(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{4,6}$/)
  .min(10)
  .max(20);

// Swiss postal code schema
const swissPostalCodeSchema = Joi.string()
  .pattern(/^[1-9][0-9]{3}$/)
  .length(4);

// Price schema
const priceSchema = Joi.number()
  .positive()
  .precision(2)
  .max(99999.99);

// Percentage schema
const percentageSchema = Joi.number()
  .min(0)
  .max(100)
  .precision(2);

// UUID schema
const uuidSchema = Joi.string()
  .guid({ version: ['uuidv4'] });

// URL schema
const urlSchema = Joi.string()
  .uri({ scheme: ['http', 'https'] })
  .max(2048);

// ============================================================================
// BASIC VALIDATORS
// ============================================================================

/**
 * Validates email address
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  const { error } = emailSchema.validate(email);
  return {
    isValid: !error,
    error: error?.message
  };
}

/**
 * Validates phone number (Swiss format)
 */
export function validatePhoneNumber(phone: string): { isValid: boolean; error?: string; formatted?: string } {
  try {
    const phoneNumber = parsePhoneNumberFromString(phone, 'CH');
    
    if (!phoneNumber || !phoneNumber.isValid()) {
      return {
        isValid: false,
        error: 'Invalid phone number format'
      };
    }

    return {
      isValid: true,
      formatted: phoneNumber.formatInternational()
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid phone number'
    };
  }
}

/**
 * Validates Swiss postal code
 */
export function validateSwissPostalCode(postalCode: string): { isValid: boolean; error?: string } {
  const { error } = swissPostalCodeSchema.validate(postalCode);
  return {
    isValid: !error,
    error: error?.message
  };
}

/**
 * Validates URL
 */
export function validateUrl(url: string): { isValid: boolean; error?: string } {
  const { error } = urlSchema.validate(url);
  return {
    isValid: !error,
    error: error?.message
  };
}

/**
 * Validates UUID
 */
export function validateUuid(uuid: string): { isValid: boolean; error?: string } {
  const { error } = uuidSchema.validate(uuid);
  return {
    isValid: !error,
    error: error?.message
  };
}

// ============================================================================
// ORDER VALIDATION
// ============================================================================

const orderSchema = Joi.object({
  tenantId: Joi.string().required(),
  customerId: Joi.string().when('customerInfo.type', {
    is: 'registered',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  orderNumber: Joi.string().required(),
  status: Joi.string().valid(...Object.values(OrderStatus)).required(),
  deliveryType: Joi.string().valid(...Object.values(DeliveryType)).required(),
  channel: Joi.string().required(),
  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().required(),
      variantId: Joi.string().optional(),
      name: Joi.string().required(),
      quantity: Joi.number().integer().positive().required(),
      price: priceSchema.required(),
      modifiers: Joi.array().optional(),
      addons: Joi.array().optional(),
      specialInstructions: Joi.string().max(500).optional()
    })
  ).min(1).required(),
  totals: Joi.object({
    subtotal: priceSchema.required(),
    discounts: Joi.number().min(0).required(),
    deliveryFee: Joi.number().min(0).required(),
    serviceFee: Joi.number().min(0).required(),
    tax: Joi.number().min(0).required(),
    tip: Joi.number().min(0).required(),
    total: priceSchema.required()
  }).required(),
  delivery: Joi.when('deliveryType', {
    is: DeliveryType.DELIVERY,
    then: Joi.object({
      address: Joi.object({
        street: Joi.string().required(),
        city: Joi.string().required(),
        postalCode: swissPostalCodeSchema.required(),
        country: Joi.string().default('CH')
      }).required(),
      scheduledTime: Joi.date().optional(),
      instructions: Joi.string().max(500).optional()
    }).required(),
    otherwise: Joi.optional()
  }),
  payment: Joi.object({
    method: Joi.string().valid(...Object.values(PaymentMethod)).required(),
    status: Joi.string().required(),
    transactionId: Joi.string().optional()
  }).required()
});

/**
 * Validates complete order object
 */
export async function validateOrder(order: Partial<Order>): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const { error, warning } = orderSchema.validate(order, {
    abortEarly: false,
    warnings: true
  });

  const errors = error?.details.map(detail => detail.message) || [];
  const warnings = warning?.details.map(detail => detail.message) || [];

  // Additional business logic validation
  if (order.totals) {
    const calculatedTotal = 
      order.totals.subtotal - 
      order.totals.discounts + 
      order.totals.deliveryFee + 
      order.totals.serviceFee + 
      order.totals.tax + 
      order.totals.tip;

    if (Math.abs(calculatedTotal - order.totals.total) > 0.01) {
      errors.push('Order total calculation mismatch');
    }
  }

  // Validate delivery time
  if (order.deliveryType === DeliveryType.DELIVERY && order.delivery?.scheduledTime) {
    const scheduledTime = new Date(order.delivery.scheduledTime);
    const now = new Date();
    
    if (scheduledTime < now) {
      errors.push('Delivery time cannot be in the past');
    }
    
    const maxFutureTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    if (scheduledTime > maxFutureTime) {
      warnings.push('Delivery time is more than 7 days in the future');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================================================
// CUSTOMER VALIDATION
// ============================================================================

const customerSchema = Joi.object({
  tenantId: Joi.string().required(),
  status: Joi.string().valid(...Object.values(CustomerStatus)).required(),
  type: Joi.string().valid(...Object.values(CustomerType)).required(),
  profile: Joi.object({
    firstName: Joi.string().min(1).max(100).required(),
    lastName: Joi.string().min(1).max(100).required(),
    dateOfBirth: Joi.date().max('now').optional(),
    language: Joi.string().length(2).default('de'),
    timezone: Joi.string().default('Europe/Zurich')
  }).required(),
  contact: Joi.object({
    email: emailSchema.required(),
    phone: phoneSchema.optional(),
    emailVerified: Joi.boolean().default(false),
    phoneVerified: Joi.boolean().default(false)
  }).required(),
  addresses: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('billing', 'delivery', 'both').required(),
      street: Joi.string().required(),
      streetNumber: Joi.string().required(),
      postalCode: swissPostalCodeSchema.required(),
      city: Joi.string().required(),
      country: Joi.string().default('CH')
    })
  ).optional(),
  consent: Joi.object({
    termsAccepted: Joi.boolean().required(),
    privacyPolicyAccepted: Joi.boolean().required(),
    marketingConsent: Joi.boolean().default(false)
  }).required()
});

/**
 * Validates customer data
 */
export async function validateCustomer(customer: Partial<Customer>): Promise<{
  isValid: boolean;
  errors: string[];
  sanitized?: Partial<Customer>;
}> {
  const { error, value } = customerSchema.validate(customer, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }

  // Additional validation
  const errors: string[] = [];

  // Age validation
  if (value.profile?.dateOfBirth) {
    const age = new Date().getFullYear() - new Date(value.profile.dateOfBirth).getFullYear();
    if (age < 16) {
      errors.push('Customer must be at least 16 years old');
    }
  }

  // Email uniqueness would be checked against database
  // This is just a placeholder for the validation structure

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: value
  };
}

// ============================================================================
// PRODUCT VALIDATION
// ============================================================================

const productSchema = Joi.object({
  tenantId: Joi.string().required(),
  sku: Joi.string().alphanum().required(),
  status: Joi.string().valid(...Object.values(ProductStatus)).required(),
  type: Joi.string().valid(...Object.values(ProductType)).required(),
  info: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(1000).required(),
    preparationTime: Joi.number().integer().positive().optional()
  }).required(),
  pricing: Joi.object({
    basePrice: priceSchema.required(),
    currency: Joi.string().length(3).default('CHF'),
    taxRate: percentageSchema.default(7.7),
    taxIncluded: Joi.boolean().default(true)
  }).required(),
  inventory: Joi.object({
    trackInventory: Joi.boolean().default(false),
    quantity: Joi.number().integer().min(0).when('trackInventory', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    lowStockThreshold: Joi.number().integer().positive().optional()
  }).required(),
  images: Joi.array().items(
    Joi.object({
      url: urlSchema.required(),
      alt: Joi.string().required(),
      position: Joi.number().integer().min(0).required()
    })
  ).min(1).required()
});

/**
 * Validates product data
 */
export async function validateProduct(product: Partial<Product>): Promise<{
  isValid: boolean;
  errors: string[];
  sanitized?: Partial<Product>;
}> {
  const { error, value } = productSchema.validate(product, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }

  // Additional business logic validation
  const errors: string[] = [];

  // Price validation
  if (value.pricing?.comparePrice && value.pricing.comparePrice <= value.pricing.basePrice) {
    errors.push('Compare price must be greater than base price');
  }

  // Inventory validation
  if (value.inventory?.trackInventory && value.inventory.lowStockThreshold) {
    if (value.inventory.lowStockThreshold >= value.inventory.quantity) {
      errors.push('Low stock threshold must be less than current quantity');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: value
  };
}

// ============================================================================
// PAYMENT VALIDATION
// ============================================================================

/**
 * Validates credit card number (Luhn algorithm)
 */
export function validateCreditCard(cardNumber: string): { isValid: boolean; type?: string } {
  // Remove spaces and dashes
  const cleaned = cardNumber.replace(/[\s-]/g, '');
  
  // Check if it's a number
  if (!/^\d+$/.test(cleaned)) {
    return { isValid: false };
  }

  // Luhn algorithm
  let sum = 0;
  let isEven = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);
    
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
  
  if (!isValid) {
    return { isValid: false };
  }

  // Detect card type
  let type = 'unknown';
  if (/^4/.test(cleaned)) {
    type = 'visa';
  } else if (/^5[1-5]/.test(cleaned)) {
    type = 'mastercard';
  } else if (/^3[47]/.test(cleaned)) {
    type = 'amex';
  }

  return { isValid: true, type };
}

/**
 * Validates IBAN (Swiss format)
 */
export function validateIBAN(iban: string): { isValid: boolean; error?: string } {
  // Remove spaces and convert to uppercase
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  
  // Swiss IBAN format: CH + 2 check digits + 5 digit bank code + 12 digit account
  if (!/^CH\d{2}[0-9A-Z]{5}[0-9A-Z]{12}$/.test(cleaned)) {
    return {
      isValid: false,
      error: 'Invalid Swiss IBAN format'
    };
  }

  // IBAN checksum validation would go here
  // For now, just return true if format is correct
  
  return { isValid: true };
}

// ============================================================================
// SANITIZATION
// ============================================================================

/**
 * Sanitizes input string
 */
export function sanitizeString(input: string, options?: {
  trim?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  maxLength?: number;
  removeHtml?: boolean;
}): string {
  let result = input;

  const defaults = {
    trim: true,
    removeHtml: true,
    ...options
  };

  if (defaults.removeHtml) {
    // Remove HTML tags
    result = result.replace(/<[^>]*>/g, '');
  }

  if (defaults.trim) {
    result = result.trim();
  }

  if (defaults.lowercase) {
    result = result.toLowerCase();
  }

  if (defaults.uppercase) {
    result = result.toUpperCase();
  }

  if (defaults.maxLength && result.length > defaults.maxLength) {
    result = result.substring(0, defaults.maxLength);
  }

  return result;
}

/**
 * Sanitizes object by removing null/undefined values
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: Partial<T> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== '') {
      if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        const cleanedNested = sanitizeObject(value);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key as keyof T] = cleanedNested as any;
        }
      } else {
        cleaned[key as keyof T] = value;
      }
    }
  }
  
  return cleaned;
}

// ============================================================================
// SECURITY VALIDATION
// ============================================================================

/**
 * Validates password strength
 */
export function validatePassword(password: string): {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Calculate strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (errors.length === 0) {
    if (password.length >= 12 && /[^A-Za-z0-9]/.test(password)) {
      strength = 'strong';
    } else {
      strength = 'medium';
    }
  }

  return {
    isValid: errors.length === 0,
    strength,
    errors
  };
}

/**
 * Checks for SQL injection patterns
 */
export function containsSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b)(DELETE|DROP|EXEC(UTE)?|INSERT|SELECT|UNION|UPDATE)(\b)/gi,
    /--/g,
    /\/\*/g,
    /\*\//g,
    /xp_/gi,
    /script/gi
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Validates file upload
 */
export function validateFileUpload(file: {
  name: string;
  size: number;
  type: string;
}, options?: {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  allowedExtensions?: string[];
}): { isValid: boolean; error?: string } {
  const defaults = {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf'],
    ...options
  };

  // Check file size
  if (file.size > defaults.maxSize) {
    return {
      isValid: false,
      error: `File size exceeds maximum allowed size of ${defaults.maxSize / 1024 / 1024}MB`
    };
  }

  // Check file type
  if (!defaults.allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'File type not allowed'
    };
  }

  // Check file extension
  const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (!defaults.allowedExtensions.includes(extension)) {
    return {
      isValid: false,
      error: 'File extension not allowed'
    };
  }

  return { isValid: true };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Basic validators
  validateEmail,
  validatePhoneNumber,
  validateSwissPostalCode,
  validateUrl,
  validateUuid,
  
  // Business validators
  validateOrder,
  validateCustomer,
  validateProduct,
  
  // Payment validators
  validateCreditCard,
  validateIBAN,
  
  // Sanitization
  sanitizeString,
  sanitizeObject,
  
  // Security
  validatePassword,
  containsSQLInjection,
  validateFileUpload,
  
  // Schemas (for custom validation)
  schemas: {
    email: emailSchema,
    phone: phoneSchema,
    postalCode: swissPostalCodeSchema,
    price: priceSchema,
    percentage: percentageSchema,
    uuid: uuidSchema,
    url: urlSchema
  }
};