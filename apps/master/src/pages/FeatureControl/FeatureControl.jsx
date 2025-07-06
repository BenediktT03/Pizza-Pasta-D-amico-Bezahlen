/**
 * EATECH - Feature Control System
 * Version: 1.0.0
 * Description: Zentrales Feature Management mit hierarchischer Kontrolle,
 *              Test-Modus, Audit Trail und Emergency Controls
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * Modified: 2025-01-08 - White Label deaktiviert
 * 
 * Kapitel: Phase 5 - Premium & Master - Feature Flags
 * File Path: /apps/master/src/pages/FeatureControl/FeatureControl.jsx
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
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
  Megaphone,
  Target,
  MapPin,
  Palette
} from 'lucide-react';
import styles from './FeatureControl.module.css';

// Lazy loaded components
const FeatureDetailsModal = lazy(() => import('./components/FeatureDetailsModal'));
const AuditLogPanel = lazy(() => import('./components/AuditLogPanel'));
const TenantOverrides = lazy(() => import('./components/TenantOverrides'));
const BulkActions = lazy(() => import('./components/BulkActions'));

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
const FEATURE_CATEGORIES = {
  core: { 
    id: 'core', 
    name: 'Kern', 
    icon: Package, 
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
  // WHITE LABEL DEAKTIVIERT FÜR V1
  // whitelabel: { 
  //   id: 'whitelabel', 
  //   name: 'White Label', 
  //   icon: Palette, 
  //   color: '#A29BFE',
  //   description: 'Branding und Anpassung - COMING POST V1'
  // }
};

const DEFAULT_FEATURES = {
  // ========== CORE FEATURES ==========
  multiTenant: {
    id: 'multiTenant',
    name: 'Multi-Tenant System',
    category: 'core',
    description: 'Mehrere Restaurants auf einer Plattform',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: false,
      requiresRestart: true
    },
    dependencies: [],
    stats: {
      activeUsers: 0,
      usageRate: 100,
      errorRate: 0
    }
  },
  
  offlineMode: {
    id: 'offlineMode',
    name: 'Offline-Modus',
    category: 'core',
    description: '100% Funktionalität ohne Internet',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: false
    },
    config: {
      syncInterval: 30,
      maxOfflineOrders: 1000
    }
  },

  // ========== ORDERING FEATURES ==========
  qrOrdering: {
    id: 'qrOrdering',
    name: 'QR-Code Bestellung',
    category: 'ordering',
    description: 'Kontaktlose Bestellung via QR-Code',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    }
  },

  preOrdering: {
    id: 'preOrdering',
    name: 'Vorbestellung',
    category: 'ordering',
    description: 'Bestellungen im Voraus aufgeben',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    },
    config: {
      maxDaysInAdvance: 7,
      minHoursNotice: 2
    }
  },

  groupOrdering: {
    id: 'groupOrdering',
    name: 'Gruppen-Bestellung',
    category: 'ordering',
    description: 'Mehrere Personen, eine Rechnung',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    }
  },

  // ========== PAYMENT FEATURES (OHNE CASH) ==========
  stripePayment: {
    id: 'stripePayment',
    name: 'Stripe Zahlungen',
    category: 'payment',
    description: 'Kreditkarten-Zahlungen via Stripe',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    },
    config: {
      testMode: false,
      captureDelay: 0
    }
  },

  twintPayment: {
    id: 'twintPayment',
    name: 'TWINT Integration',
    category: 'payment',
    description: 'Schweizer Mobile Payment',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    }
  },

  invoicePayment: {
    id: 'invoicePayment',
    name: 'Rechnungszahlung',
    category: 'payment',
    description: 'Auf Rechnung für B2B Kunden',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    },
    config: {
      defaultTerms: 30,
      requireApproval: true
    }
  },

  splitPayment: {
    id: 'splitPayment',
    name: 'Rechnung teilen',
    category: 'payment',
    description: 'Bestellung auf mehrere Personen aufteilen',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    }
  },

  // ========== MENU FEATURES ==========
  dynamicPricing: {
    id: 'dynamicPricing',
    name: 'Dynamische Preise',
    category: 'menu',
    description: 'Preise nach Tageszeit/Nachfrage',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    },
    dependencies: ['aiPricing']
  },

  menuScheduling: {
    id: 'menuScheduling',
    name: 'Menü-Zeitplanung',
    category: 'menu',
    description: 'Verschiedene Menüs nach Tageszeit',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    }
  },

  allergenManagement: {
    id: 'allergenManagement',
    name: 'Allergen-Verwaltung',
    category: 'menu',
    description: 'Detaillierte Allergen-Informationen',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: false
    }
  },

  // ========== CUSTOMER FEATURES ==========
  customerProfiles: {
    id: 'customerProfiles',
    name: 'Kundenprofile',
    category: 'customer',
    description: 'Gespeicherte Kundendaten und Präferenzen',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    }
  },

  customerFeedback: {
    id: 'customerFeedback',
    name: 'Bewertungen & Feedback',
    category: 'customer',
    description: 'Kundenbewertungen sammeln',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    }
  },

  // ========== ANALYTICS FEATURES ==========
  realtimeAnalytics: {
    id: 'realtimeAnalytics',
    name: 'Echtzeit-Analytics',
    category: 'analytics',
    description: 'Live-Daten und Metriken',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    }
  },

  predictiveAnalytics: {
    id: 'predictiveAnalytics',
    name: 'Vorhersage-Analytics',
    category: 'analytics',
    description: 'KI-basierte Prognosen',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    },
    dependencies: ['aiCore']
  },

  customReports: {
    id: 'customReports',
    name: 'Benutzerdefinierte Reports',
    category: 'analytics',
    description: 'Eigene Reports erstellen',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    }
  },

  // ========== MARKETING FEATURES ==========
  promotions: {
    id: 'promotions',
    name: 'Aktionen & Rabatte',
    category: 'marketing',
    description: 'Rabattcodes und Sonderaktionen',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    }
  },

  emailMarketing: {
    id: 'emailMarketing',
    name: 'E-Mail Marketing',
    category: 'marketing',
    description: 'Newsletter und Kampagnen',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    }
  },

  socialMediaIntegration: {
    id: 'socialMediaIntegration',
    name: 'Social Media Integration',
    category: 'marketing',
    description: 'Teilen und Social Login',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    }
  },

  // ========== AI FEATURES ==========
  aiCore: {
    id: 'aiCore',
    name: 'KI-Kern System',
    category: 'ai',
    description: 'Zentrale KI-Engine für alle Features',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: false
    },
    config: {
      model: 'gpt-4',
      updateInterval: 3600
    }
  },

  demandPrediction: {
    id: 'demandPrediction',
    name: 'Nachfrage-Vorhersage',
    category: 'ai',
    description: 'KI-basierte Bestellprognosen',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    },
    dependencies: ['aiCore'],
    config: {
      accuracy: 85,
      updateInterval: 3600
    }
  },

  priceOptimization: {
    id: 'priceOptimization',
    name: 'Preis-Optimierung',
    category: 'ai',
    description: 'Dynamische Preisempfehlungen',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    },
    dependencies: ['aiCore', 'dynamicPricing']
  },

  emergencyAI: {
    id: 'emergencyAI',
    name: 'Notfall-KI',
    category: 'ai',
    description: 'Automatische Problemlösung bei Ausfällen',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: false
    },
    dependencies: ['aiCore']
  },

  menuEngineering: {
    id: 'menuEngineering',
    name: 'Menü-Engineering KI',
    category: 'ai',
    description: 'Optimale Menü-Zusammenstellung',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    },
    dependencies: ['aiCore', 'predictiveAnalytics']
  },

  voiceOrdering: {
    id: 'voiceOrdering',
    name: 'Sprach-Bestellung',
    category: 'ai',
    description: 'Hey EATECH - Sprachgesteuerte Bestellung',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    },
    dependencies: ['aiCore'],
    config: {
      languages: ['de-CH', 'fr-CH', 'it-CH', 'en']
    }
  },

  // ========== LOYALTY FEATURES ==========
  pointsSystem: {
    id: 'pointsSystem',
    name: 'Punkte-System',
    category: 'loyalty',
    description: '1 CHF = 1 Punkt Belohnungssystem',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    }
  },

  vipProgram: {
    id: 'vipProgram',
    name: 'VIP-Programm',
    category: 'loyalty',
    description: 'Stufen-basiertes Treueprogramm',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    },
    dependencies: ['pointsSystem']
  },

  referralProgram: {
    id: 'referralProgram',
    name: 'Empfehlungs-Programm',
    category: 'loyalty',
    description: 'Belohnungen für Weiterempfehlungen',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    }
  },

  // ========== NOTIFICATION FEATURES ==========
  pushNotifications: {
    id: 'pushNotifications',
    name: 'Push-Benachrichtigungen',
    category: 'notification',
    description: 'Web & Mobile Push Notifications',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    }
  },

  smsNotifications: {
    id: 'smsNotifications',
    name: 'SMS-Benachrichtigungen',
    category: 'notification',
    description: 'Bestell-Updates per SMS',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    },
    config: {
      provider: 'twilio',
      maxPerDay: 100
    }
  },

  emailNotifications: {
    id: 'emailNotifications',
    name: 'E-Mail Benachrichtigungen',
    category: 'notification',
    description: 'Transaktions-E-Mails',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: false
    }
  },

  // ========== LOCATION FEATURES ==========
  gpsTracking: {
    id: 'gpsTracking',
    name: 'GPS-Tracking',
    category: 'location',
    description: 'Live-Standort von Foodtrucks',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    }
  },

  locationIntelligence: {
    id: 'locationIntelligence',
    name: 'Standort-Intelligence',
    category: 'location',
    description: 'Optimale Standort-Empfehlungen',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    },
    dependencies: ['aiCore', 'gpsTracking']
  },

  eventManagement: {
    id: 'eventManagement',
    name: 'Event-Management',
    category: 'location',
    description: 'Festival und Event-Koordination',
    masterControl: {
      globalEnabled: true,
      canTenantDisable: true
    }
  },

  // WHITE LABEL FEATURES - DEAKTIVIERT FÜR V1
  // customBranding: {
  //   id: 'customBranding',
  //   name: 'Custom Branding',
  //   category: 'whitelabel',
  //   description: 'Eigenes Logo und Farben - COMING POST V1',
  //   masterControl: {
  //     globalEnabled: false,
  //     canTenantDisable: false
  //   }
  // },
  // customDomain: {
  //   id: 'customDomain',
  //   name: 'Eigene Domain',
  //   category: 'whitelabel',
  //   description: 'restaurant.ch statt restaurant.eatech.ch - COMING POST V1',
  //   masterControl: {
  //     globalEnabled: false,
  //     canTenantDisable: false
  //   }
  // },
  // customEmails: {
  //   id: 'customEmails',
  //   name: 'E-Mail Branding',
  //   category: 'whitelabel',
  //   description: 'Eigene E-Mail Templates - COMING POST V1',
  //   masterControl: {
  //     globalEnabled: false,
  //     canTenantDisable: false
  //   }
  // }
};

// ============================================================================
// LOADING COMPONENT
// ============================================================================
const LoadingSpinner = () => (
  <div className={styles.loadingContainer}>
    <div className={styles.spinner} />
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const FeatureControl = () => {
  // State Management
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [tenants, setTenants] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingFeature, setEditingFeature] = useState(null);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [selectedTenants, setSelectedTenants] = useState([]);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(['core']);

  // ========== EFFECTS ==========
  useEffect(() => {
    const featuresRef = ref(database, 'features');
    const tenantsRef = ref(database, 'tenants');
    const auditRef = query(
      ref(database, 'featureAudit'),
      orderByChild('timestamp'),
      limitToLast(100)
    );

    const unsubscribeFeatures = onValue(featuresRef, (snapshot) => {
      if (snapshot.exists()) {
        setFeatures(prev => ({ ...DEFAULT_FEATURES, ...snapshot.val() }));
      }
      setLoading(false);
    });

    const unsubscribeTenants = onValue(tenantsRef, (snapshot) => {
      if (snapshot.exists()) {
        setTenants(snapshot.val());
      }
    });

    const unsubscribeAudit = onValue(auditRef, (snapshot) => {
      if (snapshot.exists()) {
        const logs = [];
        snapshot.forEach((child) => {
          logs.unshift({ id: child.key, ...child.val() });
        });
        setAuditLog(logs);
      }
    });

    return () => {
      off(featuresRef);
      off(tenantsRef);
      off(auditRef);
    };
  }, []);

  // ========== HANDLERS ==========
  const handleToggleFeature = useCallback(async (featureId) => {
    const feature = features[featureId];
    if (!feature || (!feature.masterControl.canTenantDisable && !feature.masterControl.globalEnabled)) {
      return;
    }

    setSaving(true);
    try {
      const newState = !feature.masterControl.globalEnabled;
      
      // Check dependencies
      if (newState && feature.dependencies?.length > 0) {
        const missingDeps = feature.dependencies.filter(dep => !features[dep]?.masterControl?.globalEnabled);
        if (missingDeps.length > 0) {
          alert(`Dieses Feature benötigt: ${missingDeps.join(', ')}`);
          setSaving(false);
          return;
        }
      }

      // Update feature state
      await update(ref(database, `features/${featureId}/masterControl`), {
        globalEnabled: newState,
        lastModified: serverTimestamp()
      });

      // Log action
      await push(ref(database, 'featureAudit'), {
        action: newState ? 'enabled' : 'disabled',
        featureId,
        featureName: feature.name,
        user: 'master-admin',
        timestamp: serverTimestamp(),
        testMode
      });

      // Handle dependent features
      if (!newState) {
        const dependentFeatures = Object.entries(features).filter(([id, f]) => 
          f.dependencies?.includes(featureId) && f.masterControl.globalEnabled
        );
        
        if (dependentFeatures.length > 0) {
          const disable = confirm(`Diese Features hängen davon ab: ${dependentFeatures.map(([,f]) => f.name).join(', ')}. Auch deaktivieren?`);
          if (disable) {
            for (const [depId] of dependentFeatures) {
              await handleToggleFeature(depId);
            }
          }
        }
      }

      if (feature.masterControl.requiresRestart) {
        alert(`Feature "${feature.name}" erfordert einen Neustart aller Dienste.`);
      }

      if (window.Sentry) {
        window.Sentry.captureMessage(`Feature ${featureId} ${newState ? 'enabled' : 'disabled'}`, 'info');
      }
    } catch (error) {
      console.error('Error toggling feature:', error);
      alert('Fehler beim Ändern des Feature-Status');
      
      if (window.Sentry) {
        window.Sentry.captureException(error);
      }
    } finally {
      setSaving(false);
    }
  }, [features, testMode]);

  const handleEmergencyShutdown = useCallback(async () => {
    if (!confirm('WARNUNG: Dies deaktiviert ALLE Features außer Core-Funktionen. Fortfahren?')) {
      return;
    }

    const pin = prompt('Sicherheits-PIN eingeben:');
    if (pin !== '1234') { // In Produktion: Sicherer PIN
      alert('Falscher PIN');
      return;
    }

    setEmergencyMode(true);
    setSaving(true);

    try {
      const updates = {};
      Object.entries(features).forEach(([id, feature]) => {
        if (feature.category !== 'core') {
          updates[`features/${id}/masterControl/globalEnabled`] = false;
        }
      });

      await update(ref(database), updates);

      await push(ref(database, 'featureAudit'), {
        action: 'emergency_shutdown',
        user: 'master-admin',
        timestamp: serverTimestamp(),
        affectedFeatures: Object.keys(updates).length
      });

      alert('Notfall-Shutdown durchgeführt. Nur Core-Features sind aktiv.');
    } catch (error) {
      console.error('Emergency shutdown error:', error);
      alert('Fehler beim Notfall-Shutdown');
      
      if (window.Sentry) {
        window.Sentry.captureException(error);
      }
    } finally {
      setSaving(false);
    }
  }, [features]);

  const handleBulkToggle = useCallback(async (categoryId, enable) => {
    const categoryFeatures = Object.entries(features).filter(([, f]) => f.category === categoryId);
    
    setSaving(true);
    try {
      const updates = {};
      categoryFeatures.forEach(([id, feature]) => {
        if (feature.masterControl.canTenantDisable || !enable) {
          updates[`features/${id}/masterControl/globalEnabled`] = enable;
        }
      });

      await update(ref(database), updates);

      await push(ref(database, 'featureAudit'), {
        action: 'bulk_toggle',
        category: categoryId,
        enabled: enable,
        user: 'master-admin',
        timestamp: serverTimestamp(),
        affectedFeatures: Object.keys(updates).length
      });
    } catch (error) {
      console.error('Bulk toggle error:', error);
      alert('Fehler beim Bulk-Toggle');
      
      if (window.Sentry) {
        window.Sentry.captureException(error);
      }
    } finally {
      setSaving(false);
    }
  }, [features]);

  const handleExportConfig = useCallback(() => {
    const config = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      features: features,
      testMode: testMode
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eatech-features-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [features, testMode]);

  const handleImportConfig = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const config = JSON.parse(text);

      if (!config.features || config.version !== '1.0.0') {
        throw new Error('Ungültiges Config-Format');
      }

      if (confirm('Dies überschreibt alle aktuellen Feature-Einstellungen. Fortfahren?')) {
        await update(ref(database, 'features'), config.features);
        alert('Konfiguration importiert');
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Fehler beim Import der Konfiguration');
    }
  }, []);

  // ========== COMPUTED VALUES ==========
  const filteredFeatures = useMemo(() => {
    return Object.values(features).filter(feature => {
      const matchesCategory = selectedCategory === 'all' || feature.category === selectedCategory;
      const matchesSearch = feature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          feature.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [features, selectedCategory, searchQuery]);

  const stats = useMemo(() => {
    const total = Object.keys(features).length;
    const enabled = Object.values(features).filter(f => f.masterControl.globalEnabled).length;
    const critical = Object.values(features).filter(f => !f.masterControl.canTenantDisable).length;
    const byCategory = {};
    
    Object.values(FEATURE_CATEGORIES).forEach(cat => {
      const categoryFeatures = Object.values(features).filter(f => f.category === cat.id);
      byCategory[cat.id] = {
        total: categoryFeatures.length,
        enabled: categoryFeatures.filter(f => f.masterControl.globalEnabled).length
      };
    });
    
    return { total, enabled, disabled: total - enabled, critical, byCategory };
  }, [features]);

  // ========== RENDER ==========
  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Lade Feature-Konfiguration...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1>Feature Control Center</h1>
            <p>Zentrale Verwaltung aller EATECH Features</p>
          </div>
          <div className={styles.headerActions}>
            <button
              className={`${styles.emergencyButton} ${emergencyMode ? styles.active : ''}`}
              onClick={handleEmergencyShutdown}
              disabled={saving}
            >
              <AlertTriangle size={20} />
              Notfall-Shutdown
            </button>
            <button
              className={`${styles.testModeButton} ${testMode ? styles.active : ''}`}
              onClick={() => setTestMode(!testMode)}
            >
              <FlaskConical size={20} />
              {testMode ? 'Test-Modus' : 'Live-Modus'}
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Features Total</div>
          </div>
          <div className={`${styles.statCard} ${styles.enabled}`}>
            <div className={styles.statValue}>{stats.enabled}</div>
            <div className={styles.statLabel}>Aktiviert</div>
          </div>
          <div className={`${styles.statCard} ${styles.disabled}`}>
            <div className={styles.statValue}>{stats.disabled}</div>
            <div className={styles.statLabel}>Deaktiviert</div>
          </div>
          <div className={`${styles.statCard} ${styles.critical}`}>
            <div className={styles.statValue}>{stats.critical}</div>
            <div className={styles.statLabel}>Kritisch</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.search}>
          <Search size={20} />
          <input
            type="text"
            placeholder="Features suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.categoryFilter}>
          <button
            className={selectedCategory === 'all' ? styles.active : ''}
            onClick={() => setSelectedCategory('all')}
          >
            Alle
          </button>
          {Object.values(FEATURE_CATEGORIES).map(category => (
            <button
              key={category.id}
              className={selectedCategory === category.id ? styles.active : ''}
              onClick={() => setSelectedCategory(category.id)}
              style={{ '--category-color': category.color }}
            >
              <category.icon size={16} />
              {category.name}
              <span className={styles.categoryCount}>
                {stats.byCategory[category.id]?.enabled}/{stats.byCategory[category.id]?.total}
              </span>
            </button>
          ))}
        </div>

        <div className={styles.actionButtons}>
          <button
            className={styles.iconButton}
            onClick={() => setShowBulkActions(!showBulkActions)}
            title="Bulk-Aktionen"
          >
            <Layers size={20} />
          </button>
          <button
            className={styles.iconButton}
            onClick={handleExportConfig}
            title="Konfiguration exportieren"
          >
            <Download size={20} />
          </button>
          <label className={styles.iconButton} title="Konfiguration importieren">
            <Upload size={20} />
            <input
              type="file"
              accept=".json"
              onChange={handleImportConfig}
              style={{ display: 'none' }}
            />
          </label>
          <button
            className={styles.iconButton}
            onClick={() => setShowAuditLog(!showAuditLog)}
            title="Audit Log"
          >
            <History size={20} />
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {showBulkActions && (
        <div className={styles.bulkActions}>
          <h3>Bulk-Aktionen</h3>
          <div className={styles.bulkActionButtons}>
            {Object.values(FEATURE_CATEGORIES).map(category => (
              <div key={category.id} className={styles.bulkActionGroup}>
                <span>{category.name}:</span>
                <button
                  className={styles.bulkEnableButton}
                  onClick={() => handleBulkToggle(category.id, true)}
                  disabled={saving}
                >
                  Alle aktivieren
                </button>
                <button
                  className={styles.bulkDisableButton}
                  onClick={() => handleBulkToggle(category.id, false)}
                  disabled={saving}
                >
                  Alle deaktivieren
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Features Grid */}
      <div className={styles.featuresGrid}>
        {filteredFeatures.map(feature => {
          const category = FEATURE_CATEGORIES[feature.category];
          const isEnabled = feature.masterControl.globalEnabled;
          const canToggle = testMode || feature.masterControl.canTenantDisable;

          return (
            <div 
              key={feature.id} 
              className={`${styles.featureCard} ${isEnabled ? styles.enabled : styles.disabled}`}
              style={{ '--category-color': category?.color }}
            >
              <div className={styles.featureHeader}>
                <div className={styles.featureIcon}>
                  {category && <category.icon size={24} />}
                </div>
                <h3>{feature.name}</h3>
                <button
                  className={styles.toggleButton}
                  onClick={() => handleToggleFeature(feature.id)}
                  disabled={!canToggle || saving}
                  title={!canToggle ? 'Kritisches Feature - kann nicht deaktiviert werden' : ''}
                >
                  {isEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
              </div>

              <p className={styles.featureDescription}>{feature.description}</p>

              {feature.dependencies?.length > 0 && (
                <div className={styles.dependencies}>
                  <span className={styles.dependencyLabel}>Benötigt:</span>
                  {feature.dependencies.map(dep => (
                    <span 
                      key={dep} 
                      className={`${styles.dependency} ${features[dep]?.masterControl?.globalEnabled ? styles.satisfied : styles.missing}`}
                    >
                      {features[dep]?.name || dep}
                    </span>
                  ))}
                </div>
              )}

              <div className={styles.featureFooter}>
                <span className={styles.categoryTag} style={{ backgroundColor: category?.color }}>
                  {category?.name}
                </span>
                
                {!feature.masterControl.canTenantDisable && (
                  <span className={styles.criticalTag}>
                    <Lock size={14} />
                    Kritisch
                  </span>
                )}

                {feature.masterControl.requiresRestart && (
                  <span className={styles.restartTag}>
                    <RefreshCw size={14} />
                    Neustart
                  </span>
                )}

                <button
                  className={styles.detailsButton}
                  onClick={() => setEditingFeature(feature)}
                >
                  <Settings size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {showAuditLog && (
        <Suspense fallback={<LoadingSpinner />}>
          <AuditLogPanel
            auditLog={auditLog}
            onClose={() => setShowAuditLog(false)}
          />
        </Suspense>
      )}

      {editingFeature && (
        <Suspense fallback={<LoadingSpinner />}>
          <FeatureDetailsModal
            feature={editingFeature}
            features={features}
            tenants={tenants}
            onClose={() => setEditingFeature(null)}
            onSave={handleToggleFeature}
          />
        </Suspense>
      )}
    </div>
  );
};

// ============================================================================
// TOGGLE COMPONENTS
// ============================================================================
const ToggleLeft = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="5" width="22" height="14" rx="7" ry="7" />
    <circle cx="8" cy="12" r="3" fill="currentColor" />
  </svg>
);

const ToggleRight = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="5" width="22" height="14" rx="7" ry="7" fill="currentColor" />
    <circle cx="16" cy="12" r="3" fill="white" />
  </svg>
);

export default FeatureControl;