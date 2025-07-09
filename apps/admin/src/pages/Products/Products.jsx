/**
 * EATECH - Product Management System with AI Integration
 * Version: 22.0.0
 * Description: Umfassendes Produktverwaltungssystem mit AI-Preisoptimierung
 * Features: CRUD, Varianten, Allergene, Bulk-Actions, Import/Export, Feature Toggles, AI PRICING
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/admin/src/pages/Products/Products.jsx
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Search, Filter, Download, Upload,
  Edit2, Trash2, Copy, MoreVertical, ChevronDown,
  Package, AlertCircle, CheckCircle, XCircle,
  Tag, Star, TrendingUp, Clock, Image,
  Grid, List, Settings, RefreshCw, Save,
  Coffee, Pizza, Sandwich, IceCream, Wine,
  DollarSign, Percent, Calendar, ToggleLeft, ToggleRight,
  Brain, Zap, BarChart3 // AI Icons added
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useTenant } from '@eatech/core';
import { useAI } from '../../hooks/useAI'; // AI Hook added
import ProductModal from '../../components/Products/ProductModal';
import ProductImportModal from '../../components/Products/ProductImportModal';
import BulkEditModal from '../../components/Products/BulkEditModal';
import FeatureToggleModal from '../../components/Products/FeatureToggleModal';
import PriceAIModal from '../../components/Products/PriceAIModal'; // AI Modal added
import styles from './Products.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const VIEW_MODES = {
  GRID: 'grid',
  LIST: 'list'
};

const CATEGORIES = [
  { id: 'all', label: 'Alle Kategorien', icon: Package },
  { id: 'starters', label: 'Vorspeisen', icon: Coffee },
  { id: 'mains', label: 'Hauptgerichte', icon: Pizza },
  { id: 'desserts', label: 'Desserts', icon: IceCream },
  { id: 'drinks', label: 'Getränke', icon: Wine },
  { id: 'sides', label: 'Beilagen', icon: Sandwich }
];

const FILTER_OPTIONS = {
  status: [
    { value: 'all', label: 'Alle' },
    { value: 'active', label: 'Aktiv' },
    { value: 'inactive', label: 'Inaktiv' },
    { value: 'out_of_stock', label: 'Ausverkauft' }
  ],
  dietary: [
    { value: 'vegan', label: 'Vegan', color: '#4CAF50' },
    { value: 'vegetarian', label: 'Vegetarisch', color: '#8BC34A' },
    { value: 'gluten_free', label: 'Glutenfrei', color: '#FF9800' },
    { value: 'lactose_free', label: 'Laktosefrei', color: '#03A9F4' }
  ],
  special: [
    { value: 'featured', label: 'Empfohlen' },
    { value: 'new', label: 'Neu' },
    { value: 'bestseller', label: 'Bestseller' },
    { value: 'seasonal', label: 'Saisonal' },
    { value: 'ai_optimized', label: 'KI-Optimiert' } // AI filter added
  ]
};

const BULK_ACTIONS = [
  { id: 'activate', label: 'Aktivieren', icon: CheckCircle },
  { id: 'deactivate', label: 'Deaktivieren', icon: XCircle },
  { id: 'delete', label: 'Löschen', icon: Trash2 },
  { id: 'export', label: 'Exportieren', icon: Download },
  { id: 'edit_prices', label: 'Preise anpassen', icon: DollarSign },
  { id: 'ai_optimize_prices', label: 'KI-Preisoptimierung', icon: Brain }, // AI action added
  { id: 'add_tags', label: 'Tags hinzufügen', icon: Tag }
];

// Mock Feature Toggles (später aus DB)
const DEFAULT_FEATURE_TOGGLES = {
  combos: true,
  aiDescriptions: true,
  aiPricing: true, // AI Pricing toggle added
  productCloning: true,
  newBadge: true,
  bestsellerBadge: true,
  aiOptimizedBadge: true, // AI badge toggle added
  productTags: true,
  preparationTime: false,
  nutritionInfo: true,
  allergenInfo: true,
  multipleImages: true,
  happyHourPricing: false,
  inventory: false,
  priceAnalytics: true // Price analytics toggle added
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const Products = () => {
  const { tenantId } = useTenant();
  const { optimizePrice, isLoading: isAILoading, activeFeatures } = useAI(); // AI Hook

  // State Management
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(VIEW_MODES.GRID);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    dietary: [],
    special: []
  });
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modal States
  const [showProductModal, setShowProductModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showFeatureToggleModal, setShowFeatureToggleModal] = useState(false);
  const [showPriceAIModal, setShowPriceAIModal] = useState(false); // AI Modal state added
  const [editingProduct, setEditingProduct] = useState(null);
  const [aiOptimizingProduct, setAiOptimizingProduct] = useState(null); // AI product state added
  const [bulkAction, setBulkAction] = useState(null);

  // Feature Toggles
  const [featureToggles, setFeatureToggles] = useState(DEFAULT_FEATURE_TOGGLES);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    outOfStock: 0,
    featured: 0,
    new: 0,
    aiOptimized: 0 // AI optimized count added
  });

  // ============================================================================
  // EFFECTS & DATA LOADING
  // ============================================================================
  useEffect(() => {
    loadProducts();
    loadFeatureToggles();
  }, [tenantId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock data with AI fields
      const mockProducts = generateMockProducts();
      setProducts(mockProducts);
      calculateStats(mockProducts);
    } catch (error) {
      toast.error('Fehler beim Laden der Produkte');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadFeatureToggles = async () => {
    try {
      // Später aus DB laden
      const toggles = localStorage.getItem(`featureToggles_${tenantId}`);
      if (toggles) {
        setFeatureToggles(JSON.parse(toggles));
      }
    } catch (error) {
      console.error('Error loading feature toggles:', error);
    }
  };

  const generateMockProducts = () => {
    return [
      {
        id: '1',
        name: 'Classic Burger',
        description: 'Saftiger Beef-Patty mit frischen Zutaten',
        category: 'mains',
        price: 18.50,
        originalPrice: 18.50,
        image: '/api/placeholder/300/300',
        status: 'active',
        featured: true,
        isNew: true,
        isBestseller: false,
        isAIOptimized: true, // AI field added
        lastAIOptimization: new Date('2025-01-05'), // AI field added
        aiConfidence: 0.87, // AI field added
        dietary: ['lactose_free'],
        allergens: ['gluten', 'egg', 'mustard'],
        tags: ['#homemade', '#chef-special'],
        preparationTime: 15,
        variants: [
          { name: 'Klein', price: 15.50 },
          { name: 'Normal', price: 18.50 },
          { name: 'XL', price: 22.50 }
        ],
        modifiers: [
          { name: 'Extra Käse', price: 2.50 },
          { name: 'Bacon', price: 3.00 },
          { name: 'Doppelt Fleisch', price: 6.00 }
        ],
        stock: 100,
        soldCount: 245,
        rating: 4.8,
        cost: 6.50, // Cost field for margin calculation
        createdAt: new Date('2024-12-01'),
        updatedAt: new Date()
      },
      {
        id: '2',
        name: 'Caesar Salad',
        description: 'Knackiger Salat mit hausgemachtem Dressing',
        category: 'starters',
        price: 14.50,
        originalPrice: 16.00,
        image: '/api/placeholder/300/300',
        status: 'active',
        featured: false,
        isNew: false,
        isBestseller: true,
        isAIOptimized: false,
        dietary: ['vegetarian'],
        allergens: ['gluten', 'egg', 'milk', 'fish'],
        tags: ['#healthy', '#light'],
        preparationTime: 10,
        variants: [
          { name: 'Klein', price: 11.50 },
          { name: 'Groß', price: 16.50 }
        ],
        modifiers: [
          { name: 'Extra Poulet', price: 5.00 },
          { name: 'Extra Parmesan', price: 2.00 },
          { name: 'Ohne Croutons', price: 0 }
        ],
        stock: 50,
        soldCount: 389,
        rating: 4.6,
        cost: 4.20,
        createdAt: new Date('2024-11-15'),
        updatedAt: new Date()
      },
      {
        id: '3',
        name: 'Tiramisu',
        description: 'Hausgemachtes italienisches Dessert',
        category: 'desserts',
        price: 8.50,
        originalPrice: 8.50,
        image: '/api/placeholder/300/300',
        status: 'out_of_stock',
        featured: true,
        isNew: false,
        isBestseller: false,
        isAIOptimized: false,
        dietary: ['vegetarian'],
        allergens: ['gluten', 'egg', 'milk'],
        tags: ['#homemade', '#italian'],
        preparationTime: 5,
        variants: [],
        modifiers: [],
        stock: 0,
        soldCount: 167,
        rating: 4.9,
        cost: 2.80,
        createdAt: new Date('2024-10-20'),
        updatedAt: new Date()
      }
    ];
  };

  const calculateStats = (productList) => {
    const stats = {
      total: productList.length,
      active: productList.filter(p => p.status === 'active').length,
      inactive: productList.filter(p => p.status === 'inactive').length,
      outOfStock: productList.filter(p => p.status === 'out_of_stock').length,
      featured: productList.filter(p => p.featured).length,
      new: productList.filter(p => p.isNew).length,
      aiOptimized: productList.filter(p => p.isAIOptimized).length // AI stat added
    };
    setStats(stats);
  };

  // ============================================================================
  // FILTERING & SORTING
  // ============================================================================
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(p => p.status === filters.status);
    }

    // Dietary filters
    if (filters.dietary.length > 0) {
      filtered = filtered.filter(p =>
        filters.dietary.every(diet => p.dietary.includes(diet))
      );
    }

    // Special filters
    if (filters.special.length > 0) {
      filtered = filtered.filter(p => {
        return filters.special.every(special => {
          switch(special) {
            case 'featured': return p.featured;
            case 'new': return p.isNew;
            case 'bestseller': return p.isBestseller;
            case 'seasonal': return p.tags.includes('#seasonal');
            case 'ai_optimized': return p.isAIOptimized; // AI filter added
            default: return true;
          }
        });
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let compareValue = 0;
      switch(sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'price':
          compareValue = a.price - b.price;
          break;
        case 'soldCount':
          compareValue = b.soldCount - a.soldCount;
          break;
        case 'rating':
          compareValue = b.rating - a.rating;
          break;
        case 'updatedAt':
          compareValue = new Date(b.updatedAt) - new Date(a.updatedAt);
          break;
        case 'margin': // AI sort option added
          compareValue = ((b.price - b.cost) / b.price) - ((a.price - a.cost) / a.price);
          break;
        default:
          compareValue = 0;
      }
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [products, selectedCategory, searchQuery, filters, sortBy, sortOrder]);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleProductSelect = (productId) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const handleBulkAction = (actionId) => {
    if (selectedProducts.length === 0) {
      toast.error('Bitte wählen Sie mindestens ein Produkt aus');
      return;
    }

    switch(actionId) {
      case 'activate':
      case 'deactivate':
        updateProductStatus(actionId === 'activate' ? 'active' : 'inactive');
        break;
      case 'delete':
        deleteProducts();
        break;
      case 'export':
        exportProducts();
        break;
      case 'ai_optimize_prices': // AI bulk action added
        handleBulkAIPricing();
        break;
      case 'edit_prices':
      case 'add_tags':
        setBulkAction(actionId);
        setShowBulkEditModal(true);
        break;
    }
  };

  // AI HANDLERS ADDED
  const handleAIPricing = (product) => {
    if (!featureToggles.aiPricing) {
      toast.error('KI-Preisoptimierung ist deaktiviert');
      return;
    }

    if (!activeFeatures.has('price_optimization')) {
      toast.error('KI-Preisoptimierung ist für Ihren Plan nicht verfügbar');
      return;
    }

    setAiOptimizingProduct(product);
    setShowPriceAIModal(true);
  };

  const handleBulkAIPricing = async () => {
    if (!featureToggles.aiPricing) {
      toast.error('KI-Preisoptimierung ist deaktiviert');
      return;
    }

    const selectedProductObjects = products.filter(p => selectedProducts.includes(p.id));

    toast.loading(`Optimiere Preise für ${selectedProducts.length} Produkte...`);

    try {
      for (const product of selectedProductObjects) {
        // Run AI optimization for each product
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay

        // Update product with AI-optimized price
        const optimizedPrice = product.price * (1 + (Math.random() * 0.2 - 0.1)); // Mock optimization

        setProducts(prev => prev.map(p =>
          p.id === product.id
            ? {
                ...p,
                price: Number(optimizedPrice.toFixed(2)),
                originalPrice: p.price,
                isAIOptimized: true,
                lastAIOptimization: new Date(),
                aiConfidence: 0.75 + Math.random() * 0.2
              }
            : p
        ));
      }

      toast.dismiss();
      toast.success(`${selectedProducts.length} Preise optimiert`);
      setSelectedProducts([]);
    } catch (error) {
      toast.dismiss();
      toast.error('Fehler bei der Preisoptimierung');
    }
  };

  const handleApplyAIPrice = async (priceData) => {
    try {
      // Update product with AI-optimized price
      setProducts(prev => prev.map(p =>
        p.id === priceData.productId
          ? {
              ...p,
              price: priceData.newPrice,
              originalPrice: priceData.oldPrice,
              isAIOptimized: true,
              lastAIOptimization: new Date(),
              aiConfidence: priceData.confidence,
              updatedAt: new Date()
            }
          : p
      ));

      toast.success('KI-optimierter Preis angewendet');

      // Track analytics
      if (window.gtag) {
        window.gtag('event', 'product_price_updated', {
          product_id: priceData.productId,
          old_price: priceData.oldPrice,
          new_price: priceData.newPrice,
          method: 'ai_optimization'
        });
      }
    } catch (error) {
      toast.error('Fehler beim Anwenden des Preises');
    }
  };

  const updateProductStatus = async (status) => {
    try {
      // API call would go here
      setProducts(prev => prev.map(p =>
        selectedProducts.includes(p.id) ? { ...p, status } : p
      ));
      toast.success(`${selectedProducts.length} Produkte ${status === 'active' ? 'aktiviert' : 'deaktiviert'}`);
      setSelectedProducts([]);
    } catch (error) {
      toast.error('Fehler beim Aktualisieren der Produkte');
    }
  };

  const deleteProducts = async () => {
    if (!confirm(`Möchten Sie wirklich ${selectedProducts.length} Produkte löschen?`)) {
      return;
    }

    try {
      setProducts(prev => prev.filter(p => !selectedProducts.includes(p.id)));
      toast.success(`${selectedProducts.length} Produkte gelöscht`);
      setSelectedProducts([]);
    } catch (error) {
      toast.error('Fehler beim Löschen der Produkte');
    }
  };

  const exportProducts = () => {
    const exportData = filteredProducts
      .filter(p => selectedProducts.includes(p.id))
      .map(p => ({
        Name: p.name,
        Beschreibung: p.description,
        Kategorie: CATEGORIES.find(c => c.id === p.category)?.label,
        Preis: p.price,
        'Original Preis': p.originalPrice || p.price,
        'KI-Optimiert': p.isAIOptimized ? 'Ja' : 'Nein',
        'KI-Konfidenz': p.aiConfidence ? `${Math.round(p.aiConfidence * 100)}%` : '-',
        Status: p.status,
        Verkauft: p.soldCount,
        Bewertung: p.rating
      }));

    // Convert to CSV
    const csv = convertToCSV(exportData);
    downloadCSV(csv, 'produkte_export.csv');
    toast.success('Export erfolgreich');
  };

  const convertToCSV = (data) => {
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    return [headers, ...rows].join('\n');
  };

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleProductSave = async (productData) => {
    try {
      if (editingProduct) {
        // Update existing product
        setProducts(prev => prev.map(p =>
          p.id === editingProduct.id ? { ...p, ...productData, updatedAt: new Date() } : p
        ));
        toast.success('Produkt aktualisiert');
      } else {
        // Create new product
        const newProduct = {
          ...productData,
          id: Date.now().toString(),
          soldCount: 0,
          rating: 0,
          isAIOptimized: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        setProducts(prev => [...prev, newProduct]);
        toast.success('Produkt erstellt');
      }
      setShowProductModal(false);
      setEditingProduct(null);
    } catch (error) {
      toast.error('Fehler beim Speichern des Produkts');
    }
  };

  const handleProductClone = async (product) => {
    try {
      const clonedProduct = {
        ...product,
        id: Date.now().toString(),
        name: `${product.name} (Kopie)`,
        soldCount: 0,
        rating: 0,
        isAIOptimized: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setProducts(prev => [...prev, clonedProduct]);
      toast.success('Produkt geklont');
    } catch (error) {
      toast.error('Fehler beim Klonen des Produkts');
    }
  };

  const handleFeatureTogglesSave = (toggles) => {
    setFeatureToggles(toggles);
    localStorage.setItem(`featureToggles_${tenantId}`, JSON.stringify(toggles));
    toast.success('Feature-Einstellungen gespeichert');
    setShowFeatureToggleModal(false);
  };

  // ============================================================================
  // RENDER METHODS
  // ============================================================================
  const renderProductCard = (product) => {
    const isSelected = selectedProducts.includes(product.id);
    const categoryInfo = CATEGORIES.find(c => c.id === product.category);
    const margin = product.cost ? ((product.price - product.cost) / product.price * 100) : null;

    return (
      <motion.div
        key={product.id}
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`${styles.productCard} ${isSelected ? styles.selected : ''}`}
      >
        {/* Selection Checkbox */}
        <div className={styles.selectionOverlay}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => handleProductSelect(product.id)}
            className={styles.selectCheckbox}
          />
        </div>

        {/* Product Image */}
        <div className={styles.productImage}>
          <img src={product.image} alt={product.name} />

          {/* Status Badge */}
          <div className={`${styles.statusBadge} ${styles[product.status]}`}>
            {product.status === 'active' && <CheckCircle size={14} />}
            {product.status === 'inactive' && <XCircle size={14} />}
            {product.status === 'out_of_stock' && <AlertCircle size={14} />}
            <span>
              {product.status === 'active' && 'Aktiv'}
              {product.status === 'inactive' && 'Inaktiv'}
              {product.status === 'out_of_stock' && 'Ausverkauft'}
            </span>
          </div>

          {/* Special Badges */}
          <div className={styles.specialBadges}>
            {product.featured && featureToggles.newBadge && (
              <span className={styles.featuredBadge}>
                <Star size={12} /> Empfohlen
              </span>
            )}
            {product.isNew && featureToggles.newBadge && (
              <span className={styles.newBadge}>NEU</span>
            )}
            {product.isBestseller && featureToggles.bestsellerBadge && (
              <span className={styles.bestsellerBadge}>
                <TrendingUp size={12} /> Bestseller
              </span>
            )}
            {product.isAIOptimized && featureToggles.aiOptimizedBadge && (
              <span className={styles.aiOptimizedBadge}>
                <Brain size={12} /> KI-Optimiert
              </span>
            )}
          </div>
        </div>

        {/* Product Info */}
        <div className={styles.productInfo}>
          <div className={styles.productHeader}>
            <h3>{product.name}</h3>
            <div className={styles.priceSection}>
              <span className={styles.price}>CHF {product.price.toFixed(2)}</span>
              {product.originalPrice && product.originalPrice !== product.price && (
                <span className={styles.originalPrice}>CHF {product.originalPrice.toFixed(2)}</span>
              )}
            </div>
          </div>

          <p className={styles.description}>{product.description}</p>

          {/* Category & Tags */}
          <div className={styles.productMeta}>
            <span className={styles.category}>
              {categoryInfo?.icon && <categoryInfo.icon size={14} />}
              {categoryInfo?.label}
            </span>

            {featureToggles.productTags && product.tags.length > 0 && (
              <div className={styles.tags}>
                {product.tags.slice(0, 2).map(tag => (
                  <span key={tag} className={styles.tag}>
                    <Tag size={10} /> {tag}
                  </span>
                ))}
                {product.tags.length > 2 && (
                  <span className={styles.moreTag}>+{product.tags.length - 2}</span>
                )}
              </div>
            )}
          </div>

          {/* Dietary Info */}
          {product.dietary.length > 0 && (
            <div className={styles.dietaryBadges}>
              {product.dietary.map(diet => {
                const dietInfo = FILTER_OPTIONS.dietary.find(d => d.value === diet);
                return (
                  <span
                    key={diet}
                    className={styles.dietaryBadge}
                    style={{ backgroundColor: dietInfo?.color }}
                  >
                    {dietInfo?.label}
                  </span>
                );
              })}
            </div>
          )}

          {/* Stats */}
          <div className={styles.productStats}>
            <span><Package size={14} /> {product.soldCount} verkauft</span>
            {product.rating > 0 && (
              <span><Star size={14} /> {product.rating}</span>
            )}
            {featureToggles.preparationTime && (
              <span><Clock size={14} /> {product.preparationTime} Min.</span>
            )}
            {featureToggles.priceAnalytics && margin !== null && (
              <span className={styles.marginStat}>
                <Percent size={14} /> {margin.toFixed(0)}% Marge
              </span>
            )}
          </div>

          {/* AI Optimization Info */}
          {product.isAIOptimized && featureToggles.aiPricing && (
            <div className={styles.aiInfo}>
              <span className={styles.aiConfidence}>
                <Zap size={12} />
                {Math.round((product.aiConfidence || 0) * 100)}% Konfidenz
              </span>
              <span className={styles.aiDate}>
                Optimiert: {product.lastAIOptimization ?
                  new Date(product.lastAIOptimization).toLocaleDateString('de-CH') :
                  'Unbekannt'
                }
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={styles.productActions}>
          <button
            onClick={() => {
              setEditingProduct(product);
              setShowProductModal(true);
            }}
            className={styles.editButton}
            title="Bearbeiten"
          >
            <Edit2 size={16} />
          </button>

          {featureToggles.aiPricing && (
            <button
              onClick={() => handleAIPricing(product)}
              className={styles.aiButton}
              title="KI-Preisoptimierung"
            >
              <Brain size={16} />
            </button>
          )}

          {featureToggles.productCloning && (
            <button
              onClick={() => handleProductClone(product)}
              className={styles.cloneButton}
              title="Klonen"
            >
              <Copy size={16} />
            </button>
          )}

          <button className={styles.moreButton} title="Mehr Optionen">
            <MoreVertical size={16} />
          </button>
        </div>
      </motion.div>
    );
  };

  const renderListView = () => {
    return (
      <div className={styles.listView}>
        <table className={styles.productTable}>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th>Bild</th>
              <th onClick={() => handleSort('name')}>
                Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th>Kategorie</th>
              <th onClick={() => handleSort('price')}>
                Preis {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              {featureToggles.priceAnalytics && (
                <th onClick={() => handleSort('margin')}>
                  Marge {sortBy === 'margin' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
              )}
              <th>Status</th>
              <th onClick={() => handleSort('soldCount')}>
                Verkauft {sortBy === 'soldCount' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              {featureToggles.aiPricing && <th>KI-Status</th>}
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => {
              const margin = product.cost ? ((product.price - product.cost) / product.price * 100) : null;

              return (
                <tr key={product.id} className={selectedProducts.includes(product.id) ? styles.selected : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => handleProductSelect(product.id)}
                    />
                  </td>
                  <td>
                    <img src={product.image} alt={product.name} className={styles.listImage} />
                  </td>
                  <td>
                    <div className={styles.listProductInfo}>
                      <strong>{product.name}</strong>
                      <span className={styles.listDescription}>{product.description}</span>
                    </div>
                  </td>
                  <td>{CATEGORIES.find(c => c.id === product.category)?.label}</td>
                  <td>
                    <div className={styles.listPriceInfo}>
                      <span>CHF {product.price.toFixed(2)}</span>
                      {product.originalPrice && product.originalPrice !== product.price && (
                        <span className={styles.listOriginalPrice}>CHF {product.originalPrice.toFixed(2)}</span>
                      )}
                    </div>
                  </td>
                  {featureToggles.priceAnalytics && (
                    <td>
                      {margin !== null ? (
                        <span className={margin > 50 ? styles.highMargin : margin < 20 ? styles.lowMargin : ''}>
                          {margin.toFixed(0)}%
                        </span>
                      ) : '-'}
                    </td>
                  )}
                  <td>
                    <span className={`${styles.statusPill} ${styles[product.status]}`}>
                      {product.status === 'active' && 'Aktiv'}
                      {product.status === 'inactive' && 'Inaktiv'}
                      {product.status === 'out_of_stock' && 'Ausverkauft'}
                    </span>
                  </td>
                  <td>{product.soldCount}</td>
                  {featureToggles.aiPricing && (
                    <td>
                      {product.isAIOptimized ? (
                        <span className={styles.aiOptimizedPill}>
                          <Brain size={14} />
                          {Math.round((product.aiConfidence || 0) * 100)}%
                        </span>
                      ) : (
                        <span className={styles.notOptimizedPill}>-</span>
                      )}
                    </td>
                  )}
                  <td>
                    <div className={styles.listActions}>
                      <button onClick={() => {
                        setEditingProduct(product);
                        setShowProductModal(true);
                      }}>
                        <Edit2 size={16} />
                      </button>
                      {featureToggles.aiPricing && (
                        <button onClick={() => handleAIPricing(product)}>
                          <Brain size={16} />
                        </button>
                      )}
                      {featureToggles.productCloning && (
                        <button onClick={() => handleProductClone(product)}>
                          <Copy size={16} />
                        </button>
                      )}
                      <button>
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}>
          <Package size={48} className={styles.spinnerIcon} />
        </div>
        <p>Lade Produkte...</p>
      </div>
    );
  }

  return (
    <div className={styles.products}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Produkte</h1>
          <div className={styles.stats}>
            <span>{stats.total} gesamt</span>
            <span className={styles.active}>{stats.active} aktiv</span>
            {stats.outOfStock > 0 && (
              <span className={styles.outOfStock}>{stats.outOfStock} ausverkauft</span>
            )}
            {featureToggles.aiPricing && stats.aiOptimized > 0 && (
              <span className={styles.aiOptimized}>
                <Brain size={14} /> {stats.aiOptimized} KI-optimiert
              </span>
            )}
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            onClick={() => setShowFeatureToggleModal(true)}
            className={styles.featureToggleButton}
          >
            <Settings size={20} />
            <span>Features</span>
          </button>

          {featureToggles.aiPricing && activeFeatures.has('price_optimization') && (
            <button
              onClick={() => {
                if (selectedProducts.length > 0) {
                  handleBulkAIPricing();
                } else {
                  toast('Wählen Sie Produkte für KI-Optimierung aus');
                }
              }}
              className={styles.aiOptimizeButton}
            >
              <Brain size={20} />
              <span>KI-Optimierung</span>
            </button>
          )}

          <button
            onClick={() => setShowImportModal(true)}
            className={styles.importButton}
          >
            <Upload size={20} />
            <span>Importieren</span>
          </button>

          <button
            onClick={() => {
              setEditingProduct(null);
              setShowProductModal(true);
            }}
            className={styles.addButton}
          >
            <Plus size={20} />
            <span>Neues Produkt</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          {/* Search */}
          <div className={styles.searchBox}>
            <Search size={20} />
            <input
              type="text"
              placeholder="Produkte suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={styles.clearSearch}
              >
                <XCircle size={16} />
              </button>
            )}
          </div>

          {/* Categories */}
          <div className={styles.categories}>
            {CATEGORIES.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`${styles.categoryButton} ${
                  selectedCategory === category.id ? styles.active : ''
                }`}
              >
                <category.icon size={16} />
                <span>{category.label}</span>
              </button>
            ))}
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`${styles.filterToggle} ${showFilters ? styles.active : ''}`}
          >
            <Filter size={20} />
            <span>Filter</span>
            {(filters.status !== 'all' || filters.dietary.length > 0 || filters.special.length > 0) && (
              <span className={styles.filterCount}>
                {(filters.status !== 'all' ? 1 : 0) + filters.dietary.length + filters.special.length}
              </span>
            )}
          </button>
        </div>

        <div className={styles.toolbarRight}>
          {/* Bulk Actions */}
          {selectedProducts.length > 0 && (
            <div className={styles.bulkActions}>
              <span>{selectedProducts.length} ausgewählt</span>
              {BULK_ACTIONS.map(action => (
                <button
                  key={action.id}
                  onClick={() => handleBulkAction(action.id)}
                  className={styles.bulkActionButton}
                >
                  <action.icon size={16} />
                  <span>{action.label}</span>
                </button>
              ))}
              <button
                onClick={() => setSelectedProducts([])}
                className={styles.clearSelection}
              >
                Auswahl aufheben
              </button>
            </div>
          )}

          {/* View Mode Toggle */}
          <div className={styles.viewModeToggle}>
            <button
              onClick={() => setViewMode(VIEW_MODES.GRID)}
              className={viewMode === VIEW_MODES.GRID ? styles.active : ''}
            >
              <Grid size={20} />
            </button>
            <button
              onClick={() => setViewMode(VIEW_MODES.LIST)}
              className={viewMode === VIEW_MODES.LIST ? styles.active : ''}
            >
              <List size={20} />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={loadProducts}
            className={styles.refreshButton}
            disabled={isAILoading}
          >
            <RefreshCw size={20} className={isAILoading ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={styles.filtersPanel}
          >
            <div className={styles.filterSection}>
              <h4>Status</h4>
              <div className={styles.filterOptions}>
                {FILTER_OPTIONS.status.map(option => (
                  <label key={option.value} className={styles.filterOption}>
                    <input
                      type="radio"
                      name="status"
                      value={option.value}
                      checked={filters.status === option.value}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.filterSection}>
              <h4>Ernährung</h4>
              <div className={styles.filterOptions}>
                {FILTER_OPTIONS.dietary.map(option => (
                  <label key={option.value} className={styles.filterOption}>
                    <input
                      type="checkbox"
                      value={option.value}
                      checked={filters.dietary.includes(option.value)}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFilters(prev => ({
                          ...prev,
                          dietary: e.target.checked
                            ? [...prev.dietary, value]
                            : prev.dietary.filter(d => d !== value)
                        }));
                      }}
                    />
                    <span
                      className={styles.dietaryLabel}
                      style={{ backgroundColor: option.color }}
                    >
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.filterSection}>
              <h4>Spezial</h4>
              <div className={styles.filterOptions}>
                {FILTER_OPTIONS.special.map(option => (
                  <label key={option.value} className={styles.filterOption}>
                    <input
                      type="checkbox"
                      value={option.value}
                      checked={filters.special.includes(option.value)}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFilters(prev => ({
                          ...prev,
                          special: e.target.checked
                            ? [...prev.special, value]
                            : prev.special.filter(s => s !== value)
                        }));
                      }}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={() => setFilters({ status: 'all', dietary: [], special: [] })}
              className={styles.clearFilters}
            >
              Filter zurücksetzen
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Products Content */}
      <div className={styles.content}>
        {filteredProducts.length === 0 ? (
          <div className={styles.emptyState}>
            <Package size={64} />
            <h3>Keine Produkte gefunden</h3>
            <p>Ändern Sie Ihre Suchkriterien oder fügen Sie neue Produkte hinzu.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilters({ status: 'all', dietary: [], special: [] });
                setSelectedCategory('all');
              }}
              className={styles.resetButton}
            >
              Filter zurücksetzen
            </button>
          </div>
        ) : (
          <>
            {viewMode === VIEW_MODES.GRID ? (
              <div className={styles.productGrid}>
                <AnimatePresence>
                  {filteredProducts.map(product => renderProductCard(product))}
                </AnimatePresence>
              </div>
            ) : (
              renderListView()
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showProductModal && (
        <ProductModal
          product={editingProduct}
          categories={CATEGORIES}
          featureToggles={featureToggles}
          onSave={handleProductSave}
          onClose={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
        />
      )}

      {showImportModal && (
        <ProductImportModal
          onImport={(products) => {
            setProducts(prev => [...prev, ...products]);
            toast.success(`${products.length} Produkte importiert`);
            setShowImportModal(false);
          }}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {showBulkEditModal && (
        <BulkEditModal
          action={bulkAction}
          selectedCount={selectedProducts.length}
          onSave={(data) => {
            // Handle bulk edit based on action
            console.log('Bulk edit data:', data);
            setShowBulkEditModal(false);
            setBulkAction(null);
          }}
          onClose={() => {
            setShowBulkEditModal(false);
            setBulkAction(null);
          }}
        />
      )}

      {showFeatureToggleModal && (
        <FeatureToggleModal
          toggles={featureToggles}
          onSave={handleFeatureTogglesSave}
          onClose={() => setShowFeatureToggleModal(false)}
        />
      )}

      {/* AI Price Optimization Modal */}
      {showPriceAIModal && aiOptimizingProduct && (
        <PriceAIModal
          product={aiOptimizingProduct}
          isOpen={showPriceAIModal}
          onClose={() => {
            setShowPriceAIModal(false);
            setAiOptimizingProduct(null);
          }}
          onApply={handleApplyAIPrice}
        />
      )}
    </div>
  );
};

export default Products;
