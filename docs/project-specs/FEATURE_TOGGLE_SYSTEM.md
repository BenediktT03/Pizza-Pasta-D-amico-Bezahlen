# 🎛️ EATECH Feature Toggle System

## 🔧 Master-Admin Control Panel

Als Master-Admin (Benedikt) kannst du JEDE Funktion und Unterfunktion an-/abschalten!

## 📊 Feature-Toggle-Architektur

```typescript
interface FeatureToggle {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: FeatureCategory;
  dependencies?: string[]; // Andere Features die aktiv sein müssen
  subFeatures?: SubFeature[];
  rolloutPercentage?: number; // Für A/B Testing
  enabledForTrucks?: string[]; // Spezifische Trucks
  config?: any; // Feature-spezifische Konfiguration
}

interface SubFeature {
  id: string;
  name: string;
  enabled: boolean;
  config?: any;
}

enum FeatureCategory {
  ORDERING = 'ordering',
  PAYMENT = 'payment',
  KITCHEN = 'kitchen',
  AI = 'ai',
  ANALYTICS = 'analytics',
  COMMUNICATION = 'communication',
  COMPLIANCE = 'compliance',
  BRANDING = 'branding'
}
```

## 🎯 Alle Features mit Toggle-Kontrolle

### 📱 ORDERING (Bestellsystem)
```javascript
{
  id: 'ordering',
  name: 'Bestellsystem',
  enabled: true,
  subFeatures: [
    {
      id: 'qr_ordering',
      name: 'QR-Code Bestellung',
      enabled: true
    },
    {
      id: 'voice_ordering',
      name: 'Voice Bestellung',
      enabled: true,
      config: {
        languages: ['de', 'de-CH', 'fr', 'it', 'en'],
        maxDuration: 60, // Sekunden
        autoConfirm: false
      }
    },
    {
      id: 'preordering',
      name: 'Vorbestellungen',
      enabled: true,
      config: {
        maxDaysInAdvance: 1,
        requiresDeposit: false
      }
    },
    {
      id: 'order_modifications',
      name: 'Bestell-Modifikationen',
      enabled: true,
      config: {
        allowSpecialInstructions: true,
        maxInstructionLength: 200
      }
    },
    {
      id: 'multi_language_menu',
      name: 'Mehrsprachige Menüs',
      enabled: true,
      config: {
        languages: ['de', 'fr', 'it', 'en'],
        autoTranslate: true
      }
    }
  ]
}
```

### 💳 PAYMENT (Zahlungssystem)
```javascript
{
  id: 'payment',
  name: 'Zahlungssystem',
  enabled: true,
  subFeatures: [
    {
      id: 'stripe_payment',
      name: 'Stripe Integration',
      enabled: true,
      config: {
        methods: ['card', 'twint'],
        requiresCVV: true
      }
    },
    {
      id: 'platform_fee',
      name: 'Plattformgebühr',
      enabled: true,
      config: {
        percentage: 3,
        trialDays: 90,
        trialPercentage: 0
      }
    },
    {
      id: 'tipping',
      name: 'Trinkgeld',
      enabled: true,
      config: {
        suggestions: [5, 10, 15], // Prozent
        platformCut: 3, // 3% auch vom Trinkgeld
        allowCustom: true
      }
    },
    {
      id: 'instant_payout',
      name: 'Sofort-Auszahlung',
      enabled: true
    },
    {
      id: 'crypto_payment',
      name: 'Krypto-Zahlung',
      enabled: false, // Vorbereitet aber aus
      config: {
        currencies: ['BTC', 'ETH']
      }
    }
  ]
}
```

### 🍔 KITCHEN (Küchen-Management)
```javascript
{
  id: 'kitchen',
  name: 'Küchen-Management',
  enabled: true,
  subFeatures: [
    {
      id: 'kitchen_display',
      name: 'Kitchen Display',
      enabled: true,
      config: {
        autoAccept: false,
        soundAlerts: true
      }
    },
    {
      id: 'order_numbers',
      name: 'Bestellnummern',
      enabled: true,
      config: {
        dailyStart: 100,
        resetDaily: true,
        continueAfter999: true
      }
    },
    {
      id: 'voice_announcements',
      name: 'Sprachansagen',
      enabled: true,
      config: {
        languages: ['de', 'fr', 'it', 'en'],
        volume: 70,
        voices: ['male', 'female', 'fun']
      }
    },
    {
      id: 'pickup_alerts',
      name: 'Abhol-Erinnerungen',
      enabled: true,
      config: {
        firstReminder: 5, // Minuten
        repeatInterval: 3
      }
    }
  ]
}
```

### 🤖 AI (Künstliche Intelligenz)
```javascript
{
  id: 'ai',
  name: 'KI-Features',
  enabled: true,
  subFeatures: [
    {
      id: 'voice_recognition',
      name: 'Spracherkennung',
      enabled: true,
      config: {
        model: 'whisper-1',
        dialects: ['schweizerdeutsch']
      }
    },
    {
      id: 'chatbot',
      name: 'Chat-Assistent',
      enabled: true,
      config: {
        model: 'gpt-4',
        capabilities: ['questions', 'complaints', 'nutrition'],
        noSmallTalk: true
      }
    },
    {
      id: 'dynamic_pricing',
      name: 'Dynamische Preise',
      enabled: true,
      config: {
        maxIncrease: 20, // Prozent
        maxDecrease: 10,
        factors: ['time', 'demand', 'events'],
        psychology: true // .90 statt .00
      }
    },
    {
      id: 'demand_prediction',
      name: 'Bedarfsvorhersage',
      enabled: true,
      config: {
        daysAhead: 1,
        includeWeather: true,
        includeEvents: true
      }
    },
    {
      id: 'rush_hour_management',
      name: 'Rush-Hour KI',
      enabled: true,
      config: {
        autoAdjustTimes: true,
        preWarning: 30 // Minuten
      }
    },
    {
      id: 'smart_notifications',
      name: 'Intelligente Benachrichtigungen',
      enabled: true,
      config: {
        types: ['favorites', 'nearby', 'personal']
      }
    }
  ]
}
```

### 📊 ANALYTICS (Statistiken)
```javascript
{
  id: 'analytics',
  name: 'Analytics & Reports',
  enabled: true,
  subFeatures: [
    {
      id: 'realtime_dashboard',
      name: 'Echtzeit-Dashboard',
      enabled: true
    },
    {
      id: 'revenue_tracking',
      name: 'Umsatz-Tracking',
      enabled: true
    },
    {
      id: 'product_analytics',
      name: 'Produkt-Statistiken',
      enabled: true,
      config: {
        trackCombinations: true,
        trackTimes: true
      }
    },
    {
      id: 'customer_insights',
      name: 'Kunden-Einblicke',
      enabled: true,
      config: {
        anonymized: true,
        retentionDays: 30
      }
    },
    {
      id: 'ai_insights',
      name: 'KI-Insights',
      enabled: true
    },
    {
      id: 'export_reports',
      name: 'Report-Export',
      enabled: true,
      config: {
        formats: ['pdf', 'excel', 'csv'],
        accounting: ['bexio', 'abacus', 'sap']
      }
    }
  ]
}
```

### 📢 COMMUNICATION (Kommunikation)
```javascript
{
  id: 'communication',
  name: 'Kommunikation',
  enabled: true,
  subFeatures: [
    {
      id: 'push_notifications',
      name: 'Push-Benachrichtigungen',
      enabled: true,
      config: {
        types: ['order_ready', 'truck_nearby', 'smart']
      }
    },
    {
      id: 'email_notifications',
      name: 'E-Mail-Benachrichtigungen',
      enabled: true
    },
    {
      id: 'sms_notifications',
      name: 'SMS-Benachrichtigungen',
      enabled: false, // Vorbereitet aber aus
      config: {
        provider: 'twilio'
      }
    },
    {
      id: 'voice_feedback',
      name: 'Voice-Feedback',
      enabled: true,
      config: {
        trigger: 'hey_siri'
      }
    },
    {
      id: 'escalation_system',
      name: 'Eskalations-System',
      enabled: true,
      config: {
        steps: [
          { minutes: 0, action: 'push' },
          { minutes: 10, action: 'sms' },
          { minutes: 20, action: 'admin_alert' }
        ]
      }
    }
  ]
}
```

### 🌡️ COMPLIANCE (HACCP & Rechtliches)
```javascript
{
  id: 'compliance',
  name: 'Compliance & HACCP',
  enabled: true,
  subFeatures: [
    {
      id: 'temperature_monitoring',
      name: 'Temperatur-Überwachung',
      enabled: true,
      config: {
        interval: 15, // Minuten
        sensors: ['testo', 'haccp24'],
        thresholds: {
          fridge: { min: 2, max: 5 },
          freezer: { min: -20, max: -18 }
        }
      }
    },
    {
      id: 'cleaning_plans',
      name: 'Reinigungspläne',
      enabled: true,
      config: {
        types: ['daily', 'weekly', 'monthly'],
        signature: ['pin', 'fingerprint']
      }
    },
    {
      id: 'allergen_management',
      name: 'Allergen-Verwaltung',
      enabled: true,
      config: {
        allergens: 14, // EU Standard
        autoCalculate: true,
        showOrigin: true // Fleisch-Herkunft
      }
    },
    {
      id: 'documentation',
      name: 'Dokumentation',
      enabled: true,
      config: {
        retention: 730, // Tage (2 Jahre)
        formats: ['pdf', 'excel']
      }
    }
  ]
}
```

### 🎨 BRANDING (Design & Anpassung)
```javascript
{
  id: 'branding',
  name: 'Branding & Design',
  enabled: true,
  subFeatures: [
    {
      id: 'theme_system',
      name: 'Theme-System',
      enabled: true,
      config: {
        presets: ['swiss_fire', 'midnight', 'fresh', 'neon', 'craft'],
        customAllowed: true
      }
    },
    {
      id: 'whitelabel',
      name: 'Whitelabel',
      enabled: false, // Kostet extra
      config: {
        customDomain: true,
        removeBranding: true
      }
    },
    {
      id: 'menu_designer',
      name: 'Karten-Designer',
      enabled: true,
      config: {
        templates: ['classic', 'modern', 'festival'],
        dragDrop: true,
        autoPrint: true
      }
    },
    {
      id: 'qr_customization',
      name: 'QR-Code Anpassung',
      enabled: true,
      config: {
        logo: true,
        colors: true,
        position: 'flexible'
      }
    }
  ]
}
```

### 🎪 EVENTS (Veranstaltungen)
```javascript
{
  id: 'events',
  name: 'Event-System',
  enabled: true,
  subFeatures: [
    {
      id: 'festival_mode',
      name: 'Festival-Modus',
      enabled: true,
      config: {
        multiTruckView: true,
        sharedLanding: true
      }
    },
    {
      id: 'event_pricing',
      name: 'Event-Preise',
      enabled: true,
      config: {
        models: ['percentage', 'flat_fee'],
        commission: 'flexible'
      }
    },
    {
      id: 'event_analytics',
      name: 'Event-Statistiken',
      enabled: true
    }
  ]
}
```

### 🔧 SYSTEM (System-Features)
```javascript
{
  id: 'system',
  name: 'System-Features',
  enabled: true,
  subFeatures: [
    {
      id: 'offline_mode',
      name: 'Offline-Modus',
      enabled: true,
      config: {
        syncInterval: 30, // Sekunden
        maxOfflineOrders: 100
      }
    },
    {
      id: 'sandbox_mode',
      name: 'Sandbox-Umgebung',
      enabled: true,
      config: {
        availableFor: ['admin', 'manager', 'truck']
      }
    },
    {
      id: 'predictive_maintenance',
      name: 'Wartungsvorhersage',
      enabled: true
    },
    {
      id: 'community_features',
      name: 'Community',
      enabled: true,
      config: {
        following: true,
        externalReviews: true, // Google Maps etc.
        internalReviews: false
      }
    },
    {
      id: 'ticket_system',
      name: 'Ticket-System',
      enabled: true,
      config: {
        aiRouting: true,
        priorities: ['critical', 'high', 'normal']
      }
    },
    {
      id: 'inventory_tracking',
      name: 'Lager-Verwaltung',
      enabled: true,
      config: {
        autoDeduct: true,
        lowStockAlerts: true
      }
    }
  ]
}
```

## 🎮 Master-Admin Dashboard UI

```typescript
// Feature Toggle Dashboard Component
const FeatureToggleDashboard = () => {
  const [features, setFeatures] = useState<FeatureToggle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FeatureCategory | 'all'>('all');
  
  const toggleFeature = async (featureId: string, enabled: boolean) => {
    // Check dependencies
    if (enabled) {
      const feature = features.find(f => f.id === featureId);
      if (feature?.dependencies) {
        const unmetDeps = feature.dependencies.filter(
          dep => !features.find(f => f.id === dep)?.enabled
        );
        if (unmetDeps.length > 0) {
          showWarning(`Abhängigkeiten müssen aktiviert sein: ${unmetDeps.join(', ')}`);
          return;
        }
      }
    }
    
    // Update in Firestore
    await updateFeatureToggle(featureId, { enabled });
    
    // Real-time update for all apps
    broadcastFeatureUpdate(featureId, enabled);
  };
  
  const toggleSubFeature = async (
    featureId: string, 
    subFeatureId: string, 
    enabled: boolean
  ) => {
    await updateSubFeatureToggle(featureId, subFeatureId, { enabled });
  };
  
  const applyToSpecificTrucks = async (
    featureId: string, 
    truckIds: string[]
  ) => {
    await updateFeatureToggle(featureId, { enabledForTrucks: truckIds });
  };
  
  const setRolloutPercentage = async (
    featureId: string, 
    percentage: number
  ) => {
    await updateFeatureToggle(featureId, { rolloutPercentage: percentage });
  };
  
  return (
    <div className="feature-toggle-dashboard">
      <h1>🎛️ Feature Control Center</h1>
      
      {/* Search & Filter */}
      <div className="controls">
        <SearchInput 
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Feature suchen..."
        />
        
        <CategoryFilter
          selected={selectedCategory}
          onChange={setSelectedCategory}
        />
      </div>
      
      {/* Feature Grid */}
      <div className="feature-grid">
        {filteredFeatures.map(feature => (
          <FeatureCard key={feature.id}>
            <div className="feature-header">
              <h3>{feature.name}</h3>
              <MasterToggle
                checked={feature.enabled}
                onChange={(enabled) => toggleFeature(feature.id, enabled)}
              />
            </div>
            
            <p className="description">{feature.description}</p>
            
            {/* A/B Testing */}
            {feature.rolloutPercentage !== undefined && (
              <RolloutSlider
                value={feature.rolloutPercentage}
                onChange={(pct) => setRolloutPercentage(feature.id, pct)}
              />
            )}
            
            {/* Truck-specific */}
            <TruckSelector
              selectedTrucks={feature.enabledForTrucks || []}
              onChange={(trucks) => applyToSpecificTrucks(feature.id, trucks)}
            />
            
            {/* Sub-features */}
            {feature.subFeatures && (
              <div className="sub-features">
                {feature.subFeatures.map(sub => (
                  <SubFeatureRow key={sub.id}>
                    <span>{sub.name}</span>
                    <Toggle
                      checked={sub.enabled}
                      onChange={(enabled) => 
                        toggleSubFeature(feature.id, sub.id, enabled)
                      }
                      disabled={!feature.enabled}
                    />
                    {sub.config && (
                      <ConfigButton
                        onClick={() => openConfigModal(feature.id, sub.id)}
                      />
                    )}
                  </SubFeatureRow>
                ))}
              </div>
            )}
            
            {/* Feature Config */}
            {feature.config && (
              <ConfigSection
                config={feature.config}
                onChange={(newConfig) => 
                  updateFeatureConfig(feature.id, newConfig)
                }
              />
            )}
          </FeatureCard>
        ))}
      </div>
      
      {/* Quick Actions */}
      <QuickActions>
        <button onClick={enableAllEssentials}>
          Alle Essentials aktivieren
        </button>
        <button onClick={disableAllAI}>
          Alle KI-Features deaktivieren
        </button>
        <button onClick={exportConfig}>
          Konfiguration exportieren
        </button>
      </QuickActions>
    </div>
  );
};
```

## 🔌 Feature-Toggle Integration

```typescript
// In jeder App
const useFeature = (featureId: string, subFeatureId?: string) => {
  const [enabled, setEnabled] = useState(false);
  const [config, setConfig] = useState<any>({});
  
  useEffect(() => {
    // Real-time subscription
    const unsubscribe = subscribeToFeature(
      featureId, 
      subFeatureId,
      (feature) => {
        setEnabled(feature.enabled);
        setConfig(feature.config || {});
      }
    );
    
    return unsubscribe;
  }, [featureId, subFeatureId]);
  
  return { enabled, config };
};

// Verwendung
const VoiceOrderButton = () => {
  const { enabled, config } = useFeature('ordering', 'voice_ordering');
  
  if (!enabled) return null;
  
  return (
    <button onClick={() => startVoiceOrder(config)}>
      🎤 Sprachbestellung
    </button>
  );
};
```

## 🚨 Feature-Abhängigkeiten

```javascript
const featureDependencies = {
  'voice_ordering': ['ai.voice_recognition'],
  'dynamic_pricing': ['ai.chatbot'],
  'smart_notifications': ['analytics.customer_insights'],
  'predictive_maintenance': ['analytics.product_analytics'],
  'whitelabel': ['branding.theme_system']
};
```

## 📊 Feature-Usage-Tracking

```javascript
// Automatisches Tracking welche Features genutzt werden
const trackFeatureUsage = async (featureId: string, subFeatureId?: string) => {
  await analytics.logEvent('feature_used', {
    feature: featureId,
    subFeature: subFeatureId,
    truck: currentTruck.id,
    timestamp: new Date()
  });
};
```

---

**Mit diesem System hast du VOLLE KONTROLLE über JEDE einzelne Funktion! 🎛️👑**
