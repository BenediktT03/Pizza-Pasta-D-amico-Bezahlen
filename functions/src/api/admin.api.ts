/**
 * EATECH Firebase Functions - Admin API
 * Version: 1.0.0
 * 
 * Administrative API endpoints for tenant management
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/api/admin.api.ts
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as cors from 'cors';
import { validateFirebaseIdToken, requireRole } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { rateLimiter } from '../middleware/rateLimit.middleware';
import { logger } from '../utils/logger';
import { 
  createTenantSchema, 
  updateTenantSchema, 
  createUserSchema,
  updateProductSchema 
} from '../validators/schemas';

// Initialize Express app
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());
app.use(validateFirebaseIdToken);
app.use(rateLimiter);

// ============================================================================
// TENANT MANAGEMENT
// ============================================================================

// Get all tenants (Super admin only)
app.get('/tenants', requireRole(['superadmin']), async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;
    
    let query = admin.firestore().collection('tenants');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    const snapshot = await query
      .limit(Number(limit))
      .offset(Number(offset))
      .get();
    
    const tenants = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      data: tenants,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: snapshot.size
      }
    });
  } catch (error) {
    logger.error('Error fetching tenants', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get tenant by ID
app.get('/tenants/:tenantId', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { user } = req;
    
    // Check if admin has access to this tenant
    if (user.role === 'admin' && user.tenantId !== tenantId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const tenantDoc = await admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .get();
    
    if (!tenantDoc.exists) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }
    
    res.json({
      success: true,
      data: {
        id: tenantDoc.id,
        ...tenantDoc.data()
      }
    });
  } catch (error) {
    logger.error('Error fetching tenant', { error, tenantId: req.params.tenantId });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Create new tenant (Super admin only)
app.post(
  '/tenants', 
  requireRole(['superadmin']), 
  validateRequest(createTenantSchema),
  async (req, res) => {
    try {
      const tenantData = {
        ...req.body,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active',
        subscription: {
          plan: req.body.plan || 'starter',
          status: 'trial',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
          features: getDefaultFeatures(req.body.plan || 'starter')
        },
        settings: {
          currency: 'CHF',
          timezone: 'Europe/Zurich',
          language: 'de',
          ...req.body.settings
        },
        stats: {
          totalOrders: 0,
          totalRevenue: 0,
          totalCustomers: 0,
          averageOrderValue: 0
        }
      };
      
      const tenantRef = await admin.firestore()
        .collection('tenants')
        .add(tenantData);
      
      // Create default admin user for tenant
      const adminUser = await createTenantAdmin(tenantRef.id, req.body.adminEmail);
      
      res.status(201).json({
        success: true,
        data: {
          id: tenantRef.id,
          ...tenantData,
          adminUser: {
            uid: adminUser.uid,
            email: adminUser.email
          }
        }
      });
    } catch (error) {
      logger.error('Error creating tenant', { error });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// Update tenant
app.put(
  '/tenants/:tenantId',
  requireRole(['admin', 'superadmin']),
  validateRequest(updateTenantSchema),
  async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { user } = req;
      
      // Check permissions
      if (user.role === 'admin' && user.tenantId !== tenantId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      
      const updateData = {
        ...req.body,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await admin.firestore()
        .collection('tenants')
        .doc(tenantId)
        .update(updateData);
      
      res.json({
        success: true,
        message: 'Tenant updated successfully'
      });
    } catch (error) {
      logger.error('Error updating tenant', { error });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// Delete tenant (Super admin only)
app.delete('/tenants/:tenantId', requireRole(['superadmin']), async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    // Soft delete - mark as deleted
    await admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .update({
        status: 'deleted',
        deletedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    
    res.json({
      success: true,
      message: 'Tenant deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting tenant', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// USER MANAGEMENT
// ============================================================================

// Get users for tenant
app.get('/tenants/:tenantId/users', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { role, status } = req.query;
    const { user } = req;
    
    // Check permissions
    if (user.role === 'admin' && user.tenantId !== tenantId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    // Get users with custom claims for this tenant
    const listUsersResult = await admin.auth().listUsers(1000);
    const tenantUsers = listUsersResult.users.filter(u => 
      u.customClaims?.tenantId === tenantId &&
      (!role || u.customClaims?.role === role) &&
      (!status || !u.disabled === (status === 'active'))
    );
    
    res.json({
      success: true,
      data: tenantUsers.map(u => ({
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        role: u.customClaims?.role,
        disabled: u.disabled,
        lastSignInTime: u.metadata.lastSignInTime,
        creationTime: u.metadata.creationTime
      }))
    });
  } catch (error) {
    logger.error('Error fetching users', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Create user for tenant
app.post(
  '/tenants/:tenantId/users',
  requireRole(['admin', 'superadmin']),
  validateRequest(createUserSchema),
  async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { email, password, role, displayName } = req.body;
      const { user } = req;
      
      // Check permissions
      if (user.role === 'admin') {
        if (user.tenantId !== tenantId) {
          return res.status(403).json({ success: false, error: 'Access denied' });
        }
        // Admins can only create staff and customer users
        if (['admin', 'superadmin'].includes(role)) {
          return res.status(403).json({ success: false, error: 'Cannot create admin users' });
        }
      }
      
      // Create user
      const newUser = await admin.auth().createUser({
        email,
        password,
        displayName,
        emailVerified: false
      });
      
      // Set custom claims
      await admin.auth().setCustomUserClaims(newUser.uid, {
        tenantId,
        role
      });
      
      // Create user profile
      await admin.firestore()
        .collection('users')
        .doc(newUser.uid)
        .set({
          email,
          displayName,
          tenantId,
          role,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: user.uid
        });
      
      res.status(201).json({
        success: true,
        data: {
          uid: newUser.uid,
          email: newUser.email,
          displayName: newUser.displayName,
          role
        }
      });
    } catch (error) {
      logger.error('Error creating user', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Update user
app.put('/users/:userId', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { displayName, disabled, role } = req.body;
    const { user } = req;
    
    // Get target user
    const targetUser = await admin.auth().getUser(userId);
    
    // Check permissions
    if (user.role === 'admin') {
      if (targetUser.customClaims?.tenantId !== user.tenantId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      // Admins cannot change roles to admin/superadmin
      if (role && ['admin', 'superadmin'].includes(role)) {
        return res.status(403).json({ success: false, error: 'Cannot assign admin roles' });
      }
    }
    
    // Update auth user
    const updates: any = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (disabled !== undefined) updates.disabled = disabled;
    
    await admin.auth().updateUser(userId, updates);
    
    // Update custom claims if role changed
    if (role && role !== targetUser.customClaims?.role) {
      await admin.auth().setCustomUserClaims(userId, {
        ...targetUser.customClaims,
        role
      });
    }
    
    // Update Firestore profile
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .update({
        displayName,
        role,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: user.uid
      });
    
    res.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    logger.error('Error updating user', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Delete user
app.delete('/users/:userId', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { user } = req;
    
    // Get target user
    const targetUser = await admin.auth().getUser(userId);
    
    // Check permissions
    if (user.role === 'admin' && targetUser.customClaims?.tenantId !== user.tenantId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    // Delete from Auth
    await admin.auth().deleteUser(userId);
    
    // Delete from Firestore
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .delete();
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting user', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// PRODUCT MANAGEMENT
// ============================================================================

// Get all products for tenant
app.get('/tenants/:tenantId/products', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { category, status = 'active' } = req.query;
    
    let query = admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('products')
      .where('status', '==', status);
    
    if (category) {
      query = query.where('category', '==', category);
    }
    
    const snapshot = await query.get();
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    logger.error('Error fetching products', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Create product
app.post(
  '/tenants/:tenantId/products',
  requireRole(['admin', 'staff']),
  validateRequest(updateProductSchema),
  async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { user } = req;
      
      // Check permissions
      if (user.tenantId !== tenantId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      
      const productData = {
        ...req.body,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: user.uid,
        status: 'active',
        stats: {
          totalSold: 0,
          totalRevenue: 0,
          averageRating: 0,
          reviewCount: 0
        }
      };
      
      const productRef = await admin.firestore()
        .collection('tenants')
        .doc(tenantId)
        .collection('products')
        .add(productData);
      
      res.status(201).json({
        success: true,
        data: {
          id: productRef.id,
          ...productData
        }
      });
    } catch (error) {
      logger.error('Error creating product', { error });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// Update product
app.put(
  '/tenants/:tenantId/products/:productId',
  requireRole(['admin', 'staff']),
  async (req, res) => {
    try {
      const { tenantId, productId } = req.params;
      const { user } = req;
      
      // Check permissions
      if (user.tenantId !== tenantId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      
      const updateData = {
        ...req.body,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: user.uid
      };
      
      // Remove fields that shouldn't be updated
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.stats;
      
      await admin.firestore()
        .collection('tenants')
        .doc(tenantId)
        .collection('products')
        .doc(productId)
        .update(updateData);
      
      res.json({
        success: true,
        message: 'Product updated successfully'
      });
    } catch (error) {
      logger.error('Error updating product', { error });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// Delete product (soft delete)
app.delete(
  '/tenants/:tenantId/products/:productId',
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { tenantId, productId } = req.params;
      const { user } = req;
      
      // Check permissions
      if (user.tenantId !== tenantId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      
      await admin.firestore()
        .collection('tenants')
        .doc(tenantId)
        .collection('products')
        .doc(productId)
        .update({
          status: 'deleted',
          deletedAt: admin.firestore.FieldValue.serverTimestamp(),
          deletedBy: user.uid
        });
      
      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting product', { error });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// ============================================================================
// ORDER MANAGEMENT
// ============================================================================

// Get orders
app.get('/tenants/:tenantId/orders', requireRole(['admin', 'staff']), async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { status, date, limit = 50 } = req.query;
    const { user } = req;
    
    // Check permissions
    if (user.tenantId !== tenantId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    let query = admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('orders')
      .orderBy('createdAt', 'desc')
      .limit(Number(limit));
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query = query
        .where('createdAt', '>=', startOfDay)
        .where('createdAt', '<=', endOfDay);
    }
    
    const snapshot = await query.get();
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    logger.error('Error fetching orders', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Update order status
app.put(
  '/tenants/:tenantId/orders/:orderId/status',
  requireRole(['admin', 'staff']),
  async (req, res) => {
    try {
      const { tenantId, orderId } = req.params;
      const { status, reason } = req.body;
      const { user } = req;
      
      // Check permissions
      if (user.tenantId !== tenantId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      
      const validStatuses = ['confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          success: false, 
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        });
      }
      
      const updateData: any = {
        status,
        [`statusHistory.${status}`]: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: user.uid
      };
      
      if (status === 'cancelled' && reason) {
        updateData.cancellationReason = reason;
      }
      
      await admin.firestore()
        .collection('tenants')
        .doc(tenantId)
        .collection('orders')
        .doc(orderId)
        .update(updateData);
      
      res.json({
        success: true,
        message: 'Order status updated successfully'
      });
    } catch (error) {
      logger.error('Error updating order status', { error });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// ============================================================================
// ANALYTICS
// ============================================================================

// Get analytics data
app.get('/tenants/:tenantId/analytics', requireRole(['admin']), async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { period = 'today' } = req.query;
    const { user } = req;
    
    // Check permissions
    if (user.tenantId !== tenantId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const analytics = await getTenantAnalytics(tenantId, period);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error fetching analytics', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// SETTINGS
// ============================================================================

// Update tenant settings
app.put(
  '/tenants/:tenantId/settings',
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { user } = req;
      
      // Check permissions
      if (user.tenantId !== tenantId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      
      const allowedSettings = [
        'businessHours',
        'deliverySettings',
        'paymentMethods',
        'notificationSettings',
        'orderSettings',
        'appearance'
      ];
      
      const updates: any = {};
      Object.keys(req.body).forEach(key => {
        if (allowedSettings.includes(key)) {
          updates[`settings.${key}`] = req.body[key];
        }
      });
      
      updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      
      await admin.firestore()
        .collection('tenants')
        .doc(tenantId)
        .update(updates);
      
      res.json({
        success: true,
        message: 'Settings updated successfully'
      });
    } catch (error) {
      logger.error('Error updating settings', { error });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function createTenantAdmin(tenantId: string, email: string): Promise<any> {
  const password = generateSecurePassword();
  
  const user = await admin.auth().createUser({
    email,
    password,
    emailVerified: false
  });
  
  await admin.auth().setCustomUserClaims(user.uid, {
    tenantId,
    role: 'admin'
  });
  
  await admin.firestore()
    .collection('users')
    .doc(user.uid)
    .set({
      email,
      tenantId,
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  
  // Send welcome email with password
  // await emailService.sendAdminWelcome({ email, password, tenantId });
  
  return user;
}

function generateSecurePassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
}

function getDefaultFeatures(plan: string): any {
  const features = {
    starter: {
      maxProducts: 50,
      maxOrders: 500,
      maxStaff: 3,
      analytics: true,
      inventory: false,
      loyalty: false,
      multiLocation: false,
      customDomain: false,
      aiFeatures: false
    },
    professional: {
      maxProducts: 200,
      maxOrders: 2000,
      maxStaff: 10,
      analytics: true,
      inventory: true,
      loyalty: true,
      multiLocation: false,
      customDomain: true,
      aiFeatures: false
    },
    enterprise: {
      maxProducts: -1, // unlimited
      maxOrders: -1,
      maxStaff: -1,
      analytics: true,
      inventory: true,
      loyalty: true,
      multiLocation: true,
      customDomain: true,
      aiFeatures: true
    }
  };
  
  return features[plan] || features.starter;
}

async function getTenantAnalytics(tenantId: string, period: string): Promise<any> {
  const now = new Date();
  let startDate: Date;
  
  switch (period) {
    case 'today':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'month':
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    default:
      startDate = new Date(now.setHours(0, 0, 0, 0));
  }
  
  const ordersSnapshot = await admin.firestore()
    .collection('tenants')
    .doc(tenantId)
    .collection('orders')
    .where('createdAt', '>=', startDate)
    .get();
  
  const analytics = {
    orders: {
      total: ordersSnapshot.size,
      completed: 0,
      cancelled: 0,
      revenue: 0
    },
    products: {
      topSelling: []
    },
    customers: {
      new: 0,
      returning: 0
    }
  };
  
  const productSales: any = {};
  const customers = new Set();
  
  ordersSnapshot.forEach(doc => {
    const order = doc.data();
    
    if (order.status === 'completed' || order.status === 'delivered') {
      analytics.orders.completed++;
      analytics.orders.revenue += order.total || 0;
    } else if (order.status === 'cancelled') {
      analytics.orders.cancelled++;
    }
    
    // Track product sales
    order.items?.forEach((item: any) => {
      if (!productSales[item.name]) {
        productSales[item.name] = { quantity: 0, revenue: 0 };
      }
      productSales[item.name].quantity += item.quantity;
      productSales[item.name].revenue += item.price * item.quantity;
    });
    
    // Track customers
    if (order.userId) {
      customers.add(order.userId);
    }
  });
  
  // Get top selling products
  analytics.products.topSelling = Object.entries(productSales)
    .map(([name, data]: any) => ({ name, ...data }))
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 5);
  
  analytics.customers.new = customers.size;
  
  return analytics;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error in admin API', { error: err, path: req.path });
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// ============================================================================
// EXPORT
// ============================================================================
export const adminApi = functions
  .region('europe-west1')
  .runWith({
    memory: '1GB',
    timeoutSeconds: 60
  })
  .https.onRequest(app);