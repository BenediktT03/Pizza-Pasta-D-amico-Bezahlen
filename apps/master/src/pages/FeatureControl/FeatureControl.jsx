/**
 * EATECH - Feature Control System
 * Version: 1.0.0
 * Description: Zentrales Feature Management mit hierarchischer Kontrolle,
 *              Test-Modus, Audit Trail und Emergency Controls
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * 
 * Kapitel: Phase 5 - Premium & Master - Feature Flags
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  onValue, 
  update,
  set,
  push,
  serverTimestamp,
  off,
  query,
  orderByChild,
  limitToLast
} from 'firebase/database';
import {
  Search,
  Shield,
  Zap,
  Brain,
  TrendingUp,
  Package,
  Users,
  Leaf,
  Truck,
  Settings,
  Filter,
  ChevronRight,
  Power,
  AlertCircle,
  CheckCircle2,
  Info,
  Download,
  Upload,
  RefreshCw,
  Save,
  X,
  BarChart3,
  Clock,
  Globe,
  Lock,
  Unlock,
  Copy,
  Edit,
  Trash2,
  Plus,
  Activity,
  Bell,
  DollarSign,
  Heart,
  MessageSquare,
  ShoppingCart,
  Utensils,
  Coffee,
  Timer,
  Map,
  Calendar,
  Award,
  Gift,
  Star,
  Navigation,
  Smartphone,
  Monitor,
  Server,
  Database,
  Cpu,
  AlertTriangle,
  XCircle,
  PlayCircle,
  PauseCircle,
  Eye,
  EyeOff,
  HelpCircle,
  BookOpen,
  Video,
  FileText,
  Code,
  Terminal,
  Bug,
  TestTube,
  FlaskConical,
  Beaker,
  History,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Hash,
  Percent,
  BarChart,
  PieChart,
  TrendingDown,
  Wallet,
  CreditCard,
  Banknote,
  Receipt,
  Calculator,
  Layers,
  Grid,
  List,
  LayoutGrid,
  Columns,
  UserCheck,
  UserX,
  UserPlus,
  Building,
  Store,
  MapPin,
  Compass,
  Flag,
  Megaphone,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Signal,
  SignalLow,
  Battery,
  BatteryLow,
  Gauge,
  Loader2,
  CheckSquare,
  Square,
  ToggleLeft,
  ToggleRight,
  SlidersHorizontal,
  Wrench,
  Hammer,
  Sparkles,
  Flame,
  Snowflake,
  Sun,
  Moon,
  Cloud,
  CloudRain,
  Wind,
  Thermometer,
  Droplets,
  Waves,
  Mountain,
  Trees,
  Flower,
  Pizza,
  Soup,
  Cookie,
  Apple,
  Carrot,
  Fish,
  Milk,
  Wheat,
  Grape,
  Cherry
} from 'lucide-react';
import styles from './FeatureControl.module.css';

// ============================================================================
// FIREBASE CONFIGURATION
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmU",
  authDomain: "eatech-foodtruck.firebaseapp.com",
  databaseURL: "https://eatech-foodtruck-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "eatech-foodtruck",
  storageBucket: "eatech-foodtruck.firebasestorage.app",
  messagingSenderId: "261222802445",
  appId: "1:261222802445:web:edde22580422fbced22144",
  measurementId: "G-N0KHWJG9KP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ============================================================================
// CONSTANTS
// ============================================================================

// Feature Categories
const FEATURE_CATEGORIES = {
  core: { 
    id: 'core', 
    name: 'Kern-System', 
    icon: Shield, 
    color: '#FF6B6B',
    description: 'Essenzielle Grundfunktionen'
  },
  ordering: { 
    id: 'ordering', 
    name: 'Bestellung', 
    icon: ShoppingCart, 
    color: '#4ECDC4',
    description: 'Bestell- und Checkout-Prozess'
  },
  payment: { 
    id: 'payment', 
    name: 'Zahlung', 
    icon: CreditCard, 
    color: '#45B7D1',
    description: 'Zahlungsmethoden und Abwicklung'
  },
  menu: { 
    id: 'menu', 
    name: 'Speisekarte', 
    icon: Utensils, 
    color: '#96CEB4',
    description: 'Menü-Verwaltung und Darstellung'
  },
  customer: { 
    id: 'customer', 
    name: 'Kunden', 
    icon: Users, 
    color: '#FECA57',
    description: 'Kundenverwaltung und Profile'
  },
  analytics: { 
    id: 'analytics', 
    name: 'Analytics', 
    icon: BarChart3, 
    color: '#FF6B9D',
    description: 'Berichte und Auswertungen'
  },
  marketing: { 
    id: 'marketing', 
    name: 'Marketing', 
    icon: Megaphone, 
    color: '#C44569',
    description: 'Promotions und Kampagnen'
  },
  ai: { 
    id: 'ai', 
    name: 'KI & ML', 
    icon: Brain, 
    color: '#786FA6',
    description: 'Künstliche Intelligenz Features'
  },
  loyalty: { 
    id: 'loyalty', 
    name: 'Treue', 
    icon: Heart, 
    color: '#F8B500',
    description: 'Punkte und Belohnungen'
  },
  notification: { 
    id: 'notification', 
    name: 'Benachrichtigungen', 
    icon: Bell, 
    color: '#303952',
    description: 'Push, Email, SMS'
  },
  location: { 
    id: 'location', 
    name: 'Standort', 
    icon: MapPin, 
    color: '#00B894',
    description: 'GPS und Standort-Features'
  },
  events: { 
    id: 'events', 
    name: 'Events', 
    icon: Calendar, 
    color: '#6C5CE7',
    description: 'Festival und Event-Modus'
  },
  compliance: { 
    id: 'compliance', 
    name: 'Compliance', 
    icon: Shield, 
    color: '#636E72',
    description: 'Rechtliche Anforderungen'
  },
  performance: { 
    id: 'performance', 
    name: 'Performance', 
    icon: Gauge, 
    color: '#FD79A8',
    description: 'Optimierung und Caching'
  },
  security: { 
    id: 'security', 
    name: 'Sicherheit', 
    icon: Lock, 
    color: '#2D3436',
    description: 'Erweiterte Sicherheit'
  },
  experimental: { 
    id: 'experimental', 
    name: 'Experimental', 
    icon: FlaskConical, 
    color: '#A29BFE',
    description: 'Beta und Test-Features'
  }
};

// Default Features für neue Tenants
const DEFAULT_FEATURES = {
  // Core (Immer aktiv)
  "core.authentication": true,
  "core.ordering": true,
  "core.menu": true,
  "core.multiTenant": true,
  
  // Basis-Features
  "payment.basic": true,
  "payment.cash": true,
  "notifications.orders": true,
  "analytics.basic": true,
  "customer.profiles": true,
  "menu.categories": true,
  "menu.search": true,
  "ordering.cart": true,
  "ordering.checkout": true,
  
  // Trial Features (30 Tage)
  "analytics.advanced": { trial: true, days: 30 },
  "ai.recommendations": { trial: true, days: 30 },
  "loyalty.program": { trial: true, days: 30 },
  "marketing.campaigns": { trial: true, days: 30 }
};

// Emergency Priority Levels
const EMERGENCY_PRIORITIES = {
  1: { // KRITISCH - Bleiben immer an
    features: ['core.*', 'payment.basic', 'ordering.checkout'],
    label: 'Kritisch',
    color: '#FF6B6B'
  },
  2: { // WICHTIG - Nur bei extremer Last aus
    features: ['analytics.*', 'ai.*', 'notifications.marketing'],
    label: 'Wichtig',
    color: '#F39C12'
  },
  3: { // NICE-TO-HAVE - Zuerst abschalten
    features: ['loyalty.*', 'marketing.*', 'experimental.*'],
    label: 'Optional',
    color: '#95A5A6'
  }
};

// Feature Templates
const FEATURE_TEMPLATES = {
  minimal: {
    name: 'Minimal',
    description: 'Nur essenzielle Features',
    features: ['core.*', 'payment.basic', 'ordering.*', 'menu.basic']
  },
  standard: {
    name: 'Standard',
    description: 'Normale Restaurant-Features',
    features: ['core.*', 'payment.*', 'ordering.*', 'menu.*', 'customer.*', 'analytics.basic']
  },
  foodtruck: {
    name: 'Foodtruck',
    description: 'Mobile-optimiert mit Standort',
    features: ['core.*', 'payment.*', 'ordering.*', 'menu.*', 'location.*', 'notifications.*']
  },
  event: {
    name: 'Event/Festival',
    description: 'Optimiert für hohe Last',
    features: ['core.*', 'payment.basic', 'ordering.express', 'events.*', 'performance.*']
  },
  premium: {
    name: 'Premium',
    description: 'Alle Features aktiviert',
    features: ['*']
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const FeatureControl = () => {
  // State Management
  const [features, setFeatures] = useState({});
  const [tenants, setTenants] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: 0,
    memory: 0,
    responseTime: 0,
    errorRate: 0
  });
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showTestMode, setShowTestMode] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showEmergencyPanel, setShowEmergencyPanel] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid | list | compact
  const [selectedFeatures, setSelectedFeatures] = useState(new Set());
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [editingFeature, setEditingFeature] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  
  // ========================================================================
  // FIREBASE LISTENERS
  // ========================================================================
  useEffect(() => {
    const featuresRef = ref(database, 'features');
    const tenantsRef = ref(database, 'tenants');
    const auditRef = query(ref(database, 'featureAudit'), orderByChild('timestamp'), limitToLast(100));
    const metricsRef = ref(database, 'systemMetrics/current');

    // Load features
    const featuresUnsubscribe = onValue(featuresRef, (snapshot) => {
      const data = snapshot.val() || {};
      setFeatures(data);
    });

    // Load tenants
    const tenantsUnsubscribe = onValue(tenantsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const tenantsList = Object.entries(data).map(([id, tenant]) => ({
        id,
        ...tenant
      }));
      setTenants(tenantsList);
    });

    // Load audit log
    const auditUnsubscribe = onValue(auditRef, (snapshot) => {
      const data = snapshot.val() || {};
      const logs = Object.entries(data).map(([id, log]) => ({
        id,
        ...log
      })).reverse();
      setAuditLog(logs);
    });

    // Load system metrics
    const metricsUnsubscribe = onValue(metricsRef, (snapshot) => {
      const data = snapshot.val() || {};
      setSystemMetrics(data);
      
      // Auto-trigger emergency mode if needed
      checkEmergencyConditions(data);
    });

    setLoading(false);

    // Cleanup
    return () => {
      off(featuresRef);
      off(tenantsRef);
      off(auditRef);
      off(metricsRef);
    };
  }, []);

  // ========================================================================
  // EMERGENCY SYSTEM
  // ========================================================================
  const checkEmergencyConditions = (metrics) => {
    // CPU > 90% für 5min
    if (metrics.cpu > 90 && metrics.cpuHighDuration > 300) {
      triggerEmergencyMode(3); // Disable Priority 3 features
    }
    
    // Memory > 85%
    if (metrics.memory > 85) {
      disableFeaturesByPattern(['ai.*']);
    }
    
    // Payment Errors > 5%
    if (metrics.paymentErrorRate > 5) {
      enableFallbackPayment();
    }
    
    // Response Time > 3s
    if (metrics.responseTime > 3000) {
      pauseAnalytics();
    }
  };

  const triggerEmergencyMode = async (priority) => {
    const featuresToDisable = EMERGENCY_PRIORITIES[priority].features;
    
    try {
      const updates = {};
      
      Object.keys(features).forEach(featureKey => {
        if (matchesPattern(featureKey, featuresToDisable)) {
          updates[`features/${featureKey}/masterControl/emergencyDisabled`] = true;
          updates[`features/${featureKey}/masterControl/globalEnabled`] = false;
        }
      });
      
      await update(ref(database), updates);
      
      // Log emergency action
      await logAuditEntry({
        action: 'emergency.triggered',
        priority,
        reason: 'System overload',
        featuresAffected: Object.keys(updates).length,
        automatic: true
      });
      
      // Send notification
      sendEmergencyNotification(`Emergency Mode aktiviert: Priority ${priority} Features deaktiviert`);
      
    } catch (error) {
      console.error('Emergency mode failed:', error);
    }
  };

  // ========================================================================
  // FEATURE MANAGEMENT
  // ========================================================================
  const toggleFeature = async (featureKey, enabled, tenantId = null) => {
    try {
      const path = tenantId 
        ? `features/${featureKey}/tenantControl/${tenantId}/enabled`
        : `features/${featureKey}/masterControl/globalEnabled`;
      
      await set(ref(database, path), enabled);
      
      // Check dependencies
      if (!enabled) {
        await checkAndDisableDependentFeatures(featureKey, tenantId);
      }
      
      // Log change
      await logAuditEntry({
        action: enabled ? 'feature.enabled' : 'feature.disabled',
        feature: featureKey,
        tenant: tenantId,
        changedBy: 'master',
        previousState: !enabled,
        newState: enabled
      });
      
    } catch (error) {
      console.error('Error toggling feature:', error);
    }
  };

  const checkAndDisableDependentFeatures = async (featureKey, tenantId) => {
    const dependentFeatures = Object.entries(features).filter(([key, feature]) => 
      feature.dependencies?.includes(featureKey)
    );
    
    if (dependentFeatures.length > 0) {
      const confirmDisable = window.confirm(
        `Die folgenden Features hängen von ${featureKey} ab und werden auch deaktiviert:\n\n` +
        dependentFeatures.map(([key]) => `- ${key}`).join('\n') +
        '\n\nFortfahren?'
      );
      
      if (confirmDisable) {
        for (const [depKey] of dependentFeatures) {
          await toggleFeature(depKey, false, tenantId);
        }
      }
    }
  };

  // ========================================================================
  // BATCH OPERATIONS
  // ========================================================================
  const applyBatchOperation = async (operation) => {
    const { action, features, tenants, condition } = operation;
    
    try {
      const updates = {};
      const affectedCount = { features: 0, tenants: 0 };
      
      // Filter tenants based on condition
      const targetTenants = tenants === 'all' 
        ? this.tenants 
        : tenants === 'conditional'
          ? this.tenants.filter(t => evaluateCondition(t, condition))
          : this.tenants.filter(t => tenants.includes(t.id));
      
      // Apply operation
      for (const tenant of targetTenants) {
        for (const featureKey of features) {
          if (matchesPattern(featureKey, Object.keys(this.features))) {
            const path = `features/${featureKey}/tenantControl/${tenant.id}/enabled`;
            updates[path] = action === 'enable';
            affectedCount.features++;
          }
        }
        affectedCount.tenants++;
      }
      
      // Execute updates
      await update(ref(database), updates);
      
      // Log batch operation
      await logAuditEntry({
        action: 'batch.operation',
        operation: action,
        affectedFeatures: affectedCount.features,
        affectedTenants: affectedCount.tenants,
        condition: condition || 'none'
      });
      
      alert(`Batch-Operation erfolgreich: ${affectedCount.features} Features bei ${affectedCount.tenants} Tenants ${action === 'enable' ? 'aktiviert' : 'deaktiviert'}`);
      
    } catch (error) {
      console.error('Batch operation failed:', error);
      alert('Fehler bei Batch-Operation');
    }
  };

  // ========================================================================
  // TEST MODE
  // ========================================================================
  const createTestEnvironment = async (tenantId) => {
    try {
      const testTenantId = `test-${tenantId || 'master'}-${Date.now()}`;
      const testFoodtruckId = `truck-test-${Date.now()}`;
      
      // Create test tenant
      await set(ref(database, `tenants/${testTenantId}`), {
        name: `Test Environment - ${tenantId || 'Master'}`,
        isTestMode: true,
        parentTenant: tenantId,
        created: serverTimestamp(),
        config: {
          noRealTransactions: true,
          autoCleanup: 'daily',
          sandboxMode: true
        }
      });
      
      // Create test foodtruck
      await set(ref(database, `foodtrucks/${testFoodtruckId}`), {
        name: 'Test Foodtruck',
        tenantId: testTenantId,
        isTest: true,
        location: { lat: 47.3769, lng: 8.5417 } // Zürich
      });
      
      // Create test users
      const testUsers = [];
      for (let i = 1; i <= 3; i++) {
        const userId = `user-test-${Date.now()}-${i}`;
        await set(ref(database, `users/${userId}`), {
          name: `Test User ${i}`,
          email: `test${i}@eatech-test.ch`,
          isTestUser: true,
          tenantId: testTenantId
        });
        testUsers.push(userId);
      }
      
      // Enable all features for testing
      const updates = {};
      Object.keys(features).forEach(featureKey => {
        updates[`features/${featureKey}/tenantControl/${testTenantId}/enabled`] = true;
      });
      await update(ref(database), updates);
      
      // Log test environment creation
      await logAuditEntry({
        action: 'test.environment.created',
        testTenantId,
        testFoodtruckId,
        testUsers,
        parentTenant: tenantId
      });
      
      alert(`Test-Umgebung erstellt!\n\nTenant: ${testTenantId}\nFoodtruck: ${testFoodtruckId}\nTest-User: ${testUsers.length}`);
      
      return { testTenantId, testFoodtruckId, testUsers };
      
    } catch (error) {
      console.error('Error creating test environment:', error);
      alert('Fehler beim Erstellen der Test-Umgebung');
    }
  };

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================
  const matchesPattern = (key, patterns) => {
    return patterns.some(pattern => {
      if (pattern.endsWith('*')) {
        return key.startsWith(pattern.slice(0, -1));
      }
      return key === pattern;
    });
  };

  const evaluateCondition = (tenant, condition) => {
    switch (condition.type) {
      case 'location':
        return tenant.address?.city === condition.value;
      case 'orderVolume':
        return tenant.stats?.dailyOrders < condition.value;
      case 'plan':
        return tenant.plan === condition.value;
      default:
        return true;
    }
  };

  const logAuditEntry = async (entry) => {
    try {
      await push(ref(database, 'featureAudit'), {
        ...entry,
        timestamp: serverTimestamp(),
        masterId: 'master-001', // Current master ID
        ip: window.location.hostname,
        userAgent: navigator.userAgent
      });
    } catch (error) {
      console.error('Error logging audit entry:', error);
    }
  };

  const sendEmergencyNotification = async (message) => {
    // Integration with NotificationCenter
    console.log('Emergency notification:', message);
    // TODO: Implement actual notification sending
  };

  const disableFeaturesByPattern = async (patterns) => {
    const updates = {};
    Object.keys(features).forEach(key => {
      if (matchesPattern(key, patterns)) {
        updates[`features/${key}/masterControl/globalEnabled`] = false;
      }
    });
    await update(ref(database), updates);
  };

  const enableFallbackPayment = async () => {
    await set(ref(database, 'features/payment.basic/masterControl/fallbackMode'), true);
  };

  const pauseAnalytics = async () => {
    await set(ref(database, 'features/analytics/masterControl/paused'), true);
  };

  const exportFeatureConfig = () => {
    const config = {
      exportDate: new Date().toISOString(),
      features,
      tenantOverrides: {},
      templates: FEATURE_TEMPLATES,
      emergencySettings: EMERGENCY_PRIORITIES
    };
    
    // Add tenant overrides
    tenants.forEach(tenant => {
      config.tenantOverrides[tenant.id] = {};
      Object.keys(features).forEach(featureKey => {
        const override = features[featureKey]?.tenantControl?.[tenant.id];
        if (override) {
          config.tenantOverrides[tenant.id][featureKey] = override;
        }
      });
    });
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eatech-features-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyTemplate = async (templateKey, tenantId) => {
    const template = FEATURE_TEMPLATES[templateKey];
    if (!template) return;
    
    const confirmApply = window.confirm(
      `Template "${template.name}" anwenden?\n\n${template.description}\n\nDies wird die aktuellen Feature-Einstellungen überschreiben.`
    );
    
    if (!confirmApply) return;
    
    try {
      const updates = {};
      
      // Disable all features first
      Object.keys(features).forEach(key => {
        updates[`features/${key}/tenantControl/${tenantId}/enabled`] = false;
      });
      
      // Enable template features
      Object.keys(features).forEach(key => {
        if (matchesPattern(key, template.features)) {
          updates[`features/${key}/tenantControl/${tenantId}/enabled`] = true;
        }
      });
      
      await update(ref(database), updates);
      
      await logAuditEntry({
        action: 'template.applied',
        template: templateKey,
        tenant: tenantId,
        featuresEnabled: template.features.length
      });
      
      alert(`Template "${template.name}" erfolgreich angewendet!`);
      
    } catch (error) {
      console.error('Error applying template:', error);
      alert('Fehler beim Anwenden des Templates');
    }
  };

  // ========================================================================
  // COMPUTED VALUES
  // ========================================================================
  const filteredFeatures = useMemo(() => {
    return Object.entries(features).filter(([key, feature]) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (!key.toLowerCase().includes(searchLower) && 
            !feature.name?.toLowerCase().includes(searchLower) &&
            !feature.description?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      // Category filter
      if (selectedCategory !== 'all') {
        const category = key.split('.')[0];
        if (category !== selectedCategory) return false;
      }
      
      return true;
    });
  }, [features, searchTerm, selectedCategory]);

  const featureStats = useMemo(() => {
    const stats = {
      total: Object.keys(features).length,
      enabled: 0,
      disabled: 0,
      trial: 0,
      byCategory: {}
    };
    
    Object.entries(features).forEach(([key, feature]) => {
      const category = key.split('.')[0];
      
      if (feature.masterControl?.globalEnabled) {
        stats.enabled++;
      } else {
        stats.disabled++;
      }
      
      if (feature.trial?.active) {
        stats.trial++;
      }
      
      if (!stats.byCategory[category]) {
        stats.byCategory[category] = { total: 0, enabled: 0 };
      }
      stats.byCategory[category].total++;
      if (feature.masterControl?.globalEnabled) {
        stats.byCategory[category].enabled++;
      }
    });
    
    return stats;
  }, [features]);

  // ========================================================================
  // RENDER
  // ========================================================================
  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader2 size={48} className={styles.spinner} />
        <p>Lade Feature Control System...</p>
      </div>
    );
  }

  return (
    <div className={styles.featureControl}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>
            <SlidersHorizontal size={28} />
            Feature Control
          </h1>
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{featureStats.enabled}</span>
              <span className={styles.statLabel}>Aktiv</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{featureStats.disabled}</span>
              <span className={styles.statLabel}>Inaktiv</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{featureStats.trial}</span>
              <span className={styles.statLabel}>Trial</span>
            </div>
          </div>
        </div>
        
        <div className={styles.headerRight}>
          {/* Emergency Panel Button */}
          {systemMetrics.cpu > 70 || systemMetrics.memory > 70 ? (
            <button 
              className={`${styles.emergencyButton} ${styles.warning}`}
              onClick={() => setShowEmergencyPanel(true)}
            >
              <AlertTriangle size={18} />
              System Warning
            </button>
          ) : null}
          
          <button 
            className={styles.iconButton}
            onClick={() => setShowTestMode(true)}
            title="Test-Modus"
          >
            <TestTube size={20} />
          </button>
          
          <button 
            className={styles.iconButton}
            onClick={() => setShowAuditLog(true)}
            title="Audit Log"
          >
            <History size={20} />
          </button>
          
          <button 
            className={styles.iconButton}
            onClick={exportFeatureConfig}
            title="Export"
          >
            <Download size={20} />
          </button>
          
          <button 
            className={styles.iconButton}
            onClick={() => setShowTutorial(true)}
            title="Tutorial"
          >
            <HelpCircle size={20} />
          </button>
        </div>
      </div>

      {/* System Metrics Bar */}
      <div className={styles.metricsBar}>
        <div className={styles.metric}>
          <Cpu size={16} />
          <span>CPU: {systemMetrics.cpu}%</span>
          <div className={styles.metricBar}>
            <div 
              className={styles.metricFill} 
              style={{ 
                width: `${systemMetrics.cpu}%`,
                backgroundColor: systemMetrics.cpu > 80 ? '#FF6B6B' : systemMetrics.cpu > 60 ? '#F39C12' : '#10B981'
              }}
            />
          </div>
        </div>
        
        <div className={styles.metric}>
          <Database size={16} />
          <span>Memory: {systemMetrics.memory}%</span>
          <div className={styles.metricBar}>
            <div 
              className={styles.metricFill} 
              style={{ 
                width: `${systemMetrics.memory}%`,
                backgroundColor: systemMetrics.memory > 80 ? '#FF6B6B' : systemMetrics.memory > 60 ? '#F39C12' : '#10B981'
              }}
            />
          </div>
        </div>
        
        <div className={styles.metric}>
          <Activity size={16} />
          <span>Response: {systemMetrics.responseTime}ms</span>
          <div className={styles.metricBar}>
            <div 
              className={styles.metricFill} 
              style={{ 
                width: `${Math.min((systemMetrics.responseTime / 1000) * 100, 100)}%`,
                backgroundColor: systemMetrics.responseTime > 3000 ? '#FF6B6B' : systemMetrics.responseTime > 1000 ? '#F39C12' : '#10B981'
              }}
            />
          </div>
        </div>
        
        <div className={styles.metric}>
          <AlertCircle size={16} />
          <span>Fehler: {systemMetrics.errorRate}%</span>
          <div className={styles.metricBar}>
            <div 
              className={styles.metricFill} 
              style={{ 
                width: `${systemMetrics.errorRate}%`,
                backgroundColor: systemMetrics.errorRate > 5 ? '#FF6B6B' : systemMetrics.errorRate > 2 ? '#F39C12' : '#10B981'
              }}
            />
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Features suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className={styles.categoryFilter}>
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">Alle Kategorien</option>
            {Object.entries(FEATURE_CATEGORIES).map(([key, category]) => (
              <option key={key} value={key}>
                {category.name} ({Object.keys(features).filter(f => f.startsWith(key)).length})
              </option>
            ))}
          </select>
        </div>
        
        <div className={styles.tenantSelector}>
          <Building size={18} />
          <select
            value={selectedTenant?.id || ''}
            onChange={(e) => {
              const tenant = tenants.find(t => t.id === e.target.value);
              setSelectedTenant(tenant);
            }}
          >
            <option value="">Master Control</option>
            {tenants.map(tenant => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name} ({tenant.plan || 'Standard'})
              </option>
            ))}
          </select>
        </div>
        
        <div className={styles.viewModeButtons}>
          <button
            className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid-Ansicht"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`}
            onClick={() => setViewMode('list')}
            title="Listen-Ansicht"
          >
            <List size={18} />
          </button>
          <button
            className={`${styles.viewButton} ${viewMode === 'compact' ? styles.active : ''}`}
            onClick={() => setViewMode('compact')}
            title="Kompakt-Ansicht"
          >
            <Grid size={18} />
          </button>
        </div>
        
        <button
          className={`${styles.bulkButton} ${bulkActionMode ? styles.active : ''}`}
          onClick={() => setBulkActionMode(!bulkActionMode)}
        >
          <CheckSquare size={18} />
          Bulk-Modus
        </button>
      </div>

      {/* Bulk Actions Bar */}
      {bulkActionMode && selectedFeatures.size > 0 && (
        <div className={styles.bulkActionsBar}>
          <span>{selectedFeatures.size} Features ausgewählt</span>
          <div className={styles.bulkActions}>
            <button
              className={styles.bulkAction}
              onClick={() => {
                selectedFeatures.forEach(key => toggleFeature(key, true, selectedTenant?.id));
                setSelectedFeatures(new Set());
              }}
            >
              <Power size={16} />
              Aktivieren
            </button>
            <button
              className={styles.bulkAction}
              onClick={() => {
                selectedFeatures.forEach(key => toggleFeature(key, false, selectedTenant?.id));
                setSelectedFeatures(new Set());
              }}
            >
              <Power size={16} />
              Deaktivieren
            </button>
            <button
              className={styles.bulkAction}
              onClick={() => setSelectedFeatures(new Set())}
            >
              <X size={16} />
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Template Bar */}
      {selectedTenant && (
        <div className={styles.templateBar}>
          <span>Templates anwenden:</span>
          {Object.entries(FEATURE_TEMPLATES).map(([key, template]) => (
            <button
              key={key}
              className={styles.templateButton}
              onClick={() => applyTemplate(key, selectedTenant.id)}
              title={template.description}
            >
              {template.name}
            </button>
          ))}
        </div>
      )}

      {/* Features Grid/List */}
      <div className={`${styles.featuresContainer} ${styles[viewMode]}`}>
        {filteredFeatures.map(([key, feature]) => {
          const category = key.split('.')[0];
          const categoryConfig = FEATURE_CATEGORIES[category] || {};
          const Icon = categoryConfig.icon || Zap;
          const isEnabled = selectedTenant 
            ? feature.tenantControl?.[selectedTenant.id]?.enabled ?? feature.masterControl?.globalEnabled
            : feature.masterControl?.globalEnabled;
          const hasOverride = selectedTenant && feature.tenantControl?.[selectedTenant.id] !== undefined;
          const isInTrial = feature.trial?.active;
          const isSelected = selectedFeatures.has(key);
          
          return (
            <div 
              key={key}
              className={`${styles.featureCard} ${isEnabled ? styles.enabled : ''} ${isSelected ? styles.selected : ''} ${hasOverride ? styles.hasOverride : ''}`}
              onClick={() => {
                if (bulkActionMode) {
                  const newSelected = new Set(selectedFeatures);
                  if (newSelected.has(key)) {
                    newSelected.delete(key);
                  } else {
                    newSelected.add(key);
                  }
                  setSelectedFeatures(newSelected);
                }
              }}
            >
              {bulkActionMode && (
                <div className={styles.checkbox}>
                  {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                </div>
              )}
              
              <div className={styles.featureHeader}>
                <div 
                  className={styles.featureIcon}
                  style={{ backgroundColor: `${categoryConfig.color}20`, color: categoryConfig.color }}
                >
                  <Icon size={24} />
                </div>
                
                <div className={styles.featureInfo}>
                  <h3>{feature.name || key}</h3>
                  <p className={styles.featureKey}>{key}</p>
                  {feature.description && (
                    <p className={styles.featureDescription}>{feature.description}</p>
                  )}
                </div>
                
                <div className={styles.featureActions}>
                  {isInTrial && (
                    <div className={styles.trialBadge}>
                      <Timer size={14} />
                      Trial
                    </div>
                  )}
                  
                  {hasOverride && (
                    <div className={styles.overrideBadge} title="Tenant-spezifische Einstellung">
                      <User size={14} />
                    </div>
                  )}
                  
                  <button
                    className={styles.infoButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFeature({ key, ...feature });
                    }}
                    title="Feature-Details"
                  >
                    <Info size={18} />
                  </button>
                  
                  {!bulkActionMode && (
                    <button
                      className={`${styles.toggleButton} ${isEnabled ? styles.on : styles.off}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFeature(key, !isEnabled, selectedTenant?.id);
                      }}
                      title={isEnabled ? 'Deaktivieren' : 'Aktivieren'}
                    >
                      {isEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                  )}
                </div>
              </div>
              
              {viewMode === 'list' && feature.dependencies?.length > 0 && (
                <div className={styles.featureDependencies}>
                  <span>Abhängigkeiten:</span>
                  {feature.dependencies.map(dep => (
                    <span key={dep} className={styles.dependency}>{dep}</span>
                  ))}
                </div>
              )}
              
              {viewMode === 'list' && feature.stats && (
                <div className={styles.featureStats}>
                  <div className={styles.stat}>
                    <Users size={14} />
                    <span>{feature.stats.activeUsers || 0} Nutzer</span>
                  </div>
                  <div className={styles.stat}>
                    <Activity size={14} />
                    <span>{feature.stats.usageRate || 0}% Nutzung</span>
                  </div>
                  <div className={styles.stat}>
                    <TrendingUp size={14} />
                    <span>{feature.stats.trend || '+0'}% Trend</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Feature Details Modal */}
      {editingFeature && (
        <div className={styles.modal} onClick={() => setEditingFeature(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                <Info size={24} />
                Feature Details: {editingFeature.name || editingFeature.key}
              </h2>
              <button 
                className={styles.closeButton}
                onClick={() => setEditingFeature(null)}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.detailSection}>
                <h3>Allgemeine Informationen</h3>
                <div className={styles.detailRow}>
                  <span>Feature Key:</span>
                  <code>{editingFeature.key}</code>
                </div>
                <div className={styles.detailRow}>
                  <span>Kategorie:</span>
                  <span>{FEATURE_CATEGORIES[editingFeature.key.split('.')[0]]?.name}</span>
                </div>
                <div className={styles.detailRow}>
                  <span>Status:</span>
                  <span className={editingFeature.masterControl?.globalEnabled ? styles.enabled : styles.disabled}>
                    {editingFeature.masterControl?.globalEnabled ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </div>
                {editingFeature.description && (
                  <div className={styles.detailRow}>
                    <span>Beschreibung:</span>
                    <span>{editingFeature.description}</span>
                  </div>
                )}
              </div>
              
              {editingFeature.dependencies?.length > 0 && (
                <div className={styles.detailSection}>
                  <h3>Abhängigkeiten</h3>
                  <p>Dieses Feature benötigt:</p>
                  <ul>
                    {editingFeature.dependencies.map(dep => (
                      <li key={dep}>
                        <code>{dep}</code>
                        {features[dep]?.masterControl?.globalEnabled ? (
                          <CheckCircle2 size={16} className={styles.enabled} />
                        ) : (
                          <XCircle size={16} className={styles.disabled} />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {editingFeature.config && (
                <div className={styles.detailSection}>
                  <h3>Konfiguration</h3>
                  <pre>{JSON.stringify(editingFeature.config, null, 2)}</pre>
                </div>
              )}
              
              {editingFeature.stats && (
                <div className={styles.detailSection}>
                  <h3>Statistiken</h3>
                  <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Aktive Nutzer</span>
                      <span className={styles.statValue}>{editingFeature.stats.activeUsers || 0}</span>
                    </div>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Nutzungsrate</span>
                      <span className={styles.statValue}>{editingFeature.stats.usageRate || 0}%</span>
                    </div>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Fehlerrate</span>
                      <span className={styles.statValue}>{editingFeature.stats.errorRate || 0}%</span>
                    </div>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Avg. Response</span>
                      <span className={styles.statValue}>{editingFeature.stats.avgResponse || 0}ms</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className={styles.detailSection}>
                <h3>Tutorial & Hilfe</h3>
                <p>
                  {editingFeature.tutorial?.description || 
                   'Aktiviere dieses Feature um erweiterte Funktionen freizuschalten.'}
                </p>
                {editingFeature.tutorial?.steps && (
                  <ol className={styles.tutorialSteps}>
                    {editingFeature.tutorial.steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button 
                className={styles.primaryButton}
                onClick={() => {
                  toggleFeature(editingFeature.key, !editingFeature.masterControl?.globalEnabled);
                  setEditingFeature(null);
                }}
              >
                {editingFeature.masterControl?.globalEnabled ? 'Deaktivieren' : 'Aktivieren'}
              </button>
              <button 
                className={styles.secondaryButton}
                onClick={() => setEditingFeature(null)}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Mode Modal */}
      {showTestMode && (
        <div className={styles.modal} onClick={() => setShowTestMode(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                <TestTube size={24} />
                Test-Umgebung erstellen
              </h2>
              <button 
                className={styles.closeButton}
                onClick={() => setShowTestMode(false)}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.testModeInfo}>
                <AlertCircle size={20} />
                <p>
                  Eine Test-Umgebung erstellt einen isolierten Bereich mit:
                </p>
                <ul>
                  <li>Test-Tenant mit allen Features aktiviert</li>
                  <li>Test-Foodtruck ohne echte Transaktionen</li>
                  <li>3 Test-User für verschiedene Szenarien</li>
                  <li>Automatische Bereinigung nach 24 Stunden</li>
                </ul>
              </div>
              
              <div className={styles.testModeOptions}>
                <h3>Für wen soll die Test-Umgebung erstellt werden?</h3>
                <div className={styles.testModeButtons}>
                  <button
                    className={styles.testModeButton}
                    onClick={() => {
                      createTestEnvironment(null);
                      setShowTestMode(false);
                    }}
                  >
                    <Shield size={20} />
                    <span>Master Test-Umgebung</span>
                    <small>Für System-Tests</small>
                  </button>
                  
                  {selectedTenant && (
                    <button
                      className={styles.testModeButton}
                      onClick={() => {
                        createTestEnvironment(selectedTenant.id);
                        setShowTestMode(false);
                      }}
                    >
                      <Building size={20} />
                      <span>Tenant Test-Umgebung</span>
                      <small>Für {selectedTenant.name}</small>
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button 
                className={styles.secondaryButton}
                onClick={() => setShowTestMode(false)}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      {showAuditLog && (
        <div className={styles.modal} onClick={() => setShowAuditLog(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                <History size={24} />
                Feature Audit Log
              </h2>
              <button 
                className={styles.closeButton}
                onClick={() => setShowAuditLog(false)}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.auditLog}>
                {auditLog.length === 0 ? (
                  <p className={styles.emptyState}>Keine Einträge vorhanden</p>
                ) : (
                  auditLog.map(entry => (
                    <div key={entry.id} className={styles.auditEntry}>
                      <div className={styles.auditIcon}>
                        {entry.action.includes('enabled') && <CheckCircle2 size={20} className={styles.enabled} />}
                        {entry.action.includes('disabled') && <XCircle size={20} className={styles.disabled} />}
                        {entry.action.includes('emergency') && <AlertTriangle size={20} className={styles.warning} />}
                        {entry.action.includes('batch') && <Layers size={20} />}
                        {entry.action.includes('template') && <Copy size={20} />}
                        {entry.action.includes('test') && <TestTube size={20} />}
                      </div>
                      
                      <div className={styles.auditContent}>
                        <div className={styles.auditAction}>
                          {entry.action === 'feature.enabled' && `Feature aktiviert: ${entry.feature}`}
                          {entry.action === 'feature.disabled' && `Feature deaktiviert: ${entry.feature}`}
                          {entry.action === 'emergency.triggered' && `Emergency Mode: Priority ${entry.priority}`}
                          {entry.action === 'batch.operation' && `Batch-Operation: ${entry.affectedFeatures} Features`}
                          {entry.action === 'template.applied' && `Template angewendet: ${entry.template}`}
                          {entry.action === 'test.environment.created' && `Test-Umgebung erstellt`}
                        </div>
                        
                        <div className={styles.auditMeta}>
                          <span>{entry.changedBy || 'System'}</span>
                          <span>•</span>
                          <span>{entry.tenant ? `Tenant: ${entry.tenant}` : 'Global'}</span>
                          <span>•</span>
                          <span>{new Date(entry.timestamp).toLocaleString('de-CH')}</span>
                        </div>
                        
                        {entry.reason && (
                          <div className={styles.auditReason}>
                            Grund: {entry.reason}
                          </div>
                        )}
                      </div>
                      
                      <button
                        className={styles.rollbackButton}
                        onClick={() => {
                          if (window.confirm('Möchten Sie diese Änderung rückgängig machen?')) {
                            // Implement rollback logic
                            if (entry.action === 'feature.enabled') {
                              toggleFeature(entry.feature, false, entry.tenant);
                            } else if (entry.action === 'feature.disabled') {
                              toggleFeature(entry.feature, true, entry.tenant);
                            }
                          }
                        }}
                        title="Rückgängig machen"
                      >
                        <RotateCcw size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button 
                className={styles.secondaryButton}
                onClick={() => setShowAuditLog(false)}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Panel */}
      {showEmergencyPanel && (
        <div className={styles.modal} onClick={() => setShowEmergencyPanel(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.emergency}>
                <AlertTriangle size={24} />
                Emergency Control Panel
              </h2>
              <button 
                className={styles.closeButton}
                onClick={() => setShowEmergencyPanel(false)}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.emergencyWarning}>
                <AlertCircle size={20} />
                <p>
                  System zeigt Anzeichen von Überlastung. Aktivieren Sie Emergency Mode um nicht-kritische Features zu deaktivieren.
                </p>
              </div>
              
              <div className={styles.emergencyMetrics}>
                <div className={styles.emergencyMetric}>
                  <Cpu size={20} />
                  <span>CPU</span>
                  <span className={styles.emergencyValue}>{systemMetrics.cpu}%</span>
                </div>
                <div className={styles.emergencyMetric}>
                  <Database size={20} />
                  <span>Memory</span>
                  <span className={styles.emergencyValue}>{systemMetrics.memory}%</span>
                </div>
                <div className={styles.emergencyMetric}>
                  <Activity size={20} />
                  <span>Response</span>
                  <span className={styles.emergencyValue}>{systemMetrics.responseTime}ms</span>
                </div>
                <div className={styles.emergencyMetric}>
                  <AlertCircle size={20} />
                  <span>Errors</span>
                  <span className={styles.emergencyValue}>{systemMetrics.errorRate}%</span>
                </div>
              </div>
              
              <div className={styles.emergencyActions}>
                <h3>Emergency Actions</h3>
                
                {Object.entries(EMERGENCY_PRIORITIES).map(([priority, config]) => (
                  <div key={priority} className={styles.emergencyAction}>
                    <div 
                      className={styles.priorityIndicator}
                      style={{ backgroundColor: config.color }}
                    />
                    <div className={styles.emergencyInfo}>
                      <h4>Priority {priority} - {config.label}</h4>
                      <p>Deaktiviert: {config.features.join(', ')}</p>
                    </div>
                    <button
                      className={styles.emergencyButton}
                      onClick={() => {
                        triggerEmergencyMode(parseInt(priority));
                        setShowEmergencyPanel(false);
                      }}
                    >
                      <Power size={16} />
                      Deaktivieren
                    </button>
                  </div>
                ))}
                
                <div className={styles.emergencyAction}>
                  <div 
                    className={styles.priorityIndicator}
                    style={{ backgroundColor: '#E74C3C' }}
                  />
                  <div className={styles.emergencyInfo}>
                    <h4>PANIC MODE - Alle nicht-kritischen Features</h4>
                    <p>Deaktiviert ALLE Features außer Core-Funktionen</p>
                  </div>
                  <button
                    className={`${styles.emergencyButton} ${styles.danger}`}
                    onClick={() => {
                      if (window.confirm('WARNUNG: Dies deaktiviert ALLE nicht-essentiellen Features. Fortfahren?')) {
                        [3, 2].forEach(p => triggerEmergencyMode(p));
                        setShowEmergencyPanel(false);
                      }
                    }}
                  >
                    <AlertTriangle size={16} />
                    PANIC MODE
                  </button>
                </div>
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button 
                className={styles.secondaryButton}
                onClick={() => setShowEmergencyPanel(false)}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Overlay */}
      {showTutorial && (
        <div className={styles.tutorial}>
          <div className={styles.tutorialContent}>
            <h2>Feature Control Tutorial</h2>
            <div className={styles.tutorialSteps}>
              <div className={styles.tutorialStep}>
                <div className={styles.stepNumber}>1</div>
                <h3>Features aktivieren/deaktivieren</h3>
                <p>Klicken Sie auf den Toggle-Button um Features ein- oder auszuschalten.</p>
              </div>
              <div className={styles.tutorialStep}>
                <div className={styles.stepNumber}>2</div>
                <h3>Tenant-spezifische Einstellungen</h3>
                <p>Wählen Sie einen Tenant aus der Dropdown-Liste um Features nur für diesen zu steuern.</p>
              </div>
              <div className={styles.tutorialStep}>
                <div className={styles.stepNumber}>3</div>
                <h3>Bulk-Operationen</h3>
                <p>Aktivieren Sie den Bulk-Modus um mehrere Features gleichzeitig zu bearbeiten.</p>
              </div>
              <div className={styles.tutorialStep}>
                <div className={styles.stepNumber}>4</div>
                <h3>Templates anwenden</h3>
                <p>Nutzen Sie vordefinierte Templates um Features schnell zu konfigurieren.</p>
              </div>
              <div className={styles.tutorialStep}>
                <div className={styles.stepNumber}>5</div>
                <h3>Emergency Control</h3>
                <p>Bei System-Überlastung können Sie nicht-kritische Features automatisch deaktivieren.</p>
              </div>
            </div>
            <button 
              className={styles.primaryButton}
              onClick={() => setShowTutorial(false)}
            >
              Tutorial beenden
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureControl;