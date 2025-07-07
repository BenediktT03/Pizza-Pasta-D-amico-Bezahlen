/**
 * EATECH - Modifier Selector Component
 * Version: 4.1.0
 * Description: Advanced product customization interface with dynamic pricing and nutrition updates
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/components/customer/ModifierSelector.jsx
 * 
 * Features:
 * - Dynamic product customization with real-time pricing
 * - Group-based modifier organization (size, toppings, dietary options)
 * - Visual modifier preview with images
 * - Nutrition impact calculation for modifications
 * - Smart recommendations based on user preferences
 * - Allergen tracking with modification impact
 * - Multi-language modifier descriptions
 * - Voice command integration for accessibility
 * - Custom modifier requests and special instructions
 * - Conflict resolution between incompatible modifiers
 * - Modifier inventory tracking and availability
 * - Swiss pricing standards and tax calculations
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
  Plus, Minus, Check, X, AlertTriangle,
  Star, Heart, Zap, Leaf, Crown,
  DollarSign, Percent, Clock, Info,
  ChevronDown, ChevronUp, Search, Filter,
  ThumbsUp, ThumbsDown, MessageSquare, Edit3,
  ShoppingCart, Calculator, TrendingUp, Award,
  Utensils, Coffee, Wheat, Droplets, Apple
} from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import styles from './ModifierSelector.module.css';

// ============================================================================
// LAZY LOADED COMPONENTS
// ============================================================================

// Specialized Components
const ModifierPreview = lazy(() => import('./ModifierPreview'));
const NutritionImpact = lazy(() => import('./NutritionImpact'));
const ModifierRecommendations = lazy(() => import('./ModifierRecommendations'));
const CustomModifierRequest = lazy(() => import('./CustomModifierRequest'));

// Interactive Components
const ModifierSearch = lazy(() => import('./ModifierSearch'));
const ModifierFilters = lazy(() => import('./ModifierFilters'));
const ModifierComparison = lazy(() => import('./ModifierComparison'));
const VoiceModifierInput = lazy(() => import('./VoiceModifierInput'));

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const MODIFIER_TYPES = {
  SIZE: 'size',
  TOPPINGS: 'toppings',
  SAUCE: 'sauce',
  EXTRAS: 'extras',
  PREPARATION: 'preparation',
  DIETARY: 'dietary',
  TEMPERATURE: 'temperature',
  SPICE_LEVEL: 'spice_level',
  SIDES: 'sides',
  DRINKS: 'drinks'
};

const MODIFIER_CATEGORIES = {
  REQUIRED: 'required',
  OPTIONAL: 'optional',
  PREMIUM: 'premium',
  SEASONAL: 'seasonal',
  RECOMMENDED: 'recommended'
};

const SELECTION_MODES = {
  SINGLE: 'single',        // Only one option (e.g., size)
  MULTIPLE: 'multiple',    // Multiple options allowed (e.g., toppings)
  QUANTITY: 'quantity'     // Options with quantities (e.g., extra cheese x2)
};

const MODIFIER_TRANSLATIONS = {
  'de-CH': {
    size: 'Grösse',
    toppings: 'Beläge',
    sauce: 'Sauce',
    extras: 'Extras',
    preparation: 'Zubereitung',
    dietary: 'Ernährung',
    temperature: 'Temperatur',
    spice_level: 'Schärfegrad',
    sides: 'Beilagen',
    drinks: 'Getränke',
    required: 'Erforderlich',
    optional: 'Optional',
    premium: 'Premium',
    seasonal: 'Saisonal',
    recommended: 'Empfohlen',
    add: 'Hinzufügen',
    remove: 'Entfernen',
    included: 'Inbegriffen',
    extra_cost: 'Aufpreis',
    no_charge: 'Kostenlos',
    unavailable: 'Nicht verfügbar'
  },
  'de-DE': {
    size: 'Größe',
    toppings: 'Beläge',
    sauce: 'Soße',
    extras: 'Extras',
    preparation: 'Zubereitung',
    dietary: 'Ernährung',
    temperature: 'Temperatur',
    spice_level: 'Schärfegrad',
    sides: 'Beilagen',
    drinks: 'Getränke',
    required: 'Erforderlich',
    optional: 'Optional',
    premium: 'Premium',
    seasonal: 'Saisonal',
    recommended: 'Empfohlen',
    add: 'Hinzufügen',
    remove: 'Entfernen',
    included: 'Inbegriffen',
    extra_cost: 'Aufpreis',
    no_charge: 'Kostenlos',
    unavailable: 'Nicht verfügbar'
  },
  'fr-CH': {
    size: 'Taille',
    toppings: 'Garnitures',
    sauce: 'Sauce',
    extras: 'Extras',
    preparation: 'Préparation',
    dietary: 'Nutrition',
    temperature: 'Température',
    spice_level: 'Piquant',
    sides: 'Accompagnements',
    drinks: 'Boissons',
    required: 'Requis',
    optional: 'Optionnel',
    premium: 'Premium',
    seasonal: 'Saisonnier',
    recommended: 'Recommandé',
    add: 'Ajouter',
    remove: 'Retirer',
    included: 'Inclus',
    extra_cost: 'Supplément',
    no_charge: 'Gratuit',
    unavailable: 'Indisponible'
  },
  'it-CH': {
    size: 'Dimensione',
    toppings: 'Condimenti',
    sauce: 'Salsa',
    extras: 'Extra',
    preparation: 'Preparazione',
    dietary: 'Nutrizione',
    temperature: 'Temperatura',
    spice_level: 'Piccante',
    sides: 'Contorni',
    drinks: 'Bevande',
    required: 'Richiesto',
    optional: 'Opzionale',
    premium: 'Premium',
    seasonal: 'Stagionale',
    recommended: 'Raccomandato',
    add: 'Aggiungere',
    remove: 'Rimuovere',
    included: 'Incluso',
    extra_cost: 'Supplemento',
    no_charge: 'Gratuito',
    unavailable: 'Non disponibile'
  },
  'en-US': {
    size: 'Size',
    toppings: 'Toppings',
    sauce: 'Sauce',
    extras: 'Extras',
    preparation: 'Preparation',
    dietary: 'Dietary',
    temperature: 'Temperature',
    spice_level: 'Spice Level',
    sides: 'Sides',
    drinks: 'Drinks',
    required: 'Required',
    optional: 'Optional',
    premium: 'Premium',
    seasonal: 'Seasonal',
    recommended: 'Recommended',
    add: 'Add',
    remove: 'Remove',
    included: 'Included',
    extra_cost: 'Extra Cost',
    no_charge: 'No Charge',
    unavailable: 'Unavailable'
  }
};

const SWISS_TAX_RATE = 0.077; // 7.7% Swiss VAT

const DEFAULT_SETTINGS = {
  showNutritionImpact: true,
  showPriceBreakdown: true,
  enableRecommendations: true,
  enableVoiceInput: true,
  enableCustomRequests: true,
  showModifierImages: true,
  enableQuickSelect: true,
  groupSimilarModifiers: true,
  showPopularityIndicators: true,
  enableModifierComparison: false
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
// MAIN COMPONENT
// ============================================================================

const ModifierSelector = ({
  product,
  initialModifiers = {},
  onModifiersChange,
  onPriceChange,
  onNutritionChange,
  language = 'de-CH',
  settings = {},
  className = '',
  enableVoiceCommands = true,
  showRecommendations = true,
  maxSelections = null
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [selectedModifiers, setSelectedModifiers] = useState(initialModifiers);
  const [modifierQuantities, setModifierQuantities] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [showCustomRequest, setShowCustomRequest] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [priceBreakdown, setPriceBreakdown] = useState({});
  const [nutritionImpact, setNutritionImpact] = useState({});
  const [conflicts, setConflicts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [unavailableModifiers, setUnavailableModifiers] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [favoriteModifiers, setFavoriteModifiers] = useState([]);

  // ============================================================================
  // REFS & CONTEXTS
  // ============================================================================

  const selectorRef = useRef(null);
  const { tenant } = useTenant();
  const { user } = useAuth();
  const { cart } = useCart();
  const { 
    preferences: userPreferences,
    dietaryRestrictions,
    allergenAlerts,
    favoriteModifications
  } = useUserPreferences();

  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================

  const mergedSettings = useMemo(() => ({
    ...DEFAULT_SETTINGS,
    ...settings
  }), [settings]);

  const translations = useMemo(() => 
    MODIFIER_TRANSLATIONS[language] || MODIFIER_TRANSLATIONS['de-CH'], 
    [language]
  );

  const modifierGroups = useMemo(() => {
    if (!product?.modifiers) return [];

    const groups = product.modifiers.reduce((acc, modifier) => {
      const groupKey = modifier.group || MODIFIER_TYPES.EXTRAS;
      if (!acc[groupKey]) {
        acc[groupKey] = {
          id: groupKey,
          name: translations[groupKey] || groupKey,
          type: groupKey,
          selectionMode: modifier.selectionMode || SELECTION_MODES.MULTIPLE,
          required: modifier.required || false,
          maxSelections: modifier.maxSelections,
          minSelections: modifier.minSelections || (modifier.required ? 1 : 0),
          modifiers: []
        };
      }
      acc[groupKey].modifiers.push(modifier);
      return acc;
    }, {});

    return Object.values(groups).sort((a, b) => {
      // Sort: required first, then by type order
      if (a.required && !b.required) return -1;
      if (!a.required && b.required) return 1;
      return Object.keys(MODIFIER_TYPES).indexOf(a.type) - Object.keys(MODIFIER_TYPES).indexOf(b.type);
    });
  }, [product?.modifiers, translations]);

  const filteredModifierGroups = useMemo(() => {
    if (!searchTerm && activeFilters.length === 0) return modifierGroups;

    return modifierGroups.map(group => {
      const filteredModifiers = group.modifiers.filter(modifier => {
        // Search filter
        const matchesSearch = !searchTerm || 
          modifier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          modifier.description?.toLowerCase().includes(searchTerm.toLowerCase());

        // Category filters
        const matchesFilters = activeFilters.length === 0 ||
          activeFilters.some(filter => 
            modifier.category === filter ||
            modifier.tags?.includes(filter)
          );

        return matchesSearch && matchesFilters;
      });

      return { ...group, modifiers: filteredModifiers };
    }).filter(group => group.modifiers.length > 0);
  }, [modifierGroups, searchTerm, activeFilters]);

  const totalPrice = useMemo(() => {
    let basePrice = product?.price || 0;
    let modifierPrice = 0;

    Object.entries(selectedModifiers).forEach(([modifierId, isSelected]) => {
      if (!isSelected) return;

      const modifier = product?.modifiers?.find(m => m.id === modifierId);
      if (!modifier) return;

      const quantity = modifierQuantities[modifierId] || 1;
      modifierPrice += (modifier.price || 0) * quantity;
    });

    const subtotal = basePrice + modifierPrice;
    const tax = subtotal * SWISS_TAX_RATE;
    
    return {
      base: basePrice,
      modifiers: modifierPrice,
      subtotal,
      tax,
      total: subtotal + tax
    };
  }, [product, selectedModifiers, modifierQuantities]);

  // ============================================================================
  // EFFECT HOOKS
  // ============================================================================

  useEffect(() => {
    onModifiersChange?.(selectedModifiers, modifierQuantities, customInstructions);
  }, [selectedModifiers, modifierQuantities, customInstructions, onModifiersChange]);

  useEffect(() => {
    onPriceChange?.(totalPrice);
  }, [totalPrice, onPriceChange]);

  useEffect(() => {
    // Calculate nutrition impact
    const impact = calculateNutritionImpact();
    setNutritionImpact(impact);
    onNutritionChange?.(impact);
  }, [selectedModifiers, modifierQuantities, onNutritionChange]);

  useEffect(() => {
    // Check for conflicts
    const modifierConflicts = checkModifierConflicts();
    setConflicts(modifierConflicts);
  }, [selectedModifiers]);

  useEffect(() => {
    // Auto-expand required groups
    const requiredGroups = modifierGroups
      .filter(group => group.required)
      .reduce((acc, group) => {
        acc[group.id] = true;
        return acc;
      }, {});
    
    setExpandedGroups(prev => ({ ...prev, ...requiredGroups }));
  }, [modifierGroups]);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const calculateNutritionImpact = useCallback(() => {
    const impact = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sodium: 0,
      allergens: [],
      dietaryChanges: []
    };

    Object.entries(selectedModifiers).forEach(([modifierId, isSelected]) => {
      if (!isSelected) return;

      const modifier = product?.modifiers?.find(m => m.id === modifierId);
      if (!modifier?.nutrition) return;

      const quantity = modifierQuantities[modifierId] || 1;
      const nutrition = modifier.nutrition;

      impact.calories += (nutrition.calories || 0) * quantity;
      impact.protein += (nutrition.protein || 0) * quantity;
      impact.carbs += (nutrition.carbs || 0) * quantity;
      impact.fat += (nutrition.fat || 0) * quantity;
      impact.fiber += (nutrition.fiber || 0) * quantity;
      impact.sodium += (nutrition.sodium || 0) * quantity;

      if (nutrition.allergens) {
        impact.allergens = [...new Set([...impact.allergens, ...nutrition.allergens])];
      }

      if (modifier.dietaryImpact) {
        impact.dietaryChanges = [...new Set([...impact.dietaryChanges, ...modifier.dietaryImpact])];
      }
    });

    return impact;
  }, [selectedModifiers, modifierQuantities, product?.modifiers]);

  const checkModifierConflicts = useCallback(() => {
    const conflicts = [];
    const selectedModifierObjects = Object.entries(selectedModifiers)
      .filter(([_, isSelected]) => isSelected)
      .map(([modifierId]) => product?.modifiers?.find(m => m.id === modifierId))
      .filter(Boolean);

    selectedModifierObjects.forEach(modifier => {
      if (modifier.conflicts) {
        const conflictingSelections = modifier.conflicts.filter(conflictId =>
          selectedModifiers[conflictId]
        );

        if (conflictingSelections.length > 0) {
          conflicts.push({
            modifier: modifier.id,
            conflicts: conflictingSelections,
            message: `${modifier.name} is not compatible with selected options`
          });
        }
      }
    });

    return conflicts;
  }, [selectedModifiers, product?.modifiers]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleModifierToggle = useCallback((modifierId, groupId) => {
    const group = modifierGroups.find(g => g.id === groupId);
    if (!group) return;

    setSelectedModifiers(prev => {
      const newSelected = { ...prev };

      if (group.selectionMode === SELECTION_MODES.SINGLE) {
        // Clear other selections in the same group
        group.modifiers.forEach(mod => {
          if (mod.id !== modifierId) {
            newSelected[mod.id] = false;
          }
        });
        newSelected[modifierId] = !prev[modifierId];
      } else {
        // Check max selections
        const currentGroupSelections = group.modifiers.filter(mod => 
          prev[mod.id] && mod.id !== modifierId
        ).length;

        if (!prev[modifierId] && group.maxSelections && currentGroupSelections >= group.maxSelections) {
          return prev; // Don't allow more selections
        }

        newSelected[modifierId] = !prev[modifierId];
      }

      return newSelected;
    });

    // Reset quantity if deselecting
    if (selectedModifiers[modifierId]) {
      setModifierQuantities(prev => {
        const newQuantities = { ...prev };
        delete newQuantities[modifierId];
        return newQuantities;
      });
    }
  }, [modifierGroups, selectedModifiers]);

  const handleQuantityChange = useCallback((modifierId, quantity) => {
    if (quantity <= 0) {
      setSelectedModifiers(prev => ({ ...prev, [modifierId]: false }));
      setModifierQuantities(prev => {
        const newQuantities = { ...prev };
        delete newQuantities[modifierId];
        return newQuantities;
      });
    } else {
      setSelectedModifiers(prev => ({ ...prev, [modifierId]: true }));
      setModifierQuantities(prev => ({ ...prev, [modifierId]: quantity }));
    }
  }, []);

  const handleGroupToggle = useCallback((groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  }, []);

  const handleFavoriteToggle = useCallback((modifierId) => {
    setFavoriteModifiers(prev => {
      const newFavorites = prev.includes(modifierId)
        ? prev.filter(id => id !== modifierId)
        : [...prev, modifierId];
      
      // Save to user preferences
      // saveFavoriteModifications(newFavorites);
      
      return newFavorites;
    });
  }, []);

  const handleQuickSelect = useCallback((presetName) => {
    const presets = {
      'popular': () => {
        // Select most popular modifiers
        const popularModifiers = product?.modifiers?.filter(m => m.popularity > 0.7) || [];
        const newSelected = {};
        popularModifiers.forEach(mod => {
          newSelected[mod.id] = true;
        });
        setSelectedModifiers(newSelected);
      },
      'recommended': () => {
        // Select recommended modifiers based on user preferences
        recommendations.forEach(rec => {
          if (rec.confidence > 0.8) {
            setSelectedModifiers(prev => ({ ...prev, [rec.modifierId]: true }));
          }
        });
      },
      'dietary': () => {
        // Select modifiers that match dietary restrictions
        const dietaryModifiers = product?.modifiers?.filter(m => 
          m.dietaryLabels?.some(label => dietaryRestrictions.includes(label))
        ) || [];
        const newSelected = {};
        dietaryModifiers.forEach(mod => {
          newSelected[mod.id] = true;
        });
        setSelectedModifiers(newSelected);
      }
    };

    presets[presetName]?.();
  }, [product, recommendations, dietaryRestrictions]);

  const clearAllModifiers = useCallback(() => {
    setSelectedModifiers({});
    setModifierQuantities({});
    setCustomInstructions('');
  }, []);

  // ============================================================================
  // RENDER METHODS
  // ============================================================================

  const renderModifierItem = (modifier, group) => {
    const isSelected = selectedModifiers[modifier.id];
    const quantity = modifierQuantities[modifier.id] || 1;
    const isUnavailable = unavailableModifiers.includes(modifier.id);
    const hasConflict = conflicts.some(c => c.modifier === modifier.id);
    const isFavorite = favoriteModifiers.includes(modifier.id);
    const isRecommended = recommendations.some(r => r.modifierId === modifier.id);

    const modifierPrice = modifier.price || 0;
    const displayPrice = modifierPrice * quantity;

    return (
      <div 
        key={modifier.id}
        className={`${styles.modifierItem} ${isSelected ? styles.selected : ''} ${isUnavailable ? styles.unavailable : ''} ${hasConflict ? styles.conflict : ''}`}
      >
        {/* Modifier Header */}
        <div className={styles.modifierHeader}>
          <div className={styles.modifierInfo}>
            {/* Image */}
            {mergedSettings.showModifierImages && modifier.image && (
              <div className={styles.modifierImage}>
                <img src={modifier.image} alt={modifier.name} loading="lazy" />
              </div>
            )}

            {/* Content */}
            <div className={styles.modifierContent}>
              <div className={styles.modifierName}>
                {modifier.name}
                
                {/* Badges */}
                <div className={styles.modifierBadges}>
                  {isFavorite && (
                    <Heart className={`${styles.badge} ${styles.favorite}`} size={14} />
                  )}
                  {isRecommended && (
                    <Star className={`${styles.badge} ${styles.recommended}`} size={14} />
                  )}
                  {modifier.category === MODIFIER_CATEGORIES.PREMIUM && (
                    <Crown className={`${styles.badge} ${styles.premium}`} size={14} />
                  )}
                  {modifier.category === MODIFIER_CATEGORIES.SEASONAL && (
                    <Leaf className={`${styles.badge} ${styles.seasonal}`} size={14} />
                  )}
                  {modifier.isNew && (
                    <Zap className={`${styles.badge} ${styles.new}`} size={14} />
                  )}
                </div>
              </div>

              {/* Description */}
              {modifier.description && (
                <div className={styles.modifierDescription}>
                  {modifier.description}
                </div>
              )}

              {/* Dietary Labels */}
              {modifier.dietaryLabels && modifier.dietaryLabels.length > 0 && (
                <div className={styles.dietaryLabels}>
                  {modifier.dietaryLabels.map(label => (
                    <span key={label} className={`${styles.dietaryLabel} ${styles[label]}`}>
                      {translations[label] || label}
                    </span>
                  ))}
                </div>
              )}

              {/* Allergen Warning */}
              {modifier.allergens && modifier.allergens.some(a => allergenAlerts.includes(a)) && (
                <div className={styles.allergenWarning}>
                  <AlertTriangle size={14} />
                  <span>Contains allergens</span>
                </div>
              )}
            </div>
          </div>

          {/* Price & Controls */}
          <div className={styles.modifierControls}>
            {/* Price */}
            <div className={styles.modifierPrice}>
              {modifierPrice === 0 ? (
                <span className={styles.included}>{translations.included}</span>
              ) : (
                <span className={styles.price}>
                  +CHF {displayPrice.toFixed(2)}
                </span>
              )}
            </div>

            {/* Selection Control */}
            {!isUnavailable && (
              <div className={styles.selectionControl}>
                {group.selectionMode === SELECTION_MODES.QUANTITY ? (
                  <div className={styles.quantityControl}>
                    <button
                      className={styles.quantityButton}
                      onClick={() => handleQuantityChange(modifier.id, Math.max(0, quantity - 1))}
                      disabled={quantity <= 0}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={14} />
                    </button>
                    <span className={styles.quantity}>{quantity}</span>
                    <button
                      className={styles.quantityButton}
                      onClick={() => handleQuantityChange(modifier.id, quantity + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    className={`${styles.selectButton} ${isSelected ? styles.selected : ''}`}
                    onClick={() => handleModifierToggle(modifier.id, group.id)}
                    disabled={isUnavailable}
                    aria-label={isSelected ? translations.remove : translations.add}
                  >
                    {isSelected ? <Check size={16} /> : <Plus size={16} />}
                  </button>
                )}

                {/* Favorite Button */}
                <button
                  className={`${styles.favoriteButton} ${isFavorite ? styles.active : ''}`}
                  onClick={() => handleFavoriteToggle(modifier.id)}
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart size={14} />
                </button>
              </div>
            )}

            {isUnavailable && (
              <span className={styles.unavailableLabel}>
                {translations.unavailable}
              </span>
            )}
          </div>
        </div>

        {/* Nutrition Impact */}
        {isSelected && mergedSettings.showNutritionImpact && modifier.nutrition && (
          <div className={styles.nutritionImpact}>
            <div className={styles.nutritionValues}>
              {modifier.nutrition.calories && (
                <span>+{(modifier.nutrition.calories * quantity).toFixed(0)} kcal</span>
              )}
              {modifier.nutrition.protein && (
                <span>+{(modifier.nutrition.protein * quantity).toFixed(1)}g protein</span>
              )}
              {modifier.nutrition.sodium && modifier.nutrition.sodium > 100 && (
                <span className={styles.warning}>
                  +{(modifier.nutrition.sodium * quantity).toFixed(0)}mg sodium
                </span>
              )}
            </div>
          </div>
        )}

        {/* Conflict Warning */}
        {hasConflict && (
          <div className={styles.conflictWarning}>
            <AlertTriangle size={14} />
            <span>Conflicts with other selections</span>
          </div>
        )}
      </div>
    );
  };

  const renderModifierGroup = (group) => {
    const isExpanded = expandedGroups[group.id];
    const selectedCount = group.modifiers.filter(mod => selectedModifiers[mod.id]).length;
    const isValid = selectedCount >= group.minSelections && 
                   (!group.maxSelections || selectedCount <= group.maxSelections);

    return (
      <div key={group.id} className={`${styles.modifierGroup} ${group.required ? styles.required : ''}`}>
        {/* Group Header */}
        <button
          className={styles.groupHeader}
          onClick={() => handleGroupToggle(group.id)}
          aria-expanded={isExpanded}
        >
          <div className={styles.groupInfo}>
            <h3 className={styles.groupTitle}>
              {group.name}
              {group.required && <span className={styles.requiredIndicator}>*</span>}
            </h3>
            
            <div className={styles.groupMeta}>
              <span className={styles.selectionCount}>
                {selectedCount} selected
                {group.maxSelections && ` / ${group.maxSelections} max`}
              </span>
              
              {!isValid && (
                <span className={styles.validationError}>
                  {selectedCount < group.minSelections 
                    ? `Select at least ${group.minSelections}`
                    : `Select at most ${group.maxSelections}`
                  }
                </span>
              )}
            </div>
          </div>

          <div className={styles.groupActions}>
            {group.modifiers.length > 3 && (
              <span className={styles.modifierCount}>
                {group.modifiers.length} options
              </span>
            )}
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </button>

        {/* Group Content */}
        {isExpanded && (
          <div className={styles.groupContent}>
            {/* Quick Actions */}
            {group.modifiers.length > 5 && (
              <div className={styles.quickActions}>
                <button
                  className={styles.quickAction}
                  onClick={() => handleQuickSelect('popular')}
                >
                  <ThumbsUp size={14} />
                  Popular
                </button>
                <button
                  className={styles.quickAction}
                  onClick={() => handleQuickSelect('recommended')}
                >
                  <Star size={14} />
                  Recommended
                </button>
              </div>
            )}

            {/* Modifiers List */}
            <div className={styles.modifiersList}>
              {group.modifiers.map(modifier => 
                renderModifierItem(modifier, group)
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPriceBreakdown = () => {
    if (!mergedSettings.showPriceBreakdown) return null;

    return (
      <div className={styles.priceBreakdown}>
        <h4>Price Breakdown</h4>
        <div className={styles.priceItems}>
          <div className={styles.priceItem}>
            <span>Base Price</span>
            <span>CHF {totalPrice.base.toFixed(2)}</span>
          </div>
          
          {totalPrice.modifiers > 0 && (
            <div className={styles.priceItem}>
              <span>Modifications</span>
              <span>CHF {totalPrice.modifiers.toFixed(2)}</span>
            </div>
          )}
          
          <div className={styles.priceItem}>
            <span>Subtotal</span>
            <span>CHF {totalPrice.subtotal.toFixed(2)}</span>
          </div>
          
          <div className={styles.priceItem}>
            <span>Tax (7.7%)</span>
            <span>CHF {totalPrice.tax.toFixed(2)}</span>
          </div>
          
          <div className={`${styles.priceItem} ${styles.total}`}>
            <span>Total</span>
            <span>CHF {totalPrice.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (!product?.modifiers || product.modifiers.length === 0) {
    return (
      <div className={`${styles.modifierSelector} ${className}`}>
        <div className={styles.noModifiers}>
          <Info size={32} />
          <p>No customization options available for this product.</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={selectorRef} className={`${styles.modifierSelector} ${className}`}>
      {/* Header */}
      <div className={styles.header}>
        <h2>Customize Your Order</h2>
        
        {/* Search & Filters */}
        {modifierGroups.length > 2 && (
          <div className={styles.searchAndFilters}>
            <div className={styles.searchBox}>
              <Search size={16} />
              <input
                type="text"
                placeholder="Search modifiers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            
            <Suspense fallback={<LoadingSpinner />}>
              <ModifierFilters
                availableFilters={[
                  MODIFIER_CATEGORIES.PREMIUM,
                  MODIFIER_CATEGORIES.SEASONAL,
                  MODIFIER_CATEGORIES.RECOMMENDED
                ]}
                activeFilters={activeFilters}
                onFiltersChange={setActiveFilters}
                translations={translations}
              />
            </Suspense>
          </div>
        )}

        {/* Quick Actions */}
        <div className={styles.quickActions}>
          <button
            className={styles.quickAction}
            onClick={clearAllModifiers}
            disabled={Object.values(selectedModifiers).every(v => !v)}
          >
            <X size={14} />
            Clear All
          </button>
          
          {mergedSettings.enableCustomRequests && (
            <button
              className={styles.quickAction}
              onClick={() => setShowCustomRequest(true)}
            >
              <Edit3 size={14} />
              Special Requests
            </button>
          )}
          
          {enableVoiceCommands && (
            <Suspense fallback={<LoadingSpinner />}>
              <VoiceModifierInput
                onModifierSelect={handleModifierToggle}
                availableModifiers={product.modifiers}
                language={language}
              />
            </Suspense>
          )}
        </div>
      </div>

      {/* Conflict Warnings */}
      {conflicts.length > 0 && (
        <div className={styles.conflictsWarning}>
          <AlertTriangle size={16} />
          <span>Some selections conflict with each other</span>
        </div>
      )}

      {/* Modifier Groups */}
      <div className={styles.modifierGroups}>
        {filteredModifierGroups.map(renderModifierGroup)}
      </div>

      {/* Custom Instructions */}
      <div className={styles.customInstructions}>
        <label htmlFor="customInstructions">Special Instructions</label>
        <textarea
          id="customInstructions"
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          placeholder="Any special requests or modifications..."
          className={styles.customTextarea}
          maxLength={500}
        />
        <span className={styles.charCount}>
          {customInstructions.length}/500
        </span>
      </div>

      {/* Price Summary */}
      <div className={styles.summary}>
        {renderPriceBreakdown()}

        {/* Nutrition Impact Summary */}
        {mergedSettings.showNutritionImpact && Object.keys(nutritionImpact).length > 0 && (
          <Suspense fallback={<LoadingSpinner />}>
            <NutritionImpact
              impact={nutritionImpact}
              language={language}
            />
          </Suspense>
        )}
      </div>

      {/* Recommendations */}
      {showRecommendations && recommendations.length > 0 && (
        <Suspense fallback={<LoadingSpinner />}>
          <ModifierRecommendations
            recommendations={recommendations}
            onRecommendationSelect={(modifierId) => {
              const group = modifierGroups.find(g => 
                g.modifiers.some(m => m.id === modifierId)
              );
              if (group) {
                handleModifierToggle(modifierId, group.id);
              }
            }}
            translations={translations}
          />
        </Suspense>
      )}

      {/* Custom Request Modal */}
      {showCustomRequest && (
        <Suspense fallback={<LoadingSpinner />}>
          <CustomModifierRequest
            isOpen={showCustomRequest}
            onClose={() => setShowCustomRequest(false)}
            onSubmit={(request) => {
              setCustomInstructions(prev => 
                prev ? `${prev}\n${request}` : request
              );
              setShowCustomRequest(false);
            }}
            language={language}
          />
        </Suspense>
      )}
    </div>
  );
};

export default ModifierSelector;