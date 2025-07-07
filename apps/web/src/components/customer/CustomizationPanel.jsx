/**
 * EATECH - Advanced Product Customization Interface
 * Version: 4.1.0
 * Description: Comprehensive product customization panel with Swiss compliance
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/components/customer/CustomizationPanel.jsx
 * 
 * Features:
 * - Advanced customization workflows with smart recommendations
 * - Swiss compliance (CHF pricing, 7.7% VAT, OSAV/BLV standards)
 * - Multi-language support (DE-CH, DE-DE, FR-CH, IT-CH, EN-US)
 * - Voice command integration for accessibility
 * - Real-time nutritional impact calculations
 * - Allergen conflict detection and warnings
 * - AI-powered personalization engine
 * - Cross-contamination risk assessment
 * - Swiss dietary preference optimization
 * - Performance monitoring and analytics
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo, 
  useRef,
  memo,
  lazy,
  Suspense
} from 'react';
import { 
  Settings, 
  Zap, 
  ChefHat, 
  Heart, 
  AlertTriangle, 
  Clock, 
  DollarSign,
  Thermometer,
  Scale,
  Utensils,
  Sparkles,
  Volume2,
  Save,
  RotateCcw,
  Share2,
  Bookmark,
  Lightbulb,
  Award,
  CheckCircle,
  XCircle,
  Info,
  ArrowRight,
  ArrowLeft,
  Plus,
  Minus,
  Star,
  TrendingUp,
  Shield,
  Leaf,
  Mountain
} from 'lucide-react';
import styles from './CustomizationPanel.module.css';

// Lazy load heavy components
const NutritionCalculator = lazy(() => import('./NutritionCalculator'));
const AllergenAnalyzer = lazy(() => import('./AllergenAnalyzer'));
const VoiceCustomization = lazy(() => import('./VoiceCustomization'));
const AIRecommendations = lazy(() => import('./AIRecommendations'));
const CustomizationPreview = lazy(() => import('./CustomizationPreview'));

/**
 * Swiss Customization Standards
 */
const SWISS_STANDARDS = {
  VAT_RATE: 0.077, // 7.7% Swiss VAT
  CURRENCY: 'CHF',
  MAX_CUSTOMIZATIONS: 15,
  SAFETY_STANDARDS: {
    OSAV: 'Federal Food Safety and Veterinary Office',
    BLV: 'Bundesamt für Lebensmittelsicherheit',
    SGE: 'Swiss Society for Nutrition'
  },
  PORTION_SIZES: {
    SMALL: { factor: 0.75, label: 'Klein' },
    MEDIUM: { factor: 1.0, label: 'Normal' },
    LARGE: { factor: 1.3, label: 'Gross' },
    XL: { factor: 1.6, label: 'Extra Gross' }
  },
  DIETARY_PREFERENCES: [
    'vegetarian', 'vegan', 'gluten_free', 'lactose_free',
    'low_sodium', 'low_fat', 'high_protein', 'keto',
    'mediterranean', 'swiss_traditional'
  ]
};

/**
 * Multi-Language Support
 */
const TRANSLATIONS = {
  'de-CH': {
    title: 'Produktanpassung',
    customize: 'Anpassen',
    recommendations: 'Empfehlungen',
    nutrition: 'Nährwerte',
    allergens: 'Allergene',
    price: 'Preis',
    addToCart: 'In Warenkorb',
    voice: 'Sprachsteuerung',
    save: 'Speichern',
    reset: 'Zurücksetzen',
    share: 'Teilen',
    favorite: 'Favorit',
    healthy: 'Gesund',
    warning: 'Warnung',
    safe: 'Sicher',
    popular: 'Beliebt',
    new: 'Neu',
    seasonal: 'Saisonal',
    local: 'Lokal',
    organic: 'Bio',
    swiss: 'Schweizer',
    spiciness: 'Schärfe',
    temperature: 'Temperatur',
    portion: 'Portion',
    extras: 'Extras',
    removes: 'Weglassen',
    modifications: 'Änderungen',
    total: 'Total',
    subtotal: 'Zwischensumme',
    vat: 'MwSt',
    loading: 'Lädt...',
    error: 'Fehler',
    success: 'Erfolgreich',
    confirm: 'Bestätigen',
    cancel: 'Abbrechen'
  },
  'de-DE': {
    title: 'Produktanpassung',
    customize: 'Anpassen',
    recommendations: 'Empfehlungen',
    nutrition: 'Nährwerte',
    allergens: 'Allergene',
    price: 'Preis',
    addToCart: 'In Warenkorb',
    voice: 'Sprachsteuerung',
    save: 'Speichern',
    reset: 'Zurücksetzen',
    share: 'Teilen',
    favorite: 'Favorit',
    healthy: 'Gesund',
    warning: 'Warnung',
    safe: 'Sicher',
    popular: 'Beliebt',
    new: 'Neu',
    seasonal: 'Saisonal',
    local: 'Regional',
    organic: 'Bio',
    swiss: 'Schweizer',
    spiciness: 'Schärfe',
    temperature: 'Temperatur',
    portion: 'Portion',
    extras: 'Extras',
    removes: 'Weglassen',
    modifications: 'Änderungen',
    total: 'Gesamt',
    subtotal: 'Zwischensumme',
    vat: 'MwSt',
    loading: 'Lädt...',
    error: 'Fehler',
    success: 'Erfolgreich',
    confirm: 'Bestätigen',
    cancel: 'Abbrechen'
  },
  'fr-CH': {
    title: 'Personnalisation du produit',
    customize: 'Personnaliser',
    recommendations: 'Recommandations',
    nutrition: 'Nutrition',
    allergens: 'Allergènes',
    price: 'Prix',
    addToCart: 'Ajouter au panier',
    voice: 'Commande vocale',
    save: 'Sauvegarder',
    reset: 'Réinitialiser',
    share: 'Partager',
    favorite: 'Favori',
    healthy: 'Sain',
    warning: 'Attention',
    safe: 'Sûr',
    popular: 'Populaire',
    new: 'Nouveau',
    seasonal: 'Saisonnier',
    local: 'Local',
    organic: 'Bio',
    swiss: 'Suisse',
    spiciness: 'Épicé',
    temperature: 'Température',
    portion: 'Portion',
    extras: 'Extras',
    removes: 'Enlever',
    modifications: 'Modifications',
    total: 'Total',
    subtotal: 'Sous-total',
    vat: 'TVA',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    confirm: 'Confirmer',
    cancel: 'Annuler'
  },
  'it-CH': {
    title: 'Personalizzazione prodotto',
    customize: 'Personalizza',
    recommendations: 'Raccomandazioni',
    nutrition: 'Nutrizione',
    allergens: 'Allergeni',
    price: 'Prezzo',
    addToCart: 'Aggiungi al carrello',
    voice: 'Controllo vocale',
    save: 'Salva',
    reset: 'Ripristina',
    share: 'Condividi',
    favorite: 'Preferito',
    healthy: 'Sano',
    warning: 'Attenzione',
    safe: 'Sicuro',
    popular: 'Popolare',
    new: 'Nuovo',
    seasonal: 'Stagionale',
    local: 'Locale',
    organic: 'Bio',
    swiss: 'Svizzero',
    spiciness: 'Piccantezza',
    temperature: 'Temperatura',
    portion: 'Porzione',
    extras: 'Extra',
    removes: 'Rimuovi',
    modifications: 'Modifiche',
    total: 'Totale',
    subtotal: 'Subtotale',
    vat: 'IVA',
    loading: 'Caricamento...',
    error: 'Errore',
    success: 'Successo',
    confirm: 'Conferma',
    cancel: 'Annulla'
  },
  'en-US': {
    title: 'Product Customization',
    customize: 'Customize',
    recommendations: 'Recommendations',
    nutrition: 'Nutrition',
    allergens: 'Allergens',
    price: 'Price',
    addToCart: 'Add to Cart',
    voice: 'Voice Control',
    save: 'Save',
    reset: 'Reset',
    share: 'Share',
    favorite: 'Favorite',
    healthy: 'Healthy',
    warning: 'Warning',
    safe: 'Safe',
    popular: 'Popular',
    new: 'New',
    seasonal: 'Seasonal',
    local: 'Local',
    organic: 'Organic',
    swiss: 'Swiss',
    spiciness: 'Spiciness',
    temperature: 'Temperature',
    portion: 'Portion',
    extras: 'Extras',
    removes: 'Remove',
    modifications: 'Modifications',
    total: 'Total',
    subtotal: 'Subtotal',
    vat: 'VAT',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    confirm: 'Confirm',
    cancel: 'Cancel'
  }
};

/**
 * Customization Types
 */
const CUSTOMIZATION_TYPES = {
  INGREDIENT: 'ingredient',
  PORTION: 'portion',
  SPICINESS: 'spiciness',
  TEMPERATURE: 'temperature',
  COOKING: 'cooking',
  SAUCE: 'sauce',
  SIDE: 'side',
  DRINK: 'drink',
  EXTRA: 'extra',
  DIETARY: 'dietary'
};

/**
 * CustomizationPanel Component
 */
const CustomizationPanel = memo(({
  product,
  initialCustomizations = {},
  userPreferences = {},
  onCustomizationChange,
  onAddToCart,
  onSavePreset,
  onLoadPreset,
  onShare,
  language = 'de-CH',
  isVoiceEnabled = false,
  className = '',
  ...props
}) => {
  // State Management
  const [customizations, setCustomizations] = useState(initialCustomizations);
  const [activeTab, setActiveTab] = useState('customize');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState([]);
  const [nutritionImpact, setNutritionImpact] = useState(null);
  const [allergenWarnings, setAllergenWarnings] = useState([]);
  const [priceBreakdown, setPriceBreakdown] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [presets, setPresets] = useState([]);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [performanceData, setPerformanceData] = useState({});
  const [userBehavior, setUserBehavior] = useState({});

  // Refs
  const panelRef = useRef(null);
  const customizationStartTime = useRef(Date.now());
  const interactionCount = useRef(0);

  // Get translations
  const t = TRANSLATIONS[language] || TRANSLATIONS['de-CH'];

  /**
   * Initialize Component
   */
  useEffect(() => {
    const initializeComponent = async () => {
      setIsLoading(true);
      
      try {
        // Load user presets
        await loadUserPresets();
        
        // Generate initial recommendations
        await generateRecommendations();
        
        // Calculate initial nutrition impact
        calculateNutritionImpact();
        
        // Check for allergen warnings
        checkAllergenWarnings();
        
        // Calculate initial price
        calculatePriceBreakdown();
        
        // Track component load performance
        trackPerformance('component_load', Date.now() - customizationStartTime.current);
        
      } catch (error) {
        console.error('Error initializing CustomizationPanel:', error);
        setErrors({ init: 'Failed to initialize customization panel' });
      } finally {
        setIsLoading(false);
      }
    };

    initializeComponent();
  }, [product, userPreferences]);

  /**
   * Watch for customization changes
   */
  useEffect(() => {
    if (Object.keys(customizations).length > 0) {
      // Debounced update
      const timer = setTimeout(() => {
        calculateNutritionImpact();
        checkAllergenWarnings();
        calculatePriceBreakdown();
        generateRecommendations();
        
        // Notify parent component
        onCustomizationChange?.(customizations);
        
        // Track user behavior
        trackUserBehavior();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [customizations]);

  /**
   * Load user presets
   */
  const loadUserPresets = useCallback(async () => {
    try {
      const response = await fetch(`/api/users/presets?productId=${product.id}`, {
        headers: {
          'Accept-Language': language
        }
      });
      
      if (response.ok) {
        const presetsData = await response.json();
        setPresets(presetsData);
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  }, [product.id, language]);

  /**
   * Generate AI-powered recommendations
   */
  const generateRecommendations = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': language
        },
        body: JSON.stringify({
          productId: product.id,
          userPreferences,
          currentCustomizations: customizations,
          userBehavior
        })
      });
      
      if (response.ok) {
        const recommendationsData = await response.json();
        setRecommendations(recommendationsData.recommendations || []);
      }
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
    }
  }, [product.id, userPreferences, customizations, language, userBehavior]);

  /**
   * Calculate nutrition impact
   */
  const calculateNutritionImpact = useCallback(() => {
    try {
      const baseNutrition = product.nutrition || {};
      let impactData = { ...baseNutrition };
      
      // Apply customization impacts
      Object.entries(customizations).forEach(([type, value]) => {
        const customization = product.customizations?.find(c => c.type === type);
        if (customization?.nutritionImpact) {
          Object.entries(customization.nutritionImpact).forEach(([nutrient, impact]) => {
            if (typeof impact === 'number') {
              impactData[nutrient] = (impactData[nutrient] || 0) + impact;
            } else if (typeof impact === 'object' && impact[value]) {
              impactData[nutrient] = (impactData[nutrient] || 0) + impact[value];
            }
          });
        }
      });
      
      // Calculate health score
      const healthScore = calculateHealthScore(impactData);
      
      setNutritionImpact({
        ...impactData,
        healthScore,
        changes: calculateNutritionChanges(baseNutrition, impactData)
      });
      
    } catch (error) {
      console.error('Error calculating nutrition impact:', error);
    }
  }, [product, customizations]);

  /**
   * Check allergen warnings
   */
  const checkAllergenWarnings = useCallback(() => {
    try {
      const warnings = [];
      const userAllergens = userPreferences.allergens || [];
      
      // Check base product allergens
      const productAllergens = product.allergens || [];
      productAllergens.forEach(allergen => {
        if (userAllergens.includes(allergen.code)) {
          warnings.push({
            type: 'allergen',
            severity: allergen.severity || 'medium',
            message: `Contains ${allergen.name}`,
            allergen: allergen.code
          });
        }
      });
      
      // Check customization allergen impacts
      Object.entries(customizations).forEach(([type, value]) => {
        const customization = product.customizations?.find(c => c.type === type);
        const option = customization?.options?.find(o => o.value === value);
        
        if (option?.allergens) {
          option.allergens.forEach(allergen => {
            if (userAllergens.includes(allergen.code)) {
              warnings.push({
                type: 'customization_allergen',
                severity: allergen.severity || 'medium',
                message: `Customization adds ${allergen.name}`,
                allergen: allergen.code,
                customization: type
              });
            }
          });
        }
      });
      
      // Check cross-contamination risks
      const crossContaminationRisk = calculateCrossContaminationRisk();
      if (crossContaminationRisk > 0.3) {
        warnings.push({
          type: 'cross_contamination',
          severity: 'low',
          message: 'Potential cross-contamination risk',
          risk: crossContaminationRisk
        });
      }
      
      setAllergenWarnings(warnings);
      
    } catch (error) {
      console.error('Error checking allergen warnings:', error);
    }
  }, [product, customizations, userPreferences]);

  /**
   * Calculate price breakdown
   */
  const calculatePriceBreakdown = useCallback(() => {
    try {
      let basePrice = product.price || 0;
      let customizationCosts = 0;
      const breakdown = [];
      
      // Base product
      breakdown.push({
        item: product.name,
        price: basePrice,
        type: 'base'
      });
      
      // Customization costs
      Object.entries(customizations).forEach(([type, value]) => {
        const customization = product.customizations?.find(c => c.type === type);
        const option = customization?.options?.find(o => o.value === value);
        
        if (option?.price && option.price !== 0) {
          breakdown.push({
            item: option.name || `${type}: ${value}`,
            price: option.price,
            type: 'customization'
          });
          customizationCosts += option.price;
        }
      });
      
      const subtotal = basePrice + customizationCosts;
      const vatAmount = subtotal * SWISS_STANDARDS.VAT_RATE;
      const total = subtotal + vatAmount;
      
      setPriceBreakdown({
        breakdown,
        subtotal,
        vatAmount,
        total,
        currency: SWISS_STANDARDS.CURRENCY
      });
      
    } catch (error) {
      console.error('Error calculating price breakdown:', error);
    }
  }, [product, customizations]);

  /**
   * Calculate health score (0-100)
   */
  const calculateHealthScore = useCallback((nutrition) => {
    try {
      let score = 100;
      
      // Deduct for high calories (over 600)
      if (nutrition.calories > 600) {
        score -= Math.min(30, (nutrition.calories - 600) / 20);
      }
      
      // Deduct for high sodium (over 1000mg)
      if (nutrition.sodium > 1000) {
        score -= Math.min(25, (nutrition.sodium - 1000) / 100);
      }
      
      // Deduct for high saturated fat (over 10g)
      if (nutrition.saturatedFat > 10) {
        score -= Math.min(20, (nutrition.saturatedFat - 10) * 2);
      }
      
      // Add for high protein (over 20g)
      if (nutrition.protein > 20) {
        score += Math.min(15, (nutrition.protein - 20) * 0.5);
      }
      
      // Add for high fiber (over 5g)
      if (nutrition.fiber > 5) {
        score += Math.min(10, (nutrition.fiber - 5) * 2);
      }
      
      return Math.max(0, Math.min(100, Math.round(score)));
      
    } catch (error) {
      console.error('Error calculating health score:', error);
      return 50; // Default score
    }
  }, []);

  /**
   * Calculate nutrition changes
   */
  const calculateNutritionChanges = useCallback((base, current) => {
    const changes = {};
    
    Object.keys(current).forEach(nutrient => {
      const baseValue = base[nutrient] || 0;
      const currentValue = current[nutrient] || 0;
      const change = currentValue - baseValue;
      
      if (Math.abs(change) > 0.01) {
        changes[nutrient] = {
          absolute: change,
          percentage: baseValue > 0 ? (change / baseValue) * 100 : 0
        };
      }
    });
    
    return changes;
  }, []);

  /**
   * Calculate cross-contamination risk
   */
  const calculateCrossContaminationRisk = useCallback(() => {
    // Simplified risk calculation
    const allergenCount = (product.allergens || []).length;
    const customizationRisk = Object.keys(customizations).length * 0.1;
    return Math.min(1.0, (allergenCount * 0.15) + customizationRisk);
  }, [product, customizations]);

  /**
   * Track performance metrics
   */
  const trackPerformance = useCallback((event, duration) => {
    setPerformanceData(prev => ({
      ...prev,
      [event]: {
        duration,
        timestamp: Date.now()
      }
    }));
  }, []);

  /**
   * Track user behavior
   */
  const trackUserBehavior = useCallback(() => {
    interactionCount.current += 1;
    
    setUserBehavior(prev => ({
      ...prev,
      totalInteractions: interactionCount.current,
      lastInteraction: Date.now(),
      sessionDuration: Date.now() - customizationStartTime.current,
      customizationTypes: Object.keys(customizations),
      mostUsedCustomizations: calculateMostUsedCustomizations()
    }));
  }, [customizations]);

  /**
   * Calculate most used customizations
   */
  const calculateMostUsedCustomizations = useCallback(() => {
    const usage = {};
    Object.keys(customizations).forEach(type => {
      usage[type] = (usage[type] || 0) + 1;
    });
    return Object.entries(usage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type]) => type);
  }, [customizations]);

  /**
   * Handle customization change
   */
  const handleCustomizationChange = useCallback((type, value) => {
    const startTime = Date.now();
    
    setCustomizations(prev => ({
      ...prev,
      [type]: value
    }));
    
    // Track performance
    trackPerformance('customization_change', Date.now() - startTime);
    
    // Clear related errors
    if (errors[type]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[type];
        return newErrors;
      });
    }
  }, [errors, trackPerformance]);

  /**
   * Handle remove customization
   */
  const handleRemoveCustomization = useCallback((type) => {
    setCustomizations(prev => {
      const newCustomizations = { ...prev };
      delete newCustomizations[type];
      return newCustomizations;
    });
  }, []);

  /**
   * Handle reset customizations
   */
  const handleReset = useCallback(() => {
    setCustomizations({});
    setErrors({});
    setWarnings([]);
    trackPerformance('reset', 0);
  }, [trackPerformance]);

  /**
   * Handle save preset
   */
  const handleSavePreset = useCallback(async (name) => {
    try {
      const response = await fetch('/api/users/presets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': language
        },
        body: JSON.stringify({
          name,
          productId: product.id,
          customizations,
          nutritionImpact,
          priceBreakdown
        })
      });
      
      if (response.ok) {
        const preset = await response.json();
        setPresets(prev => [...prev, preset]);
        onSavePreset?.(preset);
      }
    } catch (error) {
      console.error('Failed to save preset:', error);
      setErrors({ preset: 'Failed to save preset' });
    }
  }, [product.id, customizations, nutritionImpact, priceBreakdown, language, onSavePreset]);

  /**
   * Handle load preset
   */
  const handleLoadPreset = useCallback((preset) => {
    setCustomizations(preset.customizations || {});
    onLoadPreset?.(preset);
    trackPerformance('load_preset', 0);
  }, [onLoadPreset, trackPerformance]);

  /**
   * Handle voice command
   */
  const handleVoiceCommand = useCallback((command) => {
    try {
      // Process voice command
      const { action, type, value } = parseVoiceCommand(command, language);
      
      switch (action) {
        case 'add':
        case 'set':
          handleCustomizationChange(type, value);
          break;
        case 'remove':
          handleRemoveCustomization(type);
          break;
        case 'reset':
          handleReset();
          break;
        default:
          console.warn('Unknown voice command:', command);
      }
      
      // Provide voice feedback
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(
          getVoiceFeedback(action, type, value, language)
        );
        utterance.lang = language;
        speechSynthesis.speak(utterance);
      }
      
    } catch (error) {
      console.error('Error processing voice command:', error);
    }
  }, [handleCustomizationChange, handleRemoveCustomization, handleReset, language]);

  /**
   * Handle add to cart
   */
  const handleAddToCart = useCallback(() => {
    if (allergenWarnings.some(w => w.severity === 'high')) {
      if (!confirm('This product contains allergens you are sensitive to. Continue?')) {
        return;
      }
    }
    
    const cartItem = {
      product,
      customizations,
      priceBreakdown,
      nutritionImpact,
      timestamp: Date.now()
    };
    
    onAddToCart?.(cartItem);
    
    // Track conversion
    trackPerformance('add_to_cart', Date.now() - customizationStartTime.current);
  }, [product, customizations, priceBreakdown, nutritionImpact, allergenWarnings, onAddToCart, trackPerformance]);

  /**
   * Memoized calculations
   */
  const customizationOptions = useMemo(() => {
    return product.customizations?.map(customization => ({
      ...customization,
      currentValue: customizations[customization.type],
      isRequired: customization.required || false,
      hasError: !!errors[customization.type]
    })) || [];
  }, [product.customizations, customizations, errors]);

  const totalCustomizations = useMemo(() => {
    return Object.keys(customizations).length;
  }, [customizations]);

  const canAddToCart = useMemo(() => {
    // Check required customizations
    const requiredCustomizations = product.customizations?.filter(c => c.required) || [];
    const missingRequired = requiredCustomizations.some(c => !customizations[c.type]);
    
    // Check for high-severity allergen warnings
    const hasHighAllergenWarnings = allergenWarnings.some(w => w.severity === 'high');
    
    return !missingRequired && !hasHighAllergenWarnings && Object.keys(errors).length === 0;
  }, [product.customizations, customizations, allergenWarnings, errors]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}>
          <Settings className={styles.icon} />
        </div>
        <p>{t.loading}</p>
      </div>
    );
  }

  return (
    <div 
      ref={panelRef}
      className={`${styles.customizationPanel} ${className}`}
      {...props}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2 className={styles.title}>
            <ChefHat className={styles.titleIcon} />
            {t.title}
          </h2>
          {totalCustomizations > 0 && (
            <span className={styles.badge}>
              {totalCustomizations}
            </span>
          )}
        </div>
        
        <div className={styles.actions}>
          {isVoiceEnabled && (
            <button
              className={`${styles.voiceButton} ${isVoiceActive ? styles.active : ''}`}
              onClick={() => setIsVoiceActive(!isVoiceActive)}
              aria-label={t.voice}
            >
              <Volume2 className={styles.icon} />
            </button>
          )}
          
          <button
            className={styles.resetButton}
            onClick={handleReset}
            disabled={totalCustomizations === 0}
            aria-label={t.reset}
          >
            <RotateCcw className={styles.icon} />
          </button>
        </div>
      </div>

      {/* Warnings */}
      {allergenWarnings.length > 0 && (
        <div className={styles.warnings}>
          {allergenWarnings.map((warning, index) => (
            <div 
              key={index}
              className={`${styles.warning} ${styles[warning.severity]}`}
            >
              <AlertTriangle className={styles.warningIcon} />
              <span>{warning.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tab Navigation */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'customize' ? styles.active : ''}`}
          onClick={() => setActiveTab('customize')}
        >
          <Settings className={styles.tabIcon} />
          {t.customize}
        </button>
        
        <button
          className={`${styles.tab} ${activeTab === 'recommendations' ? styles.active : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          <Lightbulb className={styles.tabIcon} />
          {t.recommendations}
          {recommendations.length > 0 && (
            <span className={styles.tabBadge}>{recommendations.length}</span>
          )}
        </button>
        
        <button
          className={`${styles.tab} ${activeTab === 'nutrition' ? styles.active : ''}`}
          onClick={() => setActiveTab('nutrition')}
        >
          <Heart className={styles.tabIcon} />
          {t.nutrition}
          {nutritionImpact?.healthScore && (
            <span className={`${styles.healthScore} ${
              nutritionImpact.healthScore >= 80 ? styles.excellent :
              nutritionImpact.healthScore >= 60 ? styles.good :
              nutritionImpact.healthScore >= 40 ? styles.fair : styles.poor
            }`}>
              {nutritionImpact.healthScore}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'customize' && (
          <div className={styles.customizeTab}>
            {/* Voice Control */}
            {isVoiceActive && isVoiceEnabled && (
              <Suspense fallback={<div className={styles.loading}>{t.loading}</div>}>
                <VoiceCustomization
                  onCommand={handleVoiceCommand}
                  language={language}
                  isActive={isVoiceActive}
                  customizations={customizations}
                />
              </Suspense>
            )}
            
            {/* Customization Options */}
            <div className={styles.customizationOptions}>
              {customizationOptions.map((option) => (
                <CustomizationGroup
                  key={option.type}
                  option={option}
                  value={option.currentValue}
                  onChange={(value) => handleCustomizationChange(option.type, value)}
                  onRemove={() => handleRemoveCustomization(option.type)}
                  language={language}
                  hasError={option.hasError}
                  isRequired={option.isRequired}
                />
              ))}
            </div>
            
            {/* Presets */}
            {presets.length > 0 && (
              <div className={styles.presets}>
                <h3 className={styles.presetsTitle}>
                  <Bookmark className={styles.icon} />
                  Saved Presets
                </h3>
                <div className={styles.presetList}>
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      className={styles.preset}
                      onClick={() => handleLoadPreset(preset)}
                    >
                      <span className={styles.presetName}>{preset.name}</span>
                      <span className={styles.presetPrice}>
                        {preset.priceBreakdown?.total?.toFixed(2)} CHF
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className={styles.recommendationsTab}>
            <Suspense fallback={<div className={styles.loading}>{t.loading}</div>}>
              <AIRecommendations
                recommendations={recommendations}
                onApplyRecommendation={(recommendation) => {
                  if (recommendation.customizations) {
                    Object.entries(recommendation.customizations).forEach(([type, value]) => {
                      handleCustomizationChange(type, value);
                    });
                  }
                }}
                language={language}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'nutrition' && (
          <div className={styles.nutritionTab}>
            <Suspense fallback={<div className={styles.loading}>{t.loading}</div>}>
              <NutritionCalculator
                baseNutrition={product.nutrition}
                currentNutrition={nutritionImpact}
                language={language}
              />
            </Suspense>
          </div>
        )}
      </div>

      {/* Price Summary */}
      {priceBreakdown && (
        <div className={styles.priceSummary}>
          <div className={styles.priceDetails}>
            <div className={styles.priceRow}>
              <span>{t.subtotal}</span>
              <span>{priceBreakdown.subtotal.toFixed(2)} {priceBreakdown.currency}</span>
            </div>
            <div className={styles.priceRow}>
              <span>{t.vat} (7.7%)</span>
              <span>{priceBreakdown.vatAmount.toFixed(2)} {priceBreakdown.currency}</span>
            </div>
            <div className={`${styles.priceRow} ${styles.total}`}>
              <span>{t.total}</span>
              <span>{priceBreakdown.total.toFixed(2)} {priceBreakdown.currency}</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className={styles.footer}>
        <div className={styles.secondaryActions}>
          <button
            className={styles.shareButton}
            onClick={() => onShare?.(customizations)}
            aria-label={t.share}
          >
            <Share2 className={styles.icon} />
          </button>
          
          <button
            className={styles.saveButton}
            onClick={() => {
              const name = prompt('Preset name:');
              if (name) handleSavePreset(name);
            }}
            disabled={totalCustomizations === 0}
            aria-label={t.save}
          >
            <Save className={styles.icon} />
          </button>
        </div>
        
        <button
          className={`${styles.addToCartButton} ${!canAddToCart ? styles.disabled : ''}`}
          onClick={handleAddToCart}
          disabled={!canAddToCart}
        >
          <span className={styles.buttonText}>{t.addToCart}</span>
          {priceBreakdown && (
            <span className={styles.buttonPrice}>
              {priceBreakdown.total.toFixed(2)} CHF
            </span>
          )}
        </button>
      </div>

      {/* Preview Modal */}
      <Suspense fallback={null}>
        <CustomizationPreview
          product={product}
          customizations={customizations}
          isVisible={false} // Controlled by parent or internal state
          onClose={() => {}}
          language={language}
        />
      </Suspense>
    </div>
  );
});

/**
 * CustomizationGroup Subcomponent
 */
const CustomizationGroup = memo(({ 
  option, 
  value, 
  onChange, 
  onRemove, 
  language, 
  hasError, 
  isRequired 
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS['de-CH'];
  
  return (
    <div className={`${styles.customizationGroup} ${hasError ? styles.error : ''}`}>
      <div className={styles.groupHeader}>
        <label className={styles.groupLabel}>
          {option.name}
          {isRequired && <span className={styles.required}>*</span>}
        </label>
        
        {value && !isRequired && (
          <button
            className={styles.removeButton}
            onClick={onRemove}
            aria-label={`Remove ${option.name}`}
          >
            <XCircle className={styles.icon} />
          </button>
        )}
      </div>
      
      {option.description && (
        <p className={styles.groupDescription}>{option.description}</p>
      )}
      
      <div className={styles.groupOptions}>
        {option.options?.map((optionItem) => (
          <CustomizationOption
            key={optionItem.value}
            option={optionItem}
            isSelected={value === optionItem.value}
            onClick={() => onChange(optionItem.value)}
            language={language}
          />
        ))}
      </div>
      
      {hasError && (
        <div className={styles.errorMessage}>
          <AlertTriangle className={styles.icon} />
          {errors[option.type]}
        </div>
      )}
    </div>
  );
});

/**
 * CustomizationOption Subcomponent
 */
const CustomizationOption = memo(({ 
  option, 
  isSelected, 
  onClick, 
  language 
}) => {
  return (
    <button
      className={`${styles.customizationOption} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      disabled={option.disabled}
    >
      <div className={styles.optionContent}>
        <div className={styles.optionHeader}>
          <span className={styles.optionName}>{option.name}</span>
          {option.isPopular && (
            <span className={styles.badge}>
              <TrendingUp className={styles.icon} />
              Popular
            </span>
          )}
          {option.isHealthy && (
            <span className={styles.healthyBadge}>
              <Leaf className={styles.icon} />
              Healthy
            </span>
          )}
          {option.isSwiss && (
            <span className={styles.swissBadge}>
              <Mountain className={styles.icon} />
              Swiss
            </span>
          )}
        </div>
        
        {option.description && (
          <p className={styles.optionDescription}>{option.description}</p>
        )}
        
        <div className={styles.optionFooter}>
          {option.price && option.price !== 0 && (
            <span className={`${styles.optionPrice} ${option.price > 0 ? styles.positive : styles.negative}`}>
              {option.price > 0 ? '+' : ''}{option.price.toFixed(2)} CHF
            </span>
          )}
          
          {option.nutritionImpact && (
            <div className={styles.nutritionImpact}>
              {Object.entries(option.nutritionImpact).map(([nutrient, impact]) => (
                <span 
                  key={nutrient}
                  className={`${styles.nutrientChange} ${impact > 0 ? styles.increase : styles.decrease}`}
                >
                  {impact > 0 ? '+' : ''}{impact} {nutrient}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {isSelected && (
        <CheckCircle className={styles.selectedIcon} />
      )}
    </button>
  );
});

/**
 * Utility Functions
 */

/**
 * Parse voice command
 */
function parseVoiceCommand(command, language) {
  // Simplified voice command parsing
  const lowerCommand = command.toLowerCase().trim();
  
  // Language-specific command patterns
  const patterns = {
    'de-CH': {
      add: ['hinzufüge', 'dazue', 'mit'],
      remove: ['weglah', 'ohni', 'entferne'],
      reset: ['zrugsetze', 'alles lösche'],
      set: ['setze', 'mach']
    },
    'de-DE': {
      add: ['hinzufügen', 'dazu', 'mit'],
      remove: ['weglassen', 'ohne', 'entfernen'],
      reset: ['zurücksetzen', 'alles löschen'],
      set: ['setzen', 'machen']
    },
    'en-US': {
      add: ['add', 'with', 'include'],
      remove: ['remove', 'without', 'exclude'],
      reset: ['reset', 'clear all'],
      set: ['set', 'make']
    }
  };
  
  const langPatterns = patterns[language] || patterns['en-US'];
  
  // Simple pattern matching (would be more sophisticated in real implementation)
  let action = 'set';
  let type = 'unknown';
  let value = 'default';
  
  if (langPatterns.add.some(pattern => lowerCommand.includes(pattern))) {
    action = 'add';
  } else if (langPatterns.remove.some(pattern => lowerCommand.includes(pattern))) {
    action = 'remove';
  } else if (langPatterns.reset.some(pattern => lowerCommand.includes(pattern))) {
    action = 'reset';
  }
  
  // Extract type and value (simplified)
  if (lowerCommand.includes('sauce')) {
    type = 'sauce';
    value = 'ketchup'; // Default
  } else if (lowerCommand.includes('size') || lowerCommand.includes('gross')) {
    type = 'portion';
    value = 'large';
  }
  
  return { action, type, value };
}

/**
 * Get voice feedback
 */
function getVoiceFeedback(action, type, value, language) {
  const feedback = {
    'de-CH': {
      add: `${type} ${value} hinzugefügt`,
      remove: `${type} entfernt`,
      reset: 'Alles zurückgesetzt',
      set: `${type} auf ${value} gesetzt`
    },
    'en-US': {
      add: `Added ${type} ${value}`,
      remove: `Removed ${type}`,
      reset: 'All customizations reset',
      set: `Set ${type} to ${value}`
    }
  };
  
  return feedback[language]?.[action] || feedback['en-US'][action] || 'Command processed';
}

CustomizationPanel.displayName = 'CustomizationPanel';

export default CustomizationPanel;