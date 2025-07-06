/**
 * EATECH - Customer Menu Component
 * Version: 6.0.0
 * Description: Hauptmenü-Seite für Kunden mit Lazy Loading für bessere Performance
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /src/pages/customer/CustomerMenu.jsx
 */

import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, Filter, ShoppingCart, Plus, Minus, Star,
    Clock, Info, ChevronDown, X, Sparkles, Flame, Leaf, Heart
} from 'lucide-react';

// Hooks & Contexts
import { useTenant } from '../../contexts/TenantContext';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';

// Lazy loaded components
const ProductModal = lazy(() => import('../../components/customer/ProductModal'));
const CategoryFilter = lazy(() => import('../../components/customer/CategoryFilter'));
const SearchBar = lazy(() => import('../../components/customer/SearchBar'));
const CartSummary = lazy(() => import('../../components/customer/CartSummary'));
const EmptyState = lazy(() => import('../../components/common/EmptyState'));
const ProductSkeleton = lazy(() => import('../../components/skeletons/ProductSkeleton'));
const ErrorBoundary = lazy(() => import('../../components/common/ErrorBoundary'));

// Lazy loaded services
const FirebaseService = lazy(() => import('../../config/firebase'));
const FormattersService = lazy(() => import('../../utils/formatters'));
const MonitoringService = lazy(() => import('../../utils/monitoring'));
const VoiceCommandsHook = lazy(() => import('../../hooks/useVoiceCommands'));

// Loading component
const LoadingSpinner = () => (
    <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
);

// Styles
import styles from './CustomerMenu.module.css';

// Constants
const SORT_OPTIONS = [
    { value: 'popular', label: 'Beliebteste', icon: Star },
    { value: 'price-asc', label: 'Preis aufsteigend', icon: ChevronDown },
    { value: 'price-desc', label: 'Preis absteigend', icon: ChevronDown },
    { value: 'time', label: 'Schnellste', icon: Clock },
    { value: 'new', label: 'Neuheiten', icon: Sparkles }
];

const DIETARY_FILTERS = [
    { value: 'vegetarian', label: 'Vegetarisch', icon: Leaf, color: 'green' },
    { value: 'vegan', label: 'Vegan', icon: Heart, color: 'green' },
    { value: 'spicy', label: 'Scharf', icon: Flame, color: 'red' }
];

const CustomerMenu = () => {
    // State Management
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('popular');
    const [dietaryFilters, setDietaryFilters] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showProductModal, setShowProductModal] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const [services, setServices] = useState({});

    // Hooks
    const navigate = useNavigate();
    const { tenant } = useTenant();
    const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
    const { user } = useAuth();

    // Load services on mount
    useEffect(() => {
        const loadServices = async () => {
            try {
                const [firebase, formatters, monitoring] = await Promise.all([
                    import('../../config/firebase'),
                    import('../../utils/formatters'),
                    import('../../utils/monitoring')
                ]);
                setServices({ firebase, formatters, monitoring });
            } catch (error) {
                console.error('Failed to load services:', error);
            }
        };
        loadServices();
    }, []);

    // Load voice commands if enabled
    useEffect(() => {
        if (voiceEnabled && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
            import('../../hooks/useVoiceCommands').then(module => {
                const useVoiceCommands = module.default;
                // Initialize voice commands
            });
        }
    }, [voiceEnabled]);

    // Data fetching
    useEffect(() => {
        const loadMenuData = async () => {
            if (!tenant?.id || !services.firebase) return;

            try {
                setLoading(true);
                setError(null);

                const { database, dbRef, onValue } = services.firebase;
                const productsRef = dbRef(database, `tenants/${tenant.id}/products`);
                
                const unsubscribe = onValue(productsRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        const productList = Object.entries(data)
                            .map(([id, product]) => ({
                                id,
                                ...product,
                                rating: product.rating || 4.5,
                                orderCount: product.orderCount || 0,
                                prepTime: product.prepTime || 15
                            }))
                            .filter(product => product.active && product.available);
                        
                        setProducts(productList);
                        const uniqueCategories = [...new Set(productList.map(p => p.category))];
                        setCategories(uniqueCategories.filter(Boolean));
                    }
                    setLoading(false);
                }, (error) => {
                    console.error('Error loading products:', error);
                    setError('Fehler beim Laden der Produkte');
                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error('Error in loadMenuData:', error);
                setError('Fehler beim Laden der Daten');
                setLoading(false);
            }
        };

        loadMenuData();
    }, [tenant?.id, services.firebase]);

    // Filtering & Sorting
    const filteredAndSortedProducts = useMemo(() => {
        let filtered = [...products];

        if (selectedCategory && selectedCategory !== 'all') {
            filtered = filtered.filter(p => p.category === selectedCategory);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(query) ||
                p.description?.toLowerCase().includes(query)
            );
        }

        if (dietaryFilters.length > 0) {
            filtered = filtered.filter(p => 
                dietaryFilters.every(filter => p.dietary?.[filter])
            );
        }

        switch (sortBy) {
            case 'popular':
                filtered.sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));
                break;
            case 'price-asc':
                filtered.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                filtered.sort((a, b) => b.price - a.price);
                break;
            case 'time':
                filtered.sort((a, b) => (a.prepTime || 15) - (b.prepTime || 15));
                break;
            case 'new':
                filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                break;
        }

        return filtered;
    }, [products, selectedCategory, searchQuery, dietaryFilters, sortBy]);

    // Handlers
    const handleAddToCart = useCallback(async (product, quantity = 1) => {
        try {
            if (services.monitoring) {
                services.monitoring.trackInteraction('add_to_cart', {
                    productId: product.id,
                    productName: product.name,
                    quantity,
                    price: product.price
                });
            }

            addToCart({ ...product, quantity });

            const toast = await import('react-hot-toast');
            toast.default.success(`${product.name} zum Warenkorb hinzugefügt`);
        } catch (error) {
            console.error('Error adding to cart:', error);
        }
    }, [addToCart, services.monitoring]);

    const handleQuantityChange = useCallback((productId, change) => {
        const cartItem = cart.find(item => item.id === productId);
        if (!cartItem) return;

        const newQuantity = cartItem.quantity + change;
        if (newQuantity <= 0) {
            removeFromCart(productId);
        } else {
            updateQuantity(productId, newQuantity);
        }
    }, [cart, updateQuantity, removeFromCart]);

    const handleProductClick = useCallback((product) => {
        setSelectedProduct(product);
        setShowProductModal(true);
    }, []);

    const toggleDietaryFilter = useCallback((filter) => {
        setDietaryFilters(prev => 
            prev.includes(filter)
                ? prev.filter(f => f !== filter)
                : [...prev, filter]
        );
    }, []);

    const getCartQuantity = useCallback((productId) => {
        const item = cart.find(item => item.id === productId);
        return item?.quantity || 0;
    }, [cart]);

    // Render Product Card
    const renderProduct = useCallback((product) => {
        const quantity = getCartQuantity(product.id);
        const isInCart = quantity > 0;

        return (
            <motion.article
                key={product.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={styles.productCard}
                onClick={() => handleProductClick(product)}
            >
                <div className={styles.productImage}>
                    {product.imageUrl ? (
                        <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            loading="lazy"
                            onError={(e) => {
                                e.target.src = '/images/placeholder-food.jpg';
                            }}
                        />
                    ) : (
                        <div className={styles.imagePlaceholder}>
                            <ShoppingCart size={32} />
                        </div>
                    )}
                    
                    <div className={styles.badges}>
                        {product.isNew && (
                            <span className={styles.badgeNew}>
                                <Sparkles size={12} /> Neu
                            </span>
                        )}
                        {product.isPopular && (
                            <span className={styles.badgePopular}>
                                <Star size={12} /> Beliebt
                            </span>
                        )}
                    </div>
                </div>

                <div className={styles.productInfo}>
                    <h3 className={styles.productName}>{product.name}</h3>
                    <p className={styles.productDescription}>{product.description}</p>
                    
                    <div className={styles.productMeta}>
                        <span className={styles.prepTime}>
                            <Clock size={14} />
                            {services.formatters?.formatWaitTime(product.prepTime) || `${product.prepTime} min`}
                        </span>
                        {product.rating && (
                            <span className={styles.rating}>
                                <Star size={14} fill="currentColor" />
                                {product.rating.toFixed(1)}
                            </span>
                        )}
                    </div>
                </div>

                <div className={styles.productActions}>
                    <div className={styles.price}>
                        {services.formatters?.formatCurrency(product.price) || `CHF ${product.price.toFixed(2)}`}
                    </div>
                    
                    <div className={styles.cartActions} onClick={(e) => e.stopPropagation()}>
                        {isInCart ? (
                            <div className={styles.quantityControls}>
                                <button
                                    className={styles.quantityButton}
                                    onClick={() => handleQuantityChange(product.id, -1)}
                                    aria-label="Weniger"
                                >
                                    <Minus size={16} />
                                </button>
                                <span className={styles.quantity}>{quantity}</span>
                                <button
                                    className={styles.quantityButton}
                                    onClick={() => handleQuantityChange(product.id, 1)}
                                    aria-label="Mehr"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        ) : (
                            <button
                                className={styles.addButton}
                                onClick={() => handleAddToCart(product)}
                                aria-label="In den Warenkorb"
                            >
                                <Plus size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </motion.article>
        );
    }, [cart, services.formatters, handleProductClick, handleAddToCart, handleQuantityChange, getCartQuantity]);

    // Main Render
    if (error) {
        return (
            <Suspense fallback={<LoadingSpinner />}>
                <ErrorBoundary>
                    <div className={styles.errorContainer}>
                        <p>{error}</p>
                        <button onClick={() => window.location.reload()}>
                            Neu laden
                        </button>
                    </div>
                </ErrorBoundary>
            </Suspense>
        );
    }

    return (
        <Suspense fallback={<LoadingSpinner />}>
            <ErrorBoundary>
                <div className={styles.menuContainer}>
                    <header className={styles.menuHeader}>
                        <div className={styles.headerContent}>
                            <h1 className={styles.title}>{tenant?.name || 'Menu'}</h1>
                            {tenant?.description && (
                                <p className={styles.subtitle}>{tenant.description}</p>
                            )}
                        </div>

                        <div className={styles.controls}>
                            <Suspense fallback={<div className={styles.searchSkeleton} />}>
                                <SearchBar
                                    value={searchQuery}
                                    onChange={setSearchQuery}
                                    placeholder="Suche nach Gerichten..."
                                />
                            </Suspense>

                            <button
                                className={styles.filterButton}
                                onClick={() => setShowFilters(!showFilters)}
                                aria-label="Filter"
                            >
                                <Filter size={20} />
                                {dietaryFilters.length > 0 && (
                                    <span className={styles.filterBadge}>
                                        {dietaryFilters.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </header>

                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className={styles.filtersPanel}
                            >
                                <div className={styles.filterGroup}>
                                    <label>Sortieren nach:</label>
                                    <div className={styles.sortOptions}>
                                        {SORT_OPTIONS.map(option => (
                                            <button
                                                key={option.value}
                                                className={`${styles.sortButton} ${
                                                    sortBy === option.value ? styles.active : ''
                                                }`}
                                                onClick={() => setSortBy(option.value)}
                                            >
                                                <option.icon size={16} />
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className={styles.filterGroup}>
                                    <label>Ernährung:</label>
                                    <div className={styles.dietaryOptions}>
                                        {DIETARY_FILTERS.map(filter => (
                                            <button
                                                key={filter.value}
                                                className={`${styles.dietaryButton} ${
                                                    dietaryFilters.includes(filter.value) ? styles.active : ''
                                                }`}
                                                onClick={() => toggleDietaryFilter(filter.value)}
                                            >
                                                <filter.icon size={16} />
                                                {filter.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {categories.length > 0 && (
                        <Suspense fallback={<div className={styles.categorySkeleton} />}>
                            <CategoryFilter
                                categories={categories}
                                selectedCategory={selectedCategory}
                                onSelectCategory={setSelectedCategory}
                            />
                        </Suspense>
                    )}

                    <main className={styles.productsSection}>
                        {loading ? (
                            <div className={styles.productsGrid}>
                                {[...Array(6)].map((_, i) => (
                                    <Suspense key={i} fallback={<div className={styles.skeleton} />}>
                                        <ProductSkeleton />
                                    </Suspense>
                                ))}
                            </div>
                        ) : filteredAndSortedProducts.length === 0 ? (
                            <Suspense fallback={<div />}>
                                <EmptyState
                                    icon={Search}
                                    title="Keine Produkte gefunden"
                                    description={
                                        searchQuery
                                            ? `Keine Ergebnisse für "${searchQuery}"`
                                            : 'In dieser Kategorie sind keine Produkte verfügbar'
                                    }
                                    action={
                                        searchQuery && (
                                            <button
                                                className={styles.clearButton}
                                                onClick={() => {
                                                    setSearchQuery('');
                                                    setSelectedCategory('all');
                                                    setDietaryFilters([]);
                                                }}
                                            >
                                                Filter zurücksetzen
                                            </button>
                                        )
                                    }
                                />
                            </Suspense>
                        ) : (
                            <div className={styles.productsGrid}>
                                <AnimatePresence>
                                    {filteredAndSortedProducts.map(renderProduct)}
                                </AnimatePresence>
                            </div>
                        )}
                    </main>

                    {cart.length > 0 && (
                        <Suspense fallback={<div className={styles.cartSummarySkeleton} />}>
                            <CartSummary
                                cart={cart}
                                onCheckout={() => navigate('/checkout')}
                            />
                        </Suspense>
                    )}

                    {showProductModal && selectedProduct && (
                        <Suspense fallback={<LoadingSpinner />}>
                            <ProductModal
                                product={selectedProduct}
                                onClose={() => {
                                    setShowProductModal(false);
                                    setSelectedProduct(null);
                                }}
                                onAddToCart={handleAddToCart}
                            />
                        </Suspense>
                    )}
                </div>
            </ErrorBoundary>
        </Suspense>
    );
};

export default CustomerMenu;