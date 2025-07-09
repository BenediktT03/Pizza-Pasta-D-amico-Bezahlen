# 🔧 EATECH - TECHNICAL IMPLEMENTATION GUIDE

## 🎛️ Feature Flag System Implementation (WICHTIGSTE KOMPONENTE!)

### Zentrale Feature Control Architektur
```javascript
// Feature Flag Collection Structure
/feature_flags/
  /global/{featureId}
    - enabled: boolean
    - name: string
    - category: string
    - description: string
    - dependencies: string[] // andere Features die aktiv sein müssen
    - incompatible: string[] // Features die nicht gleichzeitig aktiv sein können
    - rolloutPercentage: number (0-100)
    - schedule: {
        enableAt: timestamp,
        disableAt: timestamp
      }
    - createdBy: string
    - lastModified: timestamp
    - lastModifiedBy: string

/feature_flags/
  /trucks/{truckId}/{featureId}
    - enabled: boolean
    - overridesGlobal: boolean
    - customConfig: {} // Feature-spezifische Konfiguration
    - enabledAt: timestamp
    - disabledAt: timestamp
    - reason: string // Warum wurde es aktiviert/deaktiviert

/feature_flags/
  /managers/{managerId}/{featureId}
    - enabled: boolean
    - applyToAllTrucks: boolean
    - excludedTrucks: string[] // Trucks die ausgenommen sind
```

### Feature Flag Service
```javascript
// packages/core/src/services/feature-flags/feature-flag.service.ts
export class FeatureFlagService {
  private cache: Map<string, FeatureFlag> = new Map();
  private listeners: Map<string, Set<Function>> = new Map();
  
  constructor(
    private db: Firestore,
    private realtimeDb: Database
  ) {
    this.initializeRealtimeSync();
  }
  
  // Hauptfunktion: Ist Feature aktiviert?
  async isEnabled(
    featureKey: string,
    context: FeatureContext
  ): Promise<boolean> {
    // 1. Check cache first
    const cached = this.getCached(featureKey, context);
    if (cached !== undefined) return cached;
    
    // 2. Check truck-specific override
    if (context.truckId) {
      const truckFlag = await this.getTruckFlag(context.truckId, featureKey);
      if (truckFlag && truckFlag.overridesGlobal) {
        return this.evaluateFlag(truckFlag, context);
      }
    }
    
    // 3. Check manager override
    if (context.managerId) {
      const managerFlag = await this.getManagerFlag(context.managerId, featureKey);
      if (managerFlag && managerFlag.applyToAllTrucks) {
        if (!managerFlag.excludedTrucks?.includes(context.truckId)) {
          return this.evaluateFlag(managerFlag, context);
        }
      }
    }
    
    // 4. Check global flag
    const globalFlag = await this.getGlobalFlag(featureKey);
    if (!globalFlag) return false; // Default: disabled
    
    return this.evaluateFlag(globalFlag, context);
  }
  
  // Flag Evaluation mit allen Regeln
  private evaluateFlag(flag: FeatureFlag, context: FeatureContext): boolean {
    // Basic check
    if (!flag.enabled) return false;
    
    // Schedule check
    if (flag.schedule) {
      const now = new Date();
      if (flag.schedule.enableAt && now < flag.schedule.enableAt) return false;
      if (flag.schedule.disableAt && now > flag.schedule.disableAt) return false;
    }
    
    // Rollout percentage
    if (flag.rolloutPercentage < 100) {
      const hash = this.hashContext(context);
      const threshold = flag.rolloutPercentage / 100;
      return hash < threshold;
    }
    
    // Dependencies check
    if (flag.dependencies?.length > 0) {
      for (const dep of flag.dependencies) {
        if (!this.isEnabled(dep, context)) return false;
      }
    }
    
    // Incompatible features check
    if (flag.incompatible?.length > 0) {
      for (const incomp of flag.incompatible) {
        if (this.isEnabled(incomp, context)) return false;
      }
    }
    
    return true;
  }
  
  // Real-time Updates
  private initializeRealtimeSync() {
    // Global flags
    this.db.collection('feature_flags/global')
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const flag = change.doc.data() as FeatureFlag;
          
          if (change.type === 'removed') {
            this.cache.delete(`global:${change.doc.id}`);
          } else {
            this.cache.set(`global:${change.doc.id}`, flag);
          }
          
          // Notify listeners
          this.notifyListeners(change.doc.id, flag);
        });
      });
  }
  
  // UI Helper: Alle Features mit Status
  async getAllFeaturesWithStatus(context: FeatureContext): Promise<FeatureStatus[]> {
    const allFeatures = await this.getAllFeatures();
    
    return Promise.all(
      allFeatures.map(async (feature) => ({
        ...feature,
        enabled: await this.isEnabled(feature.key, context),
        source: await this.getEnabledSource(feature.key, context)
      }))
    );
  }
  
  // Master Admin Functions
  async setGlobalFlag(
    featureKey: string,
    enabled: boolean,
    config?: Partial<FeatureFlag>
  ): Promise<void> {
    const flag: FeatureFlag = {
      enabled,
      name: config?.name || featureKey,
      category: config?.category || 'general',
      lastModified: new Date(),
      lastModifiedBy: 'master_admin',
      ...config
    };
    
    await this.db.doc(`feature_flags/global/${featureKey}`).set(flag);
    
    // Audit log
    await this.logFeatureChange({
      featureKey,
      action: enabled ? 'enabled' : 'disabled',
      level: 'global',
      by: 'master_admin',
      config
    });
  }
  
  // Bulk Operations
  async bulkUpdate(updates: BulkFeatureUpdate[]): Promise<void> {
    const batch = this.db.batch();
    
    for (const update of updates) {
      const ref = this.getFeatureRef(update);
      batch.set(ref, update.data, { merge: true });
    }
    
    await batch.commit();
  }
  
  // Emergency Controls
  async panicMode(): Promise<void> {
    // Deaktiviert alle nicht-essentiellen Features
    const essentialFeatures = [
      'basic_ordering',
      'payment_processing',
      'order_display'
    ];
    
    const allFeatures = await this.getAllFeatures();
    const toDisable = allFeatures.filter(
      f => !essentialFeatures.includes(f.key)
    );
    
    await this.bulkUpdate(
      toDisable.map(f => ({
        level: 'global',
        featureKey: f.key,
        data: { enabled: false, reason: 'PANIC MODE ACTIVATED' }
      }))
    );
  }
}

// React Hook für Feature Flags
export const useFeatureFlag = (featureKey: string) => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const { truckId, managerId } = useContext(AuthContext);
  
  useEffect(() => {
    const service = FeatureFlagService.getInstance();
    
    // Initial check
    service.isEnabled(featureKey, { truckId, managerId })
      .then(setEnabled)
      .finally(() => setLoading(false));
    
    // Subscribe to changes
    const unsubscribe = service.subscribe(featureKey, (newValue) => {
      setEnabled(newValue);
    });
    
    return unsubscribe;
  }, [featureKey, truckId, managerId]);
  
  return { enabled, loading };
};

// Feature Flag Wrapper Component
export const FeatureFlag: React.FC<{
  feature: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ feature, fallback = null, children }) => {
  const { enabled, loading } = useFeatureFlag(feature);
  
  if (loading) return <LoadingSpinner />;
  if (!enabled) return <>{fallback}</>;
  
  return <>{children}</>;
};
```

### Master Control Dashboard UI
```javascript
// apps/master/src/features/feature-flags/FeatureFlagDashboard.tsx
export const FeatureFlagDashboard: React.FC = () => {
  const [features, setFeatures] = useState<FeatureWithStatus[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const categories = [
    { id: 'all', name: 'Alle Features', icon: '🎯' },
    { id: 'ordering', name: 'Bestellung', icon: '🛒' },
    { id: 'payment', name: 'Zahlung', icon: '💳' },
    { id: 'ai', name: 'AI/ML', icon: '🤖' },
    { id: 'analytics', name: 'Analytics', icon: '📊' },
    { id: 'kitchen', name: 'Küche', icon: '🍳' },
    { id: 'haccp', name: 'HACCP', icon: '🌡️' },
    { id: 'notifications', name: 'Benachrichtigungen', icon: '🔔' },
    { id: 'branding', name: 'Branding', icon: '🎨' },
    { id: 'social', name: 'Community', icon: '👥' }
  ];
  
  const filteredFeatures = features
    .filter(f => selectedCategory === 'all' || f.category === selectedCategory)
    .filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  
  const handleToggle = async (featureKey: string, enabled: boolean) => {
    try {
      await featureFlagService.setGlobalFlag(featureKey, enabled);
      toast.success(`Feature ${enabled ? 'aktiviert' : 'deaktiviert'}: ${featureKey}`);
    } catch (error) {
      toast.error('Fehler beim Ändern des Features');
    }
  };
  
  const handleBulkAction = async (action: 'enable' | 'disable', featureKeys: string[]) => {
    const updates = featureKeys.map(key => ({
      level: 'global',
      featureKey: key,
      data: { enabled: action === 'enable' }
    }));
    
    await featureFlagService.bulkUpdate(updates);
    toast.success(`${featureKeys.length} Features ${action === 'enable' ? 'aktiviert' : 'deaktiviert'}`);
  };
  
  return (
    <div className="feature-flag-dashboard">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🎛️ Master Feature Control</h1>
        
        <div className="flex gap-4">
          <button
            onClick={() => featureFlagService.panicMode()}
            className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700"
          >
            🆘 PANIC MODE
          </button>
          
          <button
            onClick={exportConfiguration}
            className="btn-secondary"
          >
            📥 Export Config
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="grid grid-cols-12 gap-4 mb-6">
        <div className="col-span-3">
          <input
            type="text"
            placeholder="Feature suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
        
        <div className="col-span-7">
          <div className="flex gap-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg ${
                  selectedCategory === cat.id 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100'
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>
        
        <div className="col-span-2 flex justify-end gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-gray-100'}`}
          >
            🗳️
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-gray-100'}`}
          >
            📋
          </button>
        </div>
      </div>
      
      {/* Feature Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-3 gap-4">
          {filteredFeatures.map(feature => (
            <FeatureFlagCard
              key={feature.key}
              feature={feature}
              onToggle={handleToggle}
            />
          ))}
        </div>
      ) : (
        <FeatureFlagTable
          features={filteredFeatures}
          onToggle={handleToggle}
          onBulkAction={handleBulkAction}
        />
      )}
      
      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-4 gap-4">
        <StatCard
          title="Aktive Features"
          value={features.filter(f => f.enabled).length}
          total={features.length}
          color="green"
        />
        <StatCard
          title="In Rollout"
          value={features.filter(f => f.rolloutPercentage < 100).length}
          color="yellow"
        />
        <StatCard
          title="Zeitgesteuert"
          value={features.filter(f => f.schedule).length}
          color="blue"
        />
        <StatCard
          title="Mit Abhängigkeiten"
          value={features.filter(f => f.dependencies?.length > 0).length}
          color="purple"
        />
      </div>
    </div>
  );
};

// Feature Flag Card Component
const FeatureFlagCard: React.FC<{
  feature: FeatureWithStatus;
  onToggle: (key: string, enabled: boolean) => void;
}> = ({ feature, onToggle }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <div className={`p-4 rounded-lg border-2 ${
      feature.enabled ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'
    }`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-lg">{feature.name}</h3>
        <Switch
          checked={feature.enabled}
          onChange={(enabled) => onToggle(feature.key, enabled)}
          className={`${
            feature.enabled ? 'bg-green-600' : 'bg-gray-300'
          } relative inline-flex h-6 w-11 items-center rounded-full`}
        />
      </div>
      
      <p className="text-sm text-gray-600 mb-3">{feature.description}</p>
      
      <div className="flex gap-2 mb-2">
        <span className="px-2 py-1 bg-gray-200 rounded text-xs">
          {feature.category}
        </span>
        {feature.source && feature.source !== 'global' && (
          <span className="px-2 py-1 bg-blue-200 rounded text-xs">
            {feature.source}
          </span>
        )}
      </div>
      
      {feature.dependencies?.length > 0 && (
        <div className="text-xs text-gray-500 mb-2">
          🔗 Benötigt: {feature.dependencies.join(', ')}
        </div>
      )}
      
      {feature.rolloutPercentage < 100 && (
        <div className="mb-2">
          <div className="text-xs text-gray-500 mb-1">
            Rollout: {feature.rolloutPercentage}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${feature.rolloutPercentage}%` }}
            />
          </div>
        </div>
      )}
      
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="text-sm text-blue-600 hover:underline"
      >
        {showDetails ? 'Weniger' : 'Mehr'} anzeigen
      </button>
      
      {showDetails && (
        <FeatureFlagDetails feature={feature} />
      )}
    </div>
  );
};
```

### Feature Flag Integration in Apps
```javascript
// Beispiel: Voice Order Feature
const VoiceOrderButton: React.FC = () => {
  const { enabled: voiceEnabled } = useFeatureFlag('voice_ordering');
  const { enabled: swissGermanEnabled } = useFeatureFlag('voice_swiss_german');
  
  if (!voiceEnabled) return null;
  
  return (
    <button
      onClick={startVoiceOrder}
      className="voice-order-button"
    >
      🎤 {swissGermanEnabled ? 'Uf Schwiizerdüütsch beställe' : 'Per Sprache bestellen'}
    </button>
  );
};

// Beispiel: Dynamic Pricing
const ProductPrice: React.FC<{ product: Product }> = ({ product }) => {
  const { enabled: dynamicPricing } = useFeatureFlag('dynamic_pricing');
  const { enabled: autoApply } = useFeatureFlag('dynamic_pricing_auto_apply');
  
  const [price, setPrice] = useState(product.basePrice);
  
  useEffect(() => {
    if (!dynamicPricing) {
      setPrice(product.basePrice);
      return;
    }
    
    calculateDynamicPrice(product).then(result => {
      if (autoApply) {
        setPrice(result.recommendedPrice);
      } else {
        // Nur anzeigen, nicht anwenden
        showPriceSuggestion(result);
      }
    });
  }, [product, dynamicPricing, autoApply]);
  
  return (
    <div className="product-price">
      <span className="price">{formatPrice(price)} CHF</span>
      {dynamicPricing && !autoApply && (
        <span className="suggested-price">
          Vorschlag: {formatPrice(suggestedPrice)} CHF
        </span>
      )}
    </div>
  );
};

// Beispiel: HACCP Monitoring
const TemperatureMonitoring: React.FC = () => {
  return (
    <FeatureFlag feature="temperature_monitoring">
      <div className="temperature-dashboard">
        <FeatureFlag feature="temperature_alarms">
          <AlarmSettings />
        </FeatureFlag>
        
        <FeatureFlag feature="temperature_sensors_testo">
          <TestoSensorIntegration />
        </FeatureFlag>
        
        <FeatureFlag feature="temperature_sensors_haccp24">
          <HACCP24Integration />
        </FeatureFlag>
        
        <TemperatureChart />
      </div>
    </FeatureFlag>
  );
};
```

### Feature Flag Middleware für Backend
```javascript
// Firebase Functions Middleware
export const requireFeature = (featureKey: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const context = {
      truckId: req.params.truckId || req.body.truckId,
      managerId: req.user?.managerId,
      userId: req.user?.uid
    };
    
    const enabled = await featureFlagService.isEnabled(featureKey, context);
    
    if (!enabled) {
      return res.status(403).json({
        error: 'Feature not available',
        feature: featureKey
      });
    }
    
    next();
  };
};

// Usage in API routes
app.post('/api/orders/voice',
  requireAuth(),
  requireFeature('voice_ordering'),
  processVoiceOrder
);

app.post('/api/ai/pricing',
  requireAuth(),
  requireFeature('dynamic_pricing'),
  calculatePricing
);
```

## 🏗️ Architektur Details

### Monorepo Struktur
```
eatech/
├── apps/
│   ├── web/          # Kunden-PWA
│   ├── admin/        # Food Truck Dashboard
│   ├── kitchen/      # Kitchen Display
│   ├── master/       # Master-Admin Panel
│   ├── landing/      # Marketing Website
│   ├── api/          # (gefunden, noch nicht in Spec)
│   ├── customer/     # (gefunden, noch nicht in Spec)
│   ├── master-admin/ # (gefunden, noch nicht in Spec)
│   ├── tenant-portal/# (gefunden, noch nicht in Spec)
│   └── mobile/       # (existiert, React Native/Expo)
├── packages/
│   ├── core/         # Business Logic, Services
│   ├── ui/           # Shared Components
│   ├── types/        # TypeScript Definitions
│   ├── config/       # Shared Configuration
│   ├── utils/        # Utilities
│   └── testing/      # Test Utilities
├── services/
│   ├── functions/    # Firebase Cloud Functions
│   ├── workers/      # Edge Workers
│   └── webhooks/     # Webhook Handlers
└── functions/        # (ALTER ORDNER - muss entschieden werden)
```

### Firebase Collections (Optimiert für 2000+ Trucks)
```javascript
// Feature Flag Collections (NEU)
/feature_flags/global/{featureId}
/feature_flags/trucks/{truckId}/{featureId}
/feature_flags/managers/{managerId}/{featureId}
/feature_audit_logs/{logId}
  - featureKey: string
  - action: 'enabled' | 'disabled' | 'modified'
  - level: 'global' | 'truck' | 'manager'
  - entityId: string
  - changedBy: string
  - timestamp: timestamp
  - previousValue: any
  - newValue: any
  - reason: string

// Haupt-Collections
/foodtrucks/{truckId}
  - name, logo, branding
  - settings, features
  - stripeAccountId
  - createdAt, trial_ends_at
  - whitelabelEnabled: boolean
  - customDomain: string

/foodtrucks/{truckId}/products/{productId}
  - name: {de, fr, it, en}
  - description: {de, fr, it, en}
  - price, category
  - allergens: ['gluten', 'milk', ...] // 14 EU Allergene
  - available: boolean
  - featured: boolean
  - modifiers: []
  - nutritionalInfo: {} // KI-berechnet
  - originCountry: string // Pflicht für Fleisch

/foodtrucks/{truckId}/locations/{locationId}
  - address: string
  - coordinates: {lat, lng}
  - schedule: {
      monday: {open: "08:00", close: "20:00"},
      // ...
    }
  - activeNow: boolean
  - lastUpdated: timestamp

/foodtrucks/{truckId}/orders/{orderId}
  - orderNumber: number // täglich ab 100
  - dailyOrderNumber: number // für Reset
  - items: [{
      productId, quantity, modifiers,
      specialInstructions: string (max 200)
    }]
  - totalAmount: number
  - status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  - customerName: string
  - customerPhone: string // +41 Format
  - paymentIntentId: string
  - platformFee: number // 3%
  - tipAmount: number
  - tipPlatformFee: number // 3% vom Trinkgeld
  - createdAt: timestamp
  - completedAt: timestamp

// Manager System
/managers/{managerId}
  - name, email
  - trucks: [truckId1, truckId2, ...] // nur Referenzen
  - whitelabel: {
      enabled: boolean,
      domain: string,
      branding: {}
    }
  - role: 'manager' // nur Vermittler!

// Live Orders (Hot Path für Performance)
/orders_live/{date}/{orderId}
  - TTL: 24 hours
  - Kopie von orders für Real-time
  - Für Kitchen Display Updates

// Analytics (Aggregiert für Performance)
/analytics/{truckId}/{date}
  - revenue: number
  - orderCount: number
  - popularItems: [{productId, count}]
  - peakHours: [{hour: 12, orders: 45}]
  - conversionRate: number
  - avgOrderValue: number
  - platformFees: number // 3% Tracking

// HACCP Compliance
/foodtrucks/{truckId}/haccp/{recordId}
  - type: 'temperature' | 'cleaning' | 'maintenance'
  - timestamp: timestamp
  - value: any
  - signature: {
      method: 'pin' | 'fingerprint',
      userId: string,
      timestamp: timestamp
    }
  - sensorId: string
  - batteryLevel: number // für Sensor-Warnung

// Tickets (Beschwerde-Management)
/tickets/{ticketId}
  - priority: 'critical' | 'high' | 'normal'
  - assignedTo: ['truck', 'manager', 'admin'] // KI entscheidet
  - originalLanguage: string
  - translatedContent: {} // Auto-Übersetzung
  - status: 'open' | 'in_progress' | 'resolved'
  - createdBy: 'customer' | 'ai'
```

### Security Rules (Detailliert)
```javascript
// Firestore Security Rules
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper Functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isTruckOwner(truckId) {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/foodtrucks/$(truckId)).data.ownerId == request.auth.uid;
    }
    
    function isManager(truckId) {
      return isAuthenticated() &&
        exists(/databases/$(database)/documents/managers/$(request.auth.uid)) &&
        truckId in get(/databases/$(database)/documents/managers/$(request.auth.uid)).data.trucks;
    }
    
    function isMasterAdmin() {
      return isAuthenticated() && 
        request.auth.token.role == 'master_admin';
    }
    
    // Food Trucks
    match /foodtrucks/{truckId} {
      allow read: if true; // Öffentlich lesbar
      allow create: if isAuthenticated(); // Selbst-Registrierung
      allow update: if isTruckOwner(truckId) || isManager(truckId) || isMasterAdmin();
      allow delete: if isMasterAdmin();
      
      // Products
      match /products/{productId} {
        allow read: if true;
        allow write: if isTruckOwner(truckId) || isMasterAdmin();
        // Manager kann NICHT Produkte ändern
      }
      
      // Orders
      match /orders/{orderId} {
        allow read: if isTruckOwner(truckId) || 
                      isManager(truckId) || 
                      isMasterAdmin() ||
                      (isAuthenticated() && resource.data.customerId == request.auth.uid);
        allow create: if true; // Jeder kann bestellen
        allow update: if isTruckOwner(truckId) || isMasterAdmin();
      }
      
      // HACCP
      match /haccp/{recordId} {
        allow read: if isTruckOwner(truckId) || isMasterAdmin();
        allow write: if isTruckOwner(truckId);
      }
    }
    
    // Managers
    match /managers/{managerId} {
      allow read: if request.auth.uid == managerId || isMasterAdmin();
      allow write: if isMasterAdmin();
    }
    
    // Tickets
    match /tickets/{ticketId} {
      allow read: if resource.data.assignedTo.hasAny(['admin']) || 
                    isMasterAdmin() ||
                    (resource.data.assignedTo.hasAny(['truck']) && isTruckOwner(resource.data.truckId));
      allow create: if true;
      allow update: if isMasterAdmin();
    }
  }
}
```

## 💳 Payment Integration (Stripe Connect)

### Onboarding Flow
```javascript
// 1. Truck Registration
const createTruck = async (truckData) => {
  // Create Stripe Connect Account
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'CH',
    email: truckData.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
      twint_payments: { requested: true } // TWINT!
    },
    business_type: 'individual', // oder 'company'
    business_profile: {
      mcc: '5812', // Eating places and restaurants
      name: truckData.name,
      product_description: 'Food Truck Services'
    }
  });
  
  // Save to Firestore
  await db.collection('foodtrucks').doc(truckId).set({
    ...truckData,
    stripeAccountId: account.id,
    trial_ends_at: addDays(new Date(), 90), // 3 Monate gratis
    platformFeePercentage: 0, // 0% während Trial
    createdAt: serverTimestamp()
  });
  
  // Generate Onboarding Link
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${APP_URL}/onboarding/refresh`,
    return_url: `${APP_URL}/onboarding/complete`,
    type: 'account_onboarding'
  });
  
  return accountLink.url;
};

// 2. Payment mit automatischem Split
const createPayment = async (orderId, amount, truckId) => {
  const truck = await getTruck(truckId);
  const isInTrial = truck.trial_ends_at > new Date();
  const platformFeePercentage = isInTrial ? 0 : 3;
  const platformFee = Math.round(amount * platformFeePercentage / 100);
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount, // in Rappen
    currency: 'chf',
    payment_method_types: ['card', 'twint'], // TWINT wichtig!
    application_fee_amount: platformFee,
    transfer_data: {
      destination: truck.stripeAccountId,
    },
    metadata: {
      orderId,
      truckId,
      orderNumber: order.dailyOrderNumber
    }
  });
  
  return paymentIntent;
};

// 3. Trinkgeld Handling
const addTip = async (paymentIntentId, tipAmount) => {
  const tipPlatformFee = Math.round(tipAmount * 0.03); // 3% auch vom Trinkgeld
  
  await stripe.paymentIntents.update(paymentIntentId, {
    amount: previousAmount + tipAmount,
    application_fee_amount: previousFee + tipPlatformFee,
    metadata: {
      ...previousMetadata,
      tipAmount: tipAmount,
      tipPlatformFee: tipPlatformFee
    }
  });
};

// 4. Instant Payout zu Benedikt
// Automatisch via Stripe Connect - keine manuelle Implementation nötig!
```

### Webhook Handlers
```javascript
// Firebase Function für Stripe Webhooks
exports.stripeWebhooks = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(
    req.rawBody,
    sig,
    STRIPE_WEBHOOK_SECRET
  );
  
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object);
      break;
      
    case 'account.updated':
      // Check if onboarding complete
      const account = event.data.object;
      if (account.charges_enabled && account.payouts_enabled) {
        await activateTruck(account.id);
      }
      break;
      
    case 'application_fee.created':
      // Track platform revenue
      await trackPlatformFee(event.data.object);
      break;
      
    case 'payout.paid':
      // Notification an Truck
      await notifyPayoutComplete(event.data.object);
      break;
  }
  
  res.json({ received: true });
});
```

## 🗣️ AI Integration (OpenAI)

### Voice Order Processing
```javascript
// Voice to Text (Schweizerdeutsch Support!)
const processVoiceOrder = async (audioBuffer, language = 'de') => {
  // 1. Transcription mit Whisper
  const formData = new FormData();
  formData.append('file', audioBuffer);
  formData.append('model', 'whisper-1');
  formData.append('language', language); // de funktioniert für Schweizerdeutsch
  formData.append('prompt', 'Schweizerdeutsche Bestellung im Food Truck'); // Hilft bei Dialekt
  
  const transcription = await openai.audio.transcriptions.create(formData);
  
  // 2. Intent Extraction mit GPT-4
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `Du bist ein Bestell-Assistent für einen Schweizer Food Truck.
        Extrahiere aus der Bestellung:
        - Produkte mit Menge
        - Modifikationen (ohne Zwiebeln, extra Käse, etc.)
        - Spezielle Wünsche
        
        Schweizer Spezialitäten:
        - "es Stück" = ein Stück
        - "zwöi" = zwei
        - "drü" = drei
        - "Pommes Frites" = Pommes
        - "Glace" = Eis
        
        Antworte im JSON Format:
        {
          "items": [
            {
              "product": "Produktname",
              "quantity": 1,
              "modifications": ["ohne Zwiebeln"],
              "confidence": 0.95
            }
          ],
          "specialRequests": "string",
          "language": "de-CH"
        }`
      },
      {
        role: "user",
        content: transcription.text
      }
    ],
    temperature: 0.3, // Niedrig für Genauigkeit
    response_format: { type: "json_object" }
  });
  
  const orderData = JSON.parse(completion.choices[0].message.content);
  
  // 3. Validate against menu
  const validatedOrder = await validateOrderItems(orderData.items, truckId);
  
  return {
    ...validatedOrder,
    originalTranscription: transcription.text,
    processingConfidence: orderData.items.reduce((acc, item) => 
      acc + item.confidence, 0) / orderData.items.length
  };
};

// Chat Bot für Fragen
const chatWithCustomer = async (message, context) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `Du bist ein freundlicher Food Truck Assistent.
        
        Du KANNST:
        - Fragen zu Allergenen beantworten (${ALLERGENS.join(', ')})
        - Ernährungsberatung geben
        - Produktempfehlungen machen
        - Beschwerden entgegennehmen und Tickets erstellen
        
        Du KANNST NICHT:
        - Smalltalk führen
        - Über das Wetter reden
        - Persönliche Gespräche führen
        
        Kontext:
        - Truck: ${context.truckName}
        - Verfügbare Produkte: ${context.products}
        - Sprache: ${context.language}`
      },
      {
        role: "user",
        content: message
      }
    ],
    temperature: 0.7
  });
  
  // Check if complaint -> create ticket
  if (await isComplaint(completion.choices[0].message.content)) {
    await createTicket({
      type: 'complaint',
      priority: await determinePriority(message),
      assignedTo: await determineRecipients(message), // ['truck', 'manager', 'admin']
      content: message,
      aiResponse: completion.choices[0].message.content
    });
  }
  
  return completion.choices[0].message.content;
};
```

### Dynamic Pricing AI
```javascript
const calculateDynamicPrice = async (product, context) => {
  const prompt = `
    Analysiere folgende Faktoren für dynamische Preisgestaltung:
    
    Produkt: ${product.name}
    Basispreis: CHF ${product.basePrice}
    
    Kontext:
    - Aktuelle Uhrzeit: ${context.currentTime}
    - Wochentag: ${context.dayOfWeek}
    - Auslastung: ${context.currentCapacity}%
    - Wetter: ${context.weather}
    - Events in der Nähe: ${context.nearbyEvents}
    - Historische Daten: ${JSON.stringify(context.historicalSales)}
    
    Regeln:
    1. Maximale Preisänderung: ±20%
    2. Psychologische Preise nutzen (X.90, X.50)
    3. Niemals auf volle Franken runden
    4. "Nur" vor Preisen bei Angeboten
    5. Rush Hour (12-13 Uhr): +10-15%
    6. Schlechtes Wetter: -5% auf kalte Speisen
    7. Events: +15-20%
    
    Gib zurück:
    {
      "recommendedPrice": 15.90,
      "reasoning": "Rush Hour + Event nearby",
      "displayPrice": "Nur 15.90",
      "changePercentage": 10
    }
  `;
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "system", content: prompt }],
    temperature: 0.5,
    response_format: { type: "json_object" }
  });
  
  const pricing = JSON.parse(completion.choices[0].message.content);
  
  // Auto-apply (nicht nur Vorschlag!)
  await updateProductPrice(product.id, pricing.recommendedPrice);
  
  return pricing;
};

// Predictive Analytics
const generatePredictions = async (truckId) => {
  const historicalData = await getHistoricalData(truckId, 90); // 90 Tage
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{
      role: "system",
      content: `Analysiere die Verkaufsdaten und erstelle Vorhersagen:
      
      Daten: ${JSON.stringify(historicalData)}
      
      Erstelle:
      1. Bedarfsplanung für morgen (in kg/Stück)
      2. Rush-Hour Vorhersage
      3. Umsatzprognose
      4. Beliebte Kombinationen
      5. Wartungsbedarf (basierend auf Nutzung)
      
      Format:
      {
        "inventory": {
          "pommes": "50kg",
          "burgerPatties": "200 Stück"
        },
        "rushHours": ["12:00-13:00", "18:00-19:00"],
        "revenueForcast": 2500,
        "popularCombos": [
          {"items": ["Burger", "Pommes", "Cola"], "percentage": 35}
        ],
        "maintenance": {
          "grill": "In 5 Tagen (1000 Burger seit letzter Wartung)"
        }
      }`
    }],
    response_format: { type: "json_object" }
  });
  
  return JSON.parse(completion.choices[0].message.content);
};
```

## 🌡️ HACCP Implementation

### Sensor Integration
```javascript
// Sensor Adapter Pattern für verschiedene Hersteller
class SensorAdapter {
  constructor(type) {
    switch(type) {
      case 'testo':
        this.client = new TestoSaveris2Client();
        break;
      case 'haccp24':
        this.client = new HACCP24Client();
        break;
      default:
        this.client = new GenericModbusClient();
    }
  }
  
  async getReadings() {
    const rawData = await this.client.fetchData();
    return this.normalizeData(rawData);
  }
  
  normalizeData(data) {
    // Vereinheitlichtes Format
    return {
      sensorId: data.id,
      type: 'temperature',
      value: data.temperature,
      unit: 'celsius',
      location: data.name,
      batteryLevel: data.battery,
      timestamp: new Date()
    };
  }
}

// 15-Minuten Intervall Monitoring
const monitoringJob = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context) => {
    const trucks = await getAllActiveTrucks();
    
    for (const truck of trucks) {
      const sensors = await getSensorsForTruck(truck.id);
      
      for (const sensor of sensors) {
        const adapter = new SensorAdapter(sensor.type);
        const reading = await adapter.getReadings();
        
        // Save to HACCP records
        await db.collection(`foodtrucks/${truck.id}/haccp`).add({
          ...reading,
          type: 'temperature',
          createdAt: serverTimestamp()
        });
        
        // Check thresholds
        if (reading.type === 'temperature') {
          // Kühlschrank: 2-5°C
          if (reading.location.includes('Kühlschrank') && 
              (reading.value < 2 || reading.value > 5)) {
            await createTemperatureAlert(truck.id, reading);
          }
          
          // Gefrierfach: -18°C
          if (reading.location.includes('Gefrier') && 
              reading.value > -18) {
            await createTemperatureAlert(truck.id, reading);
          }
        }
        
        // Battery warning
        if (reading.batteryLevel < 20) {
          await createBatteryWarning(truck.id, sensor);
        }
      }
    }
  });

// Digitale Checklisten
const cleaningTasks = {
  daily: [
    { id: 'morning_temp', time: '08:00', name: 'Morgen Temperatur-Check' },
    { id: 'grill_clean', time: '14:00', name: 'Grill Reinigung' },
    { id: 'evening_clean', time: '20:00', name: 'Abend-Reinigung' }
  ],
  weekly: [
    { id: 'deep_clean', day: 'sunday', name: 'Grundreinigung' },
    { id: 'oil_change', day: 'wednesday', name: 'Öl wechseln' }
  ],
  monthly: [
    { id: 'full_inspection', day: 1, name: 'Komplett-Inspektion' }
  ]
};

// Digital Signature Implementation
const signTask = async (taskId, method = 'pin') => {
  let signature;
  
  if (method === 'pin') {
    signature = {
      method: 'pin',
      hash: await hashPin(enteredPin),
      timestamp: new Date()
    };
  } else if (method === 'fingerprint') {
    // Web Authentication API
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: new Uint8Array(32),
        rp: { name: "Eatech" },
        user: {
          id: new TextEncoder().encode(userId),
          name: userEmail,
          displayName: userName
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required"
        }
      }
    });
    
    signature = {
      method: 'fingerprint',
      credentialId: credential.id,
      timestamp: new Date()
    };
  }
  
  await db.collection(`foodtrucks/${truckId}/haccp`).add({
    type: 'cleaning',
    taskId: taskId,
    completed: true,
    signature: signature,
    timestamp: serverTimestamp()
  });
};
```

### Eskalations-System
```javascript
// Temperatur-Alarm (NICHT kritisch bei 8°C!)
const createTemperatureAlert = async (truckId, reading) => {
  const alert = {
    id: generateId(),
    truckId,
    type: 'temperature',
    severity: reading.value > 8 ? 'warning' : 'critical',
    reading,
    escalationSteps: []
  };
  
  // Step 1: Sofort Push an Truck
  await sendPushNotification(truck.fcmTokens, {
    title: '⚠️ Temperatur-Warnung',
    body: `${reading.location}: ${reading.value}°C`,
    data: { alertId: alert.id }
  });
  
  // Kitchen Display Warnung
  await updateKitchenDisplay(truckId, {
    alert: 'TEMPERATUR-WARNUNG',
    color: 'orange'
  });
  
  alert.escalationSteps.push({
    time: 0,
    action: 'push_to_truck',
    completed: true
  });
  
  // Step 2: Nach 10 Min - SMS
  setTimeout(async () => {
    const alertStatus = await getAlert(alert.id);
    if (!alertStatus.acknowledged) {
      await sendSMS(truck.phone, 
        `EATECH: Temperatur-Alarm! ${reading.location}: ${reading.value}°C. Bitte prüfen!`
      );
      
      alert.escalationSteps.push({
        time: 10,
        action: 'sms_to_truck',
        completed: true
      });
    }
  }, 10 * 60 * 1000);
  
  // Step 3: Nach 20 Min - Master-Admin
  setTimeout(async () => {
    const alertStatus = await getAlert(alert.id);
    if (!alertStatus.acknowledged) {
      await notifyMasterAdmin('TEMPERATUR-ALARM', {
        truck: truck.name,
        reading,
        duration: '20 Minuten'
      });
      
      alert.escalationSteps.push({
        time: 20,
        action: 'notify_admin',
        completed: true
      });
    }
  }, 20 * 60 * 1000);
  
  // Step 4: Nach 30 Min - Produkte sperren
  setTimeout(async () => {
    const alertStatus = await getAlert(alert.id);
    if (!alertStatus.acknowledged && reading.value > 10) {
      // Nur bei wirklich kritischen Temperaturen
      await lockProducts(truckId, reading.location);
      
      alert.escalationSteps.push({
        time: 30,
        action: 'products_locked',
        completed: true
      });
    }
  }, 30 * 60 * 1000);
  
  await saveAlert(alert);
};
```

## 🎨 UI/UX Implementation

### Theme System
```javascript
// packages/ui/src/themes/index.ts
export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    error: string;
    warning: string;
    success: string;
  };
  typography: {
    fontFamily: string;
    sizes: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      xxl: string;
    };
    weights: {
      light: number;
      regular: number;
      medium: number;
      bold: number;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

// Swiss Theme
export const swissTheme: Theme = {
  name: 'Swiss',
  colors: {
    primary: '#DA291C',     // Schweizer Rot
    secondary: '#FFFFFF',   // Weiss
    accent: '#FFD700',      // Gold
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#1A1A1A',
    error: '#DC2626',
    warning: '#F59E0B',
    success: '#10B981'
  },
  typography: {
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    sizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      md: '1rem',
      lg: '1.25rem',
      xl: '1.5rem',
      xxl: '2rem'
    },
    weights: {
      light: 300,
      regular: 400,
      medium: 500,
      bold: 700
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
    full: '9999px'
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 15px rgba(0,0,0,0.15)'
  }
};

// Theme Provider mit Persistence
export const ThemeProvider: React.FC = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('eatech-theme');
    return saved ? JSON.parse(saved) : swissTheme;
  });
  
  const applyTheme = (newTheme: Theme) => {
    // CSS Variables setzen
    const root = document.documentElement;
    Object.entries(newTheme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    
    setTheme(newTheme);
    localStorage.setItem('eatech-theme', JSON.stringify(newTheme));
  };
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme: applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom Theme Builder
export const CustomThemeBuilder: React.FC = () => {
  const [customTheme, setCustomTheme] = useState<Theme>(swissTheme);
  
  return (
    <div className="theme-builder">
      <h2>Theme anpassen</h2>
      
      <div className="color-pickers">
        <ColorPicker
          label="Primärfarbe"
          value={customTheme.colors.primary}
          onChange={(color) => updateColor('primary', color)}
        />
        {/* Weitere Color Pickers */}
      </div>
      
      <div className="font-selector">
        <select
          value={customTheme.typography.fontFamily}
          onChange={(e) => updateFont(e.target.value)}
        >
          <option value="Helvetica Neue">Helvetica Neue</option>
          <option value="Arial">Arial</option>
          <option value="Roboto">Roboto</option>
        </select>
      </div>
      
      <button onClick={() => saveCustomTheme(customTheme)}>
        Theme speichern
      </button>
    </div>
  );
};
```

### Responsive Design mit Tailwind
```css
/* tailwind.config.js */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        // ... weitere Theme-Farben
      },
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-in',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ]
};

/* Custom Utilities */
@layer utilities {
  .swiss-shadow {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
  
  .swiss-border {
    border: 1px solid #E5E5E5;
  }
  
  .glass-effect {
    backdrop-filter: blur(10px);
    background: rgba(255, 255, 255, 0.8);
  }
  
  .food-truck-gradient {
    background: linear-gradient(135deg, #DA291C 0%, #FF6B6B 100%);
  }
}
```

### Onboarding Tutorial Implementation
```javascript
// Interaktives Tutorial mit Truck-Animation
const OnboardingTutorial: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [truckPosition, setTruckPosition] = useState(0);
  
  const steps = [
    {
      title: "Willkommen! Lass uns deinen Truck einrichten",
      content: <WelcomeStep />,
      action: null
    },
    {
      title: "Lade dein Logo hoch",
      content: <LogoUpload />,
      action: 'upload-logo',
      validation: (data) => data.logo !== null
    },
    {
      title: "Erstelle dein erstes Produkt",
      content: <ProductCreator template="burger" />,
      action: 'create-product',
      validation: (data) => data.products.length > 0
    },
    {
      title: "Setze deinen ersten Standort",
      content: <LocationPicker />,
      action: 'set-location',
      validation: (data) => data.locations.length > 0
    },
    {
      title: "Mache eine Test-Bestellung",
      content: <TestOrder />,
      action: 'test-order',
      validation: (data) => data.testOrderComplete === true
    },
    {
      title: "Verbinde deine Zahlungsmethode",
      content: <StripeOnboarding />,
      action: 'connect-payment',
      validation: (data) => data.stripeConnected === true
    },
    {
      title: "Geschafft! 3 Monate gratis starten",
      content: <CompletionScreen />,
      action: 'complete'
    }
  ];
  
  const nextStep = async () => {
    // Validate current step
    if (steps[currentStep].validation) {
      const isValid = await steps[currentStep].validation(userData);
      if (!isValid) {
        showError('Bitte vervollständige diesen Schritt');
        return;
      }
    }
    
    // Animate truck
    setTruckPosition((currentStep + 1) * (100 / steps.length));
    setCurrentStep(currentStep + 1);
  };
  
  return (
    <div className="onboarding-container">
      {/* Dark Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-75 z-40" />
      
      {/* Progress Bar with Truck */}
      <div className="fixed top-0 left-0 right-0 z-50 p-4">
        <div className="bg-white rounded-full h-2 relative">
          <div 
            className="bg-primary h-full rounded-full transition-all duration-500"
            style={{ width: `${truckPosition}%` }}
          />
          <div 
            className="absolute top-1/2 transform -translate-y-1/2 transition-all duration-500"
            style={{ left: `${truckPosition}%` }}
          >
            🚚
          </div>
        </div>
      </div>
      
      {/* Tutorial Content */}
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-lg w-full mx-4">
          <h2 className="text-2xl font-bold mb-4">
            {steps[currentStep].title}
          </h2>
          
          <div className="mb-6">
            {steps[currentStep].content}
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              className="btn-secondary"
              disabled={currentStep === 0}
            >
              Zurück
            </button>
            
            <button
              onClick={nextStep}
              className="btn-primary"
            >
              {currentStep === steps.length - 1 ? 'Fertig' : 'Weiter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

## 🚀 Performance Optimierungen

### PWA Configuration
```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'masked-icon.svg'
      ],
      manifest: {
        name: 'Eatech Food Truck',
        short_name: 'Eatech',
        description: 'Food Truck Bestellsystem',
        theme_color: '#DA291C',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png'
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png'
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png'
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png'
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        sourcemap: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/storage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'ui-vendor': ['@headlessui/react', '@heroicons/react']
        }
      }
    }
  }
});
```

### Offline Support
```javascript
// Service Worker für Offline-Bestellungen
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/orders')) {
    event.respondWith(
      fetch(event.request.clone())
        .catch(() => {
          // Offline - speichere in IndexedDB
          return saveOfflineOrder(event.request);
        })
    );
  }
});

// IndexedDB für Offline Orders
const offlineDB = {
  async init() {
    const db = await openDB('eatech-offline', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('orders')) {
          const store = db.createObjectStore('orders', { 
            keyPath: 'id',
            autoIncrement: true 
          });
          store.createIndex('syncStatus', 'syncStatus');
          store.createIndex('truckId', 'truckId');
        }
      }
    });
    return db;
  },
  
  async saveOrder(orderData) {
    const db = await this.init();
    const order = {
      ...orderData,
      id: `offline_${Date.now()}_${Math.random()}`,
      syncStatus: 'pending',
      createdOffline: true,
      timestamp: new Date()
    };
    
    await db.add('orders', order);
    
    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Offline-Bestellung gespeichert', {
        body: 'Wird synchronisiert sobald wieder online',
        icon: '/icons/icon-192x192.png'
      });
    }
    
    return order;
  },
  
  async syncOrders() {
    const db = await this.init();
    const tx = db.transaction('orders', 'readwrite');
    const orders = await tx.objectStore('orders')
      .index('syncStatus')
      .getAll('pending');
    
    for (const order of orders) {
      try {
        // Sync to Firebase
        const result = await syncOrderToFirebase(order);
        
        // Update status
        order.syncStatus = 'synced';
        order.syncedAt = new Date();
        order.onlineOrderId = result.id;
        
        await tx.objectStore('orders').put(order);
      } catch (error) {
        console.error('Sync failed for order:', order.id, error);
        // Retry later
      }
    }
  }
};

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(offlineDB.syncOrders());
  }
});
```

## 🧪 Testing Implementation

### Unit Tests
```javascript
// Order Calculation Tests
describe('OrderService', () => {
  describe('Platform Fee Calculation', () => {
    it('should calculate 3% fee correctly', () => {
      const order = { totalAmount: 10000 }; // 100 CHF in Rappen
      const fee = calculatePlatformFee(order);
      expect(fee).toBe(300); // 3 CHF
    });
    
    it('should calculate 0% during trial period', () => {
      const order = { 
        totalAmount: 10000,
        truckId: 'test-truck'
      };
      const truck = {
        trial_ends_at: addDays(new Date(), 30) // Still in trial
      };
      
      const fee = calculatePlatformFee(order, truck);
      expect(fee).toBe(0);
    });
    
    it('should calculate tip fee separately', () => {
      const tip = 500; // 5 CHF
      const tipFee = calculateTipFee(tip);
      expect(tipFee).toBe(15); // 0.15 CHF
    });
  });
  
  describe('VAT Calculation', () => {
    it('should apply 2.5% for takeaway', () => {
      const amount = 10000; // 100 CHF
      const vat = calculateVAT(amount, 'takeaway');
      expect(vat).toBe(250); // 2.50 CHF
    });
    
    it('should apply 7.7% for dine-in', () => {
      const amount = 10000; // 100 CHF
      const vat = calculateVAT(amount, 'dine-in');
      expect(vat).toBe(770); // 7.70 CHF
    });
  });
  
  describe('Order Number Generation', () => {
    it('should start at 100 each day', async () => {
      const orderNumber = await generateDailyOrderNumber('truck-1');
      expect(orderNumber).toBe(100);
    });
    
    it('should continue beyond 999', async () => {
      // Mock 900 orders
      jest.spyOn(db, 'getOrderCountToday').mockResolvedValue(900);
      
      const orderNumber = await generateDailyOrderNumber('truck-1');
      expect(orderNumber).toBe(1000); // Not reset to 100
    });
  });
});

// Allergen Management Tests
describe('AllergenService', () => {
  it('should detect all 14 EU allergens', () => {
    const product = {
      ingredients: ['Weizenmehl', 'Milch', 'Eier', 'Senf']
    };
    
    const allergens = detectAllergens(product);
    expect(allergens).toContain('gluten');
    expect(allergens).toContain('milk');
    expect(allergens).toContain('eggs');
    expect(allergens).toContain('mustard');
  });
  
  it('should calculate allergens for recipe changes', async () => {
    const recipe = {
      ingredients: [
        { name: 'Bun', allergens: ['gluten'] },
        { name: 'Cheese', allergens: ['milk'] }
      ]
    };
    
    // Add new ingredient
    recipe.ingredients.push({
      name: 'Mayo',
      allergens: ['eggs', 'mustard']
    });
    
    const updatedAllergens = await recalculateAllergens(recipe);
    expect(updatedAllergens).toEqual(['gluten', 'milk', 'eggs', 'mustard']);
  });
});
```

### E2E Tests
```javascript
// Playwright E2E Tests
import { test, expect } from '@playwright/test';

test.describe('Complete Order Flow', () => {
  test('Swiss customer orders in German', async ({ page }) => {
    // 1. Scan QR / Visit truck page
    await page.goto('/truck/test-food-truck');
    
    // 2. Select language
    await page.click('[data-testid="language-de"]');
    await expect(page).toHaveURL(/.*lang=de/);
    
    // 3. View menu
    await expect(page.locator('h1')).toContainText('Speisekarte');
    
    // 4. Add items
    await page.click('[data-testid="product-burger"]');
    await page.click('[data-testid="add-to-cart"]');
    
    // Check allergen info
    await expect(page.locator('[data-testid="allergen-info"]'))
      .toContainText('Enthält: Gluten, Milch');
    
    // 5. Go to checkout
    await page.click('[data-testid="cart-button"]');
    await page.click('[data-testid="checkout-button"]');
    
    // 6. Enter details
    await page.fill('[data-testid="customer-name"]', 'Hans Müller');
    await page.fill('[data-testid="customer-phone"]', '+41791234567');
    
    // 7. Payment
    await page.click('[data-testid="payment-twint"]');
    
    // Mock TWINT QR
    await page.waitForSelector('[data-testid="twint-qr"]');
    
    // Simulate payment success
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('twint-payment-success'));
    });
    
    // 8. Order confirmation
    await expect(page.locator('[data-testid="order-success"]'))
      .toContainText('Bestellung erfolgreich');
    await expect(page.locator('[data-testid="order-number"]'))
      .toContainText(/Bestellnummer: \d{3,}/);
  });
  
  test('Voice order in Swiss German', async ({ page }) => {
    await page.goto('/truck/test-food-truck');
    
    // Grant microphone permission
    await page.context().grantPermissions(['microphone']);
    
    // Start voice order
    await page.click('[data-testid="voice-order-button"]');
    
    // Mock audio input
    await page.evaluate(() => {
      // Simulate: "Ich hätt gern zwei Burger und einmal Pommes"
      window.mockAudioTranscription = 
        "Ich hätt gern zwei Burger und einmal Pommes";
    });
    
    // Wait for processing
    await page.waitForSelector('[data-testid="order-preview"]');
    
    // Verify interpretation
    await expect(page.locator('[data-testid="order-items"]'))
      .toContainText('2x Burger');
    await expect(page.locator('[data-testid="order-items"]'))
      .toContainText('1x Pommes');
    
    // Confirm order
    await page.click('[data-testid="confirm-voice-order"]');
  });
  
  test('Truck owner manages products', async ({ page }) => {
    // Login as truck owner
    await page.goto('/admin/login');
    await page.fill('[data-testid="email"]', 'truck@example.com');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to products
    await page.click('[data-testid="nav-products"]');
    
    // Add new product
    await page.click('[data-testid="add-product"]');
    
    // Fill multilingual form
    await page.fill('[data-testid="product-name-de"]', 'Käseburger');
    await page.fill('[data-testid="product-name-fr"]', 'Burger au fromage');
    await page.fill('[data-testid="product-name-it"]', 'Burger al formaggio');
    await page.fill('[data-testid="product-name-en"]', 'Cheeseburger');
    
    // Set price
    await page.fill('[data-testid="product-price"]', '15.90');
    
    // Select allergens
    await page.click('[data-testid="allergen-gluten"]');
    await page.click('[data-testid="allergen-milk"]');
    
    // Save
    await page.click('[data-testid="save-product"]');
    
    // Verify
    await expect(page.locator('[data-testid="product-list"]'))
      .toContainText('Käseburger');
  });
});
```

### Performance Tests
```javascript
// K6 Load Test
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
  },
};

export default function() {
  // Scenario: Rush hour ordering
  const truckId = 'test-truck-' + Math.floor(Math.random() * 10);
  
  // 1. Load menu
  const menuRes = http.get(`${__ENV.API_URL}/trucks/${truckId}/menu`);
  check(menuRes, {
    'menu loaded': (r) => r.status === 200,
    'menu load time OK': (r) => r.timings.duration < 300,
  });
  
  sleep(Math.random() * 2); // User browses menu
  
  // 2. Create order
  const orderPayload = {
    items: [
      { productId: 'burger', quantity: 2 },
      { productId: 'fries', quantity: 1 },
      { productId: 'coke', quantity: 2 }
    ],
    customerName: `Test User ${__VU}`,
    customerPhone: '+41791234567'
  };
  
  const orderRes = http.post(
    `${__ENV.API_URL}/trucks/${truckId}/orders`,
    JSON.stringify(orderPayload),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  check(orderRes, {
    'order created': (r) => r.status === 201,
    'order creation time OK': (r) => r.timings.duration < 500,
    'order number assigned': (r) => JSON.parse(r.body).orderNumber >= 100,
  });
  
  sleep(1);
}
```

## 🔐 Security Implementation

### Authentication & Authorization
```javascript
// Firebase Auth with Custom Claims
const setUserRole = async (uid: string, role: string, metadata?: any) => {
  await admin.auth().setCustomUserClaims(uid, {
    role: role,
    ...metadata
  });
};

// Role-based middleware
const requireRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }
      
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userRole = decodedToken.role || 'customer';
      
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      req.user = decodedToken;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };
};

// API Routes with role checks
app.get('/api/admin/stats', 
  requireRole(['master_admin']), 
  getGlobalStats
);

app.get('/api/manager/:managerId/trucks', 
  requireRole(['manager', 'master_admin']), 
  getManagerTrucks
);

app.get('/api/truck/:truckId/orders', 
  requireRole(['truck_owner', 'manager', 'master_admin']), 
  getTruckOrders
);
```

### Input Validation
```javascript
// Zod Schemas für Type-Safe Validation
import { z } from 'zod';

// Swiss Phone Number Validation
const swissPhoneNumber = z.string().regex(
  /^(\+41|0041|0)[1-9]\d{8}$/,
  'Ungültige Schweizer Telefonnummer'
);

// Order Validation
const CreateOrderSchema = z.object({
  truckId: z.string().min(1),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1).max(99),
    modifiers: z.array(z.string()).optional(),
    specialInstructions: z.string().max(200).optional()
  })).min(1).max(50), // Max 50 items per order
  customerName: z.string().min(2).max(50),
  customerPhone: swissPhoneNumber,
  customerEmail: z.string().email().optional(),
  scheduledFor: z.string().datetime().optional(),
  paymentMethodId: z.string().optional()
});

// Product Validation with Multilingual support
const ProductSchema = z.object({
  name: z.object({
    de: z.string().min(1),
    fr: z.string().min(1),
    it: z.string().min(1),
    en: z.string().min(1)
  }),
  description: z.object({
    de: z.string().max(500),
    fr: z.string().max(500),
    it: z.string().max(500),
    en: z.string().max(500)
  }),
  price: z.number().positive().max(1000), // Max 1000 CHF
  category: z.enum(['starters', 'mains', 'sides', 'drinks', 'desserts']),
  allergens: z.array(z.enum([
    'gluten', 'crustaceans', 'eggs', 'fish', 'peanuts',
    'soybeans', 'milk', 'nuts', 'celery', 'mustard',
    'sesame', 'sulphites', 'lupin', 'molluscs'
  ])),
  available: z.boolean(),
  originCountry: z.string().optional(), // Required for meat
  nutritionalInfo: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number()
  }).optional()
});

// Validation middleware
const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
      } else {
        next(error);
      }
    }
  };
};
```

### Rate Limiting & DDoS Protection
```javascript
// Rate limiting configuration
const rateLimiters = {
  // General API calls
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Zu viele Anfragen. Bitte später versuchen.',
        retryAfter: req.rateLimit.resetTime
      });
    }
  }),
  
  // Strict for auth endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // Only 5 auth attempts
    skipSuccessfulRequests: true
  }),
  
  // Orders (max 10 per minute per IP)
  orders: rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: (req) => {
      // Use IP + TruckId for better granularity
      return `${req.ip}-${req.params.truckId}`;
    }
  }),
  
  // Voice orders (expensive operation)
  voice: rateLimit({
    windowMs: 60 * 1000,
    max: 3 // Only 3 voice orders per minute
  })
};

// Apply rate limiters
app.use('/api/', rateLimiters.general);
app.use('/api/auth/', rateLimiters.auth);
app.use('/api/trucks/:truckId/orders', rateLimiters.orders);
app.use('/api/voice/', rateLimiters.voice);

// Additional DDoS protection
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.stripe.com', 'wss://']
    }
  }
}));
```

## 🌐 Internationalization

### i18n Setup with 4 Languages
```javascript
// i18n configuration
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation files
import de from './locales/de.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import en from './locales/en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: de },
      fr: { translation: fr },
      it: { translation: it },
      en: { translation: en }
    },
    fallbackLng: 'de', // German as default
    debug: false,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    }
  });

// Locale files structure
// de.json
{
  "common": {
    "welcome": "Willkommen",
    "order": "Bestellen",
    "cart": "Warenkorb",
    "checkout": "Zur Kasse",
    "total": "Total",
    "vat": "inkl. {{rate}}% MwSt",
    "allergens": "Allergene",
    "nutritionalInfo": "Nährwerte"
  },
  "products": {
    "burger": "Burger",
    "fries": "Pommes Frites",
    "drink": "Getränk",
    "available": "Verfügbar",
    "soldOut": "Ausverkauft",
    "origin": "Herkunft: {{country}}"
  },
  "order": {
    "number": "Bestellnummer",
    "ready": "Ihre Bestellung ist fertig!",
    "preparing": "Wird zubereitet...",
    "estimatedTime": "Geschätzte Wartezeit: {{minutes}} Minuten",
    "thankYou": "Vielen Dank für Ihre Bestellung!"
  },
  "payment": {
    "selectMethod": "Zahlungsmethode wählen",
    "card": "Kreditkarte",
    "twint": "TWINT",
    "processing": "Zahlung wird verarbeitet...",
    "success": "Zahlung erfolgreich",
    "addTip": "Trinkgeld hinzufügen",
    "tipAmount": "{{amount}} CHF Trinkgeld"
  },
  "voice": {
    "speak": "Sprechen Sie jetzt...",
    "listening": "Ich höre zu...",
    "processing": "Verstehe Ihre Bestellung...",
    "confirm": "Ist das richtig?",
    "examples": [
      "Ich hätte gerne einen Burger mit Pommes",
      "Zwei Cheeseburger ohne Zwiebeln",
      "Ein grosses Menü mit Cola"
    ]
  },
  "errors": {
    "general": "Etwas ist schiefgelaufen",
    "network": "Keine Internetverbindung",
    "payment": "Zahlung fehlgeschlagen",
    "outOfStock": "Dieses Produkt ist leider ausverkauft"
  }
}

// Component usage
const ProductCard = ({ product }) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  
  return (
    <div className="product-card">
      <h3>{product.name[currentLang]}</h3>
      <p>{product.description[currentLang]}</p>
      <p className="price">{formatPrice(product.price)} CHF</p>
      
      {product.allergens.length > 0 && (
        <div className="allergens">
          <strong>{t('common.allergens')}:</strong>
          {product.allergens.map(allergen => 
            <span key={allergen}>{t(`allergens.${allergen}`)}</span>
          )}
        </div>
      )}
      
      {product.originCountry && (
        <p className="origin">
          {t('products.origin', { country: product.originCountry })}
        </p>
      )}
      
      <button 
        onClick={() => addToCart(product)}
        disabled={!product.available}
      >
        {product.available ? t('common.order') : t('products.soldOut')}
      </button>
    </div>
  );
};
```

## 📊 Analytics & Monitoring

### Custom Analytics Events
```javascript
// Analytics Service
class AnalyticsService {
  constructor() {
    this.plausible = window.plausible || function() { 
      (window.plausible.q = window.plausible.q || []).push(arguments);
    };
  }
  
  // Track custom events
  trackEvent(eventName: string, props?: Record<string, any>) {
    this.plausible(eventName, { props });
    
    // Also send to Firebase Analytics for aggregation
    analytics.logEvent(eventName, props);
  }
  
  // E-commerce specific tracking
  trackOrder(order: Order) {
    // For Plausible
    this.trackEvent('Order Completed', {
      truck: order.truckId,
      amount: order.totalAmount,
      items: order.items.length,
      payment: order.paymentMethod,
      dailyOrderNumber: order.dailyOrderNumber
    });
    
    // For Firebase (more detailed)
    analytics.logEvent('purchase', {
      transaction_id: order.id,
      value: order.totalAmount / 100, // Convert from Rappen
      currency: 'CHF',
      items: order.items.map(item => ({
        item_id: item.productId,
        item_name: item.productName,
        quantity: item.quantity,
        price: item.price / 100
      }))
    });
  }
  
  // Conversion funnel tracking
  trackConversion(step: string, metadata?: any) {
    const steps = [
      'menu_viewed',
      'product_clicked', 
      'added_to_cart',
      'checkout_started',
      'payment_selected',
      'order_completed'
    ];
    
    this.trackEvent('Conversion Step', {
      step,
      stepIndex: steps.indexOf(step),
      ...metadata
    });
  }
  
  // Voice order tracking
  trackVoiceOrder(success: boolean, language: string, confidence: number) {
    this.trackEvent('Voice Order', {
      success,
      language,
      confidence: Math.round(confidence * 100),
      dialect: language.includes('CH') ? 'swiss-german' : 'standard'
    });
  }
  
  // Performance tracking
  trackPerformance() {
    if ('performance' in window) {
      const perfData = performance.getEntriesByType('navigation')[0];
      
      this.trackEvent('Performance', {
        loadTime: Math.round(perfData.loadEventEnd - perfData.loadEventStart),
        domReady: Math.round(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart),
        firstPaint: Math.round(performance.getEntriesByName('first-paint')[0]?.startTime || 0)
      });
    }
  }
}

// Error tracking with Sentry
Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  tracesSampleRate: isProduction ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event, hint) {
    // Filter out known issues
    if (event.exception) {
      const error = hint.originalException;
      // Don't send network errors in offline mode
      if (navigator.onLine === false) {
        return null;
      }
    }
    return event;
  },
  environment: process.env.NODE_ENV,
});

// Real-time monitoring dashboard
const MonitoringDashboard = () => {
  const [metrics, setMetrics] = useState({
    activeOrders: 0,
    ordersPerMinute: 0,
    avgResponseTime: 0,
    errorRate: 0,
    activeUsers: 0
  });
  
  useEffect(() => {
    // Subscribe to real-time metrics
    const unsubscribe = db
      .collection('analytics_realtime')
      .doc('global')
      .onSnapshot((doc) => {
        setMetrics(doc.data());
      });
      
    return unsubscribe;
  }, []);
  
  return (
    <div className="grid grid-cols-5 gap-4">
      <MetricCard
        title="Aktive Bestellungen"
        value={metrics.activeOrders}
        icon={<ShoppingCartIcon />}
      />
      <MetricCard
        title="Bestellungen/Min"
        value={metrics.ordersPerMinute}
        trend={calculateTrend(metrics.ordersPerMinute)}
      />
      <MetricCard
        title="Ø Response Time"
        value={`${metrics.avgResponseTime}ms`}
        status={metrics.avgResponseTime < 300 ? 'good' : 'warning'}
      />
      <MetricCard
        title="Error Rate"
        value={`${metrics.errorRate}%`}
        status={metrics.errorRate < 1 ? 'good' : 'error'}
      />
      <MetricCard
        title="Aktive Nutzer"
        value={metrics.activeUsers}
        sparkline={metrics.userHistory}
      />
    </div>
  );
};
```

## 🚦 System Health Checks

```javascript
// Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION
  });
});

app.get('/health/detailed', requireRole(['master_admin']), async (req, res) => {
  const checks = await Promise.all([
    checkDatabase(),
    checkStripe(),
    checkOpenAI(),
    checkStorage()
  ]);
  
  const overall = checks.every(c => c.status === 'healthy') ? 'healthy' : 'degraded';
  
  res.json({
    status: overall,
    checks: checks,
    metrics: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    }
  });
});

// Automated health monitoring
const healthMonitor = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    const services = [
      { name: 'firestore', check: checkFirestore },
      { name: 'stripe', check: checkStripe },
      { name: 'openai', check: checkOpenAI },
      { name: 'storage', check: checkStorage }
    ];
    
    for (const service of services) {
      try {
        await service.check();
      } catch (error) {
        // Alert Master Admin
        await sendAlert({
          type: 'SERVICE_DOWN',
          service: service.name,
          error: error.message,
          severity: 'critical'
        });
      }
    }
  });
```

---

**Das ist die komplette technische Implementierung mit ALLEN Details aus unserer Diskussion!**
