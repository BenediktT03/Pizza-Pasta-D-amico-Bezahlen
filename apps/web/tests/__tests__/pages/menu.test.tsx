/**
 * File: /apps/web/tests/__tests__/pages/menu.test.tsx
 * EATECH V3.0 - Menu Page Integration Tests
 * Swiss foodtruck menu with categories, filters, and voice ordering
 */

import MenuPage from '@/app/(customer)/menu/page';
import { useCart } from '@/features/cart/useCart';
import { useMenu } from '@/features/menu/useMenu';
import { useVoiceRecognition } from '@/features/voice/useVoiceRecognition';
import { useTenant } from '@/hooks/useTenant';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/router';
import {
  mockTenant
} from '../../__mocks__/mockData';

// Mock dependencies
jest.mock('next/router');
jest.mock('@/features/menu/useMenu');
jest.mock('@/features/cart/useCart');
jest.mock('@/hooks/useTenant');
jest.mock('@/features/voice/useVoiceRecognition');
jest.mock('@/hooks/useAnalytics');

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseMenu = useMenu as jest.MockedFunction<typeof useMenu>;
const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;
const mockUseTenant = useTenant as jest.MockedFunction<typeof useTenant>;
const mockUseVoiceRecognition = useVoiceRecognition as jest.MockedFunction<typeof useVoiceRecognition>;

// Swiss foodtruck menu data
const swissMenuData = {
  categories: [
    {
      id: 'mains',
      name: { de: 'Hauptgerichte', fr: 'Plats principaux', en: 'Main Dishes' },
      products: [
        {
          id: 'prod_zuercher_geschnetzeltes',
          name: { de: 'Zürcher Geschnetzeltes', fr: 'Émincé de Zurich', en: 'Zurich-style Veal' },
          description: { de: 'Zartes Kalbfleisch mit Rösti', fr: 'Veau tendre avec rösti', en: 'Tender veal with rösti' },
          pricing: { basePrice: 24.90, currency: 'CHF', taxIncluded: true },
          category: 'mains',
          tags: ['swiss', 'traditional', 'bestseller'],
          availability: { status: 'available' },
          preparationTime: 15
        },
        {
          id: 'prod_rosti_speck',
          name: { de: 'Rösti mit Speck', fr: 'Rösti au lard', en: 'Rösti with Bacon' },
          description: { de: 'Knusprige Rösti mit Schweizer Speck', fr: 'Rösti croustillant au lard suisse', en: 'Crispy rösti with Swiss bacon' },
          pricing: { basePrice: 18.50, currency: 'CHF', taxIncluded: true },
          category: 'mains',
          tags: ['swiss', 'comfort-food'],
          availability: { status: 'available' },
          preparationTime: 12
        }
      ]
    },
    {
      id: 'drinks',
      name: { de: 'Getränke', fr: 'Boissons', en: 'Beverages' },
      products: [
        {
          id: 'prod_rivella',
          name: { de: 'Rivella', fr: 'Rivella', en: 'Rivella' },
          description: { de: 'Das Schweizer Erfrischungsgetränk', fr: 'La boisson rafraîchissante suisse', en: 'The Swiss refreshment' },
          pricing: { basePrice: 3.50, currency: 'CHF', taxIncluded: true },
          category: 'drinks',
          tags: ['swiss', 'refreshing'],
          availability: { status: 'available' },
          preparationTime: 1
        }
      ]
    }
  ],
  filters: {
    dietary: ['vegetarian', 'vegan', 'glutenfree', 'halal'],
    price: { min: 0, max: 50 },
    preparationTime: { max: 30 }
  }
};

const mockMenuActions = {
  filterByCategory: jest.fn(),
  filterByDietary: jest.fn(),
  filterByPrice: jest.fn(),
  searchProducts: jest.fn(),
  sortProducts: jest.fn()
};

const mockCartActions = {
  addItem: jest.fn(),
  removeItem: jest.fn(),
  clearCart: jest.fn()
};

describe('Menu Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseRouter.mockReturnValue({
      push: jest.fn(),
      query: { table: '5' },
      pathname: '/menu',
      asPath: '/menu?table=5'
    } as any);

    mockUseTenant.mockReturnValue({
      tenant: {
        ...mockTenant,
        id: 'foodtruck_zurich',
        name: 'Zürcher Genuss',
        settings: {
          language: 'de',
          currency: 'CHF',
          taxRate: 7.7
        }
      },
      isLoading: false
    });

    mockUseMenu.mockReturnValue({
      categories: swissMenuData.categories,
      products: swissMenuData.categories.flatMap(c => c.products),
      filteredProducts: swissMenuData.categories.flatMap(c => c.products),
      activeFilters: {},
      isLoading: false,
      error: null,
      ...mockMenuActions
    });

    mockUseCart.mockReturnValue({
      items: [],
      total: 0,
      itemCount: 0,
      ...mockCartActions
    });

    mockUseVoiceRecognition.mockReturnValue({
      isListening: false,
      isSupported: true,
      transcript: '',
      confidence: 0,
      error: null
    });
  });

  describe('Page Rendering', () => {
    it('should render menu page with Swiss foodtruck branding', async () => {
      render(<MenuPage />);

      expect(screen.getByText('Zürcher Genuss')).toBeInTheDocument();
      expect(screen.getByText(/Speisekarte/i)).toBeInTheDocument();
      expect(screen.getByText(/Tisch 5/i)).toBeInTheDocument();
    });

    it('should display menu categories', () => {
      render(<MenuPage />);

      expect(screen.getByText('Hauptgerichte')).toBeInTheDocument();
      expect(screen.getByText('Getränke')).toBeInTheDocument();
    });

    it('should show products with Swiss formatting', () => {
      render(<MenuPage />);

      expect(screen.getByText('Zürcher Geschnetzeltes')).toBeInTheDocument();
      expect(screen.getByText('CHF 24.90')).toBeInTheDocument();
      expect(screen.getByText('Rösti mit Speck')).toBeInTheDocument();
      expect(screen.getByText('CHF 18.50')).toBeInTheDocument();
    });

    it('should display preparation times', () => {
      render(<MenuPage />);

      expect(screen.getByText('15 Min')).toBeInTheDocument();
      expect(screen.getByText('12 Min')).toBeInTheDocument();
    });
  });

  describe('Category Navigation', () => {
    it('should filter products by category when category is clicked', async () => {
      const user = userEvent.setup();
      render(<MenuPage />);

      const mainCategory = screen.getByRole('button', { name: /Hauptgerichte/i });
      await user.click(mainCategory);

      expect(mockMenuActions.filterByCategory).toHaveBeenCalledWith('mains');
    });

    it('should highlight active category', async () => {
      mockUseMenu.mockReturnValue({
        ...mockUseMenu(),
        activeFilters: { category: 'mains' }
      });

      render(<MenuPage />);

      const mainCategory = screen.getByRole('button', { name: /Hauptgerichte/i });
      expect(mainCategory).toHaveClass(expect.stringMatching(/active|selected/));
    });

    it('should show product count per category', () => {
      render(<MenuPage />);

      expect(screen.getByText('Hauptgerichte (2)')).toBeInTheDocument();
      expect(screen.getByText('Getränke (1)')).toBeInTheDocument();
    });
  });

  describe('Product Search', () => {
    it('should search products by name', async () => {
      const user = userEvent.setup();
      render(<MenuPage />);

      const searchInput = screen.getByPlaceholderText(/Speisen suchen/i);
      await user.type(searchInput, 'Rösti');

      expect(mockMenuActions.searchProducts).toHaveBeenCalledWith('Rösti');
    });

    it('should search products by ingredients', async () => {
      const user = userEvent.setup();
      render(<MenuPage />);

      const searchInput = screen.getByPlaceholderText(/Speisen suchen/i);
      await user.type(searchInput, 'Kalbfleisch');

      expect(mockMenuActions.searchProducts).toHaveBeenCalledWith('Kalbfleisch');
    });

    it('should clear search when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<MenuPage />);

      const searchInput = screen.getByPlaceholderText(/Speisen suchen/i);
      await user.type(searchInput, 'test');

      const clearButton = screen.getByLabelText(/Suche löschen/i);
      await user.click(clearButton);

      expect(searchInput).toHaveValue('');
      expect(mockMenuActions.searchProducts).toHaveBeenCalledWith('');
    });
  });

  describe('Dietary Filters', () => {
    it('should show dietary filter options', () => {
      render(<MenuPage />);

      expect(screen.getByLabelText(/Vegetarisch/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Vegan/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Glutenfrei/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Halal/i)).toBeInTheDocument();
    });

    it('should filter products by dietary requirements', async () => {
      const user = userEvent.setup();
      render(<MenuPage />);

      const vegetarianFilter = screen.getByLabelText(/Vegetarisch/i);
      await user.click(vegetarianFilter);

      expect(mockMenuActions.filterByDietary).toHaveBeenCalledWith('vegetarian');
    });

    it('should allow multiple dietary filters', async () => {
      const user = userEvent.setup();
      render(<MenuPage />);

      const vegetarianFilter = screen.getByLabelText(/Vegetarisch/i);
      const glutenfreeFilter = screen.getByLabelText(/Glutenfrei/i);

      await user.click(vegetarianFilter);
      await user.click(glutenfreeFilter);

      expect(mockMenuActions.filterByDietary).toHaveBeenCalledWith('vegetarian');
      expect(mockMenuActions.filterByDietary).toHaveBeenCalledWith('glutenfree');
    });
  });

  describe('Price Range Filter', () => {
    it('should show price range slider', () => {
      render(<MenuPage />);

      expect(screen.getByLabelText(/Preisbereich/i)).toBeInTheDocument();
      expect(screen.getByText('CHF 0')).toBeInTheDocument();
      expect(screen.getByText('CHF 50')).toBeInTheDocument();
    });

    it('should filter products by price range', async () => {
      const user = userEvent.setup();
      render(<MenuPage />);

      const priceSlider = screen.getByLabelText(/Preisbereich/i);
      await user.type(priceSlider, '20');

      expect(mockMenuActions.filterByPrice).toHaveBeenCalledWith({ min: 0, max: 20 });
    });
  });

  describe('Product Sorting', () => {
    it('should show sorting options', () => {
      render(<MenuPage />);

      const sortSelect = screen.getByLabelText(/Sortieren nach/i);
      expect(sortSelect).toBeInTheDocument();
    });

    it('should sort products by price', async () => {
      const user = userEvent.setup();
      render(<MenuPage />);

      const sortSelect = screen.getByLabelText(/Sortieren nach/i);
      await user.selectOptions(sortSelect, 'price_asc');

      expect(mockMenuActions.sortProducts).toHaveBeenCalledWith('price_asc');
    });

    it('should sort products by popularity', async () => {
      const user = userEvent.setup();
      render(<MenuPage />);

      const sortSelect = screen.getByLabelText(/Sortieren nach/i);
      await user.selectOptions(sortSelect, 'popularity');

      expect(mockMenuActions.sortProducts).toHaveBeenCalledWith('popularity');
    });
  });

  describe('Cart Integration', () => {
    it('should add product to cart from menu', async () => {
      const user = userEvent.setup();
      render(<MenuPage />);

      const addButtons = screen.getAllByText(/In den Warenkorb/i);
      await user.click(addButtons[0]);

      expect(mockCartActions.addItem).toHaveBeenCalledWith({
        productId: 'prod_zuercher_geschnetzeltes',
        quantity: 1,
        modifiers: []
      });
    });

    it('should show cart summary in floating button', () => {
      mockUseCart.mockReturnValue({
        ...mockUseCart(),
        items: [{ id: '1', quantity: 2, totalPrice: 49.80 }],
        total: 49.80,
        itemCount: 2
      });

      render(<MenuPage />);

      expect(screen.getByText('2 Artikel')).toBeInTheDocument();
      expect(screen.getByText('CHF 49.80')).toBeInTheDocument();
    });

    it('should navigate to cart when cart button is clicked', async () => {
      const mockPush = jest.fn();
      mockUseRouter.mockReturnValue({
        ...mockUseRouter(),
        push: mockPush
      });

      mockUseCart.mockReturnValue({
        ...mockUseCart(),
        items: [{ id: '1' }],
        itemCount: 1
      });

      const user = userEvent.setup();
      render(<MenuPage />);

      const cartButton = screen.getByRole('button', { name: /Warenkorb anzeigen/i });
      await user.click(cartButton);

      expect(mockPush).toHaveBeenCalledWith('/cart');
    });
  });

  describe('Voice Ordering', () => {
    it('should show voice button when voice recognition is supported', () => {
      render(<MenuPage />);

      expect(screen.getByRole('button', { name: /Spracheingabe/i })).toBeInTheDocument();
    });

    it('should process voice commands for adding items', async () => {
      mockUseVoiceRecognition.mockReturnValue({
        ...mockUseVoiceRecognition(),
        transcript: 'Ich möchte ein Zürcher Geschnetzeltes',
        lastCommand: {
          intent: 'add_item',
          product: 'Zürcher Geschnetzeltes',
          quantity: 1
        }
      });

      render(<MenuPage />);

      await waitFor(() => {
        expect(mockCartActions.addItem).toHaveBeenCalledWith(
          expect.objectContaining({
            productId: 'prod_zuercher_geschnetzeltes',
            quantity: 1
          })
        );
      });
    });

    it('should handle Swiss German voice commands', async () => {
      mockUseVoiceRecognition.mockReturnValue({
        ...mockUseVoiceRecognition(),
        transcript: 'Ich hätt gärn es Rösti mit Speck',
        lastCommand: {
          intent: 'add_item',
          product: 'Rösti mit Speck',
          quantity: 1
        }
      });

      render(<MenuPage />);

      await waitFor(() => {
        expect(mockCartActions.addItem).toHaveBeenCalledWith(
          expect.objectContaining({
            productId: 'prod_rosti_speck'
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<MenuPage />);

      expect(screen.getByRole('heading', { level: 1, name: /Speisekarte/i })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2); // Categories
    });

    it('should support keyboard navigation for categories', async () => {
      const user = userEvent.setup();
      render(<MenuPage />);

      const categoryButtons = screen.getAllByRole('button', { name: /gerichte|getränke/i });

      await user.tab();
      expect(categoryButtons[0]).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      expect(categoryButtons[1]).toHaveFocus();
    });

    it('should have skip links for screen readers', () => {
      render(<MenuPage />);

      expect(screen.getByText(/Zum Hauptinhalt springen/i)).toBeInTheDocument();
      expect(screen.getByText(/Zur Kategorienavigation springen/i)).toBeInTheDocument();
    });

    it('should announce filter changes to screen readers', async () => {
      const user = userEvent.setup();
      render(<MenuPage />);

      const vegetarianFilter = screen.getByLabelText(/Vegetarisch/i);
      await user.click(vegetarianFilter);

      expect(screen.getByLabelText(/Filter angewendet/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should lazy load product images', () => {
      render(<MenuPage />);

      const productImages = screen.getAllByRole('img');
      productImages.forEach(img => {
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });

    it('should virtualize long product lists', () => {
      const manyProducts = Array.from({ length: 100 }, (_, i) => ({
        id: `prod_${i}`,
        name: { de: `Produkt ${i}` },
        pricing: { basePrice: 10 + i, currency: 'CHF' },
        category: 'mains'
      }));

      mockUseMenu.mockReturnValue({
        ...mockUseMenu(),
        products: manyProducts,
        filteredProducts: manyProducts
      });

      render(<MenuPage />);

      // Should only render visible items (e.g., first 20)
      const productElements = screen.getAllByText(/Produkt \d+/);
      expect(productElements.length).toBeLessThan(100);
    });
  });

  describe('Error Handling', () => {
    it('should show error state when menu loading fails', () => {
      mockUseMenu.mockReturnValue({
        ...mockUseMenu(),
        isLoading: false,
        error: new Error('Failed to load menu')
      });

      render(<MenuPage />);

      expect(screen.getByText(/Fehler beim Laden der Speisekarte/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Erneut versuchen/i })).toBeInTheDocument();
    });

    it('should show empty state when no products match filters', () => {
      mockUseMenu.mockReturnValue({
        ...mockUseMenu(),
        filteredProducts: []
      });

      render(<MenuPage />);

      expect(screen.getByText(/Keine Speisen gefunden/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Filter zurücksetzen/i })).toBeInTheDocument();
    });

    it('should handle network connectivity issues', () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      render(<MenuPage />);

      expect(screen.getByText(/Offline-Modus/i)).toBeInTheDocument();
      expect(screen.getByText(/Einige Funktionen sind eingeschränkt/i)).toBeInTheDocument();
    });
  });

  describe('Swiss-specific Features', () => {
    it('should display allergen information according to Swiss regulations', () => {
      render(<MenuPage />);

      const allergenInfo = screen.getAllByLabelText(/Allergene/i);
      expect(allergenInfo.length).toBeGreaterThan(0);
    });

    it('should show regional product labels', () => {
      render(<MenuPage />);

      expect(screen.getByText(/Schweizer Qualität/i)).toBeInTheDocument();
      expect(screen.getByText(/Regional/i)).toBeInTheDocument();
    });

    it('should handle Swiss payment methods hint', () => {
      render(<MenuPage />);

      expect(screen.getByText(/Twint, Karte, Bar/i)).toBeInTheDocument();
    });
  });
});
