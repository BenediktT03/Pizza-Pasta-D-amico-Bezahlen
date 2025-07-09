# 🏢 Multi-Tenant Architecture Guide

## Overview

EATECH is built as a true multi-tenant SaaS platform, where each restaurant (tenant) has completely isolated data while sharing the same application infrastructure. This guide explains how to implement and manage multi-tenancy in EATECH.

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│           Shared Application Layer          │
│        (Web, Admin, Kitchen Apps)          │
├─────────────────────────────────────────────┤
│          Authentication Layer               │
│     (Firebase Auth with Custom Claims)      │
├─────────────────────────────────────────────┤
│           Data Isolation Layer              │
│        (Firestore Security Rules)           │
├─────────────────────────────────────────────┤
│              Data Storage                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Tenant A │  │ Tenant B │  │ Tenant C │ │
│  └──────────┘  └──────────┘  └──────────┘ │
└─────────────────────────────────────────────┘
```

## Key Concepts

### 1. Tenant Identification

Each tenant is identified by a unique `tenantId`:

```typescript
interface Tenant {
  id: string;                    // Unique identifier
  name: string;                  // Restaurant name
  slug: string;                  // URL-friendly name
  subscription: SubscriptionPlan;
  settings: TenantSettings;
  createdAt: Date;
  status: 'active' | 'suspended' | 'trial';
}
```

### 2. User-Tenant Relationship

Users are associated with tenants through custom claims:

```typescript
interface UserClaims {
  tenantId: string;
  role: 'owner' | 'admin' | 'staff' | 'customer';
  permissions: string[];
}
```

### 3. Data Isolation

All tenant data is isolated using a path-based structure:

```
/tenants/{tenantId}/
  ├── users/
  ├── products/
  ├── orders/
  ├── locations/
  └── settings/
```

## Implementation Guide

### Setting Up a New Tenant

#### 1. Create Tenant Record

```typescript
// services/functions/src/tenant/createTenant.ts
export async function createTenant(data: CreateTenantInput): Promise<Tenant> {
  // Validate tenant data
  const validated = validateTenantData(data);
  
  // Generate unique slug
  const slug = await generateUniqueSlug(validated.name);
  
  // Create tenant document
  const tenant: Tenant = {
    id: generateTenantId(),
    name: validated.name,
    slug,
    subscription: {
      plan: 'trial',
      status: 'active',
      trialEndsAt: addDays(new Date(), 14),
    },
    settings: getDefaultSettings(),
    createdAt: new Date(),
    status: 'active',
  };
  
  // Start transaction
  const batch = db.batch();
  
  // Create tenant document
  batch.set(db.collection('tenants').doc(tenant.id), tenant);
  
  // Create default collections
  await initializeTenantCollections(batch, tenant.id);
  
  // Commit transaction
  await batch.commit();
  
  // Create owner user
  await createTenantOwner(tenant.id, data.owner);
  
  return tenant;
}

async function initializeTenantCollections(
  batch: FirebaseFirestore.WriteBatch,
  tenantId: string
) {
  // Create default categories
  const categories = ['appetizers', 'mains', 'desserts', 'beverages'];
  categories.forEach((category, index) => {
    batch.set(
      db.collection(`tenants/${tenantId}/categories`).doc(),
      {
        name: category,
        order: index,
        active: true,
      }
    );
  });
  
  // Create default settings
  batch.set(
    db.collection(`tenants/${tenantId}/settings`).doc('general'),
    {
      currency: 'CHF',
      timezone: 'Europe/Zurich',
      language: 'de',
      orderPrefix: 'ORD',
    }
  );
}
```

#### 2. Create Tenant Owner

```typescript
async function createTenantOwner(tenantId: string, ownerData: OwnerInput) {
  // Create Firebase Auth user
  const userRecord = await admin.auth().createUser({
    email: ownerData.email,
    password: ownerData.password,
    displayName: ownerData.name,
  });
  
  // Set custom claims
  await admin.auth().setCustomUserClaims(userRecord.uid, {
    tenantId,
    role: 'owner',
    permissions: ['*'], // All permissions
  });
  
  // Create user profile
  await db.collection(`tenants/${tenantId}/users`).doc(userRecord.uid).set({
    email: ownerData.email,
    name: ownerData.name,
    role: 'owner',
    createdAt: new Date(),
    lastLogin: null,
  });
  
  // Send welcome email
  await sendWelcomeEmail(ownerData.email, tenantId);
}
```

### Tenant Context in Applications

#### 1. Authentication Middleware

```typescript
// packages/core/src/middleware/auth.middleware.ts
export async function authenticateWithTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      throw new Error('No token provided');
    }
    
    // Verify token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Extract tenant context
    const tenantId = decodedToken.tenantId || req.headers['x-tenant-id'];
    if (!tenantId) {
      throw new Error('No tenant context');
    }
    
    // Verify tenant exists and is active
    const tenant = await getTenant(tenantId);
    if (!tenant || tenant.status !== 'active') {
      throw new Error('Invalid or inactive tenant');
    }
    
    // Add to request context
    req.user = decodedToken;
    req.tenant = tenant;
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
```

#### 2. React Context Provider

```typescript
// packages/core/src/contexts/TenantContext.tsx
interface TenantContextValue {
  tenant: Tenant | null;
  loading: boolean;
  error: Error | null;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user?.tenantId) {
      setLoading(false);
      return;
    }
    
    const loadTenant = async () => {
      try {
        const tenantData = await getTenant(user.tenantId);
        setTenant(tenantData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    loadTenant();
  }, [user]);
  
  return (
    <TenantContext.Provider value={{ tenant, loading, error }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
};
```

### Firestore Security Rules

#### Tenant Data Isolation

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function belongsToTenant(tenantId) {
      return isAuthenticated() && 
        request.auth.token.tenantId == tenantId;
    }
    
    function hasRole(role) {
      return isAuthenticated() && 
        request.auth.token.role == role;
    }
    
    function hasPermission(permission) {
      return isAuthenticated() && 
        (request.auth.token.permissions.hasAny([permission, '*']));
    }
    
    // Tenant-scoped collections
    match /tenants/{tenantId}/{collection}/{document=**} {
      // Only users belonging to the tenant can read
      allow read: if belongsToTenant(tenantId);
      
      // Write permissions based on collection and role
      allow write: if belongsToTenant(tenantId) && (
        // Products: admin or staff can write
        (collection == 'products' && hasRole('admin', 'staff')) ||
        
        // Orders: customers can create, staff can update
        (collection == 'orders' && (
          (request.method == 'create' && hasRole('customer')) ||
          (request.method == 'update' && hasRole('staff', 'admin'))
        )) ||
        
        // Settings: only admin
        (collection == 'settings' && hasRole('admin'))
      );
    }
    
    // Global tenant list (read-only for super admins)
    match /tenants/{tenantId} {
      allow read: if hasRole('super_admin');
      allow write: if hasRole('super_admin');
    }
  }
}
```

### Multi-Tenant Queries

#### 1. Scoped Queries

Always scope queries to the current tenant:

```typescript
// packages/core/src/services/product.service.ts
export class ProductService {
  constructor(private tenantId: string) {}
  
  async getProducts(filters?: ProductFilters): Promise<Product[]> {
    let query = db
      .collection('tenants')
      .doc(this.tenantId)
      .collection('products')
      .where('active', '==', true);
    
    if (filters?.category) {
      query = query.where('category', '==', filters.category);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Product));
  }
  
  async createProduct(data: CreateProductInput): Promise<Product> {
    const product = {
      ...data,
      tenantId: this.tenantId, // Always include tenantId
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const docRef = await db
      .collection('tenants')
      .doc(this.tenantId)
      .collection('products')
      .add(product);
    
    return { id: docRef.id, ...product };
  }
}
```

#### 2. Cross-Tenant Queries (Admin Only)

For platform administration:

```typescript
// services/functions/src/admin/analytics.ts
export async function getPlatformAnalytics(): Promise<PlatformStats> {
  // Verify super admin role
  if (!hasRole(context.auth, 'super_admin')) {
    throw new Error('Unauthorized');
  }
  
  // Query across all tenants
  const tenants = await db.collection('tenants').get();
  
  const stats = await Promise.all(
    tenants.docs.map(async (tenant) => {
      const orders = await db
        .collection(`tenants/${tenant.id}/orders`)
        .where('createdAt', '>=', startOfMonth(new Date()))
        .get();
      
      return {
        tenantId: tenant.id,
        orderCount: orders.size,
        revenue: orders.docs.reduce((sum, order) => 
          sum + order.data().total, 0
        ),
      };
    })
  );
  
  return aggregateStats(stats);
}
```

### Tenant-Specific Features

#### 1. Feature Flags

Control features per tenant:

```typescript
interface TenantFeatures {
  voiceOrdering: boolean;
  tableReservations: boolean;
  loyaltyProgram: boolean;
  customBranding: boolean;
  multiLocation: boolean;
}

// Check feature availability
export function useFeature(feature: keyof TenantFeatures): boolean {
  const { tenant } = useTenant();
  return tenant?.features?.[feature] ?? false;
}

// Usage in components
function VoiceOrderButton() {
  const hasVoiceOrdering = useFeature('voiceOrdering');
  
  if (!hasVoiceOrdering) {
    return null;
  }
  
  return <Button>Start Voice Order</Button>;
}
```

#### 2. Tenant Customization

Allow tenants to customize their instance:

```typescript
interface TenantBranding {
  primaryColor: string;
  secondaryColor: string;
  logo: string;
  favicon: string;
  customCSS?: string;
}

// Apply tenant branding
export function useTenantBranding() {
  const { tenant } = useTenant();
  
  useEffect(() => {
    if (!tenant?.branding) return;
    
    const root = document.documentElement;
    root.style.setProperty('--primary-color', tenant.branding.primaryColor);
    root.style.setProperty('--secondary-color', tenant.branding.secondaryColor);
    
    // Update favicon
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      favicon.href = tenant.branding.favicon;
    }
    
    // Apply custom CSS
    if (tenant.branding.customCSS) {
      const style = document.createElement('style');
      style.textContent = tenant.branding.customCSS;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, [tenant]);
}
```

### Multi-Location Support

Some tenants may have multiple locations:

```typescript
interface Location {
  id: string;
  tenantId: string;
  name: string;
  address: Address;
  timezone: string;
  businessHours: BusinessHours;
  features: LocationFeatures;
}

// Location-aware queries
export class LocationAwareService {
  constructor(
    private tenantId: string,
    private locationId?: string
  ) {}
  
  async getOrders(): Promise<Order[]> {
    let query = db
      .collection('tenants')
      .doc(this.tenantId)
      .collection('orders');
    
    // Filter by location if specified
    if (this.locationId) {
      query = query.where('locationId', '==', this.locationId);
    }
    
    return query.get().then(snapshot => 
      snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order))
    );
  }
}
```

### Tenant Lifecycle Management

#### 1. Subscription Management

```typescript
export async function checkTenantSubscription(tenantId: string): Promise<void> {
  const tenant = await getTenant(tenantId);
  
  if (!tenant) {
    throw new Error('Tenant not found');
  }
  
  const now = new Date();
  
  // Check trial expiration
  if (tenant.subscription.plan === 'trial' && 
      tenant.subscription.trialEndsAt < now) {
    await suspendTenant(tenantId, 'trial_expired');
  }
  
  // Check payment status
  if (tenant.subscription.status === 'past_due') {
    const gracePeriodEnd = addDays(tenant.subscription.pastDueDate, 7);
    if (now > gracePeriodEnd) {
      await suspendTenant(tenantId, 'payment_failed');
    }
  }
}

async function suspendTenant(tenantId: string, reason: string) {
  // Update tenant status
  await db.collection('tenants').doc(tenantId).update({
    status: 'suspended',
    suspendedAt: new Date(),
    suspensionReason: reason,
  });
  
  // Notify tenant
  await notifyTenantSuspension(tenantId, reason);
  
  // Disable all users
  const users = await admin.auth().listUsers();
  const tenantUsers = users.users.filter(user => 
    user.customClaims?.tenantId === tenantId
  );
  
  await Promise.all(
    tenantUsers.map(user => 
      admin.auth().updateUser(user.uid, { disabled: true })
    )
  );
}
```

#### 2. Data Export/Import

Allow tenants to export their data:

```typescript
export async function exportTenantData(tenantId: string): Promise<TenantExport> {
  // Verify ownership
  const requestingUser = context.auth;
  if (requestingUser.token.tenantId !== tenantId || 
      !hasRole(requestingUser, 'owner')) {
    throw new Error('Unauthorized');
  }
  
  // Collect all tenant data
  const collections = [
    'users', 'products', 'orders', 'customers', 'settings'
  ];
  
  const exportData: TenantExport = {
    tenant: await getTenant(tenantId),
    exportDate: new Date(),
    data: {},
  };
  
  for (const collection of collections) {
    const snapshot = await db
      .collection(`tenants/${tenantId}/${collection}`)
      .get();
    
    exportData.data[collection] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
  
  // Store export in Cloud Storage
  const exportPath = `exports/${tenantId}/${Date.now()}.json`;
  await storage.bucket().file(exportPath).save(
    JSON.stringify(exportData, null, 2)
  );
  
  // Generate signed URL
  const [url] = await storage.bucket().file(exportPath).getSignedUrl({
    action: 'read',
    expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });
  
  return { url, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) };
}
```

### Testing Multi-Tenancy

#### 1. Unit Tests

```typescript
// tests/unit/tenant.test.ts
describe('TenantService', () => {
  let tenantService: TenantService;
  const testTenantId = 'test-tenant-123';
  
  beforeEach(() => {
    tenantService = new TenantService();
    // Mock authenticated user with tenant context
    jest.spyOn(auth, 'currentUser', 'get').mockReturnValue({
      uid: 'user123',
      getIdTokenResult: async () => ({
        claims: { tenantId: testTenantId, role: 'admin' }
      })
    });
  });
  
  it('should scope queries to tenant', async () => {
    const spy = jest.spyOn(db, 'collection');
    await tenantService.getProducts();
    
    expect(spy).toHaveBeenCalledWith(
      `tenants/${testTenantId}/products`
    );
  });
  
  it('should prevent cross-tenant access', async () => {
    const otherTenantId = 'other-tenant-456';
    
    await expect(
      tenantService.getProduct(otherTenantId, 'product123')
    ).rejects.toThrow('Unauthorized');
  });
});
```

#### 2. Integration Tests

```typescript
// tests/integration/multi-tenant.test.ts
describe('Multi-Tenant Integration', () => {
  let tenant1: Tenant;
  let tenant2: Tenant;
  let user1: UserRecord;
  let user2: UserRecord;
  
  beforeAll(async () => {
    // Create test tenants
    tenant1 = await createTestTenant('Restaurant A');
    tenant2 = await createTestTenant('Restaurant B');
    
    // Create users for each tenant
    user1 = await createTestUser(tenant1.id, 'admin');
    user2 = await createTestUser(tenant2.id, 'admin');
  });
  
  it('should isolate data between tenants', async () => {
    // Create product in tenant1
    const product1 = await createProduct(tenant1.id, {
      name: 'Pizza Margherita',
      price: 15.00,
    });
    
    // Try to access from tenant2 context
    const token2 = await user2.getIdToken();
    const response = await request(app)
      .get(`/api/products/${product1.id}`)
      .set('Authorization', `Bearer ${token2}`)
      .expect(403);
    
    expect(response.body.error).toBe('Access denied');
  });
});
```

### Best Practices

#### 1. Always Include Tenant Context

```typescript
// Good: Tenant context in every query
const orders = await db
  .collection(`tenants/${tenantId}/orders`)
  .where('status', '==', 'pending')
  .get();

// Bad: Missing tenant context
const orders = await db
  .collection('orders') // ❌ No tenant isolation!
  .where('status', '==', 'pending')
  .get();
```

#### 2. Validate Tenant Access

```typescript
// Always verify tenant access
export async function getOrder(tenantId: string, orderId: string) {
  // Verify user belongs to tenant
  if (context.auth.token.tenantId !== tenantId) {
    throw new Error('Access denied');
  }
  
  // Fetch order
  const order = await db
    .collection(`tenants/${tenantId}/orders`)
    .doc(orderId)
    .get();
  
  // Double-check tenant ownership
  if (order.data()?.tenantId !== tenantId) {
    throw new Error('Access denied');
  }
  
  return order.data();
}
```

#### 3. Use Tenant-Aware Hooks

```typescript
// Create reusable hooks
export function useTenantData<T>(
  collection: string,
  filters?: any
): UseQueryResult<T[]> {
  const { tenant } = useTenant();
  
  return useQuery({
    queryKey: ['tenant', tenant?.id, collection, filters],
    queryFn: () => fetchTenantData<T>(tenant!.id, collection, filters),
    enabled: !!tenant?.id,
  });
}

// Usage
function ProductList() {
  const { data: products, loading } = useTenantData<Product>('products', {
    category: 'pizza',
  });
  
  // Products are automatically scoped to current tenant
}
```

### Monitoring & Analytics

#### Tenant Usage Metrics

```typescript
// Track usage per tenant
export async function trackTenantUsage(
  tenantId: string,
  metric: string,
  value: number
) {
  await db.collection('metrics').add({
    tenantId,
    metric,
    value,
    timestamp: new Date(),
  });
}

// Aggregate tenant metrics
export async function getTenantMetrics(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<TenantMetrics> {
  const metrics = await db
    .collection('metrics')
    .where('tenantId', '==', tenantId)
    .where('timestamp', '>=', startDate)
    .where('timestamp', '<=', endDate)
    .get();
  
  return aggregateMetrics(metrics.docs);
}
```

### Security Considerations

1. **Never expose tenant IDs in URLs** for customer-facing apps
2. **Always validate tenant context** on the backend
3. **Implement rate limiting** per tenant
4. **Monitor for suspicious cross-tenant access** attempts
5. **Regular security audits** of tenant isolation

### Migration Guide

For migrating from single-tenant to multi-tenant:

1. Add `tenantId` to all collections
2. Update security rules
3. Migrate existing data to tenant structure
4. Update all queries to include tenant context
5. Add tenant management UI
6. Test thoroughly with multiple tenants

---

For more details on specific implementations, see the [Architecture Guide](../ARCHITECTURE.md).
