import { test, expect } from '@playwright/test';
import { format } from 'date-fns';

test.describe('Payment Flow - Complete Payment Scenarios', () => {
  const testOrder = {
    truckId: 'test-truck-001',
    items: [
      { productId: 'burger-001', name: 'Classic Burger', price: 15.90, quantity: 2 },
      { productId: 'fries-001', name: 'Pommes Frites', price: 6.50, quantity: 1 },
      { productId: 'cola-001', name: 'Cola', price: 4.50, quantity: 2 }
    ]
  };

  const testCustomer = {
    name: 'Anna Meier',
    phone: '+41791234567',
    email: 'anna.meier@example.ch'
  };

  test.beforeEach(async ({ page }) => {
    // Start with items in cart
    await page.goto('/truck/test-truck-001');
    
    // Add items programmatically to save time
    await page.evaluate((order) => {
      window.testHelpers.addItemsToCart(order.items);
    }, testOrder);

    // Go to checkout
    await page.click('[data-testid="cart-button"]');
    await page.click('[data-testid="checkout-button"]');
  });

  test('TWINT payment flow (primary in Switzerland)', async ({ page }) => {
    // Fill customer details
    await page.fill('[data-testid="customer-name"]', testCustomer.name);
    await page.fill('[data-testid="customer-phone"]', testCustomer.phone);

    // Verify order summary
    const orderSummary = page.locator('[data-testid="order-summary"]');
    await expect(orderSummary).toBeVisible();
    
    // Calculate expected totals
    const subtotal = (15.90 * 2) + 6.50 + (4.50 * 2); // 47.30
    const vat = subtotal * 0.025; // 2.5% for takeaway
    const total = subtotal + vat; // 48.48

    await expect(orderSummary.locator('[data-testid="subtotal"]')).toContainText('CHF 47.30');
    await expect(orderSummary.locator('[data-testid="vat-amount"]')).toContainText('CHF 1.18');
    await expect(orderSummary.locator('[data-testid="total-amount"]')).toContainText('CHF 48.48');

    // Select TWINT
    await page.click('[data-testid="payment-method-twint"]');
    await expect(page.locator('[data-testid="twint-section"]')).toBeVisible();

    // Proceed to payment
    await page.click('[data-testid="proceed-to-payment"]');

    // TWINT QR Code should appear
    const twintQR = page.locator('[data-testid="twint-qr-code"]');
    await expect(twintQR).toBeVisible();
    await expect(page.locator('[data-testid="twint-instructions"]')).toContainText('QR-Code mit TWINT App scannen');

    // Check QR code validity
    const qrCodeSrc = await twintQR.getAttribute('src');
    expect(qrCodeSrc).toMatch(/^data:image\/png;base64,/);

    // Simulate successful TWINT payment (webhook simulation)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('twint-payment-success', {
        detail: {
          paymentIntentId: 'pi_twint_123456',
          amount: 4848, // in Rappen
          currency: 'CHF'
        }
      }));
    });

    // Payment success
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-number"]')).toContainText(/\d{3,}/);
    
    // Platform fee calculation (3% after trial)
    const platformFee = page.locator('[data-testid="platform-fee-info"]');
    if (await platformFee.isVisible()) {
      await expect(platformFee).toContainText('Servicegebühr: CHF 1.45'); // 3% of 48.48
    }
  });

  test('Credit card payment with 3D Secure', async ({ page }) => {
    // Fill customer details
    await page.fill('[data-testid="customer-name"]', testCustomer.name);
    await page.fill('[data-testid="customer-phone"]', testCustomer.phone);
    await page.fill('[data-testid="customer-email"]', testCustomer.email);

    // Select credit card
    await page.click('[data-testid="payment-method-card"]');
    await expect(page.locator('[data-testid="stripe-card-element"]')).toBeVisible();

    // Fill card details in Stripe iframe
    const stripeFrame = page.frameLocator('iframe[title="Secure card payment input frame"]');
    await stripeFrame.locator('[placeholder="Card number"]').fill('4000 0027 6000 3184'); // 3DS required card
    await stripeFrame.locator('[placeholder="MM / YY"]').fill('12/25');
    await stripeFrame.locator('[placeholder="CVC"]').fill('123');
    await stripeFrame.locator('[placeholder="ZIP"]').fill('3011'); // Bern ZIP

    // Proceed to payment
    await page.click('[data-testid="proceed-to-payment"]');

    // 3D Secure challenge should appear
    await expect(page.locator('[data-testid="3ds-modal"]')).toBeVisible();
    
    // Complete 3D Secure (in test mode)
    const threeDSFrame = page.frameLocator('iframe[name="__privateStripeFrame"]');
    await threeDSFrame.locator('[data-testid="3ds-complete"]').click();

    // Payment processing
    await expect(page.locator('[data-testid="payment-processing"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-processing"]')).toContainText('Zahlung wird verarbeitet');

    // Payment success
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 10000 });
  });

  test('Add tip during payment', async ({ page }) => {
    // Fill customer details
    await page.fill('[data-testid="customer-name"]', testCustomer.name);
    await page.fill('[data-testid="customer-phone"]', testCustomer.phone);

    // Original total
    const originalTotal = await page.locator('[data-testid="total-amount"]').textContent();
    expect(originalTotal).toContain('CHF 48.48');

    // Add tip options
    const tipSection = page.locator('[data-testid="tip-section"]');
    await expect(tipSection).toBeVisible();
    await expect(tipSection).toContainText('Trinkgeld hinzufügen?');

    // Click 15% tip
    await page.click('[data-testid="tip-15-percent"]');
    
    // Calculate expected tip
    const tipAmount = 48.48 * 0.15; // 7.27
    const tipPlatformFee = tipAmount * 0.03; // 0.22 (3% of tip)
    
    // Verify tip is added
    await expect(page.locator('[data-testid="tip-amount"]')).toContainText('CHF 7.27');
    await expect(page.locator('[data-testid="new-total"]')).toContainText('CHF 55.75');

    // Check transparency message
    await expect(page.locator('[data-testid="tip-transparency"]')).toContainText('97% geht an den Food Truck (CHF 7.05)');
    await expect(page.locator('[data-testid="tip-transparency"]')).toContainText('3% Servicegebühr (CHF 0.22)');

    // Custom tip amount
    await page.click('[data-testid="custom-tip-button"]');
    await page.fill('[data-testid="custom-tip-input"]', '5.00');
    await page.click('[data-testid="apply-custom-tip"]');

    await expect(page.locator('[data-testid="tip-amount"]')).toContainText('CHF 5.00');
    await expect(page.locator('[data-testid="new-total"]')).toContainText('CHF 53.48');

    // Remove tip
    await page.click('[data-testid="remove-tip-button"]');
    await expect(page.locator('[data-testid="total-amount"]')).toContainText('CHF 48.48');
  });

  test('Payment during trial period (0% fee)', async ({ page }) => {
    // Simulate trial period
    await page.evaluate(() => {
      window.testHelpers.setTrialPeriod(true);
    });

    // Fill customer details
    await page.fill('[data-testid="customer-name"]', testCustomer.name);
    await page.fill('[data-testid="customer-phone"]', testCustomer.phone);

    // Check for trial badge
    await expect(page.locator('[data-testid="trial-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="trial-badge"]')).toContainText('Gratis-Testphase');

    // Platform fee should be 0%
    await expect(page.locator('[data-testid="platform-fee-notice"]')).toContainText('0% Gebühr während Testphase');

    // Complete payment with TWINT
    await page.click('[data-testid="payment-method-twint"]');
    await page.click('[data-testid="proceed-to-payment"]');

    // Simulate payment success
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('twint-payment-success', {
        detail: { paymentIntentId: 'pi_trial_123456' }
      }));
    });

    // Verify no platform fee was charged
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="platform-fee-charged"]')).toContainText('CHF 0.00');
  });

  test('Payment with QR invoice', async ({ page }) => {
    // Fill customer details
    await page.fill('[data-testid="customer-name"]', testCustomer.name);
    await page.fill('[data-testid="customer-phone"]', testCustomer.phone);
    await page.fill('[data-testid="customer-email"]', testCustomer.email);

    // Select QR invoice
    await page.click('[data-testid="payment-method-qr-invoice"]');
    
    // Additional company details required
    await expect(page.locator('[data-testid="company-details-section"]')).toBeVisible();
    await page.fill('[data-testid="company-name"]', 'Meier AG');
    await page.fill('[data-testid="company-address"]', 'Hauptstrasse 1');
    await page.fill('[data-testid="company-zip"]', '3011');
    await page.fill('[data-testid="company-city"]', 'Bern');

    // Proceed
    await page.click('[data-testid="proceed-to-payment"]');

    // QR invoice should be generated
    await expect(page.locator('[data-testid="qr-invoice-generated"]')).toBeVisible();
    await expect(page.locator('[data-testid="qr-invoice-image"]')).toBeVisible();
    
    // Download invoice
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-qr-invoice"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/QR-Rechnung_\d+\.pdf/);

    // Order should be marked as pending payment
    await expect(page.locator('[data-testid="order-status"]')).toContainText('Zahlung ausstehend');
    await expect(page.locator('[data-testid="payment-instructions"]')).toContainText('Bitte bezahlen Sie die QR-Rechnung');
  });

  test('Failed payment handling', async ({ page }) => {
    // Fill customer details
    await page.fill('[data-testid="customer-name"]', testCustomer.name);
    await page.fill('[data-testid="customer-phone"]', testCustomer.phone);

    // Select credit card
    await page.click('[data-testid="payment-method-card"]');

    // Use card that will be declined
    const stripeFrame = page.frameLocator('iframe[title="Secure card payment input frame"]');
    await stripeFrame.locator('[placeholder="Card number"]').fill('4000 0000 0000 0002'); // Always declined
    await stripeFrame.locator('[placeholder="MM / YY"]').fill('12/25');
    await stripeFrame.locator('[placeholder="CVC"]').fill('123');

    // Try to pay
    await page.click('[data-testid="proceed-to-payment"]');

    // Error message should appear
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-error"]')).toContainText('Zahlung abgelehnt');

    // Retry with different card
    await page.click('[data-testid="try-again-button"]');
    
    // Clear and enter new card
    await stripeFrame.locator('[placeholder="Card number"]').clear();
    await stripeFrame.locator('[placeholder="Card number"]').fill('4242 4242 4242 4242'); // Valid card
    
    await page.click('[data-testid="proceed-to-payment"]');
    
    // Should succeed now
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 10000 });
  });

  test('Refund process', async ({ page }) => {
    // First complete a payment
    await page.fill('[data-testid="customer-name"]', testCustomer.name);
    await page.fill('[data-testid="customer-phone"]', testCustomer.phone);
    
    await page.click('[data-testid="payment-method-twint"]');
    await page.click('[data-testid="proceed-to-payment"]');
    
    // Simulate payment success
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('twint-payment-success', {
        detail: { 
          paymentIntentId: 'pi_refund_test_123',
          orderId: 'order_123'
        }
      }));
    });
    
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
    
    // Navigate to order details
    await page.click('[data-testid="view-order-details"]');
    
    // Request refund
    await page.click('[data-testid="request-refund-button"]');
    
    const refundModal = page.locator('[data-testid="refund-modal"]');
    await expect(refundModal).toBeVisible();
    
    // Select refund reason
    await page.selectOption('[data-testid="refund-reason"]', 'order_cancelled');
    await page.fill('[data-testid="refund-notes"]', 'Kunde hat Bestellung storniert');
    
    // Partial refund option
    await page.click('[data-testid="partial-refund-checkbox"]');
    await page.fill('[data-testid="refund-amount"]', '20.00');
    
    // Confirm refund
    await page.click('[data-testid="confirm-refund-button"]');
    
    // Admin approval required
    await expect(page.locator('[data-testid="refund-pending"]')).toBeVisible();
    await expect(page.locator('[data-testid="refund-pending"]')).toContainText('Rückerstattung wird bearbeitet');
    
    // Simulate admin approval
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('refund-approved', {
        detail: { refundId: 're_123', amount: 2000 }
      }));
    });
    
    // Refund completed
    await expect(page.locator('[data-testid="refund-completed"]')).toBeVisible();
    await expect(page.locator('[data-testid="refund-amount-returned"]')).toContainText('CHF 20.00 zurückerstattet');
  });

  test('Stripe Connect onboarding for new truck', async ({ page }) => {
    // Login as new truck owner
    await page.goto('/admin/onboarding');
    
    // Stripe Connect setup required
    await expect(page.locator('[data-testid="stripe-connect-required"]')).toBeVisible();
    await expect(page.locator('[data-testid="stripe-connect-required"]')).toContainText('Zahlungen empfangen');
    
    // Start Stripe Connect
    await page.click('[data-testid="setup-payments-button"]');
    
    // Should redirect to Stripe Connect onboarding
    await expect(page).toHaveURL(/connect\.stripe\.com/);
    
    // Simulate completion (return URL)
    await page.goto('/admin/onboarding/complete?account=acct_123');
    
    // Verify account connected
    await expect(page.locator('[data-testid="payment-setup-complete"]')).toBeVisible();
    await expect(page.locator('[data-testid="stripe-account-id"]')).toContainText('acct_123');
    
    // Can now receive payments
    await expect(page.locator('[data-testid="ready-to-receive-payments"]')).toBeVisible();
  });

  test('Multiple payment methods in one session', async ({ page }) => {
    // Fill customer details
    await page.fill('[data-testid="customer-name"]', testCustomer.name);
    await page.fill('[data-testid="customer-phone"]', testCustomer.phone);
    
    // Start with TWINT
    await page.click('[data-testid="payment-method-twint"]');
    await page.click('[data-testid="proceed-to-payment"]');
    
    // Cancel TWINT payment
    await page.click('[data-testid="cancel-payment"]');
    
    // Switch to card
    await page.click('[data-testid="payment-method-card"]');
    
    const stripeFrame = page.frameLocator('iframe[title="Secure card payment input frame"]');
    await stripeFrame.locator('[placeholder="Card number"]').fill('4242 4242 4242 4242');
    await stripeFrame.locator('[placeholder="MM / YY"]').fill('12/25');
    await stripeFrame.locator('[placeholder="CVC"]').fill('123');
    
    // Cancel again
    await page.click('[data-testid="cancel-payment"]');
    
    // Finally use TWINT
    await page.click('[data-testid="payment-method-twint"]');
    await page.click('[data-testid="proceed-to-payment"]');
    
    // Complete payment
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('twint-payment-success', {
        detail: { paymentIntentId: 'pi_final_123' }
      }));
    });
    
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
  });

  test('VAT calculation for different order types', async ({ page }) => {
    // Default is takeaway (2.5% VAT)
    await expect(page.locator('[data-testid="vat-rate"]')).toContainText('2.5%');
    await expect(page.locator('[data-testid="vat-amount"]')).toContainText('CHF 1.18');
    
    // Change to dine-in (if location supports it)
    const dineInOption = page.locator('[data-testid="order-type-dine-in"]');
    if (await dineInOption.isVisible()) {
      await dineInOption.click();
      
      // VAT should change to 7.7%
      await expect(page.locator('[data-testid="vat-rate"]')).toContainText('7.7%');
      const newVatAmount = 47.30 * 0.077; // 3.64
      await expect(page.locator('[data-testid="vat-amount"]')).toContainText('CHF 3.64');
      await expect(page.locator('[data-testid="total-amount"]')).toContainText('CHF 50.94');
    }
  });
});
