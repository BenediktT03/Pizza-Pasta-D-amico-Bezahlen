/**
 * EATECH - CORS Configuration Middleware
 * Version: 1.0.0
 * Description: Express middleware for Cross-Origin Resource Sharing (CORS) configuration
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/middleware/cors.middleware.ts
 */

import { Request, Response, NextFunction } from 'express';
import * as cors from 'cors';
import { CONFIG } from '../config/environment';
import { AuthenticatedRequest } from './auth.middleware';
import * as functions from 'firebase-functions';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * CORS options configuration
 */
export interface CorsOptions {
  origins?: string[] | string | RegExp | boolean;
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
  dynamicOrigin?: boolean;
  customHeaders?: Record<string, string>;
}

/**
 * Origin validation result
 */
export interface OriginValidation {
  allowed: boolean;
  origin?: string;
  reason?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default CORS configuration
 */
const DEFAULT_CORS_OPTIONS: CorsOptions = {
  origins: CONFIG.security.corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-API-Key',
    'X-Tenant-ID',
    'X-Correlation-ID',
    'X-Session-ID',
    'X-Device-ID',
    'X-App-Version'
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Response-Time',
    'X-Total-Count',
    'X-Page-Count'
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

/**
 * Allowed origins by environment
 */
const ENVIRONMENT_ORIGINS: Record<string, string[]> = {
  development: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ],
  staging: [
    'https://staging.eatech.ch',
    'https://staging-admin.eatech.ch',
    'https://staging-customer.eatech.ch',
    'https://staging-mobile.eatech.ch'
  ],
  production: [
    'https://eatech.ch',
    'https://www.eatech.ch',
    'https://admin.eatech.ch',
    'https://customer.eatech.ch',
    'https://mobile.eatech.ch',
    'https://app.eatech.ch'
  ]
};

/**
 * Trusted subdomains pattern
 */
const TRUSTED_SUBDOMAIN_PATTERN = /^https:\/\/([a-z0-9-]+\.)*eatech\.ch$/;

/**
 * Mobile app schemes
 */
const MOBILE_APP_SCHEMES = [
  'capacitor://localhost',
  'ionic://localhost',
  'eatech://app'
];

// ============================================================================
// ORIGIN VALIDATION
// ============================================================================

/**
 * Validates origin against allowed origins
 */
export function validateOrigin(
  origin: string | undefined,
  allowedOrigins: string[] | string | RegExp | boolean
): OriginValidation {
  // No origin (same-origin request)
  if (!origin) {
    return { allowed: true, reason: 'Same-origin request' };
  }
  
  // Allow all origins
  if (allowedOrigins === true || allowedOrigins === '*') {
    return { allowed: true, origin, reason: 'All origins allowed' };
  }
  
  // Deny all origins
  if (allowedOrigins === false) {
    return { allowed: false, reason: 'CORS disabled' };
  }
  
  // Check string match
  if (typeof allowedOrigins === 'string') {
    const allowed = origin === allowedOrigins;
    return {
      allowed,
      origin: allowed ? origin : undefined,
      reason: allowed ? 'Exact match' : 'Origin not allowed'
    };
  }
  
  // Check regex match
  if (allowedOrigins instanceof RegExp) {
    const allowed = allowedOrigins.test(origin);
    return {
      allowed,
      origin: allowed ? origin : undefined,
      reason: allowed ? 'Pattern match' : 'Origin pattern not matched'
    };
  }
  
  // Check array of origins
  if (Array.isArray(allowedOrigins)) {
    const allowed = allowedOrigins.includes(origin);
    return {
      allowed,
      origin: allowed ? origin : undefined,
      reason: allowed ? 'In allowed list' : 'Origin not in allowed list'
    };
  }
  
  return { allowed: false, reason: 'Invalid origin configuration' };
}

/**
 * Dynamic origin validator based on environment and tenant
 */
export async function dynamicOriginValidator(
  origin: string | undefined,
  req: Request
): Promise<OriginValidation> {
  // First check environment-specific origins
  const envOrigins = ENVIRONMENT_ORIGINS[CONFIG.environment] || [];
  const envValidation = validateOrigin(origin, envOrigins);
  if (envValidation.allowed) {
    return envValidation;
  }
  
  // Check trusted subdomain pattern
  if (origin && TRUSTED_SUBDOMAIN_PATTERN.test(origin)) {
    return { allowed: true, origin, reason: 'Trusted subdomain' };
  }
  
  // Check mobile app schemes
  if (origin && MOBILE_APP_SCHEMES.includes(origin)) {
    return { allowed: true, origin, reason: 'Mobile app' };
  }
  
  // Check tenant-specific origins
  const authReq = req as AuthenticatedRequest;
  if (authReq.user?.tenantId) {
    try {
      const { getCollection } = await import('../config/firebase.config');
      const tenantDoc = await getCollection('tenants').doc(authReq.user.tenantId).get();
      
      if (tenantDoc.exists) {
        const tenantData = tenantDoc.data();
        const allowedOrigins = tenantData?.corsOrigins || [];
        
        if (allowedOrigins.includes(origin)) {
          return { allowed: true, origin, reason: 'Tenant-specific origin' };
        }
      }
    } catch (error) {
      functions.logger.error('Error checking tenant origins:', error);
    }
  }
  
  return { allowed: false, reason: 'Origin not allowed' };
}

// ============================================================================
// CORS MIDDLEWARE
// ============================================================================

/**
 * Creates CORS middleware with custom configuration
 */
export function createCorsMiddleware(options: CorsOptions = {}): cors.CorsOptions {
  const corsOptions = { ...DEFAULT_CORS_OPTIONS, ...options };
  
  return {
    origin: async (origin, callback) => {
      // Handle dynamic origin validation
      if (corsOptions.dynamicOrigin) {
        // This requires access to the request object
        // which is not available in the origin callback
        // Use the custom implementation below instead
        callback(null, true);
        return;
      }
      
      const validation = validateOrigin(origin, corsOptions.origins!);
      
      if (validation.allowed) {
        callback(null, validation.origin || true);
      } else {
        callback(new Error(`CORS: ${validation.reason}`));
      }
    },
    
    methods: corsOptions.methods,
    allowedHeaders: corsOptions.allowedHeaders,
    exposedHeaders: corsOptions.exposedHeaders,
    credentials: corsOptions.credentials,
    maxAge: corsOptions.maxAge,
    preflightContinue: corsOptions.preflightContinue,
    optionsSuccessStatus: corsOptions.optionsSuccessStatus
  };
}

/**
 * Custom CORS middleware with dynamic origin validation
 */
export function dynamicCors(options: CorsOptions = {}) {
  const corsOptions = { ...DEFAULT_CORS_OPTIONS, ...options };
  
  return async (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    
    // Validate origin
    const validation = corsOptions.dynamicOrigin
      ? await dynamicOriginValidator(origin, req)
      : validateOrigin(origin, corsOptions.origins!);
    
    if (!validation.allowed) {
      // Log blocked origin attempt
      functions.logger.warn('CORS blocked origin:', {
        origin,
        reason: validation.reason,
        path: req.path,
        method: req.method
      });
      
      // Don't set CORS headers for disallowed origins
      if (req.method === 'OPTIONS') {
        res.status(403).end();
        return;
      }
      
      next();
      return;
    }
    
    // Set CORS headers
    if (validation.origin) {
      res.header('Access-Control-Allow-Origin', validation.origin);
    } else if (validation.allowed && !origin) {
      // Same-origin request, no need to set header
    } else {
      res.header('Access-Control-Allow-Origin', '*');
    }
    
    if (corsOptions.credentials) {
      res.header('Access-Control-Allow-Credentials', 'true');
    }
    
    if (corsOptions.exposedHeaders && corsOptions.exposedHeaders.length > 0) {
      res.header('Access-Control-Expose-Headers', corsOptions.exposedHeaders.join(', '));
    }
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Methods', corsOptions.methods!.join(', '));
      res.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders!.join(', '));
      res.header('Access-Control-Max-Age', corsOptions.maxAge!.toString());
      
      // Add custom headers
      if (corsOptions.customHeaders) {
        Object.entries(corsOptions.customHeaders).forEach(([key, value]) => {
          res.header(key, value);
        });
      }
      
      res.status(corsOptions.optionsSuccessStatus!).end();
      return;
    }
    
    next();
  };
}

// ============================================================================
// PRESET CORS CONFIGURATIONS
// ============================================================================

/**
 * Strict CORS for production APIs
 */
export const strictCors = createCorsMiddleware({
  origins: ENVIRONMENT_ORIGINS.production,
  credentials: true,
  maxAge: 3600 // 1 hour
});

/**
 * Relaxed CORS for development
 */
export const developmentCors = createCorsMiddleware({
  origins: true, // Allow all origins in development
  credentials: true
});

/**
 * Public API CORS (no credentials)
 */
export const publicApiCors = createCorsMiddleware({
  origins: '*',
  credentials: false,
  methods: ['GET', 'OPTIONS']
});

/**
 * Mobile app CORS
 */
export const mobileAppCors = createCorsMiddleware({
  origins: [...MOBILE_APP_SCHEMES, ...ENVIRONMENT_ORIGINS[CONFIG.environment]],
  credentials: true,
  exposedHeaders: [
    ...DEFAULT_CORS_OPTIONS.exposedHeaders!,
    'X-Update-Available',
    'X-Min-App-Version'
  ]
});

/**
 * Webhook CORS (very restrictive)
 */
export const webhookCors = createCorsMiddleware({
  origins: false, // No CORS for webhooks
  credentials: false
});

// ============================================================================
// SECURITY HEADERS
// ============================================================================

/**
 * Security headers middleware
 */
export function securityHeaders(options: {
  csp?: boolean;
  hsts?: boolean;
  noSniff?: boolean;
  frameOptions?: string;
  xssProtection?: boolean;
  referrerPolicy?: string;
} = {}) {
  const {
    csp = true,
    hsts = true,
    noSniff = true,
    frameOptions = 'DENY',
    xssProtection = true,
    referrerPolicy = 'strict-origin-when-cross-origin'
  } = options;
  
  return (req: Request, res: Response, next: NextFunction) => {
    // HSTS
    if (hsts && CONFIG.isProduction) {
      res.header(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }
    
    // Content-Type sniffing
    if (noSniff) {
      res.header('X-Content-Type-Options', 'nosniff');
    }
    
    // Clickjacking protection
    if (frameOptions) {
      res.header('X-Frame-Options', frameOptions);
    }
    
    // XSS protection
    if (xssProtection) {
      res.header('X-XSS-Protection', '1; mode=block');
    }
    
    // Referrer policy
    if (referrerPolicy) {
      res.header('Referrer-Policy', referrerPolicy);
    }
    
    // Content Security Policy
    if (csp) {
      const cspDirectives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://api.eatech.ch wss://eatech.ch",
        "frame-src 'self' https://js.stripe.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'"
      ];
      
      res.header('Content-Security-Policy', cspDirectives.join('; '));
    }
    
    // Additional security headers
    res.header('X-Permitted-Cross-Domain-Policies', 'none');
    res.header('X-Download-Options', 'noopen');
    res.header('X-DNS-Prefetch-Control', 'off');
    
    next();
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Checks if request is from allowed origin
 */
export function isAllowedOrigin(req: Request): boolean {
  const origin = req.headers.origin;
  const validation = validateOrigin(origin, CONFIG.security.corsOrigins);
  return validation.allowed;
}

/**
 * Gets CORS headers for response
 */
export function getCorsHeaders(origin?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  
  headers['Access-Control-Allow-Credentials'] = 'true';
  headers['Access-Control-Allow-Methods'] = DEFAULT_CORS_OPTIONS.methods!.join(', ');
  headers['Access-Control-Allow-Headers'] = DEFAULT_CORS_OPTIONS.allowedHeaders!.join(', ');
  headers['Access-Control-Expose-Headers'] = DEFAULT_CORS_OPTIONS.exposedHeaders!.join(', ');
  headers['Access-Control-Max-Age'] = DEFAULT_CORS_OPTIONS.maxAge!.toString();
  
  return headers;
}

/**
 * Adds CORS headers to Firebase Functions response
 */
export function addCorsHeaders(
  req: functions.https.Request,
  res: functions.Response,
  options: CorsOptions = {}
): void {
  const corsOptions = { ...DEFAULT_CORS_OPTIONS, ...options };
  const origin = req.headers.origin;
  
  const validation = validateOrigin(origin, corsOptions.origins!);
  
  if (validation.allowed && validation.origin) {
    res.set('Access-Control-Allow-Origin', validation.origin);
  }
  
  if (corsOptions.credentials) {
    res.set('Access-Control-Allow-Credentials', 'true');
  }
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', corsOptions.methods!.join(', '));
    res.set('Access-Control-Allow-Headers', corsOptions.allowedHeaders!.join(', '));
    res.set('Access-Control-Max-Age', corsOptions.maxAge!.toString());
    res.status(204).send('');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Main middleware
  createCorsMiddleware,
  dynamicCors,
  securityHeaders,
  
  // Preset configurations
  strictCors,
  developmentCors,
  publicApiCors,
  mobileAppCors,
  webhookCors,
  
  // Validation functions
  validateOrigin,
  dynamicOriginValidator,
  
  // Utility functions
  isAllowedOrigin,
  getCorsHeaders,
  addCorsHeaders,
  
  // Constants
  DEFAULT_CORS_OPTIONS,
  ENVIRONMENT_ORIGINS,
  TRUSTED_SUBDOMAIN_PATTERN,
  MOBILE_APP_SCHEMES
};