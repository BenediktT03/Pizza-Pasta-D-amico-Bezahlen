    /**
 * EATECH - Error Handling Utility Functions
 * Version: 1.0.0
 * Description: Comprehensive error handling and logging utilities
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/utils/errorHandler.ts
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sanitizeForLogging } from './encryptionUtils';

// ============================================================================
// ERROR TYPES
// ============================================================================

export enum ErrorCode {
  // Authentication Errors (1xxx)
  UNAUTHORIZED = 'AUTH001',
  INVALID_CREDENTIALS = 'AUTH002',
  TOKEN_EXPIRED = 'AUTH003',
  TOKEN_INVALID = 'AUTH004',
  INSUFFICIENT_PERMISSIONS = 'AUTH005',
  ACCOUNT_DISABLED = 'AUTH006',
  ACCOUNT_NOT_FOUND = 'AUTH007',
  
  // Validation Errors (2xxx)
  VALIDATION_ERROR = 'VAL001',
  INVALID_INPUT = 'VAL002',
  MISSING_REQUIRED_FIELD = 'VAL003',
  INVALID_FORMAT = 'VAL004',
  VALUE_OUT_OF_RANGE = 'VAL005',
  DUPLICATE_ENTRY = 'VAL006',
  
  // Business Logic Errors (3xxx)
  BUSINESS_RULE_VIOLATION = 'BUS001',
  INSUFFICIENT_INVENTORY = 'BUS002',
  ORDER_CANCELLED = 'BUS003',
  PAYMENT_FAILED = 'BUS004',
  DELIVERY_NOT_AVAILABLE = 'BUS005',
  TENANT_LIMIT_EXCEEDED = 'BUS006',
  
  // Database Errors (4xxx)
  DATABASE_ERROR = 'DB001',
  RECORD_NOT_FOUND = 'DB002',
  DUPLICATE_KEY = 'DB003',
  TRANSACTION_FAILED = 'DB004',
  CONNECTION_ERROR = 'DB005',
  
  // External Service Errors (5xxx)
  EXTERNAL_SERVICE_ERROR = 'EXT001',
  PAYMENT_GATEWAY_ERROR = 'EXT002',
  EMAIL_SERVICE_ERROR = 'EXT003',
  SMS_SERVICE_ERROR = 'EXT004',
  STORAGE_SERVICE_ERROR = 'EXT005',
  
  // System Errors (6xxx)
  INTERNAL_ERROR = 'SYS001',
  SERVICE_UNAVAILABLE = 'SYS002',
  RATE_LIMIT_EXCEEDED = 'SYS003',
  RESOURCE_EXHAUSTED = 'SYS004',
  TIMEOUT_ERROR = 'SYS005',
  CONFIGURATION_ERROR = 'SYS006',
  
  // Unknown Error
  UNKNOWN_ERROR = 'UNK001'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

/**
 * Base custom error class
 */
export class BaseError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly severity: ErrorSeverity;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;
  public readonly timestamp: Date;
  
  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.severity = severity;
    this.isOperational = isOperational;
    this.context = context;
    this.timestamp = new Date();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends BaseError {
  constructor(
    message: string = 'Authentication failed',
    code: ErrorCode = ErrorCode.UNAUTHORIZED,
    context?: Record<string, any>
  ) {
    super(message, code, 401, ErrorSeverity.MEDIUM, true, context);
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends BaseError {
  constructor(
    message: string = 'Insufficient permissions',
    code: ErrorCode = ErrorCode.INSUFFICIENT_PERMISSIONS,
    context?: Record<string, any>
  ) {
    super(message, code, 403, ErrorSeverity.MEDIUM, true, context);
  }
}

/**
 * Validation error
 */
export class ValidationError extends BaseError {
  public readonly errors: Array<{ field: string; message: string }>;
  
  constructor(
    message: string = 'Validation failed',
    errors: Array<{ field: string; message: string }> = [],
    context?: Record<string, any>
  ) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, ErrorSeverity.LOW, true, context);
    this.errors = errors;
  }
}

/**
 * Not found error
 */
export class NotFoundError extends BaseError {
  constructor(
    resource: string,
    identifier?: string,
    context?: Record<string, any>
  ) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, ErrorCode.RECORD_NOT_FOUND, 404, ErrorSeverity.LOW, true, context);
  }
}

/**
 * Business logic error
 */
export class BusinessError extends BaseError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.BUSINESS_RULE_VIOLATION,
    context?: Record<string, any>
  ) {
    super(message, code, 422, ErrorSeverity.MEDIUM, true, context);
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends BaseError {
  public readonly service: string;
  
  constructor(
    service: string,
    message: string,
    code: ErrorCode = ErrorCode.EXTERNAL_SERVICE_ERROR,
    context?: Record<string, any>
  ) {
    super(message, code, 502, ErrorSeverity.HIGH, true, context);
    this.service = service;
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends BaseError {
  public readonly retryAfter: number;
  
  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter: number,
    context?: Record<string, any>
  ) {
    super(message, ErrorCode.RATE_LIMIT_EXCEEDED, 429, ErrorSeverity.LOW, true, context);
    this.retryAfter = retryAfter;
  }
}

// ============================================================================
// ERROR HANDLING FUNCTIONS
// ============================================================================

/**
 * Determines if error is operational (expected) or programming error
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof BaseError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Formats error for client response
 */
export function formatErrorResponse(error: Error): {
  error: {
    code: string;
    message: string;
    details?: any;
  };
} {
  if (error instanceof BaseError) {
    const response: any = {
      error: {
        code: error.code,
        message: error.message
      }
    };
    
    if (error instanceof ValidationError && error.errors) {
      response.error.details = error.errors;
    }
    
    if (error instanceof RateLimitError) {
      response.error.retryAfter = error.retryAfter;
    }
    
    return response;
  }
  
  // Generic error response for non-custom errors
  return {
    error: {
      code: ErrorCode.UNKNOWN_ERROR,
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : error.message
    }
  };
}

/**
 * Logs error with appropriate context
 */
export async function logError(
  error: Error,
  context?: {
    userId?: string;
    tenantId?: string;
    operation?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  const errorData = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context
  };
  
  if (error instanceof BaseError) {
    errorData['code'] = error.code;
    errorData['severity'] = error.severity;
    errorData['isOperational'] = error.isOperational;
    errorData['context'] = sanitizeForLogging(error.context);
  }
  
  // Determine log level based on severity
  const severity = error instanceof BaseError ? error.severity : ErrorSeverity.MEDIUM;
  
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      functions.logger.error('CRITICAL ERROR', errorData);
      await notifyOpsTeam(error, context);
      break;
    case ErrorSeverity.HIGH:
      functions.logger.error('HIGH SEVERITY ERROR', errorData);
      break;
    case ErrorSeverity.MEDIUM:
      functions.logger.warn('MEDIUM SEVERITY ERROR', errorData);
      break;
    case ErrorSeverity.LOW:
      functions.logger.info('LOW SEVERITY ERROR', errorData);
      break;
  }
  
  // Store in Firestore for analysis
  if (severity !== ErrorSeverity.LOW) {
    await storeErrorLog(errorData);
  }
}

/**
 * Stores error log in Firestore
 */
async function storeErrorLog(errorData: Record<string, any>): Promise<void> {
  try {
    const db = admin.firestore();
    await db.collection('error_logs').add({
      ...errorData,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (logError) {
    functions.logger.error('Failed to store error log:', logError);
  }
}

/**
 * Notifies operations team of critical errors
 */
async function notifyOpsTeam(
  error: Error,
  context?: Record<string, any>
): Promise<void> {
  // This would integrate with your notification service
  // For now, just log it
  functions.logger.error('CRITICAL ERROR - OPS NOTIFICATION', {
    error: error.message,
    context
  });
}

// ============================================================================
// EXPRESS ERROR MIDDLEWARE
// ============================================================================

/**
 * Express error handling middleware
 */
export function errorMiddleware(
  error: Error,
  req: any,
  res: any,
  next: any
): void {
  // Log error
  logError(error, {
    userId: req.user?.id,
    tenantId: req.tenant?.id,
    operation: `${req.method} ${req.originalUrl}`,
    metadata: {
      ip: req.ip,
      userAgent: req.get('user-agent')
    }
  });
  
  // Set status code
  const statusCode = error instanceof BaseError ? error.statusCode : 500;
  
  // Set headers for rate limit errors
  if (error instanceof RateLimitError) {
    res.set('Retry-After', error.retryAfter.toString());
  }
  
  // Send error response
  res.status(statusCode).json(formatErrorResponse(error));
}

/**
 * Async error wrapper for Express routes
 */
export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// FIREBASE FUNCTIONS ERROR HANDLING
// ============================================================================

/**
 * Converts error to Firebase Functions HttpsError
 */
export function toHttpsError(error: Error): functions.https.HttpsError {
  if (error instanceof BaseError) {
    const code = getFirebaseFunctionCode(error.statusCode);
    return new functions.https.HttpsError(
      code,
      error.message,
      formatErrorResponse(error).error
    );
  }
  
  return new functions.https.HttpsError(
    'internal',
    'An unexpected error occurred',
    { code: ErrorCode.UNKNOWN_ERROR }
  );
}

/**
 * Maps HTTP status code to Firebase Functions error code
 */
function getFirebaseFunctionCode(statusCode: number): functions.https.FunctionsErrorCode {
  const codeMap: Record<number, functions.https.FunctionsErrorCode> = {
    400: 'invalid-argument',
    401: 'unauthenticated',
    403: 'permission-denied',
    404: 'not-found',
    409: 'already-exists',
    429: 'resource-exhausted',
    500: 'internal',
    502: 'unavailable',
    503: 'unavailable',
    504: 'deadline-exceeded'
  };
  
  return codeMap[statusCode] || 'internal';
}

// ============================================================================
// ERROR RECOVERY
// ============================================================================

/**
 * Retry mechanism for transient errors
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    backoffMultiplier = 2,
    shouldRetry = isTransientError
  } = options;
  
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }
      
      const delay = retryDelay * Math.pow(backoffMultiplier, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Determines if error is transient and should be retried
 */
function isTransientError(error: Error): boolean {
  if (error instanceof BaseError) {
    const transientCodes = [
      ErrorCode.CONNECTION_ERROR,
      ErrorCode.TIMEOUT_ERROR,
      ErrorCode.SERVICE_UNAVAILABLE,
      ErrorCode.EXTERNAL_SERVICE_ERROR
    ];
    
    return transientCodes.includes(error.code);
  }
  
  // Check for common transient error messages
  const message = error.message.toLowerCase();
  return message.includes('timeout') || 
         message.includes('econnrefused') ||
         message.includes('service unavailable');
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

/**
 * Circuit breaker for external services
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime?: Date;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
    private readonly name: string = 'default'
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime!.getTime() > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new ExternalServiceError(
          this.name,
          'Service circuit breaker is open'
        );
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
      functions.logger.error(`Circuit breaker opened for ${this.name}`);
    }
  }
  
  getState(): string {
    return this.state;
  }
}

// ============================================================================
// ERROR AGGREGATION
// ============================================================================

/**
 * Aggregates multiple errors
 */
export class AggregateError extends BaseError {
  public readonly errors: Error[];
  
  constructor(errors: Error[], message?: string) {
    const errorMessage = message || `${errors.length} errors occurred`;
    super(
      errorMessage,
      ErrorCode.INTERNAL_ERROR,
      500,
      ErrorSeverity.HIGH,
      true
    );
    this.errors = errors;
  }
}

/**
 * Collects errors and throws aggregate if any
 */
export class ErrorCollector {
  private errors: Error[] = [];
  
  add(error: Error): void {
    this.errors.push(error);
  }
  
  hasErrors(): boolean {
    return this.errors.length > 0;
  }
  
  throwIfAny(message?: string): void {
    if (this.hasErrors()) {
      throw new AggregateError(this.errors, message);
    }
  }
  
  getErrors(): Error[] {
    return [...this.errors];
  }
  
  clear(): void {
    this.errors = [];
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Error classes
  BaseError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  BusinessError,
  ExternalServiceError,
  RateLimitError,
  AggregateError,
  
  // Error handling
  isOperationalError,
  formatErrorResponse,
  logError,
  errorMiddleware,
  asyncHandler,
  toHttpsError,
  
  // Error recovery
  retryOperation,
  CircuitBreaker,
  ErrorCollector,
  
  // Constants
  ErrorCode,
  ErrorSeverity
};