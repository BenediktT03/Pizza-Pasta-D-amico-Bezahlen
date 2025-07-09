import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

// Swiss-specific validation schemas
export const swissPhoneSchema = z.string().refine(
  (phone) => isValidPhoneNumber(phone, 'CH'),
  { message: 'Invalid Swiss phone number' }
);

export const swissPostalCodeSchema = z.string().regex(
  /^[1-9]\d{3}$/,
  'Invalid Swiss postal code'
);

export const swissIBANSchema = z.string().regex(
  /^CH\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{1}$/,
  'Invalid Swiss IBAN'
);

// General validation schemas
export const emailSchema = z.string().email('Invalid email address');

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const urlSchema = z.string().url('Invalid URL');

// Address validation
export const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  houseNumber: z.string().min(1, 'House number is required'),
  postalCode: swissPostalCodeSchema,
  city: z.string().min(1, 'City is required'),
  canton: z.string().length(2, 'Canton must be 2 characters'),
  country: z.string().default('CH'),
  floor: z.string().optional(),
  additionalInfo: z.string().optional()
});

// Order validation
export const orderItemSchema = z.object({
  productId: z.string(),
  name: z.string(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  modifiers: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number()
  })).optional(),
  notes: z.string().optional()
});

export const orderSchema = z.object({
  type: z.enum(['delivery', 'pickup', 'dinein']),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  customerInfo: z.object({
    name: z.string().min(1, 'Name is required'),
    email: emailSchema,
    phone: swissPhoneSchema,
    notes: z.string().optional()
  }),
  deliveryAddress: addressSchema.optional(),
  scheduledTime: z.string().datetime().optional(),
  paymentMethod: z.enum(['card', 'twint', 'cash']),
  total: z.number().positive(),
  subtotal: z.number().positive(),
  tax: z.number().nonnegative(),
  deliveryFee: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional()
});

// Product validation
export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  categoryId: z.string(),
  imageUrl: urlSchema.optional(),
  active: z.boolean().default(true),
  inStock: z.boolean().default(true),
  dietary: z.array(z.enum(['vegetarian', 'vegan', 'glutenFree', 'lactoseFree', 'organic', 'halal'])).optional(),
  allergens: z.array(z.string()).optional(),
  nutritionalInfo: z.object({
    calories: z.number().optional(),
    protein: z.number().optional(),
    carbs: z.number().optional(),
    fat: z.number().optional(),
    fiber: z.number().optional(),
    sugar: z.number().optional(),
    salt: z.number().optional()
  }).optional(),
  modifiers: z.array(z.object({
    id: z.string(),
    name: z.string(),
    options: z.array(z.object({
      id: z.string(),
      name: z.string(),
      price: z.number()
    })),
    required: z.boolean().default(false),
    multiple: z.boolean().default(false)
  })).optional()
});

// User validation
export const userProfileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  email: emailSchema,
  phoneNumber: swissPhoneSchema.optional(),
  photoURL: urlSchema.optional(),
  address: addressSchema.optional(),
  dateOfBirth: z.string().datetime().optional(),
  preferences: z.object({
    language: z.enum(['de', 'fr', 'it', 'en']).default('de'),
    currency: z.enum(['CHF', 'EUR']).default('CHF'),
    notifications: z.object({
      email: z.boolean().default(true),
      sms: z.boolean().default(false),
      push: z.boolean().default(true)
    }),
    dietary: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional()
  }).optional()
});

// Payment validation
export const creditCardSchema = z.object({
  number: z.string().regex(/^\d{13,19}$/, 'Invalid credit card number'),
  expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Invalid month'),
  expiryYear: z.string().regex(/^\d{2,4}$/, 'Invalid year'),
  cvc: z.string().regex(/^\d{3,4}$/, 'Invalid CVC'),
  holderName: z.string().min(1, 'Cardholder name is required')
});

export const twintSchema = z.object({
  phoneNumber: swissPhoneSchema
});

// Business hours validation
export const timeSlotSchema = z.object({
  open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format')
});

export const businessHoursSchema = z.object({
  monday: z.union([timeSlotSchema, z.literal('closed')]),
  tuesday: z.union([timeSlotSchema, z.literal('closed')]),
  wednesday: z.union([timeSlotSchema, z.literal('closed')]),
  thursday: z.union([timeSlotSchema, z.literal('closed')]),
  friday: z.union([timeSlotSchema, z.literal('closed')]),
  saturday: z.union([timeSlotSchema, z.literal('closed')]),
  sunday: z.union([timeSlotSchema, z.literal('closed')])
});

// Tenant validation
export const tenantSchema = z.object({
  name: z.string().min(1, 'Restaurant name is required'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  description: z.string().optional(),
  logo: urlSchema.optional(),
  coverImage: urlSchema.optional(),
  address: addressSchema,
  phone: swissPhoneSchema,
  email: emailSchema,
  website: urlSchema.optional(),
  businessHours: businessHoursSchema,
  cuisine: z.array(z.string()).optional(),
  priceRange: z.enum(['$', '$$', '$$$', '$$$$']).optional(),
  features: z.array(z.string()).optional(),
  paymentMethods: z.array(z.enum(['card', 'twint', 'cash'])),
  deliveryRadius: z.number().positive().optional(),
  minimumOrder: z.number().nonnegative().optional(),
  deliveryFee: z.number().nonnegative().optional(),
  taxRate: z.number().min(0).max(100),
  currency: z.enum(['CHF', 'EUR']).default('CHF'),
  languages: z.array(z.enum(['de', 'fr', 'it', 'en'])).default(['de']),
  active: z.boolean().default(true)
});

// Export validation functions
export const validate = {
  email: (value: string) => emailSchema.safeParse(value),
  password: (value: string) => passwordSchema.safeParse(value),
  swissPhone: (value: string) => swissPhoneSchema.safeParse(value),
  swissPostalCode: (value: string) => swissPostalCodeSchema.safeParse(value),
  swissIBAN: (value: string) => swissIBANSchema.safeParse(value),
  address: (value: unknown) => addressSchema.safeParse(value),
  order: (value: unknown) => orderSchema.safeParse(value),
  product: (value: unknown) => productSchema.safeParse(value),
  userProfile: (value: unknown) => userProfileSchema.safeParse(value),
  creditCard: (value: unknown) => creditCardSchema.safeParse(value),
  twint: (value: unknown) => twintSchema.safeParse(value),
  businessHours: (value: unknown) => businessHoursSchema.safeParse(value),
  tenant: (value: unknown) => tenantSchema.safeParse(value)
};

// Export all schemas
export default {
  swissPhoneSchema,
  swissPostalCodeSchema,
  swissIBANSchema,
  emailSchema,
  passwordSchema,
  urlSchema,
  addressSchema,
  orderItemSchema,
  orderSchema,
  productSchema,
  userProfileSchema,
  creditCardSchema,
  twintSchema,
  timeSlotSchema,
  businessHoursSchema,
  tenantSchema,
  validate
};
