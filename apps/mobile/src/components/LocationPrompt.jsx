/**
 * EATECH - Location Prompt Component
 * Version: 4.2.0
 * Description: React Native Location Permission mit Smart Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/mobile/src/components/LocationPrompt.jsx
 * 
 * Features: Location permissions, proximity detection, background location
 */

import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  StyleSheet,
  Alert,
  Platform,
  Linking,
  BackHandler
} from 'react-native';
import * as Location from 'expo-location';
import * as Permissions from 'expo-permissions';
import {
  MapPin,
  Navigation,
  AlertCircle,
  CheckCircle,
  Settings,
  X,
  RefreshCw,
  Clock,
  Target,
  Compass
} from 'lucide-react-native';

// Lazy loaded components
const LocationMap = lazy(() => import('./LocationMap'));
const ProximityIndicator = lazy(() => import('./ProximityIndicator'));
const LocationHistory = lazy(() => import('./LocationHistory'));
const BackgroundLocationModal = lazy(() => import('./BackgroundLocationModal'));

// Lazy loaded services
const locationService = () => import('../services/LocationService');
const proximityService = () => import('../services/ProximityService');
const analyticsService = () => import('../services/AnalyticsService');
const notificationService = () => import('../services/NotificationService');

const PERMISSION_STATES = {
  UNDETERMINED: 'undetermined',
  DENIED: 'denied',
  GRANTED: 'granted',
  RESTRICTED: 'restricted'
};

const ACCURACY_LEVELS = {
  LOW: Location.Accuracy.Low,
  BALANCED: Location.Accuracy.Balanced,
  HIGH: Location.Accuracy.High,
  HIGHEST: Location.Accuracy.Highest
};

const LocationPrompt = ({
  visible = false,
  onPermissionGranted,
  onPermissionDenied,
  onDismiss,
  showMap = true,
  enableBackground = false,
  accuracyLevel = ACCURACY_LEVELS.BALANCED,
  autoDetectFoodtrucks = true,
  style = {}
}) => {
  // ============================================================================
  // STATE
  // ============================================================================
  const [permissionState, setPermissionState] = useState(PERMISSION_STATES.UNDETERMINED);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [nearbyFoodtrucks, setNearbyFoodtrucks] = useState([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(false);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [lastLocationUpdate, setLastLocationUpdate] = useState(null);

  // Animation refs
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const locationServiceRef = useRef(null);
  const proximityServiceRef = useRef(null);
  const watchPositionRef = useRef(null);

  // ============================================================================
  // LAZY LOADING SETUP
  // ============================================================================
  useEffect(() => {
    const initializeLazyServices = async () => {
      try {
        if (!locationServiceRef.current) {
          const LocationService = await locationService();
          locationServiceRef.current = new LocationService.default({
            accuracy: accuracyLevel,
            enableBackground: enableBackground
          });
        }

        if (!proximityServiceRef.current && autoDetectFoodtrucks) {
          const ProximityService = await proximityService();
          proximityServiceRef.current = new ProximityService.default({
            threshold: 500, // 500m radius
            updateInterval: 30000 // 30 seconds
          });
        }
      } catch (error) {
        console.error('Failed to initialize location services:', error);
      }
    };

    if (visible) {
      initializeLazyServices();
    }
  }, [visible, accuracyLevel, enableBackground, autoDetectFoodtrucks]);

  // ============================================================================
  // EFFECTS
  // ============================================================================
  useEffect(() => {
    if (visible) {
      showModal();
      checkInitialPermission();
    } else {
      hideModal();
    }

    return () => {
      stopLocationTracking();
    };
  }, [visible]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (visible) {
        handleDismiss();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [visible]);

  // ============================================================================
  // PERMISSION METHODS
  // ============================================================================
  const checkInitialPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionState(status);
      
      if (status === 'granted') {
        await startLocationTracking();
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setLocationError('Fehler beim Überprüfen der Standort-Berechtigung');
    }
  };

  const requestLocationPermission = async () => {
    try {
      setIsLoadingLocation(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionState(status);
      
      if (status === 'granted') {
        await startLocationTracking();
        onPermissionGranted?.();
        
        // Track analytics
        const AnalyticsService = await analyticsService();
        AnalyticsService.trackEvent('location_permission_granted', {
          source: 'location_prompt',
          timestamp: new Date().toISOString()
        });
      } else {
        handlePermissionDenied();
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      setLocationError('Fehler beim Anfordern der Standort-Berechtigung');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const requestBackgroundPermission = async () => {
    if (!enableBackground) return;
    
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      
      if (status === 'granted') {
        setIsTrackingEnabled(true);
        // Start background location updates
        await startBackgroundLocationUpdates();
      } else {
        setShowBackgroundModal(true);
      }
    } catch (error) {
      console.error('Error requesting background permission:', error);
    }
  };

  const handlePermissionDenied = () => {
    setLocationError('Standort-Berechtigung verweigert');
    onPermissionDenied?.();
    
    // Show settings prompt
    Alert.alert(
      'Standort-Berechtigung erforderlich',
      'Um nahegelegene Foodtrucks zu finden, benötigen wir Zugriff auf Ihren Standort.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Einstellungen öffnen', onPress: openAppSettings }
      ]
    );
  };

  const openAppSettings = () => {
    Linking.openSettings();
  };

  // ============================================================================
  // LOCATION TRACKING
  // ============================================================================
  const startLocationTracking = async () => {
    try {
      setIsLoadingLocation(true);
      
      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: accuracyLevel,
        timeout: 10000,
        maximumAge: 60000
      });
      
      setCurrentLocation(location);
      setLastLocationUpdate(new Date());
      
      // Start watching position
      watchPositionRef.current = await Location.watchPositionAsync(
        {
          accuracy: accuracyLevel,
          timeInterval: 30000, // 30 seconds
          distanceInterval: 50 // 50 meters
        },
        (newLocation) => {
          setCurrentLocation(newLocation);
          setLastLocationUpdate(new Date());
          handleLocationUpdate(newLocation);
        }
      );
      
      // Find nearby foodtrucks
      if (autoDetectFoodtrucks) {
        await findNearbyFoodtrucks(location);
      }
      
    } catch (error) {
      console.error('Error starting location tracking:', error);
      setLocationError('Fehler beim Abrufen des Standorts');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const stopLocationTracking = () => {
    if (watchPositionRef.current) {
      watchPositionRef.current.remove();
      watchPositionRef.current = null;
    }
    setIsTrackingEnabled(false);
  };

  const startBackgroundLocationUpdates = async () => {
    if (!locationServiceRef.current) return;
    
    try {
      await locationServiceRef.current.startBackgroundUpdates({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 300000, // 5 minutes
        distanceInterval: 200 // 200 meters
      });
    } catch (error) {
      console.error('Error starting background updates:', error);
    }
  };

  const handleLocationUpdate = useCallback(async (location) => {
    if (!proximityServiceRef.current) return;
    
    try {
      // Check for nearby foodtrucks
      const nearby = await proximityServiceRef.current.checkProximity(
        location.coords.latitude,
        location.coords.longitude
      );
      
      if (nearby.length > 0) {
        setNearbyFoodtrucks(nearby);
        
        // Send proximity notification
        const NotificationService = await notificationService();
        NotificationService.sendLocalNotification({
          title: `${nearby.length} Foodtruck${nearby.length > 1 ? 's' : ''} in der Nähe!`,
          body: 'Tippen Sie hier, um die Speisekarte zu sehen.',
          data: { foodtrucks: nearby }
        });
      }
    } catch (error) {
      console.error('Error handling location update:', error);
    }
  }, []);

  const findNearbyFoodtrucks = async (location) => {
    if (!proximityServiceRef.current) return;
    
    try {
      const nearby = await proximityServiceRef.current.findNearbyFoodtrucks(
        location.coords.latitude,
        location.coords.longitude,
        1000 // 1km radius
      );
      
      setNearbyFoodtrucks(nearby);
    } catch (error) {
      console.error('Error finding nearby foodtrucks:', error);
    }
  };

  // ============================================================================
  // UI METHODS
  // ============================================================================
  const showModal = () => {
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8
    }).start();
    
    startPulseAnimation();
  };

  const hideModal = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true
    }).start();
    
    stopPulseAnimation();
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const handleDismiss = () => {
    stopLocationTracking();
    onDismiss?.();
  };

  const retryLocationAccess = () => {
    setLocationError(null);
    requestLocationPermission();
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  const renderPermissionContent = () => {
    if (locationError) {
      return (
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Standort-Fehler</Text>
          <Text style={styles.errorMessage}>{locationError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retryLocationAccess}>
            <RefreshCw size={20} color="#FFFFFF" />
            <Text style={styles.retryText}>Erneut versuchen</Text>
          </TouchableOpacity>
        </View>
      );
    }

    switch (permissionState) {
      case PERMISSION_STATES.UNDETERMINED:
      case PERMISSION_STATES.DENIED:
        return (
          <View style={styles.permissionContainer}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <MapPin size={64} color="#10B981" />
            </Animated.View>
            <Text style={styles.title}>Standort-Zugriff erforderlich</Text>
            <Text style={styles.description}>
              Um Ihnen nahegelegene Foodtrucks zu zeigen und personalisierte 
              Empfehlungen zu geben, benötigen wir Zugriff auf Ihren Standort.
            </Text>
            
            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <Target size={20} color="#10B981" />
                <Text style={styles.benefitText}>Foodtrucks in der Nähe finden</Text>
              </View>
              <View style={styles.benefitItem}>
                <Navigation size={20} color="#10B981" />
                <Text style={styles.benefitText}>Navigation zur besten Route</Text>
              </View>
              <View style={styles.benefitItem}>
                <Clock size={20} color="#10B981" />
                <Text style={styles.benefitText}>Geschätzte Ankunftszeiten</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={requestLocationPermission}
              disabled={isLoadingLocation}
            >
              {isLoadingLocation ? (
                <RefreshCw size={20} color="#FFFFFF" />
              ) : (
                <CheckCircle size={20} color="#FFFFFF" />
              )}
              <Text style={styles.primaryButtonText}>
                {isLoadingLocation ? 'Lädt...' : 'Standort-Zugriff erlauben'}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case PERMISSION_STATES.GRANTED:
        return (
          <View style={styles.successContainer}>
            <CheckCircle size={64} color="#10B981" />
            <Text style={styles.successTitle}>Standort aktiviert!</Text>
            <Text style={styles.successMessage}>
              {currentLocation 
                ? `Ihr aktueller Standort wurde gefunden. ${nearbyFoodtrucks.length} Foodtrucks in der Nähe.`
                : 'Standort wird ermittelt...'
              }
            </Text>
            
            {nearbyFoodtrucks.length > 0 && (
              <Suspense fallback={<LoadingSpinner />}>
                <ProximityIndicator 
                  foodtrucks={nearbyFoodtrucks}
                  currentLocation={currentLocation}
                />
              </Suspense>
            )}
            
            {showMap && currentLocation && (
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={() => setShowLocationMap(true)}
              >
                <MapPin size={20} color="#10B981" />
                <Text style={styles.secondaryButtonText}>Karte anzeigen</Text>
              </TouchableOpacity>
            )}
            
            {enableBackground && (
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={requestBackgroundPermission}
              >
                <Compass size={20} color="#6B7280" />
                <Text style={styles.secondaryButtonText}>
                  Hintergrund-Tracking aktivieren
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  const LoadingSpinner = () => (
    <View style={styles.loadingSpinner}>
      <RefreshCw size={24} color="#10B981" />
    </View>
  );

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <>
      <Modal
        visible={visible}
        transparent={true}
        animationType="none"
        onRequestClose={handleDismiss}
      >
        <View style={styles.overlay}>
          <Animated.View 
            style={[
              styles.container,
              style,
              { transform: [{ scale: slideAnim }] }
            ]}
          >
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={handleDismiss}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.content}>
              {renderPermissionContent()}
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Lazy Loaded Modals */}
      {showLocationMap && currentLocation && (
        <Suspense fallback={null}>
          <LocationMap
            visible={showLocationMap}
            currentLocation={currentLocation}
            nearbyFoodtrucks={nearbyFoodtrucks}
            onClose={() => setShowLocationMap(false)}
          />
        </Suspense>
      )}

      {showBackgroundModal && (
        <Suspense fallback={null}>
          <BackgroundLocationModal
            visible={showBackgroundModal}
            onAccept={requestBackgroundPermission}
            onDecline={() => setShowBackgroundModal(false)}
          />
        </Suspense>
      )}
    </>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 24,
  },
  permissionContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  benefitsList: {
    width: '100%',
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  successContainer: {
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#059669',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  errorContainer: {
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingSpinner: {
    padding: 20,
    alignItems: 'center',
  },
});

export default LocationPrompt;