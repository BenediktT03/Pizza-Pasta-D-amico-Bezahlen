/**
 * EATECH - Nutrition Panel Component
 * Version: 4.1.0
 * Description: Comprehensive nutrition information display with dietary recommendations
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/components/customer/NutritionPanel.jsx
 * 
 * Features:
 * - Detailed nutrition facts display
 * - Visual nutrition charts and graphs
 * - Dietary restriction indicators
 * - Allergen information and warnings
 * - Calorie breakdown by macronutrients
 * - Daily value percentages (Swiss standards)
 * - Ingredient analysis and sourcing
 * - Nutrition comparison with similar products
 * - Personalized dietary recommendations
 * - Multi-language support for nutrition labels
 * - Interactive nutrient exploration
 * - Health goal tracking integration
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo,
  lazy,
  Suspense
} from 'react';
import { 
  Activity, Heart, Zap, Shield, AlertTriangle,
  Droplets, Wheat, Leaf, Apple, Fish,
  Target, TrendingUp, TrendingDown, Minus,
  Info, ChevronDown, ChevronUp, Eye,
  Clock, Scale, Calculator, BookOpen,
  Star, Award, CheckCircle, XCircle,
  BarChart3, PieChart, LineChart, TrendingRight
} from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import styles from './NutritionPanel.module.css';

// ============================================================================
// LAZY LOADED COMPONENTS
// ============================================================================

// Chart Components
const NutritionChart = lazy(() => import('./charts/NutritionChart'));
const CalorieBreakdown = lazy(() => import('./charts/CalorieBreakdown'));
const DailyValueChart = lazy(() => import('./charts/DailyValueChart'));
const MacronutrientChart = lazy(() => import('./charts/MacronutrientChart'));

// Analysis Components
const AllergenAnalysis = lazy(() => import('./AllergenAnalysis'));
const IngredientAnalysis = lazy(() => import('./IngredientAnalysis'));
const NutritionComparison = lazy(() => import('./NutritionComparison'));
const HealthImpactAnalysis = lazy(() => import('./HealthImpactAnalysis'));

// Interactive Components
const NutrientExplorer = lazy(() => import('./NutrientExplorer'));
const DietaryGoalTracker = lazy(() => import('./DietaryGoalTracker'));
const PersonalizedRecommendations = lazy(() => import('./PersonalizedRecommendations'));

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const NUTRITION_DISPLAY_MODES = {
  COMPACT: 'compact',
  DETAILED: 'detailed',
  COMPARATIVE: 'comparative',
  VISUAL: 'visual'
};

const DIETARY_LABELS = {
  'de-CH': {
    vegetarian: 'Vegetarisch',
    vegan: 'Vegan',
    glutenfree: 'Glutenfrei',
    lactosefree: 'Laktosefrei',
    organic: 'Bio',
    local: 'Regional',
    lowcarb: 'Low-Carb',
    highprotein: 'Proteinreich',
    lowfat: 'Fettarm',
    sugar_free: 'Zuckerfrei',
    halal: 'Halal',
    kosher: 'Koscher',
    raw: 'Roh',
    keto: 'Keto'
  },
  'de-DE': {
    vegetarian: 'Vegetarisch',
    vegan: 'Vegan',
    glutenfree: 'Glutenfrei',
    lactosefree: 'Laktosefrei',
    organic: 'Bio',
    local: 'Regional',
    lowcarb: 'Kohlenhydratarm',
    highprotein: 'Eiweißreich',
    lowfat: 'Fettarm',
    sugar_free: 'Zuckerfrei',
    halal: 'Halal',
    kosher: 'Koscher',
    raw: 'Roh',
    keto: 'Ketogen'
  },
  'fr-CH': {
    vegetarian: 'Végétarien',
    vegan: 'Végan',
    glutenfree: 'Sans gluten',
    lactosefree: 'Sans lactose',
    organic: 'Bio',
    local: 'Régional',
    lowcarb: 'Pauvre en glucides',
    highprotein: 'Riche en protéines',
    lowfat: 'Pauvre en graisses',
    sugar_free: 'Sans sucre',
    halal: 'Halal',
    kosher: 'Casher',
    raw: 'Cru',
    keto: 'Cétogène'
  },
  'it-CH': {
    vegetarian: 'Vegetariano',
    vegan: 'Vegano',
    glutenfree: 'Senza glutine',
    lactosefree: 'Senza lattosio',
    organic: 'Biologico',
    local: 'Regionale',
    lowcarb: 'Povero di carboidrati',
    highprotein: 'Rico di proteine',
    lowfat: 'Povero di grassi',
    sugar_free: 'Senza zucchero',
    halal: 'Halal',
    kosher: 'Kosher',
    raw: 'Crudo',
    keto: 'Cheto'
  },
  'en-US': {
    vegetarian: 'Vegetarian',
    vegan: 'Vegan',
    glutenfree: 'Gluten-Free',
    lactosefree: 'Lactose-Free',
    organic: 'Organic',
    local: 'Local',
    lowcarb: 'Low-Carb',
    highprotein: 'High-Protein',
    lowfat: 'Low-Fat',
    sugar_free: 'Sugar-Free',
    halal: 'Halal',
    kosher: 'Kosher',
    raw: 'Raw',
    keto: 'Keto'
  }
};

const ALLERGEN_TYPES = {
  gluten: { icon: Wheat, severity: 'high', color: '#ff6b6b' },
  dairy: { icon: Droplets, severity: 'high', color: '#4ecdc4' },
  nuts: { icon: Apple, severity: 'critical', color: '#ff8c42' },
  shellfish: { icon: Fish, severity: 'critical', color: '#6c5ce7' },
  eggs: { icon: Target, severity: 'medium', color: '#fdcb6e' },
  soy: { icon: Leaf, severity: 'medium', color: '#00b894' },
  fish: { icon: Fish, severity: 'high', color: '#0984e3' },
  sesame: { icon: Target, severity: 'medium', color: '#a29bfe' }
};

const SWISS_DAILY_VALUES = {
  // Swiss Federal Food Safety Standards (OSAV/BLV)
  calories: 2000,
  fat: 70,           // g
  saturatedFat: 20,  // g
  cholesterol: 300,  // mg
  sodium: 2300,      // mg
  carbs: 260,        // g
  fiber: 25,         // g
  sugar: 50,         // g
  protein: 50,       // g
  vitaminA: 900,     // µg
  vitaminC: 90,      // mg
  calcium: 1000,     // mg
  iron: 14           // mg
};

const HEALTH_SCORES = {
  EXCELLENT: { score: 90, color: '#00b894', text: 'Ausgezeichnet' },
  GOOD: { score: 70, color: '#00cec9', text: 'Gut' },
  FAIR: { score: 50, color: '#fdcb6e', text: 'Mäßig' },
  POOR: { score: 30, color: '#e17055', text: 'Schlecht' },
  VERY_POOR: { score: 0, color: '#d63031', text: 'Sehr schlecht' }
};

// ============================================================================
// LOADING COMPONENT
// ============================================================================

const LoadingSpinner = ({ size = 24, message }) => (
  <div className={styles.loadingContainer}>
    <div className={styles.spinner} style={{ width: size, height: size }} />
    {message && <span className={styles.loadingMessage}>{message}</span>}
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const NutritionPanel = ({
  product,
  servingSize = 100,
  displayMode = NUTRITION_DISPLAY_MODES.DETAILED,
  showComparison = false,
  showPersonalization = true,
  enableInteractivity = true,
  language = 'de-CH',
  className = '',
  onNutrientClick,
  onAllergenAlert,
  onDietaryMatch
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [currentMode, setCurrentMode] = useState(displayMode);
  const [selectedNutrient, setSelectedNutrient] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    macros: true,
    vitamins: false,
    minerals: false,
    allergens: true,
    ingredients: false
  });
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);
  const [comparisonProducts, setComparisonProducts] = useState([]);
  const [healthScore, setHealthScore] = useState(null);
  const [personalizedInsights, setPersonalizedInsights] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  // ============================================================================
  // CONTEXTS & HOOKS
  // ============================================================================

  const { tenant } = useTenant();
  const { user } = useAuth();
  const { 
    preferences: userPreferences, 
    dietaryRestrictions,
    healthGoals,
    allergenAlerts 
  } = useUserPreferences();

  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================

  const nutritionData = useMemo(() => {
    if (!product?.nutrition) return null;

    const nutrition = product.nutrition;
    const scaleFactor = servingSize / (nutrition.servingSize || 100);

    return {
      servingSize,
      calories: Math.round((nutrition.calories || 0) * scaleFactor),
      macronutrients: {
        protein: Math.round((nutrition.protein || 0) * scaleFactor * 10) / 10,
        carbs: Math.round((nutrition.carbohydrates || 0) * scaleFactor * 10) / 10,
        fat: Math.round((nutrition.fat || 0) * scaleFactor * 10) / 10,
        fiber: Math.round((nutrition.fiber || 0) * scaleFactor * 10) / 10,
        sugar: Math.round((nutrition.sugar || 0) * scaleFactor * 10) / 10,
        saturatedFat: Math.round((nutrition.saturatedFat || 0) * scaleFactor * 10) / 10,
        transFat: Math.round((nutrition.transFat || 0) * scaleFactor * 10) / 10
      },
      micronutrients: {
        vitaminA: Math.round((nutrition.vitaminA || 0) * scaleFactor),
        vitaminC: Math.round((nutrition.vitaminC || 0) * scaleFactor),
        vitaminD: Math.round((nutrition.vitaminD || 0) * scaleFactor),
        vitaminE: Math.round((nutrition.vitaminE || 0) * scaleFactor),
        calcium: Math.round((nutrition.calcium || 0) * scaleFactor),
        iron: Math.round((nutrition.iron || 0) * scaleFactor * 10) / 10,
        potassium: Math.round((nutrition.potassium || 0) * scaleFactor),
        sodium: Math.round((nutrition.sodium || 0) * scaleFactor)
      },
      allergens: nutrition.allergens || [],
      ingredients: nutrition.ingredients || [],
      additives: nutrition.additives || [],
      certifications: nutrition.certifications || []
    };
  }, [product, servingSize]);

  const dailyValuePercentages = useMemo(() => {
    if (!nutritionData) return {};

    return {
      calories: Math.round((nutritionData.calories / SWISS_DAILY_VALUES.calories) * 100),
      fat: Math.round((nutritionData.macronutrients.fat / SWISS_DAILY_VALUES.fat) * 100),
      saturatedFat: Math.round((nutritionData.macronutrients.saturatedFat / SWISS_DAILY_VALUES.saturatedFat) * 100),
      sodium: Math.round((nutritionData.micronutrients.sodium / SWISS_DAILY_VALUES.sodium) * 100),
      carbs: Math.round((nutritionData.macronutrients.carbs / SWISS_DAILY_VALUES.carbs) * 100),
      fiber: Math.round((nutritionData.macronutrients.fiber / SWISS_DAILY_VALUES.fiber) * 100),
      sugar: Math.round((nutritionData.macronutrients.sugar / SWISS_DAILY_VALUES.sugar) * 100),
      protein: Math.round((nutritionData.macronutrients.protein / SWISS_DAILY_VALUES.protein) * 100),
      vitaminA: Math.round((nutritionData.micronutrients.vitaminA / SWISS_DAILY_VALUES.vitaminA) * 100),
      vitaminC: Math.round((nutritionData.micronutrients.vitaminC / SWISS_DAILY_VALUES.vitaminC) * 100),
      calcium: Math.round((nutritionData.micronutrients.calcium / SWISS_DAILY_VALUES.calcium) * 100),
      iron: Math.round((nutritionData.micronutrients.iron / SWISS_DAILY_VALUES.iron) * 100)
    };
  }, [nutritionData]);

  const calorieBreakdown = useMemo(() => {
    if (!nutritionData) return null;

    const proteinCals = nutritionData.macronutrients.protein * 4;
    const carbCals = nutritionData.macronutrients.carbs * 4;
    const fatCals = nutritionData.macronutrients.fat * 9;
    const totalCals = proteinCals + carbCals + fatCals;

    return {
      protein: { 
        calories: proteinCals, 
        percentage: Math.round((proteinCals / totalCals) * 100) 
      },
      carbs: { 
        calories: carbCals, 
        percentage: Math.round((carbCals / totalCals) * 100) 
      },
      fat: { 
        calories: fatCals, 
        percentage: Math.round((fatCals / totalCals) * 100) 
      }
    };
  }, [nutritionData]);

  const dietaryLabels = useMemo(() => 
    DIETARY_LABELS[language] || DIETARY_LABELS['de-CH'], 
    [language]
  );

  const allergenWarnings = useMemo(() => {
    if (!nutritionData?.allergens || !allergenAlerts) return [];

    return nutritionData.allergens.filter(allergen => 
      allergenAlerts.includes(allergen)
    );
  }, [nutritionData?.allergens, allergenAlerts]);

  // ============================================================================
  // HEALTH SCORE CALCULATION
  // ============================================================================

  const calculateHealthScore = useCallback(() => {
    if (!nutritionData) return null;

    let score = 100;
    const nutrition = nutritionData;

    // Penalize high calories (more than 500 per 100g)
    if (nutrition.calories > 500) {
      score -= Math.min(30, (nutrition.calories - 500) / 10);
    }

    // Penalize high saturated fat (more than 5g per 100g)
    if (nutrition.macronutrients.saturatedFat > 5) {
      score -= Math.min(20, (nutrition.macronutrients.saturatedFat - 5) * 2);
    }

    // Penalize high sugar (more than 15g per 100g)
    if (nutrition.macronutrients.sugar > 15) {
      score -= Math.min(25, (nutrition.macronutrients.sugar - 15) * 1.5);
    }

    // Penalize high sodium (more than 600mg per 100g)
    if (nutrition.micronutrients.sodium > 600) {
      score -= Math.min(15, (nutrition.micronutrients.sodium - 600) / 40);
    }

    // Bonus for high fiber (more than 3g per 100g)
    if (nutrition.macronutrients.fiber > 3) {
      score += Math.min(10, (nutrition.macronutrients.fiber - 3) * 2);
    }

    // Bonus for high protein (more than 10g per 100g)
    if (nutrition.macronutrients.protein > 10) {
      score += Math.min(10, (nutrition.macronutrients.protein - 10) * 0.5);
    }

    // Bonus for vitamins and minerals
    const vitaminScore = Object.values(dailyValuePercentages).reduce((sum, dv) => {
      if (dv >= 10) sum += 2;
      if (dv >= 25) sum += 3;
      return sum;
    }, 0);
    score += Math.min(15, vitaminScore);

    return Math.max(0, Math.min(100, Math.round(score)));
  }, [nutritionData, dailyValuePercentages]);

  const getHealthScoreData = useCallback((score) => {
    if (score >= 90) return HEALTH_SCORES.EXCELLENT;
    if (score >= 70) return HEALTH_SCORES.GOOD;
    if (score >= 50) return HEALTH_SCORES.FAIR;
    if (score >= 30) return HEALTH_SCORES.POOR;
    return HEALTH_SCORES.VERY_POOR;
  }, []);

  // ============================================================================
  // EFFECT HOOKS
  // ============================================================================

  useEffect(() => {
    if (nutritionData) {
      const score = calculateHealthScore();
      setHealthScore(score);
    }
  }, [nutritionData, calculateHealthScore]);

  useEffect(() => {
    if (allergenWarnings.length > 0) {
      onAllergenAlert?.(allergenWarnings, product);
    }
  }, [allergenWarnings, product, onAllergenAlert]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  const handleNutrientClick = useCallback((nutrient, value, dailyValue) => {
    setSelectedNutrient({ nutrient, value, dailyValue });
    onNutrientClick?.(nutrient, value, dailyValue);
  }, [onNutrientClick]);

  const handleModeChange = useCallback((mode) => {
    setCurrentMode(mode);
  }, []);

  // ============================================================================
  // RENDER METHODS
  // ============================================================================

  const renderNutritionOverview = () => (
    <div className={styles.nutritionOverview}>
      {/* Calories Display */}
      <div className={styles.caloriesSection}>
        <div className={styles.caloriesMain}>
          <span className={styles.caloriesNumber}>{nutritionData.calories}</span>
          <span className={styles.caloriesLabel}>Kalorien</span>
          <span className={styles.servingSize}>pro {servingSize}g</span>
        </div>
        
        {healthScore !== null && (
          <div className={styles.healthScore}>
            <div 
              className={styles.healthScoreCircle}
              style={{ 
                background: `conic-gradient(${getHealthScoreData(healthScore).color} ${healthScore * 3.6}deg, #e9ecef 0deg)` 
              }}
            >
              <span className={styles.healthScoreValue}>{healthScore}</span>
            </div>
            <span className={styles.healthScoreLabel}>
              {getHealthScoreData(healthScore).text}
            </span>
          </div>
        )}
      </div>

      {/* Daily Value Bar */}
      <div className={styles.dailyValueBar}>
        <div className={styles.dailyValueLabel}>
          {dailyValuePercentages.calories}% des Tagesbedarfs
        </div>
        <div className={styles.dailyValueProgress}>
          <div 
            className={styles.dailyValueFill}
            style={{ width: `${Math.min(100, dailyValuePercentages.calories)}%` }}
          />
        </div>
      </div>
    </div>
  );

  const renderMacronutrients = () => (
    <div className={styles.macronutrientsSection}>
      <button
        className={styles.sectionHeader}
        onClick={() => toggleSection('macros')}
        aria-expanded={expandedSections.macros}
      >
        <h3>Makronährstoffe</h3>
        {expandedSections.macros ? <ChevronUp /> : <ChevronDown />}
      </button>

      {expandedSections.macros && (
        <div className={styles.sectionContent}>
          {/* Visual Breakdown */}
          {calorieBreakdown && (
            <div className={styles.calorieBreakdown}>
              <Suspense fallback={<LoadingSpinner />}>
                <CalorieBreakdown data={calorieBreakdown} />
              </Suspense>
            </div>
          )}

          {/* Detailed Values */}
          <div className={styles.nutrientGrid}>
            {Object.entries(nutritionData.macronutrients).map(([key, value]) => (
              <div 
                key={key}
                className={styles.nutrientItem}
                onClick={() => handleNutrientClick(key, value, dailyValuePercentages[key])}
              >
                <div className={styles.nutrientInfo}>
                  <span className={styles.nutrientName}>
                    {key === 'protein' && 'Protein'}
                    {key === 'carbs' && 'Kohlenhydrate'}
                    {key === 'fat' && 'Fett'}
                    {key === 'fiber' && 'Ballaststoffe'}
                    {key === 'sugar' && 'Zucker'}
                    {key === 'saturatedFat' && 'Gesättigte Fette'}
                    {key === 'transFat' && 'Transfette'}
                  </span>
                  <span className={styles.nutrientValue}>
                    {value}g
                  </span>
                </div>
                
                {dailyValuePercentages[key] && (
                  <div className={styles.dailyValueInfo}>
                    <span className={styles.dailyValuePercent}>
                      {dailyValuePercentages[key]}%
                    </span>
                    <div className={styles.dailyValueMiniBar}>
                      <div 
                        className={styles.dailyValueMiniFill}
                        style={{ width: `${Math.min(100, dailyValuePercentages[key])}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderMicronutrients = () => (
    <div className={styles.micronutrientsSection}>
      <button
        className={styles.sectionHeader}
        onClick={() => toggleSection('vitamins')}
        aria-expanded={expandedSections.vitamins}
      >
        <h3>Vitamine & Mineralstoffe</h3>
        {expandedSections.vitamins ? <ChevronUp /> : <ChevronDown />}
      </button>

      {expandedSections.vitamins && (
        <div className={styles.sectionContent}>
          <div className={styles.nutrientGrid}>
            {Object.entries(nutritionData.micronutrients).map(([key, value]) => {
              if (value === 0) return null;
              
              return (
                <div 
                  key={key}
                  className={styles.nutrientItem}
                  onClick={() => handleNutrientClick(key, value, dailyValuePercentages[key])}
                >
                  <div className={styles.nutrientInfo}>
                    <span className={styles.nutrientName}>
                      {key === 'vitaminA' && 'Vitamin A'}
                      {key === 'vitaminC' && 'Vitamin C'}
                      {key === 'vitaminD' && 'Vitamin D'}
                      {key === 'vitaminE' && 'Vitamin E'}
                      {key === 'calcium' && 'Calcium'}
                      {key === 'iron' && 'Eisen'}
                      {key === 'potassium' && 'Kalium'}
                      {key === 'sodium' && 'Natrium'}
                    </span>
                    <span className={styles.nutrientValue}>
                      {value}
                      {['vitaminA', 'vitaminD'].includes(key) && 'µg'}
                      {['vitaminC', 'vitaminE'].includes(key) && 'mg'}
                      {['calcium', 'potassium', 'sodium'].includes(key) && 'mg'}
                      {key === 'iron' && 'mg'}
                    </span>
                  </div>
                  
                  {dailyValuePercentages[key] && (
                    <div className={styles.dailyValueInfo}>
                      <span className={styles.dailyValuePercent}>
                        {dailyValuePercentages[key]}%
                      </span>
                      <div className={styles.dailyValueMiniBar}>
                        <div 
                          className={`${styles.dailyValueMiniFill} ${
                            dailyValuePercentages[key] >= 25 ? styles.high : 
                            dailyValuePercentages[key] >= 10 ? styles.medium : styles.low
                          }`}
                          style={{ width: `${Math.min(100, dailyValuePercentages[key])}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderAllergens = () => (
    <div className={styles.allergensSection}>
      <button
        className={styles.sectionHeader}
        onClick={() => toggleSection('allergens')}
        aria-expanded={expandedSections.allergens}
      >
        <h3>Allergene & Warnungen</h3>
        {allergenWarnings.length > 0 && (
          <AlertTriangle className={styles.warningIcon} />
        )}
        {expandedSections.allergens ? <ChevronUp /> : <ChevronDown />}
      </button>

      {expandedSections.allergens && (
        <div className={styles.sectionContent}>
          {nutritionData.allergens.length > 0 ? (
            <div className={styles.allergenList}>
              {nutritionData.allergens.map(allergen => {
                const allergenInfo = ALLERGEN_TYPES[allergen];
                const isWarning = allergenWarnings.includes(allergen);
                const IconComponent = allergenInfo?.icon || AlertTriangle;

                return (
                  <div 
                    key={allergen}
                    className={`${styles.allergenItem} ${isWarning ? styles.warning : ''}`}
                    style={{ 
                      borderColor: isWarning ? allergenInfo?.color : undefined 
                    }}
                  >
                    <IconComponent 
                      size={20} 
                      style={{ color: allergenInfo?.color }}
                    />
                    <span className={styles.allergenName}>
                      {allergen.charAt(0).toUpperCase() + allergen.slice(1)}
                    </span>
                    {isWarning && (
                      <AlertTriangle className={styles.allergenWarning} />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.noAllergens}>
              <CheckCircle className={styles.checkIcon} />
              <span>Keine bekannten Allergene</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderDietaryLabels = () => {
    if (!product?.dietaryLabels || product.dietaryLabels.length === 0) {
      return null;
    }

    return (
      <div className={styles.dietaryLabelsSection}>
        <h3>Ernährungshinweise</h3>
        <div className={styles.dietaryLabelsList}>
          {product.dietaryLabels.map(label => (
            <span 
              key={label}
              className={`${styles.dietaryLabel} ${styles[label]}`}
            >
              {dietaryLabels[label] || label}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderIngredients = () => (
    <div className={styles.ingredientsSection}>
      <button
        className={styles.sectionHeader}
        onClick={() => toggleSection('ingredients')}
        aria-expanded={expandedSections.ingredients}
      >
        <h3>Zutaten</h3>
        {expandedSections.ingredients ? <ChevronUp /> : <ChevronDown />}
      </button>

      {expandedSections.ingredients && (
        <div className={styles.sectionContent}>
          {nutritionData.ingredients.length > 0 ? (
            <Suspense fallback={<LoadingSpinner />}>
              <IngredientAnalysis 
                ingredients={nutritionData.ingredients}
                additives={nutritionData.additives}
                language={language}
              />
            </Suspense>
          ) : (
            <p className={styles.noIngredients}>
              Keine Zutateninformationen verfügbar
            </p>
          )}
        </div>
      )}
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (!nutritionData) {
    return (
      <div className={`${styles.nutritionPanel} ${className}`}>
        <div className={styles.noData}>
          <Info size={48} />
          <h3>Keine Nährwertinformationen verfügbar</h3>
          <p>Für dieses Produkt sind derzeit keine Nährwertangaben verfügbar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.nutritionPanel} ${className}`} data-mode={currentMode}>
      {/* Mode Selector */}
      <div className={styles.modeSelector}>
        <button
          className={`${styles.modeButton} ${currentMode === NUTRITION_DISPLAY_MODES.COMPACT ? styles.active : ''}`}
          onClick={() => handleModeChange(NUTRITION_DISPLAY_MODES.COMPACT)}
        >
          Kompakt
        </button>
        <button
          className={`${styles.modeButton} ${currentMode === NUTRITION_DISPLAY_MODES.DETAILED ? styles.active : ''}`}
          onClick={() => handleModeChange(NUTRITION_DISPLAY_MODES.DETAILED)}
        >
          Detailliert
        </button>
        <button
          className={`${styles.modeButton} ${currentMode === NUTRITION_DISPLAY_MODES.VISUAL ? styles.active : ''}`}
          onClick={() => handleModeChange(NUTRITION_DISPLAY_MODES.VISUAL)}
        >
          Visuell
        </button>
      </div>

      {/* Allergen Warnings Banner */}
      {allergenWarnings.length > 0 && (
        <div className={styles.allergenWarningBanner}>
          <AlertTriangle className={styles.warningIcon} />
          <span>Achtung: Enthält {allergenWarnings.join(', ')}</span>
        </div>
      )}

      {/* Main Content */}
      <div className={styles.panelContent}>
        {/* Overview Section */}
        {renderNutritionOverview()}

        {/* Dietary Labels */}
        {renderDietaryLabels()}

        {/* Macronutrients */}
        {(currentMode === NUTRITION_DISPLAY_MODES.DETAILED || currentMode === NUTRITION_DISPLAY_MODES.VISUAL) && 
          renderMacronutrients()
        }

        {/* Micronutrients */}
        {currentMode === NUTRITION_DISPLAY_MODES.DETAILED && renderMicronutrients()}

        {/* Allergens */}
        {renderAllergens()}

        {/* Ingredients */}
        {currentMode === NUTRITION_DISPLAY_MODES.DETAILED && renderIngredients()}

        {/* Visual Charts */}
        {currentMode === NUTRITION_DISPLAY_MODES.VISUAL && (
          <div className={styles.chartsSection}>
            <Suspense fallback={<LoadingSpinner message="Loading charts..." />}>
              <NutritionChart 
                data={nutritionData}
                dailyValues={dailyValuePercentages}
              />
            </Suspense>
          </div>
        )}

        {/* Comparison */}
        {showComparison && comparisonProducts.length > 0 && (
          <div className={styles.comparisonSection}>
            <Suspense fallback={<LoadingSpinner message="Loading comparison..." />}>
              <NutritionComparison
                mainProduct={product}
                comparisonProducts={comparisonProducts}
                language={language}
              />
            </Suspense>
          </div>
        )}

        {/* Personalized Recommendations */}
        {showPersonalization && user && (
          <div className={styles.recommendationsSection}>
            <Suspense fallback={<LoadingSpinner message="Loading recommendations..." />}>
              <PersonalizedRecommendations
                nutritionData={nutritionData}
                userPreferences={userPreferences}
                healthGoals={healthGoals}
                language={language}
              />
            </Suspense>
          </div>
        )}
      </div>

      {/* Selected Nutrient Details */}
      {selectedNutrient && enableInteractivity && (
        <Suspense fallback={<LoadingSpinner />}>
          <NutrientExplorer
            nutrient={selectedNutrient}
            onClose={() => setSelectedNutrient(null)}
            language={language}
          />
        </Suspense>
      )}
    </div>
  );
};

export default NutritionPanel;