/**
 * CORS configuration for Cloud Functions
 * Handles Cross-Origin Resource Sharing settings
 */

import * as cors from 'cors';

// Allowed origins based on environment
const getAllowedOrigins = (): string[] => {
  const env = process.env.FUNCTIONS_ENV || 'development';
  
  const origins = {
    development: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'https://localhost:3000',
      'https://localhost:5173',
    ],
    staging: [
      'https://staging.eatech.ch',
      'https://staging-admin.eatech.ch',
      'https://staging-kitchen.eatech.ch',
      'https://staging-master.eatech.ch',
      'https://preview.eatech.ch',
      'https://*.vercel.app',
      'https://*.netlify.app',
    ],
    production: [
      'https://eatech.ch',
      'https://www.eatech.ch',
      'https://app.eatech.ch',
      'https://admin.eatech.ch',
      'https://kitchen.eatech.ch',
      'https://master.eatech.ch',
      'https://api.eatech.ch',
      // Swiss domain variations
      'https://eatech.swiss',
      'https://www.eatech.swiss',
      // Mobile app deep links
      'capacitor://localhost',
      'ionic://localhost',
      'http://localhost', // For mobile apps
    ],
  };

  // Combine all origins for the environment
  let allowedOrigins = origins[env] || origins.development;

  // Add custom domains from environment variables
  if (process.env.CUSTOM_DOMAINS) {
    const customDomains = process.env.CUSTOM_DOMAINS.split(',').map(d => d.trim());
    allowedOrigins = [...allowedOrigins, ...customDomains];
  }

  // Add tenant-specific domains
  if (process.env.TENANT_DOMAINS) {
    const tenantDomains = process.env.TENANT_DOMAINS.split(',').map(d => d.trim());
    allowedOrigins = [...allowedOrigins, ...tenantDomains];
  }

  return allowedOrigins;
};

// CORS options for different endpoints
export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Check for wildcard patterns
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed.includes('*')) {
          const pattern = allowed.replace(/\*/g, '.*');
          const regex = new RegExp(`^${pattern}$`);
          return regex.test(origin);
        }
        return false;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`CORS: Blocked origin ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-API-Key',
    'X-Tenant-ID',
    'X-Session-ID',
    'X-Device-ID',
    'X-App-Version',
    'X-Platform',
    'Accept-Language',
    'X-Timezone',
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-Rate-Limit-Limit',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset',
    'X-Response-Time',
  ],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Strict CORS for admin endpoints
export const adminCorsOptions: cors.CorsOptions = {
  ...corsOptions,
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins().filter(o => 
      o.includes('admin') || 
      o.includes('master') || 
      o.includes('localhost') ||
      o.includes('127.0.0.1')
    );

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`Admin CORS: Blocked origin ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
};

// Webhook CORS (more permissive for external services)
export const webhookCorsOptions: cors.CorsOptions = {
  origin: true, // Allow all origins for webhooks
  credentials: false,
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'X-Stripe-Signature',
    'X-Twilio-Signature',
    'X-Twint-Signature',
    'X-SendGrid-Signature',
    'X-Webhook-Signature',
  ],
  maxAge: 3600,
};

// Public API CORS (for third-party integrations)
export const publicApiCorsOptions: cors.CorsOptions = {
  origin: true,
  credentials: false,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'X-API-Key',
    'Accept',
    'Accept-Language',
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-Rate-Limit-Limit',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset',
  ],
  maxAge: 3600,
};

// Helper function to create CORS middleware for specific domains
export function createDomainCors(allowedDomains: string[]): cors.CorsOptions {
  return {
    ...corsOptions,
    origin: (origin, callback) => {
      if (!origin || allowedDomains.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  };
}

// Helper to check if request is from allowed origin
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // Allow requests with no origin
  
  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.some(allowed => {
    if (allowed.includes('*')) {
      const pattern = allowed.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(origin);
    }
    return allowed === origin;
  });
}

// Helper to get CORS headers for manual response
export function getCorsHeaders(origin?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': corsOptions.allowedHeaders!.join(', '),
    'Access-Control-Max-Age': String(corsOptions.maxAge),
  };

  if (origin && isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }

  return headers;
}

// Preflight response helper
export function handlePreflight(req: any, res: any): void {
  const origin = req.headers.origin;
  const headers = getCorsHeaders(origin);
  
  res.set(headers);
  res.status(204).send('');
}

// CORS error handler
export function corsErrorHandler(err: any, req: any, res: any, next: any): void {
  if (err && err.message === 'Not allowed by CORS') {
    res.status(403).json({
      error: 'CORS Policy Violation',
      message: 'The origin of this request is not allowed to access this resource.',
      origin: req.headers.origin,
    });
  } else {
    next(err);
  }
}

// Export configured CORS middleware
export const corsMiddleware = cors(corsOptions);
export const adminCorsMiddleware = cors(adminCorsOptions);
export const webhookCorsMiddleware = cors(webhookCorsOptions);
export const publicApiCorsMiddleware = cors(publicApiCorsOptions);
