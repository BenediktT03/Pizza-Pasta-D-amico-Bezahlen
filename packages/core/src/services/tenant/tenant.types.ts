import { Timestamp } from 'firebase/firestore';

// Tenant Plans
export enum TenantPlan {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
  CUSTOM = 'custom',
}

// Tenant Status
export enum TenantStatus {
  PENDING_SETUP = 'pending_setup',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
  TRIAL = 'trial',
}

// Swiss Cantons
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

// Business Hours
export interface BusinessHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  open: string; // HH:mm format
  close: string; // HH:mm format
  closed: boolean;
  breaks?: Array<{
    start: string;
    end: string;
  }>;
}

// Tenant Domain
export interface TenantDomain {
  domain: string;
  isPrimary: boolean;
  isVerified: boolean;
  sslEnabled: boolean;
  verificationToken?: string;
  verifiedAt?: Timestamp;
}

// Tenant Location
export interface TenantLocation {
  id: string;
  name: string;
  isPrimary: boolean;
  address: string;
  city: string;
  postalCode: string;
  canton: SwissCanton;
  country: string;
  phone: string;
  email: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  } | null;
  settings?: {
    businessHours?: BusinessHours;
    capacity?: number | null;
    deliveryRadius?: number | null;
    pickupEnabled?: boolean;
    deliveryEnabled?: boolean;
    dineInEnabled?: boolean;
  };
}

// Tenant Settings
export interface TenantSettings {
  // Localization
  language: string;
  languages: string[];
  currency: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  
  // Business
  businessHours: BusinessHours;
  
  // Features
  features: {
    voiceOrdering: boolean;
    multiLocation: boolean;
    inventory: boolean;
    analytics: boolean;
    kitchenDisplay: boolean;
    staffManagement: boolean;
    promotions: boolean;
    loyaltyProgram: boolean;
    apiAccess: boolean;
  };
  
  // Payment
  paymentMethods: {
    cash: boolean;
    card: boolean;
    twint: boolean;
    invoice: boolean;
    cryptocurrency: boolean;
  };
  
  // Order Settings
  orderSettings: {
    minimumOrder: number;
    deliveryFee: number;
    preparationTime: number; // minutes
    autoAcceptOrders: boolean;
    requirePhoneNumber: boolean;
    allowPreorders: boolean;
    maxPreorderDays: number;
  };
  
  // Notifications
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    orderAlerts: boolean;
    lowStockAlerts: boolean;
    dailyReports: boolean;
  };
  
  // Tax
  tax: {
    enabled: boolean;
    rate: number; // percentage
    reducedRate: number; // percentage
    includedInPrice: boolean;
    taxNumber: string;
  };
  
  // Branding
  branding: {
    primaryColor: string;
    secondaryColor: string;
    font: string;
    customCss?: string;
  };
}

// Tenant Stats
export interface TenantStats {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalProducts: number;
  averageOrderValue: number;
  monthlyOrders: number;
  monthlyRevenue: number;
  lastOrderAt: Timestamp | null;
}

// Tenant Subscription
export interface TenantSubscription {
  plan: TenantPlan;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';
  trialEndsAt?: Timestamp;
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

// Main Tenant Interface
export interface Tenant {
  id: string;
  slug: string;
  name: string;
  description: string;
  logo: string | null;
  
  // Owner
  ownerId: string;
  ownerEmail: string;
  
  // Contact
  contact: {
    email: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
    canton: SwissCanton;
    country: string;
  };
  
  // Plan & Status
  plan: TenantPlan;
  status: TenantStatus;
  
  // Settings
  settings: TenantSettings;
  
  // Domains
  domains: TenantDomain[];
  
  // Locations
  locations: TenantLocation[];
  
  // Stats
  stats: TenantStats;
  
  // Subscription
  subscription: TenantSubscription;
  
  // Metadata
  metadata?: Record<string, any>;
  tags?: string[];
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp;
}

// DTOs
export interface CreateTenantDto {
  name: string;
  description?: string;
  logo?: string;
  ownerId: string;
  ownerEmail: string;
  contact: {
    email: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
    canton: SwissCanton;
    country?: string;
  };
  plan?: TenantPlan;
  settings?: Partial<TenantSettings>;
  locations?: Omit<TenantLocation, 'id'>[];
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface UpdateTenantDto {
  name?: string;
  description?: string;
  logo?: string | null;
  contact?: Partial<Tenant['contact']>;
  plan?: TenantPlan;
  status?: TenantStatus;
  settings?: Partial<TenantSettings>;
  domains?: TenantDomain[];
  locations?: TenantLocation[];
  metadata?: Record<string, any>;
  tags?: string[];
  [key: string]: any; // Allow dynamic updates
}

// Tenant Context
export interface TenantContext {
  tenant: Tenant;
  isLoading: boolean;
  error: Error | null;
  
  // Actions
  updateSettings: (settings: Partial<TenantSettings>) => Promise<void>;
  addLocation: (location: Omit<TenantLocation, 'id'>) => Promise<void>;
  updateLocation: (locationId: string, data: Partial<TenantLocation>) => Promise<void>;
  removeLocation: (locationId: string) => Promise<void>;
  addDomain: (domain: string) => Promise<void>;
  removeDomain: (domain: string) => Promise<void>;
  setPrimaryDomain: (domain: string) => Promise<void>;
  verifyDomain: (domain: string, token: string) => Promise<void>;
}

// Permission Types
export interface TenantPermissions {
  canManageSettings: boolean;
  canManageUsers: boolean;
  canManageProducts: boolean;
  canManageOrders: boolean;
  canManagePayments: boolean;
  canViewAnalytics: boolean;
  canExportData: boolean;
  canAccessAPI: boolean;
}

// Feature Flags
export interface TenantFeatureFlags {
  betaFeatures: boolean;
  experimentalVoice: boolean;
  advancedAnalytics: boolean;
  customIntegrations: boolean;
  whiteLabel: boolean;
}
