/**
 * EATECH V3.0 - AI Middleware
 * Middleware für AI Services mit Swiss Standards
 * Features: Rate Limiting, Authentication, Logging, Privacy Compliance
 */

import cors from 'cors';
import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getInsightsConfig, getMonitoringConfig, getPerformanceConfig } from '../config/ai.config';
import { AIMetrics } from '../monitoring/metrics';
import { PrivacyManager } from '../privacy/privacy-manager';
import { AILogger } from '../utils/logger';

// Extended Request interface for AI context
export interface AIRequest extends Request {
  ai?: {
    tenantId: string;
    userId?: string;
    sessionId: string;
    language: string;
    canton?: string;
    clientType: 'web' | 'mobile' | 'pos' | 'api';
    features: string[];
    rateLimit: {
      remaining: number;
      reset: Date;
    };
    context: {
      ip: string;
      userAgent: string;
      origin: string;
      timestamp: Date;
    };
    privacy: {
      consentLevel: 'strict' | 'balanced' | 'permissive';
      anonymized: boolean;
      dataRetention: number; // days
    };
  };
}

const logger = new AILogger('AI-Middleware');
const metrics = new AIMetrics();
const privacyManager = new PrivacyManager();

// Request validation schemas
const aiRequestSchema = z.object({
  tenantId: z.string().uuid('Invalid Tenant ID'),
  userId: z.string().uuid().optional(),
  language: z.enum(['de-CH', 'fr-CH', 'it-CH', 'en-US']).default('de-CH'),
  features: z.array(z.string()).default([]),
  context: z.object({
    deviceType: z.enum(['mobile', 'tablet', 'desktop']).optional(),
    location: z.object({
      canton: z.string().length(2).optional(),
      coordinates: z.object({
        lat: z.number(),
        lng: z.number()
      }).optional()
    }).optional()
  }).optional()
});

// Emergency mode bypass schema
const emergencyBypassSchema = z.object({
  emergencyToken: z.string(),
  reason: z.string(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  timestamp: z.number()
});

/**
 * Swiss Privacy Compliance Middleware
 * Ensures FADP/GDPR compliance for all AI requests
 */
export const privacyComplianceMiddleware = async (
  req: AIRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const config = getInsightsConfig();

    if (!config.enabled) {
      return next();
    }

    // Check data retention policies
    const consentLevel = await privacyManager.getConsentLevel(req.ai?.userId);
    const anonymized = config.anonymization || consentLevel === 'strict';

    // Set privacy context
    if (req.ai) {
      req.ai.privacy = {
        consentLevel: consentLevel || 'strict',
        anonymized,
        dataRetention: config.dataRetentionDays
      };
    }

    // Anonymize IP if required
    if (anonymized && req.ip) {
      req.ai!.context.ip = crypto
        .createHash('sha256')
        .update(req.ip + process.env.PRIVACY_SALT)
        .digest('hex')
        .substring(0, 8);
    }

    // Add privacy headers
    res.setHeader('X-Privacy-Mode', consentLevel);
    res.setHeader('X-Data-Anonymized', anonymized.toString());
    res.setHeader('X-Data-Retention-Days', config.dataRetentionDays.toString());

    logger.debug('Privacy compliance validated', {
      consentLevel,
      anonymized,
      tenantId: req.ai?.tenantId
    });

    next();
  } catch (error) {
    logger.error('Privacy compliance check failed', error);
    res.status(500).json({
      error: 'Privacy compliance validation failed',
      code: 'PRIVACY_ERROR'
    });
  }
};

/**
 * AI Authentication Middleware
 * Validates tenant access and API keys
 */
export const aiAuthMiddleware = async (
  req: AIRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;

    if (!authHeader && !apiKey) {
      return res.status(401).json({
        error: 'Authentifizierung erforderlich',
        code: 'AUTH_REQUIRED'
      });
    }

    let tenantId: string;
    let userId: string | undefined;
    let features: string[] = [];

    // JWT Token Authentication
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        tenantId = decoded.tenantId;
        userId = decoded.userId;
        features = decoded.features || [];

        // Check token expiry
        if (decoded.exp && decoded.exp < Date.now() / 1000) {
          return res.status(401).json({
            error: 'Token abgelaufen',
            code: 'TOKEN_EXPIRED'
          });
        }
      } catch (error) {
        return res.status(401).json({
          error: 'Ungültiger Token',
          code: 'INVALID_TOKEN'
        });
      }
    }

    // API Key Authentication
    if (apiKey) {
      const tenant = await validateAPIKey(apiKey);
      if (!tenant) {
        return res.status(401).json({
          error: 'Ungültiger API Key',
          code: 'INVALID_API_KEY'
        });
      }
      tenantId = tenant.id;
      features = tenant.features;
    }

    // Generate session ID
    const sessionId = crypto.randomUUID();

    // Set AI context
    req.ai = {
      tenantId: tenantId!,
      userId,
      sessionId,
      language: req.headers['accept-language']?.includes('fr') ? 'fr-CH' :
               req.headers['accept-language']?.includes('it') ? 'it-CH' :
               req.headers['accept-language']?.includes('en') ? 'en-US' : 'de-CH',
      clientType: determineClientType(req),
      features,
      rateLimit: {
        remaining: 0,
        reset: new Date()
      },
      context: {
        ip: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
        origin: req.headers.origin || '',
        timestamp: new Date()
      },
      privacy: {
        consentLevel: 'strict',
        anonymized: false,
        dataRetention: 365
      }
    };

    logger.debug('AI authentication successful', {
      tenantId,
      userId,
      sessionId,
      features
    });

    next();
  } catch (error) {
    logger.error('AI authentication failed', error);
    res.status(500).json({
      error: 'Authentifizierungsfehler',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Rate Limiting Middleware für AI Requests
 * Swiss-aware rate limiting with tenant-specific limits
 */
export const aiRateLimitMiddleware = () => {
  const config = getPerformanceConfig();

  if (!config.rateLimiting.enabled) {
    return (req: Request, res: Response, next: NextFunction) => next();
  }

  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: config.rateLimiting.requestsPerMinute,

    // Custom key generator (tenant-based)
    keyGenerator: (req: AIRequest) => {
      return `ai:${req.ai?.tenantId || req.ip}`;
    },

    // Custom rate limit handler
    handler: (req: AIRequest, res: Response) => {
      const tenantId = req.ai?.tenantId;

      logger.warn('AI rate limit exceeded', {
        tenantId,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      metrics.incrementCounter('ai_rate_limit_exceeded', {
        tenant_id: tenantId || 'unknown'
      });

      res.status(429).json({
        error: 'Rate Limit erreicht. Zu viele AI Anfragen.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60,
        message: {
          'de-CH': 'Zu viele Anfragen. Bitte warten Sie eine Minute.',
          'fr-CH': 'Trop de demandes. Veuillez attendre une minute.',
          'it-CH': 'Troppe richieste. Si prega di attendere un minuto.',
          'en-US': 'Too many requests. Please wait a minute.'
        }
      });
    },

    // Add rate limit info to response
    onLimitReached: (req: AIRequest, res: Response) => {
      if (req.ai) {
        req.ai.rateLimit = {
          remaining: 0,
          reset: new Date(Date.now() + 60000)
        };
      }
    },

    // Skip successful requests from rate limiting
    skip: (req: AIRequest, res: Response) => {
      return res.statusCode < 400;
    }
  });
};

/**
 * Emergency Mode Middleware
 * Bypasses normal rate limits during emergencies
 */
export const emergencyModeMiddleware = (
  req: AIRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const emergencyHeader = req.headers['x-emergency-mode'];

    if (!emergencyHeader) {
      return next();
    }

    const emergencyData = emergencyBypassSchema.parse(JSON.parse(emergencyHeader as string));

    // Validate emergency token
    const expectedToken = crypto
      .createHmac('sha256', process.env.EMERGENCY_SECRET!)
      .update(`${emergencyData.tenantId}:${emergencyData.timestamp}`)
      .digest('hex');

    if (emergencyData.emergencyToken !== expectedToken) {
      return res.status(401).json({
        error: 'Ungültiger Notfall-Token',
        code: 'INVALID_EMERGENCY_TOKEN'
      });
    }

    // Check if emergency is recent (within 1 hour)
    const emergencyAge = Date.now() - emergencyData.timestamp;
    if (emergencyAge > 3600000) { // 1 hour
      return res.status(401).json({
        error: 'Notfall-Token abgelaufen',
        code: 'EXPIRED_EMERGENCY_TOKEN'
      });
    }

    // Set emergency context
    req.ai = req.ai || {} as any;
    req.ai.emergency = {
      active: true,
      reason: emergencyData.reason,
      timestamp: new Date(emergencyData.timestamp)
    };

    logger.warn('Emergency mode activated', {
      tenantId: emergencyData.tenantId,
      reason: emergencyData.reason,
      userId: emergencyData.userId
    });

    next();
  } catch (error) {
    logger.error('Emergency mode validation failed', error);
    res.status(400).json({
      error: 'Ungültige Notfall-Daten',
      code: 'INVALID_EMERGENCY_DATA'
    });
  }
};

/**
 * Request Validation Middleware
 * Validates AI request structure and parameters
 */
export const aiValidationMiddleware = (
  req: AIRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Validate request body for AI endpoints
    if (req.path.startsWith('/ai/') && req.method === 'POST') {
      const validation = aiRequestSchema.safeParse(req.body);

      if (!validation.success) {
        const errors = validation.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          error: 'Ungültige Request-Daten',
          code: 'VALIDATION_ERROR',
          details: errors
        });
      }

      // Merge validated data with AI context
      if (req.ai) {
        req.ai = {
          ...req.ai,
          ...validation.data
        };
      }
    }

    next();
  } catch (error) {
    logger.error('Request validation failed', error);
    res.status(500).json({
      error: 'Validierungsfehler',
      code: 'VALIDATION_ERROR'
    });
  }
};

/**
 * Logging Middleware für AI Requests
 * Comprehensive logging with Swiss privacy compliance
 */
export const aiLoggingMiddleware = (
  req: AIRequest,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  const config = getMonitoringConfig();

  if (!config.enabled) {
    return next();
  }

  // Log request start
  logger.info('AI request started', {
    method: req.method,
    path: req.path,
    tenantId: req.ai?.tenantId,
    sessionId: req.ai?.sessionId,
    userAgent: req.ai?.privacy?.anonymized ? '[ANONYMIZED]' : req.headers['user-agent'],
    ip: req.ai?.context.ip,
    timestamp: new Date().toISOString()
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log response
    logger.info('AI request completed', {
      method: req.method,
      path: req.path,
      statusCode,
      duration,
      tenantId: req.ai?.tenantId,
      sessionId: req.ai?.sessionId,
      responseSize: JSON.stringify(body).length,
      success: statusCode < 400
    });

    // Collect metrics
    metrics.recordDuration('ai_request_duration', duration, {
      method: req.method,
      path: req.path,
      status_code: statusCode.toString(),
      tenant_id: req.ai?.tenantId || 'unknown'
    });

    metrics.incrementCounter('ai_requests_total', {
      method: req.method,
      path: req.path,
      status_code: statusCode.toString(),
      tenant_id: req.ai?.tenantId || 'unknown'
    });

    return originalJson.call(this, body);
  };

  next();
};

/**
 * Security Headers Middleware für AI Endpoints
 */
export const aiSecurityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.openai.com", "wss://ws.eatech.ch"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Für Web Speech API
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  crossOriginEmbedderPolicy: false // Für Web Audio API
});

/**
 * CORS Middleware für AI Endpoints
 */
export const aiCorsMiddleware = cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://app.eatech.ch',
      'https://admin.eatech.ch',
      'https://master.eatech.ch',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002'
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-Emergency-Mode',
    'Accept-Language',
    'X-Tenant-ID',
    'X-Session-ID'
  ]
});

/**
 * Health Check Middleware
 */
export const aiHealthCheckMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.path === '/ai/health') {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.AI_VERSION || '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    };

    res.json(health);
    return;
  }

  next();
};

// Helper functions
async function validateAPIKey(apiKey: string): Promise<{ id: string; features: string[] } | null> {
  // In a real implementation, this would query the database
  // For now, validate against environment variable
  if (apiKey === process.env.AI_API_KEY) {
    return {
      id: process.env.DEFAULT_TENANT_ID || 'default',
      features: ['all']
    };
  }
  return null;
}

function determineClientType(req: Request): 'web' | 'mobile' | 'pos' | 'api' {
  const userAgent = req.headers['user-agent'] || '';

  if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
    return 'mobile';
  }

  if (req.headers['x-client-type'] === 'pos') {
    return 'pos';
  }

  if (req.headers['x-api-key']) {
    return 'api';
  }

  return 'web';
}

// Combined middleware stack for AI endpoints
export const aiMiddlewareStack = [
  aiHealthCheckMiddleware,
  aiSecurityMiddleware,
  aiCorsMiddleware,
  aiLoggingMiddleware,
  aiAuthMiddleware,
  privacyComplianceMiddleware,
  emergencyModeMiddleware,
  aiRateLimitMiddleware(),
  aiValidationMiddleware
];

export default aiMiddlewareStack;
