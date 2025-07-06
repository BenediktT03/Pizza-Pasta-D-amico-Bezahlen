/**
 * EATECH Master Authentication Service
 * Version: 1.0.0
 * 
 * Sicherer Authentication Service für Master-Administratoren
 * Features:
 * - Verschlüsselte Password-Verifikation
 * - Session Management
 * - Brute-Force Protection
 * - Activity Logging
 * - 2FA Vorbereitung
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/services/AuthService.js
 */

import { 
  getAuth, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  update,
  serverTimestamp,
  onValue,
  off
} from 'firebase/database';
import { getFirestore, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import { logSecurityEvent } from './SecurityLogger';

// Constants
const MASTER_ROLE = 'master_admin';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes

class MasterAuthService {
  constructor() {
    this.auth = getAuth();
    this.db = getDatabase();
    this.firestore = getFirestore();
    this.currentSession = null;
    this.sessionTimer = null;
    this.activityListeners = new Set();
  }

  /**
   * Master Login
   */
  async login({ email, password, userAgent, timestamp }) {
    try {
      // Check login attempts
      const attemptsData = await this.getLoginAttempts(email);
      if (attemptsData.isLocked) {
        const remainingTime = attemptsData.lockUntil - Date.now();
        throw new Error(`Account locked. Try again in ${Math.ceil(remainingTime / 1000 / 60)} minutes.`);
      }

      // Attempt Firebase authentication
      const userCredential = await signInWithEmailAndPassword(
        this.auth, 
        email, 
        password
      );

      const user = userCredential.user;

      // Verify master role
      const isMaster = await this.verifyMasterRole(user.uid);
      if (!isMaster) {
        await signOut(this.auth);
        throw new Error('Unauthorized: Not a master administrator');
      }

      // Create session
      const sessionData = await this.createSession({
        userId: user.uid,
        email: user.email,
        userAgent,
        timestamp,
        ip: await this.getClientIP()
      });

      // Reset login attempts
      await this.resetLoginAttempts(email);

      // Start session monitoring
      this.startSessionMonitoring(sessionData.sessionId);

      return {
        success: true,
        sessionId: sessionData.sessionId,
        user: {
          uid: user.uid,
          email: user.email,
          role: MASTER_ROLE
        },
        requires2FA: sessionData.requires2FA,
        sessionToken: sessionData.sessionToken,
        ip: sessionData.ip
      };

    } catch (error) {
      // Record failed attempt
      await this.recordFailedAttempt(email);
      
      throw error;
    }
  }

  /**
   * Verify Master Role
   */
  async verifyMasterRole(userId) {
    try {
      // Check Realtime Database
      const dbRef = ref(this.db, `users/${userId}/role`);
      const snapshot = await get(dbRef);
      
      if (snapshot.exists() && snapshot.val() === MASTER_ROLE) {
        return true;
      }

      // Check Firestore as backup
      const userDoc = await getDoc(doc(this.firestore, 'users', userId));
      if (userDoc.exists() && userDoc.data().role === MASTER_ROLE) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error verifying master role:', error);
      return false;
    }
  }

  /**
   * Create Session
   */
  async createSession({ userId, email, userAgent, timestamp, ip }) {
    const sessionId = this.generateSessionId();
    const sessionToken = this.generateSessionToken();
    
    const sessionData = {
      sessionId,
      userId,
      email,
      userAgent,
      ip,
      startTime: timestamp,
      lastActivity: timestamp,
      expiresAt: timestamp + SESSION_TIMEOUT,
      active: true,
      requires2FA: false, // Will be true when 2FA is implemented
      sessionToken: this.encryptToken(sessionToken)
    };

    // Store in Realtime Database
    await set(ref(this.db, `sessions/master/${sessionId}`), sessionData);
    
    // Store current session
    this.currentSession = sessionData;

    // Log session creation
    await logSecurityEvent('master_session_created', {
      sessionId,
      userId,
      ip
    });

    return {
      ...sessionData,
      sessionToken // Return unencrypted for client
    };
  }

  /**
   * Start Session Monitoring
   */
  startSessionMonitoring(sessionId) {
    // Clear existing timer
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
    }

    // Monitor session activity
    this.sessionTimer = setInterval(async () => {
      await this.checkSessionValidity(sessionId);
    }, 60000); // Check every minute

    // Monitor user activity
    this.setupActivityMonitoring();
  }

  /**
   * Setup Activity Monitoring
   */
  setupActivityMonitoring() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const activityHandler = () => {
      if (this.currentSession) {
        this.updateLastActivity();
      }
    };

    events.forEach(event => {
      window.addEventListener(event, activityHandler, true);
      this.activityListeners.add({ event, handler: activityHandler });
    });
  }

  /**
   * Update Last Activity
   */
  async updateLastActivity() {
    if (!this.currentSession) return;

    const now = Date.now();
    this.currentSession.lastActivity = now;
    this.currentSession.expiresAt = now + SESSION_TIMEOUT;

    try {
      await update(
        ref(this.db, `sessions/master/${this.currentSession.sessionId}`),
        {
          lastActivity: now,
          expiresAt: now + SESSION_TIMEOUT
        }
      );
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  }

  /**
   * Check Session Validity
   */
  async checkSessionValidity(sessionId) {
    try {
      const sessionRef = ref(this.db, `sessions/master/${sessionId}`);
      const snapshot = await get(sessionRef);
      
      if (!snapshot.exists()) {
        await this.logout();
        return false;
      }

      const session = snapshot.val();
      const now = Date.now();

      // Check if session expired
      if (session.expiresAt < now || !session.active) {
        await this.logout();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking session:', error);
      return false;
    }
  }

  /**
   * Logout
   */
  async logout() {
    try {
      if (this.currentSession) {
        // Mark session as inactive
        await update(
          ref(this.db, `sessions/master/${this.currentSession.sessionId}`),
          {
            active: false,
            endTime: serverTimestamp()
          }
        );

        // Log logout
        await logSecurityEvent('master_logout', {
          sessionId: this.currentSession.sessionId,
          userId: this.currentSession.userId
        });
      }

      // Clear timers
      if (this.sessionTimer) {
        clearInterval(this.sessionTimer);
      }

      // Remove activity listeners
      this.activityListeners.forEach(({ event, handler }) => {
        window.removeEventListener(event, handler, true);
      });
      this.activityListeners.clear();

      // Sign out from Firebase
      await signOut(this.auth);

      // Clear session
      this.currentSession = null;

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Get Login Attempts
   */
  async getLoginAttempts(email) {
    try {
      const attemptsRef = ref(this.db, `loginAttempts/${this.hashEmail(email)}`);
      const snapshot = await get(attemptsRef);
      
      if (!snapshot.exists()) {
        return { attempts: 0, isLocked: false };
      }

      const data = snapshot.val();
      const now = Date.now();

      if (data.lockUntil && data.lockUntil > now) {
        return {
          attempts: data.attempts,
          isLocked: true,
          lockUntil: data.lockUntil
        };
      }

      return {
        attempts: data.attempts || 0,
        isLocked: false
      };
    } catch (error) {
      console.error('Error getting login attempts:', error);
      return { attempts: 0, isLocked: false };
    }
  }

  /**
   * Record Failed Attempt
   */
  async recordFailedAttempt(email) {
    try {
      const hashedEmail = this.hashEmail(email);
      const attemptsRef = ref(this.db, `loginAttempts/${hashedEmail}`);
      const current = await this.getLoginAttempts(email);
      
      const newAttempts = current.attempts + 1;
      const updateData = {
        attempts: newAttempts,
        lastAttempt: serverTimestamp()
      };

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        updateData.lockUntil = Date.now() + LOCKOUT_DURATION;
      }

      await set(attemptsRef, updateData);

      // Log failed attempt
      await logSecurityEvent('master_login_failed_attempt', {
        email: hashedEmail,
        attempts: newAttempts,
        locked: newAttempts >= MAX_LOGIN_ATTEMPTS
      });

    } catch (error) {
      console.error('Error recording failed attempt:', error);
    }
  }

  /**
   * Reset Login Attempts
   */
  async resetLoginAttempts(email) {
    try {
      const hashedEmail = this.hashEmail(email);
      await set(ref(this.db, `loginAttempts/${hashedEmail}`), null);
    } catch (error) {
      console.error('Error resetting login attempts:', error);
    }
  }

  /**
   * Auth State Observer
   */
  onAuthStateChanged(callback) {
    return onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        const isMaster = await this.verifyMasterRole(user.uid);
        if (isMaster) {
          callback({
            uid: user.uid,
            email: user.email,
            role: MASTER_ROLE
          });
        } else {
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  }

  /**
   * Get Current User
   */
  getCurrentUser() {
    const user = this.auth.currentUser;
    if (!user) return null;

    return {
      uid: user.uid,
      email: user.email,
      role: MASTER_ROLE
    };
  }

  /**
   * Get Client IP (mock for now)
   */
  async getClientIP() {
    try {
      // In production, this would call an API endpoint
      // that returns the client's real IP
      return '127.0.0.1'; // Mock for development
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Utility Functions
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSessionToken() {
    return CryptoJS.lib.WordArray.random(256/8).toString();
  }

  encryptToken(token) {
    // In production, use environment variable for secret
    return CryptoJS.AES.encrypt(token, 'MASTER_SESSION_SECRET').toString();
  }

  hashEmail(email) {
    return CryptoJS.SHA256(email.toLowerCase()).toString();
  }

  /**
   * Password Reset (for future)
   */
  async requestPasswordReset(email) {
    try {
      await sendPasswordResetEmail(this.auth, email);
      
      await logSecurityEvent('master_password_reset_requested', {
        email: this.hashEmail(email),
        timestamp: Date.now()
      });

      return { success: true };
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
export default new MasterAuthService();