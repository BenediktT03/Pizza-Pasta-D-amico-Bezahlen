// Billing and Payment Service for Master Admin
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc,
  query, 
  where, 
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

export interface BillingOverview {
  totalRevenue: number;
  totalPlatformFees: number;
  totalPayouts: number;
  pendingPayouts: number;
  totalTransactions: number;
  averageTransactionValue: number;
  revenueByMonth: MonthlyRevenue[];
  feesByTenant: TenantFees[];
  payoutSchedule: PayoutSchedule[];
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  platformFees: number;
  transactions: number;
}

export interface TenantFees {
  tenantId: string;
  tenantName: string;
  totalFees: number;
  lastPayment: Date;
  feePercentage: number;
  status: 'paid' | 'pending' | 'overdue';
}

export interface PayoutSchedule {
  id: string;
  tenantId: string;
  tenantName: string;
  amount: number;
  scheduledDate: Date;
  status: 'scheduled' | 'processing' | 'completed' | 'failed';
  stripePayoutId?: string;
}

export interface Transaction {
  id: string;
  tenantId: string;
  orderId: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  paymentMethod: string;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded';
  createdAt: Date;
  stripePaymentIntentId: string;
  metadata?: Record<string, any>;
}

export interface RefundRequest {
  orderId: string;
  amount: number;
  reason: string;
  requestedBy: 'customer' | 'tenant' | 'admin';
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  feePercentage: number;
  maxOrders?: number;
  maxRevenue?: number;
}

class BillingService {
  // Get comprehensive billing overview
  async getBillingOverview(period: 'month' | 'quarter' | 'year' = 'month'): Promise<BillingOverview> {
    const billingFunction = httpsCallable(functions, 'getBillingOverview');
    const result = await billingFunction({ period });
    return result.data as BillingOverview;
  }

  // Get transactions with filters
  async getTransactions(filters: {
    tenantId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: string;
    limit?: number;
  }): Promise<Transaction[]> {
    let q = query(collection(db, 'transactions'));

    if (filters.tenantId) {
      q = query(q, where('tenantId', '==', filters.tenantId));
    }

    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }

    if (filters.startDate) {
      q = query(q, where('createdAt', '>=', Timestamp.fromDate(filters.startDate)));
    }

    if (filters.endDate) {
      q = query(q, where('createdAt', '<=', Timestamp.fromDate(filters.endDate)));
    }

    q = query(q, orderBy('createdAt', 'desc'));

    if (filters.limit) {
      q = query(q, limit(filters.limit));
    }

    const snapshot = await getDocs(q);
    const transactions: Transaction[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      transactions.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate()
      } as Transaction);
    });

    return transactions;
  }

  // Process refund
  async processRefund(refundRequest: RefundRequest): Promise<{
    success: boolean;
    refundId?: string;
    error?: string;
  }> {
    const refundFunction = httpsCallable(functions, 'processRefund');
    const result = await refundFunction(refundRequest);
    return result.data as any;
  }

  // Update tenant fee percentage
  async updateTenantFeePercentage(tenantId: string, newPercentage: number): Promise<void> {
    if (newPercentage < 0 || newPercentage > 100) {
      throw new Error('Fee percentage must be between 0 and 100');
    }

    const updateFeeFunction = httpsCallable(functions, 'updateTenantFeePercentage');
    await updateFeeFunction({ tenantId, newPercentage });
  }

  // Generate billing report
  async generateBillingReport(params: {
    tenantId?: string;
    startDate: Date;
    endDate: Date;
    format: 'pdf' | 'csv' | 'excel';
  }): Promise<string> {
    const reportFunction = httpsCallable(functions, 'generateBillingReport');
    const result = await reportFunction({
      ...params,
      startDate: params.startDate.toISOString(),
      endDate: params.endDate.toISOString()
    });
    return result.data as string; // Returns download URL
  }

  // Get payout history
  async getPayoutHistory(tenantId?: string, limit: number = 50): Promise<{
    id: string;
    tenantId: string;
    amount: number;
    currency: string;
    status: string;
    arrivalDate: Date;
    created: Date;
    stripePayoutId: string;
  }[]> {
    const payoutFunction = httpsCallable(functions, 'getPayoutHistory');
    const result = await payoutFunction({ tenantId, limit });
    return result.data as any;
  }

  // Manual payout trigger
  async triggerManualPayout(tenantId: string): Promise<{
    success: boolean;
    payoutId?: string;
    error?: string;
  }> {
    const payoutFunction = httpsCallable(functions, 'triggerManualPayout');
    const result = await payoutFunction({ tenantId });
    return result.data as any;
  }

  // Get subscription plans
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const plansCollection = collection(db, 'subscription_plans');
    const snapshot = await getDocs(plansCollection);
    
    const plans: SubscriptionPlan[] = [];
    snapshot.forEach((doc) => {
      plans.push({ id: doc.id, ...doc.data() } as SubscriptionPlan);
    });
    
    return plans.sort((a, b) => a.price - b.price);
  }

  // Update subscription plan
  async updateTenantSubscription(tenantId: string, planId: string): Promise<void> {
    const updateSubFunction = httpsCallable(functions, 'updateTenantSubscription');
    await updateSubFunction({ tenantId, planId });
  }

  // Get revenue projections
  async getRevenueProjections(): Promise<{
    currentMonth: number;
    nextMonth: number;
    nextQuarter: number;
    nextYear: number;
    growthRate: number;
    projectedTenants: number;
  }> {
    const projectionFunction = httpsCallable(functions, 'getRevenueProjections');
    const result = await projectionFunction();
    return result.data as any;
  }

  // Dispute management
  async getDisputes(): Promise<{
    id: string;
    tenantId: string;
    amount: number;
    reason: string;
    status: 'pending' | 'under_review' | 'resolved' | 'lost';
    created: Date;
    stripeDisputeId: string;
  }[]> {
    const disputeFunction = httpsCallable(functions, 'getDisputes');
    const result = await disputeFunction();
    return result.data as any;
  }

  // Tax reporting
  async generateTaxReport(year: number, quarter?: number): Promise<{
    totalRevenue: number;
    totalVAT: {
      takeaway: number; // 2.5%
      dineIn: number;   // 7.7%
    };
    totalPlatformFees: number;
    byTenant: {
      tenantId: string;
      tenantName: string;
      revenue: number;
      vat: number;
      platformFees: number;
    }[];
    downloadUrl: string;
  }> {
    const taxFunction = httpsCallable(functions, 'generateTaxReport');
    const result = await taxFunction({ year, quarter });
    return result.data as any;
  }

  // Create custom discount
  async createDiscount(discount: {
    code: string;
    percentage: number;
    maxUses?: number;
    expiresAt?: Date;
    tenantIds?: string[]; // Specific tenants or all
  }): Promise<string> {
    const discountFunction = httpsCallable(functions, 'createDiscount');
    const result = await discountFunction({
      ...discount,
      expiresAt: discount.expiresAt?.toISOString()
    });
    return result.data as string;
  }

  // Platform wallet balance (Benedikt's account)
  async getPlatformBalance(): Promise<{
    available: number;
    pending: number;
    currency: string;
    lastUpdated: Date;
  }> {
    const balanceFunction = httpsCallable(functions, 'getPlatformBalance');
    const result = await balanceFunction();
    return result.data as any;
  }
}

export const billingService = new BillingService();
