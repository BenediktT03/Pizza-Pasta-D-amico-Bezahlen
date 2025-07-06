/**
 * EATECH - Location Service
 * Version: 4.8.0
 * Description: Comprehensive Location Management Service mit Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/mobile/src/services/LocationService.js
 * 
 * Features: GPS tracking, geofencing, proximity detection, background location
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { EventEmitter } from 'events';

// Lazy loaded utilities
const geoUtils = () => import('../utils/GeoUtils');
const storageUtils = () => import('../utils/StorageUtils');
const analyticsUtils = () => import('../utils/AnalyticsUtils');
const networkUtils = () => import('../utils/NetworkUtils');

// Lazy loaded services
const proximityService = () => import('./ProximityService');
const foodtruckService = () => import('./FoodtruckService');
const cacheService = () => import('./CacheService');
const syncService = () => import('./SyncService');

// Background location task
const LOCATION_TASK_NAME = 'background-location-task';
const GEOFENCE_TASK_NAME = 'background-geofence-task';

// Location accuracy levels
export const ACCURACY_LEVELS = {
  LOWEST: Location.Accuracy.Lowest,
  LOW: Location.Accuracy.Low,
  BALANCED: Location.Accuracy.Balanced,
  HIGH: Location.Accuracy.High,
  HIGHEST: Location.Accuracy.Highest,
  BEST_FOR_NAVIGATION: Location.Accuracy.BestForNavigation
};

// Update intervals (milliseconds)
export const UPDATE_INTERVALS = {
  REALTIME: 5000,      // 5 seconds
  FREQUENT: 30000,     // 30 seconds
  NORMAL: 60000,       // 1 minute
  BATTERY_SAVER: 300000, // 5 minutes
  BACKGROUND: 600000   // 10 minutes
};

// Distance intervals (meters)
export const DISTANCE_INTERVALS = {
  PRECISE: 10,
  NORMAL: 50,
  COARSE: 200,
  CITY_BLOCK: 500
};

class LocationService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      accuracy: ACCURACY_LEVELS.BALANCED,
      timeInterval: UPDATE_INTERVALS.NORMAL,
      distanceInterval: DISTANCE_INTERVALS.NORMAL,
      enableBackground: false,
      enableGeofencing: true,
      enableCaching: true,
      enableAnalytics: true,
      maxCacheAge: 300000, // 5 minutes
      ...options
    };
    
    this.currentLocation = null;
    this.isTracking = false;
    this.isBackgroundEnabled = false;
    this.watchSubscription = null;
    this.geofences = new Map();
    this.locationHistory = [];
    this.lastUpdate = null;
    
    // Lazy loaded services
    this.proximityService = null;
    this.foodtruckService = null;
    this.cacheService = null;
    this.syncService = null;
    this.geoUtils = null;
    this.storageUtils = null;
    this.analyticsUtils = null;
    this.networkUtils = null;
    
    this.initializeLazyServices();
  }

  // ============================================================================
  // LAZY LOADING INITIALIZATION
  // ============================================================================
  async initializeLazyServices() {
    try {
      // Initialize utilities
      this.geoUtils = await geoUtils();
      this.storageUtils = await storageUtils();
      this.analyticsUtils = await analyticsUtils();
      this.networkUtils = await networkUtils();
      
      // Initialize services
      if (this.options.enableGeofencing) {
        const ProximityService = await proximityService();
        this.proximityService = new ProximityService.default();
      }
      
      const FoodtruckService = await foodtruckService();
      this.foodtruckService = new FoodtruckService.default();
      
      if (this.options.enableCaching) {
        const CacheService = await cacheService();
        this.cacheService = new CacheService.default('location_cache');
      }
      
      const SyncService = await syncService();
      this.syncService = new SyncService.default();
      
      this.emit('services_initialized');
    } catch (error) {
      console.error('Failed to initialize location services:', error);
      this.emit('service_error', error);
    }
  }

  // ============================================================================
  // PERMISSION MANAGEMENT
  // ============================================================================
  async requestPermissions() {
    try {
      // Request foreground permission
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        throw new Error('Foreground location permission denied');
      }
      
      // Request background permission if enabled
      if (this.options.enableBackground) {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        
        if (backgroundStatus === 'granted') {
          this.isBackgroundEnabled = true;
        } else {
          console.warn('Background location permission denied');
        }
      }
      
      // Track analytics
      if (this.analyticsUtils && this.options.enableAnalytics) {
        this.analyticsUtils.trackEvent('location_permission_granted', {
          foreground: foregroundStatus === 'granted',
          background: this.isBackgroundEnabled,
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        foreground: foregroundStatus === 'granted',
        background: this.isBackgroundEnabled
      };
    } catch (error) {
      console.error('Failed to request location permissions:', error);
      throw error;
    }
  }

  async checkPermissions() {
    try {
      const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
      const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
      
      return {
        foreground: foregroundStatus === 'granted',
        background: backgroundStatus === 'granted'
      };
    } catch (error) {
      console.error('Failed to check location permissions:', error);
      return { foreground: false, background: false };
    }
  }

  // ============================================================================
  // LOCATION TRACKING
  // ============================================================================
  async getCurrentLocation(options = {}) {
    try {
      const locationOptions = {
        accuracy: options.accuracy || this.options.accuracy,
        timeout: options.timeout || 10000,
        maximumAge: options.maximumAge || this.options.maxCacheAge,
        ...options
      };
      
      // Check cache first
      if (this.options.enableCaching && this.cacheService) {
        const cachedLocation = await this.cacheService.get('current_location');
        if (cachedLocation && this.isLocationFresh(cachedLocation)) {
          return cachedLocation;
        }
      }
      
      const location = await Location.getCurrentPositionAsync(locationOptions);
      
      // Process and cache location
      const processedLocation = await this.processLocation(location);
      
      if (this.options.enableCaching && this.cacheService) {
        await this.cacheService.set('current_location', processedLocation);
      }
      
      this.currentLocation = processedLocation;
      this.lastUpdate = new Date();
      
      this.emit('location_updated', processedLocation);
      
      return processedLocation;
    } catch (error) {
      console.error('Failed to get current location:', error);
      throw error;
    }
  }

  async startTracking(options = {}) {
    try {
      if (this.isTracking) {
        await this.stopTracking();
      }
      
      const trackingOptions = {
        accuracy: options.accuracy || this.options.accuracy,
        timeInterval: options.timeInterval || this.options.timeInterval,
        distanceInterval: options.distanceInterval || this.options.distanceInterval,
        ...options
      };
      
      this.watchSubscription = await Location.watchPositionAsync(
        trackingOptions,
        this.handleLocationUpdate.bind(this)
      );
      
      this.isTracking = true;
      
      // Setup background tracking if enabled
      if (this.isBackgroundEnabled && this.options.enableBackground) {
        await this.startBackgroundTracking();
      }
      
      // Setup geofencing if enabled
      if (this.options.enableGeofencing && this.proximityService) {
        await this.setupGeofences();
      }
      
      this.emit('tracking_started', trackingOptions);
      
      // Track analytics
      if (this.analyticsUtils && this.options.enableAnalytics) {
        this.analyticsUtils.trackEvent('location_tracking_started', {
          accuracy: trackingOptions.accuracy,
          timeInterval: trackingOptions.timeInterval,
          background: this.isBackgroundEnabled
        });
      }
      
    } catch (error) {
      console.error('Failed to start location tracking:', error);
      throw error;
    }
  }

  async stopTracking() {
    try {
      if (this.watchSubscription) {
        this.watchSubscription.remove();
        this.watchSubscription = null;
      }
      
      if (this.isBackgroundEnabled) {
        await this.stopBackgroundTracking();
      }
      
      this.isTracking = false;
      
      this.emit('tracking_stopped');
      
      // Track analytics
      if (this.analyticsUtils && this.options.enableAnalytics) {
        this.analyticsUtils.trackEvent('location_tracking_stopped', {
          duration: this.getTrackingDuration(),
          locations_captured: this.locationHistory.length
        });
      }
      
    } catch (error) {
      console.error('Failed to stop location tracking:', error);
    }
  }

  async handleLocationUpdate(location) {
    try {
      const processedLocation = await this.processLocation(location);
      
      this.currentLocation = processedLocation;
      this.lastUpdate = new Date();
      this.locationHistory.push({
        ...processedLocation,
        timestamp: this.lastUpdate
      });
      
      // Limit history size
      if (this.locationHistory.length > 100) {
        this.locationHistory = this.locationHistory.slice(-50);
      }
      
      // Update cache
      if (this.options.enableCaching && this.cacheService) {
        await this.cacheService.set('current_location', processedLocation);
        await this.cacheService.set('location_history', this.locationHistory);
      }
      
      // Check proximity to foodtrucks
      if (this.proximityService) {
        await this.checkFoodtruckProximity(processedLocation);
      }
      
      // Sync with backend if online
      if (this.networkUtils && await this.networkUtils.isOnline()) {
        this.syncLocationWithBackend(processedLocation);
      }
      
      this.emit('location_updated', processedLocation);
      
    } catch (error) {
      console.error('Failed to handle location update:', error);
      this.emit('location_error', error);
    }
  }

  // ============================================================================
  // BACKGROUND TRACKING
  // ============================================================================
  async startBackgroundTracking() {
    if (!this.isBackgroundEnabled) {
      throw new Error('Background location permission not granted');
    }
    
    try {
      // Define background location task
      await this.defineBackgroundTasks();
      
      // Start background location updates
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: UPDATE_INTERVALS.BACKGROUND,
        distanceInterval: DISTANCE_INTERVALS.COARSE,
        deferredUpdatesInterval: 60000,
        deferredUpdatesDistance: 500,
        foregroundService: {
          notificationTitle: 'EATECH verfolgt Ihren Standort',
          notificationBody: 'Um nahegelegene Foodtrucks zu finden',
          notificationColor: '#10B981'
        }
      });
      
      this.emit('background_tracking_started');
      
    } catch (error) {
      console.error('Failed to start background tracking:', error);
      throw error;
    }
  }

  async stopBackgroundTracking() {
    try {
      if (await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME)) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
      
      if (await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME)) {
        await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
      }
      
      this.emit('background_tracking_stopped');
      
    } catch (error) {
      console.error('Failed to stop background tracking:', error);
    }
  }

  async defineBackgroundTasks() {
    // Background location updates task
    TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
      if (error) {
        console.error('Background location task error:', error);
        return;
      }
      
      if (data) {
        const { locations } = data;
        
        // Process background locations
        locations.forEach(location => {
          this.handleBackgroundLocation(location);
        });
      }
    });
    
    // Geofence task
    TaskManager.defineTask(GEOFENCE_TASK_NAME, ({ data, error }) => {
      if (error) {
        console.error('Background geofence task error:', error);
        return;
      }
      
      if (data) {
        const { eventType, region } = data;
        this.handleGeofenceEvent(eventType, region);
      }
    });
  }

  async handleBackgroundLocation(location) {
    try {
      const processedLocation = await this.processLocation(location);
      
      // Store in cache for when app becomes active
      if (this.cacheService) {
        await this.cacheService.set('last_background_location', processedLocation);
      }
      
      // Check for important proximity events
      if (this.proximityService) {
        const nearbyFoodtrucks = await this.proximityService.checkProximity(
          processedLocation.coords.latitude,
          processedLocation.coords.longitude
        );
        
        if (nearbyFoodtrucks.length > 0) {
          // Send background notification
          this.sendProximityNotification(nearbyFoodtrucks);
        }
      }
      
    } catch (error) {
      console.error('Failed to handle background location:', error);
    }
  }

  // ============================================================================
  // GEOFENCING
  // ============================================================================
  async setupGeofences() {
    if (!this.proximityService || !this.foodtruckService) return;
    
    try {
      // Get active foodtrucks
      const activeFoodtrucks = await this.foodtruckService.getActiveFoodtrucks();
      
      // Create geofences for each foodtruck
      const geofenceRegions = activeFoodtrucks.map(foodtruck => ({
        identifier: `foodtruck_${foodtruck.id}`,
        latitude: foodtruck.location.latitude,
        longitude: foodtruck.location.longitude,
        radius: 500, // 500 meter radius
        notifyOnEnter: true,
        notifyOnExit: true
      }));
      
      if (geofenceRegions.length > 0) {
        await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, geofenceRegions);
        
        // Store geofences for reference
        geofenceRegions.forEach(region => {
          this.geofences.set(region.identifier, region);
        });
        
        this.emit('geofences_setup', geofenceRegions);
      }
      
    } catch (error) {
      console.error('Failed to setup geofences:', error);
    }
  }

  handleGeofenceEvent(eventType, region) {
    try {
      const geofence = this.geofences.get(region.identifier);
      
      if (geofence) {
        const event = {
          type: eventType, // 'enter' or 'exit'
          region: region,
          timestamp: new Date().toISOString()
        };
        
        this.emit('geofence_event', event);
        
        // Track analytics
        if (this.analyticsUtils && this.options.enableAnalytics) {
          this.analyticsUtils.trackEvent('geofence_event', event);
        }
        
        // Handle specific events
        if (eventType === Location.GeofencingEventType.Enter) {
          this.handleGeofenceEnter(region);
        } else if (eventType === Location.GeofencingEventType.Exit) {
          this.handleGeofenceExit(region);
        }
      }
      
    } catch (error) {
      console.error('Failed to handle geofence event:', error);
    }
  }

  async handleGeofenceEnter(region) {
    // User entered foodtruck area
    const foodtruckId = region.identifier.replace('foodtruck_', '');
    
    try {
      const foodtruck = await this.foodtruckService.getFoodtruckById(foodtruckId);
      
      if (foodtruck) {
        this.emit('foodtruck_entered', {
          foodtruck: foodtruck,
          region: region,
          timestamp: new Date().toISOString()
        });
        
        // Send notification
        this.sendEnterNotification(foodtruck);
      }
    } catch (error) {
      console.error('Failed to handle geofence enter:', error);
    }
  }

  async handleGeofenceExit(region) {
    // User left foodtruck area
    const foodtruckId = region.identifier.replace('foodtruck_', '');
    
    this.emit('foodtruck_exited', {
      foodtruckId: foodtruckId,
      region: region,
      timestamp: new Date().toISOString()
    });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  async processLocation(location) {
    const processedLocation = {
      ...location,
      timestamp: new Date().toISOString(),
      processed: true
    };
    
    // Add reverse geocoding if available
    if (this.geoUtils) {
      try {
        const address = await this.geoUtils.reverseGeocode(
          location.coords.latitude,
          location.coords.longitude
        );
        processedLocation.address = address;
      } catch (error) {
        console.warn('Failed to reverse geocode location:', error);
      }
    }
    
    return processedLocation;
  }

  isLocationFresh(location) {
    if (!location || !location.timestamp) return false;
    
    const age = Date.now() - new Date(location.timestamp).getTime();
    return age < this.options.maxCacheAge;
  }

  async checkFoodtruckProximity(location) {
    if (!this.proximityService) return;
    
    try {
      const nearbyFoodtrucks = await this.proximityService.checkProximity(
        location.coords.latitude,
        location.coords.longitude
      );
      
      if (nearbyFoodtrucks.length > 0) {
        this.emit('foodtrucks_nearby', {
          location: location,
          foodtrucks: nearbyFoodtrucks,
          count: nearbyFoodtrucks.length
        });
      }
      
    } catch (error) {
      console.error('Failed to check foodtruck proximity:', error);
    }
  }

  async syncLocationWithBackend(location) {
    if (!this.syncService) return;
    
    try {
      await this.syncService.syncLocation(location);
    } catch (error) {
      console.error('Failed to sync location with backend:', error);
      // Store for later sync
      if (this.cacheService) {
        await this.cacheService.addToQueue('location_sync', location);
      }
    }
  }

  sendProximityNotification(foodtrucks) {
    // Implementation would depend on notification service
    console.log(`${foodtrucks.length} foodtrucks nearby`, foodtrucks);
  }

  sendEnterNotification(foodtruck) {
    // Implementation would depend on notification service
    console.log(`Entered ${foodtruck.name} area`);
  }

  getTrackingDuration() {
    // Calculate tracking duration logic
    return Date.now() - (this.lastUpdate?.getTime() || Date.now());
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================
  async getLocationHistory(limit = 50) {
    if (this.locationHistory.length === 0 && this.cacheService) {
      try {
        const cachedHistory = await this.cacheService.get('location_history');
        if (cachedHistory) {
          this.locationHistory = cachedHistory;
        }
      } catch (error) {
        console.error('Failed to load location history from cache:', error);
      }
    }
    
    return this.locationHistory.slice(-limit);
  }

  async clearLocationHistory() {
    this.locationHistory = [];
    
    if (this.cacheService) {
      await this.cacheService.delete('location_history');
    }
  }

  getCurrentLocationSync() {
    return this.currentLocation;
  }

  isCurrentlyTracking() {
    return this.isTracking;
  }

  isBackgroundTrackingEnabled() {
    return this.isBackgroundEnabled;
  }

  getActiveGeofences() {
    return Array.from(this.geofences.values());
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================
  async cleanup() {
    try {
      await this.stopTracking();
      await this.stopBackgroundTracking();
      
      // Clear cache
      if (this.cacheService) {
        await this.cacheService.clear();
      }
      
      // Remove all listeners
      this.removeAllListeners();
      
    } catch (error) {
      console.error('Failed to cleanup location service:', error);
    }
  }
}

export default LocationService;