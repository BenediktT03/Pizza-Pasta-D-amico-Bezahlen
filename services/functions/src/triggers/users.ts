/**
 * Firestore triggers for user events
 * Handles user creation, updates, and deletion
 */

import { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import * as sgMail from '@sendgrid/mail';
import { getAuth } from 'firebase-admin/auth';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

// Trigger when a new user is created
export const onUserCreated = onDocumentCreated({
  document: 'users/{userId}',
  region: 'europe-west6',
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log('No data associated with the event');
    return;
  }

  const userData = snapshot.data();
  const userId = event.params.userId;

  console.log(`New user created: ${userId}`);

  try {
    // 1. Send welcome email
    await sendWelcomeEmail(userId, userData);

    // 2. Create user preferences
    await createUserPreferences(userId, userData);

    // 3. Initialize user statistics
    await initializeUserStats(userId);

    // 4. Assign to tenant if applicable
    await assignToTenant(userId, userData);

    // 5. Apply referral rewards if applicable
    await processReferral(userId, userData);

    // 6. Subscribe to newsletter if opted in
    await subscribeToNewsletter(userId, userData);

    // 7. Create analytics event
    await trackUserCreated(userId, userData);

    // 8. Set up default notification preferences
    await setupNotificationPreferences(userId);

    // 9. Send to CRM if integrated
    await syncToCRM(userId, userData);

  } catch (error) {
    console.error('Error processing user creation:', error);
    
    // Update user with error status
    await snapshot.ref.update({
      onboardingError: error.message,
      onboardingErrorAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
});

// Trigger when a user is updated
export const onUserUpdated = onDocumentUpdated({
  document: 'users/{userId}',
  region: 'europe-west6',
}, async (event) => {
  const { before, after } = event.data;
  if (!before || !after) {
    console.log('No data associated with the event');
    return;
  }

  const beforeData = before.data();
  const afterData = after.data();
  const userId = event.params.userId;

  console.log(`User updated: ${userId}`);

  // Detect what changed
  const changes = detectUserChanges(beforeData, afterData);

  try {
    // Handle specific changes
    if (changes.emailChanged) {
      await handleEmailChange(userId, beforeData.email, afterData.email);
    }

    if (changes.roleChanged) {
      await handleRoleChange(userId, beforeData.role, afterData.role, afterData.tenantId);
    }

    if (changes.profileCompleted && !beforeData.profileCompleted && afterData.profileCompleted) {
      await handleProfileCompletion(userId, afterData);
    }

    if (changes.subscriptionChanged) {
      await handleSubscriptionChange(userId, beforeData.subscription, afterData.subscription);
    }

    if (changes.tenantChanged) {
      await handleTenantChange(userId, beforeData.tenantId, afterData.tenantId);
    }

    // Update search index
    if (changes.nameChanged || changes.emailChanged) {
      await updateSearchIndex(userId, afterData);
    }

    // Sync changes to Auth
    await syncToFirebaseAuth(userId, changes, afterData);

    // Track changes for audit
    await auditUserChanges(userId, changes, beforeData, afterData);

  } catch (error) {
    console.error('Error processing user update:', error);
  }
});

// Trigger when a user is deleted
export const onUserDeleted = onDocumentDeleted({
  document: 'users/{userId}',
  region: 'europe-west6',
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log('No data associated with the event');
    return;
  }

  const userData = snapshot.data();
  const userId = event.params.userId;

  console.log(`User deleted: ${userId}`);

  try {
    // 1. Anonymize user data in orders
    await anonymizeUserOrders(userId, userData);

    // 2. Remove from tenant staff if applicable
    await removeFromTenantStaff(userId, userData);

    // 3. Delete user preferences
    await deleteUserPreferences(userId);

    // 4. Delete user sessions
    await deleteUserSessions(userId);

    // 5. Remove from mailing lists
    await unsubscribeFromAll(userData.email);

    // 6. Delete user files from storage
    await deleteUserFiles(userId);

    // 7. Create deletion audit log
    await logUserDeletion(userId, userData);

    // 8. Delete from Firebase Auth
    await deleteFromFirebaseAuth(userId);

    // 9. Notify relevant parties if needed
    await notifyUserDeletion(userId, userData);

  } catch (error) {
    console.error('Error processing user deletion:', error);
  }
});

// Helper Functions

async function sendWelcomeEmail(userId: string, userData: any) {
  if (!userData.email || userData.skipWelcomeEmail) return;

  const locale = userData.language || 'de';
  const templates = {
    de: 'd-german-welcome-template',
    fr: 'd-french-welcome-template',
    it: 'd-italian-welcome-template',
    en: 'd-english-welcome-template',
  };

  const msg = {
    to: userData.email,
    from: {
      email: 'welcome@eatech.ch',
      name: 'EATECH Team',
    },
    templateId: templates[locale] || templates.en,
    dynamicTemplateData: {
      firstName: userData.firstName || userData.displayName || 'there',
      userType: userData.role || 'customer',
      activationLink: `https://app.eatech.ch/activate/${userId}`,
      supportEmail: 'support@eatech.ch',
    },
  };

  try {
    await sgMail.send(msg);
    console.log(`Welcome email sent to ${userData.email}`);
    
    // Update user record
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .update({
        welcomeEmailSent: true,
        welcomeEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
}

async function createUserPreferences(userId: string, userData: any) {
  const defaultPreferences = {
    notifications: {
      email: true,
      push: true,
      sms: false,
      orderUpdates: true,
      promotions: true,
      newsletter: userData.newsletterOptIn || false,
    },
    language: userData.language || 'de',
    currency: 'CHF',
    timezone: 'Europe/Zurich',
    dietary: userData.dietary || [],
    allergies: userData.allergies || [],
    favoriteCategories: [],
    theme: 'light',
    accessibility: {
      fontSize: 'medium',
      highContrast: false,
      reduceMotion: false,
    },
  };

  await admin.firestore()
    .collection('users')
    .doc(userId)
    .collection('preferences')
    .doc('settings')
    .set({
      ...defaultPreferences,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

async function initializeUserStats(userId: string) {
  await admin.firestore()
    .collection('users')
    .doc(userId)
    .collection('stats')
    .doc('lifetime')
    .set({
      totalOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0,
      favoriteItems: [],
      lastOrderDate: null,
      firstOrderDate: null,
      loyaltyPoints: 0,
      referralCount: 0,
      reviewCount: 0,
      averageRating: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

async function assignToTenant(userId: string, userData: any) {
  if (!userData.tenantId) return;

  // Add user to tenant's staff collection if they have a role
  if (userData.role && userData.role !== 'customer') {
    await admin.firestore()
      .collection('tenants')
      .doc(userData.tenantId)
      .collection('staff')
      .doc(userId)
      .set({
        userId,
        email: userData.email,
        name: userData.displayName || `${userData.firstName} ${userData.lastName}`,
        role: userData.role,
        permissions: getDefaultPermissions(userData.role),
        active: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Update tenant staff count
    await admin.firestore()
      .collection('tenants')
      .doc(userData.tenantId)
      .update({
        staffCount: admin.firestore.FieldValue.increment(1),
        [`staffByRole.${userData.role}`]: admin.firestore.FieldValue.increment(1),
      });
  }
}

async function processReferral(userId: string, userData: any) {
  if (!userData.referralCode) return;

  // Find referrer
  const referrerSnapshot = await admin.firestore()
    .collection('users')
    .where('referralCode', '==', userData.referralCode)
    .limit(1)
    .get();

  if (referrerSnapshot.empty) {
    console.log(`Invalid referral code: ${userData.referralCode}`);
    return;
  }

  const referrerDoc = referrerSnapshot.docs[0];
  const referrerId = referrerDoc.id;

  // Award points to referrer
  const referralBonus = 50; // CHF 50 worth of points
  await referrerDoc.ref.update({
    'stats.lifetime.loyaltyPoints': admin.firestore.FieldValue.increment(referralBonus),
    'stats.lifetime.referralCount': admin.firestore.FieldValue.increment(1),
  });

  // Award points to new user
  const newUserBonus = 20; // CHF 20 worth of points
  await admin.firestore()
    .collection('users')
    .doc(userId)
    .update({
      'stats.lifetime.loyaltyPoints': newUserBonus,
      referredBy: referrerId,
      referralBonusApplied: true,
    });

  // Create referral record
  await admin.firestore()
    .collection('referrals')
    .add({
      referrerId,
      referredUserId: userId,
      referralCode: userData.referralCode,
      referrerBonus: referralBonus,
      newUserBonus: newUserBonus,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  console.log(`Referral processed: ${referrerId} referred ${userId}`);
}

async function subscribeToNewsletter(userId: string, userData: any) {
  if (!userData.email || !userData.newsletterOptIn) return;

  // Add to mailing list
  await admin.firestore()
    .collection('mailingList')
    .doc(userData.email)
    .set({
      email: userData.email,
      userId,
      firstName: userData.firstName,
      lastName: userData.lastName,
      language: userData.language || 'de',
      subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'user_registration',
      tags: ['customer', userData.role].filter(Boolean),
      active: true,
    }, { merge: true });

  // TODO: Sync with email service provider (SendGrid, Mailchimp, etc.)
}

async function trackUserCreated(userId: string, userData: any) {
  await admin.firestore()
    .collection('analytics')
    .doc('users')
    .collection('events')
    .add({
      type: 'user_created',
      userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      data: {
        source: userData.signupSource || 'web',
        role: userData.role || 'customer',
        tenantId: userData.tenantId,
        hasReferral: !!userData.referralCode,
        language: userData.language,
        platform: userData.platform,
      },
    });
}

async function setupNotificationPreferences(userId: string) {
  // Check if user has granted notification permissions
  const userDoc = await admin.firestore()
    .collection('users')
    .doc(userId)
    .get();

  const userData = userDoc.data();
  
  if (userData?.fcmToken) {
    // Subscribe to relevant topics
    const topics = ['general'];
    
    if (userData.tenantId) {
      topics.push(`tenant_${userData.tenantId}`);
    }
    
    if (userData.role) {
      topics.push(`role_${userData.role}`);
    }

    await Promise.all(
      topics.map(topic => 
        admin.messaging().subscribeToTopic(userData.fcmToken, topic)
      )
    );

    console.log(`User ${userId} subscribed to topics:`, topics);
  }
}

async function syncToCRM(userId: string, userData: any) {
  // Placeholder for CRM integration
  // This would integrate with services like HubSpot, Salesforce, etc.
  console.log(`Syncing user ${userId} to CRM`);
}

function detectUserChanges(before: any, after: any) {
  return {
    emailChanged: before.email !== after.email,
    roleChanged: before.role !== after.role,
    nameChanged: before.displayName !== after.displayName || 
                 before.firstName !== after.firstName || 
                 before.lastName !== after.lastName,
    profileCompleted: !before.profileCompleted && after.profileCompleted,
    subscriptionChanged: JSON.stringify(before.subscription) !== JSON.stringify(after.subscription),
    tenantChanged: before.tenantId !== after.tenantId,
    phoneChanged: before.phoneNumber !== after.phoneNumber,
    photoChanged: before.photoURL !== after.photoURL,
  };
}

async function handleEmailChange(userId: string, oldEmail: string, newEmail: string) {
  console.log(`User ${userId} changed email from ${oldEmail} to ${newEmail}`);

  // Update mailing list
  if (oldEmail) {
    await admin.firestore()
      .collection('mailingList')
      .doc(oldEmail)
      .delete();
  }

  // Check if user was subscribed to newsletter
  const userPrefs = await admin.firestore()
    .collection('users')
    .doc(userId)
    .collection('preferences')
    .doc('settings')
    .get();

  if (userPrefs.data()?.notifications?.newsletter) {
    await admin.firestore()
      .collection('mailingList')
      .doc(newEmail)
      .set({
        email: newEmail,
        userId,
        active: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
  }

  // Send email change notification
  await sendEmailChangeNotification(oldEmail, newEmail);
}

async function handleRoleChange(
  userId: string, 
  oldRole: string, 
  newRole: string, 
  tenantId?: string
) {
  console.log(`User ${userId} role changed from ${oldRole} to ${newRole}`);

  if (!tenantId) return;

  // Update tenant staff collection
  if (newRole === 'customer') {
    // Remove from staff
    await admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('staff')
      .doc(userId)
      .delete();

    // Update counters
    await admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .update({
        staffCount: admin.firestore.FieldValue.increment(-1),
        [`staffByRole.${oldRole}`]: admin.firestore.FieldValue.increment(-1),
      });
  } else {
    // Update staff role
    await admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('staff')
      .doc(userId)
      .update({
        role: newRole,
        permissions: getDefaultPermissions(newRole),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Update counters
    if (oldRole && oldRole !== 'customer') {
      await admin.firestore()
        .collection('tenants')
        .doc(tenantId)
        .update({
          [`staffByRole.${oldRole}`]: admin.firestore.FieldValue.increment(-1),
          [`staffByRole.${newRole}`]: admin.firestore.FieldValue.increment(1),
        });
    }
  }
}

async function handleProfileCompletion(userId: string, userData: any) {
  console.log(`User ${userId} completed profile`);

  // Award completion bonus
  const completionBonus = 10; // 10 loyalty points
  await admin.firestore()
    .collection('users')
    .doc(userId)
    .update({
      'stats.lifetime.loyaltyPoints': admin.firestore.FieldValue.increment(completionBonus),
      profileCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  // Send completion notification
  if (userData.email) {
    // TODO: Send profile completion email
  }
}

async function handleSubscriptionChange(
  userId: string,
  oldSubscription: any,
  newSubscription: any
) {
  console.log(`User ${userId} subscription changed`);

  // Track subscription events
  await admin.firestore()
    .collection('analytics')
    .doc('subscriptions')
    .collection('events')
    .add({
      type: 'subscription_changed',
      userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      data: {
        oldPlan: oldSubscription?.plan,
        newPlan: newSubscription?.plan,
        oldStatus: oldSubscription?.status,
        newStatus: newSubscription?.status,
      },
    });
}

async function handleTenantChange(
  userId: string,
  oldTenantId: string,
  newTenantId: string
) {
  console.log(`User ${userId} moved from tenant ${oldTenantId} to ${newTenantId}`);

  // Remove from old tenant
  if (oldTenantId) {
    await admin.firestore()
      .collection('tenants')
      .doc(oldTenantId)
      .collection('staff')
      .doc(userId)
      .delete();
  }

  // Add to new tenant
  if (newTenantId) {
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();

    const userData = userDoc.data();
    if (userData?.role && userData.role !== 'customer') {
      await assignToTenant(userId, userData);
    }
  }
}

async function updateSearchIndex(userId: string, userData: any) {
  // Update search index for user discovery
  const searchData = {
    objectID: userId,
    name: userData.displayName || `${userData.firstName} ${userData.lastName}`,
    email: userData.email,
    role: userData.role,
    tenantId: userData.tenantId,
    createdAt: userData.createdAt?.toMillis(),
  };

  // TODO: Update in Algolia or other search service
  console.log('Updating search index for user:', userId);
}

async function syncToFirebaseAuth(userId: string, changes: any, userData: any) {
  const updates: any = {};

  if (changes.emailChanged && userData.email) {
    updates.email = userData.email;
  }

  if (changes.nameChanged && userData.displayName) {
    updates.displayName = userData.displayName;
  }

  if (changes.phoneChanged && userData.phoneNumber) {
    updates.phoneNumber = userData.phoneNumber;
  }

  if (changes.photoChanged && userData.photoURL) {
    updates.photoURL = userData.photoURL;
  }

  if (Object.keys(updates).length > 0) {
    try {
      await getAuth().updateUser(userId, updates);
      console.log(`Firebase Auth updated for user ${userId}`);
    } catch (error) {
      console.error(`Failed to update Firebase Auth for user ${userId}:`, error);
    }
  }
}

async function auditUserChanges(
  userId: string,
  changes: any,
  beforeData: any,
  afterData: any
) {
  const significantChanges = Object.entries(changes)
    .filter(([key, value]) => value === true)
    .map(([key]) => key);

  if (significantChanges.length === 0) return;

  await admin.firestore()
    .collection('audit')
    .doc('users')
    .collection('changes')
    .add({
      userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      changes: significantChanges,
      changedBy: afterData.lastModifiedBy || 'system',
      before: beforeData,
      after: afterData,
    });
}

// User Deletion Helpers

async function anonymizeUserOrders(userId: string, userData: any) {
  const tenantIds = userData.orderTenants || [];
  
  for (const tenantId of tenantIds) {
    const ordersSnapshot = await admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('orders')
      .where('customerId', '==', userId)
      .get();

    const batch = admin.firestore().batch();
    
    ordersSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        customerId: null,
        customerEmail: '[deleted]',
        customerName: 'Deleted User',
        customerPhone: null,
        anonymizedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
  }
}

async function removeFromTenantStaff(userId: string, userData: any) {
  if (!userData.tenantId || userData.role === 'customer') return;

  await admin.firestore()
    .collection('tenants')
    .doc(userData.tenantId)
    .collection('staff')
    .doc(userId)
    .delete();

  // Update counters
  await admin.firestore()
    .collection('tenants')
    .doc(userData.tenantId)
    .update({
      staffCount: admin.firestore.FieldValue.increment(-1),
      [`staffByRole.${userData.role}`]: admin.firestore.FieldValue.increment(-1),
    });
}

async function deleteUserPreferences(userId: string) {
  const prefsSnapshot = await admin.firestore()
    .collection('users')
    .doc(userId)
    .collection('preferences')
    .get();

  const batch = admin.firestore().batch();
  prefsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}

async function deleteUserSessions(userId: string) {
  const sessionsSnapshot = await admin.firestore()
    .collection('sessions')
    .where('userId', '==', userId)
    .get();

  const batch = admin.firestore().batch();
  sessionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}

async function unsubscribeFromAll(email: string) {
  if (!email) return;

  await admin.firestore()
    .collection('mailingList')
    .doc(email)
    .delete();

  // TODO: Unsubscribe from external email service
}

async function deleteUserFiles(userId: string) {
  const bucket = admin.storage().bucket();
  
  // Delete profile images
  const [files] = await bucket.getFiles({
    prefix: `users/${userId}/`,
  });

  await Promise.all(files.map(file => file.delete()));
}

async function logUserDeletion(userId: string, userData: any) {
  await admin.firestore()
    .collection('audit')
    .doc('deletions')
    .collection('users')
    .add({
      userId,
      email: userData.email,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      reason: userData.deletionReason || 'user_request',
      deletedBy: userData.deletedBy || 'user',
    });
}

async function deleteFromFirebaseAuth(userId: string) {
  try {
    await getAuth().deleteUser(userId);
    console.log(`User ${userId} deleted from Firebase Auth`);
  } catch (error) {
    console.error(`Failed to delete user ${userId} from Firebase Auth:`, error);
  }
}

async function notifyUserDeletion(userId: string, userData: any) {
  if (userData.tenantId && userData.role !== 'customer') {
    // Notify tenant admin
    const tenant = await admin.firestore()
      .collection('tenants')
      .doc(userData.tenantId)
      .get();

    if (tenant.data()?.adminEmail) {
      // TODO: Send notification email to tenant admin
    }
  }
}

// Utility Functions

function getDefaultPermissions(role: string): string[] {
  const permissions = {
    admin: ['all'],
    manager: [
      'orders.view',
      'orders.manage',
      'products.view',
      'products.manage',
      'staff.view',
      'reports.view',
      'settings.view',
    ],
    staff: [
      'orders.view',
      'orders.manage',
      'products.view',
      'inventory.update',
    ],
    kitchen: [
      'orders.view',
      'orders.update_status',
      'inventory.view',
    ],
    delivery: [
      'orders.view',
      'orders.deliver',
      'customer.contact',
    ],
  };

  return permissions[role] || [];
}

async function sendEmailChangeNotification(oldEmail: string, newEmail: string) {
  const msg = {
    to: [oldEmail, newEmail],
    from: {
      email: 'security@eatech.ch',
      name: 'EATECH Security',
    },
    subject: 'Email Address Changed',
    html: `
      <p>Your EATECH account email address has been changed.</p>
      <p>Old email: ${oldEmail}</p>
      <p>New email: ${newEmail}</p>
      <p>If you did not make this change, please contact support immediately.</p>
    `,
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error('Failed to send email change notification:', error);
  }
}
