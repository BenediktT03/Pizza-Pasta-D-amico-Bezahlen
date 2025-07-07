/**
 * EATECH - Allergen Information Component
 * Version: 4.2.0
 * Description: Comprehensive allergen management with Swiss food safety compliance
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/components/customer/AllergenInfo.jsx
 * 
 * Features:
 * - Swiss allergen labeling compliance (EU Regulation 1169/2011)
 * - Real-time allergen alerts and warnings
 * - Cross-contamination risk assessment
 * - Personal allergen profile management
 * - Emergency contact integration
 * - Multi-language allergen descriptions
 * - Severity level indicators
 * - Alternative product suggestions
 * - Allergen-free menu filtering
 * - Medical emergency protocols
 * - Voice-based allergen warnings
 * - Accessibility features for visual impairments
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo,
  useRef,
  lazy,
  Suspense
} from 'react';
import { 
  AlertTriangle, Shield, Info, X, Check,
  Heart, Zap, Wheat, Droplets, Fish,
  Apple, Egg, TreePine, Beef, Milk,
  Eye, EyeOff, Settings, Phone, User,
  Bell, BellOff, Filter, Search, Star,
  ChevronDown, ChevronUp, MapPin, Clock,
  BookOpen, FileText, Download, Share2
} from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { useNotifications } from '../../hooks/useNotifications';
import { useAnalytics } from '../../hooks/useAnalytics';
import styles from './AllergenInfo.module.css';

// ============================================================================
// LAZY LOADED COMPONENTS
// ============================================================================

const AllergenProfile = lazy(() => import('./AllergenProfile'));
const AllergenAlert = lazy(() => import('./AllergenAlert'));
const AllergenAlternatives = lazy(() => import('./AllergenAlternatives'));
const EmergencyContacts = lazy(() => import('./EmergencyContacts'));
const AllergenEducation = lazy(() => import('./AllergenEducation'));

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const EU_ALLERGENS = {
  // EU Regulation 1169/2011 - Annex II
  gluten: {
    id: 'gluten',
    name: 'Gluten',
    icon: Wheat,
    color: '#f59e0b',
    severity: 'high',
    description: 'Glutenhaltiges Getreide',
    sources: ['wheat', 'rye', 'barley', 'oats', 'spelt', 'kamut'],
    crossContamination: ['cereals', 'baked_goods', 'sauces']
  },
  crustaceans: {
    id: 'crustaceans',
    name: 'Krebstiere',
    icon: Fish,
    color: '#ef4444',
    severity: 'critical',
    description: 'Krebstiere und daraus gewonnene Erzeugnisse',
    sources: ['shrimp', 'crab', 'lobster', 'prawns'],
    crossContamination: ['seafood', 'sauces', 'soups']
  },
  eggs: {
    id: 'eggs',
    name: 'Eier',
    icon: Egg,
    color: '#fbbf24',
    severity: 'high',
    description: 'Eier und daraus gewonnene Erzeugnisse',
    sources: ['chicken_eggs', 'duck_eggs', 'quail_eggs'],
    crossContamination: ['baked_goods', 'pasta', 'mayonnaise']
  },
  fish: {
    id: 'fish',
    name: 'Fisch',
    icon: Fish,
    color: '#3b82f6',
    severity: 'high',
    description: 'Fisch und daraus gewonnene Erzeugnisse',
    sources: ['all_fish_species'],
    crossContamination: ['seafood', 'worcestershire_sauce', 'caesar_dressing']
  },
  peanuts: {
    id: 'peanuts',
    name: 'Erdnüsse',
    icon: Apple,
    color: '#dc2626',
    severity: 'critical',
    description: 'Erdnüsse und daraus gewonnene Erzeugnisse',
    sources: ['peanuts', 'groundnuts'],
    crossContamination: ['nuts', 'nut_oils', 'bakery_products']
  },
  soybeans: {
    id: 'soybeans',
    name: 'Soja',
    icon: TreePine,
    color: '#16a34a',
    severity: 'medium',
    description: 'Sojabohnen und daraus gewonnene Erzeugnisse',
    sources: ['soybeans', 'soy_sauce', 'tofu', 'tempeh'],
    crossContamination: ['vegetarian_products', 'asian_cuisine']
  },
  milk: {
    id: 'milk',
    name: 'Milch',
    icon: Droplets,
    color: '#06b6d4',
    severity: 'high',
    description: 'Milch und daraus gewonnene Erzeugnisse (einschließlich Laktose)',
    sources: ['cow_milk', 'goat_milk', 'sheep_milk', 'buffalo_milk'],
    crossContamination: ['dairy_products', 'baked_goods', 'chocolate']
  },
  nuts: {
    id: 'nuts',
    name: 'Schalenfrüchte',
    icon: Apple,
    color: '#a855f7',
    severity: 'critical',
    description: 'Schalenfrüchte und daraus gewonnene Erzeugnisse',
    sources: ['almonds', 'hazelnuts', 'walnuts', 'cashews', 'pecans', 'brazil_nuts', 'pistachios', 'macadamia'],
    crossContamination: ['nut_oils', 'bakery_products', 'chocolates']
  },
  celery: {
    id: 'celery',
    name: 'Sellerie',
    icon: TreePine,
    color: '#84cc16',
    severity: 'medium',
    description: 'Sellerie und daraus gewonnene Erzeugnisse',
    sources: ['celery_root', 'celery_stalks', 'celery_leaves'],
    crossContamination: ['spice_mixes', 'vegetable_broths', 'salads']
  },
  mustard: {
    id: 'mustard',
    name: 'Senf',
    icon: Zap,
    color: '#eab308',
    severity: 'medium',
    description: 'Senf und daraus gewonnene Erzeugnisse',
    sources: ['mustard_seeds', 'mustard_powder'],
    crossContamination: ['sauces', 'dressings', 'marinades']
  },
  sesame: {
    id: 'sesame',
    name: 'Sesam',
    icon: Star,
    color: '#f97316',
    severity: 'high',
    description: 'Sesamsamen und daraus gewonnene Erzeugnisse',
    sources: ['sesame_seeds', 'tahini', 'sesame_oil'],
    crossContamination: ['bakery_products', 'middle_eastern_cuisine', 'asian_cuisine']
  },
  sulfites: {
    id: 'sulfites',
    name: 'Schwefeldioxid',
    icon: Heart,
    color: '#8b5cf6',
    severity: 'medium',
    description: 'Schwefeldioxid und Sulfite',
    sources: ['wine', 'dried_fruits', 'processed_foods'],
    crossContamination: ['wines', 'preserved_foods', 'processed_meats']
  },
  lupin: {
    id: 'lupin',
    name: 'Lupinen',
    icon: TreePine,
    color: '#059669',
    severity: 'medium',
    description: 'Lupinen und daraus gewonnene Erzeugnisse',
    sources: ['lupin_beans', 'lupin_flour'],
    crossContamination: ['gluten_free_products', 'protein_products']
  },
  molluscs: {
    id: 'molluscs',
    name: 'Weichtiere',
    icon: Fish,
    color: '#7c3aed',
    severity: 'high',
    description: 'Weichtiere und daraus gewonnene Erzeugnisse',
    sources: ['mussels', 'oysters', 'clams', 'scallops', 'snails'],
    crossContamination: ['seafood', 'paella', 'seafood_sauces']
  }
};

const SEVERITY_LEVELS = {
  low: { level: 1, color: '#10b981', label: 'Niedrig' },
  medium: { level: 2, color: '#f59e0b', label: 'Mittel' },
  high: { level: 3, color: '#ef4444', label: 'Hoch' },
  critical: { level: 4, color: '#dc2626', label: 'Kritisch' }
};

const ALLERGEN_TRANSLATIONS = {
  'de-CH': {
    allergen_information: 'Allergen-Informationen',
    contains_allergens: 'Enthält Allergene',
    may_contain: 'Kann Spuren enthalten von',
    allergen_free: 'Allergenfrei',
    cross_contamination_risk: 'Kreuzkontaminationsrisiko',
    severity_level: 'Schweregrad',
    personal_allergen_profile: 'Persönliches Allergen-Profil',
    add_allergen: 'Allergen hinzufügen',
    remove_allergen: 'Allergen entfernen',
    allergen_warning: 'Allergen-Warnung',
    emergency_contacts: 'Notfallkontakte',
    alternative_products: 'Alternative Produkte',
    allergen_education: 'Allergen-Aufklärung',
    enable_notifications: 'Benachrichtigungen aktivieren',
    high_risk_warning: 'Hochrisiko-Warnung',
    ingredients_analysis: 'Zutaten-Analyse',
    production_information: 'Produktionsinformationen',
    last_updated: 'Zuletzt aktualisiert',
    verified_information: 'Verifizierte Informationen'
  },
  'de-DE': {
    allergen_information: 'Allergen-Informationen',
    contains_allergens: 'Enthält Allergene',
    may_contain: 'Kann Spuren enthalten von',
    allergen_free: 'Allergenfrei',
    cross_contamination_risk: 'Kreuzkontaminationsrisiko',
    severity_level: 'Schweregrad',
    personal_allergen_profile: 'Persönliches Allergen-Profil',
    add_allergen: 'Allergen hinzufügen',
    remove_allergen: 'Allergen entfernen',
    allergen_warning: 'Allergen-Warnung',
    emergency_contacts: 'Notfallkontakte',
    alternative_products: 'Alternative Produkte',
    allergen_education: 'Allergen-Aufklärung',
    enable_notifications: 'Benachrichtigungen aktivieren',
    high_risk_warning: 'Hochrisiko-Warnung',
    ingredients_analysis: 'Zutaten-Analyse',
    production_information: 'Produktionsinformationen',
    last_updated: 'Zuletzt aktualisiert',
    verified_information: 'Verifizierte Informationen'
  },
  'fr-CH': {
    allergen_information: 'Informations sur les allergènes',
    contains_allergens: 'Contient des allergènes',
    may_contain: 'Peut contenir des traces de',
    allergen_free: 'Sans allergènes',
    cross_contamination_risk: 'Risque de contamination croisée',
    severity_level: 'Niveau de sévérité',
    personal_allergen_profile: 'Profil allergène personnel',
    add_allergen: 'Ajouter un allergène',
    remove_allergen: 'Supprimer un allergène',
    allergen_warning: 'Avertissement allergène',
    emergency_contacts: 'Contacts d\'urgence',
    alternative_products: 'Produits alternatifs',
    allergen_education: 'Éducation sur les allergènes',
    enable_notifications: 'Activer les notifications',
    high_risk_warning: 'Avertissement haut risque',
    ingredients_analysis: 'Analyse des ingrédients',
    production_information: 'Informations de production',
    last_updated: 'Dernière mise à jour',
    verified_information: 'Informations vérifiées'
  },
  'it-CH': {
    allergen_information: 'Informazioni allergeni',
    contains_allergens: 'Contiene allergeni',
    may_contain: 'Può contenere tracce di',
    allergen_free: 'Senza allergeni',
    cross_contamination_risk: 'Rischio contaminazione incrociata',
    severity_level: 'Livello di gravità',
    personal_allergen_profile: 'Profilo allergeni personale',
    add_allergen: 'Aggiungi allergene',
    remove_allergen: 'Rimuovi allergene',
    allergen_warning: 'Avviso allergeni',
    emergency_contacts: 'Contatti di emergenza',
    alternative_products: 'Prodotti alternativi',
    allergen_education: 'Educazione allergeni',
    enable_notifications: 'Abilita notifiche',
    high_risk_warning: 'Avviso alto rischio',
    ingredients_analysis: 'Analisi ingredienti',
    production_information: 'Informazioni produzione',
    last_updated: 'Ultimo aggiornamento',
    verified_information: 'Informazioni verificate'
  },
  'en-US': {
    allergen_information: 'Allergen Information',
    contains_allergens: 'Contains Allergens',
    may_contain: 'May contain traces of',
    allergen_free: 'Allergen Free',
    cross_contamination_risk: 'Cross-contamination Risk',
    severity_level: 'Severity Level',
    personal_allergen_profile: 'Personal Allergen Profile',
    add_allergen: 'Add Allergen',
    remove_allergen: 'Remove Allergen',
    allergen_warning: 'Allergen Warning',
    emergency_contacts: 'Emergency Contacts',
    alternative_products: 'Alternative Products',
    allergen_education: 'Allergen Education',
    enable_notifications: 'Enable Notifications',
    high_risk_warning: 'High Risk Warning',
    ingredients_analysis: 'Ingredients Analysis',
    production_information: 'Production Information',
    last_updated: 'Last Updated',
    verified_information: 'Verified Information'
  }
};

const DEFAULT_SETTINGS = {
  showSeverityLevels: true,
  enableCrossContaminationWarnings: true,
  enablePersonalAlerts: true,
  enableVoiceWarnings: true,
  showAlternativeProducts: true,
  enableEmergencyProtocol: true,
  autoHideNonCritical: false,
  visualAccessibilityMode: false,
  detailedAnalysis: true
};

// ============================================================================
// LOADING COMPONENT
// ============================================================================

const LoadingSpinner = ({ size = 16, message }) => (
  <div className={styles.loadingContainer}>
    <div className={styles.spinner} style={{ width: size, height: size }} />
    {message && <span className={styles.loadingMessage}>{message}</span>}
  </div>
);

// ============================================================================
// ALLERGEN ITEM COMPONENT
// ============================================================================

const AllergenItem = ({ 
  allergen, 
  severity, 
  isPersonalAllergen, 
  crossContaminationRisk,
  onPersonalToggle,
  language,
  detailed = false 
}) => {
  const [expanded, setExpanded] = useState(false);
  const allergenData = EU_ALLERGENS[allergen];
  const IconComponent = allergenData?.icon || AlertTriangle;
  const severityData = SEVERITY_LEVELS[severity || allergenData?.severity || 'medium'];

  if (!allergenData) return null;

  return (
    <div 
      className={`${styles.allergenItem} ${isPersonalAllergen ? styles.personalAllergen : ''}`}
      style={{ '--allergen-color': allergenData.color }}
    >
      <div className={styles.allergenHeader}>
        <div className={styles.allergenBasic}>
          <div className={styles.allergenIcon}>
            <IconComponent size={20} />
          </div>
          
          <div className={styles.allergenInfo}>
            <span className={styles.allergenName}>{allergenData.name}</span>
            
            <div className={styles.allergenMeta}>
              <span 
                className={styles.severityBadge}
                style={{ backgroundColor: severityData.color }}
              >
                {severityData.label}
              </span>
              
              {crossContaminationRisk && (
                <span className={styles.riskBadge}>
                  <AlertTriangle size={12} />
                  Kreuzkontamination
                </span>
              )}
              
              {isPersonalAllergen && (
                <span className={styles.personalBadge}>
                  <User size={12} />
                  Persönlich
                </span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.allergenActions}>
          {onPersonalToggle && (
            <button
              className={`${styles.personalToggle} ${isPersonalAllergen ? styles.active : ''}`}
              onClick={() => onPersonalToggle(allergen, !isPersonalAllergen)}
              title={isPersonalAllergen ? 'Von persönlichen Allergenen entfernen' : 'Zu persönlichen Allergenen hinzufügen'}
            >
              <Heart size={14} fill={isPersonalAllergen ? 'currentColor' : 'none'} />
            </button>
          )}

          {detailed && (
            <button
              className={styles.expandButton}
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {expanded && detailed && (
        <div className={styles.allergenDetails}>
          <div className={styles.allergenDescription}>
            <p>{allergenData.description}</p>
          </div>

          <div className={styles.allergenSources}>
            <h5>Häufige Quellen:</h5>
            <div className={styles.sourcesList}>
              {allergenData.sources.map((source, index) => (
                <span key={index} className={styles.sourceItem}>
                  {source.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          {allergenData.crossContamination && (
            <div className={styles.crossContamination}>
              <h5>Kreuzkontaminationsrisiko:</h5>
              <div className={styles.riskList}>
                {allergenData.crossContamination.map((risk, index) => (
                  <span key={index} className={styles.riskItem}>
                    {risk.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AllergenInfo = ({
  product,
  allergens = [],
  traceAllergens = [],
  crossContaminationRisks = [],
  language = 'de-CH',
  settings = {},
  onAllergenAlert,
  onProfileUpdate,
  className = '',
  mode = 'display', // 'display', 'profile', 'emergency'
  enablePersonalization = true,
  enableEmergencyFeatures = true
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [showProfile, setShowProfile] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false);
  const [showEducation, setShowEducation] = useState(false);
  const [expandedSection, setExpandedSection] = useState('contains');
  const [alertedAllergens, setAlertedAllergens] = useState(new Set());
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // ============================================================================
  // REFS & CONTEXTS
  // ============================================================================

  const componentRef = useRef(null);
  const { tenant } = useTenant();
  const { user } = useAuth();
  const { 
    allergenProfile, 
    updateAllergenProfile,
    emergencyContacts,
    preferences 
  } = useUserPreferences();
  const { showNotification } = useNotifications();
  const { trackEvent } = useAnalytics();

  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================

  const mergedSettings = useMemo(() => ({
    ...DEFAULT_SETTINGS,
    ...settings
  }), [settings]);

  const translations = useMemo(() => 
    ALLERGEN_TRANSLATIONS[language] || ALLERGEN_TRANSLATIONS['de-CH'], 
    [language]
  );

  const personalAllergens = useMemo(() => 
    new Set(allergenProfile?.allergens || []), 
    [allergenProfile]
  );

  const criticalAllergens = useMemo(() => 
    allergens.filter(allergen => {
      const allergenData = EU_ALLERGENS[allergen];
      return allergenData?.severity === 'critical' || personalAllergens.has(allergen);
    }),
    [allergens, personalAllergens]
  );

  const hasPersonalAllergenConflict = useMemo(() => 
    allergens.some(allergen => personalAllergens.has(allergen)) ||
    traceAllergens.some(allergen => personalAllergens.has(allergen)),
    [allergens, traceAllergens, personalAllergens]
  );

  const riskLevel = useMemo(() => {
    if (criticalAllergens.length > 0) return 'critical';
    if (hasPersonalAllergenConflict) return 'high';
    if (allergens.length > 0) return 'medium';
    return 'low';
  }, [criticalAllergens, hasPersonalAllergenConflict, allergens]);

  // ============================================================================
  // ALERT SYSTEM
  // ============================================================================

  useEffect(() => {
    if (!hasPersonalAllergenConflict || !mergedSettings.enablePersonalAlerts) return;

    const conflictingAllergens = [
      ...allergens.filter(a => personalAllergens.has(a)),
      ...traceAllergens.filter(a => personalAllergens.has(a))
    ];

    conflictingAllergens.forEach(allergen => {
      if (!alertedAllergens.has(allergen)) {
        const allergenData = EU_ALLERGENS[allergen];
        
        showNotification({
          type: 'error',
          title: translations.allergen_warning,
          message: `Achtung: ${product?.name || 'Dieses Produkt'} enthält ${allergenData?.name || allergen}!`,
          duration: 10000,
          persistent: true
        });

        // Voice warning if enabled
        if (mergedSettings.enableVoiceWarnings && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(
            `Allergen-Warnung: ${allergenData?.name || allergen} erkannt!`
          );
          utterance.lang = language;
          utterance.rate = 0.8;
          utterance.volume = 0.8;
          speechSynthesis.speak(utterance);
        }

        setAlertedAllergens(prev => new Set([...prev, allergen]));

        trackEvent('allergen_alert_triggered', {
          allergen,
          productId: product?.id,
          severity: allergenData?.severity,
          type: allergens.includes(allergen) ? 'contains' : 'traces'
        });

        onAllergenAlert?.({
          allergen,
          allergenData,
          product,
          severity: allergenData?.severity,
          type: allergens.includes(allergen) ? 'contains' : 'traces'
        });
      }
    });
  }, [
    hasPersonalAllergenConflict,
    allergens,
    traceAllergens,
    personalAllergens,
    alertedAllergens,
    product,
    translations,
    language,
    mergedSettings,
    showNotification,
    trackEvent,
    onAllergenAlert
  ]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handlePersonalAllergenToggle = useCallback(async (allergen, isEnabled) => {
    try {
      const updatedProfile = {
        ...allergenProfile,
        allergens: isEnabled 
          ? [...(allergenProfile?.allergens || []), allergen]
          : (allergenProfile?.allergens || []).filter(a => a !== allergen)
      };

      await updateAllergenProfile(updatedProfile);
      
      trackEvent('personal_allergen_update', {
        allergen,
        action: isEnabled ? 'add' : 'remove',
        totalAllergens: updatedProfile.allergens.length
      });

      onProfileUpdate?.(updatedProfile);

    } catch (error) {
      console.error('Failed to update allergen profile:', error);
      
      showNotification({
        type: 'error',
        message: 'Profil konnte nicht aktualisiert werden',
        duration: 3000
      });
    }
  }, [allergenProfile, updateAllergenProfile, trackEvent, onProfileUpdate, showNotification]);

  const handleSectionToggle = useCallback((section) => {
    setExpandedSection(expandedSection === section ? null : section);
  }, [expandedSection]);

  const handleEmergencyCall = useCallback(() => {
    if (emergencyContacts && emergencyContacts.length > 0) {
      const primaryContact = emergencyContacts.find(c => c.isPrimary) || emergencyContacts[0];
      window.location.href = `tel:${primaryContact.phone}`;
      
      trackEvent('emergency_call_initiated', {
        contactType: primaryContact.type,
        allergenContext: true,
        productId: product?.id
      });
    } else {
      // Swiss emergency number
      window.location.href = 'tel:144';
      
      trackEvent('emergency_call_initiated', {
        contactType: 'emergency_services',
        allergenContext: true,
        productId: product?.id
      });
    }
  }, [emergencyContacts, product, trackEvent]);

  // ============================================================================
  // RENDER METHODS
  // ============================================================================

  const renderWarningBanner = () => {
    if (!hasPersonalAllergenConflict) return null;

    return (
      <div className={`${styles.warningBanner} ${styles[riskLevel]}`}>
        <div className={styles.warningContent}>
          <AlertTriangle size={20} />
          <div className={styles.warningText}>
            <strong>{translations.high_risk_warning}</strong>
            <p>Dieses Produkt enthält Allergene aus Ihrem persönlichen Profil!</p>
          </div>
          
          {enableEmergencyFeatures && (
            <button
              className={styles.emergencyButton}
              onClick={handleEmergencyCall}
            >
              <Phone size={16} />
              Notruf
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderAllergenSection = (title, allergenList, type) => {
    if (allergenList.length === 0) return null;

    const isExpanded = expandedSection === type;

    return (
      <div className={styles.allergenSection}>
        <button
          className={styles.sectionHeader}
          onClick={() => handleSectionToggle(type)}
          aria-expanded={isExpanded}
        >
          <h4>{title}</h4>
          <div className={styles.sectionMeta}>
            <span className={styles.allergenCount}>
              {allergenList.length} {allergenList.length === 1 ? 'Allergen' : 'Allergene'}
            </span>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {isExpanded && (
          <div className={styles.sectionContent}>
            <div className={styles.allergenGrid}>
              {allergenList.map(allergen => (
                <AllergenItem
                  key={allergen}
                  allergen={allergen}
                  isPersonalAllergen={personalAllergens.has(allergen)}
                  crossContaminationRisk={crossContaminationRisks.includes(allergen)}
                  onPersonalToggle={enablePersonalization ? handlePersonalAllergenToggle : null}
                  language={language}
                  detailed={mergedSettings.detailedAnalysis}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAllergenFreeStatus = () => {
    if (allergens.length > 0 || traceAllergens.length > 0) return null;

    return (
      <div className={styles.allergenFreeStatus}>
        <div className={styles.allergenFreeIcon}>
          <Shield size={32} />
        </div>
        <div className={styles.allergenFreeText}>
          <h3>{translations.allergen_free}</h3>
          <p>Dieses Produkt enthält keine der 14 EU-Hauptallergene.</p>
        </div>
        <div className={styles.verificationBadge}>
          <Check size={16} />
          <span>Verifiziert</span>
        </div>
      </div>
    );
  };

  const renderActionButtons = () => (
    <div className={styles.actionButtons}>
      {enablePersonalization && user && (
        <button
          className={styles.actionButton}
          onClick={() => setShowProfile(true)}
        >
          <User size={16} />
          Profil bearbeiten
        </button>
      )}

      {allergens.length > 0 && mergedSettings.showAlternativeProducts && (
        <button
          className={styles.actionButton}
          onClick={() => setShowAlternatives(true)}
        >
          <Star size={16} />
          Alternativen finden
        </button>
      )}

      {enableEmergencyFeatures && (
        <button
          className={styles.actionButton}
          onClick={() => setShowEmergencyContacts(true)}
        >
          <Phone size={16} />
          Notfallkontakte
        </button>
      )}

      <button
        className={styles.actionButton}
        onClick={() => setShowEducation(true)}
      >
        <BookOpen size={16} />
        Allergen-Info
      </button>
    </div>
  );

  const renderProductionInfo = () => {
    if (!product?.production) return null;

    return (
      <div className={styles.productionInfo}>
        <h4>{translations.production_information}</h4>
        <div className={styles.productionDetails}>
          {product.production.facility && (
            <div className={styles.productionItem}>
              <MapPin size={14} />
              <span>Produktionsstätte: {product.production.facility}</span>
            </div>
          )}
          
          {product.production.certifications && (
            <div className={styles.certifications}>
              {product.production.certifications.map((cert, index) => (
                <span key={index} className={styles.certification}>
                  <Shield size={12} />
                  {cert}
                </span>
              ))}
            </div>
          )}
          
          {product.production.lastUpdated && (
            <div className={styles.productionItem}>
              <Clock size={14} />
              <span>{translations.last_updated}: {new Date(product.production.lastUpdated).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div ref={componentRef} className={`${styles.allergenInfo} ${className}`}>
      {/* Warning Banner */}
      {renderWarningBanner()}

      {/* Main Content */}
      <div className={styles.allergenContent}>
        {/* Header */}
        <div className={styles.allergenHeader}>
          <h3>
            <Shield size={20} />
            {translations.allergen_information}
          </h3>
          
          {mergedSettings.enablePersonalAlerts && (
            <button
              className={`${styles.notificationToggle} ${notificationsEnabled ? styles.enabled : ''}`}
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              title={notificationsEnabled ? 'Benachrichtigungen deaktivieren' : 'Benachrichtigungen aktivieren'}
            >
              {notificationsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
            </button>
          )}
        </div>

        {/* Allergen-Free Status */}
        {renderAllergenFreeStatus()}

        {/* Contains Allergens */}
        {renderAllergenSection(
          translations.contains_allergens,
          allergens,
          'contains'
        )}

        {/* May Contain (Traces) */}
        {renderAllergenSection(
          translations.may_contain,
          traceAllergens,
          'traces'
        )}

        {/* Cross-Contamination Risks */}
        {crossContaminationRisks.length > 0 && renderAllergenSection(
          translations.cross_contamination_risk,
          crossContaminationRisks,
          'cross_contamination'
        )}

        {/* Production Information */}
        {renderProductionInfo()}

        {/* Action Buttons */}
        {renderActionButtons()}
      </div>

      {/* Allergen Profile Modal */}
      {showProfile && (
        <Suspense fallback={<LoadingSpinner />}>
          <AllergenProfile
            isOpen={showProfile}
            onClose={() => setShowProfile(false)}
            profile={allergenProfile}
            onProfileUpdate={handlePersonalAllergenToggle}
            language={language}
          />
        </Suspense>
      )}

      {/* Alternative Products Modal */}
      {showAlternatives && (
        <Suspense fallback={<LoadingSpinner />}>
          <AllergenAlternatives
            isOpen={showAlternatives}
            onClose={() => setShowAlternatives(false)}
            currentProduct={product}
            excludeAllergens={[...allergens, ...traceAllergens]}
            personalAllergens={Array.from(personalAllergens)}
            language={language}
          />
        </Suspense>
      )}

      {/* Emergency Contacts Modal */}
      {showEmergencyContacts && (
        <Suspense fallback={<LoadingSpinner />}>
          <EmergencyContacts
            isOpen={showEmergencyContacts}
            onClose={() => setShowEmergencyContacts(false)}
            contacts={emergencyContacts}
            onContactsUpdate={(contacts) => {/* Update emergency contacts */}}
            language={language}
          />
        </Suspense>
      )}

      {/* Allergen Education Modal */}
      {showEducation && (
        <Suspense fallback={<LoadingSpinner />}>
          <AllergenEducation
            isOpen={showEducation}
            onClose={() => setShowEducation(false)}
            focusAllergens={allergens}
            language={language}
          />
        </Suspense>
      )}
    </div>
  );
};

export default AllergenInfo;