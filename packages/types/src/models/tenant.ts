/**
 * Tenant Model Types
 * Type definitions for multi-tenant architecture
 */

import { z } from 'zod';

// Tenant status enum
export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
  PENDING = 'pending',
  DELETED = 'deleted',
}

// Tenant plan enum
export enum TenantPlan {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
  CUSTOM = 'custom',
}

// Base tenant interface
export interface Tenant {
  id: string;
  slug: string;
  name: string;
  displayName: string;
  description?: string;
  logo?: string;
  favicon?: string;
  status: TenantStatus;
  plan: TenantPlan;
  ownerId: string;
  settings: TenantSettings;
  features: TenantFeatures;
  billing: TenantBilling;
  limits: TenantLimits;
  metadata: TenantMetadata;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// Tenant settings
export interface TenantSettings {
  general: GeneralSettings;
  branding: BrandingSettings;
  location: LocationSettings;
  ordering: OrderingSettings;
  payment: PaymentSettings;
  notifications: NotificationSettings;
  integrations: IntegrationSettings;
}

// General settings
export interface GeneralSettings {
  timezone: string;
  currency: 'CHF' | 'EUR';
  language: 'de' | 'fr' | 'it' | 'en';
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

// Branding settings
export interface BrandingSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily?: string;
  customCss?: string;
  emailTemplate?: string;
  invoiceTemplate?: string;
}

// Location settings
export interface LocationSettings {
  name: string;
  address: Address;
  coordinates: Coordinates;
  businessHours: BusinessHours;
  holidays: Holiday[];
  deliveryZones: DeliveryZone[];
}

// Address interface
export interface Address {
  street: string;
  streetNumber: string;
  city: string;
  postalCode: string;
  canton: SwissCanton;
  country: 'CH';
}

// Swiss cantons enum
export enum SwissCanton {
  AG = 'AG', // Aargau
  AI = 'AI', // Appenzell Innerrhoden
  AR = 'AR', // Appenzell Ausserrhoden
  BE = 'BE', // Bern
  BL = 'BL', // Basel-Landschaft
  BS = 'BS', // Basel-Stadt
  FR = 'FR', // Fribourg
  GE = 'GE', // Genève
  GL = 'GL', // Glarus
  GR = 'GR', // Graubünden
  JU = 'JU', // Jura
  LU = 'LU', // Luzern
  NE = 'NE', // Neuchâtel
  NW = 'NW', // Nidwalden
  OW = 'OW', // Obwalden
  SG = 'SG', // St. Gallen
  SH = 'SH', // Schaffhausen
  SO = 'SO', // Solothurn
  SZ = 'SZ', // Schwyz
  TG = 'TG', // Thurgau
  TI = 'TI', // Ticino
  UR = 'UR', // Uri
  VD = 'VD', // Vaud
  VS = 'VS', // Valais
  ZG = 'ZG', // Zug
  ZH = 'ZH', // Zürich
}

// Coordinates interface
export interface Coordinates {
  lat: number;
  lng: number;
}

// Business hours interface
export interface BusinessHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

// Day hours interface
export interface DayHours {
  isOpen: boolean;
  openTime?: string; // HH:mm format
  closeTime?: string; // HH:mm format
  breaks?: TimeSlot[];
}

// Time slot interface
export interface TimeSlot {
  start: string; // HH:mm format
  end: string; // HH:mm format
}

// Holiday interface
export interface Holiday {
  date: Date;
  name: string;
  isClosedAllDay: boolean;
  specialHours?: DayHours;
}

// Delivery zone interface
export interface DeliveryZone {
  id: string;
  name: string;
  postalCodes: string[];
  minOrderAmount: number;
  deliveryFee: number;
  estimatedTime: number; // in minutes
}

// Ordering settings
export interface OrderingSettings {
  minOrderAmount: number;
  maxOrderAmount: number;
  acceptOrders: boolean;
  acceptPreorders: boolean;
  maxPreorderDays: number;
  autoAcceptOrders: boolean;
  orderPrefix: string;
  preparationTime: number; // in minutes
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  tableOrderEnabled: boolean;
}

// Payment settings
export interface PaymentSettings {
  acceptCash: boolean;
  acceptCard: boolean;
  acceptTwint: boolean;
  acceptInvoice: boolean;
  stripeEnabled: boolean;
  stripePublicKey?: string;
  twintNumber?: string;
  invoiceTerms?: number; // days
  taxRate: number; // percentage
  includeTaxInPrices: boolean;
}

// Notification settings
export interface NotificationSettings {
  orderEmail?: string;
  notifyOnNewOrder: boolean;
  notifyOnCancellation: boolean;
  customerEmailEnabled: boolean;
  customerSmsEnabled: boolean;
  staffPushEnabled: boolean;
}

// Integration settings
export interface IntegrationSettings {
  googleMapsApiKey?: string;
  twilioEnabled: boolean;
  sentryEnabled: boolean;
  plausibleEnabled: boolean;
  googleAnalyticsId?: string;
  facebookPixelId?: string;
}

// Tenant features
export interface TenantFeatures {
  multiLanguage: boolean;
  multiLocation: boolean;
  voiceOrdering: boolean;
  aiPricing: boolean;
  loyaltyProgram: boolean;
  giftCards: boolean;
  tableReservation: boolean;
  inventoryManagement: boolean;
  advancedAnalytics: boolean;
  customReports: boolean;
  apiAccess: boolean;
  whiteLabel: boolean;
}

// Tenant billing
export interface TenantBilling {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  trialEndsAt?: Date;
  cancelledAt?: Date;
  paymentMethod?: PaymentMethod;
  invoices: Invoice[];
}

// Payment method interface
export interface PaymentMethod {
  id: string;
  type: 'card' | 'sepa' | 'invoice';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

// Invoice interface
export interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void';
  dueDate?: Date;
  paidAt?: Date;
  downloadUrl?: string;
}

// Tenant limits
export interface TenantLimits {
  maxUsers: number;
  maxProducts: number;
  maxOrders: number;
  maxLocations: number;
  maxStorageGB: number;
  maxApiRequests: number;
}

// Tenant metadata
export interface TenantMetadata {
  industry?: string;
  employeeCount?: string;
  foundedYear?: number;
  registrationNumber?: string;
  vatNumber?: string;
  customFields?: Record<string, any>;
}

// Create tenant input
export interface CreateTenantInput {
  name: string;
  displayName: string;
  slug?: string;
  description?: string;
  ownerId: string;
  plan?: TenantPlan;
  location: LocationSettings;
}

// Update tenant input
export interface UpdateTenantInput {
  displayName?: string;
  description?: string;
  logo?: string;
  favicon?: string;
  settings?: Partial<TenantSettings>;
  features?: Partial<TenantFeatures>;
  limits?: Partial<TenantLimits>;
  metadata?: Partial<TenantMetadata>;
}

// Validation schemas
export const tenantSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().optional(),
  logo: z.string().url().optional(),
  favicon: z.string().url().optional(),
  status: z.nativeEnum(TenantStatus),
  plan: z.nativeEnum(TenantPlan),
  ownerId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
});

export const createTenantSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional(),
  ownerId: z.string().uuid(),
  plan: z.nativeEnum(TenantPlan).optional(),
});

// Helpers
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isTrialExpired(tenant: Tenant): boolean {
  if (tenant.plan !== TenantPlan.TRIAL) return false;
  if (!tenant.billing.trialEndsAt) return false;
  return new Date() > new Date(tenant.billing.trialEndsAt);
}

export function canUseFeat

ure(tenant: Tenant, feature: keyof TenantFeatures): boolean {
  return tenant.features[feature] === true;
}

export function isWithinLimits(tenant: Tenant, limit: keyof TenantLimits, current: number): boolean {
  return current < tenant.limits[limit];
}
