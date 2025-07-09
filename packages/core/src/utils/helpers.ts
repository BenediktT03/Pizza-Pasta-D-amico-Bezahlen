import { customAlphabet } from 'nanoid';

/**
 * Generate a unique ID
 */
export function generateId(prefix?: string): string {
  const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 10);
  const id = nanoid();
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * Generate a short ID (e.g., for order numbers)
 */
export function generateShortId(length: number = 6): string {
  const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', length);
  return nanoid();
}

/**
 * Generate a slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Replace German umlauts
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    // Replace French accents
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ýÿ]/g, 'y')
    .replace(/ñ/g, 'n')
    .replace(/ç/g, 'c')
    // Remove special characters
    .replace(/[^a-z0-9\s-]/g, '')
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove multiple hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-|-$/g, '');
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  if (obj instanceof RegExp) return new RegExp(obj) as any;
  
  const clonedObj = {} as any;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }
  return clonedObj;
}

/**
 * Deep merge objects
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  if (!sources.length) return target;
  
  const source = sources.shift();
  if (!source) return target;

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (isObject(targetValue) && isObject(sourceValue)) {
      target[key] = deepMerge(targetValue, sourceValue);
    } else {
      target[key] = sourceValue as any;
    }
  }

  return deepMerge(target, ...sources);
}

/**
 * Check if value is a plain object
 */
export function isObject(item: any): item is Record<string, any> {
  return item && typeof item === 'object' && !Array.isArray(item) && !(item instanceof Date);
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Sleep/delay function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    maxDelay?: number;
    factor?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    maxDelay = 30000,
    factor = 2,
    onRetry,
  } = options;

  let lastError: Error;
  let currentDelay = delay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }

      if (onRetry) {
        onRetry(lastError, attempt);
      }

      await sleep(currentDelay);
      currentDelay = Math.min(currentDelay * factor, maxDelay);
    }
  }

  throw lastError!;
}

/**
 * Group array by key
 */
export function groupBy<T, K extends keyof T>(
  array: T[],
  key: K
): Record<string, T[]> {
  return array.reduce((result, item) => {
    const group = String(item[key]);
    if (!result[group]) result[group] = [];
    result[group].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Pick specific properties from object
 */
export function pick<T, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * Omit specific properties from object
 */
export function omit<T, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result as Omit<T, K>;
}

/**
 * Calculate percentage
 */
export function calculatePercentage(
  value: number,
  total: number,
  decimals: number = 2
): number {
  if (total === 0) return 0;
  const percentage = (value / total) * 100;
  return Math.round(percentage * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(
  oldValue: number,
  newValue: number,
  decimals: number = 2
): number {
  if (oldValue === 0) {
    return newValue === 0 ? 0 : 100;
  }
  const change = ((newValue - oldValue) / Math.abs(oldValue)) * 100;
  return Math.round(change * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Parse query string
 */
export function parseQueryString(queryString: string): Record<string, string> {
  const params = new URLSearchParams(queryString);
  const result: Record<string, string> = {};
  
  params.forEach((value, key) => {
    result[key] = value;
  });
  
  return result;
}

/**
 * Build query string from object
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  
  return searchParams.toString();
}

/**
 * Get nested property value
 */
export function getNestedValue(
  obj: any,
  path: string,
  defaultValue?: any
): any {
  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result == null) {
      return defaultValue;
    }
    result = result[key];
  }

  return result ?? defaultValue;
}

/**
 * Set nested property value
 */
export function setNestedValue(
  obj: any,
  path: string,
  value: any
): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  let current = obj;

  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }

  current[lastKey] = value;
}

/**
 * Flatten nested object
 */
export function flattenObject(
  obj: any,
  prefix: string = ''
): Record<string, any> {
  const flattened: Record<string, any> = {};

  Object.keys(obj).forEach(key => {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (isObject(value)) {
      Object.assign(flattened, flattenObject(value, newKey));
    } else {
      flattened[newKey] = value;
    }
  });

  return flattened;
}

/**
 * Calculate hash of string
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate random color from string
 */
export function stringToColor(str: string): string {
  const hash = hashString(str);
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9áéíóúñü \.,_-]/gim, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/**
 * Check if string is valid JSON
 */
export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe JSON parse
 */
export function safeJSONParse<T = any>(
  str: string,
  defaultValue: T
): T {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format coordinates
 */
export function formatCoordinates(
  lat: number,
  lon: number,
  precision: number = 6
): string {
  return `${lat.toFixed(precision)}, ${lon.toFixed(precision)}`;
}

/**
 * Generate QR code data URL
 */
export async function generateQRCode(
  data: string,
  options: {
    size?: number;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  } = {}
): Promise<string> {
  // This would integrate with a QR code library
  // For now, return a placeholder
  return `data:image/svg+xml;base64,${btoa(`<svg>QR: ${data}</svg>`)}`;
}

/**
 * Validate Swiss phone number
 */
export function isSwissPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  
  // Swiss mobile: 07[6-9] XXX XX XX
  // Swiss landline: 0[2-9]X XXX XX XX
  // With country code: +41 or 0041
  
  const patterns = [
    /^41[2-9]\d{8}$/,      // +41 format
    /^0041[2-9]\d{8}$/,    // 0041 format
    /^0[2-9]\d{8}$/,       // Local format
  ];
  
  return patterns.some(pattern => pattern.test(cleaned));
}

/**
 * Parse Swiss phone number
 */
export function parseSwissPhoneNumber(phone: string): {
  countryCode: string;
  areaCode: string;
  number: string;
  formatted: string;
} | null {
  const cleaned = phone.replace(/\D/g, '');
  
  let countryCode = '41';
  let numberPart = '';
  
  if (cleaned.startsWith('41')) {
    numberPart = cleaned.substring(2);
  } else if (cleaned.startsWith('0041')) {
    numberPart = cleaned.substring(4);
  } else if (cleaned.startsWith('0')) {
    numberPart = cleaned.substring(1);
  } else {
    return null;
  }
  
  if (numberPart.length !== 9) return null;
  
  const areaCode = numberPart.substring(0, 2);
  const number = numberPart.substring(2);
  
  const formatted = `+${countryCode} ${areaCode} ${number.substring(0, 3)} ${number.substring(3, 5)} ${number.substring(5)}`;
  
  return {
    countryCode,
    areaCode,
    number,
    formatted,
  };
}

/**
 * Get Swiss canton by postal code
 */
export function getCantonByPostalCode(postalCode: string): string | null {
  const code = parseInt(postalCode, 10);
  
  // Simplified mapping - in production, use complete postal code database
  const cantonRanges: Array<[number, number, string]> = [
    [1000, 1299, 'VD'], // Vaud
    [1200, 1299, 'GE'], // Geneva
    [1300, 1399, 'VD'], // Vaud
    [1400, 1499, 'VD'], // Vaud
    [1500, 1599, 'VD'], // Vaud
    [1600, 1699, 'FR'], // Fribourg
    [1700, 1799, 'FR'], // Fribourg
    [1800, 1899, 'VD'], // Vaud
    [1900, 1999, 'VS'], // Valais
    [2000, 2099, 'NE'], // Neuchâtel
    [2300, 2399, 'NE'], // Neuchâtel
    [2500, 2599, 'BE'], // Bern
    [2800, 2899, 'JU'], // Jura
    [3000, 3099, 'BE'], // Bern
    [4000, 4099, 'BS'], // Basel-Stadt
    [4100, 4199, 'BL'], // Basel-Landschaft
    [5000, 5099, 'AG'], // Aargau
    [6000, 6099, 'LU'], // Lucerne
    [6500, 6599, 'TI'], // Ticino
    [7000, 7099, 'GR'], // Graubünden
    [8000, 8099, 'ZH'], // Zurich
    [9000, 9099, 'SG'], // St. Gallen
  ];
  
  for (const [min, max, canton] of cantonRanges) {
    if (code >= min && code <= max) {
      return canton;
    }
  }
  
  return null;
}

/**
 * Mask sensitive data
 */
export function maskSensitiveData(
  value: string,
  options: {
    showFirst?: number;
    showLast?: number;
    maskChar?: string;
  } = {}
): string {
  const {
    showFirst = 0,
    showLast = 4,
    maskChar = '*',
  } = options;

  if (value.length <= showFirst + showLast) {
    return value;
  }

  const first = value.substring(0, showFirst);
  const last = value.substring(value.length - showLast);
  const maskLength = value.length - showFirst - showLast;
  const mask = maskChar.repeat(maskLength);

  return `${first}${mask}${last}`;
}

/**
 * Compare versions
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
}
