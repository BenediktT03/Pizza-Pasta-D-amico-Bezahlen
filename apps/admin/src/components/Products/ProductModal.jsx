/**
 * EATECH - Product Modal Component
 * Version: 21.0.0
 * Description: Umfassendes Modal für Produkt-Erstellung und -Bearbeitung
 * Features: Varianten, Modifikatoren, Allergene, KI-Beschreibungen, Combos
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/admin/src/components/Products/ProductModal.jsx
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Plus, Trash2, Save, Upload, Image as ImageIcon,
  AlertCircle, Info, ChevronDown, ChevronUp, Sparkles,
  Package, Tag, Clock, DollarSign, Percent, Calendar,
  Coffee, Pizza, Sandwich, IceCream, Wine, Loader2,
  Copy, Move, GripVertical, Check, AlertTriangle,
  Languages, Zap, ShoppingCart, Star, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import styles from './ProductModal.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const LANGUAGES = [
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'en', label: 'English', flag: '🇬🇧' }
];

const ALLERGENS = [
  { id: 'gluten', label: 'Gluten', icon: '🌾' },
  { id: 'crustaceans', label: 'Krebstiere', icon: '🦀' },
  { id: 'eggs', label: 'Eier', icon: '🥚' },
  { id: 'fish', label: 'Fisch', icon: '🐟' },
  { id: 'peanuts', label: 'Erdnüsse', icon: '🥜' },
  { id: 'soybeans', label: 'Sojabohnen', icon: '🫘' },
  { id: 'milk', label: 'Milch', icon: '🥛' },
  { id: 'nuts', label: 'Schalenfrüchte', icon: '🌰' },
  { id: 'celery', label: 'Sellerie', icon: '🥬' },
  { id: 'mustard', label: 'Senf', icon: '🌭' },
  { id: 'sesame', label: 'Sesam', icon: '🌿' },
  { id: 'sulphites', label: 'Schwefeldioxid', icon: '🧪' },
  { id: 'lupin', label: 'Lupinen', icon: '🌱' },
  { id: 'molluscs', label: 'Weichtiere', icon: '🦑' }
];

const DIETARY_LABELS = [
  { id: 'vegan', label: 'Vegan', color: '#4CAF50', icon: '🌱' },
  { id: 'vegetarian', label: 'Vegetarisch', color: '#8BC34A', icon: '🥗' },
  { id: 'gluten_free', label: 'Glutenfrei', color: '#FF9800', icon: '🌾' },
  { id: 'lactose_free', label: 'Laktosefrei', color: '#03A9F4', icon: '🥛' },
  { id: 'halal', label: 'Halal', color: '#009688', icon: '☪️' },
  { id: 'kosher', label: 'Koscher', color: '#3F51B5', icon: '✡️' },
  { id: 'organic', label: 'Bio', color: '#4CAF50', icon: '🌿' },
  { id: 'low_carb', label: 'Low Carb', color: '#FF5722', icon: '🥖' }
];

const PRODUCT_TAGS = [
  '#homemade', '#chef-special', '#seasonal', '#limited',
  '#spicy', '#mild', '#sweet', '#savory', '#healthy',
  '#comfort-food', '#gourmet', '#traditional', '#fusion',
  '#bestseller', '#new', '#recommended', '#local',
  '#sustainable', '#fair-trade', '#organic'
];

const PREPARATION_STATIONS = [
  { id: 'grill', label: 'Grill', icon: '🔥' },
  { id: 'fryer', label: 'Fritteuse', icon: '🍟' },
  { id: 'oven', label: 'Ofen', icon: '🔥' },
  { id: 'stove', label: 'Herd', icon: '🍳' },
  { id: 'cold', label: 'Kalte Küche', icon: '🥗' },
  { id: 'bar', label: 'Bar', icon: '🍹' }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const ProductModal = ({ 
  product, 
  categories, 
  featureToggles,
  onSave, 
  onClose 
}) => {
  // Form State
  const [formData, setFormData] = useState({
    // Basic Info
    name: { de: '', fr: '', it: '', en: '' },
    description: { de: '', fr: '', it: '', en: '' },
    category: '',
    price: '',
    sku: '',
    status: 'active',
    
    // Images
    mainImage: '',
    gallery: [],
    
    // Variants & Modifiers
    variants: [],
    modifiers: [],
    modifierGroups: [],
    
    // Allergenes & Dietary
    allergens: [],
    dietary: [],
    ingredients: '',
    
    // Nutrition (per 100g)
    nutrition: {
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
      fiber: '',
      sugar: '',
      salt: ''
    },
    
    // Special Features
    featured: false,
    isNew: true,
    tags: [],
    preparationTime: 15,
    preparationStation: '',
    
    // Inventory
    trackInventory: false,
    stock: 100,
    lowStockAlert: 10,
    
    // Happy Hour
    happyHourEnabled: false,
    happyHourPrice: '',
    happyHourStart: '16:00',
    happyHourEnd: '18:00',
    happyHourDays: [1, 2, 3, 4, 5], // Mon-Fri
    
    // Combo Deals
    comboEnabled: false,
    comboItems: [],
    comboDiscount: 20,
    comboPrice: ''
  });
  
  // UI State
  const [activeTab, setActiveTab] = useState('basic');
  const [activeLanguage, setActiveLanguage] = useState('de');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    variants: true,
    modifiers: true,
    nutrition: false,
    inventory: false,
    happyHour: false,
    combo: false
  });
  
  // Refs
  const imageInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // ============================================================================
  // EFFECTS
  // ============================================================================
  useEffect(() => {
    if (product) {
      // Load existing product data
      setFormData({
        ...formData,
        ...product,
        // Ensure all language fields exist
        name: {
          de: product.name?.de || product.name || '',
          fr: product.name?.fr || '',
          it: product.name?.it || '',
          en: product.name?.en || ''
        },
        description: {
          de: product.description?.de || product.description || '',
          fr: product.description?.fr || '',
          it: product.description?.it || '',
          en: product.description?.en || ''
        }
      });
    }
  }, [product]);

  // ============================================================================
  // HANDLERS - Basic Info
  // ============================================================================
  const handleInputChange = (field, value, language = null) => {
    if (language) {
      setFormData(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          [language]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleNutritionChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      nutrition: {
        ...prev.nutrition,
        [field]: value
      }
    }));
  };

  // ============================================================================
  // HANDLERS - Images
  // ============================================================================
  const handleImageUpload = async (e, isGallery = false) => {
    const files = Array.from(e.target.files);
    
    // Simulate upload
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const uploadedUrls = files.map((file, index) => 
        `/api/placeholder/400/400?text=${file.name}`
      );
      
      if (isGallery) {
        setFormData(prev => ({
          ...prev,
          gallery: [...prev.gallery, ...uploadedUrls]
        }));
        toast.success(`${files.length} Bilder hochgeladen`);
      } else {
        setFormData(prev => ({
          ...prev,
          mainImage: uploadedUrls[0]
        }));
        toast.success('Hauptbild hochgeladen');
      }
    } catch (error) {
      toast.error('Fehler beim Hochladen');
    } finally {
      setLoading(false);
    }
  };

  const removeGalleryImage = (index) => {
    setFormData(prev => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== index)
    }));
  };

  // ============================================================================
  // HANDLERS - Variants
  // ============================================================================
  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        { id: Date.now(), name: '', price: '', stock: 100 }
      ]
    }));
  };

  const updateVariant = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((v, i) => 
        i === index ? { ...v, [field]: value } : v
      )
    }));
  };

  const removeVariant = (index) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }));
  };

  // ============================================================================
  // HANDLERS - Modifiers
  // ============================================================================
  const addModifier = () => {
    setFormData(prev => ({
      ...prev,
      modifiers: [
        ...prev.modifiers,
        { id: Date.now(), name: '', price: '0', required: false }
      ]
    }));
  };

  const updateModifier = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      modifiers: prev.modifiers.map((m, i) => 
        i === index ? { ...m, [field]: value } : m
      )
    }));
  };

  const removeModifier = (index) => {
    setFormData(prev => ({
      ...prev,
      modifiers: prev.modifiers.filter((_, i) => i !== index)
    }));
  };

  // ============================================================================
  // HANDLERS - Modifier Groups
  // ============================================================================
  const addModifierGroup = () => {
    setFormData(prev => ({
      ...prev,
      modifierGroups: [
        ...prev.modifierGroups,
        {
          id: Date.now(),
          name: '',
          required: false,
          multiSelect: false,
          min: 0,
          max: 1,
          options: []
        }
      ]
    }));
  };

  const updateModifierGroup = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      modifierGroups: prev.modifierGroups.map((g, i) => 
        i === index ? { ...g, [field]: value } : g
      )
    }));
  };

  const addModifierOption = (groupIndex) => {
    const newOption = { id: Date.now(), name: '', price: '0' };
    setFormData(prev => ({
      ...prev,
      modifierGroups: prev.modifierGroups.map((g, i) => 
        i === groupIndex 
          ? { ...g, options: [...g.options, newOption] }
          : g
      )
    }));
  };

  const updateModifierOption = (groupIndex, optionIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      modifierGroups: prev.modifierGroups.map((g, i) => 
        i === groupIndex 
          ? {
              ...g,
              options: g.options.map((o, j) => 
                j === optionIndex ? { ...o, [field]: value } : o
              )
            }
          : g
      )
    }));
  };

  // ============================================================================
  // HANDLERS - AI Features
  // ============================================================================
  const generateAIDescription = async () => {
    if (!formData.name.de) {
      toast.error('Bitte geben Sie zuerst einen Produktnamen ein');
      return;
    }
    
    setAiLoading(true);
    try {
      // Simulate AI API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const aiDescriptions = {
        de: `Unser ${formData.name.de} ist ein wahres Geschmackserlebnis! Sorgfältig zubereitet mit den besten Zutaten, bietet dieses Gericht eine perfekte Balance aus Aromen und Texturen. Jeder Bissen ist ein Genuss für die Sinne.`,
        fr: `Notre ${formData.name.de} est une véritable expérience gustative! Préparé avec soin avec les meilleurs ingrédients, ce plat offre un équilibre parfait de saveurs et de textures.`,
        it: `Il nostro ${formData.name.de} è una vera esperienza di gusto! Preparato con cura con i migliori ingredienti, questo piatto offre un perfetto equilibrio di sapori e consistenze.`,
        en: `Our ${formData.name.de} is a true taste experience! Carefully prepared with the finest ingredients, this dish offers a perfect balance of flavors and textures.`
      };
      
      setFormData(prev => ({
        ...prev,
        description: aiDescriptions
      }));
      
      toast.success('KI-Beschreibungen generiert!');
    } catch (error) {
      toast.error('Fehler bei der KI-Generierung');
    } finally {
      setAiLoading(false);
    }
  };

  // ============================================================================
  // HANDLERS - Combo Deals
  // ============================================================================
  const addComboItem = () => {
    setFormData(prev => ({
      ...prev,
      comboItems: [
        ...prev.comboItems,
        { id: Date.now(), productId: '', quantity: 1, required: true }
      ]
    }));
  };

  const updateComboItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      comboItems: prev.comboItems.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeComboItem = (index) => {
    setFormData(prev => ({
      ...prev,
      comboItems: prev.comboItems.filter((_, i) => i !== index)
    }));
  };

  const calculateComboPrice = () => {
    // In real app, would calculate based on selected products
    const basePrice = parseFloat(formData.price) || 0;
    const discount = parseFloat(formData.comboDiscount) || 0;
    const comboPrice = basePrice * (1 - discount / 100);
    
    setFormData(prev => ({
      ...prev,
      comboPrice: comboPrice.toFixed(2)
    }));
  };

  // ============================================================================
  // VALIDATION
  // ============================================================================
  const validateForm = () => {
    const newErrors = {};
    
    // Basic validation
    if (!formData.name[activeLanguage]) {
      newErrors.name = 'Produktname ist erforderlich';
    }
    
    if (!formData.category) {
      newErrors.category = 'Kategorie ist erforderlich';
    }
    
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Gültiger Preis ist erforderlich';
    }
    
    if (!formData.mainImage) {
      newErrors.mainImage = 'Hauptbild ist erforderlich';
    }
    
    // Variant validation
    formData.variants.forEach((variant, index) => {
      if (variant.name && (!variant.price || parseFloat(variant.price) <= 0)) {
        newErrors[`variant_${index}`] = 'Variantenpreis ist ungültig';
      }
    });
    
    // Modifier validation
    formData.modifiers.forEach((modifier, index) => {
      if (!modifier.name) {
        newErrors[`modifier_${index}`] = 'Modifikatorname ist erforderlich';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================================================
  // SUBMIT HANDLER
  // ============================================================================
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Bitte korrigieren Sie die Fehler im Formular');
      return;
    }
    
    setLoading(true);
    try {
      // Prepare data for submission
      const submitData = {
        ...formData,
        // Ensure single language fallback
        name: formData.name[activeLanguage] || formData.name.de,
        description: formData.description[activeLanguage] || formData.description.de,
        // Convert prices to numbers
        price: parseFloat(formData.price),
        variants: formData.variants.map(v => ({
          ...v,
          price: parseFloat(v.price) || 0
        })),
        modifiers: formData.modifiers.map(m => ({
          ...m,
          price: parseFloat(m.price) || 0
        }))
      };
      
      await onSave(submitData);
      onClose();
    } catch (error) {
      toast.error('Fehler beim Speichern des Produkts');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderSectionHeader = (title, section, icon) => {
    const Icon = icon;
    const isExpanded = expandedSections[section];
    
    return (
      <div 
        className={styles.sectionHeader}
        onClick={() => toggleSection(section)}
      >
        <div className={styles.sectionTitle}>
          <Icon size={20} />
          <h3>{title}</h3>
        </div>
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>
    );
  };

  // ============================================================================
  // RENDER - Tabs
  // ============================================================================
  const renderTabs = () => {
    const tabs = [
      { id: 'basic', label: 'Basis', icon: Package },
      { id: 'details', label: 'Details', icon: Info },
      { id: 'pricing', label: 'Preise', icon: DollarSign },
      { id: 'nutrition', label: 'Nährwerte', icon: Coffee },
      { id: 'inventory', label: 'Lager', icon: Package }
    ];
    
    return (
      <div className={styles.tabs}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  // ============================================================================
  // RENDER - Basic Tab
  // ============================================================================
  const renderBasicTab = () => (
    <div className={styles.tabContent}>
      {/* Language Selector */}
      <div className={styles.languageSelector}>
        {LANGUAGES.map(lang => (
          <button
            key={lang.code}
            onClick={() => setActiveLanguage(lang.code)}
            className={`${styles.langButton} ${activeLanguage === lang.code ? styles.active : ''}`}
          >
            <span className={styles.flag}>{lang.flag}</span>
            <span>{lang.label}</span>
          </button>
        ))}
      </div>

      {/* Name */}
      <div className={styles.formGroup}>
        <label>
          Produktname <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          value={formData.name[activeLanguage]}
          onChange={(e) => handleInputChange('name', e.target.value, activeLanguage)}
          placeholder={`Produktname auf ${LANGUAGES.find(l => l.code === activeLanguage).label}`}
          className={errors.name ? styles.error : ''}
        />
        {errors.name && (
          <span className={styles.errorMessage}>
            <AlertCircle size={14} /> {errors.name}
          </span>
        )}
      </div>

      {/* Description */}
      <div className={styles.formGroup}>
        <label>
          Beschreibung
          {featureToggles.aiDescriptions && (
            <button
              type="button"
              onClick={generateAIDescription}
              className={styles.aiButton}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <Loader2 size={14} className={styles.spinner} />
              ) : (
                <Sparkles size={14} />
              )}
              <span>KI-Beschreibung</span>
            </button>
          )}
        </label>
        <textarea
          value={formData.description[activeLanguage]}
          onChange={(e) => handleInputChange('description', e.target.value, activeLanguage)}
          placeholder={`Beschreibung auf ${LANGUAGES.find(l => l.code === activeLanguage).label}`}
          rows={4}
        />
      </div>

      {/* Category & SKU */}
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label>
            Kategorie <span className={styles.required}>*</span>
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className={errors.category ? styles.error : ''}
          >
            <option value="">Kategorie wählen...</option>
            {categories.slice(1).map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
          {errors.category && (
            <span className={styles.errorMessage}>
              <AlertCircle size={14} /> {errors.category}
            </span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>Artikelnummer (SKU)</label>
          <input
            type="text"
            value={formData.sku}
            onChange={(e) => handleInputChange('sku', e.target.value)}
            placeholder="z.B. BUR-001"
          />
        </div>
      </div>

      {/* Images */}
      <div className={styles.imageSection}>
        <h3>Bilder</h3>
        
        {/* Main Image */}
        <div className={styles.mainImageUpload}>
          <label>
            Hauptbild <span className={styles.required}>*</span>
          </label>
          {formData.mainImage ? (
            <div className={styles.mainImagePreview}>
              <img src={formData.mainImage} alt="Hauptbild" />
              <button
                type="button"
                onClick={() => handleInputChange('mainImage', '')}
                className={styles.removeImage}
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <div 
              className={`${styles.uploadArea} ${errors.mainImage ? styles.error : ''}`}
              onClick={() => imageInputRef.current?.click()}
            >
              <ImageIcon size={40} />
              <p>Klicken zum Hochladen</p>
              <span>oder Datei hierher ziehen</span>
            </div>
          )}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(e)}
            style={{ display: 'none' }}
          />
          {errors.mainImage && (
            <span className={styles.errorMessage}>
              <AlertCircle size={14} /> {errors.mainImage}
            </span>
          )}
        </div>

        {/* Gallery */}
        {featureToggles.multipleImages && (
          <div className={styles.galleryUpload}>
            <label>Weitere Bilder</label>
            <div className={styles.galleryGrid}>
              {formData.gallery.map((image, index) => (
                <div key={index} className={styles.galleryItem}>
                  <img src={image} alt={`Bild ${index + 1}`} />
                  <button
                    type="button"
                    onClick={() => removeGalleryImage(index)}
                    className={styles.removeGallery}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <div 
                className={styles.addGalleryImage}
                onClick={() => galleryInputRef.current?.click()}
              >
                <Plus size={24} />
                <span>Bild hinzufügen</span>
              </div>
            </div>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleImageUpload(e, true)}
              style={{ display: 'none' }}
            />
          </div>
        )}
      </div>

      {/* Tags */}
      {featureToggles.productTags && (
        <div className={styles.formGroup}>
          <label>Tags</label>
          <div className={styles.tagSelector}>
            {PRODUCT_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  const newTags = formData.tags.includes(tag)
                    ? formData.tags.filter(t => t !== tag)
                    : [...formData.tags, tag];
                  handleInputChange('tags', newTags);
                }}
                className={`${styles.tagOption} ${
                  formData.tags.includes(tag) ? styles.selected : ''
                }`}
              >
                <Tag size={12} />
                <span>{tag}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // RENDER - Details Tab
  // ============================================================================
  const renderDetailsTab = () => (
    <div className={styles.tabContent}>
      {/* Variants Section */}
      <div className={styles.section}>
        {renderSectionHeader('Varianten', 'variants', Package)}
        
        <AnimatePresence>
          {expandedSections.variants && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={styles.sectionContent}
            >
              {formData.variants.map((variant, index) => (
                <div key={variant.id} className={styles.variantItem}>
                  <GripVertical size={20} className={styles.dragHandle} />
                  <input
                    type="text"
                    value={variant.name}
                    onChange={(e) => updateVariant(index, 'name', e.target.value)}
                    placeholder="Variantenname (z.B. Klein, Groß)"
                    className={styles.variantName}
                  />
                  <input
                    type="number"
                    value={variant.price}
                    onChange={(e) => updateVariant(index, 'price', e.target.value)}
                    placeholder="Preis"
                    step="0.50"
                    min="0"
                    className={styles.variantPrice}
                  />
                  {featureToggles.inventory && (
                    <input
                      type="number"
                      value={variant.stock}
                      onChange={(e) => updateVariant(index, 'stock', e.target.value)}
                      placeholder="Lager"
                      min="0"
                      className={styles.variantStock}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeVariant(index)}
                    className={styles.removeButton}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addVariant}
                className={styles.addButton}
              >
                <Plus size={16} />
                <span>Variante hinzufügen</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modifiers Section */}
      <div className={styles.section}>
        {renderSectionHeader('Modifikatoren', 'modifiers', Plus)}
        
        <AnimatePresence>
          {expandedSections.modifiers && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={styles.sectionContent}
            >
              {/* Simple Modifiers */}
              <h4>Einfache Modifikatoren</h4>
              {formData.modifiers.map((modifier, index) => (
                <div key={modifier.id} className={styles.modifierItem}>
                  <input
                    type="text"
                    value={modifier.name}
                    onChange={(e) => updateModifier(index, 'name', e.target.value)}
                    placeholder="Modifikator (z.B. Extra Käse)"
                  />
                  <input
                    type="number"
                    value={modifier.price}
                    onChange={(e) => updateModifier(index, 'price', e.target.value)}
                    placeholder="Preis"
                    step="0.50"
                    min="0"
                  />
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={modifier.required}
                      onChange={(e) => updateModifier(index, 'required', e.target.checked)}
                    />
                    <span>Pflicht</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => removeModifier(index)}
                    className={styles.removeButton}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addModifier}
                className={styles.addButton}
              >
                <Plus size={16} />
                <span>Modifikator hinzufügen</span>
              </button>

              {/* Modifier Groups */}
              <h4>Auswahlgruppen</h4>
              {formData.modifierGroups.map((group, groupIndex) => (
                <div key={group.id} className={styles.modifierGroup}>
                  <div className={styles.groupHeader}>
                    <input
                      type="text"
                      value={group.name}
                      onChange={(e) => updateModifierGroup(groupIndex, 'name', e.target.value)}
                      placeholder="Gruppenname (z.B. Beilage wählen)"
                      className={styles.groupName}
                    />
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={group.required}
                        onChange={(e) => updateModifierGroup(groupIndex, 'required', e.target.checked)}
                      />
                      <span>Pflichtauswahl</span>
                    </label>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={group.multiSelect}
                        onChange={(e) => updateModifierGroup(groupIndex, 'multiSelect', e.target.checked)}
                      />
                      <span>Mehrfachauswahl</span>
                    </label>
                  </div>
                  
                  {group.multiSelect && (
                    <div className={styles.groupLimits}>
                      <label>
                        Min:
                        <input
                          type="number"
                          value={group.min}
                          onChange={(e) => updateModifierGroup(groupIndex, 'min', e.target.value)}
                          min="0"
                          max={group.max}
                        />
                      </label>
                      <label>
                        Max:
                        <input
                          type="number"
                          value={group.max}
                          onChange={(e) => updateModifierGroup(groupIndex, 'max', e.target.value)}
                          min={group.min}
                        />
                      </label>
                    </div>
                  )}
                  
                  <div className={styles.groupOptions}>
                    {group.options.map((option, optionIndex) => (
                      <div key={option.id} className={styles.optionItem}>
                        <input
                          type="text"
                          value={option.name}
                          onChange={(e) => updateModifierOption(groupIndex, optionIndex, 'name', e.target.value)}
                          placeholder="Option (z.B. Pommes)"
                        />
                        <input
                          type="number"
                          value={option.price}
                          onChange={(e) => updateModifierOption(groupIndex, optionIndex, 'price', e.target.value)}
                          placeholder="Aufpreis"
                          step="0.50"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newOptions = [...group.options];
                            newOptions.splice(optionIndex, 1);
                            updateModifierGroup(groupIndex, 'options', newOptions);
                          }}
                          className={styles.removeButton}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={() => addModifierOption(groupIndex)}
                      className={styles.addOptionButton}
                    >
                      <Plus size={14} />
                      <span>Option hinzufügen</span>
                    </button>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      const newGroups = [...formData.modifierGroups];
                      newGroups.splice(groupIndex, 1);
                      handleInputChange('modifierGroups', newGroups);
                    }}
                    className={styles.removeGroupButton}
                  >
                    <Trash2 size={16} />
                    <span>Gruppe entfernen</span>
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addModifierGroup}
                className={styles.addButton}
              >
                <Plus size={16} />
                <span>Auswahlgruppe hinzufügen</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Allergenes & Dietary */}
      <div className={styles.section}>
        <h3>Allergene & Ernährung</h3>
        
        <div className={styles.formGroup}>
          <label>Allergene</label>
          <div className={styles.allergenGrid}>
            {ALLERGENS.map(allergen => (
              <label key={allergen.id} className={styles.allergenItem}>
                <input
                  type="checkbox"
                  checked={formData.allergens.includes(allergen.id)}
                  onChange={(e) => {
                    const newAllergens = e.target.checked
                      ? [...formData.allergens, allergen.id]
                      : formData.allergens.filter(a => a !== allergen.id);
                    handleInputChange('allergens', newAllergens);
                  }}
                />
                <span className={styles.allergenIcon}>{allergen.icon}</span>
                <span>{allergen.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Ernährungslabels</label>
          <div className={styles.dietaryGrid}>
            {DIETARY_LABELS.map(label => (
              <label 
                key={label.id} 
                className={styles.dietaryItem}
                style={{ 
                  backgroundColor: formData.dietary.includes(label.id) 
                    ? label.color + '20'
                    : 'transparent',
                  borderColor: formData.dietary.includes(label.id)
                    ? label.color
                    : '#e5e7eb'
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.dietary.includes(label.id)}
                  onChange={(e) => {
                    const newDietary = e.target.checked
                      ? [...formData.dietary, label.id]
                      : formData.dietary.filter(d => d !== label.id);
                    handleInputChange('dietary', newDietary);
                  }}
                />
                <span className={styles.dietaryIcon}>{label.icon}</span>
                <span>{label.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Zutaten</label>
          <textarea
            value={formData.ingredients}
            onChange={(e) => handleInputChange('ingredients', e.target.value)}
            placeholder="Liste der Zutaten, durch Kommas getrennt"
            rows={3}
          />
        </div>
      </div>

      {/* Preparation */}
      {featureToggles.preparationTime && (
        <div className={styles.section}>
          <h3>Zubereitung</h3>
          
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Zubereitungszeit (Minuten)</label>
              <input
                type="number"
                value={formData.preparationTime}
                onChange={(e) => handleInputChange('preparationTime', e.target.value)}
                min="1"
                max="120"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Küchen-Station</label>
              <select
                value={formData.preparationStation}
                onChange={(e) => handleInputChange('preparationStation', e.target.value)}
              >
                <option value="">Station wählen...</option>
                {PREPARATION_STATIONS.map(station => (
                  <option key={station.id} value={station.id}>
                    {station.icon} {station.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // RENDER - Pricing Tab
  // ============================================================================
  const renderPricingTab = () => (
    <div className={styles.tabContent}>
      {/* Base Price */}
      <div className={styles.section}>
        <h3>Grundpreis</h3>
        
        <div className={styles.formGroup}>
          <label>
            Preis (CHF) <span className={styles.required}>*</span>
          </label>
          <div className={styles.priceInput}>
            <span className={styles.currency}>CHF</span>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
              placeholder="0.00"
              step="0.50"
              min="0"
              className={errors.price ? styles.error : ''}
            />
          </div>
          {errors.price && (
            <span className={styles.errorMessage}>
              <AlertCircle size={14} /> {errors.price}
            </span>
          )}
        </div>
      </div>

      {/* Happy Hour */}
      {featureToggles.happyHourPricing && (
        <div className={styles.section}>
          {renderSectionHeader('Happy Hour', 'happyHour', Clock)}
          
          <AnimatePresence>
            {expandedSections.happyHour && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={styles.sectionContent}
              >
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={formData.happyHourEnabled}
                    onChange={(e) => handleInputChange('happyHourEnabled', e.target.checked)}
                  />
                  <span>Happy Hour aktivieren</span>
                </label>
                
                {formData.happyHourEnabled && (
                  <>
                    <div className={styles.formGroup}>
                      <label>Happy Hour Preis (CHF)</label>
                      <div className={styles.priceInput}>
                        <span className={styles.currency}>CHF</span>
                        <input
                          type="number"
                          value={formData.happyHourPrice}
                          onChange={(e) => handleInputChange('happyHourPrice', e.target.value)}
                          placeholder="0.00"
                          step="0.50"
                          min="0"
                        />
                      </div>
                    </div>
                    
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label>Start</label>
                        <input
                          type="time"
                          value={formData.happyHourStart}
                          onChange={(e) => handleInputChange('happyHourStart', e.target.value)}
                        />
                      </div>
                      
                      <div className={styles.formGroup}>
                        <label>Ende</label>
                        <input
                          type="time"
                          value={formData.happyHourEnd}
                          onChange={(e) => handleInputChange('happyHourEnd', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className={styles.formGroup}>
                      <label>Wochentage</label>
                      <div className={styles.weekDays}>
                        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day, index) => (
                          <label key={index} className={styles.dayCheckbox}>
                            <input
                              type="checkbox"
                              checked={formData.happyHourDays.includes(index + 1)}
                              onChange={(e) => {
                                const newDays = e.target.checked
                                  ? [...formData.happyHourDays, index + 1]
                                  : formData.happyHourDays.filter(d => d !== index + 1);
                                handleInputChange('happyHourDays', newDays.sort());
                              }}
                            />
                            <span>{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Combo Deals */}
      {featureToggles.combos && (
        <div className={styles.section}>
          {renderSectionHeader('Combo-Angebote', 'combo', ShoppingCart)}
          
          <AnimatePresence>
            {expandedSections.combo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={styles.sectionContent}
              >
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={formData.comboEnabled}
                    onChange={(e) => handleInputChange('comboEnabled', e.target.checked)}
                  />
                  <span>Als Combo-Angebot verfügbar</span>
                </label>
                
                {formData.comboEnabled && (
                  <>
                    <div className={styles.comboBuilder}>
                      <h4>Combo-Artikel</h4>
                      {formData.comboItems.map((item, index) => (
                        <div key={item.id} className={styles.comboItem}>
                          <select
                            value={item.productId}
                            onChange={(e) => updateComboItem(index, 'productId', e.target.value)}
                          >
                            <option value="">Produkt wählen...</option>
                            <option value="fries">Pommes Frites</option>
                            <option value="drink">Getränk</option>
                            <option value="salad">Salat</option>
                            <option value="dessert">Dessert</option>
                          </select>
                          
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateComboItem(index, 'quantity', e.target.value)}
                            min="1"
                            max="10"
                            className={styles.quantity}
                          />
                          
                          <label className={styles.checkboxLabel}>
                            <input
                              type="checkbox"
                              checked={item.required}
                              onChange={(e) => updateComboItem(index, 'required', e.target.checked)}
                            />
                            <span>Pflicht</span>
                          </label>
                          
                          <button
                            type="button"
                            onClick={() => removeComboItem(index)}
                            className={styles.removeButton}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      
                      <button
                        type="button"
                        onClick={addComboItem}
                        className={styles.addButton}
                      >
                        <Plus size={16} />
                        <span>Artikel hinzufügen</span>
                      </button>
                    </div>
                    
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label>Rabatt (%)</label>
                        <input
                          type="number"
                          value={formData.comboDiscount}
                          onChange={(e) => handleInputChange('comboDiscount', e.target.value)}
                          min="0"
                          max="100"
                          step="5"
                        />
                      </div>
                      
                      <div className={styles.formGroup}>
                        <label>Combo-Preis (CHF)</label>
                        <div className={styles.priceInput}>
                          <span className={styles.currency}>CHF</span>
                          <input
                            type="number"
                            value={formData.comboPrice}
                            onChange={(e) => handleInputChange('comboPrice', e.target.value)}
                            placeholder="Berechnet"
                            step="0.50"
                            readOnly
                          />
                          <button
                            type="button"
                            onClick={calculateComboPrice}
                            className={styles.calculateButton}
                          >
                            <Zap size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // RENDER - Nutrition Tab
  // ============================================================================
  const renderNutritionTab = () => (
    <div className={styles.tabContent}>
      {featureToggles.nutritionInfo && (
        <div className={styles.section}>
          {renderSectionHeader('Nährwertangaben', 'nutrition', Coffee)}
          
          <AnimatePresence>
            {expandedSections.nutrition && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={styles.sectionContent}
              >
                <p className={styles.nutritionNote}>
                  Alle Angaben pro 100g/100ml
                </p>
                
                <div className={styles.nutritionGrid}>
                  <div className={styles.formGroup}>
                    <label>Kalorien (kcal)</label>
                    <input
                      type="number"
                      value={formData.nutrition.calories}
                      onChange={(e) => handleNutritionChange('calories', e.target.value)}
                      min="0"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>Protein (g)</label>
                    <input
                      type="number"
                      value={formData.nutrition.protein}
                      onChange={(e) => handleNutritionChange('protein', e.target.value)}
                      min="0"
                      step="0.1"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>Kohlenhydrate (g)</label>
                    <input
                      type="number"
                      value={formData.nutrition.carbs}
                      onChange={(e) => handleNutritionChange('carbs', e.target.value)}
                      min="0"
                      step="0.1"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>Fett (g)</label>
                    <input
                      type="number"
                      value={formData.nutrition.fat}
                      onChange={(e) => handleNutritionChange('fat', e.target.value)}
                      min="0"
                      step="0.1"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>Ballaststoffe (g)</label>
                    <input
                      type="number"
                      value={formData.nutrition.fiber}
                      onChange={(e) => handleNutritionChange('fiber', e.target.value)}
                      min="0"
                      step="0.1"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>Zucker (g)</label>
                    <input
                      type="number"
                      value={formData.nutrition.sugar}
                      onChange={(e) => handleNutritionChange('sugar', e.target.value)}
                      min="0"
                      step="0.1"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>Salz (g)</label>
                    <input
                      type="number"
                      value={formData.nutrition.salt}
                      onChange={(e) => handleNutritionChange('salt', e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // RENDER - Inventory Tab
  // ============================================================================
  const renderInventoryTab = () => (
    <div className={styles.tabContent}>
      {featureToggles.inventory && (
        <div className={styles.section}>
          {renderSectionHeader('Lagerverwaltung', 'inventory', Package)}
          
          <AnimatePresence>
            {expandedSections.inventory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={styles.sectionContent}
              >
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={formData.trackInventory}
                    onChange={(e) => handleInputChange('trackInventory', e.target.checked)}
                  />
                  <span>Lagerbestand verfolgen</span>
                </label>
                
                {formData.trackInventory && (
                  <>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label>Aktueller Bestand</label>
                        <input
                          type="number"
                          value={formData.stock}
                          onChange={(e) => handleInputChange('stock', e.target.value)}
                          min="0"
                        />
                      </div>
                      
                      <div className={styles.formGroup}>
                        <label>Mindestbestand für Warnung</label>
                        <input
                          type="number"
                          value={formData.lowStockAlert}
                          onChange={(e) => handleInputChange('lowStockAlert', e.target.value)}
                          min="0"
                        />
                      </div>
                    </div>
                    
                    <div className={styles.stockWarning}>
                      <AlertTriangle size={16} />
                      <span>
                        Bei Unterschreitung des Mindestbestands wird eine Benachrichtigung gesendet
                      </span>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <div className={styles.modal}>
      <div className={styles.modalOverlay} onClick={onClose} />
      
      <motion.div 
        className={styles.modalContent}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2>
            {product ? 'Produkt bearbeiten' : 'Neues Produkt'}
          </h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        {renderTabs()}

        {/* Content */}
        <div className={styles.modalBody}>
          {activeTab === 'basic' && renderBasicTab()}
          {activeTab === 'details' && renderDetailsTab()}
          {activeTab === 'pricing' && renderPricingTab()}
          {activeTab === 'nutrition' && renderNutritionTab()}
          {activeTab === 'inventory' && renderInventoryTab()}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          {/* Status Toggle */}
          <div className={styles.statusToggle}>
            <label>
              Status:
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
              >
                <option value="active">Aktiv</option>
                <option value="inactive">Inaktiv</option>
                <option value="draft">Entwurf</option>
              </select>
            </label>
          </div>

          {/* Special Badges */}
          <div className={styles.specialBadges}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) => handleInputChange('featured', e.target.checked)}
              />
              <Star size={16} />
              <span>Empfohlen</span>
            </label>
            
            {featureToggles.newBadge && (
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.isNew}
                  onChange={(e) => handleInputChange('isNew', e.target.checked)}
                />
                <Sparkles size={16} />
                <span>Neu</span>
              </label>
            )}
          </div>

          {/* Actions */}
          <div className={styles.modalActions}>
            <button 
              onClick={onClose} 
              className={styles.cancelButton}
              disabled={loading}
            >
              Abbrechen
            </button>
            
            <button 
              onClick={handleSubmit}
              className={styles.saveButton}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={20} className={styles.spinner} />
                  <span>Speichern...</span>
                </>
              ) : (
                <>
                  <Save size={20} />
                  <span>{product ? 'Aktualisieren' : 'Erstellen'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProductModal;