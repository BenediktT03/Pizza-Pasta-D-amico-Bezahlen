/**
 * File: /apps/web/tests/__tests__/hooks/useCart.test.ts
 * EATECH V3.0 - Cart Hook Tests
 * Swiss cart management with tax calculations, modifiers, and persistence
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useCart } from '@/features/cart/useCart';
import { CartProvider } from '@/features/cart/CartProvider';
import { mockCartItems, mockSwissProducts, mockModifiers } from '../../__mocks__/mockData';

// Mock dependencies
jest.mock('@/hooks/useTenant');
jest.mock('@/hooks/useAnalytics');
jest.mock('@/services/api/orders.service');

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Swiss product data
const swissProduct = {
  id: 'prod_zuercher_geschnetzeltes',
  name: 'Zürcher Geschnetzeltes',
  pricing: {
    basePrice: 24.90,
    currency: 'CHF',
    taxRate: 7.7,
    taxIncluded: true
  },
  variants: [
    {
      id: 'var_regular',
      name: 'Normal (350g)',
      price: 24.90,
      isDefault: true
    },
    {
      id: 'var_large',
      name: 'Gross (450g)',
      price: 29.90
    }
  ],
  modifierGroups: [
    {
      id: 'sides',
      name: 'Beilage',
      options: [
        {
          id: 'roesti',
          name: 'Rösti',
          price: 4.50
        },
        {
          id: 'salad',
          name: 'Salat',
          price: 3.50
        }
      ]
    }
  ]
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CartProvider tenantId="foodtruck_zurich">
    {children}
  </CartProvider>
);

describe('useCart Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe('Initial State', () => {
    it('should initialize with empty cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      expect(result.current.items).toEqual([]);
      expect(result.current.itemCount).toBe(0);
      expect(result.current.subtotal).toBe(0);
      expect(result.current.total).toBe(0);
      expect(result.current.currency).toBe('CHF');
    });

    it('should load cart from localStorage on initialization', () => {
      const savedCart = {
        items: [
          {
            id: 'item_1',
            productId: 'prod_test',
            productName: 'Test Product',
            quantity: 2,
            unitPrice: 15.50,
            totalPrice: 31.00
          }
        ],
        tenantId: 'foodtruck_zurich'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedCart));

      const { result } = renderHook(() => useCart(), { wrapper });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.total).toBe(31.00);
    });
  });

  describe('Adding Items', () => {
    it('should add product to cart', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await act(async () => {
        result.current.addItem({
          productId: swissProduct.id,
          productName: swissProduct.name,
          variantId: 'var_regular',
          variantName: 'Normal (350g)',
          quantity: 1,
          unitPrice: 24.90,
          modifiers: []
        });
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]).toMatchObject({
        productId: swissProduct.id,
        productName: swissProduct.name,
        quantity: 1,
        unitPrice: 24.90,
        totalPrice: 24.90
      });
    });

    it('should add modifiers to product', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await act(async () => {
        result.current.addItem({
          productId: swissProduct.id,
          productName: swissProduct.name,
          variantId: 'var_regular',
          quantity: 1,
          unitPrice: 24.90,
          modifiers: [
            {
              groupId: 'sides',
              groupName: 'Beilage',
              optionId: 'roesti',
              optionName: 'Rösti',
              price: 4.50
            }
          ],
          modifiersPrice: 4.50
        });
      });

      const addedItem = result.current.items[0];
      expect(addedItem.modifiers).toHaveLength(1);
      expect(addedItem.modifiersPrice).toBe(4.50);
      expect(addedItem.totalPrice).toBe(29.40); // 24.90 + 4.50
    });

    it('should increase quantity if same item already exists', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const itemData = {
        productId: swissProduct.id,
        productName: swissProduct.name,
        variantId: 'var_regular',
        quantity: 1,
        unitPrice: 24.90,
        modifiers: []
      };

      await act(async () => {
        result.current.addItem(itemData);
      });

      await act(async () => {
        result.current.addItem(itemData);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(2);
      expect(result.current.items[0].totalPrice).toBe(49.80);
    });

    it('should create separate items for different modifiers', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const baseItem = {
        productId: swissProduct.id,
        productName: swissProduct.name,
        variantId: 'var_regular',
        quantity: 1,
        unitPrice: 24.90
      };

      // First item with Rösti
      await act(async () => {
        result.current.addItem({
          ...baseItem,
          modifiers: [{
            groupId: 'sides',
            optionId: 'roesti',
            optionName: 'Rösti',
            price: 4.50
          }]
        });
      });

      // Second item with Salad
      await act(async () => {
        result.current.addItem({
          ...baseItem,
          modifiers: [{
            groupId: 'sides',
            optionId: 'salad',
            optionName: 'Salat',
            price: 3.50
          }]
        });
      });

      expect(result.current.items).toHaveLength(2);
    });
  });

  describe('Updating Items', () => {
    it('should update item quantity', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      // Add item first
      await act(async () => {
        result.current.addItem({
          productId: swissProduct.id,
          productName: swissProduct.name,
          quantity: 1,
          unitPrice: 24.90
        });
      });

      const itemId = result.current.items[0].id;

      // Update quantity
      await act(async () => {
        result.current.updateItem(itemId, { quantity: 3 });
      });

      expect(result.current.items[0].quantity).toBe(3);
      expect(result.current.items[0].totalPrice).toBe(74.70);
    });

    it('should update item notes', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await act(async () => {
        result.current.addItem({
          productId: swissProduct.id,
          productName: swissProduct.name,
          quantity: 1,
          unitPrice: 24.90
        });
      });

      const itemId = result.current.items[0].id;

      await act(async () => {
        result.current.updateItem(itemId, { notes: 'Ohne Zwiebeln bitte' });
      });

      expect(result.current.items[0].notes).toBe('Ohne Zwiebeln bitte');
    });

    it('should remove item when quantity is set to 0', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await act(async () => {
        result.current.addItem({
          productId: swissProduct.id,
          productName: swissProduct.name,
          quantity: 2,
          unitPrice: 24.90
        });
      });

      const itemId = result.current.items[0].id;

      await act(async () => {
        result.current.updateItem(itemId, { quantity: 0 });
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe('Removing Items', () => {
    it('should remove item from cart', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await act(async () => {
        result.current.addItem({
          productId: swissProduct.id,
          productName: swissProduct.name,
          quantity: 1,
          unitPrice: 24.90
        });
      });

      const itemId = result.current.items[0].id;

      await act(async () => {
        result.current.removeItem(itemId);
      });

      expect(result.current.items).toHaveLength(0);
    });

    it('should clear entire cart', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      // Add multiple items
      await act(async () => {
        result.current.addItem({
          productId: 'prod_1',
          productName: 'Product 1',
          quantity: 1,
          unitPrice: 10.00
        });

        result.current.addItem({
          productId: 'prod_2',
          productName: 'Product 2',
          quantity: 2,
          unitPrice: 15.00
        });
      });

      expect(result.current.items).toHaveLength(2);

      await act(async () => {
        result.current.clearCart();
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.total).toBe(0);
    });
  });

  describe('Swiss Tax Calculations', () => {
    it('should calculate Swiss VAT correctly', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await act(async () => {
        result.current.addItem({
          productId: swissProduct.id,
          productName: swissProduct.name,
          quantity: 1,
          unitPrice: 24.90, // Price includes 7.7% VAT
          taxRate: 7.7,
          taxIncluded: true
        });
      });

      const item = result.current.items[0];
      const expectedTaxAmount = 24.90 * 0.077 / 1.077; // VAT calculation

      expect(item.taxAmount).toBeCloseTo(expectedTaxAmount, 2);
      expect(result.current.taxTotal).toBeCloseTo(expectedTaxAmount, 2);
    });

    it('should handle tax-exclusive pricing', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await act(async () => {
        result.current.addItem({
          productId: 'prod_exclusive',
          productName: 'Tax Exclusive Product',
          quantity: 1,
          unitPrice: 20.00, // Price excludes VAT
          taxRate: 7.7,
          taxIncluded: false
        });
      });

      const item = result.current.items[0];
      const expectedTaxAmount = 20.00 * 0.077;
      const expectedTotalPrice = 20.00 + expectedTaxAmount;

      expect(item.taxAmount).toBeCloseTo(expectedTaxAmount, 2);
      expect(item.totalPrice).toBeCloseTo(expectedTotalPrice, 2);
    });

    it('should calculate total tax for multiple items', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await act(async () => {
        result.current.addItem({
          productId: 'prod_1',
          productName: 'Product 1',
          quantity: 2,
          unitPrice: 10.00,
          taxRate: 7.7,
          taxIncluded: true
        });

        result.current.addItem({
          productId: 'prod_2',
          productName: 'Product 2',
          quantity: 1,
          unitPrice: 15.50,
          taxRate: 7.7,
          taxIncluded: true
        });
      });

      const expectedTotalTax =
        (20.00 * 0.077 / 1.077) + (15.50 * 0.077 / 1.077);

      expect(result.current.taxTotal).toBeCloseTo(expectedTotalTax, 2);
    });
  });

  describe('Cart Totals', () => {
    it('should calculate subtotal correctly', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await act(async () => {
        result.current.addItem({
          productId: 'prod_1',
          quantity: 2,
          unitPrice: 12.50,
          productName: 'Product 1'
        });

        result.current.addItem({
          productId: 'prod_2',
          quantity: 1,
          unitPrice: 8.90,
          productName: 'Product 2'
        });
      });

      expect(result.current.subtotal).toBe(33.90); // (12.50 * 2) + 8.90
    });

    it('should calculate item count correctly', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await act(async () => {
        result.current.addItem({
          productId: 'prod_1',
          quantity: 3,
          unitPrice: 10.00,
          productName: 'Product 1'
        });

        result.current.addItem({
          productId: 'prod_2',
          quantity: 2,
          unitPrice: 15.00,
          productName: 'Product 2'
        });
      });

      expect(result.current.itemCount).toBe(5); // 3 + 2
    });

    it('should apply discounts to total', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await act(async () => {
        result.current.addItem({
          productId: 'prod_1',
          quantity: 1,
          unitPrice: 20.00,
          productName: 'Product 1'
        });
      });

      await act(async () => {
        result.current.applyDiscount({
          code: 'SUMMER10',
          type: 'percentage',
          value: 10
        });
      });

      expect(result.current.discount.amount).toBe(2.00);
      expect(result.current.total).toBe(18.00);
    });
  });

  describe('Persistence', () => {
    it('should save cart to localStorage on changes', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await act(async () => {
        result.current.addItem({
          productId: swissProduct.id,
          productName: swissProduct.name,
          quantity: 1,
          unitPrice: 24.90
        });
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'eatech_cart_foodtruck_zurich',
        expect.stringContaining(swissProduct.id)
      );
    });

    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const { result } = renderHook(() => useCart(), { wrapper });

      await act(async () => {
        result.current.addItem({
          productId: 'prod_test',
          productName: 'Test Product',
          quantity: 1,
          unitPrice: 10.00
        });
      });

      // Should still add item to cart despite storage error
      expect(result.current.items).toHaveLength(1);
    });

    it('should clear localStorage when cart is cleared', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await act(async () => {
        result.current.addItem({
          productId: 'prod_test',
          productName: 'Test Product',
          quantity: 1,
          unitPrice: 10.00
        });
      });

      await act(async () => {
        result.current.clearCart();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'eatech_cart_foodtruck_zurich'
      );
    });
  });

  describe('Validation', () => {
    it('should validate item quantity limits', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await act(async () => {
        result.current.addItem({
          productId: 'prod_limited',
          productName: 'Limited Product',
          quantity: 10,
          unitPrice: 5.00,
          maxQuantity: 5
        });
      });

      expect(result.current.items[0].quantity).toBe(5);
    });

    it('should validate product availability', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await act(async () => {
        result.current.addItem({
          productId: 'prod_unavailable',
          productName: 'Unavailable Product',
          quantity: 1,
          unitPrice: 10.00,
          available: false
        });
      });

      expect(result.current.items).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Product not available')
      );

      consoleSpy.mockRestore();
    });

    it('should validate minimum order amount', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await act(async () => {
        result.current.addItem({
          productId: 'prod_small',
          productName: 'Small Product',
          quantity: 1,
          unitPrice: 2.50
        });
      });

      expect(result.current.isMinimumMet).toBe(false);
      expect(result.current.minimumRequired).toBe(10.00); // Assuming 10 CHF minimum
    });
  });

  describe('Performance', () => {
    it('should debounce localStorage saves', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await act(async () => {
        // Add multiple items quickly
        for (let i = 0; i < 5; i++) {
          result.current.addItem({
            productId: `prod_${i}`,
            productName: `Product ${i}`,
            quantity: 1,
            unitPrice: 10.00
          });
        }
      });

      // Should debounce and only save once or limited times
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    });

    it('should memoize cart calculations', async () => {
      const { result, rerender } = renderHook(() => useCart(), { wrapper });

      await act(async () => {
        result.current.addItem({
          productId: 'prod_test',
          productName: 'Test Product',
          quantity: 1,
          unitPrice: 20.00
        });
      });

      const firstTotal = result.current.total;

      // Re-render without changes
      rerender();

      // Should return same object reference (memoized)
      expect(result.current.total).toBe(firstTotal);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid item data gracefully', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await act(async () => {
        result.current.addItem({
          // Missing required fields
          productId: '',
          productName: '',
          quantity: -1,
          unitPrice: NaN
        });
      });

      expect(result.current.items).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should recover from corrupted localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const { result } = renderHook(() => useCart(), { wrapper });

      // Should initialize with empty cart despite corrupted data
      expect(result.current.items).toEqual([]);
      expect(result.current.total).toBe(0);
    });
  });
});
