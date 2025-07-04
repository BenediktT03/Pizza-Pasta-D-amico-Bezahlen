/**
 * EATECH - Admin Products Management
 * Version: 21.0.0 - Vollständige Version mit Firebase CDN
 * File Path: /apps/admin/src/pages/Products/Products.jsx
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Download, Upload, Edit, Trash2, Eye, EyeOff,
  Package, AlertCircle, Check, X, Loader2, ImagePlus
} from 'lucide-react';
import styles from './Products.module.css';

// Firebase ist global verfügbar durch index.html
const TENANT_ID = 'demo-restaurant';

// ============================================================================
// CUSTOM HOOK für Firebase Products
// ============================================================================
const useFirebaseProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (typeof firebase === 'undefined') {
      setError('Firebase nicht geladen');
      setLoading(false);
      return;
    }

    console.log('🔥 Verbinde mit Firebase...');
    const database = firebase.database();
    const productsRef = database.ref(`tenants/${TENANT_ID}/products`);
    
    productsRef.on('value', 
      (snapshot) => {
        const items = [];
        if (snapshot.exists()) {
          snapshot.forEach((child) => {
            const data = child.val();
            items.push({
              id: child.key,
              ...data,
              allergens: data.allergens || [],
              stock: data.stock || { enabled: false, quantity: 0, lowStockAlert: 10 }
            });
          });
        }
        console.log(`✅ ${items.length} Produkte geladen`);
        setProducts(items);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error('❌ Firebase Fehler:', error);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => {
      console.log('🧹 Cleanup Firebase listener');
      productsRef.off('value');
    };
  }, []);

  const createProduct = async (productData) => {
    setCreating(true);
    try {
      const database = firebase.database();
      const productsRef = database.ref(`tenants/${TENANT_ID}/products`);
      const newRef = productsRef.push();
      
      const product = {
        ...productData,
        id: newRef.key,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tenantId: TENANT_ID
      };
      
      await newRef.set(product);
      console.log('✅ Produkt erstellt:', product.name);
      return product;
    } catch (error) {
      console.error('❌ Fehler beim Erstellen:', error);
      throw error;
    } finally {
      setCreating(false);
    }
  };

  const updateProduct = async (productId, updates) => {
    setUpdating(true);
    try {
      const database = firebase.database();
      const productRef = database.ref(`tenants/${TENANT_ID}/products/${productId}`);
      await productRef.update({
        ...updates,
        updatedAt: Date.now()
      });
      console.log('✅ Produkt aktualisiert:', productId);
    } catch (error) {
      console.error('❌ Fehler beim Update:', error);
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  const deleteProduct = async (productId) => {
    setDeleting(true);
    try {
      const database = firebase.database();
      const productRef = database.ref(`tenants/${TENANT_ID}/products/${productId}`);
      await productRef.remove();
      console.log('✅ Produkt gelöscht:', productId);
    } catch (error) {
      console.error('❌ Fehler beim Löschen:', error);
      throw error;
    } finally {
      setDeleting(false);
    }
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
    deleteProduct
  };
};

// ============================================================================
// HAUPTKOMPONENTE
// ============================================================================
const Products = () => {
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
    deleteProduct 
  } = useFirebaseProducts();

  // States
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'main',
    imageUrl: '',
    available: true,
    featured: false,
    ingredients: [],
    allergens: [],
    preparationTime: 15,
    spicyLevel: 0,
    vegetarian: false,
    vegan: false,
    stock: {
      enabled: false,
      quantity: 0,
      lowStockAlert: 10
    }
  });

  // Kategorien
  const categories = [
    { value: 'all', label: 'Alle Kategorien', icon: Package },
    { value: 'vorspeise', label: 'Vorspeisen' },
    { value: 'main', label: 'Hauptgerichte' },
    { value: 'beilage', label: 'Beilagen' },
    { value: 'dessert', label: 'Desserts' },
    { value: 'getraenk', label: 'Getränke' },
    { value: 'spezial', label: 'Spezialitäten' }
  ];

  // Allergene Liste
  const allergensList = [
    'Gluten', 'Milch', 'Eier', 'Nüsse', 'Erdnüsse', 
    'Soja', 'Fisch', 'Krebstiere', 'Sellerie', 'Senf'
  ];

  // Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price) || 0
      };
      
      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
        setEditingProduct(null);
      } else {
        await createProduct(productData);
      }
      
      // Reset form
      resetForm();
      setShowAddProduct(false);
    } catch (error) {
      console.error('Submit error:', error);
      alert('Fehler beim Speichern: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'main',
      imageUrl: '',
      available: true,
      featured: false,
      ingredients: [],
      allergens: [],
      preparationTime: 15,
      spicyLevel: 0,
      vegetarian: false,
      vegan: false,
      stock: {
        enabled: false,
        quantity: 0,
        lowStockAlert: 10
      }
    });
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      ...product,
      price: product.price.toString()
    });
    setShowAddProduct(true);
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Produkt wirklich löschen?')) {
      try {
        await deleteProduct(productId);
      } catch (error) {
        console.error('Delete error:', error);
        alert('Fehler beim Löschen: ' + error.message);
      }
    }
  };

  const toggleProductAvailability = async (product) => {
    try {
      await updateProduct(product.id, { available: !product.available });
    } catch (error) {
      console.error('Toggle error:', error);
      alert('Fehler beim Ändern: ' + error.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    
    if (window.confirm(`${selectedProducts.length} Produkte wirklich löschen?`)) {
      try {
        await Promise.all(selectedProducts.map(id => deleteProduct(id)));
        setSelectedProducts([]);
      } catch (error) {
        console.error('Bulk delete error:', error);
        alert('Fehler beim Löschen: ' + error.message);
      }
    }
  };

  const handleExport = () => {
    const data = products.map(p => ({
      Name: p.name,
      Beschreibung: p.description,
      Preis: p.price,
      Kategorie: p.category,
      Verfügbar: p.available ? 'Ja' : 'Nein',
      Vorbereitungszeit: p.preparationTime,
      Vegetarisch: p.vegetarian ? 'Ja' : 'Nein',
      Vegan: p.vegan ? 'Ja' : 'Nein'
    }));
    
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).map(v => `"${v}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter & Sort
  const filteredProducts = products
    .filter(product => {
      if (filterCategory !== 'all' && product.category !== filterCategory) return false;
      if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (sortBy === 'price') {
        aVal = parseFloat(aVal);
        bVal = parseFloat(bVal);
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  // Loading State
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.spinner} />
        <p>Produkte werden geladen...</p>
      </div>
    );
  }

  // Error State
  if (error && !products.length) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle className={styles.errorIcon} />
        <h2>Fehler beim Laden der Produkte</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className={styles.button}>
          Neu laden
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Status Banner */}
      <div className={styles.infoBanner} style={{ background: '#065F46', borderColor: '#10B981' }}>
        ✅ Firebase Echtzeitdaten aktiv
      </div>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Produkte</h1>
          <span className={styles.productCount}>
            {filteredProducts.length} von {products.length} Produkten
          </span>
        </div>
        
        <div className={styles.headerActions}>
          <button
            onClick={() => setShowAddProduct(true)}
            className={`${styles.button} ${styles.buttonPrimary}`}
            disabled={creating}
          >
            <Plus /> Neues Produkt
          </button>
          
          <button 
            onClick={handleExport} 
            className={styles.button} 
            disabled={!products.length}
          >
            <Download /> Export
          </button>
          
          {selectedProducts.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className={`${styles.button} ${styles.buttonDanger}`}
              disabled={deleting}
            >
              <Trash2 /> {selectedProducts.length} löschen
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className={styles.searchBar}>
        <div className={styles.searchInput}>
          <Search className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Produkte suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <select 
          value={filterCategory} 
          onChange={(e) => setFilterCategory(e.target.value)}
          className={styles.select}
        >
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
        
        <button 
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className={styles.button}
        >
          <Filter /> Sortieren
        </button>
      </div>

      {/* Product Grid */}
      {filteredProducts.length > 0 ? (
        <div className={styles.productGrid}>
          {filteredProducts.map(product => (
            <div key={product.id} className={styles.productCard}>
              {/* Checkbox */}
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={selectedProducts.includes(product.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedProducts([...selectedProducts, product.id]);
                  } else {
                    setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                  }
                }}
              />
              
              {/* Product Image */}
              <div className={styles.productImage}>
                {product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={styles.imagePlaceholder} style={{display: product.imageUrl ? 'none' : 'flex'}}>
                  <ImagePlus />
                </div>
                
                {product.featured && (
                  <span className={styles.featuredBadge}>Featured</span>
                )}
              </div>
              
              {/* Product Info */}
              <div className={styles.productInfo}>
                <h3>{product.name}</h3>
                <p className={styles.description}>{product.description}</p>
                
                <div className={styles.productMeta}>
                  <span className={styles.price}>CHF {product.price}</span>
                  <span className={styles.category}>{product.category}</span>
                  <span className={styles.prepTime}>
                    {product.preparationTime} Min
                  </span>
                </div>
                
                {/* Dietary Info */}
                <div className={styles.dietaryInfo}>
                  {product.vegetarian && (
                    <span className={styles.dietBadge}>Vegetarisch</span>
                  )}
                  {product.vegan && (
                    <span className={styles.dietBadge}>Vegan</span>
                  )}
                  {product.spicyLevel > 0 && (
                    <span className={styles.spicyBadge}>
                      {'🌶️'.repeat(product.spicyLevel)}
                    </span>
                  )}
                </div>
                
                {/* Stock Info */}
                {product.stock?.enabled && (
                  <div className={styles.stockInfo}>
                    <span className={product.stock.quantity < product.stock.lowStockAlert ? 
                      styles.stockLow : styles.stockOk}>
                      Lager: {product.stock.quantity}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className={styles.productActions}>
                <button
                  onClick={() => toggleProductAvailability(product)}
                  className={`${styles.iconButton} ${product.available ? styles.active : ''}`}
                  title={product.available ? 'Verfügbar' : 'Nicht verfügbar'}
                  disabled={updating}
                >
                  {product.available ? <Eye /> : <EyeOff />}
                </button>
                
                <button
                  onClick={() => handleEdit(product)}
                  className={styles.iconButton}
                  title="Bearbeiten"
                  disabled={updating}
                >
                  <Edit />
                </button>
                
                <button
                  onClick={() => handleDelete(product.id)}
                  className={`${styles.iconButton} ${styles.danger}`}
                  title="Löschen"
                  disabled={deleting}
                >
                  <Trash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Package className={styles.emptyIcon} />
          <h3>Keine Produkte gefunden</h3>
          <p>
            {searchQuery || filterCategory !== 'all' 
              ? 'Versuche deine Filtereinstellungen zu ändern'
              : 'Erstelle dein erstes Produkt'}
          </p>
          {!searchQuery && filterCategory === 'all' && (
            <button
              onClick={() => setShowAddProduct(true)}
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              <Plus /> Erstes Produkt erstellen
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showAddProduct && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>{editingProduct ? 'Produkt bearbeiten' : 'Neues Produkt'}</h2>
              <button 
                onClick={() => {
                  setShowAddProduct(false);
                  setEditingProduct(null);
                  resetForm();
                }}
                className={styles.closeButton}
              >
                <X />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className={styles.productForm}>
              {/* Basic Info */}
              <div className={styles.formSection}>
                <h3>Grundinformationen</h3>
                
                <div className={styles.formGroup}>
                  <label>Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>Beschreibung</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows="3"
                  />
                </div>
                
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Preis (CHF) *</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>Kategorie</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      {categories.filter(c => c.value !== 'all').map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>Zubereitungszeit (Min)</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.preparationTime}
                      onChange={(e) => setFormData({...formData, preparationTime: parseInt(e.target.value) || 15})}
                    />
                  </div>
                </div>
                
                <div className={styles.formGroup}>
                  <label>Bild URL</label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                    placeholder="https://..."
                  />
                  {formData.imageUrl && (
                    <div className={styles.imagePreview}>
                      <img 
                        src={formData.imageUrl} 
                        alt="Preview"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Options */}
              <div className={styles.formSection}>
                <h3>Optionen</h3>
                
                <div className={styles.checkboxGroup}>
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.available}
                      onChange={(e) => setFormData({...formData, available: e.target.checked})}
                    />
                    Verfügbar
                  </label>
                  
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={(e) => setFormData({...formData, featured: e.target.checked})}
                    />
                    Featured
                  </label>
                  
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.vegetarian}
                      onChange={(e) => setFormData({...formData, vegetarian: e.target.checked})}
                    />
                    Vegetarisch
                  </label>
                  
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.vegan}
                      onChange={(e) => setFormData({...formData, vegan: e.target.checked})}
                    />
                    Vegan
                  </label>
                </div>
                
                <div className={styles.formGroup}>
                  <label>Schärfegrad: {formData.spicyLevel > 0 && '🌶️'.repeat(formData.spicyLevel)}</label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    value={formData.spicyLevel}
                    onChange={(e) => setFormData({...formData, spicyLevel: parseInt(e.target.value)})}
                    className={styles.rangeInput}
                  />
                  <div className={styles.rangeLabels}>
                    <span>Mild</span>
                    <span>Mittel</span>
                    <span>Scharf</span>
                    <span>Sehr scharf</span>
                  </div>
                </div>
              </div>
              
              {/* Allergene */}
              <div className={styles.formSection}>
                <h3>Allergene</h3>
                <div className={styles.checkboxGroup}>
                  {allergensList.map(allergen => (
                    <label key={allergen}>
                      <input
                        type="checkbox"
                        checked={formData.allergens.includes(allergen)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              allergens: [...formData.allergens, allergen]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              allergens: formData.allergens.filter(a => a !== allergen)
                            });
                          }
                        }}
                      />
                      {allergen}
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Lager */}
              <div className={styles.formSection}>
                <h3>Lagerverwaltung</h3>
                
                <label>
                  <input
                    type="checkbox"
                    checked={formData.stock.enabled}
                    onChange={(e) => setFormData({
                      ...formData,
                      stock: {
                        ...formData.stock,
                        enabled: e.target.checked
                      }
                    })}
                  />
                  Lagerverwaltung aktivieren
                </label>
                
                {formData.stock.enabled && (
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Lagerbestand</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.stock.quantity}
                        onChange={(e) => setFormData({
                          ...formData,
                          stock: {
                            ...formData.stock,
                            quantity: parseInt(e.target.value) || 0
                          }
                        })}
                      />
                    </div>
                    
                    <div className={styles.formGroup}>
                      <label>Niedriger Bestand Warnung</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.stock.lowStockAlert}
                        onChange={(e) => setFormData({
                          ...formData,
                          stock: {
                            ...formData.stock,
                            lowStockAlert: parseInt(e.target.value) || 10
                          }
                        })}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Submit Buttons */}
              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProduct(false);
                    setEditingProduct(null);
                    resetForm();
                  }}
                  className={styles.button}
                >
                  Abbrechen
                </button>
                
                <button
                  type="submit"
                  disabled={creating || updating}
                  className={`${styles.button} ${styles.buttonPrimary}`}
                >
                  {creating || updating ? (
                    <>
                      <Loader2 className={styles.spinner} />
                      Speichern...
                    </>
                  ) : (
                    <>
                      <Check />
                      {editingProduct ? 'Aktualisieren' : 'Erstellen'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;