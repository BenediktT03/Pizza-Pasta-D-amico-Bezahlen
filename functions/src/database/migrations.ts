/**
 * EATECH Database Migrations
 * 
 * This file contains database migration logic for Firestore
 * Migrations are run in order and tracked to prevent re-running
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

const db = admin.firestore();
const MIGRATIONS_COLLECTION = '_migrations';

// ============================================================================
// TYPES
// ============================================================================
interface Migration {
  id: string;
  name: string;
  description: string;
  up: () => Promise<void>;
  down?: () => Promise<void>;
}

interface MigrationRecord {
  id: string;
  name: string;
  executedAt: admin.firestore.Timestamp;
  success: boolean;
  error?: string;
}

// ============================================================================
// MIGRATIONS
// ============================================================================
const migrations: Migration[] = [
  {
    id: '001_initial_setup',
    name: 'Initial Setup',
    description: 'Create initial collections and indexes',
    up: async () => {
      logger.info('Running migration: Initial Setup');
      
      // Create system collections
      const batch = db.batch();
      
      // System settings
      batch.set(db.collection('_system').doc('settings'), {
        version: '3.0.0',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        features: {
          aiEnabled: true,
          analyticsEnabled: true,
          multiTenantEnabled: true,
        },
      });
      
      // Feature flags
      batch.set(db.collection('_features').doc('flags'), {
        enableOrderTracking: true,
        enableLoyaltyProgram: true,
        enableVoiceOrdering: false,
        enableAIRecommendations: true,
        enableAdvancedAnalytics: true,
        enableSocialFeatures: false,
        enableTableReservations: true,
        enableCatering: true,
      });
      
      await batch.commit();
      logger.info('Initial setup completed');
    },
  },
  
  {
    id: '002_add_tenant_fields',
    name: 'Add Tenant Fields',
    description: 'Add new fields to tenant documents',
    up: async () => {
      logger.info('Running migration: Add Tenant Fields');
      
      const tenants = await db.collection('tenants').get();
      const batch = db.batch();
      
      tenants.forEach(doc => {
        batch.update(doc.ref, {
          settings: {
            currency: 'CHF',
            timezone: 'Europe/Zurich',
            language: 'de',
            taxRate: 7.7,
            ...doc.data().settings,
          },
          features: {
            ordering: true,
            delivery: false,
            pickup: true,
            tableService: false,
            loyaltyProgram: true,
            ...doc.data().features,
          },
          billing: {
            plan: 'starter',
            status: 'active',
            nextBillingDate: null,
            ...doc.data().billing,
          },
        });
      });
      
      await batch.commit();
      logger.info('Tenant fields added');
    },
  },
  
  {
    id: '003_create_analytics_structure',
    name: 'Create Analytics Structure',
    description: 'Set up analytics collections and aggregations',
    up: async () => {
      logger.info('Running migration: Create Analytics Structure');
      
      // This would typically create BigQuery tables or set up
      // Firestore collections for analytics data
      
      const analyticsRef = db.collection('_analytics');
      
      await analyticsRef.doc('config').set({
        aggregationInterval: 3600, // 1 hour
        retentionDays: 365,
        enabledMetrics: [
          'orders',
          'revenue',
          'customers',
          'products',
          'events',
        ],
      });
      
      logger.info('Analytics structure created');
    },
  },
  
  {
    id: '004_add_security_rules',
    name: 'Add Security Rules',
    description: 'Update Firestore security rules',
    up: async () => {
      logger.info('Running migration: Add Security Rules');
      
      // Note: In production, this would update the actual
      // Firestore security rules file and deploy it
      
      await db.collection('_system').doc('security').set({
        rulesVersion: '2.0.0',
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        features: {
          ipWhitelisting: true,
          rateLimiting: true,
          suspiciousActivityDetection: true,
        },
      });
      
      logger.info('Security rules updated');
    },
  },
  
  {
    id: '005_add_notification_templates',
    name: 'Add Notification Templates',
    description: 'Create default notification templates',
    up: async () => {
      logger.info('Running migration: Add Notification Templates');
      
      const templates = [
        {
          id: 'order_confirmation',
          name: 'Order Confirmation',
          channels: ['email', 'sms', 'push'],
          defaultEnabled: true,
        },
        {
          id: 'order_ready',
          name: 'Order Ready',
          channels: ['sms', 'push'],
          defaultEnabled: true,
        },
        {
          id: 'order_cancelled',
          name: 'Order Cancelled',
          channels: ['email', 'push'],
          defaultEnabled: true,
        },
        {
          id: 'payment_received',
          name: 'Payment Received',
          channels: ['email'],
          defaultEnabled: true,
        },
        {
          id: 'loyalty_points_earned',
          name: 'Loyalty Points Earned',
          channels: ['push'],
          defaultEnabled: false,
        },
      ];
      
      const batch = db.batch();
      
      templates.forEach(template => {
        batch.set(
          db.collection('_notifications').doc('templates')
            .collection('templates').doc(template.id),
          {
            ...template,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          }
        );
      });
      
      await batch.commit();
      logger.info('Notification templates created');
    },
  },
  
  {
    id: '006_optimize_indexes',
    name: 'Optimize Indexes',
    description: 'Create composite indexes for better query performance',
    up: async () => {
      logger.info('Running migration: Optimize Indexes');
      
      // Note: Indexes are typically created via firestore.indexes.json
      // This migration just documents what indexes should exist
      
      await db.collection('_system').doc('indexes').set({
        version: '1.0.0',
        indexes: [
          {
            collection: 'orders',
            fields: [
              { field: 'tenantId', order: 'ASCENDING' },
              { field: 'createdAt', order: 'DESCENDING' },
            ],
          },
          {
            collection: 'orders',
            fields: [
              { field: 'tenantId', order: 'ASCENDING' },
              { field: 'status', order: 'ASCENDING' },
              { field: 'createdAt', order: 'DESCENDING' },
            ],
          },
          {
            collection: 'products',
            fields: [
              { field: 'tenantId', order: 'ASCENDING' },
              { field: 'category', order: 'ASCENDING' },
              { field: 'available', order: 'ASCENDING' },
            ],
          },
          {
            collection: 'customers',
            fields: [
              { field: 'tenantId', order: 'ASCENDING' },
              { field: 'lastOrderDate', order: 'DESCENDING' },
            ],
          },
        ],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      logger.info('Index optimization documented');
    },
  },
];

// ============================================================================
// MIGRATION RUNNER
// ============================================================================
export class MigrationRunner {
  private migrations: Migration[];
  
  constructor(migrations: Migration[]) {
    this.migrations = migrations;
  }
  
  /**
   * Run all pending migrations
   */
  async runPendingMigrations(): Promise<void> {
    logger.info('Starting migration process');
    
    const executedMigrations = await this.getExecutedMigrations();
    const pendingMigrations = this.migrations.filter(
      m => !executedMigrations.some(em => em.id === m.id)
    );
    
    if (pendingMigrations.length === 0) {
      logger.info('No pending migrations');
      return;
    }
    
    logger.info(`Found ${pendingMigrations.length} pending migrations`);
    
    for (const migration of pendingMigrations) {
      await this.runMigration(migration);
    }
    
    logger.info('Migration process completed');
  }
  
  /**
   * Run a specific migration
   */
  private async runMigration(migration: Migration): Promise<void> {
    logger.info(`Running migration: ${migration.name}`);
    
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;
    
    try {
      await migration.up();
      success = true;
      logger.info(`Migration completed: ${migration.name}`);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      logger.error(`Migration failed: ${migration.name}`, err);
      throw err;
    } finally {
      // Record migration execution
      await this.recordMigration({
        id: migration.id,
        name: migration.name,
        executedAt: admin.firestore.Timestamp.now(),
        success,
        error,
      });
      
      const duration = Date.now() - startTime;
      logger.info(`Migration ${migration.name} took ${duration}ms`);
    }
  }
  
  /**
   * Rollback a specific migration
   */
  async rollbackMigration(migrationId: string): Promise<void> {
    const migration = this.migrations.find(m => m.id === migrationId);
    
    if (!migration) {
      throw new Error(`Migration not found: ${migrationId}`);
    }
    
    if (!migration.down) {
      throw new Error(`Migration ${migrationId} does not support rollback`);
    }
    
    logger.info(`Rolling back migration: ${migration.name}`);
    
    try {
      await migration.down();
      
      // Remove migration record
      await db.collection(MIGRATIONS_COLLECTION).doc(migrationId).delete();
      
      logger.info(`Rollback completed: ${migration.name}`);
    } catch (err) {
      logger.error(`Rollback failed: ${migration.name}`, err);
      throw err;
    }
  }
  
  /**
   * Get list of executed migrations
   */
  private async getExecutedMigrations(): Promise<MigrationRecord[]> {
    const snapshot = await db.collection(MIGRATIONS_COLLECTION)
      .orderBy('executedAt', 'asc')
      .get();
    
    return snapshot.docs.map(doc => doc.data() as MigrationRecord);
  }
  
  /**
   * Record migration execution
   */
  private async recordMigration(record: MigrationRecord): Promise<void> {
    await db.collection(MIGRATIONS_COLLECTION).doc(record.id).set(record);
  }
  
  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    executed: string[];
    pending: string[];
    total: number;
  }> {
    const executed = await this.getExecutedMigrations();
    const executedIds = executed.map(m => m.id);
    const pendingIds = this.migrations
      .filter(m => !executedIds.includes(m.id))
      .map(m => m.id);
    
    return {
      executed: executedIds,
      pending: pendingIds,
      total: this.migrations.length,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================
export const migrationRunner = new MigrationRunner(migrations);

// CLI support
if (require.main === module) {
  (async () => {
    try {
      await migrationRunner.runPendingMigrations();
      process.exit(0);
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
  })();
}