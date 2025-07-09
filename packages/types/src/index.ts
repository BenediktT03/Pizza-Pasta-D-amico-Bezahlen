/**
 * EATECH Types Package
 * Shared TypeScript type definitions for the EATECH platform
 */

// Export all model types
export * from './models/user';
export * from './models/tenant';
export * from './models/product';
export * from './models/order';
export * from './models/payment';
export * from './models/location';

// Export all API types
export * from './api/requests';
export * from './api/responses';

// Export all event types
export * from './events/order.events';
export * from './events/system.events';

// Export all config types
export * from './config/app.config';
export * from './config/firebase.config';

// Re-export commonly used types at the top level
export type {
  // User types
  User,
  UserRole,
  UserStatus,
  AuthUser,
  StaffMember,
  CreateUserInput,
  UpdateUserInput,
  // Tenant types
  Tenant,
  TenantStatus,
  TenantPlan,
  CreateTenantInput,
  UpdateTenantInput,
  // Product types
  Product,
  ProductStatus,
  ProductType,
  ProductCategory,
  CreateProductInput,
  UpdateProductInput,
  // Order types
  Order,
  OrderStatus,
  OrderType,
  OrderChannel,
  OrderItem,
  CreateOrderInput,
  UpdateOrderInput,
  // Payment types
  Payment,
  PaymentMethod,
  PaymentStatus,
  PaymentProvider,
  CreatePaymentInput,
  // Location types
  Location,
  LocationType,
  LocationStatus,
  Coordinates,
  CreateLocationInput,
  UpdateLocationInput,
} from './models/index';

// Common utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

export type RequireOnlyOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> &
      Partial<Record<Exclude<Keys, K>, undefined>>;
  }[Keys];

export type Nullable<T> = T | null;

export type Nullish<T> = T | null | undefined;

export type ValueOf<T> = T[keyof T];

export type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

// Date utility types
export type DateString = string;
export type Timestamp = number;
export type Duration = number; // in milliseconds

// ID types
export type UUID = string;
export type ID = string;

// Common response types
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: Date;
    version: string;
  };
};

export type PaginatedResponse<T> = ApiResponse<T[]> & {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

// Common request types
export type SortOrder = 'asc' | 'desc';

export type FilterOperator = 
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'contains'
  | 'startsWith'
  | 'endsWith';

export type Filter<T = any> = {
  field: keyof T;
  operator: FilterOperator;
  value: any;
};

export type Sort<T = any> = {
  field: keyof T;
  order: SortOrder;
};

export type PaginationParams = {
  page?: number;
  limit?: number;
  offset?: number;
};

export type QueryParams<T = any> = PaginationParams & {
  filters?: Filter<T>[];
  sort?: Sort<T>[];
  search?: string;
  fields?: (keyof T)[];
};

// Status types
export type Status = 'active' | 'inactive' | 'pending' | 'archived' | 'deleted';

// Swiss-specific types
export type SwissPhoneNumber = string;
export type SwissPostalCode = string;
export type SwissIBAN = string;
export type SwissCanton = 
  | 'AG' | 'AI' | 'AR' | 'BE' | 'BL' | 'BS' | 'FR' | 'GE'
  | 'GL' | 'GR' | 'JU' | 'LU' | 'NE' | 'NW' | 'OW' | 'SG'
  | 'SH' | 'SO' | 'SZ' | 'TG' | 'TI' | 'UR' | 'VD' | 'VS'
  | 'ZG' | 'ZH';

// Language codes
export type LanguageCode = 'de' | 'fr' | 'it' | 'en';
export type LocaleCode = 'de-CH' | 'fr-CH' | 'it-CH' | 'en-CH';

// Currency types
export type Currency = 'CHF' | 'EUR';
export type Money = {
  amount: number;
  currency: Currency;
};

// Time types
export type TimeString = string; // HH:mm format
export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

// File types
export type FileType = 'image' | 'video' | 'audio' | 'document' | 'other';
export type MimeType = string;

export type FileUpload = {
  name: string;
  size: number;
  type: MimeType;
  url: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
};

// Geolocation types
export type GeoPoint = {
  lat: number;
  lng: number;
};

export type GeoBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

// Audit types
export type AuditAction = 'create' | 'update' | 'delete' | 'view' | 'export' | 'import';

export type AuditLog = {
  id: ID;
  action: AuditAction;
  resource: string;
  resourceId?: ID;
  userId: ID;
  timestamp: Date;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
};

// Error types
export type ErrorCode = string;
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AppError = {
  code: ErrorCode;
  message: string;
  severity: ErrorSeverity;
  stack?: string;
  context?: Record<string, any>;
};

// Notification types
export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app';

export type Notification = {
  id: ID;
  type: NotificationType;
  channel: NotificationChannel;
  recipient: ID;
  subject?: string;
  message: string;
  read: boolean;
  sentAt: Date;
  readAt?: Date;
  metadata?: Record<string, any>;
};

// Analytics types
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

export type Metric = {
  name: string;
  type: MetricType;
  value: number;
  tags?: Record<string, string>;
  timestamp: Date;
};

export type AnalyticsPeriod = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

export type AnalyticsData = {
  period: AnalyticsPeriod;
  startDate: Date;
  endDate: Date;
  metrics: Record<string, number>;
  breakdown?: Record<string, Record<string, number>>;
};

// Feature flag types
export type FeatureFlag = {
  key: string;
  enabled: boolean;
  rolloutPercentage?: number;
  conditions?: Array<{
    type: 'user' | 'tenant' | 'location' | 'time';
    operator: FilterOperator;
    value: any;
  }>;
  metadata?: Record<string, any>;
};

// Type guards
export function isUUID(value: any): value is UUID {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof value === 'string' && uuidRegex.test(value);
}

export function isEmail(value: any): value is string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof value === 'string' && emailRegex.test(value);
}

export function isSwissPhoneNumber(value: any): value is SwissPhoneNumber {
  const swissPhoneRegex = /^(\+41|0041|0)[1-9]\d{8}$/;
  return typeof value === 'string' && swissPhoneRegex.test(value.replace(/\s/g, ''));
}

export function isSwissPostalCode(value: any): value is SwissPostalCode {
  const swissPostalRegex = /^[1-9]\d{3}$/;
  return typeof value === 'string' && swissPostalRegex.test(value);
}

// Utility functions
export function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

export function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result as Omit<T, K>;
}

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Constants
export const SUPPORTED_LANGUAGES: LanguageCode[] = ['de', 'fr', 'it', 'en'];
export const SUPPORTED_CURRENCIES: Currency[] = ['CHF', 'EUR'];
export const SWISS_CANTONS: SwissCanton[] = [
  'AG', 'AI', 'AR', 'BE', 'BL', 'BS', 'FR', 'GE',
  'GL', 'GR', 'JU', 'LU', 'NE', 'NW', 'OW', 'SG',
  'SH', 'SO', 'SZ', 'TG', 'TI', 'UR', 'VD', 'VS',
  'ZG', 'ZH'
];

// Version
export const VERSION = '3.0.0';
