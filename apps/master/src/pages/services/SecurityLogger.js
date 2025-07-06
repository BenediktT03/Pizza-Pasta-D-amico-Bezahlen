/**
 * EATECH Master Security Logger
 * Version: 1.0.0
 * 
 * Protokolliert alle sicherheitsrelevanten Events
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/services/SecurityLogger.js
 */

import { getDatabase, ref, push, serverTimestamp } from 'firebase/database';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

class SecurityLogger {
  constructor() {
    this.db = getDatabase();
    this.firestore = getFirestore();
    this.queue = [];
    this.isProcessing = false;
  }

  /**
   * Log Security Event
   */
  async logEvent(eventType, data = {}) {
    const event = {
      type: eventType,
      timestamp: Date.now(),
      serverTimestamp: serverTimestamp(),
      data,
      metadata: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    // Add to queue
    this.queue.push(event);

    // Process queue
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process Event Queue
   */
  async processQueue() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const event = this.queue.shift();

    try {
      // Log to Realtime Database
      await push(ref(this.db, 'security_logs'), event);

      // Log critical events to Firestore for better querying
      if (this.isCriticalEvent(event.type)) {
        await addDoc(collection(this.firestore, 'security_logs'), {
          ...event,
          critical: true,
          indexed: true
        });
      }

      // Send to monitoring service (if configured)
      if (this.shouldAlert(event.type)) {
        this.sendAlert(event);
      }

    } catch (error) {
      console.error('Failed to log security event:', error);
      // Re-add to queue for retry
      this.queue.unshift(event);
    }

    // Process next event
    setTimeout(() => this.processQueue(), 100);
  }

  /**
   * Check if event is critical
   */
  isCriticalEvent(eventType) {
    const criticalEvents = [
      'master_login_failed',
      'master_login_failed_attempt',
      'security_check_failed',
      'unauthorized_access',
      'session_hijack_attempt',
      'brute_force_detected',
      'suspicious_activity'
    ];
    
    return criticalEvents.includes(eventType);
  }

  /**
   * Check if event should trigger alert
   */
  shouldAlert(eventType) {
    const alertEvents = [
      'master_login_success',
      'master_login_failed',
      'brute_force_detected',
      'unauthorized_access',
      'suspicious_activity',
      'system_breach_attempt'
    ];

    return alertEvents.includes(eventType);
  }

  /**
   * Send Alert (placeholder for push notifications)
   */
  async sendAlert(event) {
    // TODO: Implement push notification service
    console.log('🚨 Security Alert:', event);
    
    // For now, store alerts in a special collection
    try {
      await push(ref(this.db, 'security_alerts'), {
        ...event,
        alert: true,
        acknowledged: false
      });
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }

  /**
   * Get Recent Events
   */
  async getRecentEvents(limit = 100) {
    try {
      const snapshot = await get(
        query(
          ref(this.db, 'security_logs'),
          orderByChild('timestamp'),
          limitToLast(limit)
        )
      );

      if (snapshot.exists()) {
        const events = [];
        snapshot.forEach((child) => {
          events.unshift({
            id: child.key,
            ...child.val()
          });
        });
        return events;
      }

      return [];
    } catch (error) {
      console.error('Failed to get recent events:', error);
      return [];
    }
  }
}

// Export singleton instance
const securityLogger = new SecurityLogger();

// Export convenience function
export const logSecurityEvent = (type, data) => {
  return securityLogger.logEvent(type, data);
};

export default securityLogger;