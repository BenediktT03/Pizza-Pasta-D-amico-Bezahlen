/**
 * Image optimization worker
 * Handles image resizing, format conversion, and CDN delivery
 */

import { IRequest, error, json } from 'itty-router';
import { Env } from './index';

interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto';
  fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
  blur?: number;
  sharpen?: boolean;
  grayscale?: boolean;
}

export async function handleImageOptimization(
  request: IRequest,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const path = request.params.path;
    
    if (!path) {
      return error(400, 'No image path provided');
    }

    // Parse image transformation options from query params
    const options: ImageOptions = {
      width: url.searchParams.has('w') ? parseInt(url.searchParams.get('w')!) : undefined,
      height: url.searchParams.has('h') ? parseInt(url.searchParams.get('h')!) : undefined,
      quality: url.searchParams.has('q') ? parseInt(url.searchParams.get('q')!) : 85,
      format: (url.searchParams.get('f') as ImageOptions['format']) || 'auto',
      fit: (url.searchParams.get('fit') as ImageOptions['fit']) || 'cover',
      blur: url.searchParams.has('blur') ? parseInt(url.searchParams.get('blur')!) : undefined,
      sharpen: url.searchParams.get('sharpen') === 'true',
      grayscale: url.searchParams.get('grayscale') === 'true',
    };

    // Generate cache key
    const cacheKey = generateCacheKey(path, options);
    
    // Try to get from cache
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }

    // Check if we have a processed version in KV
    const processedImage = await env.IMAGES.get(cacheKey, { type: 'arrayBuffer' });
    
    if (processedImage) {
      const response = new Response(processedImage, {
        headers: {
          'Content-Type': getContentType(options.format || 'jpeg'),
          'Cache-Control': `public, max-age=${env.CACHE_TTL}`,
          'X-Cache': 'HIT',
        },
      });
      
      ctx.waitUntil(cache.put(request, response.clone()));
      return response;
    }

    // Get original image from R2
    const originalImage = await env.ASSETS.get(path);
    
    if (!originalImage) {
      // Try uploads bucket
      const uploadedImage = await env.UPLOADS.get(path);
      
      if (!uploadedImage) {
        return error(404, 'Image not found');
      }
      
      return handleImageTransformation(uploadedImage, options, request, env, ctx);
    }

    return handleImageTransformation(originalImage, options, request, env, ctx);
  } catch (err) {
    console.error('Image optimization error:', err);
    return error(500, 'Failed to process image');
  }
}

async function handleImageTransformation(
  object: R2ObjectBody,
  options: ImageOptions,
  request: IRequest,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const imageData = await object.arrayBuffer();
  
  // For now, we'll use Cloudflare Image Resizing API
  // In production, you might want to use a more sophisticated image processing library
  
  const transformedImage = await transformImage(imageData, options);
  
  // Determine output format
  const outputFormat = determineOutputFormat(options.format, request);
  const contentType = getContentType(outputFormat);
  
  // Create response
  const response = new Response(transformedImage, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': `public, max-age=${env.CACHE_TTL}`,
      'X-Cache': 'MISS',
      'X-Original-Size': object.size.toString(),
      'X-Transformed-Size': transformedImage.byteLength.toString(),
      'Vary': 'Accept',
    },
  });

  // Cache the response
  const cache = caches.default;
  ctx.waitUntil(cache.put(request, response.clone()));
  
  // Store in KV for faster access
  const cacheKey = generateCacheKey(request.params.path, options);
  ctx.waitUntil(
    env.IMAGES.put(cacheKey, transformedImage, {
      expirationTtl: parseInt(env.CACHE_TTL),
      metadata: {
        originalPath: request.params.path,
        options: JSON.stringify(options),
        transformedAt: new Date().toISOString(),
      },
    })
  );

  return response;
}

async function transformImage(
  imageData: ArrayBuffer,
  options: ImageOptions
): Promise<ArrayBuffer> {
  // This is a simplified version - in production, use proper image processing
  // You could use Cloudflare Image Resizing API or integrate with a service like Cloudinary
  
  // For now, we'll just return the original image
  // In a real implementation, you would:
  // 1. Decode the image
  // 2. Apply transformations (resize, blur, etc.)
  // 3. Encode to the desired format
  // 4. Return the transformed image
  
  return imageData;
}

function generateCacheKey(path: string, options: ImageOptions): string {
  const optionString = Object.entries(options)
    .filter(([_, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  return `image:${path}:${optionString}`;
}

function determineOutputFormat(
  requestedFormat: ImageOptions['format'],
  request: IRequest
): string {
  if (requestedFormat && requestedFormat !== 'auto') {
    return requestedFormat;
  }

  // Auto format selection based on Accept header
  const accept = request.headers.get('Accept') || '';
  
  if (accept.includes('image/avif')) {
    return 'avif';
  }
  
  if (accept.includes('image/webp')) {
    return 'webp';
  }
  
  return 'jpeg';
}

function getContentType(format: string): string {
  const contentTypes: Record<string, string> = {
    webp: 'image/webp',
    avif: 'image/avif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
  };
  
  return contentTypes[format] || 'image/jpeg';
}

// Image validation utilities
export function isValidImageType(contentType: string, allowedTypes: string): boolean {
  const allowed = allowedTypes.split(',').map(t => t.trim());
  return allowed.includes(contentType);
}

export function isValidImageSize(size: number, maxSize: string): boolean {
  return size <= parseInt(maxSize);
}

// Presets for common use cases
export const imagePresets = {
  thumbnail: {
    width: 150,
    height: 150,
    quality: 80,
    fit: 'cover' as const,
  },
  card: {
    width: 300,
    height: 200,
    quality: 85,
    fit: 'cover' as const,
  },
  hero: {
    width: 1920,
    height: 1080,
    quality: 90,
    fit: 'cover' as const,
  },
  mobile: {
    width: 640,
    quality: 85,
    fit: 'contain' as const,
  },
  desktop: {
    width: 1200,
    quality: 90,
    fit: 'contain' as const,
  },
};

// Swiss restaurant specific presets
export const restaurantImagePresets = {
  menuItem: {
    width: 400,
    height: 300,
    quality: 90,
    fit: 'cover' as const,
  },
  restaurantLogo: {
    width: 200,
    height: 200,
    quality: 95,
    fit: 'contain' as const,
  },
  restaurantHero: {
    width: 1920,
    height: 600,
    quality: 95,
    fit: 'cover' as const,
  },
  qrCode: {
    width: 500,
    height: 500,
    quality: 100,
    fit: 'contain' as const,
  },
};

// Responsive image generation
export async function generateResponsiveImages(
  originalPath: string,
  env: Env
): Promise<Record<string, string>> {
  const sizes = [320, 640, 768, 1024, 1280, 1920];
  const urls: Record<string, string> = {};
  
  for (const size of sizes) {
    urls[`${size}w`] = `/cdn/images/${originalPath}?w=${size}&f=auto`;
  }
  
  return urls;
}

// Image metadata extraction
export async function extractImageMetadata(
  imageData: ArrayBuffer
): Promise<{
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha: boolean;
}> {
  // This is a placeholder - in production, use a proper image library
  // to extract actual metadata
  
  return {
    width: 1920,
    height: 1080,
    format: 'jpeg',
    size: imageData.byteLength,
    hasAlpha: false,
  };
}

// Blurhash generation for progressive loading
export async function generateBlurhash(
  imageData: ArrayBuffer
): Promise<string> {
  // This would use a blurhash library to generate a small hash
  // that can be used for progressive image loading
  
  // Placeholder implementation
  return 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';
}

// Smart cropping using face/object detection
export async function smartCrop(
  imageData: ArrayBuffer,
  targetWidth: number,
  targetHeight: number
): Promise<{
  x: number;
  y: number;
  width: number;
  height: number;
}> {
  // This would use ML models to detect faces or important objects
  // and crop intelligently around them
  
  // Placeholder - center crop
  return {
    x: 0,
    y: 0,
    width: targetWidth,
    height: targetHeight,
  };
}
