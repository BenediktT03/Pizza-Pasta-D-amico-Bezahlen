// /apps/mobile/src/screens/OrderTrackingScreen.tsx

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { differenceInMinutes, format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Services & Utils
import { apiService } from '../services/api.service';
import { pushService } from '../services/push.service';
import { storage } from '../utils/storage';

// Types
interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  modifiers: Array<{
    groupName: string;
    optionName: string;
    price: number;
  }>;
  unitPrice: number;
  totalPrice: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed';
  notes?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'completed' | 'cancelled';
  type: 'pickup' | 'delivery' | 'dinein';
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  items: OrderItem[];
  pricing: {
    subtotal: number;
    discountTotal: number;
    taxAmount: number;
    tipAmount: number;
    total: number;
    currency: string;
  };
  fulfillment: {
    type: 'pickup' | 'delivery' | 'table';
    timing: {
      requestedAt: string;
      promisedAt: string;
      estimatedAt: string;
      confirmedAt?: string;
      startedAt?: string;
      readyAt?: string;
      completedAt?: string;
    };
    pickup?: {
      code: string;
      qrCode: string;
      instructions?: string;
    };
    table?: {
      number: number;
    };
  };
  payment: {
    method: string;
    status: 'pending' | 'paid' | 'failed' | 'refunded';
  };
  tenant: {
    id: string;
    name: string;
    contact: {
      phone: string;
      email: string;
    };
    branding: {
      colors: {
        primary: string;
        secondary: string;
      };
    };
  };
  createdAt: string;
  updatedAt: string;
}

interface QueueInfo {
  position: number;
  estimatedWaitTime: number; // minutes
  ordersAhead: number;
}

type RootStackParamList = {
  OrderTracking: { orderId: string };
  Menu: { tenantId?: string };
  Cart: undefined;
  Support: { orderId: string };
};

const { width: screenWidth } = Dimensions.get('window');

export const OrderTrackingScreen: React.FC = () => {
  // Navigation & Route
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { orderId } = route.params as { orderId: string };

  // State
  const [order, setOrder] = useState<Order | null>(null);
  const [queueInfo, setQueueInfo] = useState<QueueInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [language, setLanguage] = useState<string>('de');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Computed values
  const statusInfo = useMemo(() => {
    if (!order) return null;

    const statusConfig = {
      pending: {
        title: 'Bestellung eingegangen',
        description: 'Ihre Bestellung wird geprüft',
        icon: 'hourglass-outline',
        color: '#F59E0B',
        progress: 0.2
      },
      confirmed: {
        title: 'Bestellung bestätigt',
        description: 'Ihre Bestellung wurde bestätigt',
        icon: 'checkmark-circle',
        color: '#10B981',
        progress: 0.4
      },
      preparing: {
        title: 'Wird zubereitet',
        description: 'Ihr Essen wird frisch zubereitet',
        icon: 'restaurant',
        color: '#3B82F6',
        progress: 0.6
      },
      ready: {
        title: order.type === 'pickup' ? 'Bereit zur Abholung' : 'Bereit zum Servieren',
        description: order.type === 'pickup' ?
          `Abholen mit Code: ${order.fulfillment.pickup?.code}` :
          `Tisch ${order.fulfillment.table?.number}`,
        icon: 'checkmark-done',
        color: '#22C55E',
        progress: 0.8
      },
      picked_up: {
        title: 'Abgeholt',
        description: 'Bestellung wurde abgeholt',
        icon: 'bag-check',
        color: '#22C55E',
        progress: 1.0
      },
      delivered: {
        title: 'Serviert',
        description: 'Bestellung wurde serviert',
        icon: 'restaurant',
        color: '#22C55E',
        progress: 1.0
      },
      completed: {
        title: 'Abgeschlossen',
        description: 'Bestellung erfolgreich abgeschlossen',
        icon: 'star',
        color: '#22C55E',
        progress: 1.0
      },
      cancelled: {
        title: 'Storniert',
        description: 'Bestellung wurde storniert',
        icon: 'close-circle',
        color: '#EF4444',
        progress: 0
      }
    };

    return statusConfig[order.status] || statusConfig.pending;
  }, [order]);

  const estimatedReadyTime = useMemo(() => {
    if (!order) return null;

    const timing = order.fulfillment.timing;

    if (timing.readyAt) {
      return parseISO(timing.readyAt);
    }

    if (timing.estimatedAt) {
      return parseISO(timing.estimatedAt);
    }

    if (timing.promisedAt) {
      return parseISO(timing.promisedAt);
    }

    return null;
  }, [order]);

  const timeRemaining = useMemo(() => {
    if (!estimatedReadyTime || !order) return null;

    if (['ready', 'picked_up', 'delivered', 'completed'].includes(order.status)) {
      return null;
    }

    const minutes = differenceInMinutes(estimatedReadyTime, currentTime);
    return Math.max(0, minutes);
  }, [estimatedReadyTime, currentTime, order]);

  // Load order data
  const loadOrderData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);

      // Load cached language
      const cachedLanguage = await storage.get('language') || 'de';
      setLanguage(cachedLanguage);

      // Load order details
      const [orderData, queueData] = await Promise.all([
        apiService.get(`/orders/${orderId}`),
        apiService.get(`/orders/${orderId}/queue`).catch(() => null) // Queue info optional
      ]);

      setOrder(orderData);

      if (queueData) {
        setQueueInfo(queueData);
      }

      // Cache order for offline access
      await storage.set(`order_${orderId}`, orderData);

    } catch (error) {
      console.error('Error loading order data:', error);

      // Try to load cached data
      const cachedOrder = await storage.get(`order_${orderId}`);
      if (cachedOrder) {
        setOrder(cachedOrder);
      } else {
        Alert.alert(
          'Fehler',
          'Die Bestellung konnte nicht geladen werden. Bitte versuchen Sie es erneut.',
          [
            { text: 'Wiederholen', onPress: () => loadOrderData() },
            { text: 'Zurück', onPress: () => navigation.goBack() }
          ]
        );
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [orderId, navigation]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadOrderData(false);
  }, [loadOrderData]);

  // Real-time updates via WebSocket/Push
  const setupRealTimeUpdates = useCallback(() => {
    const handleOrderUpdate = (updatedOrder: Order) => {
      setOrder(updatedOrder);

      // Show notification for status changes
      if (updatedOrder.status === 'ready') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Bestellung bereit! 🎉',
          updatedOrder.type === 'pickup' ?
            `Ihre Bestellung ist bereit zur Abholung. Code: ${updatedOrder.fulfillment.pickup?.code}` :
            `Ihre Bestellung wird serviert.`,
          [{ text: 'OK' }]
        );
      }
    };

    // Subscribe to push notifications for this order
    pushService.subscribeToOrderUpdates(orderId, handleOrderUpdate);

    return () => {
      pushService.unsubscribeFromOrderUpdates(orderId);
    };
  }, [orderId]);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Effects
  useFocusEffect(
    useCallback(() => {
      loadOrderData();
      const cleanup = setupRealTimeUpdates();

      return cleanup;
    }, [loadOrderData, setupRealTimeUpdates])
  );

  // Actions
  const handleCallRestaurant = useCallback(() => {
    if (!order?.tenant.contact.phone) return;

    Alert.alert(
      'Restaurant anrufen',
      `Möchten Sie ${order.tenant.name} anrufen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Anrufen',
          onPress: () => {
            Linking.openURL(`tel:${order.tenant.contact.phone}`);
          }
        }
      ]
    );
  }, [order]);

  const handleReorder = useCallback(() => {
    if (!order) return;

    Alert.alert(
      'Erneut bestellen',
      'Möchten Sie die gleichen Artikel erneut bestellen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Zur Speisekarte',
          onPress: () => {
            navigation.navigate('Menu', { tenantId: order.tenant.id });
          }
        }
      ]
    );
  }, [order, navigation]);

  const handleCancelOrder = useCallback(() => {
    if (!order || !['pending', 'confirmed'].includes(order.status)) return;

    Alert.alert(
      'Bestellung stornieren',
      'Möchten Sie diese Bestellung wirklich stornieren? Diese Aktion kann nicht rückgängig gemacht werden.',
      [
        { text: 'Nein', style: 'cancel' },
        {
          text: 'Ja, stornieren',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.patch(`/orders/${orderId}/status`, {
                status: 'cancelled',
                reason: 'customer_request'
              });

              await loadOrderData(false);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            } catch (error) {
              console.error('Error cancelling order:', error);
              Alert.alert('Fehler', 'Die Bestellung konnte nicht storniert werden.');
            }
          }
        }
      ]
    );
  }, [order, orderId, loadOrderData]);

  // Render methods
  const renderHeader = () => (
    <LinearGradient
      colors={order ? [order.tenant.branding.colors.primary, order.tenant.branding.colors.secondary] : ['#FF6B35', '#004E89']}
      style={styles.header}
    >
      <SafeAreaView edges={['top']}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Bestellung #{order?.orderNumber}</Text>
            <Text style={styles.headerSubtitle}>{order?.tenant.name}</Text>
          </View>

          <TouchableOpacity onPress={handleCallRestaurant} style={styles.callButton}>
            <Ionicons name="call" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );

  const renderStatusCard = () => {
    if (!statusInfo || !order) return null;

    return (
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusIcon, { backgroundColor: statusInfo.color }]}>
            <Ionicons name={statusInfo.icon as any} size={24} color="white" />
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>{statusInfo.title}</Text>
            <Text style={styles.statusDescription}>{statusInfo.description}</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${statusInfo.progress * 100}%`,
                  backgroundColor: statusInfo.color
                }
              ]}
            />
          </View>
        </View>

        {/* Time Information */}
        {timeRemaining !== null && timeRemaining > 0 && (
          <View style={styles.timeInfo}>
            <Ionicons name="time" size={16} color="#666" />
            <Text style={styles.timeText}>
              Noch ca. {timeRemaining} Min
            </Text>
          </View>
        )}

        {estimatedReadyTime && (
          <View style={styles.timeInfo}>
            <Ionicons name="alarm" size={16} color="#666" />
            <Text style={styles.timeText}>
              Fertig um {format(estimatedReadyTime, 'HH:mm', { locale: de })} Uhr
            </Text>
          </View>
        )}

        {queueInfo && queueInfo.position > 0 && (
          <View style={styles.queueInfo}>
            <Text style={styles.queueText}>
              Position in der Warteschlange: {queueInfo.position}
              {queueInfo.ordersAhead > 0 && ` (${queueInfo.ordersAhead} Bestellungen vor Ihnen)`}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderOrderDetails = () => {
    if (!order) return null;

    return (
      <View style={styles.detailsCard}>
        <Text style={styles.cardTitle}>Bestelldetails</Text>

        {order.items.map((item, index) => (
          <View key={index} style={styles.orderItem}>
            <View style={styles.orderItemHeader}>
              <Text style={styles.orderItemName}>
                {item.quantity}x {item.productName}
              </Text>
              <Text style={styles.orderItemPrice}>
                CHF {item.totalPrice.toFixed(2)}
              </Text>
            </View>

            {item.modifiers.length > 0 && (
              <View style={styles.orderItemModifiers}>
                {item.modifiers.map((modifier, modIndex) => (
                  <Text key={modIndex} style={styles.modifierText}>
                    + {modifier.optionName}
                    {modifier.price > 0 && ` (+CHF ${modifier.price.toFixed(2)})`}
                  </Text>
                ))}
              </View>
            )}

            {item.notes && (
              <Text style={styles.orderItemNotes}>
                Notiz: {item.notes}
              </Text>
            )}

            {/* Item Status */}
            <View style={styles.itemStatus}>
              <View style={[
                styles.itemStatusDot,
                { backgroundColor: getItemStatusColor(item.status) }
              ]} />
              <Text style={styles.itemStatusText}>
                {getItemStatusText(item.status)}
              </Text>
            </View>
          </View>
        ))}

        {/* Order Summary */}
        <View style={styles.orderSummary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Zwischensumme</Text>
            <Text style={styles.summaryValue}>CHF {order.pricing.subtotal.toFixed(2)}</Text>
          </View>

          {order.pricing.discountTotal > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#22C55E' }]}>Rabatt</Text>
              <Text style={[styles.summaryValue, { color: '#22C55E' }]}>
                -CHF {order.pricing.discountTotal.toFixed(2)}
              </Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>MwSt.</Text>
            <Text style={styles.summaryValue}>CHF {order.pricing.taxAmount.toFixed(2)}</Text>
          </View>

          {order.pricing.tipAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Trinkgeld</Text>
              <Text style={styles.summaryValue}>CHF {order.pricing.tipAmount.toFixed(2)}</Text>
            </View>
          )}

          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Gesamt</Text>
            <Text style={styles.totalValue}>CHF {order.pricing.total.toFixed(2)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderPickupInfo = () => {
    if (!order || order.type !== 'pickup' || !order.fulfillment.pickup) return null;

    return (
      <View style={styles.pickupCard}>
        <Text style={styles.cardTitle}>Abholinformationen</Text>

        <View style={styles.pickupCodeContainer}>
          <Text style={styles.pickupCodeLabel}>Abholcode:</Text>
          <View style={styles.pickupCode}>
            <Text style={styles.pickupCodeText}>{order.fulfillment.pickup.code}</Text>
          </View>
        </View>

        {order.fulfillment.pickup.instructions && (
          <View style={styles.pickupInstructions}>
            <Text style={styles.instructionsTitle}>Anweisungen:</Text>
            <Text style={styles.instructionsText}>
              {order.fulfillment.pickup.instructions}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderActionButtons = () => {
    if (!order) return null;

    return (
      <View style={styles.actionsCard}>
        {['pending', 'confirmed'].includes(order.status) && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelOrder}>
            <Ionicons name="close-circle" size={20} color="#EF4444" />
            <Text style={styles.cancelButtonText}>Bestellung stornieren</Text>
          </TouchableOpacity>
        )}

        {['completed', 'picked_up', 'delivered'].includes(order.status) && (
          <TouchableOpacity style={styles.reorderButton} onPress={handleReorder}>
            <Ionicons name="refresh" size={20} color="#FF6B35" />
            <Text style={styles.reorderButtonText}>Erneut bestellen</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.supportButton} onPress={() => navigation.navigate('Support', { orderId })}>
          <Ionicons name="help-circle" size={20} color="#666" />
          <Text style={styles.supportButtonText}>Hilfe & Support</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Helper functions
  const getItemStatusColor = (status: string): string => {
    const colors = {
      pending: '#F59E0B',
      preparing: '#3B82F6',
      ready: '#22C55E',
      completed: '#22C55E'
    };
    return colors[status as keyof typeof colors] || '#F59E0B';
  };

  const getItemStatusText = (status: string): string => {
    const texts = {
      pending: 'Wartend',
      preparing: 'Zubereitung',
      ready: 'Fertig',
      completed: 'Abgeschlossen'
    };
    return texts[status as keyof typeof texts] || 'Wartend';
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Bestellung wird geladen...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>Bestellung nicht gefunden</Text>
        <Text style={styles.errorText}>
          Die angeforderte Bestellung konnte nicht gefunden werden.
        </Text>
        <TouchableOpacity style={styles.backToMenuButton} onPress={() => navigation.navigate('Menu', {})}>
          <Text style={styles.backToMenuButtonText}>Zur Speisekarte</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={order.tenant.branding.colors.primary} />

      {renderHeader()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[order.tenant.branding.colors.primary]}
            tintColor={order.tenant.branding.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderStatusCard()}
        {renderPickupInfo()}
        {renderOrderDetails()}
        {renderActionButtons()}
      </ScrollView>
    </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#f8f9fa',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 24,
  },
  backToMenuButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 25,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginTop: 32,
  },
  backToMenuButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  callButton: {
    padding: 8,
    marginLeft: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  queueInfo: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  queueText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  pickupCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  actionsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  orderItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 16,
    marginBottom: 16,
  },
  orderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  orderItemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
    marginLeft: 12,
  },
  orderItemModifiers: {
    marginTop: 8,
  },
  modifierText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  orderItemNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  itemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  itemStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  itemStatusText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  orderSummary: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  pickupCodeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  pickupCodeLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  pickupCode: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  pickupCodeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B35',
    letterSpacing: 4,
  },
  pickupInstructions: {
    marginTop: 16,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    marginBottom: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '500',
    marginLeft: 8,
  },
  reorderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFF3F0',
    borderWidth: 1,
    borderColor: '#FF6B35',
    borderRadius: 12,
    marginBottom: 12,
  },
  reorderButtonText: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '500',
    marginLeft: 8,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  supportButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default OrderTrackingScreen;
