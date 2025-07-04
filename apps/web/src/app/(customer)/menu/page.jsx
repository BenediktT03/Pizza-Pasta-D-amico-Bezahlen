/**
 * EATECH - Customer Menu Page
 * Version: 16.0.0
 * Description: Interaktive Menü-Seite mit Kategorien, Suche und Produkten
 * Author: EATECH Development Team
 * Created: 2025-07-05
 * File Path: /apps/web/src/app/(customer)/menu/page.jsx
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Star, 
  Clock, 
  Flame,
  Plus,
  Minus,
  Heart,
  Info,
  ChevronDown,
  X,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Award,
  AlertCircle
} from 'lucide-react';
import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import toast from 'react-hot-toast';

// Mock data - später aus Firebase
const MENU_ITEMS = [
  {
    id: 1,
    name: 'Classic Burger',
    description: 'Saftiges Rindfleisch, Salat, Tomate, Zwiebel, hausgemachte Sauce',
    price: 16.90,
    category: 'burger',
    image: '/images/products/burger-1.jpg',
    rating: 4.8,
    prepTime: 15,
    calories: 650,
    isPopular: true,
    isNew: false,
    isVegetarian: false,
    isSpicy: false,
    allergens: ['Gluten', 'Milch', 'Senf']
  },
  {
    id: 2,
    name: 'Bacon Deluxe Burger',
    description: 'Double Patty, crispy Bacon, Cheddar, BBQ Sauce',
    price: 22.90,
    category: 'burger',
    image: '/images/products/burger-2.jpg',
    rating: 4.9,
    prepTime: 18,
    calories: 850,
    isPopular: true,
    isNew: false,
    isVegetarian: false,
    isSpicy: false,
    allergens: ['Gluten', 'Milch', 'Ei']
  },
  {
    id: 3,
    name: 'Veggie Wonder',
    description: 'Hausgemachtes Gemüse-Patty, Avocado, Rucola',
    price: 18.50,
    category: 'burger',
    image: '/images/products/burger-3.jpg',
    rating: 4.7,
    prepTime: 15,
    calories: 480,
    isPopular: false,
    isNew: true,
    isVegetarian: true,
    isSpicy: false,
    allergens: ['Gluten', 'Nüsse']
  },
  {
    id: 4,
    name: 'Margherita Pizza',
    description: 'Tomaten, Mozzarella, frisches Basilikum',
    price: 18.00,
    category: 'pizza',
    image: '/images/products/pizza-1.jpg',
    rating: 4.8,
    prepTime: 12,
    calories: 550,
    isPopular: true,
    isNew: false,
    isVegetarian: true,
    isSpicy: false,
    allergens: ['Gluten', 'Milch']
  },
  {
    id: 5,
    name: 'Diavola Pizza',
    description: 'Scharfe Salami, Mozzarella, Chili',
    price: 21.00,
    category: 'pizza',
    image: '/images/products/pizza-2.jpg',
    rating: 4.6,
    prepTime: 12,
    calories: 680,
    isPopular: false,
    isNew: false,
    isVegetarian: false,
    isSpicy: true,
    allergens: ['Gluten', 'Milch']
  },
  {
    id: 6,
    name: 'Caesar Salad',
    description: 'Römersalat, Parmesan, Croutons, Caesar Dressing',
    price: 14.50,
    category: 'salate',
    image: '/images/products/salad-1.jpg',
    rating: 4.7,
    prepTime: 8,
    calories: 320,
    isPopular: true,
    isNew: false,
    isVegetarian: false,
    isSpicy: false,
    allergens: ['Gluten', 'Milch', 'Ei', 'Fisch']
  }
];

const CATEGORIES = [
  { id: 'all', name: 'Alle', icon: '🍽️' },
  { id: 'burger', name: 'Burger', icon: '🍔' },
  { id: 'pizza', name: 'Pizza', icon: '🍕' },
  { id: 'salate', name: 'Salate', icon: '🥗' },
  { id: 'wraps', name: 'Wraps', icon: '🌯' },
  { id: 'desserts', name: 'Desserts', icon: '🍰' },
  { id: 'getränke', name: 'Getränke', icon: '🥤' }
];

const SORT_OPTIONS = [
  { value: 'popular', label: 'Beliebtheit' },
  { value: 'price-low', label: 'Preis: Niedrig zu Hoch' },
  { value: 'price-high', label: 'Preis: Hoch zu Niedrig' },
  { value: 'rating', label: 'Beste Bewertung' },
  { value: 'time', label: 'Schnellste Zubereitung' }
];

export default function MenuPage() {
  const { addToCart, removeFromCart, getItemQuantity } = useCart();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [favorites, setFavorites] = useState([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    vegetarian: false,
    spicy: false,
    under20: false,
    newItems: false
  });

  // Filter und sortiere Menü-Items
  const filteredAndSortedItems = useMemo(() => {
    let items = [...MENU_ITEMS];
    
    // Kategorie-Filter
    if (selectedCategory !== 'all') {
      items = items.filter(item => item.category === selectedCategory);
    }
    
    // Such-Filter
    if (searchQuery) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Weitere Filter
    if (filters.vegetarian) {
      items = items.filter(item => item.isVegetarian);
    }
    if (filters.spicy) {
      items = items.filter(item => item.isSpicy);
    }
    if (filters.under20) {
      items = items.filter(item => item.price < 20);
    }
    if (filters.newItems) {
      items = items.filter(item => item.isNew);
    }
    
    // Sortierung
    switch (sortBy) {
      case 'price-low':
        items.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        items.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        items.sort((a, b) => b.rating - a.rating);
        break;
      case 'time':
        items.sort((a, b) => a.prepTime - b.prepTime);
        break;
      case 'popular':
      default:
        items.sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0));
    }
    
    return items;
  }, [selectedCategory, searchQuery, filters, sortBy]);

  const toggleFavorite = (itemId) => {
    setFavorites(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleAddToCart = (item) => {
    addToCart(item);
    toast.success(`${item.name} wurde zum Warenkorb hinzugefügt!`, {
      icon: '🛒',
      duration: 2000
    });
  };

  return (
    <div className="min-h-screen bg-black pt-4 pb-20">
      <div className="container mx-auto px-4">
        {/* Header mit Suche und Filter */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500">
            Unser Menü
          </h1>
          <p className="text-gray-400 mb-6">Wähle aus unseren köstlichen Gerichten</p>
          
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Suche nach Gerichten..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-xl focus:border-red-500 focus:outline-none transition-colors"
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-6 py-3 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
            >
              <Filter className="w-5 h-5" />
              Filter
              {Object.values(filters).filter(Boolean).length > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {Object.values(filters).filter(Boolean).length}
                </span>
              )}
            </button>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-6 py-3 bg-gray-900 border border-gray-800 rounded-xl focus:border-red-500 focus:outline-none transition-colors cursor-pointer"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.vegetarian}
                        onChange={(e) => setFilters({...filters, vegetarian: e.target.checked})}
                        className="w-4 h-4 text-red-500 bg-gray-800 border-gray-700 rounded focus:ring-red-500"
                      />
                      <span>🌱 Vegetarisch</span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.spicy}
                        onChange={(e) => setFilters({...filters, spicy: e.target.checked})}
                        className="w-4 h-4 text-red-500 bg-gray-800 border-gray-700 rounded focus:ring-red-500"
                      />
                      <span>🌶️ Scharf</span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.under20}
                        onChange={(e) => setFilters({...filters, under20: e.target.checked})}
                        className="w-4 h-4 text-red-500 bg-gray-800 border-gray-700 rounded focus:ring-red-500"
                      />
                      <span>💰 Unter CHF 20</span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.newItems}
                        onChange={(e) => setFilters({...filters, newItems: e.target.checked})}
                        className="w-4 h-4 text-red-500 bg-gray-800 border-gray-700 rounded focus:ring-red-500"
                      />
                      <span>✨ Neu</span>
                    </label>
                  </div>
                  
                  <button
                    onClick={() => setFilters({ vegetarian: false, spicy: false, under20: false, newItems: false })}
                    className="mt-4 text-sm text-red-500 hover:text-red-400 transition-colors"
                  >
                    Filter zurücksetzen
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Kategorien */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map(category => (
            <motion.button
              key={category.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                selectedCategory === category.id
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                  : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">{category.icon}</span>
              <span>{category.name}</span>
            </motion.button>
          ))}
        </div>
        
        {/* Menü Items Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredAndSortedItems.map((item, index) => {
              const quantity = getItemQuantity(item.id);
              const isFavorite = favorites.includes(item.id);
              
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-all duration-300 group"
                >
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    
                    {/* Badges */}
                    <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                      {item.isNew && (
                        <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          NEU
                        </div>
                      )}
                      {item.isPopular && (
                        <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Beliebt
                        </div>
                      )}
                      {item.isVegetarian && (
                        <div className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                          🌱
                        </div>
                      )}
                      {item.isSpicy && (
                        <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                          🌶️
                        </div>
                      )}
                    </div>
                    
                    {/* Favorite Button */}
                    <button
                      onClick={() => toggleFavorite(item.id)}
                      className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      <Heart 
                        className={`w-5 h-5 transition-colors ${
                          isFavorite ? 'text-red-500 fill-current' : 'text-white'
                        }`}
                      />
                    </button>
                    
                    {/* Info Button */}
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="absolute bottom-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      <Info className="w-5 h-5 text-white" />
                    </button>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">{item.description}</p>
                    
                    <div className="flex items-center gap-4 mb-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span>{item.rating}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{item.prepTime} Min</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Flame className="w-4 h-4" />
                        <span>{item.calories} kcal</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-red-500">
                        CHF {item.price.toFixed(2)}
                      </div>
                      
                      {quantity === 0 ? (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleAddToCart(item)}
                          className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-xl font-semibold transition-colors flex items-center gap-2"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          Hinzufügen
                        </motion.button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => removeFromCart(item.id)}
                            className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </motion.button>
                          <span className="w-12 text-center font-semibold">{quantity}</span>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => addToCart(item)}
                            className="w-8 h-8 bg-red-500 hover:bg-red-600 rounded-lg flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        
        {/* Keine Ergebnisse */}
        {filteredAndSortedItems.length === 0 && (
          <div className="text-center py-20">
            <AlertCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Keine Gerichte gefunden</h3>
            <p className="text-gray-400">Versuche es mit anderen Filtereinstellungen</p>
          </div>
        )}
      </div>
      
      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-64">
                <Image
                  src={selectedItem.image}
                  alt={selectedItem.name}
                  fill
                  className="object-cover"
                />
                <button
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-2">{selectedItem.name}</h2>
                <p className="text-gray-400 mb-6">{selectedItem.description}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Zubereitungszeit</span>
                    </div>
                    <p className="font-semibold">{selectedItem.prepTime} Minuten</p>
                  </div>
                  
                  <div className="bg-gray-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Flame className="w-4 h-4" />
                      <span className="text-sm">Kalorien</span>
                    </div>
                    <p className="font-semibold">{selectedItem.calories} kcal</p>
                  </div>
                </div>
                
                {selectedItem.allergens && selectedItem.allergens.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-2">Allergene</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.allergens.map(allergen => (
                        <span
                          key={allergen}
                          className="px-3 py-1 bg-orange-500/20 text-orange-500 rounded-full text-sm"
                        >
                          {allergen}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-red-500">
                    CHF {selectedItem.price.toFixed(2)}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      handleAddToCart(selectedItem);
                      setSelectedItem(null);
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    In den Warenkorb
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}