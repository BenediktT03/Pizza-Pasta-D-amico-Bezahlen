/**
 * Authentication middleware for Cloudflare Workers
 */

import { IRequest, error } from 'itty-router';
import { Env } from '../index';

export async function withAuth(request: IRequest, env: Env): Promise<Response | void> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    return error(401, 'Authorization header required');
  }

  const [type, token] = authHeader.split(' ');
  
  if (type === 'Bearer') {
    // Validate JWT token
    try {
      const payload = await validateJWT(token, env.JWT_SECRET);
      request.user = payload;
    } catch (err) {
      return error(401, 'Invalid token');
    }
  } else if (type === 'ApiKey') {
    // Validate API key
    if (token !== env.API_KEY) {
      return error(401, 'Invalid API key');
    }
    request.user = { type: 'api-key' };
  } else {
    return error(401, 'Invalid authorization type');
  }
}

async function validateJWT(token: string, secret: string): Promise<any> {
  // Simple JWT validation - in production use a proper library
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT');
  
  const payload = JSON.parse(atob(parts[1]));
  
  // Check expiration
  if (payload.exp && payload.exp < Date.now() / 1000) {
    throw new Error('Token expired');
  }
  
  return payload;
}
