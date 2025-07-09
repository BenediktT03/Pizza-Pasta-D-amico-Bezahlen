import { test, expect } from '@playwright/test';

test.describe('Voice Ordering - Multi-language Voice Commerce', () => {
  const voiceTestCases = {
    germanStandard: {
      input: "Ich hätte gerne zwei Cheeseburger und einmal große Pommes",
      expected: {
        items: [
          { product: 'Cheeseburger', quantity: 2 },
          { product: 'Pommes Frites', quantity: 1, size: 'Gross' }
        ]
      }
    },
    swissGerman: {
      input: "Ich hätt gern zwöi Chäsburger und einisch grossi Pommes",
      expected: {
        items: [
          { product: 'Cheeseburger', quantity: 2 },
          { product: 'Pommes Frites', quantity: 1, size: 'Gross' }
        ]
      }
    },
    french: {
      input: "Je voudrais deux cheeseburgers et une grande frite",
      expected: {
        items: [
          { product: 'Cheeseburger', quantity: 2 },
          { product: 'Pommes Frites', quantity: 1, size: 'Grand' }
        ]
      }
    },
    italian: {
      input: "Vorrei due cheeseburger e una porzione grande di patatine",
      expected: {
        items: [
          { product: 'Cheeseburger', quantity: 2 },
          { product: 'Pommes Frites', quantity: 1, size: 'Grande' }
        ]
      }
    },
    english: {
      input: "I'd like two cheeseburgers and one large fries please",
      expected: {
        items: [
          { product: 'Cheeseburger', quantity: 2 },
          { product: 'Pommes Frites', quantity: 1, size: 'Large' }
        ]
      }
    }
  };

  test.beforeEach(async ({ page, context }) => {
    // Grant microphone permission
    await context.grantPermissions(['microphone']);
    
    // Navigate to truck page
    await page.goto('/truck/test-food-truck');
    
    // Check if voice ordering is available
    await expect(page.locator('[data-testid="voice-order-button"]')).toBeVisible();
  });

  test('Voice order in standard German', async ({ page }) => {
    // Select German
    await page.click('[data-testid="language-de"]');
    
    // Start voice order
    await page.click('[data-testid="voice-order-button"]');
    
    // Voice interface should open
    const voiceModal = page.locator('[data-testid="voice-order-modal"]');
    await expect(voiceModal).toBeVisible();
    await expect(voiceModal).toContainText('Sprechen Sie Ihre Bestellung');
    
    // Check for microphone access
    await expect(voiceModal.locator('[data-testid="mic-status"]')).toContainText('Bereit');
    
    // Start recording
    await page.click('[data-testid="start-recording-button"]');
    await expect(voiceModal.locator('[data-testid="recording-indicator"]')).toBeVisible();
    await expect(voiceModal).toContainText('Ich höre zu...');
    
    // Simulate voice input
    await page.evaluate((testCase) => {
      window.mockVoiceTranscription = testCase.input;
    }, voiceTestCases.germanStandard);
    
    // Stop recording
    await page.click('[data-testid="stop-recording-button"]');
    
    // Processing animation
    await expect(voiceModal.locator('[data-testid="processing-animation"]')).toBeVisible();
    await expect(voiceModal).toContainText('Verstehe Ihre Bestellung...');
    
    // Order preview
    await expect(voiceModal.locator('[data-testid="order-preview"]')).toBeVisible({ timeout: 5000 });
    await expect(voiceModal).toContainText('Ist das richtig?');
    
    // Verify interpreted items
    const orderPreview = voiceModal.locator('[data-testid="interpreted-items"]');
    await expect(orderPreview).toContainText('2x Cheeseburger');
    await expect(orderPreview).toContainText('1x Pommes Frites (Gross)');
    
    // Show confidence score
    await expect(voiceModal.locator('[data-testid="confidence-score"]')).toBeVisible();
    const confidence = await voiceModal.locator('[data-testid="confidence-score"]').textContent();
    expect(parseFloat(confidence?.replace('%', '') || '0')).toBeGreaterThan(80);
    
    // Confirm order
    await page.click('[data-testid="confirm-voice-order"]');
    
    // Items should be added to cart
    await expect(page.locator('[data-testid="cart-badge"]')).toContainText('2');
    
    // Success feedback
    await expect(page.locator('[data-testid="voice-success-toast"]')).toContainText('Bestellung hinzugefügt');
  });

  test('Voice order in Swiss German', async ({ page }) => {
    // Select German (Swiss German uses same language code)
    await page.click('[data-testid="language-de"]');
    
    // Enable Swiss German dialect
    await page.click('[data-testid="voice-settings-button"]');
    await page.click('[data-testid="dialect-swiss-german"]');
    await page.click('[data-testid="save-voice-settings"]');
    
    // Start voice order
    await page.click('[data-testid="voice-order-button"]');
    
    const voiceModal = page.locator('[data-testid="voice-order-modal"]');
    
    // Swiss German specific UI
    await expect(voiceModal).toContainText('Säged Sie Ihri Bstellig');
    
    // Start recording
    await page.click('[data-testid="start-recording-button"]');
    
    // Simulate Swiss German input
    await page.evaluate((testCase) => {
      window.mockVoiceTranscription = testCase.input;
    }, voiceTestCases.swissGerman);
    
    await page.click('[data-testid="stop-recording-button"]');
    
    // Should correctly interpret Swiss German
    await expect(voiceModal.locator('[data-testid="interpreted-items"]')).toContainText('2x Cheeseburger');
    
    // Show dialect indicator
    await expect(voiceModal.locator('[data-testid="dialect-indicator"]')).toContainText('Schweizerdeutsch erkannt');
    
    await page.click('[data-testid="confirm-voice-order"]');
  });

  test('Voice order with modifications', async ({ page }) => {
    await page.click('[data-testid="language-de"]');
    await page.click('[data-testid="voice-order-button"]');
    
    const voiceModal = page.locator('[data-testid="voice-order-modal"]');
    
    // Complex order with modifications
    await page.click('[data-testid="start-recording-button"]');
    await page.evaluate(() => {
      window.mockVoiceTranscription = "Einen Burger ohne Zwiebeln mit extra Käse, und eine kleine Cola ohne Eis";
    });
    await page.click('[data-testid="stop-recording-button"]');
    
    // Check interpreted modifications
    const orderPreview = voiceModal.locator('[data-testid="interpreted-items"]');
    await expect(orderPreview).toBeVisible();
    
    const burgerItem = orderPreview.locator('[data-testid="item-0"]');
    await expect(burgerItem).toContainText('1x Burger');
    await expect(burgerItem.locator('[data-testid="modifications"]')).toContainText('ohne Zwiebeln');
    await expect(burgerItem.locator('[data-testid="modifications"]')).toContainText('extra Käse');
    
    const colaItem = orderPreview.locator('[data-testid="item-1"]');
    await expect(colaItem).toContainText('1x Cola (Klein)');
    await expect(colaItem.locator('[data-testid="modifications"]')).toContainText('ohne Eis');
    
    await page.click('[data-testid="confirm-voice-order"]');
  });

  test('Voice order correction', async ({ page }) => {
    await page.click('[data-testid="language-de"]');
    await page.click('[data-testid="voice-order-button"]');
    
    const voiceModal = page.locator('[data-testid="voice-order-modal"]');
    
    // First order
    await page.click('[data-testid="start-recording-button"]');
    await page.evaluate(() => {
      window.mockVoiceTranscription = "Zwei Burger bitte";
    });
    await page.click('[data-testid="stop-recording-button"]');
    
    await expect(voiceModal.locator('[data-testid="interpreted-items"]')).toContainText('2x Burger');
    
    // Correct the order
    await page.click('[data-testid="add-more-items-voice"]');
    
    await page.click('[data-testid="start-recording-button"]');
    await page.evaluate(() => {
      window.mockVoiceTranscription = "Entschuldigung, nicht zwei sondern drei Burger";
    });
    await page.click('[data-testid="stop-recording-button"]');
    
    // Should recognize correction intent
    await expect(voiceModal.locator('[data-testid="correction-detected"]')).toBeVisible();
    await expect(voiceModal.locator('[data-testid="correction-detected"]')).toContainText('Korrektur erkannt');
    
    // Updated order
    await expect(voiceModal.locator('[data-testid="interpreted-items"]')).toContainText('3x Burger');
    
    await page.click('[data-testid="confirm-voice-order"]');
  });

  test('Voice chat for questions', async ({ page }) => {
    await page.click('[data-testid="language-de"]');
    
    // Open voice chat instead of order
    await page.click('[data-testid="voice-chat-button"]');
    
    const chatModal = page.locator('[data-testid="voice-chat-modal"]');
    await expect(chatModal).toBeVisible();
    await expect(chatModal).toContainText('Fragen Sie mich etwas');
    
    // Ask about allergens
    await page.click('[data-testid="start-recording-button"]');
    await page.evaluate(() => {
      window.mockVoiceTranscription = "Welche Burger sind glutenfrei?";
    });
    await page.click('[data-testid="stop-recording-button"]');
    
    // AI response
    await expect(chatModal.locator('[data-testid="ai-response"]')).toBeVisible({ timeout: 5000 });
    await expect(chatModal.locator('[data-testid="ai-response"]')).toContainText(/glutenfrei|Gluten/);
    
    // Voice response should play
    await expect(chatModal.locator('[data-testid="voice-playing-indicator"]')).toBeVisible();
    
    // Ask about nutrition
    await page.click('[data-testid="ask-another-question"]');
    await page.click('[data-testid="start-recording-button"]');
    await page.evaluate(() => {
      window.mockVoiceTranscription = "Wie viele Kalorien hat der Cheeseburger?";
    });
    await page.click('[data-testid="stop-recording-button"]');
    
    await expect(chatModal.locator('[data-testid="ai-response"]')).toContainText(/Kalorien|kcal/);
  });

  test('Voice order in multiple languages', async ({ page }) => {
    const languages = ['fr', 'it', 'en'];
    const testCases = [voiceTestCases.french, voiceTestCases.italian, voiceTestCases.english];
    
    for (let i = 0; i < languages.length; i++) {
      // Clear previous orders
      await page.reload();
      
      // Select language
      await page.click(`[data-testid="language-${languages[i]}"]`);
      
      // Start voice order
      await page.click('[data-testid="voice-order-button"]');
      
      const voiceModal = page.locator('[data-testid="voice-order-modal"]');
      
      // Record order
      await page.click('[data-testid="start-recording-button"]');
      await page.evaluate((testCase) => {
        window.mockVoiceTranscription = testCase.input;
      }, testCases[i]);
      await page.click('[data-testid="stop-recording-button"]');
      
      // Verify interpretation
      await expect(voiceModal.locator('[data-testid="interpreted-items"]')).toContainText('2x Cheeseburger');
      await expect(voiceModal.locator('[data-testid="interpreted-items"]')).toContainText('Pommes Frites');
      
      // Language should be detected
      await expect(voiceModal.locator('[data-testid="detected-language"]')).toContainText(languages[i].toUpperCase());
      
      await page.click('[data-testid="confirm-voice-order"]');
    }
  });

  test('Voice feedback after order completion', async ({ page }) => {
    // Complete an order first
    await page.click('[data-testid="language-de"]');
    await page.click('[data-testid="product-burger"]');
    await page.click('[data-testid="add-to-cart"]');
    await page.click('[data-testid="cart-button"]');
    await page.click('[data-testid="checkout-button"]');
    
    // Quick checkout
    await page.fill('[data-testid="customer-name"]', 'Test User');
    await page.fill('[data-testid="customer-phone"]', '+41791234567');
    await page.click('[data-testid="payment-method-twint"]');
    await page.click('[data-testid="proceed-to-payment"]');
    
    // Simulate payment success
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('twint-payment-success'));
    });
    
    // Order complete - wait a bit
    await page.waitForTimeout(2000);
    
    // Voice feedback prompt should appear
    const feedbackPrompt = page.locator('[data-testid="voice-feedback-prompt"]');
    await expect(feedbackPrompt).toBeVisible();
    await expect(feedbackPrompt).toContainText('Wie war Ihr Essen?');
    
    // Give voice feedback
    await page.click('[data-testid="give-voice-feedback"]');
    
    const feedbackModal = page.locator('[data-testid="voice-feedback-modal"]');
    await expect(feedbackModal).toBeVisible();
    
    await page.click('[data-testid="start-recording-button"]');
    await page.evaluate(() => {
      window.mockVoiceTranscription = "Der Burger war ausgezeichnet, sehr saftig und die Pommes waren knusprig!";
    });
    await page.click('[data-testid="stop-recording-button"]');
    
    // Sentiment analysis
    await expect(feedbackModal.locator('[data-testid="sentiment-indicator"]')).toBeVisible();
    await expect(feedbackModal.locator('[data-testid="sentiment-indicator"]')).toHaveAttribute('data-sentiment', 'positive');
    
    // Submit feedback
    await page.click('[data-testid="submit-feedback"]');
    
    await expect(page.locator('[data-testid="feedback-thanks"]')).toContainText('Vielen Dank für Ihr Feedback!');
  });

  test('Voice accessibility features', async ({ page }) => {
    await page.click('[data-testid="language-de"]');
    
    // Open accessibility settings
    await page.click('[data-testid="accessibility-button"]');
    const accessibilityModal = page.locator('[data-testid="accessibility-modal"]');
    await expect(accessibilityModal).toBeVisible();
    
    // Voice settings
    await page.click('[data-testid="tab-voice-settings"]');
    
    // Adjust voice speed
    const speedSlider = accessibilityModal.locator('[data-testid="voice-speed-slider"]');
    await speedSlider.fill('0.8'); // Slower speed
    
    // Select voice
    await page.selectOption('[data-testid="voice-selection"]', 'female-swiss-german');
    
    // High contrast mode for voice interface
    await page.click('[data-testid="high-contrast-voice"]');
    
    // Save settings
    await page.click('[data-testid="save-accessibility-settings"]');
    
    // Test with new settings
    await page.click('[data-testid="voice-order-button"]');
    const voiceModal = page.locator('[data-testid="voice-order-modal"]');
    
    // Should have high contrast theme
    await expect(voiceModal).toHaveClass(/high-contrast/);
    
    // Test voice playback
    await page.click('[data-testid="test-voice-settings"]');
    await expect(voiceModal.locator('[data-testid="voice-test-playing"]')).toBeVisible();
  });

  test('Voice order error handling', async ({ page }) => {
    await page.click('[data-testid="language-de"]');
    await page.click('[data-testid="voice-order-button"]');
    
    const voiceModal = page.locator('[data-testid="voice-order-modal"]');
    
    // Test 1: No speech detected
    await page.click('[data-testid="start-recording-button"]');
    await page.evaluate(() => {
      window.mockVoiceTranscription = ""; // Empty transcription
    });
    await page.click('[data-testid="stop-recording-button"]');
    
    await expect(voiceModal.locator('[data-testid="no-speech-error"]')).toBeVisible();
    await expect(voiceModal.locator('[data-testid="no-speech-error"]')).toContainText('Keine Sprache erkannt');
    
    // Test 2: Unclear order
    await page.click('[data-testid="try-again-button"]');
    await page.click('[data-testid="start-recording-button"]');
    await page.evaluate(() => {
      window.mockVoiceTranscription = "Ähm, ich will irgendwas mit... ähm... keine Ahnung";
    });
    await page.click('[data-testid="stop-recording-button"]');
    
    await expect(voiceModal.locator('[data-testid="unclear-order-error"]')).toBeVisible();
    await expect(voiceModal.locator('[data-testid="unclear-order-error"]')).toContainText('Bestellung nicht verstanden');
    
    // Offer help
    await expect(voiceModal.locator('[data-testid="voice-help-suggestions"]')).toBeVisible();
    await expect(voiceModal.locator('[data-testid="example-phrase-1"]')).toContainText('Ich hätte gerne einen Burger');
    
    // Test 3: Network error
    await page.click('[data-testid="try-again-button"]');
    
    // Simulate offline
    await page.context().setOffline(true);
    
    await page.click('[data-testid="start-recording-button"]');
    await page.evaluate(() => {
      window.mockVoiceTranscription = "Einen Burger bitte";
    });
    await page.click('[data-testid="stop-recording-button"]');
    
    await expect(voiceModal.locator('[data-testid="network-error"]')).toBeVisible();
    await expect(voiceModal.locator('[data-testid="network-error"]')).toContainText('Keine Internetverbindung');
    
    // Restore connection
    await page.context().setOffline(false);
  });

  test('Voice order with background noise simulation', async ({ page }) => {
    await page.click('[data-testid="language-de"]');
    await page.click('[data-testid="voice-order-button"]');
    
    const voiceModal = page.locator('[data-testid="voice-order-modal"]');
    
    // Enable noise cancellation
    await page.click('[data-testid="voice-settings-icon"]');
    await page.click('[data-testid="noise-cancellation-toggle"]');
    await page.click('[data-testid="close-settings"]');
    
    // Simulate noisy environment
    await page.evaluate(() => {
      window.mockAudioEnvironment = 'noisy';
    });
    
    await page.click('[data-testid="start-recording-button"]');
    
    // Should show noise indicator
    await expect(voiceModal.locator('[data-testid="noise-level-indicator"]')).toBeVisible();
    await expect(voiceModal.locator('[data-testid="noise-level-indicator"]')).toHaveAttribute('data-level', 'high');
    
    // Still process order
    await page.evaluate(() => {
      window.mockVoiceTranscription = "Zwei Burger und eine Cola";
    });
    await page.click('[data-testid="stop-recording-button"]');
    
    // Should process but show lower confidence
    await expect(voiceModal.locator('[data-testid="confidence-score"]')).toBeVisible();
    const confidence = await voiceModal.locator('[data-testid="confidence-score"]').textContent();
    expect(parseFloat(confidence?.replace('%', '') || '0')).toBeLessThan(80);
    
    // Suggest confirmation
    await expect(voiceModal.locator('[data-testid="low-confidence-warning"]')).toBeVisible();
    await expect(voiceModal.locator('[data-testid="low-confidence-warning"]')).toContainText('Bitte überprüfen Sie Ihre Bestellung');
  });
});
