/**
 * Authentication utilities for Cloud Functions
 * Handles token validation, user authentication, and authorization
 */

import * as admin from 'firebase-admin';
import * as jwt from 'jsonwebtoken';
import { Request } from 'express';
import { getAuth } from 'firebase-admin/auth';

// Custom errors
export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

// Extended Request interface with user
export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    emailVerified?: boolean;
    displayName?: string;
    photoURL?: string;
    phoneNumber?: string;
    tenantId?: string;
    role?: string;
    permissions?: string[];
    customClaims?: Record<string, any>;
  };
  tenant?: {
    id: string;
    name: string;
    active: boolean;
    subscription?: any;
  };
  apiKey?: {
    id: string;
    name: string;
    permissions: string[];
  };
}

// Validate Firebase ID token
export async function validateAuth(req: AuthenticatedRequest): Promise<any> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    throw new UnauthorizedError('No authorization header');
  }

  // Check for different auth types
  const [authType, token] = authHeader.split(' ');

  switch (authType.toLowerCase()) {
    case 'bearer':
      return validateFirebaseToken(token);
    
    case 'apikey':
      return validateApiKey(token, req);
    
    case 'basic':
      return validateBasicAuth(token);
    
    default:
      throw new UnauthorizedError('Invalid authorization type');
  }
}

// Validate Firebase ID token
async function validateFirebaseToken(token: string): Promise<any> {
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    
    // Get additional user data from Firestore
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(decodedToken.uid)
      .get();

    const userData = userDoc.data() || {};

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      displayName: userData.displayName || decodedToken.name,
      photoURL: userData.photoURL || decodedToken.picture,
      phoneNumber: userData.phoneNumber || decodedToken.phone_number,
      tenantId: userData.tenantId || decodedToken.tenantId,
      role: userData.role || decodedToken.role || 'customer',
      permissions: userData.permissions || decodedToken.permissions || [],
      customClaims: decodedToken,
    };
  } catch (error) {
    console.error('Token validation failed:', error);
    throw new UnauthorizedError('Invalid or expired token');
  }
}

// Validate API key
async function validateApiKey(key: string, req: AuthenticatedRequest): Promise<any> {
  try {
    // Hash the API key for secure comparison
    const hashedKey = hashApiKey(key);
    
    // Look up API key in Firestore
    const apiKeySnapshot = await admin.firestore()
      .collection('apiKeys')
      .where('hashedKey', '==', hashedKey)
      .where('active', '==', true)
      .limit(1)
      .get();

    if (apiKeySnapshot.empty) {
      throw new UnauthorizedError('Invalid API key');
    }

    const apiKeyDoc = apiKeySnapshot.docs[0];
    const apiKeyData = apiKeyDoc.data();

    // Check if key is expired
    if (apiKeyData.expiresAt && apiKeyData.expiresAt.toDate() < new Date()) {
      throw new UnauthorizedError('API key expired');
    }

    // Check rate limits
    await checkApiKeyRateLimit(apiKeyDoc.id, req);

    // Update last used timestamp
    await apiKeyDoc.ref.update({
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
      usageCount: admin.firestore.FieldValue.increment(1),
    });

    // Get associated user/tenant
    let user = null;
    if (apiKeyData.userId) {
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(apiKeyData.userId)
        .get();
      user = userDoc.data();
    }

    return {
      uid: apiKeyData.userId || `api-${apiKeyDoc.id}`,
      email: user?.email,
      tenantId: apiKeyData.tenantId,
      role: 'api',
      permissions: apiKeyData.permissions || [],
      apiKey: {
        id: apiKeyDoc.id,
        name: apiKeyData.name,
        permissions: apiKeyData.permissions || [],
      },
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    console.error('API key validation failed:', error);
    throw new UnauthorizedError('Invalid API key');
  }
}

// Validate Basic auth (for legacy support)
async function validateBasicAuth(credentials: string): Promise<any> {
  try {
    const decoded = Buffer.from(credentials, 'base64').toString('utf-8');
    const [email, password] = decoded.split(':');

    // Note: This is a simplified example
    // In production, you'd validate against a secure password store
    throw new UnauthorizedError('Basic auth not supported');
  } catch (error) {
    throw new UnauthorizedError('Invalid credentials');
  }
}

// Check if user has required permissions
export function requirePermissions(
  user: any,
  requiredPermissions: string[]
): void {
  if (!user) {
    throw new UnauthorizedError('User not authenticated');
  }

  // Admin has all permissions
  if (user.role === 'admin' || user.permissions?.includes('all')) {
    return;
  }

  const hasPermission = requiredPermissions.some(permission => 
    user.permissions?.includes(permission)
  );

  if (!hasPermission) {
    throw new ForbiddenError('Insufficient permissions');
  }
}

// Check if user belongs to tenant
export async function requireTenant(
  user: any,
  tenantId: string
): Promise<void> {
  if (!user) {
    throw new UnauthorizedError('User not authenticated');
  }

  // System admin can access any tenant
  if (user.role === 'system_admin') {
    return;
  }

  if (user.tenantId !== tenantId) {
    throw new ForbiddenError('Access denied to this tenant');
  }

  // Verify tenant exists and is active
  const tenantDoc = await admin.firestore()
    .collection('tenants')
    .doc(tenantId)
    .get();

  if (!tenantDoc.exists) {
    throw new ForbiddenError('Tenant not found');
  }

  const tenantData = tenantDoc.data();
  if (!tenantData?.active) {
    throw new ForbiddenError('Tenant is inactive');
  }
}

// Generate custom token for service accounts
export async function generateServiceToken(
  serviceId: string,
  claims?: Record<string, any>
): Promise<string> {
  try {
    const customClaims = {
      service: true,
      serviceId,
      ...claims,
    };

    return await getAuth().createCustomToken(serviceId, customClaims);
  } catch (error) {
    console.error('Failed to generate service token:', error);
    throw new Error('Token generation failed');
  }
}

// Verify webhook signatures
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: string = 'sha256'
): boolean {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac(algorithm, secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Rate limiting for API keys
async function checkApiKeyRateLimit(
  apiKeyId: string,
  req: AuthenticatedRequest
): Promise<void> {
  const now = Date.now();
  const windowMs = 3600000; // 1 hour
  const maxRequests = 1000; // Default limit

  const rateLimitKey = `rateLimit:${apiKeyId}:${Math.floor(now / windowMs)}`;
  
  // Use Firestore for distributed rate limiting
  const rateLimitRef = admin.firestore()
    .collection('rateLimits')
    .doc(rateLimitKey);

  try {
    await admin.firestore().runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);
      
      let count = 1;
      if (doc.exists) {
        count = (doc.data()?.count || 0) + 1;
      }

      if (count > maxRequests) {
        throw new Error('Rate limit exceeded');
      }

      transaction.set(rateLimitRef, {
        count,
        windowStart: Math.floor(now / windowMs) * windowMs,
        expiresAt: new Date(Math.floor(now / windowMs) * windowMs + windowMs * 2),
      }, { merge: true });
    });
  } catch (error) {
    if (error.message === 'Rate limit exceeded') {
      throw new UnauthorizedError('API rate limit exceeded');
    }
    // Log but don't fail on rate limit errors
    console.error('Rate limit check failed:', error);
  }
}

// Hash API key for secure storage
function hashApiKey(key: string): string {
  const crypto = require('crypto');
  return crypto
    .createHash('sha256')
    .update(key)
    .digest('hex');
}

// Middleware factory for Express
export function authMiddleware(options?: {
  required?: boolean;
  permissions?: string[];
  tenantRequired?: boolean;
}) {
  return async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const user = await validateAuth(req);
      req.user = user;

      // Check permissions if specified
      if (options?.permissions?.length) {
        requirePermissions(user, options.permissions);
      }

      // Check tenant if required
      if (options?.tenantRequired && req.params.tenantId) {
        await requireTenant(user, req.params.tenantId);
      }

      next();
    } catch (error) {
      if (options?.required === false && error instanceof UnauthorizedError) {
        // Auth is optional, continue without user
        next();
      } else {
        next(error);
      }
    }
  };
}

// Get current user from request
export function getCurrentUser(req: AuthenticatedRequest): any {
  return req.user;
}

// Check if user is authenticated
export function isAuthenticated(req: AuthenticatedRequest): boolean {
  return !!req.user;
}

// Check if user has specific role
export function hasRole(req: AuthenticatedRequest, role: string): boolean {
  return req.user?.role === role;
}

// Check if user has any of the specified roles
export function hasAnyRole(req: AuthenticatedRequest, roles: string[]): boolean {
  return roles.includes(req.user?.role || '');
}

// Session token utilities
export async function createSessionToken(
  userId: string,
  deviceId?: string,
  expiresIn: number = 86400 // 24 hours
): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  await admin.firestore()
    .collection('sessions')
    .doc(sessionId)
    .set({
      userId,
      deviceId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
      active: true,
    });

  return jwt.sign(
    {
      sessionId,
      userId,
      deviceId,
    },
    process.env.SESSION_SECRET || 'default-secret',
    {
      expiresIn,
    }
  );
}

export async function validateSessionToken(token: string): Promise<any> {
  try {
    const decoded = jwt.verify(
      token,
      process.env.SESSION_SECRET || 'default-secret'
    ) as any;

    const sessionDoc = await admin.firestore()
      .collection('sessions')
      .doc(decoded.sessionId)
      .get();

    if (!sessionDoc.exists) {
      throw new UnauthorizedError('Invalid session');
    }

    const session = sessionDoc.data();
    if (!session?.active) {
      throw new UnauthorizedError('Session expired');
    }

    if (session.expiresAt.toDate() < new Date()) {
      await sessionDoc.ref.update({ active: false });
      throw new UnauthorizedError('Session expired');
    }

    // Update last activity
    await sessionDoc.ref.update({
      lastActivity: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      userId: session.userId,
      sessionId: decoded.sessionId,
      deviceId: session.deviceId,
    };
  } catch (error) {
    throw new UnauthorizedError('Invalid session token');
  }
}

function generateSessionId(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

// Two-factor authentication
export async function generateTwoFactorCode(userId: string): Promise<string> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 300000); // 5 minutes

  await admin.firestore()
    .collection('users')
    .doc(userId)
    .collection('security')
    .doc('twoFactor')
    .set({
      code,
      expiresAt,
      attempts: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

  return code;
}

export async function verifyTwoFactorCode(
  userId: string,
  code: string
): Promise<boolean> {
  const twoFactorDoc = await admin.firestore()
    .collection('users')
    .doc(userId)
    .collection('security')
    .doc('twoFactor')
    .get();

  if (!twoFactorDoc.exists) {
    return false;
  }

  const data = twoFactorDoc.data();
  
  // Check attempts
  if (data?.attempts >= 3) {
    throw new UnauthorizedError('Too many attempts');
  }

  // Check expiry
  if (data?.expiresAt.toDate() < new Date()) {
    throw new UnauthorizedError('Code expired');
  }

  // Verify code
  if (data?.code !== code) {
    await twoFactorDoc.ref.update({
      attempts: admin.firestore.FieldValue.increment(1),
    });
    return false;
  }

  // Clear code after successful verification
  await twoFactorDoc.ref.delete();
  return true;
}
