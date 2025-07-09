/**
 * User Model Types
 * Type definitions for user-related data structures
 */

import { z } from 'zod';

// User roles enum
export enum UserRole {
  CUSTOMER = 'customer',
  STAFF = 'staff',
  MANAGER = 'manager',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
  MASTER = 'master',
}

// User status enum
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  DELETED = 'deleted',
}

// Base user interface
export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  phoneNumber?: string;
  phoneVerified?: boolean;
  displayName: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  tenantId?: string;
  permissions: string[];
  preferences: UserPreferences;
  metadata: UserMetadata;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  deletedAt?: Date;
}

// User preferences
export interface UserPreferences {
  language: 'de' | 'fr' | 'it' | 'en';
  theme: 'light' | 'dark' | 'system';
  currency: 'CHF' | 'EUR';
  timezone: string;
  notifications: NotificationPreferences;
  accessibility: AccessibilityPreferences;
}

// Notification preferences
export interface NotificationPreferences {
  email: {
    orderUpdates: boolean;
    promotions: boolean;
    newsletter: boolean;
  };
  push: {
    orderUpdates: boolean;
    promotions: boolean;
  };
  sms: {
    orderUpdates: boolean;
    criticalAlerts: boolean;
  };
}

// Accessibility preferences
export interface AccessibilityPreferences {
  highContrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  screenReader: boolean;
}

// User metadata
export interface UserMetadata {
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    city?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  device?: {
    type: 'mobile' | 'tablet' | 'desktop';
    os?: string;
    browser?: string;
  };
}

// Create user input
export interface CreateUserInput {
  email: string;
  password: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role?: UserRole;
  tenantId?: string;
  preferences?: Partial<UserPreferences>;
}

// Update user input
export interface UpdateUserInput {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  avatar?: string;
  preferences?: Partial<UserPreferences>;
  metadata?: Partial<UserMetadata>;
}

// Auth user (returned after authentication)
export interface AuthUser extends User {
  token: string;
  refreshToken: string;
  expiresAt: Date;
}

// User session
export interface UserSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
}

// Staff member (extends User)
export interface StaffMember extends User {
  role: UserRole.STAFF | UserRole.MANAGER | UserRole.ADMIN;
  employeeId: string;
  department?: string;
  position?: string;
  workSchedule?: WorkSchedule;
  permissions: StaffPermission[];
}

// Work schedule
export interface WorkSchedule {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}

// Day schedule
export interface DaySchedule {
  isWorkingDay: boolean;
  shifts: TimeSlot[];
  breaks: TimeSlot[];
}

// Time slot
export interface TimeSlot {
  start: string; // HH:mm format
  end: string;   // HH:mm format
}

// Staff permissions
export type StaffPermission = 
  | 'orders.view'
  | 'orders.create'
  | 'orders.update'
  | 'orders.delete'
  | 'orders.refund'
  | 'products.view'
  | 'products.create'
  | 'products.update'
  | 'products.delete'
  | 'inventory.view'
  | 'inventory.update'
  | 'customers.view'
  | 'customers.create'
  | 'customers.update'
  | 'customers.delete'
  | 'reports.view'
  | 'reports.export'
  | 'settings.view'
  | 'settings.update'
  | 'staff.view'
  | 'staff.create'
  | 'staff.update'
  | 'staff.delete'
  | 'billing.view'
  | 'billing.manage';

// Validation schemas
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  phoneNumber: z.string().optional(),
  phoneVerified: z.boolean().optional(),
  displayName: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().url().optional(),
  role: z.nativeEnum(UserRole),
  status: z.nativeEnum(UserStatus),
  tenantId: z.string().uuid().optional(),
  permissions: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastLoginAt: z.date().optional(),
  deletedAt: z.date().optional(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  tenantId: z.string().uuid().optional(),
});

export const updateUserSchema = z.object({
  displayName: z.string().min(1).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
  avatar: z.string().url().optional(),
});

// Type guards
export function isStaffMember(user: User): user is StaffMember {
  return [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN].includes(user.role);
}

export function hasPermission(user: User, permission: StaffPermission): boolean {
  if (!isStaffMember(user)) return false;
  return user.permissions.includes(permission);
}

export function canAccessTenant(user: User, tenantId: string): boolean {
  if (user.role === UserRole.MASTER) return true;
  if (user.role === UserRole.SUPER_ADMIN) return true;
  return user.tenantId === tenantId;
}
