export type UserRole = 'admin' | 'owner' | 'manager' | 'staff' | 'kitchen' | 'user';

export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId?: string;
  photoURL?: string;
  phoneNumber?: string;
  language?: string;
  isActive?: boolean;
  emailVerified?: boolean;
}

export interface UserProfile extends User {
  createdAt: any; // Firestore timestamp
  updatedAt: any; // Firestore timestamp
  lastLoginAt?: any; // Firestore timestamp
  preferences?: UserPreferences;
  permissions?: string[];
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  currency: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

export interface SignUpData {
  email: string;
  password: string;
  name?: string;
  role?: UserRole;
  tenantId?: string;
  phoneNumber?: string;
  language?: string;
}

export interface SignInData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  actions: string[];
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}

// Default permissions for each role
export const DEFAULT_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['*'], // Full access
  owner: [
    'tenant:*',
    'menu:*',
    'orders:*',
    'staff:*',
    'analytics:*',
    'settings:*',
    'billing:*',
  ],
  manager: [
    'menu:*',
    'orders:*',
    'staff:manage',
    'analytics:view',
    'settings:manage',
  ],
  staff: [
    'orders:view',
    'orders:update',
    'menu:view',
  ],
  kitchen: [
    'orders:view',
    'orders:update:status',
    'inventory:update',
  ],
  user: [
    'profile:view',
    'profile:update',
    'orders:create',
    'orders:view:own',
  ],
};

// Role hierarchy for permission inheritance
export const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  admin: ['owner', 'manager', 'staff', 'kitchen', 'user'],
  owner: ['manager', 'staff', 'kitchen', 'user'],
  manager: ['staff', 'user'],
  staff: ['user'],
  kitchen: ['user'],
  user: [],
};
