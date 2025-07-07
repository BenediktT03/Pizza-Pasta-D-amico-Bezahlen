/**
 * EATECH - Loyalty Service
 * Version: 1.0.0
 * Description: Kundenbindungsprogramm mit Punktesystem und Rewards
 * Author: EATECH Development Team
 * Created: 2025-01-09
 * File Path: /functions/src/services/LoyaltyService.ts
 * 
 * Features:
 * - Points accumulation
 * - Tier management
 * - Rewards catalog
 * - Stamp cards
 * - Referral program
 * - Birthday rewards
 * - Gamification
 * - Analytics
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { 
  LoyaltyAccount,
  LoyaltyTransaction,
  LoyaltyTier,
  Reward,
  StampCard,
  ReferralProgram,
  LoyaltyEvent
} from '../types/loyalty.types';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { 
  addDays, 
  addMonths, 
  isAfter, 
  isBefore,
  differenceInDays,
  startOfDay,
  endOfDay,
  format
} from 'date-fns';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface PointsCalculation {
  basePoints: number;
  bonusPoints: number;
  multiplier: number;
  totalPoints: number;
  breakdown: Array<{
    source: string;
    points: number;
  }>;
}

interface TierProgress {
  currentTier: LoyaltyTier;
  nextTier?: LoyaltyTier;
  currentPoints: number;
  pointsToNext?: number;
  progressPercent: number;
  benefits: string[];
}

interface RewardRedemption {
  rewardId: string;
  accountId: string;
  pointsCost: number;
  status: 'pending' | 'approved' | 'redeemed' | 'expired';
  code?: string;
  expiresAt?: string;
  redeemedAt?: string;
}

interface LoyaltyAnalytics {
  totalMembers: number;
  activeMembers: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  averagePointsPerMember: number;
  tierDistribution: Record<string, number>;
  popularRewards: Array<{
    rewardId: string;
    name: string;
    redemptions: number;
  }>;
  engagement: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

interface CampaignConfig {
  id: string;
  name: string;
  type: 'bonus' | 'multiplier' | 'double' | 'special';
  startDate: Date;
  endDate: Date;
  rules: {
    multiplier?: number;
    bonusPoints?: number;
    conditions?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
  };
  active: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ACCOUNTS_COLLECTION = 'loyalty_accounts';
const TRANSACTIONS_COLLECTION = 'loyalty_transactions';
const REWARDS_COLLECTION = 'loyalty_rewards';
const REDEMPTIONS_COLLECTION = 'loyalty_redemptions';
const STAMP_CARDS_COLLECTION = 'loyalty_stamp_cards';
const REFERRALS_COLLECTION = 'loyalty_referrals';
const CAMPAIGNS_COLLECTION = 'loyalty_campaigns';

const DEFAULT_POINTS_RATE = 0.1; // 10% of order value as points
const REFERRAL_BONUS_POINTS = 500;
const BIRTHDAY_BONUS_POINTS = 1000;
const WELCOME_BONUS_POINTS = 100;

const LOYALTY_TIERS: LoyaltyTier[] = [
  {
    id: 'bronze',
    name: 'Bronze',
    requiredPoints: 0,
    multiplier: 1.0,
    benefits: [
      'Punkte sammeln',
      'Zugang zu Basis-Rewards',
      'Geburtstags-Bonus'
    ],
    color: '#CD7F32'
  },
  {
    id: 'silver',
    name: 'Silber',
    requiredPoints: 2000,
    multiplier: 1.2,
    benefits: [
      'Alle Bronze-Vorteile',
      '20% mehr Punkte',
      'Exklusive Angebote',
      'Früher Zugang zu neuen Produkten'
    ],
    color: '#C0C0C0'
  },
  {
    id: 'gold',
    name: 'Gold',
    requiredPoints: 5000,
    multiplier: 1.5,
    benefits: [
      'Alle Silber-Vorteile',
      '50% mehr Punkte',
      'VIP-Support',
      'Kostenlose Extras',
      'Spezielle Events'
    ],
    color: '#FFD700'
  },
  {
    id: 'platinum',
    name: 'Platin',
    requiredPoints: 10000,
    multiplier: 2.0,
    benefits: [
      'Alle Gold-Vorteile',
      'Doppelte Punkte',
      'Persönlicher Account Manager',
      'Exklusive Verkostungen',
      'Lifetime-Status'
    ],
    color: '#E5E4E2'
  }
];

const TRANSACTION_TYPES = {
  PURCHASE: 'purchase',
  BONUS: 'bonus',
  REFERRAL: 'referral',
  BIRTHDAY: 'birthday',
  WELCOME: 'welcome',
  REDEMPTION: 'redemption',
  ADJUSTMENT: 'adjustment',
  EXPIRED: 'expired'
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export default class LoyaltyService {
  private db: admin.database.Database;
  private firestore: admin.firestore.Firestore;

  constructor() {
    this.db = admin.database();
    this.firestore = admin.firestore();
  }

  /**
   * Create loyalty account
   */
  async createAccount(
    tenantId: string,
    customerId: string,
    customerData: {
      name: string;
      email: string;
      phone?: string;
      birthday?: string;
    }
  ): Promise<LoyaltyAccount> {
    try {
      const accountId = uuidv4();
      const now = new Date();

      const account: LoyaltyAccount = {
        id: accountId,
        tenantId,
        customerId,
        points: WELCOME_BONUS_POINTS,
        lifetimePoints: WELCOME_BONUS_POINTS,
        tier: LOYALTY_TIERS[0].id,
        status: 'active',
        memberSince: now.toISOString(),
        lastActivity: now.toISOString(),
        profile: {
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          birthday: customerData.birthday,
          preferences: {
            emailNotifications: true,
            smsNotifications: true,
            pushNotifications: true
          }
        },
        stats: {
          totalTransactions: 0,
          totalSpent: 0,
          totalPointsEarned: WELCOME_BONUS_POINTS,
          totalPointsRedeemed: 0,
          referralCount: 0
        }
      };

      // Save account
      await this.firestore
        .collection(ACCOUNTS_COLLECTION)
        .doc(accountId)
        .set(account);

      // Record welcome bonus transaction
      await this.recordTransaction({
        accountId,
        tenantId,
        type: TRANSACTION_TYPES.WELCOME,
        points: WELCOME_BONUS_POINTS,
        description: 'Willkommensbonus',
        metadata: {
          source: 'account_creation'
        }
      });

      // Send welcome notification
      await this.sendWelcomeNotification(account);

      logger.info(`Loyalty account created: ${accountId}`);
      return account;
    } catch (error) {
      logger.error('Error creating loyalty account:', error);
      throw error;
    }
  }

  /**
   * Earn points from purchase
   */
  async earnPoints(
    tenantId: string,
    customerId: string,
    orderData: {
      orderId: string;
      total: number;
      items: Array<{
        productId: string;
        quantity: number;
        price: number;
      }>;
    }
  ): Promise<PointsCalculation> {
    try {
      // Get account
      const account = await this.getAccountByCustomerId(tenantId, customerId);
      if (!account) {
        throw new Error('Loyalty account not found');
      }

      // Calculate points
      const calculation = await this.calculatePoints(account, orderData);

      // Update account
      await this.updateAccountPoints(account.id, calculation.totalPoints);

      // Record transaction
      await this.recordTransaction({
        accountId: account.id,
        tenantId,
        type: TRANSACTION_TYPES.PURCHASE,
        points: calculation.totalPoints,
        description: `Bestellung #${orderData.orderId}`,
        metadata: {
          orderId: orderData.orderId,
          orderTotal: orderData.total,
          breakdown: calculation.breakdown
        }
      });

      // Check for tier upgrade
      await this.checkTierUpgrade(account.id);

      // Process stamp cards
      await this.processStampCards(account.id, orderData);

      // Check for achievements
      await this.checkAchievements(account.id);

      return calculation;
    } catch (error) {
      logger.error('Error earning points:', error);
      throw error;
    }
  }

  /**
   * Redeem reward
   */
  async redeemReward(
    accountId: string,
    rewardId: string
  ): Promise<RewardRedemption> {
    try {
      // Get account and reward
      const [account, reward] = await Promise.all([
        this.getAccount(accountId),
        this.getReward(rewardId)
      ]);

      if (!account) {
        throw new Error('Account not found');
      }

      if (!reward || !reward.available) {
        throw new Error('Reward not available');
      }

      // Check if user has enough points
      if (account.points < reward.pointsCost) {
        throw new Error('Insufficient points');
      }

      // Check tier requirement
      if (reward.tierRequired && !this.isTierEligible(account.tier, reward.tierRequired)) {
        throw new Error('Tier requirement not met');
      }

      // Create redemption
      const redemptionId = uuidv4();
      const redemption: RewardRedemption = {
        rewardId,
        accountId,
        pointsCost: reward.pointsCost,
        status: 'approved',
        code: this.generateRedemptionCode(),
        expiresAt: addDays(new Date(), reward.validityDays || 30).toISOString()
      };

      // Save redemption
      await this.firestore
        .collection(REDEMPTIONS_COLLECTION)
        .doc(redemptionId)
        .set({
          ...redemption,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

      // Deduct points
      await this.updateAccountPoints(accountId, -reward.pointsCost);

      // Record transaction
      await this.recordTransaction({
        accountId,
        tenantId: account.tenantId,
        type: TRANSACTION_TYPES.REDEMPTION,
        points: -reward.pointsCost,
        description: `Reward: ${reward.name}`,
        metadata: {
          rewardId,
          redemptionId,
          rewardName: reward.name
        }
      });

      // Update reward stock if applicable
      if (reward.stock !== undefined) {
        await this.updateRewardStock(rewardId, -1);
      }

      // Send confirmation
      await this.sendRedemptionConfirmation(account, reward, redemption);

      return redemption;
    } catch (error) {
      logger.error('Error redeeming reward:', error);
      throw error;
    }
  }

  /**
   * Process referral
   */
  async processReferral(
    referrerId: string,
    referredCustomerId: string,
    tenantId: string
  ): Promise<void> {
    try {
      // Check if referral already exists
      const existingReferral = await this.firestore
        .collection(REFERRALS_COLLECTION)
        .where('referrerId', '==', referrerId)
        .where('referredId', '==', referredCustomerId)
        .limit(1)
        .get();

      if (!existingReferral.empty) {
        logger.warn('Referral already processed');
        return;
      }

      // Create referral record
      await this.firestore
        .collection(REFERRALS_COLLECTION)
        .add({
          referrerId,
          referredId: referredCustomerId,
          tenantId,
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

      // Award points to referrer (after first purchase)
      const referrerAccount = await this.getAccount(referrerId);
      if (referrerAccount) {
        await this.awardBonusPoints(
          referrerAccount.id,
          REFERRAL_BONUS_POINTS,
          'Empfehlungsbonus',
          { referredId: referredCustomerId }
        );

        // Update referral count
        await this.firestore
          .collection(ACCOUNTS_COLLECTION)
          .doc(referrerAccount.id)
          .update({
            'stats.referralCount': admin.firestore.FieldValue.increment(1)
          });
      }

    } catch (error) {
      logger.error('Error processing referral:', error);
      throw error;
    }
  }

  /**
   * Get stamp cards
   */
  async getStampCards(accountId: string): Promise<StampCard[]> {
    try {
      const snapshot = await this.firestore
        .collection(STAMP_CARDS_COLLECTION)
        .where('accountId', '==', accountId)
        .where('status', '==', 'active')
        .get();

      return snapshot.docs.map(doc => doc.data() as StampCard);
    } catch (error) {
      logger.error('Error getting stamp cards:', error);
      throw error;
    }
  }

  /**
   * Get tier progress
   */
  async getTierProgress(accountId: string): Promise<TierProgress> {
    try {
      const account = await this.getAccount(accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      const currentTier = LOYALTY_TIERS.find(t => t.id === account.tier) || LOYALTY_TIERS[0];
      const currentTierIndex = LOYALTY_TIERS.findIndex(t => t.id === account.tier);
      const nextTier = LOYALTY_TIERS[currentTierIndex + 1];

      const progress: TierProgress = {
        currentTier,
        nextTier,
        currentPoints: account.lifetimePoints,
        benefits: currentTier.benefits
      };

      if (nextTier) {
        progress.pointsToNext = nextTier.requiredPoints - account.lifetimePoints;
        progress.progressPercent = 
          ((account.lifetimePoints - currentTier.requiredPoints) / 
           (nextTier.requiredPoints - currentTier.requiredPoints)) * 100;
      } else {
        progress.progressPercent = 100;
      }

      return progress;
    } catch (error) {
      logger.error('Error getting tier progress:', error);
      throw error;
    }
  }

  /**
   * Get available rewards
   */
  async getAvailableRewards(
    tenantId: string,
    accountId: string
  ): Promise<Reward[]> {
    try {
      const account = await this.getAccount(accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      const snapshot = await this.firestore
        .collection(REWARDS_COLLECTION)
        .where('tenantId', '==', tenantId)
        .where('available', '==', true)
        .get();

      const rewards = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Reward))
        .filter(reward => {
          // Check tier requirement
          if (reward.tierRequired && !this.isTierEligible(account.tier, reward.tierRequired)) {
            return false;
          }

          // Check if user has enough points
          if (account.points < reward.pointsCost) {
            return false;
          }

          // Check stock
          if (reward.stock !== undefined && reward.stock <= 0) {
            return false;
          }

          // Check validity period
          if (reward.validFrom && isBefore(new Date(), new Date(reward.validFrom))) {
            return false;
          }

          if (reward.validUntil && isAfter(new Date(), new Date(reward.validUntil))) {
            return false;
          }

          return true;
        });

      return rewards;
    } catch (error) {
      logger.error('Error getting available rewards:', error);
      throw error;
    }
  }

  /**
   * Get loyalty analytics
   */
  async getAnalytics(tenantId: string): Promise<LoyaltyAnalytics> {
    try {
      // Get all accounts
      const accountsSnapshot = await this.firestore
        .collection(ACCOUNTS_COLLECTION)
        .where('tenantId', '==', tenantId)
        .get();

      const accounts = accountsSnapshot.docs.map(doc => doc.data() as LoyaltyAccount);

      // Calculate metrics
      const totalMembers = accounts.length;
      const activeMembers = accounts.filter(a => 
        differenceInDays(new Date(), new Date(a.lastActivity)) <= 30
      ).length;

      const totalPointsIssued = accounts.reduce((sum, a) => sum + a.lifetimePoints, 0);
      const totalPointsRedeemed = accounts.reduce((sum, a) => sum + a.stats.totalPointsRedeemed, 0);
      const averagePointsPerMember = totalMembers > 0 ? totalPointsIssued / totalMembers : 0;

      // Tier distribution
      const tierDistribution: Record<string, number> = {};
      LOYALTY_TIERS.forEach(tier => {
        tierDistribution[tier.id] = accounts.filter(a => a.tier === tier.id).length;
      });

      // Get popular rewards
      const redemptionsSnapshot = await this.firestore
        .collection(REDEMPTIONS_COLLECTION)
        .where('accountId', 'in', accounts.map(a => a.id))
        .get();

      const rewardCounts = new Map<string, number>();
      redemptionsSnapshot.docs.forEach(doc => {
        const redemption = doc.data();
        const count = rewardCounts.get(redemption.rewardId) || 0;
        rewardCounts.set(redemption.rewardId, count + 1);
      });

      const popularRewards = await this.getPopularRewardsDetails(rewardCounts);

      // Calculate engagement
      const now = new Date();
      const dayAgo = subDays(now, 1);
      const weekAgo = subDays(now, 7);
      const monthAgo = subDays(now, 30);

      const engagement = {
        daily: accounts.filter(a => isAfter(new Date(a.lastActivity), dayAgo)).length,
        weekly: accounts.filter(a => isAfter(new Date(a.lastActivity), weekAgo)).length,
        monthly: accounts.filter(a => isAfter(new Date(a.lastActivity), monthAgo)).length
      };

      return {
        totalMembers,
        activeMembers,
        totalPointsIssued,
        totalPointsRedeemed,
        averagePointsPerMember,
        tierDistribution,
        popularRewards: popularRewards.slice(0, 10),
        engagement
      };
    } catch (error) {
      logger.error('Error getting loyalty analytics:', error);
      throw error;
    }
  }

  /**
   * Process birthday bonus
   */
  async processBirthdayBonuses(): Promise<void> {
    try {
      const today = format(new Date(), 'MM-dd');
      
      // Find accounts with birthday today
      const accountsSnapshot = await this.firestore
        .collection(ACCOUNTS_COLLECTION)
        .where('status', '==', 'active')
        .get();

      const birthdayAccounts = accountsSnapshot.docs
        .map(doc => doc.data() as LoyaltyAccount)
        .filter(account => {
          if (!account.profile.birthday) return false;
          const accountBirthday = format(new Date(account.profile.birthday), 'MM-dd');
          return accountBirthday === today;
        });

      // Process each birthday
      for (const account of birthdayAccounts) {
        // Check if already processed this year
        const currentYear = new Date().getFullYear();
        const lastBirthdayBonus = await this.getLastBirthdayBonus(account.id);
        
        if (lastBirthdayBonus && new Date(lastBirthdayBonus).getFullYear() === currentYear) {
          continue;
        }

        // Award birthday points
        await this.awardBonusPoints(
          account.id,
          BIRTHDAY_BONUS_POINTS,
          'Geburtstagsbonus 🎉',
          { type: 'birthday', year: currentYear }
        );

        // Send birthday notification
        await this.sendBirthdayNotification(account);
      }

    } catch (error) {
      logger.error('Error processing birthday bonuses:', error);
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get account by ID
   */
  private async getAccount(accountId: string): Promise<LoyaltyAccount | null> {
    const doc = await this.firestore
      .collection(ACCOUNTS_COLLECTION)
      .doc(accountId)
      .get();

    return doc.exists ? doc.data() as LoyaltyAccount : null;
  }

  /**
   * Get account by customer ID
   */
  private async getAccountByCustomerId(
    tenantId: string,
    customerId: string
  ): Promise<LoyaltyAccount | null> {
    const snapshot = await this.firestore
      .collection(ACCOUNTS_COLLECTION)
      .where('tenantId', '==', tenantId)
      .where('customerId', '==', customerId)
      .limit(1)
      .get();

    return snapshot.empty ? null : snapshot.docs[0].data() as LoyaltyAccount;
  }

  /**
   * Calculate points for order
   */
  private async calculatePoints(
    account: LoyaltyAccount,
    orderData: any
  ): Promise<PointsCalculation> {
    const breakdown: Array<{ source: string; points: number }> = [];
    
    // Base points
    const basePoints = Math.floor(orderData.total * DEFAULT_POINTS_RATE);
    breakdown.push({ source: 'Bestellung', points: basePoints });

    // Get tier multiplier
    const tier = LOYALTY_TIERS.find(t => t.id === account.tier) || LOYALTY_TIERS[0];
    const tierMultiplier = tier.multiplier;

    // Check active campaigns
    const campaigns = await this.getActiveCampaigns(account.tenantId);
    let campaignMultiplier = 1;
    let campaignBonus = 0;

    for (const campaign of campaigns) {
      if (this.isEligibleForCampaign(campaign, orderData)) {
        if (campaign.rules.multiplier) {
          campaignMultiplier = Math.max(campaignMultiplier, campaign.rules.multiplier);
        }
        if (campaign.rules.bonusPoints) {
          campaignBonus += campaign.rules.bonusPoints;
          breakdown.push({ source: campaign.name, points: campaign.rules.bonusPoints });
        }
      }
    }

    // Calculate total
    const totalMultiplier = tierMultiplier * campaignMultiplier;
    const totalPoints = Math.floor(basePoints * totalMultiplier) + campaignBonus;

    return {
      basePoints,
      bonusPoints: campaignBonus,
      multiplier: totalMultiplier,
      totalPoints,
      breakdown
    };
  }

  /**
   * Update account points
   */
  private async updateAccountPoints(
    accountId: string,
    pointsDelta: number
  ): Promise<void> {
    const accountRef = this.firestore.collection(ACCOUNTS_COLLECTION).doc(accountId);
    
    await this.firestore.runTransaction(async (transaction) => {
      const doc = await transaction.get(accountRef);
      const account = doc.data() as LoyaltyAccount;
      
      const newPoints = Math.max(0, account.points + pointsDelta);
      const lifetimePoints = pointsDelta > 0 
        ? account.lifetimePoints + pointsDelta 
        : account.lifetimePoints;

      transaction.update(accountRef, {
        points: newPoints,
        lifetimePoints,
        lastActivity: admin.firestore.FieldValue.serverTimestamp(),
        'stats.totalPointsEarned': pointsDelta > 0 
          ? admin.firestore.FieldValue.increment(pointsDelta)
          : admin.firestore.FieldValue.increment(0),
        'stats.totalPointsRedeemed': pointsDelta < 0 
          ? admin.firestore.FieldValue.increment(Math.abs(pointsDelta))
          : admin.firestore.FieldValue.increment(0)
      });
    });
  }

  /**
   * Record transaction
   */
  private async recordTransaction(
    transaction: Partial<LoyaltyTransaction>
  ): Promise<void> {
    await this.firestore
      .collection(TRANSACTIONS_COLLECTION)
      .add({
        ...transaction,
        id: uuidv4(),
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
  }

  /**
   * Check for tier upgrade
   */
  private async checkTierUpgrade(accountId: string): Promise<void> {
    const account = await this.getAccount(accountId);
    if (!account) return;

    const currentTierIndex = LOYALTY_TIERS.findIndex(t => t.id === account.tier);
    const nextTier = LOYALTY_TIERS[currentTierIndex + 1];

    if (nextTier && account.lifetimePoints >= nextTier.requiredPoints) {
      // Upgrade tier
      await this.firestore
        .collection(ACCOUNTS_COLLECTION)
        .doc(accountId)
        .update({
          tier: nextTier.id,
          tierUpgradedAt: admin.firestore.FieldValue.serverTimestamp()
        });

      // Send upgrade notification
      await this.sendTierUpgradeNotification(account, nextTier);

      logger.info(`Account ${accountId} upgraded to ${nextTier.name}`);
    }
  }

  /**
   * Process stamp cards
   */
  private async processStampCards(
    accountId: string,
    orderData: any
  ): Promise<void> {
    // Get active stamp cards
    const stampCards = await this.getStampCards(accountId);

    for (const card of stampCards) {
      // Check if order qualifies for stamp
      if (this.qualifiesForStamp(card, orderData)) {
        await this.addStamp(card.id, orderData.orderId);

        // Check if card is complete
        if (card.currentStamps + 1 >= card.requiredStamps) {
          await this.completeStampCard(card.id, accountId);
        }
      }
    }
  }

  /**
   * Check achievements
   */
  private async checkAchievements(accountId: string): Promise<void> {
    // Implementation for gamification achievements
    // Examples: First purchase, 10 orders, spend 1000 CHF, etc.
  }

  /**
   * Award bonus points
   */
  private async awardBonusPoints(
    accountId: string,
    points: number,
    description: string,
    metadata?: any
  ): Promise<void> {
    await this.updateAccountPoints(accountId, points);
    
    const account = await this.getAccount(accountId);
    if (!account) return;

    await this.recordTransaction({
      accountId,
      tenantId: account.tenantId,
      type: TRANSACTION_TYPES.BONUS,
      points,
      description,
      metadata
    });
  }

  /**
   * Get reward
   */
  private async getReward(rewardId: string): Promise<Reward | null> {
    const doc = await this.firestore
      .collection(REWARDS_COLLECTION)
      .doc(rewardId)
      .get();

    return doc.exists ? doc.data() as Reward : null;
  }

  /**
   * Check tier eligibility
   */
  private isTierEligible(userTier: string, requiredTier: string): boolean {
    const userTierIndex = LOYALTY_TIERS.findIndex(t => t.id === userTier);
    const requiredTierIndex = LOYALTY_TIERS.findIndex(t => t.id === requiredTier);
    return userTierIndex >= requiredTierIndex;
  }

  /**
   * Generate redemption code
   */
  private generateRedemptionCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Update reward stock
   */
  private async updateRewardStock(rewardId: string, delta: number): Promise<void> {
    await this.firestore
      .collection(REWARDS_COLLECTION)
      .doc(rewardId)
      .update({
        stock: admin.firestore.FieldValue.increment(delta)
      });
  }

  /**
   * Get active campaigns
   */
  private async getActiveCampaigns(tenantId: string): Promise<CampaignConfig[]> {
    const now = new Date();
    
    const snapshot = await this.firestore
      .collection(CAMPAIGNS_COLLECTION)
      .where('tenantId', '==', tenantId)
      .where('active', '==', true)
      .get();

    return snapshot.docs
      .map(doc => doc.data() as CampaignConfig)
      .filter(campaign => 
        isAfter(now, campaign.startDate) && 
        isBefore(now, campaign.endDate)
      );
  }

  /**
   * Check campaign eligibility
   */
  private isEligibleForCampaign(campaign: CampaignConfig, orderData: any): boolean {
    if (!campaign.rules.conditions) return true;

    return campaign.rules.conditions.every(condition => {
      const value = this.getNestedValue(orderData, condition.field);
      
      switch (condition.operator) {
        case '==': return value === condition.value;
        case '!=': return value !== condition.value;
        case '>': return value > condition.value;
        case '>=': return value >= condition.value;
        case '<': return value < condition.value;
        case '<=': return value <= condition.value;
        case 'in': return condition.value.includes(value);
        default: return false;
      }
    });
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
  }

  /**
   * Get popular rewards details
   */
  private async getPopularRewardsDetails(
    rewardCounts: Map<string, number>
  ): Promise<Array<{ rewardId: string; name: string; redemptions: number }>> {
    const popular: Array<{ rewardId: string; name: string; redemptions: number }> = [];
    
    for (const [rewardId, count] of rewardCounts.entries()) {
      const reward = await this.getReward(rewardId);
      if (reward) {
        popular.push({
          rewardId,
          name: reward.name,
          redemptions: count
        });
      }
    }

    return popular.sort((a, b) => b.redemptions - a.redemptions);
  }

  /**
   * Get last birthday bonus
   */
  private async getLastBirthdayBonus(accountId: string): Promise<string | null> {
    const snapshot = await this.firestore
      .collection(TRANSACTIONS_COLLECTION)
      .where('accountId', '==', accountId)
      .where('type', '==', TRANSACTION_TYPES.BIRTHDAY)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    return snapshot.empty ? null : snapshot.docs[0].data().timestamp.toDate().toISOString();
  }

  /**
   * Check if order qualifies for stamp
   */
  private qualifiesForStamp(card: StampCard, orderData: any): boolean {
    // Check minimum order value
    if (card.rules.minimumOrderValue && orderData.total < card.rules.minimumOrderValue) {
      return false;
    }

    // Check required products
    if (card.rules.requiredProducts && card.rules.requiredProducts.length > 0) {
      const orderProductIds = orderData.items.map((item: any) => item.productId);
      return card.rules.requiredProducts.some(id => orderProductIds.includes(id));
    }

    return true;
  }

  /**
   * Add stamp to card
   */
  private async addStamp(cardId: string, orderId: string): Promise<void> {
    await this.firestore
      .collection(STAMP_CARDS_COLLECTION)
      .doc(cardId)
      .update({
        currentStamps: admin.firestore.FieldValue.increment(1),
        'stamps': admin.firestore.FieldValue.arrayUnion({
          orderId,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        }),
        lastStampAt: admin.firestore.FieldValue.serverTimestamp()
      });
  }

  /**
   * Complete stamp card
   */
  private async completeStampCard(cardId: string, accountId: string): Promise<void> {
    await this.firestore
      .collection(STAMP_CARDS_COLLECTION)
      .doc(cardId)
      .update({
        status: 'completed',
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    // Award reward
    const card = await this.firestore
      .collection(STAMP_CARDS_COLLECTION)
      .doc(cardId)
      .get();

    if (card.exists) {
      const cardData = card.data() as StampCard;
      
      // Award points or specific reward
      if (cardData.reward.type === 'points') {
        await this.awardBonusPoints(
          accountId,
          cardData.reward.value as number,
          `Stempelkarte "${cardData.name}" abgeschlossen`,
          { stampCardId: cardId }
        );
      }
      // Handle other reward types...
    }
  }

  // ============================================================================
  // NOTIFICATION METHODS
  // ============================================================================

  private async sendWelcomeNotification(account: LoyaltyAccount): Promise<void> {
    // Send welcome email/SMS/push notification
    logger.info(`Sending welcome notification to ${account.id}`);
  }

  private async sendRedemptionConfirmation(
    account: LoyaltyAccount,
    reward: Reward,
    redemption: RewardRedemption
  ): Promise<void> {
    // Send redemption confirmation
    logger.info(`Sending redemption confirmation for ${redemption.code}`);
  }

  private async sendTierUpgradeNotification(
    account: LoyaltyAccount,
    newTier: LoyaltyTier
  ): Promise<void> {
    // Send tier upgrade notification
    logger.info(`Sending tier upgrade notification to ${account.id}`);
  }

  private async sendBirthdayNotification(account: LoyaltyAccount): Promise<void> {
    // Send birthday notification
    logger.info(`Sending birthday notification to ${account.id}`);
  }
}