/**
 * EATECH Firebase Functions - Logger Utility
 * Version: 1.0.0
 * Centralized logging with different log levels
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/utils/logger.ts
 */

import * as functions from 'firebase-functions';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

interface LogContext {
  userId?: string;
  tenantId?: string;
  orderId?: string;
  functionName?: string;
  [key: string]: any;
}

class Logger {
  private context: LogContext = {};

  setContext(context: LogContext) {
    this.context = { ...this.context, ...context };
  }

  debug(message: string, data?: any) {
    functions.logger.debug(message, { ...this.context, ...data });
  }

  info(message: string, data?: any) {
    functions.logger.info(message, { ...this.context, ...data });
  }

  warn(message: string, data?: any) {
    functions.logger.warn(message, { ...this.context, ...data });
  }

  error(message: string, error?: any, data?: any) {
    const errorData = {
      ...this.context,
      ...data,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    };
    functions.logger.error(message, errorData);
  }

  critical(message: string, error?: any, data?: any) {
    const criticalData = {
      ...this.context,
      ...data,
      level: LogLevel.CRITICAL,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    };
    functions.logger.error(`CRITICAL: ${message}`, criticalData);
  }

  // Utility methods
  startTimer(label: string): () => void {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      this.info(`${label} completed`, { duration });
    };
  }

  async logAsync<T>(
    label: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const endTimer = this.startTimer(label);
    try {
      const result = await fn();
      endTimer();
      return result;
    } catch (error) {
      this.error(`${label} failed`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export default
export default logger;