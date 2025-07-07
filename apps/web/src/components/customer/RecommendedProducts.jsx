/**
 * EATECH - Recommended Products Component
 * Version: 4.2.0
 * Description: AI-powered product recommendation engine with Swiss market optimization
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/components/customer/RecommendedProducts.jsx
 * 
 * Features:
 * - ML-powered recommendation algorithms (collaborative filtering, content-based)
 * - Real-time personalization based on user behavior
 * - Swiss dietary preferences and seasonal optimization
 * - Cross-selling and upselling intelligent suggestions
 * - Dynamic pricing and promotion integration
 * - A/B testing framework for recommendation strategies
 * - Multi-language product descriptions and reasons
 * - Social proof integration (trending, popular choices)
 * - Dietary restriction and allergen-aware filtering
 * - Weather-based and time-of-day recommendations
 * - Advanced analytics and conversion tracking
 * - Voice commerce integration for recommended products
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
  TrendingUp, Star, Heart, Clock, MapPin,
  Thermometer, CloudRain, Sun, Snowflake,
  Users, Award, Zap, Crown, Leaf,
  ShoppingCart, Eye, ArrowRight, ChevronLeft,
  ChevronRight, Filter, Shuffle, Target,
  Brain, Activity, BarChart3, TrendingDown,
  Calendar, Coffee, Utensils, Wine, Apple
} from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectCoverflow } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-coverflow';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { useRecommendations } from '../../hooks/useRecommendations';
import { useWeather } from '../../hooks/useWeather';
import { useAnalytics } from '../../hooks/useAnalytics';
import styles from './RecommendedProducts.module.css';

// ============================================================================
// LAZY LOADED COMPONENTS
// ============================================================================

// Product Components
const ProductCard = lazy(() => import('./ProductCard'));
const ProductQuickView = lazy(() => import('./ProductQuickView'));
const ProductComparison = lazy(() => import('./ProductComparison'));

// Recommendation Components
const RecommendationExplanation = lazy(() => import('./RecommendationExplanation'));
const PersonalizationSettings = lazy(() => import('./PersonalizationSettings'));
const RecommendationAnalytics = lazy(() => import('./RecommendationAnalytics'));

// Interactive Components
const VoiceRecommendations = lazy(() => import('./VoiceRecommendations'));
const SocialProofWidget = lazy(() => import('./SocialProofWidget'));
const WeatherBasedSuggestions = lazy(() => import('./WeatherBasedSuggestions'));

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const RECOMMENDATION_TYPES = {
  PERSONALIZED: 'personalized',
  TRENDING: 'trending',
  SIMILAR: 'similar',
  COMPLEMENTARY: 'complementary',
  SEASONAL: 'seasonal',
  WEATHER_BASED: 'weather_based',
  TIME_BASED: 'time_based',
  POPULAR: 'popular',
  NEW_ARRIVALS: 'new_arrivals',
  PRICE_OPTIMIZED: 'price_optimized',
  DIETARY_MATCHED: 'dietary_matched',
  FREQUENTLY_BOUGHT_TOGETHER: 'frequently_bought_together'
};

const RECOMMENDATION_STRATEGIES = {
  COLLABORATIVE_FILTERING: 'collaborative_filtering',
  CONTENT_BASED: 'content_based',
  HYBRID: 'hybrid',
  DEEP_LEARNING: 'deep_learning',
  RULE_BASED: 'rule_based',
  SOCIAL_PROOF: 'social_proof'
};

const RECOMMENDATION_CONTEXTS = {
  PRODUCT_VIEW: 'product_view',
  CART_PAGE: 'cart_page',
  CHECKOUT: 'checkout',
  HOMEPAGE: 'homepage',
  SEARCH_RESULTS: 'search_results',
  CATEGORY_PAGE: 'category_page',
  PROFILE_PAGE: 'profile_page'
};

const SWISS_SEASONAL_PREFERENCES = {
  spring: {
    keywords: ['fresh', 'light', 'asparagus', 'ramp', 'herbs'],
    categories: ['salads', 'soups', 'vegetarian'],
    boost: 1.2
  },
  summer: {
    keywords: ['grilled', 'cold', 'ice cream', 'berries', 'bbq'],
    categories: ['beverages', 'grilled', 'desserts'],
    boost: 1.3
  },
  autumn: {
    keywords: ['pumpkin', 'warm', 'hearty', 'mushrooms', 'game'],
    categories: ['comfort_food', 'warm_dishes', 'seasonal'],
    boost: 1.15
  },
  winter: {
    keywords: ['hot', 'comfort', 'chocolate', 'cheese', 'fondue'],
    categories: ['hot_drinks', 'comfort_food', 'traditional'],
    boost: 1.25
  }
};

const WEATHER_FOOD_MAPPING = {
  sunny: ['ice_cream', 'salads', 'cold_beverages', 'grilled'],
  rainy: ['hot_soup', 'comfort_food', 'hot_beverages', 'warm_dishes'],
  cold: ['hot_chocolate', 'warm_drinks', 'hearty_meals', 'comfort_food'],
  hot: ['cold_drinks', 'ice_cream', 'light_meals', 'frozen_treats'],
  snow: ['mulled_wine', 'hot_soup', 'fondue', 'warm_comfort_food']
};

const TIME_BASED_RECOMMENDATIONS = {
  breakfast: {
    timeRange: [6, 11],
    categories: ['breakfast', 'coffee', 'pastries', 'healthy'],
    boost: 1.4
  },
  lunch: {
    timeRange: [11, 14],
    categories: ['main_dishes', 'salads', 'quick_meals', 'business_lunch'],
    boost: 1.3
  },
  afternoon: {
    timeRange: [14, 17],
    categories: ['snacks', 'coffee', 'light_bites', 'desserts'],
    boost: 1.2
  },
  dinner: {
    timeRange: [17, 22],
    categories: ['main_dishes', 'premium', 'wine', 'full_meals'],
    boost: 1.5
  },
  late_night: {
    timeRange: [22, 6],
    categories: ['snacks', 'comfort_food', 'takeaway', 'quick'],
    boost: 1.1
  }
};

const RECOMMENDATION_TRANSLATIONS = {
  'de-CH': {
    recommended_for_you: 'Für Sie empfohlen',
    trending_now: 'Trending jetzt',
    similar_products: 'Ähnliche Produkte',
    frequently_bought_together: 'Oft zusammen gekauft',
    seasonal_favorites: 'Saisonale Favoriten',
    weather_perfect: 'Perfekt für das Wetter',
    popular_choice: 'Beliebte Wahl',
    new_arrivals: 'Neuheiten',
    based_on_your_preferences: 'Basierend auf Ihren Vorlieben',
    customers_also_viewed: 'Kunden sahen auch',
    perfect_for_today: 'Perfekt für heute',
    add_to_cart: 'In Warenkorb',
    quick_view: 'Schnellansicht',
    see_details: 'Details ansehen',
    why_recommended: 'Warum empfohlen?',
    personalize_recommendations: 'Empfehlungen personalisieren',
    refresh_recommendations: 'Empfehlungen aktualisieren',
    view_all: 'Alle anzeigen'
  },
  'de-DE': {
    recommended_for_you: 'Für Sie empfohlen',
    trending_now: 'Im Trend',
    similar_products: 'Ähnliche Produkte',
    frequently_bought_together: 'Oft zusammen gekauft',
    seasonal_favorites: 'Saisonale Favoriten',
    weather_perfect: 'Perfekt bei diesem Wetter',
    popular_choice: 'Beliebte Wahl',
    new_arrivals: 'Neuheiten',
    based_on_your_preferences: 'Basierend auf Ihren Vorlieben',
    customers_also_viewed: 'Kunden sahen auch',
    perfect_for_today: 'Perfekt für heute',
    add_to_cart: 'In den Warenkorb',
    quick_view: 'Schnellansicht',
    see_details: 'Details ansehen',
    why_recommended: 'Warum empfohlen?',
    personalize_recommendations: 'Empfehlungen anpassen',
    refresh_recommendations: 'Empfehlungen aktualisieren',
    view_all: 'Alle anzeigen'
  },
  'fr-CH': {
    recommended_for_you: 'Recommandé pour vous',
    trending_now: 'Tendance maintenant',
    similar_products: 'Produits similaires',
    frequently_bought_together: 'Souvent achetés ensemble',
    seasonal_favorites: 'Favoris de saison',
    weather_perfect: 'Parfait pour ce temps',
    popular_choice: 'Choix populaire',
    new_arrivals: 'Nouveautés',
    based_on_your_preferences: 'Basé sur vos préférences',
    customers_also_viewed: 'Les clients ont aussi vu',
    perfect_for_today: 'Parfait pour aujourd\'hui',
    add_to_cart: 'Ajouter au panier',
    quick_view: 'Aperçu rapide',
    see_details: 'Voir les détails',
    why_recommended: 'Pourquoi recommandé?',
    personalize_recommendations: 'Personnaliser les recommandations',
    refresh_recommendations: 'Actualiser les recommandations',
    view_all: 'Voir tout'
  },
  'it-CH': {
    recommended_for_you: 'Raccomandato per te',
    trending_now: 'Di tendenza ora',
    similar_products: 'Prodotti simili',
    frequently_bought_together: 'Spesso acquistati insieme',
    seasonal_favorites: 'Favoriti stagionali',
    weather_perfect: 'Perfetto per questo tempo',
    popular_choice: 'Scelta popolare',
    new_arrivals: 'Novità',
    based_on_your_preferences: 'Basato sulle tue preferenze',
    customers_also_viewed: 'I clienti hanno visto anche',
    perfect_for_today: 'Perfetto per oggi',
    add_to_cart: 'Aggiungi al carrello',
    quick_view: 'Anteprima rapida',
    see_details: 'Vedi dettagli',
    why_recommended: 'Perché raccomandato?',
    personalize_recommendations: 'Personalizza raccomandazioni',
    refresh_recommendations: 'Aggiorna raccomandazioni',
    view_all: 'Vedi tutto'
  },
  'en-US': {
    recommended_for_you: 'Recommended for You',
    trending_now: 'Trending Now',
    similar_products: 'Similar Products',
    frequently_bought_together: 'Frequently Bought Together',
    seasonal_favorites: 'Seasonal Favorites',
    weather_perfect: 'Perfect for This Weather',
    popular_choice: 'Popular Choice',
    new_arrivals: 'New Arrivals',
    based_on_your_preferences: 'Based on Your Preferences',
    customers_also_viewed: 'Customers Also Viewed',
    perfect_for_today: 'Perfect for Today',
    add_to_cart: 'Add to Cart',
    quick_view: 'Quick View',
    see_details: 'See Details',
    why_recommended: 'Why Recommended?',
    personalize_recommendations: 'Personalize Recommendations',
    refresh_recommendations: 'Refresh Recommendations',
    view_all: 'View All'
  }
};

const DEFAULT_SETTINGS = {
  maxRecommendations: 8,
  enablePersonalization: true,
  enableWeatherBased: true,
  enableTimeBasedTuning: true,
  enableSeasonalBoosting: true,
  enableSocialProof: true,
  showExplanations: true,
  enableAutoRefresh: true,
  refreshInterval: 300000, // 5 minutes
  enableVoiceIntegration: true,
  trackInteractions: true,
  enableABTesting: true,
  diversityThreshold: 0.3,
  minimumConfidence: 0.6
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
// RECOMMENDATION ITEM COMPONENT
// ============================================================================

const RecommendationItem = ({ 
  product, 
  recommendationType, 
  confidence, 
  reason,
  onProductClick,
  onAddToCart,
  onQuickView,
  language,
  showExplanation = true 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);
  
  const { trackEvent } = useAnalytics();
  const translations = RECOMMENDATION_TRANSLATIONS[language] || RECOMMENDATION_TRANSLATIONS['de-CH'];

  const handleProductClick = useCallback(() => {
    trackEvent('recommendation_click', {
      productId: product.id,
      recommendationType,
      confidence,
      reason
    });
    onProductClick?.(product);
  }, [product, recommendationType, confidence, reason, onProductClick, trackEvent]);

  const handleAddToCart = useCallback((e) => {
    e.stopPropagation();
    trackEvent('recommendation_add_to_cart', {
      productId: product.id,
      recommendationType,
      confidence
    });
    onAddToCart?.(product);
  }, [product, recommendationType, confidence, onAddToCart, trackEvent]);

  const handleQuickView = useCallback((e) => {
    e.stopPropagation();
    setShowQuickView(true);
    onQuickView?.(product);
  }, [product, onQuickView]);

  const getRecommendationIcon = () => {
    switch (recommendationType) {
      case RECOMMENDATION_TYPES.TRENDING: return <TrendingUp size={14} />;
      case RECOMMENDATION_TYPES.POPULAR: return <Users size={14} />;
      case RECOMMENDATION_TYPES.SEASONAL: return <Calendar size={14} />;
      case RECOMMENDATION_TYPES.WEATHER_BASED: return <Thermometer size={14} />;
      case RECOMMENDATION_TYPES.NEW_ARRIVALS: return <Zap size={14} />;
      case RECOMMENDATION_TYPES.PERSONALIZED: return <Target size={14} />;
      default: return <Star size={14} />;
    }
  };

  const getConfidenceColor = () => {
    if (confidence >= 0.8) return '#22c55e';
    if (confidence >= 0.6) return '#eab308';
    return '#f97316';
  };

  return (
    <div 
      className={styles.recommendationItem}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleProductClick}
    >
      {/* Product Image */}
      <div className={styles.productImageContainer}>
        <img 
          src={product.image || '/images/placeholder-food.jpg'} 
          alt={product.name}
          className={styles.productImage}
          loading="lazy"
        />
        
        {/* Recommendation Badge */}
        <div className={styles.recommendationBadge}>
          {getRecommendationIcon()}
          <span className={styles.confidenceScore} style={{ color: getConfidenceColor() }}>
            {Math.round(confidence * 100)}%
          </span>
        </div>

        {/* Hover Actions */}
        {isHovered && (
          <div className={styles.hoverActions}>
            <button
              className={styles.actionButton}
              onClick={handleQuickView}
              title={translations.quick_view}
            >
              <Eye size={16} />
            </button>
            <button
              className={styles.actionButton}
              onClick={handleAddToCart}
              title={translations.add_to_cart}
            >
              <ShoppingCart size={16} />
            </button>
          </div>
        )}

        {/* Special Indicators */}
        <div className={styles.productIndicators}>
          {product.isNew && (
            <span className={styles.indicator}>
              <Zap size={12} />
              Neu
            </span>
          )}
          {product.isPopular && (
            <span className={styles.indicator}>
              <TrendingUp size={12} />
              Beliebt
            </span>
          )}
          {product.isPremium && (
            <span className={styles.indicator}>
              <Crown size={12} />
              Premium
            </span>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className={styles.productInfo}>
        <h4 className={styles.productName}>{product.name}</h4>
        
        {product.description && (
          <p className={styles.productDescription}>
            {product.description.length > 60 
              ? `${product.description.slice(0, 60)}...` 
              : product.description
            }
          </p>
        )}

        {/* Rating */}
        {product.rating && (
          <div className={styles.productRating}>
            <Star size={12} fill="currentColor" />
            <span>{product.rating.toFixed(1)}</span>
            {product.reviewCount && (
              <span className={styles.reviewCount}>({product.reviewCount})</span>
            )}
          </div>
        )}

        {/* Price */}
        <div className={styles.productPrice}>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className={styles.originalPrice}>
              CHF {product.originalPrice.toFixed(2)}
            </span>
          )}
          <span className={styles.currentPrice}>
            CHF {product.price.toFixed(2)}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className={styles.discount}>
              -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
            </span>
          )}
        </div>

        {/* Recommendation Reason */}
        {showExplanation && reason && (
          <div className={styles.recommendationReason}>
            <Brain size={12} />
            <span>{reason}</span>
          </div>
        )}
      </div>

      {/* Quick View Modal */}
      {showQuickView && (
        <Suspense fallback={<LoadingSpinner />}>
          <ProductQuickView
            product={product}
            isOpen={showQuickView}
            onClose={() => setShowQuickView(false)}
            onAddToCart={handleAddToCart}
            language={language}
          />
        </Suspense>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const RecommendedProducts = ({
  context = RECOMMENDATION_CONTEXTS.HOMEPAGE,
  currentProduct = null,
  recommendationType = RECOMMENDATION_TYPES.PERSONALIZED,
  maxItems = 8,
  language = 'de-CH',
  settings = {},
  className = '',
  enableVoiceControls = true,
  showHeader = true,
  onProductClick,
  onRecommendationInteraction
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [activeRecommendationType, setActiveRecommendationType] = useState(recommendationType);
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showPersonalizationSettings, setShowPersonalizationSettings] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [abTestVariant, setAbTestVariant] = useState('A');

  // ============================================================================
  // REFS & CONTEXTS
  // ============================================================================

  const swiperRef = useRef(null);
  const sectionRef = useRef(null);
  const refreshTimer = useRef(null);

  const { tenant } = useTenant();
  const { user } = useAuth();
  const { cart, addToCart } = useCart();
  const { 
    preferences, 
    dietaryRestrictions,
    allergenAlerts,
    favoriteCategories 
  } = useUserPreferences();
  const { weather, isLoading: weatherLoading } = useWeather();
  const { trackEvent, trackRecommendationImpression } = useAnalytics();

  const {
    getRecommendations,
    getPersonalizedRecommendations,
    getTrendingProducts,
    getSeasonalRecommendations,
    getWeatherBasedRecommendations,
    refreshRecommendations
  } = useRecommendations();

  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================

  const mergedSettings = useMemo(() => ({
    ...DEFAULT_SETTINGS,
    maxRecommendations: maxItems,
    ...settings
  }), [settings, maxItems]);

  const translations = useMemo(() => 
    RECOMMENDATION_TRANSLATIONS[language] || RECOMMENDATION_TRANSLATIONS['de-CH'], 
    [language]
  );

  const currentSeason = useMemo(() => {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }, []);

  const currentTimeSlot = useMemo(() => {
    const hour = new Date().getHours();
    for (const [slot, config] of Object.entries(TIME_BASED_RECOMMENDATIONS)) {
      const [start, end] = config.timeRange;
      if (hour >= start && hour < end) {
        return slot;
      }
    }
    return 'late_night';
  }, []);

  const recommendationTypeOptions = useMemo(() => [
    {
      type: RECOMMENDATION_TYPES.PERSONALIZED,
      label: translations.recommended_for_you,
      icon: <Target size={16} />,
      available: !!user
    },
    {
      type: RECOMMENDATION_TYPES.TRENDING,
      label: translations.trending_now,
      icon: <TrendingUp size={16} />,
      available: true
    },
    {
      type: RECOMMENDATION_TYPES.POPULAR,
      label: translations.popular_choice,
      icon: <Users size={16} />,
      available: true
    },
    {
      type: RECOMMENDATION_TYPES.SEASONAL,
      label: translations.seasonal_favorites,
      icon: <Calendar size={16} />,
      available: true
    },
    {
      type: RECOMMENDATION_TYPES.WEATHER_BASED,
      label: translations.weather_perfect,
      icon: <Thermometer size={16} />,
      available: !weatherLoading && weather
    },
    {
      type: RECOMMENDATION_TYPES.NEW_ARRIVALS,
      label: translations.new_arrivals,
      icon: <Zap size={16} />,
      available: true
    }
  ].filter(option => option.available), [translations, user, weatherLoading, weather]);

  // ============================================================================
  // RECOMMENDATION FETCHING
  // ============================================================================

  const fetchRecommendations = useCallback(async (type = activeRecommendationType) => {
    setIsLoading(true);
    setError(null);

    try {
      let results = [];

      switch (type) {
        case RECOMMENDATION_TYPES.PERSONALIZED:
          if (user) {
            results = await getPersonalizedRecommendations({
              userId: user.id,
              context,
              currentProduct,
              preferences,
              dietaryRestrictions,
              maxItems: mergedSettings.maxRecommendations,
              diversityThreshold: mergedSettings.diversityThreshold
            });
          }
          break;

        case RECOMMENDATION_TYPES.TRENDING:
          results = await getTrendingProducts({
            timeWindow: '24h',
            maxItems: mergedSettings.maxRecommendations
          });
          break;

        case RECOMMENDATION_TYPES.SEASONAL:
          results = await getSeasonalRecommendations({
            season: currentSeason,
            preferences: SWISS_SEASONAL_PREFERENCES[currentSeason],
            maxItems: mergedSettings.maxRecommendations
          });
          break;

        case RECOMMENDATION_TYPES.WEATHER_BASED:
          if (weather) {
            results = await getWeatherBasedRecommendations({
              weather: weather.current,
              temperature: weather.temperature,
              mapping: WEATHER_FOOD_MAPPING,
              maxItems: mergedSettings.maxRecommendations
            });
          }
          break;

        default:
          results = await getRecommendations({
            type,
            context,
            currentProduct,
            maxItems: mergedSettings.maxRecommendations,
            filters: {
              dietaryRestrictions,
              allergenAlerts,
              priceRange: preferences.priceRange
            }
          });
      }

      // Apply time-based boosting
      if (mergedSettings.enableTimeBasedTuning) {
        const timeBoost = TIME_BASED_RECOMMENDATIONS[currentTimeSlot]?.boost || 1;
        results = results.map(item => ({
          ...item,
          confidence: Math.min(1, item.confidence * timeBoost)
        }));
      }

      // Filter out products already in cart
      const cartProductIds = new Set(cart.map(item => item.productId));
      results = results.filter(item => !cartProductIds.has(item.product.id));

      // Sort by confidence
      results.sort((a, b) => b.confidence - a.confidence);

      setRecommendations(results);

      // Track impressions
      if (mergedSettings.trackInteractions) {
        results.forEach((item, index) => {
          trackRecommendationImpression({
            productId: item.product.id,
            recommendationType: type,
            position: index,
            confidence: item.confidence,
            context
          });
        });
      }

    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [
    activeRecommendationType,
    user,
    context,
    currentProduct,
    preferences,
    dietaryRestrictions,
    mergedSettings,
    currentSeason,
    currentTimeSlot,
    weather,
    cart,
    getPersonalizedRecommendations,
    getTrendingProducts,
    getSeasonalRecommendations,
    getWeatherBasedRecommendations,
    getRecommendations,
    trackRecommendationImpression
  ]);

  // ============================================================================
  // EFFECT HOOKS
  // ============================================================================

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  useEffect(() => {
    if (mergedSettings.enableAutoRefresh && mergedSettings.refreshInterval > 0) {
      refreshTimer.current = setInterval(() => {
        fetchRecommendations();
      }, mergedSettings.refreshInterval);

      return () => {
        if (refreshTimer.current) {
          clearInterval(refreshTimer.current);
        }
      };
    }
  }, [fetchRecommendations, mergedSettings]);

  // A/B Testing Setup
  useEffect(() => {
    if (mergedSettings.enableABTesting) {
      const variant = Math.random() > 0.5 ? 'A' : 'B';
      setAbTestVariant(variant);
      
      trackEvent('ab_test_assignment', {
        component: 'recommended_products',
        variant,
        context
      });
    }
  }, [mergedSettings.enableABTesting, context, trackEvent]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleTypeChange = useCallback((newType) => {
    setActiveRecommendationType(newType);
    setCurrentSlide(0);
    
    trackEvent('recommendation_type_change', {
      from: activeRecommendationType,
      to: newType,
      context
    });
  }, [activeRecommendationType, context, trackEvent]);

  const handleProductClick = useCallback((product) => {
    trackEvent('recommendation_product_click', {
      productId: product.id,
      recommendationType: activeRecommendationType,
      context
    });
    
    onProductClick?.(product);
    onRecommendationInteraction?.({
      type: 'click',
      product,
      recommendationType: activeRecommendationType
    });
  }, [activeRecommendationType, context, onProductClick, onRecommendationInteraction, trackEvent]);

  const handleAddToCart = useCallback((product) => {
    addToCart({
      productId: product.id,
      quantity: 1,
      modifications: []
    });

    trackEvent('recommendation_add_to_cart', {
      productId: product.id,
      recommendationType: activeRecommendationType,
      context
    });

    onRecommendationInteraction?.({
      type: 'add_to_cart',
      product,
      recommendationType: activeRecommendationType
    });
  }, [addToCart, activeRecommendationType, context, onRecommendationInteraction, trackEvent]);

  const handleRefreshRecommendations = useCallback(() => {
    fetchRecommendations();
    
    trackEvent('recommendations_refresh', {
      recommendationType: activeRecommendationType,
      context
    });
  }, [fetchRecommendations, activeRecommendationType, context, trackEvent]);

  // ============================================================================
  // RENDER METHODS
  // ============================================================================

  const renderHeader = () => {
    if (!showHeader) return null;

    const currentTypeOption = recommendationTypeOptions.find(
      option => option.type === activeRecommendationType
    );

    return (
      <div className={styles.sectionHeader}>
        <div className={styles.headerLeft}>
          <h2 className={styles.sectionTitle}>
            {currentTypeOption?.icon}
            {currentTypeOption?.label || translations.recommended_for_you}
          </h2>
          
          {mergedSettings.showExplanations && (
            <span className={styles.subtitle}>
              {translations.based_on_your_preferences}
            </span>
          )}
        </div>

        <div className={styles.headerControls}>
          {/* Type Selector */}
          {recommendationTypeOptions.length > 1 && (
            <div className={styles.typeSelector}>
              {recommendationTypeOptions.map(option => (
                <button
                  key={option.type}
                  className={`${styles.typeButton} ${
                    activeRecommendationType === option.type ? styles.active : ''
                  }`}
                  onClick={() => handleTypeChange(option.type)}
                  title={option.label}
                >
                  {option.icon}
                </button>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className={styles.actionButtons}>
            <button
              className={styles.actionButton}
              onClick={handleRefreshRecommendations}
              disabled={isLoading}
              title={translations.refresh_recommendations}
            >
              <Shuffle size={16} />
            </button>

            {user && (
              <button
                className={styles.actionButton}
                onClick={() => setShowPersonalizationSettings(true)}
                title={translations.personalize_recommendations}
              >
                <Target size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderRecommendations = () => {
    if (isLoading) {
      return (
        <div className={styles.loadingState}>
          <LoadingSpinner size={32} message="Lädt Empfehlungen..." />
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.errorState}>
          <AlertTriangle size={32} />
          <p>Fehler beim Laden der Empfehlungen</p>
          <button onClick={handleRefreshRecommendations}>
            Erneut versuchen
          </button>
        </div>
      );
    }

    if (recommendations.length === 0) {
      return (
        <div className={styles.emptyState}>
          <Brain size={32} />
          <p>Keine Empfehlungen verfügbar</p>
        </div>
      );
    }

    return (
      <div className={styles.recommendationsContainer}>
        <Swiper
          ref={swiperRef}
          modules={[Navigation, Pagination, Autoplay, EffectCoverflow]}
          spaceBetween={16}
          slidesPerView="auto"
          navigation={{
            prevEl: `.${styles.navPrev}`,
            nextEl: `.${styles.navNext}`
          }}
          pagination={{
            el: `.${styles.pagination}`,
            clickable: true,
            dynamicBullets: true
          }}
          breakpoints={{
            320: { slidesPerView: 1.2 },
            480: { slidesPerView: 1.5 },
            768: { slidesPerView: 2.5 },
            1024: { slidesPerView: 3.5 },
            1280: { slidesPerView: 4.5 }
          }}
          onSlideChange={(swiper) => setCurrentSlide(swiper.activeIndex)}
          className={styles.recommendationsSwiper}
        >
          {recommendations.map((recommendation, index) => (
            <SwiperSlide key={recommendation.product.id} className={styles.slide}>
              <RecommendationItem
                product={recommendation.product}
                recommendationType={activeRecommendationType}
                confidence={recommendation.confidence}
                reason={recommendation.reason}
                onProductClick={handleProductClick}
                onAddToCart={handleAddToCart}
                language={language}
                showExplanation={mergedSettings.showExplanations}
              />
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Navigation */}
        <button className={`${styles.navButton} ${styles.navPrev}`}>
          <ChevronLeft size={20} />
        </button>
        <button className={`${styles.navButton} ${styles.navNext}`}>
          <ChevronRight size={20} />
        </button>

        {/* Pagination */}
        <div className={styles.pagination} />
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <section ref={sectionRef} className={`${styles.recommendedProducts} ${className}`}>
      {renderHeader()}
      
      {/* Social Proof Widget */}
      {mergedSettings.enableSocialProof && (
        <Suspense fallback={<LoadingSpinner />}>
          <SocialProofWidget
            products={recommendations.map(r => r.product)}
            language={language}
          />
        </Suspense>
      )}

      {/* Main Recommendations */}
      {renderRecommendations()}

      {/* Weather-Based Suggestions */}
      {mergedSettings.enableWeatherBased && weather && (
        <Suspense fallback={<LoadingSpinner />}>
          <WeatherBasedSuggestions
            weather={weather}
            onProductSelect={handleProductClick}
            language={language}
          />
        </Suspense>
      )}

      {/* Voice Recommendations */}
      {enableVoiceControls && mergedSettings.enableVoiceIntegration && (
        <Suspense fallback={<LoadingSpinner />}>
          <VoiceRecommendations
            recommendations={recommendations}
            onProductSelect={handleProductClick}
            language={language}
          />
        </Suspense>
      )}

      {/* Personalization Settings Modal */}
      {showPersonalizationSettings && (
        <Suspense fallback={<LoadingSpinner />}>
          <PersonalizationSettings
            isOpen={showPersonalizationSettings}
            onClose={() => setShowPersonalizationSettings(false)}
            onSettingsUpdate={fetchRecommendations}
            language={language}
          />
        </Suspense>
      )}

      {/* Analytics Dashboard */}
      {process.env.NODE_ENV === 'development' && (
        <Suspense fallback={<LoadingSpinner />}>
          <RecommendationAnalytics
            recommendations={recommendations}
            interactions={selectedProducts}
            abTestVariant={abTestVariant}
          />
        </Suspense>
      )}
    </section>
  );
};

export default RecommendedProducts;