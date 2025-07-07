/**
 * File: /apps/admin/tests/components/ProductModal.test.tsx
 * EATECH V3.0 - Admin Product Modal Component Tests
 * Swiss foodtruck product management with modifiers, variants, and AI pricing
 */

import { ProductModal } from '@/components/Products/ProductModal';
import { useAI } from '@/hooks/useAI';
import { useProducts } from '@/hooks/useProducts';
import { useTenant } from '@/hooks/useTenant';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock dependencies
jest.mock('@/hooks/useProducts');
jest.mock('@/hooks/useTenant');
jest.mock('@/hooks/useAI');
jest.mock('@/services/api/products.service');
jest.mock('@/services/api/ai.service');

const mockUseProducts = useProducts as jest.MockedFunction<typeof useProducts>;
const mockUseTenant = useTenant as jest.MockedFunction<typeof useTenant>;
const mockUseAI = useAI as jest.MockedFunction<typeof useAI>;

// Swiss product data for testing
const swissProductData = {
  id: 'prod_zuercher_geschnetzeltes',
  name: {
    de: 'Zürcher Geschnetzeltes',
    fr: 'Émincé de Zurich',
    it: 'Spezzatino alla zurighese',
    en: 'Zurich-style Veal'
  },
  description: {
    de: 'Zartes Kalbfleisch in Champignon-Rahmsauce mit Rösti',
    fr: 'Veau tendre en sauce crémeuse aux champignons avec rösti',
    it: 'Vitello tenero in salsa cremosa ai funghi con rösti',
    en: 'Tender veal in mushroom cream sauce with rösti'
  },
  category: 'main-dishes',
  pricing: {
    basePrice: 24.90,
    currency: 'CHF',
    taxRate: 7.7,
    taxIncluded: true,
    cost: 8.50
  },
  variants: [
    {
      id: 'var_regular',
      name: { de: 'Normal (350g)', fr: 'Normal (350g)', en: 'Regular (350g)' },
      price: 24.90,
      cost: 8.50,
      isDefault: true
    },
    {
      id: 'var_large',
      name: { de: 'Gross (450g)', fr: 'Grand (450g)', en: 'Large (450g)' },
      price: 29.90,
      cost: 10.20
    }
  ],
  modifierGroups: [
    {
      id: 'sides',
      name: { de: 'Beilage', fr: 'Accompagnement', en: 'Side' },
      required: true,
      min: 1,
      max: 1,
      options: [
        {
          id: 'roesti',
          name: { de: 'Rösti', fr: 'Rösti', en: 'Rösti' },
          price: 0,
          isDefault: true
        },
        {
          id: 'rice',
          name: { de: 'Reis', fr: 'Riz', en: 'Rice' },
          price: 0
        }
      ]
    },
    {
      id: 'extras',
      name: { de: 'Extras', fr: 'Extras', en: 'Extras' },
      required: false,
      min: 0,
      max: 3,
      options: [
        {
          id: 'extra_sauce',
          name: { de: 'Extra Sauce', fr: 'Sauce supplémentaire', en: 'Extra Sauce' },
          price: 2.00
        },
        {
          id: 'mushrooms',
          name: { de: 'Extra Champignons', fr: 'Champignons supplémentaires', en: 'Extra Mushrooms' },
          price: 3.50
        }
      ]
    }
  ],
  allergens: {
    contains: ['milk', 'gluten'],
    mayContain: ['nuts', 'soy']
  },
  dietary: {
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    halal: true,
    organic: false
  },
  availability: {
    status: 'available',
    maxPerOrder: 5,
    schedule: null
  },
  analytics: {
    views: 1234,
    orders: 89,
    revenue: 2214.10,
    rating: 4.8
  }
};

const mockProductActions = {
  createProduct: jest.fn(),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
  uploadProductImage: jest.fn()
};

const mockAIActions = {
  optimizePrice: jest.fn(),
  generateDescription: jest.fn(),
  suggestModifiers: jest.fn(),
  analyzePerformance: jest.fn()
};

describe('ProductModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseTenant.mockReturnValue({
      tenant: {
        id: 'zuercher-genuss',
        name: 'Zürcher Genuss',
        settings: {
          currency: 'CHF',
          language: 'de',
          taxRate: 7.7
        }
      },
      isLoading: false
    });

    mockUseProducts.mockReturnValue({
      products: [swissProductData],
      categories: [
        { id: 'main-dishes', name: 'Hauptgerichte' },
        { id: 'sides', name: 'Beilagen' },
        { id: 'drinks', name: 'Getränke' }
      ],
      isLoading: false,
      error: null,
      ...mockProductActions
    });

    mockUseAI.mockReturnValue({
      isProcessing: false,
      lastSuggestion: null,
      error: null,
      ...mockAIActions
    });
  });

  describe('Modal Rendering', () => {
    it('should render create product modal', () => {
      render(
        <ProductModal
          isOpen={true}
          mode="create"
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );

      expect(screen.getByText('Neues Produkt erstellen')).toBeInTheDocument();
      expect(screen.getByLabelText(/Produktname \(Deutsch\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Preis/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Speichern/i })).toBeInTheDocument();
    });

    it('should render edit product modal with existing data', () => {
      render(
        <ProductModal
          isOpen={true}
          mode="edit"
          product={swissProductData}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );

      expect(screen.getByText('Produkt bearbeiten')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Zürcher Geschnetzeltes')).toBeInTheDocument();
      expect(screen.getByDisplayValue('24.90')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(
        <ProductModal
          isOpen={false}
          mode="create"
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );

      expect(screen.queryByText('Neues Produkt erstellen')).not.toBeInTheDocument();
    });
  });

  describe('Multilingual Form Fields', () => {
    beforeEach(() => {
      render(
        <ProductModal
          isOpen={true}
          mode="create"
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );
    });

    it('should display multilingual name fields', () => {
      expect(screen.getByLabelText(/Produktname \(Deutsch\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Produktname \(Französisch\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Produktname \(Italienisch\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Produktname \(Englisch\)/i)).toBeInTheDocument();
    });

    it('should display multilingual description fields', () => {
      expect(screen.getByLabelText(/Beschreibung \(Deutsch\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Beschreibung \(Französisch\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Beschreibung \(Italienisch\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Beschreibung \(Englisch\)/i)).toBeInTheDocument();
    });

    it('should validate required language fields', async () => {
      const user = userEvent.setup();

      // Try to save without German name (required)
      const saveButton = screen.getByRole('button', { name: /Speichern/i });
      await user.click(saveButton);

      expect(screen.getByText(/Deutscher Name ist erforderlich/i)).toBeInTheDocument();
    });

    it('should copy German text to other languages when requested', async () => {
      const user = userEvent.setup();

      // Fill German name
      const germanNameInput = screen.getByLabelText(/Produktname \(Deutsch\)/i);
      await user.type(germanNameInput, 'Zürcher Geschnetzeltes');

      // Click copy button
      const copyButton = screen.getByLabelText(/Deutschen Text kopieren/i);
      await user.click(copyButton);

      // Should copy to all other language fields
      expect(screen.getByLabelText(/Produktname \(Französisch\)/i)).toHaveValue('Zürcher Geschnetzeltes');
      expect(screen.getByLabelText(/Produktname \(Italienisch\)/i)).toHaveValue('Zürcher Geschnetzeltes');
      expect(screen.getByLabelText(/Produktname \(Englisch\)/i)).toHaveValue('Zürcher Geschnetzeltes');
    });
  });

  describe('Swiss Pricing Configuration', () => {
    beforeEach(() => {
      render(
        <ProductModal
          isOpen={true}
          mode="create"
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );
    });

    it('should display CHF currency formatting', () => {
      expect(screen.getByText(/CHF/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Preis.*CHF/i)).toBeInTheDocument();
    });

    it('should validate Swiss price format', async () => {
      const user = userEvent.setup();

      const priceInput = screen.getByLabelText(/Preis/i);

      // Test invalid price formats
      await user.clear(priceInput);
      await user.type(priceInput, '24,90'); // Comma instead of dot
      await user.tab();

      expect(screen.getByText(/Bitte verwenden Sie Punkt als Dezimaltrennzeichen/i)).toBeInTheDocument();

      // Test valid format
      await user.clear(priceInput);
      await user.type(priceInput, '24.90');
      await user.tab();

      expect(screen.queryByText(/Dezimaltrennzeichen/i)).not.toBeInTheDocument();
    });

    it('should display Swiss tax information', () => {
      expect(screen.getByText(/MwSt\. \(7\.7%\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Preis inkl\. MwSt\./i)).toBeInTheDocument();
    });

    it('should calculate tax amounts correctly', async () => {
      const user = userEvent.setup();

      const priceInput = screen.getByLabelText(/Preis/i);
      await user.clear(priceInput);
      await user.type(priceInput, '24.90');

      // Should show tax calculation
      expect(screen.getByText(/MwSt\.-Betrag: CHF 1\.92/i)).toBeInTheDocument();
      expect(screen.getByText(/Netto: CHF 22\.98/i)).toBeInTheDocument();
    });

    it('should handle cost calculation for margin analysis', async () => {
      const user = userEvent.setup();

      const priceInput = screen.getByLabelText(/Preis/i);
      const costInput = screen.getByLabelText(/Kosten/i);

      await user.type(priceInput, '24.90');
      await user.type(costInput, '8.50');

      // Should calculate margin
      expect(screen.getByText(/Marge: 65\.9%/i)).toBeInTheDocument();
      expect(screen.getByText(/Gewinn: CHF 16\.40/i)).toBeInTheDocument();
    });
  });

  describe('Product Categories and Tags', () => {
    beforeEach(() => {
      render(
        <ProductModal
          isOpen={true}
          mode="create"
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );
    });

    it('should display Swiss food categories', () => {
      const categorySelect = screen.getByLabelText(/Kategorie/i);

      expect(categorySelect).toBeInTheDocument();
      expect(screen.getByText('Hauptgerichte')).toBeInTheDocument();
      expect(screen.getByText('Beilagen')).toBeInTheDocument();
      expect(screen.getByText('Getränke')).toBeInTheDocument();
    });

    it('should allow adding Swiss-specific tags', async () => {
      const user = userEvent.setup();

      const tagsInput = screen.getByLabelText(/Tags/i);
      await user.type(tagsInput, 'schweizer-spezialität');
      await user.keyboard('{Enter}');

      expect(screen.getByText('schweizer-spezialität')).toBeInTheDocument();

      // Add more Swiss tags
      await user.type(tagsInput, 'traditionell');
      await user.keyboard('{Enter}');

      await user.type(tagsInput, 'regional');
      await user.keyboard('{Enter}');

      expect(screen.getByText('traditionell')).toBeInTheDocument();
      expect(screen.getByText('regional')).toBeInTheDocument();
    });

    it('should suggest popular Swiss food tags', async () => {
      const user = userEvent.setup();

      const tagsInput = screen.getByLabelText(/Tags/i);
      await user.click(tagsInput);

      // Should show suggested tags
      expect(screen.getByText('schweizer-qualität')).toBeInTheDocument();
      expect(screen.getByText('bio')).toBeInTheDocument();
      expect(screen.getByText('regional')).toBeInTheDocument();
      expect(screen.getByText('hausgemacht')).toBeInTheDocument();
    });
  });

  describe('Allergen and Dietary Management', () => {
    beforeEach(() => {
      render(
        <ProductModal
          isOpen={true}
          mode="create"
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );
    });

    it('should display Swiss allergen requirements', () => {
      // Click on allergens tab
      const allergensTab = screen.getByRole('tab', { name: /Allergene/i });
      fireEvent.click(allergensTab);

      // Should show Swiss allergen list
      expect(screen.getByLabelText(/Gluten/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Milch/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Eier/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Nüsse/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Soja/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Sesam/i)).toBeInTheDocument();
    });

    it('should separate contains vs may contain allergens', async () => {
      const user = userEvent.setup();

      const allergensTab = screen.getByRole('tab', { name: /Allergene/i });
      await user.click(allergensTab);

      // Select contains allergens
      const containsMilk = screen.getByLabelText(/Enthält Milch/i);
      const containsGluten = screen.getByLabelText(/Enthält Gluten/i);

      await user.click(containsMilk);
      await user.click(containsGluten);

      // Select may contain allergens
      const mayContainNuts = screen.getByLabelText(/Kann Nüsse enthalten/i);
      await user.click(mayContainNuts);

      expect(containsMilk).toBeChecked();
      expect(containsGluten).toBeChecked();
      expect(mayContainNuts).toBeChecked();
    });

    it('should display dietary options with Swiss context', async () => {
      const user = userEvent.setup();

      const dietaryTab = screen.getByRole('tab', { name: /Ernährung/i });
      await user.click(dietaryTab);

      // Should show Swiss dietary options
      expect(screen.getByLabelText(/Vegetarisch/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Vegan/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Glutenfrei/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Halal/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Bio/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Schweizer Herkunft/i)).toBeInTheDocument();
    });

    it('should validate dietary consistency', async () => {
      const user = userEvent.setup();

      const dietaryTab = screen.getByRole('tab', { name: /Ernährung/i });
      await user.click(dietaryTab);

      // Select vegan
      const veganCheckbox = screen.getByLabelText(/Vegan/i);
      await user.click(veganCheckbox);

      // Try to add milk allergen (should show warning)
      const allergensTab = screen.getByRole('tab', { name: /Allergene/i });
      await user.click(allergensTab);

      const containsMilk = screen.getByLabelText(/Enthält Milch/i);
      await user.click(containsMilk);

      // Should show consistency warning
      expect(screen.getByText(/Vegane Produkte können keine Milch enthalten/i)).toBeInTheDocument();
    });
  });

  describe('Product Variants Management', () => {
    beforeEach(() => {
      render(
        <ProductModal
          isOpen={true}
          mode="create"
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );
    });

    it('should allow adding product variants', async () => {
      const user = userEvent.setup();

      const variantsTab = screen.getByRole('tab', { name: /Varianten/i });
      await user.click(variantsTab);

      // Add first variant
      const addVariantButton = screen.getByRole('button', { name: /Variante hinzufügen/i });
      await user.click(addVariantButton);

      // Fill variant details
      const variantName = screen.getByLabelText(/Variantenname \(Deutsch\)/i);
      const variantPrice = screen.getByLabelText(/Preis der Variante/i);

      await user.type(variantName, 'Klein (250g)');
      await user.type(variantPrice, '19.90');

      expect(variantName).toHaveValue('Klein (250g)');
      expect(variantPrice).toHaveValue('19.90');
    });

    it('should set default variant', async () => {
      const user = userEvent.setup();

      const variantsTab = screen.getByRole('tab', { name: /Varianten/i });
      await user.click(variantsTab);

      // Add variants
      const addVariantButton = screen.getByRole('button', { name: /Variante hinzufügen/i });
      await user.click(addVariantButton);
      await user.click(addVariantButton); // Add second variant

      // Set second variant as default
      const defaultCheckboxes = screen.getAllByLabelText(/Standard-Variante/i);
      await user.click(defaultCheckboxes[1]);

      expect(defaultCheckboxes[1]).toBeChecked();
      expect(defaultCheckboxes[0]).not.toBeChecked();
    });

    it('should validate variant pricing', async () => {
      const user = userEvent.setup();

      const variantsTab = screen.getByRole('tab', { name: /Varianten/i });
      await user.click(variantsTab);

      const addVariantButton = screen.getByRole('button', { name: /Variante hinzufügen/i });
      await user.click(addVariantButton);

      const variantPrice = screen.getByLabelText(/Preis der Variante/i);

      // Test invalid price
      await user.type(variantPrice, '-5.00');
      await user.tab();

      expect(screen.getByText(/Preis muss positiv sein/i)).toBeInTheDocument();
    });

    it('should allow removing variants', async () => {
      const user = userEvent.setup();

      const variantsTab = screen.getByRole('tab', { name: /Varianten/i });
      await user.click(variantsTab);

      // Add variant
      const addVariantButton = screen.getByRole('button', { name: /Variante hinzufügen/i });
      await user.click(addVariantButton);

      // Remove variant
      const removeButton = screen.getByRole('button', { name: /Variante entfernen/i });
      await user.click(removeButton);

      // Should show confirmation
      expect(screen.getByText(/Variante wirklich entfernen/i)).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /Entfernen/i });
      await user.click(confirmButton);

      expect(screen.queryByLabelText(/Variantenname/i)).not.toBeInTheDocument();
    });
  });

  describe('Modifier Groups Management', () => {
    beforeEach(() => {
      render(
        <ProductModal
          isOpen={true}
          mode="create"
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );
    });

    it('should allow creating modifier groups', async () => {
      const user = userEvent.setup();

      const modifiersTab = screen.getByRole('tab', { name: /Modifier/i });
      await user.click(modifiersTab);

      // Add modifier group
      const addGroupButton = screen.getByRole('button', { name: /Modifier-Gruppe hinzufügen/i });
      await user.click(addGroupButton);

      // Fill group details
      const groupName = screen.getByLabelText(/Gruppenname \(Deutsch\)/i);
      await user.type(groupName, 'Beilage wählen');

      const requiredCheckbox = screen.getByLabelText(/Pflichtfeld/i);
      await user.click(requiredCheckbox);

      const minSelection = screen.getByLabelText(/Mindestauswahl/i);
      const maxSelection = screen.getByLabelText(/Höchstauswahl/i);

      await user.type(minSelection, '1');
      await user.type(maxSelection, '1');

      expect(groupName).toHaveValue('Beilage wählen');
      expect(requiredCheckbox).toBeChecked();
      expect(minSelection).toHaveValue('1');
      expect(maxSelection).toHaveValue('1');
    });

    it('should allow adding modifier options to groups', async () => {
      const user = userEvent.setup();

      const modifiersTab = screen.getByRole('tab', { name: /Modifier/i });
      await user.click(modifiersTab);

      // Add modifier group
      const addGroupButton = screen.getByRole('button', { name: /Modifier-Gruppe hinzufügen/i });
      await user.click(addGroupButton);

      // Add option to group
      const addOptionButton = screen.getByRole('button', { name: /Option hinzufügen/i });
      await user.click(addOptionButton);

      // Fill option details
      const optionName = screen.getByLabelText(/Optionsname \(Deutsch\)/i);
      const optionPrice = screen.getByLabelText(/Aufpreis/i);

      await user.type(optionName, 'Rösti');
      await user.type(optionPrice, '0.00');

      // Set as default option
      const defaultOption = screen.getByLabelText(/Standard-Option/i);
      await user.click(defaultOption);

      expect(optionName).toHaveValue('Rösti');
      expect(optionPrice).toHaveValue('0.00');
      expect(defaultOption).toBeChecked();
    });

    it('should validate modifier group configuration', async () => {
      const user = userEvent.setup();

      const modifiersTab = screen.getByRole('tab', { name: /Modifier/i });
      await user.click(modifiersTab);

      const addGroupButton = screen.getByRole('button', { name: /Modifier-Gruppe hinzufügen/i });
      await user.click(addGroupButton);

      // Set invalid min/max selection
      const minSelection = screen.getByLabelText(/Mindestauswahl/i);
      const maxSelection = screen.getByLabelText(/Höchstauswahl/i);

      await user.type(minSelection, '3');
      await user.type(maxSelection, '1'); // Max < Min

      await user.tab();

      expect(screen.getByText(/Höchstauswahl muss größer als Mindestauswahl sein/i)).toBeInTheDocument();
    });

    it('should allow reordering modifier groups', async () => {
      const user = userEvent.setup();

      const modifiersTab = screen.getByRole('tab', { name: /Modifier/i });
      await user.click(modifiersTab);

      // Add two modifier groups
      const addGroupButton = screen.getByRole('button', { name: /Modifier-Gruppe hinzufügen/i });
      await user.click(addGroupButton);
      await user.click(addGroupButton);

      // Fill names
      const groupNames = screen.getAllByLabelText(/Gruppenname \(Deutsch\)/i);
      await user.type(groupNames[0], 'Beilage');
      await user.type(groupNames[1], 'Sauce');

      // Move second group up
      const moveUpButtons = screen.getAllByRole('button', { name: /Nach oben/i });
      await user.click(moveUpButtons[1]);

      // Should reorder groups
      const reorderedNames = screen.getAllByLabelText(/Gruppenname \(Deutsch\)/i);
      expect(reorderedNames[0]).toHaveValue('Sauce');
      expect(reorderedNames[1]).toHaveValue('Beilage');
    });
  });

  describe('AI Integration', () => {
    beforeEach(() => {
      render(
        <ProductModal
          isOpen={true}
          mode="create"
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );
    });

    it('should allow AI price optimization', async () => {
      const user = userEvent.setup();

      // Fill basic product info
      const nameInput = screen.getByLabelText(/Produktname \(Deutsch\)/i);
      const priceInput = screen.getByLabelText(/Preis/i);
      const costInput = screen.getByLabelText(/Kosten/i);

      await user.type(nameInput, 'Test Burger');
      await user.type(priceInput, '20.00');
      await user.type(costInput, '7.50');

      // Mock AI response
      mockAIActions.optimizePrice.mockResolvedValue({
        currentPrice: 20.00,
        optimizedPrice: 22.50,
        projectedRevenueLift: 0.12,
        confidence: 0.87,
        reasoning: 'Based on competitor analysis and demand patterns'
      });

      // Click AI price optimization
      const aiButton = screen.getByRole('button', { name: /KI-Preisoptimierung/i });
      await user.click(aiButton);

      // Should show AI processing
      expect(screen.getByText(/KI analysiert/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(mockAIActions.optimizePrice).toHaveBeenCalledWith({
          productName: 'Test Burger',
          currentPrice: 20.00,
          cost: 7.50,
          category: expect.any(String)
        });
      });

      // Should show AI recommendations
      expect(screen.getByText(/Empfohlener Preis: CHF 22\.50/i)).toBeInTheDocument();
      expect(screen.getByText(/Geschätzte Umsatzsteigerung: 12%/i)).toBeInTheDocument();

      // Should allow applying recommendation
      const applyButton = screen.getByRole('button', { name: /Empfehlung übernehmen/i });
      await user.click(applyButton);

      expect(priceInput).toHaveValue('22.50');
    });

    it('should generate AI descriptions', async () => {
      const user = userEvent.setup();

      const nameInput = screen.getByLabelText(/Produktname \(Deutsch\)/i);
      await user.type(nameInput, 'Schweizer Alpkäse Burger');

      // Mock AI description generation
      mockAIActions.generateDescription.mockResolvedValue({
        de: 'Saftiger Beef-Patty mit cremigem Schweizer Alpkäse, frischen Tomaten und knackigem Salat im hausgemachten Brioche-Bun.',
        fr: 'Galette de bœuf juteuse avec du fromage alpin suisse crémeux, des tomates fraîches et de la salade croquante dans un pain brioche fait maison.',
        it: 'Polpetta di manzo succosa con cremoso formaggio alpino svizzero, pomodori freschi e lattuga croccante in un panino brioche fatto in casa.',
        en: 'Juicy beef patty with creamy Swiss alpine cheese, fresh tomatoes and crisp lettuce in a homemade brioche bun.'
      });

      const aiDescriptionButton = screen.getByRole('button', { name: /KI-Beschreibung generieren/i });
      await user.click(aiDescriptionButton);

      await waitFor(() => {
        expect(mockAIActions.generateDescription).toHaveBeenCalledWith({
          productName: 'Schweizer Alpkäse Burger',
          category: expect.any(String),
          language: 'de'
        });
      });

      // Should fill description fields
      const germanDesc = screen.getByLabelText(/Beschreibung \(Deutsch\)/i);
      expect(germanDesc).toHaveValue(expect.stringContaining('Saftiger Beef-Patty'));
    });

    it('should suggest modifiers based on product type', async () => {
      const user = userEvent.setup();

      const nameInput = screen.getByLabelText(/Produktname \(Deutsch\)/i);
      const categorySelect = screen.getByLabelText(/Kategorie/i);

      await user.type(nameInput, 'Classic Burger');
      await user.selectOptions(categorySelect, 'main-dishes');

      const modifiersTab = screen.getByRole('tab', { name: /Modifier/i });
      await user.click(modifiersTab);

      // Mock AI modifier suggestions
      mockAIActions.suggestModifiers.mockResolvedValue([
        {
          groupName: { de: 'Käse wählen', en: 'Choose Cheese' },
          required: false,
          options: [
            { name: { de: 'Cheddar', en: 'Cheddar' }, price: 2.00 },
            { name: { de: 'Schweizer Käse', en: 'Swiss Cheese' }, price: 2.50 }
          ]
        },
        {
          groupName: { de: 'Extras', en: 'Extras' },
          required: false,
          options: [
            { name: { de: 'Bacon', en: 'Bacon' }, price: 3.50 },
            { name: { de: 'Avocado', en: 'Avocado' }, price: 3.00 }
          ]
        }
      ]);

      const suggestButton = screen.getByRole('button', { name: /KI-Modifier vorschlagen/i });
      await user.click(suggestButton);

      await waitFor(() => {
        expect(mockAIActions.suggestModifiers).toHaveBeenCalledWith({
          productName: 'Classic Burger',
          category: 'main-dishes'
        });
      });

      // Should show suggestions
      expect(screen.getByText(/KI schlägt folgende Modifier vor/i)).toBeInTheDocument();
      expect(screen.getByText('Käse wählen')).toBeInTheDocument();
      expect(screen.getByText('Extras')).toBeInTheDocument();

      // Should allow applying suggestions
      const applyAllButton = screen.getByRole('button', { name: /Alle übernehmen/i });
      await user.click(applyAllButton);

      // Should add modifier groups
      expect(screen.getAllByLabelText(/Gruppenname/i)).toHaveLength(2);
    });
  });

  describe('Image Management', () => {
    beforeEach(() => {
      render(
        <ProductModal
          isOpen={true}
          mode="create"
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );
    });

    it('should allow uploading product images', async () => {
      const user = userEvent.setup();

      const imagesTab = screen.getByRole('tab', { name: /Bilder/i });
      await user.click(imagesTab);

      // Mock file upload
      const file = new File(['image content'], 'burger.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByLabelText(/Bilder hochladen/i);

      await user.upload(fileInput, file);

      // Should show upload progress
      expect(screen.getByText(/Hochladen/i)).toBeInTheDocument();

      // Mock successful upload
      mockProductActions.uploadProductImage.mockResolvedValue({
        url: 'https://cdn.eatech.ch/products/burger.jpg',
        thumbnails: {
          small: 'https://cdn.eatech.ch/products/burger_small.jpg',
          medium: 'https://cdn.eatech.ch/products/burger_medium.jpg'
        }
      });

      await waitFor(() => {
        expect(mockProductActions.uploadProductImage).toHaveBeenCalledWith(file);
      });

      // Should show uploaded image
      expect(screen.getByRole('img', { name: /burger\.jpg/i })).toBeInTheDocument();
    });

    it('should validate image file types and sizes', async () => {
      const user = userEvent.setup();

      const imagesTab = screen.getByRole('tab', { name: /Bilder/i });
      await user.click(imagesTab);

      // Test invalid file type
      const invalidFile = new File(['content'], 'document.pdf', { type: 'application/pdf' });
      const fileInput = screen.getByLabelText(/Bilder hochladen/i);

      await user.upload(fileInput, invalidFile);

      expect(screen.getByText(/Nur Bilddateien sind erlaubt/i)).toBeInTheDocument();

      // Test file size too large (mock 10MB file)
      const largeFile = new File(['x'.repeat(10 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, largeFile);

      expect(screen.getByText(/Datei ist zu groß/i)).toBeInTheDocument();
    });

    it('should allow setting main image', async () => {
      const user = userEvent.setup();

      const imagesTab = screen.getByRole('tab', { name: /Bilder/i });
      await user.click(imagesTab);

      // Mock multiple uploaded images
      const images = [
        { id: '1', url: 'image1.jpg', isMain: false },
        { id: '2', url: 'image2.jpg', isMain: true },
        { id: '3', url: 'image3.jpg', isMain: false }
      ];

      // Render with existing images
      images.forEach(image => {
        const img = screen.getByRole('img', { name: new RegExp(image.url) });
        expect(img).toBeInTheDocument();
      });

      // Set different image as main
      const setMainButtons = screen.getAllByRole('button', { name: /Als Hauptbild setzen/i });
      await user.click(setMainButtons[0]);

      // Should update main image indicator
      expect(screen.getByText(/Hauptbild/i)).toBeInTheDocument();
    });

    it('should allow image reordering', async () => {
      const user = userEvent.setup();

      const imagesTab = screen.getByRole('tab', { name: /Bilder/i });
      await user.click(imagesTab);

      // Test drag and drop reordering (simplified)
      const imageItems = screen.getAllByTestId(/image-item/i);
      expect(imageItems).toHaveLength(3);

      // Mock drag and drop
      const moveUpButton = screen.getAllByRole('button', { name: /Nach oben/i })[1];
      await user.click(moveUpButton);

      // Should reorder images
      const reorderedItems = screen.getAllByTestId(/image-item/i);
      expect(reorderedItems[0]).toHaveAttribute('data-image-id', '2');
    });
  });

  describe('Form Validation and Saving', () => {
    beforeEach(() => {
      render(
        <ProductModal
          isOpen={true}
          mode="create"
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );
    });

    it('should validate all required fields', async () => {
      const user = userEvent.setup();

      // Try to save without filling required fields
      const saveButton = screen.getByRole('button', { name: /Speichern/i });
      await user.click(saveButton);

      // Should show validation errors
      expect(screen.getByText(/Deutscher Name ist erforderlich/i)).toBeInTheDocument();
      expect(screen.getByText(/Preis ist erforderlich/i)).toBeInTheDocument();
      expect(screen.getByText(/Kategorie ist erforderlich/i)).toBeInTheDocument();
    });

    it('should save valid product data', async () => {
      const user = userEvent.setup();
      const mockOnSave = jest.fn();

      render(
        <ProductModal
          isOpen={true}
          mode="create"
          onClose={jest.fn()}
          onSave={mockOnSave}
        />
      );

      // Fill all required fields
      await user.type(screen.getByLabelText(/Produktname \(Deutsch\)/i), 'Test Produkt');
      await user.type(screen.getByLabelText(/Preis/i), '15.90');
      await user.selectOptions(screen.getByLabelText(/Kategorie/i), 'main-dishes');

      // Save
      const saveButton = screen.getByRole('button', { name: /Speichern/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            name: { de: 'Test Produkt' },
            pricing: expect.objectContaining({ basePrice: 15.90 }),
            category: 'main-dishes'
          })
        );
      });
    });

    it('should handle save errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock save error
      mockProductActions.createProduct.mockRejectedValue(new Error('Server error'));

      // Fill and try to save
      await user.type(screen.getByLabelText(/Produktname \(Deutsch\)/i), 'Test Produkt');
      await user.type(screen.getByLabelText(/Preis/i), '15.90');
      await user.selectOptions(screen.getByLabelText(/Kategorie/i), 'main-dishes');

      const saveButton = screen.getByRole('button', { name: /Speichern/i });
      await user.click(saveButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Fehler beim Speichern/i)).toBeInTheDocument();
      });

      // Should keep modal open
      expect(screen.getByText('Neues Produkt erstellen')).toBeInTheDocument();
    });

    it('should allow canceling without saving', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      render(
        <ProductModal
          isOpen={true}
          mode="create"
          onClose={mockOnClose}
          onSave={jest.fn()}
        />
      );

      // Fill some data
      await user.type(screen.getByLabelText(/Produktname \(Deutsch\)/i), 'Test');

      // Cancel
      const cancelButton = screen.getByRole('button', { name: /Abbrechen/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should warn about unsaved changes', async () => {
      const user = userEvent.setup();

      // Fill some data
      await user.type(screen.getByLabelText(/Produktname \(Deutsch\)/i), 'Test Produkt');

      // Try to close with unsaved changes
      const cancelButton = screen.getByRole('button', { name: /Abbrechen/i });
      await user.click(cancelButton);

      // Should show confirmation dialog
      expect(screen.getByText(/Ungespeicherte Änderungen/i)).toBeInTheDocument();
      expect(screen.getByText(/Wirklich schließen/i)).toBeInTheDocument();
    });
  });
});
