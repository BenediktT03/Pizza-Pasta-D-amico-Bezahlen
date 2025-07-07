/**
 * File: /apps/web/tests/e2e/payment.spec.ts
 * EATECH V3.0 - Payment Processing E2E Tests
 * Swiss payment methods: Stripe, Twint, PostFinance, Cash with FADP compliance
 */

describe('Payment Processing E2E', () => {
  const CHECKOUT_URL = 'http://localhost:3000/checkout';
  const TEST_TENANT = 'zuercher-genuss';
  const TEST_ORDER_TOTAL = 31.40;

  // Swiss test card numbers
  const SWISS_TEST_CARDS = {
    visa: '4000 0027 6000 0016',
    mastercard: '5200 0000 0000 0007',
    declined: '4000 0000 0000 0002',
    insufficient_funds: '4000 0000 0000 9995',
    expired: '4000 0000 0000 0069'
  };

  beforeEach(() => {
    // Mock payment providers
    cy.window().then((win) => {
      // Mock Stripe
      win.Stripe = (key: string) => ({
        elements: () => ({
          create: (type: string, options?: any) => ({
            mount: cy.stub(),
            unmount: cy.stub(),
            on: cy.stub(),
            focus: cy.stub(),
            blur: cy.stub(),
            clear: cy.stub(),
            update: cy.stub()
          }),
          getElement: cy.stub()
        }),
        confirmCardPayment: cy.stub().as('stripeConfirmPayment'),
        confirmPayment: cy.stub().as('stripeConfirmPayment'),
        createPaymentMethod: cy.stub().as('stripeCreatePaymentMethod')
      });

      // Mock Twint SDK
      win.Twint = {
        init: cy.stub().as('twintInit'),
        startPayment: cy.stub().as('twintStartPayment'),
        getStatus: cy.stub().as('twintGetStatus'),
        cancel: cy.stub().as('twintCancel')
      };

      // Mock PostFinance
      win.PostFinance = {
        init: cy.stub().as('postfinanceInit'),
        createPayment: cy.stub().as('postfinanceCreatePayment'),
        confirmPayment: cy.stub().as('postfinanceConfirmPayment')
      };
    });

    // Setup cart and customer data
    cy.window().then((win) => {
      win.localStorage.setItem('eatech_tenant_id', TEST_TENANT);
      win.localStorage.setItem('eatech_table_id', '5');

      const cart = {
        items: [
          {
            id: 'cart_1',
            productName: 'Zürcher Geschnetzeltes',
            quantity: 1,
            unitPrice: 24.90,
            totalPrice: 24.90,
            modifiers: [{ name: 'Rösti', price: 4.50 }]
          },
          {
            id: 'cart_2',
            productName: 'Rivella',
            quantity: 1,
            unitPrice: 3.50,
            totalPrice: 3.50
          }
        ],
        subtotal: 31.40,
        taxAmount: 2.42,
        total: 31.40
      };
      win.localStorage.setItem(`eatech_cart_${TEST_TENANT}`, JSON.stringify(cart));
    });

    // Mock API endpoints
    cy.intercept('POST', '/api/tenants/*/orders', {
      statusCode: 200,
      body: {
        id: 'order_test_123',
        orderNumber: 'ZG-2025-TEST',
        status: 'pending_payment',
        paymentIntent: 'pi_test_12345'
      }
    }).as('createOrder');

    cy.intercept('POST', '/api/payments/stripe/confirm', {
      statusCode: 200,
      body: { status: 'succeeded', paymentIntent: { id: 'pi_test_12345' } }
    }).as('confirmStripePayment');

    cy.intercept('POST', '/api/payments/twint/initiate', {
      statusCode: 200,
      body: {
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        paymentId: 'twint_test_123',
        amount: 3140 // Rappen
      }
    }).as('initiateTwintPayment');

    cy.intercept('GET', '/api/payments/twint/status/*', {
      statusCode: 200,
      body: { status: 'completed' }
    }).as('getTwintStatus');
  });

  describe('Payment Method Selection', () => {
    beforeEach(() => {
      cy.visit(CHECKOUT_URL);

      // Fill customer information
      cy.get('[data-testid="customer-firstname"]').type('Hans');
      cy.get('[data-testid="customer-lastname"]').type('Müller');
      cy.get('[data-testid="customer-phone"]').type('+41 79 123 45 67');
      cy.get('[data-testid="customer-email"]').type('hans.mueller@example.ch');

      cy.get('[data-testid="continue-to-payment"]').click();
    });

    it('should display all Swiss payment methods', () => {
      // Should show payment method options
      cy.get('[data-testid="payment-methods"]').should('be.visible');

      // Credit/Debit Cards
      cy.get('[data-testid="payment-method-card"]')
        .should('be.visible')
        .within(() => {
          cy.contains('Kreditkarte').should('be.visible');
          cy.contains('Visa, Mastercard, American Express').should('be.visible');
          cy.get('[data-testid="card-icons"]').should('be.visible');
        });

      // Twint
      cy.get('[data-testid="payment-method-twint"]')
        .should('be.visible')
        .within(() => {
          cy.contains('Twint').should('be.visible');
          cy.contains('Schnell und sicher mit der Twint App').should('be.visible');
          cy.get('[data-testid="twint-logo"]').should('be.visible');
        });

      // PostFinance
      cy.get('[data-testid="payment-method-postfinance"]')
        .should('be.visible')
        .within(() => {
          cy.contains('PostFinance').should('be.visible');
          cy.contains('Mit PostFinance E-Finance bezahlen').should('be.visible');
        });

      // Cash
      cy.get('[data-testid="payment-method-cash"]')
        .should('be.visible')
        .within(() => {
          cy.contains('Barzahlung').should('be.visible');
          cy.contains('Bezahlung bei Abholung').should('be.visible');
        });
    });

    it('should show payment method fees and processing times', () => {
      // Card payment - no fee
      cy.get('[data-testid="payment-method-card"]')
        .find('[data-testid="payment-fee"]')
        .should('contain', 'Keine Gebühren');

      // Twint - no fee
      cy.get('[data-testid="payment-method-twint"]')
        .find('[data-testid="payment-fee"]')
        .should('contain', 'Keine Gebühren');

      // PostFinance - may have fee
      cy.get('[data-testid="payment-method-postfinance"]')
        .find('[data-testid="payment-fee"]')
        .should('be.visible');

      // Cash - no fee
      cy.get('[data-testid="payment-method-cash"]')
        .find('[data-testid="payment-fee"]')
        .should('contain', 'Keine Gebühren');
    });

    it('should validate payment method selection', () => {
      // Try to proceed without selecting payment method
      cy.get('[data-testid="place-order"]').click();

      cy.get('[data-testid="payment-method-error"]')
        .should('be.visible')
        .should('contain', 'Bitte wählen Sie eine Zahlungsmethode');
    });
  });

  describe('Credit Card Payment (Stripe)', () => {
    beforeEach(() => {
      cy.visit(CHECKOUT_URL);
      cy.get('[data-testid="customer-firstname"]').type('Hans');
      cy.get('[data-testid="customer-lastname"]').type('Müller');
      cy.get('[data-testid="customer-phone"]').type('+41 79 123 45 67');
      cy.get('[data-testid="customer-email"]').type('hans.mueller@example.ch');
      cy.get('[data-testid="continue-to-payment"]').click();

      // Select card payment
      cy.get('[data-testid="payment-method-card"]').click();
    });

    it('should display Stripe Elements card form', () => {
      // Should show Stripe card element
      cy.get('[data-testid="stripe-card-element"]')
        .should('be.visible');

      // Should show cardholder name field
      cy.get('[data-testid="cardholder-name"]')
        .should('be.visible')
        .should('have.attr', 'placeholder', 'Name auf der Karte');

      // Should show save card option
      cy.get('[data-testid="save-card-checkbox"]')
        .should('be.visible');

      // Should show security notice
      cy.get('[data-testid="card-security-notice"]')
        .should('contain', 'Ihre Kartendaten werden sicher übertragen');
    });

    it('should process successful card payment', () => {
      // Mock successful Stripe payment
      cy.window().then((win) => {
        win.Stripe().confirmCardPayment.resolves({
          paymentIntent: {
            id: 'pi_test_success',
            status: 'succeeded',
            amount: 3140,
            currency: 'chf'
          }
        });
      });

      // Fill cardholder name
      cy.get('[data-testid="cardholder-name"]').type('Hans Müller');

      // Accept terms
      cy.get('[data-testid="accept-terms"]').check();

      // Place order
      cy.get('[data-testid="place-order"]').click();

      // Should show processing state
      cy.get('[data-testid="payment-processing"]')
        .should('be.visible')
        .should('contain', 'Zahlung wird verarbeitet');

      // Should process payment
      cy.get('@stripeConfirmPayment').should('have.been.called');

      // Should redirect to confirmation
      cy.url().should('include', '/confirmation');
      cy.contains('Zahlung erfolgreich').should('be.visible');
    });

    it('should handle declined card', () => {
      // Mock declined payment
      cy.window().then((win) => {
        win.Stripe().confirmCardPayment.rejects({
          type: 'card_error',
          code: 'card_declined',
          message: 'Your card was declined.'
        });
      });

      cy.get('[data-testid="cardholder-name"]').type('Hans Müller');
      cy.get('[data-testid="accept-terms"]').check();
      cy.get('[data-testid="place-order"]').click();

      // Should show error message
      cy.get('[data-testid="payment-error"]')
        .should('be.visible')
        .should('contain', 'Karte wurde abgelehnt');

      // Should allow retry
      cy.get('[data-testid="retry-payment"]').should('be.visible');
    });

    it('should handle insufficient funds', () => {
      cy.window().then((win) => {
        win.Stripe().confirmCardPayment.rejects({
          type: 'card_error',
          code: 'insufficient_funds',
          message: 'Your card has insufficient funds.'
        });
      });

      cy.get('[data-testid="cardholder-name"]').type('Hans Müller');
      cy.get('[data-testid="accept-terms"]').check();
      cy.get('[data-testid="place-order"]').click();

      cy.get('[data-testid="payment-error"]')
        .should('contain', 'Nicht genügend Guthaben auf der Karte');
    });

    it('should validate card form before submission', () => {
      // Try to submit without cardholder name
      cy.get('[data-testid="accept-terms"]').check();
      cy.get('[data-testid="place-order"]').click();

      cy.get('[data-testid="cardholder-name-error"]')
        .should('contain', 'Name auf der Karte ist erforderlich');
    });

    it('should show 3D Secure authentication flow', () => {
      // Mock 3D Secure requirement
      cy.window().then((win) => {
        win.Stripe().confirmCardPayment.resolves({
          paymentIntent: {
            id: 'pi_test_3ds',
            status: 'requires_action',
            next_action: {
              type: 'use_stripe_sdk'
            }
          }
        });
      });

      cy.get('[data-testid="cardholder-name"]').type('Hans Müller');
      cy.get('[data-testid="accept-terms"]').check();
      cy.get('[data-testid="place-order"]').click();

      // Should show 3D Secure modal
      cy.get('[data-testid="3ds-modal"]')
        .should('be.visible')
        .should('contain', '3D Secure Authentifizierung');
    });
  });

  describe('Twint Payment', () => {
    beforeEach(() => {
      cy.visit(CHECKOUT_URL);
      cy.get('[data-testid="customer-firstname"]').type('Hans');
      cy.get('[data-testid="customer-lastname"]').type('Müller');
      cy.get('[data-testid="customer-phone"]').type('+41 79 123 45 67');
      cy.get('[data-testid="customer-email"]').type('hans.mueller@example.ch');
      cy.get('[data-testid="continue-to-payment"]').click();

      // Select Twint payment
      cy.get('[data-testid="payment-method-twint"]').click();
    });

    it('should display Twint QR code and instructions', () => {
      cy.get('[data-testid="accept-terms"]').check();
      cy.get('[data-testid="place-order"]').click();

      cy.wait('@initiateTwintPayment');

      // Should show QR code
      cy.get('[data-testid="twint-qr-code"]')
        .should('be.visible');

      // Should show instructions in German
      cy.get('[data-testid="twint-instructions"]')
        .should('contain', 'Scannen Sie den QR-Code mit Ihrer Twint App');

      // Should show amount
      cy.get('[data-testid="twint-amount"]')
        .should('contain', 'CHF 31.40');

      // Should show timeout countdown
      cy.get('[data-testid="twint-timeout"]')
        .should('be.visible')
        .should('contain', '5:00'); // 5 minutes
    });

    it('should process successful Twint payment', () => {
      cy.get('[data-testid="accept-terms"]').check();
      cy.get('[data-testid="place-order"]').click();

      cy.wait('@initiateTwintPayment');

      // Should show pending state
      cy.get('[data-testid="twint-status"]')
        .should('contain', 'Warten auf Zahlung');

      // Mock successful payment after 2 seconds
      cy.intercept('GET', '/api/payments/twint/status/*', {
        statusCode: 200,
        body: { status: 'completed' }
      });

      // Should poll for status and complete
      cy.get('[data-testid="payment-success"]', { timeout: 10000 })
        .should('be.visible');

      cy.url().should('include', '/confirmation');
    });

    it('should handle Twint payment cancellation', () => {
      cy.get('[data-testid="accept-terms"]').check();
      cy.get('[data-testid="place-order"]').click();

      cy.wait('@initiateTwintPayment');

      // Cancel payment
      cy.get('[data-testid="cancel-twint"]').click();

      cy.get('[data-testid="confirm-cancel"]').click();

      // Should return to payment selection
      cy.get('[data-testid="payment-methods"]').should('be.visible');

      // Should show cancellation message
      cy.get('[data-testid="payment-cancelled"]')
        .should('contain', 'Twint Zahlung abgebrochen');
    });

    it('should handle Twint payment timeout', () => {
      cy.get('[data-testid="accept-terms"]').check();
      cy.get('[data-testid="place-order"]').click();

      cy.wait('@initiateTwintPayment');

      // Mock timeout response
      cy.intercept('GET', '/api/payments/twint/status/*', {
        statusCode: 200,
        body: { status: 'timeout' }
      });

      // Should show timeout message
      cy.get('[data-testid="twint-timeout-message"]', { timeout: 12000 })
        .should('contain', 'Zahlung ist abgelaufen');

      // Should offer retry
      cy.get('[data-testid="retry-twint"]').should('be.visible');
    });

    it('should handle Twint payment errors', () => {
      cy.intercept('POST', '/api/payments/twint/initiate', {
        statusCode: 500,
        body: { error: 'Twint service unavailable' }
      });

      cy.get('[data-testid="accept-terms"]').check();
      cy.get('[data-testid="place-order"]').click();

      cy.get('[data-testid="payment-error"]')
        .should('contain', 'Twint ist momentan nicht verfügbar');

      // Should suggest alternative payment methods
      cy.get('[data-testid="alternative-payment-methods"]')
        .should('be.visible');
    });
  });

  describe('PostFinance Payment', () => {
    beforeEach(() => {
      cy.visit(CHECKOUT_URL);
      cy.get('[data-testid="customer-firstname"]').type('Hans');
      cy.get('[data-testid="customer-lastname"]').type('Müller');
      cy.get('[data-testid="customer-phone"]').type('+41 79 123 45 67');
      cy.get('[data-testid="customer-email"]').type('hans.mueller@example.ch');
      cy.get('[data-testid="continue-to-payment"]').click();

      // Select PostFinance payment
      cy.get('[data-testid="payment-method-postfinance"]').click();
    });

    it('should redirect to PostFinance E-Finance', () => {
      // Mock PostFinance redirect
      cy.intercept('POST', '/api/payments/postfinance/initiate', {
        statusCode: 200,
        body: {
          redirectUrl: 'https://e-payment.postfinance.ch/ncol/test/orderstandard.asp',
          transactionId: 'pf_test_123'
        }
      }).as('initiatePostFinance');

      cy.get('[data-testid="accept-terms"]').check();
      cy.get('[data-testid="place-order"]').click();

      cy.wait('@initiatePostFinance');

      // Should redirect to PostFinance
      cy.url().should('include', 'postfinance.ch');
    });

    it('should handle PostFinance return flow', () => {
      // Simulate return from PostFinance with success
      cy.visit(`${CHECKOUT_URL}/return/postfinance?status=success&orderID=pf_test_123`);

      // Should show success message
      cy.get('[data-testid="payment-success"]')
        .should('contain', 'PostFinance Zahlung erfolgreich');

      cy.url().should('include', '/confirmation');
    });

    it('should handle PostFinance cancellation', () => {
      cy.visit(`${CHECKOUT_URL}/return/postfinance?status=cancelled&orderID=pf_test_123`);

      cy.get('[data-testid="payment-cancelled"]')
        .should('contain', 'PostFinance Zahlung abgebrochen');

      // Should return to payment selection
      cy.url().should('include', '/checkout');
    });

    it('should handle PostFinance errors', () => {
      cy.visit(`${CHECKOUT_URL}/return/postfinance?status=error&orderID=pf_test_123&error=declined`);

      cy.get('[data-testid="payment-error"]')
        .should('contain', 'PostFinance Zahlung fehlgeschlagen');
    });
  });

  describe('Cash Payment', () => {
    beforeEach(() => {
      cy.visit(CHECKOUT_URL);
      cy.get('[data-testid="customer-firstname"]').type('Hans');
      cy.get('[data-testid="customer-lastname"]').type('Müller');
      cy.get('[data-testid="customer-phone"]').type('+41 79 123 45 67');
      cy.get('[data-testid="customer-email"]').type('hans.mueller@example.ch');
      cy.get('[data-testid="continue-to-payment"]').click();

      // Select cash payment
      cy.get('[data-testid="payment-method-cash"]').click();
    });

    it('should display cash payment instructions', () => {
      // Should show cash payment info
      cy.get('[data-testid="cash-payment-info"]')
        .should('be.visible')
        .should('contain', 'Bezahlung bei Abholung');

      // Should show exact amount notice
      cy.get('[data-testid="exact-amount-notice"]')
        .should('contain', 'Passend zahlen wird geschätzt');

      // Should show total amount
      cy.get('[data-testid="cash-total"]')
        .should('contain', 'CHF 31.40');
    });

    it('should calculate change amount', () => {
      // Enter cash amount given
      cy.get('[data-testid="cash-amount-given"]')
        .type('40.00');

      // Should calculate change
      cy.get('[data-testid="change-amount"]')
        .should('contain', 'Rückgeld: CHF 8.60');

      // Test with exact amount
      cy.get('[data-testid="cash-amount-given"]')
        .clear()
        .type('31.40');

      cy.get('[data-testid="change-amount"]')
        .should('contain', 'Passend bezahlt');
    });

    it('should complete cash order', () => {
      cy.get('[data-testid="cash-amount-given"]').type('35.00');
      cy.get('[data-testid="accept-terms"]').check();
      cy.get('[data-testid="place-order"]').click();

      cy.wait('@createOrder');

      // Should show confirmation with cash payment notice
      cy.url().should('include', '/confirmation');
      cy.get('[data-testid="cash-payment-notice"]')
        .should('contain', 'Barzahlung bei Abholung');

      cy.get('[data-testid="change-reminder"]')
        .should('contain', 'Rückgeld: CHF 3.60');
    });

    it('should validate cash amount', () => {
      // Try with insufficient amount
      cy.get('[data-testid="cash-amount-given"]').type('20.00');
      cy.get('[data-testid="accept-terms"]').check();
      cy.get('[data-testid="place-order"]').click();

      cy.get('[data-testid="cash-amount-error"]')
        .should('contain', 'Betrag ist zu niedrig');
    });
  });

  describe('Payment Security & Compliance', () => {
    beforeEach(() => {
      cy.visit(CHECKOUT_URL);
      cy.get('[data-testid="customer-firstname"]').type('Hans');
      cy.get('[data-testid="customer-lastname"]').type('Müller');
      cy.get('[data-testid="customer-phone"]').type('+41 79 123 45 67');
      cy.get('[data-testid="customer-email"]').type('hans.mueller@example.ch');
      cy.get('[data-testid="continue-to-payment"]').click();
    });

    it('should display Swiss data protection notices', () => {
      // Should show FADP compliance notice
      cy.get('[data-testid="data-protection-notice"]')
        .should('be.visible')
        .should('contain', 'Daten werden gemäß FADP verarbeitet');

      // Should link to privacy policy
      cy.get('[data-testid="privacy-policy-link"]')
        .should('have.attr', 'href')
        .and('include', '/datenschutz');

      // Should show data retention information
      cy.get('[data-testid="data-retention-info"]')
        .should('contain', 'Zahlungsdaten werden 10 Jahre gespeichert');
    });

    it('should require terms acceptance', () => {
      cy.get('[data-testid="payment-method-card"]').click();
      cy.get('[data-testid="cardholder-name"]').type('Hans Müller');

      // Try to place order without accepting terms
      cy.get('[data-testid="place-order"]').click();

      cy.get('[data-testid="terms-error"]')
        .should('contain', 'Bitte akzeptieren Sie die AGB');

      // Should not process payment
      cy.get('@stripeConfirmPayment').should('not.have.been.called');
    });

    it('should display SSL security indicators', () => {
      // Should show security badges
      cy.get('[data-testid="ssl-badge"]').should('be.visible');
      cy.get('[data-testid="pci-compliance-badge"]').should('be.visible');

      // Should show encryption notice
      cy.get('[data-testid="encryption-notice"]')
        .should('contain', '256-bit SSL Verschlüsselung');
    });

    it('should handle PCI DSS compliance', () => {
      cy.get('[data-testid="payment-method-card"]').click();

      // Should not store card data in localStorage or browser
      cy.window().then((win) => {
        expect(win.localStorage.getItem('card_number')).to.be.null;
        expect(win.sessionStorage.getItem('card_number')).to.be.null;
      });

      // Card form should be in secure iframe
      cy.get('[data-testid="stripe-card-element"]')
        .should('exist'); // Stripe Elements handles PCI compliance
    });

    it('should log payment attempts for audit', () => {
      // Mock audit logging
      cy.intercept('POST', '/api/audit/payment-attempt', {
        statusCode: 200,
        body: { logged: true }
      }).as('auditLog');

      cy.get('[data-testid="payment-method-card"]').click();
      cy.get('[data-testid="cardholder-name"]').type('Hans Müller');
      cy.get('[data-testid="accept-terms"]').check();
      cy.get('[data-testid="place-order"]').click();

      // Should log payment attempt
      cy.wait('@auditLog');
    });
  });

  describe('Mobile Payment Experience', () => {
    beforeEach(() => {
      // Set mobile viewport
      cy.viewport(375, 667); // iPhone 8

      cy.visit(CHECKOUT_URL);
      cy.get('[data-testid="customer-firstname"]').type('Hans');
      cy.get('[data-testid="customer-lastname"]').type('Müller');
      cy.get('[data-testid="customer-phone"]').type('+41 79 123 45 67');
      cy.get('[data-testid="customer-email"]').type('hans.mueller@example.ch');
      cy.get('[data-testid="continue-to-payment"]').click();
    });

    it('should display mobile-optimized payment methods', () => {
      // Payment methods should be stacked vertically
      cy.get('[data-testid="payment-methods"]')
        .should('have.class', 'mobile-layout');

      // Payment method cards should be full width
      cy.get('[data-testid="payment-method-card"]')
        .should('have.css', 'width')
        .and('not.equal', 'auto');
    });

    it('should handle mobile Twint app switching', () => {
      cy.get('[data-testid="payment-method-twint"]').click();
      cy.get('[data-testid="accept-terms"]').check();
      cy.get('[data-testid="place-order"]').click();

      cy.wait('@initiateTwintPayment');

      // Should show app switch button on mobile
      cy.get('[data-testid="open-twint-app"]')
        .should('be.visible')
        .should('contain', 'Twint App öffnen');

      // Should have deep link to Twint app
      cy.get('[data-testid="open-twint-app"]')
        .should('have.attr', 'href')
        .and('include', 'twint://');
    });

    it('should optimize card input for mobile', () => {
      cy.get('[data-testid="payment-method-card"]').click();

      // Should use appropriate input types
      cy.get('[data-testid="cardholder-name"]')
        .should('have.attr', 'autocomplete', 'cc-name');

      // Should show mobile-friendly keyboard
      cy.get('[data-testid="stripe-card-element"]')
        .should('exist'); // Stripe handles mobile optimization
    });
  });

  describe('Payment Error Recovery', () => {
    beforeEach(() => {
      cy.visit(CHECKOUT_URL);
      cy.get('[data-testid="customer-firstname"]').type('Hans');
      cy.get('[data-testid="customer-lastname"]').type('Müller');
      cy.get('[data-testid="customer-phone"]').type('+41 79 123 45 67');
      cy.get('[data-testid="customer-email"]').type('hans.mueller@example.ch');
      cy.get('[data-testid="continue-to-payment"]').click();
    });

    it('should handle network errors gracefully', () => {
      // Mock network error
      cy.intercept('POST', '/api/tenants/*/orders', {
        forceNetworkError: true
      }).as('networkError');

      cy.get('[data-testid="payment-method-card"]').click();
      cy.get('[data-testid="cardholder-name"]').type('Hans Müller');
      cy.get('[data-testid="accept-terms"]').check();
      cy.get('[data-testid="place-order"]').click();

      // Should show network error message
      cy.get('[data-testid="network-error"]')
        .should('contain', 'Netzwerkfehler');

      // Should offer retry
      cy.get('[data-testid="retry-payment"]').should('be.visible');
    });

    it('should handle payment provider timeouts', () => {
      // Mock timeout
      cy.window().then((win) => {
        win.Stripe().confirmCardPayment.callsFake(() => {
          return new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('Request timeout'));
            }, 30000);
          });
        });
      });

      cy.get('[data-testid="payment-method-card"]').click();
      cy.get('[data-testid="cardholder-name"]').type('Hans Müller');
      cy.get('[data-testid="accept-terms"]').check();
      cy.get('[data-testid="place-order"]').click();

      // Should show timeout after 30 seconds
      cy.get('[data-testid="payment-timeout"]', { timeout: 35000 })
        .should('contain', 'Zahlung dauert zu lange');
    });

    it('should preserve order data on payment failure', () => {
      // Fail first payment attempt
      cy.window().then((win) => {
        win.Stripe().confirmCardPayment.rejects({
          type: 'card_error',
          code: 'card_declined'
        });
      });

      cy.get('[data-testid="payment-method-card"]').click();
      cy.get('[data-testid="cardholder-name"]').type('Hans Müller');
      cy.get('[data-testid="accept-terms"]').check();
      cy.get('[data-testid="place-order"]').click();

      // Should show error
      cy.get('[data-testid="payment-error"]').should('be.visible');

      // Order data should still be preserved
      cy.get('[data-testid="order-summary"]')
        .should('contain', 'Zürcher Geschnetzeltes')
        .should('contain', 'CHF 31.40');

      // Should allow trying different payment method
      cy.get('[data-testid="payment-method-twint"]').click();

      cy.get('[data-testid="accept-terms"]').should('be.checked');
    });

    it('should handle duplicate payment attempts', () => {
      // Mock first attempt as pending
      cy.intercept('POST', '/api/tenants/*/orders', {
        statusCode: 200,
        body: {
          id: 'order_test_123',
          status: 'pending_payment',
          paymentIntent: 'pi_test_pending'
        }
      }).as('firstAttempt');

      cy.get('[data-testid="payment-method-card"]').click();
      cy.get('[data-testid="cardholder-name"]').type('Hans Müller');
      cy.get('[data-testid="accept-terms"]').check();
      cy.get('[data-testid="place-order"]').click();

      cy.wait('@firstAttempt');

      // Try to place order again while first is processing
      cy.get('[data-testid="place-order"]').click();

      // Should prevent duplicate attempts
      cy.get('[data-testid="duplicate-payment-warning"]')
        .should('contain', 'Zahlung wird bereits verarbeitet');
    });
  });

  describe('Accessibility in Payment Flow', () => {
    beforeEach(() => {
      cy.visit(CHECKOUT_URL);
      cy.get('[data-testid="customer-firstname"]').type('Hans');
      cy.get('[data-testid="customer-lastname"]').type('Müller');
      cy.get('[data-testid="customer-phone"]').type('+41 79 123 45 67');
      cy.get('[data-testid="customer-email"]').type('hans.mueller@example.ch');
      cy.get('[data-testid="continue-to-payment"]').click();
    });

    it('should be keyboard navigable', () => {
      // Tab through payment methods
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-testid', 'payment-method-card');

      cy.focused().tab();
      cy.focused().should('have.attr', 'data-testid', 'payment-method-twint');

      // Select with Enter key
      cy.focused().type('{enter}');

      // Should select Twint
      cy.get('[data-testid="payment-method-twint"]')
        .should('have.attr', 'aria-checked', 'true');
    });

    it('should have proper ARIA labels', () => {
      // Payment methods should have radio role
      cy.get('[data-testid="payment-method-card"]')
        .should('have.attr', 'role', 'radio');

      // Should have descriptive labels
      cy.get('[data-testid="payment-method-card"]')
        .should('have.attr', 'aria-label')
        .and('include', 'Kreditkarte');

      // Error messages should be announced
      cy.get('[data-testid="payment-method-card"]').click();
      cy.get('[data-testid="place-order"]').click();

      cy.get('[data-testid="cardholder-name-error"]')
        .should('have.attr', 'role', 'alert');
    });

    it('should support screen readers', () => {
      // Payment amounts should be announced properly
      cy.get('[data-testid="total-amount"]')
        .should('have.attr', 'aria-label', 'Gesamtbetrag CHF 31.40');

      // Loading states should be announced
      cy.get('[data-testid="payment-method-card"]').click();
      cy.get('[data-testid="cardholder-name"]').type('Hans Müller');
      cy.get('[data-testid="accept-terms"]').check();
      cy.get('[data-testid="place-order"]').click();

      cy.get('[data-testid="payment-processing"]')
        .should('have.attr', 'aria-live', 'polite');
    });
  });
});
