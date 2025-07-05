/**
 * EATECH - Feature Toggle Modal Component
 * Version: 21.0.0
 * Description: Verwaltung von Feature-Toggles für individuelle Restaurant-Anpassungen
 * Features: Granulare Feature-Kontrolle, Kategorisierung, Beschreibungen
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/admin/src/components/Products/FeatureToggleModal.jsx
 */

import React, { useState, useEffect } from 'react';
import { 
  X, Save, ToggleLeft, ToggleRight, Info,
  Package, Brain, Image, Clock, DollarSign,
  Tag, TrendingUp, Star, Hash, BarChart3,
  AlertCircle, CheckCircle, Settings, Search,
  RefreshCw, Download, Upload, Shield, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useTenant } from '@eatech/core';
import styles from './FeatureToggleModal.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const FEATURE_CATEGORIES = [
  {
    id: 'basic',
    label: 'Basis Features',
    icon: Package,
    description: 'Grundlegende Produktfunktionen',
    features: [
      {
        id: 'multipleImages',
        label: 'Mehrere Produktbilder',
        description: 'Erlaubt das Hochladen mehrerer Bilder pro Produkt',
        icon: Image,
        premium: false,
        impact: 'low'
      },
      {
        id: 'productTags',
        label: 'Produkt-Tags',
        description: 'Hashtags für bessere Filterung und Suche',
        icon: Hash,
        premium: false,
        impact: 'low'
      },
      {
        id: 'preparationTime',
        label: 'Zubereitungszeit',
        description: 'Zeigt geschätzte Zubereitungszeit beim Produkt',
        icon: Clock,
        premium: false,
        impact: 'medium'
      }
    ]
  },
  {
    id: 'marketing',
    label: 'Marketing & Verkauf',
    icon: TrendingUp,
    description: 'Features zur Verkaufsförderung',
    features: [
      {
        id: 'newBadge',
        label: 'NEU-Badge',
        description: 'Automatisches NEU-Label für neue Produkte',
        icon: Star,
        premium: false,
        impact: 'medium'
      },
      {
        id: 'bestsellerBadge',
        label: 'Bestseller-Markierung',
        description: 'Hebt meistverkaufte Produkte hervor',
        icon: TrendingUp,
        premium: false,
        impact: 'high'
      },
      {
        id: 'happyHourPricing',
        label: 'Happy Hour Preise',
        description: 'Zeitbasierte Sonderpreise für Produkte',
        icon: Clock,
        premium: true,
        impact: 'high'
      },
      {
        id: 'combos',
        label: 'Combo-Deals / Menüs',
        description: 'Erstellen Sie attraktive Produktkombinationen',
        icon: Package,
        premium: true,
        impact: 'high'
      }
    ]
  },
  {
    id: 'ai',
    label: 'KI-Features',
    icon: Brain,
    description: 'Künstliche Intelligenz Funktionen',
    features: [
      {
        id: 'aiDescriptions',
        label: 'KI-Beschreibungen',
        description: 'Automatisch generierte Produktbeschreibungen',
        icon: Brain,
        premium: true,
        impact: 'medium'
      },
      {
        id: 'aiRecommendations',
        label: 'KI-Empfehlungen',
        description: 'Personalisierte Produktvorschläge für Kunden',
        icon: Brain,
        premium: true,
        impact: 'high',
        comingSoon: true
      }
    ]
  },
  {
    id: 'inventory',
    label: 'Lager & Verwaltung',
    icon: Package,
    description: 'Bestandsverwaltung und Logistik',
    features: [
      {
        id: 'inventory',
        label: 'Lagerbestand',
        description: 'Verwalten Sie Produktbestände und Verfügbarkeit',
        icon: Package,
        premium: false,
        impact: 'medium'
      },
      {
        id: 'productCloning',
        label: 'Produkt klonen',
        description: 'Schnelles Duplizieren ähnlicher Produkte',
        icon: Copy,
        premium: false,
        impact: 'low'
      }
    ]
  },
  {
    id: 'nutrition',
    label: 'Ernährung & Gesundheit',
    icon: Info,
    description: 'Nährwerte und Allergeninformationen',
    features: [
      {
        id: 'nutritionInfo',
        label: 'Nährwertangaben',
        description: 'Detaillierte Nährwertinformationen anzeigen',
        icon: BarChart3,
        premium: false,
        impact: 'medium'
      },
      {
        id: 'allergenInfo',
        label: 'Allergene',
        description: 'Kennzeichnung der 14 EU-Allergene',
        icon: AlertCircle,
        premium: false,
        impact: 'high',
        required: true
      }
    ]
  }
];

const IMPACT_LABELS = {
  low: { label: 'Niedrig', color: '#10b981' },
  medium: { label: 'Mittel', color: '#f59e0b' },
  high: { label: 'Hoch', color: '#ef4444' }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const FeatureToggleModal = ({ toggles = {}, onSave, onClose }) => {
  const { tenantId } = useTenant();
  
  // State
  const [featureToggles, setFeatureToggles] = useState(toggles);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showOnlyEnabled, setShowOnlyEnabled] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Stats
  const stats = {
    total: FEATURE_CATEGORIES.reduce((acc, cat) => acc + cat.features.length, 0),
    enabled: Object.values(featureToggles).filter(v => v).length,
    premium: FEATURE_CATEGORIES.reduce((acc, cat) => 
      acc + cat.features.filter(f => f.premium && featureToggles[f.id]).length, 0
    )
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleToggle = (featureId, required = false) => {
    if (required) {
      toast.error('Dieses Feature ist verpflichtend und kann nicht deaktiviert werden');
      return;
    }

    setFeatureToggles(prev => ({
      ...prev,
      [featureId]: !prev[featureId]
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(featureToggles);
      setHasChanges(false);
    } catch (error) {
      toast.error('Fehler beim Speichern der Einstellungen');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Möchten Sie alle Änderungen verwerfen?')) {
      setFeatureToggles(toggles);
      setHasChanges(false);
    }
  };

  const handleExport = () => {
    const config = {
      tenantId,
      exportDate: new Date().toISOString(),
      features: featureToggles
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feature-config-${tenantId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Konfiguration exportiert');
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);
        if (config.features) {
          setFeatureToggles(config.features);
          setHasChanges(true);
          toast.success('Konfiguration importiert');
        } else {
          toast.error('Ungültiges Konfigurationsformat');
        }
      } catch (error) {
        toast.error('Fehler beim Importieren der Konfiguration');
      }
    };
    reader.readAsText(file);
  };

  // ============================================================================
  // FILTERING
  // ============================================================================
  const filteredCategories = FEATURE_CATEGORIES.map(category => ({
    ...category,
    features: category.features.filter(feature => {
      // Search filter
      if (searchQuery && !feature.label.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !feature.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Show only enabled filter
      if (showOnlyEnabled && !featureToggles[feature.id]) {
        return false;
      }
      
      return true;
    })
  })).filter(category => {
    // Category filter
    if (selectedCategory !== 'all' && category.id !== selectedCategory) {
      return false;
    }
    
    // Hide empty categories
    return category.features.length > 0;
  });

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className={styles.modal} onClick={onClose}>
      <motion.div 
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <Settings size={24} />
            <div>
              <h2>Feature-Verwaltung</h2>
              <p>Aktivieren oder deaktivieren Sie Funktionen für Ihr Restaurant</p>
            </div>
          </div>
          
          <button onClick={onClose} className={styles.closeButton}>
            <X size={24} />
          </button>
        </div>

        {/* Stats Bar */}
        <div className={styles.statsBar}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Aktive Features</span>
            <span className={styles.statValue}>{stats.enabled} / {stats.total}</span>
          </div>
          
          <div className={styles.stat}>
            <span className={styles.statLabel}>Premium Features</span>
            <span className={styles.statValue}>
              <Star size={16} />
              {stats.premium}
            </span>
          </div>

          <div className={styles.progress}>
            <div 
              className={styles.progressBar}
              style={{ width: `${(stats.enabled / stats.total) * 100}%` }}
            />
          </div>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            {/* Search */}
            <div className={styles.searchBox}>
              <Search size={20} />
              <input
                type="text"
                placeholder="Features suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className={styles.clearSearch}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={styles.categorySelect}
            >
              <option value="all">Alle Kategorien</option>
              {FEATURE_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>

            {/* Show Only Enabled */}
            <label className={styles.filterToggle}>
              <input
                type="checkbox"
                checked={showOnlyEnabled}
                onChange={(e) => setShowOnlyEnabled(e.target.checked)}
              />
              <span>Nur aktive anzeigen</span>
            </label>
          </div>

          <div className={styles.toolbarRight}>
            {/* Import/Export */}
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
              id="import-config"
            />
            <label htmlFor="import-config" className={styles.iconButton}>
              <Upload size={20} />
            </label>
            
            <button onClick={handleExport} className={styles.iconButton}>
              <Download size={20} />
            </button>
            
            {hasChanges && (
              <button onClick={handleReset} className={styles.iconButton}>
                <RefreshCw size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className={styles.modalBody}>
          {filteredCategories.length === 0 ? (
            <div className={styles.emptyState}>
              <Search size={48} />
              <h3>Keine Features gefunden</h3>
              <p>Ändern Sie Ihre Suchkriterien</p>
            </div>
          ) : (
            <div className={styles.categoriesGrid}>
              {filteredCategories.map(category => (
                <motion.div
                  key={category.id}
                  className={styles.categoryCard}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className={styles.categoryHeader}>
                    <category.icon size={20} />
                    <h3>{category.label}</h3>
                    <span className={styles.categoryCount}>
                      {category.features.filter(f => featureToggles[f.id]).length} / {category.features.length}
                    </span>
                  </div>
                  
                  <p className={styles.categoryDescription}>{category.description}</p>
                  
                  <div className={styles.featuresList}>
                    {category.features.map(feature => (
                      <motion.div
                        key={feature.id}
                        className={`${styles.featureItem} ${featureToggles[feature.id] ? styles.enabled : ''}`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className={styles.featureHeader}>
                          <div className={styles.featureInfo}>
                            <feature.icon size={20} />
                            <div>
                              <h4>
                                {feature.label}
                                {feature.premium && (
                                  <span className={styles.premiumBadge}>
                                    <Star size={12} />
                                    Premium
                                  </span>
                                )}
                                {feature.comingSoon && (
                                  <span className={styles.comingSoonBadge}>
                                    Bald verfügbar
                                  </span>
                                )}
                                {feature.required && (
                                  <span className={styles.requiredBadge}>
                                    <Shield size={12} />
                                    Pflicht
                                  </span>
                                )}
                              </h4>
                              <p>{feature.description}</p>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleToggle(feature.id, feature.required)}
                            className={`${styles.toggleButton} ${featureToggles[feature.id] ? styles.active : ''}`}
                            disabled={feature.required || feature.comingSoon}
                          >
                            {featureToggles[feature.id] ? (
                              <ToggleRight size={32} />
                            ) : (
                              <ToggleLeft size={32} />
                            )}
                          </button>
                        </div>
                        
                        <div className={styles.featureMeta}>
                          <span 
                            className={styles.impactLabel}
                            style={{ color: IMPACT_LABELS[feature.impact].color }}
                          >
                            Impact: {IMPACT_LABELS[feature.impact].label}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className={styles.infoSection}>
          <div className={styles.infoCard}>
            <Info size={20} />
            <div>
              <h4>Basis Features</h4>
              <p>Grundlegende Funktionen sind immer verfügbar und können individuell aktiviert werden.</p>
            </div>
          </div>
          
          <div className={styles.infoCard}>
            <Star size={20} />
            <div>
              <h4>Premium Features</h4>
              <p>Erweiterte Funktionen für Restaurants mit Premium-Plan.</p>
            </div>
          </div>
          
          <div className={styles.infoCard}>
            <Shield size={20} />
            <div>
              <h4>Pflichtfeatures</h4>
              <p>Gesetzlich vorgeschriebene Features (z.B. Allergene) können nicht deaktiviert werden.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <div className={styles.footerInfo}>
            {hasChanges && (
              <span className={styles.unsavedChanges}>
                <AlertCircle size={16} />
                Ungespeicherte Änderungen
              </span>
            )}
          </div>
          
          <div className={styles.footerActions}>
            <button onClick={onClose} className={styles.cancelButton}>
              Abbrechen
            </button>
            
            <button 
              onClick={handleSave} 
              className={styles.saveButton}
              disabled={!hasChanges || saving}
            >
              {saving ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <RefreshCw size={20} />
                  </motion.div>
                  <span>Speichern...</span>
                </>
              ) : (
                <>
                  <Save size={20} />
                  <span>Speichern</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default FeatureToggleModal;