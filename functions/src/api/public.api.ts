/**
 * EATECH Firebase Functions - Public API
 * Version: 1.0.0
 * 
 * Public-facing API endpoints for customers
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/api/public.api.ts
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as cors from 'cors';
import { validateOptionalAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { rateLimiter } from '../middleware/rateLimit.middleware';
import { PaymentProcessor } from '../services/PaymentProcessor';
import { EmailService } from '../services/EmailService';
import { SMSService } from '../services/SMSService';
import { AnalyticsService } from '../services/AnalyticsService';
import { logger } from '../utils/logger';
import { 
  createOrderSchema,
  contactFormSchema,
  reviewSchema,
  newsletterSchema
} from '../validators/schemas';
import { calculateOrderTotal, generateOrderNumber, estimatePreparationTime } from '../utils/orderUtils';

// Initialize Express app
const app = express();

// Services
const paymentProcessor = new PaymentProcessor();
const emailService = new EmailService();
const smsService = new SMSService();
const analyticsService = new AnalyticsService();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());
app.use(rateLimiter);

// ============================================================================
// TENANT DISCOVERY
// ============================================================================

// Get tenant by subdomain or custom domain
app.get('/tenant', async (req, res) => {
  try {
    const { domain, subdomain } = req.query;
    
    if (!domain && !subdomain) {
      return res.status(400).json({ 
        success: false, 
        error: 'Domain or subdomain required' 
      });
    }
    
    let tenantDoc;
    
    if (domain) {
      // Search by custom domain
      const snapshot = await admin.firestore()
        .collection('tenants')
        .where('customDomain', '==', domain)
        .where('status', '==', 'active')
        .limit(1)
        .get();
      
      if (!snapshot.empty) {
        tenantDoc = snapshot.docs[0];
      }
    } else if (subdomain) {
      // Search by subdomain
      const snapshot = await admin.firestore()
        .collection('tenants')
        .where('subdomain', '==', subdomain)
        .where('status', '==', 'active')
        .limit(1)
        .get();
      
      if (!snapshot.empty) {
        tenantDoc = snapshot.docs[0];
      }
    }
    
    if (!tenantDoc) {
      return res.status(404).json({ 
        success: false, 
        error: 'Tenant not found' 
      });
    }
    
    const tenantData = tenantDoc.data();
    
    // Return public tenant info
    res.json({
      success: true,
      data: {
        id: tenantDoc.id,
        name: tenantData.name,
        logo: tenantData.logo,
        description: tenantData.description,
        address: tenantData.address,
        contact: {
          phone: tenantData.contact?.phone,
          email: tenantData.contact?.email,
          website: tenantData.contact?.website
        },
        businessHours: tenantData.settings?.businessHours,
        socialMedia: tenantData.socialMedia,
        features: {
          delivery: tenantData.features?.delivery,
          pickup: tenantData.features?.pickup,
          tableService: tenantData.features?.tableService,
          preOrder: tenantData.features?.preOrder
        },
        paymentMethods: tenantData.settings?.paymentMethods,
        currency: tenantData.settings?.currency || 'CHF',
        languages: tenantData.settings?.languages || ['de'],
        theme: tenantData.settings?.appearance?.theme
      }
    });
  } catch (error) {
    logger.error('Error fetching tenant', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// MENU & PRODUCTS
// ============================================================================

// Get menu categories
app.get('/tenants/:tenantId/categories', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    const snapshot = await admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('categories')
      .where('status', '==', 'active')
      .orderBy('order', 'asc')
      .get();
    
    const categories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    logger.error('Error fetching categories', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get products
app.get('/tenants/:tenantId/products', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { category, search, dietary, sort = 'order' } = req.query;
    
    let query = admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('products')
      .where('status', '==', 'active')
      .where('available', '==', true);
    
    if (category) {
      query = query.where('category', '==', category);
    }
    
    if (dietary) {
      query = query.where(`dietary.${dietary}`, '==', true);
    }
    
    const snapshot = await query.get();
    let products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort products
    switch (sort) {
      case 'price_asc':
        products.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        products.sort((a, b) => b.price - a.price);
        break;
      case 'popular':
        products.sort((a, b) => (b.stats?.totalSold || 0) - (a.stats?.totalSold || 0));
        break;
      case 'rating':
        products.sort((a, b) => (b.stats?.averageRating || 0) - (a.stats?.averageRating || 0));
        break;
      default:
        products.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    
    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    logger.error('Error fetching products', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get single product
app.get('/tenants/:tenantId/products/:productId', async (req, res) => {
  try {
    const { tenantId, productId } = req.params;
    
    const productDoc = await admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('products')
      .doc(productId)
      .get();
    
    if (!productDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Product not found' 
      });
    }
    
    const product = productDoc.data();
    
    if (product.status !== 'active' || !product.available) {
      return res.status(404).json({ 
        success: false, 
        error: 'Product not available' 
      });
    }
    
    res.json({
      success: true,
      data: {
        id: productDoc.id,
        ...product
      }
    });
  } catch (error) {
    logger.error('Error fetching product', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// ORDERS
// ============================================================================

// Create order
app.post(
  '/tenants/:tenantId/orders',
  validateOptionalAuth,
  validateRequest(createOrderSchema),
  async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { user } = req;
      
      // Verify tenant exists and is active
      const tenantDoc = await admin.firestore()
        .collection('tenants')
        .doc(tenantId)
        .get();
      
      if (!tenantDoc.exists || tenantDoc.data()?.status !== 'active') {
        return res.status(404).json({ 
          success: false, 
          error: 'Tenant not found' 
        });
      }
      
      const tenant = tenantDoc.data();
      
      // Validate products and calculate totals
      const validatedItems = await validateOrderItems(tenantId, req.body.items);
      const totals = calculateOrderTotal(validatedItems, req.body.discounts);
      
      // Generate order number
      const orderNumber = await generateOrderNumber(tenantId);
      
      // Estimate preparation time
      const prepTime = await estimatePreparationTime(validatedItems, tenantId);
      const estimatedReadyTime = req.body.scheduledTime 
        ? new Date(req.body.scheduledTime)
        : new Date(Date.now() + prepTime * 60 * 1000);
      
      // Create order data
      const orderData = {
        orderNumber,
        tenantId,
        userId: user?.uid || null,
        customer: {
          name: req.body.customer.name,
          email: req.body.customer.email,
          phone: req.body.customer.phone,
          notifications: req.body.customer.notifications || {
            email: true,
            sms: false
          }
        },
        items: validatedItems,
        orderType: req.body.orderType,
        scheduledTime: req.body.scheduledTime || null,
        notes: req.body.notes || '',
        subtotal: totals.subtotal,
        tax: totals.tax,
        deliveryFee: req.body.deliveryFee || 0,
        total: totals.total + (req.body.deliveryFee || 0),
        currency: tenant.settings?.currency || 'CHF',
        paymentMethod: req.body.paymentMethod,
        paymentStatus: 'pending',
        status: 'new',
        estimatedReadyTime,
        preparationTime: prepTime,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          source: 'web',
          userAgent: req.headers['user-agent'],
          ip: req.ip
        }
      };
      
      // Add delivery info if applicable
      if (req.body.orderType === 'delivery' && req.body.deliveryAddress) {
        orderData.deliveryAddress = req.body.deliveryAddress;
      }
      
      // Create order
      const orderRef = await admin.firestore()
        .collection('tenants')
        .doc(tenantId)
        .collection('orders')
        .add(orderData);
      
      // Process payment if payment info provided
      if (req.body.paymentToken) {
        try {
          const paymentResult = await paymentProcessor.processPayment({
            orderId: orderRef.id,
            tenantId,
            amount: orderData.total,
            currency: orderData.currency,
            paymentMethod: req.body.paymentMethod,
            paymentToken: req.body.paymentToken,
            customerId: user?.uid,
            customerEmail: orderData.customer.email
          });
          
          // Update order with payment result
          await orderRef.update({
            paymentStatus: paymentResult.status,
            paymentId: paymentResult.paymentId,
            status: paymentResult.status === 'paid' ? 'confirmed' : 'payment_failed'
          });
          
          orderData.paymentStatus = paymentResult.status;
          orderData.paymentId = paymentResult.paymentId;
        } catch (paymentError) {
          logger.error('Payment processing failed', { error: paymentError, orderId: orderRef.id });
          // Continue with order - payment can be retried
        }
      }
      
      // Track analytics
      await analyticsService.trackEvent({
        eventType: 'order_placed',
        tenantId,
        userId: user?.uid || 'guest',
        properties: {
          orderId: orderRef.id,
          orderNumber,
          total: orderData.total,
          itemCount: orderData.items.length,
          orderType: orderData.orderType,
          paymentMethod: orderData.paymentMethod,
          source: 'public_api'
        }
      });
      
      res.status(201).json({
        success: true,
        data: {
          id: orderRef.id,
          orderNumber,
          status: orderData.status,
          paymentStatus: orderData.paymentStatus,
          estimatedReadyTime: orderData.estimatedReadyTime,
          total: orderData.total
        }
      });
    } catch (error) {
      logger.error('Error creating order', { error });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// Get order status
app.get('/orders/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    // Search across all tenants
    const ordersSnapshot = await admin.firestore()
      .collectionGroup('orders')
      .where('orderNumber', '==', orderNumber)
      .limit(1)
      .get();
    
    if (ordersSnapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }
    
    const orderDoc = ordersSnapshot.docs[0];
    const order = orderDoc.data();
    
    // Get tenant info
    const tenantId = orderDoc.ref.parent.parent?.id;
    const tenantDoc = await admin.firestore()
      .collection('tenants')
      .doc(tenantId!)
      .get();
    
    const tenant = tenantDoc.data();
    
    res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        estimatedReadyTime: order.estimatedReadyTime,
        items: order.items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          options: item.options
        })),
        total: order.total,
        tenant: {
          name: tenant?.name,
          phone: tenant?.contact?.phone,
          address: tenant?.address
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching order', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get user orders
app.get('/users/:userId/orders', validateOptionalAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { user } = req;
    
    // Verify user is accessing their own orders
    if (!user || user.uid !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }
    
    const ordersSnapshot = await admin.firestore()
      .collectionGroup('orders')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    
    const orders = [];
    
    for (const doc of ordersSnapshot.docs) {
      const order = doc.data();
      const tenantId = doc.ref.parent.parent?.id;
      
      // Get tenant info
      const tenantDoc = await admin.firestore()
        .collection('tenants')
        .doc(tenantId!)
        .get();
      
      orders.push({
        id: doc.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        itemCount: order.items.length,
        createdAt: order.createdAt,
        tenant: {
          id: tenantId,
          name: tenantDoc.data()?.name,
          logo: tenantDoc.data()?.logo
        }
      });
    }
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    logger.error('Error fetching user orders', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// REVIEWS
// ============================================================================

// Get product reviews
app.get('/tenants/:tenantId/products/:productId/reviews', async (req, res) => {
  try {
    const { tenantId, productId } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    
    const reviewsSnapshot = await admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('reviews')
      .where('productId', '==', productId)
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc')
      .limit(Number(limit))
      .offset(Number(offset))
      .get();
    
    const reviews = reviewsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Hide sensitive user info
      userId: undefined,
      userEmail: undefined
    }));
    
    res.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    logger.error('Error fetching reviews', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Submit review
app.post(
  '/tenants/:tenantId/reviews',
  validateOptionalAuth,
  validateRequest(reviewSchema),
  async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { user } = req;
      
      // Verify order exists and belongs to user
      const orderDoc = await admin.firestore()
        .collection('tenants')
        .doc(tenantId)
        .collection('orders')
        .doc(req.body.orderId)
        .get();
      
      if (!orderDoc.exists) {
        return res.status(404).json({ 
          success: false, 
          error: 'Order not found' 
        });
      }
      
      const order = orderDoc.data();
      
      // Verify order belongs to user (if authenticated)
      if (user && order?.userId !== user.uid) {
        return res.status(403).json({ 
          success: false, 
          error: 'Access denied' 
        });
      }
      
      // Verify order is completed
      if (!['completed', 'delivered'].includes(order?.status)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Can only review completed orders' 
        });
      }
      
      // Check if already reviewed
      const existingReview = await admin.firestore()
        .collection('tenants')
        .doc(tenantId)
        .collection('reviews')
        .where('orderId', '==', req.body.orderId)
        .where('productId', '==', req.body.productId)
        .limit(1)
        .get();
      
      if (!existingReview.empty) {
        return res.status(400).json({ 
          success: false, 
          error: 'Product already reviewed' 
        });
      }
      
      // Create review
      const reviewData = {
        orderId: req.body.orderId,
        productId: req.body.productId,
        userId: user?.uid || null,
        userName: req.body.userName || 'Anonymous',
        rating: req.body.rating,
        comment: req.body.comment || '',
        status: 'pending', // Reviews require approval
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          userAgent: req.headers['user-agent'],
          ip: req.ip
        }
      };
      
      const reviewRef = await admin.firestore()
        .collection('tenants')
        .doc(tenantId)
        .collection('reviews')
        .add(reviewData);
      
      res.status(201).json({
        success: true,
        message: 'Review submitted successfully. It will be visible after approval.',
        data: {
          id: reviewRef.id
        }
      });
    } catch (error) {
      logger.error('Error submitting review', { error });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// ============================================================================
// CONTACT & SUPPORT
// ============================================================================

// Submit contact form
app.post(
  '/tenants/:tenantId/contact',
  validateRequest(contactFormSchema),
  async (req, res) => {
    try {
      const { tenantId } = req.params;
      
      // Get tenant
      const tenantDoc = await admin.firestore()
        .collection('tenants')
        .doc(tenantId)
        .get();
      
      if (!tenantDoc.exists) {
        return res.status(404).json({ 
          success: false, 
          error: 'Tenant not found' 
        });
      }
      
      const tenant = tenantDoc.data();
      
      // Store contact submission
      const contactData = {
        ...req.body,
        tenantId,
        status: 'new',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          userAgent: req.headers['user-agent'],
          ip: req.ip
        }
      };
      
      const contactRef = await admin.firestore()
        .collection('contactSubmissions')
        .add(contactData);
      
      // Send email to tenant
      if (tenant?.contact?.email) {
        await emailService.sendContactFormNotification({
          to: tenant.contact.email,
          tenantName: tenant.name,
          submission: contactData
        });
      }
      
      // Send confirmation to user
      if (req.body.email) {
        await emailService.sendContactFormConfirmation({
          to: req.body.email,
          name: req.body.name,
          tenantName: tenant?.name
        });
      }
      
      res.status(201).json({
        success: true,
        message: 'Message sent successfully'
      });
    } catch (error) {
      logger.error('Error submitting contact form', { error });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// ============================================================================
// NEWSLETTER
// ============================================================================

// Subscribe to newsletter
app.post(
  '/tenants/:tenantId/newsletter',
  validateRequest(newsletterSchema),
  async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { email, name } = req.body;
      
      // Check if already subscribed
      const existingSubscriber = await admin.firestore()
        .collection('tenants')
        .doc(tenantId)
        .collection('newsletterSubscribers')
        .where('email', '==', email)
        .limit(1)
        .get();
      
      if (!existingSubscriber.empty) {
        const subscriber = existingSubscriber.docs[0];
        if (subscriber.data().status === 'active') {
          return res.status(400).json({ 
            success: false, 
            error: 'Email already subscribed' 
          });
        } else {
          // Reactivate subscription
          await subscriber.ref.update({
            status: 'active',
            resubscribedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      } else {
        // Create new subscription
        await admin.firestore()
          .collection('tenants')
          .doc(tenantId)
          .collection('newsletterSubscribers')
          .add({
            email,
            name: name || '',
            status: 'active',
            subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
            source: 'website',
            metadata: {
              userAgent: req.headers['user-agent'],
              ip: req.ip
            }
          });
      }
      
      // Send welcome email
      await emailService.sendNewsletterWelcome({
        to: email,
        name: name || 'Subscriber',
        tenantId
      });
      
      res.status(201).json({
        success: true,
        message: 'Successfully subscribed to newsletter'
      });
    } catch (error) {
      logger.error('Error subscribing to newsletter', { error });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// Unsubscribe from newsletter
app.get('/newsletter/unsubscribe', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid unsubscribe link' 
      });
    }
    
    // Decode token to get subscriber info
    // In production, use proper JWT or encrypted tokens
    const [tenantId, email] = Buffer.from(token, 'base64').toString().split(':');
    
    const subscriberSnapshot = await admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('newsletterSubscribers')
      .where('email', '==', email)
      .where('status', '==', 'active')
      .limit(1)
      .get();
    
    if (subscriberSnapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        error: 'Subscription not found' 
      });
    }
    
    // Update subscription status
    await subscriberSnapshot.docs[0].ref.update({
      status: 'unsubscribed',
      unsubscribedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      success: true,
      message: 'Successfully unsubscribed from newsletter'
    });
  } catch (error) {
    logger.error('Error unsubscribing from newsletter', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// LOCATIONS & AVAILABILITY
// ============================================================================

// Get tenant locations
app.get('/tenants/:tenantId/locations', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    const locationsSnapshot = await admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('locations')
      .where('status', '==', 'active')
      .get();
    
    const locations = locationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Hide sensitive info
      staffCount: undefined,
      settings: undefined
    }));
    
    res.json({
      success: true,
      data: locations
    });
  } catch (error) {
    logger.error('Error fetching locations', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Check availability
app.get('/tenants/:tenantId/availability', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { date, time, partySize } = req.query;
    
    // Get tenant settings
    const tenantDoc = await admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .get();
    
    if (!tenantDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Tenant not found' 
      });
    }
    
    const tenant = tenantDoc.data();
    const businessHours = tenant?.settings?.businessHours;
    
    // Check if open
    const requestedDate = date ? new Date(date) : new Date();
    const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const todayHours = businessHours?.[dayOfWeek];
    
    if (!todayHours || !todayHours.open) {
      return res.json({
        success: true,
        data: {
          available: false,
          reason: 'closed'
        }
      });
    }
    
    // Check time slot availability
    // This is simplified - in production, check actual capacity
    const available = true;
    
    res.json({
      success: true,
      data: {
        available,
        openTime: todayHours.openTime,
        closeTime: todayHours.closeTime,
        nextAvailable: available ? null : '13:00'
      }
    });
  } catch (error) {
    logger.error('Error checking availability', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function validateOrderItems(tenantId: string, items: any[]): Promise<any[]> {
  const validatedItems = [];
  
  for (const item of items) {
    const productDoc = await admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('products')
      .doc(item.productId)
      .get();
    
    if (!productDoc.exists) {
      throw new Error(`Product ${item.productId} not found`);
    }
    
    const product = productDoc.data();
    
    if (product?.status !== 'active' || !product?.available) {
      throw new Error(`Product ${product?.name} is not available`);
    }
    
    // Validate options
    let optionsPrice = 0;
    const validatedOptions = [];
    
    if (item.options && product.options) {
      for (const selectedOption of item.options) {
        const productOption = product.options.find((o: any) => o.id === selectedOption.id);
        if (!productOption) {
          throw new Error(`Invalid option ${selectedOption.id} for product ${product.name}`);
        }
        
        const selectedChoice = productOption.choices.find((c: any) => c.id === selectedOption.choiceId);
        if (!selectedChoice) {
          throw new Error(`Invalid choice for option ${productOption.name}`);
        }
        
        optionsPrice += selectedChoice.price || 0;
        validatedOptions.push({
          id: productOption.id,
          name: productOption.name,
          choice: selectedChoice.name,
          price: selectedChoice.price || 0
        });
      }
    }
    
    validatedItems.push({
      productId: item.productId,
      name: product.name,
      price: product.price + optionsPrice,
      basePrice: product.price,
      quantity: item.quantity,
      options: validatedOptions,
      notes: item.notes || ''
    });
  }
  
  return validatedItems;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error in public API', { error: err, path: req.path });
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// ============================================================================
// EXPORT
// ============================================================================
export const publicApi = functions
  .region('europe-west1')
  .runWith({
    memory: '512MB',
    timeoutSeconds: 30
  })
  .https.onRequest(app);