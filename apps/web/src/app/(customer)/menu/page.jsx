/**
 * EATECH - Customer Menu Page mit Firebase
 * Version: 17.0.0
 * Description: Menü-Seite mit echten Produktdaten aus Firebase
 * Author: EATECH Development Team
 * Created: 2025-07-05
 * File Path: /apps/web/src/app/(customer)/menu/page.jsx
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  ShoppingCart, 
  Plus, 
  Star, 
  Clock, 
  Flame,
  Leaf,
  Info,
  X,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useProducts } from '@eatech/core/hooks/useProducts';
import styles from './Menu.module.css';

// ============================================================================
// PRODUCT DETAIL MODAL
// ============================================================================

const ProductDetailModal = ({ product, onClose, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [adding, setAdding] = useState(false);

  const totalPrice = product.price * quantity;

  const handleAddToCart = async () => {
    setAdding(true);
    
    const cartItem = {
      ...product,
      quantity,
      selectedOptions,
      specialInstructions,
      addedAt: new Date().toISOString()
    };
    
    await onAddToCart(cartItem);
    
    // Kurze Animation zeigen
    setTimeout(() => {
      onClose();
    }, 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={styles.modalOverlay}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button onClick={onClose} className={styles.closeButton}>
          <X size={24} />
        </button>

        {/* Product Image */}
        <div className={styles.modalImage}>
          <img src={product.imageUrl || '/placeholder-food.jpg'} alt={product.name} />
          {product.featured && (
            <span className={styles.featuredBadge}>
              <Star size={16} />
              Empfohlen
            </span>
          )}
        </div>

        {/* Product Info */}
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h2>{product.name}</h2>
            <p className={styles.modalPrice}>CHF {product.price.toFixed(2)}</p>
          </div>

          <p className={styles.modalDescription}>{product.description}</p>

          {/* Ingredients */}
          {product.ingredients?.length > 0 && (
            <div className={styles.ingredients}>
              <h3>Zutaten</h3>
              <p>{product.ingredients.join(', ')}</p>
            </div>
          )}

          {/* Allergens */}
          {product.allergens?.length > 0 && (
            <div className={styles.allergens}>
              <h3>
                <AlertCircle size={16} />
                Allergene
              </h3>
              <div className={styles.allergenTags}>
                {product.allergens.map(allergen => (
                  <span key={allergen} className={styles.allergenTag}>
                    {allergen}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className={styles.metadata}>
            {product.preparationTime && (
              <span>
                <Clock size={16} />
                {product.preparationTime} Min
              </span>
            )}
            {product.spicyLevel > 0 && (
              <span className={styles.spicy}>
                <Flame size={16} />
                {Array(product.spicyLevel).fill('🌶️').join('')}
              </span>
            )}
            {product.vegetarian && (
              <span className={styles.vegetarian}>
                <Leaf size={16} />
                Vegetarisch
              </span>
            )}
          </div>

          {/* Special Instructions */}
          <div className={styles.specialInstructions}>
            <label>Spezielle Wünsche (optional)</label>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="z.B. ohne Zwiebeln, extra scharf..."
              rows="3"
            />
          </div>

          {/* Quantity & Add to Cart */}
          <div className={styles.modalFooter}>
            <div className={styles.quantitySelector}>
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                −
              </button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)}>
                +
              </button>
            </div>

            <button 
              onClick={handleAddToCart}
              className={styles.addToCartButton}
              disabled={adding || (product.stock?.enabled && product.stock?.quantity < quantity)}
            >
              {adding ? (
                <>
                  <Loader2 size={20} className={styles.spinner} />
                  Wird hinzugefügt...
                </>
              ) : (
                <>
                  <ShoppingCart size={20} />
                  CHF {totalPrice.toFixed(2)} hinzufügen
                </>
              )}
            </button>
          </div>

          {/* Stock Warning */}
          {product.stock?.enabled && product.stock?.quantity < 10 && (
            <p className={styles.stockWarning}>
              Nur noch {product.stock.quantity} verfügbar!
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const MenuPage = () => {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Hooks
  const { addToCart } = useCart();
  const { 
    products, 
    loading, 
    error, 
    refresh 
  } = useProducts({ 
    realtime: true,
    includeUnavailable: false 
  });

  // Categories mit Icons
  const categories = [
    { id: 'all', name: 'Alle', icon: '🍽️', count: products.length },
    { id: 'burger', name: 'Burger', icon: '🍔', count: 0 },
    { id: 'pizza', name: 'Pizza', icon: '🍕', count: 0 },
    { id: 'salat', name: 'Salate', icon: '🥗', count: 0 },
    { id: 'getraenke', name: 'Getränke', icon: '🥤', count: 0 },
    { id: 'dessert', name: 'Desserts', icon: '🍰', count: 0 },
    { id: 'beilage', name: 'Beilagen', icon: '🍟', count: 0 }
  ];

  // Count products per category
  useEffect(() => {
    categories.forEach(cat => {
      if (cat.id !== 'all') {
        cat.count = products.filter(p => p.category === cat.id).length;
      }
    });
  }, [products]);

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory && product.available;
  });

  // Group products by category
  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const category = product.category || 'andere';
    if (!acc[category]) acc[category] = [];
    acc[category].push(product);
    return acc;
  }, {});

  // Handle add to cart
  const handleAddToCart = async (item) => {
    addToCart(item);
    setShowSuccessToast(true);
    
    // Hide toast after 3 seconds
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 3000);
  };

  // Loading state
  if (loading && products.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 size={48} className={styles.spinner} />
        <p>Menü wird geladen...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle size={48} />
        <h2>Fehler beim Laden des Menüs</h2>
        <p>{error}</p>
        <button onClick={refresh} className={styles.retryButton}>
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div className={styles.menuPage}>
      {/* Header */}
      <div className={styles.header}>
        <h1>Unser Menü</h1>
        <p>Frisch zubereitet mit Liebe</p>
      </div>

      {/* Search & Filter Bar */}
      <div className={styles.controlBar}>
        <div className={styles.searchBox}>
          <Search size={20} />
          <input
            type="text"
            placeholder="Suche nach Gerichten..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={styles.filterButton}
        >
          <Filter size={20} />
          Filter
        </button>
      </div>

      {/* Categories */}
      <div className={styles.categories}>
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`${styles.categoryButton} ${
              selectedCategory === category.id ? styles.active : ''
            }`}
          >
            <span className={styles.categoryIcon}>{category.icon}</span>
            <span>{category.name}</span>
            {category.count > 0 && (
              <span className={styles.categoryCount}>{category.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Products */}
      {selectedCategory === 'all' ? (
        // Show grouped by category
        Object.entries(groupedProducts).map(([category, categoryProducts]) => (
          <div key={category} className={styles.categorySection}>
            <h2 className={styles.categoryTitle}>
              {categories.find(c => c.id === category)?.name || category}
            </h2>
            <div className={styles.productsGrid}>
              {categoryProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={() => setSelectedProduct(product)}
                  onQuickAdd={() => handleAddToCart({ ...product, quantity: 1 })}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        // Show single category
        <div className={styles.productsGrid}>
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={() => setSelectedProduct(product)}
              onQuickAdd={() => handleAddToCart({ ...product, quantity: 1 })}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className={styles.emptyState}>
          <p>Keine Produkte gefunden</p>
          <button onClick={() => {
            setSearchTerm('');
            setSelectedCategory('all');
          }}>
            Filter zurücksetzen
          </button>
        </div>
      )}

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={handleAddToCart}
          />
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={styles.successToast}
          >
            <Check size={20} />
            <span>Zum Warenkorb hinzugefügt!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// PRODUCT CARD COMPONENT
// ============================================================================

const ProductCard = ({ product, onSelect, onQuickAdd }) => {
  const [isAdding, setIsAdding] = useState(false);

  const handleQuickAdd = async (e) => {
    e.stopPropagation();
    setIsAdding(true);
    await onQuickAdd();
    
    setTimeout(() => {
      setIsAdding(false);
    }, 1000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      className={styles.productCard}
      onClick={onSelect}
    >
      {/* Product Image */}
      <div className={styles.productImage}>
        <img 
          src={product.imageUrl || '/placeholder-food.jpg'} 
          alt={product.name}
          loading="lazy"
        />
        {product.featured && (
          <span className={styles.badge}>
            <Star size={14} />
            Beliebt
          </span>
        )}
        {product.stock?.enabled && product.stock?.quantity < 5 && (
          <span className={styles.stockBadge}>
            Nur noch {product.stock.quantity}!
          </span>
        )}
      </div>

      {/* Product Info */}
      <div className={styles.productInfo}>
        <h3>{product.name}</h3>
        <p className={styles.description}>{product.description}</p>
        
        {/* Meta Info */}
        <div className={styles.metaInfo}>
          {product.preparationTime && (
            <span>
              <Clock size={14} />
              {product.preparationTime} Min
            </span>
          )}
          {product.spicyLevel > 0 && (
            <span className={styles.spicy}>
              {Array(product.spicyLevel).fill('🌶️').join('')}
            </span>
          )}
        </div>
        
        {/* Price & Action */}
        <div className={styles.productFooter}>
          <span className={styles.price}>CHF {product.price.toFixed(2)}</span>
          <button 
            onClick={handleQuickAdd}
            className={`${styles.quickAddButton} ${isAdding ? styles.adding : ''}`}
            disabled={product.stock?.enabled && product.stock?.quantity === 0}
          >
            {isAdding ? (
              <Check size={20} />
            ) : (
              <Plus size={20} />
            )}
          </button>
        </div>
      </div>

      {/* Out of Stock Overlay */}
      {product.stock?.enabled && product.stock?.quantity === 0 && (
        <div className={styles.outOfStock}>
          <span>Ausverkauft</span>
        </div>
      )}
    </motion.div>
  );
};

export default MenuPage;