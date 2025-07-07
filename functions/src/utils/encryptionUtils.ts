/**
 * EATECH - Encryption and Security Utility Functions
 * Version: 1.0.0
 * Description: Cryptographic utilities for data security and protection
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/utils/encryptionUtils.ts
 */

import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as admin from 'firebase-admin';

// ============================================================================
// CONSTANTS
// ============================================================================

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const SALT_ROUNDS = 12;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const TOKEN_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '30d';

// Get encryption keys from environment
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('Encryption key not configured');
  }
  return Buffer.from(key, 'hex');
};

const getJWTSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT secret not configured');
  }
  return secret;
};

// ============================================================================
// HASHING FUNCTIONS
// ============================================================================

/**
 * Hashes a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifies a password against a hash
 */
export async function verifyPassword(
  password: string, 
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Creates a SHA-256 hash
 */
export function createHash(data: string): string {
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
}

/**
 * Creates a HMAC hash
 */
export function createHMAC(data: string, key: string): string {
  return crypto
    .createHmac('sha256', key)
    .update(data)
    .digest('hex');
}

/**
 * Creates a MD5 hash (for non-security purposes like ETags)
 */
export function createMD5(data: string): string {
  return crypto
    .createHash('md5')
    .update(data)
    .digest('hex');
}

// ============================================================================
// ENCRYPTION/DECRYPTION
// ============================================================================

/**
 * Encrypts data using AES-256-GCM
 */
export function encrypt(text: string): {
  encrypted: string;
  iv: string;
  tag: string;
} {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
}

/**
 * Decrypts data encrypted with AES-256-GCM
 */
export function decrypt(
  encryptedData: string,
  iv: string,
  tag: string
): string {
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    key,
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Encrypts an object
 */
export function encryptObject<T>(obj: T): {
  encrypted: string;
  iv: string;
  tag: string;
} {
  const jsonString = JSON.stringify(obj);
  return encrypt(jsonString);
}

/**
 * Decrypts an object
 */
export function decryptObject<T>(
  encryptedData: string,
  iv: string,
  tag: string
): T {
  const decrypted = decrypt(encryptedData, iv, tag);
  return JSON.parse(decrypted);
}

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

/**
 * Generates a JWT token
 */
export function generateToken(
  payload: Record<string, any>,
  options?: jwt.SignOptions
): string {
  const secret = getJWTSecret();
  return jwt.sign(payload, secret, {
    expiresIn: TOKEN_EXPIRY,
    issuer: 'eatech',
    ...options
  });
}

/**
 * Generates a refresh token
 */
export function generateRefreshToken(
  userId: string,
  options?: jwt.SignOptions
): string {
  const secret = getJWTSecret();
  return jwt.sign(
    { userId, type: 'refresh' },
    secret,
    {
      expiresIn: REFRESH_TOKEN_EXPIRY,
      issuer: 'eatech',
      ...options
    }
  );
}

/**
 * Verifies a JWT token
 */
export function verifyToken(
  token: string,
  options?: jwt.VerifyOptions
): any {
  const secret = getJWTSecret();
  return jwt.verify(token, secret, {
    issuer: 'eatech',
    ...options
  });
}

/**
 * Decodes a JWT token without verification
 */
export function decodeToken(token: string): any {
  return jwt.decode(token);
}

/**
 * Creates a Firebase custom token
 */
export async function createFirebaseToken(
  uid: string,
  claims?: Record<string, any>
): Promise<string> {
  return admin.auth().createCustomToken(uid, claims);
}

// ============================================================================
// RANDOM GENERATION
// ============================================================================

/**
 * Generates a secure random string
 */
export function generateRandomString(length: number = 32): string {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

/**
 * Generates a secure random number
 */
export function generateRandomNumber(min: number, max: number): number {
  const range = max - min + 1;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const randomBytes = crypto.randomBytes(bytesNeeded);
  const randomNumber = randomBytes.readUIntBE(0, bytesNeeded);
  
  return min + (randomNumber % range);
}

/**
 * Generates a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Generates an API key
 */
export function generateAPIKey(prefix: string = 'sk'): string {
  const key = generateRandomString(48);
  return `${prefix}_${key}`;
}

/**
 * Generates a secure OTP
 */
export function generateOTP(length: number = 6): string {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += generateRandomNumber(0, 9).toString();
  }
  return otp;
}

// ============================================================================
// DATA MASKING
// ============================================================================

/**
 * Masks sensitive data
 */
export function maskData(
  data: string,
  visibleStart: number = 4,
  visibleEnd: number = 4,
  maskChar: string = '*'
): string {
  if (data.length <= visibleStart + visibleEnd) {
    return data;
  }
  
  const start = data.slice(0, visibleStart);
  const end = data.slice(-visibleEnd);
  const maskLength = data.length - visibleStart - visibleEnd;
  const mask = maskChar.repeat(maskLength);
  
  return start + mask + end;
}

/**
 * Masks email address
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  
  if (!domain) return maskData(email, 2, 0);
  
  const maskedLocal = maskData(localPart, 2, 1);
  const [domainName, ...domainParts] = domain.split('.');
  const maskedDomain = maskData(domainName, 1, 1);
  
  return `${maskedLocal}@${maskedDomain}.${domainParts.join('.')}`;
}

/**
 * Masks phone number
 */
export function maskPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length < 6) return phone;
  
  const visibleDigits = 4;
  const masked = maskData(cleaned, 0, visibleDigits);
  
  // Format back
  if (phone.includes('+')) {
    return `+${masked}`;
  }
  
  return masked;
}

/**
 * Masks credit card number
 */
export function maskCreditCard(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\D/g, '');
  
  if (cleaned.length < 12) return maskData(cardNumber, 0, 4);
  
  const last4 = cleaned.slice(-4);
  const masked = `**** **** **** ${last4}`;
  
  return masked;
}

// ============================================================================
// SIGNATURE VERIFICATION
// ============================================================================

/**
 * Creates a signature for webhook verification
 */
export function createWebhookSignature(
  payload: string,
  secret: string,
  timestamp: number
): string {
  const message = `${timestamp}.${payload}`;
  return createHMAC(message, secret);
}

/**
 * Verifies a webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp: number,
  tolerance: number = 300 // 5 minutes
): boolean {
  // Check timestamp to prevent replay attacks
  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime - timestamp > tolerance) {
    return false;
  }
  
  const expectedSignature = createWebhookSignature(payload, secret, timestamp);
  
  // Use timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// ============================================================================
// KEY DERIVATION
// ============================================================================

/**
 * Derives a key from a password
 */
export async function deriveKey(
  password: string,
  salt: string,
  iterations: number = 100000,
  keyLength: number = 32
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, keyLength, 'sha256', (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

/**
 * Creates a key pair for asymmetric encryption
 */
export function generateKeyPair(): {
  publicKey: string;
  privateKey: string;
} {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  return { publicKey, privateKey };
}

// ============================================================================
// SECURE COMPARISON
// ============================================================================

/**
 * Performs timing-safe string comparison
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  return crypto.timingSafeEqual(
    Buffer.from(a),
    Buffer.from(b)
  );
}

// ============================================================================
// DATA SANITIZATION
// ============================================================================

/**
 * Sanitizes data for logging (removes sensitive information)
 */
export function sanitizeForLogging(data: any): any {
  const sensitiveKeys = [
    'password',
    'token',
    'apiKey',
    'secret',
    'creditCard',
    'cvv',
    'ssn',
    'pin',
    'privateKey'
  ];
  
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const sanitized = Array.isArray(data) ? [...data] : { ...data };
  
  for (const key in sanitized) {
    if (sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive.toLowerCase())
    )) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }
  
  return sanitized;
}

// ============================================================================
// CERTIFICATE HANDLING
// ============================================================================

/**
 * Generates a self-signed certificate (for development)
 */
export function generateSelfSignedCertificate(
  days: number = 365
): {
  certificate: string;
  privateKey: string;
} {
  // This is a placeholder - in production, use proper certificate generation
  const { publicKey, privateKey } = generateKeyPair();
  
  return {
    certificate: publicKey, // In reality, this would be a proper certificate
    privateKey
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Hashing
  hashPassword,
  verifyPassword,
  createHash,
  createHMAC,
  createMD5,
  
  // Encryption
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  
  // Tokens
  generateToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  createFirebaseToken,
  
  // Random Generation
  generateRandomString,
  generateRandomNumber,
  generateUUID,
  generateAPIKey,
  generateOTP,
  
  // Data Masking
  maskData,
  maskEmail,
  maskPhoneNumber,
  maskCreditCard,
  
  // Signatures
  createWebhookSignature,
  verifyWebhookSignature,
  
  // Key Management
  deriveKey,
  generateKeyPair,
  
  // Security
  secureCompare,
  sanitizeForLogging,
  generateSelfSignedCertificate,
  
  // Constants
  ENCRYPTION_ALGORITHM,
  SALT_ROUNDS,
  TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY
};