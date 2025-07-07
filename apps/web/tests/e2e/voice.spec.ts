/**
 * File: /apps/web/tests/e2e/voice.spec.ts
 * EATECH V3.0 - Voice Commerce E2E Tests
 * Swiss multilingual voice ordering (DE/FR/IT/EN + Schweizerdeutsch)
 */

describe('Voice Commerce E2E', () => {
  const MENU_URL = 'http://localhost:3000/menu';
  const TEST_TENANT = 'zuercher-genuss';
  const TEST_TABLE = '5';

  // Mock speech recognition results for different languages
  const VOICE_COMMANDS = {
    // Standard German
    'ich möchte einen burger': {
      intent: 'add_item',
      product: 'Classic Burger',
      quantity: 1,
      confidence: 0.95
    },
    'füge zwei pommes hinzu': {
      intent: 'add_item',
      product: 'Pommes Frites',
      quantity: 2,
      confidence: 0.88
    },
    'zeige mir den warenkorb': {
      intent: 'view_cart',
      confidence: 0.92
    },
    'was kostet das menü': {
      intent: 'get_price',
      product: 'Menü',
      confidence: 0.85
    },
    'bestelle das gleiche nochmal': {
      intent: 'repeat_order',
      confidence: 0.90
    },

    // Swiss German (Schweizerdeutsch)
    'ich hätt gärn en burger': {
      intent: 'add_item',
      product: 'Classic Burger',
      quantity: 1,
      confidence: 0.82
    },
    'chönd si mir zwei pommes gäh': {
      intent: 'add_item',
      product: 'Pommes Frites',
      quantity: 2,
      confidence: 0.79
    },
    'wa choschtets': {
      intent: 'get_price',
      confidence: 0.75
    },
    'törf ich ha es rösti': {
      intent: 'add_item',
      product: 'Rösti',
      quantity: 1,
      confidence: 0.81
    },

    // French Swiss
    'je voudrais un burger': {
      intent: 'add_item',
      product: 'Classic Burger',
      quantity: 1,
      confidence: 0.90
    },
    'ajoutez deux frites': {
      intent: 'add_item',
      product: 'Pommes Frites',
      quantity: 2,
      confidence: 0.87
    },
    'combien ça coûte': {
      intent: 'get_price',
      confidence: 0.87
    },

    // Italian Swiss
    'vorrei un burger': {
      intent: 'add_item',
      product: 'Classic Burger',
      quantity: 1,
      confidence: 0.89
    },
    'quanto costa': {
      intent: 'get_price',
      confidence: 0.86
    }
  };

  beforeEach(() => {
    // Mock Web Speech API
    cy.window().then((win) => {
      // Mock SpeechRecognition
      const mockRecognition = {
        start: cy.stub().as('speechStart'),
        stop: cy.stub().as('speechStop'),
        abort: cy.stub().as('speechAbort'),
        addEventListener: cy.stub(),
        removeEventListener: cy.stub(),
        continuous: true,
        interimResults: true,
        lang: 'de-CH',
        onstart: null,
        onend: null,
        onresult: null,
        onerror: null,
        onaudiostart: null,
        onaudioend: null,
        onspeechstart: null,
        onspeechend: null,
        onnomatch: null
      };

      win.SpeechRecognition = function() { return mockRecognition; };
      win.webkitSpeechRecognition = function() { return mockRecognition; };

      // Mock SpeechSynthesis for voice feedback
      win.speechSynthesis = {
        speak: cy.stub().as('speechSpeak'),
        cancel: cy.stub().as('speechCancel'),
        pause: cy.stub().as('speechPause'),
        resume: cy.stub().as('speechResume'),
        getVoices: () => [
          { name: 'Steffi', lang: 'de-CH', default: true },
          { name: 'Celine', lang: 'fr-CH', default: false },
          { name: 'Paolo', lang: 'it-CH', default: false }
        ],
        speaking: false,
        pending: false,
        paused: false
      };

      // Store recognition instance globally for testing
      win.__mockRecognition = mockRecognition;
    });

    // Mock microphone permission
    cy.window().then((win) => {
      Object.defineProperty(win.navigator, 'mediaDevices', {
        value: {
          getUserMedia: cy.stub().resolves({
            getTracks: () => [{ stop: cy.stub() }]
          })
        }
      });
    });

    // Setup tenant and table context
    cy.window().then((win) => {
      win.localStorage.setItem('eatech_tenant_id', TEST_TENANT);
      win.localStorage.setItem('eatech_table_id', TEST_TABLE);
    });

    // Mock product and cart APIs
    cy.intercept('GET', `/api/tenants/${TEST_TENANT}/products`, {
      fixture: 'swiss-products-voice.json'
    }).as('getProducts');

    cy.intercept('POST', `/api/tenants/${TEST_TENANT}/cart/add`, {
      statusCode: 200,
      body: { success: true, itemId: 'cart_voice_123' }
    }).as('addToCart');

    cy.intercept('GET', `/api/tenants/${TEST_TENANT}/cart`, {
      fixture: 'cart-voice.json'
    }).as('getCart');

    // Mock voice command processing API
    cy.intercept('POST', '/api/voice/process', (req) => {
      const command = req.body.transcript.toLowerCase();
      const result = VOICE_COMMANDS[command] || {
        intent: 'unknown',
        confidence: 0.30
      };

      req.reply({
        statusCode: 200,
        body: result
      });
    }).as('processVoiceCommand');

    cy.visit(MENU_URL);
    cy.wait('@getProducts');
  });

  describe('Voice Button and Initialization', () => {
    it('should display voice button when speech recognition is supported', () => {
      // Should show voice button
      cy.get('[data-testid="voice-button"]')
        .should('be.visible')
        .should('contain.text', 'Spracheingabe');

      // Should show microphone icon
      cy.get('[data-testid="microphone-icon"]').should('be.visible');

      // Should show current language indicator
      cy.get('[data-testid="voice-language"]')
        .should('contain', 'DE');
    });

    it('should hide voice button when speech recognition is not supported', () => {
      cy.window().then((win) => {
        // Remove speech recognition support
        delete win.SpeechRecognition;
        delete win.webkitSpeechRecognition;
      });

      cy.reload();
      cy.wait('@getProducts');

      // Voice button should not be visible
      cy.get('[data-testid="voice-button"]').should('not.exist');
    });

    it('should request microphone permission on first use', () => {
      cy.get('[data-testid="voice-button"]').click();

      // Should request microphone permission
      cy.window().its('navigator.mediaDevices.getUserMedia')
        .should('have.been.calledWith', { audio: true });

      // Should show listening state
      cy.get('[data-testid="voice-button"]')
        .should('have.class', 'listening');

      cy.get('@speechStart').should('have.been.called');
    });

    it('should handle microphone permission denied', () => {
      // Mock permission denied
      cy.window().then((win) => {
        win.navigator.mediaDevices.getUserMedia.rejects(
          new DOMException('Permission denied', 'NotAllowedError')
        );
      });

      cy.get('[data-testid="voice-button"]').click();

      // Should show permission error
      cy.get('[data-testid="voice-error"]')
        .should('be.visible')
        .should('contain', 'Mikrofon-Zugriff verweigert');

      // Should show instructions to enable permission
      cy.get('[data-testid="permission-instructions"]')
        .should('contain', 'Bitte erlauben Sie den Mikrofon-Zugriff');
    });
  });

  describe('Language Selection and Switching', () => {
    beforeEach(() => {
      cy.get('[data-testid="voice-button"]').click();
    });

    it('should display supported Swiss languages', () => {
      // Open language selector
      cy.get('[data-testid="voice-language-selector"]').click();

      // Should show Swiss language options
      cy.get('[data-testid="language-de-ch"]')
        .should('be.visible')
        .should('contain', 'Deutsch (Schweiz)');

      cy.get('[data-testid="language-gsw-ch"]')
        .should('be.visible')
        .should('contain', 'Schweizerdeutsch');

      cy.get('[data-testid="language-fr-ch"]')
        .should('be.visible')
        .should('contain', 'Français (Suisse)');

      cy.get('[data-testid="language-it-ch"]')
        .should('be.visible')
        .should('contain', 'Italiano (Svizzera)');

      cy.get('[data-testid="language-en-us"]')
        .should('be.visible')
        .should('contain', 'English');
    });

    it('should switch to French and update interface', () => {
      cy.get('[data-testid="voice-language-selector"]').click();
      cy.get('[data-testid="language-fr-ch"]').click();

      // Should update language indicator
      cy.get('[data-testid="voice-language"]')
        .should('contain', 'FR');

      // Should update recognition language
      cy.window().then((win) => {
        expect(win.__mockRecognition.lang).to.equal('fr-CH');
      });

      // Should show French instructions
      cy.get('[data-testid="voice-instructions"]')
        .should('contain', 'Dites votre commande');
    });

    it('should switch to Schweizerdeutsch dialect', () => {
      cy.get('[data-testid="voice-language-selector"]').click();
      cy.get('[data-testid="language-gsw-ch"]').click();

      cy.get('[data-testid="voice-language"]')
        .should('contain', 'GSW');

      // Should show Schweizerdeutsch examples
      cy.get('[data-testid="voice-examples"]')
        .should('contain', 'Ich hätt gärn...')
        .should('contain', 'Chönd si mir...');
    });

    it('should persist language selection across sessions', () => {
      cy.get('[data-testid="voice-language-selector"]').click();
      cy.get('[data-testid="language-fr-ch"]').click();

      // Reload page
      cy.reload();
      cy.wait('@getProducts');

      // Language should be remembered
      cy.get('[data-testid="voice-button"]').click();
      cy.get('[data-testid="voice-language"]')
        .should('contain', 'FR');
    });
  });

  describe('Voice Command Recognition', () => {
    beforeEach(() => {
      cy.get('[data-testid="voice-button"]').click();
    });

    it('should process German voice commands', () => {
      // Simulate speech recognition result
      cy.window().then((win) => {
        const mockEvent = {
          results: [{
            0: {
              transcript: 'ich möchte einen burger',
              confidence: 0.95
            },
            isFinal: true,
            length: 1
          }],
          resultIndex: 0
        };

        win.__mockRecognition.onresult(mockEvent);
      });

      cy.wait('@processVoiceCommand');

      // Should show transcript
      cy.get('[data-testid="voice-transcript"]')
        .should('contain', 'ich möchte einen burger');

      // Should show confidence score
      cy.get('[data-testid="voice-confidence"]')
        .should('contain', '95%');

      // Should add item to cart
      cy.wait('@addToCart');

      // Should show confirmation
      cy.get('[data-testid="voice-confirmation"]')
        .should('contain', 'Classic Burger wurde hinzugefügt');
    });

    it('should process Schweizerdeutsch commands', () => {
      // Switch to Schweizerdeutsch
      cy.get('[data-testid="voice-language-selector"]').click();
      cy.get('[data-testid="language-gsw-ch"]').click();

      cy.window().then((win) => {
        const mockEvent = {
          results: [{
            0: {
              transcript: 'ich hätt gärn en burger',
              confidence: 0.82
            },
            isFinal: true,
            length: 1
          }],
          resultIndex: 0
        };

        win.__mockRecognition.onresult(mockEvent);
      });

      cy.wait('@processVoiceCommand');

      // Should understand Schweizerdeutsch
      cy.get('[data-testid="voice-transcript"]')
        .should('contain', 'ich hätt gärn en burger');

      cy.get('[data-testid="voice-confirmation"]')
        .should('contain', 'Classic Burger isch hinzuegfüegt wordä');
    });

    it('should handle quantity specifications', () => {
      cy.window().then((win) => {
        const mockEvent = {
          results: [{
            0: {
              transcript: 'füge zwei pommes hinzu',
              confidence: 0.88
            },
            isFinal: true,
            length: 1
          }],
          resultIndex: 0
        };

        win.__mockRecognition.onresult(mockEvent);
      });

      cy.wait('@processVoiceCommand');

      // Should add correct quantity
      cy.wait('@addToCart').then((interception) => {
        expect(interception.request.body).to.deep.include({
          product: 'Pommes Frites',
          quantity: 2
        });
      });
    });

    it('should handle navigation commands', () => {
      cy.window().then((win) => {
        const mockEvent = {
          results: [{
            0: {
              transcript: 'zeige mir den warenkorb',
              confidence: 0.92
            },
            isFinal: true,
            length: 1
          }],
          resultIndex: 0
        };

        win.__mockRecognition.onresult(mockEvent);
      });

      cy.wait('@processVoiceCommand');

      // Should open cart
      cy.get('[data-testid="cart-modal"]')
        .should('be.visible');
    });

    it('should handle price inquiries', () => {
      cy.window().then((win) => {
        const mockEvent = {
          results: [{
            0: {
              transcript: 'was kostet das menü',
              confidence: 0.85
            },
            isFinal: true,
            length: 1
          }],
          resultIndex: 0
        };

        win.__mockRecognition.onresult(mockEvent);
      });

      cy.wait('@processVoiceCommand');

      // Should provide voice response with price
      cy.get('@speechSpeak').should('have.been.calledWith',
        sinon.match({ text: sinon.match(/CHF.*\d+/) })
      );
    });
  });

  describe('Voice Feedback and Responses', () => {
    beforeEach(() => {
      cy.get('[data-testid="voice-button"]').click();
    });

    it('should provide voice confirmation in selected language', () => {
      // Add item via voice
      cy.window().then((win) => {
        const mockEvent = {
          results: [{
            0: { transcript: 'ich möchte einen burger', confidence: 0.95 },
            isFinal: true,
            length: 1
          }],
          resultIndex: 0
        };
        win.__mockRecognition.onresult(mockEvent);
      });

      cy.wait('@processVoiceCommand');
      cy.wait('@addToCart');

      // Should speak confirmation in German
      cy.get('@speechSpeak').should('have.been.calledWith',
        sinon.match({
          text: 'Classic Burger wurde hinzugefügt',
          lang: 'de-CH'
        })
      );
    });

    it('should provide French voice feedback when French is selected', () => {
      // Switch to French
      cy.get('[data-testid="voice-language-selector"]').click();
      cy.get('[data-testid="language-fr-ch"]').click();

      cy.window().then((win) => {
        const mockEvent = {
          results: [{
            0: { transcript: 'je voudrais un burger', confidence: 0.90 },
            isFinal: true,
            length: 1
          }],
          resultIndex: 0
        };
        win.__mockRecognition.onresult(mockEvent);
      });

      cy.wait('@processVoiceCommand');
      cy.wait('@addToCart');

      // Should speak in French
      cy.get('@speechSpeak').should('have.been.calledWith',
        sinon.match({
          text: sinon.match(/Classic Burger.*ajouté/),
          lang: 'fr-CH'
        })
      );
    });

    it('should handle voice feedback for errors', () => {
      cy.window().then((win) => {
        const mockEvent = {
          results: [{
            0: { transcript: 'completely unknown command', confidence: 0.30 },
            isFinal: true,
            length: 1
          }],
          resultIndex: 0
        };
        win.__mockRecognition.onresult(mockEvent);
      });

      cy.wait('@processVoiceCommand');

      // Should speak error message
      cy.get('@speechSpeak').should('have.been.calledWith',
        sinon.match({
          text: sinon.match(/nicht verstanden|unknown/)
        })
      );

      // Should show visual error feedback
      cy.get('[data-testid="voice-error"]')
        .should('be.visible')
        .should('contain', 'Befehl nicht erkannt');
    });

    it('should allow disabling voice feedback', () => {
      // Disable voice feedback
      cy.get('[data-testid="voice-settings"]').click();
      cy.get('[data-testid="disable-voice-feedback"]').uncheck();
      cy.get('[data-testid="save-voice-settings"]').click();

      // Add item via voice
      cy.window().then((win) => {
        const mockEvent = {
          results: [{
            0: { transcript: 'ich möchte einen burger', confidence: 0.95 },
            isFinal: true,
            length: 1
          }],
          resultIndex: 0
        };
        win.__mockRecognition.onresult(mockEvent);
      });

      cy.wait('@processVoiceCommand');
      cy.wait('@addToCart');

      // Should not speak confirmation
      cy.get('@speechSpeak').should('not.have.been.called');

      // Should only show visual confirmation
      cy.get('[data-testid="voice-confirmation"]')
        .should('be.visible');
    });
  });

  describe('Wake Word Detection', () => {
    it('should activate on "Hey EATECH" wake word', () => {
      // Enable wake word detection
      cy.get('[data-testid="voice-settings"]').click();
      cy.get('[data-testid="enable-wake-word"]').check();
      cy.get('[data-testid="save-voice-settings"]').click();

      // Should show wake word indicator
      cy.get('[data-testid="wake-word-status"]')
        .should('be.visible')
        .should('contain', 'Hey EATECH');

      // Simulate wake word detection
      cy.window().then((win) => {
        const wakeWordEvent = new CustomEvent('wakeword', {
          detail: {
            phrase: 'Hey EATECH',
            confidence: 0.95
          }
        });
        win.dispatchEvent(wakeWordEvent);
      });

      // Should start listening automatically
      cy.get('[data-testid="voice-button"]')
        .should('have.class', 'listening');

      cy.get('@speechStart').should('have.been.called');
    });

    it('should ignore low confidence wake words', () => {
      cy.get('[data-testid="voice-settings"]').click();
      cy.get('[data-testid="enable-wake-word"]').check();
      cy.get('[data-testid="save-voice-settings"]').click();

      // Simulate low confidence wake word
      cy.window().then((win) => {
        const wakeWordEvent = new CustomEvent('wakeword', {
          detail: {
            phrase: 'Hey EATECH',
            confidence: 0.60 // Below threshold
          }
        });
        win.dispatchEvent(wakeWordEvent);
      });

      // Should not start listening
      cy.get('[data-testid="voice-button"]')
        .should('not.have.class', 'listening');

      cy.get('@speechStart').should('not.have.been.called');
    });

    it('should work with different wake word languages', () => {
      cy.get('[data-testid="voice-settings"]').click();
      cy.get('[data-testid="enable-wake-word"]').check();

      // Set French wake word
      cy.get('[data-testid="wake-word-language"]').select('fr-CH');
      cy.get('[data-testid="save-voice-settings"]').click();

      // Should show French wake word
      cy.get('[data-testid="wake-word-status"]')
        .should('contain', 'Salut EATECH');

      // Simulate French wake word
      cy.window().then((win) => {
        const wakeWordEvent = new CustomEvent('wakeword', {
          detail: {
            phrase: 'Salut EATECH',
            confidence: 0.92
          }
        });
        win.dispatchEvent(wakeWordEvent);
      });

      cy.get('[data-testid="voice-button"]')
        .should('have.class', 'listening');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(() => {
      cy.get('[data-testid="voice-button"]').click();
    });

    it('should handle low confidence speech recognition', () => {
      cy.window().then((win) => {
        const mockEvent = {
          results: [{
            0: { transcript: 'mumble unclear speech', confidence: 0.25 },
            isFinal: true,
            length: 1
          }],
          resultIndex: 0
        };
        win.__mockRecognition.onresult(mockEvent);
      });

      // Should show low confidence warning
      cy.get('[data-testid="voice-low-confidence"]')
        .should('be.visible')
        .should('contain', 'Nicht verstanden');

      // Should suggest retry
      cy.get('[data-testid="voice-retry-suggestion"]')
        .should('contain', 'Bitte wiederholen Sie');
    });

    it('should handle network errors during voice processing', () => {
      // Mock API error
      cy.intercept('POST', '/api/voice/process', {
        statusCode: 500,
        body: { error: 'Voice processing service unavailable' }
      });

      cy.window().then((win) => {
        const mockEvent = {
          results: [{
            0: { transcript: 'ich möchte einen burger', confidence: 0.95 },
            isFinal: true,
            length: 1
          }],
          resultIndex: 0
        };
        win.__mockRecognition.onresult(mockEvent);
      });

      // Should show error message
      cy.get('[data-testid="voice-error"]')
        .should('contain', 'Sprachverarbeitung nicht verfügbar');

      // Should offer manual ordering
      cy.get('[data-testid="manual-order-fallback"]')
        .should('be.visible')
        .should('contain', 'Manuell bestellen');
    });

    it('should handle microphone hardware errors', () => {
      // Simulate microphone error
      cy.window().then((win) => {
        const errorEvent = { error: 'audio-capture' };
        win.__mockRecognition.onerror(errorEvent);
      });

      cy.get('[data-testid="voice-error"]')
        .should('contain', 'Mikrofon-Problem');

      // Should suggest troubleshooting steps
      cy.get('[data-testid="microphone-troubleshooting"]')
        .should('be.visible');
    });

    it('should handle browser compatibility issues', () => {
      cy.window().then((win) => {
        // Simulate older browser without speech recognition
        delete win.SpeechRecognition;
        delete win.webkitSpeechRecognition;
      });

      cy.reload();
      cy.wait('@getProducts');

      // Should show browser compatibility message
      cy.get('[data-testid="voice-unsupported"]')
        .should('be.visible')
        .should('contain', 'Browser unterstützt keine Spracheingabe');

      // Should suggest alternative browsers
      cy.get('[data-testid="browser-suggestions"]')
        .should('contain', 'Chrome, Safari, Edge');
    });

    it('should timeout after no speech detected', () => {
      // Simulate no speech timeout
      cy.window().then((win) => {
        const errorEvent = { error: 'no-speech' };
        win.__mockRecognition.onerror(errorEvent);
      });

      cy.get('[data-testid="voice-no-speech"]')
        .should('contain', 'Keine Sprache erkannt');

      // Should stop listening automatically
      cy.get('[data-testid="voice-button"]')
        .should('not.have.class', 'listening');
    });
  });

  describe('Voice Analytics and Learning', () => {
    beforeEach(() => {
      cy.get('[data-testid="voice-button"]').click();
    });

    it('should track voice command usage analytics', () => {
      // Mock analytics endpoint
      cy.intercept('POST', '/api/analytics/voice', {
        statusCode: 200,
        body: { tracked: true }
      }).as('trackVoiceUsage');

      cy.window().then((win) => {
        const mockEvent = {
          results: [{
            0: { transcript: 'ich möchte einen burger', confidence: 0.95 },
            isFinal: true,
            length: 1
          }],
          resultIndex: 0
        };
        win.__mockRecognition.onresult(mockEvent);
      });

      cy.wait('@processVoiceCommand');

      // Should track usage
      cy.wait('@trackVoiceUsage').then((interception) => {
        expect(interception.request.body).to.include({
          command: 'ich möchte einen burger',
          language: 'de-CH',
          confidence: 0.95,
          success: true
        });
      });
    });

    it('should learn from correction patterns', () => {
      // Mock learning endpoint
      cy.intercept('POST', '/api/voice/learn', {
        statusCode: 200,
        body: { learned: true }
      }).as('voiceLearning');

      // Voice command with low confidence
      cy.window().then((win) => {
        const mockEvent = {
          results: [{
            0: { transcript: 'ich hätt gärn en burger', confidence: 0.65 },
            isFinal: true,
            length: 1
          }],
          resultIndex: 0
        };
        win.__mockRecognition.onresult(mockEvent);
      });

      cy.wait('@processVoiceCommand');

      // User confirms this was correct
      cy.get('[data-testid="voice-confirmation-correct"]').click();

      // Should send learning data
      cy.wait('@voiceLearning').then((interception) => {
        expect(interception.request.body).to.include({
          original: 'ich hätt gärn en burger',
          confidence: 0.65,
          userConfirmed: true,
          language: 'de-CH'
        });
      });
    });

    it('should suggest popular voice commands', () => {
      // Mock popular commands endpoint
      cy.intercept('GET', '/api/voice/popular-commands', {
        statusCode: 200,
        body: {
          commands: [
            'ich möchte einen burger',
            'zeige mir das menü',
            'was kostet das',
            'füge pommes hinzu'
          ]
        }
      });

      // Open voice help
      cy.get('[data-testid="voice-help"]').click();

      // Should show popular commands
      cy.get('[data-testid="popular-commands"]')
        .should('be.visible')
        .should('contain', 'ich möchte einen burger');
    });
  });

  describe('Accessibility and Inclusive Design', () => {
    it('should provide alternative text input for voice commands', () => {
      cy.get('[data-testid="voice-button"]').click();

      // Should show text input alternative
      cy.get('[data-testid="voice-text-alternative"]')
        .should('be.visible')
        .should('contain', 'Text eingeben');

      // Click text alternative
      cy.get('[data-testid="voice-text-input"]').click();

      // Should open text input modal
      cy.get('[data-testid="text-command-modal"]')
        .should('be.visible');

      // Type command
      cy.get('[data-testid="text-command-input"]')
        .type('ich möchte einen burger');

      cy.get('[data-testid="submit-text-command"]').click();

      // Should process like voice command
      cy.wait('@processVoiceCommand');
      cy.wait('@addToCart');
    });

    it('should support keyboard shortcuts for voice activation', () => {
      // Press voice activation shortcut (Ctrl+Shift+V)
      cy.get('body').type('{ctrl+shift+v}');

      // Should start listening
      cy.get('[data-testid="voice-button"]')
        .should('have.class', 'listening');

      cy.get('@speechStart').should('have.been.called');
    });

    it('should provide visual feedback for deaf users', () => {
      cy.get('[data-testid="voice-button"]').click();

      // Should show visual waveform
      cy.get('[data-testid="voice-waveform"]')
        .should('be.visible');

      // Should show real-time transcript
      cy.get('[data-testid="voice-transcript-live"]')
        .should('be.visible');

      // Simulate speech
      cy.window().then((win) => {
        const mockEvent = {
          results: [{
            0: { transcript: 'ich möchte', confidence: 0.80 },
            isFinal: false, // Interim result
            length: 1
          }],
          resultIndex: 0
        };
        win.__mockRecognition.onresult(mockEvent);
      });

      // Should show interim transcript
      cy.get('[data-testid="voice-transcript-live"]')
        .should('contain', 'ich möchte');
    });

    it('should support screen reader announcements', () => {
      cy.get('[data-testid="voice-button"]').click();

      // Voice button should have proper ARIA labels
      cy.get('[data-testid="voice-button"]')
        .should('have.attr', 'aria-label')
        .and('include', 'Spracheingabe');

      // Status changes should be announced
      cy.get('[data-testid="voice-status"]')
        .should('have.attr', 'aria-live', 'polite');

      // Start listening
      cy.window().then((win) => {
        win.__mockRecognition.onstart();
      });

      // Should announce listening state
      cy.get('[data-testid="voice-status"]')
        .should('contain', 'Höre zu');
    });
  });

  describe('Performance and Battery Optimization', () => {
    it('should automatically stop listening after timeout', () => {
      cy.get('[data-testid="voice-button"]').click();

      // Should start with timeout timer
      cy.get('[data-testid="voice-timeout"]')
        .should('be.visible')
        .should('contain', '30'); // 30 seconds

      // Wait for timeout (use cy.clock for faster testing)
      cy.clock();
      cy.tick(30000); // 30 seconds

      // Should stop listening automatically
      cy.get('[data-testid="voice-button"]')
        .should('not.have.class', 'listening');

      cy.get('@speechStop').should('have.been.called');
    });

    it('should pause voice recognition when tab becomes inactive', () => {
      cy.get('[data-testid="voice-button"]').click();

      // Simulate tab becoming inactive
      cy.window().then((win) => {
        const visibilityEvent = new Event('visibilitychange');
        Object.defineProperty(win.document, 'hidden', {
          value: true,
          writable: true
        });
        win.document.dispatchEvent(visibilityEvent);
      });

      // Should pause recognition
      cy.get('@speechStop').should('have.been.called');

      // Should show paused indicator
      cy.get('[data-testid="voice-paused"]')
        .should('be.visible')
        .should('contain', 'Pausiert (Tab inaktiv)');
    });

    it('should resume when tab becomes active again', () => {
      cy.get('[data-testid="voice-button"]').click();

      // Make tab inactive then active
      cy.window().then((win) => {
        Object.defineProperty(win.document, 'hidden', {
          value: true,
          writable: true
        });
        win.document.dispatchEvent(new Event('visibilitychange'));
      });

      cy.window().then((win) => {
        Object.defineProperty(win.document, 'hidden', {
          value: false,
          writable: true
        });
        win.document.dispatchEvent(new Event('visibilitychange'));
      });

      // Should resume automatically
      cy.get('[data-testid="voice-paused"]')
        .should('not.exist');

      // Should restart recognition
      cy.get('@speechStart').should('have.been.calledTwice');
    });

    it('should optimize battery usage on mobile', () => {
      // Set mobile viewport
      cy.viewport(375, 667);

      cy.get('[data-testid="voice-button"]').click();

      // Should show battery optimization notice on mobile
      cy.get('[data-testid="battery-optimization"]')
        .should('be.visible')
        .should('contain', 'Optimiert für mobile Geräte');

      // Should use shorter timeout on mobile
      cy.get('[data-testid="voice-timeout"]')
        .should('contain', '15'); // 15 seconds instead of 30
    });
  });
});
