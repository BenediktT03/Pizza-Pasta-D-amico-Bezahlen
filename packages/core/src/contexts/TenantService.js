/**
 * EATECH - Tenant Service
 * Handles all tenant-specific data operations with isolation
 * File Path: /packages/@eatech/core/services/TenantService.js
 */

import { 
  getDatabase, 
  ref, 
  get, 
  set, 
  update, 
  remove, 
  onValue, 
  off,
  push,
  query,
  orderByChild,
  equalTo,
  limitToFirst,
  limitToLast,
  startAt,
  endAt
} from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

class TenantService {
  constructor() {
    this.db = getDatabase();
    this.auth = getAuth();
    this.storage = getStorage();
    this.currentTenantId = null;
    this.tenantCache = new Map();
  }

  // Set current tenant for all operations
  setCurrentTenant(tenantId) {
    this.currentTenantId = tenantId;
  }

  // Verify tenant access
  async verifyTenantAccess(tenantId = this.currentTenantId) {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    const userTenantRef = ref(this.db, `users/${user.uid}/tenants/${tenantId}`);
    const snapshot = await get(userTenantRef);
    
    if (!snapshot.exists()) {
      throw new Error('Access denied: User does not have access to this tenant');
    }
    
    return snapshot.val();
  }

  // Get tenant-specific database reference
  getTenantRef(path, tenantId = this.currentTenantId) {
    if (!tenantId) throw new Error('No tenant ID provided');
    return ref(this.db, `tenants/${tenantId}/${path}`);
  }

  // CRUD Operations with tenant isolation

  async create(path, data, tenantId = this.currentTenantId) {
    await this.verifyTenantAccess(tenantId);
    
    const tenantRef = this.getTenantRef(path, tenantId);
    const newRef = push(tenantRef);
    
    const dataWithMeta = {
      ...data,
      _id: newRef.key,
      _createdAt: Date.now(),
      _createdBy: this.auth.currentUser.uid,
      _tenantId: tenantId
    };
    
    await set(newRef, dataWithMeta);
    return { id: newRef.key, ...dataWithMeta };
  }

  async read(path, tenantId = this.currentTenantId) {
    await this.verifyTenantAccess(tenantId);
    
    const tenantRef = this.getTenantRef(path, tenantId);
    const snapshot = await get(tenantRef);
    
    if (!snapshot.exists()) return null;
    return snapshot.val();
  }

  async update(path, updates, tenantId = this.currentTenantId) {
    await this.verifyTenantAccess(tenantId);
    
    const tenantRef = this.getTenantRef(path, tenantId);
    
    const updatesWithMeta = {
      ...updates,
      _updatedAt: Date.now(),
      _updatedBy: this.auth.currentUser.uid
    };
    
    await update(tenantRef, updatesWithMeta);
    return updatesWithMeta;
  }

  async delete(path, tenantId = this.currentTenantId) {
    await this.verifyTenantAccess(tenantId);
    
    const tenantRef = this.getTenantRef(path, tenantId);
    await remove(tenantRef);
  }

  // List with filters
  async list(path, options = {}, tenantId = this.currentTenantId) {
    await this.verifyTenantAccess(tenantId);
    
    let tenantRef = this.getTenantRef(path, tenantId);
    let queryRef = tenantRef;
    
    // Apply filters
    if (options.orderBy) {
      queryRef = query(queryRef, orderByChild(options.orderBy));
    }
    
    if (options.equalTo !== undefined) {
      queryRef = query(queryRef, equalTo(options.equalTo));
    }
    
    if (options.limit) {
      queryRef = query(queryRef, limitToFirst(options.limit));
    }
    
    if (options.startAt !== undefined) {
      queryRef = query(queryRef, startAt(options.startAt));
    }
    
    if (options.endAt !== undefined) {
      queryRef = query(queryRef, endAt(options.endAt));
    }
    
    const snapshot = await get(queryRef);
    
    if (!snapshot.exists()) return [];
    
    const data = snapshot.val();
    return Object.entries(data).map(([key, value]) => ({
      id: key,
      ...value
    }));
  }

  // Real-time subscriptions
  subscribe(path, callback, options = {}, tenantId = this.currentTenantId) {
    const tenantRef = this.getTenantRef(path, tenantId);
    
    const listener = onValue(tenantRef, (snapshot) => {
      const data = snapshot.exists() ? snapshot.val() : null;
      callback(data);
    }, (error) => {
      console.error('Subscription error:', error);
      if (options.onError) options.onError(error);
    });
    
    // Return unsubscribe function
    return () => off(tenantRef, 'value', listener);
  }

  // Batch operations
  async batchWrite(operations, tenantId = this.currentTenantId) {
    await this.verifyTenantAccess(tenantId);
    
    const updates = {};
    
    for (const op of operations) {
      const fullPath = `tenants/${tenantId}/${op.path}`;
      
      switch (op.type) {
        case 'set':
          updates[fullPath] = {
            ...op.data,
            _updatedAt: Date.now(),
            _updatedBy: this.auth.currentUser.uid
          };
          break;
          
        case 'update':
          // Merge with existing data
          const existing = await this.read(op.path, tenantId);
          updates[fullPath] = {
            ...existing,
            ...op.data,
            _updatedAt: Date.now(),
            _updatedBy: this.auth.currentUser.uid
          };
          break;
          
        case 'delete':
          updates[fullPath] = null;
          break;
      }
    }
    
    await update(ref(this.db), updates);
  }

  // File operations with tenant isolation
  async uploadFile(file, path, tenantId = this.currentTenantId) {
    await this.verifyTenantAccess(tenantId);
    
    const fileRef = storageRef(this.storage, `tenants/${tenantId}/${path}`);
    const snapshot = await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      url: downloadURL,
      path: snapshot.ref.fullPath,
      name: snapshot.ref.name,
      size: snapshot.metadata.size,
      contentType: snapshot.metadata.contentType,
      uploadedAt: Date.now(),
      uploadedBy: this.auth.currentUser.uid
    };
  }

  async deleteFile(path, tenantId = this.currentTenantId) {
    await this.verifyTenantAccess(tenantId);
    
    const fileRef = storageRef(this.storage, `tenants/${tenantId}/${path}`);
    await deleteObject(fileRef);
  }

  // Tenant statistics
  async getTenantStats(tenantId = this.currentTenantId) {
    await this.verifyTenantAccess(tenantId);
    
    const stats = {
      products: 0,
      orders: 0,
      customers: 0,
      revenue: 0,
      storage: 0
    };
    
    // Count products
    const productsSnap = await get(this.getTenantRef('products', tenantId));
    if (productsSnap.exists()) {
      stats.products = Object.keys(productsSnap.val()).length;
    }
    
    // Count orders
    const ordersSnap = await get(this.getTenantRef('orders', tenantId));
    if (ordersSnap.exists()) {
      const orders = ordersSnap.val();
      stats.orders = Object.keys(orders).length;
      
      // Calculate revenue
      stats.revenue = Object.values(orders).reduce((sum, order) => {
        return sum + (order.total || 0);
      }, 0);
    }
    
    // Count customers
    const customersSnap = await get(this.getTenantRef('customers', tenantId));
    if (customersSnap.exists()) {
      stats.customers = Object.keys(customersSnap.val()).length;
    }
    
    return stats;
  }

  // Cache management
  clearCache(tenantId = this.currentTenantId) {
    if (tenantId) {
      this.tenantCache.delete(tenantId);
    } else {
      this.tenantCache.clear();
    }
  }

  // Security helpers
  sanitizePath(path) {
    // Remove any attempts to escape tenant isolation
    return path.replace(/\.\./g, '').replace(/^\/+/, '');
  }

  // Quota management
  async checkQuota(type, tenantId = this.currentTenantId) {
    const tenantInfo = await this.read('info', tenantId);
    const features = tenantInfo?.features || {};
    
    const usage = await this.getTenantStats(tenantId);
    
    switch (type) {
      case 'products':
        return features.maxProducts === -1 || usage.products < features.maxProducts;
      
      case 'orders':
        return features.maxOrders === -1 || usage.orders < features.maxOrders;
      
      case 'storage':
        const maxStorage = features.maxStorage || 1073741824; // 1GB default
        return usage.storage < maxStorage;
      
      default:
        return true;
    }
  }
}

// Export singleton instance
export default new TenantService();

// Also export class for testing
export { TenantService };