/**
 * EATECH - Customer Menu Component
 * Version: 5.0.0
 * Description: Hauptmenü-Seite für Kunden mit Produktanzeige,
 *              Filterung, Suche und Warenkorb-Integration
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 * File Path: /src/pages/customer/CustomerMenu.jsx
 */

// ============================================================================
// IMPORTS
// ============================================================================
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, 
    Filter, 
    ShoppingCart, 
    Plus, 
    Minus, 
    Star,
    Clock,
    Info,
    ChevronDown,
    X,
    Sparkles,
    Flame,
    Leaf,
    Heart
} from 'lucide-react';

// Hooks & Contexts
import { useTenant } from '../../contexts/TenantContext';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useVoiceCommands } from '../../hooks/useVoiceCommands';

// Services
import { database, dbRef, onValue } from '../../config/firebase';

// Utils
import { formatCurrency, formatWaitTime } from '../../utils/formatters';
import { trackInteraction } from '../../utils/monitoring';

// Components
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ProductModal from '../../components/customer/ProductModal';
import CategoryFilter from '../../components/customer/CategoryFilter';

// Styles
import styles from './CustomerMenu.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const SORT_OPTIONS = {
    popularity: 'Beliebtheit',
    price_asc: 'Preis aufsteigend',
    price_desc: 'Preis absteigend',
    name: 'Name A-Z',
    newest: 'Neueste zuerst'
};

const DIETARY_FILTERS = {
    vegetarian: { label: 'Vegetarisch', icon: Leaf },
    vegan: { label: 'Vegan', icon: Leaf },
    glutenFree: { label: 'Glutenfrei', icon: Info },
    spicy: { label: 'Scharf', icon: Flame }
};

// ============================================================================
// COMPONENT
// ============================================================================
const CustomerMenu = () => {
    const navigate = useNavigate();
    const { tenant } = useTenant();
    const { addItem, updateQuantity, getItemQuantity, cartItems } = useCart();
    const { user } = useAuth();
    
    // State
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedDietary, setSelectedDietary] = useState([]);
    const [sortBy, setSortBy] = useState('popularity');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [businessInfo, setBusinessInfo] = useState(null);
    
    // Voice Commands
    const voiceCommands = {
        'zeige pizzas': () => setSelectedCategory('pizza'),
        'zeige getränke': () => setSelectedCategory('drinks'),
        'zur kasse': () => navigate('/checkout'),
        'suche *': (transcript) => {
            const searchQuery = transcript.replace('suche ', '');
            setSearchTerm(searchQuery);
        }
    };
    
    const { isListening, startListening, stopListening } = useVoiceCommands(voiceCommands);
    
    // ============================================================================
    // DATA LOADING
    // ============================================================================
    
    useEffect(() => {
        if (!tenant?.id) return;
        
        // Load products
        const productsRef = dbRef(`tenants/${tenant.id}/products`);
        const productsUnsubscribe = onValue(productsRef, (snapshot) => {
            const data = snapshot.val() || {};
            const productList = Object.entries(data)
                .map(([id, product]) => ({
                    id,
                    ...product
                }))
                .filter(product => product.active && product.available);
                
            setProducts(productList);
            
            // Extract categories
            const uniqueCategories = [...new Set(productList.map(p => p.category))];
            setCategories(uniqueCategories);
            
            setLoading(false);
        });
        
        // Load business info
        const businessRef = dbRef(`tenants/${tenant.id}/businessInfo`);
        const businessUnsubscribe = onValue(businessRef, (snapshot) => {
            setBusinessInfo(snapshot.val());
        });
        
        return () => {
            productsUnsubscribe();
            businessUnsubscribe();
        };
    }, [tenant]);
    
    // ============================================================================
    // FILTERING & SORTING
    // ============================================================================
    
    const filteredAndSortedProducts = useMemo(() => {
        let filtered = products;
        
        // Category filter
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(p => p.category === selectedCategory);
        }
        
        // Search filter
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(search) ||
                p.description?.toLowerCase().includes(search) ||
                p.tags?.some(tag => tag.toLowerCase().includes(search))
            );
        }
        
        // Dietary filters
        if (selectedDietary.length > 0) {
            filtered = filtered.filter(p => 
                selectedDietary.every(diet => p.dietary?.[diet])
            );
        }
        
        // Sorting
        const sorted = [...filtered];
        switch (sortBy) {
            case 'popularity':
                sorted.sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));
                break;
            case 'price_asc':
                sorted.sort((a, b) => a.price - b.price);
                break;
            case 'price_desc':
                sorted.sort((a, b) => b.price - a.price);
                break;
            case 'name':
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'newest':
                sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                break;
        }
        
        return sorted;
    }, [products, selectedCategory, searchTerm, selectedDietary, sortBy]);
    
    // ============================================================================
    // HANDLERS
    // ============================================================================
    
    const handleAddToCart = useCallback((product, quantity = 1) => {
        addItem(product, quantity);
        trackInteraction('add_to_cart', 'menu', {
            product_id: product.id,
            product_name: product.name,
            quantity
        });
    }, [addItem]);
    
    const handleUpdateQuantity = useCallback((productId, quantity) => {
        updateQuantity(productId, quantity);
    }, [updateQuantity]);
    
    const toggleDietaryFilter = (diet) => {
        setSelectedDietary(prev => 
            prev.includes(diet) 
                ? prev.filter(d => d !== diet)
                : [...prev, diet]
        );
    };
    
    // ============================================================================
    // RENDER HELPERS
    // ============================================================================
    
    const renderHeader = () => (
        <div className={styles.header}>
            <div className={styles.businessInfo}>
                <h1 className={styles.businessName}>{tenant?.name}</h1>
                {businessInfo && (
                    <div className={styles.businessMeta}>
                        {businessInfo.isOpen ? (
                            <span className={styles.openStatus}>
                                <span className={styles.openDot} />
                                Geöffnet
                            </span>
                        ) : (
                            <span className={styles.closedStatus}>
                                <span className={styles.closedDot} />
                                Geschlossen
                            </span>
                        )}
                        {businessInfo.estimatedWaitTime && (
                            <span className={styles.waitTime}>
                                <Clock size={16} />
                                {formatWaitTime(businessInfo.estimatedWaitTime)}
                            </span>
                        )}
                    </div>
                )}
            </div>
            
            <div className={styles.searchSection}>
                <div className={styles.searchBar}>
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Suche nach Gerichten..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className={styles.clearButton}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
                
                <button
                    className={`${styles.filterButton} ${showFilters ? styles.active : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter size={20} />
                    Filter
                    {(selectedDietary.length > 0 || selectedCategory !== 'all') && (
                        <span className={styles.filterBadge}>
                            {selectedDietary.length + (selectedCategory !== 'all' ? 1 : 0)}
                        </span>
                    )}
                </button>
                
                <button
                    className={`${styles.voiceButton} ${isListening ? styles.listening : ''}`}
                    onClick={isListening ? stopListening : startListening}
                >
                    {isListening ? '🎤 Sprechen...' : '🎤'}
                </button>
            </div>
        </div>
    );
    
    const renderFilters = () => (
        <AnimatePresence>
            {showFilters && (
                <motion.div
                    className={styles.filtersPanel}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className={styles.filterGroup}>
                        <h3>Sortierung</h3>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className={styles.sortSelect}
                        >
                            {Object.entries(SORT_OPTIONS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className={styles.filterGroup}>
                        <h3>Ernährung</h3>
                        <div className={styles.dietaryFilters}>
                            {Object.entries(DIETARY_FILTERS).map(([key, { label, icon: Icon }]) => (
                                <button
                                    key={key}
                                    className={`${styles.dietaryButton} ${
                                        selectedDietary.includes(key) ? styles.active : ''
                                    }`}
                                    onClick={() => toggleDietaryFilter(key)}
                                >
                                    <Icon size={16} />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
    
    const renderCategories = () => (
        <div className={styles.categories}>
            <button
                className={`${styles.categoryButton} ${
                    selectedCategory === 'all' ? styles.active : ''
                }`}
                onClick={() => setSelectedCategory('all')}
            >
                Alle
            </button>
            {categories.map(category => (
                <button
                    key={category}
                    className={`${styles.categoryButton} ${
                        selectedCategory === category ? styles.active : ''
                    }`}
                    onClick={() => setSelectedCategory(category)}
                >
                    {category}
                </button>
            ))}
        </div>
    );
    
    const renderProduct = (product) => {
        const quantity = getItemQuantity(product.id);
        const hasDiscount = product.discount > 0;
        const finalPrice = hasDiscount 
            ? product.price * (1 - product.discount / 100)
            : product.price;
            
        return (
            <motion.article
                key={product.id}
                className={styles.productCard}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedProduct(product)}
            >
                {product.image && (
                    <div className={styles.productImage}>
                        <img src={product.image} alt={product.name} loading="lazy" />
                        {product.isNew && (
                            <span className={styles.newBadge}>
                                <Sparkles size={12} />
                                NEU
                            </span>
                        )}
                        {hasDiscount && (
                            <span className={styles.discountBadge}>
                                -{product.discount}%
                            </span>
                        )}
                    </div>
                )}
                
                <div className={styles.productContent}>
                    <h3 className={styles.productName}>{product.name}</h3>
                    
                    {product.description && (
                        <p className={styles.productDescription}>
                            {product.description}
                        </p>
                    )}
                    
                    <div className={styles.productMeta}>
                        {product.dietary && (
                            <div className={styles.dietaryIcons}>
                                {product.dietary.vegetarian && <Leaf size={16} />}
                                {product.dietary.vegan && <Leaf size={16} className={styles.vegan} />}
                                {product.dietary.spicy && <Flame size={16} />}
                            </div>
                        )}
                        
                        {product.rating && (
                            <div className={styles.rating}>
                                <Star size={16} fill="currentColor" />
                                {product.rating.toFixed(1)}
                            </div>
                        )}
                    </div>
                    
                    <div className={styles.productFooter}>
                        <div className={styles.price}>
                            {hasDiscount && (
                                <span className={styles.originalPrice}>
                                    {formatCurrency(product.price)}
                                </span>
                            )}
                            <span className={styles.finalPrice}>
                                {formatCurrency(finalPrice)}
                            </span>
                        </div>
                        
                        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
                            {quantity > 0 ? (
                                <div className={styles.quantityControls}>
                                    <button
                                        className={styles.quantityButton}
                                        onClick={() => handleUpdateQuantity(product.id, quantity - 1)}
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <span className={styles.quantity}>{quantity}</span>
                                    <button
                                        className={styles.quantityButton}
                                        onClick={() => handleUpdateQuantity(product.id, quantity + 1)}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    className={styles.addButton}
                                    onClick={() => handleAddToCart(product)}
                                >
                                    <Plus size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </motion.article>
        );
    };
    
    const renderFloatingCart = () => {
        const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        if (totalItems === 0) return null;
        
        return (
            <motion.div
                className={styles.floatingCart}
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                onClick={() => navigate('/checkout')}
            >
                <div className={styles.cartInfo}>
                    <ShoppingCart size={24} />
                    <span className={styles.cartCount}>{totalItems}</span>
                    <span className={styles.cartDivider}>|</span>
                    <span className={styles.cartTotal}>{formatCurrency(totalPrice)}</span>
                </div>
                <span className={styles.cartAction}>Zur Kasse</span>
            </motion.div>
        );
    };
    
    // ============================================================================
    // MAIN RENDER
    // ============================================================================
    
    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <LoadingSpinner size="large" />
            </div>
        );
    }
    
    return (
        <div className={styles.container}>
            {renderHeader()}
            {renderFilters()}
            {renderCategories()}
            
            <main className={styles.productsGrid}>
                <AnimatePresence>
                    {filteredAndSortedProducts.length > 0 ? (
                        filteredAndSortedProducts.map(product => renderProduct(product))
                    ) : (
                        <motion.div
                            className={styles.emptyState}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <Search size={48} />
                            <h3>Keine Produkte gefunden</h3>
                            <p>Versuche es mit anderen Suchbegriffen oder Filtern</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
            
            <AnimatePresence>
                {selectedProduct && (
                    <ProductModal
                        product={selectedProduct}
                        onClose={() => setSelectedProduct(null)}
                        onAddToCart={handleAddToCart}
                    />
                )}
            </AnimatePresence>
            
            {renderFloatingCart()}
        </div>
    );
};

// ============================================================================
// EXPORT
// ============================================================================
export default CustomerMenu;