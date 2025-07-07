// /apps/mobile/src/screens/ProfileScreen.tsx

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import * as Application from 'expo-application';
import * as Haptics from 'expo-haptics';
import * as Updates from 'expo-updates';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Services & Utils
import { apiService } from '../services/api.service';
import { pushService } from '../services/push.service';
import { storage } from '../utils/storage';

// Types
interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phone: string;
  avatar?: string;
  createdAt: string;
  preferences: {
    language: 'de' | 'fr' | 'it' | 'en';
    currency: string;
    notifications: {
      orderUpdates: boolean;
      promotions: boolean;
      newsletter: boolean;
    };
    accessibility: {
      fontSize: 'small' | 'normal' | 'large';
      highContrast: boolean;
      voiceAssistant: boolean;
    };
  };
  stats: {
    totalOrders: number;
    totalSpent: number;
    favoriteRestaurant?: string;
    memberSince: string;
  };
  loyaltyPoints: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  tenantName: string;
  total: number;
  currency: string;
  status: string;
  createdAt: string;
}

type RootStackParamList = {
  Profile: undefined;
  Menu: { tenantId?: string };
  OrderTracking: { orderId: string };
  EditProfile: undefined;
  Notifications: undefined;
  Language: undefined;
  Support: undefined;
  Legal: undefined;
};

export const ProfileScreen: React.FC = () => {
  // Navigation
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');

  // Load profile data
  const loadProfileData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load cached profile first
      const cachedProfile = await storage.get('userProfile');
      if (cachedProfile) {
        setProfile(cachedProfile);
      }

      // Load fresh data
      const [profileData, ordersData] = await Promise.all([
        apiService.get('/user/profile'),
        apiService.get('/user/orders/recent', { limit: 5 })
      ]);

      setProfile(profileData);
      setRecentOrders(ordersData);

      // Cache profile data
      await storage.set('userProfile', profileData);

    } catch (error) {
      console.error('Error loading profile data:', error);

      // If no cached data, show error
      if (!profile) {
        Alert.alert('Fehler', 'Profildaten konnten nicht geladen werden.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  // Update settings
  const updateSetting = useCallback(async (path: string, value: any) => {
    if (!profile) return;

    try {
      setIsUpdatingSettings(true);

      // Update local state immediately for better UX
      const updatedProfile = { ...profile };
      const pathParts = path.split('.');

      let current: any = updatedProfile;
      for (let i = 0; i < pathParts.length - 1; i++) {
        current = current[pathParts[i]];
      }
      current[pathParts[pathParts.length - 1]] = value;

      setProfile(updatedProfile);

      // Update on server
      await apiService.patch('/user/profile', {
        [path]: value
      });

      // Update cache
      await storage.set('userProfile', updatedProfile);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    } catch (error) {
      console.error('Error updating setting:', error);
      Alert.alert('Fehler', 'Einstellung konnte nicht gespeichert werden.');

      // Reload profile to reset state
      await loadProfileData();
    } finally {
      setIsUpdatingSettings(false);
    }
  }, [profile, loadProfileData]);

  // App version and update check
  const checkForUpdates = useCallback(async () => {
    try {
      if (__DEV__) {
        Alert.alert('Development Mode', 'Updates sind im Development Mode nicht verfügbar.');
        return;
      }

      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        Alert.alert(
          'Update verfügbar',
          'Eine neue Version der App ist verfügbar. Möchten Sie jetzt aktualisieren?',
          [
            { text: 'Später', style: 'cancel' },
            {
              text: 'Aktualisieren',
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  await Updates.reloadAsync();
                } catch (error) {
                  Alert.alert('Fehler', 'Update konnte nicht installiert werden.');
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Aktuelle Version', 'Sie verwenden bereits die neueste Version.');
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      Alert.alert('Fehler', 'Update-Status konnte nicht überprüft werden.');
    }
  }, []);

  // Share app
  const shareApp = useCallback(async () => {
    try {
      await Share.share({
        message: 'Entdecke EATECH - die beste App für Foodtruck-Bestellungen in der Schweiz! 🍔\n\nDownload: https://eatech.ch/app',
        title: 'EATECH App',
      });
    } catch (error) {
      console.error('Error sharing app:', error);
    }
  }, []);

  // Sign out
  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Abmelden',
      'Möchten Sie sich wirklich abmelden?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Abmelden',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all stored data
              await storage.clear();

              // Sign out from API
              await apiService.post('/auth/logout');

              // Unsubscribe from push notifications
              await pushService.unsubscribeFromAll();

              // Navigate to login or onboarding
              // This would typically reset the navigation stack
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' as any }]
              });

            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Fehler', 'Abmeldung fehlgeschlagen.');
            }
          }
        }
      ]
    );
  }, [navigation]);

  // Delete account
  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Account löschen',
      'Sind Sie sicher, dass Sie Ihren Account löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Bestätigung erforderlich',
              'Geben Sie zur Bestätigung "LÖSCHEN" ein:',
              [
                { text: 'Abbrechen', style: 'cancel' },
                {
                  text: 'Bestätigen',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await apiService.delete('/user/account');
                      await storage.clear();

                      Alert.alert(
                        'Account gelöscht',
                        'Ihr Account wurde erfolgreich gelöscht.',
                        [
                          {
                            text: 'OK',
                            onPress: () => {
                              navigation.reset({
                                index: 0,
                                routes: [{ name: 'Login' as any }]
                              });
                            }
                          }
                        ]
                      );
                    } catch (error) {
                      console.error('Error deleting account:', error);
                      Alert.alert('Fehler', 'Account konnte nicht gelöscht werden.');
                    }
                  }
                }
              ],
              'plain-text'
            );
          }
        }
      ]
    );
  }, [navigation]);

  // Effects
  useEffect(() => {
    loadProfileData();

    // Get app version
    const version = Application.nativeApplicationVersion || '1.0.0';
    const buildNumber = Application.nativeBuildVersion || '1';
    setAppVersion(`${version} (${buildNumber})`);
  }, [loadProfileData]);

  // Render methods
  const renderProfileHeader = () => {
    if (!profile) return null;

    return (
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {profile.avatar ? (
            <Image source={{ uri: profile.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color="#666" />
            </View>
          )}
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile.name}</Text>
          {profile.email && (
            <Text style={styles.profileEmail}>{profile.email}</Text>
          )}
          <Text style={styles.profilePhone}>{profile.phone}</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profile.stats.totalOrders}</Text>
              <Text style={styles.statLabel}>Bestellungen</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>CHF {profile.stats.totalSpent.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Ausgegeben</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profile.loyaltyPoints}</Text>
              <Text style={styles.statLabel}>Punkte</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderRecentOrders = () => {
    if (recentOrders.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Letzte Bestellungen</Text>
          <TouchableOpacity onPress={() => navigation.navigate('OrderHistory' as any)}>
            <Text style={styles.seeAllText}>Alle anzeigen</Text>
          </TouchableOpacity>
        </View>

        {recentOrders.slice(0, 3).map((order) => (
          <TouchableOpacity
            key={order.id}
            style={styles.orderItem}
            onPress={() => navigation.navigate('OrderTracking', { orderId: order.id })}
          >
            <View style={styles.orderInfo}>
              <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
              <Text style={styles.orderRestaurant}>{order.tenantName}</Text>
              <Text style={styles.orderDate}>
                {format(new Date(order.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
              </Text>
            </View>
            <View style={styles.orderDetails}>
              <Text style={styles.orderTotal}>CHF {order.total.toFixed(2)}</Text>
              <View style={[styles.orderStatus, getOrderStatusStyle(order.status)]}>
                <Text style={[styles.orderStatusText, getOrderStatusTextStyle(order.status)]}>
                  {getOrderStatusText(order.status)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderSettings = () => {
    if (!profile) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Einstellungen</Text>

        {/* Notifications */}
        <View style={styles.settingGroup}>
          <Text style={styles.settingGroupTitle}>Benachrichtigungen</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Bestellupdates</Text>
              <Text style={styles.settingDescription}>
                Benachrichtigungen über Bestellstatus
              </Text>
            </View>
            <Switch
              value={profile.preferences.notifications.orderUpdates}
              onValueChange={(value) => updateSetting('preferences.notifications.orderUpdates', value)}
              trackColor={{ false: '#E5E7EB', true: '#FF6B35' }}
              thumbColor={profile.preferences.notifications.orderUpdates ? '#FFFFFF' : '#9CA3AF'}
              disabled={isUpdatingSettings}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Angebote & Aktionen</Text>
              <Text style={styles.settingDescription}>
                Informationen über Rabatte und Aktionen
              </Text>
            </View>
            <Switch
              value={profile.preferences.notifications.promotions}
              onValueChange={(value) => updateSetting('preferences.notifications.promotions', value)}
              trackColor={{ false: '#E5E7EB', true: '#FF6B35' }}
              thumbColor={profile.preferences.notifications.promotions ? '#FFFFFF' : '#9CA3AF'}
              disabled={isUpdatingSettings}
            />
          </View>
        </View>

        {/* Accessibility */}
        <View style={styles.settingGroup}>
          <Text style={styles.settingGroupTitle}>Barrierefreiheit</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              Alert.alert(
                'Schriftgröße',
                'Wählen Sie Ihre bevorzugte Schriftgröße:',
                [
                  { text: 'Klein', onPress: () => updateSetting('preferences.accessibility.fontSize', 'small') },
                  { text: 'Normal', onPress: () => updateSetting('preferences.accessibility.fontSize', 'normal') },
                  { text: 'Groß', onPress: () => updateSetting('preferences.accessibility.fontSize', 'large') }
                ]
              );
            }}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Schriftgröße</Text>
              <Text style={styles.settingDescription}>
                Aktuell: {profile.preferences.accessibility.fontSize === 'large' ? 'Groß' :
                         profile.preferences.accessibility.fontSize === 'small' ? 'Klein' : 'Normal'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Hoher Kontrast</Text>
              <Text style={styles.settingDescription}>
                Bessere Sichtbarkeit bei Sehschwäche
              </Text>
            </View>
            <Switch
              value={profile.preferences.accessibility.highContrast}
              onValueChange={(value) => updateSetting('preferences.accessibility.highContrast', value)}
              trackColor={{ false: '#E5E7EB', true: '#FF6B35' }}
              thumbColor={profile.preferences.accessibility.highContrast ? '#FFFFFF' : '#9CA3AF'}
              disabled={isUpdatingSettings}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Sprachassistent</Text>
              <Text style={styles.settingDescription}>
                Voice Commerce aktivieren
              </Text>
            </View>
            <Switch
              value={profile.preferences.accessibility.voiceAssistant}
              onValueChange={(value) => updateSetting('preferences.accessibility.voiceAssistant', value)}
              trackColor={{ false: '#E5E7EB', true: '#FF6B35' }}
              thumbColor={profile.preferences.accessibility.voiceAssistant ? '#FFFFFF' : '#9CA3AF'}
              disabled={isUpdatingSettings}
            />
          </View>
        </View>

        {/* Language & Region */}
        <View style={styles.settingGroup}>
          <Text style={styles.settingGroupTitle}>Sprache & Region</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('Language')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Sprache</Text>
              <Text style={styles.settingDescription}>
                {profile.preferences.language === 'de' ? 'Deutsch' :
                 profile.preferences.language === 'fr' ? 'Français' :
                 profile.preferences.language === 'it' ? 'Italiano' : 'English'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Währung</Text>
              <Text style={styles.settingDescription}>{profile.preferences.currency}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </View>
        </View>
      </View>
    );
  };

  const renderActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Weitere Optionen</Text>

      <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('EditProfile')}>
        <View style={styles.actionInfo}>
          <Ionicons name="person-circle" size={24} color="#666" />
          <Text style={styles.actionTitle}>Profil bearbeiten</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionItem} onPress={shareApp}>
        <View style={styles.actionInfo}>
          <Ionicons name="share" size={24} color="#666" />
          <Text style={styles.actionTitle}>App weiterempfehlen</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Support')}>
        <View style={styles.actionInfo}>
          <Ionicons name="help-circle" size={24} color="#666" />
          <Text style={styles.actionTitle}>Hilfe & Support</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Legal')}>
        <View style={styles.actionInfo}>
          <Ionicons name="document-text" size={24} color="#666" />
          <Text style={styles.actionTitle}>Rechtliches</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionItem} onPress={checkForUpdates}>
        <View style={styles.actionInfo}>
          <Ionicons name="download" size={24} color="#666" />
          <Text style={styles.actionTitle}>Nach Updates suchen</Text>
        </View>
        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>v{appVersion}</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.actionItem, styles.signOutItem]} onPress={handleSignOut}>
        <View style={styles.actionInfo}>
          <Ionicons name="log-out" size={24} color="#EF4444" />
          <Text style={[styles.actionTitle, styles.signOutText]}>Abmelden</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.actionItem, styles.deleteAccountItem]} onPress={handleDeleteAccount}>
        <View style={styles.actionInfo}>
          <Ionicons name="trash" size={24} color="#EF4444" />
          <Text style={[styles.actionTitle, styles.deleteAccountText]}>Account löschen</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  // Helper functions
  const getOrderStatusStyle = (status: string) => {
    const styles = {
      completed: { backgroundColor: '#DCFCE7' },
      cancelled: { backgroundColor: '#FEE2E2' },
      default: { backgroundColor: '#FEF3C7' }
    };
    return styles[status as keyof typeof styles] || styles.default;
  };

  const getOrderStatusTextStyle = (status: string) => {
    const styles = {
      completed: { color: '#16A34A' },
      cancelled: { color: '#DC2626' },
      default: { color: '#92400E' }
    };
    return styles[status as keyof typeof styles] || styles.default;
  };

  const getOrderStatusText = (status: string): string => {
    const texts = {
      pending: 'Wartend',
      confirmed: 'Bestätigt',
      preparing: 'Zubereitung',
      ready: 'Bereit',
      completed: 'Abgeschlossen',
      cancelled: 'Storniert'
    };
    return texts[status as keyof typeof texts] || status;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Profil wird geladen...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
        <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
          <Ionicons name="create" size={24} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderProfileHeader()}
        {renderRecentOrders()}
        {renderSettings()}
        {renderActions()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  profileHeader: {
    backgroundColor: 'white',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  profilePhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#ddd',
    marginHorizontal: 16,
  },
  section: {
    backgroundColor: 'white',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '500',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  orderRestaurant: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  orderDetails: {
    alignItems: 'flex-end',
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  orderStatus: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  orderStatusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  settingGroup: {
    marginBottom: 24,
  },
  settingGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  versionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  signOutItem: {
    marginTop: 16,
  },
  signOutText: {
    color: '#EF4444',
  },
  deleteAccountItem: {
    marginTop: 8,
  },
  deleteAccountText: {
    color: '#EF4444',
  },
});

// Add missing imports
import { ActivityIndicator, Image } from 'react-native';

export default ProfileScreen;
