/**
 * Response Generator
 *
 * Intelligente Antwort-Generierung für Schweizer Foodtruck Voice Commerce
 * Mehrsprachige, natürliche Antworten mit lokaler Anpassung
 *
 * @author Benedikt Thomma <benedikt@thomma.ch>
 */

import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { getFirestore } from 'firebase-admin/firestore';
import { OpenAI } from 'openai';
import {
  ConversationFlow,
  ResponseGenerationRequest,
  ResponseGenerationResponse,
  ResponseTemplate,
  VoiceResponse
} from '../types/ai.types';
import {
  formatCurrency,
  formatSwissTime,
  getCurrentSwissTime
} from '../utils/ai.utils';

export class ResponseGenerator {
  private openai: OpenAI;
  private ttsClient: TextToSpeechClient;
  private db: FirebaseFirestore.Firestore;
  private responseCache: Map<string, ResponseGenerationResponse> = new Map();
  private templates: Map<string, ResponseTemplate[]> = new Map();
  private conversationFlows: Map<string, ConversationFlow> = new Map();

  // Schweizer Response Templates
  private readonly SWISS_RESPONSE_TEMPLATES = {
    'greeting.swiss': {
      'de-CH': [
        'Grüezi! Willkomme bi {tenantName}! Was darf ich Ihne bringe?',
        'Hallo zäme! Schön, dass Sie da sind. Wie chan ich Ihne helfe?',
        'Grüessech! Was für en guete Appetit darf es hüt si?'
      ],
      'fr-CH': [
        'Bonjour! Bienvenue chez {tenantName}! Que puis-je vous offrir?',
        'Salut! Comment puis-je vous aider aujourd\'hui?'
      ],
      'it-CH': [
        'Buongiorno! Benvenuti da {tenantName}! Cosa posso offrirvi?',
        'Ciao! Come posso aiutarvi oggi?'
      ],
      'en-US': [
        'Hello! Welcome to {tenantName}! What can I get for you today?',
        'Hi there! How can I help you?'
      ]
    },

    'menu.inquiry.response': {
      'de-CH': [
        'Mir händ hüt {specialties} im Angebot. Möchted Sie öppis Speziells?',
        'Unseri Spezialitäte sind {topProducts}. Was tönt guet für Sie?',
        'Sie chönd zwüsched {categories} wähle. Was interessiert Sie?'
      ],
      'fr-CH': [
        'Nos spécialités aujourd\'hui sont {specialties}. Qu\'est-ce qui vous intéresse?',
        'Vous pouvez choisir entre {categories}. Que préférez-vous?'
      ]
    },

    'order.confirmation': {
      'de-CH': [
        'Perfekt! Sie möchted also {orderSummary}. Das macht {totalPrice}. Isch das so richtig?',
        'Alles klar! {orderSummary} für {totalPrice}. Soll ich das so ufneh?',
        'Super! {quantity}x {productName} mit {modifiers}. Total {totalPrice}. Passt das?'
      ],
      'fr-CH': [
        'Parfait! Vous voulez {orderSummary} pour {totalPrice}. C\'est correct?',
        'Très bien! {orderSummary}. Le total est {totalPrice}. Ça vous va?'
      ]
    },

    'payment.inquiry.response': {
      'de-CH': [
        'Sie chönd bar, mit Karte oder Twint zahle. Was isch am bequemste für Sie?',
        'Mir akzeptiere Bar, Kreditkarte und Twint. Wie möchted Sie zahle?',
        'Zahlig mit Bar, Karte oder Twint isch möglich. Was bevorzueged Sie?'
      ]
    },

    'wait.time.response': {
      'de-CH': [
        'Ihri Bestellig isch i {waitTime} Minute fertig. Ich melde mich, sobald alles parat isch.',
        'Es dauert no öppe {waitTime} Minute, denn chönd Sie abhule.',
        'Sie müend no {waitTime} Minute warte. Ich gib Ihne Bescheid!'
      ]
    },

    'order.ready': {
      'de-CH': [
        'Ihri Bestellig isch fertig! Chönd Sie zum Abhule cho?',
        'Bestellig Nummer {orderNumber} isch parat! Merci für Ihri Geduld.',
        'Alles fertig! Sie chönd jetzt cho abhule.'
      ]
    },

    'farewell.swiss': {
      'de-CH': [
        'Merci vilmal und en schöne Tag no!',
        'Danke für Ihre Bestellig! Bis zum nächste Mal!',
        'Ade und en guete Appetit!',
        'Merci und gniessed es!'
      ],
      'fr-CH': [
        'Merci beaucoup et bonne journée!',
        'Au revoir et bon appétit!'
      ]
    },

    'clarification.needed': {
      'de-CH': [
        'Entschuldigung, das han ich nöd ganz verstande. Chönd Sie das nomol sage?',
        'Sorry, chöntets das bitte wiederhole? Ich bin nöd sicher, was Sie möchted.',
        'Excusez, ich ha Sie nöd richtig verstande. Was händ Sie gseit?'
      ]
    },

    'product.unavailable': {
      'de-CH': [
        'Leider isch {productName} hüt usgange. Aber ich cha Ihne {alternative} empfehle.',
        'Sorry, {productName} hämer nüm. Möchted Sie vilicht {alternative} probiere?',
        '{productName} git es hüt leider nöd meh. {alternative} wär e gueti Alternative.'
      ]
    },

    'upselling': {
      'de-CH': [
        'Zu Ihrem {mainProduct} passt no perfekt {upsellProduct}. Möchted Sie das dezue?',
        'Darf ich Ihne no {upsellProduct} empfehle? Das schmeckt super zu {mainProduct}.',
        'Wie wär\'s mit {upsellProduct} als Ergänzig? Das isch sehr beliebt.'
      ]
    }
  };

  // Audio-Einstellungen für verschiedene Sprachen
  private readonly SWISS_VOICE_SETTINGS = {
    'de-CH': {
      languageCode: 'de-DE', // Closest match
      name: 'de-DE-Standard-B',
      ssmlGender: 'FEMALE',
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 0.9, // Slightly slower for Swiss German
        pitch: 0.0
      }
    },
    'fr-CH': {
      languageCode: 'fr-FR',
      name: 'fr-FR-Standard-C',
      ssmlGender: 'FEMALE',
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 0.95,
        pitch: 2.0
      }
    },
    'it-CH': {
      languageCode: 'it-IT',
      name: 'it-IT-Standard-A',
      ssmlGender: 'FEMALE',
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 0.9,
        pitch: 1.0
      }
    },
    'en-US': {
      languageCode: 'en-US',
      name: 'en-US-Standard-C',
      ssmlGender: 'FEMALE',
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0
      }
    }
  };

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.ttsClient = new TextToSpeechClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE
    });
    this.db = getFirestore();
  }

  /**
   * Initialisiert den Response Generator
   */
  async initialize(): Promise<void> {
    console.log('🗣️ Initializing Response Generator...');

    // Lade Response Templates
    await this.loadResponseTemplates();

    // Initialisiere Conversation Flows
    this.initializeConversationFlows();

    // Teste Text-to-Speech
    await this.testTTSConnection();

    console.log('✅ Response Generator initialized');
  }

  /**
   * Generiert intelligente Antwort
   */
  async generateResponse(request: ResponseGenerationRequest): Promise<ResponseGenerationResponse> {
    try {
      console.log(`🗣️ Generating response for intent: ${request.intent.type}`);

      // Hole Conversation Flow
      const flow = this.getConversationFlow(request.sessionId);

      // Wähle Response-Strategie
      const strategy = this.selectResponseStrategy(request.intent, request.context);

      // Generiere Text-Response
      const textResponse = await this.generateTextResponse(request, strategy);

      // Erstelle Audio-Response (falls gewünscht)
      const audioResponse = request.generateAudio
        ? await this.generateAudioResponse(textResponse, request.language)
        : undefined;

      // Update Conversation Flow
      this.updateConversationFlow(request.sessionId, request.intent, textResponse);

      const response: ResponseGenerationResponse = {
        sessionId: request.sessionId,
        tenantId: request.tenantId,
        textResponse,
        audioResponse,
        intent: request.intent,
        language: request.language || 'de-CH',
        responseStrategy: strategy,
        conversationFlow: flow,
        metadata: {
          generatedAt: getCurrentSwissTime(),
          processingTime: Date.now() - request.timestamp.getTime(),
          templateUsed: strategy.templateId,
          aiEnhanced: strategy.useAI
        },
        nextExpectedIntents: this.predictNextIntents(request.intent, request.context),
        suggestedActions: this.generateSuggestedActions(request.intent, request.entities)
      };

      // Cache für Performance
      this.responseCache.set(this.getCacheKey(request), response);

      // Log für Qualitätsverbesserung
      await this.logResponseGeneration(request, response);

      return response;
    } catch (error) {
      console.error(`Response generation failed for intent ${request.intent.type}:`, error);
      throw error;
    }
  }

  /**
   * Generiert Text-Response
   */
  private async generateTextResponse(
    request: ResponseGenerationRequest,
    strategy: { templateId: string; useAI: boolean; personalization: any }
  ): Promise<string> {
    const language = request.language || 'de-CH';

    if (strategy.useAI) {
      return await this.generateAIResponse(request);
    }

    // Template-basierte Response
    const templates = this.getTemplatesForIntent(request.intent.type, language);
    if (templates.length === 0) {
      return await this.generateFallbackResponse(request);
    }

    // Wähle passendes Template
    const template = this.selectBestTemplate(templates, request);

    // Fülle Template mit Daten
    return this.fillTemplate(template, request);
  }

  /**
   * AI-generierte Response
   */
  private async generateAIResponse(request: ResponseGenerationRequest): Promise<string> {
    try {
      const prompt = this.buildResponsePrompt(request);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: `Du bist ein freundlicher Schweizer Foodtruck-Mitarbeiter.
                     Antworte natürlich und herzlich auf ${request.language || 'Schweizerdeutsch'}.
                     Berücksichtige lokale Gepflogenheiten und sei hilfsbereit.
                     Halte Antworten kurz und direkt.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      });

      let aiResponse = completion.choices[0].message.content || '';

      // Post-Processing für Schweizer Kontext
      aiResponse = this.adaptForSwissContext(aiResponse, request.language);

      return aiResponse;
    } catch (error) {
      console.error('AI response generation failed:', error);
      return await this.generateFallbackResponse(request);
    }
  }

  /**
   * Generiert Audio-Response
   */
  private async generateAudioResponse(text: string, language: string = 'de-CH'): Promise<VoiceResponse> {
    try {
      const voiceSettings = this.SWISS_VOICE_SETTINGS[language] || this.SWISS_VOICE_SETTINGS['de-CH'];

      // Bereite SSML vor
      const ssml = this.createSSML(text, language);

      const request = {
        input: { ssml },
        voice: {
          languageCode: voiceSettings.languageCode,
          name: voiceSettings.name,
          ssmlGender: voiceSettings.ssmlGender
        },
        audioConfig: voiceSettings.audioConfig
      };

      const [response] = await this.ttsClient.synthesizeSpeech(request);

      if (!response.audioContent) {
        throw new Error('No audio content generated');
      }

      return {
        audioContent: response.audioContent as Buffer,
        audioFormat: 'mp3',
        duration: this.estimateAudioDuration(text),
        language,
        voiceSettings: {
          name: voiceSettings.name,
          gender: voiceSettings.ssmlGender,
          speakingRate: voiceSettings.audioConfig.speakingRate,
          pitch: voiceSettings.audioConfig.pitch
        }
      };
    } catch (error) {
      console.error('Audio generation failed:', error);
      throw error;
    }
  }

  /**
   * Füllt Template mit Daten
   */
  private fillTemplate(template: string, request: ResponseGenerationRequest): string {
    let filled = template;

    // Tenant-Informationen
    filled = filled.replace(/{tenantName}/g, request.context?.tenantName || 'unserem Foodtruck');

    // Order-Informationen
    if (request.orderData) {
      filled = filled.replace(/{orderSummary}/g, this.createOrderSummary(request.orderData));
      filled = filled.replace(/{totalPrice}/g, formatCurrency(request.orderData.totalAmount || 0, 'CHF'));
      filled = filled.replace(/{quantity}/g, request.orderData.items?.[0]?.quantity?.toString() || '1');
      filled = filled.replace(/{productName}/g, request.orderData.items?.[0]?.productName || 'Produkt');

      const modifiers = request.orderData.items?.[0]?.modifiers?.map(m => m.value).join(', ') || 'keine Extras';
      filled = filled.replace(/{modifiers}/g, modifiers);
    }

    // Wartezeit
    if (request.waitTime) {
      filled = filled.replace(/{waitTime}/g, request.waitTime.toString());
    }

    // Produkt-Informationen
    if (request.entities) {
      const products = request.entities.filter(e => e.type === 'product');
      if (products.length > 0) {
        filled = filled.replace(/{productName}/g, products[0].value);
      }
    }

    // Menu-Kategorien
    if (request.context?.menuCategories) {
      filled = filled.replace(/{categories}/g, request.context.menuCategories.join(', '));
    }

    // Spezialitäten
    if (request.context?.specialties) {
      filled = filled.replace(/{specialties}/g, request.context.specialties.join(', '));
    }

    // Top Produkte
    if (request.context?.topProducts) {
      filled = filled.replace(/{topProducts}/g, request.context.topProducts.join(', '));
    }

    // Alternatives für nicht verfügbare Produkte
    if (request.context?.alternatives) {
      filled = filled.replace(/{alternative}/g, request.context.alternatives[0] || 'etwas anderes');
    }

    // Upselling Produkte
    if (request.context?.upsellProducts) {
      filled = filled.replace(/{upsellProduct}/g, request.context.upsellProducts[0] || 'Pommes');
      filled = filled.replace(/{mainProduct}/g, request.entities?.find(e => e.type === 'product')?.value || 'Ihrem Burger');
    }

    // Order Number
    if (request.context?.orderNumber) {
      filled = filled.replace(/{orderNumber}/g, request.context.orderNumber);
    }

    // Zeit-Informationen
    filled = filled.replace(/{currentTime}/g, formatSwissTime(new Date()));

    return filled;
  }

  /**
   * Erstellt SSML für bessere Audio-Qualität
   */
  private createSSML(text: string, language: string): string {
    // Pausenplatzierung für natürlichere Sprache
    let ssml = text
      .replace(/\./g, '. <break time="0.5s"/>')
      .replace(/\?/g, '? <break time="0.5s"/>')
      .replace(/!/g, '! <break time="0.5s"/>')
      .replace(/,/g, ', <break time="0.3s"/>');

    // Schweizerdeutsche Anpassungen
    if (language === 'de-CH') {
      ssml = ssml
        .replace(/Grüezi/g, '<phoneme alphabet="ipa" ph="ˈɡryə.t͡si">Grüezi</phoneme>')
        .replace(/chönd/g, '<phoneme alphabet="ipa" ph="χønd">chönd</phoneme>')
        .replace(/Merci/g, '<phoneme alphabet="ipa" ph="mɛʁˈsi">Merci</phoneme>');

      // Langsamere Sprechgeschwindigkeit für Schweizerdeutsch
      ssml = `<prosody rate="0.9">${ssml}</prosody>`;
    }

    // Wrap in SSML tags
    return `<speak>${ssml}</speak>`;
  }

  /**
   * Health Check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.openai.models.list();
      await this.testTTSConnection();

      await this.db.collection('_health').doc('ai_response_generator').set({
        lastCheck: new Date(),
        service: 'response-generator',
        templatesLoaded: this.templates.size
      });
      return true;
    } catch (error) {
      console.error('Response Generator health check failed:', error);
      return false;
    }
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    this.responseCache.clear();
    this.templates.clear();
    this.conversationFlows.clear();
    console.log('Response Generator shut down');
  }

  // Helper Methods
  private getCacheKey(request: ResponseGenerationRequest): string {
    return `${request.tenantId}_${request.intent.type}_${request.sessionId}`;
  }

  private async loadResponseTemplates(): Promise<void> {
    // Lade Templates aus Konfiguration
    for (const [intentType, languageTemplates] of Object.entries(this.SWISS_RESPONSE_TEMPLATES)) {
      this.templates.set(intentType, Object.entries(languageTemplates).map(([lang, templates]) => ({
        id: `${intentType}_${lang}`,
        intentType,
        language: lang,
        templates: templates as string[],
        priority: 1
      })));
    }
  }

  private initializeConversationFlows(): void {
    // Initialisiere Standard Conversation Flows
  }

  private async testTTSConnection(): Promise<void> {
    try {
      // Test with simple phrase
      const testRequest = {
        input: { text: 'Test' },
        voice: {
          languageCode: 'de-DE',
          name: 'de-DE-Standard-B'
        },
        audioConfig: {
          audioEncoding: 'MP3' as const
        }
      };

      await this.ttsClient.synthesizeSpeech(testRequest);
    } catch (error) {
      console.warn('TTS connection test failed:', error);
    }
  }

  private getConversationFlow(sessionId: string): ConversationFlow {
    return this.conversationFlows.get(sessionId) || {
      sessionId,
      steps: [],
      currentStep: 0,
      isComplete: false
    };
  }

  private selectResponseStrategy(intent: any, context: any): { templateId: string; useAI: boolean; personalization: any } {
    // Einfache Strategie-Auswahl
    const useAI = intent.confidence < 0.7 || context?.complexContext;

    return {
      templateId: intent.type,
      useAI,
      personalization: {
        customerName: context?.customerName,
        previousOrders: context?.previousOrders || []
      }
    };
  }

  private getTemplatesForIntent(intentType: string, language: string): ResponseTemplate[] {
    const templates = this.templates.get(intentType) || [];
    return templates.filter(t => t.language === language || t.language === 'de-CH');
  }

  private selectBestTemplate(templates: ResponseTemplate[], request: ResponseGenerationRequest): string {
    if (templates.length === 0) return '';

    // Wähle zufälliges Template für Variation
    const template = templates[Math.floor(Math.random() * templates.length)];
    const templateStrings = template.templates;

    return templateStrings[Math.floor(Math.random() * templateStrings.length)];
  }

  private async generateFallbackResponse(request: ResponseGenerationRequest): Promise<string> {
    const language = request.language || 'de-CH';

    const fallbacks = {
      'de-CH': 'Entschuldigung, chönd Sie das nomol sage? Ich ha Sie nöd ganz verstande.',
      'fr-CH': 'Excusez-moi, pouvez-vous répéter? Je n\'ai pas bien compris.',
      'it-CH': 'Scusi, può ripetere? Non ho capito bene.',
      'en-US': 'Sorry, could you please repeat that? I didn\'t understand correctly.'
    };

    return fallbacks[language] || fallbacks['de-CH'];
  }

  private buildResponsePrompt(request: ResponseGenerationRequest): string {
    return `
Kontext: Schweizer Foodtruck "${request.context?.tenantName || 'Foodtruck'}"
Intent: ${request.intent.type}
Sprache: ${request.language || 'de-CH'}
Entities: ${request.entities?.map(e => `${e.type}: ${e.value}`).join(', ') || 'keine'}

${request.orderData ? `Bestellung: ${this.createOrderSummary(request.orderData)}` : ''}
${request.waitTime ? `Wartezeit: ${request.waitTime} Minuten` : ''}

Generiere eine natürliche, freundliche Antwort auf ${request.language || 'Schweizerdeutsch'}.
Berücksichtige lokale Gepflogenheiten und halte es kurz.`;
  }

  private adaptForSwissContext(text: string, language?: string): string {
    if (language === 'de-CH') {
      // Ersetze Hochdeutsche Ausdrücke mit Schweizerdeutschen
      return text
        .replace(/können Sie/g, 'chönd Sie')
        .replace(/möchten Sie/g, 'möchted Sie')
        .replace(/haben wir/g, 'händ mir')
        .replace(/Danke/g, 'Merci')
        .replace(/Auf Wiedersehen/g, 'Ade');
    }
    return text;
  }

  private createOrderSummary(orderData: any): string {
    if (!orderData.items || orderData.items.length === 0) {
      return 'leere Bestellung';
    }

    return orderData.items.map((item: any) =>
      `${item.quantity}x ${item.productName}${item.modifiers?.length > 0 ? ` mit ${item.modifiers.map((m: any) => m.value).join(', ')}` : ''}`
    ).join(', ');
  }

  private estimateAudioDuration(text: string): number {
    // Grobe Schätzung: 150 Wörter pro Minute
    const words = text.split(' ').length;
    return Math.ceil((words / 150) * 60); // in Sekunden
  }

  private updateConversationFlow(sessionId: string, intent: any, response: string): void {
    const flow = this.getConversationFlow(sessionId);
    flow.steps.push({
      intent: intent.type,
      response,
      timestamp: new Date()
    });
    flow.currentStep = flow.steps.length - 1;
    this.conversationFlows.set(sessionId, flow);
  }

  private predictNextIntents(intent: any, context: any): string[] {
    const nextIntents: string[] = [];

    switch (intent.type) {
      case 'greeting.swiss':
        nextIntents.push('menu.inquiry', 'order.create');
        break;
      case 'menu.inquiry':
        nextIntents.push('order.create', 'price.inquiry');
        break;
      case 'order.create':
        nextIntents.push('order.modify', 'payment.inquiry', 'order.confirmation');
        break;
      case 'payment.inquiry':
        nextIntents.push('order.complete', 'farewell.swiss');
        break;
    }

    return nextIntents;
  }

  private generateSuggestedActions(intent: any, entities: any[]): string[] {
    const actions: string[] = [];

    if (intent.type === 'order.create' && entities.length > 0) {
      actions.push('confirm_order', 'suggest_upsell', 'calculate_total');
    }

    if (intent.type === 'menu.inquiry') {
      actions.push('show_menu', 'highlight_specials', 'suggest_popular');
    }

    return actions;
  }

  private async logResponseGeneration(request: ResponseGenerationRequest, response: ResponseGenerationResponse): Promise<void> {
    await this.db.collection('response_generations').add({
      tenantId: request.tenantId,
      intentType: request.intent.type,
      language: request.language,
      responseLength: response.textResponse.length,
      audioGenerated: !!response.audioResponse,
      processingTime: response.metadata.processingTime,
      generatedAt: new Date()
    });
  }
}
