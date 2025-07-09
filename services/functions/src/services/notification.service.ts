import * as admin from 'firebase-admin';
import { Twilio } from 'twilio';
import * as nodemailer from 'nodemailer';
import { logger } from 'firebase-functions';
import { NotificationType, NotificationChannel, NotificationPriority } from '@eatech/types';

interface NotificationPayload {
  type: NotificationType;
  recipient: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: NotificationPriority;
  truckId?: string;
  orderId?: string;
}

interface EscalationStep {
  delay: number; // minutes
  channel: NotificationChannel;
  recipient: string;
}

export class NotificationService {
  private twilioClient: Twilio;
  private emailTransporter: nodemailer.Transporter;
  private db = admin.firestore();
  private messaging = admin.messaging();

  constructor() {
    // Initialize Twilio
    this.twilioClient = new Twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    // Initialize Email (using SendGrid)
    this.emailTransporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY!
      }
    });
  }

  /**
   * Send notification through specified channel
   */
  async send(payload: NotificationPayload): Promise<void> {
    try {
      switch (payload.channel) {
        case 'push':
          await this.sendPushNotification(payload);
          break;
        case 'sms':
          await this.sendSMS(payload);
          break;
        case 'email':
          await this.sendEmail(payload);
          break;
        default:
          throw new Error(`Unsupported channel: ${payload.channel}`);
      }

      // Log notification
      await this.logNotification(payload);
    } catch (error) {
      logger.error('Failed to send notification', { payload, error });
      throw error;
    }
  }

  /**
   * Send push notification via FCM
   */
  private async sendPushNotification(payload: NotificationPayload): Promise<void> {
    const tokens = await this.getFCMTokens(payload.recipient);
    
    if (tokens.length === 0) {
      logger.warn('No FCM tokens found for recipient', { recipient: payload.recipient });
      return;
    }

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body
      },
      data: {
        ...payload.data,
        type: payload.type,
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      },
      android: {
        priority: payload.priority === 'high' ? 'high' : 'normal',
        notification: {
          sound: 'default',
          channelId: 'eatech_notifications'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await this.messaging.sendMulticast(message);
    
    // Remove invalid tokens
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error?.code === 'messaging/invalid-registration-token') {
          failedTokens.push(tokens[idx]);
        }
      });
      
      if (failedTokens.length > 0) {
        await this.removeInvalidTokens(payload.recipient, failedTokens);
      }
    }
  }

  /**
   * Send SMS via Twilio
   */
  private async sendSMS(payload: NotificationPayload): Promise<void> {
    const phoneNumber = await this.getPhoneNumber(payload.recipient);
    
    if (!phoneNumber) {
      throw new Error('No phone number found for recipient');
    }

    await this.twilioClient.messages.create({
      body: `${payload.title}\n${payload.body}`,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER!
    });
  }

  /**
   * Send email
   */
  private async sendEmail(payload: NotificationPayload): Promise<void> {
    const email = await this.getEmail(payload.recipient);
    
    if (!email) {
      throw new Error('No email found for recipient');
    }

    const mailOptions = {
      from: '"Eatech" <noreply@eatech.ch>',
      to: email,
      subject: payload.title,
      html: this.generateEmailTemplate(payload)
    };

    await this.emailTransporter.sendMail(mailOptions);
  }

  /**
   * Handle temperature alert escalation
   */
  async handleTemperatureAlert(
    truckId: string,
    reading: any,
    location: string
  ): Promise<void> {
    const alert = {
      id: this.generateAlertId(),
      truckId,
      type: 'temperature',
      severity: reading.value > 8 ? 'warning' : 'critical',
      reading,
      location,
      createdAt: new Date(),
      escalationSteps: []
    };

    // Step 1: Immediate push to truck
    await this.send({
      type: 'temperature_alert',
      recipient: truckId,
      channel: 'push',
      title: '⚠️ Temperatur-Warnung',
      body: `${location}: ${reading.value}°C`,
      data: { alertId: alert.id },
      priority: 'high',
      truckId
    });

    // Schedule escalations
    const escalationSteps: EscalationStep[] = [
      { delay: 10, channel: 'sms', recipient: truckId },
      { delay: 20, channel: 'push', recipient: 'master_admin' },
      { delay: 30, channel: 'email', recipient: 'master_admin' }
    ];

    for (const step of escalationSteps) {
      setTimeout(async () => {
        const alertStatus = await this.getAlertStatus(alert.id);
        if (!alertStatus.acknowledged) {
          await this.escalateAlert(alert, step);
        }
      }, step.delay * 60 * 1000);
    }

    // Save alert
    await this.db.collection('alerts').doc(alert.id).set(alert);
  }

  /**
   * Handle order not processed
   */
  async handleOrderNotProcessed(orderId: string, truckId: string): Promise<void> {
    const escalationSteps = [
      { delay: 5, action: 'increase_sound' },
      { delay: 10, action: 'push_notification' },
      { delay: 15, action: 'customer_notification' }
    ];

    for (const step of escalationSteps) {
      setTimeout(async () => {
        const order = await this.getOrder(orderId);
        if (order.status === 'pending') {
          switch (step.action) {
            case 'increase_sound':
              await this.increaseKitchenAlertVolume(truckId);
              break;
            case 'push_notification':
              await this.send({
                type: 'order_not_processed',
                recipient: truckId,
                channel: 'push',
                title: '🚨 Bestellung nicht bearbeitet',
                body: `Bestellung ${order.dailyOrderNumber} wartet seit ${step.delay} Minuten`,
                priority: 'high',
                truckId,
                orderId
              });
              break;
            case 'customer_notification':
              await this.notifyCustomerDelay(orderId);
              break;
          }
        }
      }, step.delay * 60 * 1000);
    }
  }

  /**
   * Send smart notifications
   */
  async sendSmartNotification(customerId: string, truckId: string): Promise<void> {
    const customerPrefs = await this.getCustomerPreferences(customerId);
    const truckData = await this.getTruckData(truckId);

    // "Dein Lieblingsburger ist wieder da!"
    if (customerPrefs.favoriteProducts) {
      const availableFavorites = customerPrefs.favoriteProducts.filter(
        productId => truckData.products[productId]?.available
      );

      if (availableFavorites.length > 0) {
        await this.send({
          type: 'favorite_available',
          recipient: customerId,
          channel: 'push',
          title: '🍔 Dein Lieblingsessen ist wieder da!',
          body: `${truckData.name} hat wieder ${availableFavorites[0].name} im Angebot!`,
          data: {
            truckId,
            productId: availableFavorites[0].id
          }
        });
      }
    }

    // "Truck kommt morgen in deine Nähe"
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tomorrowLocations = await this.getTruckLocationsForDate(truckId, tomorrow);
    const nearbyLocations = this.filterNearbyLocations(
      tomorrowLocations,
      customerPrefs.lastOrderLocation
    );

    if (nearbyLocations.length > 0) {
      await this.send({
        type: 'truck_nearby_tomorrow',
        recipient: customerId,
        channel: 'push',
        title: '📍 Food Truck in deiner Nähe',
        body: `${truckData.name} kommt morgen zu: ${nearbyLocations[0].address}`,
        data: {
          truckId,
          locationId: nearbyLocations[0].id,
          date: tomorrow.toISOString()
        }
      });
    }
  }

  /**
   * Notify about maintenance needs
   */
  async notifyMaintenanceNeeded(
    truckId: string,
    equipment: string,
    reason: string
  ): Promise<void> {
    await this.send({
      type: 'maintenance_needed',
      recipient: truckId,
      channel: 'push',
      title: '🔧 Wartung erforderlich',
      body: `${equipment}: ${reason}`,
      data: {
        equipment,
        reason,
        priority: 'medium'
      },
      truckId
    });
  }

  /**
   * Helper methods
   */
  private async getFCMTokens(recipient: string): Promise<string[]> {
    const doc = await this.db.collection('users').doc(recipient).get();
    return doc.data()?.fcmTokens || [];
  }

  private async getPhoneNumber(recipient: string): Promise<string | null> {
    const doc = await this.db.collection('users').doc(recipient).get();
    return doc.data()?.phoneNumber || null;
  }

  private async getEmail(recipient: string): Promise<string | null> {
    const doc = await this.db.collection('users').doc(recipient).get();
    return doc.data()?.email || null;
  }

  private generateEmailTemplate(payload: NotificationPayload): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #DA291C; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f5f5f5; }
            .footer { text-align: center; padding: 20px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Eatech</h1>
            </div>
            <div class="content">
              <h2>${payload.title}</h2>
              <p>${payload.body}</p>
              ${payload.data?.actionUrl ? `
                <p style="text-align: center; margin-top: 30px;">
                  <a href="${payload.data.actionUrl}" 
                     style="background-color: #DA291C; color: white; padding: 12px 24px; 
                            text-decoration: none; border-radius: 5px; display: inline-block;">
                    Jetzt ansehen
                  </a>
                </p>
              ` : ''}
            </div>
            <div class="footer">
              <p>© 2024 Eatech. Alle Rechte vorbehalten.</p>
              <p><a href="https://eatech.ch/unsubscribe">Abmelden</a></p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async logNotification(payload: NotificationPayload): Promise<void> {
    await this.db.collection('notification_logs').add({
      ...payload,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      success: true
    });
  }

  private async removeInvalidTokens(userId: string, tokens: string[]): Promise<void> {
    const userRef = this.db.collection('users').doc(userId);
    await userRef.update({
      fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokens)
    });
  }

  private filterNearbyLocations(locations: any[], userLocation: any): any[] {
    // Simple distance calculation (can be improved with proper geolocation)
    const MAX_DISTANCE_KM = 5;
    
    return locations.filter(location => {
      const distance = this.calculateDistance(
        userLocation.lat,
        userLocation.lng,
        location.coordinates.lat,
        location.coordinates.lng
      );
      return distance <= MAX_DISTANCE_KM;
    });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private async getAlertStatus(alertId: string): Promise<any> {
    const doc = await this.db.collection('alerts').doc(alertId).get();
    return doc.data();
  }

  private async escalateAlert(alert: any, step: EscalationStep): Promise<void> {
    await this.send({
      type: 'alert_escalation',
      recipient: step.recipient,
      channel: step.channel,
      title: '🚨 ESKALATION: Temperatur-Alarm',
      body: `Truck: ${alert.truckId}\nStandort: ${alert.location}\nWert: ${alert.reading.value}°C\nSeit: ${step.delay} Minuten`,
      priority: 'high',
      data: {
        alertId: alert.id,
        escalationLevel: step.delay
      }
    });

    // Update alert with escalation info
    await this.db.collection('alerts').doc(alert.id).update({
      escalationSteps: admin.firestore.FieldValue.arrayUnion({
        time: step.delay,
        channel: step.channel,
        recipient: step.recipient,
        sentAt: new Date()
      })
    });
  }

  private async getOrder(orderId: string): Promise<any> {
    const doc = await this.db.collection('orders').doc(orderId).get();
    return doc.data();
  }

  private async increaseKitchenAlertVolume(truckId: string): Promise<void> {
    // Send real-time update to kitchen display
    await this.db.collection('kitchen_updates').doc(truckId).update({
      alertVolume: 'high',
      flashScreen: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  private async notifyCustomerDelay(orderId: string): Promise<void> {
    const order = await this.getOrder(orderId);
    
    await this.send({
      type: 'order_delayed',
      recipient: order.customerId,
      channel: 'push',
      title: '⏱️ Ihre Bestellung verzögert sich',
      body: 'Ihre Bestellung benötigt etwas mehr Zeit. Wir bitten um Verständnis.',
      data: {
        orderId,
        orderNumber: order.dailyOrderNumber,
        refundAvailable: true
      }
    });
  }

  private async getCustomerPreferences(customerId: string): Promise<any> {
    const doc = await this.db.collection('customer_preferences').doc(customerId).get();
    return doc.data() || {};
  }

  private async getTruckData(truckId: string): Promise<any> {
    const doc = await this.db.collection('foodtrucks').doc(truckId).get();
    return doc.data();
  }

  private async getTruckLocationsForDate(truckId: string, date: Date): Promise<any[]> {
    const snapshot = await this.db
      .collection(`foodtrucks/${truckId}/locations`)
      .where('date', '==', date.toISOString().split('T')[0])
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
