// Feature Flag Service for Firebase Functions
import * as admin from 'firebase-admin';
import { FeatureFlag, FeatureFlagContext } from '../types/feature-flags';

export class FeatureFlagService {
  private db: admin.firestore.Firestore;
  private featureFlagsCollection = 'feature_flags';

  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Check if a feature is enabled for a given context
   */
  async isEnabled(featureKey: string, context: FeatureFlagContext): Promise<boolean> {
    try {
      // 1. Check truck-specific override
      if (context.truckId) {
        const truckFlag = await this.getTruckFlag(context.truckId, featureKey);
        if (truckFlag && truckFlag.overridesGlobal) {
          return this.evaluateFlag(truckFlag, context);
        }
      }

      // 2. Check manager override
      if (context.managerId) {
        const managerFlag = await this.getManagerFlag(context.managerId, featureKey);
        if (managerFlag && managerFlag.applyToAllTrucks) {
          if (!managerFlag.excludedTrucks?.includes(context.truckId || '')) {
            return this.evaluateFlag(managerFlag, context);
          }
        }
      }

      // 3. Check global flag
      const globalFlag = await this.getGlobalFlag(featureKey);
      if (!globalFlag) return false;

      return this.evaluateFlag(globalFlag, context);
    } catch (error) {
      console.error('Error checking feature flag:', error);
      return false; // Default to disabled on error
    }
  }

  /**
   * Get global feature flag
   */
  private async getGlobalFlag(featureKey: string): Promise<FeatureFlag | null> {
    const doc = await this.db
      .collection(this.featureFlagsCollection)
      .doc('global')
      .collection('flags')
      .doc(featureKey)
      .get();

    return doc.exists ? (doc.data() as FeatureFlag) : null;
  }

  /**
   * Get truck-specific feature flag
   */
  private async getTruckFlag(truckId: string, featureKey: string): Promise<FeatureFlag | null> {
    const doc = await this.db
      .collection(this.featureFlagsCollection)
      .doc('trucks')
      .collection(truckId)
      .doc(featureKey)
      .get();

    return doc.exists ? (doc.data() as FeatureFlag) : null;
  }

  /**
   * Get manager-specific feature flag
   */
  private async getManagerFlag(managerId: string, featureKey: string): Promise<FeatureFlag | null> {
    const doc = await this.db
      .collection(this.featureFlagsCollection)
      .doc('managers')
      .collection(managerId)
      .doc(featureKey)
      .get();

    return doc.exists ? (doc.data() as FeatureFlag) : null;
  }

  /**
   * Evaluate a feature flag based on its rules
   */
  private evaluateFlag(flag: FeatureFlag, context: FeatureFlagContext): boolean {
    // Basic enabled check
    if (!flag.enabled) return false;

    // Schedule check
    if (flag.schedule) {
      const now = new Date();
      if (flag.schedule.enableAt && now < new Date(flag.schedule.enableAt)) {
        return false;
      }
      if (flag.schedule.disableAt && now > new Date(flag.schedule.disableAt)) {
        return false;
      }
    }

    // Rollout percentage
    if (flag.rolloutPercentage && flag.rolloutPercentage < 100) {
      const hash = this.hashContext(context);
      const threshold = flag.rolloutPercentage / 100;
      if (hash > threshold) return false;
    }

    // All checks passed
    return true;
  }

  /**
   * Create a deterministic hash for rollout percentage
   */
  private hashContext(context: FeatureFlagContext): number {
    const str = `${context.truckId || ''}-${context.userId || ''}-${context.managerId || ''}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }

  /**
   * Set a global feature flag (Master Admin only)
   */
  async setGlobalFlag(
    featureKey: string,
    flag: Partial<FeatureFlag>,
    adminId: string
  ): Promise<void> {
    const fullFlag: FeatureFlag = {
      key: featureKey,
      enabled: false,
      name: featureKey,
      category: 'general',
      rolloutPercentage: 100,
      ...flag,
      lastModified: admin.firestore.FieldValue.serverTimestamp(),
      lastModifiedBy: adminId
    };

    await this.db
      .collection(this.featureFlagsCollection)
      .doc('global')
      .collection('flags')
      .doc(featureKey)
      .set(fullFlag, { merge: true });

    // Log the change
    await this.logFeatureChange({
      featureKey,
      action: flag.enabled ? 'enabled' : 'disabled',
      level: 'global',
      changedBy: adminId,
      timestamp: new Date()
    });
  }

  /**
   * Set a truck-specific feature flag
   */
  async setTruckFlag(
    truckId: string,
    featureKey: string,
    flag: Partial<FeatureFlag>,
    adminId: string
  ): Promise<void> {
    const fullFlag: FeatureFlag = {
      key: featureKey,
      enabled: false,
      name: featureKey,
      category: 'general',
      rolloutPercentage: 100,
      overridesGlobal: true,
      ...flag,
      lastModified: admin.firestore.FieldValue.serverTimestamp(),
      lastModifiedBy: adminId
    };

    await this.db
      .collection(this.featureFlagsCollection)
      .doc('trucks')
      .collection(truckId)
      .doc(featureKey)
      .set(fullFlag, { merge: true });

    await this.logFeatureChange({
      featureKey,
      action: flag.enabled ? 'enabled' : 'disabled',
      level: 'truck',
      targetId: truckId,
      changedBy: adminId,
      timestamp: new Date()
    });
  }

  /**
   * Log feature flag changes for audit
   */
  private async logFeatureChange(change: {
    featureKey: string;
    action: string;
    level: string;
    targetId?: string;
    changedBy: string;
    timestamp: Date;
  }): Promise<void> {
    await this.db.collection('feature_audit_logs').add({
      ...change,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  /**
   * Get all feature flags for a context
   */
  async getAllFlags(context: FeatureFlagContext): Promise<Record<string, boolean>> {
    const globalFlags = await this.db
      .collection(this.featureFlagsCollection)
      .doc('global')
      .collection('flags')
      .get();

    const result: Record<string, boolean> = {};

    for (const doc of globalFlags.docs) {
      const flag = doc.data() as FeatureFlag;
      result[flag.key] = await this.isEnabled(flag.key, context);
    }

    return result;
  }

  /**
   * Panic mode - disable all non-essential features
   */
  async enablePanicMode(adminId: string): Promise<void> {
    const essentialFeatures = [
      'basic_ordering',
      'payment_processing',
      'order_display'
    ];

    const batch = this.db.batch();
    const globalFlags = await this.db
      .collection(this.featureFlagsCollection)
      .doc('global')
      .collection('flags')
      .get();

    globalFlags.docs.forEach(doc => {
      if (!essentialFeatures.includes(doc.id)) {
        batch.update(doc.ref, {
          enabled: false,
          reason: 'PANIC MODE ACTIVATED',
          lastModified: admin.firestore.FieldValue.serverTimestamp(),
          lastModifiedBy: adminId
        });
      }
    });

    await batch.commit();

    await this.logFeatureChange({
      featureKey: 'ALL_NON_ESSENTIAL',
      action: 'panic_mode_activated',
      level: 'global',
      changedBy: adminId,
      timestamp: new Date()
    });
  }
}

// Export singleton instance
export const featureFlagService = new FeatureFlagService();
