/**
 * EATECH - Rate Limiting Middleware
 * Version: 1.0.0
 * Description: Express middleware for API rate limiting
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/middleware/rateLimiting.middleware.ts
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimitError, asyncHandler } from '../utils/errorHandler';
import { 
  checkRateLimit, 
  createRateLimitMiddleware,
  RateLimitConfig,
  RateLimitTier,
  getTenantRateLimit,
  recordRateLimitMetrics
} from '../utils/rateLimiter';
import { AuthenticatedRequest } from './auth.middleware';
import { CONFIG } from '../config/environment';
import { LIMITS } from '../config/constants';
import * as functions from 'firebase-functions';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Rate limit options for middleware
 */
export interface RateLimitOptions {
  operation: string;
  keyExtractor?: (req: Request) => string;
  customConfig?: RateLimitConfig;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  includeTenantLimits?: boolean;
  tier?: RateLimitTier;
}

/**
 * Rate limit info added to request
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  tier: string;
}

/**
 * Extended request with rate limit info
 */
export interface RateLimitedRequest extends Request {
  rateLimit?: RateLimitInfo;
}

// ============================================================================
// KEY EXTRACTORS
// ============================================================================

/**
 * Extracts IP address from request
 */
export function extractIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'] as string;
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;
  return ip || 'unknown';
}

/**
 * Extracts user ID from authenticated request
 */
export function extractUserId(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  return authReq.user?.uid || extractIP(req);
}

/**
 * Extracts tenant ID from authenticated request
 */
export function extractTenantId(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  return authReq.user?.tenantId || authReq.tenant?.id || 'unknown';
}

/**
 * Extracts API key from request
 */
export function extractApiKey(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  return authReq.apiKey || 
         req.headers[CONFIG.security.apiKeyHeader.toLowerCase()] as string ||
         extractIP(req);
}

/**
 * Creates a composite key from multiple sources
 */
export function createCompositeKey(sources: string[]): (req: Request) => string {
  return (req: Request) => sources.map(source => {
    switch (source) {
      case 'ip':
        return extractIP(req);
      case 'user':
        return extractUserId(req);
      case 'tenant':
        return extractTenantId(req);
      case 'apikey':
        return extractApiKey(req);
      default:
        return source;
    }
  }).join(':');
}

// ============================================================================
// RATE LIMIT CONFIGURATIONS
// ============================================================================

/**
 * Default rate limit configurations by tier
 */
export const TIER_CONFIGS: Record<RateLimitTier, RateLimitConfig> = {
  [RateLimitTier.PUBLIC]: {
    points: 60,
    duration: 60,      // 60 requests per minute
    blockDuration: 300
  },
  [RateLimitTier.AUTHENTICATED]: {
    points: 300,
    duration: 60,      // 300 requests per minute
    blockDuration: 300
  },
  [RateLimitTier.PREMIUM]: {
    points: 1000,
    duration: 60,      // 1000 requests per minute
    blockDuration: 300
  },
  [RateLimitTier.ADMIN]: {
    points: 5000,
    duration: 60,      // 5000 requests per minute
    blockDuration: 60
  }
};

// ============================================================================
// MAIN RATE LIMITING MIDDLEWARE
// ============================================================================

/**
 * Creates rate limiting middleware
 */
export function rateLimit(options: RateLimitOptions) {
  return asyncHandler(async (
    req: RateLimitedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const {
      operation,
      keyExtractor = extractIP,
      customConfig,
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
      message,
      includeTenantLimits = true,
      tier
    } = options;
    
    // Skip if rate limiting is disabled
    if (!CONFIG.security.rateLimiting) {
      return next();
    }
    
    try {
      // Extract identifier
      const identifier = keyExtractor(req);
      
      // Get rate limit configuration
      let config = customConfig;
      
      // Check for tenant-specific limits
      if (includeTenantLimits && (req as AuthenticatedRequest).user?.tenantId) {
        try {
          config = await getTenantRateLimit(
            (req as AuthenticatedRequest).user!.tenantId,
            operation
          );
        } catch (error) {
          functions.logger.warn('Failed to get tenant rate limits:', error);
        }
      }
      
      // Use tier-based config if no custom config
      if (!config && tier) {
        config = TIER_CONFIGS[tier];
      }
      
      // Check rate limit
      const result = await checkRateLimit(identifier, operation, config);
      
      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': result.remainingPoints + result.consumedPoints,
        'X-RateLimit-Remaining': result.remainingPoints,
        'X-RateLimit-Reset': new Date(Date.now() + result.msBeforeNext).toISOString(),
        'X-RateLimit-Reset-After': Math.ceil(result.msBeforeNext / 1000)
      });
      
      // Add rate limit info to request
      req.rateLimit = {
        limit: result.remainingPoints + result.consumedPoints,
        remaining: result.remainingPoints,
        reset: new Date(Date.now() + result.msBeforeNext),
        tier: tier || 'custom'
      };
      
      // Record metrics
      await recordRateLimitMetrics(operation, identifier, result);
      
      // Check if rate limit exceeded
      if (!result.allowed) {
        res.set('Retry-After', Math.ceil(result.msBeforeNext / 1000).toString());
        
        const errorMessage = message || 
          `Too many requests. Please retry after ${Math.ceil(result.msBeforeNext / 1000)} seconds.`;
        
        throw new RateLimitError(errorMessage, result.msBeforeNext);
      }
      
      // Handle skip options
      if (skipSuccessfulRequests || skipFailedRequests) {
        const originalEnd = res.end;
        res.end = function(...args: any[]) {
          const shouldSkip = (res.statusCode < 400 && skipSuccessfulRequests) ||
                           (res.statusCode >= 400 && skipFailedRequests);
          
          if (shouldSkip && result.consumedPoints > 0) {
            // Reset the consumed point
            // Note: This would require implementing a reset method in rateLimiter
            functions.logger.debug(`Skipping rate limit consumption for ${operation}`);
          }
          
          return originalEnd.apply(res, args);
        };
      }
      
      next();
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      
      // Log error but don't block request
      functions.logger.error('Rate limiting error:', error);
      next();
    }
  });
}

// ============================================================================
// PRESET RATE LIMITERS
// ============================================================================

/**
 * Rate limiter for public API endpoints
 */
export const publicApiLimiter = rateLimit({
  operation: 'api:public',
  tier: RateLimitTier.PUBLIC,
  keyExtractor: extractIP
});

/**
 * Rate limiter for authenticated API endpoints
 */
export const authenticatedApiLimiter = rateLimit({
  operation: 'api:authenticated',
  tier: RateLimitTier.AUTHENTICATED,
  keyExtractor: extractUserId
});

/**
 * Rate limiter for admin API endpoints
 */
export const adminApiLimiter = rateLimit({
  operation: 'api:admin',
  tier: RateLimitTier.ADMIN,
  keyExtractor: extractUserId
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authLimiter = rateLimit({
  operation: 'auth:login',
  keyExtractor: createCompositeKey(['ip', 'user']),
  customConfig: {
    points: 5,
    duration: 900,        // 5 attempts per 15 minutes
    blockDuration: 900
  },
  message: 'Too many login attempts. Please try again later.'
});

/**
 * Rate limiter for registration
 */
export const registrationLimiter = rateLimit({
  operation: 'auth:register',
  keyExtractor: extractIP,
  customConfig: {
    points: 3,
    duration: 3600,       // 3 registrations per hour
    blockDuration: 3600
  }
});

/**
 * Rate limiter for password reset
 */
export const passwordResetLimiter = rateLimit({
  operation: 'auth:password-reset',
  keyExtractor: createCompositeKey(['ip', 'user']),
  customConfig: {
    points: 3,
    duration: 3600,       // 3 resets per hour
    blockDuration: 3600
  }
});

/**
 * Rate limiter for order creation
 */
export const orderCreationLimiter = rateLimit({
  operation: 'order:create',
  keyExtractor: extractUserId,
  customConfig: {
    points: 30,
    duration: 3600,       // 30 orders per hour
    blockDuration: 1800
  }
});

/**
 * Rate limiter for file uploads
 */
export const fileUploadLimiter = rateLimit({
  operation: 'file:upload',
  keyExtractor: extractUserId,
  customConfig: {
    points: 20,
    duration: 3600,       // 20 uploads per hour
    blockDuration: 1800
  }
});

/**
 * Rate limiter for report generation
 */
export const reportGenerationLimiter = rateLimit({
  operation: 'report:generate',
  keyExtractor: extractTenantId,
  customConfig: {
    points: 10,
    duration: 3600,       // 10 reports per hour per tenant
    blockDuration: 1800
  }
});

/**
 * Rate limiter for search operations
 */
export const searchLimiter = rateLimit({
  operation: 'search:products',
  keyExtractor: extractUserId,
  customConfig: {
    points: 120,
    duration: 60,         // 120 searches per minute
    blockDuration: 300
  },
  skipSuccessfulRequests: true
});

// ============================================================================
// DYNAMIC RATE LIMITING
// ============================================================================

/**
 * Creates a dynamic rate limiter based on request properties
 */
export function dynamicRateLimit(
  configResolver: (req: Request) => Promise<RateLimitOptions>
) {
  return asyncHandler(async (
    req: RateLimitedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const options = await configResolver(req);
    const limiter = rateLimit(options);
    await limiter(req, res, next);
  });
}

/**
 * Rate limiter that adjusts based on time of day
 */
export const timeBasedRateLimiter = dynamicRateLimit(async (req) => {
  const hour = new Date().getHours();
  const isPeakHour = hour >= 11 && hour <= 14 || hour >= 18 && hour <= 21;
  
  return {
    operation: 'api:dynamic',
    tier: isPeakHour ? RateLimitTier.PUBLIC : RateLimitTier.AUTHENTICATED,
    keyExtractor: extractUserId
  };
});

/**
 * Rate limiter that adjusts based on user plan
 */
export const planBasedRateLimiter = dynamicRateLimit(async (req) => {
  const authReq = req as AuthenticatedRequest;
  const plan = authReq.tenant?.plan || 'basic';
  
  const tierMap: Record<string, RateLimitTier> = {
    basic: RateLimitTier.AUTHENTICATED,
    pro: RateLimitTier.PREMIUM,
    enterprise: RateLimitTier.ADMIN
  };
  
  return {
    operation: 'api:plan-based',
    tier: tierMap[plan] || RateLimitTier.AUTHENTICATED,
    keyExtractor: extractUserId,
    includeTenantLimits: true
  };
});

// ============================================================================
// RATE LIMIT BYPASS
// ============================================================================

/**
 * Bypasses rate limiting for certain conditions
 */
export function bypassRateLimit(
  condition: (req: Request) => boolean,
  limiter: any
) {
  return asyncHandler(async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (condition(req)) {
      return next();
    }
    
    await limiter(req, res, next);
  });
}

/**
 * Bypasses rate limiting for internal requests
 */
export const bypassForInternal = (limiter: any) => 
  bypassRateLimit(
    (req) => {
      const internalHeader = req.headers['x-internal-request'];
      const internalSecret = req.headers['x-internal-secret'];
      return internalHeader === 'true' && 
             internalSecret === CONFIG.security.encryptionKey;
    },
    limiter
  );

/**
 * Bypasses rate limiting for admin users
 */
export const bypassForAdmin = (limiter: any) =>
  bypassRateLimit(
    (req) => {
      const authReq = req as AuthenticatedRequest;
      return authReq.user?.role === 'admin' || 
             authReq.user?.role === 'super_admin';
    },
    limiter
  );

// ============================================================================
// COMPOSITE RATE LIMITERS
// ============================================================================

/**
 * Applies multiple rate limiters
 */
export function compositeRateLimit(...limiters: any[]) {
  return asyncHandler(async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    for (const limiter of limiters) {
      await new Promise<void>((resolve, reject) => {
        limiter(req, res, (err?: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    next();
  });
}

/**
 * Rate limiter with fallback
 */
export function rateLimitWithFallback(
  primaryLimiter: any,
  fallbackLimiter: any
) {
  return asyncHandler(async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await primaryLimiter(req, res, next);
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      
      // Use fallback limiter on error
      functions.logger.warn('Primary rate limiter failed, using fallback');
      await fallbackLimiter(req, res, next);
    }
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Gets rate limit info from request
 */
export function getRateLimitInfo(req: RateLimitedRequest): RateLimitInfo | undefined {
  return req.rateLimit;
}

/**
 * Checks if request is rate limited
 */
export function isRateLimited(req: RateLimitedRequest): boolean {
  return req.rateLimit ? req.rateLimit.remaining === 0 : false;
}

/**
 * Gets rate limit headers for response
 */
export function getRateLimitHeaders(info: RateLimitInfo): Record<string, string> {
  return {
    'X-RateLimit-Limit': info.limit.toString(),
    'X-RateLimit-Remaining': info.remaining.toString(),
    'X-RateLimit-Reset': info.reset.toISOString(),
    'X-RateLimit-Reset-After': Math.ceil((info.reset.getTime() - Date.now()) / 1000).toString()
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Main middleware
  rateLimit,
  
  // Preset limiters
  publicApiLimiter,
  authenticatedApiLimiter,
  adminApiLimiter,
  authLimiter,
  registrationLimiter,
  passwordResetLimiter,
  orderCreationLimiter,
  fileUploadLimiter,
  reportGenerationLimiter,
  searchLimiter,
  
  // Dynamic limiters
  dynamicRateLimit,
  timeBasedRateLimiter,
  planBasedRateLimiter,
  
  // Bypass functions
  bypassRateLimit,
  bypassForInternal,
  bypassForAdmin,
  
  // Composite functions
  compositeRateLimit,
  rateLimitWithFallback,
  
  // Key extractors
  extractIP,
  extractUserId,
  extractTenantId,
  extractApiKey,
  createCompositeKey,
  
  // Utility functions
  getRateLimitInfo,
  isRateLimited,
  getRateLimitHeaders,
  
  // Constants
  TIER_CONFIGS
};