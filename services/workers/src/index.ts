/**
 * EATECH Cloudflare Workers
 * Main entry point for all edge workers
 */

import { Router, IRequest, error, json } from 'itty-router';
import { handleImageOptimization } from './image-optimization';
import { handleCache, purgeCache } from './cache-handler';
import { RateLimiter } from './rate-limiter';
import { withAuth } from './middleware/auth';
import { withCors } from './middleware/cors';
import { withLogging } from './middleware/logging';

// Environment interface
export interface Env {
  // KV Namespaces
  CACHE: KVNamespace;
  IMAGES: KVNamespace;
  SESSIONS: KVNamespace;
  
  // R2 Buckets
  ASSETS: R2Bucket;
  UPLOADS: R2Bucket;
  
  // Durable Objects
  RATE_LIMITER: DurableObjectNamespace;
  
  // Environment variables
  ENVIRONMENT: string;
  API_VERSION: string;
  MAX_IMAGE_SIZE: string;
  ALLOWED_IMAGE_TYPES: string;
  CACHE_TTL: string;
  JWT_SECRET: string;
  API_KEY: string;
}

// Create router
const router = Router();

// Apply global middleware
router.all('*', withCors);
router.all('*', withLogging);

// Health check
router.get('/health', () => {
  return json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    worker: 'eatech-workers',
    version: '3.0.0',
  });
});

// Public routes

// Image optimization and CDN
router.get('/cdn/images/:path+', async (request: IRequest, env: Env, ctx: ExecutionContext) => {
  return handleImageOptimization(request, env, ctx);
});

// Image upload (requires auth)
router.post('/api/v1/images/upload', withAuth, async (request: IRequest, env: Env, ctx: ExecutionContext) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return error(400, 'No file uploaded');
    }

    // Validate file type
    const allowedTypes = env.ALLOWED_IMAGE_TYPES.split(',');
    if (!allowedTypes.includes(file.type)) {
      return error(400, `Invalid file type. Allowed types: ${env.ALLOWED_IMAGE_TYPES}`);
    }

    // Validate file size
    const maxSize = parseInt(env.MAX_IMAGE_SIZE);
    if (file.size > maxSize) {
      return error(400, `File too large. Maximum size: ${maxSize} bytes`);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop();
    const filename = `uploads/${timestamp}-${randomId}.${extension}`;

    // Upload to R2
    await env.UPLOADS.put(filename, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        uploadedBy: request.user?.id || 'anonymous',
      },
    });

    // Store metadata in KV
    await env.IMAGES.put(filename, JSON.stringify({
      filename,
      originalName: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      uploadedBy: request.user?.id || 'anonymous',
    }), {
      expirationTtl: 60 * 60 * 24 * 365, // 1 year
    });

    return json({
      success: true,
      data: {
        filename,
        url: `https://cdn.eatech.ch/images/${filename}`,
        size: file.size,
        type: file.type,
      },
    });
  } catch (err) {
    console.error('Upload error:', err);
    return error(500, 'Upload failed');
  }
});

// Cache management
router.get('/api/v1/cache/:key', withAuth, async (request: IRequest, env: Env) => {
  return handleCache.get(request, env);
});

router.put('/api/v1/cache/:key', withAuth, async (request: IRequest, env: Env) => {
  return handleCache.set(request, env);
});

router.delete('/api/v1/cache/:key', withAuth, async (request: IRequest, env: Env) => {
  return handleCache.delete(request, env);
});

router.post('/api/v1/cache/purge', withAuth, async (request: IRequest, env: Env) => {
  return purgeCache(request, env);
});

// Rate limiting test endpoint
router.get('/api/v1/rate-limit-test', async (request: IRequest, env: Env) => {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateLimiterId = env.RATE_LIMITER.idFromName(ip);
  const rateLimiter = env.RATE_LIMITER.get(rateLimiterId);
  
  const response = await rateLimiter.fetch(request);
  return response;
});

// Edge functions for A/B testing
router.get('/api/v1/ab-test/:experiment', async (request: IRequest, env: Env) => {
  const { experiment } = request.params;
  const userId = request.headers.get('X-User-ID') || 'anonymous';
  
  // Simple hash-based assignment
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variant = hash % 2 === 0 ? 'A' : 'B';
  
  // Store assignment in KV
  await env.CACHE.put(`ab-test:${experiment}:${userId}`, variant, {
    expirationTtl: 60 * 60 * 24 * 30, // 30 days
  });
  
  return json({
    experiment,
    variant,
    userId,
  });
});

// Geolocation API
router.get('/api/v1/geo', (request: IRequest) => {
  const cf = request.cf;
  
  return json({
    country: cf?.country,
    region: cf?.region,
    city: cf?.city,
    postalCode: cf?.postalCode,
    latitude: cf?.latitude,
    longitude: cf?.longitude,
    timezone: cf?.timezone,
    asn: cf?.asn,
    colo: cf?.colo,
  });
});

// Swiss-specific edge functions
router.get('/api/v1/swiss/canton', (request: IRequest) => {
  const cf = request.cf;
  
  // Map postal codes to cantons
  const postalCode = cf?.postalCode;
  if (!postalCode) {
    return json({ error: 'Could not determine location' }, { status: 400 });
  }
  
  const canton = getCantonFromPostalCode(postalCode);
  
  return json({
    postalCode,
    canton,
    taxRate: getCantonTaxRate(canton),
    language: getCantonLanguage(canton),
  });
});

// 404 handler
router.all('*', () => error(404, 'Not found'));

// Main worker handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return router.handle(request, env, ctx);
  },
};

// Durable Object for rate limiting
export class RateLimiter {
  state: DurableObjectState;
  requests: Map<string, number[]>;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.requests = new Map();
  }

  async fetch(request: Request): Promise<Response> {
    const now = Date.now();
    const window = 60 * 1000; // 1 minute window
    const limit = 100; // 100 requests per minute
    
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const timestamps = this.requests.get(ip) || [];
    
    // Remove old timestamps
    const validTimestamps = timestamps.filter(ts => ts > now - window);
    
    if (validTimestamps.length >= limit) {
      return new Response('Rate limit exceeded', {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(validTimestamps[0] + window).toISOString(),
        },
      });
    }
    
    validTimestamps.push(now);
    this.requests.set(ip, validTimestamps);
    
    // Clean up old IPs periodically
    if (Math.random() < 0.01) {
      for (const [key, value] of this.requests.entries()) {
        if (value.every(ts => ts < now - window)) {
          this.requests.delete(key);
        }
      }
    }
    
    return new Response('OK', {
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': (limit - validTimestamps.length).toString(),
        'X-RateLimit-Reset': new Date(now + window).toISOString(),
      },
    });
  }
}

// Swiss utilities
function getCantonFromPostalCode(postalCode: string): string {
  const code = parseInt(postalCode);
  
  // Simplified mapping - in production, use complete mapping
  if (code >= 1000 && code <= 1299) return 'VD'; // Vaud
  if (code >= 1200 && code <= 1299) return 'GE'; // Geneva
  if (code >= 3000 && code <= 3999) return 'BE'; // Bern
  if (code >= 8000 && code <= 8999) return 'ZH'; // Zurich
  if (code >= 4000 && code <= 4999) return 'BS'; // Basel
  if (code >= 6000 && code <= 6999) return 'LU'; // Lucerne
  
  return 'CH'; // Default
}

function getCantonTaxRate(canton: string): number {
  const taxRates: Record<string, number> = {
    ZH: 7.7,
    BE: 7.7,
    LU: 7.7,
    UR: 7.7,
    SZ: 7.7,
    OW: 7.7,
    NW: 7.7,
    GL: 7.7,
    ZG: 7.7,
    FR: 7.7,
    SO: 7.7,
    BS: 7.7,
    BL: 7.7,
    SH: 7.7,
    AR: 7.7,
    AI: 7.7,
    SG: 7.7,
    GR: 7.7,
    AG: 7.7,
    TG: 7.7,
    TI: 7.7,
    VD: 7.7,
    VS: 7.7,
    NE: 7.7,
    GE: 7.7,
    JU: 7.7,
  };
  
  return taxRates[canton] || 7.7;
}

function getCantonLanguage(canton: string): string {
  const languages: Record<string, string> = {
    ZH: 'de',
    BE: 'de',
    LU: 'de',
    UR: 'de',
    SZ: 'de',
    OW: 'de',
    NW: 'de',
    GL: 'de',
    ZG: 'de',
    FR: 'fr',
    SO: 'de',
    BS: 'de',
    BL: 'de',
    SH: 'de',
    AR: 'de',
    AI: 'de',
    SG: 'de',
    GR: 'de',
    AG: 'de',
    TG: 'de',
    TI: 'it',
    VD: 'fr',
    VS: 'fr',
    NE: 'fr',
    GE: 'fr',
    JU: 'fr',
  };
  
  return languages[canton] || 'de';
}
