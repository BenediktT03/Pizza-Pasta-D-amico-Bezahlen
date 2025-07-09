/**
 * EATECH Menu List Component
 * 
 * Hauptkomponente für die digitale Speisekarte.
 * Features:
 * - Mehrsprachige Menüs (DE/FR/IT/EN)
 * - Allergen-Anzeige (14 EU Allergene)
 * - Kategorisierte Darstellung
 * - Produktbilder mit Lazy Loading
 * - Echtzeit-Verfügbarkeit
 * - Voice-Bestellung Integration
 * - Feature Flags für optionale Funktionen
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCartIcon, 
  MicrophoneIcon, 
  InformationCircleIcon,
  ClockIcon,
  FireIcon,
  StarIcon,
  LeafIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';

// Core imports
import { useFeatureFlag } from '@eatech/core/hooks/useFeatureFlag';
import { useTruck } from '@eatech/core/hooks/useTruck';
import { useCart } from '@eatech/core/hooks/useCart';
import { formatPrice } from '@eatech/core/utils/formatters';
import { Product, Category, Allergen } from '@eatech/types';

// UI imports
import { Card, Button, Badge, Skeleton, Alert } from '@eatech/ui';

// Local components
import { ProductCard } from './components/ProductCard';
import { CategoryFilter } from './components/CategoryFilter';
import { AllergenFilter } from './components/AllergenFilter';
import { SearchBar } from './components/SearchBar';
import { MenuHeader } from './components/MenuHeader';
import { ProductModal } from './components/ProductModal';
import { VoiceOrderButton } from '../voice/components/VoiceOrderButton';

// Services
import { menuService } from '../../services/menu.service';
import { analyticsService } from '../../services/analytics.service';

// Styles
import styles from './MenuList.module.css';

interface MenuListProps {
  embedded?: boolean;
  onProductSelect?: (product: Product) => void;
}

export const MenuList: React.FC<MenuListProps> = ({ 
  embedded = false, 
  onProductSelect 
}) => {
  const { t, i18n } = useTranslation();
  const { truckId } = useParams<{ truckId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Feature Flags
  const { enabled: voiceEnabled } = useFeatureFlag('voice_ordering');
  const { enabled: allergensEnabled } = useFeatureFlag('allergen_display');
  const { enabled: nutritionEnabled } = useFeatureFlag('nutrition_info');
  const { enabled: dynamicPricingEnabled } = useFeatureFlag('dynamic_pricing');
  const { enabled: productImagesEnabled } = useFeatureFlag('product_images');
  const { enabled: modifiersEnabled } = useFeatureFlag('product_modifiers');
  const { enabled: favoritesEnabled } = useFeatureFlag('favorites_system');
  const { enabled: smartNotificationsEnabled } = useFeatureFlag('smart_notifications');
  
  // State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isVoiceOrdering, setIsVoiceOrdering] = useState(false);
  
  // Hooks
  const { truck, isLoading: truckLoading } = useTruck(truckId!);
  const { addToCart, isItemInCart } = useCart();
  
  // Load menu data
  const { 
    data: menuData, 
    isLoading: menuLoading,
    error: menuError,
    refetch 
  } = useQuery({
    queryKey: ['menu', truckId, i18n.language],
    queryFn: () => menuService.getMenu(truckId!, i18n.language),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute for availability
    enabled: !!truckId
  });
  
  // Categories with translations
  const categories = useMemo(() => {
    if (!menuData?.categories) return [];
    
    return [
      { id: 'all', name: t('menu.allCategories'), icon: '🍽️' },
      ...menuData.categories.map((cat: Category) => ({
        ...cat,
        name: cat.name[i18n.language] || cat.name.de
      }))
    ];
  }, [menuData, i18n.language, t]);
  
  // Filter products
  const filteredProducts = useMemo(() => {
    if (!menuData?.products) return [];
    
    let products = [...menuData.products];
    
    // Category filter
    if (selectedCategory !== 'all') {
      products = products.filter(p => p.category === selectedCategory);
    }
    
    // Allergen filter
    if (allergensEnabled && selectedAllergens.length > 0) {
      products = products.filter(p => 
        !p.allergens.some(a => selectedAllergens.includes(a))
      );
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      products = products.filter(p => {
        const name = (p.name[i18n.language] || p.name.de).toLowerCase();
        const description = (p.description[i18n.language] || p.description.de || '').toLowerCase();
        return name.includes(query) || description.includes(query);
      });
    }
    
    // Sort by availability first, then by featured, then by sort order
    products.sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1;
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
    
    return products;
  }, [menuData, selectedCategory, selectedAllergens, searchQuery, i18n.language, allergensEnabled]);
  
  // Track menu view
  useEffect(() => {
    if (truckId && menuData) {
      analyticsService.trackEvent('menu_viewed', {
        truckId,
        language: i18n.language,
        productCount: menuData.products.length,
        categoryCount: menuData.categories.length
      });
    }
  }, [truckId, menuData, i18n.language]);
  
  // Handle product click
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    
    analyticsService.trackEvent('product_clicked', {
      productId: product.id,
      productName: product.name[i18n.language] || product.name.de,
      category: product.category,
      price: product.price
    });
    
    if (onProductSelect) {
      onProductSelect(product);
    }
  };
  
  // Handle add to cart
  const handleAddToCart = (product: Product, options?: any) => {
    addToCart({
      product,
      quantity: options?.quantity || 1,
      modifiers: options?.modifiers || [],
      specialInstructions: options?.specialInstructions || ''
    });
    
    analyticsService.trackConversion('added_to_cart', {
      productId: product.id,
      price: product.price,
      quantity: options?.quantity || 1
    });
    
    // Close modal after adding
    setSelectedProduct(null);
  };
  
  // Loading state
  if (truckLoading || menuLoading) {
    return (
      <div className={styles.menuContainer}>
        <Skeleton className="h-32 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }
  
  // Error state
  if (menuError || !truck) {
    return (
      <div className={styles.menuContainer}>
        <Alert variant="error">
          <h3>{t('menu.errorLoadingMenu')}</h3>
          <p>{t('menu.tryAgainLater')}</p>
          <Button onClick={() => refetch()} className="mt-4">
            {t('common.retry')}
          </Button>
        </Alert>
      </div>
    );
  }
  
  // No products
  if (!menuData?.products || menuData.products.length === 0) {
    return (
      <div className={styles.menuContainer}>
        <Alert variant="info">
          <h3>{t('menu.noProductsAvailable')}</h3>
          <p>{t('menu.checkBackLater')}</p>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className={styles.menuContainer}>
      {/* Header */}
      {!embedded && (
        <MenuHeader 
          truck={truck}
          onVoiceOrder={voiceEnabled ? () => setIsVoiceOrdering(true) : undefined}
        />
      )}
      
      {/* Filters */}
      <div className={styles.filters}>
        {/* Search */}
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t('menu.searchProducts')}
        />
        
        {/* Categories */}
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onChange={setSelectedCategory}
        />
        
        {/* Allergens */}
        {allergensEnabled && (
          <AllergenFilter
            selectedAllergens={selectedAllergens}
            onChange={setSelectedAllergens}
          />
        )}
      </div>
      
      {/* Special Banners */}
      {dynamicPricingEnabled && menuData.rushHourActive && (
        <Alert variant="warning" className="mb-4">
          <FireIcon className="w-5 h-5" />
          <span>{t('menu.rushHourPricing')}</span>
        </Alert>
      )}
      
      {/* Products Grid */}
      <motion.div 
        className={styles.productsGrid}
        layout
      >
        <AnimatePresence mode="popLayout">
          {filteredProducts.map((product) => (
            <motion.div
              key={product.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <ProductCard
                product={product}
                onClick={() => handleProductClick(product)}
                onQuickAdd={() => handleAddToCart(product)}
                isInCart={isItemInCart(product.id)}
                showImage={productImagesEnabled}
                showAllergens={allergensEnabled}
                showNutrition={nutritionEnabled}
                language={i18n.language}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      
      {/* No results */}
      {filteredProducts.length === 0 && (
        <div className={styles.noResults}>
          <p>{t('menu.noProductsMatchFilter')}</p>
          <Button 
            variant="secondary" 
            onClick={() => {
              setSelectedCategory('all');
              setSelectedAllergens([]);
              setSearchQuery('');
            }}
          >
            {t('menu.clearFilters')}
          </Button>
        </div>
      )}
      
      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={handleAddToCart}
            showModifiers={modifiersEnabled}
            showNutrition={nutritionEnabled}
            showAllergens={allergensEnabled}
            language={i18n.language}
          />
        )}
      </AnimatePresence>
      
      {/* Voice Order Modal */}
      {voiceEnabled && isVoiceOrdering && (
        <VoiceOrderModal
          truckId={truckId!}
          products={menuData.products}
          onClose={() => setIsVoiceOrdering(false)}
          onOrderComplete={(items) => {
            items.forEach(item => {
              addToCart({
                product: item.product,
                quantity: item.quantity,
                modifiers: item.modifiers,
                specialInstructions: item.specialInstructions
              });
            });
            setIsVoiceOrdering(false);
          }}
        />
      )}
      
      {/* Floating Voice Button */}
      {voiceEnabled && !embedded && (
        <VoiceOrderButton
          onClick={() => setIsVoiceOrdering(true)}
          className={styles.floatingVoiceButton}
        />
      )}
    </div>
  );
};

// Sub-components (würden normalerweise in separate Dateien)
const VoiceOrderModal = React.lazy(() => import('../voice/VoiceOrderModal'));

// Exports
export default MenuList;