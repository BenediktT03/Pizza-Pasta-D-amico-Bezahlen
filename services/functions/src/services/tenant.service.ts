import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { 
  Tenant,
  TenantSettings,
  TenantRole,
  TenantSubscription,
  TenantStats
} from '@eatech/types';
import { paymentService } from './payment.service';
import { featureFlagService } from './feature-flags.service';

interface CreateTenantParams {
  name: string;
  email: string;
  phone: string;
  businessType: 'individual' | 'company';
  address: {
    street: string;
    city: string;
    postalCode: string;
    canton: string;
  };
  logo?: string;
  primaryColor?: string;
}

interface TenantOnboardingStatus {
  profileComplete: boolean;
  productsAdded: boolean;
  locationSet: boolean;
  paymentConnected: boolean;
  testOrderComplete: boolean;
  tutorialComplete: boolean;
}

export class TenantService {
  private db = admin.firestore();
  private auth = admin.auth();
  
  // Configuration
  private readonly TRIAL_DAYS = 90; // 3 months free
  private readonly PLATFORM_FEE_PERCENTAGE = 3;
  private readonly MAX_LOCATIONS_PER_DAY = 20;
  private readonly WHITELABEL_PRICE_MONTHLY = 199; // CHF

  /**
   * Create new food truck tenant
   */
  async createTenant(params: CreateTenantParams, userId: string): Promise<Tenant> {
    try {
      // Generate tenant ID and slug
      const tenantId = this.generateTenantId();
      const slug = this.generateSlug(params.name);

      // Create Stripe Connect account
      const stripeAccountId = await paymentService.createConnectAccount({
        id: tenantId,
        name: params.name,
        email: params.email,
        phone: params.phone,
        businessType: params.businessType,
        slug
      });

      // Create tenant document
      const tenant: Tenant = {
        id: tenantId,
        name: params.name,
        slug,
        email: params.email,
        phone: params.phone,
        businessType: params.businessType,
        address: params.address,
        stripeAccountId,
        ownerId: userId,
        settings: this.getDefaultSettings(),
        branding: {
          logo: params.logo,
          primaryColor: params.primaryColor || '#DA291C',
          secondaryColor: '#FFFFFF',
          accentColor: '#FFD700'
        },
        subscription: {
          status: 'trialing',
          trialEndsAt: new Date(Date.now() + this.TRIAL_DAYS * 24 * 60 * 60 * 1000),
          platformFeePercentage: 0, // 0% during trial
          plan: 'basic'
        },
        features: await this.getDefaultFeatures(),
        isActive: true,
        isOpen: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to Firestore
      await this.db.collection('foodtrucks').doc(tenantId).set(tenant);

      // Set user role
      await this.setUserRole(userId, tenantId, 'owner');

      // Initialize collections
      await this.initializeTenantCollections(tenantId);

      // Create onboarding checklist
      await this.createOnboardingChecklist(tenantId);

      // Send welcome email
      await this.sendWelcomeEmail(tenant);

      return tenant;
    } catch (error) {
      logger.error('Failed to create tenant', { params, error });
      throw error;
    }
  }

  /**
   * Update tenant settings
   */
  async updateTenantSettings(
    tenantId: string,
    settings: Partial<TenantSettings>
  ): Promise<void> {
    try {
      await this.db.collection('foodtrucks').doc(tenantId).update({
        settings: admin.firestore.FieldValue.merge(settings),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // If updating business hours, update all locations
      if (settings.businessHours) {
        await this.updateAllLocationHours(tenantId, settings.businessHours);
      }
    } catch (error) {
      logger.error('Failed to update tenant settings', { tenantId, settings, error });
      throw error;
    }
  }

  /**
   * Add user to tenant (for multi-user support)
   */
  async addUserToTenant(
    tenantId: string,
    email: string,
    role: TenantRole
  ): Promise<void> {
    try {
      // Create user if doesn't exist
      let user;
      try {
        user = await this.auth.getUserByEmail(email);
      } catch (error) {
        // User doesn't exist, create them
        user = await this.auth.createUser({
          email,
          emailVerified: false
        });
      }

      // Set custom claims
      await this.setUserRole(user.uid, tenantId, role);

      // Add to tenant users collection
      await this.db
        .collection(`foodtrucks/${tenantId}/users`)
        .doc(user.uid)
        .set({
          email,
          role,
          addedAt: admin.firestore.FieldValue.serverTimestamp(),
          isActive: true
        });

      // Send invitation email
      await this.sendInvitationEmail(email, tenantId, role);
    } catch (error) {
      logger.error('Failed to add user to tenant', { tenantId, email, role, error });
      throw error;
    }
  }

  /**
   * Get tenant statistics
   */
  async getTenantStats(tenantId: string, period: 'day' | 'week' | 'month'): Promise<TenantStats> {
    try {
      const startDate = this.getStartDate(period);
      
      // Get orders
      const ordersSnapshot = await this.db
        .collection(`foodtrucks/${tenantId}/orders`)
        .where('createdAt', '>=', startDate)
        .get();

      const orders = ordersSnapshot.docs.map(doc => doc.data());

      // Calculate stats
      const stats: TenantStats = {
        period,
        orders: {
          total: orders.length,
          completed: orders.filter(o => o.status === 'completed').length,
          cancelled: orders.filter(o => o.status === 'cancelled').length,
          averageValue: this.calculateAverage(orders.map(o => o.totalAmount)),
          totalRevenue: orders.reduce((sum, o) => sum + o.totalAmount, 0)
        },
        products: await this.getProductStats(tenantId, orders),
        customers: {
          total: new Set(orders.map(o => o.customerId || o.customerPhone)).size,
          returning: await this.getReturningCustomers(tenantId, orders),
          averageOrdersPerCustomer: 0 // Calculate based on customer data
        },
        platformFees: {
          total: orders.reduce((sum, o) => sum + (o.platformFee || 0), 0),
          percentage: await this.getCurrentFeePercentage(tenantId)
        },
        complianceRate: await this.getComplianceRate(tenantId, startDate),
        lastUpdated: new Date()
      };

      // Save stats for quick access
      await this.saveStats(tenantId, period, stats);

      return stats;
    } catch (error) {
      logger.error('Failed to get tenant stats', { tenantId, period, error });
      throw error;
    }
  }

  /**
   * Check onboarding status
   */
  async getOnboardingStatus(tenantId: string): Promise<TenantOnboardingStatus> {
    try {
      const tenant = await this.getTenant(tenantId);
      const productsCount = await this.getProductCount(tenantId);
      const locationsCount = await this.getLocationCount(tenantId);
      const hasTestOrder = await this.hasTestOrder(tenantId);

      return {
        profileComplete: !!(tenant.logo && tenant.description),
        productsAdded: productsCount >= 3, // At least 3 products
        locationSet: locationsCount > 0,
        paymentConnected: tenant.stripeAccountStatus === 'active',
        testOrderComplete: hasTestOrder,
        tutorialComplete: tenant.onboardingCompletedAt !== undefined
      };
    } catch (error) {
      logger.error('Failed to get onboarding status', { tenantId, error });
      throw error;
    }
  }

  /**
   * Complete onboarding
   */
  async completeOnboarding(tenantId: string): Promise<void> {
    try {
      const status = await this.getOnboardingStatus(tenantId);
      
      if (!Object.values(status).every(v => v === true)) {
        throw new Error('Onboarding not complete');
      }

      await this.db.collection('foodtrucks').doc(tenantId).update({
        onboardingCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
        'subscription.status': 'active',
        isActive: true
      });

      // Enable all basic features
      await this.enableBasicFeatures(tenantId);

      // Send completion notification
      await this.sendOnboardingCompleteNotification(tenantId);
    } catch (error) {
      logger.error('Failed to complete onboarding', { tenantId, error });
      throw error;
    }
  }

  /**
   * Manage whitelabel subscription
   */
  async enableWhitelabel(tenantId: string, customDomain: string): Promise<void> {
    try {
      // Validate custom domain
      if (!this.isValidDomain(customDomain)) {
        throw new Error('Invalid domain format');
      }

      // Create subscription
      const subscriptionId = await this.createWhitelabelSubscription(tenantId);

      // Update tenant
      await this.db.collection('foodtrucks').doc(tenantId).update({
        'whitelabel.enabled': true,
        'whitelabel.customDomain': customDomain,
        'whitelabel.subscriptionId': subscriptionId,
        'whitelabel.activatedAt': admin.firestore.FieldValue.serverTimestamp()
      });

      // Configure DNS (would integrate with Cloudflare API)
      await this.configureDNS(customDomain, tenantId);

      // Enable whitelabel features
      await featureFlagService.setTruckFlag(tenantId, 'whitelabel', true);
    } catch (error) {
      logger.error('Failed to enable whitelabel', { tenantId, customDomain, error });
      throw error;
    }
  }

  /**
   * Get tenant by various identifiers
   */
  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    try {
      const snapshot = await this.db
        .collection('foodtrucks')
        .where('slug', '==', slug)
        .limit(1)
        .get();

      if (snapshot.empty) return null;

      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Tenant;
    } catch (error) {
      logger.error('Failed to get tenant by slug', { slug, error });
      return null;
    }
  }

  /**
   * Suspend/resume tenant
   */
  async suspendTenant(tenantId: string, reason: string): Promise<void> {
    try {
      await this.db.collection('foodtrucks').doc(tenantId).update({
        isActive: false,
        suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
        suspensionReason: reason
      });

      // Disable all orders
      await this.disableOrdering(tenantId);

      // Notify tenant
      await this.notifySuspension(tenantId, reason);
    } catch (error) {
      logger.error('Failed to suspend tenant', { tenantId, reason, error });
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private generateTenantId(): string {
    return `truck_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private getDefaultSettings(): TenantSettings {
    return {
      language: 'de',
      currency: 'CHF',
      timezone: 'Europe/Zurich',
      orderPrefix: 'ORD',
      dailyOrderStart: 100,
      maxOrdersPerHour: 100,
      businessHours: {
        monday: { open: '11:00', close: '20:00' },
        tuesday: { open: '11:00', close: '20:00' },
        wednesday: { open: '11:00', close: '20:00' },
        thursday: { open: '11:00', close: '20:00' },
        friday: { open: '11:00', close: '21:00' },
        saturday: { open: '11:00', close: '21:00' },
        sunday: { closed: true }
      },
      notifications: {
        orderReceived: true,
        orderReady: true,
        lowInventory: true,
        dailyReport: true
      },
      vatRate: 2.5 // Takeaway rate
    };
  }

  private async getDefaultFeatures(): Promise<string[]> {
    // Get all enabled global features
    const globalFeatures = await featureFlagService.getGlobalFeatures();
    return globalFeatures
      .filter(f => f.enabled && f.defaultForNewTrucks)
      .map(f => f.key);
  }

  private async setUserRole(userId: string, tenantId: string, role: TenantRole): Promise<void> {
    const claims = {
      role: role === 'owner' ? 'truck_owner' : 'truck_staff',
      tenantId,
      tenants: [tenantId]
    };

    await this.auth.setCustomUserClaims(userId, claims);
  }

  private async initializeTenantCollections(tenantId: string): Promise<void> {
    const collections = [
      'products',
      'orders',
      'locations',
      'inventory',
      'haccp',
      'customers',
      'analytics'
    ];

    const batch = this.db.batch();

    for (const collection of collections) {
      const ref = this.db
        .collection(`foodtrucks/${tenantId}/${collection}`)
        .doc('_init');
      
      batch.set(ref, {
        initialized: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    await batch.commit();
  }

  private async createOnboardingChecklist(tenantId: string): Promise<void> {
    const checklist = {
      steps: [
        { id: 'profile', name: 'Profil vervollständigen', completed: false },
        { id: 'products', name: 'Produkte hinzufügen', completed: false },
        { id: 'location', name: 'Standort festlegen', completed: false },
        { id: 'payment', name: 'Zahlungsmethode verbinden', completed: false },
        { id: 'test', name: 'Testbestellung durchführen', completed: false },
        { id: 'tutorial', name: 'Tutorial abschließen', completed: false }
      ],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await this.db
      .collection(`foodtrucks/${tenantId}/onboarding`)
      .doc('checklist')
      .set(checklist);
  }

  private async getTenant(tenantId: string): Promise<any> {
    const doc = await this.db.collection('foodtrucks').doc(tenantId).get();
    if (!doc.exists) {
      throw new Error('Tenant not found');
    }
    return { id: doc.id, ...doc.data() };
  }

  private async getProductCount(tenantId: string): Promise<number> {
    const snapshot = await this.db
      .collection(`foodtrucks/${tenantId}/products`)
      .count()
      .get();
    return snapshot.data().count;
  }

  private async getLocationCount(tenantId: string): Promise<number> {
    const snapshot = await this.db
      .collection(`foodtrucks/${tenantId}/locations`)
      .where('active', '==', true)
      .count()
      .get();
    return snapshot.data().count;
  }

  private async hasTestOrder(tenantId: string): Promise<boolean> {
    const snapshot = await this.db
      .collection(`foodtrucks/${tenantId}/orders`)
      .where('isTestOrder', '==', true)
      .limit(1)
      .get();
    return !snapshot.empty;
  }

  private getStartDate(period: 'day' | 'week' | 'month'): Date {
    const now = new Date();
    switch (period) {
      case 'day':
        return new Date(now.setHours(0, 0, 0, 0));
      case 'week':
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        return new Date(now.setDate(diff));
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length);
  }

  private async getProductStats(tenantId: string, orders: any[]): Promise<any> {
    const productCounts: Record<string, number> = {};
    
    orders.forEach(order => {
      order.items.forEach((item: any) => {
        productCounts[item.productId] = (productCounts[item.productId] || 0) + item.quantity;
      });
    });

    const topProducts = Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([productId, count]) => ({ productId, count }));

    return {
      topProducts,
      totalSold: Object.values(productCounts).reduce((a, b) => a + b, 0)
    };
  }

  private async getReturningCustomers(tenantId: string, orders: any[]): Promise<number> {
    const customerOrderCounts: Record<string, number> = {};
    
    orders.forEach(order => {
      const customerId = order.customerId || order.customerPhone;
      customerOrderCounts[customerId] = (customerOrderCounts[customerId] || 0) + 1;
    });

    return Object.values(customerOrderCounts).filter(count => count > 1).length;
  }

  private async getCurrentFeePercentage(tenantId: string): Promise<number> {
    const tenant = await this.getTenant(tenantId);
    const trialEnded = new Date(tenant.subscription.trialEndsAt) < new Date();
    return trialEnded ? this.PLATFORM_FEE_PERCENTAGE : 0;
  }

  private async getComplianceRate(tenantId: string, startDate: Date): Promise<number> {
    const snapshot = await this.db
      .collection(`foodtrucks/${tenantId}/haccp`)
      .where('timestamp', '>=', startDate)
      .get();

    if (snapshot.empty) return 100;

    const records = snapshot.docs.map(doc => doc.data());
    const compliant = records.filter(r => r.compliant).length;
    
    return Math.round((compliant / records.length) * 100);
  }

  private async saveStats(tenantId: string, period: string, stats: TenantStats): Promise<void> {
    await this.db
      .collection(`foodtrucks/${tenantId}/analytics`)
      .doc(`${period}_${new Date().toISOString().split('T')[0]}`)
      .set(stats);
  }

  private async updateAllLocationHours(tenantId: string, businessHours: any): Promise<void> {
    const batch = this.db.batch();
    const snapshot = await this.db
      .collection(`foodtrucks/${tenantId}/locations`)
      .get();

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { businessHours });
    });

    await batch.commit();
  }

  private async sendWelcomeEmail(tenant: Tenant): Promise<void> {
    // Integration with notification service
    logger.info('Welcome email would be sent', { tenant: tenant.name });
  }

  private async sendInvitationEmail(email: string, tenantId: string, role: string): Promise<void> {
    logger.info('Invitation email would be sent', { email, tenantId, role });
  }

  private async enableBasicFeatures(tenantId: string): Promise<void> {
    const basicFeatures = [
      'basic_ordering',
      'digital_menu',
      'payment_processing',
      'order_notifications'
    ];

    for (const feature of basicFeatures) {
      await featureFlagService.setTruckFlag(tenantId, feature, true);
    }
  }

  private async sendOnboardingCompleteNotification(tenantId: string): Promise<void> {
    logger.info('Onboarding complete notification would be sent', { tenantId });
  }

  private isValidDomain(domain: string): boolean {
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    return domainRegex.test(domain);
  }

  private async createWhitelabelSubscription(tenantId: string): Promise<string> {
    // Would integrate with Stripe subscriptions
    return `sub_${Date.now()}`;
  }

  private async configureDNS(customDomain: string, tenantId: string): Promise<void> {
    // Would integrate with Cloudflare API
    logger.info('DNS would be configured', { customDomain, tenantId });
  }

  private async disableOrdering(tenantId: string): Promise<void> {
    await this.db.collection('foodtrucks').doc(tenantId).update({
      isOpen: false,
      acceptingOrders: false
    });
  }

  private async notifySuspension(tenantId: string, reason: string): Promise<void> {
    logger.info('Suspension notification would be sent', { tenantId, reason });
  }
}

// Export singleton instance
export const tenantService = new TenantService();
