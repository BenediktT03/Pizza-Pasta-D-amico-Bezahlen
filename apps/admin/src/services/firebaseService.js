/**
 * Firebase Service - CDN Version
 * File Path: /apps/admin/src/services/firebaseService.js
 * 
 * Nutzt das global geladene Firebase aus index.html
 */

// Prüfe ob Firebase verfügbar ist
if (typeof firebase === 'undefined') {
  console.error('❌ Firebase nicht gefunden! Stelle sicher, dass index.html die Firebase Scripts lädt.');
}

// Firebase ist bereits in index.html initialisiert
const database = firebase.database();
const auth = firebase.auth();
const storage = firebase.storage();

// Tenant ID (später aus Auth)
const TENANT_ID = 'demo-restaurant';

// Product Service
export const productService = {
  // Database Referenz
  getProductsRef() {
    return database.ref(`tenants/${TENANT_ID}/products`);
  },

  // Produkte live beobachten
  subscribeToProducts(callback) {
    const productsRef = this.getProductsRef();
    
    // Listener registrieren
    productsRef.on('value', (snapshot) => {
      const products = [];
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          products.push({
            id: child.key,
            ...child.val()
          });
        });
      }
      callback(products);
    });
    
    // Cleanup-Funktion zurückgeben
    return () => {
      productsRef.off('value');
    };
  },

  // Produkt erstellen
  async createProduct(productData) {
    const productsRef = this.getProductsRef();
    const newRef = productsRef.push();
    
    const product = {
      ...productData,
      id: newRef.key,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tenantId: TENANT_ID
    };
    
    await newRef.set(product);
    return product;
  },

  // Produkt aktualisieren
  async updateProduct(productId, updates) {
    const productRef = database.ref(`tenants/${TENANT_ID}/products/${productId}`);
    await productRef.update({
      ...updates,
      updatedAt: Date.now()
    });
  },

  // Produkt löschen
  async deleteProduct(productId) {
    const productRef = database.ref(`tenants/${TENANT_ID}/products/${productId}`);
    await productRef.remove();
  }
};

// Export für direkte Nutzung
export { database, auth, storage };