/**
 * CORS middleware for Cloudflare Workers
 */

import { IRequest } from 'itty-router';

const allowedOrigins = [
  'https://eatech.ch',
  'https://www.eatech.ch',
  'https://app.eatech.ch',
  'https://admin.eatech.ch',
  'http://localhost:3000',
  'http://localhost:5173',
];

export function withCors(request: IRequest): Response | void {
  const origin = request.headers.get('Origin');
  const isAllowed = !origin || allowedOrigins.includes(origin) || 
                    (process.env.ENVIRONMENT === 'development' && origin?.includes('localhost'));
  
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': isAllowed ? origin! : allowedOrigins[0],
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  
  // Add CORS headers to response
  if (!request.headers.has('X-CORS-Headers-Set') && origin) {
    request.headers.set('X-CORS-Origin', isAllowed ? origin : allowedOrigins[0]);
  }
}
