import { User, UserRole, Permission, ROLE_HIERARCHY, DEFAULT_PERMISSIONS } from './auth.types';

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): boolean {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
}

/**
 * Check if password is strong
 */
export function getPasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) {
    score++;
  } else {
    feedback.push('Mindestens 8 Zeichen erforderlich');
  }

  if (password.length >= 12) {
    score++;
  }

  if (/[a-z]/.test(password)) {
    score++;
  } else {
    feedback.push('Kleinbuchstaben hinzufügen');
  }

  if (/[A-Z]/.test(password)) {
    score++;
  } else {
    feedback.push('Grossbuchstaben hinzufügen');
  }

  if (/\d/.test(password)) {
    score++;
  } else {
    feedback.push('Zahlen hinzufügen');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score++;
  } else {
    feedback.push('Sonderzeichen hinzufügen');
  }

  return { score, feedback };
}

/**
 * Check if user has specific permission
 */
export function hasPermission(
  user: User | null,
  permission: string
): boolean {
  if (!user) return false;

  // Admin has all permissions
  if (user.role === 'admin') return true;

  // Get user's permissions based on role
  const rolePermissions = DEFAULT_PERMISSIONS[user.role] || [];

  // Check exact permission
  if (rolePermissions.includes(permission)) return true;

  // Check wildcard permissions
  const [resource, action] = permission.split(':');
  if (rolePermissions.includes(`${resource}:*`)) return true;
  if (rolePermissions.includes('*')) return true;

  return false;
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(
  user: User | null,
  permissions: string[]
): boolean {
  return permissions.some(permission => hasPermission(user, permission));
}

/**
 * Check if user has all specified permissions
 */
export function hasAllPermissions(
  user: User | null,
  permissions: string[]
): boolean {
  return permissions.every(permission => hasPermission(user, permission));
}

/**
 * Check if user has specific role or higher
 */
export function hasRole(
  user: User | null,
  requiredRole: UserRole
): boolean {
  if (!user) return false;

  // Check exact role
  if (user.role === requiredRole) return true;

  // Check role hierarchy
  const hierarchy = ROLE_HIERARCHY[user.role] || [];
  return hierarchy.includes(requiredRole);
}

/**
 * Check if user can access tenant
 */
export function canAccessTenant(
  user: User | null,
  tenantId: string
): boolean {
  if (!user) return false;

  // Admin can access all tenants
  if (user.role === 'admin') return true;

  // User can only access their own tenant
  return user.tenantId === tenantId;
}

/**
 * Get display name for role
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    admin: 'Administrator',
    owner: 'Inhaber',
    manager: 'Manager',
    staff: 'Mitarbeiter',
    kitchen: 'Küche',
    user: 'Benutzer',
  };

  return roleNames[role] || role;
}

/**
 * Format user display name
 */
export function formatUserDisplayName(user: User | null): string {
  if (!user) return 'Gast';
  
  if (user.name) return user.name;
  if (user.email) return user.email.split('@')[0];
  
  return 'Benutzer';
}

/**
 * Generate avatar initials
 */
export function getAvatarInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Check if authentication token is expired
 */
export function isTokenExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt * 1000;
}

/**
 * Calculate token expiry time
 */
export function getTokenExpiryTime(expiresIn: number): Date {
  return new Date(Date.now() + expiresIn * 1000);
}

/**
 * Mask email for privacy
 */
export function maskEmail(email: string): string {
  const [username, domain] = email.split('@');
  if (username.length <= 3) {
    return `${username[0]}***@${domain}`;
  }
  return `${username.slice(0, 3)}***@${domain}`;
}

/**
 * Validate Swiss phone number
 */
export function validateSwissPhoneNumber(phone: string): boolean {
  // Remove spaces and special characters
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Check Swiss phone number formats
  const swissPhoneRegex = /^(\+41|0041|0)([1-9]\d{8})$/;
  return swissPhoneRegex.test(cleaned);
}

/**
 * Format Swiss phone number
 */
export function formatSwissPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  if (cleaned.startsWith('+41')) {
    const number = cleaned.slice(3);
    return `+41 ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5, 7)} ${number.slice(7)}`;
  } else if (cleaned.startsWith('0041')) {
    const number = cleaned.slice(4);
    return `+41 ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5, 7)} ${number.slice(7)}`;
  } else if (cleaned.startsWith('0')) {
    const number = cleaned.slice(1);
    return `0${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5, 7)} ${number.slice(7)}`;
  }
  
  return phone;
}
