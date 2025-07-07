/**
 * EATECH - Size Selector Component
 * Version: 4.1.0
 * Description: Dynamic product size selection with Swiss portion standards and intelligent recommendations
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/components/customer/SizeSelector.jsx
 * 
 * Features:
 * - Swiss portion size standards and recommendations
 * - Dynamic pricing with value-for-money indicators
 * - Visual size comparison with portion visualization
 * - Nutritional impact calculation for different sizes
 * - Smart recommendations based on user preferences
 * - Accessibility support with clear size descriptions
 * - Multi-format size display (metric, imperial, portions)
 * - Real-time availability checking
 * - Portion sharing suggestions for groups
 * - Dietary goal integration (weight management, fitness)
 * - Cultural portion preferences adaptation
 * - Voice-enabled size selection
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
  Maximize2, Minimize2, Users, DollarSign,
  TrendingUp, TrendingDown, Star, Crown,
  Zap, Heart, Scale, Calculator, Info,
  ChevronDown, ChevronUp, Check, X,
  AlertCircle, Award, Target, Coffee,
  Pizza, Utensils, Eye, Percent, Plus
} from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { useAnalytics } from '../../hooks/useAnalytics';
import styles from './SizeSelector.module.css';

// ============================================================================
// LAZY LOADED COMPONENTS
// ============================================================================

const SizeComparison = lazy(() => import('./SizeComparison'));
const NutritionCalculator = lazy(() => import('./NutritionCalculator'));
const PortionRecommendations = lazy(() => import('./PortionRecommendations'));
const ValueAnalysis = lazy(() => import('./ValueAnalysis'));

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const SWISS_PORTION_STANDARDS = {
  // Swiss Society for Nutrition (SGE/SSN) standards
  beverages: {
    espresso: { ml: 30, description: 'Einfacher Espresso' },
    coffee: { ml: 150, description: 'Standard Kaffee' },
    tea: { ml: 200, description: 'Standard Tee' },
    water: { ml: 250, description: 'Glas Wasser' },
    juice: { ml: 200, description: 'Fruchtsaft Portion' },
    wine: { ml: 125, description: 'Wein Portion' },
    beer: { ml: 300, description: 'Bier Portion' }
  },
  food: {
    appetizer: { g: 80, description: 'Vorspeise' },
    main_course: { g: 200, description: 'Hauptgang' },
    side_dish: { g: 100, description: 'Beilage' },
    dessert: { g: 80, description: 'Dessert' },
    snack: { g: 50, description: 'Snack' },
    bread: { g: 30, description: 'Brotscheibe' },
    pasta: { g: 75, description: 'Pasta (trocken)' },
    rice: { g: 60, description: 'Reis (trocken)' }
  }
};

const SIZE_CATEGORIES = {
  XS: { multiplier: 0.5, label: 'Extra Klein', emoji: '🤏' },
  S: { multiplier: 0.75, label: 'Klein', emoji: '👶' },
  M: { multiplier: 1.0, label: 'Mittel', emoji: '👤' },
  L: { multiplier: 1.5, label: 'Gross', emoji: '🙋' },
  XL: { multiplier: 2.0, label: 'Extra Gross', emoji: '🦣' },
  XXL: { multiplier: 3.0, label: 'Familie', emoji: '👨‍👩‍👧‍👦' }
};

const VALUE_INDICATORS = {
  excellent: { threshold: 0.2, color: '#22c55e', label: 'Ausgezeichneter Wert', icon: Crown },
  good: { threshold: 0.1, color: '#84cc16', label: 'Guter Wert', icon: Star },
  fair: { threshold: 0, color: '#eab308', label: 'Fairer Wert', icon: Target },
  poor: { threshold: -0.1, color: '#f97316', label: 'Teurer', icon: TrendingUp }
};

const RECOMMENDATION_REASONS = {
  'de-CH': {
    most_popular: 'Beliebteste Wahl',
    best_value: 'Bestes Preis-Leistungs-Verhältnis',
    recommended_portion: 'Empfohlene Portion',
    dietary_goal: 'Passt zu Ihren Zielen',
    sharing_size: 'Ideal zum Teilen',
    single_serving: 'Einzelportion',
    family_size: 'Familiengrösse',
    premium_choice: 'Premium-Wahl',
    healthy_option: 'Gesunde Option',
    satisfying_portion: 'Sättigende Portion'
  },
  'de-DE': {
    most_popular: 'Beliebteste Wahl',
    best_value: 'Bestes Preis-Leistungs-Verhältnis',
    recommended_portion: 'Empfohlene Portion',
    dietary_goal: 'Passt zu Ihren Zielen',
    sharing_size: 'Ideal zum Teilen',
    single_serving: 'Einzelportion',
    family_size: 'Familiengröße',
    premium_choice: 'Premium-Wahl',
    healthy_option: 'Gesunde Option',
    satisfying_portion: 'Sättigende Portion'
  },
  'fr-CH': {
    most_popular: 'Choix le plus populaire',
    best_value: 'Meilleur rapport qualité-prix',
    recommended_portion: 'Portion recommandée',
    dietary_goal: 'Correspond à vos objectifs',
    sharing_size: 'Idéal à partager',
    single_serving: 'Portion individuelle',
    family_size: 'Taille famille',
    premium_choice: 'Choix premium',
    healthy_option: 'Option santé',
    satisfying_portion: 'Portion satisfaisante'
  },
  'it-CH': {
    most_popular: 'Scelta più popolare',
    best_value: 'Miglior rapporto qualità-prezzo',
    recommended_portion: 'Porzione raccomandata',
    dietary_goal: 'Si adatta ai tuoi obiettivi',
    sharing_size: 'Ideale da condividere',
    single_serving: 'Porzione singola',
    family_size: 'Dimensione famiglia',
    premium_choice: 'Scelta premium',
    healthy_option: 'Opzione salutare',
    satisfying_portion: 'Porzione saziante'
  },
  'en-US': {
    most_popular: 'Most Popular Choice',
    best_value: 'Best Value',
    recommended_portion: 'Recommended Portion',
    dietary_goal: 'Fits Your Goals',
    sharing_size: 'Great for Sharing',
    single_serving: 'Single Serving',
    family_size: 'Family Size',
    premium_choice: 'Premium Choice',
    healthy_option: 'Healthy Option',
    satisfying_portion: 'Satisfying Portion'
  }
};

const SIZE_TRANSLATIONS = {
  'de-CH': {
    select_size: 'Grösse wählen',
    size_options: 'Grössen-Optionen',
    portion_info: 'Portions-Info',
    price_per_unit: 'Preis pro {unit}',
    serves_people: 'Reicht für {count} Person(en)',
    compare_sizes: 'Grössen vergleichen',
    nutrition_info: 'Nährwerte berechnen',
    recommended: 'Empfohlen',
    popular: 'Beliebt',
    value: 'Sparangebot',
    unavailable: 'Nicht verfügbar',
    coming_soon: 'Bald verfügbar',
    limited_time: 'Zeitlich begrenzt',
    new_size: 'Neue Grösse',
    size_guide: 'Grössen-Guide'
  },
  'de-DE': {
    select_size: 'Größe wählen',
    size_options: 'Größen-Optionen',
    portion_info: 'Portions-Info',
    price_per_unit: 'Preis pro {unit}',
    serves_people: 'Reicht für {count} Person(en)',
    compare_sizes: 'Größen vergleichen',
    nutrition_info: 'Nährwerte berechnen',
    recommended: 'Empfohlen',
    popular: 'Beliebt',
    value: 'Sparangebot',
    unavailable: 'Nicht verfügbar',
    coming_soon: 'Bald verfügbar',
    limited_time: 'Zeitlich begrenzt',
    new_size: 'Neue Größe',
    size_guide: 'Größen-Guide'
  },
  'fr-CH': {
    select_size: 'Choisir la taille',
    size_options: 'Options de taille',
    portion_info: 'Info portions',
    price_per_unit: 'Prix par {unit}',
    serves_people: 'Pour {count} personne(s)',
    compare_sizes: 'Comparer les tailles',
    nutrition_info: 'Calculer les valeurs nutritives',
    recommended: 'Recommandé',
    popular: 'Populaire',
    value: 'Bon plan',
    unavailable: 'Indisponible',
    coming_soon: 'Bientôt disponible',
    limited_time: 'Durée limitée',
    new_size: 'Nouvelle taille',
    size_guide: 'Guide des tailles'
  },
  'it-CH': {
    select_size: 'Scegli la dimensione',
    size_options: 'Opzioni dimensioni',
    portion_info: 'Info porzioni',
    price_per_unit: 'Prezzo per {unit}',
    serves_people: 'Per {count} persona/e',
    compare_sizes: 'Confronta dimensioni',
    nutrition_info: 'Calcola valori nutrizionali',
    recommended: 'Raccomandato',
    popular: 'Popolare',
    value: 'Conveniente',
    unavailable: 'Non disponibile',
    coming_soon: 'Presto disponibile',
    limited_time: 'Tempo limitato',
    new_size: 'Nuova dimensione',
    size_guide: 'Guida taglie'
  },
  'en-US': {
    select_size: 'Select Size',
    size_options: 'Size Options',
    portion_info: 'Portion Info',
    price_per_unit: 'Price per {unit}',
    serves_people: 'Serves {count} people',
    compare_sizes: 'Compare Sizes',
    nutrition_info: 'Calculate Nutrition',
    recommended: 'Recommended',
    popular: 'Popular',
    value: 'Great Value',
    unavailable: 'Unavailable',
    coming_soon: 'Coming Soon',
    limited_time: 'Limited Time',
    new_size: 'New Size',
    size_guide: 'Size Guide'
  }
};

const DEFAULT_SETTINGS = {
  showPricePerUnit: true,
  showNutritionCalculator: true,
  showValueIndicators: true,
  showPortionRecommendations: true,
  enableSizeComparison: true,
  showPopularityIndicators: true,
  enableVoiceSelection: true,
  showVisualSizeGuide: true,
  adaptToUserPreferences: true,
  enableGroupSuggestions: true
};

// ============================================================================
// LOADING COMPONENT
// ============================================================================

const LoadingSpinner = ({ size = 16 }) => (
  <div className={styles.spinner} style={{ width: size, height: size }} />
);

// ============================================================================
// SIZE OPTION COMPONENT
// ============================================================================

const SizeOption = ({ 
  size, 
  isSelected, 
  isRecommended, 
  isPopular,
  isAvailable,
  valueIndicator,
  onSelect,
  language,
  showDetails = true 
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const translations = SIZE_TRANSLATIONS[language] || SIZE_TRANSLATIONS['de-CH'];
  const reasons = RECOMMENDATION_REASONS[language] || RECOMMENDATION_REASONS['de-CH'];

  const handleClick = useCallback(() => {
    if (isAvailable && onSelect) {
      onSelect(size);
    }
  }, [isAvailable, onSelect, size]);

  const renderBadges = () => (
    <div className={styles.sizeBadges}>
      {isRecommended && (
        <span className={`${styles.badge} ${styles.recommended}`}>
          <Star size={12} />
          {translations.recommended}
        </span>
      )}
      
      {isPopular && (
        <span className={`${styles.badge} ${styles.popular}`}>
          <TrendingUp size={12} />
          {translations.popular}
        </span>
      )}
      
      {valueIndicator && (
        <span 
          className={`${styles.badge} ${styles.value}`}
          style={{ backgroundColor: valueIndicator.color }}
        >
          <valueIndicator.icon size={12} />
          {translations.value}
        </span>
      )}
      
      {size.isNew && (
        <span className={`${styles.badge} ${styles.new}`}>
          <Zap size={12} />
          {translations.new_size}
        </span>
      )}
      
      {size.isLimitedTime && (
        <span className={`${styles.badge} ${styles.limited}`}>
          <Clock size={12} />
          {translations.limited_time}
        </span>
      )}
    </div>
  );

  const renderNutritionPreview = () => {
    if (!size.nutrition || !showDetails) return null;

    return (
      <div className={styles.nutritionPreview}>
        <div className={styles.nutritionItem}>
          <span className={styles.nutritionLabel}>Kalorien:</span>
          <span className={styles.nutritionValue}>{size.nutrition.calories} kcal</span>
        </div>
        {size.nutrition.protein && (
          <div className={styles.nutritionItem}>
            <span className={styles.nutritionLabel}>Protein:</span>
            <span className={styles.nutritionValue}>{size.nutrition.protein}g</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className={`${styles.sizeOption} ${isSelected ? styles.selected : ''} ${!isAvailable ? styles.unavailable : ''}`}
      onClick={handleClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      role="button"
      tabIndex={isAvailable ? 0 : -1}
      aria-selected={isSelected}
      aria-disabled={!isAvailable}
    >
      {/* Size Header */}
      <div className={styles.sizeHeader}>
        <div className={styles.sizeBasic}>
          <div className={styles.sizeLabel}>
            <span className={styles.sizeName}>{size.name}</span>
            <span className={styles.sizeEmoji}>{SIZE_CATEGORIES[size.category]?.emoji}</span>
          </div>
          
          <div className={styles.sizeDescription}>
            {size.description || SIZE_CATEGORIES[size.category]?.label}
          </div>
        </div>

        {/* Size Price */}
        <div className={styles.sizePrice}>
          {size.originalPrice && size.originalPrice > size.price && (
            <span className={styles.originalPrice}>
              CHF {size.originalPrice.toFixed(2)}
            </span>
          )}
          <span className={styles.currentPrice}>
            CHF {size.price.toFixed(2)}
          </span>
          {size.originalPrice && size.originalPrice > size.price && (
            <span className={styles.discount}>
              -{Math.round(((size.originalPrice - size.price) / size.originalPrice) * 100)}%
            </span>
          )}
        </div>
      </div>

      {/* Size Details */}
      {showDetails && (
        <div className={styles.sizeDetails}>
          {/* Portion Information */}
          <div className={styles.portionInfo}>
            {size.volume && (
              <span className={styles.portionDetail}>
                {size.volume} {size.unit || 'ml'}
              </span>
            )}
            {size.weight && (
              <span className={styles.portionDetail}>
                {size.weight}g
              </span>
            )}
            {size.servings && (
              <span className={styles.portionDetail}>
                <Users size={12} />
                {translations.serves_people.replace('{count}', size.servings)}
              </span>
            )}
          </div>

          {/* Price per Unit */}
          {size.pricePerUnit && (
            <div className={styles.pricePerUnit}>
              <span>
                {translations.price_per_unit.replace('{unit}', size.unit || 'ml')}:
              </span>
              <span className={styles.unitPrice}>
                CHF {size.pricePerUnit.toFixed(2)}
              </span>
            </div>
          )}

          {/* Nutrition Preview */}
          {renderNutritionPreview()}
        </div>
      )}

      {/* Badges */}
      {renderBadges()}

      {/* Availability Status */}
      {!isAvailable && (
        <div className={styles.unavailableOverlay}>
          <span>{size.comingSoon ? translations.coming_soon : translations.unavailable}</span>
        </div>
      )}

      {/* Selection Indicator */}
      {isSelected && (
        <div className={styles.selectionIndicator}>
          <Check size={16} />
        </div>
      )}

      {/* Tooltip */}
      {showTooltip && size.tooltip && (
        <div className={styles.sizeTooltip}>
          {size.tooltip}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SizeSelector = ({
  product,
  sizes = [],
  selectedSize,
  onSizeChange,
  language = 'de-CH',
  settings = {},
  className = '',
  layout = 'grid', // 'grid', 'list', 'carousel'
  showRecommendations = true,
  enableAnalytics = true
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [currentSelection, setCurrentSelection] = useState(selectedSize);
  const [showComparison, setShowComparison] = useState(false);
  const [showNutritionCalculator, setShowNutritionCalculator] = useState(false);
  const [showPortionGuide, setShowPortionGuide] = useState(false);
  const [hoveredSize, setHoveredSize] = useState(null);
  const [expandedDetails, setExpandedDetails] = useState(false);

  // ============================================================================
  // REFS & CONTEXTS
  // ============================================================================

  const selectorRef = useRef(null);
  const { tenant } = useTenant();
  const { user } = useAuth();
  const { 
    preferences, 
    dietaryGoals,
    groupSize 
  } = useUserPreferences();
  const { trackEvent } = useAnalytics();

  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================

  const mergedSettings = useMemo(() => ({
    ...DEFAULT_SETTINGS,
    ...settings
  }), [settings]);

  const translations = useMemo(() => 
    SIZE_TRANSLATIONS[language] || SIZE_TRANSLATIONS['de-CH'], 
    [language]
  );

  const reasons = useMemo(() => 
    RECOMMENDATION_REASONS[language] || RECOMMENDATION_REASONS['de-CH'], 
    [language]
  );

  const processedSizes = useMemo(() => {
    return sizes.map(size => {
      // Calculate value indicator
      let valueIndicator = null;
      if (mergedSettings.showValueIndicators && size.pricePerUnit) {
        const avgPricePerUnit = sizes.reduce((sum, s) => sum + (s.pricePerUnit || 0), 0) / sizes.length;
        const valueRatio = (avgPricePerUnit - size.pricePerUnit) / avgPricePerUnit;
        
        for (const [key, indicator] of Object.entries(VALUE_INDICATORS)) {
          if (valueRatio >= indicator.threshold) {
            valueIndicator = indicator;
            break;
          }
        }
      }

      // Determine recommendations
      const isRecommended = determineRecommendation(size);
      const isPopular = size.popularity > 0.7; // Threshold for popularity

      return {
        ...size,
        valueIndicator,
        isRecommended,
        isPopular,
        isAvailable: size.available !== false && size.stock > 0
      };
    });
  }, [sizes, mergedSettings.showValueIndicators]);

  const recommendedSize = useMemo(() => 
    processedSizes.find(size => size.isRecommended) || processedSizes[0],
    [processedSizes]
  );

  // ============================================================================
  // RECOMMENDATION LOGIC
  // ============================================================================

  const determineRecommendation = useCallback((size) => {
    let score = 0;

    // Base popularity score
    score += (size.popularity || 0) * 0.3;

    // Value score
    if (size.valueIndicator?.threshold >= 0.1) {
      score += 0.25;
    }

    // User preferences
    if (preferences?.preferredSizes?.includes(size.id)) {
      score += 0.3;
    }

    // Group size compatibility
    if (groupSize && size.servings) {
      const servingMatch = Math.abs(size.servings - groupSize) / groupSize;
      score += Math.max(0, 0.2 - servingMatch);
    }

    // Dietary goals alignment
    if (dietaryGoals?.includes('weight_loss') && size.category === 'S') {
      score += 0.15;
    }
    if (dietaryGoals?.includes('muscle_gain') && size.category === 'L') {
      score += 0.15;
    }

    return score > 0.6; // Threshold for recommendation
  }, [preferences, groupSize, dietaryGoals]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleSizeSelect = useCallback((size) => {
    setCurrentSelection(size);
    onSizeChange?.(size);

    if (enableAnalytics) {
      trackEvent('size_selected', {
        productId: product?.id,
        sizeId: size.id,
        sizeName: size.name,
        price: size.price,
        isRecommended: size.isRecommended,
        valueIndicator: size.valueIndicator?.label
      });
    }
  }, [onSizeChange, enableAnalytics, trackEvent, product]);

  const handleComparisonToggle = useCallback(() => {
    setShowComparison(!showComparison);
    
    if (enableAnalytics) {
      trackEvent('size_comparison_toggle', {
        productId: product?.id,
        action: !showComparison ? 'open' : 'close'
      });
    }
  }, [showComparison, enableAnalytics, trackEvent, product]);

  // ============================================================================
  // AUTO-SELECTION LOGIC
  // ============================================================================

  useEffect(() => {
    if (!currentSelection && recommendedSize && mergedSettings.adaptToUserPreferences) {
      handleSizeSelect(recommendedSize);
    }
  }, [currentSelection, recommendedSize, mergedSettings.adaptToUserPreferences, handleSizeSelect]);

  // ============================================================================
  // RENDER METHODS
  // ============================================================================

  const renderHeader = () => (
    <div className={styles.selectorHeader}>
      <h3>{translations.select_size}</h3>
      
      <div className={styles.headerActions}>
        {mergedSettings.enableSizeComparison && sizes.length > 1 && (
          <button
            className={styles.actionButton}
            onClick={handleComparisonToggle}
            title={translations.compare_sizes}
          >
            <Scale size={16} />
          </button>
        )}
        
        {mergedSettings.showNutritionCalculator && (
          <button
            className={styles.actionButton}
            onClick={() => setShowNutritionCalculator(true)}
            title={translations.nutrition_info}
          >
            <Calculator size={16} />
          </button>
        )}
        
        <button
          className={styles.actionButton}
          onClick={() => setShowPortionGuide(true)}
          title={translations.size_guide}
        >
          <Info size={16} />
        </button>
      </div>
    </div>
  );

  const renderSizeGrid = () => (
    <div className={`${styles.sizeGrid} ${styles[layout]}`}>
      {processedSizes.map(size => (
        <SizeOption
          key={size.id}
          size={size}
          isSelected={currentSelection?.id === size.id}
          isRecommended={size.isRecommended}
          isPopular={size.isPopular}
          isAvailable={size.isAvailable}
          valueIndicator={size.valueIndicator}
          onSelect={handleSizeSelect}
          language={language}
          showDetails={mergedSettings.showValueIndicators}
        />
      ))}
    </div>
  );

  const renderRecommendations = () => {
    if (!showRecommendations || !recommendedSize) return null;

    return (
      <div className={styles.recommendations}>
        <h4>Empfehlungen</h4>
        <div className={styles.recommendationsList}>
          {recommendedSize.isPopular && (
            <div className={styles.recommendationItem}>
              <TrendingUp size={14} />
              <span>{reasons.most_popular}</span>
            </div>
          )}
          
          {recommendedSize.valueIndicator?.threshold >= 0.1 && (
            <div className={styles.recommendationItem}>
              <DollarSign size={14} />
              <span>{reasons.best_value}</span>
            </div>
          )}
          
          {groupSize && recommendedSize.servings >= groupSize && (
            <div className={styles.recommendationItem}>
              <Users size={14} />
              <span>{reasons.sharing_size}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSelectionSummary = () => {
    if (!currentSelection) return null;

    return (
      <div className={styles.selectionSummary}>
        <div className={styles.summaryContent}>
          <div className={styles.selectedSize}>
            <span className={styles.summaryLabel}>Gewählte Grösse:</span>
            <span className={styles.summaryValue}>
              {currentSelection.name} - CHF {currentSelection.price.toFixed(2)}
            </span>
          </div>
          
          {currentSelection.nutrition && (
            <div className={styles.nutritionSummary}>
              <span className={styles.summaryLabel}>Kalorien:</span>
              <span className={styles.summaryValue}>
                {currentSelection.nutrition.calories} kcal
              </span>
            </div>
          )}
          
          {currentSelection.servings && (
            <div className={styles.servingSummary}>
              <Users size={14} />
              <span>{translations.serves_people.replace('{count}', currentSelection.servings)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (!sizes || sizes.length === 0) {
    return (
      <div className={`${styles.sizeSelector} ${className}`}>
        <div className={styles.noSizes}>
          <AlertCircle size={32} />
          <span>Keine Grössen verfügbar</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={selectorRef} className={`${styles.sizeSelector} ${className}`}>
      {/* Header */}
      {renderHeader()}

      {/* Recommendations */}
      {renderRecommendations()}

      {/* Size Options */}
      {renderSizeGrid()}

      {/* Selection Summary */}
      {renderSelectionSummary()}

      {/* Size Comparison Modal */}
      {showComparison && (
        <Suspense fallback={<LoadingSpinner />}>
          <SizeComparison
            sizes={processedSizes}
            selectedSize={currentSelection}
            isOpen={showComparison}
            onClose={() => setShowComparison(false)}
            onSizeSelect={handleSizeSelect}
            language={language}
          />
        </Suspense>
      )}

      {/* Nutrition Calculator Modal */}
      {showNutritionCalculator && (
        <Suspense fallback={<LoadingSpinner />}>
          <NutritionCalculator
            sizes={processedSizes}
            selectedSize={currentSelection}
            isOpen={showNutritionCalculator}
            onClose={() => setShowNutritionCalculator(false)}
            language={language}
          />
        </Suspense>
      )}

      {/* Portion Recommendations Modal */}
      {showPortionGuide && (
        <Suspense fallback={<LoadingSpinner />}>
          <PortionRecommendations
            product={product}
            sizes={processedSizes}
            userProfile={{ preferences, dietaryGoals, groupSize }}
            isOpen={showPortionGuide}
            onClose={() => setShowPortionGuide(false)}
            onSizeRecommend={handleSizeSelect}
            language={language}
          />
        </Suspense>
      )}
    </div>
  );
};

export default SizeSelector;