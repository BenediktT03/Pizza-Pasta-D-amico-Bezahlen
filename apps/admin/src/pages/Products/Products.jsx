/**
 * EATECH - Admin Products Management
 * Version: 17.0.0
 * File Path: /apps/admin/src/pages/Products/Products.jsx
 */

import React, { useState, useCallback } from 'react';
import { 
  Plus, Search, Filter, Download, Upload, Edit, Trash2, Eye, EyeOff,
  Package, AlertCircle, Check, X, Loader2, ImagePlus
} from 'lucide-react';
import styles from './Products.module.css';

// Firebase direkt hier initialisieren (vermeidet alle Import-Probleme)
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, set, onValue, update, remove } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmU",
  authDomain: "eatech-foodtruck.firebaseapp.com",
  databaseURL: "https://eatech-foodtruck-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "eatech-foodtruck",
  storageBucket: "eatech-foodtruck.firebasestorage.app",
  messagingSenderId: "261222802445",
  appId: "1:261222802445:web:edde22580422fbced22144"
};

// App mit eindeutigem Namen initialisieren
const app = initializeApp(firebaseConfig, 'admin-products');
const database = getDatabase(app);
const TENANT_ID = 'demo-restaurant';

// ============================================================================
// CUSTOM HOOK
// ============================================================================

const useProducts = () => {
  const [products, setProducts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [creating, setCreating] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    try {
      const productsRef = ref(database, `tenants/${TENANT_ID}/products`);
      
      const unsubscribe = onValue(productsRef, (snapshot) => {
        const items = [];
        if (snapshot.exists()) {
          snapshot.forEach((child) => {
            items.push({ 
              id: child.key, 
              ...child.val(),
              allergens: child.val().allergens || [],
              stock: child.val().stock || { enabled: false, quantity: 0 }
            });
          });
        }
        setProducts(items);
        setLoading(false);
      }, (error) => {
        console.error('Firebase read error:', error);
        setError(error.message);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error('Setup error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  const createProduct = async (productData) => {
    setCreating(true);
    try {
      const productsRef = ref(database, `tenants/${TENANT_ID}/products`);;
      const newRef = push(productsRef);
      
      const product = {
        ...productData,
        id: newRef.key,
        createdAt: Date.now(),
        tenantId: TENANT_ID
      };
      
      await set(newRef, product);
      return product;
    } catch (error) {
      console.error('Create error:', error);
      throw error;
    } finally {
      setCreating(false);
    }
  };

  const updateProduct = async (productId, updates) => {
    setUpdating(true);
    try {
      const productsRef = ref(database, `tenants/${TENANT_ID}/products`);
      const productRef = ref(db, `tenants/${TENANT_ID}/products/${productId}`);
      await update(productRef, {
        ...updates,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('Update error:', error);
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  const deleteProduct = async (productId) => {
    setDeleting(true);
    try {
      const productsRef = ref(database, `tenants/${TENANT_ID}/products`);
      const productRef = ref(db, `tenants/${TENANT_ID}/products/${productId}`);
      await remove(productRef);
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    } finally {
      setDeleting(false);
    }
  };

  const toggleAvailability = async (productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      await updateProduct(productId, { available: !product.available });
    }
  };

  const updateStock = async (productId, quantity) => {
    await updateProduct(productId, { 
      stock: { enabled: true, quantity } 
    });
  };

  return {
    products,
    loading,
    error,
    creating,
    updating,
    deleting,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleAvailability,
    updateStock,
    refresh: () => window.location.reload()
  };
};

// ============================================================================
// PRODUCT FORM MODAL
// ============================================================================

const ProductFormModal = ({ product, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    category: product?.category || '',
    imageUrl: product?.imageUrl || '',
    imageFile: null,
    available: product?.available !== false,
    featured: product?.featured || false,
    preparationTime: product?.preparationTime || 15,
    ingredients: product?.ingredients?.join(', ') || '',
    allergens: product?.allergens || [],
    stockEnabled: product?.stock?.enabled || false,
    stockQuantity: product?.stock?.quantity || 0
  });
  
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState(product?.imageUrl || null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, imageFile: file }));
      
      // Preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAllergenToggle = (allergen) => {
    setFormData(prev => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter(a => a !== allergen)
        : [...prev.allergens, allergen]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        ingredients: formData.ingredients.split(',').map(i => i.trim()).filter(Boolean),
        stock: {
          enabled: formData.stockEnabled,
          quantity: parseInt(formData.stockQuantity) || 0,
          lowStockAlert: 10
        }
      };

      await onSave(productData);
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setSaving(false);
    }
  };

  const allergenOptions = [
    'Gluten', 'Milch', 'Eier', 'Nüsse', 'Erdnüsse', 
    'Soja', 'Fisch', 'Krebstiere', 'Sellerie', 'Senf'
  ];

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>{product ? 'Produkt bearbeiten' : 'Neues Produkt'}</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.productForm}>
          {/* Image Upload */}
          <div className={styles.imageUpload}>
            <input
              type="file"
              id="imageFile"
              accept="image/*"
              onChange={handleImageChange}
              className={styles.hiddenInput}
            />
            <label htmlFor="imageFile" className={styles.imageUploadLabel}>
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" />
              ) : (
                <div className={styles.uploadPlaceholder}>
                  <ImagePlus size={48} />
                  <span>Bild hochladen</span>
                </div>
              )}
            </label>
          </div>

          {/* Basic Info */}
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="name">Produktname *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="z.B. Cheeseburger"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="category">Kategorie *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
              >
                <option value="">Wähle Kategorie</option>
                <option value="burger">Burger</option>
                <option value="pizza">Pizza</option>
                <option value="salat">Salate</option>
                <option value="getraenke">Getränke</option>
                <option value="dessert">Desserts</option>
                <option value="beilage">Beilagen</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="price">Preis (CHF) *</label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                required
                min="0"
                step="0.50"
                placeholder="18.50"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="preparationTime">Zubereitungszeit (Min)</label>
              <input
                type="number"
                id="preparationTime"
                name="preparationTime"
                value={formData.preparationTime}
                onChange={handleInputChange}
                min="1"
                placeholder="15"
              />
            </div>
          </div>

          {/* Description */}
          <div className={styles.formGroup}>
            <label htmlFor="description">Beschreibung</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              placeholder="Leckere Beschreibung des Produkts..."
            />
          </div>

          {/* Ingredients */}
          <div className={styles.formGroup}>
            <label htmlFor="ingredients">Zutaten (kommagetrennt)</label>
            <input
              type="text"
              id="ingredients"
              name="ingredients"
              value={formData.ingredients}
              onChange={handleInputChange}
              placeholder="Rindfleisch, Käse, Salat, Tomate"
            />
          </div>

          {/* Allergens */}
          <div className={styles.formGroup}>
            <label>Allergene</label>
            <div className={styles.allergenGrid}>
              {allergenOptions.map(allergen => (
                <label key={allergen} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.allergens.includes(allergen)}
                    onChange={() => handleAllergenToggle(allergen)}
                  />
                  <span>{allergen}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className={styles.formOptions}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="available"
                checked={formData.available}
                onChange={handleInputChange}
              />
              <span>Verfügbar</span>
            </label>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="featured"
                checked={formData.featured}
                onChange={handleInputChange}
              />
              <span>Empfohlen</span>
            </label>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="stockEnabled"
                checked={formData.stockEnabled}
                onChange={handleInputChange}
              />
              <span>Lagerbestand verwalten</span>
            </label>
          </div>

          {/* Stock Quantity */}
          {formData.stockEnabled && (
            <div className={styles.formGroup}>
              <label htmlFor="stockQuantity">Lagerbestand</label>
              <input
                type="number"
                id="stockQuantity"
                name="stockQuantity"
                value={formData.stockQuantity}
                onChange={handleInputChange}
                min="0"
                placeholder="0"
              />
            </div>
          )}

          {/* Actions */}
          <div className={styles.modalActions}>
            <button 
              type="button" 
              onClick={onClose} 
              className={styles.cancelButton}
              disabled={saving}
            >
              Abbrechen
            </button>
            <button 
              type="submit" 
              className={styles.saveButton}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className={styles.spinner} />
                  Speichern...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Speichern
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Products = () => {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState(new Set());

  // Firebase Hook
  const {
    products,
    loading,
    error,
    creating,
    updating,
    deleting,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleAvailability,
    refresh
  } = useProducts();

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Categories
  const categories = [
    { value: 'all', label: 'Alle Kategorien' },
    { value: 'burger', label: 'Burger' },
    { value: 'pizza', label: 'Pizza' },
    { value: 'salat', label: 'Salate' },
    { value: 'getraenke', label: 'Getränke' },
    { value: 'dessert', label: 'Desserts' },
    { value: 'beilage', label: 'Beilagen' }
  ];

  // Handlers
  const handleCreateProduct = () => {
    setEditingProduct(null);
    setShowFormModal(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowFormModal(true);
  };

  const handleSaveProduct = async (productData) => {
    if (editingProduct) {
      await updateProduct(editingProduct.id, productData);
    } else {
      await createProduct(productData);
    }
  };

  const handleDeleteProduct = async (product) => {
    if (window.confirm(`Möchtest du "${product.name}" wirklich löschen?`)) {
      await deleteProduct(product.id);
    }
  };

  const handleToggleAvailability = async (product) => {
    await toggleAvailability(product.id);
  };

  const handleSelectProduct = (productId) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF'
    }).format(price);
  };

  // Loading state
  if (loading && products.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 size={48} className={styles.spinner} />
        <p>Produkte werden geladen...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle size={48} />
        <h2>Fehler beim Laden der Produkte</h2>
        <p>{error}</p>
        <button onClick={refresh} className={styles.retryButton}>
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div className={styles.productsPage}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Produkte</h1>
          <p>{products.length} Produkte insgesamt</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.iconButton}>
            <Download size={20} />
          </button>
          <button className={styles.iconButton}>
            <Upload size={20} />
          </button>
          <button 
            onClick={handleCreateProduct}
            className={styles.primaryButton}
          >
            <Plus size={20} />
            Neues Produkt
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <Search size={20} />
          <input
            type="text"
            placeholder="Produkte suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.filters}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={styles.categoryFilter}
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedProducts.size > 0 && (
        <div className={styles.bulkActions}>
          <span>{selectedProducts.size} ausgewählt</span>
          <button className={styles.bulkButton}>
            <Eye size={16} />
            Aktivieren
          </button>
          <button className={styles.bulkButton}>
            <EyeOff size={16} />
            Deaktivieren
          </button>
          <button className={styles.bulkButton + ' ' + styles.danger}>
            <Trash2 size={16} />
            Löschen
          </button>
        </div>
      )}

      {/* Products Grid */}
      <div className={styles.productsGrid}>
        {filteredProducts.map(product => (
          <div 
            key={product.id} 
            className={`${styles.productCard} ${!product.available ? styles.unavailable : ''}`}
          >
            {/* Selection Checkbox */}
            <div className={styles.cardSelection}>
              <input
                type="checkbox"
                checked={selectedProducts.has(product.id)}
                onChange={() => handleSelectProduct(product.id)}
              />
            </div>

            {/* Product Image */}
            <div className={styles.productImage}>
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} />
              ) : (
                <div className={styles.imagePlaceholder}>
                  <Package size={48} />
                </div>
              )}
              {product.featured && (
                <span className={styles.featuredBadge}>Empfohlen</span>
              )}
            </div>

            {/* Product Info */}
            <div className={styles.productInfo}>
              <h3>{product.name}</h3>
              <p className={styles.category}>{product.category}</p>
              <p className={styles.description}>{product.description}</p>
              
              {/* Allergens */}
              {product.allergens?.length > 0 && (
                <div className={styles.allergens}>
                  {product.allergens.map(allergen => (
                    <span key={allergen} className={styles.allergenTag}>
                      {allergen}
                    </span>
                  ))}
                </div>
              )}

              {/* Stock Info */}
              {product.stock?.enabled && (
                <div className={styles.stockInfo}>
                  <Package size={14} />
                  <span>Lager: {product.stock.quantity}</span>
                  {product.stock.quantity <= 10 && (
                    <span className={styles.lowStock}>Niedriger Bestand</span>
                  )}
                </div>
              )}
            </div>

            {/* Product Footer */}
            <div className={styles.productFooter}>
              <div className={styles.price}>{formatPrice(product.price)}</div>
              <div className={styles.productActions}>
                <button
                  onClick={() => handleToggleAvailability(product)}
                  className={styles.iconButton}
                  title={product.available ? 'Deaktivieren' : 'Aktivieren'}
                >
                  {product.available ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button
                  onClick={() => handleEditProduct(product)}
                  className={styles.iconButton}
                  title="Bearbeiten"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDeleteProduct(product)}
                  className={styles.iconButton + ' ' + styles.danger}
                  title="Löschen"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className={styles.emptyState}>
          <Package size={64} />
          <h2>Keine Produkte gefunden</h2>
          <p>Erstelle dein erstes Produkt oder ändere deine Filtereinstellungen.</p>
          <button onClick={handleCreateProduct} className={styles.primaryButton}>
            <Plus size={20} />
            Erstes Produkt erstellen
          </button>
        </div>
      )}

      {/* Product Form Modal */}
      {showFormModal && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => setShowFormModal(false)}
          onSave={handleSaveProduct}
        />
      )}
    </div>
  );
};

export default Products;