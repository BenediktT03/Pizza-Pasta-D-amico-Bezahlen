/**
 * EATECH - Product Modal Component (Web)
 * Version: 7.1.0
 * Description: Interactive Product Detail Modal mit Lazy Loading & Optimizations
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/web/src/components/customer/ProductModal.jsx
 * 
 * Features: Product customization, image gallery, nutritional info, voice ordering
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Plus, Minus, Star, Heart, Share2, ShoppingCart, 
  Info, ChefHat, Clock, Flame, Leaf, AlertCircle,
  Camera, Zap, Volume2, VolumeX, Eye, Users,
  Award, Truck, MapPin, Timer, DollarSign,
  ThumbsUp, MessageCircle, Bookmark, Gift
} from 'lucide-react';

// Hooks & Contexts
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';

// Lazy loaded components
const ImageGallery = lazy(() => import('./ProductImageGallery'));
const NutritionPanel = lazy(() => import('./NutritionPanel'));
const ModifierSelector = lazy(() => import('./ModifierSelector'));
const ReviewsSection = lazy(() => import('./ReviewsSection'));
const RecommendedProducts = lazy(() => import('./RecommendedProducts'));
const VoiceOrderInterface = lazy(() => import('./VoiceOrderInterface'));
const ShareModal = lazy(() => import('./ShareModal'));
const WishlistButton = lazy(() => import('./WishlistButton'));
const ProductQR = lazy(() => import('./ProductQR'));
const AllergenInfo = lazy(() => import('./AllergenInfo'));
const SizeSelector = lazy(() => import('./SizeSelector'));
const CustomizationPanel = lazy(() => import('./CustomizationPanel'));

// Lazy loaded services
const analyticsService = () => import('../../services/analyticsService');
const voiceService = () => import('../../services/voiceService');
const shareService = () => import('../../services/shareService');
const imageService = () => import('../../services/imageService');
const reviewService = () => import('../../services/reviewService');

// Lazy loaded utilities
const formattersUtil = () => import('../../utils/formatters');
const validationUtil = () => import('../../utils/validation');
const animationUtil = () => import('../../utils/animations');

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const MODAL_VARIANTS = {
  hidden: { 
    opacity: 0, 
    scale: 0.8,
    y: 50 
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.8,
    y: 50,
    transition: {
      duration: 0.2
    }
  }
};

const ProductModal = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  showReviews = true,
  showRecommendations = true,
  enableVoiceOrdering = true,
  enableSharing = true,
  className = ''
}) => {
  // ============================================================================
  // STATE
  // ============================================================================
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState({});
  const [customizations, setCustomizations] = useState({});
  const [activeTab, setActiveTab] = useState('description');
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showVoiceInterface, setShowVoiceInterface] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [showQR, setShowQR] = useState(false);
  const [nutritionExpanded, setNutritionExpanded] = useState(false);

  // Hooks
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { tenant } = useTenant();

  // Lazy loaded services refs
  const analyticsServiceRef = React.useRef(null);
  const voiceServiceRef = React.useRef(null);
  const shareServiceRef = React.useRef(null);
  const imageServiceRef = React.useRef(null);
  const reviewServiceRef = React.useRef(null);
  const formattersRef = React.useRef(null);

  // ============================================================================
  // LAZY LOADING SETUP
  // ============================================================================
  useEffect(() => {
    const initializeLazyServices = async () => {
      try {
        // Initialize services
        if (!analyticsServiceRef.current) {
          const AnalyticsService = await analyticsService();
          analyticsServiceRef.current = new AnalyticsService.default();
        }

        if (enableVoiceOrdering && !voiceServiceRef.current) {
          const VoiceService = await voiceService();
          voiceServiceRef.current = new VoiceService.default();
        }

        if (enableSharing && !shareServiceRef.current) {
          const ShareService = await shareService();
          shareServiceRef.current = new ShareService.default();
        }

        if (!imageServiceRef.current) {
          const ImageService = await imageService();
          imageServiceRef.current = new ImageService.default();
        }

        if (showReviews && !reviewServiceRef.current) {
          const ReviewService = await reviewService();
          reviewServiceRef.current = new ReviewService.default();
        }

        // Initialize utilities
        if (!formattersRef.current) {
          const Formatters = await formattersUtil();
          formattersRef.current = Formatters;
        }

      } catch (error) {
        console.error('Failed to initialize lazy services:', error);
      }
    };

    if (isOpen && product) {
      initializeLazyServices();
    }
  }, [isOpen, product, enableVoiceOrdering, enableSharing, showReviews]);

  // ============================================================================
  // EFFECTS
  // ============================================================================
  useEffect(() => {
    if (isOpen && product) {
      loadProductData();
      trackProductView();
      
      // Set default size if available
      if (product.sizes && product.sizes.length > 0) {
        setSelectedSize(product.sizes[0]);
      }
    }
    
    // Reset state when modal closes
    if (!isOpen) {
      resetModalState();
    }
  }, [isOpen, product]);

  useEffect(() => {
    // Keyboard navigation
    const handleKeyDown = (e) => {
      if (isOpen) {
        switch (e.key) {
          case 'Escape':
            onClose();
            break;
          case 'Enter':
            if (e.ctrlKey || e.metaKey) {
              handleAddToCart();
            }
            break;
          case 'ArrowLeft':
            if (activeTab === 'nutrition') setActiveTab('description');
            break;
          case 'ArrowRight':
            if (activeTab === 'description') setActiveTab('nutrition');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, onClose]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  const loadProductData = useCallback(async () => {
    if (!product) return;

    setIsLoading(true);
    try {
      // Load reviews
      if (showReviews && reviewServiceRef.current) {
        const productReviews = await reviewServiceRef.current.getProductReviews(product.id);
        setReviews(productReviews);
      }

      // Load recommendations
      if (showRecommendations && analyticsServiceRef.current) {
        const recommendations = await analyticsServiceRef.current.getRecommendations(product.id);
        setRecommendations(recommendations);
      }

      // Check if favorite
      if (user) {
        // Check wishlist status
        const wishlistStatus = await checkWishlistStatus(product.id);
        setIsFavorite(wishlistStatus);
      }

    } catch (error) {
      console.error('Failed to load product data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [product, showReviews, showRecommendations, user]);

  const checkWishlistStatus = async (productId) => {
    // Implementation would check user's wishlist
    return false; // Placeholder
  };

  const trackProductView = useCallback(() => {
    if (analyticsServiceRef.current && product) {
      analyticsServiceRef.current.trackEvent('product_viewed', {
        product_id: product.id,
        product_name: product.name,
        category: product.category,
        price: product.price,
        tenant_id: tenant?.id
      });
    }
  }, [product, tenant]);

  const resetModalState = () => {
    setQuantity(1);
    setSelectedSize(null);
    setSelectedModifiers({});
    setCustomizations({});
    setActiveTab('description');
    setShowImageGallery(false);
    setShowShareModal(false);
    setShowVoiceInterface(false);
    setShowQR(false);
    setNutritionExpanded(false);
  };

  // ============================================================================
  // CALCULATIONS
  // ============================================================================
  const calculateTotalPrice = useMemo(() => {
    let basePrice = product?.price || 0;
    
    // Add size price difference
    if (selectedSize && selectedSize.priceModifier) {
      basePrice += selectedSize.priceModifier;
    }
    
    // Add modifier prices
    const modifierPrice = Object.values(selectedModifiers).reduce((total, modifier) => {
      return total + (modifier.price || 0);
    }, 0);
    
    return (basePrice + modifierPrice) * quantity;
  }, [product, selectedSize, selectedModifiers, quantity]);

  const isAddToCartDisabled = useMemo(() => {
    // Check if required options are selected
    if (product?.sizes && product.sizes.length > 0 && !selectedSize) {
      return true;
    }
    
    // Check required modifiers
    if (product?.modifierGroups) {
      const missingRequired = product.modifierGroups.some(group => 
        group.required && !selectedModifiers[group.id]
      );
      if (missingRequired) return true;
    }
    
    return quantity <= 0 || isLoading;
  }, [product, selectedSize, selectedModifiers, quantity, isLoading]);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleQuantityChange = (delta) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= 99) {
      setQuantity(newQuantity);
    }
  };

  const handleSizeChange = (size) => {
    setSelectedSize(size);
    
    // Track analytics
    if (analyticsServiceRef.current) {
      analyticsServiceRef.current.trackEvent('product_size_selected', {
        product_id: product.id,
        size: size.name,
        price_modifier: size.priceModifier
      });
    }
  };

  const handleModifierChange = (groupId, modifier) => {
    setSelectedModifiers(prev => ({
      ...prev,
      [groupId]: modifier
    }));
  };

  const handleCustomizationChange = (key, value) => {
    setCustomizations(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAddToCart = async () => {
    if (isAddToCartDisabled) return;

    try {
      setIsLoading(true);

      const cartItem = {
        product: product,
        quantity: quantity,
        size: selectedSize,
        modifiers: selectedModifiers,
        customizations: customizations,
        totalPrice: calculateTotalPrice,
        timestamp: new Date().toISOString()
      };

      // Add to cart
      if (onAddToCart) {
        await onAddToCart(cartItem);
      } else {
        await addToCart(cartItem);
      }

      // Track analytics
      if (analyticsServiceRef.current) {
        analyticsServiceRef.current.trackEvent('product_added_to_cart', {
          product_id: product.id,
          quantity: quantity,
          total_price: calculateTotalPrice,
          modifiers: Object.keys(selectedModifiers),
          size: selectedSize?.name
        });
      }

      // Close modal after successful add
      onClose();

    } catch (error) {
      console.error('Failed to add product to cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceOrder = async () => {
    if (!enableVoiceOrdering || !voiceServiceRef.current) return;

    try {
      setShowVoiceInterface(true);
      
      const voiceOrder = await voiceServiceRef.current.startVoiceOrder({
        product: product,
        context: {
          availableSizes: product.sizes,
          availableModifiers: product.modifierGroups
        }
      });

      if (voiceOrder) {
        setQuantity(voiceOrder.quantity || 1);
        setSelectedSize(voiceOrder.size);
        setSelectedModifiers(voiceOrder.modifiers || {});
      }

    } catch (error) {
      console.error('Voice order failed:', error);
    } finally {
      setShowVoiceInterface(false);
    }
  };

  const handleShare = async () => {
    if (!enableSharing || !shareServiceRef.current) return;

    try {
      const shareData = {
        title: product.name,
        text: `Check out ${product.name} at ${tenant?.name}!`,
        url: `${window.location.origin}/product/${product.id}`,
        image: product.image
      };

      await shareServiceRef.current.share(shareData);

      // Track analytics
      if (analyticsServiceRef.current) {
        analyticsServiceRef.current.trackEvent('product_shared', {
          product_id: product.id,
          share_method: 'native'
        });
      }

    } catch (error) {
      console.error('Share failed:', error);
      setShowShareModal(true); // Fallback to custom share modal
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      // Prompt to login
      return;
    }

    try {
      setIsFavorite(!isFavorite);
      
      // Update wishlist
      // Implementation would call wishlist API
      
      // Track analytics
      if (analyticsServiceRef.current) {
        analyticsServiceRef.current.trackEvent('product_favorited', {
          product_id: product.id,
          action: isFavorite ? 'removed' : 'added'
        });
      }

    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      setIsFavorite(!isFavorite); // Revert on error
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  const renderProductHeader = () => (
    <div className="flex items-start justify-between mb-6">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
          {product.isNew && (
            <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
              NEU
            </span>
          )}
          {product.isSpicy && <Flame className="w-5 h-5 text-red-500" />}
          {product.isVegetarian && <Leaf className="w-5 h-5 text-green-500" />}
        </div>
        
        <p className="text-gray-600 mb-3">{product.description}</p>
        
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold text-primary">
            {formattersRef.current?.formatPrice(calculateTotalPrice) || `$${calculateTotalPrice.toFixed(2)}`}
          </span>
          
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-lg text-gray-500 line-through">
              {formattersRef.current?.formatPrice(product.originalPrice) || `$${product.originalPrice.toFixed(2)}`}
            </span>
          )}
          
          {product.rating && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-sm text-gray-600">
                {product.rating} ({product.reviewCount || 0})
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 ml-4">
        {enableVoiceOrdering && (
          <button
            onClick={handleVoiceOrder}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Voice Order"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        )}
        
        <button
          onClick={handleToggleFavorite}
          className={`p-2 rounded-lg transition-colors ${
            isFavorite 
              ? 'bg-red-100 text-red-600 hover:bg-red-200' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
          title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        >
          <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
        
        {enableSharing && (
          <button
            onClick={handleShare}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Share Product"
          >
            <Share2 className="w-5 h-5" />
          </button>
        )}
        
        <button
          onClick={() => setShowQR(true)}
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          title="Show QR Code"
        >
          <Camera className="w-5 h-5" />
        </button>
        
        <button
          onClick={onClose}
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderProductImage = () => (
    <div className="relative mb-6">
      <button
        onClick={() => setShowImageGallery(true)}
        className="relative block w-full h-64 bg-gray-100 rounded-lg overflow-hidden group"
      >
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-300 flex items-center justify-center">
          <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </button>
      
      {product.images && product.images.length > 1 && (
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
          +{product.images.length - 1} more
        </div>
      )}
    </div>
  );

  const renderTabNavigation = () => (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex space-x-8">
        {[
          { id: 'description', label: 'Description', icon: Info },
          { id: 'nutrition', label: 'Nutrition', icon: Award },
          ...(showReviews ? [{ id: 'reviews', label: 'Reviews', icon: MessageCircle }] : [])
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {id === 'reviews' && reviews.length > 0 && (
              <span className="bg-gray-100 text-gray-600 text-xs rounded-full px-2 py-0.5">
                {reviews.length}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );

  const renderQuantitySelector = () => (
    <div className="flex items-center justify-between mb-6">
      <span className="text-lg font-medium">Quantity</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleQuantityChange(-1)}
          disabled={quantity <= 1}
          className="w-10 h-10 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        
        <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
        
        <button
          onClick={() => handleQuantityChange(1)}
          disabled={quantity >= 99}
          className="w-10 h-10 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderAddToCartButton = () => (
    <button
      onClick={handleAddToCart}
      disabled={isAddToCartDisabled}
      className={`w-full py-4 px-6 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 transition-all duration-300 ${
        isAddToCartDisabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-primary text-white hover:bg-primary-dark shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
      }`}
    >
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <ShoppingCart className="w-5 h-5" />
          Add to Cart - {formattersRef.current?.formatPrice(calculateTotalPrice) || `$${calculateTotalPrice.toFixed(2)}`}
        </>
      )}
    </button>
  );

  // ============================================================================
  // RENDER
  // ============================================================================
  if (!product) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          />
          
          {/* Modal */}
          <motion.div
            variants={MODAL_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`
              fixed inset-4 md:inset-8 lg:inset-16 z-50 bg-white rounded-xl shadow-2xl 
              overflow-hidden flex flex-col max-w-4xl mx-auto max-h-[90vh] ${className}
            `}
          >
            {/* Header */}
            <div className="flex-shrink-0 p-6 border-b border-gray-200">
              {renderProductHeader()}
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                {/* Product Image */}
                {renderProductImage()}
                
                {/* Tab Navigation */}
                {renderTabNavigation()}
                
                {/* Tab Content */}
                <div className="mb-6">
                  {activeTab === 'description' && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">About This Item</h3>
                        <p className="text-gray-600 leading-relaxed">{product.longDescription || product.description}</p>
                      </div>
                      
                      {product.ingredients && (
                        <div>
                          <h3 className="font-semibold mb-2">Ingredients</h3>
                          <p className="text-gray-600 text-sm">{product.ingredients}</p>
                        </div>
                      )}
                      
                      {product.allergens && product.allergens.length > 0 && (
                        <Suspense fallback={<LoadingSpinner />}>
                          <AllergenInfo allergens={product.allergens} />
                        </Suspense>
                      )}
                    </div>
                  )}
                  
                  {activeTab === 'nutrition' && (
                    <Suspense fallback={<LoadingSpinner />}>
                      <NutritionPanel 
                        nutrition={product.nutrition}
                        expanded={nutritionExpanded}
                        onToggleExpanded={() => setNutritionExpanded(!nutritionExpanded)}
                      />
                    </Suspense>
                  )}
                  
                  {activeTab === 'reviews' && showReviews && (
                    <Suspense fallback={<LoadingSpinner />}>
                      <ReviewsSection 
                        reviews={reviews}
                        productId={product.id}
                        onReviewSubmitted={loadProductData}
                      />
                    </Suspense>
                  )}
                </div>
                
                {/* Size Selector */}
                {product.sizes && product.sizes.length > 0 && (
                  <div className="mb-6">
                    <Suspense fallback={<LoadingSpinner />}>
                      <SizeSelector
                        sizes={product.sizes}
                        selectedSize={selectedSize}
                        onSizeChange={handleSizeChange}
                      />
                    </Suspense>
                  </div>
                )}
                
                {/* Modifier Selector */}
                {product.modifierGroups && product.modifierGroups.length > 0 && (
                  <div className="mb-6">
                    <Suspense fallback={<LoadingSpinner />}>
                      <ModifierSelector
                        modifierGroups={product.modifierGroups}
                        selectedModifiers={selectedModifiers}
                        onModifierChange={handleModifierChange}
                      />
                    </Suspense>
                  </div>
                )}
                
                {/* Customization Panel */}
                {product.customizable && (
                  <div className="mb-6">
                    <Suspense fallback={<LoadingSpinner />}>
                      <CustomizationPanel
                        product={product}
                        customizations={customizations}
                        onCustomizationChange={handleCustomizationChange}
                      />
                    </Suspense>
                  </div>
                )}
                
                {/* Quantity Selector */}
                {renderQuantitySelector()}
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex-shrink-0 p-6 border-t border-gray-200 bg-gray-50">
              {renderAddToCartButton()}
            </div>
          </motion.div>
          
          {/* Lazy Loaded Modals */}
          {showImageGallery && (
            <Suspense fallback={null}>
              <ImageGallery
                images={product.images || [product.image]}
                productName={product.name}
                isOpen={showImageGallery}
                onClose={() => setShowImageGallery(false)}
              />
            </Suspense>
          )}
          
          {showShareModal && (
            <Suspense fallback={null}>
              <ShareModal
                product={product}
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
              />
            </Suspense>
          )}
          
          {showVoiceInterface && (
            <Suspense fallback={null}>
              <VoiceOrderInterface
                product={product}
                isOpen={showVoiceInterface}
                onClose={() => setShowVoiceInterface(false)}
                onOrderComplete={(voiceOrder) => {
                  setQuantity(voiceOrder.quantity || 1);
                  setSelectedSize(voiceOrder.size);
                  setSelectedModifiers(voiceOrder.modifiers || {});
                }}
              />
            </Suspense>
          )}
          
          {showQR && (
            <Suspense fallback={null}>
              <ProductQR
                product={product}
                isOpen={showQR}
                onClose={() => setShowQR(false)}
              />
            </Suspense>
          )}
        </>
      )}
    </AnimatePresence>
  );
};

export default ProductModal;