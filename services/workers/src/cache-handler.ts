/**
 * Cache handler for Cloudflare Workers
 * Manages caching strategies and cache invalidation
 */

import { IRequest, error, json } from 'itty-router';
import { Env } from './index';

interface CacheEntry {
  data: any;
  metadata: {
    createdAt: string;
    expiresAt: string;
    tags: string[];
    version: string;
  };
}

export const handleCache = {
  async get(request: IRequest, env: Env): Promise<Response> {
    const { key } = request.params;
    
    if (!key) {
      return error(400, 'Cache key is required');
    }

    try {
      // Try to get from edge cache first
      const cache = caches.default;
      const cacheUrl = new URL(request.url);
      cacheUrl.pathname = `/cache/${key}`;
      
      const cachedResponse = await cache.match(cacheUrl);
      if (cachedResponse) {
        return new Response(cachedResponse.body, {
          headers: {
            ...cachedResponse.headers,
            'X-Cache': 'HIT-EDGE',
          },
        });
      }

      // Try KV store
      const kvData = await env.CACHE.get(key);
      
      if (!kvData) {
        return json({
          success: false,
          error: 'Cache miss',
        }, {
          status: 404,
          headers: {
            'X-Cache': 'MISS',
          },
        });
      }

      const cacheEntry: CacheEntry = JSON.parse(kvData);
      
      // Check if expired
      if (new Date(cacheEntry.metadata.expiresAt) < new Date()) {
        await env.CACHE.delete(key);
        return json({
          success: false,
          error: 'Cache expired',
        }, {
          status: 404,
          headers: {
            'X-Cache': 'EXPIRED',
          },
        });
      }

      const response = json({
        success: true,
        data: cacheEntry.data,
        metadata: cacheEntry.metadata,
      }, {
        headers: {
          'X-Cache': 'HIT-KV',
          'X-Cache-Created': cacheEntry.metadata.createdAt,
          'X-Cache-Expires': cacheEntry.metadata.expiresAt,
        },
      });

      // Store in edge cache
      await cache.put(cacheUrl, response.clone());
      
      return response;
    } catch (err) {
      console.error('Cache get error:', err);
      return error(500, 'Failed to retrieve from cache');
    }
  },

  async set(request: IRequest, env: Env): Promise<Response> {
    const { key } = request.params;
    
    if (!key) {
      return error(400, 'Cache key is required');
    }

    try {
      const body = await request.json();
      const { data, ttl = 3600, tags = [], version = '1.0' } = body;

      if (!data) {
        return error(400, 'Data is required');
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttl * 1000);

      const cacheEntry: CacheEntry = {
        data,
        metadata: {
          createdAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          tags,
          version,
        },
      };

      // Store in KV
      await env.CACHE.put(key, JSON.stringify(cacheEntry), {
        expirationTtl: ttl,
      });

      // Invalidate edge cache
      const cache = caches.default;
      const cacheUrl = new URL(request.url);
      cacheUrl.pathname = `/cache/${key}`;
      await cache.delete(cacheUrl);

      // Update cache tags index
      for (const tag of tags) {
        await addKeyToTag(env, tag, key, ttl);
      }

      return json({
        success: true,
        key,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (err) {
      console.error('Cache set error:', err);
      return error(500, 'Failed to store in cache');
    }
  },

  async delete(request: IRequest, env: Env): Promise<Response> {
    const { key } = request.params;
    
    if (!key) {
      return error(400, 'Cache key is required');
    }

    try {
      // Get existing entry to find tags
      const kvData = await env.CACHE.get(key);
      if (kvData) {
        const cacheEntry: CacheEntry = JSON.parse(kvData);
        
        // Remove from tag indexes
        for (const tag of cacheEntry.metadata.tags) {
          await removeKeyFromTag(env, tag, key);
        }
      }

      // Delete from KV
      await env.CACHE.delete(key);

      // Invalidate edge cache
      const cache = caches.default;
      const cacheUrl = new URL(request.url);
      cacheUrl.pathname = `/cache/${key}`;
      await cache.delete(cacheUrl);

      return json({
        success: true,
        key,
      });
    } catch (err) {
      console.error('Cache delete error:', err);
      return error(500, 'Failed to delete from cache');
    }
  },
};

export async function purgeCache(request: IRequest, env: Env): Promise<Response> {
  try {
    const body = await request.json();
    const { tags, pattern } = body;

    let purgedKeys: string[] = [];

    if (tags && Array.isArray(tags)) {
      // Purge by tags
      for (const tag of tags) {
        const keys = await getKeysForTag(env, tag);
        for (const key of keys) {
          await env.CACHE.delete(key);
          purgedKeys.push(key);
        }
        await env.CACHE.delete(`tag:${tag}`);
      }
    }

    if (pattern) {
      // Purge by pattern (limited implementation)
      // In production, you might want to maintain an index of all keys
      const allKeys = await getAllCacheKeys(env);
      const regex = new RegExp(pattern);
      
      for (const key of allKeys) {
        if (regex.test(key)) {
          await env.CACHE.delete(key);
          purgedKeys.push(key);
        }
      }
    }

    // Purge edge cache
    const cache = caches.default;
    for (const key of purgedKeys) {
      const cacheUrl = new URL(request.url);
      cacheUrl.pathname = `/cache/${key}`;
      await cache.delete(cacheUrl);
    }

    return json({
      success: true,
      purgedCount: purgedKeys.length,
      purgedKeys: purgedKeys.slice(0, 100), // Limit response size
    });
  } catch (err) {
    console.error('Cache purge error:', err);
    return error(500, 'Failed to purge cache');
  }
}

// Tag management functions
async function addKeyToTag(env: Env, tag: string, key: string, ttl: number): Promise<void> {
  const tagKey = `tag:${tag}`;
  const existingData = await env.CACHE.get(tagKey);
  
  let keys: string[] = [];
  if (existingData) {
    keys = JSON.parse(existingData);
  }
  
  if (!keys.includes(key)) {
    keys.push(key);
  }
  
  await env.CACHE.put(tagKey, JSON.stringify(keys), {
    expirationTtl: ttl,
  });
}

async function removeKeyFromTag(env: Env, tag: string, key: string): Promise<void> {
  const tagKey = `tag:${tag}`;
  const existingData = await env.CACHE.get(tagKey);
  
  if (!existingData) return;
  
  let keys: string[] = JSON.parse(existingData);
  keys = keys.filter(k => k !== key);
  
  if (keys.length > 0) {
    await env.CACHE.put(tagKey, JSON.stringify(keys));
  } else {
    await env.CACHE.delete(tagKey);
  }
}

async function getKeysForTag(env: Env, tag: string): Promise<string[]> {
  const tagKey = `tag:${tag}`;
  const data = await env.CACHE.get(tagKey);
  
  if (!data) return [];
  
  return JSON.parse(data);
}

async function getAllCacheKeys(env: Env): Promise<string[]> {
  // This is a simplified implementation
  // In production, you'd want to maintain an index of all keys
  // or use KV list operations with pagination
  
  const keys: string[] = [];
  
  // List keys with pagination
  let cursor: string | undefined;
  do {
    const result = await env.CACHE.list({ cursor, limit: 1000 });
    keys.push(...result.keys.map(k => k.name));
    cursor = result.cursor;
  } while (cursor);
  
  return keys.filter(k => !k.startsWith('tag:'));
}

// Cache warming utilities
export async function warmCache(env: Env, urls: string[]): Promise<void> {
  const promises = urls.map(async (url) => {
    try {
      const response = await fetch(url);
      // The fetch itself will populate the cache
      console.log(`Warmed cache for: ${url}`);
    } catch (err) {
      console.error(`Failed to warm cache for ${url}:`, err);
    }
  });
  
  await Promise.all(promises);
}

// Cache statistics
export async function getCacheStats(env: Env): Promise<{
  totalKeys: number;
  totalSize: number;
  oldestEntry: string | null;
  tags: string[];
}> {
  const keys = await getAllCacheKeys(env);
  let totalSize = 0;
  let oldestEntry: string | null = null;
  let oldestTime = Infinity;
  
  for (const key of keys) {
    const data = await env.CACHE.get(key);
    if (data) {
      totalSize += new Blob([data]).size;
      
      try {
        const entry: CacheEntry = JSON.parse(data);
        const createdAt = new Date(entry.metadata.createdAt).getTime();
        if (createdAt < oldestTime) {
          oldestTime = createdAt;
          oldestEntry = entry.metadata.createdAt;
        }
      } catch {
        // Ignore parse errors
      }
    }
  }
  
  // Get all tags
  const tags = keys
    .filter(k => k.startsWith('tag:'))
    .map(k => k.substring(4));
  
  return {
    totalKeys: keys.length,
    totalSize,
    oldestEntry,
    tags,
  };
}

// Cache strategies
export enum CacheStrategy {
  CACHE_FIRST = 'cache-first',
  NETWORK_FIRST = 'network-first',
  CACHE_ONLY = 'cache-only',
  NETWORK_ONLY = 'network-only',
  STALE_WHILE_REVALIDATE = 'stale-while-revalidate',
}

export async function applyCacheStrategy(
  request: Request,
  env: Env,
  strategy: CacheStrategy,
  fetcher: () => Promise<Response>
): Promise<Response> {
  const cache = caches.default;
  
  switch (strategy) {
    case CacheStrategy.CACHE_FIRST: {
      const cached = await cache.match(request);
      if (cached) return cached;
      
      const response = await fetcher();
      if (response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    }
    
    case CacheStrategy.NETWORK_FIRST: {
      try {
        const response = await fetcher();
        if (response.ok) {
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        throw new Error('Network request failed and no cache available');
      }
    }
    
    case CacheStrategy.CACHE_ONLY: {
      const cached = await cache.match(request);
      if (cached) return cached;
      return error(504, 'Cache miss - network requests disabled');
    }
    
    case CacheStrategy.NETWORK_ONLY: {
      return fetcher();
    }
    
    case CacheStrategy.STALE_WHILE_REVALIDATE: {
      const cached = await cache.match(request);
      
      // Return stale content immediately
      if (cached) {
        // Revalidate in the background
        const revalidatePromise = fetcher().then(async (response) => {
          if (response.ok) {
            await cache.put(request, response.clone());
          }
        }).catch(err => {
          console.error('Background revalidation failed:', err);
        });
        
        // Don't wait for revalidation
        return cached;
      }
      
      // No cache, fetch and store
      const response = await fetcher();
      if (response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    }
    
    default:
      return fetcher();
  }
}

// Swiss-specific cache configurations
export const swissCacheConfigs = {
  // Menu data - cache for 1 hour
  menu: {
    ttl: 3600,
    tags: ['menu', 'tenant'],
    strategy: CacheStrategy.CACHE_FIRST,
  },
  
  // Restaurant info - cache for 24 hours
  restaurant: {
    ttl: 86400,
    tags: ['restaurant', 'tenant'],
    strategy: CacheStrategy.STALE_WHILE_REVALIDATE,
  },
  
  // Pricing data - cache for 5 minutes
  pricing: {
    ttl: 300,
    tags: ['pricing', 'dynamic'],
    strategy: CacheStrategy.NETWORK_FIRST,
  },
  
  // Static assets - cache for 1 year
  assets: {
    ttl: 31536000,
    tags: ['static'],
    strategy: CacheStrategy.CACHE_FIRST,
  },
};
