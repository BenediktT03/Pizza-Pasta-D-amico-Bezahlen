/**
 * EATECH - Authentication Middleware
 * Version: 1.0.0
 * Description: Express middleware for authentication and authorization
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/middleware/auth.middleware.ts
 */

import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import * as jwt from 'jsonwebtoken';
import { 
  AuthenticationError, 
  AuthorizationError,
  asyncHandler 
} from '../utils/errorHandler';
import { verifyToken } from '../utils/encryptionUtils';
import { checkRateLimit } from '../utils/rateLimiter';
import { CONFIG } from '../config/environment';
import { ROLES, PERMISSIONS } from '../config/constants';
import { getCollection } from '../config/firebase.config';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Extended Express Request with auth properties
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role?: string;
    tenantId?: string;
    permissions?: string[];
    isAnonymous?: boolean;
  };
  tenant?: {
    id: string;
    name: string;
    status: string;
    plan?: string;
    settings?: any;
  };
  token?: string;
  apiKey?: string;
}

/**
 * Authentication options
 */
export interface AuthOptions {
  required?: boolean;
  allowAnonymous?: boolean;
  allowApiKey?: boolean;
  verifyEmail?: boolean;
  checkTenant?: boolean;
}

/**
 * Token payload interface
 */
export interface TokenPayload {
  uid: string;
  email?: string;
  role?: string;
  tenantId?: string;
  permissions?: string[];
  type?: 'access' | 'refresh' | 'api';
  iat?: number;
  exp?: number;
}

// ============================================================================
// FIREBASE AUTH MIDDLEWARE
// ============================================================================

/**
 * Verifies Firebase ID token
 */
export const verifyFirebaseToken = asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('No token provided');
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  
  try {
    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Get user data
    const userRecord = await admin.auth().getUser(decodedToken.uid);
    
    // Set user data on request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || userRecord.email,
      role: decodedToken.role || userRecord.customClaims?.role,
      tenantId: decodedToken.tenantId || userRecord.customClaims?.tenantId,
      permissions: decodedToken.permissions || userRecord.customClaims?.permissions || [],
      isAnonymous: decodedToken.provider_id === 'anonymous'
    };
    
    req.token = idToken;
    
    next();
  } catch (error: any) {
    if (error.code === 'auth/id-token-expired') {
      throw new AuthenticationError('Token expired', 'TOKEN_EXPIRED');
    } else if (error.code === 'auth/id-token-revoked') {
      throw new AuthenticationError('Token revoked', 'TOKEN_REVOKED');
    } else {
      throw new AuthenticationError('Invalid token');
    }
  }
});

// ============================================================================
// JWT MIDDLEWARE
// ============================================================================

/**
 * Verifies JWT token (for custom authentication)
 */
export const verifyJWTToken = asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('No token provided');
  }
  
  const token = authHeader.split('Bearer ')[1];
  
  try {
    // Verify JWT token
    const payload = verifyToken(token) as TokenPayload;
    
    // Check token type
    if (payload.type !== 'access') {
      throw new AuthenticationError('Invalid token type');
    }
    
    // Get user from database
    const userDoc = await getCollection('users').doc(payload.uid).get();
    
    if (!userDoc.exists) {
      throw new AuthenticationError('User not found');
    }
    
    const userData = userDoc.data()!;
    
    // Check if user is active
    if (userData.status !== 'active') {
      throw new AuthenticationError('Account disabled', 'ACCOUNT_DISABLED');
    }
    
    // Set user data on request
    req.user = {
      uid: payload.uid,
      email: payload.email || userData.email,
      role: payload.role || userData.role,
      tenantId: payload.tenantId || userData.tenantId,
      permissions: payload.permissions || userData.permissions || []
    };
    
    req.token = token;
    
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new AuthenticationError('Token expired', 'TOKEN_EXPIRED');
    } else if (error.name === 'JsonWebTokenError') {
      throw new AuthenticationError('Invalid token');
    } else {
      throw error;
    }
  }
});

// ============================================================================
// API KEY MIDDLEWARE
// ============================================================================

/**
 * Verifies API key authentication
 */
export const verifyApiKey = asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiKey = req.headers[CONFIG.security.apiKeyHeader.toLowerCase()] as string ||
                 req.query.apiKey as string;
  
  if (!apiKey) {
    throw new AuthenticationError('No API key provided');
  }
  
  try {
    // Look up API key in database
    const apiKeySnapshot = await getCollection('apiKeys')
      .where('key', '==', apiKey)
      .where('status', '==', 'active')
      .limit(1)
      .get();
    
    if (apiKeySnapshot.empty) {
      throw new AuthenticationError('Invalid API key');
    }
    
    const apiKeyData = apiKeySnapshot.docs[0].data();
    
    // Check expiration
    if (apiKeyData.expiresAt && apiKeyData.expiresAt.toDate() < new Date()) {
      throw new AuthenticationError('API key expired');
    }
    
    // Check rate limit for API key
    const rateLimitResult = await checkRateLimit(apiKey, 'api:key');
    if (!rateLimitResult.allowed) {
      res.set('Retry-After', Math.ceil(rateLimitResult.msBeforeNext / 1000).toString());
      throw new AuthenticationError('API rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
    }
    
    // Update last used timestamp
    await apiKeySnapshot.docs[0].ref.update({
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
      usageCount: admin.firestore.FieldValue.increment(1)
    });
    
    // Set user data from API key
    req.user = {
      uid: apiKeyData.userId || apiKeyData.id,
      role: apiKeyData.role || ROLES.SYSTEM_ADMIN,
      tenantId: apiKeyData.tenantId,
      permissions: apiKeyData.permissions || []
    };
    
    req.apiKey = apiKey;
    
    next();
  } catch (error) {
    throw error instanceof AuthenticationError ? error : 
          new AuthenticationError('API key verification failed');
  }
});

// ============================================================================
// COMBINED AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Flexible authentication middleware that supports multiple methods
 */
export function authenticate(options: AuthOptions = {}) {
  return asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const {
      required = true,
      allowAnonymous = false,
      allowApiKey = true,
      verifyEmail = false,
      checkTenant = true
    } = options;
    
    // Check for API key first
    if (allowApiKey) {
      const apiKey = req.headers[CONFIG.security.apiKeyHeader.toLowerCase()] ||
                     req.query.apiKey;
      
      if (apiKey) {
        await verifyApiKey(req, res, () => {});
        if (req.user) {
          return next();
        }
      }
    }
    
    // Check for Bearer token
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      if (!required) {
        return next();
      }
      throw new AuthenticationError('No authentication provided');
    }
    
    // Try Firebase token first
    try {
      await verifyFirebaseToken(req, res, () => {});
    } catch (firebaseError) {
      // Try JWT token as fallback
      try {
        await verifyJWTToken(req, res, () => {});
      } catch (jwtError) {
        throw new AuthenticationError('Invalid authentication token');
      }
    }
    
    // Check if user exists
    if (!req.user) {
      throw new AuthenticationError('Authentication failed');
    }
    
    // Check anonymous access
    if (req.user.isAnonymous && !allowAnonymous) {
      throw new AuthenticationError('Anonymous access not allowed');
    }
    
    // Verify email if required
    if (verifyEmail && !req.user.isAnonymous) {
      const userRecord = await admin.auth().getUser(req.user.uid);
      if (!userRecord.emailVerified) {
        throw new AuthenticationError('Email not verified', 'EMAIL_NOT_VERIFIED');
      }
    }
    
    // Check tenant if required
    if (checkTenant && req.user.tenantId) {
      await loadTenant(req, res, () => {});
    }
    
    next();
  });
}

// ============================================================================
// AUTHORIZATION MIDDLEWARE
// ============================================================================

/**
 * Checks if user has required role
 */
export function requireRole(...roles: string[]) {
  return asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      throw new AuthenticationError('Not authenticated');
    }
    
    if (!req.user.role || !roles.includes(req.user.role)) {
      throw new AuthorizationError(
        `Required role: ${roles.join(' or ')}`,
        'INSUFFICIENT_ROLE'
      );
    }
    
    next();
  });
}

/**
 * Checks if user has required permissions
 */
export function requirePermission(...permissions: string[]) {
  return asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      throw new AuthenticationError('Not authenticated');
    }
    
    const hasPermission = permissions.some(permission => 
      req.user!.permissions?.includes(permission)
    );
    
    if (!hasPermission) {
      throw new AuthorizationError(
        `Required permission: ${permissions.join(' or ')}`,
        'INSUFFICIENT_PERMISSIONS'
      );
    }
    
    next();
  });
}

/**
 * Checks if user belongs to the tenant in the request
 */
export function requireTenantAccess() {
  return asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      throw new AuthenticationError('Not authenticated');
    }
    
    const tenantId = req.params.tenantId || req.body.tenantId || req.query.tenantId;
    
    if (!tenantId) {
      throw new AuthorizationError('Tenant ID required');
    }
    
    // System admins have access to all tenants
    if (req.user.role === ROLES.SUPER_ADMIN || req.user.role === ROLES.SYSTEM_ADMIN) {
      return next();
    }
    
    // Check if user belongs to the tenant
    if (req.user.tenantId !== tenantId) {
      throw new AuthorizationError('Access denied to this tenant');
    }
    
    next();
  });
}

/**
 * Checks if user owns the resource
 */
export function requireOwnership(resourceField: string = 'userId') {
  return asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      throw new AuthenticationError('Not authenticated');
    }
    
    const resourceId = req.params.id || req.params.resourceId;
    if (!resourceId) {
      throw new AuthorizationError('Resource ID required');
    }
    
    // Get resource from database
    const collection = req.baseUrl.split('/').pop() || 'resources';
    const resourceDoc = await getCollection(collection).doc(resourceId).get();
    
    if (!resourceDoc.exists) {
      throw new AuthorizationError('Resource not found');
    }
    
    const resource = resourceDoc.data()!;
    
    // Check ownership
    if (resource[resourceField] !== req.user.uid) {
      throw new AuthorizationError('You do not own this resource');
    }
    
    next();
  });
}

// ============================================================================
// TENANT MIDDLEWARE
// ============================================================================

/**
 * Loads tenant data for the authenticated user
 */
export const loadTenant = asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user?.tenantId) {
    return next();
  }
  
  try {
    const tenantDoc = await getCollection('tenants').doc(req.user.tenantId).get();
    
    if (!tenantDoc.exists) {
      throw new AuthorizationError('Tenant not found');
    }
    
    const tenantData = tenantDoc.data()!;
    
    // Check tenant status
    if (tenantData.status !== 'active') {
      throw new AuthorizationError('Tenant account is not active', 'TENANT_INACTIVE');
    }
    
    // Check subscription status
    if (tenantData.subscription?.status === 'expired' || 
        tenantData.subscription?.status === 'cancelled') {
      throw new AuthorizationError('Tenant subscription expired', 'SUBSCRIPTION_EXPIRED');
    }
    
    // Set tenant data on request
    req.tenant = {
      id: req.user.tenantId,
      name: tenantData.name,
      status: tenantData.status,
      plan: tenantData.subscription?.plan,
      settings: tenantData.settings
    };
    
    next();
  } catch (error) {
    throw error instanceof AuthorizationError ? error :
          new AuthorizationError('Tenant verification failed');
  }
});

// ============================================================================
// REFRESH TOKEN MIDDLEWARE
// ============================================================================

/**
 * Handles refresh token verification
 */
export const verifyRefreshToken = asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    throw new AuthenticationError('Refresh token required');
  }
  
  try {
    // Verify refresh token
    const payload = verifyToken(refreshToken) as TokenPayload;
    
    // Check token type
    if (payload.type !== 'refresh') {
      throw new AuthenticationError('Invalid token type');
    }
    
    // Check if refresh token is blacklisted
    const blacklistDoc = await getCollection('blacklistedTokens')
      .doc(refreshToken)
      .get();
    
    if (blacklistDoc.exists) {
      throw new AuthenticationError('Token has been revoked');
    }
    
    // Get user
    const userDoc = await getCollection('users').doc(payload.uid).get();
    
    if (!userDoc.exists || userDoc.data()!.status !== 'active') {
      throw new AuthenticationError('User not found or inactive');
    }
    
    // Set user data for token generation
    req.user = {
      uid: payload.uid,
      email: userDoc.data()!.email,
      role: userDoc.data()!.role,
      tenantId: userDoc.data()!.tenantId,
      permissions: userDoc.data()!.permissions || []
    };
    
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new AuthenticationError('Refresh token expired', 'REFRESH_TOKEN_EXPIRED');
    } else {
      throw error instanceof AuthenticationError ? error :
            new AuthenticationError('Invalid refresh token');
    }
  }
});

// ============================================================================
// SESSION MIDDLEWARE
// ============================================================================

/**
 * Validates user session
 */
export const validateSession = asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    throw new AuthenticationError('Not authenticated');
  }
  
  const sessionId = req.headers['x-session-id'] as string || req.cookies?.sessionId;
  
  if (!sessionId) {
    return next(); // Session optional
  }
  
  try {
    // Get session from database
    const sessionDoc = await getCollection('sessions').doc(sessionId).get();
    
    if (!sessionDoc.exists) {
      throw new AuthenticationError('Invalid session');
    }
    
    const session = sessionDoc.data()!;
    
    // Check session ownership
    if (session.userId !== req.user.uid) {
      throw new AuthenticationError('Session mismatch');
    }
    
    // Check session expiration
    if (session.expiresAt.toDate() < new Date()) {
      await sessionDoc.ref.delete();
      throw new AuthenticationError('Session expired');
    }
    
    // Update last activity
    await sessionDoc.ref.update({
      lastActivityAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    next();
  } catch (error) {
    throw error instanceof AuthenticationError ? error :
          new AuthenticationError('Session validation failed');
  }
});

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Authentication
  authenticate,
  verifyFirebaseToken,
  verifyJWTToken,
  verifyApiKey,
  verifyRefreshToken,
  
  // Authorization
  requireRole,
  requirePermission,
  requireTenantAccess,
  requireOwnership,
  
  // Tenant
  loadTenant,
  
  // Session
  validateSession
};