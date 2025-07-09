import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  DocumentReference,
  CollectionReference
} from 'firebase/firestore';
import { db } from '../database/firestore.service';
import { 
  Tenant, 
  TenantSettings, 
  TenantPlan, 
  TenantStatus,
  TenantDomain,
  TenantLocation,
  TenantStats,
  CreateTenantDto,
  UpdateTenantDto 
} from './tenant.types';
import { AppError } from '../../utils/errors';
import { generateSlug } from '../../utils/helpers';

class TenantService {
  private readonly tenantsCollection: CollectionReference;
  private readonly TENANT_CACHE_KEY = 'tenant_data';
  private tenantCache: Map<string, { data: Tenant; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.tenantsCollection = collection(db, 'tenants');
  }

  /**
   * Create a new tenant
   */
  async createTenant(data: CreateTenantDto): Promise<Tenant> {
    try {
      // Generate unique slug
      const slug = await this.generateUniqueSlug(data.name);
      
      // Create tenant document
      const tenantRef = doc(this.tenantsCollection);
      const newTenant: Tenant = {
        id: tenantRef.id,
        slug,
        name: data.name,
        description: data.description || '',
        logo: data.logo || null,
        
        // Owner information
        ownerId: data.ownerId,
        ownerEmail: data.ownerEmail,
        
        // Contact information
        contact: {
          email: data.contact.email,
          phone: data.contact.phone,
          address: data.contact.address,
          city: data.contact.city,
          postalCode: data.contact.postalCode,
          canton: data.contact.canton,
          country: data.contact.country || 'CH',
        },
        
        // Plan and billing
        plan: data.plan || TenantPlan.STARTER,
        status: TenantStatus.PENDING_SETUP,
        
        // Settings with Swiss defaults
        settings: {
          language: data.settings?.language || 'de',
          languages: data.settings?.languages || ['de', 'fr', 'it', 'en'],
          currency: 'CHF',
          timezone: 'Europe/Zurich',
          dateFormat: 'DD.MM.YYYY',
          timeFormat: '24h',
          
          // Business hours
          businessHours: data.settings?.businessHours || {
            monday: { open: '09:00', close: '22:00', closed: false },
            tuesday: { open: '09:00', close: '22:00', closed: false },
            wednesday: { open: '09:00', close: '22:00', closed: false },
            thursday: { open: '09:00', close: '22:00', closed: false },
            friday: { open: '09:00', close: '23:00', closed: false },
            saturday: { open: '10:00', close: '23:00', closed: false },
            sunday: { open: '10:00', close: '22:00', closed: false },
          },
          
          // Features
          features: {
            voiceOrdering: data.plan !== TenantPlan.STARTER,
            multiLocation: data.plan === TenantPlan.ENTERPRISE,
            inventory: data.plan !== TenantPlan.STARTER,
            analytics: true,
            kitchenDisplay: data.plan !== TenantPlan.STARTER,
            staffManagement: data.plan !== TenantPlan.STARTER,
            promotions: true,
            loyaltyProgram: data.plan === TenantPlan.ENTERPRISE,
            apiAccess: data.plan === TenantPlan.ENTERPRISE,
          },
          
          // Payment methods (Swiss defaults)
          paymentMethods: {
            cash: true,
            card: true,
            twint: true,
            invoice: data.plan !== TenantPlan.STARTER,
            cryptocurrency: false,
          },
          
          // Order settings
          orderSettings: {
            minimumOrder: 0,
            deliveryFee: 0,
            preparationTime: 15,
            autoAcceptOrders: false,
            requirePhoneNumber: true,
            allowPreorders: true,
            maxPreorderDays: 7,
          },
          
          // Notification settings
          notifications: {
            email: true,
            sms: false,
            push: true,
            orderAlerts: true,
            lowStockAlerts: true,
            dailyReports: true,
          },
          
          // Tax settings (Swiss VAT)
          tax: {
            enabled: true,
            rate: 7.7, // Swiss standard VAT
            reducedRate: 2.5, // Swiss reduced VAT
            includedInPrice: true,
            taxNumber: data.settings?.tax?.taxNumber || '',
          },
          
          // Custom branding
          branding: {
            primaryColor: data.settings?.branding?.primaryColor || '#7c3aed',
            secondaryColor: data.settings?.branding?.secondaryColor || '#2563eb',
            font: data.settings?.branding?.font || 'Inter',
          },
        },
        
        // Domains
        domains: [{
          domain: `${slug}.eatech.ch`,
          isPrimary: true,
          isVerified: true,
          sslEnabled: true,
        }],
        
        // Locations
        locations: data.locations || [{
          id: generateId(),
          name: 'Hauptstandort',
          isPrimary: true,
          address: data.contact.address,
          city: data.contact.city,
          postalCode: data.contact.postalCode,
          canton: data.contact.canton,
          country: 'CH',
          phone: data.contact.phone,
          email: data.contact.email,
          coordinates: null,
          settings: {
            businessHours: data.settings?.businessHours,
            capacity: null,
            deliveryRadius: null,
            pickupEnabled: true,
            deliveryEnabled: false,
            dineInEnabled: true,
          },
        }],
        
        // Stats (initialize with zeros)
        stats: {
          totalOrders: 0,
          totalRevenue: 0,
          totalCustomers: 0,
          totalProducts: 0,
          averageOrderValue: 0,
          monthlyOrders: 0,
          monthlyRevenue: 0,
          lastOrderAt: null,
        },
        
        // Subscription info
        subscription: {
          plan: data.plan || TenantPlan.STARTER,
          status: 'trialing',
          trialEndsAt: Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)), // 14 days trial
          currentPeriodStart: Timestamp.now(),
          currentPeriodEnd: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
          cancelAtPeriodEnd: false,
        },
        
        // Metadata
        metadata: data.metadata || {},
        tags: data.tags || [],
        
        // Timestamps
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
      };
      
      await setDoc(tenantRef, newTenant);
      
      // Clear cache
      this.clearCache();
      
      return { ...newTenant, id: tenantRef.id };
    } catch (error) {
      console.error('Error creating tenant:', error);
      throw new AppError('Failed to create tenant', 'TENANT_CREATE_ERROR', 500);
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(tenantId: string): Promise<Tenant | null> {
    try {
      // Check cache first
      const cached = this.getFromCache(tenantId);
      if (cached) return cached;
      
      const tenantDoc = await getDoc(doc(this.tenantsCollection, tenantId));
      
      if (!tenantDoc.exists()) {
        return null;
      }
      
      const tenant = { id: tenantDoc.id, ...tenantDoc.data() } as Tenant;
      
      // Cache the result
      this.setCache(tenantId, tenant);
      
      return tenant;
    } catch (error) {
      console.error('Error getting tenant:', error);
      throw new AppError('Failed to get tenant', 'TENANT_GET_ERROR', 500);
    }
  }

  /**
   * Get tenant by slug
   */
  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    try {
      const q = query(
        this.tenantsCollection,
        where('slug', '==', slug),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      const tenant = { id: doc.id, ...doc.data() } as Tenant;
      
      // Cache the result
      this.setCache(tenant.id, tenant);
      
      return tenant;
    } catch (error) {
      console.error('Error getting tenant by slug:', error);
      throw new AppError('Failed to get tenant by slug', 'TENANT_GET_ERROR', 500);
    }
  }

  /**
   * Get tenant by domain
   */
  async getTenantByDomain(domain: string): Promise<Tenant | null> {
    try {
      const q = query(
        this.tenantsCollection,
        where('domains', 'array-contains', { domain, isVerified: true })
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      const tenant = { id: doc.id, ...doc.data() } as Tenant;
      
      // Cache the result
      this.setCache(tenant.id, tenant);
      
      return tenant;
    } catch (error) {
      console.error('Error getting tenant by domain:', error);
      throw new AppError('Failed to get tenant by domain', 'TENANT_GET_ERROR', 500);
    }
  }

  /**
   * Update tenant
   */
  async updateTenant(tenantId: string, data: UpdateTenantDto): Promise<Tenant> {
    try {
      const tenantRef = doc(this.tenantsCollection, tenantId);
      
      // Check if tenant exists
      const existing = await this.getTenantById(tenantId);
      if (!existing) {
        throw new AppError('Tenant not found', 'TENANT_NOT_FOUND', 404);
      }
      
      // Prepare update data
      const updateData = {
        ...data,
        updatedAt: serverTimestamp(),
      };
      
      // Update the document
      await updateDoc(tenantRef, updateData);
      
      // Clear cache
      this.clearCache(tenantId);
      
      // Get and return updated tenant
      return await this.getTenantById(tenantId) as Tenant;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Error updating tenant:', error);
      throw new AppError('Failed to update tenant', 'TENANT_UPDATE_ERROR', 500);
    }
  }

  /**
   * Update tenant settings
   */
  async updateTenantSettings(
    tenantId: string, 
    settings: Partial<TenantSettings>
  ): Promise<Tenant> {
    try {
      const existing = await this.getTenantById(tenantId);
      if (!existing) {
        throw new AppError('Tenant not found', 'TENANT_NOT_FOUND', 404);
      }
      
      const mergedSettings = {
        ...existing.settings,
        ...settings,
      };
      
      return await this.updateTenant(tenantId, { settings: mergedSettings });
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Error updating tenant settings:', error);
      throw new AppError('Failed to update tenant settings', 'TENANT_UPDATE_ERROR', 500);
    }
  }

  /**
   * Update tenant plan
   */
  async updateTenantPlan(tenantId: string, plan: TenantPlan): Promise<Tenant> {
    try {
      const existing = await this.getTenantById(tenantId);
      if (!existing) {
        throw new AppError('Tenant not found', 'TENANT_NOT_FOUND', 404);
      }
      
      // Update features based on plan
      const features = this.getFeaturesForPlan(plan);
      
      return await this.updateTenant(tenantId, {
        plan,
        'settings.features': features,
        'subscription.plan': plan,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Error updating tenant plan:', error);
      throw new AppError('Failed to update tenant plan', 'TENANT_UPDATE_ERROR', 500);
    }
  }

  /**
   * Add domain to tenant
   */
  async addDomain(tenantId: string, domain: string): Promise<Tenant> {
    try {
      const existing = await this.getTenantById(tenantId);
      if (!existing) {
        throw new AppError('Tenant not found', 'TENANT_NOT_FOUND', 404);
      }
      
      // Check if domain already exists
      if (existing.domains.some(d => d.domain === domain)) {
        throw new AppError('Domain already exists', 'DOMAIN_EXISTS', 400);
      }
      
      // Add new domain
      const newDomain: TenantDomain = {
        domain,
        isPrimary: false,
        isVerified: false,
        sslEnabled: false,
      };
      
      const domains = [...existing.domains, newDomain];
      
      return await this.updateTenant(tenantId, { domains });
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Error adding domain:', error);
      throw new AppError('Failed to add domain', 'DOMAIN_ADD_ERROR', 500);
    }
  }

  /**
   * Get all tenants (admin only)
   */
  async getAllTenants(filters?: {
    status?: TenantStatus;
    plan?: TenantPlan;
    limit?: number;
    offset?: number;
  }): Promise<{ tenants: Tenant[]; total: number }> {
    try {
      let q = query(this.tenantsCollection);
      
      // Apply filters
      if (filters?.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters?.plan) {
        q = query(q, where('plan', '==', filters.plan));
      }
      
      // Order by creation date
      q = query(q, orderBy('createdAt', 'desc'));
      
      // Apply pagination
      if (filters?.limit) {
        q = query(q, limit(filters.limit));
      }
      
      const snapshot = await getDocs(q);
      const tenants = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Tenant[];
      
      // Get total count (simplified, in production use a counter)
      const totalSnapshot = await getDocs(this.tenantsCollection);
      const total = totalSnapshot.size;
      
      return { tenants, total };
    } catch (error) {
      console.error('Error getting all tenants:', error);
      throw new AppError('Failed to get tenants', 'TENANTS_GET_ERROR', 500);
    }
  }

  /**
   * Delete tenant (soft delete)
   */
  async deleteTenant(tenantId: string): Promise<void> {
    try {
      await this.updateTenant(tenantId, {
        status: TenantStatus.SUSPENDED,
        'subscription.cancelAtPeriodEnd': true,
      });
      
      // Clear cache
      this.clearCache(tenantId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Error deleting tenant:', error);
      throw new AppError('Failed to delete tenant', 'TENANT_DELETE_ERROR', 500);
    }
  }

  /**
   * Generate unique slug
   */
  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    let counter = 1;
    
    while (await this.getTenantBySlug(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    return slug;
  }

  /**
   * Get features for plan
   */
  private getFeaturesForPlan(plan: TenantPlan) {
    const baseFeatures = {
      voiceOrdering: false,
      multiLocation: false,
      inventory: false,
      analytics: true,
      kitchenDisplay: false,
      staffManagement: false,
      promotions: true,
      loyaltyProgram: false,
      apiAccess: false,
    };
    
    switch (plan) {
      case TenantPlan.STARTER:
        return {
          ...baseFeatures,
          voiceOrdering: false,
          inventory: false,
          kitchenDisplay: false,
          staffManagement: false,
        };
      
      case TenantPlan.PROFESSIONAL:
        return {
          ...baseFeatures,
          voiceOrdering: true,
          inventory: true,
          kitchenDisplay: true,
          staffManagement: true,
          multiLocation: true, // up to 3
        };
      
      case TenantPlan.ENTERPRISE:
        return {
          voiceOrdering: true,
          multiLocation: true,
          inventory: true,
          analytics: true,
          kitchenDisplay: true,
          staffManagement: true,
          promotions: true,
          loyaltyProgram: true,
          apiAccess: true,
        };
      
      default:
        return baseFeatures;
    }
  }

  /**
   * Cache management
   */
  private getFromCache(tenantId: string): Tenant | null {
    const cached = this.tenantCache.get(tenantId);
    if (!cached) return null;
    
    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.tenantCache.delete(tenantId);
      return null;
    }
    
    return cached.data;
  }

  private setCache(tenantId: string, data: Tenant): void {
    this.tenantCache.set(tenantId, {
      data,
      timestamp: Date.now(),
    });
  }

  private clearCache(tenantId?: string): void {
    if (tenantId) {
      this.tenantCache.delete(tenantId);
    } else {
      this.tenantCache.clear();
    }
  }
}

// Helper function to generate IDs
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Export singleton instance
export const tenantService = new TenantService();
