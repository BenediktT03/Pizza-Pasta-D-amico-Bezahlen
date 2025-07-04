/**
 * EATECH - Product Service
 * File Path: /apps/admin/src/lib/productService.js
 * 
 * Saubere Abstraktion für Produkt-Operationen
 */

import { database } from './firebase';
import { ref, push, set, onValue, update, remove, off } from 'firebase/database';

// Konstanten
const TENANT_ID = 'demo-restaurant'; // Später aus Auth/Context

class ProductService {
  constructor() {
    this.listeners = new Map();
  }

  // Basis-Pfad für Produkte
  getProductsPath() {
    return `tenants/${TENANT_ID}/products`;
  }

  // Produkt erstellen
  async createProduct(productData) {
    const productsRef = ref(database, this.getProductsPath());
    const newProductRef = push(productsRef);
    
    const product = {
      ...productData,
      id: newProductRef.key,
      tenantId: TENANT_ID,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    await set(newProductRef, product);
    return product;
  }

  // Produkt aktualisieren
  async updateProduct(productId, updates) {
    const productRef = ref(database, `${this.getProductsPath()}/${productId}`);
    const updateData = {
      ...updates,
      updatedAt: Date.now()
    };
    
    await update(productRef, updateData);
    return { id: productId, ...updateData };
  }

  // Produkt löschen
  async deleteProduct(productId) {
    const productRef = ref(database, `${this.getProductsPath()}/${productId}`);
    await remove(productRef);
  }

  // Produkte abonnieren
  subscribeToProducts(callback) {
    const productsRef = ref(database, this.getProductsPath());
    
    const listener = onValue(productsRef, (snapshot) => {
      const products = [];
      
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const product = {
            id: childSnapshot.key,
            ...childSnapshot.val()
          };
          
          // Sicherstellen dass Arrays existieren
          product.allergens = product.allergens || [];
          product.ingredients = product.ingredients || [];
          
          // Stock Objekt normalisieren
          product.stock = product.stock || { enabled: false, quantity: 0 };
          
          products.push(product);
        });
      }
      
      callback(products);
    });
    
    // Listener speichern für cleanup
    this.listeners.set(callback, { ref: productsRef, listener });
    
    // Cleanup function
    return () => {
      const listenerInfo = this.listeners.get(callback);
      if (listenerInfo) {
        off(listenerInfo.ref, 'value', listenerInfo.listener);
        this.listeners.delete(callback);
      }
    };
  }

  // Verfügbarkeit umschalten
  async toggleAvailability(productId, currentStatus) {
    await this.updateProduct(productId, { available: !currentStatus });
  }

  // Lagerbestand aktualisieren
  async updateStock(productId, quantity) {
    await this.updateProduct(productId, {
      stock: {
        enabled: true,
        quantity: quantity,
        lastUpdated: Date.now()
      }
    });
  }
}

// Singleton Export
export default new ProductService();