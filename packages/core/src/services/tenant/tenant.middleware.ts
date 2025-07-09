import { Request, Response, NextFunction } from 'express';
import { tenantService } from './tenant.service';
import { authService } from '../auth/auth.service';
import { Tenant, TenantStatus } from './tenant.types';
import { AppError } from '../../utils/errors';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      tenant?: Tenant;
      tenantId?: string;
      userId?: string;
      userRole?: string;
    }
  }
}

/**
 * Extract tenant from request
 * Priority: subdomain > custom domain > header > user's tenant
 */
export async function extractTenant(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let tenant: Tenant | null = null;
    
    // 1. Try subdomain (e.g., restaurant-name.eatech.ch)
    const host = req.get('host') || '';
    const subdomain = extractSubdomain(host);
    
    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      tenant = await tenantService.getTenantBySlug(subdomain);
    }
    
    // 2. Try custom domain
    if (!tenant && !host.includes('eatech.ch')) {
      tenant = await tenantService.getTenantByDomain(host);
    }
    
    // 3. Try X-Tenant-ID header (for API requests)
    if (!tenant) {
      const tenantId = req.get('X-Tenant-ID');
      if (tenantId) {
        tenant = await tenantService.getTenantById(tenantId);
      }
    }
    
    // 4. Try to get from authenticated user's default tenant
    if (!tenant && req.userId) {
      const user = await authService.getUserById(req.userId);
      if (user?.tenantId) {
        tenant = await tenantService.getTenantById(user.tenantId);
      }
    }
    
    // Attach tenant to request if found
    if (tenant) {
      req.tenant = tenant;
      req.tenantId = tenant.id;
    }
    
    next();
  } catch (error) {
    console.error('Error extracting tenant:', error);
    next(error);
  }
}

/**
 * Ensure tenant is present and active
 */
export function requireTenant(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.tenant) {
    return next(new AppError('Tenant not found', 'TENANT_NOT_FOUND', 404));
  }
  
  if (req.tenant.status !== TenantStatus.ACTIVE && 
      req.tenant.status !== TenantStatus.TRIAL) {
    return next(new AppError('Tenant is not active', 'TENANT_INACTIVE', 403));
  }
  
  next();
}

/**
 * Check if user has access to the tenant
 */
export async function checkTenantAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.userId || !req.tenantId) {
      return next(new AppError('Unauthorized', 'UNAUTHORIZED', 401));
    }
    
    // Get user's tenant memberships
    const user = await authService.getUserById(req.userId);
    
    if (!user) {
      return next(new AppError('User not found', 'USER_NOT_FOUND', 404));
    }
    
    // Check if user has access to this tenant
    const hasAccess = user.tenantId === req.tenantId || 
                     user.tenantIds?.includes(req.tenantId) ||
                     user.role === 'super_admin';
    
    if (!hasAccess) {
      return next(new AppError(
        'Access denied to this tenant', 
        'TENANT_ACCESS_DENIED', 
        403
      ));
    }
    
    next();
  } catch (error) {
    console.error('Error checking tenant access:', error);
    next(error);
  }
}

/**
 * Check if tenant has specific feature enabled
 */
export function requireFeature(feature: keyof Tenant['settings']['features']) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.tenant) {
      return next(new AppError('Tenant not found', 'TENANT_NOT_FOUND', 404));
    }
    
    if (!req.tenant.settings.features[feature]) {
      return next(new AppError(
        `Feature '${feature}' is not enabled for this tenant`,
        'FEATURE_NOT_ENABLED',
        403
      ));
    }
    
    next();
  };
}

/**
 * Check if tenant plan includes specific feature
 */
export function requirePlan(minPlan: 'starter' | 'professional' | 'enterprise') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.tenant) {
      return next(new AppError('Tenant not found', 'TENANT_NOT_FOUND', 404));
    }
    
    const planHierarchy = {
      starter: 0,
      professional: 1,
      enterprise: 2,
      custom: 3,
    };
    
    const tenantPlanLevel = planHierarchy[req.tenant.plan] || 0;
    const requiredPlanLevel = planHierarchy[minPlan] || 0;
    
    if (tenantPlanLevel < requiredPlanLevel) {
      return next(new AppError(
        `This feature requires at least ${minPlan} plan`,
        'INSUFFICIENT_PLAN',
        403
      ));
    }
    
    next();
  };
}

/**
 * Set tenant-specific headers
 */
export function setTenantHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.tenant) {
    res.setHeader('X-Tenant-ID', req.tenant.id);
    res.setHeader('X-Tenant-Name', req.tenant.name);
    res.setHeader('X-Tenant-Plan', req.tenant.plan);
  }
  
  next();
}

/**
 * Rate limiting per tenant
 */
export function tenantRateLimit(options: {
  windowMs: number;
  max: number;
  message?: string;
}) {
  const tenantRequests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.tenantId) {
      return next();
    }
    
    const now = Date.now();
    const tenantData = tenantRequests.get(req.tenantId);
    
    if (!tenantData || tenantData.resetTime < now) {
      // Initialize or reset
      tenantRequests.set(req.tenantId, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      return next();
    }
    
    if (tenantData.count >= options.max) {
      return next(new AppError(
        options.message || 'Too many requests',
        'RATE_LIMIT_EXCEEDED',
        429
      ));
    }
    
    tenantData.count++;
    next();
  };
}

/**
 * Filter response data based on tenant
 */
export function filterTenantData(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const originalJson = res.json;
  
  res.json = function(data: any): Response {
    // If tenant is set and data has tenantId, filter it
    if (req.tenantId && data && typeof data === 'object') {
      if (Array.isArray(data)) {
        data = data.filter(item => 
          !item.tenantId || item.tenantId === req.tenantId
        );
      } else if (data.tenantId && data.tenantId !== req.tenantId) {
        return res.status(403).json({
          error: 'Access denied to this resource',
          code: 'TENANT_ACCESS_DENIED',
        });
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Log tenant activity
 */
export function logTenantActivity(
  action: string,
  category: string = 'general'
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.tenant || !req.userId) {
      return next();
    }
    
    try {
      // Log activity (implement your logging service)
      console.log('Tenant Activity:', {
        tenantId: req.tenantId,
        userId: req.userId,
        action,
        category,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error logging tenant activity:', error);
    }
    
    next();
  };
}

/**
 * Helper function to extract subdomain
 */
function extractSubdomain(host: string): string | null {
  const parts = host.split('.');
  
  // Check if it's a subdomain (at least 3 parts)
  if (parts.length >= 3) {
    // Remove port if present
    return parts[0].split(':')[0];
  }
  
  return null;
}

/**
 * Middleware to handle tenant context in async operations
 */
export function bindTenantContext(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.tenant) {
    return next();
  }
  
  // Store tenant context for async operations
  const asyncLocalStorage = new Map();
  asyncLocalStorage.set('tenantId', req.tenantId);
  asyncLocalStorage.set('tenant', req.tenant);
  
  // Make it available globally (be careful with this approach)
  (global as any).tenantContext = asyncLocalStorage;
  
  // Clean up after response
  res.on('finish', () => {
    delete (global as any).tenantContext;
  });
  
  next();
}

/**
 * Validate tenant-specific request data
 */
export function validateTenantData(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.tenant) {
    return next();
  }
  
  // Ensure any data being created/updated has the correct tenantId
  if (req.body && typeof req.body === 'object') {
    // For POST/PUT requests, inject tenantId
    if (req.method === 'POST' || req.method === 'PUT') {
      req.body.tenantId = req.tenantId;
    }
    
    // Validate that tenantId matches if provided
    if (req.body.tenantId && req.body.tenantId !== req.tenantId) {
      return next(new AppError(
        'Tenant ID mismatch',
        'TENANT_ID_MISMATCH',
        400
      ));
    }
  }
  
  next();
}

// Export middleware collection for easy use
export const tenantMiddleware = {
  extract: extractTenant,
  require: requireTenant,
  checkAccess: checkTenantAccess,
  requireFeature,
  requirePlan,
  setHeaders: setTenantHeaders,
  rateLimit: tenantRateLimit,
  filterData: filterTenantData,
  logActivity: logTenantActivity,
  bindContext: bindTenantContext,
  validateData: validateTenantData,
};
