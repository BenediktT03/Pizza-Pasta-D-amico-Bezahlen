/**
 * EATECH - Master Feature Control with Firebase Integration
 * Version: 25.0.0
 * Description: Zentrale Feature-Verwaltung mit Echtzeit-Firebase-Sync,
 *              Foodtruck-spezifischen Features und Gamification
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/pages/FeatureControl/FeatureControlWithFirebase.jsx
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  onValue, 
  set, 
  update, 
  push,
  serverTimestamp,
  get,
  child,
  off
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
  MapPin,
  Calendar,
  Trophy,
  Camera,
  Star,
  Heart,
  MessageSquare,
  Gift,
  TrendingDown,
  Activity,
  Navigation,
  CloudRain,
  Sun,
  Bell,
  BellOff,
  Timer,
  Package2,
  UserCheck
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
const CATEGORIES = {
  core: { 
    name: 'Kern-Features', 
    icon: Shield, 
    color: '#6366f1',
    description: 'Grundlegende System-Funktionen'
  },
  payment: { 
    name: 'Zahlungen', 
    icon: Package, 
    color: '#10b981',
    description: 'Payment-Provider und Zahlungsmethoden'
  },
  foodtruck: { 
    name: 'Foodtruck', 
    icon: Truck, 
    color: '#f59e0b',
    description: 'Spezielle Foodtruck-Features'
  },
  customer: { 
    name: 'Kunden', 
    icon: Users, 
    color: '#3b82f6',
    description: 'Kunden-Features und Engagement'
  },
  analytics: { 
    name: 'Analytics', 
    icon: BarChart3, 
    color: '#8b5cf6',
    description: 'Datenanalyse und Insights'
  },
  ai: { 
    name: 'KI-Features', 
    icon: Brain, 
    color: '#ec4899',
    description: 'Künstliche Intelligenz'
  },
  premium: { 
    name: 'Premium', 
    icon: Zap, 
    color: '#ff6b6b',
    description: 'Premium-Funktionen'
  }
};

// Foodtruck-spezifische Features
const FOODTRUCK_FEATURES = {
  // GPS & Location
  "foodtruck.gpsTracking": {
    name: "Live GPS Tracking",
    description: "Echtzeit-Standort nur wenn Foodtruck aktiv ist",
    category: "foodtruck",
    tier: "pro",
    icon: Navigation,
    dependencies: ["core.authentication"],
    config: {
      updateInterval: 30, // Sekunden
      autoDisableAfterHours: true
    }
  },
  
  // Calendar & Planning
  "foodtruck.calendar": {
    name: "Standort-Kalender",
    description: "Planung für bis zu 30 Tage im Voraus + kurzfristige Änderungen",
    category: "foodtruck",
    tier: "basic",
    icon: Calendar,
    dependencies: [],
    config: {
      maxDaysInAdvance: 30,
      allowSameDayChanges: true,
      notifyFavorites: true
    }
  },
  
  // Loyalty & Gamification
  "foodtruck.loyaltyProgram": {
    name: "Punkte-System",
    description: "1000 Punkte = 10% Rabatt, Reviews & Bilder geben Punkte",
    category: "customer",
    tier: "pro",
    icon: Trophy,
    dependencies: ["core.authentication"],
    config: {
      pointsPerCHF: 10,
      reviewPoints: 20,
      photoPoints: 50,
      redeemThreshold: 1000,
      redeemValue: 10 // Prozent Rabatt
    }
  },
  
  // Reviews
  "foodtruck.reviews": {
    name: "Review-System",
    description: "Max 1 Review + 1 Bild pro Woche pro Truck, Google Maps Integration",
    category: "customer",
    tier: "basic",
    icon: Star,
    dependencies: ["foodtruck.loyaltyProgram"],
    config: {
      cooldownDays: 7,
      maxPhotosPerReview: 1,
      googleMapsIntegration: true,
      requirePurchase: true
    }
  },
  
  // Favorites & Notifications
  "foodtruck.favoriteNotifications": {
    name: "Favoriten-Benachrichtigungen",
    description: "Push-Nachrichten nur für User die Truck als Favorit haben",
    category: "customer",
    tier: "basic",
    icon: Heart,
    dependencies: ["core.notifications"],
    config: {
      notifyOnLocation: true,
      notifyOnSpecials: true,
      notifyOnLowStock: false
    }
  },
  
  // Pre-Orders
  "foodtruck.preOrders": {
    name: "Vorbestellungen",
    description: "Vorbestellen mit genauer Uhrzeit wenn Standort bekannt",
    category: "foodtruck",
    tier: "pro",
    icon: Timer,
    dependencies: ["foodtruck.calendar", "core.ordering"],
    config: {
      requireAccount: true,
      maxDaysInAdvance: 7,
      minHoursNotice: 1
    }
  },
  
  // Analytics
  "foodtruck.analytics": {
    name: "Erweiterte Analytics",
    description: "Verkaufsanalysen, Trends, beste Tage/Produkte",
    category: "analytics",
    tier: "pro",
    icon: TrendingUp,
    dependencies: ["analytics.basic"],
    config: {
      dashboards: ["sales", "products", "customers", "trends"],
      exportFormats: ["pdf", "excel", "csv"],
      realtime: true
    }
  },
  
  // Regular Customer Recognition
  "foodtruck.regularCustomer": {
    name: "Stammkunden-Erkennung",
    description: "Nach 5 Bestellungen automatisch Stammkunde mit Vorteilen",
    category: "customer",
    tier: "pro",
    icon: UserCheck,
    dependencies: ["core.authentication"],
    config: {
      threshold: 5,
      benefits: ["priority_queue", "special_offers", "birthday_discount"],
      autoUpgrade: true
    }
  },
  
  // Smart Notifications
  "foodtruck.smartNotifications": {
    name: "Intelligente Benachrichtigungen",
    description: "Nur noch 5 Portionen!, Foodtruck ist da!, etc.",
    category: "foodtruck",
    tier: "premium",
    icon: Bell,
    dependencies: ["foodtruck.favoriteNotifications", "ai.predictions"],
    config: {
      lowStockThreshold: 5,
      arrivalRadius: 500, // Meter
      personalized: true
    }
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const FeatureControlWithFirebase = () => {
  // State Management
  const [features, setFeatures] = useState({});
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedFeatures, setSelectedFeatures] = useState(new Set());
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [pendingChanges, setPendingChanges] = useState({});
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  
  // Filters
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [usageFilter, setUsageFilter] = useState([0, 100]);
  
  // Firebase refs
  const featuresRef = useRef(null);
  const tenantsRef = useRef(null);

  // ========================================================================
  // FIREBASE SUBSCRIPTIONS
  // ========================================================================
  useEffect(() => {
    // Subscribe to features
    featuresRef.current = ref(database, 'features');
    const unsubscribeFeatures = onValue(featuresRef.current, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Merge with local foodtruck features
        const mergedFeatures = {
          ...FOODTRUCK_FEATURES,
          ...data
        };
        setFeatures(mergedFeatures);
      } else {
        // Initialize with foodtruck features if empty
        setFeatures(FOODTRUCK_FEATURES);
      }
      setLastSync(new Date());
    }, (error) => {
      console.error('Error loading features:', error);
      setError('Fehler beim Laden der Features');
    });

    // Subscribe to tenants
    tenantsRef.current = ref(database, 'tenants');
    const unsubscribeTenants = onValue(tenantsRef.current, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const tenantList = Object.entries(data).map(([id, tenant]) => ({
          id,
          ...tenant.info,
          stats: tenant.stats || {},
          features: tenant.features || {}
        }));
        setTenants(tenantList);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error loading tenants:', error);
      setError('Fehler beim Laden der Tenants');
      setLoading(false);
    });

    // Cleanup
    return () => {
      if (featuresRef.current) off(featuresRef.current);
      if (tenantsRef.current) off(tenantsRef.current);
    };
  }, []);

  // ========================================================================
  // COMPUTED VALUES
  // ========================================================================
  const filteredFeatures = useMemo(() => {
    return Object.entries(features).filter(([key, feature]) => {
      // Search filter
      const matchesSearch = 
        key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feature.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feature.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Category filter
      const matchesCategory = selectedCategory === 'all' || feature.category === selectedCategory;
      
      // Tier filter
      const matchesTier = tierFilter === 'all' || feature.tier === tierFilter;
      
      // Status filter
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'enabled' && feature.enabled) ||
        (statusFilter === 'disabled' && !feature.enabled);
      
      // Usage filter
      const usage = feature.usagePercentage || 0;
      const matchesUsage = usage >= usageFilter[0] && usage <= usageFilter[1];
      
      return matchesSearch && matchesCategory && matchesTier && matchesStatus && matchesUsage;
    });
  }, [features, searchTerm, selectedCategory, tierFilter, statusFilter, usageFilter]);

  const categoryStats = useMemo(() => {
    const stats = {};
    Object.values(features).forEach(feature => {
      const category = feature.category || 'other';
      if (!stats[category]) {
        stats[category] = {
          total: 0,
          enabled: 0,
          usage: 0
        };
      }
      stats[category].total++;
      if (feature.enabled) stats[category].enabled++;
      stats[category].usage += (feature.usagePercentage || 0);
    });
    
    // Calculate averages
    Object.keys(stats).forEach(cat => {
      if (stats[cat].total > 0) {
        stats[cat].usage = Math.round(stats[cat].usage / stats[cat].total);
      }
    });
    
    return stats;
  }, [features]);

  const globalStats = useMemo(() => {
    const total = Object.keys(features).length;
    const enabled = Object.values(features).filter(f => f.enabled).length;
    const avgUsage = total > 0 ? Math.round(
      Object.values(features).reduce((sum, f) => sum + (f.usagePercentage || 0), 0) / total
    ) : 0;
    const activeTenantsTotal = tenants.filter(t => t.status === 'active').length;
    
    return { total, enabled, avgUsage, activeTenantsTotal };
  }, [features, tenants]);

  // ========================================================================
  // HANDLERS
  // ========================================================================
  const handleFeatureToggle = useCallback(async (featureKey, enabled) => {
    const feature = features[featureKey];
    
    // Check dependencies
    if (enabled && feature.dependencies) {
      const missingDeps = feature.dependencies.filter(dep => !features[dep]?.enabled);
      
      if (missingDeps.length > 0) {
        const depNames = missingDeps.map(dep => features[dep]?.name || dep).join(', ');
        if (!confirm(`Diese Funktion benötigt: ${depNames}. Trotzdem aktivieren?`)) {
          return;
        }
      }
    }
    
    // Update pending changes
    setPendingChanges(prev => ({
      ...prev,
      [featureKey]: { ...feature, enabled }
    }));
  }, [features]);

  const handleBulkAction = useCallback((action) => {
    if (selectedFeatures.size === 0) {
      alert('Bitte wählen Sie mindestens ein Feature aus');
      return;
    }
    
    const updates = {};
    selectedFeatures.forEach(key => {
      if (action === 'enable') {
        updates[key] = { ...features[key], enabled: true };
      } else if (action === 'disable') {
        updates[key] = { ...features[key], enabled: false };
      }
    });
    
    setPendingChanges(prev => ({ ...prev, ...updates }));
    setSelectedFeatures(new Set());
    setBulkActionMode(false);
  }, [selectedFeatures, features]);

  const handleSaveChanges = useCallback(async () => {
    if (Object.keys(pendingChanges).length === 0) return;
    
    setSaving(true);
    setError(null);
    
    try {
      // Prepare updates for Firebase
      const updates = {};
      
      Object.entries(pendingChanges).forEach(([key, feature]) => {
        updates[`features/${key}`] = {
          ...feature,
          lastModified: serverTimestamp(),
          modifiedBy: 'master@eatech.ch' // Should come from auth context
        };
        
        // Log feature change
        const logRef = push(ref(database, 'logs/featureChanges'));
        updates[`logs/featureChanges/${logRef.key}`] = {
          featureKey: key,
          previousState: features[key]?.enabled,
          newState: feature.enabled,
          timestamp: serverTimestamp(),
          user: 'master@eatech.ch'
        };
      });
      
      // Apply updates
      await update(ref(database), updates);
      
      // Clear pending changes
      setPendingChanges({});
      
      // Show success message
      alert(`${Object.keys(pendingChanges).length} Features erfolgreich aktualisiert`);
      
    } catch (error) {
      console.error('Error saving changes:', error);
      setError('Fehler beim Speichern der Änderungen');
    } finally {
      setSaving(false);
    }
  }, [pendingChanges, features]);

  const handleTenantOverride = useCallback(async (tenantId, featureKey, enabled) => {
    try {
      const overrideRef = ref(database, `tenants/${tenantId}/features/${featureKey}`);
      await update(overrideRef, {
        enabled,
        overriddenAt: serverTimestamp(),
        overriddenBy: 'master@eatech.ch'
      });
      
      alert(`Feature-Override für Tenant ${tenantId} gespeichert`);
    } catch (error) {
      console.error('Error saving tenant override:', error);
      alert('Fehler beim Speichern des Overrides');
    }
  }, []);

  const handleExportConfig = useCallback(() => {
    const config = {
      exportDate: new Date().toISOString(),
      features: features,
      tenantOverrides: {},
      stats: globalStats
    };
    
    // Add tenant overrides
    tenants.forEach(tenant => {
      if (tenant.features && Object.keys(tenant.features).length > 0) {
        config.tenantOverrides[tenant.id] = tenant.features;
      }
    });
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eatech-features-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [features, tenants, globalStats]);

  const handleImportConfig = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const config = JSON.parse(text);
      
      if (!config.features) {
        throw new Error('Invalid configuration file');
      }
      
      if (confirm('Möchten Sie die importierte Konfiguration anwenden? Dies überschreibt die aktuellen Einstellungen.')) {
        const updates = {};
        
        Object.entries(config.features).forEach(([key, feature]) => {
          updates[`features/${key}`] = {
            ...feature,
            importedAt: serverTimestamp(),
            importedBy: 'master@eatech.ch'
          };
        });
        
        await update(ref(database), updates);
        alert('Konfiguration erfolgreich importiert');
      }
    } catch (error) {
      console.error('Error importing config:', error);
      alert('Fehler beim Importieren der Konfiguration');
    }
    
    // Reset input
    event.target.value = '';
  }, []);

  // ========================================================================
  // RENDER HELPERS
  // ========================================================================
  const renderFeatureCard = (key, feature) => {
    const isSelected = selectedFeatures.has(key);
    const hasPendingChange = pendingChanges[key] !== undefined;
    const currentEnabled = pendingChanges[key]?.enabled ?? feature.enabled;
    const Icon = feature.icon || CATEGORIES[feature.category]?.icon || Zap;
    
    return (
      <div 
        key={key}
        className={`${styles.featureCard} ${isSelected ? styles.selected : ''} ${hasPendingChange ? styles.pending : ''}`}
        onClick={() => bulkActionMode && setSelectedFeatures(prev => {
          const newSet = new Set(prev);
          if (newSet.has(key)) {
            newSet.delete(key);
          } else {
            newSet.add(key);
          }
          return newSet;
        })}
      >
        {bulkActionMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            className={styles.checkbox}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        
        <div className={styles.featureHeader}>
          <div className={styles.featureInfo}>
            <div className={styles.featureIcon} style={{ backgroundColor: `${CATEGORIES[feature.category]?.color}20` }}>
              <Icon size={20} style={{ color: CATEGORIES[feature.category]?.color }} />
            </div>
            <div>
              <h3>{feature.name}</h3>
              <p className={styles.featureKey}>{key}</p>
            </div>
          </div>
          
          <div className={styles.featureActions}>
            <button
              className={`${styles.toggleButton} ${currentEnabled ? styles.enabled : styles.disabled}`}
              onClick={(e) => {
                e.stopPropagation();
                handleFeatureToggle(key, !currentEnabled);
              }}
              disabled={bulkActionMode}
            >
              <Power size={16} />
              {currentEnabled ? 'Aktiv' : 'Inaktiv'}
            </button>
            
            <button
              className={styles.editButton}
              onClick={(e) => {
                e.stopPropagation();
                setEditingFeature({ key, ...feature });
              }}
              disabled={bulkActionMode}
            >
              <Edit size={16} />
            </button>
          </div>
        </div>
        
        <p className={styles.featureDescription}>{feature.description}</p>
        
        <div className={styles.featureFooter}>
          <div className={styles.featureMeta}>
            <span className={`${styles.tier} ${styles[feature.tier || 'basic']}`}>
              {feature.tier || 'basic'}
            </span>
            {feature.dependencies && feature.dependencies.length > 0 && (
              <span className={styles.dependencies}>
                <Lock size={14} />
                {feature.dependencies.length} Abhängigkeiten
              </span>
            )}
          </div>
          
          <div className={styles.featureStats}>
            {feature.activeTenantsCount !== undefined && (
              <span>
                <Users size={14} />
                {feature.activeTenantsCount}
              </span>
            )}
            {feature.usagePercentage !== undefined && (
              <span>
                <Activity size={14} />
                {feature.usagePercentage}%
              </span>
            )}
          </div>
        </div>
        
        {hasPendingChange && (
          <div className={styles.pendingIndicator}>
            <AlertCircle size={14} />
            Ungespeicherte Änderung
          </div>
        )}
        
        {feature.config && (
          <div className={styles.featureConfig}>
            <h4>Konfiguration:</h4>
            <pre>{JSON.stringify(feature.config, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  };

  // ========================================================================
  // RENDER
  // ========================================================================
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Lade Features...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle size={48} />
        <h2>Fehler</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          <RefreshCw size={20} />
          Neu laden
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h1>Feature Control Center</h1>
            <p>Verwalten Sie alle System-Features und Tenant-spezifische Einstellungen</p>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.connectionStatus}>
              <CheckCircle2 size={16} />
              Firebase verbunden
              {lastSync && (
                <span className={styles.lastSync}>
                  Letzte Sync: {lastSync.toLocaleTimeString()}
                </span>
              )}
            </div>
            <button className={styles.syncButton} onClick={() => window.location.reload()}>
              <RefreshCw size={20} />
              Sync
            </button>
            <input
              type="file"
              accept=".json"
              onChange={handleImportConfig}
              style={{ display: 'none' }}
              id="import-config"
            />
            <label htmlFor="import-config" className={styles.importButton}>
              <Upload size={20} />
              Import
            </label>
            <button className={styles.exportButton} onClick={handleExportConfig}>
              <Download size={20} />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {showStats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <Package size={24} />
            </div>
            <div className={styles.statContent}>
              <h3>{globalStats.total}</h3>
              <p>Features Total</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <CheckCircle2 size={24} />
            </div>
            <div className={styles.statContent}>
              <h3>{globalStats.enabled}</h3>
              <p>Aktiv</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <Activity size={24} />
            </div>
            <div className={styles.statContent}>
              <h3>{globalStats.avgUsage}%</h3>
              <p>Ø Nutzung</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <Truck size={24} />
            </div>
            <div className={styles.statContent}>
              <h3>{globalStats.activeTenantsTotal}</h3>
              <p>Aktive Foodtrucks</p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Actions Bar */}
      <div className={styles.actionBar}>
        <div className={styles.searchBar}>
          <Search size={20} />
          <input
            type="text"
            placeholder="Features suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className={styles.actions}>
          <button 
            className={styles.filterButton}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} />
            Filter
            {(tierFilter !== 'all' || statusFilter !== 'all' || selectedCategory !== 'all') && (
              <span className={styles.filterBadge}>!</span>
            )}
          </button>
          
          <button
            className={`${styles.bulkButton} ${bulkActionMode ? styles.active : ''}`}
            onClick={() => {
              setBulkActionMode(!bulkActionMode);
              setSelectedFeatures(new Set());
            }}
          >
            <Copy size={20} />
            Bulk Actions
          </button>
          
          <div className={styles.viewModeToggle}>
            <button 
              className={viewMode === 'grid' ? styles.active : ''}
              onClick={() => setViewMode('grid')}
            >
              <Package size={20} />
            </button>
            <button 
              className={viewMode === 'list' ? styles.active : ''}
              onClick={() => setViewMode('list')}
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className={styles.filterBar}>
          <div className={styles.filterGroup}>
            <label>Tier</label>
            <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
              <option value="all">Alle Tiers</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          
          <div className={styles.filterGroup}>
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Alle Status</option>
              <option value="enabled">Aktiv</option>
              <option value="disabled">Inaktiv</option>
            </select>
          </div>
          
          <div className={styles.filterGroup}>
            <label>Nutzung</label>
            <div className={styles.rangeFilter}>
              <input
                type="range"
                min="0"
                max="100"
                value={usageFilter[0]}
                onChange={(e) => setUsageFilter([parseInt(e.target.value), usageFilter[1]])}
              />
              <span>{usageFilter[0]}% - {usageFilter[1]}%</span>
              <input
                type="range"
                min="0"
                max="100"
                value={usageFilter[1]}
                onChange={(e) => setUsageFilter([usageFilter[0], parseInt(e.target.value)])}
              />
            </div>
          </div>
          
          <button 
            className={styles.resetFilters}
            onClick={() => {
              setTierFilter('all');
              setStatusFilter('all');
              setUsageFilter([0, 100]);
              setSelectedCategory('all');
            }}
          >
            <X size={16} />
            Reset
          </button>
        </div>
      )}

      {/* Tenant Selector */}
      {selectedTenant && (
        <div className={styles.tenantSelector}>
          <span>
            <Truck size={16} />
            Ausgewählter Foodtruck: <strong>{selectedTenant.name}</strong>
          </span>
          <button onClick={() => setShowTenantModal(true)}>
            <ChevronRight size={16} />
          </button>
          <button onClick={() => setSelectedTenant(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Category Tabs */}
      <div className={styles.categoryTabs}>
        <button
          className={`${styles.categoryTab} ${selectedCategory === 'all' ? styles.active : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          Alle
          <span className={styles.badge}>{Object.keys(features).length}</span>
        </button>
        
        {Object.entries(CATEGORIES).map(([key, category]) => {
          const count = Object.values(features).filter(f => f.category === key).length;
          if (count === 0) return null;
          
          return (
            <button
              key={key}
              className={`${styles.categoryTab} ${selectedCategory === key ? styles.active : ''}`}
              onClick={() => setSelectedCategory(key)}
            >
              <category.icon size={16} />
              {category.name}
              <span className={styles.badge}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Bulk Actions Bar */}
      {bulkActionMode && selectedFeatures.size > 0 && (
        <div className={styles.bulkActionsBar}>
          <span>{selectedFeatures.size} Features ausgewählt</span>
          <div className={styles.bulkActions}>
            <button onClick={() => handleBulkAction('enable')}>
              <CheckCircle2 size={16} />
              Aktivieren
            </button>
            <button onClick={() => handleBulkAction('disable')}>
              <X size={16} />
              Deaktivieren
            </button>
            <button onClick={() => setSelectedFeatures(new Set())}>
              Auswahl aufheben
            </button>
          </div>
        </div>
      )}

      {/* Features Grid/List */}
      <div className={`${styles.featuresContainer} ${styles[viewMode]}`}>
        {filteredFeatures.length === 0 ? (
          <div className={styles.emptyState}>
            <Package size={48} />
            <h3>Keine Features gefunden</h3>
            <p>Versuchen Sie es mit anderen Filtereinstellungen</p>
          </div>
        ) : (
          filteredFeatures.map(([key, feature]) => renderFeatureCard(key, feature))
        )}
      </div>

      {/* Pending Changes Bar */}
      {Object.keys(pendingChanges).length > 0 && (
        <div className={styles.pendingBar}>
          <div className={styles.pendingInfo}>
            <AlertCircle size={20} />
            <span>{Object.keys(pendingChanges).length} ungespeicherte Änderungen</span>
          </div>
          <div className={styles.pendingActions}>
            <button 
              className={styles.discardButton}
              onClick={() => setPendingChanges({})}
            >
              Verwerfen
            </button>
            <button 
              className={styles.saveButton}
              onClick={handleSaveChanges}
              disabled={saving}
            >
              {saving ? (
                <>
                  <RefreshCw size={16} className={styles.spinning} />
                  Speichern...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Änderungen speichern
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showTenantModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Foodtruck auswählen</h2>
              <button onClick={() => setShowTenantModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className={styles.tenantList}>
              {tenants.map(tenant => (
                <div 
                  key={tenant.id}
                  className={styles.tenantItem}
                  onClick={() => {
                    setSelectedTenant(tenant);
                    setShowTenantModal(false);
                  }}
                >
                  <div>
                    <h3>{tenant.name}</h3>
                    <p>{tenant.address?.city || 'Unbekannt'} • {tenant.plan || 'basic'}</p>
                  </div>
                  <div className={styles.tenantStats}>
                    <span>{tenant.stats?.activeFeatures || 0} Features</span>
                    <span>{tenant.stats?.customOverrides || 0} Overrides</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {editingFeature && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Feature bearbeiten: {editingFeature.name}</h2>
              <button onClick={() => setEditingFeature(null)}>
                <X size={24} />
              </button>
            </div>
            <div className={styles.editForm}>
              <div className={styles.formGroup}>
                <label>Name</label>
                <input
                  type="text"
                  value={editingFeature.name}
                  onChange={(e) => setEditingFeature({
                    ...editingFeature,
                    name: e.target.value
                  })}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Beschreibung</label>
                <textarea
                  value={editingFeature.description}
                  onChange={(e) => setEditingFeature({
                    ...editingFeature,
                    description: e.target.value
                  })}
                  rows={3}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Kategorie</label>
                <select
                  value={editingFeature.category}
                  onChange={(e) => setEditingFeature({
                    ...editingFeature,
                    category: e.target.value
                  })}
                >
                  {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>{cat.name}</option>
                  ))}
                </select>
              </div>
              
              <div className={styles.formGroup}>
                <label>Tier</label>
                <select
                  value={editingFeature.tier}
                  onChange={(e) => setEditingFeature({
                    ...editingFeature,
                    tier: e.target.value
                  })}
                >
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              
              {editingFeature.config && (
                <div className={styles.formGroup}>
                  <label>Konfiguration (JSON)</label>
                  <textarea
                    value={JSON.stringify(editingFeature.config, null, 2)}
                    onChange={(e) => {
                      try {
                        const config = JSON.parse(e.target.value);
                        setEditingFeature({
                          ...editingFeature,
                          config
                        });
                      } catch (error) {
                        // Invalid JSON, ignore
                      }
                    }}
                    rows={8}
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
              )}
            </div>
            
            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelButton}
                onClick={() => setEditingFeature(null)}
              >
                Abbrechen
              </button>
              <button 
                className={styles.saveButton}
                onClick={async () => {
                  setPendingChanges(prev => ({
                    ...prev,
                    [editingFeature.key]: editingFeature
                  }));
                  setEditingFeature(null);
                }}
              >
                <Save size={16} />
                Übernehmen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureControlWithFirebase;