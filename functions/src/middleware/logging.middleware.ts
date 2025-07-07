/**
 * EATECH - Request/Response Logging Middleware
 * Version: 1.0.0
 * Description: Express middleware for comprehensive request and response logging
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/middleware/logging.middleware.ts
 */

import { Request, Response, NextFunction } from 'express';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from './auth.middleware';
import { CONFIG } from '../config/environment';
import { sanitizeForLogging } from '../utils/encryptionUtils';
import { getCollection } from '../config/firebase.config';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Log entry structure
 */
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  type: 'request' | 'response' | 'error' | 'custom';
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
  userId?: string;
  tenantId?: string;
  ip?: string;
  userAgent?: string;
  requestId: string;
  correlationId?: string;
  requestSize?: number;
  responseSize?: number;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Logging options
 */
export interface LoggingOptions {
  level?: LogLevel;
  skipPaths?: string[];
  skipMethods?: string[];
  sensitiveHeaders?: string[];
  includeBody?: boolean;
  includeQuery?: boolean;
  includeHeaders?: boolean;
  maxBodySize?: number;
  storage?: 'console' | 'firestore' | 'both';
  customFields?: (req: Request, res: Response) => Record<string, any>;
}

/**
 * Extended request with logging properties
 */
export interface LoggedRequest extends Request {
  requestId?: string;
  correlationId?: string;
  startTime?: number;
  log?: (level: LogLevel, message: string, metadata?: any) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_OPTIONS: LoggingOptions = {
  level: LogLevel.INFO,
  skipPaths: ['/health', '/metrics', '/favicon.ico'],
  skipMethods: ['OPTIONS'],
  sensitiveHeaders: ['authorization', 'cookie', 'x-api-key'],
  includeBody: true,
  includeQuery: true,
  includeHeaders: false,
  maxBodySize: 10000, // 10KB
  storage: CONFIG.isProduction ? 'firestore' : 'console'
};

const LOG_COLLECTION = 'logs';
const REQUEST_LOG_COLLECTION = 'requestLogs';
const ERROR_LOG_COLLECTION = 'errorLogs';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Gets log level priority
 */
function getLogLevelPriority(level: LogLevel): number {
  const priorities: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
    [LogLevel.CRITICAL]: 4
  };
  return priorities[level];
}

/**
 * Should log based on level
 */
function shouldLog(level: LogLevel, configuredLevel: LogLevel): boolean {
  return getLogLevelPriority(level) >= getLogLevelPriority(configuredLevel);
}

/**
 * Extracts IP address from request
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'] as string;
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;
  return ip || 'unknown';
}

/**
 * Gets response size
 */
function getResponseSize(res: Response): number {
  const contentLength = res.get('content-length');
  return contentLength ? parseInt(contentLength, 10) : 0;
}

/**
 * Sanitizes headers for logging
 */
function sanitizeHeaders(
  headers: Record<string, any>,
  sensitiveHeaders: string[]
): Record<string, any> {
  const sanitized = { ...headers };
  
  sensitiveHeaders.forEach(header => {
    const key = header.toLowerCase();
    if (sanitized[key]) {
      sanitized[key] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

/**
 * Truncates large content
 */
function truncateContent(content: any, maxSize: number): any {
  if (typeof content === 'string' && content.length > maxSize) {
    return content.substring(0, maxSize) + '... [TRUNCATED]';
  }
  
  if (typeof content === 'object') {
    const stringified = JSON.stringify(content);
    if (stringified.length > maxSize) {
      return JSON.parse(stringified.substring(0, maxSize) + '"}');
    }
  }
  
  return content;
}

// ============================================================================
// LOGGER CLASS
// ============================================================================

/**
 * Logger class for structured logging
 */
export class Logger {
  private options: LoggingOptions;
  
  constructor(options: LoggingOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * Logs a message
   */
  async log(
    level: LogLevel,
    message: string,
    metadata?: any,
    req?: Request
  ): Promise<void> {
    if (!shouldLog(level, this.options.level!)) {
      return;
    }
    
    const logEntry: LogEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      level,
      type: 'custom',
      method: req?.method || 'SYSTEM',
      path: req?.path || 'SYSTEM',
      requestId: (req as LoggedRequest)?.requestId || 'system',
      correlationId: (req as LoggedRequest)?.correlationId,
      userId: (req as AuthenticatedRequest)?.user?.uid,
      tenantId: (req as AuthenticatedRequest)?.user?.tenantId,
      ip: req ? getClientIP(req) : undefined,
      userAgent: req?.get('user-agent'),
      metadata: sanitizeForLogging(metadata)
    };
    
    await this.writeLog(logEntry, message);
  }
  
  /**
   * Writes log entry
   */
  private async writeLog(entry: LogEntry, message?: string): Promise<void> {
    const { storage } = this.options;
    
    // Console logging
    if (storage === 'console' || storage === 'both') {
      this.logToConsole(entry, message);
    }
    
    // Firestore logging
    if (storage === 'firestore' || storage === 'both') {
      await this.logToFirestore(entry);
    }
  }
  
  /**
   * Logs to console
   */
  private logToConsole(entry: LogEntry, message?: string): void {
    const logData = {
      ...entry,
      message,
      metadata: entry.metadata || {}
    };
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        functions.logger.debug(message || 'Debug', logData);
        break;
      case LogLevel.INFO:
        functions.logger.info(message || 'Info', logData);
        break;
      case LogLevel.WARN:
        functions.logger.warn(message || 'Warning', logData);
        break;
      case LogLevel.ERROR:
        functions.logger.error(message || 'Error', logData);
        break;
      case LogLevel.CRITICAL:
        functions.logger.error(`CRITICAL: ${message || 'Critical Error'}`, logData);
        break;
    }
  }
  
  /**
   * Logs to Firestore
   */
  private async logToFirestore(entry: LogEntry): Promise<void> {
    try {
      const collection = entry.type === 'error' ? ERROR_LOG_COLLECTION : REQUEST_LOG_COLLECTION;
      await getCollection(collection).add({
        ...entry,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      functions.logger.error('Failed to write log to Firestore:', error);
    }
  }
}

// ============================================================================
// REQUEST LOGGING MIDDLEWARE
// ============================================================================

/**
 * Creates request/response logging middleware
 */
export function requestLogger(options: LoggingOptions = {}) {
  const logger = new Logger(options);
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return async (req: LoggedRequest, res: Response, next: NextFunction) => {
    // Skip if path or method should be skipped
    if (opts.skipPaths?.includes(req.path) || opts.skipMethods?.includes(req.method)) {
      return next();
    }
    
    // Generate request ID
    req.requestId = uuidv4();
    req.correlationId = req.headers['x-correlation-id'] as string || req.requestId;
    req.startTime = Date.now();
    
    // Add log method to request
    req.log = (level: LogLevel, message: string, metadata?: any) => {
      logger.log(level, message, metadata, req);
    };
    
    // Log request
    const requestLog: LogEntry = {
      id: req.requestId,
      timestamp: new Date(),
      level: LogLevel.INFO,
      type: 'request',
      method: req.method,
      path: req.path,
      requestId: req.requestId,
      correlationId: req.correlationId,
      userId: (req as AuthenticatedRequest).user?.uid,
      tenantId: (req as AuthenticatedRequest).user?.tenantId,
      ip: getClientIP(req),
      userAgent: req.get('user-agent'),
      requestSize: parseInt(req.get('content-length') || '0', 10),
      metadata: {}
    };
    
    // Add query parameters
    if (opts.includeQuery && Object.keys(req.query).length > 0) {
      requestLog.metadata!.query = sanitizeForLogging(req.query);
    }
    
    // Add headers
    if (opts.includeHeaders) {
      requestLog.metadata!.headers = sanitizeHeaders(
        req.headers as Record<string, any>,
        opts.sensitiveHeaders!
      );
    }
    
    // Add body
    if (opts.includeBody && req.body && Object.keys(req.body).length > 0) {
      requestLog.metadata!.body = truncateContent(
        sanitizeForLogging(req.body),
        opts.maxBodySize!
      );
    }
    
    // Add custom fields
    if (opts.customFields) {
      const customData = opts.customFields(req, res);
      requestLog.metadata = { ...requestLog.metadata, ...customData };
    }
    
    // Write request log
    await logger.writeLog(requestLog, `${req.method} ${req.path}`);
    
    // Capture response
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;
    
    let responseBody: any;
    let responseSize = 0;
    
    // Override send
    res.send = function(data: any) {
      responseBody = data;
      responseSize = Buffer.byteLength(JSON.stringify(data));
      return originalSend.call(this, data);
    };
    
    // Override json
    res.json = function(data: any) {
      responseBody = data;
      responseSize = Buffer.byteLength(JSON.stringify(data));
      return originalJson.call(this, data);
    };
    
    // Override end
    res.end = function(...args: any[]) {
      if (args[0]) {
        responseBody = args[0];
        responseSize = Buffer.byteLength(args[0]);
      }
      return originalEnd.apply(this, args);
    };
    
    // Log response when finished
    res.on('finish', async () => {
      const duration = Date.now() - req.startTime!;
      const statusCode = res.statusCode;
      
      const responseLog: LogEntry = {
        id: uuidv4(),
        timestamp: new Date(),
        level: statusCode >= 500 ? LogLevel.ERROR : 
               statusCode >= 400 ? LogLevel.WARN : 
               LogLevel.INFO,
        type: 'response',
        method: req.method,
        path: req.path,
        statusCode,
        duration,
        requestId: req.requestId,
        correlationId: req.correlationId,
        userId: (req as AuthenticatedRequest).user?.uid,
        tenantId: (req as AuthenticatedRequest).user?.tenantId,
        responseSize: responseSize || getResponseSize(res),
        metadata: {}
      };
      
      // Add response body for errors
      if (statusCode >= 400 && responseBody) {
        responseLog.metadata!.response = truncateContent(
          sanitizeForLogging(responseBody),
          opts.maxBodySize!
        );
      }
      
      // Add custom fields
      if (opts.customFields) {
        const customData = opts.customFields(req, res);
        responseLog.metadata = { ...responseLog.metadata, ...customData };
      }
      
      await logger.writeLog(
        responseLog,
        `${req.method} ${req.path} ${statusCode} ${duration}ms`
      );
    });
    
    next();
  };
}

// ============================================================================
// ERROR LOGGING MIDDLEWARE
// ============================================================================

/**
 * Error logging middleware
 */
export function errorLogger(options: LoggingOptions = {}) {
  const logger = new Logger(options);
  
  return async (err: any, req: LoggedRequest, res: Response, next: NextFunction) => {
    const errorLog: LogEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      level: LogLevel.ERROR,
      type: 'error',
      method: req.method,
      path: req.path,
      statusCode: err.statusCode || res.statusCode || 500,
      requestId: req.requestId || uuidv4(),
      correlationId: req.correlationId,
      userId: (req as AuthenticatedRequest).user?.uid,
      tenantId: (req as AuthenticatedRequest).user?.tenantId,
      ip: getClientIP(req),
      userAgent: req.get('user-agent'),
      error: {
        message: err.message,
        stack: CONFIG.isDevelopment ? err.stack : undefined,
        code: err.code
      },
      metadata: {
        errorName: err.name,
        isOperational: err.isOperational
      }
    };
    
    await logger.writeLog(errorLog, `Error: ${err.message}`);
    
    next(err);
  };
}

// ============================================================================
// MORGAN INTEGRATION
// ============================================================================

/**
 * Custom Morgan token for request ID
 */
export function registerMorganTokens(): void {
  const morgan = require('morgan');
  
  morgan.token('request-id', (req: LoggedRequest) => req.requestId);
  morgan.token('correlation-id', (req: LoggedRequest) => req.correlationId);
  morgan.token('user-id', (req: AuthenticatedRequest) => req.user?.uid || '-');
  morgan.token('tenant-id', (req: AuthenticatedRequest) => req.user?.tenantId || '-');
}

/**
 * Creates Morgan format string
 */
export function getMorganFormat(): string {
  if (CONFIG.isDevelopment) {
    return ':method :url :status :response-time ms - :res[content-length] ' +
           '[:request-id] [:user-id]';
  }
  
  return JSON.stringify({
    method: ':method',
    url: ':url',
    status: ':status',
    responseTime: ':response-time',
    contentLength: ':res[content-length]',
    requestId: ':request-id',
    correlationId: ':correlation-id',
    userId: ':user-id',
    tenantId: ':tenant-id',
    referrer: ':referrer',
    userAgent: ':user-agent'
  });
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/**
 * Performance monitoring middleware
 */
export function performanceMonitor(options: {
  slowRequestThreshold?: number;
  includeMetrics?: boolean;
} = {}) {
  const { slowRequestThreshold = 3000, includeMetrics = true } = options;
  const logger = new Logger();
  
  return async (req: LoggedRequest, res: Response, next: NextFunction) => {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    
    res.on('finish', async () => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to ms
      const endMemory = process.memoryUsage();
      
      const metrics = {
        duration,
        memoryDelta: {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          external: endMemory.external - startMemory.external
        }
      };
      
      // Log slow requests
      if (duration > slowRequestThreshold) {
        await logger.log(
          LogLevel.WARN,
          `Slow request detected: ${req.method} ${req.path}`,
          metrics,
          req
        );
      }
      
      // Add metrics to response headers if enabled
      if (includeMetrics) {
        res.set({
          'X-Response-Time': `${duration.toFixed(2)}ms`,
          'X-Request-ID': req.requestId
        });
      }
    });
    
    next();
  };
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Audit logging for sensitive operations
 */
export function auditLogger(options: {
  operations: string[];
  includeRequestData?: boolean;
  includeResponseData?: boolean;
} = { operations: [] }) {
  const logger = new Logger({ storage: 'firestore' });
  
  return async (req: LoggedRequest, res: Response, next: NextFunction) => {
    // Check if operation should be audited
    const operation = `${req.method}:${req.path}`;
    const shouldAudit = options.operations.some(op => 
      operation.includes(op) || req.path.includes(op)
    );
    
    if (!shouldAudit) {
      return next();
    }
    
    const auditEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      operation,
      userId: (req as AuthenticatedRequest).user?.uid,
      tenantId: (req as AuthenticatedRequest).user?.tenantId,
      ip: getClientIP(req),
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      requestData: options.includeRequestData ? 
        sanitizeForLogging({ body: req.body, query: req.query }) : undefined,
      responseData: undefined as any,
      statusCode: undefined as number | undefined,
      success: false
    };
    
    // Capture response
    const originalJson = res.json;
    res.json = function(data: any) {
      auditEntry.responseData = options.includeResponseData ? 
        sanitizeForLogging(data) : undefined;
      auditEntry.statusCode = res.statusCode;
      auditEntry.success = res.statusCode < 400;
      
      // Write audit log
      getCollection('auditLogs').add({
        ...auditEntry,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      }).catch(err => {
        functions.logger.error('Failed to write audit log:', err);
      });
      
      return originalJson.call(this, data);
    };
    
    next();
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Main middleware
  requestLogger,
  errorLogger,
  performanceMonitor,
  auditLogger,
  
  // Logger class
  Logger,
  
  // Morgan integration
  registerMorganTokens,
  getMorganFormat,
  
  // Types
  LogLevel,
  
  // Constants
  DEFAULT_OPTIONS
};