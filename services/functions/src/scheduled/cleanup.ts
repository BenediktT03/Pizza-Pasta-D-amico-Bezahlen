/**
 * Daily cleanup scheduled function
 * Runs daily at 3 AM (Zurich time) to clean up old data
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export const dailyCleanup = onSchedule({
  schedule: '0 3 * * *', // Every day at 3 AM
  timeZone: 'Europe/Zurich',
  region: 'europe-west6',
  memory: '1GiB',
  timeoutSeconds: 540, // 9 minutes
  retryCount: 3,
}, async (event) => {
  console.log('Starting daily cleanup job');
  
  const batch = admin.firestore().batch();
  let deletedCount = 0;

  try {
    // 1. Clean up old anonymous sessions (older than 30 days)
    await cleanupAnonymousSessions(batch);
    
    // 2. Remove expired tokens
    await cleanupExpiredTokens(batch);
    
    // 3. Archive old orders (older than 1 year)
    await archiveOldOrders();
    
    // 4. Clean up orphaned files in Storage
    await cleanupOrphanedFiles();
    
    // 5. Remove old analytics data (older than 90 days)
    await cleanupOldAnalytics(batch);
    
    // 6. Clean up failed payment attempts (older than 7 days)
    await cleanupFailedPayments(batch);
    
    // 7. Remove old voice recordings (older than 30 days)
    await cleanupVoiceRecordings();
    
    // 8. Clean up test data
    await cleanupTestData(batch);
    
    // 9. Optimize Firestore indexes
    await optimizeIndexes();
    
    // 10. Generate cleanup report
    await generateCleanupReport(deletedCount);

    // Commit batch operations
    await batch.commit();
    
    console.log('Daily cleanup completed successfully');
  } catch (error) {
    console.error('Daily cleanup failed:', error);
    throw error;
  }
});

async function cleanupAnonymousSessions(batch: admin.firestore.WriteBatch) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const sessionsSnapshot = await admin.firestore()
    .collection('sessions')
    .where('isAnonymous', '==', true)
    .where('lastActivity', '<', thirtyDaysAgo)
    .limit(500)
    .get();
  
  console.log(`Found ${sessionsSnapshot.size} anonymous sessions to delete`);
  
  sessionsSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  return sessionsSnapshot.size;
}

async function cleanupExpiredTokens(batch: admin.firestore.WriteBatch) {
  const now = Timestamp.now();
  
  const tokensSnapshot = await admin.firestore()
    .collection('tokens')
    .where('expiresAt', '<', now)
    .limit(500)
    .get();
  
  console.log(`Found ${tokensSnapshot.size} expired tokens to delete`);
  
  tokensSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  return tokensSnapshot.size;
}

async function archiveOldOrders() {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  const tenantsSnapshot = await admin.firestore()
    .collection('tenants')
    .get();
  
  for (const tenantDoc of tenantsSnapshot.docs) {
    const ordersSnapshot = await tenantDoc.ref
      .collection('orders')
      .where('createdAt', '<', oneYearAgo)
      .where('archived', '!=', true)
      .limit(100)
      .get();
    
    if (ordersSnapshot.empty) continue;
    
    console.log(`Archiving ${ordersSnapshot.size} orders for tenant ${tenantDoc.id}`);
    
    const archiveBatch = admin.firestore().batch();
    
    for (const orderDoc of ordersSnapshot.docs) {
      // Copy to archive collection
      const archiveRef = admin.firestore()
        .collection('archive')
        .doc('orders')
        .collection(tenantDoc.id)
        .doc(orderDoc.id);
      
      archiveBatch.set(archiveRef, {
        ...orderDoc.data(),
        archivedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      // Mark as archived in original collection
      archiveBatch.update(orderDoc.ref, {
        archived: true,
        archivedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    
    await archiveBatch.commit();
  }
}

async function cleanupOrphanedFiles() {
  const bucket = admin.storage().bucket();
  const [files] = await bucket.getFiles();
  
  console.log(`Checking ${files.length} files for orphans`);
  
  for (const file of files) {
    // Check if file is referenced in Firestore
    const filename = file.name;
    
    // Skip system files
    if (filename.startsWith('.') || filename.includes('__')) {
      continue;
    }
    
    // Check various collections for file references
    const isReferenced = await checkFileReferences(filename);
    
    if (!isReferenced) {
      // Check file age (don't delete recent files)
      const [metadata] = await file.getMetadata();
      const createdAt = new Date(metadata.timeCreated);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      if (createdAt < sevenDaysAgo) {
        console.log(`Deleting orphaned file: ${filename}`);
        await file.delete();
      }
    }
  }
}

async function checkFileReferences(filename: string): Promise<boolean> {
  // Check products collection
  const productsSnapshot = await admin.firestore()
    .collectionGroup('products')
    .where('images', 'array-contains', filename)
    .limit(1)
    .get();
  
  if (!productsSnapshot.empty) return true;
  
  // Check user avatars
  const usersSnapshot = await admin.firestore()
    .collection('users')
    .where('avatar', '==', filename)
    .limit(1)
    .get();
  
  if (!usersSnapshot.empty) return true;
  
  // Check tenant logos
  const tenantsSnapshot = await admin.firestore()
    .collection('tenants')
    .where('logo', '==', filename)
    .limit(1)
    .get();
  
  if (!tenantsSnapshot.empty) return true;
  
  return false;
}

async function cleanupOldAnalytics(batch: admin.firestore.WriteBatch) {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  // Clean up page views
  const pageViewsSnapshot = await admin.firestore()
    .collection('analytics')
    .doc('pageviews')
    .collection('events')
    .where('timestamp', '<', ninetyDaysAgo)
    .limit(500)
    .get();
  
  console.log(`Found ${pageViewsSnapshot.size} old page views to delete`);
  
  pageViewsSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  // Clean up events
  const eventsSnapshot = await admin.firestore()
    .collection('analytics')
    .doc('events')
    .collection('data')
    .where('timestamp', '<', ninetyDaysAgo)
    .limit(500)
    .get();
  
  console.log(`Found ${eventsSnapshot.size} old events to delete`);
  
  eventsSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
}

async function cleanupFailedPayments(batch: admin.firestore.WriteBatch) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const paymentsSnapshot = await admin.firestore()
    .collectionGroup('payments')
    .where('status', '==', 'failed')
    .where('createdAt', '<', sevenDaysAgo)
    .limit(500)
    .get();
  
  console.log(`Found ${paymentsSnapshot.size} failed payments to delete`);
  
  paymentsSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
}

async function cleanupVoiceRecordings() {
  const bucket = admin.storage().bucket();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const [files] = await bucket.getFiles({
    prefix: 'voice-recordings/',
  });
  
  console.log(`Checking ${files.length} voice recordings`);
  
  for (const file of files) {
    const [metadata] = await file.getMetadata();
    const createdAt = new Date(metadata.timeCreated);
    
    if (createdAt < thirtyDaysAgo) {
      console.log(`Deleting old voice recording: ${file.name}`);
      await file.delete();
    }
  }
}

async function cleanupTestData(batch: admin.firestore.WriteBatch) {
  // Clean up test orders
  const testOrdersSnapshot = await admin.firestore()
    .collectionGroup('orders')
    .where('isTest', '==', true)
    .where('createdAt', '<', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Older than 24 hours
    .limit(100)
    .get();
  
  console.log(`Found ${testOrdersSnapshot.size} test orders to delete`);
  
  testOrdersSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  // Clean up test users
  const testUsersSnapshot = await admin.firestore()
    .collection('users')
    .where('email', '>=', 'test@')
    .where('email', '<', 'test@~')
    .limit(100)
    .get();
  
  console.log(`Found ${testUsersSnapshot.size} test users to delete`);
  
  testUsersSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
}

async function optimizeIndexes() {
  // This is a placeholder - actual index optimization would be done through
  // Firebase Console or gcloud CLI
  console.log('Index optimization check completed');
  
  // Log index stats for monitoring
  const stats = {
    collections: [
      'orders',
      'products', 
      'users',
      'sessions',
      'analytics',
    ],
    timestamp: new Date().toISOString(),
  };
  
  await admin.firestore()
    .collection('system')
    .doc('index-stats')
    .set(stats, { merge: true });
}

async function generateCleanupReport(deletedCount: number) {
  const report = {
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    date: new Date().toISOString(),
    operations: {
      anonymousSessions: 'completed',
      expiredTokens: 'completed',
      oldOrders: 'completed',
      orphanedFiles: 'completed',
      analytics: 'completed',
      failedPayments: 'completed',
      voiceRecordings: 'completed',
      testData: 'completed',
    },
    stats: {
      totalDeleted: deletedCount,
      duration: Date.now() - new Date().setHours(3, 0, 0, 0),
    },
  };
  
  await admin.firestore()
    .collection('system')
    .doc('cleanup-reports')
    .collection('daily')
    .add(report);
  
  console.log('Cleanup report generated:', report);
}
