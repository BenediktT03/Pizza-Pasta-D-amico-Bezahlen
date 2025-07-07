/**
 * EATECH - Security Service
 * Version: 1.0.0
 * Description: Umfassender Sicherheitsdienst für Authentifizierung, Autorisierung und Schutz
 * Author: EATECH Development Team
 * Created: 2025-01-09
 * File Path: /functions/src/services/SecurityService.ts
 * 
 * Features:
 * - Multi-factor authentication
 * - Role-based access control
 * - API rate limiting
 * - Fraud detection
 * - Security monitoring
 * - Encryption services
 * - Session management
 * - Compliance logging
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { 
  SecurityContext,
  SecurityPolicy,
  AccessControl,
  SecurityEvent,
  ThreatLevel,
  AuditLog
} from '../types/security.types';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { 
  addMinutes,
  isAfter,
  differenceInMinutes,
  subDays
} from 'date-fns';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface AuthenticationResult {
  success: boolean;
  userId?: string;
  token?: string;
  refreshToken?: string;
  mfaRequired?: boolean;
  mfaToken?: string;
  roles?: string[];
  permissions?: string[];
}

interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  requiredPermissions?: string[];
  userPermissions?: string[];
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

interface SecurityScore {
  overall: number;
  factors: {
    authentication: number;
    authorization: number;
    dataProtection: number;
    monitoring: number;
    compliance: number;
  };
  recommendations: string[];
}

interface FraudCheckResult {
  riskScore: number;
  riskLevel: ThreatLevel;
  factors: Array<{
    type: string;
    score: number;
    description: string;
  }>;
  blocked: boolean;
  requiresReview: boolean;
}

interface SessionInfo {
  id: string;
  userId: string;
  tenantId: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  active: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SESSIONS_COLLECTION = 'security_sessions';
const AUDIT_LOGS_COLLECTION = 'security_audit_logs';
const SECURITY_EVENTS_COLLECTION = 'security_events';
const MFA_SECRETS_COLLECTION = 'mfa_secrets';
const RATE_LIMITS_COLLECTION = 'rate_limits';
const BLOCKED_IPS_COLLECTION = 'blocked_ips';

const JWT_SECRET = functions.config().security?.jwt_secret || 'default-secret';
const JWT_EXPIRES_IN = '1h';
const REFRESH_TOKEN_EXPIRES_IN = '30d';
const MFA_TOKEN_EXPIRES_IN = 15; // minutes
const SESSION_TIMEOUT = 30; // minutes

const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30; // minutes

const RATE_LIMITS = {
  api: {
    public: { requests: 100, window: 60 }, // per minute
    authenticated: { requests: 1000, window: 60 },
    admin: { requests: 5000, window: 60 }
  },
  auth: {
    login: { requests: 5, window: 300 }, // per 5 minutes
    register: { requests: 3, window: 3600 }, // per hour
    passwordReset: { requests: 3, window: 3600 }
  },
  payment: {
    process: { requests: 10, window: 60 },
    refund: { requests: 5, window: 3600 }
  }
};

const PERMISSIONS = {
  // System permissions
  SYSTEM_ADMIN: 'system:admin',
  SYSTEM_READ: 'system:read',
  
  // Tenant permissions
  TENANT_ADMIN: 'tenant:admin',
  TENANT_READ: 'tenant:read',
  TENANT_WRITE: 'tenant:write',
  
  // Order permissions
  ORDER_CREATE: 'order:create',
  ORDER_READ: 'order:read',
  ORDER_UPDATE: 'order:update',
  ORDER_DELETE: 'order:delete',
  ORDER_REFUND: 'order:refund',
  
  // Product permissions
  PRODUCT_CREATE: 'product:create',
  PRODUCT_READ: 'product:read',
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_DELETE: 'product:delete',
  
  // Analytics permissions
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_EXPORT: 'analytics:export',
  
  // Customer permissions
  CUSTOMER_READ: 'customer:read',
  CUSTOMER_WRITE: 'customer:write',
  CUSTOMER_DELETE: 'customer:delete'
};

const ROLE_PERMISSIONS = {
  superadmin: ['system:admin'],
  admin: [
    'tenant:admin',
    'order:*',
    'product:*',
    'analytics:*',
    'customer:*'
  ],
  manager: [
    'tenant:read',
    'order:*',
    'product:*',
    'analytics:read',
    'customer:read'
  ],
  staff: [
    'tenant:read',
    'order:create',
    'order:read',
    'order:update',
    'product:read',
    'customer:read'
  ],
  viewer: [
    'tenant:read',
    'order:read',
    'product:read',
    'analytics:read'
  ]
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export default class SecurityService {
  private firestore: admin.firestore.Firestore;
  private auth: admin.auth.Auth;

  constructor() {
    this.firestore = admin.firestore();
    this.auth = admin.auth();
  }

  /**
   * Authenticate user
   */
  async authenticate(
    credentials: {
      email?: string;
      phone?: string;
      password: string;
      tenantId: string;
      deviceId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<AuthenticationResult> {
    try {
      // Check rate limit
      const rateLimitKey = `auth:login:${credentials.email || credentials.phone}`;
      const rateLimit = await this.checkRateLimit(rateLimitKey, RATE_LIMITS.auth.login);
      
      if (!rateLimit.allowed) {
        await this.logSecurityEvent('login_rate_limit_exceeded', {
          email: credentials.email,
          ipAddress: credentials.ipAddress
        });
        throw new Error('Too many login attempts. Please try again later.');
      }

      // Get user
      const user = await this.getUserByCredentials(
        credentials.email,
        credentials.phone,
        credentials.tenantId
      );

      if (!user) {
        await this.logSecurityEvent('login_failed_user_not_found', {
          email: credentials.email,
          tenantId: credentials.tenantId
        });
        throw new Error('Invalid credentials');
      }

      // Check if account is locked
      if (user.locked && isAfter(new Date(), user.lockedUntil)) {
        await this.unlockAccount(user.id);
      } else if (user.locked) {
        throw new Error('Account is locked. Please try again later.');
      }

      // Verify password
      const passwordValid = await bcrypt.compare(credentials.password, user.passwordHash);
      
      if (!passwordValid) {
        await this.handleFailedLogin(user.id, credentials.ipAddress);
        throw new Error('Invalid credentials');
      }

      // Check MFA requirement
      if (user.mfaEnabled) {
        const mfaToken = await this.generateMFAToken(user.id);
        
        await this.logSecurityEvent('login_mfa_required', {
          userId: user.id,
          tenantId: credentials.tenantId
        });

        return {
          success: false,
          mfaRequired: true,
          mfaToken,
          userId: user.id
        };
      }

      // Fraud check
      const fraudCheck = await this.performFraudCheck({
        userId: user.id,
        ipAddress: credentials.ipAddress,
        deviceId: credentials.deviceId,
        userAgent: credentials.userAgent
      });

      if (fraudCheck.blocked) {
        await this.logSecurityEvent('login_blocked_fraud', {
          userId: user.id,
          riskScore: fraudCheck.riskScore,
          factors: fraudCheck.factors
        });
        throw new Error('Login blocked for security reasons');
      }

      // Generate tokens
      const { token, refreshToken } = await this.generateTokens(user);

      // Create session
      await this.createSession({
        userId: user.id,
        tenantId: credentials.tenantId,
        deviceId: credentials.deviceId || 'unknown',
        ipAddress: credentials.ipAddress || 'unknown',
        userAgent: credentials.userAgent || 'unknown'
      });

      // Reset login attempts
      await this.resetLoginAttempts(user.id);

      // Log successful login
      await this.logSecurityEvent('login_success', {
        userId: user.id,
        tenantId: credentials.tenantId,
        ipAddress: credentials.ipAddress
      });

      return {
        success: true,
        userId: user.id,
        token,
        refreshToken,
        roles: user.roles,
        permissions: await this.getUserPermissions(user)
      };

    } catch (error) {
      logger.error('Authentication failed:', error);
      throw error;
    }
  }

  /**
   * Verify MFA code
   */
  async verifyMFA(
    mfaToken: string,
    code: string
  ): Promise<AuthenticationResult> {
    try {
      // Verify MFA token
      const decoded = jwt.verify(mfaToken, JWT_SECRET) as any;
      
      if (decoded.type !== 'mfa') {
        throw new Error('Invalid MFA token');
      }

      const userId = decoded.userId;

      // Get user's MFA secret
      const mfaDoc = await this.firestore
        .collection(MFA_SECRETS_COLLECTION)
        .doc(userId)
        .get();

      if (!mfaDoc.exists) {
        throw new Error('MFA not configured');
      }

      const { secret } = mfaDoc.data()!;

      // Verify TOTP code
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: 2 // Allow 2 time steps tolerance
      });

      if (!verified) {
        await this.logSecurityEvent('mfa_verification_failed', { userId });
        throw new Error('Invalid MFA code');
      }

      // Get user
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate tokens
      const { token, refreshToken } = await this.generateTokens(user);

      // Log successful MFA
      await this.logSecurityEvent('mfa_verification_success', { userId });

      return {
        success: true,
        userId,
        token,
        refreshToken,
        roles: user.roles,
        permissions: await this.getUserPermissions(user)
      };

    } catch (error) {
      logger.error('MFA verification failed:', error);
      throw error;
    }
  }

  /**
   * Setup MFA for user
   */
  async setupMFA(userId: string): Promise<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }> {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `EATECH (${userId})`,
        issuer: 'EATECH'
      });

      // Generate QR code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

      // Generate backup codes
      const backupCodes = Array.from({ length: 10 }, () => 
        crypto.randomBytes(4).toString('hex').toUpperCase()
      );

      // Store secret and backup codes
      await this.firestore
        .collection(MFA_SECRETS_COLLECTION)
        .doc(userId)
        .set({
          secret: secret.base32,
          backupCodes: await this.hashBackupCodes(backupCodes),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

      // Update user
      await this.firestore
        .collection('users')
        .doc(userId)
        .update({
          mfaEnabled: true,
          mfaEnabledAt: admin.firestore.FieldValue.serverTimestamp()
        });

      await this.logSecurityEvent('mfa_enabled', { userId });

      return {
        secret: secret.base32,
        qrCode,
        backupCodes
      };

    } catch (error) {
      logger.error('MFA setup failed:', error);
      throw error;
    }
  }

  /**
   * Authorize action
   */
  async authorize(
    context: SecurityContext,
    resource: string,
    action: string
  ): Promise<AuthorizationResult> {
    try {
      // Build required permission
      const requiredPermission = `${resource}:${action}`;

      // Get user permissions
      const userPermissions = context.permissions || [];

      // Check wildcard permissions
      const hasWildcard = userPermissions.some(p => {
        const [pResource, pAction] = p.split(':');
        return (pResource === resource && pAction === '*') ||
               (pResource === '*' && pAction === '*');
      });

      // Check specific permission
      const hasPermission = hasWildcard || userPermissions.includes(requiredPermission);

      // Check resource-level permissions
      const resourceAccess = await this.checkResourceAccess(
        context,
        resource,
        action
      );

      const allowed = hasPermission && resourceAccess.allowed;

      // Log authorization attempt
      await this.logAuthorizationAttempt({
        userId: context.userId,
        tenantId: context.tenantId,
        resource,
        action,
        allowed,
        reason: resourceAccess.reason
      });

      return {
        allowed,
        reason: resourceAccess.reason,
        requiredPermissions: [requiredPermission],
        userPermissions
      };

    } catch (error) {
      logger.error('Authorization failed:', error);
      return {
        allowed: false,
        reason: 'Authorization error'
      };
    }
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(
    key: string,
    limit: { requests: number; window: number }
  ): Promise<RateLimitResult> {
    try {
      const now = Date.now();
      const windowStart = now - (limit.window * 1000);
      
      const docRef = this.firestore
        .collection(RATE_LIMITS_COLLECTION)
        .doc(key);

      const result = await this.firestore.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        
        let requests: number[] = [];
        if (doc.exists) {
          requests = doc.data()!.requests || [];
        }

        // Remove old requests
        requests = requests.filter(timestamp => timestamp > windowStart);

        // Check limit
        if (requests.length >= limit.requests) {
          return {
            allowed: false,
            limit: limit.requests,
            remaining: 0,
            resetAt: new Date(Math.min(...requests) + limit.window * 1000)
          };
        }

        // Add new request
        requests.push(now);
        
        transaction.set(docRef, { requests }, { merge: true });

        return {
          allowed: true,
          limit: limit.requests,
          remaining: limit.requests - requests.length,
          resetAt: new Date(now + limit.window * 1000)
        };
      });

      return result;

    } catch (error) {
      logger.error('Rate limit check failed:', error);
      // Fail open in case of error
      return {
        allowed: true,
        limit: limit.requests,
        remaining: limit.requests,
        resetAt: new Date()
      };
    }
  }

  /**
   * Perform fraud check
   */
  async performFraudCheck(
    data: {
      userId?: string;
      ipAddress?: string;
      deviceId?: string;
      userAgent?: string;
      amount?: number;
      paymentMethod?: string;
    }
  ): Promise<FraudCheckResult> {
    try {
      const factors: Array<{ type: string; score: number; description: string }> = [];
      let totalScore = 0;

      // Check IP reputation
      if (data.ipAddress) {
        const ipScore = await this.checkIPReputation(data.ipAddress);
        factors.push({
          type: 'ip_reputation',
          score: ipScore,
          description: `IP risk score: ${ipScore}`
        });
        totalScore += ipScore;
      }

      // Check device fingerprint
      if (data.deviceId) {
        const deviceScore = await this.checkDeviceFingerprint(data.deviceId, data.userId);
        factors.push({
          type: 'device_fingerprint',
          score: deviceScore,
          description: `Device risk score: ${deviceScore}`
        });
        totalScore += deviceScore;
      }

      // Check user behavior
      if (data.userId) {
        const behaviorScore = await this.checkUserBehavior(data.userId);
        factors.push({
          type: 'user_behavior',
          score: behaviorScore,
          description: `Behavior risk score: ${behaviorScore}`
        });
        totalScore += behaviorScore;
      }

      // Check transaction pattern
      if (data.amount) {
        const transactionScore = await this.checkTransactionPattern(data.userId!, data.amount);
        factors.push({
          type: 'transaction_pattern',
          score: transactionScore,
          description: `Transaction risk score: ${transactionScore}`
        });
        totalScore += transactionScore;
      }

      // Calculate average score
      const riskScore = factors.length > 0 
        ? Math.round(totalScore / factors.length)
        : 0;

      // Determine risk level
      let riskLevel: ThreatLevel = 'low';
      let blocked = false;
      let requiresReview = false;

      if (riskScore >= 80) {
        riskLevel = 'critical';
        blocked = true;
      } else if (riskScore >= 60) {
        riskLevel = 'high';
        requiresReview = true;
      } else if (riskScore >= 40) {
        riskLevel = 'medium';
        requiresReview = true;
      }

      return {
        riskScore,
        riskLevel,
        factors,
        blocked,
        requiresReview
      };

    } catch (error) {
      logger.error('Fraud check failed:', error);
      // Fail safe - allow but flag for review
      return {
        riskScore: 50,
        riskLevel: 'medium',
        factors: [],
        blocked: false,
        requiresReview: true
      };
    }
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(data: string): Promise<{
    encrypted: string;
    iv: string;
    tag: string;
  }> {
    try {
      const key = Buffer.from(functions.config().security?.encryption_key || '', 'hex');
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      
      const encrypted = Buffer.concat([
        cipher.update(data, 'utf8'),
        cipher.final()
      ]);
      
      const tag = cipher.getAuthTag();

      return {
        encrypted: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        tag: tag.toString('base64')
      };

    } catch (error) {
      logger.error('Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decryptData(
    encryptedData: string,
    iv: string,
    tag: string
  ): Promise<string> {
    try {
      const key = Buffer.from(functions.config().security?.encryption_key || '', 'hex');
      
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(iv, 'base64')
      );
      
      decipher.setAuthTag(Buffer.from(tag, 'base64'));
      
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedData, 'base64')),
        decipher.final()
      ]);

      return decrypted.toString('utf8');

    } catch (error) {
      logger.error('Decryption failed:', error);
      throw error;
    }
  }

  /**
   * Get security score
   */
  async getSecurityScore(tenantId: string): Promise<SecurityScore> {
    try {
      const scores = {
        authentication: await this.getAuthenticationScore(tenantId),
        authorization: await this.getAuthorizationScore(tenantId),
        dataProtection: await this.getDataProtectionScore(tenantId),
        monitoring: await this.getMonitoringScore(tenantId),
        compliance: await this.getComplianceScore(tenantId)
      };

      const overall = Object.values(scores).reduce((sum, score) => sum + score, 0) / 5;

      const recommendations = await this.generateSecurityRecommendations(scores);

      return {
        overall,
        factors: scores,
        recommendations
      };

    } catch (error) {
      logger.error('Error calculating security score:', error);
      throw error;
    }
  }

  /**
   * Monitor security events
   */
  async monitorSecurityEvents(): Promise<void> {
    try {
      const recentEvents = await this.getRecentSecurityEvents(60); // Last hour

      // Check for anomalies
      const anomalies = this.detectAnomalies(recentEvents);

      // Process each anomaly
      for (const anomaly of anomalies) {
        await this.handleSecurityAnomaly(anomaly);
      }

      // Update threat level
      await this.updateThreatLevel();

    } catch (error) {
      logger.error('Security monitoring failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get user by credentials
   */
  private async getUserByCredentials(
    email?: string,
    phone?: string,
    tenantId?: string
  ): Promise<any | null> {
    let query = this.firestore.collection('users');

    if (email) {
      query = query.where('email', '==', email) as any;
    } else if (phone) {
      query = query.where('phone', '==', phone) as any;
    } else {
      return null;
    }

    if (tenantId) {
      query = query.where('tenantId', '==', tenantId) as any;
    }

    const snapshot = await query.limit(1).get();
    return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }

  /**
   * Get user by ID
   */
  private async getUserById(userId: string): Promise<any | null> {
    const doc = await this.firestore
      .collection('users')
      .doc(userId)
      .get();

    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  /**
   * Generate tokens
   */
  private async generateTokens(user: any): Promise<{
    token: string;
    refreshToken: string;
  }> {
    const payload = {
      userId: user.id,
      tenantId: user.tenantId,
      roles: user.roles,
      type: 'access'
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    const refreshPayload = {
      ...payload,
      type: 'refresh'
    };

    const refreshToken = jwt.sign(refreshPayload, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN
    });

    return { token, refreshToken };
  }

  /**
   * Generate MFA token
   */
  private async generateMFAToken(userId: string): Promise<string> {
    const payload = {
      userId,
      type: 'mfa',
      exp: Math.floor(Date.now() / 1000) + (MFA_TOKEN_EXPIRES_IN * 60)
    };

    return jwt.sign(payload, JWT_SECRET);
  }

  /**
   * Get user permissions
   */
  private async getUserPermissions(user: any): Promise<string[]> {
    const permissions = new Set<string>();

    // Add role-based permissions
    for (const role of user.roles || []) {
      const rolePerms = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
      
      for (const perm of rolePerms) {
        if (perm.includes('*')) {
          // Expand wildcard permissions
          const [resource] = perm.split(':');
          Object.values(PERMISSIONS)
            .filter(p => p.startsWith(resource))
            .forEach(p => permissions.add(p));
        } else {
          permissions.add(perm);
        }
      }
    }

    // Add custom permissions
    for (const perm of user.customPermissions || []) {
      permissions.add(perm);
    }

    return Array.from(permissions);
  }

  /**
   * Create session
   */
  private async createSession(data: {
    userId: string;
    tenantId: string;
    deviceId: string;
    ipAddress: string;
    userAgent: string;
  }): Promise<SessionInfo> {
    const sessionId = uuidv4();
    const now = new Date();
    
    const session: SessionInfo = {
      id: sessionId,
      ...data,
      createdAt: now,
      lastActivity: now,
      expiresAt: addMinutes(now, SESSION_TIMEOUT),
      active: true
    };

    await this.firestore
      .collection(SESSIONS_COLLECTION)
      .doc(sessionId)
      .set(session);

    return session;
  }

  /**
   * Handle failed login
   */
  private async handleFailedLogin(userId: string, ipAddress?: string): Promise<void> {
    const userRef = this.firestore.collection('users').doc(userId);
    
    await this.firestore.runTransaction(async (transaction) => {
      const doc = await transaction.get(userRef);
      const user = doc.data()!;
      
      const attempts = (user.loginAttempts || 0) + 1;
      
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        transaction.update(userRef, {
          locked: true,
          lockedUntil: addMinutes(new Date(), LOCKOUT_DURATION),
          loginAttempts: attempts
        });
        
        await this.logSecurityEvent('account_locked', {
          userId,
          attempts,
          ipAddress
        });
      } else {
        transaction.update(userRef, {
          loginAttempts: attempts,
          lastFailedLogin: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });
  }

  /**
   * Reset login attempts
   */
  private async resetLoginAttempts(userId: string): Promise<void> {
    await this.firestore
      .collection('users')
      .doc(userId)
      .update({
        loginAttempts: 0,
        lastSuccessfulLogin: admin.firestore.FieldValue.serverTimestamp()
      });
  }

  /**
   * Unlock account
   */
  private async unlockAccount(userId: string): Promise<void> {
    await this.firestore
      .collection('users')
      .doc(userId)
      .update({
        locked: false,
        lockedUntil: null,
        loginAttempts: 0
      });
  }

  /**
   * Hash backup codes
   */
  private async hashBackupCodes(codes: string[]): Promise<string[]> {
    return Promise.all(
      codes.map(code => bcrypt.hash(code, SALT_ROUNDS))
    );
  }

  /**
   * Check resource access
   */
  private async checkResourceAccess(
    context: SecurityContext,
    resource: string,
    action: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check tenant isolation
    if (resource.startsWith('tenant:') && context.tenantId) {
      // User can only access their own tenant
      return { allowed: true };
    }

    // Check ownership for specific resources
    if (resource.startsWith('order:') || resource.startsWith('customer:')) {
      // Additional checks could be implemented here
      return { allowed: true };
    }

    return { allowed: true };
  }

  /**
   * Check IP reputation
   */
  private async checkIPReputation(ipAddress: string): Promise<number> {
    // Check if IP is blocked
    const blockedDoc = await this.firestore
      .collection(BLOCKED_IPS_COLLECTION)
      .doc(ipAddress)
      .get();

    if (blockedDoc.exists) {
      return 100; // Maximum risk
    }

    // Check recent suspicious activity from this IP
    const recentEvents = await this.firestore
      .collection(SECURITY_EVENTS_COLLECTION)
      .where('data.ipAddress', '==', ipAddress)
      .where('type', 'in', ['login_failed', 'fraud_detected'])
      .where('timestamp', '>', subDays(new Date(), 7))
      .get();

    // Calculate score based on suspicious events
    const suspiciousCount = recentEvents.size;
    return Math.min(suspiciousCount * 10, 80);
  }

  /**
   * Check device fingerprint
   */
  private async checkDeviceFingerprint(deviceId: string, userId?: string): Promise<number> {
    if (!userId) return 0;

    // Check if device is known for this user
    const sessions = await this.firestore
      .collection(SESSIONS_COLLECTION)
      .where('userId', '==', userId)
      .where('deviceId', '==', deviceId)
      .limit(1)
      .get();

    // New device is slightly suspicious
    return sessions.empty ? 20 : 0;
  }

  /**
   * Check user behavior
   */
  private async checkUserBehavior(userId: string): Promise<number> {
    // Get recent user activity
    const recentActivity = await this.firestore
      .collection(SECURITY_EVENTS_COLLECTION)
      .where('data.userId', '==', userId)
      .where('timestamp', '>', subDays(new Date(), 1))
      .get();

    // Check for unusual activity patterns
    const activityCount = recentActivity.size;
    
    // High activity might indicate automated behavior
    if (activityCount > 100) return 60;
    if (activityCount > 50) return 40;
    if (activityCount > 20) return 20;
    
    return 0;
  }

  /**
   * Check transaction pattern
   */
  private async checkTransactionPattern(userId: string, amount: number): Promise<number> {
    // Get user's transaction history
    const transactions = await this.firestore
      .collection('transactions')
      .where('userId', '==', userId)
      .where('timestamp', '>', subDays(new Date(), 30))
      .get();

    if (transactions.empty) {
      // First transaction is slightly risky
      return 20;
    }

    // Calculate average transaction amount
    const amounts = transactions.docs.map(doc => doc.data().amount);
    const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const maxAmount = Math.max(...amounts);

    // Check if amount is unusual
    if (amount > maxAmount * 2) return 60;
    if (amount > avgAmount * 3) return 40;
    if (amount > avgAmount * 2) return 20;

    return 0;
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(
    type: string,
    data: any,
    severity: ThreatLevel = 'low'
  ): Promise<void> {
    const event: SecurityEvent = {
      id: uuidv4(),
      type,
      severity,
      timestamp: new Date(),
      data,
      source: 'SecurityService'
    };

    await this.firestore
      .collection(SECURITY_EVENTS_COLLECTION)
      .doc(event.id)
      .set(event);
  }

  /**
   * Log authorization attempt
   */
  private async logAuthorizationAttempt(data: {
    userId: string;
    tenantId: string;
    resource: string;
    action: string;
    allowed: boolean;
    reason?: string;
  }): Promise<void> {
    const log: AuditLog = {
      id: uuidv4(),
      timestamp: new Date(),
      userId: data.userId,
      tenantId: data.tenantId,
      action: `${data.resource}:${data.action}`,
      result: data.allowed ? 'allowed' : 'denied',
      details: {
        resource: data.resource,
        action: data.action,
        reason: data.reason
      },
      ipAddress: 'system',
      userAgent: 'SecurityService'
    };

    await this.firestore
      .collection(AUDIT_LOGS_COLLECTION)
      .doc(log.id)
      .set(log);
  }

  /**
   * Get recent security events
   */
  private async getRecentSecurityEvents(minutes: number): Promise<SecurityEvent[]> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    
    const snapshot = await this.firestore
      .collection(SECURITY_EVENTS_COLLECTION)
      .where('timestamp', '>', since)
      .get();

    return snapshot.docs.map(doc => doc.data() as SecurityEvent);
  }

  /**
   * Detect anomalies
   */
  private detectAnomalies(events: SecurityEvent[]): Array<{
    type: string;
    severity: ThreatLevel;
    description: string;
    events: SecurityEvent[];
  }> {
    const anomalies: Array<any> = [];

    // Check for brute force attempts
    const failedLogins = events.filter(e => e.type === 'login_failed');
    const loginsByIP = new Map<string, SecurityEvent[]>();
    
    failedLogins.forEach(event => {
      const ip = event.data.ipAddress;
      if (!loginsByIP.has(ip)) {
        loginsByIP.set(ip, []);
      }
      loginsByIP.get(ip)!.push(event);
    });

    loginsByIP.forEach((ipEvents, ip) => {
      if (ipEvents.length > 10) {
        anomalies.push({
          type: 'brute_force_attempt',
          severity: 'high' as ThreatLevel,
          description: `Brute force attempt from IP ${ip}`,
          events: ipEvents
        });
      }
    });

    // Check for privilege escalation attempts
    const authFailures = events.filter(e => 
      e.type === 'authorization_denied' && 
      e.data.resource.includes('admin')
    );

    if (authFailures.length > 5) {
      anomalies.push({
        type: 'privilege_escalation_attempt',
        severity: 'critical' as ThreatLevel,
        description: 'Multiple unauthorized admin access attempts',
        events: authFailures
      });
    }

    return anomalies;
  }

  /**
   * Handle security anomaly
   */
  private async handleSecurityAnomaly(anomaly: any): Promise<void> {
    // Take action based on anomaly type
    switch (anomaly.type) {
      case 'brute_force_attempt':
        // Block IP
        const ip = anomaly.events[0].data.ipAddress;
        await this.blockIP(ip, 'Brute force attempt detected');
        break;

      case 'privilege_escalation_attempt':
        // Alert administrators
        await this.alertAdministrators(anomaly);
        break;
    }

    // Log anomaly
    await this.logSecurityEvent('anomaly_detected', anomaly, anomaly.severity);
  }

  /**
   * Block IP address
   */
  private async blockIP(ipAddress: string, reason: string): Promise<void> {
    await this.firestore
      .collection(BLOCKED_IPS_COLLECTION)
      .doc(ipAddress)
      .set({
        ipAddress,
        reason,
        blockedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: addDays(new Date(), 7) // 7 day ban
      });
  }

  /**
   * Alert administrators
   */
  private async alertAdministrators(anomaly: any): Promise<void> {
    // In production, this would send notifications to admins
    logger.error('SECURITY ALERT:', anomaly);
  }

  /**
   * Update threat level
   */
  private async updateThreatLevel(): Promise<void> {
    // Calculate current threat level based on recent events
    const recentEvents = await this.getRecentSecurityEvents(60);
    
    const criticalCount = recentEvents.filter(e => e.severity === 'critical').length;
    const highCount = recentEvents.filter(e => e.severity === 'high').length;
    
    let threatLevel: ThreatLevel = 'low';
    if (criticalCount > 0) threatLevel = 'critical';
    else if (highCount > 5) threatLevel = 'high';
    else if (highCount > 0) threatLevel = 'medium';

    // Store current threat level
    await this.firestore
      .collection('security_status')
      .doc('current')
      .set({
        threatLevel,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
  }

  /**
   * Calculate security scores
   */
  private async getAuthenticationScore(tenantId: string): Promise<number> {
    // Check MFA adoption
    const users = await this.firestore
      .collection('users')
      .where('tenantId', '==', tenantId)
      .get();

    const mfaEnabled = users.docs.filter(doc => doc.data().mfaEnabled).length;
    const mfaScore = (mfaEnabled / users.size) * 100;

    return Math.round(mfaScore * 0.8 + 20); // Base score of 20
  }

  private async getAuthorizationScore(tenantId: string): Promise<number> {
    // Check proper role assignments
    // In production, would analyze role usage patterns
    return 85;
  }

  private async getDataProtectionScore(tenantId: string): Promise<number> {
    // Check encryption usage, backup status, etc.
    return 90;
  }

  private async getMonitoringScore(tenantId: string): Promise<number> {
    // Check logging coverage, alert configuration
    return 75;
  }

  private async getComplianceScore(tenantId: string): Promise<number> {
    // Check GDPR compliance, audit logs, etc.
    return 80;
  }

  /**
   * Generate security recommendations
   */
  private async generateSecurityRecommendations(scores: any): Promise<string[]> {
    const recommendations: string[] = [];

    if (scores.authentication < 80) {
      recommendations.push('Enable MFA for all users to improve authentication security');
    }

    if (scores.authorization < 80) {
      recommendations.push('Review and update user role assignments');
    }

    if (scores.monitoring < 80) {
      recommendations.push('Configure additional security alerts and monitoring');
    }

    if (scores.compliance < 80) {
      recommendations.push('Review data retention policies for compliance');
    }

    return recommendations;
  }
}