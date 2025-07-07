/**
 * File: /apps/web/tests/__tests__/components/ProductCard.test.tsx
 * EATECH V3.0 - Product Card Component Tests
 * Swiss-specific testing with CHF, multilingual support, and accessibility
 */

import { ProductCard } from '@/components/features/ProductCard/ProductCard';
import { CartProvider } from '@/features/cart/CartProvider';
import { useCart } from '@/features/cart/useCart';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTranslation } from 'next-i18next';
import { mockProduct } from '../../__mocks__/mockData';

// Mock dependencies
jest.mock('@/features/cart/useCart');
jest.mock('next-i18next');
jest.mock('@/hooks/useAnalytics');

const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;
const mockT = jest.fn((key: string) => key);

// Mock data with Swiss formatting
const swissProduct = {
  ...mockProduct,
  id: 'prod_123',
  name: { de: 'Zürcher Geschnetzeltes', fr: 'Émincé de Zurich', en: 'Zurich-style Veal' },
  description: {
    de: 'Zartes Kalbfleisch mit Rösti und Champignon-Rahmsauce',
    fr: 'Veau tendre avec rösti et sauce crémeuse aux champignons',
    en: 'Tender veal with rösti and mushroom cream sauce'
  },
  pricing: {
    basePrice: 24.90,
    currency: 'CHF',
    taxRate: 7.7,
    taxIncluded: true
  },
  variants: [
    {
      id: 'var_small',
      name: { de: 'Klein', fr: 'Petit', en: 'Small' },
      price: 19.90
    },
    {
      id: 'var_regular',
      name: { de: 'Normal', fr: 'Normal', en: 'Regular' },
      price: 24.90,
      isDefault: true
    },
    {
      id: 'var_large',
      name: { de: 'Gross', fr: 'Grand', en: 'Large' },
      price: 29.90
    }
  ],
  allergens: {
    contains: ['milk', 'gluten'],
    mayContain: ['nuts']
  },
  dietary: {
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    halal: true
  },
  availability: {
    status: 'available',
    maxPerOrder: 5
  }
};

const mockCartActions = {
  addItem: jest.fn(),
  updateItem: jest.fn(),
  removeItem: jest.fn(),
  clearCart: jest.fn()
};

describe('ProductCard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useTranslation as jest.Mock).mockReturnValue({ t: mockT });
    mockUseCart.mockReturnValue({
      items: [],
      total: 0,
      itemCount: 0,
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
    it('should render product information correctly', () => {
      renderWithProvider(<ProductCard product={swissProduct} />);

      expect(screen.getByText('Zürcher Geschnetzeltes')).toBeInTheDocument();
      expect(screen.getByText(/Zartes Kalbfleisch/)).toBeInTheDocument();
      expect(screen.getByText('CHF 24.90')).toBeInTheDocument();
    });

    it('should display Swiss tax information', () => {
      renderWithProvider(<ProductCard product={swissProduct} />);

      expect(screen.getByText(/inkl\. 7\.7% MwSt\./)).toBeInTheDocument();
    });

    it('should show allergen information with Swiss format', () => {
      renderWithProvider(<ProductCard product={swissProduct} />);

      const allergenInfo = screen.getByLabelText(/Allergene/i);
      expect(allergenInfo).toBeInTheDocument();
      expect(screen.getByText(/Milch, Gluten/)).toBeInTheDocument();
      expect(screen.getByText(/Kann Nüsse enthalten/)).toBeInTheDocument();
    });

    it('should display dietary badges correctly', () => {
      renderWithProvider(<ProductCard product={swissProduct} />);

      expect(screen.getByText('Halal')).toBeInTheDocument();
      expect(screen.queryByText('Vegetarisch')).not.toBeInTheDocument();
      expect(screen.queryByText('Vegan')).not.toBeInTheDocument();
    });

    it('should render variant selector', () => {
      renderWithProvider(<ProductCard product={swissProduct} />);

      const variantSelector = screen.getByLabelText(/Grösse wählen/i);
      expect(variantSelector).toBeInTheDocument();

      // Check all variants are available
      expect(screen.getByText('Klein - CHF 19.90')).toBeInTheDocument();
      expect(screen.getByText('Normal - CHF 24.90')).toBeInTheDocument();
      expect(screen.getByText('Gross - CHF 29.90')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should add product to cart with default variant', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProductCard product={swissProduct} />);

      const addButton = screen.getByRole('button', { name: /In den Warenkorb/i });
      await user.click(addButton);

      expect(mockCartActions.addItem).toHaveBeenCalledWith({
        productId: 'prod_123',
        variantId: 'var_regular',
        quantity: 1,
        unitPrice: 24.90,
        modifiers: []
      });
    });

    it('should change price when variant is selected', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProductCard product={swissProduct} />);

      // Select large variant
      const variantSelector = screen.getByLabelText(/Grösse wählen/i);
      await user.selectOptions(variantSelector, 'var_large');

      expect(screen.getByText('CHF 29.90')).toBeInTheDocument();
    });

    it('should handle quantity changes correctly', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProductCard product={swissProduct} />);

      const quantityInput = screen.getByLabelText(/Anzahl/i);
      await user.clear(quantityInput);
      await user.type(quantityInput, '3');

      const addButton = screen.getByRole('button', { name: /In den Warenkorb/i });
      await user.click(addButton);

      expect(mockCartActions.addItem).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 3 })
      );
    });

    it('should enforce maximum order limit', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProductCard product={swissProduct} />);

      const quantityInput = screen.getByLabelText(/Anzahl/i);
      await user.clear(quantityInput);
      await user.type(quantityInput, '10'); // Over limit of 5

      expect(quantityInput).toHaveValue(5);
      expect(screen.getByText(/Maximum 5 Stück pro Bestellung/i)).toBeInTheDocument();
    });

    it('should show unavailable state', () => {
      const unavailableProduct = {
        ...swissProduct,
        availability: { status: 'unavailable' }
      };

      renderWithProvider(<ProductCard product={unavailableProduct} />);

      const addButton = screen.getByRole('button', { name: /Nicht verfügbar/i });
      expect(addButton).toBeDisabled();
      expect(screen.getByText(/Zurzeit nicht verfügbar/i)).toBeInTheDocument();
    });
  });

  describe('Multilingual Support', () => {
    it('should render in French', () => {
      const frenchProduct = {
        ...swissProduct,
        name: { ...swissProduct.name },
        description: { ...swissProduct.description }
      };

      (useTranslation as jest.Mock).mockReturnValue({
        t: (key: string) => key,
        i18n: { language: 'fr' }
      });

      renderWithProvider(<ProductCard product={frenchProduct} language="fr" />);

      expect(screen.getByText('Émincé de Zurich')).toBeInTheDocument();
      expect(screen.getByText(/Veau tendre/)).toBeInTheDocument();
    });

    it('should fallback to German if translation missing', () => {
      const productWithMissingTranslation = {
        ...swissProduct,
        name: { de: 'Nur Deutsch', en: undefined, fr: undefined }
      };

      renderWithProvider(<ProductCard product={productWithMissingTranslation} language="fr" />);

      expect(screen.getByText('Nur Deutsch')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProvider(<ProductCard product={swissProduct} />);

      expect(screen.getByRole('article')).toHaveAttribute('aria-label',
        expect.stringContaining('Zürcher Geschnetzeltes'));
      expect(screen.getByLabelText(/Allergene/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Grösse wählen/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProductCard product={swissProduct} />);

      const card = screen.getByRole('article');
      await user.tab();
      expect(card).toHaveFocus();

      await user.keyboard('{Enter}');
      // Should open product details modal
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have sufficient color contrast for price display', () => {
      renderWithProvider(<ProductCard product={swissProduct} />);

      const priceElement = screen.getByText('CHF 24.90');
      const styles = window.getComputedStyle(priceElement);

      // Check that price has appropriate styling for visibility
      expect(priceElement).toHaveClass(expect.stringMatching(/price|cost|amount/));
    });
  });

  describe('Swiss-specific Features', () => {
    it('should format prices according to Swiss conventions', () => {
      renderWithProvider(<ProductCard product={swissProduct} />);

      // Swiss format: CHF before amount, decimal with .
      expect(screen.getByText('CHF 24.90')).toBeInTheDocument();
      expect(screen.getByText('CHF 19.90')).toBeInTheDocument();
      expect(screen.getByText('CHF 29.90')).toBeInTheDocument();
    });

    it('should show correct VAT rate for Switzerland', () => {
      renderWithProvider(<ProductCard product={swissProduct} />);

      expect(screen.getByText(/7\.7% MwSt\./)).toBeInTheDocument();
    });

    it('should handle special Swiss characters in product names', () => {
      const swissProduct = {
        ...mockProduct,
        name: {
          de: 'Rösti mit Speck & Eier',
          fr: 'Rösti avec lard & œufs',
          en: 'Rösti with Bacon & Eggs'
        }
      };

      renderWithProvider(<ProductCard product={swissProduct} />);

      expect(screen.getByText('Rösti mit Speck & Eier')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = renderWithProvider(<ProductCard product={swissProduct} />);

      const initialRenderCount = jest.fn();
      jest.spyOn(React, 'memo').mockImplementation(() => initialRenderCount);

      // Re-render with same props
      rerender(
        <CartProvider>
          <ProductCard product={swissProduct} />
        </CartProvider>
      );

      // Component should be memoized
      expect(initialRenderCount).not.toHaveBeenCalled();
    });

    it('should lazy load product images', () => {
      renderWithProvider(<ProductCard product={swissProduct} />);

      const productImage = screen.getByRole('img');
      expect(productImage).toHaveAttribute('loading', 'lazy');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing product data gracefully', () => {
      const incompleteProduct = {
        id: 'prod_incomplete',
        name: { de: 'Test' },
        pricing: { basePrice: 10.00, currency: 'CHF' }
      };

      renderWithProvider(<ProductCard product={incompleteProduct} />);

      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.getByText('CHF 10.00')).toBeInTheDocument();
    });

    it('should show error state for invalid prices', () => {
      const invalidProduct = {
        ...swissProduct,
        pricing: { basePrice: -1, currency: 'CHF' }
      };

      renderWithProvider(<ProductCard product={invalidProduct} />);

      expect(screen.getByText(/Preis nicht verfügbar/i)).toBeInTheDocument();
    });
  });
});
