import { 
  getDatabase, 
  ref, 
  push, 
  set, 
  onValue,
  update,
  remove
} from 'firebase/database';
import { initializeApp } from 'firebase/app';

// Firebase direkt hier initialisieren
const firebaseConfig = {
  apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmU",
  authDomain: "eatech-foodtruck.firebaseapp.com",
  databaseURL: "https://eatech-foodtruck-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "eatech-foodtruck",
  storageBucket: "eatech-foodtruck.firebasestorage.app",
  messagingSenderId: "261222802445",
  appId: "1:261222802445:web:edde22580422fbced22144"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

class ProductServiceSimple {
  constructor() {
    this.tenantId = 'demo-restaurant';
  }

  async createProduct(productData) {
    try {
      const productsRef = ref(db, `tenants/${this.tenantId}/products`);
      const newProductRef = push(productsRef);
      
      const product = {
        ...productData,
        id: newProductRef.key,
        createdAt: Date.now(),
        tenantId: this.tenantId
      };
      
      await set(newProductRef, product);
      return product;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  async updateProduct(productId, updates) {
    const productRef = ref(db, `tenants/${this.tenantId}/products/${productId}`);
    await update(productRef, updates);
    return { id: productId, ...updates };
  }

  async deleteProduct(productId) {
    const productRef = ref(db, `tenants/${this.tenantId}/products/${productId}`);
    await remove(productRef);
    return true;
  }

  subscribeToProducts(callback) {
    const productsRef = ref(db, `tenants/${this.tenantId}/products`);
    
    const unsubscribe = onValue(productsRef, (snapshot) => {
      const products = [];
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          products.push({ id: child.key, ...child.val() });
        });
      }
      callback(products);
    });
    
    return unsubscribe;
  }
}

export default new ProductServiceSimple();