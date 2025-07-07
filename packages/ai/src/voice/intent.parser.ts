/**
 * Intent Parser
 *
 * Intelligente Intent-Erkennung für Schweizer Foodtruck Voice Commerce
 * Natural Language Understanding mit Schweizerdeutsch-Support
 *
 * @author Benedikt Thomma <benedikt@thomma.ch>
 */

import * as compromise from 'compromise';
import { getFirestore } from 'firebase-admin/firestore';
import * as natural from 'natural';
import { OpenAI } from 'openai';
import {
  ConversationContext,
  Entity,
  Intent,
  IntentParsingRequest,
  IntentParsingResponse,
  OrderIntent
} from '../types/ai.types';
import {
  getCurrentSwissTime,
  normalizeSwissGerman
} from '../utils/ai.utils';

export class IntentParser {
  private openai: OpenAI;
  private db: FirebaseFirestore.Firestore;
  private intentCache: Map<string, IntentParsingResponse> = new Map();
  private swissPatterns: Map<string, RegExp[]> = new Map();
  private entityExtractors: Map<string, any> = new Map();
  private conversationContexts: Map<string, ConversationContext> = new Map();

  // Schweizer Foodtruck Intents
  private readonly FOODTRUCK_INTENTS = {
    // Bestellung
    'order.create': {
      patterns: [
        /ich möchte.*bestellen/i,
        /hätte gern.*/i,
        /kann ich.*haben/i,
        /würde gern.*nehmen/i,
        /ich nehme.*/i,
        /bestelle.*/i
      ],
      entities: ['product', 'quantity', 'modifiers'],
      confidence: 0.9
    },

    // Menu Information
    'menu.inquiry': {
      patterns: [
        /was haben sie/i,
        /was gibt es/i,
        /menu.*zeigen/i,
        /speisekarte/i,
        /was für.*haben sie/i
      ],
      entities: ['category'],
      confidence: 0.8
    },

    // Preise
    'price.inquiry': {
      patterns: [
        /was kostet/i,
        /wie viel.*/i,
        /preis.*/i,
        /wie teuer/i
      ],
      entities: ['product'],
      confidence: 0.85
    },

    // Modifikationen
    'order.modify': {
      patterns: [
        /ohne.*/i,
        /mit extra.*/i,
        /kann ich.*weglassen/i,
        /dazu noch.*/i,
        /zusätzlich.*/i
      ],
      entities: ['modifier', 'product'],
      confidence: 0.8
    },

    // Bezahlung
    'payment.inquiry': {
      patterns: [
        /bezahlen/i,
        /zahlen/i,
        /twint/i,
        /karte/i,
        /bar/i,
        /rechnung/i
      ],
      entities: ['payment_method'],
      confidence: 0.9
    },

    // Status
    'order.status': {
      patterns: [
        /wie lange.*noch/i,
        /wann.*fertig/i,
        /status.*bestellung/i,
        /wartezeit/i
      ],
      entities: ['order_number'],
      confidence: 0.85
    },

    // Schweizerdeutsche Spezialitäten
    'greeting.swiss': {
      patterns: [
        /grüezi/i,
        /hoi/i,
        /sali/i,
        /grüessech/i
      ],
      entities: [],
      confidence: 0.95
    },

    // Verabschiedung
    'farewell.swiss': {
      patterns: [
        /ade/i,
        /tschüss/i,
        /merci vilmal/i,
        /auf wiedersehen/i
      ],
      entities: [],
      confidence: 0.9
    }
  };

  // Schweizer Produkt-Entitäten
  private readonly SWISS_PRODUCT_ENTITIES = {
    'burger': ['burger', 'hamburger', 'cheeseburger'],
    'pommes': ['pommes', 'frites', 'chips'],
    'getränk': ['cola', 'bier', 'wasser', 'getränk', 'softdrink'],
    'bratwurst': ['bratwurst', 'wurst', 'cervelat'],
    'rösti': ['rösti', 'hash browns'],
    'älplermagronen': ['älplermagronen', 'mac and cheese']
  };

  // Schweizer Quantitäten
  private readonly SWISS_QUANTITIES = {
    'eins': 1, 'eis': 1, 'ein': 1, 'eine': 1,
    'zwei': 2, 'zwo': 2, 'zwöi': 2,
    'drei': 3, 'drü': 3,
    'vier': 4, 'vieri': 4,
    'fünf': 5, 'füf': 5,
    'sechs': 6, 'sächs': 6,
    'sieben': 7, 'sibä': 7,
    'acht': 8, 'acht': 8,
    'neun': 9, 'nün': 9,
    'zehn': 10, 'zäh': 10
  };

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.db = getFirestore();
  }

  /**
   * Initialisiert den Intent Parser
   */
  async initialize(): Promise<void> {
    console.log('🧠 Initializing Intent Parser...');

    // Lade Schweizer Sprachmuster
    await this.loadSwissLanguagePatterns();

    // Initialisiere Entity Extractors
    this.initializeEntityExtractors();

    // Lade Tenant-spezifische Menüs
    await this.loadTenantMenus();

    console.log('✅ Intent Parser initialized');
  }

  /**
   * Parst Intent aus natürlicher Sprache
   */
  async parseIntent(request: IntentParsingRequest): Promise<IntentParsingResponse> {
    try {
      console.log(`🧠 Parsing intent for: "${request.text}"`);

      // Normalisiere Input
      const normalizedText = await this.normalizeInput(request.text, request.language);

      // Hole Conversation Context
      const context = this.getConversationContext(request.sessionId);

      // Multi-Level Intent Detection
      const intents = await Promise.all([
        this.detectPatternBasedIntent(normalizedText, request),
        this.detectAIBasedIntent(normalizedText, request, context),
        this.detectEntityBasedIntent(normalizedText, request)
      ]);

      // Kombiniere und bewerte Intents
      const bestIntent = this.combineIntents(intents, context);

      // Extrahiere Entitäten
      const entities = await this.extractEntities(normalizedText, bestIntent, request);

      // Erstelle strukturierte Order (falls Order Intent)
      const orderIntent = await this.createOrderIntent(bestIntent, entities, request);

      // Update Conversation Context
      this.updateConversationContext(request.sessionId, bestIntent, entities);

      const response: IntentParsingResponse = {
        sessionId: request.sessionId,
        tenantId: request.tenantId,
        originalText: request.text,
        normalizedText,
        intent: bestIntent,
        entities,
        orderIntent,
        confidence: bestIntent.confidence,
        language: request.language || 'de-CH',
        conversationContext: context,
        parsedAt: getCurrentSwissTime(),
        needsClarification: this.needsClarification(bestIntent, entities),
        suggestedResponses: await this.generateSuggestedResponses(bestIntent, entities, request)
      };

      // Cache für Performance
      this.intentCache.set(this.getCacheKey(request), response);

      // Log für Training
      await this.logIntentParsing(request, response);

      return response;
    } catch (error) {
      console.error(`Intent parsing failed for "${request.text}":`, error);
      throw error;
    }
  }

  /**
   * Normalisiert Input Text
   */
  private async normalizeInput(text: string, language?: string): Promise<string> {
    let normalized = text.toLowerCase().trim();

    // Schweizerdeutsch Normalisierung
    if (language?.startsWith('de')) {
      normalized = normalizeSwissGerman(normalized);
    }

    // Entferne Füllwörter
    normalized = this.removeFillWords(normalized);

    // Korrigiere häufige Sprachfehler
    normalized = this.correctCommonErrors(normalized);

    return normalized;
  }

  /**
   * Pattern-basierte Intent-Erkennung
   */
  private async detectPatternBasedIntent(
    text: string,
    request: IntentParsingRequest
  ): Promise<Intent> {
    let bestMatch: Intent = {
      type: 'unknown',
      confidence: 0,
      category: 'general'
    };

    for (const [intentType, config] of Object.entries(this.FOODTRUCK_INTENTS)) {
      for (const pattern of config.patterns) {
        const match = text.match(pattern);
        if (match) {
          const confidence = config.confidence * this.calculatePatternStrength(match, text);

          if (confidence > bestMatch.confidence) {
            bestMatch = {
              type: intentType,
              confidence,
              category: this.getIntentCategory(intentType),
              matched_pattern: pattern.source,
              match_text: match[0]
            };
          }
        }
      }
    }

    return bestMatch;
  }

  /**
   * AI-basierte Intent-Erkennung
   */
  private async detectAIBasedIntent(
    text: string,
    request: IntentParsingRequest,
    context: ConversationContext
  ): Promise<Intent> {
    try {
      const prompt = this.buildIntentDetectionPrompt(text, request, context);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: `Du bist ein Experte für Schweizer Foodtruck Voice Commerce Intent-Erkennung.
                     Erkenne die Absicht des Kunden und antworte nur in validem JSON.
                     Berücksichtige Schweizerdeutsch und lokale Essgewohnheiten.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });

      const aiResult = JSON.parse(completion.choices[0].message.content!);

      return {
        type: aiResult.intent_type || 'unknown',
        confidence: aiResult.confidence || 0.5,
        category: aiResult.category || 'general',
        reasoning: aiResult.reasoning || [],
        ai_analysis: true
      };
    } catch (error) {
      console.error('AI intent detection failed:', error);
      return {
        type: 'unknown',
        confidence: 0.3,
        category: 'general',
        error: 'AI analysis failed'
      };
    }
  }

  /**
   * Entity-basierte Intent-Erkennung
   */
  private async detectEntityBasedIntent(
    text: string,
    request: IntentParsingRequest
  ): Promise<Intent> {
    // Erkenne Entitäten und leite Intent ab
    const doc = compromise(text);

    // Suche nach Produkten
    const hasProducts = this.findProducts(text, request.tenantId);

    // Suche nach Quantitäten
    const hasQuantities = this.findQuantities(text);

    // Suche nach Aktionen
    const actions = doc.verbs().out('array');

    if (hasProducts.length > 0 && (hasQuantities.length > 0 || actions.some(a => ['möchte', 'hätte', 'nehme', 'bestelle'].includes(a)))) {
      return {
        type: 'order.create',
        confidence: 0.8,
        category: 'order',
        detected_entities: ['product', 'quantity']
      };
    }

    if (text.includes('was') && (text.includes('kostet') || text.includes('preis'))) {
      return {
        type: 'price.inquiry',
        confidence: 0.85,
        category: 'inquiry'
      };
    }

    if (text.includes('menu') || text.includes('speisekarte') || text.includes('haben sie')) {
      return {
        type: 'menu.inquiry',
        confidence: 0.8,
        category: 'inquiry'
      };
    }

    return {
      type: 'unknown',
      confidence: 0.2,
      category: 'general'
    };
  }

  /**
   * Kombiniert verschiedene Intent-Erkennungen
   */
  private combineIntents(intents: Intent[], context: ConversationContext): Intent {
    // Gewichtete Kombination basierend auf Confidence und Kontext
    const weights = {
      pattern: 0.4,
      ai: 0.4,
      entity: 0.2
    };

    let bestIntent = intents[0];

    for (let i = 1; i < intents.length; i++) {
      const currentIntent = intents[i];
      const weightedConfidence = currentIntent.confidence * Object.values(weights)[i];
      const bestWeightedConfidence = bestIntent.confidence * Object.values(weights)[0];

      if (weightedConfidence > bestWeightedConfidence) {
        bestIntent = currentIntent;
      }
    }

    // Kontext-basierte Anpassungen
    if (context.lastIntent?.type === 'menu.inquiry' && bestIntent.type === 'order.create') {
      bestIntent.confidence *= 1.2; // Boost confidence wenn nach Menu-Inquiry bestellt wird
    }

    return bestIntent;
  }

  /**
   * Extrahiert Entitäten aus Text
   */
  private async extractEntities(
    text: string,
    intent: Intent,
    request: IntentParsingRequest
  ): Promise<Entity[]> {
    const entities: Entity[] = [];

    // Produkt-Entitäten
    const products = this.findProducts(text, request.tenantId);
    entities.push(...products.map(product => ({
      type: 'product',
      value: product.name,
      confidence: product.confidence,
      start: product.start,
      end: product.end,
      metadata: {
        productId: product.id,
        category: product.category,
        price: product.price
      }
    })));

    // Quantitäts-Entitäten
    const quantities = this.findQuantities(text);
    entities.push(...quantities.map(qty => ({
      type: 'quantity',
      value: qty.value.toString(),
      confidence: qty.confidence,
      start: qty.start,
      end: qty.end,
      metadata: {
        numeric_value: qty.value,
        unit: qty.unit || 'piece'
      }
    })));

    // Modifier-Entitäten
    const modifiers = this.findModifiers(text);
    entities.push(...modifiers.map(mod => ({
      type: 'modifier',
      value: mod.value,
      confidence: mod.confidence,
      start: mod.start,
      end: mod.end,
      metadata: {
        modifier_type: mod.type,
        operation: mod.operation // 'add' or 'remove'
      }
    })));

    // Zahlungsmethoden
    const paymentMethods = this.findPaymentMethods(text);
    entities.push(...paymentMethods.map(pm => ({
      type: 'payment_method',
      value: pm.method,
      confidence: pm.confidence,
      start: pm.start,
      end: pm.end
    })));

    return entities;
  }

  /**
   * Erstellt strukturierte Order Intent
   */
  private async createOrderIntent(
    intent: Intent,
    entities: Entity[],
    request: IntentParsingRequest
  ): Promise<OrderIntent | undefined> {
    if (intent.type !== 'order.create') {
      return undefined;
    }

    const products = entities.filter(e => e.type === 'product');
    const quantities = entities.filter(e => e.type === 'quantity');
    const modifiers = entities.filter(e => e.type === 'modifier');

    if (products.length === 0) {
      return undefined;
    }

    const orderItems = products.map((product, index) => {
      const quantity = quantities[index]?.metadata?.numeric_value || 1;
      const itemModifiers = modifiers.filter(m =>
        m.start > product.start && m.start < (products[index + 1]?.start || text.length)
      );

      return {
        productId: product.metadata?.productId,
        productName: product.value,
        quantity,
        modifiers: itemModifiers.map(m => ({
          type: m.metadata?.modifier_type,
          value: m.value,
          operation: m.metadata?.operation
        })),
        price: product.metadata?.price || 0
      };
    });

    const totalAmount = orderItems.reduce((sum, item) =>
      sum + (item.price * item.quantity), 0
    );

    return {
      items: orderItems,
      totalAmount,
      currency: 'CHF',
      orderType: 'pickup', // Default
      confidence: intent.confidence,
      needsConfirmation: true
    };
  }

  /**
   * Health Check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.openai.models.list();
      await this.db.collection('_health').doc('ai_intent_parser').set({
        lastCheck: new Date(),
        service: 'intent-parser',
        conversationContexts: this.conversationContexts.size
      });
      return true;
    } catch (error) {
      console.error('Intent Parser health check failed:', error);
      return false;
    }
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    this.intentCache.clear();
    this.swissPatterns.clear();
    this.entityExtractors.clear();
    this.conversationContexts.clear();
    console.log('Intent Parser shut down');
  }

  // Helper Methods
  private getCacheKey(request: IntentParsingRequest): string {
    return `${request.tenantId}_${request.text}_${request.sessionId}`;
  }

  private async loadSwissLanguagePatterns(): Promise<void> {
    // Lade Schweizer Sprachmuster
    this.swissPatterns.set('greetings', [
      /grüezi/i, /hoi/i, /sali/i, /grüessech/i
    ]);

    this.swissPatterns.set('politeness', [
      /bitte/i, /merci/i, /danke/i, /merci vilmal/i
    ]);
  }

  private initializeEntityExtractors(): void {
    // Initialisiere Entity Extractors
    this.entityExtractors.set('product', new natural.WordTokenizer());
    this.entityExtractors.set('quantity', new natural.RegexpTokenizer({ pattern: /\d+/ }));
  }

  private async loadTenantMenus(): Promise<void> {
    // Lade Tenant-spezifische Menüs für bessere Produkterkennung
  }

  private removeFillWords(text: string): string {
    const fillWords = ['äh', 'öh', 'also', 'ja', 'eben', 'halt'];
    let result = text;
    fillWords.forEach(word => {
      result = result.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
    });
    return result.replace(/\s+/g, ' ').trim();
  }

  private correctCommonErrors(text: string): string {
    const corrections = {
      'burker': 'burger',
      'pomfrit': 'pommes',
      'koloa': 'cola'
    };

    let result = text;
    Object.entries(corrections).forEach(([wrong, correct]) => {
      result = result.replace(new RegExp(wrong, 'gi'), correct);
    });
    return result;
  }

  private calculatePatternStrength(match: RegExpMatchArray, fullText: string): number {
    const matchLength = match[0].length;
    const textLength = fullText.length;
    return Math.min(1, matchLength / textLength + 0.5);
  }

  private getIntentCategory(intentType: string): string {
    if (intentType.startsWith('order.')) return 'order';
    if (intentType.startsWith('menu.')) return 'inquiry';
    if (intentType.startsWith('price.')) return 'inquiry';
    if (intentType.startsWith('payment.')) return 'payment';
    if (intentType.startsWith('greeting.') || intentType.startsWith('farewell.')) return 'social';
    return 'general';
  }

  private buildIntentDetectionPrompt(text: string, request: IntentParsingRequest, context: ConversationContext): string {
    return `
Analysiere die folgende Kundenäußerung in einem Schweizer Foodtruck:

Text: "${text}"
Sprache: ${request.language || 'de-CH'}
Kontext: ${context.lastIntent?.type || 'none'}

Mögliche Intents:
- order.create: Kunde möchte etwas bestellen
- menu.inquiry: Kunde fragt nach dem Menü
- price.inquiry: Kunde fragt nach Preisen
- order.modify: Kunde möchte Bestellung ändern
- payment.inquiry: Kunde fragt nach Bezahlung
- order.status: Kunde fragt nach Bestellstatus
- greeting.swiss: Schweizer Begrüßung
- farewell.swiss: Schweizer Verabschiedung

Antworte in folgendem JSON-Format:
{
  "intent_type": "order.create",
  "confidence": 0.85,
  "category": "order",
  "reasoning": ["Grund 1", "Grund 2"]
}`;
  }

  private getConversationContext(sessionId: string): ConversationContext {
    return this.conversationContexts.get(sessionId) || {
      sessionId,
      startedAt: new Date(),
      lastIntent: null,
      entities: [],
      orderInProgress: null
    };
  }

  private updateConversationContext(sessionId: string, intent: Intent, entities: Entity[]): void {
    const context = this.getConversationContext(sessionId);
    context.lastIntent = intent;
    context.entities = entities;
    this.conversationContexts.set(sessionId, context);
  }

  private findProducts(text: string, tenantId: string): any[] {
    // Vereinfachte Produktsuche
    const products = [];
    for (const [category, items] of Object.entries(this.SWISS_PRODUCT_ENTITIES)) {
      for (const item of items) {
        const regex = new RegExp(`\\b${item}\\b`, 'i');
        const match = text.match(regex);
        if (match) {
          products.push({
            id: `${category}_${item}`,
            name: item,
            category,
            confidence: 0.8,
            start: match.index!,
            end: match.index! + match[0].length,
            price: 16.90 // Placeholder
          });
        }
      }
    }
    return products;
  }

  private findQuantities(text: string): any[] {
    const quantities = [];

    // Numerische Quantitäten
    const numberRegex = /\b(\d+)\b/g;
    let match;
    while ((match = numberRegex.exec(text)) !== null) {
      quantities.push({
        value: parseInt(match[1]),
        confidence: 0.9,
        start: match.index,
        end: match.index + match[0].length
      });
    }

    // Wort-basierte Quantitäten
    for (const [word, value] of Object.entries(this.SWISS_QUANTITIES)) {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      const match = text.match(regex);
      if (match) {
        quantities.push({
          value,
          confidence: 0.8,
          start: match.index!,
          end: match.index! + match[0].length
        });
      }
    }

    return quantities;
  }

  private findModifiers(text: string): any[] {
    const modifiers = [];

    // "ohne" Modifiers
    const withoutPattern = /ohne\s+(\w+)/gi;
    let match;
    while ((match = withoutPattern.exec(text)) !== null) {
      modifiers.push({
        type: 'ingredient',
        value: match[1],
        operation: 'remove',
        confidence: 0.9,
        start: match.index,
        end: match.index + match[0].length
      });
    }

    // "mit extra" Modifiers
    const extraPattern = /mit\s+extra\s+(\w+)/gi;
    while ((match = extraPattern.exec(text)) !== null) {
      modifiers.push({
        type: 'ingredient',
        value: match[1],
        operation: 'add',
        confidence: 0.85,
        start: match.index,
        end: match.index + match[0].length
      });
    }

    return modifiers;
  }

  private findPaymentMethods(text: string): any[] {
    const methods = [];
    const paymentPatterns = {
      'twint': /twint/i,
      'card': /karte/i,
      'cash': /bar/i,
      'invoice': /rechnung/i
    };

    for (const [method, pattern] of Object.entries(paymentPatterns)) {
      const match = text.match(pattern);
      if (match) {
        methods.push({
          method,
          confidence: 0.9,
          start: match.index!,
          end: match.index! + match[0].length
        });
      }
    }

    return methods;
  }

  private needsClarification(intent: Intent, entities: Entity[]): boolean {
    // Prüfe ob Klarstellung nötig ist
    if (intent.type === 'order.create') {
      const products = entities.filter(e => e.type === 'product');
      return products.length === 0 || intent.confidence < 0.7;
    }

    return intent.confidence < 0.6;
  }

  private async generateSuggestedResponses(
    intent: Intent,
    entities: Entity[],
    request: IntentParsingRequest
  ): Promise<string[]> {
    const suggestions = [];

    if (intent.type === 'menu.inquiry') {
      suggestions.push(
        'Möchten Sie unsere Burger sehen?',
        'Interessieren Sie sich für Hauptgerichte oder Beilagen?'
      );
    }

    if (intent.type === 'order.create' && entities.length === 0) {
      suggestions.push(
        'Was darf es denn sein?',
        'Welches Produkt möchten Sie bestellen?'
      );
    }

    return suggestions;
  }

  private async logIntentParsing(request: IntentParsingRequest, response: IntentParsingResponse): Promise<void> {
    await this.db.collection('intent_parsings').add({
      tenantId: request.tenantId,
      originalText: request.text,
      detectedIntent: response.intent.type,
      confidence: response.confidence,
      entitiesCount: response.entities.length,
      parsedAt: new Date()
    });
  }
}
