/**
 * EATECH - Rate Limiting Utility Functions
 * Version: 1.0.0
 * Description: Rate limiting utilities for API protection and resource management
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/utils/rateLimiter.ts
 */

import * as admin from 'firebase-admin';
import { RateLimiterMemory, RateLimiterFirestore, IRateLimiterOptions } from 'rate-limiter-flexible';
import * as functions from 'firebase-functions';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface RateLimitConfig {
  points: number;          // Number of requests
  duration: number;        // Per duration in seconds
  blockDuration?: number;  // Block duration in seconds when limit exceeded
  keyPrefix?: string;      // Prefix for the key
  execEvenly?: boolean;    // Spread requests evenly
}

export interface RateLimitResult {
  allowed: boolean;
  remainingPoints: number;
  msBeforeNext: number;
  consumedPoints: number;
  isFirstInDuration: boolean;
}

export enum RateLimitTier {
  PUBLIC = 'public',
  AUTHENTICATED = 'authenticated',
  PREMIUM = 'premium',
  ADMIN = 'admin'
}

// ============================================================================
// RATE LIMIT CONFIGURATIONS
// ============================================================================

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // API Endpoints
  'api:public': {
    points: 60,
    duration: 60,          // 60 requests per minute
    blockDuration: 60      // Block for 1 minute
  },
  'api:authenticated': {
    points: 300,
    duration: 60,          // 300 requests per minute
    blockDuration: 300     // Block for 5 minutes
  },
  'api:premium': {
    points: 1000,
    duration: 60,          // 1000 requests per minute
    blockDuration: 300
  },
  
  // Specific Operations
  'auth:login': {
    points: 5,
    duration: 900,         // 5 attempts per 15 minutes
    blockDuration: 900     // Block for 15 minutes
  },
  'auth:register': {
    points: 3,
    duration: 3600,        // 3 registrations per hour
    blockDuration: 3600
  },
  'auth:password-reset': {
    points: 3,
    duration: 3600,        // 3 resets per hour
    blockDuration: 3600
  },
  
  // Orders
  'order:create': {
    points: 30,
    duration: 3600,        // 30 orders per hour
    blockDuration: 1800
  },
  'order:status-update': {
    points: 100,
    duration: 3600,        // 100 updates per hour
    blockDuration: 600
  },
  
  // Notifications
  'notification:email': {
    points: 50,
    duration: 3600,        // 50 emails per hour
    blockDuration: 3600
  },
  'notification:sms': {
    points: 20,
    duration: 3600,        // 20 SMS per hour
    blockDuration: 3600
  },
  'notification:push': {
    points: 100,
    duration: 3600,        // 100 push notifications per hour
    blockDuration: 1800
  },
  
  // Reports
  'report:generate': {
    points: 10,
    duration: 3600,        // 10 reports per hour
    blockDuration: 1800
  },
  'report:export': {
    points: 5,
    duration: 3600,        // 5 exports per hour
    blockDuration: 3600
  },
  
  // File Operations
  'file:upload': {
    points: 20,
    duration: 3600,        // 20 uploads per hour
    blockDuration: 1800
  },
  'file:download': {
    points: 100,
    duration: 3600,        // 100 downloads per hour
    blockDuration: 600
  },
  
  // Search
  'search:products': {
    points: 120,
    duration: 60,          // 120 searches per minute
    blockDuration: 300
  },
  'search:customers': {
    points: 60,
    duration: 60,          // 60 searches per minute
    blockDuration: 300
  }
};

// ============================================================================
// RATE LIMITER INSTANCES
// ============================================================================

// In-memory rate limiter for development/testing
const memoryLimiters: Map<string, RateLimiterMemory> = new Map();

// Firestore rate limiter for production
let firestoreLimiter: RateLimiterFirestore | null = null;

/**
 * Gets or creates a rate limiter instance
 */
function getRateLimiter(
  key: string,
  config: RateLimitConfig
): RateLimiterMemory | RateLimiterFirestore {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    if (!firestoreLimiter) {
      const db = admin.firestore();
      firestoreLimiter = new RateLimiterFirestore({
        storeClient: db,
        keyPrefix: 'rate_limit',
        tableName: 'rate_limits',
        ...config
      });
    }
    return firestoreLimiter;
  } else {
    // Use in-memory limiter for development
    if (!memoryLimiters.has(key)) {
      memoryLimiters.set(key, new RateLimiterMemory({
        keyPrefix: key,
        ...config
      }));
    }
    return memoryLimiters.get(key)!;
  }
}

// ============================================================================
// CORE RATE LIMITING FUNCTIONS
// ============================================================================

/**
 * Checks rate limit for a given key
 */
export async function checkRateLimit(
  identifier: string,
  operation: string,
  customConfig?: RateLimitConfig
): Promise<RateLimitResult> {
  const config = customConfig || RATE_LIMIT_CONFIGS[operation];
  
  if (!config) {
    throw new Error(`No rate limit configuration found for operation: ${operation}`);
  }
  
  const limiter = getRateLimiter(operation, config);
  const key = `${operation}:${identifier}`;
  
  try {
    const result = await limiter.consume(key, 1);
    
    return {
      allowed: true,
      remainingPoints: result.remainingPoints,
      msBeforeNext: result.msBeforeNext,
      consumedPoints: result.consumedPoints,
      isFirstInDuration: result.isFirstInDuration
    };
  } catch (rejRes: any) {
    return {
      allowed: false,
      remainingPoints: rejRes.remainingPoints || 0,
      msBeforeNext: rejRes.msBeforeNext || 0,
      consumedPoints: rejRes.consumedPoints || 0,
      isFirstInDuration: false
    };
  }
}

/**
 * Consumes multiple points from rate limit
 */
export async function consumeRateLimit(
  identifier: string,
  operation: string,
  points: number = 1
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIGS[operation];
  
  if (!config) {
    throw new Error(`No rate limit configuration found for operation: ${operation}`);
  }
  
  const limiter = getRateLimiter(operation, config);
  const key = `${operation}:${identifier}`;
  
  try {
    const result = await limiter.consume(key, points);
    
    return {
      allowed: true,
      remainingPoints: result.remainingPoints,
      msBeforeNext: result.msBeforeNext,
      consumedPoints: result.consumedPoints,
      isFirstInDuration: result.isFirstInDuration
    };
  } catch (rejRes: any) {
    return {
      allowed: false,
      remainingPoints: rejRes.remainingPoints || 0,
      msBeforeNext: rejRes.msBeforeNext || 0,
      consumedPoints: rejRes.consumedPoints || 0,
      isFirstInDuration: false
    };
  }
}

/**
 * Resets rate limit for a given key
 */
export async function resetRateLimit(
  identifier: string,
  operation: string
): Promise<void> {
  const config = RATE_LIMIT_CONFIGS[operation];
  
  if (!config) {
    throw new Error(`No rate limit configuration found for operation: ${operation}`);
  }
  
  const limiter = getRateLimiter(operation, config);
  const key = `${operation}:${identifier}`;
  
  await limiter.delete(key);
}

/**
 * Gets current rate limit status without consuming
 */
export async function getRateLimitStatus(
  identifier: string,
  operation: string
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIGS[operation];
  
  if (!config) {
    throw new Error(`No rate limit configuration found for operation: ${operation}`);
  }
  
  const limiter = getRateLimiter(operation, config);
  const key = `${operation}:${identifier}`;
  
  try {
    const result = await limiter.get(key);
    
    if (!result) {
      return {
        allowed: true,
        remainingPoints: config.points,
        msBeforeNext: 0,
        consumedPoints: 0,
        isFirstInDuration: true
      };
    }
    
    return {
      allowed: result.remainingPoints > 0,
      remainingPoints: result.remainingPoints,
      msBeforeNext: result.msBeforeNext,
      consumedPoints: result.consumedPoints,
      isFirstInDuration: false
    };
  } catch (error) {
    throw new Error(`Failed to get rate limit status: ${error}`);
  }
}

// ============================================================================
// MIDDLEWARE HELPERS
// ============================================================================

/**
 * Creates rate limit middleware for Express
 */
export function createRateLimitMiddleware(
  operation: string,
  keyExtractor: (req: any) => string,
  customConfig?: RateLimitConfig
) {
  return async (req: any, res: any, next: any) => {
    try {
      const identifier = keyExtractor(req);
      const result = await checkRateLimit(identifier, operation, customConfig);
      
      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': customConfig?.points || RATE_LIMIT_CONFIGS[operation]?.points,
        'X-RateLimit-Remaining': result.remainingPoints,
        'X-RateLimit-Reset': new Date(Date.now() + result.msBeforeNext).toISOString()
      });
      
      if (!result.allowed) {
        res.set('Retry-After', Math.round(result.msBeforeNext / 1000));
        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${Math.ceil(result.msBeforeNext / 1000)} seconds.`,
          retryAfter: result.msBeforeNext
        });
      }
      
      next();
    } catch (error) {
      functions.logger.error('Rate limit middleware error:', error);
      next(); // Allow request on error
    }
  };
}

/**
 * Rate limit middleware for Firebase Functions
 */
export async function rateLimitFunction(
  context: functions.https.CallableContext,
  operation: string,
  customConfig?: RateLimitConfig
): Promise<void> {
  const identifier = context.auth?.uid || context.rawRequest.ip || 'anonymous';
  const result = await checkRateLimit(identifier, operation, customConfig);
  
  if (!result.allowed) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      `Rate limit exceeded. Try again in ${Math.ceil(result.msBeforeNext / 1000)} seconds.`
    );
  }
}

// ============================================================================
// TENANT-SPECIFIC RATE LIMITING
// ============================================================================

/**
 * Gets rate limit configuration for a tenant
 */
export async function getTenantRateLimit(
  tenantId: string,
  operation: string
): Promise<RateLimitConfig> {
  const db = admin.firestore();
  
  try {
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    const tenantData = tenantDoc.data();
    
    if (!tenantData) {
      return RATE_LIMIT_CONFIGS[operation];
    }
    
    // Check for custom rate limits based on plan
    const plan = tenantData.subscription?.plan || 'basic';
    const customLimits = tenantData.rateLimits?.[operation];
    
    if (customLimits) {
      return customLimits;
    }
    
    // Apply plan-based multipliers
    const baseConfig = RATE_LIMIT_CONFIGS[operation];
    const multiplier = {
      basic: 1,
      pro: 2,
      enterprise: 5
    }[plan] || 1;
    
    return {
      ...baseConfig,
      points: baseConfig.points * multiplier
    };
  } catch (error) {
    functions.logger.error('Error fetching tenant rate limits:', error);
    return RATE_LIMIT_CONFIGS[operation];
  }
}

// ============================================================================
// DISTRIBUTED RATE LIMITING
// ============================================================================

/**
 * Implements sliding window rate limiting
 */
export class SlidingWindowRateLimiter {
  private windowSize: number;
  private limit: number;
  
  constructor(windowSize: number, limit: number) {
    this.windowSize = windowSize;
    this.limit = limit;
  }
  
  async checkLimit(key: string): Promise<boolean> {
    const db = admin.firestore();
    const now = Date.now();
    const windowStart = now - this.windowSize;
    
    const ref = db.collection('rate_limit_events')
      .where('key', '==', key)
      .where('timestamp', '>', windowStart);
    
    const snapshot = await ref.get();
    
    if (snapshot.size >= this.limit) {
      return false;
    }
    
    // Record the event
    await db.collection('rate_limit_events').add({
      key,
      timestamp: now
    });
    
    // Clean up old events (in background)
    this.cleanupOldEvents(key, windowStart).catch(err => 
      functions.logger.error('Cleanup error:', err)
    );
    
    return true;
  }
  
  private async cleanupOldEvents(key: string, windowStart: number): Promise<void> {
    const db = admin.firestore();
    const oldEvents = await db.collection('rate_limit_events')
      .where('key', '==', key)
      .where('timestamp', '<', windowStart)
      .get();
    
    const batch = db.batch();
    oldEvents.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
}

// ============================================================================
// ANALYTICS & MONITORING
// ============================================================================

/**
 * Records rate limit metrics
 */
export async function recordRateLimitMetrics(
  operation: string,
  identifier: string,
  result: RateLimitResult
): Promise<void> {
  const db = admin.firestore();
  const timestamp = admin.firestore.FieldValue.serverTimestamp();
  
  try {
    await db.collection('rate_limit_metrics').add({
      operation,
      identifier,
      allowed: result.allowed,
      remainingPoints: result.remainingPoints,
      consumedPoints: result.consumedPoints,
      timestamp
    });
  } catch (error) {
    functions.logger.error('Error recording rate limit metrics:', error);
  }
}

/**
 * Gets rate limit statistics
 */
export async function getRateLimitStats(
  operation: string,
  timeRange: { start: Date; end: Date }
): Promise<{
  totalRequests: number;
  blockedRequests: number;
  blockRate: number;
  topConsumers: Array<{ identifier: string; count: number }>;
}> {
  const db = admin.firestore();
  
  const snapshot = await db.collection('rate_limit_metrics')
    .where('operation', '==', operation)
    .where('timestamp', '>=', timeRange.start)
    .where('timestamp', '<=', timeRange.end)
    .get();
  
  let totalRequests = 0;
  let blockedRequests = 0;
  const consumerCounts = new Map<string, number>();
  
  snapshot.forEach(doc => {
    const data = doc.data();
    totalRequests++;
    
    if (!data.allowed) {
      blockedRequests++;
    }
    
    const count = consumerCounts.get(data.identifier) || 0;
    consumerCounts.set(data.identifier, count + 1);
  });
  
  const topConsumers = Array.from(consumerCounts.entries())
    .map(([identifier, count]) => ({ identifier, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return {
    totalRequests,
    blockedRequests,
    blockRate: totalRequests > 0 ? blockedRequests / totalRequests : 0,
    topConsumers
  };
}

// ============================================================================
// CLEANUP FUNCTIONS
// ============================================================================

/**
 * Cleans up expired rate limit entries
 */
export async function cleanupExpiredRateLimits(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    // Clean up in-memory limiters
    memoryLimiters.clear();
    return;
  }
  
  const db = admin.firestore();
  const expirationTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
  
  const snapshot = await db.collection('rate_limits')
    .where('expiresAt', '<', expirationTime)
    .limit(500)
    .get();
  
  const batch = db.batch();
  snapshot.forEach(doc => batch.delete(doc.ref));
  
  if (!snapshot.empty) {
    await batch.commit();
    functions.logger.info(`Cleaned up ${snapshot.size} expired rate limit entries`);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Core functions
  checkRateLimit,
  consumeRateLimit,
  resetRateLimit,
  getRateLimitStatus,
  
  // Middleware
  createRateLimitMiddleware,
  rateLimitFunction,
  
  // Tenant-specific
  getTenantRateLimit,
  
  // Classes
  SlidingWindowRateLimiter,
  
  // Analytics
  recordRateLimitMetrics,
  getRateLimitStats,
  
  // Cleanup
  cleanupExpiredRateLimits,
  
  // Constants
  RATE_LIMIT_CONFIGS,
  RateLimitTier
};