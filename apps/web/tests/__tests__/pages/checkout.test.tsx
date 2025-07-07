/**
 * File: /apps/web/tests/__tests__/pages/checkout.test.tsx
 * EATECH V3.0 - Checkout Page Integration Tests
 * Swiss payment methods (Twint, PostFinance), tax calculations, and compliance
 */

import CheckoutPage from '@/app/(customer)/checkout/page';
import { useCart } from '@/features/cart/useCart';
import { useCheckout } from '@/features/checkout/useCheckout';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/router';
import { mockSwissCustomer, mockSwissTenant } from '../../__mocks__/mockData';

// Mock Stripe
const mockStripe = {
  elements: jest.fn(() => ({
    create: jest.fn(() => ({
      mount: jest.fn(),
      unmount: jest.fn(),
      on: jest.fn(),
      focus: jest.fn()
    })),
    getElement: jest.fn()
  })),
  confirmPayment: jest.fn(),
  confirmCardPayment: jest.fn()
};

// Mock Twint SDK
const mockTwint = {
  init: jest.fn(),
  startPayment: jest.fn(),
  getStatus: jest.fn()
};

// Mock dependencies
jest.mock('next/router');
jest.mock('@/features/checkout/useCheckout');
jest.mock('@/features/cart/useCart');
jest.mock('@/hooks/useTenant');
jest.mock('@/hooks/useAuth');
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() => Promise.resolve(mockStripe))
}));

// Mock global Twint
Object.defineProperty(window, 'Twint', {
  writable: true,
  value: mockTwint
});

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseCheckout = useCheckout as jest.MockedFunction<typeof useCheckout>;
const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;
const mockUseTenant = useTenant as jest.MockedFunction<typeof useTenant>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Swiss checkout data
const swissCartData = {
  items: [
    {
      id: 'cart_1',
      productName: 'Zürcher Geschnetzeltes',
      quantity: 1,
      unitPrice: 24.90,
      totalPrice: 24.90
    },
    {
      id: 'cart_2',
      productName: 'Rivella',
      quantity: 2,
      unitPrice: 3.50,
      totalPrice: 7.00
    }
  ],
  subtotal: 31.90,
  taxRate: 7.7,
  taxAmount: 2.46,
  total: 31.90, // Tax included
  currency: 'CHF'
};

const mockCheckoutActions = {
  updateCustomerInfo: jest.fn(),
  selectPaymentMethod: jest.fn(),
  applyDiscount: jest.fn(),
  placeOrder: jest.fn(),
  validateForm: jest.fn()
};

const mockCartActions = {
  updateItem: jest.fn(),
  removeItem: jest.fn(),
  clearCart: jest.fn()
};

describe('Checkout Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseRouter.mockReturnValue({
      push: jest.fn(),
      back: jest.fn(),
      query: { table: '5' },
      pathname: '/checkout'
    } as any);

    mockUseTenant.mockReturnValue({
      tenant: {
        ...mockSwissTenant,
        settings: {
          currency: 'CHF',
          taxRate: 7.7,
          taxIncluded: true,
          paymentMethods: ['card', 'twint', 'cash', 'postfinance']
        }
      },
      isLoading: false
    });

    mockUseAuth.mockReturnValue({
      user: mockSwissCustomer,
      isAuthenticated: true,
      isLoading: false
    });

    mockUseCart.mockReturnValue({
      ...swissCartData,
      ...mockCartActions
    });

    mockUseCheckout.mockReturnValue({
      customerInfo: {
        firstName: 'Hans',
        lastName: 'Müller',
        phone: '+41791234567',
        email: 'hans.mueller@example.ch'
      },
      paymentMethod: null,
      orderType: 'pickup',
      isLoading: false,
      errors: {},
      ...mockCheckoutActions
    });
  });

  describe('Page Rendering', () => {
    it('should render checkout page with Swiss branding', () => {
      render(<CheckoutPage />);

      expect(screen.getByText(/Bestellung abschließen/i)).toBeInTheDocument();
      expect(screen.getByText(/Zürcher Genuss/i)).toBeInTheDocument();
      expect(screen.getByText(/Tisch 5/i)).toBeInTheDocument();
    });

    it('should display order summary with Swiss formatting', () => {
      render(<CheckoutPage />);

      expect(screen.getByText('Zürcher Geschnetzeltes')).toBeInTheDocument();
      expect(screen.getByText('1x CHF 24.90')).toBeInTheDocument();
      expect(screen.getByText('Rivella')).toBeInTheDocument();
      expect(screen.getByText('2x CHF 3.50')).toBeInTheDocument();

      expect(screen.getByText('Zwischensumme: CHF 31.90')).toBeInTheDocument();
      expect(screen.getByText('inkl. 7.7% MwSt.: CHF 2.46')).toBeInTheDocument();
      expect(screen.getByText('Gesamt: CHF 31.90')).toBeInTheDocument();
    });

    it('should show pickup information for table orders', () => {
      render(<CheckoutPage />);

      expect(screen.getByText(/Abholung am Tisch 5/i)).toBeInTheDocument();
      expect(screen.getByText(/Geschätzte Zubereitungszeit/i)).toBeInTheDocument();
    });
  });

  describe('Customer Information Form', () => {
    it('should render customer information form', () => {
      render(<CheckoutPage />);

      expect(screen.getByLabelText(/Vorname/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Nachname/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Telefonnummer/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/E-Mail/i)).toBeInTheDocument();
    });

    it('should validate Swiss phone number format', async () => {
      const user = userEvent.setup();
      render(<CheckoutPage />);

      const phoneInput = screen.getByLabelText(/Telefonnummer/i);
      await user.clear(phoneInput);
      await user.type(phoneInput, '123456'); // Invalid format

      await user.tab();

      expect(screen.getByText(/Bitte geben Sie eine gültige Schweizer Telefonnummer ein/i))
        .toBeInTheDocument();
    });

    it('should accept valid Swiss phone formats', async () => {
      const user = userEvent.setup();
      render(<CheckoutPage />);

      const phoneInput = screen.getByLabelText(/Telefonnummer/i);

      // Test different valid formats
      const validNumbers = ['+41791234567', '079 123 45 67', '0041 79 123 45 67'];

      for (const number of validNumbers) {
        await user.clear(phoneInput);
        await user.type(phoneInput, number);
        await user.tab();

        expect(screen.queryByText(/ungültige.*Telefonnummer/i)).not.toBeInTheDocument();
      }
    });

    it('should validate email format', async () => {
      const user = userEvent.setup();
      render(<CheckoutPage />);

      const emailInput = screen.getByLabelText(/E-Mail/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');

      await user.tab();

      expect(screen.getByText(/Bitte geben Sie eine gültige E-Mail-Adresse ein/i))
        .toBeInTheDocument();
    });

    it('should save customer information', async () => {
      const user = userEvent.setup();
      render(<CheckoutPage />);

      const firstNameInput = screen.getByLabelText(/Vorname/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Peter');

      expect(mockCheckoutActions.updateCustomerInfo).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: 'Peter' })
      );
    });
  });

  describe('Payment Methods', () => {
    it('should display Swiss payment methods', () => {
      render(<CheckoutPage />);

      expect(screen.getByLabelText(/Kreditkarte/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Twint/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/PostFinance/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Barzahlung/i)).toBeInTheDocument();
    });

    it('should select payment method', async () => {
      const user = userEvent.setup();
      render(<CheckoutPage />);

      const twintOption = screen.getByLabelText(/Twint/i);
      await user.click(twintOption);

      expect(mockCheckoutActions.selectPaymentMethod).toHaveBeenCalledWith('twint');
    });

    it('should show payment method descriptions', () => {
      render(<CheckoutPage />);

      expect(screen.getByText(/Schnell und sicher mit Twint bezahlen/i)).toBeInTheDocument();
      expect(screen.getByText(/Schweizer Online-Banking/i)).toBeInTheDocument();
    });

    describe('Card Payment', () => {
      it('should render Stripe card element when card is selected', async () => {
        const user = userEvent.setup();
        render(<CheckoutPage />);

        const cardOption = screen.getByLabelText(/Kreditkarte/i);
        await user.click(cardOption);

        await waitFor(() => {
          expect(screen.getByTestId('stripe-card-element')).toBeInTheDocument();
        });
      });

      it('should validate card information', async () => {
        mockUseCheckout.mockReturnValue({
          ...mockUseCheckout(),
          paymentMethod: 'card',
          errors: { card: 'Karte abgelehnt' }
        });

        render(<CheckoutPage />);

        expect(screen.getByText('Karte abgelehnt')).toBeInTheDocument();
      });
    });

    describe('Twint Payment', () => {
      it('should show Twint QR code when Twint is selected', async () => {
        const user = userEvent.setup();
        render(<CheckoutPage />);

        const twintOption = screen.getByLabelText(/Twint/i);
        await user.click(twintOption);

        await waitFor(() => {
          expect(screen.getByTestId('twint-qr-code')).toBeInTheDocument();
        });
      });

      it('should initialize Twint payment flow', async () => {
        const user = userEvent.setup();
        render(<CheckoutPage />);

        const twintOption = screen.getByLabelText(/Twint/i);
        await user.click(twintOption);

        const payButton = screen.getByRole('button', { name: /Jetzt bezahlen/i });
        await user.click(payButton);

        expect(mockTwint.startPayment).toHaveBeenCalledWith({
          amount: 3190, // CHF 31.90 in Rappen
          currency: 'CHF',
          reference: expect.any(String)
        });
      });
    });

    describe('Cash Payment', () => {
      it('should show cash payment instructions', async () => {
        const user = userEvent.setup();
        render(<CheckoutPage />);

        const cashOption = screen.getByLabelText(/Barzahlung/i);
        await user.click(cashOption);

        expect(screen.getByText(/Bezahlung bei Abholung/i)).toBeInTheDocument();
        expect(screen.getByText(/Passend zahlen wird geschätzt/i)).toBeInTheDocument();
      });

      it('should calculate change when cash amount is entered', async () => {
        const user = userEvent.setup();
        render(<CheckoutPage />);

        const cashOption = screen.getByLabelText(/Barzahlung/i);
        await user.click(cashOption);

        const cashInput = screen.getByLabelText(/Betrag gegeben/i);
        await user.type(cashInput, '40');

        expect(screen.getByText(/Rückgeld: CHF 8.10/i)).toBeInTheDocument();
      });
    });
  });

  describe('Discount Codes', () => {
    it('should allow entering discount codes', async () => {
      const user = userEvent.setup();
      render(<CheckoutPage />);

      const discountInput = screen.getByPlaceholderText(/Rabattcode eingeben/i);
      await user.type(discountInput, 'SUMMER10');

      const applyButton = screen.getByRole('button', { name: /Anwenden/i });
      await user.click(applyButton);

      expect(mockCheckoutActions.applyDiscount).toHaveBeenCalledWith('SUMMER10');
    });

    it('should show discount applied', () => {
      mockUseCheckout.mockReturnValue({
        ...mockUseCheckout(),
        discount: {
          code: 'SUMMER10',
          type: 'percentage',
          value: 10,
          amount: 3.19
        }
      });

      render(<CheckoutPage />);

      expect(screen.getByText('SUMMER10 (-10%)')).toBeInTheDocument();
      expect(screen.getByText('- CHF 3.19')).toBeInTheDocument();
    });

    it('should show error for invalid discount codes', () => {
      mockUseCheckout.mockReturnValue({
        ...mockUseCheckout(),
        errors: { discount: 'Ungültiger Rabattcode' }
      });

      render(<CheckoutPage />);

      expect(screen.getByText('Ungültiger Rabattcode')).toBeInTheDocument();
    });
  });

  describe('Order Notes', () => {
    it('should allow adding special instructions', async () => {
      const user = userEvent.setup();
      render(<CheckoutPage />);

      const notesTextarea = screen.getByLabelText(/Besondere Wünsche/i);
      await user.type(notesTextarea, 'Ohne Zwiebeln, extra scharf');

      expect(mockCheckoutActions.updateCustomerInfo).toHaveBeenCalledWith(
        expect.objectContaining({ notes: 'Ohne Zwiebeln, extra scharf' })
      );
    });

    it('should limit notes character count', async () => {
      const user = userEvent.setup();
      render(<CheckoutPage />);

      const notesTextarea = screen.getByLabelText(/Besondere Wünsche/i);
      const longText = 'a'.repeat(500);

      await user.type(notesTextarea, longText);

      expect(notesTextarea).toHaveValue('a'.repeat(250)); // Assuming 250 char limit
      expect(screen.getByText(/250\/250 Zeichen/i)).toBeInTheDocument();
    });
  });

  describe('Order Placement', () => {
    it('should place order when all required fields are filled', async () => {
      mockUseCheckout.mockReturnValue({
        ...mockUseCheckout(),
        customerInfo: {
          firstName: 'Hans',
          lastName: 'Müller',
          phone: '+41791234567',
          email: 'hans@example.ch'
        },
        paymentMethod: 'card'
      });

      const user = userEvent.setup();
      render(<CheckoutPage />);

      const placeOrderButton = screen.getByRole('button', { name: /Bestellung aufgeben/i });
      await user.click(placeOrderButton);

      expect(mockCheckoutActions.placeOrder).toHaveBeenCalled();
    });

    it('should show loading state while placing order', () => {
      mockUseCheckout.mockReturnValue({
        ...mockUseCheckout(),
        isLoading: true
      });

      render(<CheckoutPage />);

      expect(screen.getByText(/Bestellung wird verarbeitet/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Bestellung aufgeben/i })).toBeDisabled();
    });

    it('should validate required fields before order placement', async () => {
      mockUseCheckout.mockReturnValue({
        ...mockUseCheckout(),
        customerInfo: { firstName: '', lastName: '', phone: '', email: '' },
        paymentMethod: null
      });

      const user = userEvent.setup();
      render(<CheckoutPage />);

      const placeOrderButton = screen.getByRole('button', { name: /Bestellung aufgeben/i });
      await user.click(placeOrderButton);

      expect(screen.getByText(/Bitte füllen Sie alle Pflichtfelder aus/i)).toBeInTheDocument();
      expect(mockCheckoutActions.placeOrder).not.toHaveBeenCalled();
    });
  });

  describe('Swiss Compliance', () => {
    it('should display mandatory consumer information', () => {
      render(<CheckoutPage />);

      expect(screen.getByText(/Widerrufsrecht/i)).toBeInTheDocument();
      expect(screen.getByText(/AGB/i)).toBeInTheDocument();
      expect(screen.getByText(/Datenschutz/i)).toBeInTheDocument();
    });

    it('should require acceptance of terms and conditions', async () => {
      const user = userEvent.setup();
      render(<CheckoutPage />);

      const termsCheckbox = screen.getByLabelText(/AGB akzeptieren/i);
      const placeOrderButton = screen.getByRole('button', { name: /Bestellung aufgeben/i });

      await user.click(placeOrderButton);

      expect(screen.getByText(/Bitte akzeptieren Sie die AGB/i)).toBeInTheDocument();

      await user.click(termsCheckbox);
      expect(termsCheckbox).toBeChecked();
    });

    it('should show tax information according to Swiss law', () => {
      render(<CheckoutPage />);

      expect(screen.getByText(/Alle Preise inkl\. 7\.7% MwSt\./i)).toBeInTheDocument();
      expect(screen.getByText(/MwSt\.-Nr\.: CHE-123\.456\.789/i)).toBeInTheDocument();
    });

    it('should display FADP-compliant privacy notice', () => {
      render(<CheckoutPage />);

      expect(screen.getByText(/Ihre Daten werden gemäß FADP verarbeitet/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Datenschutzerklärung/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels and structure', () => {
      render(<CheckoutPage />);

      expect(screen.getByRole('form', { name: /Checkout/i })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: /Kundendaten/i })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: /Zahlungsmethode/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<CheckoutPage />);

      // Tab through form fields
      await user.tab();
      expect(screen.getByLabelText(/Vorname/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/Nachname/i)).toHaveFocus();
    });

    it('should announce form errors to screen readers', async () => {
      mockUseCheckout.mockReturnValue({
        ...mockUseCheckout(),
        errors: { phone: 'Ungültige Telefonnummer' }
      });

      render(<CheckoutPage />);

      const errorMessage = screen.getByText('Ungültige Telefonnummer');
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(errorMessage).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Error Handling', () => {
    it('should handle payment processing errors', async () => {
      mockStripe.confirmPayment.mockRejectedValueOnce(new Error('Payment failed'));

      const user = userEvent.setup();
      render(<CheckoutPage />);

      const cardOption = screen.getByLabelText(/Kreditkarte/i);
      await user.click(cardOption);

      const placeOrderButton = screen.getByRole('button', { name: /Bestellung aufgeben/i });
      await user.click(placeOrderButton);

      await waitFor(() => {
        expect(screen.getByText(/Zahlung fehlgeschlagen/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      mockCheckoutActions.placeOrder.mockRejectedValueOnce(new Error('Network error'));

      const user = userEvent.setup();
      render(<CheckoutPage />);

      const placeOrderButton = screen.getByRole('button', { name: /Bestellung aufgeben/i });
      await user.click(placeOrderButton);

      await waitFor(() => {
        expect(screen.getByText(/Verbindungsfehler/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Erneut versuchen/i })).toBeInTheDocument();
      });
    });

    it('should handle cart becoming empty during checkout', () => {
      mockUseCart.mockReturnValue({
        ...mockUseCart(),
        items: [],
        itemCount: 0,
        total: 0
      });

      render(<CheckoutPage />);

      expect(screen.getByText(/Ihr Warenkorb ist leer/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Zurück zum Menü/i })).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should lazy load payment method components', async () => {
      const user = userEvent.setup();
      render(<CheckoutPage />);

      // Twint component should not be loaded initially
      expect(screen.queryByTestId('twint-qr-code')).not.toBeInTheDocument();

      const twintOption = screen.getByLabelText(/Twint/i);
      await user.click(twintOption);

      // Should load dynamically
      await waitFor(() => {
        expect(screen.getByTestId('twint-qr-code')).toBeInTheDocument();
      });
    });

    it('should debounce form field updates', async () => {
      const user = userEvent.setup();
      render(<CheckoutPage />);

      const firstNameInput = screen.getByLabelText(/Vorname/i);

      // Rapid typing
      await user.type(firstNameInput, 'Peter', { delay: 10 });

      // Should debounce updates
      await waitFor(() => {
        expect(mockCheckoutActions.updateCustomerInfo).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });
    });
  });
});
