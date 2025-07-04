/**
 * EATECH - Master Feature Control Panel with Firebase
 * Version: 13.0.0
 * Description: Feature Control mit Echtzeit Firebase-Synchronisation
 * Author: EATECH Development Team
 * Created: 2025-01-04
 * File Path: /apps/master/src/pages/FeatureControl/FeatureControlWithFirebase.jsx
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Search, Shield, Zap, Brain, TrendingUp, Package, Users, Leaf,
    Settings, Filter, Power, AlertCircle, CheckCircle2, Info,
    Download, Upload, RefreshCw, Save, X, Loader, Wifi, WifiOff
} from 'lucide-react';
import { useFirebaseFeatures } from '@eatech/feature-flags/src/services/FirebaseFeatureService';
import styles from './FeatureControl.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORIES = {
    all: { label: 'Alle Features', icon: Zap, color: '#6366f1' },
    core: { label: 'Core Features', icon: Shield, color: '#3b82f6' },
    ai: { label: 'AI Features', icon: Brain, color: '#8b5cf6' },
    analytics: { label: 'Analytics', icon: TrendingUp, color: '#10b981' },
    payment: { label: 'Payment', icon: Package, color: '#f59e0b' },
    marketing: { label: 'Marketing', icon: Users, color: '#ec4899' },
    sustainability: { label: 'Nachhaltigkeit', icon: Leaf, color: '#84cc16' }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const FeatureControlWithFirebase = () => {
    // Firebase Integration
    const {
        features: firebaseFeatures,
        loading: firebaseLoading,
        error: firebaseError,
        updateFeature,
        updateTenantOverride,
        service
    } = useFirebaseFeatures();

    // State Management
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedTenant, setSelectedTenant] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedFeatures, setSelectedFeatures] = useState(new Set());
    const [bulkActionMode, setBulkActionMode] = useState(false);
    const [pendingChanges, setPendingChanges] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [lastSync, setLastSync] = useState(new Date());
    const [connectionStatus, setConnectionStatus] = useState('connected');

    // Filters
    const [tierFilter, setTierFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // ========================================================================
    // COMPUTED VALUES
    // ========================================================================
    
    const filteredFeatures = useMemo(() => {
        return Object.entries(firebaseFeatures).filter(([key, feature]) => {
            const matchesSearch = 
                key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                feature.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                feature.description?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesCategory = selectedCategory === 'all' || feature.category === selectedCategory;
            const matchesTier = tierFilter === 'all' || feature.tier === tierFilter;
            const matchesStatus = 
                statusFilter === 'all' ||
                (statusFilter === 'enabled' && feature.enabled) ||
                (statusFilter === 'disabled' && !feature.enabled);
            
            return matchesSearch && matchesCategory && matchesTier && matchesStatus;
        });
    }, [firebaseFeatures, searchTerm, selectedCategory, tierFilter, statusFilter]);

    const globalStats = useMemo(() => {
        const total = Object.keys(firebaseFeatures).length;
        const enabled = Object.values(firebaseFeatures).filter(f => f.enabled).length;
        const avgUsage = Math.round(
            Object.values(firebaseFeatures).reduce((sum, f) => sum + (f.usagePercentage || 0), 0) / total
        ) || 0;
        
        return { total, enabled, avgUsage };
    }, [firebaseFeatures]);

    // ========================================================================
    // EFFECTS
    // ========================================================================

    // Monitor connection status
    useEffect(() => {
        const handleOnline = () => setConnectionStatus('connected');
        const handleOffline = () => setConnectionStatus('disconnected');
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Update last sync time
    useEffect(() => {
        if (!firebaseLoading) {
            setLastSync(new Date());
        }
    }, [firebaseFeatures, firebaseLoading]);

    // ========================================================================
    // HANDLERS
    // ========================================================================
    
    const handleFeatureToggle = useCallback(async (featureKey, enabled) => {
        setIsSaving(true);
        
        try {
            const result = await updateFeature(featureKey, { enabled });
            
            if (result.success) {
                // Clear pending change for this feature
                setPendingChanges(prev => {
                    const updated = { ...prev };
                    delete updated[featureKey];
                    return updated;
                });
                
                // Show success notification
                console.log(`✅ Feature ${featureKey} ${enabled ? 'enabled' : 'disabled'}`);
            } else {
                console.error('Failed to update feature:', result.error);
                alert(`Fehler beim Aktualisieren: ${result.error}`);
            }
        } catch (error) {
            console.error('Error toggling feature:', error);
            alert('Ein unerwarteter Fehler ist aufgetreten');
        } finally {
            setIsSaving(false);
        }
    }, [updateFeature]);

    const handleBulkAction = useCallback(async (action) => {
        const selectedFeatureKeys = Array.from(selectedFeatures);
        
        setIsSaving(true);
        
        try {
            switch(action) {
                case 'enable':
                    await Promise.all(
                        selectedFeatureKeys.map(key => updateFeature(key, { enabled: true }))
                    );
                    break;
                case 'disable':
                    await Promise.all(
                        selectedFeatureKeys.map(key => updateFeature(key, { enabled: false }))
                    );
                    break;
                case 'export':
                    await exportFeatures(selectedFeatureKeys);
                    break;
            }
            
            setSelectedFeatures(new Set());
            setBulkActionMode(false);
        } catch (error) {
            console.error('Error in bulk action:', error);
            alert('Fehler bei der Bulk-Aktion');
        } finally {
            setIsSaving(false);
        }
    }, [selectedFeatures, updateFeature]);

    const exportFeatures = useCallback(async (featureKeys = null) => {
        if (!service) return;
        
        const exportData = await service.exportFeatures(featureKeys);
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
            type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `eatech-features-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [service]);

    const handleImportFeatures = useCallback(async (event) => {
        const file = event.target.files[0];
        if (!file || !service) return;
        
        setIsSaving(true);
        
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            const result = await service.importFeatures(importData);
            
            if (result.success) {
                alert(`${result.imported} Features erfolgreich importiert!`);
            } else {
                alert(`Import fehlgeschlagen: ${result.error}`);
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('Fehler beim Importieren der Datei');
        } finally {
            setIsSaving(false);
        }
    }, [service]);

    // ========================================================================
    // RENDER HELPERS
    // ========================================================================
    
    const renderFeatureCard = (key, feature) => {
        const isSelected = selectedFeatures.has(key);
        const Icon = CATEGORIES[feature.category]?.icon || Zap;
        
        return (
            <div 
                key={key}
                className={`${styles.featureCard} ${isSelected ? styles.selected : ''}`}
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
                            <h3>{feature.name || key}</h3>
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
                            disabled={bulkActionMode || isSaving}
                        >
                            {isSaving ? (
                                <Loader size={16} className={styles.spinning} />
                            ) : (
                                <Power size={16} />
                            )}
                            {feature.enabled ? 'Aktiv' : 'Inaktiv'}
                        </button>
                    </div>
                </div>
                
                <p className={styles.description}>{feature.description}</p>
                
                <div className={styles.featureMeta}>
                    <span className={`${styles.tier} ${styles[feature.tier]}`}>
                        {feature.tier}
                    </span>
                    
                    {feature.dependencies?.length > 0 && (
                        <div className={styles.dependencies}>
                            <Info size={14} />
                            <span>{feature.dependencies.length} Abhängigkeiten</span>
                        </div>
                    )}
                </div>
                
                <div className={styles.featureStats}>
                    <div className={styles.stat}>
                        <span className={styles.statLabel}>Aktive Tenants</span>
                        <span className={styles.statValue}>{feature.activeTenantsCount || 0}</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statLabel}>Nutzung</span>
                        <div className={styles.usageBar}>
                            <div 
                                className={styles.usageProgress} 
                                style={{ width: `${feature.usagePercentage || 0}%` }}
                            />
                        </div>
                        <span className={styles.statValue}>{feature.usagePercentage || 0}%</span>
                    </div>
                </div>
            </div>
        );
    };

    // ========================================================================
    // LOADING & ERROR STATES
    // ========================================================================

    if (firebaseLoading) {
        return (
            <div className={styles.loadingContainer}>
                <Loader size={48} className={styles.spinning} />
                <h2>Lade Features...</h2>
                <p>Verbinde mit Firebase...</p>
            </div>
        );
    }

    if (firebaseError) {
        return (
            <div className={styles.errorContainer}>
                <AlertCircle size={48} />
                <h2>Fehler beim Laden</h2>
                <p>{firebaseError.message}</p>
                <button onClick={() => window.location.reload()}>
                    <RefreshCw size={20} />
                    Neu laden
                </button>
            </div>
        );
    }

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
                        <p>Echtzeit-Synchronisation mit Firebase</p>
                    </div>
                    
                    <div className={styles.headerActions}>
                        <div className={styles.connectionStatus}>
                            {connectionStatus === 'connected' ? (
                                <>
                                    <Wifi size={16} />
                                    <span>Verbunden</span>
                                </>
                            ) : (
                                <>
                                    <WifiOff size={16} />
                                    <span>Offline</span>
                                </>
                            )}
                            <span className={styles.lastSync}>
                                Sync: {lastSync.toLocaleTimeString('de-CH')}
                            </span>
                        </div>
                        
                        <label className={styles.iconButton}>
                            <Upload size={20} />
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleImportFeatures}
                                style={{ display: 'none' }}
                            />
                        </label>
                        
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
                        <p>Aktiv ({globalStats.total > 0 ? Math.round(globalStats.enabled / globalStats.total * 100) : 0}%)</p>
                    </div>
                </div>
                
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ backgroundColor: '#6366f120' }}>
                        <TrendingUp size={24} style={{ color: '#6366f1' }} />
                    </div>
                    <div>
                        <h3>{globalStats.avgUsage}%</h3>
                        <p>Durchschn. Nutzung</p>
                    </div>
                </div>
            </div>

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
                    </div>
                    
                    <button
                        className={`${styles.filterButton} ${showFilters ? styles.active : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter size={20} />
                        Filter
                    </button>
                </div>
                
                <div className={styles.controlsRight}>
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
                </div>
            )}

            {/* Category Tabs */}
            <div className={styles.categoryTabs}>
                {Object.entries(CATEGORIES).map(([key, category]) => {
                    const Icon = category.icon;
                    const count = key === 'all' 
                        ? Object.keys(firebaseFeatures).length 
                        : Object.values(firebaseFeatures).filter(f => f.category === key).length;
                    
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
                        <button onClick={() => handleBulkAction('enable')} disabled={isSaving}>
                            <CheckCircle2 size={16} />
                            Aktivieren
                        </button>
                        <button onClick={() => handleBulkAction('disable')} disabled={isSaving}>
                            <X size={16} />
                            Deaktivieren
                        </button>
                        <button onClick={() => handleBulkAction('export')} disabled={isSaving}>
                            <Download size={16} />
                            Exportieren
                        </button>
                    </div>
                </div>
            )}

            {/* Features Grid */}
            <div className={styles.featuresGrid}>
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
        </div>
    );
};

export default FeatureControlWithFirebase;