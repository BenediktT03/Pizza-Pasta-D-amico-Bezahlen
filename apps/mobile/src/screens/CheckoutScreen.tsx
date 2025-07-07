// /apps/mobile/src/screens/CheckoutScreen.tsx

import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CardField, StripeProvider, useStripe } from '@stripe/stripe-react-native';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Services & Utils
import { apiService } from '../services/api.service';
import { pushService } from '../services/push.service';
import { storage } from '../utils/storage';

// Types
interface CartItemData {
  id: string;
  productId: string;
  quantity: number;
  modifiers: Array<{
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    price: number;
  }>;
  unitPrice: number;
  modifiersPrice: number;
  totalPrice: number;
  notes?: string;
}

interface CartSummary {
  subtotal: number;
  itemsTotal: number;
  modifiersTotal: number;
  discountTotal: number;
  deliveryFee: number;
  serviceFee: number;
  packagingFee: number;
  taxAmount: number;
  tipAmount: number;
  total: number;
  currency: string;
}

interface Customer {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'twint' | 'cash';
  name: string;
  icon: string;
  enabled: boolean;
}

type RootStackParamList = {
  Cart: undefined;
  Checkout: { cartData: CartItemData[]; summary: CartSummary };
  OrderTracking: { orderId: string };
  OrderConfirmation: { orderId: string; orderNumber: string };
};

const { width: screenWidth } = Dimensions.get('window');

export const CheckoutScreen: React.FC = () => {
  // Navigation & Route
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { cartData, summary } = route.params as { cartData: CartItemData[]; summary: CartSummary };

  // Stripe
  const { createPaymentMethod, confirmPayment } = useStripe();

  // State
  const [customer, setCustomer] = useState<Customer>({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('card');
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [orderType, setOrderType] = useState<'pickup' | 'table'>('pickup');
  const [tableNumber, setTableNumber] = useState<string>('');
  const [language, setLanguage] = useState<string>('de');
  const [tenantId, setTenantId] = useState<string>('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [cardComplete, setCardComplete] = useState(false);
  const [twintPhoneNumber, setTwintPhoneNumber] = useState<string>('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // Available payment methods
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'card',
      type: 'card',
      name: 'Kreditkarte',
      icon: 'card',
      enabled: true
    },
    {
      id: 'twint',
      type: 'twint',
      name: 'TWINT',
      icon: 'phone-portrait',
      enabled: true
    },
    {
      id: 'cash',
      type: 'cash',
      name: 'Bar (bei Abholung)',
      icon: 'cash',
      enabled: orderType === 'pickup'
    }
  ];

  // Validation
  const validateForm = useCallback((): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Customer validation
    if (!customer.name.trim()) {
      newErrors.name = 'Name ist erforderlich';
    }

    if (!customer.phone.trim()) {
      newErrors.phone = 'Telefonnummer ist erforderlich';
    } else if (!/^\+41\d{9}$/.test(customer.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Ungültige Schweizer Telefonnummer (Format: +41 XX XXX XX XX)';
    }

    if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      newErrors.email = 'Ungültige E-Mail-Adresse';
    }

    // Order type validation
    if (orderType === 'table' && !tableNumber.trim()) {
      newErrors.table = 'Tischnummer ist erforderlich';
    }

    // Payment validation
    if (selectedPaymentMethod === 'card' && !cardComplete) {
      newErrors.payment = 'Bitte geben Sie Ihre Kartendaten vollständig ein';
    }

    if (selectedPaymentMethod === 'twint' && !twintPhoneNumber.trim()) {
      newErrors.twint = 'TWINT-Telefonnummer ist erforderlich';
    }

    // Terms validation
    if (!agreeToTerms) {
      newErrors.terms = 'Bitte akzeptieren Sie die AGB und Datenschutzerklärung';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [customer, orderType, tableNumber, selectedPaymentMethod, cardComplete, twintPhoneNumber, agreeToTerms]);

  // Load cached data
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const cachedCustomer = await storage.get('lastCustomer');
        const cachedLanguage = await storage.get('language') || 'de';
        const cachedTenantId = await storage.get('currentTenantId') || '';

        if (cachedCustomer) {
          setCustomer(cachedCustomer);
        }
        setLanguage(cachedLanguage);
        setTenantId(cachedTenantId);
      } catch (error) {
        console.error('Error loading cached data:', error);
      }
    };

    loadCachedData();
  }, []);

  // Create order
  const createOrder = useCallback(async (): Promise<{ orderId: string; orderNumber: string; paymentIntentId?: string }> => {
    try {
      const orderData = {
        type: orderType,
        channel: 'mobile',
        customer: {
          name: customer.name.trim(),
          phone: customer.phone.replace(/\s/g, ''),
          email: customer.email?.trim() || undefined,
          notes: customer.notes?.trim() || undefined
        },
        items: cartData.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          modifiers: item.modifiers,
          unitPrice: item.unitPrice,
          modifiersPrice: item.modifiersPrice,
          totalPrice: item.totalPrice,
          notes: item.notes
        })),
        pricing: summary,
        fulfillment: {
          type: orderType,
          table: orderType === 'table' ? { number: parseInt(tableNumber) } : undefined,
          timing: {
            requestedType: 'asap',
            requestedAt: new Date().toISOString()
          }
        },
        payment: {
          method: selectedPaymentMethod,
          ...(selectedPaymentMethod === 'twint' && { twintPhone: twintPhoneNumber })
        },
        context: {
          language,
          source: 'mobile_app',
          deviceInfo: {
            platform: Platform.OS,
            version: Platform.Version
          }
        }
      };

      const orderResponse = await apiService.post(`/tenants/${tenantId}/orders`, orderData);

      return {
        orderId: orderResponse.id,
        orderNumber: orderResponse.orderNumber,
        paymentIntentId: orderResponse.paymentIntentId
      };

    } catch (error) {
      console.error('Error creating order:', error);
      throw new Error('Bestellung konnte nicht erstellt werden. Bitte versuchen Sie es erneut.');
    }
  }, [orderType, customer, cartData, summary, tableNumber, selectedPaymentMethod, twintPhoneNumber, language, tenantId]);

  // Process payment
  const processPayment = useCallback(async (paymentIntentId: string): Promise<boolean> => {
    try {
      if (selectedPaymentMethod === 'card') {
        // Stripe payment
        const { error } = await confirmPayment(paymentIntentId, {
          paymentMethodType: 'Card'
        });

        if (error) {
          console.error('Payment error:', error);
          Alert.alert('Zahlungsfehler', error.message || 'Die Zahlung konnte nicht verarbeitet werden.');
          return false;
        }

        return true;

      } else if (selectedPaymentMethod === 'twint') {
        // TWINT payment - handled by backend
        const paymentResult = await apiService.post(`/tenants/${tenantId}/payments/twint/confirm`, {
          paymentIntentId,
          phone: twintPhoneNumber
        });

        if (!paymentResult.success) {
          Alert.alert('TWINT-Fehler', paymentResult.message || 'TWINT-Zahlung fehlgeschlagen.');
          return false;
        }

        return true;

      } else if (selectedPaymentMethod === 'cash') {
        // Cash payment - no processing needed
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Zahlungsfehler', 'Die Zahlung konnte nicht verarbeitet werden.');
      return false;
    }
  }, [selectedPaymentMethod, confirmPayment, tenantId, twintPhoneNumber]);

  // Submit order
  const handleSubmitOrder = useCallback(async () => {
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      setIsProcessingOrder(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Save customer data for next time
      await storage.set('lastCustomer', customer);

      // Create order
      const { orderId, orderNumber, paymentIntentId } = await createOrder();

      // Process payment if needed
      if (selectedPaymentMethod !== 'cash' && paymentIntentId) {
        const paymentSuccess = await processPayment(paymentIntentId);
        if (!paymentSuccess) {
          // Cancel order if payment failed
          await apiService.patch(`/tenants/${tenantId}/orders/${orderId}/status`, {
            status: 'cancelled',
            reason: 'payment_failed'
          });
          return;
        }
      }

      // Clear cart
      await storage.set('cart', []);
      await storage.remove('appliedPromo');
      await storage.remove('tipSettings');

      // Register for push notifications for this order
      await pushService.subscribeToOrderUpdates(orderId);

      // Success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Navigate to confirmation
      navigation.reset({
        index: 0,
        routes: [
          { name: 'OrderConfirmation', params: { orderId, orderNumber } }
        ]
      });

    } catch (error) {
      console.error('Error submitting order:', error);
      Alert.alert(
        'Bestellfehler',
        error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten.',
        [
          { text: 'OK', style: 'default' }
        ]
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsProcessingOrder(false);
    }
  }, [validateForm, customer, createOrder, selectedPaymentMethod, processPayment, tenantId, navigation]);

  // Format phone number
  const formatPhoneNumber = useCallback((phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('41')) {
      const withoutCountryCode = cleaned.substring(2);
      return `+41 ${withoutCountryCode.substring(0, 2)} ${withoutCountryCode.substring(2, 5)} ${withoutCountryCode.substring(5, 7)} ${withoutCountryCode.substring(7)}`.trim();
    }
    return phone;
  }, []);

  // Render methods
  const renderCustomerForm = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Kundendaten</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Name *</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          value={customer.name}
          onChangeText={(text) => setCustomer(prev => ({ ...prev, name: text }))}
          placeholder="Ihr vollständiger Name"
          placeholderTextColor="#999"
          autoCapitalize="words"
          returnKeyType="next"
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Telefonnummer *</Text>
        <TextInput
          style={[styles.input, errors.phone && styles.inputError]}
          value={customer.phone}
          onChangeText={(text) => {
            const formatted = formatPhoneNumber(text);
            setCustomer(prev => ({ ...prev, phone: formatted }));
          }}
          placeholder="+41 XX XXX XX XX"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          returnKeyType="next"
        />
        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>E-Mail (optional)</Text>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          value={customer.email}
          onChangeText={(text) => setCustomer(prev => ({ ...prev, email: text }))}
          placeholder="ihre@email.ch"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Notizen (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={customer.notes}
          onChangeText={(text) => setCustomer(prev => ({ ...prev, notes: text }))}
          placeholder="Besondere Wünsche oder Allergien..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>
    </View>
  );

  const renderOrderTypeSelection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Bestellart</Text>

      <View style={styles.orderTypeContainer}>
        <TouchableOpacity
          style={[
            styles.orderTypeOption,
            orderType === 'pickup' && styles.orderTypeOptionActive
          ]}
          onPress={() => {
            setOrderType('pickup');
            setTableNumber('');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Ionicons
            name="walk"
            size={24}
            color={orderType === 'pickup' ? '#FF6B35' : '#666'}
          />
          <Text
            style={[
              styles.orderTypeText,
              orderType === 'pickup' && styles.orderTypeTextActive
            ]}
          >
            Abholung
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.orderTypeOption,
            orderType === 'table' && styles.orderTypeOptionActive
          ]}
          onPress={() => {
            setOrderType('table');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Ionicons
            name="restaurant"
            size={24}
            color={orderType === 'table' ? '#FF6B35' : '#666'}
          />
          <Text
            style={[
              styles.orderTypeText,
              orderType === 'table' && styles.orderTypeTextActive
            ]}
          >
            Tischservice
          </Text>
        </TouchableOpacity>
      </View>

      {orderType === 'table' && (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Tischnummer *</Text>
          <TextInput
            style={[styles.input, styles.tableInput, errors.table && styles.inputError]}
            value={tableNumber}
            onChangeText={setTableNumber}
            placeholder="z.B. 5"
            placeholderTextColor="#999"
            keyboardType="number-pad"
            maxLength={3}
          />
          {errors.table && <Text style={styles.errorText}>{errors.table}</Text>}
        </View>
      )}
    </View>
  );

  const renderPaymentMethods = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Zahlungsmethode</Text>

      {paymentMethods
        .filter(method => method.enabled)
        .map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.paymentMethod,
              selectedPaymentMethod === method.id && styles.paymentMethodActive
            ]}
            onPress={() => {
              setSelectedPaymentMethod(method.id);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <View style={styles.paymentMethodLeft}>
              <Ionicons
                name={method.icon as any}
                size={24}
                color={selectedPaymentMethod === method.id ? '#FF6B35' : '#666'}
              />
              <Text
                style={[
                  styles.paymentMethodText,
                  selectedPaymentMethod === method.id && styles.paymentMethodTextActive
                ]}
              >
                {method.name}
              </Text>
            </View>
            <View
              style={[
                styles.paymentMethodRadio,
                selectedPaymentMethod === method.id && styles.paymentMethodRadioActive
              ]}
            />
          </TouchableOpacity>
        ))}

      {selectedPaymentMethod === 'card' && (
        <View style={styles.cardInputContainer}>
          <CardField
            postalCodeEnabled={false}
            placeholder={{
              number: '4242 4242 4242 4242',
              expiration: 'MM/YY',
              cvc: 'CVC',
            }}
            cardStyle={styles.cardInput}
            style={styles.cardField}
            onCardChange={(details) => {
              setCardComplete(details.complete);
            }}
          />
          {errors.payment && <Text style={styles.errorText}>{errors.payment}</Text>}
        </View>
      )}

      {selectedPaymentMethod === 'twint' && (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>TWINT-Telefonnummer *</Text>
          <TextInput
            style={[styles.input, errors.twint && styles.inputError]}
            value={twintPhoneNumber}
            onChangeText={setTwintPhoneNumber}
            placeholder="+41 XX XXX XX XX"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />
          {errors.twint && <Text style={styles.errorText}>{errors.twint}</Text>}
        </View>
      )}
    </View>
  );

  const renderOrderSummary = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Bestellübersicht</Text>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Zwischensumme</Text>
          <Text style={styles.summaryValue}>CHF {summary.subtotal.toFixed(2)}</Text>
        </View>

        {summary.discountTotal > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, styles.discountLabel]}>Rabatt</Text>
            <Text style={[styles.summaryValue, styles.discountValue]}>
              -CHF {summary.discountTotal.toFixed(2)}
            </Text>
          </View>
        )}

        {summary.packagingFee > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Verpackung</Text>
            <Text style={styles.summaryValue}>CHF {summary.packagingFee.toFixed(2)}</Text>
          </View>
        )}

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>MwSt. (7.7%)</Text>
          <Text style={styles.summaryValue}>CHF {summary.taxAmount.toFixed(2)}</Text>
        </View>

        {summary.tipAmount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Trinkgeld</Text>
            <Text style={styles.summaryValue}>CHF {summary.tipAmount.toFixed(2)}</Text>
          </View>
        )}

        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Gesamt</Text>
          <Text style={styles.totalValue}>CHF {summary.total.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );

  const renderTermsAndSubmit = () => (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.termsContainer}
        onPress={() => {
          setAgreeToTerms(!agreeToTerms);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <View
          style={[
            styles.checkbox,
            agreeToTerms && styles.checkboxActive
          ]}
        >
          {agreeToTerms && (
            <Ionicons name="checkmark" size={16} color="white" />
          )}
        </View>
        <Text style={styles.termsText}>
          Ich akzeptiere die{' '}
          <Text style={styles.termsLink}>AGB</Text>
          {' '}und{' '}
          <Text style={styles.termsLink}>Datenschutzerklärung</Text>
        </Text>
      </TouchableOpacity>
      {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}

      <TouchableOpacity
        style={[
          styles.submitButton,
          (!agreeToTerms || isProcessingOrder) && styles.submitButtonDisabled
        ]}
        onPress={handleSubmitOrder}
        disabled={!agreeToTerms || isProcessingOrder}
      >
        {isProcessingOrder ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <>
            <Text style={styles.submitButtonText}>
              Jetzt bestellen • CHF {summary.total.toFixed(2)}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <StripeProvider
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''}
      merchantIdentifier="merchant.ch.eatech"
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bestellung abschließen</Text>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderCustomerForm()}
            {renderOrderTypeSelection()}
            {renderPaymentMethods()}
            {renderOrderSummary()}
            {renderTermsAndSubmit()}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </StripeProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSpacer: {
    width: 32,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  tableInput: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 18,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  orderTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  orderTypeOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
  },
  orderTypeOptionActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF3F0',
  },
  orderTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginTop: 8,
  },
  orderTypeTextActive: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  paymentMethodActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF3F0',
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 12,
  },
  paymentMethodTextActive: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  paymentMethodRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  paymentMethodRadioActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FF6B35',
  },
  cardInputContainer: {
    marginTop: 12,
  },
  cardField: {
    height: 50,
  },
  cardInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    fontSize: 16,
    placeholderColor: '#999',
  },
  summaryContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
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
  discountLabel: {
    color: '#22C55E',
  },
  discountValue: {
    color: '#22C55E',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 8,
    paddingTop: 12,
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
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FF6B35',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  termsLink: {
    color: '#FF6B35',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default CheckoutScreen;
