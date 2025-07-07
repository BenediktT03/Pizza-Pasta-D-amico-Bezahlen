/**
 * File: /apps/web/tests/__tests__/components/CartItem.test.tsx
 * EATECH V3.0 - Cart Item Component Tests
 * Swiss formatting, modifiers, and cart management testing
 */

import { CartItem } from '@/components/features/CartItem/CartItem';
import { CartProvider } from '@/features/cart/CartProvider';
import { useCart } from '@/features/cart/useCart';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock dependencies
jest.mock('@/features/cart/useCart');
jest.mock('@/hooks/useAnalytics');
jest.mock('next-i18next');

const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;

// Swiss cart item with modifiers
const swissCartItem = {
  id: 'cart_item_1',
  productId: 'prod_123',
  productName: 'Zürcher Geschnetzeltes',
  variantId: 'var_regular',
  variantName: 'Normal (350g)',
  quantity: 2,
  unitPrice: 24.90,
  modifiers: [
    {
      groupId: 'sides',
      groupName: 'Beilage',
      optionId: 'roesti',
      optionName: 'Rösti',
      price: 4.50
    },
    {
      groupId: 'extras',
      groupName: 'Extras',
      optionId: 'extra_sauce',
      optionName: 'Extra Sauce',
      price: 2.00
    }
  ],
  modifiersPrice: 6.50,
  itemPrice: 31.40, // 24.90 + 6.50
  totalPrice: 62.80, // 31.40 * 2
  taxRate: 7.7,
  taxAmount: 4.84,
  notes: 'Ohne Zwiebeln bitte',
  allergens: ['milk', 'gluten'],
  dietary: ['halal']
};

const mockCartActions = {
  updateItem: jest.fn(),
  removeItem: jest.fn(),
  duplicateItem: jest.fn()
};

describe('CartItem Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCart.mockReturnValue({
      items: [swissCartItem],
      total: 62.80,
      itemCount: 2,
      ...mockCartActions
    });
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <CartProvider>
        {component}
      </CartProvider>
    );
  };

  describe('Rendering', () => {
    it('should render cart item with Swiss formatting', () => {
      renderWithProvider(<CartItem item={swissCartItem} />);

      expect(screen.getByText('Zürcher Geschnetzeltes')).toBeInTheDocument();
      expect(screen.getByText('Normal (350g)')).toBeInTheDocument();
      expect(screen.getByText('CHF 31.40')).toBeInTheDocument();
      expect(screen.getByText('CHF 62.80')).toBeInTheDocument();
    });

    it('should display modifiers correctly', () => {
      renderWithProvider(<CartItem item={swissCartItem} />);

      expect(screen.getByText('+ Rösti (CHF 4.50)')).toBeInTheDocument();
      expect(screen.getByText('+ Extra Sauce (CHF 2.00)')).toBeInTheDocument();
    });

    it('should show quantity controls', () => {
      renderWithProvider(<CartItem item={swissCartItem} />);

      expect(screen.getByLabelText(/Menge verringern/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      expect(screen.getByLabelText(/Menge erhöhen/i)).toBeInTheDocument();
    });

    it('should display customer notes', () => {
      renderWithProvider(<CartItem item={swissCartItem} />);

      expect(screen.getByText('Ohne Zwiebeln bitte')).toBeInTheDocument();
    });

    it('should show allergen warnings', () => {
      renderWithProvider(<CartItem item={swissCartItem} />);

      const allergenWarning = screen.getByLabelText(/Allergene/i);
      expect(allergenWarning).toBeInTheDocument();
      expect(screen.getByText(/Milch, Gluten/)).toBeInTheDocument();
    });

    it('should display dietary badges', () => {
      renderWithProvider(<CartItem item={swissCartItem} />);

      expect(screen.getByText('Halal')).toBeInTheDocument();
    });
  });

  describe('Quantity Management', () => {
    it('should increase quantity when plus button clicked', async () => {
      const user = userEvent.setup();
      renderWithProvider(<CartItem item={swissCartItem} />);

      const increaseButton = screen.getByLabelText(/Menge erhöhen/i);
      await user.click(increaseButton);

      expect(mockCartActions.updateItem).toHaveBeenCalledWith(
        swissCartItem.id,
        { quantity: 3 }
      );
    });

    it('should decrease quantity when minus button clicked', async () => {
      const user = userEvent.setup();
      renderWithProvider(<CartItem item={swissCartItem} />);

      const decreaseButton = screen.getByLabelText(/Menge verringern/i);
      await user.click(decreaseButton);

      expect(mockCartActions.updateItem).toHaveBeenCalledWith(
        swissCartItem.id,
        { quantity: 1 }
      );
    });

    it('should allow direct quantity input', async () => {
      const user = userEvent.setup();
      renderWithProvider(<CartItem item={swissCartItem} />);

      const quantityInput = screen.getByDisplayValue('2');
      await user.clear(quantityInput);
      await user.type(quantityInput, '5');
      await user.tab(); // Trigger blur

      expect(mockCartActions.updateItem).toHaveBeenCalledWith(
        swissCartItem.id,
        { quantity: 5 }
      );
    });

    it('should validate quantity limits', async () => {
      const user = userEvent.setup();
      renderWithProvider(<CartItem item={swissCartItem} />);

      const quantityInput = screen.getByDisplayValue('2');
      await user.clear(quantityInput);
      await user.type(quantityInput, '0');
      await user.tab();

      // Should not allow 0 quantity
      expect(mockCartActions.updateItem).not.toHaveBeenCalledWith(
        swissCartItem.id,
        { quantity: 0 }
      );
    });

    it('should remove item when quantity becomes 0 via minus button', async () => {
      const singleQuantityItem = { ...swissCartItem, quantity: 1 };
      const user = userEvent.setup();

      renderWithProvider(<CartItem item={singleQuantityItem} />);

      const decreaseButton = screen.getByLabelText(/Menge verringern/i);
      await user.click(decreaseButton);

      expect(mockCartActions.removeItem).toHaveBeenCalledWith(swissCartItem.id);
    });
  });

  describe('Item Actions', () => {
    it('should remove item when delete button clicked', async () => {
      const user = userEvent.setup();
      renderWithProvider(<CartItem item={swissCartItem} />);

      const removeButton = screen.getByLabelText(/Artikel entfernen/i);
      await user.click(removeButton);

      // Should show confirmation dialog
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Artikel wirklich entfernen/i)).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /Entfernen/i });
      await user.click(confirmButton);

      expect(mockCartActions.removeItem).toHaveBeenCalledWith(swissCartItem.id);
    });

    it('should duplicate item when duplicate button clicked', async () => {
      const user = userEvent.setup();
      renderWithProvider(<CartItem item={swissCartItem} />);

      const duplicateButton = screen.getByLabelText(/Artikel duplizieren/i);
      await user.click(duplicateButton);

      expect(mockCartActions.duplicateItem).toHaveBeenCalledWith(swissCartItem.id);
    });

    it('should allow editing notes', async () => {
      const user = userEvent.setup();
      renderWithProvider(<CartItem item={swissCartItem} />);

      const editNotesButton = screen.getByLabelText(/Notizen bearbeiten/i);
      await user.click(editNotesButton);

      const notesInput = screen.getByDisplayValue('Ohne Zwiebeln bitte');
      await user.clear(notesInput);
      await user.type(notesInput, 'Extra scharf, ohne Zwiebeln');

      const saveButton = screen.getByRole('button', { name: /Speichern/i });
      await user.click(saveButton);

      expect(mockCartActions.updateItem).toHaveBeenCalledWith(
        swissCartItem.id,
        { notes: 'Extra scharf, ohne Zwiebeln' }
      );
    });
  });

  describe('Price Calculations', () => {
    it('should calculate total price correctly with modifiers', () => {
      renderWithProvider(<CartItem item={swissCartItem} />);

      // Base price: 24.90 + modifiers: 6.50 = 31.40 per item
      // Total: 31.40 * 2 = 62.80
      expect(screen.getByText('CHF 31.40')).toBeInTheDocument();
      expect(screen.getByText('CHF 62.80')).toBeInTheDocument();
    });

    it('should show Swiss VAT information', () => {
      renderWithProvider(<CartItem item={swissCartItem} />);

      expect(screen.getByText(/inkl\. 7\.7% MwSt\./)).toBeInTheDocument();
      expect(screen.getByText(/MwSt\.: CHF 4\.84/)).toBeInTheDocument();
    });

    it('should update prices when quantity changes', async () => {
      const user = userEvent.setup();
      const { rerender } = renderWithProvider(<CartItem item={swissCartItem} />);

      // Simulate quantity change
      const updatedItem = { ...swissCartItem, quantity: 3, totalPrice: 94.20 };

      rerender(
        <CartProvider>
          <CartItem item={updatedItem} />
        </CartProvider>
      );

      expect(screen.getByText('CHF 94.20')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      renderWithProvider(<CartItem item={swissCartItem} />);

      expect(screen.getByRole('listitem')).toBeInTheDocument();
      expect(screen.getByLabelText(/Menge erhöhen/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Menge verringern/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Artikel entfernen/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithProvider(<CartItem item={swissCartItem} />);

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByLabelText(/Menge verringern/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByDisplayValue('2')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/Menge erhöhen/i)).toHaveFocus();
    });

    it('should announce quantity changes to screen readers', async () => {
      const user = userEvent.setup();
      renderWithProvider(<CartItem item={swissCartItem} />);

      const increaseButton = screen.getByLabelText(/Menge erhöhen/i);
      await user.click(increaseButton);

      // Check for aria-live region
      expect(screen.getByLabelText(/Menge geändert/i)).toBeInTheDocument();
    });
  });

  describe('Swiss-specific Features', () => {
    it('should format modifier prices correctly', () => {
      renderWithProvider(<CartItem item={swissCartItem} />);

      expect(screen.getByText('+ Rösti (CHF 4.50)')).toBeInTheDocument();
      expect(screen.getByText('+ Extra Sauce (CHF 2.00)')).toBeInTheDocument();
    });

    it('should handle Swiss German special characters', () => {
      const swissItem = {
        ...swissCartItem,
        productName: 'Züri-Gschnätzlets',
        modifiers: [
          {
            groupId: 'sides',
            groupName: 'Beilage',
            optionId: 'roesti',
            optionName: 'Rösti',
            price: 4.50
          }
        ]
      };

      renderWithProvider(<CartItem item={swissItem} />);

      expect(screen.getByText('Züri-Gschnätzlets')).toBeInTheDocument();
      expect(screen.getByText('+ Rösti (CHF 4.50)')).toBeInTheDocument();
    });

    it('should show correct decimal formatting for Swiss locale', () => {
      renderWithProvider(<CartItem item={swissCartItem} />);

      // Swiss uses . for decimals, not ,
      expect(screen.getByText('CHF 31.40')).toBeInTheDocument();
      expect(screen.getByText('CHF 62.80')).toBeInTheDocument();
      expect(screen.queryByText('CHF 31,40')).not.toBeInTheDocument();
    });
  });

  describe('Voice Commerce Integration', () => {
    it('should display voice order indicator if ordered via voice', () => {
      const voiceOrderItem = {
        ...swissCartItem,
        orderMethod: 'voice',
        voiceConfidence: 0.95
      };

      renderWithProvider(<CartItem item={voiceOrderItem} />);

      expect(screen.getByLabelText(/Per Sprache bestellt/i)).toBeInTheDocument();
      expect(screen.getByText(/Sprache/)).toBeInTheDocument();
    });

    it('should allow voice re-ordering', async () => {
      const user = userEvent.setup();
      renderWithProvider(<CartItem item={swissCartItem} />);

      const voiceReorderButton = screen.getByLabelText(/Per Sprache neu bestellen/i);
      await user.click(voiceReorderButton);

      // Should trigger voice ordering modal
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Spracheingabe/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing modifier data gracefully', () => {
      const itemWithIncompleteModifiers = {
        ...swissCartItem,
        modifiers: [
          {
            groupId: 'sides',
            groupName: 'Beilage',
            optionId: 'roesti',
            // Missing optionName and price
          }
        ]
      };

      renderWithProvider(<CartItem item={itemWithIncompleteModifiers} />);

      expect(screen.getByText('Zürcher Geschnetzeltes')).toBeInTheDocument();
      // Should not crash and show base item
    });

    it('should handle quantity update errors', async () => {
      mockCartActions.updateItem.mockRejectedValueOnce(new Error('Update failed'));

      const user = userEvent.setup();
      renderWithProvider(<CartItem item={swissCartItem} />);

      const increaseButton = screen.getByLabelText(/Menge erhöhen/i);
      await user.click(increaseButton);

      await waitFor(() => {
        expect(screen.getByText(/Fehler beim Aktualisieren/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should not re-render when other cart items change', () => {
      const renderSpy = jest.fn();
      jest.spyOn(React, 'memo').mockImplementation(() => renderSpy);

      const { rerender } = renderWithProvider(<CartItem item={swissCartItem} />);

      // Add different item to cart
      const otherItem = { ...swissCartItem, id: 'other_item' };
      mockUseCart.mockReturnValue({
        items: [swissCartItem, otherItem],
        total: 125.60,
        itemCount: 4,
        ...mockCartActions
      });

      rerender(
        <CartProvider>
          <CartItem item={swissCartItem} />
        </CartProvider>
      );

      // Should not re-render this item
      expect(renderSpy).not.toHaveBeenCalled();
    });
  });
});
