// /apps/mobile/src/services/location.service.ts

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';
import { apiService } from './api.service';

// Types
interface LocationCoordinates {
  lat: number;
  lng: number;
  altitude?: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

interface LocationData {
  coordinates: LocationCoordinates;
  address?: LocationAddress;
  timestamp: number;
  source: 'gps' | 'network' | 'cached';
}

interface LocationAddress {
  street?: string;
  streetNumber?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
  formattedAddress?: string;
}

interface GeofenceRegion {
  id: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
  notifyOnEnter?: boolean;
  notifyOnExit?: boolean;
  tenantId?: string;
  name?: string;
}

interface NearbyRestaurant {
  id: string;
  name: string;
  coordinates: LocationCoordinates;
  distance: number; // meters
  estimatedWalkTime: number; // minutes
  isOpen: boolean;
  rating?: number;
  cuisine?: string[];
}

interface LocationSettings {
  enabled: boolean;
  highAccuracy: boolean;
  backgroundTracking: boolean;
  geofencing: boolean;
  shareLocation: boolean;
  cacheLocation: boolean;
  updateInterval: number; // seconds
  maxAge: number; // seconds
  timeout: number; // seconds
}

// Task names for background location
const BACKGROUND_LOCATION_TASK = 'background-location-task';
const GEOFENCING_TASK = 'geofencing-task';

// Default settings
const DEFAULT_SETTINGS: LocationSettings = {
  enabled: true,
  highAccuracy: true,
  backgroundTracking: false,
  geofencing: true,
  shareLocation: true,
  cacheLocation: true,
  updateInterval: 60, // 1 minute
  maxAge: 300, // 5 minutes
  timeout: 10, // 10 seconds
};

class LocationService {
  private currentLocation: LocationData | null = null;
  private watchPositionSubscription: Location.LocationSubscription | null = null;
  private settings: LocationSettings = DEFAULT_SETTINGS;
  private geofenceRegions: Map<string, GeofenceRegion> = new Map();
  private isInitialized: boolean = false;
  private hasPermission: boolean = false;

  constructor() {
    this.loadSettings();
    this.loadGeofenceRegions();
  }

  // Initialize location services
  public async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) return this.hasPermission;

      // Load cached location first
      await this.loadCachedLocation();

      // Check and request permissions
      this.hasPermission = await this.requestPermissions();

      if (this.hasPermission) {
        // Get initial location
        await this.getCurrentLocation();

        // Start watching position if enabled
        if (this.settings.enabled) {
          await this.startWatchingPosition();
        }

        // Setup geofencing if enabled
        if (this.settings.geofencing) {
          await this.setupGeofencing();
        }
      }

      this.isInitialized = true;
      return this.hasPermission;

    } catch (error) {
      console.error('Error initializing location service:', error);
      return false;
    }
  }

  // Check current permission status
  public async checkPermission(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      this.hasPermission = status === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    }
  }

  // Request location permissions
  public async requestPermissions(): Promise<boolean> {
    try {
      // Request foreground permissions
      const foregroundPermission = await Location.requestForegroundPermissionsAsync();

      if (foregroundPermission.status !== 'granted') {
        console.warn('Foreground location permission denied');
        return false;
      }

      // Request background permissions if needed
      if (this.settings.backgroundTracking) {
        const backgroundPermission = await Location.requestBackgroundPermissionsAsync();

        if (backgroundPermission.status !== 'granted') {
          console.warn('Background location permission denied');
          this.settings.backgroundTracking = false;
          await this.saveSettings();
        }
      }

      this.hasPermission = true;
      return true;

    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  // Get current location
  public async getCurrentLocation(forceRefresh: boolean = false): Promise<LocationData> {
    try {
      if (!forceRefresh && this.currentLocation && this.isLocationFresh(this.currentLocation)) {
        return this.currentLocation;
      }

      if (!this.hasPermission) {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) {
          throw new Error('Location permission not granted');
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: this.settings.highAccuracy
          ? Location.Accuracy.BestForNavigation
          : Location.Accuracy.Balanced,
        maximumAge: this.settings.maxAge * 1000,
        timeout: this.settings.timeout * 1000,
      });

      const locationData: LocationData = {
        coordinates: {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          altitude: location.coords.altitude || undefined,
          accuracy: location.coords.accuracy || undefined,
          heading: location.coords.heading || undefined,
          speed: location.coords.speed || undefined,
        },
        timestamp: location.timestamp,
        source: 'gps',
      };

      // Reverse geocode to get address
      try {
        const address = await this.reverseGeocode(locationData.coordinates);
        locationData.address = address;
      } catch (error) {
        console.warn('Reverse geocoding failed:', error);
      }

      this.currentLocation = locationData;

      // Cache location
      if (this.settings.cacheLocation) {
        await this.cacheLocation(locationData);
      }

      // Send location to server if sharing is enabled
      if (this.settings.shareLocation) {
        await this.sendLocationToServer(locationData);
      }

      return locationData;

    } catch (error) {
      console.error('Error getting current location:', error);

      // Return cached location if available
      if (this.currentLocation) {
        return { ...this.currentLocation, source: 'cached' };
      }

      throw error;
    }
  }

  // Start watching position
  public async startWatchingPosition(): Promise<void> {
    try {
      if (!this.hasPermission) return;

      // Stop existing subscription
      await this.stopWatchingPosition();

      this.watchPositionSubscription = await Location.watchPositionAsync(
        {
          accuracy: this.settings.highAccuracy
            ? Location.Accuracy.BestForNavigation
            : Location.Accuracy.Balanced,
          timeInterval: this.settings.updateInterval * 1000,
          distanceInterval: 10, // 10 meters
        },
        (location) => {
          this.handleLocationUpdate(location);
        }
      );

      console.log('Started watching position');

    } catch (error) {
      console.error('Error starting position watch:', error);
    }
  }

  // Stop watching position
  public async stopWatchingPosition(): Promise<void> {
    if (this.watchPositionSubscription) {
      this.watchPositionSubscription.remove();
      this.watchPositionSubscription = null;
      console.log('Stopped watching position');
    }
  }

  // Handle location updates
  private async handleLocationUpdate(location: Location.LocationObject): Promise<void> {
    try {
      const locationData: LocationData = {
        coordinates: {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          altitude: location.coords.altitude || undefined,
          accuracy: location.coords.accuracy || undefined,
          heading: location.coords.heading || undefined,
          speed: location.coords.speed || undefined,
        },
        timestamp: location.timestamp,
        source: 'gps',
      };

      this.currentLocation = locationData;

      // Cache location
      if (this.settings.cacheLocation) {
        await this.cacheLocation(locationData);
      }

      // Send to server
      if (this.settings.shareLocation) {
        await this.sendLocationToServer(locationData);
      }

      // Check geofences
      await this.checkGeofences(locationData.coordinates);

    } catch (error) {
      console.error('Error handling location update:', error);
    }
  }

  // Reverse geocode coordinates to address
  public async reverseGeocode(coordinates: LocationCoordinates): Promise<LocationAddress> {
    try {
      const [result] = await Location.reverseGeocodeAsync({
        latitude: coordinates.lat,
        longitude: coordinates.lng,
      });

      if (!result) {
        throw new Error('No geocoding result');
      }

      return {
        street: result.street || undefined,
        streetNumber: result.streetNumber || undefined,
        city: result.city || undefined,
        region: result.region || undefined,
        postalCode: result.postalCode || undefined,
        country: result.country || undefined,
        countryCode: result.isoCountryCode || undefined,
        formattedAddress: [
          result.streetNumber,
          result.street,
          result.city,
          result.postalCode,
          result.country
        ].filter(Boolean).join(', '),
      };

    } catch (error) {
      console.error('Error reverse geocoding:', error);
      throw error;
    }
  }

  // Geocode address to coordinates
  public async geocode(address: string): Promise<LocationCoordinates[]> {
    try {
      const results = await Location.geocodeAsync(address);

      return results.map(result => ({
        lat: result.latitude,
        lng: result.longitude,
      }));

    } catch (error) {
      console.error('Error geocoding address:', error);
      throw error;
    }
  }

  // Calculate distance between two points
  public calculateDistance(
    point1: LocationCoordinates,
    point2: LocationCoordinates
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.lat * Math.PI) / 180;
    const φ2 = (point2.lat * Math.PI) / 180;
    const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Estimate walking time based on distance
  public estimateWalkingTime(distanceMeters: number): number {
    // Average walking speed: 5 km/h = 1.39 m/s
    const walkingSpeed = 1.39; // m/s
    const timeSeconds = distanceMeters / walkingSpeed;
    return Math.ceil(timeSeconds / 60); // Convert to minutes and round up
  }

  // Find nearby restaurants
  public async findNearbyRestaurants(
    radius: number = 5000,
    limit: number = 20
  ): Promise<NearbyRestaurant[]> {
    try {
      const currentLocation = await this.getCurrentLocation();

      const params = {
        lat: currentLocation.coordinates.lat,
        lng: currentLocation.coordinates.lng,
        radius,
        limit,
      };

      const restaurants = await apiService.get('/restaurants/nearby', params);

      return restaurants.map((restaurant: any) => {
        const distance = this.calculateDistance(
          currentLocation.coordinates,
          restaurant.coordinates
        );

        return {
          id: restaurant.id,
          name: restaurant.name,
          coordinates: restaurant.coordinates,
          distance,
          estimatedWalkTime: this.estimateWalkingTime(distance),
          isOpen: restaurant.isOpen,
          rating: restaurant.rating,
          cuisine: restaurant.cuisine,
        };
      }).sort((a: NearbyRestaurant, b: NearbyRestaurant) => a.distance - b.distance);

    } catch (error) {
      console.error('Error finding nearby restaurants:', error);
      throw error;
    }
  }

  // Setup geofencing
  public async setupGeofencing(): Promise<void> {
    try {
      if (!this.hasPermission || Platform.OS !== 'ios') {
        // Geofencing is iOS only in Expo
        return;
      }

      // Define geofencing task
      TaskManager.defineTask(GEOFENCING_TASK, ({ data, error }) => {
        if (error) {
          console.error('Geofencing task error:', error);
          return;
        }

        if (data) {
          this.handleGeofenceEvent(data as any);
        }
      });

      // Start geofencing for registered regions
      const regions = Array.from(this.geofenceRegions.values());

      if (regions.length > 0) {
        await Location.startGeofencingAsync(GEOFENCING_TASK, regions);
        console.log('Geofencing started with', regions.length, 'regions');
      }

    } catch (error) {
      console.error('Error setting up geofencing:', error);
    }
  }

  // Add geofence region
  public async addGeofenceRegion(region: GeofenceRegion): Promise<void> {
    try {
      this.geofenceRegions.set(region.id, region);
      await this.saveGeofenceRegions();

      // Restart geofencing with new region
      if (this.settings.geofencing) {
        await this.setupGeofencing();
      }

    } catch (error) {
      console.error('Error adding geofence region:', error);
    }
  }

  // Remove geofence region
  public async removeGeofenceRegion(regionId: string): Promise<void> {
    try {
      this.geofenceRegions.delete(regionId);
      await this.saveGeofenceRegions();

      // Restart geofencing without removed region
      if (this.settings.geofencing) {
        await Location.stopGeofencingAsync(GEOFENCING_TASK);
        await this.setupGeofencing();
      }

    } catch (error) {
      console.error('Error removing geofence region:', error);
    }
  }

  // Handle geofence events
  private async handleGeofenceEvent(data: any): Promise<void> {
    try {
      console.log('Geofence event:', data);

      // Process geofence enter/exit events
      const { eventType, region } = data;
      const geofenceRegion = this.geofenceRegions.get(region.identifier);

      if (!geofenceRegion) return;

      if (eventType === Location.GeofencingEventType.Enter) {
        await this.handleGeofenceEnter(geofenceRegion);
      } else if (eventType === Location.GeofencingEventType.Exit) {
        await this.handleGeofenceExit(geofenceRegion);
      }

    } catch (error) {
      console.error('Error handling geofence event:', error);
    }
  }

  // Handle geofence enter
  private async handleGeofenceEnter(region: GeofenceRegion): Promise<void> {
    console.log('Entered geofence:', region.name);

    if (region.tenantId) {
      // Show restaurant notification or special offer
      // This would trigger a local notification or API call
    }
  }

  // Handle geofence exit
  private async handleGeofenceExit(region: GeofenceRegion): Promise<void> {
    console.log('Exited geofence:', region.name);

    if (region.tenantId) {
      // Maybe ask for review or feedback
    }
  }

  // Check manual geofences (for platforms without native geofencing)
  private async checkGeofences(coordinates: LocationCoordinates): Promise<void> {
    try {
      for (const region of this.geofenceRegions.values()) {
        const distance = this.calculateDistance(coordinates, {
          lat: region.latitude,
          lng: region.longitude,
        });

        if (distance <= region.radius) {
          // Inside geofence
          await this.handleGeofenceEnter(region);
        }
      }
    } catch (error) {
      console.error('Error checking geofences:', error);
    }
  }

  // Update settings
  public async updateSettings(newSettings: Partial<LocationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();

    // Restart services if needed
    if (this.isInitialized) {
      if (this.settings.enabled) {
        await this.startWatchingPosition();
      } else {
        await this.stopWatchingPosition();
      }

      if (this.settings.geofencing) {
        await this.setupGeofencing();
      } else {
        await Location.stopGeofencingAsync(GEOFENCING_TASK);
      }
    }
  }

  // Get current settings
  public getSettings(): LocationSettings {
    return { ...this.settings };
  }

  // Get current location (cached)
  public getCachedLocation(): LocationData | null {
    return this.currentLocation;
  }

  // Check if location is fresh
  private isLocationFresh(location: LocationData): boolean {
    const now = Date.now();
    const age = now - location.timestamp;
    return age < (this.settings.maxAge * 1000);
  }

  // Cache location to storage
  private async cacheLocation(location: LocationData): Promise<void> {
    try {
      await storage.set('lastKnownLocation', location);
    } catch (error) {
      console.error('Error caching location:', error);
    }
  }

  // Load cached location from storage
  private async loadCachedLocation(): Promise<void> {
    try {
      const cached = await storage.get('lastKnownLocation');
      if (cached && this.isLocationFresh(cached)) {
        this.currentLocation = cached;
      }
    } catch (error) {
      console.error('Error loading cached location:', error);
    }
  }

  // Send location to server
  private async sendLocationToServer(location: LocationData): Promise<void> {
    try {
      await apiService.post('/user/location', {
        coordinates: location.coordinates,
        timestamp: location.timestamp,
        accuracy: location.coordinates.accuracy,
      });
    } catch (error) {
      console.error('Error sending location to server:', error);
    }
  }

  // Load settings from storage
  private async loadSettings(): Promise<void> {
    try {
      const settings = await storage.get('locationSettings');
      if (settings) {
        this.settings = { ...DEFAULT_SETTINGS, ...settings };
      }
    } catch (error) {
      console.error('Error loading location settings:', error);
    }
  }

  // Save settings to storage
  private async saveSettings(): Promise<void> {
    try {
      await storage.set('locationSettings', this.settings);
    } catch (error) {
      console.error('Error saving location settings:', error);
    }
  }

  // Load geofence regions from storage
  private async loadGeofenceRegions(): Promise<void> {
    try {
      const regions = await storage.get('geofenceRegions');
      if (regions) {
        this.geofenceRegions = new Map(Object.entries(regions));
      }
    } catch (error) {
      console.error('Error loading geofence regions:', error);
    }
  }

  // Save geofence regions to storage
  private async saveGeofenceRegions(): Promise<void> {
    try {
      const regions = Object.fromEntries(this.geofenceRegions);
      await storage.set('geofenceRegions', regions);
    } catch (error) {
      console.error('Error saving geofence regions:', error);
    }
  }

  // Cleanup - stop all location services
  public async cleanup(): Promise<void> {
    try {
      await this.stopWatchingPosition();

      if (this.settings.geofencing) {
        await Location.stopGeofencingAsync(GEOFENCING_TASK);
      }

      this.currentLocation = null;
      this.isInitialized = false;
      this.hasPermission = false;

    } catch (error) {
      console.error('Error during location service cleanup:', error);
    }
  }
}

// Create and export singleton instance
export const locationService = new LocationService();

// Export types
export type {
  GeofenceRegion, LocationAddress, LocationCoordinates,
  LocationData, LocationSettings, NearbyRestaurant
};

export default locationService;
