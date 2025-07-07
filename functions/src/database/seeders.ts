/**
 * EATECH Database Seeders
 * 
 * This file contains database seeding logic for development and testing
 * Creates sample data for all collections
 */

import * as admin from 'firebase-admin';
import { faker } from '@faker-js/faker';
import { logger } from 'firebase-functions';
import * as bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const db = admin.firestore();

// ============================================================================
// TYPES
// ============================================================================
interface SeederOptions {
  tenantCount?: number;
  productsPerTenant?: number;
  customersPerTenant?: number;
  ordersPerTenant?: number;
  eventsPerTenant?: number;
  clearExisting?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================
const SWISS_CITIES = [
  'Zürich', 'Genève', 'Basel', 'Lausanne', 'Bern',
  'Winterthur', 'Luzern', 'St. Gallen', 'Lugano', 'Biel/Bienne',
];

const SWISS_CANTONS = [
  'ZH', 'BE', 'LU', 'UR', 'SZ', 'OW', 'NW', 'GL', 'ZG', 'FR',
  'SO', 'BS', 'BL', 'SH', 'AR', 'AI', 'SG', 'GR', 'AG', 'TG',
  'TI', 'VD', 'VS', 'NE', 'GE', 'JU',
];

const FOODTRUCK_NAMES = [
  'Burger Bliss', 'Taco Express', 'Pizza Wheels', 'Asian Fusion',
  'Swiss Delights', 'Veggie Van', 'BBQ Brothers', 'Pasta Paradise',
  'Curry Corner', 'Sandwich Station', 'Waffle Wonder', 'Salad Safari',
];

const FOOD_CATEGORIES = [
  'Vorspeisen', 'Hauptgerichte', 'Desserts', 'Getränke',
  'Snacks', 'Vegetarisch', 'Vegan', 'Glutenfrei',
];

const PRODUCT_NAMES = {
  Vorspeisen: ['Frühlingsrollen', 'Bruschetta', 'Nachos', 'Suppe des Tages'],
  Hauptgerichte: ['Classic Burger', 'Cheeseburger', 'Veggie Burger', 'Pizza Margherita', 'Pad Thai', 'Currywurst'],
  Desserts: ['Tiramisu', 'Cheesecake', 'Brownie', 'Crème Brûlée'],
  Getränke: ['Cola', 'Wasser', 'Limonade', 'Kaffee', 'Bier', 'Wein'],
  Snacks: ['Pommes Frites', 'Onion Rings', 'Chicken Wings', 'Mozzarella Sticks'],
  Vegetarisch: ['Gemüse Wrap', 'Falafel', 'Quinoa Bowl', 'Caprese Sandwich'],
  Vegan: ['Vegan Burger', 'Buddha Bowl', 'Smoothie Bowl', 'Hummus Plate'],
  Glutenfrei: ['GF Pizza', 'Rice Bowl', 'GF Pasta', 'Salat'],
};

// ============================================================================
// SEEDER CLASS
// ============================================================================
export class DatabaseSeeder {
  private options: Required<SeederOptions>;
  
  constructor(options: SeederOptions = {}) {
    this.options = {
      tenantCount: options.tenantCount ?? 5,
      productsPerTenant: options.productsPerTenant ?? 20,
      customersPerTenant: options.customersPerTenant ?? 100,
      ordersPerTenant: options.ordersPerTenant ?? 200,
      eventsPerTenant: options.eventsPerTenant ?? 10,
      clearExisting: options.clearExisting ?? false,
    };
    
    // Set faker locale to German (Switzerland)
    faker.locale = 'de_CH';
  }
  
  /**
   * Run all seeders
   */
  async seed(): Promise<void> {
    logger.info('Starting database seeding', this.options);
    
    if (this.options.clearExisting) {
      await this.clearDatabase();
    }
    
    // Seed in order of dependencies
    const tenants = await this.seedTenants();
    
    for (const tenant of tenants) {
      await this.seedProducts(tenant.id);
      await this.seedCustomers(tenant.id);
      await this.seedOrders(tenant.id);
      await this.seedEvents(tenant.id);
      await this.seedAnalytics(tenant.id);
    }
    
    await this.seedSystemData();
    
    logger.info('Database seeding completed');
  }
  
  /**
   * Clear existing data
   */
  private async clearDatabase(): Promise<void> {
    logger.info('Clearing existing data');
    
    const collections = [
      'tenants', 'users', 'products', 'customers', 
      'orders', 'events', 'analytics',
    ];
    
    for (const collection of collections) {
      await this.deleteCollection(collection);
    }
  }
  
  /**
   * Delete a collection
   */
  private async deleteCollection(
    collectionPath: string,
    batchSize: number = 100
  ): Promise<void> {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);
    
    return new Promise((resolve, reject) => {
      this.deleteQueryBatch(query, resolve).catch(reject);
    });
  }
  
  private async deleteQueryBatch(
    query: admin.firestore.Query,
    resolve: () => void
  ): Promise<void> {
    const snapshot = await query.get();
    
    if (snapshot.size === 0) {
      resolve();
      return;
    }
    
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    process.nextTick(() => {
      this.deleteQueryBatch(query, resolve);
    });
  }
  
  /**
   * Seed tenants
   */
  private async seedTenants(): Promise<any[]> {
    logger.info(`Seeding ${this.options.tenantCount} tenants`);
    
    const tenants = [];
    const batch = db.batch();
    
    for (let i = 0; i < this.options.tenantCount; i++) {
      const tenantId = `tenant_${nanoid(10)}`;
      const tenant = {
        id: tenantId,
        name: faker.helpers.arrayElement(FOODTRUCK_NAMES),
        slug: faker.helpers.slugify(FOODTRUCK_NAMES[i]).toLowerCase(),
        description: faker.company.catchPhrase(),
        logo: faker.image.imageUrl(200, 200, 'food'),
        coverImage: faker.image.imageUrl(800, 400, 'restaurant'),
        contactInfo: {
          email: faker.internet.email(),
          phone: `+41${faker.datatype.number({ min: 100000000, max: 999999999 })}`,
          address: {
            street: faker.address.streetAddress(),
            city: faker.helpers.arrayElement(SWISS_CITIES),
            canton: faker.helpers.arrayElement(SWISS_CANTONS),
            postalCode: faker.datatype.number({ min: 1000, max: 9999 }).toString(),
            country: 'CH',
          },
        },
        businessInfo: {
          registrationNumber: `CHE-${faker.datatype.number({ min: 100000000, max: 999999999 })}`,
          vatNumber: `CHE-${faker.datatype.number({ min: 100000000, max: 999999999 })} MWST`,
          founded: faker.date.past(10).toISOString(),
        },
        operatingHours: {
          monday: { open: '11:00', close: '21:00' },
          tuesday: { open: '11:00', close: '21:00' },
          wednesday: { open: '11:00', close: '21:00' },
          thursday: { open: '11:00', close: '21:00' },
          friday: { open: '11:00', close: '22:00' },
          saturday: { open: '11:00', close: '22:00' },
          sunday: { open: '12:00', close: '20:00' },
        },
        settings: {
          currency: 'CHF',
          timezone: 'Europe/Zurich',
          language: faker.helpers.arrayElement(['de', 'fr', 'it']),
          taxRate: 7.7,
          minimumOrder: faker.datatype.number({ min: 10, max: 30 }),
          deliveryFee: faker.datatype.number({ min: 0, max: 5 }),
          prepTimeMinutes: faker.datatype.number({ min: 15, max: 45 }),
        },
        features: {
          ordering: true,
          delivery: faker.datatype.boolean(),
          pickup: true,
          tableService: faker.datatype.boolean(),
          loyaltyProgram: true,
          onlinePayment: true,
          cashPayment: true,
          cardPayment: true,
        },
        billing: {
          plan: faker.helpers.arrayElement(['starter', 'professional', 'enterprise']),
          status: 'active',
          trialEndsAt: faker.date.future().toISOString(),
          nextBillingDate: faker.date.future().toISOString(),
        },
        stats: {
          totalOrders: 0,
          totalRevenue: 0,
          totalCustomers: 0,
          averageRating: faker.datatype.float({ min: 4.0, max: 5.0, precision: 0.1 }),
          totalReviews: faker.datatype.number({ min: 10, max: 100 }),
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      batch.set(db.collection('tenants').doc(tenantId), tenant);
      tenants.push(tenant);
      
      // Also create owner user
      const userId = `user_${nanoid(10)}`;
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      batch.set(db.collection('users').doc(userId), {
        id: userId,
        email: tenant.contactInfo.email,
        password: hashedPassword,
        role: 'owner',
        tenantId,
        profile: {
          firstName: faker.name.firstName(),
          lastName: faker.name.lastName(),
          phone: tenant.contactInfo.phone,
          avatar: faker.image.avatar(),
        },
        permissions: ['all'],
        isActive: true,
        emailVerified: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    
    await batch.commit();
    return tenants;
  }
  
  /**
   * Seed products
   */
  private async seedProducts(tenantId: string): Promise<void> {
    logger.info(`Seeding ${this.options.productsPerTenant} products for tenant ${tenantId}`);
    
    const batch = db.batch();
    const productsRef = db.collection(`tenants/${tenantId}/products`);
    
    for (let i = 0; i < this.options.productsPerTenant; i++) {
      const category = faker.helpers.arrayElement(FOOD_CATEGORIES);
      const productNames = PRODUCT_NAMES[category] || ['Product'];
      const productId = `product_${nanoid(10)}`;
      
      const product = {
        id: productId,
        tenantId,
        name: faker.helpers.arrayElement(productNames),
        description: faker.lorem.paragraph(),
        category,
        price: faker.datatype.float({ min: 5, max: 50, precision: 0.5 }),
        images: [
          faker.image.food(400, 400),
          faker.image.food(400, 400),
        ],
        tags: faker.helpers.arrayElements(['bio', 'lokal', 'saisonal', 'hausgemacht'], 2),
        allergens: faker.helpers.arrayElements(
          ['gluten', 'lactose', 'nuts', 'eggs', 'soy'],
          faker.datatype.number({ min: 0, max: 3 })
        ),
        nutrition: {
          calories: faker.datatype.number({ min: 100, max: 800 }),
          protein: faker.datatype.number({ min: 5, max: 40 }),
          carbs: faker.datatype.number({ min: 10, max: 80 }),
          fat: faker.datatype.number({ min: 5, max: 50 }),
        },
        variants: [],
        modifiers: [],
        available: faker.datatype.boolean(0.9),
        featured: faker.datatype.boolean(0.2),
        prepTime: faker.datatype.number({ min: 5, max: 30 }),
        sortOrder: i,
        stats: {
          soldCount: faker.datatype.number({ min: 0, max: 1000 }),
          revenue: faker.datatype.float({ min: 0, max: 10000, precision: 0.01 }),
          averageRating: faker.datatype.float({ min: 3.5, max: 5.0, precision: 0.1 }),
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      batch.set(productsRef.doc(productId), product);
    }
    
    await batch.commit();
  }
  
  /**
   * Seed customers
   */
  private async seedCustomers(tenantId: string): Promise<void> {
    logger.info(`Seeding ${this.options.customersPerTenant} customers for tenant ${tenantId}`);
    
    const batch = db.batch();
    const customersRef = db.collection(`tenants/${tenantId}/customers`);
    
    for (let i = 0; i < this.options.customersPerTenant; i++) {
      const customerId = `customer_${nanoid(10)}`;
      
      const customer = {
        id: customerId,
        tenantId,
        email: faker.internet.email(),
        phone: `+41${faker.datatype.number({ min: 100000000, max: 999999999 })}`,
        profile: {
          firstName: faker.name.firstName(),
          lastName: faker.name.lastName(),
          dateOfBirth: faker.date.birthdate({ min: 18, max: 80, mode: 'age' }).toISOString(),
          avatar: faker.image.avatar(),
        },
        address: {
          street: faker.address.streetAddress(),
          city: faker.helpers.arrayElement(SWISS_CITIES),
          canton: faker.helpers.arrayElement(SWISS_CANTONS),
          postalCode: faker.datatype.number({ min: 1000, max: 9999 }).toString(),
          country: 'CH',
        },
        preferences: {
          language: faker.helpers.arrayElement(['de', 'fr', 'it', 'en']),
          notifications: {
            email: faker.datatype.boolean(),
            sms: faker.datatype.boolean(),
            push: faker.datatype.boolean(),
          },
          dietary: faker.helpers.arrayElements(
            ['vegetarian', 'vegan', 'gluten-free', 'lactose-free'],
            faker.datatype.number({ min: 0, max: 2 })
          ),
        },
        loyalty: {
          points: faker.datatype.number({ min: 0, max: 1000 }),
          tier: faker.helpers.arrayElement(['bronze', 'silver', 'gold']),
          joinedAt: faker.date.past(2).toISOString(),
        },
        stats: {
          totalOrders: faker.datatype.number({ min: 0, max: 100 }),
          totalSpent: faker.datatype.float({ min: 0, max: 5000, precision: 0.01 }),
          averageOrderValue: faker.datatype.float({ min: 15, max: 100, precision: 0.01 }),
          lastOrderDate: faker.date.recent(30).toISOString(),
        },
        tags: faker.helpers.arrayElements(['vip', 'regular', 'new', 'inactive'], 1),
        notes: faker.datatype.boolean(0.3) ? faker.lorem.sentence() : null,
        blacklisted: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      batch.set(customersRef.doc(customerId), customer);
    }
    
    await batch.commit();
  }
  
  /**
   * Seed orders
   */
  private async seedOrders(tenantId: string): Promise<void> {
    logger.info(`Seeding ${this.options.ordersPerTenant} orders for tenant ${tenantId}`);
    
    // Get products and customers for this tenant
    const products = await db.collection(`tenants/${tenantId}/products`).limit(20).get();
    const customers = await db.collection(`tenants/${tenantId}/customers`).limit(50).get();
    
    if (products.empty || customers.empty) {
      logger.warn('No products or customers found for tenant');
      return;
    }
    
    const productDocs = products.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const customerDocs = customers.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const batch = db.batch();
    const ordersRef = db.collection(`tenants/${tenantId}/orders`);
    
    for (let i = 0; i < this.options.ordersPerTenant; i++) {
      const orderId = `order_${nanoid(10)}`;
      const customer = faker.helpers.arrayElement(customerDocs);
      const orderDate = faker.date.recent(90);
      
      // Generate order items
      const itemCount = faker.datatype.number({ min: 1, max: 5 });
      const items = [];
      let subtotal = 0;
      
      for (let j = 0; j < itemCount; j++) {
        const product = faker.helpers.arrayElement(productDocs);
        const quantity = faker.datatype.number({ min: 1, max: 3 });
        const itemPrice = product.price * quantity;
        
        items.push({
          productId: product.id,
          productName: product.name,
          quantity,
          price: product.price,
          total: itemPrice,
          notes: faker.datatype.boolean(0.1) ? faker.lorem.sentence() : null,
        });
        
        subtotal += itemPrice;
      }
      
      const taxAmount = subtotal * 0.077; // 7.7% Swiss VAT
      const deliveryFee = faker.datatype.boolean(0.3) ? faker.datatype.number({ min: 0, max: 5 }) : 0;
      const total = subtotal + taxAmount + deliveryFee;
      
      const order = {
        id: orderId,
        tenantId,
        orderNumber: `#${faker.datatype.number({ min: 10000, max: 99999 })}`,
        customerId: customer.id,
        customerName: `${customer.profile.firstName} ${customer.profile.lastName}`,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        type: faker.helpers.arrayElement(['pickup', 'delivery']),
        status: faker.helpers.arrayElement(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']),
        items,
        pricing: {
          subtotal,
          tax: taxAmount,
          deliveryFee,
          discount: 0,
          tip: faker.datatype.boolean(0.3) ? faker.datatype.number({ min: 1, max: 10 }) : 0,
          total,
        },
        payment: {
          method: faker.helpers.arrayElement(['card', 'cash', 'twint']),
          status: faker.helpers.arrayElement(['pending', 'paid', 'refunded']),
          transactionId: `txn_${nanoid(10)}`,
        },
        delivery: deliveryFee > 0 ? {
          address: customer.address,
          instructions: faker.datatype.boolean(0.2) ? faker.lorem.sentence() : null,
          estimatedTime: faker.date.soon(1, orderDate).toISOString(),
        } : null,
        pickup: deliveryFee === 0 ? {
          time: faker.date.soon(1, orderDate).toISOString(),
          location: 'Main Location',
        } : null,
        notes: faker.datatype.boolean(0.2) ? faker.lorem.sentence() : null,
        createdAt: admin.firestore.Timestamp.fromDate(orderDate),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      batch.set(ordersRef.doc(orderId), order);
    }
    
    await batch.commit();
  }
  
  /**
   * Seed events
   */
  private async seedEvents(tenantId: string): Promise<void> {
    logger.info(`Seeding ${this.options.eventsPerTenant} events for tenant ${tenantId}`);
    
    const batch = db.batch();
    const eventsRef = db.collection(`tenants/${tenantId}/events`);
    
    for (let i = 0; i < this.options.eventsPerTenant; i++) {
      const eventId = `event_${nanoid(10)}`;
      const eventDate = faker.date.future(1);
      
      const event = {
        id: eventId,
        tenantId,
        name: faker.helpers.arrayElement([
          'Street Food Festival',
          'Farmers Market',
          'Corporate Lunch',
          'Wedding Catering',
          'Birthday Party',
          'Music Festival',
        ]),
        description: faker.lorem.paragraph(),
        date: eventDate.toISOString(),
        startTime: '11:00',
        endTime: '22:00',
        location: {
          name: faker.company.name(),
          address: {
            street: faker.address.streetAddress(),
            city: faker.helpers.arrayElement(SWISS_CITIES),
            canton: faker.helpers.arrayElement(SWISS_CANTONS),
            postalCode: faker.datatype.number({ min: 1000, max: 9999 }).toString(),
            country: 'CH',
          },
          coordinates: {
            lat: faker.address.latitude(47.5, 46.0),
            lng: faker.address.longitude(8.5, 7.0),
          },
        },
        type: faker.helpers.arrayElement(['public', 'private', 'catering']),
        status: faker.helpers.arrayElement(['draft', 'published', 'cancelled']),
        capacity: faker.datatype.number({ min: 50, max: 500 }),
        registrations: faker.datatype.number({ min: 0, max: 200 }),
        coverImage: faker.image.imageUrl(800, 400, 'event'),
        tags: faker.helpers.arrayElements(['outdoor', 'family-friendly', 'music', 'food'], 2),
        menu: {
          special: faker.datatype.boolean(),
          items: [],
        },
        pricing: {
          entryFee: faker.datatype.boolean(0.3) ? faker.datatype.number({ min: 0, max: 20 }) : 0,
          minimumOrder: faker.datatype.number({ min: 10, max: 30 }),
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      batch.set(eventsRef.doc(eventId), event);
    }
    
    await batch.commit();
  }
  
  /**
   * Seed analytics data
   */
  private async seedAnalytics(tenantId: string): Promise<void> {
    logger.info(`Seeding analytics for tenant ${tenantId}`);
    
    const batch = db.batch();
    const analyticsRef = db.collection(`tenants/${tenantId}/analytics`);
    
    // Daily metrics for the last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const metrics = {
        date: dateStr,
        tenantId,
        orders: {
          count: faker.datatype.number({ min: 10, max: 100 }),
          revenue: faker.datatype.float({ min: 500, max: 5000, precision: 0.01 }),
          averageValue: faker.datatype.float({ min: 20, max: 100, precision: 0.01 }),
        },
        customers: {
          new: faker.datatype.number({ min: 0, max: 20 }),
          returning: faker.datatype.number({ min: 5, max: 50 }),
          total: faker.datatype.number({ min: 10, max: 70 }),
        },
        products: {
          topSellers: [],
          lowStock: [],
        },
        payment: {
          card: faker.datatype.number({ min: 20, max: 60 }),
          cash: faker.datatype.number({ min: 10, max: 30 }),
          twint: faker.datatype.number({ min: 10, max: 40 }),
        },
        performance: {
          avgPrepTime: faker.datatype.number({ min: 10, max: 30 }),
          peakHour: faker.datatype.number({ min: 12, max: 20 }),
          busyPeriods: ['12:00-13:00', '18:00-20:00'],
        },
        timestamp: admin.firestore.Timestamp.fromDate(date),
      };
      
      batch.set(analyticsRef.doc(dateStr), metrics);
    }
    
    await batch.commit();
  }
  
  /**
   * Seed system data
   */
  private async seedSystemData(): Promise<void> {
    logger.info('Seeding system data');
    
    const batch = db.batch();
    
    // Master admin user
    const masterAdminId = 'admin_master';
    const hashedPassword = await bcrypt.hash('master@dmin123', 10);
    
    batch.set(db.collection('users').doc(masterAdminId), {
      id: masterAdminId,
      email: 'admin@eatech.ch',
      password: hashedPassword,
      role: 'master_admin',
      tenantId: null,
      profile: {
        firstName: 'Master',
        lastName: 'Admin',
        phone: '+41791234567',
        avatar: faker.image.avatar(),
      },
      permissions: ['*'],
      isActive: true,
      emailVerified: true,
      twoFactorEnabled: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // System configuration
    batch.set(db.collection('_system').doc('config'), {
      version: '3.0.0',
      environment: 'development',
      maintenanceMode: false,
      features: {
        multiTenant: true,
        ai: true,
        analytics: true,
        blockchain: false,
        voiceCommerce: false,
      },
      limits: {
        maxTenantsPerInstance: 1000,
        maxOrdersPerDay: 10000,
        maxProductsPerTenant: 1000,
        maxCustomersPerTenant: 10000,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    await batch.commit();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================
export const seeder = new DatabaseSeeder();

// CLI support
if (require.main === module) {
  (async () => {
    try {
      const options: SeederOptions = {
        tenantCount: parseInt(process.env.TENANT_COUNT || '5'),
        productsPerTenant: parseInt(process.env.PRODUCTS_PER_TENANT || '20'),
        customersPerTenant: parseInt(process.env.CUSTOMERS_PER_TENANT || '100'),
        ordersPerTenant: parseInt(process.env.ORDERS_PER_TENANT || '200'),
        eventsPerTenant: parseInt(process.env.EVENTS_PER_TENANT || '10'),
        clearExisting: process.env.CLEAR_EXISTING === 'true',
      };
      
      const seeder = new DatabaseSeeder(options);
      await seeder.seed();
      
      logger.info('Seeding completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('Seeding failed:', error);
      process.exit(1);
    }
  })();
}