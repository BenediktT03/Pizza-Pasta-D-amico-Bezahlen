import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { 
  Location,
  LocationSchedule,
  LocationType,
  Coordinates,
  LocationStatus
} from '@eatech/types';
import { notificationService } from './notification.service';

interface CreateLocationParams {
  truckId: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  type: LocationType;
  schedule?: LocationSchedule;
  description?: string;
  parkingInstructions?: string;
}

interface NearbySearchParams {
  coordinates: Coordinates;
  radiusKm: number;
  limit?: number;
}

interface LocationUpdate {
  isActive?: boolean;
  schedule?: LocationSchedule;
  temporaryClosure?: {
    reason: string;
    until: Date;
  };
}

export class LocationService {
  private db = admin.firestore();
  
  // Configuration
  private readonly MAX_LOCATIONS_PER_DAY = 20;
  private readonly MAX_RADIUS_KM = 50;
  private readonly DEFAULT_RADIUS_KM = 5;
  private readonly MAX_ADVANCE_BOOKING_DAYS = 30;

  /**
   * Create new location for truck
   */
  async createLocation(params: CreateLocationParams): Promise<Location> {
    try {
      // Validate location
      await this.validateLocation(params);

      const locationId = this.generateLocationId();
      const location: Location = {
        id: locationId,
        truckId: params.truckId,
        name: params.name,
        address: params.address,
        coordinates: params.coordinates,
        type: params.type,
        schedule: params.schedule || this.getDefaultSchedule(),
        description: params.description,
        parkingInstructions: params.parkingInstructions,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Geohash for efficient querying
        geohash: this.generateGeohash(params.coordinates)
      };

      // Save to Firestore
      await this.db
        .collection(`foodtrucks/${params.truckId}/locations`)
        .doc(locationId)
        .set(location);

      // Add to location index for searching
      await this.addToLocationIndex(location);

      // Notify nearby customers if location is active today
      if (this.isActiveToday(location.schedule)) {
        await this.notifyNearbyCustomers(location);
      }

      return location;
    } catch (error) {
      logger.error('Failed to create location', { params, error });
      throw error;
    }
  }

  /**
   * Update truck's current location
   */
  async updateCurrentLocation(
    truckId: string,
    locationId: string
  ): Promise<void> {
    try {
      // Deactivate all other locations
      const batch = this.db.batch();
      
      const locationsSnapshot = await this.db
        .collection(`foodtrucks/${truckId}/locations`)
        .where('isActive', '==', true)
        .get();

      locationsSnapshot.docs.forEach(doc => {
        if (doc.id !== locationId) {
          batch.update(doc.ref, {
            isActive: false,
            deactivatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      });

      // Activate new location
      const newLocationRef = this.db
        .collection(`foodtrucks/${truckId}/locations`)
        .doc(locationId);

      batch.update(newLocationRef, {
        isActive: true,
        activatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastActiveAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update truck's current location
      const truckRef = this.db.collection('foodtrucks').doc(truckId);
      batch.update(truckRef, {
        currentLocationId: locationId,
        lastLocationUpdate: admin.firestore.FieldValue.serverTimestamp()
      });

      await batch.commit();

      // Update live tracking
      await this.updateLiveTracking(truckId, locationId);

      // Notify customers
      const location = await this.getLocation(truckId, locationId);
      await this.notifyLocationChange(truckId, location);
    } catch (error) {
      logger.error('Failed to update current location', { truckId, locationId, error });
      throw error;
    }
  }

  /**
   * Find trucks near coordinates
   */
  async findNearbyTrucks(params: NearbySearchParams): Promise<any[]> {
    try {
      const radiusKm = Math.min(params.radiusKm || this.DEFAULT_RADIUS_KM, this.MAX_RADIUS_KM);
      
      // Calculate bounding box for initial query
      const bounds = this.calculateBounds(params.coordinates, radiusKm);
      
      // Query location index
      const snapshot = await this.db
        .collection('location_index')
        .where('coordinates.lat', '>=', bounds.minLat)
        .where('coordinates.lat', '<=', bounds.maxLat)
        .where('isActive', '==', true)
        .limit(params.limit || 50)
        .get();

      // Filter by precise distance and longitude
      const results = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(loc => {
          return loc.coordinates.lng >= bounds.minLng &&
                 loc.coordinates.lng <= bounds.maxLng &&
                 this.calculateDistance(params.coordinates, loc.coordinates) <= radiusKm;
        })
        .sort((a, b) => {
          const distA = this.calculateDistance(params.coordinates, a.coordinates);
          const distB = this.calculateDistance(params.coordinates, b.coordinates);
          return distA - distB;
        });

      // Enhance with truck data
      const enhancedResults = await Promise.all(
        results.map(async (location) => {
          const truck = await this.getTruckBasicInfo(location.truckId);
          return {
            ...location,
            distance: this.calculateDistance(params.coordinates, location.coordinates),
            truck: {
              name: truck.name,
              logo: truck.branding?.logo,
              cuisine: truck.cuisine,
              rating: truck.rating
            }
          };
        })
      );

      return enhancedResults;
    } catch (error) {
      logger.error('Failed to find nearby trucks', { params, error });
      throw error;
    }
  }

  /**
   * Schedule future locations
   */
  async scheduleFutureLocation(
    truckId: string,
    locationId: string,
    date: Date,
    customSchedule?: any
  ): Promise<void> {
    try {
      // Validate scheduling
      const now = new Date();
      const maxDate = new Date(now.getTime() + this.MAX_ADVANCE_BOOKING_DAYS * 24 * 60 * 60 * 1000);
      
      if (date < now) {
        throw new Error('Cannot schedule locations in the past');
      }
      
      if (date > maxDate) {
        throw new Error(`Cannot schedule more than ${this.MAX_ADVANCE_BOOKING_DAYS} days in advance`);
      }

      // Check daily limit
      const dateStr = date.toISOString().split('T')[0];
      const existingCount = await this.getScheduledLocationCount(truckId, dateStr);
      
      if (existingCount >= this.MAX_LOCATIONS_PER_DAY) {
        throw new Error(`Maximum ${this.MAX_LOCATIONS_PER_DAY} locations per day`);
      }

      // Create schedule entry
      const scheduleEntry = {
        id: this.generateScheduleId(),
        truckId,
        locationId,
        date: dateStr,
        schedule: customSchedule || (await this.getLocation(truckId, locationId)).schedule,
        status: 'scheduled',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await this.db
        .collection(`foodtrucks/${truckId}/location_schedule`)
        .doc(scheduleEntry.id)
        .set(scheduleEntry);

      // Set reminder
      await this.scheduleLocationReminder(truckId, locationId, date);

      // Notify followers about upcoming location
      await this.notifyUpcomingLocation(truckId, locationId, date);
    } catch (error) {
      logger.error('Failed to schedule location', { truckId, locationId, date, error });
      throw error;
    }
  }

  /**
   * Get location schedule for date range
   */
  async getLocationSchedule(
    truckId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    try {
      const snapshot = await this.db
        .collection(`foodtrucks/${truckId}/location_schedule`)
        .where('date', '>=', startDate.toISOString().split('T')[0])
        .where('date', '<=', endDate.toISOString().split('T')[0])
        .orderBy('date')
        .get();

      const schedule = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();
          const location = await this.getLocation(truckId, data.locationId);
          return {
            id: doc.id,
            ...data,
            location
          };
        })
      );

      return schedule;
    } catch (error) {
      logger.error('Failed to get location schedule', { truckId, startDate, endDate, error });
      throw error;
    }
  }

  /**
   * Check if truck is at announced location
   */
  async verifyTruckAtLocation(
    truckId: string,
    expectedLocationId: string
  ): Promise<boolean> {
    try {
      const truck = await this.getTruckBasicInfo(truckId);
      
      if (!truck.currentLocationId || truck.currentLocationId !== expectedLocationId) {
        // Truck not at expected location
        const minutesSinceExpected = this.getMinutesSinceExpected(truck.lastLocationUpdate);
        
        if (minutesSinceExpected > 15) {
          // Mark as not at location
          await this.handleTruckNotAtLocation(truckId, expectedLocationId);
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Failed to verify truck location', { truckId, expectedLocationId, error });
      return false;
    }
  }

  /**
   * Update location with temporary closure
   */
  async setTemporaryClosure(
    truckId: string,
    locationId: string,
    reason: string,
    until: Date
  ): Promise<void> {
    try {
      await this.db
        .collection(`foodtrucks/${truckId}/locations`)
        .doc(locationId)
        .update({
          temporaryClosure: {
            active: true,
            reason,
            until,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          },
          isActive: false
        });

      // Cancel scheduled visits
      await this.cancelScheduledVisits(truckId, locationId, new Date(), until);

      // Notify affected customers
      await this.notifyTemporaryClosure(truckId, locationId, reason, until);
    } catch (error) {
      logger.error('Failed to set temporary closure', { truckId, locationId, reason, error });
      throw error;
    }
  }

  /**
   * Get popular locations for truck
   */
  async getPopularLocations(truckId: string, limit: number = 5): Promise<any[]> {
    try {
      // Aggregate order data by location
      const ordersSnapshot = await this.db
        .collection(`foodtrucks/${truckId}/orders`)
        .where('completedAt', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .get();

      const locationStats: Record<string, { orders: number; revenue: number }> = {};

      ordersSnapshot.docs.forEach(doc => {
        const order = doc.data();
        if (order.locationId) {
          if (!locationStats[order.locationId]) {
            locationStats[order.locationId] = { orders: 0, revenue: 0 };
          }
          locationStats[order.locationId].orders++;
          locationStats[order.locationId].revenue += order.totalAmount;
        }
      });

      // Sort by orders and get top locations
      const topLocationIds = Object.entries(locationStats)
        .sort(([, a], [, b]) => b.orders - a.orders)
        .slice(0, limit)
        .map(([locationId]) => locationId);

      // Get location details
      const locations = await Promise.all(
        topLocationIds.map(async (locationId) => {
          const location = await this.getLocation(truckId, locationId);
          return {
            ...location,
            stats: locationStats[locationId]
          };
        })
      );

      return locations;
    } catch (error) {
      logger.error('Failed to get popular locations', { truckId, error });
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private async validateLocation(params: CreateLocationParams): Promise<void> {
    // Validate coordinates
    if (Math.abs(params.coordinates.lat) > 90 || Math.abs(params.coordinates.lng) > 180) {
      throw new Error('Invalid coordinates');
    }

    // Validate Swiss coordinates (rough bounds)
    if (params.coordinates.lat < 45.8 || params.coordinates.lat > 47.8 ||
        params.coordinates.lng < 5.9 || params.coordinates.lng > 10.5) {
      logger.warn('Location outside Switzerland', params.coordinates);
    }

    // Check for duplicate locations
    const existing = await this.db
      .collection(`foodtrucks/${params.truckId}/locations`)
      .where('address', '==', params.address)
      .limit(1)
      .get();

    if (!existing.empty) {
      throw new Error('Location with this address already exists');
    }
  }

  private generateLocationId(): string {
    return `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateScheduleId(): string {
    return `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateGeohash(coordinates: Coordinates): string {
    // Simple geohash implementation (would use proper library)
    const lat = Math.round(coordinates.lat * 1000) / 1000;
    const lng = Math.round(coordinates.lng * 1000) / 1000;
    return `${lat},${lng}`;
  }

  private getDefaultSchedule(): LocationSchedule {
    return {
      monday: { open: '11:00', close: '14:00' },
      tuesday: { open: '11:00', close: '14:00' },
      wednesday: { open: '11:00', close: '14:00' },
      thursday: { open: '11:00', close: '14:00' },
      friday: { open: '11:00', close: '14:00' },
      saturday: { closed: true },
      sunday: { closed: true }
    };
  }

  private isActiveToday(schedule: LocationSchedule): boolean {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todaySchedule = schedule[today as keyof LocationSchedule];
    return todaySchedule && !todaySchedule.closed;
  }

  private calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(coord2.lat - coord1.lat);
    const dLon = this.toRad(coord2.lng - coord1.lng);
    const lat1 = this.toRad(coord1.lat);
    const lat2 = this.toRad(coord2.lat);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private calculateBounds(center: Coordinates, radiusKm: number): any {
    const latDelta = radiusKm / 111; // ~111km per degree latitude
    const lngDelta = radiusKm / (111 * Math.cos(this.toRad(center.lat)));

    return {
      minLat: center.lat - latDelta,
      maxLat: center.lat + latDelta,
      minLng: center.lng - lngDelta,
      maxLng: center.lng + lngDelta
    };
  }

  private async addToLocationIndex(location: Location): Promise<void> {
    await this.db.collection('location_index').doc(location.id).set({
      truckId: location.truckId,
      name: location.name,
      address: location.address,
      coordinates: location.coordinates,
      geohash: location.geohash,
      type: location.type,
      isActive: location.isActive,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  private async updateLiveTracking(truckId: string, locationId: string): Promise<void> {
    const location = await this.getLocation(truckId, locationId);
    
    await this.db.collection('live_tracking').doc(truckId).set({
      locationId,
      coordinates: location.coordinates,
      address: location.address,
      lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
      isOpen: true
    });
  }

  private async notifyNearbyCustomers(location: Location): Promise<void> {
    // Get customers who have ordered from this truck before
    const customersSnapshot = await this.db
      .collection(`foodtrucks/${location.truckId}/customers`)
      .where('lastOrderLocation', 'near', location.coordinates)
      .limit(100)
      .get();

    const notifications = customersSnapshot.docs.map(doc => {
      const customer = doc.data();
      return notificationService.send({
        type: 'truck_nearby',
        recipient: customer.id,
        channel: 'push',
        title: '🚚 Food Truck in der Nähe!',
        body: `${location.name} ist jetzt am ${location.address}`,
        data: {
          truckId: location.truckId,
          locationId: location.id
        }
      });
    });

    await Promise.all(notifications);
  }

  private async notifyLocationChange(truckId: string, location: any): Promise<void> {
    // Notify customers with pending orders
    const pendingOrders = await this.db
      .collection(`foodtrucks/${truckId}/orders`)
      .where('status', 'in', ['pending', 'preparing'])
      .get();

    if (!pendingOrders.empty) {
      const notifications = pendingOrders.docs.map(doc => {
        const order = doc.data();
        return notificationService.send({
          type: 'location_changed',
          recipient: order.customerPhone,
          channel: 'sms',
          title: 'Standort geändert',
          body: `Der Food Truck ist jetzt am ${location.address}`,
          data: {
            orderId: doc.id,
            newLocationId: location.id
          }
        });
      });

      await Promise.all(notifications);
    }
  }

  private async getLocation(truckId: string, locationId: string): Promise<any> {
    const doc = await this.db
      .collection(`foodtrucks/${truckId}/locations`)
      .doc(locationId)
      .get();
    
    if (!doc.exists) {
      throw new Error('Location not found');
    }
    
    return { id: doc.id, ...doc.data() };
  }

  private async getTruckBasicInfo(truckId: string): Promise<any> {
    const doc = await this.db.collection('foodtrucks').doc(truckId).get();
    if (!doc.exists) {
      throw new Error('Truck not found');
    }
    return doc.data();
  }

  private async getScheduledLocationCount(truckId: string, date: string): Promise<number> {
    const snapshot = await this.db
      .collection(`foodtrucks/${truckId}/location_schedule`)
      .where('date', '==', date)
      .count()
      .get();
    
    return snapshot.data().count;
  }

  private async scheduleLocationReminder(
    truckId: string,
    locationId: string,
    date: Date
  ): Promise<void> {
    // Schedule reminder 30 minutes before
    const reminderTime = new Date(date.getTime() - 30 * 60 * 1000);
    
    await this.db.collection('scheduled_reminders').add({
      type: 'location_reminder',
      truckId,
      locationId,
      scheduledFor: reminderTime,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  private async notifyUpcomingLocation(
    truckId: string,
    locationId: string,
    date: Date
  ): Promise<void> {
    const location = await this.getLocation(truckId, locationId);
    const truck = await this.getTruckBasicInfo(truckId);

    // Notify followers
    const followersSnapshot = await this.db
      .collection('customer_follows')
      .where('truckId', '==', truckId)
      .limit(500)
      .get();

    const notifications = followersSnapshot.docs.map(doc => {
      const follower = doc.data();
      return notificationService.send({
        type: 'truck_upcoming',
        recipient: follower.customerId,
        channel: 'push',
        title: `📅 ${truck.name} kommt!`,
        body: `Am ${date.toLocaleDateString('de-CH')} am ${location.address}`,
        data: {
          truckId,
          locationId,
          date: date.toISOString()
        }
      });
    });

    await Promise.all(notifications);
  }

  private getMinutesSinceExpected(lastUpdate: any): number {
    if (!lastUpdate) return Infinity;
    const now = new Date();
    const last = lastUpdate.toDate ? lastUpdate.toDate() : new Date(lastUpdate);
    return Math.floor((now.getTime() - last.getTime()) / (60 * 1000));
  }

  private async handleTruckNotAtLocation(
    truckId: string,
    expectedLocationId: string
  ): Promise<void> {
    // Mark location as inactive
    await this.db
      .collection(`foodtrucks/${truckId}/locations`)
      .doc(expectedLocationId)
      .update({
        isActive: false,
        notAtLocation: true,
        notAtLocationSince: admin.firestore.FieldValue.serverTimestamp()
      });

    // Update truck status
    await this.db.collection('foodtrucks').doc(truckId).update({
      isOpen: false,
      notAtAnnouncedLocation: true
    });

    // Notify customers with orders
    const ordersSnapshot = await this.db
      .collection(`foodtrucks/${truckId}/orders`)
      .where('status', 'in', ['pending', 'preparing'])
      .where('locationId', '==', expectedLocationId)
      .get();

    const notifications = ordersSnapshot.docs.map(doc => {
      const order = doc.data();
      return notificationService.send({
        type: 'truck_not_at_location',
        recipient: order.customerPhone,
        channel: 'push',
        title: '⚠️ Food Truck nicht am Standort',
        body: 'Der Food Truck ist nicht am angekündigten Standort. Ihre Bestellung wird storniert.',
        data: {
          orderId: doc.id,
          refundAvailable: true
        },
        priority: 'high'
      });
    });

    await Promise.all(notifications);

    // Process refunds
    for (const doc of ordersSnapshot.docs) {
      const order = doc.data();
      if (order.paymentIntentId && order.paymentStatus === 'paid') {
        await this.processAutomaticRefund(order);
      }
    }
  }

  private async cancelScheduledVisits(
    truckId: string,
    locationId: string,
    from: Date,
    until: Date
  ): Promise<void> {
    const snapshot = await this.db
      .collection(`foodtrucks/${truckId}/location_schedule`)
      .where('locationId', '==', locationId)
      .where('date', '>=', from.toISOString().split('T')[0])
      .where('date', '<=', until.toISOString().split('T')[0])
      .get();

    const batch = this.db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        status: 'cancelled',
        cancelReason: 'temporary_closure',
        cancelledAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
  }

  private async notifyTemporaryClosure(
    truckId: string,
    locationId: string,
    reason: string,
    until: Date
  ): Promise<void> {
    const location = await this.getLocation(truckId, locationId);
    const truck = await this.getTruckBasicInfo(truckId);

    // Notify customers with upcoming orders
    const ordersSnapshot = await this.db
      .collection(`foodtrucks/${truckId}/orders`)
      .where('locationId', '==', locationId)
      .where('scheduledFor', '>=', new Date())
      .where('scheduledFor', '<=', until)
      .get();

    const notifications = ordersSnapshot.docs.map(doc => {
      const order = doc.data();
      return notificationService.send({
        type: 'location_closed',
        recipient: order.customerPhone,
        channel: 'push',
        title: '🚫 Standort vorübergehend geschlossen',
        body: `${truck.name} am ${location.address}: ${reason}`,
        data: {
          orderId: doc.id,
          closedUntil: until.toISOString()
        }
      });
    });

    await Promise.all(notifications);
  }

  private async processAutomaticRefund(order: any): Promise<void> {
    // This would integrate with PaymentService
    logger.info('Automatic refund would be processed', { orderId: order.id });
  }
}

// Export singleton instance
export const locationService = new LocationService();
