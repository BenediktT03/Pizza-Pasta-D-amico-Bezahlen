// Master Admin Tenant Management Service
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

export interface Tenant {
  id: string;
  name: string;
  logo?: string;
  email: string;
  phone: string;
  stripeAccountId?: string;
  stripeAccountStatus?: 'pending' | 'active' | 'restricted';
  trial_ends_at: Date;
  platformFeePercentage: number;
  isActive: boolean;
  whitelabelEnabled: boolean;
  customDomain?: string;
  settings: {
    language: string;
    timezone: string;
    currency: string;
    features: Record<string, boolean>;
  };
  subscription?: {
    plan: 'trial' | 'basic' | 'premium' | 'enterprise';
    status: 'active' | 'canceled' | 'past_due';
    currentPeriodEnd?: Date;
  };
  analytics?: {
    totalRevenue: number;
    totalOrders: number;
    platformFeesCollected: number;
    lastOrderAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  managerId?: string;
}

export interface TenantFilters {
  status?: 'all' | 'active' | 'inactive' | 'trial';
  subscription?: string;
  manager?: string;
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'revenue' | 'lastOrder';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

class TenantService {
  private tenantsCollection = collection(db, 'foodtrucks');

  // Get all tenants with filters
  async getTenants(filters: TenantFilters = {}): Promise<Tenant[]> {
    let q = query(this.tenantsCollection);

    // Apply filters
    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'trial') {
        q = query(q, where('trial_ends_at', '>', new Date()));
      } else {
        q = query(q, where('isActive', '==', filters.status === 'active'));
      }
    }

    if (filters.manager) {
      q = query(q, where('managerId', '==', filters.manager));
    }

    // Sort
    const sortField = filters.sortBy || 'createdAt';
    const sortDirection = filters.sortOrder || 'desc';
    q = query(q, orderBy(sortField, sortDirection));

    // Limit
    if (filters.limit) {
      q = query(q, limit(filters.limit));
    }

    const snapshot = await getDocs(q);
    const tenants: Tenant[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      tenants.push({
        id: doc.id,
        ...data,
        trial_ends_at: data.trial_ends_at?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as Tenant);
    });

    // Client-side search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return tenants.filter(t => 
        t.name.toLowerCase().includes(searchLower) ||
        t.email.toLowerCase().includes(searchLower) ||
        t.phone.includes(filters.search)
      );
    }

    return tenants;
  }

  // Get single tenant details
  async getTenant(tenantId: string): Promise<Tenant | null> {
    const docRef = doc(this.tenantsCollection, tenantId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      trial_ends_at: data.trial_ends_at?.toDate(),
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as Tenant;
  }

  // Create new tenant
  async createTenant(tenantData: Partial<Tenant>): Promise<string> {
    const newTenant = {
      ...tenantData,
      isActive: true,
      platformFeePercentage: 0, // Start with 0% during trial
      trial_ends_at: Timestamp.fromDate(
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days trial
      ),
      settings: {
        language: 'de',
        timezone: 'Europe/Zurich',
        currency: 'CHF',
        features: {},
        ...tenantData.settings
      },
      analytics: {
        totalRevenue: 0,
        totalOrders: 0,
        platformFeesCollected: 0
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: 'master_admin'
    };

    const docRef = await setDoc(doc(this.tenantsCollection), newTenant);
    return docRef.id;
  }

  // Update tenant
  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<void> {
    const docRef = doc(this.tenantsCollection, tenantId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  }

  // Activate/Deactivate tenant
  async toggleTenantStatus(tenantId: string, isActive: boolean): Promise<void> {
    await this.updateTenant(tenantId, { isActive });
  }

  // Update platform fee
  async updatePlatformFee(tenantId: string, percentage: number): Promise<void> {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Platform fee must be between 0 and 100');
    }
    await this.updateTenant(tenantId, { platformFeePercentage: percentage });
  }

  // Extend trial
  async extendTrial(tenantId: string, days: number): Promise<void> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const currentTrialEnd = tenant.trial_ends_at;
    const newTrialEnd = new Date(currentTrialEnd);
    newTrialEnd.setDate(newTrialEnd.getDate() + days);

    await this.updateTenant(tenantId, {
      trial_ends_at: newTrialEnd
    });
  }

  // Enable whitelabel
  async enableWhitelabel(tenantId: string, customDomain: string): Promise<void> {
    await this.updateTenant(tenantId, {
      whitelabelEnabled: true,
      customDomain
    });
  }

  // Get tenant analytics
  async getTenantAnalytics(tenantId: string, period: 'day' | 'week' | 'month' | 'all' = 'month') {
    const analyticsFunction = httpsCallable(functions, 'getTenantAnalytics');
    const result = await analyticsFunction({ tenantId, period });
    return result.data;
  }

  // Subscribe to tenant updates
  subscribeTenant(tenantId: string, callback: (tenant: Tenant) => void): () => void {
    const docRef = doc(this.tenantsCollection, tenantId);
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback({
          id: doc.id,
          ...data,
          trial_ends_at: data.trial_ends_at?.toDate(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as Tenant);
      }
    });
  }

  // Subscribe to all tenants
  subscribeAllTenants(callback: (tenants: Tenant[]) => void): () => void {
    return onSnapshot(this.tenantsCollection, (snapshot) => {
      const tenants: Tenant[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        tenants.push({
          id: doc.id,
          ...data,
          trial_ends_at: data.trial_ends_at?.toDate(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as Tenant);
      });
      callback(tenants);
    });
  }

  // Delete tenant (soft delete)
  async deleteTenant(tenantId: string): Promise<void> {
    await this.updateTenant(tenantId, {
      isActive: false,
      deletedAt: new Date()
    });
  }

  // Generate onboarding link
  async generateOnboardingLink(tenantId: string): Promise<string> {
    const generateLinkFunction = httpsCallable(functions, 'generateOnboardingLink');
    const result = await generateLinkFunction({ tenantId });
    return result.data as string;
  }

  // Send notification to tenant
  async sendNotification(tenantId: string, notification: {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
  }): Promise<void> {
    const sendNotificationFunction = httpsCallable(functions, 'sendTenantNotification');
    await sendNotificationFunction({ tenantId, notification });
  }

  // Impersonate tenant (for support)
  async impersonateTenant(tenantId: string): Promise<string> {
    const impersonateFunction = httpsCallable(functions, 'generateImpersonationToken');
    const result = await impersonateFunction({ tenantId });
    return result.data as string;
  }
}

export const tenantService = new TenantService();
