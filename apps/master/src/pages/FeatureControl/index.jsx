/**
 * EATECH - Feature Control Page
 * Version: 1.0.0
 * Description: Feature Flags Management für dynamische Feature-Kontrolle
 *              pro Tenant/Foodtruck mit A/B Testing Support
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/master/src/pages/FeatureControl/index.jsx
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ToggleLeft,
  ToggleRight,
  Settings,
  Users,
  Percent,
  Calendar,
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  Copy,
  Save,
  X,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Info,
  Clock,
  Target,
  GitBranch,
  Zap,
  Shield,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Upload,
  Code,
  FileText,
  BarChart3,
  TrendingUp,
  Package,
  Layers,
  Flag,
  PlayCircle,
  PauseCircle,
  TestTube,
  Beaker,
  Activity,
  Hash,
  Tag,
  Globe,
  Lock,
  Unlock,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import styles from './FeatureControl.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const FEATURE_CATEGORIES = {
  core: { label: 'Core Features', icon: Package, color: '#3b82f6' },
  payments: { label: 'Zahlungen', icon: CreditCard, color: '#10b981' },
  ordering: { label: 'Bestellsystem', icon: ShoppingBag, color: '#f59e0b' },
  marketing: { label: 'Marketing', icon: TrendingUp, color: '#8b5cf6' },
  analytics: { label: 'Analytics', icon: BarChart3, color: '#ef4444' },
  experimental: { label: 'Experimental', icon: Beaker, color: '#ec4899' },
  security: { label: 'Sicherheit', icon: Shield, color: '#6b7280' }
};

const FEATURE_STATUS = {
  active: { label: 'Aktiv', color: '#10b981', icon: CheckCircle },
  inactive: { label: 'Inaktiv', color: '#6b7280', icon: XCircle },
  testing: { label: 'Testing', color: '#f59e0b', icon: TestTube },
  scheduled: { label: 'Geplant', color: '#3b82f6', icon: Clock },
  deprecated: { label: 'Veraltet', color: '#ef4444', icon: AlertCircle }
};

const ROLLOUT_STRATEGIES = {
  all: { label: 'Alle Nutzer', icon: Users },
  percentage: { label: 'Prozentual', icon: Percent },
  targeted: { label: 'Zielgruppe', icon: Target },
  gradual: { label: 'Schrittweise', icon: TrendingUp },
  canary: { label: 'Canary', icon: GitBranch }
};

const TARGET_TYPES = {
  tenant: 'Einzelner Foodtruck',
  category: 'Foodtruck Kategorie',
  region: 'Region',
  plan: 'Subscription Plan',
  custom: 'Benutzerdefiniert'
};

// ============================================================================
// MOCK DATA
// ============================================================================
const MOCK_FEATURES = [
  {
    id: 'feat_001',
    key: 'voice_ordering',
    name: 'Voice Ordering',
    description: 'Sprachgesteuerte Bestellungen über Google Assistant / Siri',
    category: 'ordering',
    status: 'testing',
    rolloutStrategy: 'percentage',
    rolloutPercentage: 25,
    targets: [],
    dependencies: ['speech_api', 'nlp_service'],
    created: '2025-01-05T10:00:00Z',
    modified: '2025-01-07T14:30:00Z',
    modifiedBy: 'admin@eatech.ch',
    metrics: {
      adoption: 0.18,
      conversionRate: 0.22,
      errorRate: 0.03,
      userSatisfaction: 4.2
    },
    config: {
      supportedLanguages: ['de', 'en', 'fr'],
      maxOrderValue: 200,
      requiresConfirmation: true
    },
    schedule: null
  },
  {
    id: 'feat_002',
    key: 'dynamic_pricing',
    name: 'Dynamic Pricing',
    description: 'KI-basierte dynamische Preisanpassung basierend auf Nachfrage',
    category: 'marketing',
    status: 'active',
    rolloutStrategy: 'targeted',
    rolloutPercentage: 100,
    targets: ['premium_plan', 'enterprise_plan'],
    dependencies: ['ml_pricing_model', 'demand_forecast'],
    created: '2024-12-15T09:00:00Z',
    modified: '2025-01-06T11:20:00Z',
    modifiedBy: 'product@eatech.ch',
    metrics: {
      revenueUplift: 0.145,
      priceAdjustments: 324,
      customerComplaints: 2
    },
    config: {
      maxPriceIncrease: 0.15,
      maxPriceDecrease: 0.20,
      updateFrequency: 'hourly',
      blackoutPeriods: ['11:30-14:00', '18:00-20:00']
    },
    schedule: null
  },
  {
    id: 'feat_003',
    key: 'loyalty_program',
    name: 'Treueprogramm 2.0',
    description: 'Erweitertes Treueprogramm mit Gamification-Elementen',
    category: 'marketing',
    status: 'scheduled',
    rolloutStrategy: 'gradual',
    rolloutPercentage: 0,
    targets: [],
    dependencies: ['points_system', 'rewards_engine'],
    created: '2025-01-08T08:00:00Z',
    modified: '2025-01-08T08:00:00Z',
    modifiedBy: 'admin@eatech.ch',
    metrics: null,
    config: {
      pointsPerChf: 10,
      tiers: ['Bronze', 'Silver', 'Gold', 'Platinum'],
      expiryMonths: 12
    },
    schedule: {
      startDate: '2025-02-01T00:00:00Z',
      phases: [
        { date: '2025-02-01', percentage: 10 },
        { date: '2025-02-15', percentage: 25 },
        { date: '2025-03-01', percentage: 50 },
        { date: '2025-03-15', percentage: 100 }
      ]
    }
  },
  {
    id: 'feat_004',
    key: 'crypto_payments',
    name: 'Krypto-Zahlungen',
    description: 'Bitcoin und Ethereum Zahlungsintegration',
    category: 'payments',
    status: 'inactive',
    rolloutStrategy: 'all',
    rolloutPercentage: 0,
    targets: [],
    dependencies: ['blockchain_service', 'wallet_integration'],
    created: '2024-11-20T12:00:00Z',
    modified: '2024-12-28T16:45:00Z',
    modifiedBy: 'tech@eatech.ch',
    metrics: {
      transactionVolume: 0,
      adoptionRate: 0
    },
    config: {
      acceptedCurrencies: ['BTC', 'ETH'],
      confirmationBlocks: 3,
      maxTransactionValue: 500
    },
    schedule: null
  },
  {
    id: 'feat_005',
    key: 'predictive_inventory',
    name: 'Predictive Inventory',
    description: 'KI-gestützte Lagerbestandsvorhersage',
    category: 'analytics',
    status: 'active',
    rolloutStrategy: 'all',
    rolloutPercentage: 100,
    targets: [],
    dependencies: ['inventory_tracking', 'ml_forecast'],
    created: '2024-10-10T14:00:00Z',
    modified: '2025-01-03T09:15:00Z',
    modifiedBy: 'ops@eatech.ch',
    metrics: {
      wasteReduction: 0.23,
      stockoutReduction: 0.31,
      accuracy: 0.87
    },
    config: {
      forecastDays: 7,
      minConfidence: 0.75,
      autoOrderThreshold: 0.2
    },
    schedule: null
  }
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const calculateActiveUsers = (feature) => {
  if (feature.status !== 'active' && feature.status !== 'testing') return 0;
  
  const totalUsers = 50000; // Mock total users
  if (feature.rolloutStrategy === 'all') return totalUsers;
  if (feature.rolloutStrategy === 'percentage') {
    return Math.floor(totalUsers * (feature.rolloutPercentage / 100));
  }
  if (feature.rolloutStrategy === 'targeted') {
    // Mock calculation based on targets
    return Math.floor(totalUsers * 0.3);
  }
  return 0;
};

const getFeatureHealth = (feature) => {
  if (!feature.metrics) return 'unknown';
  
  const { errorRate, userSatisfaction } = feature.metrics;
  if (errorRate && errorRate > 0.05) return 'critical';
  if (userSatisfaction && userSatisfaction < 3.5) return 'warning';
  return 'healthy';
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
const FeatureCard = ({ feature, onEdit, onToggle, onDuplicate, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  const category = FEATURE_CATEGORIES[feature.category];
  const status = FEATURE_STATUS[feature.status];
  const StatusIcon = status.icon;
  const CategoryIcon = category.icon;
  
  const activeUsers = calculateActiveUsers(feature);
  const health = getFeatureHealth(feature);
  
  return (
    <div className={`${styles.featureCard} ${styles[feature.status]}`}>
      <div className={styles.cardHeader}>
        <div className={styles.featureInfo}>
          <div className={styles.featureIcon} style={{ backgroundColor: `${category.color}20` }}>
            <CategoryIcon size={20} style={{ color: category.color }} />
          </div>
          <div>
            <h3>{feature.name}</h3>
            <code className={styles.featureKey}>{feature.key}</code>
          </div>
        </div>
        
        <div className={styles.cardActions}>
          <div className={styles.statusBadge} style={{ backgroundColor: `${status.color}20`, color: status.color }}>
            <StatusIcon size={14} />
            <span>{status.label}</span>
          </div>
          
          <button
            className={styles.toggleButton}
            onClick={() => onToggle(feature)}
            disabled={feature.status === 'deprecated'}
          >
            {feature.status === 'active' || feature.status === 'testing' ? (
              <ToggleRight size={24} style={{ color: '#10b981' }} />
            ) : (
              <ToggleLeft size={24} style={{ color: '#6b7280' }} />
            )}
          </button>
        </div>
      </div>
      
      <p className={styles.featureDescription}>{feature.description}</p>
      
      <div className={styles.featureStats}>
        <div className={styles.stat}>
          <Users size={14} />
          <span>{activeUsers.toLocaleString()} Nutzer</span>
        </div>
        <div className={styles.stat}>
          <GitBranch size={14} />
          <span>{ROLLOUT_STRATEGIES[feature.rolloutStrategy].label}</span>
        </div>
        {feature.rolloutStrategy === 'percentage' && (
          <div className={styles.stat}>
            <Percent size={14} />
            <span>{feature.rolloutPercentage}%</span>
          </div>
        )}
        {health !== 'unknown' && (
          <div className={`${styles.stat} ${styles[health]}`}>
            <Activity size={14} />
            <span>{health === 'healthy' ? 'Gesund' : health === 'warning' ? 'Warnung' : 'Kritisch'}</span>
          </div>
        )}
      </div>
      
      {feature.schedule && (
        <div className={styles.scheduleInfo}>
          <Clock size={14} />
          <span>Rollout startet: {new Date(feature.schedule.startDate).toLocaleDateString('de-CH')}</span>
        </div>
      )}
      
      <div className={styles.cardFooter}>
        <button
          className={styles.expandButton}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Weniger' : 'Mehr'} Details
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        
        <div className={styles.actionButtons}>
          <button onClick={() => onEdit(feature)} title="Bearbeiten">
            <Edit3 size={16} />
          </button>
          <button onClick={() => onDuplicate(feature)} title="Duplizieren">
            <Copy size={16} />
          </button>
          <button 
            onClick={() => onDelete(feature)} 
            title="Löschen"
            className={styles.deleteButton}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      {expanded && (
        <div className={styles.expandedContent}>
          {/* Metrics */}
          {feature.metrics && (
            <div className={styles.metricsSection}>
              <h4>Metriken</h4>
              <div className={styles.metricsGrid}>
                {Object.entries(feature.metrics).map(([key, value]) => (
                  <div key={key} className={styles.metricItem}>
                    <span className={styles.metricLabel}>{key}</span>
                    <span className={styles.metricValue}>
                      {typeof value === 'number' && value < 1 ? 
                        `${(value * 100).toFixed(1)}%` : 
                        value.toLocaleString()
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Dependencies */}
          {feature.dependencies.length > 0 && (
            <div className={styles.dependenciesSection}>
              <h4>Abhängigkeiten</h4>
              <div className={styles.dependenciesList}>
                {feature.dependencies.map(dep => (
                  <span key={dep} className={styles.dependency}>
                    <Layers size={12} />
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Targets */}
          {feature.targets.length > 0 && (
            <div className={styles.targetsSection}>
              <h4>Zielgruppen</h4>
              <div className={styles.targetsList}>
                {feature.targets.map(target => (
                  <span key={target} className={styles.target}>
                    <Target size={12} />
                    {target}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Configuration */}
          <div className={styles.configSection}>
            <button
              className={styles.configToggle}
              onClick={() => setShowConfig(!showConfig)}
            >
              <Code size={16} />
              Konfiguration
              {showConfig ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {showConfig && (
              <pre className={styles.configCode}>
                {JSON.stringify(feature.config, null, 2)}
              </pre>
            )}
          </div>
          
          {/* Metadata */}
          <div className={styles.metadata}>
            <div className={styles.metadataItem}>
              <Calendar size={12} />
              <span>Erstellt: {new Date(feature.created).toLocaleDateString('de-CH')}</span>
            </div>
            <div className={styles.metadataItem}>
              <Clock size={12} />
              <span>Geändert: {new Date(feature.modified).toLocaleDateString('de-CH')}</span>
            </div>
            <div className={styles.metadataItem}>
              <Users size={12} />
              <span>Von: {feature.modifiedBy}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const FeatureControl = () => {
  const [features, setFeatures] = useState(MOCK_FEATURES);
  const [filteredFeatures, setFilteredFeatures] = useState(MOCK_FEATURES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  
  // Filter features
  useEffect(() => {
    let filtered = [...features];
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(feature =>
        feature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feature.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feature.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(feature => feature.category === selectedCategory);
    }
    
    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(feature => feature.status === selectedStatus);
    }
    
    setFilteredFeatures(filtered);
  }, [features, searchQuery, selectedCategory, selectedStatus]);
  
  // Calculate statistics
  const stats = useMemo(() => {
    const active = features.filter(f => f.status === 'active').length;
    const testing = features.filter(f => f.status === 'testing').length;
    const totalUsers = features.reduce((sum, f) => sum + calculateActiveUsers(f), 0);
    
    return {
      total: features.length,
      active,
      testing,
      inactive: features.length - active - testing,
      totalUsers
    };
  }, [features]);
  
  // Handlers
  const handleToggle = useCallback((feature) => {
    const newStatus = feature.status === 'active' ? 'inactive' : 
                     feature.status === 'inactive' ? 'active' : feature.status;
    
    setFeatures(prev => prev.map(f => 
      f.id === feature.id ? { ...f, status: newStatus, modified: new Date().toISOString() } : f
    ));
  }, []);
  
  const handleEdit = useCallback((feature) => {
    setEditingFeature(feature);
    setShowCreateModal(true);
  }, []);
  
  const handleDuplicate = useCallback((feature) => {
    const duplicated = {
      ...feature,
      id: `feat_${Date.now()}`,
      key: `${feature.key}_copy`,
      name: `${feature.name} (Kopie)`,
      status: 'inactive',
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    };
    
    setFeatures(prev => [duplicated, ...prev]);
  }, []);
  
  const handleDelete = useCallback((feature) => {
    if (confirm(`Feature "${feature.name}" wirklich löschen?`)) {
      setFeatures(prev => prev.filter(f => f.id !== feature.id));
    }
  }, []);
  
  const handleExport = useCallback(() => {
    const exportData = {
      features: features,
      exported: new Date().toISOString(),
      version: '1.0.0'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feature-flags-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [features]);
  
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <Flag size={32} className={styles.pageIcon} />
            <div>
              <h1>Feature Control</h1>
              <p>Verwalten Sie Feature Flags und Rollout-Strategien</p>
            </div>
          </div>
          
          <button 
            className={styles.createButton}
            onClick={() => {
              setEditingFeature(null);
              setShowCreateModal(true);
            }}
          >
            <Plus size={20} />
            Neues Feature
          </button>
        </div>
      </div>
      
      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <Flag size={24} />
          <div>
            <span className={styles.statValue}>{stats.total}</span>
            <span className={styles.statLabel}>Features Total</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <CheckCircle size={24} style={{ color: '#10b981' }} />
          <div>
            <span className={styles.statValue}>{stats.active}</span>
            <span className={styles.statLabel}>Aktiv</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <TestTube size={24} style={{ color: '#f59e0b' }} />
          <div>
            <span className={styles.statValue}>{stats.testing}</span>
            <span className={styles.statLabel}>In Testing</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <Users size={24} style={{ color: '#3b82f6' }} />
          <div>
            <span className={styles.statValue}>{stats.totalUsers.toLocaleString()}</span>
            <span className={styles.statLabel}>Erreichte Nutzer</span>
          </div>
        </div>
      </div>
      
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBar}>
          <Search size={20} />
          <input
            type="text"
            placeholder="Features suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>
        
        <div className={styles.filters}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Alle Kategorien</option>
            {Object.entries(FEATURE_CATEGORIES).map(([key, cat]) => (
              <option key={key} value={key}>{cat.label}</option>
            ))}
          </select>
          
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Alle Status</option>
            {Object.entries(FEATURE_STATUS).map(([key, status]) => (
              <option key={key} value={key}>{status.label}</option>
            ))}
          </select>
        </div>
        
        <div className={styles.toolbarActions}>
          <button
            className={`${styles.viewModeButton} ${viewMode === 'grid' ? styles.active : ''}`}
            onClick={() => setViewMode('grid')}
          >
            <Layers size={16} />
          </button>
          <button
            className={`${styles.viewModeButton} ${viewMode === 'list' ? styles.active : ''}`}
            onClick={() => setViewMode('list')}
          >
            <FileText size={16} />
          </button>
          
          <button className={styles.iconButton} onClick={handleExport}>
            <Download size={20} />
          </button>
          
          <button className={styles.iconButton}>
            <RefreshCw size={20} />
          </button>
        </div>
      </div>
      
      {/* Features Grid/List */}
      <div className={`${styles.featuresContainer} ${styles[viewMode]}`}>
        {filteredFeatures.length === 0 ? (
          <div className={styles.emptyState}>
            <Flag size={48} />
            <h3>Keine Features gefunden</h3>
            <p>Erstellen Sie Ihr erstes Feature Flag</p>
            <button 
              className={styles.emptyButton}
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={20} />
              Feature erstellen
            </button>
          </div>
        ) : (
          filteredFeatures.map(feature => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              onEdit={handleEdit}
              onToggle={handleToggle}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
      
      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{editingFeature ? 'Feature bearbeiten' : 'Neues Feature erstellen'}</h2>
              <button onClick={() => setShowCreateModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            {/* Modal content would go here */}
            <div className={styles.modalContent}>
              <p>Feature Editor Form würde hier sein...</p>
            </div>
            
            <div className={styles.modalFooter}>
              <button onClick={() => setShowCreateModal(false)}>
                Abbrechen
              </button>
              <button className={styles.primaryButton}>
                <Save size={20} />
                {editingFeature ? 'Speichern' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Icons that are missing
const CreditCard = ({ size }) => <span style={{ fontSize: size }}>💳</span>;
const ShoppingBag = ({ size }) => <span style={{ fontSize: size }}>🛍️</span>;
const XCircle = ({ size }) => <span style={{ fontSize: size }}>❌</span>;

// ============================================================================
// EXPORT
// ============================================================================
export default FeatureControl;