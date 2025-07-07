// /apps/mobile/src/components/CartItem.tsx

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Types
interface Product {
  id: string;
  name: {
    de: string;
    fr: string;
    it: string;
    en: string;
  };
  pricing: {
    basePrice: number;
    currency: string;
  };
  media: {
    images: Array<{
      url: string;
      thumbnails: {
        small: string;
        medium: string;
      };
      alt: {
        de: string;
        en: string;
      };
    }>;
  };
}

interface CartItemData {
  id: string;
  productId: string;
  product?: Product;
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

interface CartItemProps {
  item: CartItemData;
  language: string;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
  isUpdating?: boolean;
  showNotes?: boolean;
  showModifiers?: boolean;
  compact?: boolean;
}

export const CartItem: React.FC<CartItemProps> = ({
  item,
  language,
  onUpdateQuantity,
  onRemove,
  isUpdating = false,
  showNotes = true,
  showModifiers = true,
  compact = false,
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);
  const [editQuantity, setEditQuantity] = useState(item.quantity.toString());

  // Localized content
  const localizedName = useMemo(() => {
    if (!item.product) return `Produkt ${item.productId}`;

    return item.product.name[language as keyof typeof item.product.name] ||
           item.product.name.de ||
           item.product.name.en ||
           `Produkt ${item.productId}`;
  }, [item.product, language, item.productId]);

  // Image handling
  const productImage = useMemo(() => {
    if (!item.product?.media.images.length) return null;
    return item.product.media.images[0].thumbnails.small;
  }, [item.product]);

  const imageAlt = useMemo(() => {
    if (!item.product?.media.images.length) return localizedName;

    const image = item.product.media.images[0];
    return image.alt[language as keyof typeof image.alt] ||
           image.alt.en ||
           localizedName;
  }, [item.product, language, localizedName]);

  // Price calculations
  const priceDetails = useMemo(() => {
    const basePrice = item.unitPrice * item.quantity;
    const modifiersTotal = item.modifiersPrice * item.quantity;
    const total = basePrice + modifiersTotal;

    return {
      basePrice,
      modifiersTotal,
      total,
      currency: item.product?.pricing.currency || 'CHF'
    };
  }, [item.unitPrice, item.modifiersPrice, item.quantity, item.product]);

  // Handlers
  const handleQuantityDecrease = useCallback(() => {
    if (isUpdating || item.quantity <= 1) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdateQuantity(item.quantity - 1);
  }, [isUpdating, item.quantity, onUpdateQuantity]);

  const handleQuantityIncrease = useCallback(() => {
    if (isUpdating || item.quantity >= 99) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdateQuantity(item.quantity + 1);
  }, [isUpdating, item.quantity, onUpdateQuantity]);

  const handleQuantityEdit = useCallback(() => {
    setIsEditingQuantity(true);
    setEditQuantity(item.quantity.toString());
  }, [item.quantity]);

  const handleQuantitySubmit = useCallback(() => {
    const newQuantity = parseInt(editQuantity, 10);

    if (isNaN(newQuantity) || newQuantity < 1) {
      setEditQuantity(item.quantity.toString());
      setIsEditingQuantity(false);
      return;
    }

    if (newQuantity > 99) {
      Alert.alert('Maximale Menge', 'Die maximale Menge pro Artikel ist 99.');
      setEditQuantity('99');
      return;
    }

    setIsEditingQuantity(false);

    if (newQuantity !== item.quantity) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onUpdateQuantity(newQuantity);
    }
  }, [editQuantity, item.quantity, onUpdateQuantity]);

  const handleQuantityCancel = useCallback(() => {
    setEditQuantity(item.quantity.toString());
    setIsEditingQuantity(false);
  }, [item.quantity]);

  const handleRemove = useCallback(() => {
    if (isUpdating) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onRemove();
  }, [isUpdating, onRemove]);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageLoading(false);
    setImageError(true);
  }, []);

  // Render methods
  const renderImage = () => (
    <View style={[styles.imageContainer, compact && styles.imageContainerCompact]}>
      {productImage && !imageError ? (
        <>
          <Image
            source={{ uri: productImage }}
            style={[styles.productImage, compact && styles.productImageCompact]}
            onLoad={handleImageLoad}
            onError={handleImageError}
            resizeMode="cover"
            accessibilityLabel={imageAlt}
          />

          {imageLoading && (
            <View style={[styles.imagePlaceholder, compact && styles.imagePlaceholderCompact]}>
              <ActivityIndicator size="small" color="#ccc" />
            </View>
          )}
        </>
      ) : (
        <View style={[styles.imagePlaceholder, compact && styles.imagePlaceholderCompact]}>
          <Ionicons name="image" size={compact ? 20 : 24} color="#ccc" />
        </View>
      )}
    </View>
  );

  const renderProductInfo = () => (
    <View style={[styles.productInfo, compact && styles.productInfoCompact]}>
      <Text style={[styles.productName, compact && styles.productNameCompact]} numberOfLines={2}>
        {localizedName}
      </Text>

      {/* Base price display */}
      <Text style={[styles.unitPrice, compact && styles.unitPriceCompact]}>
        {priceDetails.currency} {item.unitPrice.toFixed(2)}
        {item.modifiersPrice > 0 && (
          <Text style={styles.modifiersPriceText}>
            {' '}+ {priceDetails.currency} {item.modifiersPrice.toFixed(2)}
          </Text>
        )}
      </Text>

      {/* Modifiers */}
      {showModifiers && item.modifiers.length > 0 && !compact && (
        <View style={styles.modifiersContainer}>
          {item.modifiers.map((modifier, index) => (
            <View key={`${modifier.groupId}-${modifier.optionId}-${index}`} style={styles.modifier}>
              <Text style={styles.modifierText}>
                + {modifier.optionName}
                {modifier.price > 0 && (
                  <Text style={styles.modifierPrice}>
                    {' '}({priceDetails.currency} {modifier.price.toFixed(2)})
                  </Text>
                )}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Notes */}
      {showNotes && item.notes && !compact && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Notiz:</Text>
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
      )}
    </View>
  );

  const renderQuantityControls = () => (
    <View style={[styles.quantityContainer, compact && styles.quantityContainerCompact]}>
      {isEditingQuantity ? (
        <View style={styles.quantityEditContainer}>
          <TextInput
            style={styles.quantityInput}
            value={editQuantity}
            onChangeText={setEditQuantity}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            onSubmitEditing={handleQuantitySubmit}
            onBlur={handleQuantitySubmit}
            autoFocus
          />
          <View style={styles.quantityEditButtons}>
            <TouchableOpacity onPress={handleQuantityCancel} style={styles.quantityEditButton}>
              <Ionicons name="close" size={12} color="#EF4444" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleQuantitySubmit} style={styles.quantityEditButton}>
              <Ionicons name="checkmark" size={12} color="#10B981" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={[
              styles.quantityButton,
              styles.decreaseButton,
              (item.quantity <= 1 || isUpdating) && styles.quantityButtonDisabled
            ]}
            onPress={handleQuantityDecrease}
            disabled={item.quantity <= 1 || isUpdating}
            accessibilityLabel="Menge verringern"
            accessibilityRole="button"
          >
            <Ionicons
              name="remove"
              size={16}
              color={(item.quantity <= 1 || isUpdating) ? '#ccc' : '#666'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quantityDisplay}
            onPress={handleQuantityEdit}
            disabled={isUpdating}
            accessibilityLabel={`Menge: ${item.quantity}, zum Bearbeiten tippen`}
            accessibilityRole="button"
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <Text style={[styles.quantityText, compact && styles.quantityTextCompact]}>
                {item.quantity}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quantityButton,
              styles.increaseButton,
              (item.quantity >= 99 || isUpdating) && styles.quantityButtonDisabled
            ]}
            onPress={handleQuantityIncrease}
            disabled={item.quantity >= 99 || isUpdating}
            accessibilityLabel="Menge erhöhen"
            accessibilityRole="button"
          >
            <Ionicons
              name="add"
              size={16}
              color={(item.quantity >= 99 || isUpdating) ? '#ccc' : '#666'}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderPriceAndActions = () => (
    <View style={[styles.priceAndActions, compact && styles.priceAndActionsCompact]}>
      <View style={styles.priceContainer}>
        <Text style={[styles.totalPrice, compact && styles.totalPriceCompact]}>
          {priceDetails.currency} {priceDetails.total.toFixed(2)}
        </Text>

        {!compact && item.modifiers.length > 0 && (
          <Text style={styles.priceBreakdown}>
            Basis: {priceDetails.currency} {priceDetails.basePrice.toFixed(2)}
            {priceDetails.modifiersTotal > 0 && (
              <>
                {'\n'}Extras: {priceDetails.currency} {priceDetails.modifiersTotal.toFixed(2)}
              </>
            )}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.removeButton, isUpdating && styles.removeButtonDisabled]}
        onPress={handleRemove}
        disabled={isUpdating}
        accessibilityLabel={`${localizedName} entfernen`}
        accessibilityRole="button"
      >
        <Ionicons
          name="trash-outline"
          size={compact ? 16 : 18}
          color={isUpdating ? '#ccc' : '#EF4444'}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {compact ? (
        <View style={styles.compactLayout}>
          {renderImage()}
          <View style={styles.compactContent}>
            {renderProductInfo()}
            <View style={styles.compactFooter}>
              {renderQuantityControls()}
              {renderPriceAndActions()}
            </View>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.mainContent}>
            {renderImage()}
            {renderProductInfo()}
            {renderPriceAndActions()}
          </View>
          {renderQuantityControls()}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  containerCompact: {
    padding: 12,
    marginBottom: 8,
  },
  compactLayout: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactContent: {
    flex: 1,
    marginLeft: 12,
  },
  compactFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  mainContent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    marginRight: 12,
  },
  imageContainerCompact: {
    width: 50,
    height: 50,
    marginRight: 0,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImageCompact: {
    borderRadius: 8,
  },
  imagePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  imagePlaceholderCompact: {
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productInfoCompact: {
    marginRight: 0,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productNameCompact: {
    fontSize: 14,
    marginBottom: 2,
  },
  unitPrice: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  unitPriceCompact: {
    fontSize: 12,
    marginBottom: 4,
  },
  modifiersPriceText: {
    color: '#FF6B35',
  },
  modifiersContainer: {
    marginBottom: 8,
  },
  modifier: {
    marginBottom: 2,
  },
  modifierText: {
    fontSize: 12,
    color: '#666',
  },
  modifierPrice: {
    color: '#FF6B35',
    fontWeight: '500',
  },
  notesContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  notesText: {
    fontSize: 12,
    color: '#333',
    fontStyle: 'italic',
  },
  quantityContainer: {
    alignItems: 'center',
  },
  quantityContainerCompact: {
    // No additional styles needed for compact
  },
  quantityEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 4,
  },
  quantityInput: {
    backgroundColor: 'white',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 40,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  quantityEditButtons: {
    flexDirection: 'row',
    marginLeft: 8,
    gap: 4,
  },
  quantityEditButton: {
    padding: 4,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    padding: 2,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  quantityButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
  decreaseButton: {
    // Specific styles for decrease button if needed
  },
  increaseButton: {
    // Specific styles for increase button if needed
  },
  quantityDisplay: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  quantityTextCompact: {
    fontSize: 14,
  },
  priceAndActions: {
    alignItems: 'flex-end',
  },
  priceAndActionsCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceContainer: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  totalPriceCompact: {
    fontSize: 14,
  },
  priceBreakdown: {
    fontSize: 10,
    color: '#999',
    textAlign: 'right',
    marginTop: 2,
    lineHeight: 12,
  },
  removeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  removeButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
});

export default CartItem;
