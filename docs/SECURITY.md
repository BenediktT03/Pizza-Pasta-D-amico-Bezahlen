# 🔒 EATECH Security Guidelines

## Overview

Security is paramount at EATECH. This document outlines security best practices, implementation guidelines, and compliance requirements for the EATECH platform.

## Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Minimal access rights for users and services
3. **Zero Trust**: Verify everything, trust nothing
4. **Data Privacy**: Swiss data protection compliance (DSG/GDPR)
5. **Secure by Default**: Security built into the architecture

## Authentication & Authorization

### Firebase Authentication

#### Supported Methods
- Email/Password with strong password requirements
- Social login (Google, Apple)
- Phone authentication with SMS verification
- Multi-factor authentication (MFA)

#### Implementation
```typescript
// Password requirements
const passwordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true
};

// MFA enforcement for admin users
if (user.role === 'admin' && !user.multiFactor) {
  await enforceMultiFactorAuth(user);
}
```

### JWT Token Security

#### Token Structure
```typescript
interface AuthToken {
  uid: string;
  email: string;
  tenantId: string;
  role: UserRole;
  permissions: string[];
  iat: number;
  exp: number;
}
```

#### Token Validation
```typescript
// Middleware for API routes
export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) throw new Error('No token provided');
    
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Additional validation
    if (decodedToken.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }
    
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
```

### Role-Based Access Control (RBAC)

#### Role Hierarchy
```typescript
enum UserRole {
  SUPER_ADMIN = 'super_admin',  // Platform admin
  TENANT_OWNER = 'tenant_owner', // Restaurant owner
  MANAGER = 'manager',           // Restaurant manager
  STAFF = 'staff',              // Restaurant staff
  CUSTOMER = 'customer'          // End user
}

// Permission matrix
const permissions = {
  [UserRole.SUPER_ADMIN]: ['*'],
  [UserRole.TENANT_OWNER]: [
    'tenant:*',
    'orders:*',
    'products:*',
    'staff:*',
    'analytics:*'
  ],
  [UserRole.MANAGER]: [
    'orders:*',
    'products:*',
    'staff:read',
    'analytics:read'
  ],
  [UserRole.STAFF]: [
    'orders:read',
    'orders:update',
    'products:read'
  ],
  [UserRole.CUSTOMER]: [
    'orders:create',
    'orders:read:own',
    'products:read'
  ]
};
```

## Data Security

### Encryption

#### Data at Rest
- Firestore: Automatic encryption using Google-managed keys
- Cloud Storage: AES-256 encryption
- Sensitive fields: Additional application-level encryption

```typescript
// Field-level encryption for sensitive data
import { encrypt, decrypt } from '@eatech/utils/crypto';

// Encrypting payment details
const encryptedCard = encrypt(cardDetails, process.env.ENCRYPTION_KEY);

// Decrypting for authorized access
const decryptedCard = decrypt(encryptedCard, process.env.ENCRYPTION_KEY);
```

#### Data in Transit
- TLS 1.3 for all connections
- Certificate pinning for mobile apps
- HSTS headers with preload

```typescript
// Security headers
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
```

### Database Security

#### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Tenant isolation
    match /tenants/{tenantId}/{document=**} {
      allow read: if request.auth != null && 
        request.auth.token.tenantId == tenantId;
      
      allow write: if request.auth != null && 
        request.auth.token.tenantId == tenantId &&
        hasPermission('write', resource);
    }
    
    // Customer data protection
    match /tenants/{tenantId}/users/{userId} {
      allow read: if request.auth != null && 
        (request.auth.uid == userId || hasRole('staff'));
      
      allow update: if request.auth != null && 
        request.auth.uid == userId &&
        !request.resource.data.diff(resource.data).affectedKeys()
          .hasAny(['role', 'permissions']);
    }
    
    // Order access control
    match /tenants/{tenantId}/orders/{orderId} {
      allow read: if request.auth != null &&
        (resource.data.customerId == request.auth.uid ||
         hasRole('staff'));
      
      allow create: if request.auth != null &&
        request.resource.data.customerId == request.auth.uid;
      
      allow update: if request.auth != null &&
        hasRole('staff') &&
        onlyUpdatingAllowedFields();
    }
  }
}

// Helper functions
function hasRole(role) {
  return request.auth.token.role == role || 
         request.auth.token.role == 'super_admin';
}

function hasPermission(permission, resource) {
  return permission in request.auth.token.permissions;
}

function onlyUpdatingAllowedFields() {
  let allowedFields = ['status', 'preparationTime', 'completedAt'];
  return request.resource.data.diff(resource.data).affectedKeys()
    .hasOnly(allowedFields);
}
```

### Personal Data Protection

#### PII Handling
```typescript
// Anonymization for analytics
function anonymizeUser(user: User): AnonymizedUser {
  return {
    id: hashUserId(user.id),
    ageGroup: getAgeGroup(user.birthDate),
    canton: user.address?.canton,
    orderCount: user.orderCount,
    // Exclude: name, email, phone, exact address
  };
}

// Data retention policy
async function enforceDataRetention() {
  const retentionPeriod = 365 * 2; // 2 years
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionPeriod);
  
  // Soft delete old customer data
  await db.collection('users')
    .where('lastActivity', '<', cutoffDate)
    .where('hasActiveSubscription', '==', false)
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        doc.ref.update({ 
          deletedAt: new Date(),
          personalData: null // Remove PII
        });
      });
    });
}
```

## API Security

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

// Strict limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true
});

// Apply to routes
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);
```

### Input Validation

```typescript
import { z } from 'zod';

// Order validation schema
const OrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive().max(99),
    modifiers: z.array(z.string().uuid()).optional(),
    notes: z.string().max(500).optional()
  })).min(1).max(50),
  deliveryInfo: z.object({
    method: z.enum(['pickup', 'delivery', 'table']),
    address: z.string().max(500).optional(),
    tableNumber: z.string().max(10).optional()
  }),
  paymentMethod: z.enum(['card', 'twint', 'cash'])
});

// Validate request
app.post('/orders', async (req, res) => {
  try {
    const validatedData = OrderSchema.parse(req.body);
    // Process order...
  } catch (error) {
    res.status(422).json({ 
      error: 'Invalid input',
      details: error.errors 
    });
  }
});
```

### SQL Injection Prevention

```typescript
// Using parameterized queries (if using SQL)
const query = 'SELECT * FROM products WHERE tenant_id = ? AND category = ?';
const values = [tenantId, category];

// For Firestore (NoSQL), use built-in query builders
const products = await db
  .collection('products')
  .where('tenantId', '==', tenantId)
  .where('category', '==', category)
  .get();
```

### XSS Prevention

```typescript
import DOMPurify from 'isomorphic-dompurify';

// Sanitize user input
const sanitizedContent = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
  ALLOWED_ATTR: ['href']
});

// React automatically escapes content
// But be careful with dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
```

## Payment Security

### PCI DSS Compliance

```typescript
// Never store card details directly
// Use Stripe Elements or Payment Request API

// Stripe implementation
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create payment intent (server-side)
const paymentIntent = await stripe.paymentIntents.create({
  amount: order.total * 100, // in cents
  currency: 'chf',
  metadata: {
    orderId: order.id,
    tenantId: order.tenantId
  },
  payment_method_types: ['card', 'sepa_debit']
});

// Client-side: Use Stripe Elements
// Never handle raw card data
```

### TWINT Security

```typescript
// TWINT integration with signed requests
import crypto from 'crypto';

function signTwintRequest(payload: any): string {
  const secret = process.env.TWINT_SECRET;
  const message = JSON.stringify(payload);
  
  return crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
}

// Verify TWINT callbacks
function verifyTwintCallback(payload: any, signature: string): boolean {
  const expectedSignature = signTwintRequest(payload);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## Infrastructure Security

### Container Security

```dockerfile
# Use specific versions, not latest
FROM node:20.11.0-alpine

# Run as non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy only necessary files
COPY --chown=nextjs:nodejs . .

USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node healthcheck.js
```

### Kubernetes Security

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: eatech-web
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
    fsGroup: 1001
  containers:
  - name: app
    image: eatech/web:1.0.0
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
    resources:
      limits:
        memory: "512Mi"
        cpu: "500m"
```

### Secrets Management

```typescript
// Never commit secrets
// Use environment variables or secret management services

// Google Secret Manager
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();

async function getSecret(secretName: string): Promise<string> {
  const [version] = await client.accessSecretVersion({
    name: `projects/${PROJECT_ID}/secrets/${secretName}/versions/latest`,
  });
  
  return version.payload.data.toString();
}

// Usage
const stripeKey = await getSecret('stripe-secret-key');
```

## Monitoring & Incident Response

### Security Monitoring

```typescript
// Log security events
function logSecurityEvent(event: SecurityEvent) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    type: 'SECURITY_EVENT',
    event: event.type,
    userId: event.userId,
    ip: event.ip,
    userAgent: event.userAgent,
    details: event.details
  }));
}

// Monitor failed login attempts
async function handleFailedLogin(email: string, ip: string) {
  const attempts = await getFailedAttempts(email, ip);
  
  if (attempts > 5) {
    await blockAccount(email);
    await notifySecurityTeam({
      type: 'ACCOUNT_BLOCKED',
      email,
      ip,
      attempts
    });
  }
  
  logSecurityEvent({
    type: 'FAILED_LOGIN',
    userId: email,
    ip,
    details: { attempts }
  });
}
```

### Incident Response Plan

1. **Detection**: Automated alerts for security events
2. **Assessment**: Evaluate severity and impact
3. **Containment**: Isolate affected systems
4. **Eradication**: Remove threat and patch vulnerabilities
5. **Recovery**: Restore normal operations
6. **Post-Mortem**: Document and improve

### Security Headers

```typescript
// Content Security Policy
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.eatech.ch", "wss://api.eatech.ch"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
```

## Compliance

### Swiss Data Protection (DSG/revDSG)

1. **Data Minimization**: Collect only necessary data
2. **Purpose Limitation**: Use data only for stated purposes
3. **Transparency**: Clear privacy policy and consent
4. **Data Subject Rights**: Access, rectification, deletion
5. **Data Residency**: Store Swiss data in Switzerland
6. **Breach Notification**: 72-hour notification requirement

### GDPR Compliance

```typescript
// Data export for GDPR requests
async function exportUserData(userId: string): Promise<UserDataExport> {
  const userData = await db.collection('users').doc(userId).get();
  const orders = await db.collection('orders')
    .where('customerId', '==', userId)
    .get();
  
  return {
    profile: userData.data(),
    orders: orders.docs.map(doc => doc.data()),
    exportDate: new Date(),
    format: 'json'
  };
}

// Right to deletion
async function deleteUserData(userId: string): Promise<void> {
  // Anonymize orders (keep for accounting)
  await db.collection('orders')
    .where('customerId', '==', userId)
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        doc.ref.update({
          customerId: 'DELETED',
          customerData: null
        });
      });
    });
  
  // Delete user profile
  await db.collection('users').doc(userId).delete();
  
  // Delete from auth
  await admin.auth().deleteUser(userId);
}
```

## Security Checklist

### Development
- [ ] Input validation on all endpoints
- [ ] Output encoding to prevent XSS
- [ ] Parameterized queries
- [ ] Secure session management
- [ ] Strong authentication
- [ ] Proper error handling (no stack traces)
- [ ] Security headers configured
- [ ] HTTPS enforced
- [ ] Secrets in environment variables
- [ ] Dependencies updated

### Deployment
- [ ] SSL/TLS certificates valid
- [ ] Firewall rules configured
- [ ] Monitoring alerts set up
- [ ] Backup procedures tested
- [ ] Incident response plan ready
- [ ] Security scanning automated
- [ ] Access logs enabled
- [ ] Rate limiting active
- [ ] DDoS protection enabled
- [ ] Regular security audits scheduled

## Security Tools

### Recommended Tools
- **SAST**: SonarQube, ESLint security plugins
- **DAST**: OWASP ZAP, Burp Suite
- **Dependency Scanning**: Snyk, npm audit
- **Container Scanning**: Trivy, Clair
- **Monitoring**: Datadog, Sentry
- **WAF**: Cloudflare WAF

### Automated Security Testing
```bash
# Run security audit
npm audit

# Fix vulnerabilities
npm audit fix

# Check for secrets
npm run scan:secrets

# OWASP dependency check
npm run security:check
```

## Security Training

All developers must:
1. Complete OWASP Top 10 training
2. Understand Swiss data protection laws
3. Follow secure coding practices
4. Participate in security reviews
5. Report security concerns immediately

## Contact

**Security Team**: security@eatech.ch  
**Bug Bounty**: security.eatech.ch/bugbounty  
**Emergency**: +41 XX XXX XX XX (24/7)

---

Remember: Security is everyone's responsibility! 🛡️
