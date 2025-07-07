/**
 * EATECH - Backup Service
 * Version: 1.0.0
 * Description: Automated Backup und Recovery System
 * Author: EATECH Development Team
 * Created: 2025-01-09
 * File Path: /functions/src/services/BackupService.ts
 * 
 * Features:
 * - Automated daily backups
 * - Incremental backups
 * - Point-in-time recovery
 * - Cross-region replication
 * - Encrypted storage
 * - Backup verification
 * - Restore management
 * - Retention policies
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { Storage } from '@google-cloud/storage';
import { 
  BackupJob,
  BackupMetadata,
  RestoreRequest,
  BackupSchedule,
  BackupPolicy,
  BackupStatus
} from '../types/backup.types';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { 
  format, 
  subDays, 
  subWeeks, 
  subMonths,
  differenceInDays,
  isAfter,
  addDays
} from 'date-fns';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface BackupOptions {
  type: 'full' | 'incremental' | 'differential';
  compress: boolean;
  encrypt: boolean;
  collections?: string[];
  excludeCollections?: string[];
  includeMetadata: boolean;
}

interface BackupResult {
  backupId: string;
  status: BackupStatus;
  size: number;
  duration: number;
  collections: number;
  documents: number;
  errors: string[];
  location: string;
}

interface RestoreOptions {
  targetTenantId?: string;
  collections?: string[];
  overwrite: boolean;
  dryRun: boolean;
  pointInTime?: Date;
}

interface RestoreResult {
  restoreId: string;
  status: 'success' | 'partial' | 'failed';
  restoredCollections: number;
  restoredDocuments: number;
  errors: string[];
  duration: number;
}

interface BackupVerification {
  valid: boolean;
  issues: string[];
  checksumValid: boolean;
  structureValid: boolean;
  dataIntegrity: boolean;
}

interface RetentionPolicy {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BACKUPS_COLLECTION = 'system_backups';
const BACKUP_JOBS_COLLECTION = 'backup_jobs';
const RESTORE_LOGS_COLLECTION = 'restore_logs';

const BACKUP_BUCKET = functions.config().backup?.bucket || 'eatech-backups';
const BACKUP_REGION = functions.config().backup?.region || 'europe-west1';
const REPLICA_REGION = functions.config().backup?.replica_region || 'europe-north1';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = functions.config().backup?.encryption_key || '';

const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  daily: 7,
  weekly: 4,
  monthly: 12,
  yearly: 3
};

const EXCLUDED_COLLECTIONS = [
  'system_backups',
  'backup_jobs',
  'analytics_cache',
  'temp_data'
];

const CRITICAL_COLLECTIONS = [
  'tenants',
  'users',
  'orders',
  'products',
  'customers',
  'transactions'
];

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// ============================================================================
// SERVICE CLASS
// ============================================================================

export default class BackupService {
  private firestore: admin.firestore.Firestore;
  private storage: Storage;
  private bucket: any;

  constructor() {
    this.firestore = admin.firestore();
    this.storage = new Storage();
    this.bucket = this.storage.bucket(BACKUP_BUCKET);
  }

  /**
   * Create backup
   */
  async createBackup(
    tenantId: string,
    options: Partial<BackupOptions> = {}
  ): Promise<BackupResult> {
    const startTime = Date.now();
    const backupId = uuidv4();
    
    const backupOptions: BackupOptions = {
      type: options.type || 'full',
      compress: options.compress !== false,
      encrypt: options.encrypt !== false,
      collections: options.collections,
      excludeCollections: options.excludeCollections || EXCLUDED_COLLECTIONS,
      includeMetadata: options.includeMetadata !== false
    };

    logger.info(`Starting ${backupOptions.type} backup for tenant ${tenantId}`);

    try {
      // Create backup job
      const job = await this.createBackupJob(tenantId, backupId, backupOptions);

      // Get collections to backup
      const collections = await this.getCollectionsToBackup(tenantId, backupOptions);

      // Perform backup
      const backupData = await this.performBackup(tenantId, collections, backupOptions);

      // Process backup data
      let processedData = backupData;
      
      if (backupOptions.compress) {
        processedData = await this.compressData(processedData);
      }

      if (backupOptions.encrypt) {
        processedData = await this.encryptData(processedData);
      }

      // Upload to storage
      const location = await this.uploadBackup(tenantId, backupId, processedData, backupOptions);

      // Create backup metadata
      const metadata = await this.createBackupMetadata(
        tenantId,
        backupId,
        backupData,
        location,
        backupOptions
      );

      // Verify backup
      const verification = await this.verifyBackup(location, metadata);

      // Update job status
      await this.updateBackupJob(job.id, 'completed', {
        completedAt: new Date().toISOString(),
        size: processedData.length,
        location,
        verification
      });

      // Replicate to secondary region
      if (functions.config().backup?.enable_replication === 'true') {
        await this.replicateBackup(location, REPLICA_REGION);
      }

      const duration = Date.now() - startTime;

      const result: BackupResult = {
        backupId,
        status: 'completed',
        size: processedData.length,
        duration,
        collections: collections.length,
        documents: backupData.totalDocuments,
        errors: [],
        location
      };

      // Apply retention policy
      await this.applyRetentionPolicy(tenantId);

      logger.info(`Backup ${backupId} completed in ${duration}ms`);
      return result;

    } catch (error) {
      logger.error(`Backup ${backupId} failed:`, error);
      
      await this.updateBackupJob(backupId, 'failed', {
        error: error.message,
        failedAt: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * Restore from backup
   */
  async restoreBackup(
    backupId: string,
    options: Partial<RestoreOptions> = {}
  ): Promise<RestoreResult> {
    const startTime = Date.now();
    const restoreId = uuidv4();

    const restoreOptions: RestoreOptions = {
      targetTenantId: options.targetTenantId,
      collections: options.collections,
      overwrite: options.overwrite || false,
      dryRun: options.dryRun || false,
      pointInTime: options.pointInTime
    };

    logger.info(`Starting restore from backup ${backupId}`);

    try {
      // Get backup metadata
      const metadata = await this.getBackupMetadata(backupId);
      if (!metadata) {
        throw new Error('Backup not found');
      }

      // Verify backup integrity
      const verification = await this.verifyBackup(metadata.location, metadata);
      if (!verification.valid) {
        throw new Error(`Backup verification failed: ${verification.issues.join(', ')}`);
      }

      // Download backup
      const encryptedData = await this.downloadBackup(metadata.location);

      // Decrypt if needed
      let compressedData = encryptedData;
      if (metadata.encrypted) {
        compressedData = await this.decryptData(encryptedData);
      }

      // Decompress if needed
      let backupData = compressedData;
      if (metadata.compressed) {
        backupData = await this.decompressData(compressedData);
      }

      // Parse backup data
      const parsedData = JSON.parse(backupData.toString());

      // Perform restore
      const result = await this.performRestore(
        parsedData,
        restoreOptions,
        metadata
      );

      const duration = Date.now() - startTime;

      // Log restore
      await this.logRestore({
        restoreId,
        backupId,
        ...result,
        duration,
        options: restoreOptions,
        completedAt: new Date().toISOString()
      });

      logger.info(`Restore ${restoreId} completed in ${duration}ms`);
      return result;

    } catch (error) {
      logger.error(`Restore ${restoreId} failed:`, error);
      throw error;
    }
  }

  /**
   * Schedule automatic backup
   */
  async scheduleBackup(
    tenantId: string,
    schedule: BackupSchedule
  ): Promise<void> {
    try {
      await this.firestore
        .collection('backup_schedules')
        .doc(tenantId)
        .set({
          ...schedule,
          enabled: true,
          lastRun: null,
          nextRun: this.calculateNextRun(schedule),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

      logger.info(`Backup schedule created for tenant ${tenantId}`);
    } catch (error) {
      logger.error('Error scheduling backup:', error);
      throw error;
    }
  }

  /**
   * List available backups
   */
  async listBackups(
    tenantId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      type?: string;
      limit?: number;
    }
  ): Promise<BackupMetadata[]> {
    try {
      let query = this.firestore
        .collection(BACKUPS_COLLECTION)
        .where('tenantId', '==', tenantId)
        .orderBy('createdAt', 'desc');

      if (options?.startDate) {
        query = query.where('createdAt', '>=', options.startDate);
      }

      if (options?.endDate) {
        query = query.where('createdAt', '<=', options.endDate);
      }

      if (options?.type) {
        query = query.where('type', '==', options.type);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => doc.data() as BackupMetadata);

    } catch (error) {
      logger.error('Error listing backups:', error);
      throw error;
    }
  }

  /**
   * Get backup status
   */
  async getBackupStatus(backupId: string): Promise<BackupJob | null> {
    try {
      const doc = await this.firestore
        .collection(BACKUP_JOBS_COLLECTION)
        .doc(backupId)
        .get();

      return doc.exists ? doc.data() as BackupJob : null;
    } catch (error) {
      logger.error('Error getting backup status:', error);
      throw error;
    }
  }

  /**
   * Delete backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    try {
      // Get metadata
      const metadata = await this.getBackupMetadata(backupId);
      if (!metadata) {
        throw new Error('Backup not found');
      }

      // Delete from storage
      await this.deleteFromStorage(metadata.location);

      // Delete replica if exists
      if (metadata.replicaLocation) {
        await this.deleteFromStorage(metadata.replicaLocation);
      }

      // Delete metadata
      await this.firestore
        .collection(BACKUPS_COLLECTION)
        .doc(backupId)
        .delete();

      logger.info(`Backup ${backupId} deleted`);
    } catch (error) {
      logger.error('Error deleting backup:', error);
      throw error;
    }
  }

  /**
   * Verify backup integrity
   */
  async verifyBackupIntegrity(backupId: string): Promise<BackupVerification> {
    try {
      const metadata = await this.getBackupMetadata(backupId);
      if (!metadata) {
        throw new Error('Backup not found');
      }

      return await this.verifyBackup(metadata.location, metadata);
    } catch (error) {
      logger.error('Error verifying backup:', error);
      throw error;
    }
  }

  // ============================================================================
  // SCHEDULED FUNCTIONS
  // ============================================================================

  /**
   * Process scheduled backups
   */
  async processScheduledBackups(): Promise<void> {
    try {
      const now = new Date();
      
      // Get due schedules
      const schedulesSnapshot = await this.firestore
        .collection('backup_schedules')
        .where('enabled', '==', true)
        .where('nextRun', '<=', now)
        .get();

      for (const doc of schedulesSnapshot.docs) {
        const schedule = doc.data() as BackupSchedule;
        
        try {
          // Create backup
          await this.createBackup(doc.id, {
            type: schedule.type || 'full',
            compress: true,
            encrypt: true
          });

          // Update schedule
          await doc.ref.update({
            lastRun: admin.firestore.FieldValue.serverTimestamp(),
            nextRun: this.calculateNextRun(schedule),
            consecutiveFailures: 0
          });

        } catch (error) {
          logger.error(`Scheduled backup failed for tenant ${doc.id}:`, error);
          
          // Update failure count
          await doc.ref.update({
            consecutiveFailures: admin.firestore.FieldValue.increment(1),
            lastError: error.message
          });
        }
      }
    } catch (error) {
      logger.error('Error processing scheduled backups:', error);
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Create backup job
   */
  private async createBackupJob(
    tenantId: string,
    backupId: string,
    options: BackupOptions
  ): Promise<BackupJob> {
    const job: BackupJob = {
      id: backupId,
      tenantId,
      type: options.type,
      status: 'running',
      startedAt: new Date().toISOString(),
      options
    };

    await this.firestore
      .collection(BACKUP_JOBS_COLLECTION)
      .doc(backupId)
      .set(job);

    return job;
  }

  /**
   * Update backup job
   */
  private async updateBackupJob(
    jobId: string,
    status: BackupStatus,
    data: any
  ): Promise<void> {
    await this.firestore
      .collection(BACKUP_JOBS_COLLECTION)
      .doc(jobId)
      .update({
        status,
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
  }

  /**
   * Get collections to backup
   */
  private async getCollectionsToBackup(
    tenantId: string,
    options: BackupOptions
  ): Promise<string[]> {
    if (options.collections) {
      return options.collections;
    }

    // Get all collections
    const allCollections = await this.firestore.listCollections();
    const collectionIds = allCollections.map(c => c.id);

    // Filter excluded collections
    return collectionIds.filter(id => 
      !options.excludeCollections?.includes(id)
    );
  }

  /**
   * Perform backup
   */
  private async performBackup(
    tenantId: string,
    collections: string[],
    options: BackupOptions
  ): Promise<any> {
    const backupData: any = {
      version: '1.0',
      tenantId,
      timestamp: new Date().toISOString(),
      type: options.type,
      collections: {},
      totalDocuments: 0
    };

    // Get last backup for incremental
    let lastBackup: BackupMetadata | null = null;
    if (options.type === 'incremental') {
      const lastBackups = await this.listBackups(tenantId, {
        type: 'full',
        limit: 1
      });
      lastBackup = lastBackups[0] || null;
    }

    // Backup each collection
    for (const collectionId of collections) {
      const collectionData = await this.backupCollection(
        collectionId,
        tenantId,
        lastBackup?.timestamp
      );

      if (collectionData.documents.length > 0) {
        backupData.collections[collectionId] = collectionData;
        backupData.totalDocuments += collectionData.documents.length;
      }
    }

    // Add metadata if requested
    if (options.includeMetadata) {
      backupData.metadata = await this.collectMetadata(tenantId);
    }

    return JSON.stringify(backupData);
  }

  /**
   * Backup collection
   */
  private async backupCollection(
    collectionId: string,
    tenantId: string,
    sinceTimestamp?: Date
  ): Promise<any> {
    let query = this.firestore.collection(collectionId) as any;

    // Filter by tenant if field exists
    try {
      // Check if collection has tenantId field
      const sample = await query.limit(1).get();
      if (!sample.empty && sample.docs[0].data().tenantId) {
        query = query.where('tenantId', '==', tenantId);
      }
    } catch (error) {
      // Collection might not exist or have different structure
    }

    // Filter by timestamp for incremental backup
    if (sinceTimestamp) {
      query = query.where('updatedAt', '>', sinceTimestamp);
    }

    const snapshot = await query.get();
    
    return {
      documentCount: snapshot.size,
      documents: snapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data(),
        metadata: {
          createTime: doc.createTime?.toDate().toISOString(),
          updateTime: doc.updateTime?.toDate().toISOString()
        }
      }))
    };
  }

  /**
   * Compress data
   */
  private async compressData(data: Buffer | string): Promise<Buffer> {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    return await gzip(buffer);
  }

  /**
   * Decompress data
   */
  private async decompressData(data: Buffer): Promise<Buffer> {
    return await gunzip(data);
  }

  /**
   * Encrypt data
   */
  private async encryptData(data: Buffer): Promise<Buffer> {
    if (!ENCRYPTION_KEY) {
      throw new Error('Encryption key not configured');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    const encrypted = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();
    
    // Combine IV, auth tag, and encrypted data
    return Buffer.concat([iv, authTag, encrypted]);
  }

  /**
   * Decrypt data
   */
  private async decryptData(data: Buffer): Promise<Buffer> {
    if (!ENCRYPTION_KEY) {
      throw new Error('Encryption key not configured');
    }

    // Extract IV, auth tag, and encrypted data
    const iv = data.slice(0, 16);
    const authTag = data.slice(16, 32);
    const encrypted = data.slice(32);

    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
  }

  /**
   * Upload backup to storage
   */
  private async uploadBackup(
    tenantId: string,
    backupId: string,
    data: Buffer,
    options: BackupOptions
  ): Promise<string> {
    const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');
    const filename = `tenants/${tenantId}/backups/${options.type}/${timestamp}_${backupId}.backup`;
    
    const file = this.bucket.file(filename);
    
    await file.save(data, {
      metadata: {
        contentType: 'application/octet-stream',
        metadata: {
          tenantId,
          backupId,
          type: options.type,
          encrypted: options.encrypt.toString(),
          compressed: options.compress.toString()
        }
      }
    });

    return `gs://${BACKUP_BUCKET}/${filename}`;
  }

  /**
   * Download backup from storage
   */
  private async downloadBackup(location: string): Promise<Buffer> {
    const filename = location.replace(`gs://${BACKUP_BUCKET}/`, '');
    const file = this.bucket.file(filename);
    
    const [data] = await file.download();
    return data;
  }

  /**
   * Delete from storage
   */
  private async deleteFromStorage(location: string): Promise<void> {
    const filename = location.replace(`gs://${BACKUP_BUCKET}/`, '');
    const file = this.bucket.file(filename);
    
    await file.delete();
  }

  /**
   * Create backup metadata
   */
  private async createBackupMetadata(
    tenantId: string,
    backupId: string,
    backupData: any,
    location: string,
    options: BackupOptions
  ): Promise<BackupMetadata> {
    const parsedData = JSON.parse(backupData);
    
    const metadata: BackupMetadata = {
      id: backupId,
      tenantId,
      type: options.type,
      status: 'completed',
      location,
      size: Buffer.byteLength(backupData),
      compressed: options.compress,
      encrypted: options.encrypt,
      collections: Object.keys(parsedData.collections),
      documentCount: parsedData.totalDocuments,
      timestamp: new Date(),
      checksum: this.calculateChecksum(backupData),
      version: parsedData.version
    };

    await this.firestore
      .collection(BACKUPS_COLLECTION)
      .doc(backupId)
      .set({
        ...metadata,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

    return metadata;
  }

  /**
   * Get backup metadata
   */
  private async getBackupMetadata(backupId: string): Promise<BackupMetadata | null> {
    const doc = await this.firestore
      .collection(BACKUPS_COLLECTION)
      .doc(backupId)
      .get();

    return doc.exists ? doc.data() as BackupMetadata : null;
  }

  /**
   * Calculate checksum
   */
  private calculateChecksum(data: Buffer | string): string {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Verify backup
   */
  private async verifyBackup(
    location: string,
    metadata: BackupMetadata
  ): Promise<BackupVerification> {
    const verification: BackupVerification = {
      valid: true,
      issues: [],
      checksumValid: true,
      structureValid: true,
      dataIntegrity: true
    };

    try {
      // Download and verify checksum
      const data = await this.downloadBackup(location);
      const checksum = this.calculateChecksum(data);
      
      if (checksum !== metadata.checksum) {
        verification.checksumValid = false;
        verification.issues.push('Checksum mismatch');
      }

      // Verify structure
      try {
        let verifyData = data;
        
        if (metadata.encrypted) {
          verifyData = await this.decryptData(data);
        }
        
        if (metadata.compressed) {
          verifyData = await this.decompressData(verifyData);
        }

        const parsed = JSON.parse(verifyData.toString());
        
        if (!parsed.version || !parsed.collections) {
          verification.structureValid = false;
          verification.issues.push('Invalid backup structure');
        }

        // Verify critical collections
        for (const collection of CRITICAL_COLLECTIONS) {
          if (!parsed.collections[collection]) {
            verification.issues.push(`Missing critical collection: ${collection}`);
          }
        }

      } catch (error) {
        verification.structureValid = false;
        verification.issues.push(`Structure validation failed: ${error.message}`);
      }

    } catch (error) {
      verification.valid = false;
      verification.issues.push(`Verification failed: ${error.message}`);
    }

    verification.valid = verification.checksumValid && 
                        verification.structureValid && 
                        verification.issues.length === 0;

    return verification;
  }

  /**
   * Replicate backup
   */
  private async replicateBackup(
    sourceLocation: string,
    targetRegion: string
  ): Promise<string> {
    try {
      const sourceFilename = sourceLocation.replace(`gs://${BACKUP_BUCKET}/`, '');
      const targetBucket = `${BACKUP_BUCKET}-${targetRegion}`;
      
      // Copy to replica bucket
      const sourceFile = this.bucket.file(sourceFilename);
      const targetFile = this.storage.bucket(targetBucket).file(sourceFilename);
      
      await sourceFile.copy(targetFile);
      
      const replicaLocation = `gs://${targetBucket}/${sourceFilename}`;
      
      logger.info(`Backup replicated to ${replicaLocation}`);
      return replicaLocation;
      
    } catch (error) {
      logger.error('Error replicating backup:', error);
      // Non-critical error, don't throw
      return '';
    }
  }

  /**
   * Apply retention policy
   */
  private async applyRetentionPolicy(tenantId: string): Promise<void> {
    try {
      const policy = await this.getRetentionPolicy(tenantId);
      const now = new Date();

      // Get all backups
      const backups = await this.listBackups(tenantId);

      // Group by type and date
      const dailyBackups = backups.filter(b => b.type === 'full');
      const weeklyBackups = this.filterWeeklyBackups(dailyBackups);
      const monthlyBackups = this.filterMonthlyBackups(dailyBackups);
      const yearlyBackups = this.filterYearlyBackups(dailyBackups);

      // Apply retention
      const toDelete: BackupMetadata[] = [];

      // Daily retention
      const dailyCutoff = subDays(now, policy.daily);
      toDelete.push(...dailyBackups.filter(b => 
        isBefore(b.timestamp, dailyCutoff) &&
        !weeklyBackups.includes(b) &&
        !monthlyBackups.includes(b) &&
        !yearlyBackups.includes(b)
      ));

      // Weekly retention
      const weeklyCutoff = subWeeks(now, policy.weekly);
      toDelete.push(...weeklyBackups.filter(b =>
        isBefore(b.timestamp, weeklyCutoff) &&
        !monthlyBackups.includes(b) &&
        !yearlyBackups.includes(b)
      ));

      // Monthly retention
      const monthlyCutoff = subMonths(now, policy.monthly);
      toDelete.push(...monthlyBackups.filter(b =>
        isBefore(b.timestamp, monthlyCutoff) &&
        !yearlyBackups.includes(b)
      ));

      // Yearly retention
      const yearlyCutoff = subMonths(now, policy.yearly * 12);
      toDelete.push(...yearlyBackups.filter(b =>
        isBefore(b.timestamp, yearlyCutoff)
      ));

      // Delete old backups
      for (const backup of toDelete) {
        await this.deleteBackup(backup.id);
      }

      logger.info(`Retention policy applied: ${toDelete.length} backups deleted`);
    } catch (error) {
      logger.error('Error applying retention policy:', error);
    }
  }

  /**
   * Get retention policy
   */
  private async getRetentionPolicy(tenantId: string): Promise<RetentionPolicy> {
    const doc = await this.firestore
      .collection('backup_policies')
      .doc(tenantId)
      .get();

    return doc.exists 
      ? doc.data() as RetentionPolicy 
      : DEFAULT_RETENTION_POLICY;
  }

  /**
   * Filter weekly backups
   */
  private filterWeeklyBackups(backups: BackupMetadata[]): BackupMetadata[] {
    const weekly: BackupMetadata[] = [];
    const weeks = new Set<string>();

    backups
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .forEach(backup => {
        const weekKey = format(backup.timestamp, 'yyyy-ww');
        if (!weeks.has(weekKey)) {
          weeks.add(weekKey);
          weekly.push(backup);
        }
      });

    return weekly;
  }

  /**
   * Filter monthly backups
   */
  private filterMonthlyBackups(backups: BackupMetadata[]): BackupMetadata[] {
    const monthly: BackupMetadata[] = [];
    const months = new Set<string>();

    backups
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .forEach(backup => {
        const monthKey = format(backup.timestamp, 'yyyy-MM');
        if (!months.has(monthKey)) {
          months.add(monthKey);
          monthly.push(backup);
        }
      });

    return monthly;
  }

  /**
   * Filter yearly backups
   */
  private filterYearlyBackups(backups: BackupMetadata[]): BackupMetadata[] {
    const yearly: BackupMetadata[] = [];
    const years = new Set<string>();

    backups
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .forEach(backup => {
        const yearKey = format(backup.timestamp, 'yyyy');
        if (!years.has(yearKey)) {
          years.add(yearKey);
          yearly.push(backup);
        }
      });

    return yearly;
  }

  /**
   * Calculate next run time
   */
  private calculateNextRun(schedule: BackupSchedule): Date {
    const now = new Date();
    
    switch (schedule.frequency) {
      case 'daily':
        return addDays(now, 1);
      case 'weekly':
        return addDays(now, 7);
      case 'monthly':
        return addDays(now, 30);
      default:
        // Custom cron expression
        // Would use a cron parser library in production
        return addDays(now, 1);
    }
  }

  /**
   * Collect metadata
   */
  private async collectMetadata(tenantId: string): Promise<any> {
    return {
      tenantInfo: await this.getTenantInfo(tenantId),
      statistics: await this.getBackupStatistics(tenantId),
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage()
      }
    };
  }

  /**
   * Get tenant info
   */
  private async getTenantInfo(tenantId: string): Promise<any> {
    const doc = await this.firestore
      .collection('tenants')
      .doc(tenantId)
      .get();

    return doc.exists ? doc.data() : null;
  }

  /**
   * Get backup statistics
   */
  private async getBackupStatistics(tenantId: string): Promise<any> {
    // Collection counts, sizes, etc.
    return {
      collections: {},
      totalDocuments: 0,
      totalSize: 0
    };
  }

  /**
   * Perform restore
   */
  private async performRestore(
    backupData: any,
    options: RestoreOptions,
    metadata: BackupMetadata
  ): Promise<RestoreResult> {
    const result: RestoreResult = {
      restoreId: uuidv4(),
      status: 'success',
      restoredCollections: 0,
      restoredDocuments: 0,
      errors: [],
      duration: 0
    };

    const targetTenantId = options.targetTenantId || metadata.tenantId;
    const collectionsToRestore = options.collections || Object.keys(backupData.collections);

    for (const collectionId of collectionsToRestore) {
      const collectionData = backupData.collections[collectionId];
      if (!collectionData) continue;

      try {
        const restored = await this.restoreCollection(
          collectionId,
          collectionData,
          targetTenantId,
          options
        );

        result.restoredDocuments += restored;
        result.restoredCollections++;
      } catch (error) {
        result.errors.push(`Failed to restore ${collectionId}: ${error.message}`);
        result.status = 'partial';
      }
    }

    if (result.errors.length === collectionsToRestore.length) {
      result.status = 'failed';
    }

    return result;
  }

  /**
   * Restore collection
   */
  private async restoreCollection(
    collectionId: string,
    collectionData: any,
    tenantId: string,
    options: RestoreOptions
  ): Promise<number> {
    let restoredCount = 0;
    const batch = this.firestore.batch();
    let batchCount = 0;

    for (const doc of collectionData.documents) {
      const docRef = this.firestore
        .collection(collectionId)
        .doc(doc.id);

      // Check if should overwrite
      if (!options.overwrite) {
        const existing = await docRef.get();
        if (existing.exists) continue;
      }

      // Update tenant ID if restoring to different tenant
      if (doc.data.tenantId) {
        doc.data.tenantId = tenantId;
      }

      if (!options.dryRun) {
        batch.set(docRef, doc.data);
        batchCount++;
      }

      restoredCount++;

      // Commit batch if needed
      if (batchCount >= 500) {
        await batch.commit();
        batchCount = 0;
      }
    }

    // Commit remaining
    if (batchCount > 0 && !options.dryRun) {
      await batch.commit();
    }

    return restoredCount;
  }

  /**
   * Log restore operation
   */
  private async logRestore(data: any): Promise<void> {
    await this.firestore
      .collection(RESTORE_LOGS_COLLECTION)
      .doc(data.restoreId)
      .set({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
  }
}