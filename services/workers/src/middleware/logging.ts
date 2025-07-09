/**
 * Logging middleware for Cloudflare Workers
 */

import { IRequest } from 'itty-router';

export function withLogging(request: IRequest): void {
  const start = Date.now();
  
  // Log request
  console.log({
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    cf: request.cf,
  });
  
  // Add timing to request
  request.timing = { start };
}
