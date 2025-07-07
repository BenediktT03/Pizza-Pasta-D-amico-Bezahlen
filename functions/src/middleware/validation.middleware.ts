/**
 * EATECH - Request Validation Middleware
 * Version: 1.0.0
 * Description: Express middleware for request validation using Joi
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/middleware/validation.middleware.ts
 */

import { Request, Response, NextFunction } from 'express';
import * as Joi from 'joi';
import { ValidationError, asyncHandler } from '../utils/errorHandler';
import { sanitizeString, sanitizeObject } from '../utils/validationUtils';
import { PATTERNS, LIMITS, BUSINESS_RULES } from '../config/constants';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Validation schema locations
 */
export enum ValidationSource {
  BODY = 'body',
  QUERY = 'query',
  PARAMS = 'params',
  HEADERS = 'headers',
  COOKIES = 'cookies'
}

/**
 * Validation options
 */
export interface ValidationOptions {
  source?: ValidationSource | ValidationSource[];
  abortEarly?: boolean;
  stripUnknown?: boolean;
  allowUnknown?: boolean;
  sanitize?: boolean;
  cache?: boolean;
}

/**
 * Schema map interface
 */
export interface SchemaMap {
  [ValidationSource.BODY]?: Joi.Schema;
  [ValidationSource.QUERY]?: Joi.Schema;
  [ValidationSource.PARAMS]?: Joi.Schema;
  [ValidationSource.HEADERS]?: Joi.Schema;
  [ValidationSource.COOKIES]?: Joi.Schema;
}

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

/**
 * Common field schemas
 */
export const CommonSchemas = {
  // IDs
  id: Joi.string().pattern(PATTERNS.UUID).required(),
  tenantId: Joi.string().pattern(PATTERNS.UUID).required(),
  userId: Joi.string().pattern(PATTERNS.UUID).required(),
  
  // Contact
  email: Joi.string().email().lowercase().trim().max(255).required(),
  phone: Joi.string().pattern(PATTERNS.SWISS_PHONE).required(),
  
  // Address
  address: Joi.object({
    street: Joi.string().min(1).max(100).required(),
    streetNumber: Joi.string().max(20).required(),
    additionalLine: Joi.string().max(100).optional(),
    postalCode: Joi.string().pattern(PATTERNS.SWISS_POSTAL_CODE).required(),
    city: Joi.string().min(1).max(100).required(),
    state: Joi.string().max(100).optional(),
    country: Joi.string().length(2).uppercase().default('CH')
  }),
  
  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(LIMITS.MAX_PAGE_SIZE).default(LIMITS.DEFAULT_PAGE_SIZE),
    sort: Joi.string().max(50).optional(),
    order: Joi.string().valid('asc', 'desc').default('desc')
  }),
  
  // Date range
  dateRange: Joi.object({
    start: Joi.date().iso().required(),
    end: Joi.date().iso().min(Joi.ref('start')).required()
  }),
  
  // Money
  price: Joi.number().positive().precision(2).max(99999.99).required(),
  currency: Joi.string().length(3).uppercase().default('CHF'),
  
  // Text
  name: Joi.string().min(1).max(LIMITS.MAX_NAME_LENGTH).required(),
  description: Joi.string().max(LIMITS.MAX_DESCRIPTION_LENGTH).optional(),
  note: Joi.string().max(LIMITS.MAX_NOTE_LENGTH).optional(),
  
  // URL
  url: Joi.string().uri().max(LIMITS.MAX_URL_LENGTH).optional(),
  
  // File
  file: Joi.object({
    filename: Joi.string().max(255).required(),
    mimetype: Joi.string().max(100).required(),
    size: Joi.number().integer().positive().max(LIMITS.MAX_FILE_SIZE).required()
  })
};

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Order validation schemas
 */
export const OrderSchemas = {
  create: Joi.object({
    items: Joi.array().items(
      Joi.object({
        productId: CommonSchemas.id,
        variantId: Joi.string().pattern(PATTERNS.UUID).optional(),
        quantity: Joi.number().integer().positive().max(BUSINESS_RULES.MAX_QUANTITY_PER_ITEM).required(),
        modifiers: Joi.array().items(
          Joi.object({
            id: Joi.string().required(),
            name: Joi.string().required(),
            price: Joi.number().min(0).optional()
          })
        ).optional(),
        specialInstructions: Joi.string().max(500).optional()
      })
    ).min(1).max(BUSINESS_RULES.MAX_ITEMS_PER_ORDER).required(),
    
    deliveryType: Joi.string().valid('pickup', 'delivery', 'dine_in').required(),
    
    delivery: Joi.when('deliveryType', {
      is: 'delivery',
      then: Joi.object({
        address: CommonSchemas.address.required(),
        scheduledTime: Joi.date().iso().min('now').optional(),
        instructions: Joi.string().max(500).optional()
      }).required(),
      otherwise: Joi.optional()
    }),
    
    payment: Joi.object({
      method: Joi.string().valid('cash', 'card', 'twint', 'paypal', 'invoice').required(),
      tip: Joi.number().min(0).max(1000).optional()
    }).required(),
    
    customer: Joi.object({
      id: Joi.string().pattern(PATTERNS.UUID).optional(),
      name: Joi.string().min(1).max(100).required(),
      email: CommonSchemas.email,
      phone: CommonSchemas.phone
    }).required(),
    
    note: CommonSchemas.note
  }),
  
  update: Joi.object({
    status: Joi.string().valid(
      'confirmed', 'preparing', 'ready', 'delivering', 
      'completed', 'cancelled'
    ).optional(),
    
    estimatedCompletionTime: Joi.date().iso().min('now').optional(),
    
    delivery: Joi.object({
      driverId: CommonSchemas.userId.optional(),
      actualDeliveryTime: Joi.date().iso().optional()
    }).optional(),
    
    cancellation: Joi.object({
      reason: Joi.string().max(500).required(),
      refundAmount: Joi.number().min(0).optional()
    }).optional()
  })
};

/**
 * Product validation schemas
 */
export const ProductSchemas = {
  create: Joi.object({
    sku: Joi.string().pattern(PATTERNS.SKU).required(),
    name: CommonSchemas.name,
    description: CommonSchemas.description.required(),
    category: Joi.string().required(),
    
    pricing: Joi.object({
      basePrice: CommonSchemas.price,
      comparePrice: Joi.number().positive().precision(2).optional(),
      currency: CommonSchemas.currency,
      taxRate: Joi.number().min(0).max(100).default(7.7)
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
        url: CommonSchemas.url.required(),
        alt: Joi.string().max(255).required(),
        position: Joi.number().integer().min(0).required()
      })
    ).min(1).required(),
    
    status: Joi.string().valid('active', 'inactive', 'out_of_stock').default('active'),
    
    options: Joi.object({
      sizes: Joi.array().items(Joi.string()).optional(),
      customizations: Joi.array().items(Joi.object()).optional()
    }).optional()
  }),
  
  update: Joi.object({
    name: CommonSchemas.name.optional(),
    description: CommonSchemas.description.optional(),
    status: Joi.string().valid('active', 'inactive', 'out_of_stock').optional(),
    
    pricing: Joi.object({
      basePrice: CommonSchemas.price.optional(),
      comparePrice: Joi.number().positive().precision(2).optional()
    }).optional(),
    
    inventory: Joi.object({
      quantity: Joi.number().integer().min(0).optional(),
      lowStockThreshold: Joi.number().integer().positive().optional()
    }).optional()
  }).min(1)
};

/**
 * Customer validation schemas
 */
export const CustomerSchemas = {
  create: Joi.object({
    profile: Joi.object({
      firstName: Joi.string().min(1).max(100).required(),
      lastName: Joi.string().min(1).max(100).required(),
      dateOfBirth: Joi.date().iso().max('now').optional(),
      gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say').optional(),
      language: Joi.string().length(2).default('de')
    }).required(),
    
    contact: Joi.object({
      email: CommonSchemas.email,
      phone: CommonSchemas.phone.optional(),
      whatsapp: CommonSchemas.phone.optional()
    }).required(),
    
    address: CommonSchemas.address.optional(),
    
    preferences: Joi.object({
      marketingOptIn: Joi.boolean().default(false),
      communicationChannels: Joi.array().items(
        Joi.string().valid('email', 'sms', 'push', 'whatsapp')
      ).default(['email'])
    }).optional(),
    
    consent: Joi.object({
      termsAccepted: Joi.boolean().valid(true).required(),
      privacyPolicyAccepted: Joi.boolean().valid(true).required()
    }).required()
  }),
  
  update: Joi.object({
    profile: Joi.object({
      firstName: Joi.string().min(1).max(100).optional(),
      lastName: Joi.string().min(1).max(100).optional(),
      dateOfBirth: Joi.date().iso().max('now').optional(),
      gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say').optional()
    }).optional(),
    
    contact: Joi.object({
      phone: CommonSchemas.phone.optional(),
      whatsapp: CommonSchemas.phone.optional()
    }).optional()
  }).min(1)
};

/**
 * Authentication validation schemas
 */
export const AuthSchemas = {
  register: Joi.object({
    email: CommonSchemas.email,
    password: Joi.string().pattern(PATTERNS.STRONG_PASSWORD).required(),
    profile: Joi.object({
      firstName: Joi.string().min(1).max(100).required(),
      lastName: Joi.string().min(1).max(100).required()
    }).required()
  }),
  
  login: Joi.object({
    email: CommonSchemas.email,
    password: Joi.string().required()
  }),
  
  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().pattern(PATTERNS.STRONG_PASSWORD).required()
  }),
  
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().pattern(PATTERNS.STRONG_PASSWORD).required()
  })
};

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Creates validation middleware for a single schema
 */
export function validate(
  schema: Joi.Schema,
  options: ValidationOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const {
      source = ValidationSource.BODY,
      abortEarly = false,
      stripUnknown = true,
      allowUnknown = false,
      sanitize = true
    } = options;
    
    // Get data to validate
    const data = req[source as keyof Request];
    
    if (!data) {
      return next();
    }
    
    // Sanitize input if enabled
    let sanitizedData = data;
    if (sanitize && typeof data === 'object') {
      sanitizedData = sanitizeObject(data);
    }
    
    // Validate
    const { error, value } = schema.validate(sanitizedData, {
      abortEarly,
      stripUnknown,
      allowUnknown
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      throw new ValidationError('Validation failed', errors);
    }
    
    // Replace with validated value
    (req as any)[source] = value;
    
    next();
  });
}

/**
 * Creates validation middleware for multiple schemas
 */
export function validateMultiple(
  schemas: SchemaMap,
  options: ValidationOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors: Array<{ field: string; message: string }> = [];
    
    // Validate each source
    for (const [source, schema] of Object.entries(schemas)) {
      if (!schema) continue;
      
      const data = req[source as keyof Request];
      if (!data) continue;
      
      // Sanitize if enabled
      let sanitizedData = data;
      if (options.sanitize && typeof data === 'object') {
        sanitizedData = sanitizeObject(data);
      }
      
      // Validate
      const { error, value } = schema.validate(sanitizedData, {
        abortEarly: false,
        stripUnknown: options.stripUnknown !== false,
        allowUnknown: options.allowUnknown === true
      });
      
      if (error) {
        errors.push(...error.details.map(detail => ({
          field: `${source}.${detail.path.join('.')}`,
          message: detail.message
        })));
      } else {
        // Replace with validated value
        (req as any)[source] = value;
      }
    }
    
    if (errors.length > 0) {
      throw new ValidationError('Validation failed', errors);
    }
    
    next();
  });
}

// ============================================================================
// SANITIZATION MIDDLEWARE
// ============================================================================

/**
 * Sanitizes request data
 */
export const sanitizeRequest = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query) as any;
  }
  
  // Sanitize params
  if (req.params && typeof req.params === 'object') {
    Object.keys(req.params).forEach(key => {
      if (typeof req.params[key] === 'string') {
        req.params[key] = sanitizeString(req.params[key]);
      }
    });
  }
  
  next();
});

// ============================================================================
// FILE VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Validates uploaded files
 */
export function validateFiles(options: {
  maxFiles?: number;
  maxSize?: number;
  allowedTypes?: string[];
  required?: boolean;
} = {}) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const {
      maxFiles = LIMITS.MAX_FILES_PER_UPLOAD,
      maxSize = LIMITS.MAX_FILE_SIZE,
      allowedTypes = [],
      required = false
    } = options;
    
    const files = req.files as Express.Multer.File[] | undefined;
    
    if (!files || files.length === 0) {
      if (required) {
        throw new ValidationError('No files uploaded');
      }
      return next();
    }
    
    // Check file count
    if (files.length > maxFiles) {
      throw new ValidationError(`Maximum ${maxFiles} files allowed`);
    }
    
    // Validate each file
    const errors: Array<{ field: string; message: string }> = [];
    
    files.forEach((file, index) => {
      // Check file size
      if (file.size > maxSize) {
        errors.push({
          field: `files[${index}]`,
          message: `File size exceeds maximum of ${maxSize / 1024 / 1024}MB`
        });
      }
      
      // Check file type
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
        errors.push({
          field: `files[${index}]`,
          message: `File type ${file.mimetype} not allowed`
        });
      }
    });
    
    if (errors.length > 0) {
      throw new ValidationError('File validation failed', errors);
    }
    
    next();
  });
}

// ============================================================================
// QUERY VALIDATION HELPERS
// ============================================================================

/**
 * Validates and parses pagination query parameters
 */
export const validatePagination = validate(
  CommonSchemas.pagination,
  { source: ValidationSource.QUERY }
);

/**
 * Validates and parses date range query parameters
 */
export const validateDateRange = validate(
  CommonSchemas.dateRange,
  { source: ValidationSource.QUERY }
);

/**
 * Validates search query parameters
 */
export const validateSearch = validate(
  Joi.object({
    q: Joi.string()
      .min(LIMITS.MIN_SEARCH_QUERY_LENGTH)
      .max(LIMITS.MAX_SEARCH_QUERY_LENGTH)
      .required(),
    fields: Joi.array().items(Joi.string()).optional(),
    fuzzy: Joi.boolean().default(true)
  }),
  { source: ValidationSource.QUERY }
);

// ============================================================================
// CUSTOM VALIDATORS
// ============================================================================

/**
 * Validates Swiss business registration number
 */
export const validateSwissBusinessNumber = (value: string): string => {
  const pattern = /^CHE-\d{3}\.\d{3}\.\d{3}$/;
  if (!pattern.test(value)) {
    throw new Error('Invalid Swiss business registration number');
  }
  return value;
};

/**
 * Validates IBAN
 */
export const validateIBAN = (value: string): string => {
  const pattern = PATTERNS.IBAN;
  if (!pattern.test(value)) {
    throw new Error('Invalid IBAN format');
  }
  return value;
};

/**
 * Validates coordinates
 */
export const validateCoordinates = (value: { lat: number; lng: number }): any => {
  if (value.lat < -90 || value.lat > 90) {
    throw new Error('Invalid latitude');
  }
  if (value.lng < -180 || value.lng > 180) {
    throw new Error('Invalid longitude');
  }
  return value;
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Main functions
  validate,
  validateMultiple,
  sanitizeRequest,
  validateFiles,
  
  // Common validators
  validatePagination,
  validateDateRange,
  validateSearch,
  
  // Schemas
  CommonSchemas,
  OrderSchemas,
  ProductSchemas,
  CustomerSchemas,
  AuthSchemas,
  
  // Custom validators
  validateSwissBusinessNumber,
  validateIBAN,
  validateCoordinates,
  
  // Types
  ValidationSource,
  SchemaMap
};