/**
 * Main API endpoint for EATECH Platform
 * Handles all REST API requests
 */

import { onRequest } from 'firebase-functions/v2/https';
import * as express from 'express';
import * as cors from 'cors';
import * as admin from 'firebase-admin';
import { validateAuth } from '../utils/auth';
import { corsOptions } from '../utils/cors';
import { 
  ErrorHandler, 
  NotFoundError, 
  ValidationError,
  UnauthorizedError 
} from '@eatech/utils';

// Initialize Express app
const app = express();

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.path}`, {
    query: req.query,
    body: req.body,
    headers: req.headers,
    ip: req.ip,
  });
  next();
});

// Auth middleware for protected routes
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const user = await validateAuth(req);
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    region: process.env.FUNCTION_REGION || 'europe-west6',
    version: process.env.FUNCTION_VERSION || '3.0.0',
  });
});

// Public routes
app.get('/api/v1/status', (req, res) => {
  res.json({ 
    platform: 'EATECH',
    version: '3.0.0',
    api: 'v1',
    docs: 'https://api.eatech.ch/docs',
  });
});

// Menu endpoints (public)
app.get('/api/v1/menu/:tenantId', async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { locationId, language = 'de' } = req.query;

    const menuRef = admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('menu');

    let query = menuRef.where('active', '==', true);
    
    if (locationId) {
      query = query.where('locations', 'array-contains', locationId);
    }

    const snapshot = await query.get();
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ 
      success: true,
      data: items,
      count: items.length,
    });
  } catch (error) {
    next(error);
  }
});

// Order endpoints (public - create order)
app.post('/api/v1/orders', async (req, res, next) => {
  try {
    const orderData = req.body;
    
    // Validate order data
    if (!orderData.tenantId || !orderData.items || !orderData.items.length) {
      throw new ValidationError('Invalid order data');
    }

    // Create order
    const orderRef = await admin.firestore()
      .collection('tenants')
      .doc(orderData.tenantId)
      .collection('orders')
      .add({
        ...orderData,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    res.json({ 
      success: true,
      data: {
        orderId: orderRef.id,
        status: 'pending',
      }
    });
  } catch (error) {
    next(error);
  }
});

// Protected routes (require authentication)
app.use('/api/v1/admin/*', requireAuth);

// Admin - Dashboard stats
app.get('/api/v1/admin/stats', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { startDate, endDate } = req.query;

    // Get orders stats
    const ordersRef = admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('orders');

    let query = ordersRef;
    if (startDate) {
      query = query.where('createdAt', '>=', new Date(startDate as string));
    }
    if (endDate) {
      query = query.where('createdAt', '<=', new Date(endDate as string));
    }

    const ordersSnapshot = await query.get();
    
    const stats = {
      totalOrders: ordersSnapshot.size,
      totalRevenue: 0,
      averageOrderValue: 0,
      ordersByStatus: {} as Record<string, number>,
    };

    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      stats.totalRevenue += order.total || 0;
      stats.ordersByStatus[order.status] = (stats.ordersByStatus[order.status] || 0) + 1;
    });

    stats.averageOrderValue = stats.totalOrders > 0 
      ? stats.totalRevenue / stats.totalOrders 
      : 0;

    res.json({ 
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

// Admin - Products CRUD
app.get('/api/v1/admin/products', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { category, search, limit = 50, offset = 0 } = req.query;

    const productsRef = admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('products');

    let query = productsRef.orderBy('name');
    
    if (category) {
      query = query.where('category', '==', category);
    }

    const snapshot = await query
      .limit(Number(limit))
      .offset(Number(offset))
      .get();

    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ 
      success: true,
      data: products,
      count: products.length,
      hasMore: products.length === Number(limit),
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/v1/admin/products', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const productData = req.body;

    const productRef = await admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('products')
      .add({
        ...productData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    res.json({ 
      success: true,
      data: {
        id: productRef.id,
        ...productData,
      }
    });
  } catch (error) {
    next(error);
  }
});

app.put('/api/v1/admin/products/:productId', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { productId } = req.params;
    const updates = req.body;

    await admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('products')
      .doc(productId)
      .update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    res.json({ 
      success: true,
      data: {
        id: productId,
        ...updates,
      }
    });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/v1/admin/products/:productId', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { productId } = req.params;

    await admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('products')
      .doc(productId)
      .delete();

    res.json({ 
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Admin - Orders management
app.get('/api/v1/admin/orders', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { status, date, limit = 50, offset = 0 } = req.query;

    const ordersRef = admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('orders');

    let query = ordersRef.orderBy('createdAt', 'desc');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    if (date) {
      const startOfDay = new Date(date as string);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date as string);
      endOfDay.setHours(23, 59, 59, 999);
      
      query = query
        .where('createdAt', '>=', startOfDay)
        .where('createdAt', '<=', endOfDay);
    }

    const snapshot = await query
      .limit(Number(limit))
      .offset(Number(offset))
      .get();

    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ 
      success: true,
      data: orders,
      count: orders.length,
      hasMore: orders.length === Number(limit),
    });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/v1/admin/orders/:orderId/status', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      throw new ValidationError('Status is required');
    }

    await admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('orders')
      .doc(orderId)
      .update({
        status,
        statusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    res.json({ 
      success: true,
      data: {
        orderId,
        status,
      }
    });
  } catch (error) {
    next(error);
  }
});

// Admin - Staff management
app.get('/api/v1/admin/staff', async (req, res, next) => {
  try {
    const { tenantId } = req.user;

    const staffRef = admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('staff');

    const snapshot = await staffRef.get();
    const staff = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ 
      success: true,
      data: staff,
      count: staff.length,
    });
  } catch (error) {
    next(error);
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Error]', error);

  if (error instanceof ValidationError) {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.message,
    });
  }

  if (error instanceof UnauthorizedError) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: error.message,
    });
  }

  if (error instanceof NotFoundError) {
    return res.status(404).json({
      error: 'Not Found',
      message: error.message,
    });
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
  });
});

// Export the Express app as a Cloud Function
export const api = onRequest({
  region: 'europe-west6',
  timeoutSeconds: 60,
  memory: '1GiB',
  maxInstances: 100,
}, app);
