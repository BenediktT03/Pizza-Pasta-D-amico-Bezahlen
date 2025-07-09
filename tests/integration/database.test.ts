import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { 
  TruckService, 
  OrderService, 
  ProductService,
  HACCPService,
  AnalyticsService 
} from '@packages/core';

// Test configuration
const TEST_TIMEOUT = 30000;
const TEST_TRUCK_PREFIX = 'test-db-truck';
const TEST_ORDER_PREFIX = 'test-db-order';

// Services
let db: FirebaseFirestore.Firestore;
let truckService: TruckService;
let orderService: OrderService;
let productService: ProductService;
let haccpService: HACCPService;
let analyticsService: AnalyticsService;

// Test data
let testTruckId: string;
let testProductIds: string[] = [];

beforeAll(async () => {
  // Initialize Firebase Admin
  const serviceAccount = require('../../test-service-account.json');
  initializeApp({
    credential: cert(serviceAccount),
    projectId: 'eatech-test'
  });
  
  db = getFirestore();
  
  // Initialize services
  truckService = new TruckService(db);
  orderService = new OrderService(db);
  productService = new ProductService(db);
  haccpService = new HACCPService(db);
  analyticsService = new AnalyticsService(db);
  
  // Set up test data
  await setupTestData();
}, TEST_TIMEOUT);

afterAll(async () => {
  await cleanupTestData();
});

beforeEach(() => {
  jest.clearAllMocks();
});

// Helper functions
async function setupTestData() {
  // Create test truck
  testTruckId = `${TEST_TRUCK_PREFIX}-${Date.now()}`;
  
  await db.collection('foodtrucks').doc(testTruckId).set({
    name: 'Database Test Truck',
    ownerId: 'test-owner-id',
    stripeAccountId: 'acct_test_db',
    trial_ends_at: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    platformFeePercentage: 0,
    settings: {
      languages: ['de', 'fr', 'it', 'en'],
      currency: 'CHF',
      timezone: 'Europe/Zurich',
      orderNumberPrefix: 'DB'
    },
    locations: [],
    createdAt: FieldValue.serverTimestamp()
  });
}

async function cleanupTestData() {
  // Clean up all test data
  // Delete trucks
  const trucks = await db.collection('foodtrucks')
    .where('name', '>=', TEST_TRUCK_PREFIX)
    .where('name', '<', TEST_TRUCK_PREFIX + '\uf8ff')
    .get();
  
  for (const doc of trucks.docs) {
    // Delete subcollections first
    const subcollections = ['products', 'orders', 'haccp', 'locations'];
    for (const subcollection of subcollections) {
      const items = await doc.ref.collection(subcollection).get();
      for (const item of items.docs) {
        await item.ref.delete();
      }
    }
    await doc.ref.delete();
  }
  
  // Delete live orders
  const liveOrders = await db.collection('orders_live')
    .where('truckId', '==', testTruckId)
    .get();
  
  for (const doc of liveOrders.docs) {
    await doc.ref.delete();
  }
}

// Database Integration Tests
describe('Database Integration Tests', () => {
  describe('Firestore Transactions', () => {
    it('should handle concurrent order creation with proper numbering', async () => {
      // Create multiple orders concurrently
      const orderPromises = Array(5).fill(null).map((_, index) => 
        orderService.createOrder({
          truckId: testTruckId,
          items: [
            {
              productId: 'test-product',
              productName: 'Test Product',
              quantity: 1,
              unitPrice: 1000
            }
          ],
          customerName: `Customer ${index}`,
          customerPhone: '+41791234567',
          totalAmount: 1000
        })
      );
      
      const orders = await Promise.all(orderPromises);
      const orderNumbers = orders.map(o => o.dailyOrderNumber).sort((a, b) => a - b);
      
      // Check that order numbers are sequential starting from 100
      expect(orderNumbers[0]).toBe(100);
      for (let i = 1; i < orderNumbers.length; i++) {
        expect(orderNumbers[i]).toBe(orderNumbers[i - 1] + 1);
      }
    });
    
    it('should rollback transaction on error', async () => {
      const truckRef = db.collection('foodtrucks').doc(testTruckId);
      const initialData = (await truckRef.get()).data();
      
      try {
        await db.runTransaction(async (transaction) => {
          const truck = await transaction.get(truckRef);
          
          // Update truck
          transaction.update(truckRef, {
            name: 'Updated Name',
            updatedAt: FieldValue.serverTimestamp()
          });
          
          // Force an error
          throw new Error('Simulated error');
        });
      } catch (error) {
        // Expected error
      }
      
      // Verify rollback - data should be unchanged
      const afterData = (await truckRef.get()).data();
      expect(afterData?.name).toBe(initialData?.name);
      expect(afterData?.updatedAt).toBeUndefined();
    });
  });
  
  describe('Data Consistency', () => {
    it('should maintain referential integrity between collections', async () => {
      // Create product
      const productId = await productService.createProduct(testTruckId, {
        name: {
          de: 'Test Produkt',
          fr: 'Produit Test',
          it: 'Prodotto Test',
          en: 'Test Product'
        },
        price: 1500,
        category: 'mains',
        allergens: ['gluten'],
        available: true
      });
      
      testProductIds.push(productId);
      
      // Create order with the product
      const order = await orderService.createOrder({
        truckId: testTruckId,
        items: [{
          productId,
          productName: 'Test Product',
          quantity: 2,
          unitPrice: 1500
        }],
        customerName: 'Test Customer',
        customerPhone: '+41791234567',
        totalAmount: 3000
      });
      
      // Verify order references valid product
      const orderData = await db.collection('foodtrucks').doc(testTruckId)
        .collection('orders').doc(order.id).get();
      
      expect(orderData.exists).toBe(true);
      expect(orderData.data()?.items[0].productId).toBe(productId);
      
      // Verify product exists
      const productData = await db.collection('foodtrucks').doc(testTruckId)
        .collection('products').doc(productId).get();
      
      expect(productData.exists).toBe(true);
    });
    
    it('should update analytics aggregations correctly', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Create multiple orders
      for (let i = 0; i < 3; i++) {
        await orderService.createOrder({
          truckId: testTruckId,
          items: [{
            productId: 'burger',
            productName: 'Burger',
            quantity: 2,
            unitPrice: 1590
          }],
          customerName: `Customer ${i}`,
          customerPhone: '+41791234567',
          totalAmount: 3180
        });
      }
      
      // Check analytics aggregation
      const analytics = await db.collection('analytics')
        .doc(`${testTruckId}_${today}`).get();
      
      expect(analytics.exists).toBe(true);
      expect(analytics.data()).toMatchObject({
        revenue: 9540, // 3 * 3180
        orderCount: 3,
        popularItems: expect.arrayContaining([
          expect.objectContaining({
            productId: 'burger',
            count: 6 // 3 orders * 2 quantity
          })
        ])
      });
    });
  });
  
  describe('Offline Sync Support', () => {
    it('should handle offline order creation and sync', async () => {
      const offlineOrder = {
        id: `offline_${Date.now()}_${Math.random()}`,
        truckId: testTruckId,
        items: [{
          productId: 'offline-product',
          productName: 'Offline Product',
          quantity: 1,
          unitPrice: 1000
        }],
        customerName: 'Offline Customer',
        customerPhone: '+41791234567',
        totalAmount: 1000,
        createdOffline: true,
        syncStatus: 'pending',
        createdAt: new Date()
      };
      
      // Simulate offline order sync
      const syncedOrder = await orderService.syncOfflineOrder(offlineOrder);
      
      expect(syncedOrder).toMatchObject({
        id: expect.not.stringContaining('offline_'),
        syncStatus: 'synced',
        createdOffline: true,
        originalOfflineId: offlineOrder.id
      });
      
      // Verify order exists in database
      const dbOrder = await db.collection('foodtrucks').doc(testTruckId)
        .collection('orders').doc(syncedOrder.id).get();
      
      expect(dbOrder.exists).toBe(true);
    });
  });
  
  describe('HACCP Data Storage', () => {
    it('should store temperature readings with proper timestamps', async () => {
      const readings = [
        { sensorId: 'sensor-1', value: 4.5, location: 'Kühlschrank 1' },
        { sensorId: 'sensor-2', value: -18.5, location: 'Gefrierfach' }
      ];
      
      for (const reading of readings) {
        await haccpService.recordTemperature(testTruckId, {
          ...reading,
          type: 'temperature',
          unit: 'celsius',
          timestamp: new Date()
        });
      }
      
      // Query readings
      const storedReadings = await db.collection('foodtrucks').doc(testTruckId)
        .collection('haccp')
        .where('type', '==', 'temperature')
        .orderBy('timestamp', 'desc')
        .limit(2)
        .get();
      
      expect(storedReadings.size).toBe(2);
      expect(storedReadings.docs[0].data()).toMatchObject({
        value: -18.5,
        location: 'Gefrierfach'
      });
    });
    
    it('should enforce 2-year retention policy', async () => {
      // Create old HACCP record
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 3); // 3 years ago
      
      const oldRecordRef = await db.collection('foodtrucks').doc(testTruckId)
        .collection('haccp').add({
          type: 'temperature',
          value: 5.0,
          timestamp: Timestamp.fromDate(oldDate),
          shouldBeDeleted: true
        });
      
      // Run retention policy
      await haccpService.enforceRetentionPolicy(testTruckId);
      
      // Verify old record is deleted
      const oldRecord = await oldRecordRef.get();
      expect(oldRecord.exists).toBe(false);
      
      // Verify recent records are kept
      const recentRecords = await db.collection('foodtrucks').doc(testTruckId)
        .collection('haccp')
        .where('type', '==', 'temperature')
        .get();
      
      for (const doc of recentRecords.docs) {
        const timestamp = doc.data().timestamp.toDate();
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        expect(timestamp.getTime()).toBeGreaterThan(twoYearsAgo.getTime());
      }
    });
  });
  
  describe('Multi-tenant Data Isolation', () => {
    let truck2Id: string;
    
    beforeEach(async () => {
      // Create second truck
      truck2Id = `${TEST_TRUCK_PREFIX}-2-${Date.now()}`;
      await db.collection('foodtrucks').doc(truck2Id).set({
        name: 'Second Test Truck',
        ownerId: 'test-owner-2',
        stripeAccountId: 'acct_test_2',
        createdAt: FieldValue.serverTimestamp()
      });
    });
    
    afterEach(async () => {
      // Cleanup second truck
      await db.collection('foodtrucks').doc(truck2Id).delete();
    });
    
    it('should isolate data between trucks', async () => {
      // Create products for each truck
      await productService.createProduct(testTruckId, {
        name: { de: 'Truck 1 Product', fr: '', it: '', en: '' },
        price: 1000,
        category: 'mains',
        available: true
      });
      
      await productService.createProduct(truck2Id, {
        name: { de: 'Truck 2 Product', fr: '', it: '', en: '' },
        price: 2000,
        category: 'mains',
        available: true
      });
      
      // Query products for truck 1
      const truck1Products = await productService.getProducts(testTruckId);
      const truck2Products = await productService.getProducts(truck2Id);
      
      // Verify isolation
      expect(truck1Products).toHaveLength(1);
      expect(truck1Products[0].name.de).toBe('Truck 1 Product');
      
      expect(truck2Products).toHaveLength(1);
      expect(truck2Products[0].name.de).toBe('Truck 2 Product');
    });
  });
  
  describe('Performance and Scalability', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();
      
      // Bulk create products
      const batch = db.batch();
      const productCount = 100;
      
      for (let i = 0; i < productCount; i++) {
        const productRef = db.collection('foodtrucks').doc(testTruckId)
          .collection('products').doc(`bulk-product-${i}`);
        
        batch.set(productRef, {
          name: {
            de: `Produkt ${i}`,
            fr: `Produit ${i}`,
            it: `Prodotto ${i}`,
            en: `Product ${i}`
          },
          price: 1000 + (i * 10),
          category: 'mains',
          available: true,
          createdAt: FieldValue.serverTimestamp()
        });
      }
      
      await batch.commit();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds
      
      // Verify all products created
      const products = await db.collection('foodtrucks').doc(testTruckId)
        .collection('products')
        .where('name.de', '>=', 'Produkt')
        .where('name.de', '<', 'Produkt\uf8ff')
        .count()
        .get();
      
      expect(products.data().count).toBe(productCount);
    });
    
    it('should use proper indexes for common queries', async () => {
      // Create orders with different statuses
      const statuses = ['pending', 'preparing', 'ready', 'completed'];
      
      for (const status of statuses) {
        await orderService.createOrder({
          truckId: testTruckId,
          items: [{ productId: 'test', productName: 'Test', quantity: 1, unitPrice: 1000 }],
          customerName: 'Test',
          customerPhone: '+41791234567',
          totalAmount: 1000,
          status
        });
      }
      
      // Query with composite index (should be fast)
      const startTime = Date.now();
      
      const activeOrders = await db.collection('foodtrucks').doc(testTruckId)
        .collection('orders')
        .where('status', 'in', ['pending', 'preparing'])
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
      
      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(100); // Should use index
      expect(activeOrders.size).toBe(2);
    });
  });
  
  describe('Data Migration Support', () => {
    it('should handle schema migrations gracefully', async () => {
      // Create order with old schema
      const oldOrderRef = db.collection('foodtrucks').doc(testTruckId)
        .collection('orders').doc('old-schema-order');
      
      await oldOrderRef.set({
        // Old schema without platformFee field
        items: [{ product: 'Burger', qty: 2, price: 1590 }],
        total: 3180,
        customer: 'Old Customer',
        created: new Date()
      });
      
      // Run migration
      const migrated = await orderService.migrateOrder(testTruckId, 'old-schema-order');
      
      expect(migrated).toMatchObject({
        items: [{
          productId: 'Burger',
          quantity: 2,
          unitPrice: 1590
        }],
        totalAmount: 3180,
        customerName: 'Old Customer',
        platformFee: 0, // Default value added
        createdAt: expect.any(Timestamp)
      });
    });
  });
  
  describe('Backup and Recovery', () => {
    it('should export truck data for backup', async () => {
      // Add some test data
      await productService.createProduct(testTruckId, {
        name: { de: 'Backup Test', fr: '', it: '', en: '' },
        price: 1000,
        category: 'mains',
        available: true
      });
      
      // Export data
      const exportData = await truckService.exportTruckData(testTruckId);
      
      expect(exportData).toMatchObject({
        truck: expect.objectContaining({
          id: testTruckId,
          name: 'Database Test Truck'
        }),
        products: expect.arrayContaining([
          expect.objectContaining({
            name: expect.objectContaining({ de: 'Backup Test' })
          })
        ]),
        settings: expect.any(Object)
      });
      
      // Verify export is complete
      expect(exportData.exportedAt).toBeInstanceOf(Date);
      expect(exportData.version).toBe('1.0');
    });
  });
});