/**
 * EATECH - Firebase Product Service
 * Version: 17.0.0
 * Description: Echte Produkt-Verwaltung mit Firebase Realtime Database
 * Author: EATECH Development Team
 * Created: 2025-07-05
 * File Path: /packages/core/src/services/productService.js
 */

import { 
  getDatabase, 
  ref, 
  push, 
  set, 
  get, 
  update, 
  remove, 
  onValue,
  query,
  orderByChild,
  equalTo,
  serverTimestamp 
} from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth } from '../config/firebase';

// ============================================================================
// PRODUCT SERVICE
// ============================================================================

class ProductService {
  constructor() {
    this.db = getDatabase();
    this.storage = getStorage();
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Get current tenant ID from authenticated user
   */
  getCurrentTenantId() {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    // In production, get from user custom claims
    // For now, use a default or from localStorage
    return localStorage.getItem('tenantId') || 'demo-restaurant';
  }

  /**
   * Upload product image to Firebase Storage
   */
  async uploadProductImage(file, productId) {
    try {
      const tenantId = this.getCurrentTenantId();
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `tenants/${tenantId}/products/${productId}/${fileName}`;
      
      const fileRef = storageRef(this.storage, filePath);
      const snapshot = await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  // ==========================================================================
  // CRUD OPERATIONS
  // ==========================================================================

  /**
   * Create new product
   */
  async createProduct(productData) {
    try {
      const tenantId = this.getCurrentTenantId();
      const user = auth.currentUser;
      
      // Generate new product ID
      const productsRef = ref(this.db, `tenants/${tenantId}/products`);
      const newProductRef = push(productsRef);
      
      // Handle image upload if provided
      let imageUrl = productData.imageUrl;
      if (productData.imageFile) {
        imageUrl = await this.uploadProductImage(productData.imageFile, newProductRef.key);
      }
      
      // Prepare product data
      const product = {
        id: newProductRef.key,
        name: productData.name,
        description: productData.description,
        price: parseFloat(productData.price),
        category: productData.category,
        imageUrl: imageUrl || '',
        available: productData.available !== false,
        featured: productData.featured || false,
        
        // Zusätzliche Felder
        ingredients: productData.ingredients || [],
        allergens: productData.allergens || [],
        nutritionalInfo: productData.nutritionalInfo || {},
        preparationTime: productData.preparationTime || 15,
        spicyLevel: productData.spicyLevel || 0,
        
        // Varianten & Optionen
        variants: productData.variants || [],
        addons: productData.addons || [],
        
        // Lagerbestand
        stock: {
          enabled: productData.stockEnabled || false,
          quantity: productData.stockQuantity || 0,
          lowStockAlert: productData.lowStockAlert || 10
        },
        
        // Metadata
        tenantId,
        createdBy: user.uid,
        createdByEmail: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // Stats
        orderCount: 0,
        revenue: 0,
        rating: 0,
        reviewCount: 0
      };
      
      // Save to database
      await set(newProductRef, product);
      
      // Log activity
      await this.logActivity('product_created', product.id);
      
      return product;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  /**
   * Update existing product
   */
  async updateProduct(productId, updates) {
    try {
      const tenantId = this.getCurrentTenantId();
      const user = auth.currentUser;
      
      // Handle image upload if new file provided
      if (updates.imageFile) {
        updates.imageUrl = await this.uploadProductImage(updates.imageFile, productId);
        delete updates.imageFile;
      }
      
      // Prepare update data
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
        updatedByEmail: user.email
      };
      
      // Update in database
      const productRef = ref(this.db, `tenants/${tenantId}/products/${productId}`);
      await update(productRef, updateData);
      
      // Log activity
      await this.logActivity('product_updated', productId);
      
      return { id: productId, ...updateData };
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  /**
   * Delete product (soft delete)
   */
  async deleteProduct(productId) {
    try {
      const tenantId = this.getCurrentTenantId();
      const user = auth.currentUser;
      
      // Soft delete - mark as deleted instead of removing
      const updates = {
        deleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: user.uid,
        available: false
      };
      
      const productRef = ref(this.db, `tenants/${tenantId}/products/${productId}`);
      await update(productRef, updates);
      
      // Log activity
      await this.logActivity('product_deleted', productId);
      
      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  /**
   * Get single product
   */
  async getProduct(productId) {
    try {
      const tenantId = this.getCurrentTenantId();
      const productRef = ref(this.db, `tenants/${tenantId}/products/${productId}`);
      const snapshot = await get(productRef);
      
      if (!snapshot.exists()) {
        throw new Error('Product not found');
      }
      
      return { id: productId, ...snapshot.val() };
    } catch (error) {
      console.error('Error getting product:', error);
      throw error;
    }
  }

  /**
   * Get all products for current tenant
   */
  async getProducts(options = {}) {
    try {
      const tenantId = this.getCurrentTenantId();
      const productsRef = ref(this.db, `tenants/${tenantId}/products`);
      
      // Apply filters if provided
      let productsQuery = productsRef;
      if (options.category) {
        productsQuery = query(productsRef, orderByChild('category'), equalTo(options.category));
      }
      
      const snapshot = await get(productsQuery);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      // Convert to array and filter
      const products = [];
      snapshot.forEach((child) => {
        const product = { id: child.key, ...child.val() };
        
        // Filter out deleted products unless requested
        if (!product.deleted || options.includeDeleted) {
          // Apply additional filters
          if (!options.includeUnavailable && !product.available) return;
          if (options.featured && !product.featured) return;
          
          products.push(product);
        }
      });
      
      // Sort products
      if (options.sortBy) {
        products.sort((a, b) => {
          switch (options.sortBy) {
            case 'name':
              return a.name.localeCompare(b.name);
            case 'price':
              return options.sortOrder === 'desc' ? b.price - a.price : a.price - b.price;
            case 'created':
              return options.sortOrder === 'desc' 
                ? new Date(b.createdAt) - new Date(a.createdAt)
                : new Date(a.createdAt) - new Date(b.createdAt);
            default:
              return 0;
          }
        });
      }
      
      return products;
    } catch (error) {
      console.error('Error getting products:', error);
      throw error;
    }
  }

  // ==========================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ==========================================================================

  /**
   * Subscribe to products changes
   */
  subscribeToProducts(callback, options = {}) {
    try {
      const tenantId = this.getCurrentTenantId();
      const productsRef = ref(this.db, `tenants/${tenantId}/products`);
      
      const unsubscribe = onValue(productsRef, (snapshot) => {
        const products = [];
        
        if (snapshot.exists()) {
          snapshot.forEach((child) => {
            const product = { id: child.key, ...child.val() };
            
            // Apply filters
            if (!product.deleted || options.includeDeleted) {
              if (!options.includeUnavailable && !product.available) return;
              products.push(product);
            }
          });
        }
        
        callback(products);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error subscribing to products:', error);
      throw error;
    }
  }

  /**
   * Subscribe to single product changes
   */
  subscribeToProduct(productId, callback) {
    try {
      const tenantId = this.getCurrentTenantId();
      const productRef = ref(this.db, `tenants/${tenantId}/products/${productId}`);
      
      const unsubscribe = onValue(productRef, (snapshot) => {
        if (snapshot.exists()) {
          callback({ id: productId, ...snapshot.val() });
        } else {
          callback(null);
        }
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error subscribing to product:', error);
      throw error;
    }
  }

  // ==========================================================================
  // SPECIAL OPERATIONS
  // ==========================================================================

  /**
   * Toggle product availability
   */
  async toggleAvailability(productId) {
    try {
      const product = await this.getProduct(productId);
      await this.updateProduct(productId, {
        available: !product.available
      });
      return !product.available;
    } catch (error) {
      console.error('Error toggling availability:', error);
      throw error;
    }
  }

  /**
   * Update product stock
   */
  async updateStock(productId, quantity, operation = 'set') {
    try {
      const product = await this.getProduct(productId);
      
      let newQuantity = quantity;
      if (operation === 'increment') {
        newQuantity = (product.stock?.quantity || 0) + quantity;
      } else if (operation === 'decrement') {
        newQuantity = Math.max(0, (product.stock?.quantity || 0) - quantity);
      }
      
      await this.updateProduct(productId, {
        'stock/quantity': newQuantity,
        'stock/lastUpdated': serverTimestamp()
      });
      
      // Check for low stock
      if (product.stock?.enabled && newQuantity <= product.stock?.lowStockAlert) {
        await this.createLowStockAlert(productId, newQuantity);
      }
      
      return newQuantity;
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  }

  /**
   * Bulk update products
   */
  async bulkUpdate(productIds, updates) {
    try {
      const tenantId = this.getCurrentTenantId();
      const user = auth.currentUser;
      
      const bulkUpdates = {};
      
      productIds.forEach(productId => {
        bulkUpdates[`tenants/${tenantId}/products/${productId}`] = {
          ...updates,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid
        };
      });
      
      await update(ref(this.db), bulkUpdates);
      
      return true;
    } catch (error) {
      console.error('Error bulk updating products:', error);
      throw error;
    }
  }

  // ==========================================================================
  // ANALYTICS & HELPERS
  // ==========================================================================

  /**
   * Get product categories
   */
  async getCategories() {
    try {
      const products = await this.getProducts({ includeUnavailable: true });
      const categories = new Set();
      
      products.forEach(product => {
        if (product.category) {
          categories.add(product.category);
        }
      });
      
      return Array.from(categories).sort();
    } catch (error) {
      console.error('Error getting categories:', error);
      throw error;
    }
  }

  /**
   * Log product activity
   */
  async logActivity(action, productId, details = {}) {
    try {
      const tenantId = this.getCurrentTenantId();
      const user = auth.currentUser;
      
      const activityRef = ref(this.db, `tenants/${tenantId}/activities`);
      await push(activityRef, {
        type: 'product',
        action,
        productId,
        details,
        userId: user.uid,
        userEmail: user.email,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging activity:', error);
      // Don't throw - logging shouldn't break operations
    }
  }

  /**
   * Create low stock alert
   */
  async createLowStockAlert(productId, currentStock) {
    try {
      const tenantId = this.getCurrentTenantId();
      const alertsRef = ref(this.db, `tenants/${tenantId}/alerts`);
      
      await push(alertsRef, {
        type: 'low_stock',
        productId,
        currentStock,
        createdAt: serverTimestamp(),
        read: false
      });
    } catch (error) {
      console.error('Error creating low stock alert:', error);
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

// Create singleton instance
const productService = new ProductService();

// Export service
export default productService;

// Export class for testing
export { ProductService };