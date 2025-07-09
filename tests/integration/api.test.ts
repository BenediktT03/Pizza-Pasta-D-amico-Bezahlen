import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { app } from '../../services/functions/src/index';
import { mockStripe } from '@packages/testing';

// Test configuration
const TEST_TIMEOUT = 30000;
const TEST_TRUCK_ID = 'test-truck-integration';
const TEST_USER_ID = 'test-user-integration';

// Initialize Firebase Admin for tests
let db: FirebaseFirestore.Firestore;
let auth: any;

beforeAll(async () => {
  // Initialize Firebase Admin with test credentials
  const serviceAccount = require('../../test-service-account.json');
  initializeApp({
    credential: cert(serviceAccount),
    projectId: 'eatech-test'
  });
  
  db = getFirestore();
  auth = getAuth();
  
  // Create test data
  await setupTestData();
}, TEST_TIMEOUT);

afterAll(async () => {
  // Clean up test data
  await cleanupTestData();
});

beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();
});

// Helper functions
async function setupTestData() {
  // Create test truck
  await db.collection('foodtrucks').doc(TEST_TRUCK_ID).set({
    name: 'Test Food Truck',
    ownerId: TEST_USER_ID,
    stripeAccountId: 'acct_test123',
    trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    platformFeePercentage: 0,
    settings: {
      languages: ['de', 'fr', 'it', 'en'],
      currency: 'CHF',
      timezone: 'Europe/Zurich'
    },
    branding: {
      primaryColor: '#DA291C',
      logo: 'https://example.com/logo.png'
    },
    createdAt: new Date()
  });
  
  // Create test products
  const products = [
    {
      id: 'burger-classic',
      name: {
        de: 'Klassischer Burger',
        fr: 'Burger Classique',
        it: 'Burger Classico',
        en: 'Classic Burger'
      },
      description: {
        de: 'Saftiger Rindfleisch-Burger mit frischen Zutaten',
        fr: 'Burger de bœuf juteux avec des ingrédients frais',
        it: 'Burger di manzo succoso con ingredienti freschi',
        en: 'Juicy beef burger with fresh ingredients'
      },
      price: 1590, // 15.90 CHF in Rappen
      category: 'mains',
      allergens: ['gluten', 'milk', 'eggs'],
      available: true,
      originCountry: 'CH' // Meat origin
    },
    {
      id: 'fries-medium',
      name: {
        de: 'Pommes Frites',
        fr: 'Frites',
        it: 'Patatine fritte',
        en: 'French Fries'
      },
      price: 650, // 6.50 CHF
      category: 'sides',
      allergens: [],
      available: true
    }
  ];
  
  for (const product of products) {
    await db.collection('foodtrucks').doc(TEST_TRUCK_ID)
      .collection('products').doc(product.id).set(product);
  }
  
  // Create test user with auth token
  await auth.createUser({
    uid: TEST_USER_ID,
    email: 'test@eatech.ch',
    displayName: 'Test User'
  });
  
  // Set custom claims for truck owner
  await auth.setCustomUserClaims(TEST_USER_ID, {
    role: 'truck_owner',
    truckId: TEST_TRUCK_ID
  });
}

async function cleanupTestData() {
  // Delete test truck and subcollections
  const truckRef = db.collection('foodtrucks').doc(TEST_TRUCK_ID);
  
  // Delete products
  const products = await truckRef.collection('products').get();
  for (const doc of products.docs) {
    await doc.ref.delete();
  }
  
  // Delete orders
  const orders = await truckRef.collection('orders').get();
  for (const doc of orders.docs) {
    await doc.ref.delete();
  }
  
  // Delete truck
  await truckRef.delete();
  
  // Delete test user
  await auth.deleteUser(TEST_USER_ID);
}

async function getAuthToken(userId = TEST_USER_ID): Promise<string> {
  return await auth.createCustomToken(userId);
}

// API Integration Tests
describe('API Integration Tests', () => {
  describe('Public Endpoints', () => {
    it('should get truck information without auth', async () => {
      const response = await request(app)
        .get(`/api/trucks/${TEST_TRUCK_ID}`)
        .expect(200);
      
      expect(response.body).toMatchObject({
        id: TEST_TRUCK_ID,
        name: 'Test Food Truck',
        branding: expect.any(Object)
      });
      
      // Should not include sensitive data
      expect(response.body).not.toHaveProperty('stripeAccountId');
      expect(response.body).not.toHaveProperty('ownerId');
    });
    
    it('should get menu in requested language', async () => {
      const response = await request(app)
        .get(`/api/trucks/${TEST_TRUCK_ID}/menu`)
        .query({ lang: 'fr' })
        .expect(200);
      
      expect(response.body.products).toHaveLength(2);
      expect(response.body.products[0]).toMatchObject({
        id: 'burger-classic',
        name: 'Burger Classique',
        description: expect.stringContaining('bœuf juteux'),
        price: 1590,
        allergens: ['gluten', 'milk', 'eggs']
      });
    });
    
    it('should handle invalid truck ID', async () => {
      const response = await request(app)
        .get('/api/trucks/invalid-truck-id/menu')
        .expect(404);
      
      expect(response.body).toMatchObject({
        error: 'Truck not found'
      });
    });
  });
  
  describe('Order Creation', () => {
    it('should create order without authentication', async () => {
      const orderData = {
        items: [
          { productId: 'burger-classic', quantity: 2 },
          { productId: 'fries-medium', quantity: 1 }
        ],
        customerName: 'Hans Müller',
        customerPhone: '+41791234567',
        paymentMethodId: 'pm_test123'
      };
      
      const response = await request(app)
        .post(`/api/trucks/${TEST_TRUCK_ID}/orders`)
        .send(orderData)
        .expect(201);
      
      expect(response.body).toMatchObject({
        id: expect.any(String),
        orderNumber: expect.any(Number),
        dailyOrderNumber: expect.any(Number),
        totalAmount: 3830, // (15.90 * 2) + 6.50 = 38.30 CHF
        status: 'pending',
        items: expect.arrayContaining([
          expect.objectContaining({
            productId: 'burger-classic',
            quantity: 2,
            unitPrice: 1590
          })
        ])
      });
      
      // Order number should start at 100
      expect(response.body.dailyOrderNumber).toBeGreaterThanOrEqual(100);
    });
    
    it('should validate Swiss phone numbers', async () => {
      const invalidNumbers = [
        '123456789',      // Too short
        '+49123456789',   // German number
        '0791234567',     // Missing leading 0
        '+410791234567'   // Too many digits
      ];
      
      for (const phone of invalidNumbers) {
        const response = await request(app)
          .post(`/api/trucks/${TEST_TRUCK_ID}/orders`)
          .send({
            items: [{ productId: 'burger-classic', quantity: 1 }],
            customerName: 'Test',
            customerPhone: phone
          })
          .expect(400);
        
        expect(response.body.error).toContain('phone');
      }
    });
    
    it('should enforce max order limits', async () => {
      // Try to order more than max quantity
      const response = await request(app)
        .post(`/api/trucks/${TEST_TRUCK_ID}/orders`)
        .send({
          items: [{ productId: 'burger-classic', quantity: 100 }], // Max is 99
          customerName: 'Test',
          customerPhone: '+41791234567'
        })
        .expect(400);
      
      expect(response.body.error).toContain('quantity');
    });
    
    it('should calculate platform fees correctly', async () => {
      // First, end the trial period for the truck
      await db.collection('foodtrucks').doc(TEST_TRUCK_ID).update({
        trial_ends_at: new Date(Date.now() - 1000), // Expired
        platformFeePercentage: 3
      });
      
      const response = await request(app)
        .post(`/api/trucks/${TEST_TRUCK_ID}/orders`)
        .send({
          items: [{ productId: 'burger-classic', quantity: 1 }],
          customerName: 'Test',
          customerPhone: '+41791234567',
          tipAmount: 200 // 2 CHF tip
        })
        .expect(201);
      
      expect(response.body).toMatchObject({
        totalAmount: 1590,
        platformFee: 48, // 3% of 1590 = 47.7 → 48
        tipAmount: 200,
        tipPlatformFee: 6 // 3% of 200
      });
    });
  });
  
  describe('Protected Endpoints', () => {
    let authToken: string;
    
    beforeEach(async () => {
      authToken = await getAuthToken();
    });
    
    it('should get truck orders with authentication', async () => {
      // Create a test order first
      await db.collection('foodtrucks').doc(TEST_TRUCK_ID)
        .collection('orders').doc('test-order-1').set({
          customerName: 'Test Customer',
          totalAmount: 1590,
          status: 'completed',
          createdAt: new Date()
        });
      
      const response = await request(app)
        .get(`/api/trucks/${TEST_TRUCK_ID}/orders`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.orders).toHaveLength(1);
      expect(response.body.orders[0]).toMatchObject({
        id: 'test-order-1',
        customerName: 'Test Customer'
      });
    });
    
    it('should update product availability', async () => {
      const response = await request(app)
        .patch(`/api/trucks/${TEST_TRUCK_ID}/products/burger-classic`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ available: false })
        .expect(200);
      
      expect(response.body).toMatchObject({
        id: 'burger-classic',
        available: false
      });
      
      // Verify in database
      const product = await db.collection('foodtrucks').doc(TEST_TRUCK_ID)
        .collection('products').doc('burger-classic').get();
      expect(product.data()?.available).toBe(false);
    });
    
    it('should reject requests without valid auth', async () => {
      await request(app)
        .get(`/api/trucks/${TEST_TRUCK_ID}/orders`)
        .expect(401);
    });
    
    it('should reject requests from unauthorized users', async () => {
      // Create another user without truck access
      const otherUserId = 'other-user-id';
      await auth.createUser({
        uid: otherUserId,
        email: 'other@eatech.ch'
      });
      
      const otherToken = await getAuthToken(otherUserId);
      
      await request(app)
        .get(`/api/trucks/${TEST_TRUCK_ID}/orders`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
      
      // Cleanup
      await auth.deleteUser(otherUserId);
    });
  });
  
  describe('Webhook Endpoints', () => {
    it('should handle Stripe webhook events', async () => {
      const webhookPayload = {
        id: 'evt_test123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123',
            amount: 1590,
            metadata: {
              orderId: 'test-order-1',
              truckId: TEST_TRUCK_ID
            }
          }
        }
      };
      
      // Mock Stripe signature
      const signature = mockStripe.webhooks.generateTestHeaderString({
        payload: JSON.stringify(webhookPayload),
        secret: process.env.STRIPE_WEBHOOK_SECRET!
      });
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(webhookPayload)
        .expect(200);
      
      expect(response.body).toMatchObject({
        received: true
      });
    });
    
    it('should reject invalid webhook signatures', async () => {
      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'invalid-signature')
        .send({ type: 'payment_intent.succeeded' })
        .expect(400);
    });
  });
  
  describe('Rate Limiting', () => {
    it('should enforce rate limits on orders', async () => {
      const orderData = {
        items: [{ productId: 'burger-classic', quantity: 1 }],
        customerName: 'Test',
        customerPhone: '+41791234567'
      };
      
      // Make 10 requests (the limit)
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post(`/api/trucks/${TEST_TRUCK_ID}/orders`)
          .send(orderData)
          .expect(201);
      }
      
      // 11th request should be rate limited
      const response = await request(app)
        .post(`/api/trucks/${TEST_TRUCK_ID}/orders`)
        .send(orderData)
        .expect(429);
      
      expect(response.body).toMatchObject({
        error: expect.stringContaining('Zu viele Anfragen')
      });
    });
  });
  
  describe('Multi-language Support', () => {
    it('should return error messages in requested language', async () => {
      const languages = ['de', 'fr', 'it', 'en'];
      const expectedErrors = {
        de: 'Truck nicht gefunden',
        fr: 'Food truck introuvable',
        it: 'Food truck non trovato',
        en: 'Truck not found'
      };
      
      for (const lang of languages) {
        const response = await request(app)
          .get('/api/trucks/invalid-truck/menu')
          .set('Accept-Language', lang)
          .expect(404);
        
        expect(response.body.error).toBe(expectedErrors[lang]);
      }
    });
  });
});