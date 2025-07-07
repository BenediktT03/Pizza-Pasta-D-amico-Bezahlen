// /apps/mobile/src/components/ProductCard.tsx

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
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
  description: {
    de: string;
    fr: string;
    it: string;
    en: string;
  };
  pricing: {
    basePrice: number;
    currency: string;
    compareAtPrice?: number;
  };
  media: {
    images: Array<{
      url: string;
      thumbnails: {
        small: string;
        medium: string;
        large: string;
      };
      alt: {
        de: string;
        en: string;
      };
    }>;
    badges?: string[];
  };
  category: string;
  subcategory: string;
  tags: string[];
  availability: {
    status: 'available' | 'unavailable' | 'limited';
    quantity?: number;
  };
  analytics: {
    orders: number;
    rating: number;
  };
  allergens?: {
    contains: string[];
    mayContain: string[];
  };
  dietary?: {
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
    lactoseFree: boolean;
  };
  preparation?: {
    time: {
      total: number; // minutes
    };
  };
}

interface ProductCardProps {
  product: Product;
  language: string;
  currency: string;
  onPress: () => void;
  onAddToCart: (quantity: number, modifiers: any[]) => void;
  style?: ViewStyle;
  compact?: boolean;
  showAddButton?: boolean;
  showBadges?: boolean;
  showRating?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const CARD_MARGIN = 16;
const CARD_WIDTH = screenWidth - (CARD_MARGIN * 2);

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  language,
  currency,
  onPress,
  onAddToCart,
  style,
  compact = false,
  showAddButton = true,
  showBadges = true,
  showRating = true,
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Localized content
  const localizedName = useMemo(() => {
    return product.name[language as keyof typeof product.name] || product.name.de || product.name.en;
  }, [product.name, language]);

  const localizedDescription = useMemo(() => {
    return product.description[language as keyof typeof product.description] ||
           product.description.de ||
           product.description.en;
  }, [product.description, language]);

  // Image handling
  const productImage = useMemo(() => {
    if (product.media.images.length === 0) return null;

    const image = product.media.images[0];
    return compact ? image.thumbnails.small : image.thumbnails.medium;
  }, [product.media.images, compact]);

  const imageAlt = useMemo(() => {
    if (product.media.images.length === 0) return localizedName;

    const image = product.media.images[0];
    return image.alt[language as keyof typeof image.alt] ||
           image.alt.en ||
           localizedName;
  }, [product.media.images, language, localizedName]);

  // Availability status
  const availabilityInfo = useMemo(() => {
    switch (product.availability.status) {
      case 'unavailable':
        return {
          text: 'Nicht verfügbar',
          color: '#EF4444',
          backgroundColor: '#FEE2E2',
          disabled: true
        };
      case 'limited':
        return {
          text: `Nur noch ${product.availability.quantity || 0}`,
          color: '#F59E0B',
          backgroundColor: '#FEF3C7',
          disabled: false
        };
      default:
        return {
          text: 'Verfügbar',
          color: '#10B981',
          backgroundColor: '#D1FAE5',
          disabled: false
        };
    }
  }, [product.availability]);

  // Badges
  const badges = useMemo(() => {
    const badgeList = [];

    // Popularity badge
    if (product.analytics.orders > 50) {
      badgeList.push({
        text: 'Beliebt',
        icon: 'flame',
        color: '#FF6B35',
        backgroundColor: '#FFF3F0'
      });
    }

    // Rating badge
    if (product.analytics.rating >= 4.5) {
      badgeList.push({
        text: 'Top bewertet',
        icon: 'star',
        color: '#F59E0B',
        backgroundColor: '#FEF3C7'
      });
    }

    // Dietary badges
    if (product.dietary?.vegan) {
      badgeList.push({
        text: 'Vegan',
        icon: 'leaf',
        color: '#10B981',
        backgroundColor: '#D1FAE5'
      });
    } else if (product.dietary?.vegetarian) {
      badgeList.push({
        text: 'Vegetarisch',
        icon: 'leaf-outline',
        color: '#10B981',
        backgroundColor: '#D1FAE5'
      });
    }

    if (product.dietary?.glutenFree) {
      badgeList.push({
        text: 'Glutenfrei',
        icon: 'checkmark-circle',
        color: '#3B82F6',
        backgroundColor: '#DBEAFE'
      });
    }

    // Speed badge
    if (product.preparation?.time.total && product.preparation.time.total <= 5) {
      badgeList.push({
        text: 'Schnell',
        icon: 'flash',
        color: '#8B5CF6',
        backgroundColor: '#EDE9FE'
      });
    }

    return badgeList.slice(0, 2); // Show max 2 badges
  }, [product.analytics, product.dietary, product.preparation]);

  // Price display
  const priceInfo = useMemo(() => {
    const hasDiscount = product.pricing.compareAtPrice &&
                       product.pricing.compareAtPrice > product.pricing.basePrice;

    return {
      current: product.pricing.basePrice,
      original: product.pricing.compareAtPrice,
      hasDiscount,
      discountPercent: hasDiscount ?
        Math.round(((product.pricing.compareAtPrice! - product.pricing.basePrice) / product.pricing.compareAtPrice!) * 100) : 0
    };
  }, [product.pricing]);

  // Handlers
  const handlePress = useCallback(() => {
    if (availabilityInfo.disabled) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [availabilityInfo.disabled, onPress]);

  const handleAddToCart = useCallback((event: any) => {
    event.stopPropagation();

    if (availabilityInfo.disabled) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAddToCart(1, []);
  }, [availabilityInfo.disabled, onAddToCart]);

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
              <Ionicons name="image" size={compact ? 24 : 32} color="#ccc" />
            </View>
          )}
        </>
      ) : (
        <View style={[styles.imagePlaceholder, compact && styles.imagePlaceholderCompact]}>
          <Ionicons name="image" size={compact ? 24 : 32} color="#ccc" />
        </View>
      )}

      {/* Availability overlay */}
      {availabilityInfo.disabled && (
        <View style={styles.unavailableOverlay}>
          <Text style={styles.unavailableText}>Nicht verfügbar</Text>
        </View>
      )}

      {/* Discount badge */}
      {priceInfo.hasDiscount && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>-{priceInfo.discountPercent}%</Text>
        </View>
      )}

      {/* Quick badges */}
      {showBadges && badges.length > 0 && (
        <View style={styles.imageBadges}>
          {badges.slice(0, 1).map((badge, index) => (
            <View
              key={index}
              style={[styles.imageBadge, { backgroundColor: badge.backgroundColor }]}
            >
              <Ionicons name={badge.icon as any} size={12} color={badge.color} />
              <Text style={[styles.imageBadgeText, { color: badge.color }]}>
                {badge.text}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderContent = () => (
    <View style={[styles.content, compact && styles.contentCompact]}>
      <View style={styles.header}>
        <Text
          style={[styles.productName, compact && styles.productNameCompact]}
          numberOfLines={compact ? 1 : 2}
        >
          {localizedName}
        </Text>

        {showRating && product.analytics.rating > 0 && (
          <View style={styles.rating}>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text style={styles.ratingText}>{product.analytics.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>

      {!compact && (
        <Text style={styles.productDescription} numberOfLines={2}>
          {localizedDescription}
        </Text>
      )}

      {/* Preparation time */}
      {!compact && product.preparation?.time.total && (
        <View style={styles.prepTime}>
          <Ionicons name="time" size={14} color="#666" />
          <Text style={styles.prepTimeText}>ca. {product.preparation.time.total} Min</Text>
        </View>
      )}

      {/* Dietary badges */}
      {!compact && showBadges && badges.length > 0 && (
        <View style={styles.badges}>
          {badges.map((badge, index) => (
            <View
              key={index}
              style={[styles.badge, { backgroundColor: badge.backgroundColor }]}
            >
              <Ionicons name={badge.icon as any} size={10} color={badge.color} />
              <Text style={[styles.badgeText, { color: badge.color }]}>
                {badge.text}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.priceContainer}>
          <Text style={[styles.currentPrice, compact && styles.currentPriceCompact]}>
            {currency} {priceInfo.current.toFixed(2)}
          </Text>

          {priceInfo.hasDiscount && (
            <Text style={styles.originalPrice}>
              {currency} {priceInfo.original!.toFixed(2)}
            </Text>
          )}
        </View>

        {showAddButton && (
          <TouchableOpacity
            style={[
              styles.addButton,
              compact && styles.addButtonCompact,
              availabilityInfo.disabled && styles.addButtonDisabled
            ]}
            onPress={handleAddToCart}
            disabled={availabilityInfo.disabled}
            accessibilityLabel={`${localizedName} zum Warenkorb hinzufügen`}
            accessibilityRole="button"
          >
            <Ionicons
              name="add"
              size={compact ? 16 : 20}
              color={availabilityInfo.disabled ? '#999' : 'white'}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Availability status */}
      {product.availability.status !== 'available' && (
        <View style={[styles.availabilityBadge, { backgroundColor: availabilityInfo.backgroundColor }]}>
          <Text style={[styles.availabilityText, { color: availabilityInfo.color }]}>
            {availabilityInfo.text}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <TouchableOpacity
      style={[
        styles.container,
        compact && styles.containerCompact,
        availabilityInfo.disabled && styles.containerDisabled,
        style
      ]}
      onPress={handlePress}
      disabled={availabilityInfo.disabled}
      activeOpacity={0.8}
      accessibilityLabel={`${localizedName}, ${currency} ${priceInfo.current.toFixed(2)}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: availabilityInfo.disabled }}
    >
      {compact ? (
        <View style={styles.compactLayout}>
          {renderImage()}
          {renderContent()}
        </View>
      ) : (
        <>
          {renderImage()}
          {renderContent()}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
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
  containerCompact: {
    marginBottom: 8,
  },
  containerDisabled: {
    opacity: 0.6,
  },
  compactLayout: {
    flexDirection: 'row',
  },
  imageContainer: {
    position: 'relative',
    height: 160,
    backgroundColor: '#f0f0f0',
  },
  imageContainerCompact: {
    width: 80,
    height: 80,
    borderRadius: 8,
    margin: 12,
    overflow: 'hidden',
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
  unavailableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unavailableText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  discountText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  imageBadges: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  imageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 4,
  },
  imageBadgeText: {
    fontSize: 8,
    fontWeight: '600',
    marginLeft: 2,
  },
  content: {
    padding: 12,
  },
  contentCompact: {
    flex: 1,
    padding: 12,
    paddingLeft: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  productNameCompact: {
    fontSize: 14,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
    marginLeft: 2,
  },
  productDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginBottom: 8,
  },
  prepTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  prepTimeText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '500',
    marginLeft: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  currentPriceCompact: {
    fontSize: 14,
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginLeft: 6,
  },
  addButton: {
    backgroundColor: '#FF6B35',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  availabilityBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  availabilityText: {
    fontSize: 10,
    fontWeight: '600',
  },
});

export default ProductCard;
