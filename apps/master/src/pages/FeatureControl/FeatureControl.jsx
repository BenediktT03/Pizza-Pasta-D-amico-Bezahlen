/**
 * EATECH - Master Feature Control Panel
 * Version: 13.0.0
 * Description: Zentrale Steuerung aller System-Features mit Live-Toggle,
 *              Tenant-spezifischen Overrides und Echtzeit-Analytics
 * Author: EATECH Development Team
 * Created: 2025-01-04
 * File Path: /apps/master/src/pages/FeatureControl/FeatureControl.jsx
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    Plus
} from 'lucide-react';
import styles from './FeatureControl.module.css';

// ============================================================================
// MOCK DATA & CONSTANTS
// ============================================================================

const FEATURE_FLAGS = {
    // CORE FEATURES
    "core.multiTenant": {
        id: "core.multiTenant",
        name: "Multi-Tenant System",
        description: "Mehrere Restaurants auf einer Plattform verwalten",
        enabled: true,
        tier: "basic",
        category: "core",
        dependencies: [],
        activeTenantsCount: 127,
        usagePercentage: 95,
        lastModified: "2025-01-03T14:22:00Z",
        modifiedBy: "admin@eatech.ch"
    },
    "core.authentication": {
        id: "core.authentication",
        name: "Authentifizierung",
        description: "Sichere Benutzeranmeldung und -verwaltung",
        enabled: true,
        tier: "basic",
        category: "core",
        dependencies: [],
        activeTenantsCount: 127,
        usagePercentage: 100,
        lastModified: "2025-01-01T09:00:00Z",
        modifiedBy: "system"
    },
    "core.ordering": {
        id: "core.ordering",
        name: "Bestellsystem",
        description: "Grundlegendes Bestellmanagement",
        enabled: true,
        tier: "basic",
        category: "core",
        dependencies: ["core.authentication"],
        activeTenantsCount: 127,
        usagePercentage: 100,
        lastModified: "2025-01-02T11:30:00Z",
        modifiedBy: "admin@eatech.ch"
    },
    
    // PAYMENT FEATURES
    "payment.stripe": {
        id: "payment.stripe",
        name: "Stripe Payments",
        description: "Kreditkarten- und SEPA-Zahlungen",
        enabled: true,
        tier: "basic",
        category: "payment",
        dependencies: ["core.ordering"],
        activeTenantsCount: 98,
        usagePercentage: 77,
        lastModified: "2025-01-03T16:45:00Z",
        modifiedBy: "payment-team@eatech.ch"
    },
    "payment.twint": {
        id: "payment.twint",
        name: "TWINT",
        description: "Schweizer Mobile Payment",
        enabled: true,
        tier: "basic",
        category: "payment",
        dependencies: ["core.ordering"],
        activeTenantsCount: 112,
        usagePercentage: 88,
        lastModified: "2025-01-03T16:45:00Z",
        modifiedBy: "payment-team@eatech.ch"
    },
    "payment.applePay": {
        id: "payment.applePay",
        name: "Apple Pay",
        description: "Kontaktlose Zahlungen mit Apple Geräten",
        enabled: true,
        tier: "pro",
        category: "payment",
        dependencies: ["payment.stripe"],
        activeTenantsCount: 45,
        usagePercentage: 35,
        lastModified: "2025-01-03T16:45:00Z",
        modifiedBy: "payment-team@eatech.ch"
    },
    "payment.crypto": {
        id: "payment.crypto",
        name: "Kryptowährungen",
        description: "Bitcoin, Ethereum und andere Krypto-Zahlungen",
        enabled: false,
        tier: "enterprise",
        category: "payment",
        dependencies: ["core.ordering", "security.advancedEncryption"],
        activeTenantsCount: 3,
        usagePercentage: 2,
        lastModified: "2025-01-04T08:00:00Z",
        modifiedBy: "cto@eatech.ch"
    },
    
    // AI FEATURES
    "ai.menuRecommendations": {
        id: "ai.menuRecommendations",
        name: "AI Menu-Empfehlungen",
        description: "Personalisierte Empfehlungen basierend auf Kundenverhalten",
        enabled: true,
        tier: "pro",
        category: "ai",
        dependencies: ["analytics.basicReports", "customer.basicProfiles"],
        activeTenantsCount: 67,
        usagePercentage: 53,
        lastModified: "2025-01-03T10:15:00Z",
        modifiedBy: "ai-team@eatech.ch"
    },
    "ai.pricingOptimization": {
        id: "ai.pricingOptimization",
        name: "Dynamische Preisgestaltung",
        description: "KI-gestützte Preisoptimierung basierend auf Nachfrage",
        enabled: true,
        tier: "enterprise",
        category: "ai",
        dependencies: ["ai.demandForecasting", "analytics.advancedDashboard"],
        activeTenantsCount: 12,
        usagePercentage: 9,
        lastModified: "2025-01-02T14:20:00Z",
        modifiedBy: "ai-team@eatech.ch"
    },
    "ai.chatbot": {
        id: "ai.chatbot",
        name: "AI Chatbot",
        description: "24/7 Kundenservice mit KI",
        enabled: true,
        tier: "pro",
        category: "ai",
        dependencies: ["core.authentication"],
        activeTenantsCount: 89,
        usagePercentage: 70,
        lastModified: "2025-01-03T09:00:00Z",
        modifiedBy: "ai-team@eatech.ch"
    },
    "ai.voiceOrdering": {
        id: "ai.voiceOrdering",
        name: "Sprachbestellung",
        description: "Bestellungen per Sprachbefehl aufgeben",
        enabled: true,
        tier: "pro",
        category: "ai",
        dependencies: ["ai.chatbot", "core.ordering"],
        activeTenantsCount: 34,
        usagePercentage: 27,
        lastModified: "2025-01-04T11:00:00Z",
        modifiedBy: "innovation@eatech.ch"
    },
    "ai.demandForecasting": {
        id: "ai.demandForecasting",
        name: "Nachfrageprognose",
        description: "KI-basierte Vorhersage von Bestellvolumen",
        enabled: true,
        tier: "enterprise",
        category: "ai",
        dependencies: ["analytics.advancedDashboard"],
        activeTenantsCount: 23,
        usagePercentage: 18,
        lastModified: "2025-01-02T13:30:00Z",
        modifiedBy: "ai-team@eatech.ch"
    },
    
    // ANALYTICS FEATURES
    "analytics.basicReports": {
        id: "analytics.basicReports",
        name: "Basis-Berichte",
        description: "Grundlegende Umsatz- und Bestellberichte",
        enabled: true,
        tier: "basic",
        category: "analytics",
        dependencies: [],
        activeTenantsCount: 127,
        usagePercentage: 100,
        lastModified: "2025-01-01T09:00:00Z",
        modifiedBy: "system"
    },
    "analytics.advancedDashboard": {
        id: "analytics.advancedDashboard",
        name: "Erweitertes Dashboard",
        description: "Detaillierte Analysen und Visualisierungen",
        enabled: true,
        tier: "pro",
        category: "analytics",
        dependencies: ["analytics.basicReports"],
        activeTenantsCount: 78,
        usagePercentage: 61,
        lastModified: "2025-01-03T15:00:00Z",
        modifiedBy: "analytics@eatech.ch"
    },
    "analytics.realtimeMetrics": {
        id: "analytics.realtimeMetrics",
        name: "Echtzeit-Metriken",
        description: "Live-Daten und Benachrichtigungen",
        enabled: true,
        tier: "pro",
        category: "analytics",
        dependencies: ["analytics.advancedDashboard"],
        activeTenantsCount: 56,
        usagePercentage: 44,
        lastModified: "2025-01-03T15:00:00Z",
        modifiedBy: "analytics@eatech.ch"
    },
    
    // MARKETING FEATURES
    "marketing.loyaltyProgram": {
        id: "marketing.loyaltyProgram",
        name: "Treueprogramm",
        description: "Punkte sammeln und Belohnungen erhalten",
        enabled: true,
        tier: "pro",
        category: "marketing",
        dependencies: ["customer.basicProfiles"],
        activeTenantsCount: 92,
        usagePercentage: 72,
        lastModified: "2025-01-02T10:00:00Z",
        modifiedBy: "marketing@eatech.ch"
    },
    "marketing.emailCampaigns": {
        id: "marketing.emailCampaigns",
        name: "E-Mail Marketing",
        description: "Automatisierte E-Mail-Kampagnen",
        enabled: true,
        tier: "pro",
        category: "marketing",
        dependencies: ["customer.basicProfiles", "analytics.basicReports"],
        activeTenantsCount: 65,
        usagePercentage: 51,
        lastModified: "2025-01-02T10:00:00Z",
        modifiedBy: "marketing@eatech.ch"
    },
    
    // CUSTOMER FEATURES
    "customer.basicProfiles": {
        id: "customer.basicProfiles",
        name: "Kundenprofile",
        description: "Grundlegende Kundenverwaltung",
        enabled: true,
        tier: "basic",
        category: "customer",
        dependencies: ["core.authentication"],
        activeTenantsCount: 127,
        usagePercentage: 100,
        lastModified: "2025-01-01T09:00:00Z",
        modifiedBy: "system"
    },
    
    // SECURITY FEATURES
    "security.advancedEncryption": {
        id: "security.advancedEncryption",
        name: "Erweiterte Verschlüsselung",
        description: "End-to-End Verschlüsselung für sensible Daten",
        enabled: true,
        tier: "enterprise",
        category: "security",
        dependencies: [],
        activeTenantsCount: 45,
        usagePercentage: 35,
        lastModified: "2025-01-01T09:00:00Z",
        modifiedBy: "security@eatech.ch"
    },
    
    // SUSTAINABILITY FEATURES
    "sustainability.carbonTracking": {
        id: "sustainability.carbonTracking",
        name: "CO₂-Tracking",
        description: "Überwachung des CO₂-Fußabdrucks",
        enabled: true,
        tier: "pro",
        category: "sustainability",
        dependencies: ["analytics.basicReports"],
        activeTenantsCount: 43,
        usagePercentage: 34,
        lastModified: "2025-01-03T12:00:00Z",
        modifiedBy: "sustainability@eatech.ch"
    },
    "sustainability.wasteReduction": {
        id: "sustainability.wasteReduction",
        name: "Abfallreduzierung",
        description: "Tools zur Minimierung von Lebensmittelabfällen",
        enabled: true,
        tier: "pro",
        category: "sustainability",
        dependencies: ["inventory.basicTracking"],
        activeTenantsCount: 38,
        usagePercentage: 30,
        lastModified: "2025-01-03T12:00:00Z",
        modifiedBy: "sustainability@eatech.ch"
    },
    
    // INVENTORY FEATURES
    "inventory.basicTracking": {
        id: "inventory.basicTracking",
        name: "Bestandsverwaltung",
        description: "Grundlegende Lagerverwaltung",
        enabled: true,
        tier: "basic",
        category: "inventory",
        dependencies: [],
        activeTenantsCount: 105,
        usagePercentage: 83,
        lastModified: "2025-01-02T08:00:00Z",
        modifiedBy: "ops@eatech.ch"
    }
};

const CATEGORIES = {
    all: { 
        label: 'Alle Features', 
        icon: Zap, 
        color: '#6366f1',
        description: 'Alle verfügbaren System-Features' 
    },
    core: { 
        label: 'Core Features', 
        icon: Shield, 
        color: '#3b82f6',
        description: 'Grundlegende Systemfunktionen' 
    },
    ai: { 
        label: 'AI Features', 
        icon: Brain, 
        color: '#8b5cf6',
        description: 'Künstliche Intelligenz & ML' 
    },
    analytics: { 
        label: 'Analytics', 
        icon: TrendingUp, 
        color: '#10b981',
        description: 'Datenanalyse & Reporting' 
    },
    payment: { 
        label: 'Payment', 
        icon: Package, 
        color: '#f59e0b',
        description: 'Zahlungsmethoden & Processing' 
    },
    marketing: { 
        label: 'Marketing', 
        icon: Users, 
        color: '#ec4899',
        description: 'Marketing & Kundenbindung' 
    },
    sustainability: { 
        label: 'Nachhaltigkeit', 
        icon: Leaf, 
        color: '#84cc16',
        description: 'Umwelt & Nachhaltigkeit' 
    },
    security: { 
        label: 'Security', 
        icon: Lock, 
        color: '#ef4444',
        description: 'Sicherheit & Datenschutz' 
    },
    customer: { 
        label: 'Customer', 
        icon: Users, 
        color: '#06b6d4',
        description: 'Kundenverwaltung' 
    },
    inventory: { 
        label: 'Inventory', 
        icon: Package, 
        color: '#a855f7',
        description: 'Bestandsverwaltung' 
    }
};

const MOCK_TENANTS = [
    { 
        id: 'burger-king-zh', 
        name: 'Burger King Zürich', 
        tier: 'enterprise',
        activeFeatures: 18,
        customOverrides: 3 
    },
    { 
        id: 'pizza-express-be', 
        name: 'Pizza Express Bern', 
        tier: 'pro',
        activeFeatures: 12,
        customOverrides: 1 
    },
    { 
        id: 'thai-food-ge', 
        name: 'Thai Food Genève', 
        tier: 'basic',
        activeFeatures: 8,
        customOverrides: 0 
    },
    { 
        id: 'veggie-delight-bs', 
        name: 'Veggie Delight Basel', 
        tier: 'pro',
        activeFeatures: 14,
        customOverrides: 2 
    }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const FeatureControl = () => {
    // State Management
    const [features, setFeatures] = useState(FEATURE_FLAGS);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedTenant, setSelectedTenant] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // grid | list | compact
    const [selectedFeatures, setSelectedFeatures] = useState(new Set());
    const [bulkActionMode, setBulkActionMode] = useState(false);
    const [showStats, setShowStats] = useState(true);
    const [pendingChanges, setPendingChanges] = useState({});
    const [showTenantModal, setShowTenantModal] = useState(false);
    const [editingFeature, setEditingFeature] = useState(null);
    
    // Filters
    const [tierFilter, setTierFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [usageFilter, setUsageFilter] = useState([0, 100]);

    // ========================================================================
    // COMPUTED VALUES
    // ========================================================================
    
    const filteredFeatures = useMemo(() => {
        return Object.entries(features).filter(([key, feature]) => {
            // Search filter
            const matchesSearch = 
                key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                feature.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                feature.description.toLowerCase().includes(searchTerm.toLowerCase());
            
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
            const matchesUsage = 
                feature.usagePercentage >= usageFilter[0] && 
                feature.usagePercentage <= usageFilter[1];
            
            return matchesSearch && matchesCategory && matchesTier && matchesStatus && matchesUsage;
        });
    }, [features, searchTerm, selectedCategory, tierFilter, statusFilter, usageFilter]);

    const categoryStats = useMemo(() => {
        const stats = {};
        Object.values(features).forEach(feature => {
            if (!stats[feature.category]) {
                stats[feature.category] = {
                    total: 0,
                    enabled: 0,
                    usage: 0
                };
            }
            stats[feature.category].total++;
            if (feature.enabled) stats[feature.category].enabled++;
            stats[feature.category].usage += feature.usagePercentage;
        });
        
        // Calculate averages
        Object.keys(stats).forEach(cat => {
            stats[cat].usage = Math.round(stats[cat].usage / stats[cat].total);
        });
        
        return stats;
    }, [features]);

    const globalStats = useMemo(() => {
        const total = Object.keys(features).length;
        const enabled = Object.values(features).filter(f => f.enabled).length;
        const avgUsage = Math.round(
            Object.values(features).reduce((sum, f) => sum + f.usagePercentage, 0) / total
        );
        const activeTenantsTotal = new Set(
            Object.values(features).flatMap(f => 
                Array(f.activeTenantsCount).fill(0).map((_, i) => `tenant-${i}`)
            )
        ).size;
        
        return { total, enabled, avgUsage, activeTenantsTotal };
    }, [features]);

    // ========================================================================
    // HANDLERS
    // ========================================================================
    
    const handleFeatureToggle = useCallback((featureKey, enabled) => {
        // Check dependencies
        if (enabled) {
            const feature = features[featureKey];
            const missingDeps = feature.dependencies.filter(dep => !features[dep]?.enabled);
            
            if (missingDeps.length > 0) {
                alert(`Cannot enable ${feature.name}. Missing dependencies: ${missingDeps.join(', ')}`);
                return;
            }
        } else {
            // Check if other features depend on this
            const dependents = Object.entries(features).filter(([key, f]) => 
                f.dependencies.includes(featureKey) && f.enabled
            );
            
            if (dependents.length > 0) {
                const dependentNames = dependents.map(([_, f]) => f.name).join(', ');
                if (!confirm(`Disabling ${features[featureKey].name} will also disable: ${dependentNames}. Continue?`)) {
                    return;
                }
                
                // Disable dependent features
                dependents.forEach(([key, _]) => {
                    setFeatures(prev => ({
                        ...prev,
                        [key]: { ...prev[key], enabled: false }
                    }));
                });
            }
        }
        
        // Update feature
        setFeatures(prev => ({
            ...prev,
            [featureKey]: {
                ...prev[featureKey],
                enabled,
                lastModified: new Date().toISOString(),
                modifiedBy: 'current-user@eatech.ch'
            }
        }));
        
        // Track pending changes
        setPendingChanges(prev => ({
            ...prev,
            [featureKey]: { enabled }
        }));
    }, [features]);

    const handleBulkAction = useCallback((action) => {
        const selectedFeatureKeys = Array.from(selectedFeatures);
        
        switch(action) {
            case 'enable':
                selectedFeatureKeys.forEach(key => handleFeatureToggle(key, true));
                break;
            case 'disable':
                selectedFeatureKeys.forEach(key => handleFeatureToggle(key, false));
                break;
            case 'export':
                exportFeatures(selectedFeatureKeys);
                break;
        }
        
        setSelectedFeatures(new Set());
        setBulkActionMode(false);
    }, [selectedFeatures, handleFeatureToggle]);

    const exportFeatures = useCallback((featureKeys = null) => {
        const dataToExport = featureKeys 
            ? featureKeys.map(key => ({ [key]: features[key] }))
            : features;
        
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { 
            type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `eatech-features-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    }, [features]);

    const handleSaveChanges = useCallback(() => {
        // Here you would save to backend
        console.log('Saving changes:', pendingChanges);
        alert('Changes saved successfully!');
        setPendingChanges({});
    }, [pendingChanges]);

    const handleTenantOverride = useCallback((tenantId, featureKey, enabled) => {
        // Handle tenant-specific feature override
        console.log(`Override for tenant ${tenantId}: ${featureKey} = ${enabled}`);
        // This would update tenant-specific settings in the backend
    }, []);

    // ========================================================================
    // RENDER HELPERS
    // ========================================================================
    
    const renderFeatureCard = (key, feature) => {
        const isSelected = selectedFeatures.has(key);
        const hasPendingChange = pendingChanges[key] !== undefined;
        const Icon = CATEGORIES[feature.category]?.icon || Zap;
        
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
                            className={`${styles.toggleButton} ${feature.enabled ? styles.enabled : styles.disabled}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleFeatureToggle(key, !feature.enabled);
                            }}
                            disabled={bulkActionMode}
                        >
                            <Power size={16} />
                            {feature.enabled ? 'Aktiv' : 'Inaktiv'}
                        </button>
                        
                        <button
                            className={styles.iconButton}
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditingFeature({ key, ...feature });
                            }}
                        >
                            <Edit size={16} />
                        </button>
                    </div>
                </div>
                
                <p className={styles.description}>{feature.description}</p>
                
                <div className={styles.featureMeta}>
                    <span className={`${styles.tier} ${styles[feature.tier]}`}>
                        {feature.tier}
                    </span>
                    
                    {feature.dependencies.length > 0 && (
                        <div className={styles.dependencies}>
                            <Info size={14} />
                            <span>{feature.dependencies.length} Abhängigkeiten</span>
                        </div>
                    )}
                </div>
                
                <div className={styles.featureStats}>
                    <div className={styles.stat}>
                        <span className={styles.statLabel}>Aktive Tenants</span>
                        <span className={styles.statValue}>{feature.activeTenantsCount}</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statLabel}>Nutzung</span>
                        <div className={styles.usageBar}>
                            <div 
                                className={styles.usageProgress} 
                                style={{ width: `${feature.usagePercentage}%` }}
                            />
                        </div>
                        <span className={styles.statValue}>{feature.usagePercentage}%</span>
                    </div>
                </div>
                
                <div className={styles.featureFooter}>
                    <Clock size={12} />
                    <span>Geändert: {new Date(feature.lastModified).toLocaleDateString('de-CH')}</span>
                    <span>•</span>
                    <span>{feature.modifiedBy}</span>
                </div>
                
                {hasPendingChange && (
                    <div className={styles.pendingIndicator}>
                        <AlertCircle size={14} />
                        Ungespeicherte Änderungen
                    </div>
                )}
            </div>
        );
    };

    // ========================================================================
    // MAIN RENDER
    // ========================================================================
    
    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <div>
                        <h1>Feature Control Center</h1>
                        <p>Verwalte alle EATECH-Features global oder pro Tenant</p>
                    </div>
                    
                    <div className={styles.headerActions}>
                        {Object.keys(pendingChanges).length > 0 && (
                            <button 
                                className={styles.saveButton}
                                onClick={handleSaveChanges}
                            >
                                <Save size={20} />
                                Änderungen speichern ({Object.keys(pendingChanges).length})
                            </button>
                        )}
                        
                        <button 
                            className={styles.iconButton}
                            onClick={() => window.location.reload()}
                        >
                            <RefreshCw size={20} />
                        </button>
                        
                        <button 
                            className={styles.iconButton}
                            onClick={() => exportFeatures()}
                        >
                            <Download size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Global Stats */}
            {showStats && (
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                            <Zap size={24} />
                        </div>
                        <div>
                            <h3>{globalStats.total}</h3>
                            <p>Features Total</p>
                        </div>
                    </div>
                    
                    <div className={styles.statCard}>
                        <div className={styles.statIcon} style={{ backgroundColor: '#10b98120' }}>
                            <CheckCircle2 size={24} style={{ color: '#10b981' }} />
                        </div>
                        <div>
                            <h3>{globalStats.enabled}</h3>
                            <p>Aktiv ({Math.round(globalStats.enabled / globalStats.total * 100)}%)</p>
                        </div>
                    </div>
                    
                    <div className={styles.statCard}>
                        <div className={styles.statIcon} style={{ backgroundColor: '#6366f120' }}>
                            <BarChart3 size={24} style={{ color: '#6366f1' }} />
                        </div>
                        <div>
                            <h3>{globalStats.avgUsage}%</h3>
                            <p>Durchschn. Nutzung</p>
                        </div>
                    </div>
                    
                    <div className={styles.statCard}>
                        <div className={styles.statIcon} style={{ backgroundColor: '#f59e0b20' }}>
                            <Globe size={24} style={{ color: '#f59e0b' }} />
                        </div>
                        <div>
                            <h3>{globalStats.activeTenantsTotal}</h3>
                            <p>Aktive Tenants</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className={styles.controls}>
                <div className={styles.controlsLeft}>
                    <div className={styles.searchContainer}>
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder="Feature suchen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={styles.searchInput}
                        />
                        {searchTerm && (
                            <button 
                                className={styles.clearButton}
                                onClick={() => setSearchTerm('')}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    
                    <button
                        className={`${styles.filterButton} ${showFilters ? styles.active : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter size={20} />
                        Filter {(tierFilter !== 'all' || statusFilter !== 'all') && '•'}
                    </button>
                    
                    <div className={styles.viewModeToggle}>
                        <button
                            className={viewMode === 'grid' ? styles.active : ''}
                            onClick={() => setViewMode('grid')}
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <rect x="1" y="1" width="6" height="6" />
                                <rect x="9" y="1" width="6" height="6" />
                                <rect x="1" y="9" width="6" height="6" />
                                <rect x="9" y="9" width="6" height="6" />
                            </svg>
                        </button>
                        <button
                            className={viewMode === 'list' ? styles.active : ''}
                            onClick={() => setViewMode('list')}
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <rect x="1" y="2" width="14" height="2" />
                                <rect x="1" y="7" width="14" height="2" />
                                <rect x="1" y="12" width="14" height="2" />
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div className={styles.controlsRight}>
                    {selectedTenant ? (
                        <div className={styles.tenantSelector}>
                            <Globe size={16} />
                            <span>{selectedTenant.name}</span>
                            <button onClick={() => setSelectedTenant(null)}>
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <button
                            className={styles.tenantButton}
                            onClick={() => setShowTenantModal(true)}
                        >
                            <Globe size={20} />
                            Tenant wählen
                        </button>
                    )}
                    
                    <button
                        className={`${styles.bulkButton} ${bulkActionMode ? styles.active : ''}`}
                        onClick={() => {
                            setBulkActionMode(!bulkActionMode);
                            setSelectedFeatures(new Set());
                        }}
                    >
                        {bulkActionMode ? 'Abbrechen' : 'Bulk-Aktionen'}
                    </button>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className={styles.filterBar}>
                    <div className={styles.filterGroup}>
                        <label>Tier</label>
                        <select 
                            value={tierFilter}
                            onChange={(e) => setTierFilter(e.target.value)}
                        >
                            <option value="all">Alle</option>
                            <option value="basic">Basic</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
                        </select>
                    </div>
                    
                    <div className={styles.filterGroup}>
                        <label>Status</label>
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">Alle</option>
                            <option value="enabled">Aktiviert</option>
                            <option value="disabled">Deaktiviert</option>
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
                        }}
                    >
                        Filter zurücksetzen
                    </button>
                </div>
            )}

            {/* Category Tabs */}
            <div className={styles.categoryTabs}>
                {Object.entries(CATEGORIES).map(([key, category]) => {
                    const Icon = category.icon;
                    const stats = categoryStats[key];
                    const count = key === 'all' 
                        ? Object.keys(features).length 
                        : stats?.total || 0;
                    
                    return (
                        <button
                            key={key}
                            className={`${styles.categoryTab} ${selectedCategory === key ? styles.active : ''}`}
                            onClick={() => setSelectedCategory(key)}
                        >
                            <Icon size={18} />
                            <span>{category.label}</span>
                            <span className={styles.badge}>{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Bulk Actions */}
            {bulkActionMode && selectedFeatures.size > 0 && (
                <div className={styles.bulkActionsBar}>
                    <span>{selectedFeatures.size} Features ausgewählt</span>
                    <div className={styles.bulkActions}>
                        <button onClick={() => handleBulkAction('enable')}>
                            <Unlock size={16} />
                            Aktivieren
                        </button>
                        <button onClick={() => handleBulkAction('disable')}>
                            <Lock size={16} />
                            Deaktivieren
                        </button>
                        <button onClick={() => handleBulkAction('export')}>
                            <Download size={16} />
                            Exportieren
                        </button>
                    </div>
                </div>
            )}

            {/* Features Grid */}
            <div className={`${styles.featuresGrid} ${styles[viewMode]}`}>
                {filteredFeatures.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Search size={48} />
                        <h3>Keine Features gefunden</h3>
                        <p>Versuche deine Suchkriterien anzupassen</p>
                    </div>
                ) : (
                    filteredFeatures.map(([key, feature]) => renderFeatureCard(key, feature))
                )}
            </div>

            {/* Tenant Modal */}
            {showTenantModal && (
                <div className={styles.modal} onClick={() => setShowTenantModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Tenant auswählen</h2>
                            <button onClick={() => setShowTenantModal(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className={styles.tenantList}>
                            {MOCK_TENANTS.map(tenant => (
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
                                        <p>{tenant.id} • {tenant.tier}</p>
                                    </div>
                                    <div className={styles.tenantStats}>
                                        <span>{tenant.activeFeatures} Features</span>
                                        <span>{tenant.customOverrides} Overrides</span>
                                    </div>
                                    <ChevronRight size={20} />
                                </div>
                            ))}
                        </div>
                        
                        <div className={styles.modalFooter}>
                            <button className={styles.addTenantButton}>
                                <Plus size={20} />
                                Neuer Tenant
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Feature Edit Modal */}
            {editingFeature && (
                <div className={styles.modal} onClick={() => setEditingFeature(null)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Feature bearbeiten</h2>
                            <button onClick={() => setEditingFeature(null)}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className={styles.editForm}>
                            <div className={styles.formGroup}>
                                <label>Feature Key</label>
                                <input type="text" value={editingFeature.key} disabled />
                            </div>
                            
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
                                    rows="3"
                                />
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
                                    <option value="enterprise">Enterprise</option>
                                </select>
                            </div>
                            
                            <div className={styles.formGroup}>
                                <label>Dependencies</label>
                                <div className={styles.dependencyList}>
                                    {editingFeature.dependencies.map((dep, index) => (
                                        <div key={index} className={styles.dependencyItem}>
                                            <span>{dep}</span>
                                            <button onClick={() => {
                                                const newDeps = [...editingFeature.dependencies];
                                                newDeps.splice(index, 1);
                                                setEditingFeature({
                                                    ...editingFeature,
                                                    dependencies: newDeps
                                                });
                                            }}>
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
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
                                onClick={() => {
                                    // Save feature changes
                                    setFeatures(prev => ({
                                        ...prev,
                                        [editingFeature.key]: {
                                            ...prev[editingFeature.key],
                                            name: editingFeature.name,
                                            description: editingFeature.description,
                                            tier: editingFeature.tier,
                                            dependencies: editingFeature.dependencies,
                                            lastModified: new Date().toISOString(),
                                            modifiedBy: 'current-user@eatech.ch'
                                        }
                                    }));
                                    setPendingChanges(prev => ({
                                        ...prev,
                                        [editingFeature.key]: { ...editingFeature }
                                    }));
                                    setEditingFeature(null);
                                }}
                            >
                                Speichern
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeatureControl;