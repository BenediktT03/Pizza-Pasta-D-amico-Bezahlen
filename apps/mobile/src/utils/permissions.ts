// /apps/mobile/src/utils/permissions.ts

import { Audio } from 'expo-av';
import * as Calendar from 'expo-calendar';
import * as Camera from 'expo-camera';
import * as Contacts from 'expo-contacts';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import * as Notifications from 'expo-notifications';
import { Alert, AppState, Linking } from 'react-native';
import { storage } from './storage';

// Types
export type PermissionType =
  | 'location'
  | 'locationBackground'
  | 'camera'
  | 'microphone'
  | 'notifications'
  | 'mediaLibrary'
  | 'contacts'
  | 'calendar';

export type PermissionStatus =
  | 'granted'
  | 'denied'
  | 'undetermined'
  | 'restricted';

export interface PermissionResult {
  status: PermissionStatus;
  canAskAgain: boolean;
  granted: boolean;
}

export interface PermissionInfo {
  type: PermissionType;
  title: string;
  description: string;
  required: boolean;
  rationale?: string;
  settingsMessage?: string;
  icon?: string;
}

// Permission configurations
const PERMISSION_CONFIGS: Record<PermissionType, PermissionInfo> = {
  location: {
    type: 'location',
    title: 'Standortzugriff',
    description: 'Ermöglicht es, Restaurants in Ihrer Nähe zu finden',
    required: true,
    rationale: 'EATECH benötigt Zugriff auf Ihren Standort, um Ihnen Restaurants in Ihrer Nähe anzuzeigen und die beste Route zu berechnen.',
    settingsMessage: 'Bitte aktivieren Sie den Standortzugriff in den Einstellungen, um Restaurants in Ihrer Nähe zu finden.',
    icon: 'location'
  },
  locationBackground: {
    type: 'locationBackground',
    title: 'Standort im Hintergrund',
    description: 'Ermöglicht Benachrichtigungen bei Restaurants in der Nähe',
    required: false,
    rationale: 'Mit dem Hintergrund-Standortzugriff können wir Sie über spezielle Angebote informieren, wenn Sie in der Nähe Ihrer Lieblingsrestaurants sind.',
    settingsMessage: 'Aktivieren Sie "Immer" für den Standortzugriff in den Einstellungen.',
    icon: 'location'
  },
  camera: {
    type: 'camera',
    title: 'Kamera',
    description: 'Zum Scannen von QR-Codes an Tischen',
    required: false,
    rationale: 'EATECH benötigt Kamerazugriff, um QR-Codes an Tischen zu scannen und direkt Bestellungen aufzugeben.',
    settingsMessage: 'Bitte aktivieren Sie den Kamerazugriff in den Einstellungen, um QR-Codes scannen zu können.',
    icon: 'camera'
  },
  microphone: {
    type: 'microphone',
    title: 'Mikrofon',
    description: 'Für Sprachbestellungen und Voice Commerce',
    required: false,
    rationale: 'Mit Mikrofonzugriff können Sie Bestellungen per Sprache aufgeben - einfach "Hey EATECH" sagen und bestellen.',
    settingsMessage: 'Aktivieren Sie den Mikrofonzugriff für Sprachbestellungen.',
    icon: 'mic'
  },
  notifications: {
    type: 'notifications',
    title: 'Benachrichtigungen',
    description: 'Für Updates zu Ihren Bestellungen',
    required: false,
    rationale: 'Benachrichtigungen halten Sie über den Status Ihrer Bestellungen auf dem Laufenden und informieren über spezielle Angebote.',
    settingsMessage: 'Aktivieren Sie Benachrichtigungen, um über Bestellstatus und Angebote informiert zu werden.',
    icon: 'notifications'
  },
  mediaLibrary: {
    type: 'mediaLibrary',
    title: 'Fotobibliothek',
    description: 'Zum Speichern von Belegen und Food-Fotos',
    required: false,
    rationale: 'Zugriff auf die Fotobibliothek ermöglicht es, Belege zu speichern und Fotos Ihrer Lieblingsgerichte zu teilen.',
    settingsMessage: 'Erlauben Sie den Zugriff auf Fotos, um Belege zu speichern.',
    icon: 'images'
  },
  contacts: {
    type: 'contacts',
    title: 'Kontakte',
    description: 'Zum einfachen Teilen von Restaurants mit Freunden',
    required: false,
    rationale: 'Mit Kontaktzugriff können Sie Restaurant-Empfehlungen einfach mit Freunden teilen.',
    settingsMessage: 'Erlauben Sie den Kontaktzugriff zum Teilen von Empfehlungen.',
    icon: 'people'
  },
  calendar: {
    type: 'calendar',
    title: 'Kalender',
    description: 'Für Vorbestellungen und Erinnerungen',
    required: false,
    rationale: 'Kalenderzugriff ermöglicht es, Vorbestellungen zu planen und Erinnerungen für Lieblingsrestaurants zu setzen.',
    settingsMessage: 'Erlauben Sie Kalenderzugriff für Bestellerinnerungen.',
    icon: 'calendar'
  }
};

class PermissionsManager {
  private permissionStatuses: Map<PermissionType, PermissionResult> = new Map();
  private deniedPermissions: Set<PermissionType> = new Set();
  private appStateSubscription: any = null;

  constructor() {
    this.initializeAppStateListener();
    this.loadDeniedPermissions();
  }

  // Initialize app state listener to check permissions when app becomes active
  private initializeAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // Check if previously denied permissions are now granted
        this.recheckDeniedPermissions();
      }
    });
  }

  // Load previously denied permissions from storage
  private async loadDeniedPermissions(): Promise<void> {
    try {
      const denied = await storage.get('deniedPermissions');
      if (Array.isArray(denied)) {
        this.deniedPermissions = new Set(denied);
      }
    } catch (error) {
      console.error('Error loading denied permissions:', error);
    }
  }

  // Save denied permissions to storage
  private async saveDeniedPermissions(): Promise<void> {
    try {
      await storage.set('deniedPermissions', Array.from(this.deniedPermissions));
    } catch (error) {
      console.error('Error saving denied permissions:', error);
    }
  }

  // Recheck permissions that were previously denied
  private async recheckDeniedPermissions(): Promise<void> {
    const toRecheck = Array.from(this.deniedPermissions);

    for (const permission of toRecheck) {
      const result = await this.checkPermission(permission);
      if (result.granted) {
        this.deniedPermissions.delete(permission);
        await this.saveDeniedPermissions();
      }
    }
  }

  // Check current status of a permission
  public async checkPermission(type: PermissionType): Promise<PermissionResult> {
    try {
      let status: PermissionStatus = 'undetermined';
      let canAskAgain = true;

      switch (type) {
        case 'location':
          const locationStatus = await Location.getForegroundPermissionsAsync();
          status = this.mapExpoStatus(locationStatus.status);
          canAskAgain = locationStatus.canAskAgain;
          break;

        case 'locationBackground':
          const backgroundStatus = await Location.getBackgroundPermissionsAsync();
          status = this.mapExpoStatus(backgroundStatus.status);
          canAskAgain = backgroundStatus.canAskAgain;
          break;

        case 'camera':
          const cameraStatus = await Camera.getCameraPermissionsAsync();
          status = this.mapExpoStatus(cameraStatus.status);
          canAskAgain = cameraStatus.canAskAgain;
          break;

        case 'microphone':
          const audioStatus = await Audio.getPermissionsAsync();
          status = this.mapExpoStatus(audioStatus.status);
          canAskAgain = audioStatus.canAskAgain;
          break;

        case 'notifications':
          const notificationStatus = await Notifications.getPermissionsAsync();
          status = this.mapExpoStatus(notificationStatus.status);
          canAskAgain = notificationStatus.canAskAgain;
          break;

        case 'mediaLibrary':
          const mediaStatus = await MediaLibrary.getPermissionsAsync();
          status = this.mapExpoStatus(mediaStatus.status);
          canAskAgain = mediaStatus.canAskAgain;
          break;

        case 'contacts':
          const contactsStatus = await Contacts.getPermissionsAsync();
          status = this.mapExpoStatus(contactsStatus.status);
          canAskAgain = contactsStatus.canAskAgain;
          break;

        case 'calendar':
          const calendarStatus = await Calendar.getCalendarPermissionsAsync();
          status = this.mapExpoStatus(calendarStatus.status);
          canAskAgain = calendarStatus.canAskAgain;
          break;

        default:
          throw new Error(`Unknown permission type: ${type}`);
      }

      const result: PermissionResult = {
        status,
        canAskAgain,
        granted: status === 'granted'
      };

      this.permissionStatuses.set(type, result);
      return result;

    } catch (error) {
      console.error(`Error checking permission ${type}:`, error);
      return {
        status: 'denied',
        canAskAgain: false,
        granted: false
      };
    }
  }

  // Request a specific permission
  public async requestPermission(
    type: PermissionType,
    showRationale: boolean = true
  ): Promise<PermissionResult> {
    try {
      const config = PERMISSION_CONFIGS[type];

      // Check if we should show rationale first
      if (showRationale && config.rationale && this.deniedPermissions.has(type)) {
        const shouldRequest = await this.showRationaleDialog(config);
        if (!shouldRequest) {
          return {
            status: 'denied',
            canAskAgain: false,
            granted: false
          };
        }
      }

      let status: PermissionStatus = 'undetermined';
      let canAskAgain = true;

      switch (type) {
        case 'location':
          const locationResult = await Location.requestForegroundPermissionsAsync();
          status = this.mapExpoStatus(locationResult.status);
          canAskAgain = locationResult.canAskAgain;
          break;

        case 'locationBackground':
          const backgroundResult = await Location.requestBackgroundPermissionsAsync();
          status = this.mapExpoStatus(backgroundResult.status);
          canAskAgain = backgroundResult.canAskAgain;
          break;

        case 'camera':
          const cameraResult = await Camera.requestCameraPermissionsAsync();
          status = this.mapExpoStatus(cameraResult.status);
          canAskAgain = cameraResult.canAskAgain;
          break;

        case 'microphone':
          const audioResult = await Audio.requestPermissionsAsync();
          status = this.mapExpoStatus(audioResult.status);
          canAskAgain = audioResult.canAskAgain;
          break;

        case 'notifications':
          const notificationResult = await Notifications.requestPermissionsAsync({
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
              allowDisplayInCarPlay: true,
              allowCriticalAlerts: false,
            },
          });
          status = this.mapExpoStatus(notificationResult.status);
          canAskAgain = notificationResult.canAskAgain;
          break;

        case 'mediaLibrary':
          const mediaResult = await MediaLibrary.requestPermissionsAsync();
          status = this.mapExpoStatus(mediaResult.status);
          canAskAgain = mediaResult.canAskAgain;
          break;

        case 'contacts':
          const contactsResult = await Contacts.requestPermissionsAsync();
          status = this.mapExpoStatus(contactsResult.status);
          canAskAgain = contactsResult.canAskAgain;
          break;

        case 'calendar':
          const calendarResult = await Calendar.requestCalendarPermissionsAsync();
          status = this.mapExpoStatus(calendarResult.status);
          canAskAgain = calendarResult.canAskAgain;
          break;

        default:
          throw new Error(`Unknown permission type: ${type}`);
      }

      const result: PermissionResult = {
        status,
        canAskAgain,
        granted: status === 'granted'
      };

      // Track denied permissions
      if (status === 'denied') {
        this.deniedPermissions.add(type);
        await this.saveDeniedPermissions();

        // Show settings dialog if can't ask again
        if (!canAskAgain) {
          await this.showSettingsDialog(config);
        }
      } else if (status === 'granted') {
        this.deniedPermissions.delete(type);
        await this.saveDeniedPermissions();
      }

      this.permissionStatuses.set(type, result);
      return result;

    } catch (error) {
      console.error(`Error requesting permission ${type}:`, error);
      return {
        status: 'denied',
        canAskAgain: false,
        granted: false
      };
    }
  }

  // Request multiple permissions
  public async requestMultiplePermissions(
    types: PermissionType[],
    showRationale: boolean = true
  ): Promise<Record<PermissionType, PermissionResult>> {
    const results: Record<string, PermissionResult> = {};

    for (const type of types) {
      results[type] = await this.requestPermission(type, showRationale);
    }

    return results as Record<PermissionType, PermissionResult>;
  }

  // Check all permissions at once
  public async checkAllPermissions(): Promise<Record<PermissionType, PermissionResult>> {
    const types: PermissionType[] = Object.keys(PERMISSION_CONFIGS) as PermissionType[];
    const results: Record<string, PermissionResult> = {};

    for (const type of types) {
      results[type] = await this.checkPermission(type);
    }

    return results as Record<PermissionType, PermissionResult>;
  }

  // Get permission configuration
  public getPermissionConfig(type: PermissionType): PermissionInfo {
    return PERMISSION_CONFIGS[type];
  }

  // Get all permission configurations
  public getAllPermissionConfigs(): Record<PermissionType, PermissionInfo> {
    return PERMISSION_CONFIGS;
  }

  // Check if all required permissions are granted
  public async checkRequiredPermissions(): Promise<{
    allGranted: boolean;
    missing: PermissionType[];
    results: Record<PermissionType, PermissionResult>;
  }> {
    const requiredTypes = Object.entries(PERMISSION_CONFIGS)
      .filter(([_, config]) => config.required)
      .map(([type, _]) => type as PermissionType);

    const results = await this.requestMultiplePermissions(requiredTypes);
    const missing = requiredTypes.filter(type => !results[type].granted);

    return {
      allGranted: missing.length === 0,
      missing,
      results
    };
  }

  // Show rationale dialog
  private async showRationaleDialog(config: PermissionInfo): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        `${config.title} erforderlich`,
        config.rationale,
        [
          {
            text: 'Nicht jetzt',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Erlauben',
            onPress: () => resolve(true)
          }
        ]
      );
    });
  }

  // Show settings dialog when permission is permanently denied
  private async showSettingsDialog(config: PermissionInfo): Promise<void> {
    return new Promise((resolve) => {
      Alert.alert(
        `${config.title} in Einstellungen aktivieren`,
        config.settingsMessage,
        [
          {
            text: 'Abbrechen',
            style: 'cancel',
            onPress: () => resolve()
          },
          {
            text: 'Einstellungen öffnen',
            onPress: () => {
              Linking.openSettings();
              resolve();
            }
          }
        ]
      );
    });
  }

  // Map Expo permission status to our status
  private mapExpoStatus(expoStatus: string): PermissionStatus {
    switch (expoStatus) {
      case 'granted':
        return 'granted';
      case 'denied':
        return 'denied';
      case 'undetermined':
        return 'undetermined';
      default:
        return 'denied';
    }
  }

  // Get cached permission status
  public getCachedPermissionStatus(type: PermissionType): PermissionResult | null {
    return this.permissionStatuses.get(type) || null;
  }

  // Open app settings
  public async openAppSettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('Error opening app settings:', error);
    }
  }

  // Check if permission was denied permanently
  public wasPermissionDeniedPermanently(type: PermissionType): boolean {
    return this.deniedPermissions.has(type);
  }

  // Reset permission tracking (useful for testing)
  public async resetPermissionTracking(): Promise<void> {
    this.permissionStatuses.clear();
    this.deniedPermissions.clear();
    await storage.remove('deniedPermissions');
  }

  // Cleanup
  public cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
}

// Create singleton instance
const permissionsManager = new PermissionsManager();

// Convenience functions
export const checkPermission = (type: PermissionType) =>
  permissionsManager.checkPermission(type);

export const requestPermission = (type: PermissionType, showRationale?: boolean) =>
  permissionsManager.requestPermission(type, showRationale);

export const requestMultiplePermissions = (types: PermissionType[], showRationale?: boolean) =>
  permissionsManager.requestMultiplePermissions(types, showRationale);

export const checkAllPermissions = () =>
  permissionsManager.checkAllPermissions();

export const checkRequiredPermissions = () =>
  permissionsManager.checkRequiredPermissions();

export const getPermissionConfig = (type: PermissionType) =>
  permissionsManager.getPermissionConfig(type);

export const getAllPermissionConfigs = () =>
  permissionsManager.getAllPermissionConfigs();

export const openAppSettings = () =>
  permissionsManager.openAppSettings();

export const getCachedPermissionStatus = (type: PermissionType) =>
  permissionsManager.getCachedPermissionStatus(type);

export const wasPermissionDeniedPermanently = (type: PermissionType) =>
  permissionsManager.wasPermissionDeniedPermanently(type);

// Main function to request all permissions used by the app
export const requestPermissions = async (): Promise<{
  success: boolean;
  granted: PermissionType[];
  denied: PermissionType[];
}> => {
  try {
    // Request essential permissions first
    const essentialPermissions: PermissionType[] = ['location', 'notifications'];
    const essentialResults = await requestMultiplePermissions(essentialPermissions);

    // Request optional permissions
    const optionalPermissions: PermissionType[] = ['camera', 'microphone'];
    const optionalResults = await requestMultiplePermissions(optionalPermissions, false);

    // Combine results
    const allResults = { ...essentialResults, ...optionalResults };

    const granted = Object.entries(allResults)
      .filter(([_, result]) => result.granted)
      .map(([type, _]) => type as PermissionType);

    const denied = Object.entries(allResults)
      .filter(([_, result]) => !result.granted)
      .map(([type, _]) => type as PermissionType);

    const success = essentialPermissions.every(type => allResults[type]?.granted);

    return { success, granted, denied };

  } catch (error) {
    console.error('Error requesting permissions:', error);
    return { success: false, granted: [], denied: [] };
  }
};

export default permissionsManager;
