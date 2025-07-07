/**
 * EATECH Firebase Functions - Auth Triggers
 * Version: 1.0.0
 * 
 * Authentication-related triggers for user management
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/triggers/auth.triggers.ts
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { EmailService } from '../services/EmailService';
import { AnalyticsService } from '../services/AnalyticsService';
import { logger } from '../utils/logger';

// Services
const emailService = new EmailService();
const analyticsService = new AnalyticsService();

// ============================================================================
// USER CREATION TRIGGER
// ============================================================================
export const onUserCreated = functions
  .region('europe-west1')
  .auth.user()
  .onCreate(async (user) => {
    try {
      logger.info('New user created', { uid: user.uid, email: user.email });

      // Create user profile in Firestore
      const userProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        phoneNumber: user.phoneNumber || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        role: 'customer',
        status: 'active',
        preferences: {
          language: 'de',
          notifications: {
            email: true,
            sms: false,
            push: true
          },
          marketing: {
            email: false,
            sms: false
          }
        },
        stats: {
          totalOrders: 0,
          totalSpent: 0,
          favoriteItems: [],
          lastOrderDate: null
        },
        loyalty: {
          points: 0,
          tier: 'bronze',
          joinDate: admin.firestore.FieldValue.serverTimestamp()
        }
      };

      await admin.firestore()
        .collection('users')
        .doc(user.uid)
        .set(userProfile);

      // Send welcome email
      if (user.email) {
        await emailService.sendWelcomeEmail({
          to: user.email,
          name: user.displayName || 'Foodie',
          data: {
            discountCode: 'WELCOME10',
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          }
        });
      }

      // Track analytics
      await analyticsService.trackEvent({
        eventType: 'user_signup',
        userId: user.uid,
        properties: {
          method: user.providerData[0]?.providerId || 'email',
          referrer: user.customClaims?.referrer || 'organic'
        }
      });

      // If user has tenant claim, add to tenant
      if (user.customClaims?.tenantId) {
        await addUserToTenant(user.uid, user.customClaims.tenantId, user.customClaims.role);
      }

      logger.info('User profile created successfully', { uid: user.uid });
    } catch (error) {
      logger.error('Error in onUserCreated', { error, uid: user.uid });
      throw error;
    }
  });

// ============================================================================
// USER DELETION TRIGGER
// ============================================================================
export const onUserDeleted = functions
  .region('europe-west1')
  .auth.user()
  .onDelete(async (user) => {
    try {
      logger.info('User deletion triggered', { uid: user.uid });

      const batch = admin.firestore().batch();

      // Delete user profile
      batch.delete(admin.firestore().collection('users').doc(user.uid));

      // Delete user's orders (soft delete)
      const ordersSnapshot = await admin.firestore()
        .collection('orders')
        .where('userId', '==', user.uid)
        .get();

      ordersSnapshot.forEach(doc => {
        batch.update(doc.ref, {
          status: 'deleted',
          deletedAt: admin.firestore.FieldValue.serverTimestamp(),
          personalData: admin.firestore.FieldValue.delete()
        });
      });

      // Delete user's addresses
      const addressesSnapshot = await admin.firestore()
        .collection('users')
        .doc(user.uid)
        .collection('addresses')
        .get();

      addressesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete user's payment methods
      const paymentMethodsSnapshot = await admin.firestore()
        .collection('users')
        .doc(user.uid)
        .collection('paymentMethods')
        .get();

      paymentMethodsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete user's reviews (anonymize)
      const reviewsSnapshot = await admin.firestore()
        .collection('reviews')
        .where('userId', '==', user.uid)
        .get();

      reviewsSnapshot.forEach(doc => {
        batch.update(doc.ref, {
          userId: 'deleted_user',
          userName: 'Gelöschter Benutzer',
          userPhoto: null
        });
      });

      await batch.commit();

      // Track analytics
      await analyticsService.trackEvent({
        eventType: 'user_deleted',
        userId: 'anonymous',
        properties: {
          deletionReason: user.customClaims?.deletionReason || 'user_requested'
        }
      });

      logger.info('User data cleaned up successfully', { uid: user.uid });
    } catch (error) {
      logger.error('Error in onUserDeleted', { error, uid: user.uid });
      throw error;
    }
  });

// ============================================================================
// CUSTOM CLAIMS UPDATE
// ============================================================================
export const updateUserClaims = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    // Check if request is made by an admin
    if (!context.auth || !context.auth.token.admin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can update user claims'
      );
    }

    const { userId, claims } = data;

    if (!userId || !claims) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'userId and claims are required'
      );
    }

    try {
      // Set custom claims
      await admin.auth().setCustomUserClaims(userId, claims);

      // Update Firestore user document
      await admin.firestore()
        .collection('users')
        .doc(userId)
        .update({
          customClaims: claims,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

      // If role changed, update tenant membership
      if (claims.role && claims.tenantId) {
        await updateTenantMembership(userId, claims.tenantId, claims.role);
      }

      logger.info('User claims updated', { userId, claims });

      return { success: true, message: 'Claims updated successfully' };
    } catch (error) {
      logger.error('Error updating user claims', { error, userId });
      throw new functions.https.HttpsError('internal', 'Failed to update claims');
    }
  });

// ============================================================================
// TENANT MANAGEMENT
// ============================================================================
async function addUserToTenant(userId: string, tenantId: string, role: string) {
  const tenantRef = admin.firestore().collection('tenants').doc(tenantId);
  
  await tenantRef.update({
    [`members.${userId}`]: {
      role,
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active'
    },
    memberCount: admin.firestore.FieldValue.increment(1),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

async function updateTenantMembership(userId: string, tenantId: string, newRole: string) {
  const tenantRef = admin.firestore().collection('tenants').doc(tenantId);
  
  await tenantRef.update({
    [`members.${userId}.role`]: newRole,
    [`members.${userId}.updatedAt`]: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

// ============================================================================
// PASSWORD RESET
// ============================================================================
export const onPasswordReset = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    const { email } = data;

    if (!email) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Email is required'
      );
    }

    try {
      // Generate password reset link
      const resetLink = await admin.auth().generatePasswordResetLink(email, {
        url: `${functions.config().app.url}/reset-password`
      });

      // Send reset email
      await emailService.sendPasswordResetEmail({
        to: email,
        resetLink
      });

      // Track event
      await analyticsService.trackEvent({
        eventType: 'password_reset_requested',
        userId: 'anonymous',
        properties: { email }
      });

      return { success: true, message: 'Password reset email sent' };
    } catch (error) {
      logger.error('Error sending password reset', { error, email });
      
      if (error.code === 'auth/user-not-found') {
        // Don't reveal if user exists
        return { success: true, message: 'If email exists, reset link sent' };
      }
      
      throw new functions.https.HttpsError('internal', 'Failed to send reset email');
    }
  });

// ============================================================================
// EMAIL VERIFICATION
// ============================================================================
export const resendVerificationEmail = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    try {
      const user = await admin.auth().getUser(context.auth.uid);
      
      if (user.emailVerified) {
        return { success: true, message: 'Email already verified' };
      }

      // Generate verification link
      const verificationLink = await admin.auth().generateEmailVerificationLink(
        user.email!,
        {
          url: `${functions.config().app.url}/verify-email`
        }
      );

      // Send verification email
      await emailService.sendVerificationEmail({
        to: user.email!,
        name: user.displayName || 'User',
        verificationLink
      });

      return { success: true, message: 'Verification email sent' };
    } catch (error) {
      logger.error('Error sending verification email', { error, uid: context.auth.uid });
      throw new functions.https.HttpsError('internal', 'Failed to send verification email');
    }
  });

// ============================================================================
// EXPORT ALL TRIGGERS
// ============================================================================
export const authTriggers = {
  onUserCreated,
  onUserDeleted,
  updateUserClaims,
  onPasswordReset,
  resendVerificationEmail
};