/**
 * EATECH - Tenant Service
 * Version: 1.0.0
 * Description: Multi-Tenant Management Service für Foodtruck-Verwaltung
 * Author: EATECH Development Team
 * Created: 2025-01-09
 * File Path: /functions/src/services/TenantService.ts
 * 
 * Features:
 * - Tenant provisioning
 * - Subscription management
 * - Resource isolation
 * - Usage tracking
 * - Billing integration
 * - Feature toggling
 * - Tenant migration
 * - White-label support
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { 
  Tenant,
  TenantSubscription,
  TenantSettings,
  TenantUsage,
  TenantFeatures,
  SubscriptionPlan
} from '../types/tenant.types';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
import { 
  addDays,
  addMonths,
  isAfter,
  isBefore,
  startOfMonth,
  endOfMonth,
  differenceInDays
} from 'date-fns';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface TenantCreationOptions {
  name: string;
  email: string;
  phone?: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    canton: string;
  };
  plan: SubscriptionPlan;
  trialDays?: number;
  customDomain?: string;
  whiteLabel?: boolean;
}

interface TenantProvisioningResult {
  tenant: Tenant;
  subscription: TenantSubscription;
  adminUser: {
    uid: string;
    email: string;
    password: string;
  };
  setupUrl: string;
}

interface UsageReport {
  tenantId: string;
  period: {
    start: Date;
    end: Date;
  };
  usage: {
    orders: number;
    storage: number;
    api_calls: number;
    sms_sent: number;
    emails_sent: number;
  };
  costs: {
    subscription: number;
    overage: number;
    total: number;
  };
  limits: TenantUsage['limits'];
}

interface MigrationOptions {
  sourceTenantId: string;
  targetTenantId: string;
  includeData: {
    products: boolean;
    customers: boolean;
    orders: boolean;
    analytics: boolean;
    settings: boolean;
  };
  deleteSource: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TENANTS_COLLECTION = 'tenants';
const SUBSCRIPTIONS_COLLECTION = 'tenant_subscriptions';
const USAGE_COLLECTION = 'tenant_usage';
const INVOICES_COLLECTION = 'tenant_invoices';

const stripe = new Stripe(functions.config().stripe?.secret_key || '', {
  apiVersion: '2023-10-16'
});

const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, any> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'CHF',
    interval: 'month',
    features: {
      orders: 50,
      products: 20,
      users: 1,
      storage: 100, // MB
      api_calls: 1000,
      sms: 0,
      emails: 100,
      analytics: false,
      customDomain: false,
      whiteLabel: false,
      support: 'community'
    }
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 49,
    currency: 'CHF',
    interval: 'month',
    features: {
      orders: 500,
      products: 100,
      users: 3,
      storage: 1000, // MB
      api_calls: 10000,
      sms: 50,
      emails: 1000,
      analytics: true,
      customDomain: false,
      whiteLabel: false,
      support: 'email'
    },
    stripeProductId: functions.config().stripe?.products?.starter,
    stripePriceId: functions.config().stripe?.prices?.starter
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    price: 99,
    currency: 'CHF',
    interval: 'month',
    features: {
      orders: 2000,
      products: 500,
      users: 10,
      storage: 5000, // MB
      api_calls: 50000,
      sms: 200,
      emails: 5000,
      analytics: true,
      customDomain: true,
      whiteLabel: false,
      support: 'priority'
    },
    stripeProductId: functions.config().stripe?.products?.professional,
    stripePriceId: functions.config().stripe?.prices?.professional
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299,
    currency: 'CHF',
    interval: 'month',
    features: {
      orders: -1, // Unlimited
      products: -1,
      users: -1,
      storage: -1,
      api_calls: -1,
      sms: 1000,
      emails: 20000,
      analytics: true,
      customDomain: true,
      whiteLabel: true,
      support: 'dedicated'
    },
    stripeProductId: functions.config().stripe?.products?.enterprise,
    stripePriceId: functions.config().stripe?.prices?.enterprise
  }
};

const DEFAULT_TRIAL_DAYS = 14;
const OVERAGE_RATES = {
  orders: 0.1, // CHF per order
  storage: 0.05, // CHF per GB
  api_calls: 0.001, // CHF per 1000 calls
  sms: 0.15, // CHF per SMS
  emails: 0.002 // CHF per email
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export default class TenantService {
  private firestore: admin.firestore.Firestore;
  private auth: admin.auth.Auth;

  constructor() {
    this.firestore = admin.firestore();
    this.auth = admin.auth();
  }

  /**
   * Create new tenant
   */
  async createTenant(options: TenantCreationOptions): Promise<TenantProvisioningResult> {
    const tenantId = uuidv4();
    logger.info(`Creating tenant ${tenantId} with plan ${options.plan}`);

    try {
      // Create Stripe customer
      const stripeCustomer = await this.createStripeCustomer(options);

      // Create tenant record
      const tenant = await this.createTenantRecord(tenantId, options, stripeCustomer.id);

      // Create subscription
      const subscription = await this.createSubscription(
        tenantId,
        options.plan,
        stripeCustomer.id,
        options.trialDays
      );

      // Create admin user
      const adminUser = await this.createAdminUser(tenantId, options.email);

      // Initialize tenant data
      await this.initializeTenantData(tenantId);

      // Setup custom domain if requested
      if (options.customDomain) {
        await this.setupCustomDomain(tenantId, options.customDomain);
      }

      // Send welcome email
      await this.sendWelcomeEmail(options.email, tenant, adminUser.password);

      const result: TenantProvisioningResult = {
        tenant,
        subscription,
        adminUser: {
          uid: adminUser.uid,
          email: adminUser.email!,
          password: adminUser.password
        },
        setupUrl: `https://app.eatech.ch/setup?tenant=${tenantId}&token=${adminUser.setupToken}`
      };

      logger.info(`Tenant ${tenantId} created successfully`);
      return result;

    } catch (error) {
      logger.error(`Failed to create tenant ${tenantId}:`, error);
      // Cleanup on failure
      await this.cleanupFailedTenant(tenantId);
      throw error;
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenant(tenantId: string): Promise<Tenant | null> {
    try {
      const doc = await this.firestore
        .collection(TENANTS_COLLECTION)
        .doc(tenantId)
        .get();

      return doc.exists ? doc.data() as Tenant : null;
    } catch (error) {
      logger.error(`Error getting tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Update tenant
   */
  async updateTenant(
    tenantId: string,
    updates: Partial<Tenant>
  ): Promise<void> {
    try {
      await this.firestore
        .collection(TENANTS_COLLECTION)
        .doc(tenantId)
        .update({
          ...updates,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

      logger.info(`Tenant ${tenantId} updated`);
    } catch (error) {
      logger.error(`Error updating tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(
    tenantId: string,
    newPlan: SubscriptionPlan
  ): Promise<TenantSubscription> {
    try {
      const tenant = await this.getTenant(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const currentSubscription = await this.getSubscription(tenantId);
      if (!currentSubscription) {
        throw new Error('Subscription not found');
      }

      // Update Stripe subscription
      if (tenant.stripeCustomerId && currentSubscription.stripeSubscriptionId) {
        const planConfig = SUBSCRIPTION_PLANS[newPlan];
        
        await stripe.subscriptions.update(
          currentSubscription.stripeSubscriptionId,
          {
            items: [{
              id: currentSubscription.stripeSubscriptionItemId,
              price: planConfig.stripePriceId
            }],
            proration_behavior: 'create_prorations'
          }
        );
      }

      // Update local subscription
      const updatedSubscription: TenantSubscription = {
        ...currentSubscription,
        plan: newPlan,
        features: SUBSCRIPTION_PLANS[newPlan].features,
        updatedAt: new Date()
      };

      await this.firestore
        .collection(SUBSCRIPTIONS_COLLECTION)
        .doc(tenantId)
        .update(updatedSubscription);

      // Update tenant features
      await this.updateTenantFeatures(tenantId, newPlan);

      logger.info(`Subscription updated for tenant ${tenantId} to plan ${newPlan}`);
      return updatedSubscription;

    } catch (error) {
      logger.error(`Error updating subscription for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Track usage
   */
  async trackUsage(
    tenantId: string,
    metric: keyof TenantUsage['current'],
    value: number = 1
  ): Promise<void> {
    try {
      const usageRef = this.firestore
        .collection(USAGE_COLLECTION)
        .doc(tenantId);

      await usageRef.update({
        [`current.${metric}`]: admin.firestore.FieldValue.increment(value),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });

      // Check limits
      await this.checkUsageLimits(tenantId);

    } catch (error) {
      logger.error(`Error tracking usage for tenant ${tenantId}:`, error);
      // Don't throw - usage tracking should not break operations
    }
  }

  /**
   * Get usage report
   */
  async getUsageReport(
    tenantId: string,
    period?: { start: Date; end: Date }
  ): Promise<UsageReport> {
    try {
      const tenant = await this.getTenant(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const subscription = await this.getSubscription(tenantId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Default to current month
      const reportPeriod = period || {
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date())
      };

      // Get usage data
      const usage = await this.getUsageForPeriod(tenantId, reportPeriod);

      // Calculate costs
      const costs = this.calculateUsageCosts(usage, subscription);

      return {
        tenantId,
        period: reportPeriod,
        usage,
        costs,
        limits: subscription.features
      };

    } catch (error) {
      logger.error(`Error getting usage report for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Suspend tenant
   */
  async suspendTenant(
    tenantId: string,
    reason: string
  ): Promise<void> {
    try {
      await this.updateTenant(tenantId, {
        status: 'suspended',
        suspendedAt: new Date(),
        suspensionReason: reason
      });

      // Disable all users
      await this.disableTenantUsers(tenantId);

      // Cancel Stripe subscription
      const subscription = await this.getSubscription(tenantId);
      if (subscription?.stripeSubscriptionId) {
        await stripe.subscriptions.update(
          subscription.stripeSubscriptionId,
          { pause_collection: { behavior: 'mark_uncollectible' } }
        );
      }

      logger.info(`Tenant ${tenantId} suspended: ${reason}`);
    } catch (error) {
      logger.error(`Error suspending tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Reactivate tenant
   */
  async reactivateTenant(tenantId: string): Promise<void> {
    try {
      await this.updateTenant(tenantId, {
        status: 'active',
        suspendedAt: null,
        suspensionReason: null
      });

      // Enable users
      await this.enableTenantUsers(tenantId);

      // Resume Stripe subscription
      const subscription = await this.getSubscription(tenantId);
      if (subscription?.stripeSubscriptionId) {
        await stripe.subscriptions.update(
          subscription.stripeSubscriptionId,
          { pause_collection: null }
        );
      }

      logger.info(`Tenant ${tenantId} reactivated`);
    } catch (error) {
      logger.error(`Error reactivating tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Delete tenant
   */
  async deleteTenant(
    tenantId: string,
    options?: {
      keepBackup?: boolean;
      reason?: string;
    }
  ): Promise<void> {
    try {
      logger.info(`Deleting tenant ${tenantId}`);

      // Create backup if requested
      if (options?.keepBackup) {
        await this.createTenantBackup(tenantId);
      }

      // Cancel subscription
      const subscription = await this.getSubscription(tenantId);
      if (subscription?.stripeSubscriptionId) {
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      }

      // Delete users
      await this.deleteTenantUsers(tenantId);

      // Delete data
      await this.deleteTenantData(tenantId);

      // Mark tenant as deleted
      await this.updateTenant(tenantId, {
        status: 'deleted',
        deletedAt: new Date(),
        deletionReason: options?.reason
      });

      logger.info(`Tenant ${tenantId} deleted`);
    } catch (error) {
      logger.error(`Error deleting tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Migrate tenant
   */
  async migrateTenant(options: MigrationOptions): Promise<void> {
    try {
      logger.info(`Migrating tenant from ${options.sourceTenantId} to ${options.targetTenantId}`);

      // Validate tenants
      const [sourceTenant, targetTenant] = await Promise.all([
        this.getTenant(options.sourceTenantId),
        this.getTenant(options.targetTenantId)
      ]);

      if (!sourceTenant || !targetTenant) {
        throw new Error('Source or target tenant not found');
      }

      // Migrate data
      const migrations = [];

      if (options.includeData.products) {
        migrations.push(this.migrateCollection('products', options));
      }

      if (options.includeData.customers) {
        migrations.push(this.migrateCollection('customers', options));
      }

      if (options.includeData.orders) {
        migrations.push(this.migrateCollection('orders', options));
      }

      if (options.includeData.analytics) {
        migrations.push(this.migrateCollection('analytics_events', options));
      }

      if (options.includeData.settings) {
        migrations.push(this.migrateSettings(options));
      }

      await Promise.all(migrations);

      // Delete source if requested
      if (options.deleteSource) {
        await this.deleteTenant(options.sourceTenantId, {
          reason: `Migrated to ${options.targetTenantId}`
        });
      }

      logger.info(`Migration completed from ${options.sourceTenantId} to ${options.targetTenantId}`);
    } catch (error) {
      logger.error(`Migration failed:`, error);
      throw error;
    }
  }

  // ============================================================================
  // SCHEDULED FUNCTIONS
  // ============================================================================

  /**
   * Process monthly billing
   */
  async processMonthlyBilling(): Promise<void> {
    try {
      const activeTenants = await this.getActiveTenants();

      for (const tenant of activeTenants) {
        try {
          await this.processTenantBilling(tenant.id);
        } catch (error) {
          logger.error(`Billing failed for tenant ${tenant.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Monthly billing process failed:', error);
      throw error;
    }
  }

  /**
   * Check trial expirations
   */
  async checkTrialExpirations(): Promise<void> {
    try {
      const trialSubscriptions = await this.getTrialSubscriptions();

      for (const subscription of trialSubscriptions) {
        const daysRemaining = differenceInDays(subscription.trialEndsAt!, new Date());

        if (daysRemaining <= 0) {
          // Trial expired
          await this.handleTrialExpiration(subscription.tenantId);
        } else if (daysRemaining <= 3) {
          // Send reminder
          await this.sendTrialExpirationReminder(subscription.tenantId, daysRemaining);
        }
      }
    } catch (error) {
      logger.error('Trial expiration check failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Create Stripe customer
   */
  private async createStripeCustomer(options: TenantCreationOptions): Promise<Stripe.Customer> {
    return await stripe.customers.create({
      name: options.name,
      email: options.email,
      phone: options.phone,
      address: {
        line1: options.address.street,
        city: options.address.city,
        postal_code: options.address.postalCode,
        state: options.address.canton,
        country: 'CH'
      },
      metadata: {
        source: 'eatech_platform'
      }
    });
  }

  /**
   * Create tenant record
   */
  private async createTenantRecord(
    tenantId: string,
    options: TenantCreationOptions,
    stripeCustomerId: string
  ): Promise<Tenant> {
    const tenant: Tenant = {
      id: tenantId,
      name: options.name,
      email: options.email,
      phone: options.phone,
      address: options.address,
      status: 'active',
      plan: options.plan,
      stripeCustomerId,
      settings: {
        timezone: 'Europe/Zurich',
        currency: 'CHF',
        language: 'de',
        features: {
          orders: true,
          products: true,
          customers: true,
          analytics: SUBSCRIPTION_PLANS[options.plan].features.analytics,
          notifications: true,
          loyalty: options.plan !== 'free',
          events: options.plan === 'professional' || options.plan === 'enterprise',
          ai: options.plan === 'enterprise',
          customDomain: options.customDomain || false,
          whiteLabel: options.whiteLabel || false
        },
        branding: {
          primaryColor: '#3B82F6',
          logo: null,
          favicon: null
        },
        notifications: {
          email: true,
          sms: true,
          push: true
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.firestore
      .collection(TENANTS_COLLECTION)
      .doc(tenantId)
      .set(tenant);

    return tenant;
  }

  /**
   * Create subscription
   */
  private async createSubscription(
    tenantId: string,
    plan: SubscriptionPlan,
    stripeCustomerId: string,
    trialDays?: number
  ): Promise<TenantSubscription> {
    const planConfig = SUBSCRIPTION_PLANS[plan];
    let stripeSubscription: Stripe.Subscription | null = null;

    // Create Stripe subscription for paid plans
    if (plan !== 'free' && planConfig.stripePriceId) {
      stripeSubscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: planConfig.stripePriceId }],
        trial_period_days: trialDays || DEFAULT_TRIAL_DAYS,
        metadata: {
          tenantId
        }
      });
    }

    const subscription: TenantSubscription = {
      id: uuidv4(),
      tenantId,
      plan,
      status: 'active',
      features: planConfig.features,
      startDate: new Date(),
      renewalDate: addMonths(new Date(), 1),
      trialEndsAt: trialDays ? addDays(new Date(), trialDays) : undefined,
      stripeSubscriptionId: stripeSubscription?.id,
      stripeSubscriptionItemId: stripeSubscription?.items.data[0]?.id,
      price: planConfig.price,
      currency: planConfig.currency,
      interval: planConfig.interval,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.firestore
      .collection(SUBSCRIPTIONS_COLLECTION)
      .doc(tenantId)
      .set(subscription);

    return subscription;
  }

  /**
   * Create admin user
   */
  private async createAdminUser(
    tenantId: string,
    email: string
  ): Promise<any> {
    const password = this.generateSecurePassword();
    const setupToken = uuidv4();

    const userRecord = await this.auth.createUser({
      email,
      password,
      emailVerified: false
    });

    // Set custom claims
    await this.auth.setCustomUserClaims(userRecord.uid, {
      tenantId,
      role: 'admin'
    });

    // Store user data
    await this.firestore
      .collection('users')
      .doc(userRecord.uid)
      .set({
        uid: userRecord.uid,
        email,
        tenantId,
        role: 'admin',
        setupToken,
        setupTokenExpiry: addDays(new Date(), 7),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

    return {
      uid: userRecord.uid,
      email,
      password,
      setupToken
    };
  }

  /**
   * Initialize tenant data
   */
  private async initializeTenantData(tenantId: string): Promise<void> {
    // Create default categories
    await this.createDefaultCategories(tenantId);

    // Create default tax rates
    await this.createDefaultTaxRates(tenantId);

    // Initialize usage tracking
    await this.initializeUsageTracking(tenantId);
  }

  /**
   * Create default categories
   */
  private async createDefaultCategories(tenantId: string): Promise<void> {
    const defaultCategories = [
      { name: 'Vorspeisen', order: 1 },
      { name: 'Hauptgerichte', order: 2 },
      { name: 'Beilagen', order: 3 },
      { name: 'Desserts', order: 4 },
      { name: 'Getränke', order: 5 }
    ];

    const batch = this.firestore.batch();

    for (const category of defaultCategories) {
      const docRef = this.firestore.collection('categories').doc();
      batch.set(docRef, {
        ...category,
        tenantId,
        active: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    await batch.commit();
  }

  /**
   * Create default tax rates
   */
  private async createDefaultTaxRates(tenantId: string): Promise<void> {
    const swissTaxRates = [
      { name: 'Standard', rate: 7.7, default: true },
      { name: 'Reduziert', rate: 2.5, default: false },
      { name: 'Sondersatz', rate: 3.7, default: false }
    ];

    const batch = this.firestore.batch();

    for (const taxRate of swissTaxRates) {
      const docRef = this.firestore.collection('tax_rates').doc();
      batch.set(docRef, {
        ...taxRate,
        tenantId,
        active: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    await batch.commit();
  }

  /**
   * Initialize usage tracking
   */
  private async initializeUsageTracking(tenantId: string): Promise<void> {
    const subscription = await this.getSubscription(tenantId);
    
    const usage: TenantUsage = {
      tenantId,
      current: {
        orders: 0,
        storage: 0,
        api_calls: 0,
        sms_sent: 0,
        emails_sent: 0
      },
      limits: subscription!.features,
      period: {
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date())
      },
      lastUpdated: new Date()
    };

    await this.firestore
      .collection(USAGE_COLLECTION)
      .doc(tenantId)
      .set(usage);
  }

  /**
   * Setup custom domain
   */
  private async setupCustomDomain(
    tenantId: string,
    domain: string
  ): Promise<void> {
    // This would integrate with a DNS/CDN provider
    logger.info(`Setting up custom domain ${domain} for tenant ${tenantId}`);
  }

  /**
   * Send welcome email
   */
  private async sendWelcomeEmail(
    email: string,
    tenant: Tenant,
    password: string
  ): Promise<void> {
    // This would send an actual email
    logger.info(`Sending welcome email to ${email}`);
  }

  /**
   * Cleanup failed tenant
   */
  private async cleanupFailedTenant(tenantId: string): Promise<void> {
    try {
      // Delete tenant record
      await this.firestore
        .collection(TENANTS_COLLECTION)
        .doc(tenantId)
        .delete();

      // Delete subscription
      await this.firestore
        .collection(SUBSCRIPTIONS_COLLECTION)
        .doc(tenantId)
        .delete();

      // Delete users
      await this.deleteTenantUsers(tenantId);

    } catch (error) {
      logger.error(`Cleanup failed for tenant ${tenantId}:`, error);
    }
  }

  /**
   * Get subscription
   */
  private async getSubscription(tenantId: string): Promise<TenantSubscription | null> {
    const doc = await this.firestore
      .collection(SUBSCRIPTIONS_COLLECTION)
      .doc(tenantId)
      .get();

    return doc.exists ? doc.data() as TenantSubscription : null;
  }

  /**
   * Update tenant features
   */
  private async updateTenantFeatures(
    tenantId: string,
    plan: SubscriptionPlan
  ): Promise<void> {
    const features = SUBSCRIPTION_PLANS[plan].features;
    
    await this.firestore
      .collection(TENANTS_COLLECTION)
      .doc(tenantId)
      .update({
        'settings.features.analytics': features.analytics,
        'settings.features.loyalty': plan !== 'free',
        'settings.features.events': plan === 'professional' || plan === 'enterprise',
        'settings.features.ai': plan === 'enterprise',
        'settings.features.customDomain': features.customDomain,
        'settings.features.whiteLabel': features.whiteLabel
      });
  }

  /**
   * Check usage limits
   */
  private async checkUsageLimits(tenantId: string): Promise<void> {
    const usageDoc = await this.firestore
      .collection(USAGE_COLLECTION)
      .doc(tenantId)
      .get();

    if (!usageDoc.exists) return;

    const usage = usageDoc.data() as TenantUsage;
    const limits = usage.limits;

    // Check each metric
    for (const [metric, value] of Object.entries(usage.current)) {
      const limit = limits[metric as keyof typeof limits];
      
      if (limit !== -1 && value >= limit) {
        await this.handleLimitExceeded(tenantId, metric, value, limit as number);
      }
    }
  }

  /**
   * Handle limit exceeded
   */
  private async handleLimitExceeded(
    tenantId: string,
    metric: string,
    current: number,
    limit: number
  ): Promise<void> {
    logger.warn(`Tenant ${tenantId} exceeded ${metric} limit: ${current}/${limit}`);
    
    // Send notification
    // In production, this would send an email/notification
  }

  /**
   * Get usage for period
   */
  private async getUsageForPeriod(
    tenantId: string,
    period: { start: Date; end: Date }
  ): Promise<UsageReport['usage']> {
    // In production, this would aggregate from historical data
    const currentUsage = await this.firestore
      .collection(USAGE_COLLECTION)
      .doc(tenantId)
      .get();

    return currentUsage.exists 
      ? currentUsage.data()!.current 
      : { orders: 0, storage: 0, api_calls: 0, sms_sent: 0, emails_sent: 0 };
  }

  /**
   * Calculate usage costs
   */
  private calculateUsageCosts(
    usage: UsageReport['usage'],
    subscription: TenantSubscription
  ): UsageReport['costs'] {
    const limits = subscription.features;
    let overageCost = 0;

    // Calculate overage for each metric
    if (limits.orders !== -1 && usage.orders > limits.orders) {
      overageCost += (usage.orders - limits.orders) * OVERAGE_RATES.orders;
    }

    if (limits.storage !== -1 && usage.storage > limits.storage) {
      const overageGB = (usage.storage - limits.storage) / 1024;
      overageCost += overageGB * OVERAGE_RATES.storage;
    }

    if (limits.api_calls !== -1 && usage.api_calls > limits.api_calls) {
      const overageThousands = (usage.api_calls - limits.api_calls) / 1000;
      overageCost += overageThousands * OVERAGE_RATES.api_calls;
    }

    if (limits.sms !== -1 && usage.sms_sent > limits.sms) {
      overageCost += (usage.sms_sent - limits.sms) * OVERAGE_RATES.sms;
    }

    if (limits.emails !== -1 && usage.emails_sent > limits.emails) {
      overageCost += (usage.emails_sent - limits.emails) * OVERAGE_RATES.emails;
    }

    return {
      subscription: subscription.price,
      overage: Math.round(overageCost * 100) / 100,
      total: subscription.price + Math.round(overageCost * 100) / 100
    };
  }

  /**
   * Disable tenant users
   */
  private async disableTenantUsers(tenantId: string): Promise<void> {
    const users = await this.firestore
      .collection('users')
      .where('tenantId', '==', tenantId)
      .get();

    const updates = users.docs.map(doc => 
      this.auth.updateUser(doc.id, { disabled: true })
    );

    await Promise.all(updates);
  }

  /**
   * Enable tenant users
   */
  private async enableTenantUsers(tenantId: string): Promise<void> {
    const users = await this.firestore
      .collection('users')
      .where('tenantId', '==', tenantId)
      .get();

    const updates = users.docs.map(doc => 
      this.auth.updateUser(doc.id, { disabled: false })
    );

    await Promise.all(updates);
  }

  /**
   * Delete tenant users
   */
  private async deleteTenantUsers(tenantId: string): Promise<void> {
    const users = await this.firestore
      .collection('users')
      .where('tenantId', '==', tenantId)
      .get();

    const deletions = users.docs.map(doc => 
      this.auth.deleteUser(doc.id)
    );

    await Promise.all(deletions);

    // Delete user documents
    const batch = this.firestore.batch();
    users.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  /**
   * Delete tenant data
   */
  private async deleteTenantData(tenantId: string): Promise<void> {
    const collections = [
      'products',
      'orders',
      'customers',
      'categories',
      'analytics_events'
    ];

    for (const collection of collections) {
      await this.deleteCollection(collection, tenantId);
    }
  }

  /**
   * Delete collection
   */
  private async deleteCollection(
    collectionName: string,
    tenantId: string
  ): Promise<void> {
    const query = this.firestore
      .collection(collectionName)
      .where('tenantId', '==', tenantId)
      .limit(500);

    const deleteQueryBatch = async () => {
      const snapshot = await query.get();
      
      if (snapshot.size === 0) return;

      const batch = this.firestore.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      // Recurse for next batch
      await deleteQueryBatch();
    };

    await deleteQueryBatch();
  }

  /**
   * Create tenant backup
   */
  private async createTenantBackup(tenantId: string): Promise<void> {
    // This would integrate with backup service
    logger.info(`Creating backup for tenant ${tenantId}`);
  }

  /**
   * Migrate collection
   */
  private async migrateCollection(
    collection: string,
    options: MigrationOptions
  ): Promise<void> {
    const docs = await this.firestore
      .collection(collection)
      .where('tenantId', '==', options.sourceTenantId)
      .get();

    const batch = this.firestore.batch();
    
    docs.docs.forEach(doc => {
      const data = doc.data();
      data.tenantId = options.targetTenantId;
      
      const newDocRef = this.firestore.collection(collection).doc();
      batch.set(newDocRef, data);
    });

    await batch.commit();
  }

  /**
   * Migrate settings
   */
  private async migrateSettings(options: MigrationOptions): Promise<void> {
    const sourceDoc = await this.firestore
      .collection(TENANTS_COLLECTION)
      .doc(options.sourceTenantId)
      .get();

    if (sourceDoc.exists) {
      const settings = sourceDoc.data()!.settings;
      
      await this.firestore
        .collection(TENANTS_COLLECTION)
        .doc(options.targetTenantId)
        .update({ settings });
    }
  }

  /**
   * Get active tenants
   */
  private async getActiveTenants(): Promise<Tenant[]> {
    const snapshot = await this.firestore
      .collection(TENANTS_COLLECTION)
      .where('status', '==', 'active')
      .get();

    return snapshot.docs.map(doc => doc.data() as Tenant);
  }

  /**
   * Process tenant billing
   */
  private async processTenantBilling(tenantId: string): Promise<void> {
    const usageReport = await this.getUsageReport(tenantId);
    
    // Create invoice
    await this.firestore
      .collection(INVOICES_COLLECTION)
      .add({
        tenantId,
        period: usageReport.period,
        usage: usageReport.usage,
        costs: usageReport.costs,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

    // Process payment via Stripe
    // Implementation depends on payment setup
  }

  /**
   * Get trial subscriptions
   */
  private async getTrialSubscriptions(): Promise<TenantSubscription[]> {
    const snapshot = await this.firestore
      .collection(SUBSCRIPTIONS_COLLECTION)
      .where('trialEndsAt', '!=', null)
      .get();

    return snapshot.docs.map(doc => doc.data() as TenantSubscription);
  }

  /**
   * Handle trial expiration
   */
  private async handleTrialExpiration(tenantId: string): Promise<void> {
    const subscription = await this.getSubscription(tenantId);
    if (!subscription) return;

    // Convert to paid or free plan
    if (subscription.plan === 'free') {
      // Already on free plan
      return;
    }

    // Downgrade to free if no payment method
    const tenant = await this.getTenant(tenantId);
    if (!tenant?.stripeCustomerId) {
      await this.updateSubscription(tenantId, 'free');
    }
  }

  /**
   * Send trial expiration reminder
   */
  private async sendTrialExpirationReminder(
    tenantId: string,
    daysRemaining: number
  ): Promise<void> {
    // This would send an actual email
    logger.info(`Sending trial reminder to tenant ${tenantId}: ${daysRemaining} days remaining`);
  }

  /**
   * Generate secure password
   */
  private generateSecurePassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }
}