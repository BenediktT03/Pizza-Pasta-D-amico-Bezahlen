/**
 * File: /apps/web/tests/e2e/customer-flow.spec.ts
 * EATECH V3.0 - Customer Journey E2E Tests
 * Complete Swiss foodtruck ordering flow from QR scan to payment
 */

describe('Customer Ordering Flow', () => {
  const SWISS_FOODTRUCK_URL = 'http://localhost:3000';
  const TEST_TENANT = 'zuercher-genuss';
  const TEST_TABLE = '5';

  beforeEach(() => {
    // Intercept API calls
    cy.intercept('GET', `/api/tenants/${TEST_TENANT}`, {
      fixture: 'swiss-tenant.json'
    }).as('getTenant');

    cy.intercept('GET', `/api/tenants/${TEST_TENANT}/products`, {
      fixture: 'swiss-products.json'
    }).as('getProducts');

    cy.intercept('POST', `/api/tenants/${TEST_TENANT}/orders`, {
      fixture: 'order-response.json'
    }).as('createOrder');

    // Mock Stripe
    cy.window().then((win) => {
      win.Stripe = () => ({
        elements: () => ({
          create: () => ({
            mount: () => {},
            on: () => {},
            focus: () => {}
          })
        }),
        confirmPayment: cy.stub().resolves({
          paymentIntent: { status: 'succeeded' }
        })
      });
    });

    // Mock Twint
    cy.window().then((win) => {
      win.Twint = {
        init: cy.stub(),
        startPayment: cy.stub().resolves({ status: 'success' })
      };
    });
  });

  describe('QR Code Scan & Table Assignment', () => {
    it('should scan QR code and assign table', () => {
      // Visit QR code URL
      cy.visit(`${SWISS_FOODTRUCK_URL}/scan?tenant=${TEST_TENANT}&table=${TEST_TABLE}`);

      // Should show loading state
      cy.get('[data-testid="loading-spinner"]').should('be.visible');

      // Wait for tenant data to load
      cy.wait('@getTenant');

      // Should display tenant information
      cy.contains('Zürcher Genuss').should('be.visible');
      cy.contains(`Tisch ${TEST_TABLE}`).should('be.visible');

      // Should show welcome message in German
      cy.contains('Willkommen bei Zürcher Genuss').should('be.visible');
      cy.contains('Scannen Sie den QR-Code an Ihrem Tisch').should('be.visible');

      // Should have continue to menu button
      cy.get('[data-testid="continue-to-menu"]')
        .should('be.visible')
        .should('contain', 'Zur Speisekarte');
    });

    it('should handle invalid QR codes gracefully', () => {
      cy.visit(`${SWISS_FOODTRUCK_URL}/scan?tenant=invalid&table=999`);

      cy.contains('Foodtruck nicht gefunden').should('be.visible');
      cy.get('[data-testid="error-message"]')
        .should('contain', 'Der QR-Code ist ungültig oder abgelaufen');

      // Should show retry button
      cy.get('[data-testid="retry-button"]').should('be.visible');
    });

    it('should store table information in session', () => {
      cy.visit(`${SWISS_FOODTRUCK_URL}/scan?tenant=${TEST_TENANT}&table=${TEST_TABLE}`);
      cy.wait('@getTenant');

      // Check localStorage/sessionStorage
      cy.window().its('localStorage').invoke('getItem', 'eatech_table_id')
        .should('equal', TEST_TABLE);

      cy.window().its('localStorage').invoke('getItem', 'eatech_tenant_id')
        .should('equal', TEST_TENANT);
    });
  });

  describe('Menu Browsing', () => {
    beforeEach(() => {
      // Setup table context
      cy.window().then((win) => {
        win.localStorage.setItem('eatech_table_id', TEST_TABLE);
        win.localStorage.setItem('eatech_tenant_id', TEST_TENANT);
      });

      cy.visit(`${SWISS_FOODTRUCK_URL}/menu`);
      cy.wait('@getProducts');
    });

    it('should display Swiss menu with categories', () => {
      // Should show header with table info
      cy.contains(`Tisch ${TEST_TABLE}`).should('be.visible');

      // Should display menu categories
      cy.get('[data-testid="menu-categories"]').should('be.visible');
      cy.contains('Hauptgerichte').should('be.visible');
      cy.contains('Getränke').should('be.visible');
      cy.contains('Desserts').should('be.visible');

      // Should show products with Swiss formatting
      cy.contains('Zürcher Geschnetzeltes').should('be.visible');
      cy.contains('CHF 24.90').should('be.visible');

      // Should display allergen information
      cy.get('[data-testid="allergen-info"]').should('be.visible');
    });

    it('should filter products by category', () => {
      // Click on main dishes category
      cy.get('[data-testid="category-mains"]').click();

      // Should filter products
      cy.contains('Zürcher Geschnetzeltes').should('be.visible');
      cy.contains('Rösti mit Speck').should('be.visible');

      // Beverages should be hidden
      cy.contains('Rivella').should('not.exist');
    });

    it('should search products in German', () => {
      // Type in search box
      cy.get('[data-testid="product-search"]')
        .type('Rösti');

      // Should show filtered results
      cy.contains('Rösti mit Speck').should('be.visible');
      cy.contains('Zürcher Geschnetzeltes').should('not.exist');

      // Clear search
      cy.get('[data-testid="clear-search"]').click();
      cy.contains('Zürcher Geschnetzeltes').should('be.visible');
    });

    it('should apply dietary filters', () => {
      // Open filter panel
      cy.get('[data-testid="filter-button"]').click();

      // Select vegetarian filter
      cy.get('[data-testid="filter-vegetarian"]').check();

      // Should show only vegetarian products
      cy.get('[data-testid="dietary-badge-vegetarian"]').should('be.visible');

      // Apply multiple filters
      cy.get('[data-testid="filter-glutenfree"]').check();

      // Should show products matching all filters
      cy.get('[data-testid="product-count"]')
        .should('contain', 'Produkte gefunden');
    });

    it('should sort products by price', () => {
      // Open sort dropdown
      cy.get('[data-testid="sort-dropdown"]').select('Preis (aufsteigend)');

      // Verify sorting
      cy.get('[data-testid="product-card"]')
        .first()
        .should('contain', 'CHF')
        .invoke('text')
        .then((firstPrice) => {
          cy.get('[data-testid="product-card"]')
            .last()
            .should('contain', 'CHF')
            .invoke('text')
            .then((lastPrice) => {
              // Extract prices and compare
              const first = parseFloat(firstPrice.match(/CHF ([\d.]+)/)?.[1] || '0');
              const last = parseFloat(lastPrice.match(/CHF ([\d.]+)/)?.[1] || '0');
              expect(first).to.be.lte(last);
            });
        });
    });
  });

  describe('Adding Items to Cart', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('eatech_table_id', TEST_TABLE);
        win.localStorage.setItem('eatech_tenant_id', TEST_TENANT);
      });

      cy.visit(`${SWISS_FOODTRUCK_URL}/menu`);
      cy.wait('@getProducts');
    });

    it('should add product to cart with default options', () => {
      // Click on first product
      cy.get('[data-testid="product-card"]').first().click();

      // Should open product modal
      cy.get('[data-testid="product-modal"]').should('be.visible');
      cy.contains('Zürcher Geschnetzeltes').should('be.visible');

      // Should show modifiers
      cy.get('[data-testid="modifier-group"]').should('be.visible');
      cy.contains('Beilage wählen').should('be.visible');

      // Add to cart with default options
      cy.get('[data-testid="add-to-cart"]').click();

      // Should show cart badge
      cy.get('[data-testid="cart-badge"]')
        .should('be.visible')
        .should('contain', '1');

      // Should show item total
      cy.get('[data-testid="cart-total"]')
        .should('contain', 'CHF 24.90');
    });

    it('should customize product with modifiers', () => {
      cy.get('[data-testid="product-card"]').first().click();

      // Select variant
      cy.get('[data-testid="variant-selector"]')
        .select('Gross (450g)');

      // Select modifiers
      cy.get('[data-testid="modifier-roesti"]').check();
      cy.get('[data-testid="modifier-extra-sauce"]').check();

      // Update quantity
      cy.get('[data-testid="quantity-input"]')
        .clear()
        .type('2');

      // Check price calculation
      // Base: 29.90 (large) + 4.50 (rösti) + 2.00 (sauce) = 36.40 * 2 = 72.80
      cy.get('[data-testid="item-total"]')
        .should('contain', 'CHF 72.80');

      // Add special instructions
      cy.get('[data-testid="special-notes"]')
        .type('Ohne Zwiebeln bitte');

      cy.get('[data-testid="add-to-cart"]').click();

      // Verify in cart
      cy.get('[data-testid="cart-badge"]').should('contain', '2');
      cy.get('[data-testid="cart-total"]').should('contain', 'CHF 72.80');
    });

    it('should add multiple different products', () => {
      // Add first product
      cy.get('[data-testid="product-zuercher-geschnetzeltes"]')
        .find('[data-testid="quick-add"]')
        .click();

      // Add second product
      cy.get('[data-testid="product-rivella"]')
        .find('[data-testid="quick-add"]')
        .click();

      // Verify cart has 2 different items
      cy.get('[data-testid="cart-badge"]').should('contain', '2');

      // Check total calculation
      cy.get('[data-testid="cart-total"]')
        .should('contain', 'CHF 28.40'); // 24.90 + 3.50
    });

    it('should handle out of stock products', () => {
      // Mock out of stock product
      cy.intercept('GET', `/api/tenants/${TEST_TENANT}/products`, {
        fixture: 'products-out-of-stock.json'
      }).as('getOutOfStockProducts');

      cy.reload();
      cy.wait('@getOutOfStockProducts');

      // Should show unavailable state
      cy.get('[data-testid="product-unavailable"]')
        .should('be.visible')
        .should('contain', 'Nicht verfügbar');

      // Add to cart button should be disabled
      cy.get('[data-testid="add-to-cart"]').should('be.disabled');
    });
  });

  describe('Cart Management', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('eatech_table_id', TEST_TABLE);
        win.localStorage.setItem('eatech_tenant_id', TEST_TENANT);

        // Pre-populate cart
        const cart = {
          items: [
            {
              id: 'cart_1',
              productId: 'prod_geschnetzeltes',
              productName: 'Zürcher Geschnetzeltes',
              quantity: 1,
              unitPrice: 24.90,
              totalPrice: 24.90
            },
            {
              id: 'cart_2',
              productId: 'prod_rivella',
              productName: 'Rivella',
              quantity: 2,
              unitPrice: 3.50,
              totalPrice: 7.00
            }
          ],
          total: 31.90
        };
        win.localStorage.setItem(`eatech_cart_${TEST_TENANT}`, JSON.stringify(cart));
      });

      cy.visit(`${SWISS_FOODTRUCK_URL}/menu`);
      cy.wait('@getProducts');
    });

    it('should view cart contents', () => {
      // Open cart
      cy.get('[data-testid="cart-button"]').click();

      // Should show cart modal/page
      cy.get('[data-testid="cart-modal"]').should('be.visible');

      // Should display items
      cy.contains('Zürcher Geschnetzeltes').should('be.visible');
      cy.contains('1x CHF 24.90').should('be.visible');
      cy.contains('Rivella').should('be.visible');
      cy.contains('2x CHF 3.50').should('be.visible');

      // Should show total
      cy.get('[data-testid="cart-subtotal"]')
        .should('contain', 'CHF 31.90');
    });

    it('should update item quantities in cart', () => {
      cy.get('[data-testid="cart-button"]').click();

      // Increase quantity
      cy.get('[data-testid="cart-item-rivella"]')
        .find('[data-testid="increase-quantity"]')
        .click();

      // Should update quantity and total
      cy.get('[data-testid="quantity-display"]').should('contain', '3');
      cy.get('[data-testid="item-total"]').should('contain', 'CHF 10.50');
      cy.get('[data-testid="cart-subtotal"]').should('contain', 'CHF 35.40');

      // Decrease quantity
      cy.get('[data-testid="decrease-quantity"]').click();

      cy.get('[data-testid="quantity-display"]').should('contain', '2');
      cy.get('[data-testid="cart-subtotal"]').should('contain', 'CHF 31.90');
    });

    it('should remove items from cart', () => {
      cy.get('[data-testid="cart-button"]').click();

      // Remove item
      cy.get('[data-testid="cart-item-rivella"]')
        .find('[data-testid="remove-item"]')
        .click();

      // Confirm removal
      cy.get('[data-testid="confirm-remove"]').click();

      // Should remove item and update total
      cy.contains('Rivella').should('not.exist');
      cy.get('[data-testid="cart-subtotal"]').should('contain', 'CHF 24.90');
      cy.get('[data-testid="cart-badge"]').should('contain', '1');
    });

    it('should clear entire cart', () => {
      cy.get('[data-testid="cart-button"]').click();

      // Clear cart
      cy.get('[data-testid="clear-cart"]').click();
      cy.get('[data-testid="confirm-clear"]').click();

      // Should empty cart
      cy.get('[data-testid="empty-cart-message"]')
        .should('be.visible')
        .should('contain', 'Ihr Warenkorb ist leer');

      cy.get('[data-testid="cart-badge"]').should('not.exist');
    });

    it('should persist cart across page reloads', () => {
      // Verify cart is populated
      cy.get('[data-testid="cart-badge"]').should('contain', '3'); // 1 + 2

      // Reload page
      cy.reload();
      cy.wait('@getProducts');

      // Cart should persist
      cy.get('[data-testid="cart-badge"]').should('contain', '3');
      cy.get('[data-testid="cart-total"]').should('contain', 'CHF 31.90');
    });
  });

  describe('Checkout Process', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('eatech_table_id', TEST_TABLE);
        win.localStorage.setItem('eatech_tenant_id', TEST_TENANT);

        // Pre-populate cart
        const cart = {
          items: [
            {
              id: 'cart_1',
              productId: 'prod_geschnetzeltes',
              productName: 'Zürcher Geschnetzeltes',
              quantity: 1,
              unitPrice: 24.90,
              totalPrice: 24.90,
              modifiers: [
                { name: 'Rösti', price: 4.50 }
              ]
            }
          ],
          subtotal: 29.40,
          taxAmount: 2.27,
          total: 29.40
        };
        win.localStorage.setItem(`eatech_cart_${TEST_TENANT}`, JSON.stringify(cart));
      });

      cy.visit(`${SWISS_FOODTRUCK_URL}/checkout`);
    });

    it('should display order summary with Swiss formatting', () => {
      // Should show order summary
      cy.get('[data-testid="order-summary"]').should('be.visible');

      // Should display items
      cy.contains('Zürcher Geschnetzeltes').should('be.visible');
      cy.contains('+ Rösti (CHF 4.50)').should('be.visible');

      // Should show Swiss tax information
      cy.contains('Zwischensumme: CHF 29.40').should('be.visible');
      cy.contains('inkl. 7.7% MwSt.: CHF 2.27').should('be.visible');
      cy.contains('Gesamt: CHF 29.40').should('be.visible');

      // Should show pickup information
      cy.contains(`Abholung am Tisch ${TEST_TABLE}`).should('be.visible');
    });

    it('should collect customer information', () => {
      // Fill customer form
      cy.get('[data-testid="customer-firstname"]')
        .type('Hans');

      cy.get('[data-testid="customer-lastname"]')
        .type('Müller');

      cy.get('[data-testid="customer-phone"]')
        .type('079 123 45 67');

      cy.get('[data-testid="customer-email"]')
        .type('hans.mueller@example.ch');

      // Validate Swiss phone number format
      cy.get('[data-testid="phone-validation"]')
        .should('not.contain', 'ungültig');

      // Validate email
      cy.get('[data-testid="email-validation"]')
        .should('not.contain', 'ungültig');
    });

    it('should validate required fields', () => {
      // Try to proceed without filling required fields
      cy.get('[data-testid="continue-to-payment"]').click();

      // Should show validation errors
      cy.get('[data-testid="firstname-error"]')
        .should('contain', 'Vorname ist erforderlich');

      cy.get('[data-testid="phone-error"]')
        .should('contain', 'Telefonnummer ist erforderlich');
    });

    it('should validate Swiss phone number formats', () => {
      // Test various Swiss phone formats
      const validFormats = [
        '+41 79 123 45 67',
        '079 123 45 67',
        '+41791234567',
        '0041 79 123 45 67'
      ];

      validFormats.forEach((format) => {
        cy.get('[data-testid="customer-phone"]')
          .clear()
          .type(format);

        cy.get('[data-testid="customer-firstname"]').click(); // Trigger validation

        cy.get('[data-testid="phone-error"]').should('not.exist');
      });

      // Test invalid format
      cy.get('[data-testid="customer-phone"]')
        .clear()
        .type('123456');

      cy.get('[data-testid="customer-firstname"]').click();

      cy.get('[data-testid="phone-error"]')
        .should('contain', 'gültige Schweizer Telefonnummer');
    });
  });

  describe('Payment Processing', () => {
    beforeEach(() => {
      // Setup checkout state
      cy.window().then((win) => {
        win.localStorage.setItem('eatech_table_id', TEST_TABLE);
        win.localStorage.setItem('eatech_tenant_id', TEST_TENANT);

        const cart = {
          items: [{
            id: 'cart_1',
            productName: 'Test Product',
            quantity: 1,
            totalPrice: 25.00
          }],
          total: 25.00
        };
        win.localStorage.setItem(`eatech_cart_${TEST_TENANT}`, JSON.stringify(cart));
      });

      cy.visit(`${SWISS_FOODTRUCK_URL}/checkout`);

      // Fill customer information
      cy.get('[data-testid="customer-firstname"]').type('Hans');
      cy.get('[data-testid="customer-lastname"]').type('Müller');
      cy.get('[data-testid="customer-phone"]').type('079 123 45 67');
      cy.get('[data-testid="customer-email"]').type('hans@example.ch');

      cy.get('[data-testid="continue-to-payment"]').click();
    });

    it('should display Swiss payment methods', () => {
      // Should show payment options
      cy.get('[data-testid="payment-methods"]').should('be.visible');

      // Swiss payment methods
      cy.get('[data-testid="payment-card"]').should('be.visible');
      cy.get('[data-testid="payment-twint"]').should('be.visible');
      cy.get('[data-testid="payment-postfinance"]').should('be.visible');
      cy.get('[data-testid="payment-cash"]').should('be.visible');

      // Should show descriptions
      cy.contains('Kreditkarte').should('be.visible');
      cy.contains('Twint').should('be.visible');
      cy.contains('PostFinance').should('be.visible');
      cy.contains('Barzahlung bei Abholung').should('be.visible');
    });

    it('should process card payment', () => {
      // Select card payment
      cy.get('[data-testid="payment-card"]').click();

      // Should show Stripe card element
      cy.get('[data-testid="stripe-card-element"]')
        .should('be.visible');

      // Accept terms and conditions
      cy.get('[data-testid="accept-terms"]').check();

      // Place order
      cy.get('[data-testid="place-order"]').click();

      // Should process payment
      cy.wait('@createOrder');

      // Should redirect to confirmation
      cy.url().should('include', '/confirmation');
      cy.contains('Bestellung bestätigt').should('be.visible');
    });

    it('should process Twint payment', () => {
      // Select Twint payment
      cy.get('[data-testid="payment-twint"]').click();

      // Should show Twint QR code
      cy.get('[data-testid="twint-qr-code"]')
        .should('be.visible');

      cy.get('[data-testid="accept-terms"]').check();
      cy.get('[data-testid="place-order"]').click();

      // Should show payment pending state
      cy.contains('Warten auf Twint Zahlung').should('be.visible');

      // Mock successful payment
      cy.window().then((win) => {
        win.Twint.startPayment.resolves({ status: 'success' });
      });

      // Should complete order
      cy.wait('@createOrder');
      cy.url().should('include', '/confirmation');
    });

    it('should handle cash payment', () => {
      // Select cash payment
      cy.get('[data-testid="payment-cash"]').click();

      // Should show cash payment instructions
      cy.contains('Bezahlung bei Abholung').should('be.visible');
      cy.contains('Passend zahlen wird geschätzt').should('be.visible');

      // Enter cash amount
      cy.get('[data-testid="cash-amount"]').type('30');

      // Should calculate change
      cy.get('[data-testid="change-amount"]')
        .should('contain', 'Rückgeld: CHF 5.00');

      cy.get('[data-testid="accept-terms"]').check();
      cy.get('[data-testid="place-order"]').click();

      cy.wait('@createOrder');
      cy.url().should('include', '/confirmation');
    });

    it('should apply discount codes', () => {
      // Enter discount code
      cy.get('[data-testid="discount-code"]').type('SUMMER10');
      cy.get('[data-testid="apply-discount"]').click();

      // Should apply discount
      cy.contains('SUMMER10 (-10%)').should('be.visible');
      cy.get('[data-testid="discount-amount"]')
        .should('contain', '- CHF 2.50');

      cy.get('[data-testid="final-total"]')
        .should('contain', 'CHF 22.50');
    });

    it('should handle payment errors', () => {
      // Mock payment failure
      cy.window().then((win) => {
        win.Stripe = () => ({
          elements: () => ({
            create: () => ({
              mount: () => {},
              on: () => {}
            })
          }),
          confirmPayment: cy.stub().rejects(new Error('Payment failed'))
        });
      });

      cy.get('[data-testid="payment-card"]').click();
      cy.get('[data-testid="accept-terms"]').check();
      cy.get('[data-testid="place-order"]').click();

      // Should show error message
      cy.get('[data-testid="payment-error"]')
        .should('be.visible')
        .should('contain', 'Zahlung fehlgeschlagen');

      // Should allow retry
      cy.get('[data-testid="retry-payment"]').should('be.visible');
    });
  });

  describe('Order Confirmation', () => {
    beforeEach(() => {
      // Mock successful order creation
      cy.intercept('POST', `/api/tenants/${TEST_TENANT}/orders`, {
        statusCode: 200,
        body: {
          id: 'order_123',
          orderNumber: 'ZG-2025-0001',
          status: 'confirmed',
          estimatedReadyTime: '2025-01-07T13:15:00Z',
          total: 29.40,
          customer: {
            name: 'Hans Müller',
            phone: '+41791234567'
          }
        }
      }).as('createOrder');

      cy.visit(`${SWISS_FOODTRUCK_URL}/confirmation/order_123`);
    });

    it('should display order confirmation details', () => {
      // Should show confirmation message
      cy.contains('Bestellung bestätigt').should('be.visible');
      cy.contains('ZG-2025-0001').should('be.visible');

      // Should show estimated time
      cy.contains('Geschätzte Zubereitungszeit').should('be.visible');
      cy.contains('15 Minuten').should('be.visible');

      // Should show pickup instructions
      cy.contains(`Abholung am Tisch ${TEST_TABLE}`).should('be.visible');
      cy.contains('Sie erhalten eine SMS wenn Ihre Bestellung bereit ist')
        .should('be.visible');
    });

    it('should show order tracking link', () => {
      // Should have tracking link
      cy.get('[data-testid="track-order"]')
        .should('be.visible')
        .should('have.attr', 'href')
        .and('include', '/orders/ZG-2025-0001');
    });

    it('should allow starting new order', () => {
      // Should have new order button
      cy.get('[data-testid="new-order"]')
        .should('be.visible')
        .click();

      // Should redirect to menu and clear cart
      cy.url().should('include', '/menu');
      cy.get('[data-testid="cart-badge"]').should('not.exist');
    });
  });

  describe('Order Tracking', () => {
    beforeEach(() => {
      cy.intercept('GET', '/api/orders/ZG-2025-0001', {
        fixture: 'order-tracking.json'
      }).as('getOrderStatus');

      cy.visit(`${SWISS_FOODTRUCK_URL}/orders/ZG-2025-0001`);
    });

    it('should display real-time order status', () => {
      cy.wait('@getOrderStatus');

      // Should show order details
      cy.contains('ZG-2025-0001').should('be.visible');
      cy.contains('Hans Müller').should('be.visible');

      // Should show status timeline
      cy.get('[data-testid="status-timeline"]').should('be.visible');
      cy.contains('Bestätigt').should('be.visible');
      cy.contains('In Zubereitung').should('be.visible');
      cy.contains('Bereit zur Abholung').should('not.exist');

      // Should show estimated time
      cy.contains('Noch ca. 8 Minuten').should('be.visible');
    });

    it('should update status in real-time', () => {
      cy.wait('@getOrderStatus');

      // Mock status update via WebSocket/SSE
      cy.window().then((win) => {
        const event = new CustomEvent('orderUpdate', {
          detail: {
            orderNumber: 'ZG-2025-0001',
            status: 'ready',
            message: 'Ihre Bestellung ist bereit zur Abholung!'
          }
        });
        win.dispatchEvent(event);
      });

      // Should update UI
      cy.contains('Bereit zur Abholung').should('be.visible');
      cy.contains('Ihre Bestellung ist bereit!').should('be.visible');

      // Should show notification
      cy.get('[data-testid="notification"]')
        .should('be.visible')
        .should('contain', 'Bestellung bereit');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      cy.visit(`${SWISS_FOODTRUCK_URL}/scan?tenant=${TEST_TENANT}&table=${TEST_TABLE}`);
      cy.wait('@getTenant');
    });

    it('should be navigable with keyboard only', () => {
      // Tab through interface
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-testid', 'continue-to-menu');

      cy.focused().tab();
      // Continue tabbing through interactive elements...
    });

    it('should have proper heading structure', () => {
      cy.visit(`${SWISS_FOODTRUCK_URL}/menu`);
      cy.wait('@getProducts');

      // Should have h1
      cy.get('h1').should('contain', 'Speisekarte');

      // Should have proper heading hierarchy
      cy.get('h2').should('exist');
    });

    it('should work with screen reader', () => {
      // Check for proper ARIA labels
      cy.get('[aria-label]').should('exist');
      cy.get('[role="button"]').should('exist');
      cy.get('[role="main"]').should('exist');
    });

    it('should have sufficient color contrast', () => {
      // Install axe-core for accessibility testing
      cy.injectAxe();
      cy.checkA11y();
    });
  });

  describe('Performance', () => {
    it('should load menu within 3 seconds', () => {
      const start = Date.now();

      cy.visit(`${SWISS_FOODTRUCK_URL}/menu`);
      cy.wait('@getProducts');

      cy.get('[data-testid="menu-categories"]').should('be.visible')
        .then(() => {
          const loadTime = Date.now() - start;
          expect(loadTime).to.be.lessThan(3000);
        });
    });

    it('should work offline', () => {
      // Visit page first to cache
      cy.visit(`${SWISS_FOODTRUCK_URL}/menu`);
      cy.wait('@getProducts');

      // Go offline
      cy.window().then((win) => {
        win.navigator.serviceWorker.ready.then((registration) => {
          registration.active?.postMessage({ type: 'OFFLINE_MODE' });
        });
      });

      // Should still work
      cy.reload();
      cy.contains('Offline-Modus').should('be.visible');
      cy.get('[data-testid="menu-categories"]').should('be.visible');
    });
  });
});
