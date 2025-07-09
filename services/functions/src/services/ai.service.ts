import * as admin from 'firebase-admin';
import OpenAI from 'openai';
import { logger } from 'firebase-functions';
import { 
  VoiceOrderResult,
  DynamicPricingResult,
  PredictionResult,
  ChatResponse,
  OrderItem
} from '@eatech/types';

interface VoiceOrderParams {
  audioBuffer: Buffer;
  language: string;
  truckId: string;
}

interface DynamicPricingParams {
  productId: string;
  truckId: string;
  basePrice: number;
  context: {
    currentTime: Date;
    dayOfWeek: string;
    currentCapacity: number;
    weather?: any;
    nearbyEvents?: string[];
    historicalSales?: any;
  };
}

interface ChatParams {
  message: string;
  context: {
    truckId: string;
    truckName: string;
    products: any[];
    language: string;
    customerHistory?: any;
  };
}

interface PredictionParams {
  truckId: string;
  type: 'inventory' | 'rushHour' | 'revenue' | 'maintenance';
  historicalDays: number;
}

export class AIService {
  private openai: OpenAI;
  private db = admin.firestore();
  
  // Swiss German phrases for voice recognition
  private readonly SWISS_GERMAN_HINTS = [
    'es Stück', 'zwöi', 'drü', 'vier', 'füüf',
    'Pommes Frites', 'Glace', 'Znüni', 'Zmittag',
    'ohni', 'mit', 'extra', 'wenig', 'viel',
    'Chuchichäschtli', 'Röschti', 'Cervelat'
  ];

  // Allergens list (14 EU allergens)
  private readonly ALLERGENS = [
    'gluten', 'crustaceans', 'eggs', 'fish', 'peanuts',
    'soybeans', 'milk', 'nuts', 'celery', 'mustard',
    'sesame', 'sulphites', 'lupin', 'molluscs'
  ];

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }

  /**
   * Process voice order (Swiss German support!)
   */
  async processVoiceOrder(params: VoiceOrderParams): Promise<VoiceOrderResult> {
    try {
      // 1. Transcribe audio using Whisper
      const transcription = await this.transcribeAudio(
        params.audioBuffer,
        params.language
      );

      // 2. Extract order intent using GPT-4
      const orderData = await this.extractOrderIntent(
        transcription.text,
        params.truckId,
        params.language
      );

      // 3. Validate against menu
      const validatedOrder = await this.validateOrderItems(
        orderData.items,
        params.truckId
      );

      // 4. Calculate confidence score
      const confidence = this.calculateConfidence(orderData.items);

      return {
        success: true,
        transcription: transcription.text,
        items: validatedOrder,
        specialRequests: orderData.specialRequests,
        language: orderData.language,
        confidence,
        needsConfirmation: confidence < 0.8
      };
    } catch (error) {
      logger.error('Failed to process voice order', { params, error });
      throw error;
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper
   */
  private async transcribeAudio(
    audioBuffer: Buffer,
    language: string
  ): Promise<any> {
    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('model', 'whisper-1');
    formData.append('language', language === 'de-CH' ? 'de' : language);
    
    // Add Swiss German context
    if (language === 'de-CH' || language === 'de') {
      formData.append(
        'prompt',
        `Schweizerdeutsche Bestellung im Food Truck. Mögliche Wörter: ${this.SWISS_GERMAN_HINTS.join(', ')}`
      );
    }

    const response = await this.openai.audio.transcriptions.create({
      file: audioBlob as any,
      model: 'whisper-1',
      language: language === 'de-CH' ? 'de' : language,
      prompt: language === 'de-CH' ? 'Schweizerdeutsche Bestellung' : undefined
    });

    return response;
  }

  /**
   * Extract order intent from transcription
   */
  private async extractOrderIntent(
    transcription: string,
    truckId: string,
    language: string
  ): Promise<any> {
    const products = await this.getTruckProducts(truckId);
    const productList = products.map(p => `${p.name.de}: ${p.description.de}`).join('\n');

    const systemPrompt = `Du bist ein Bestell-Assistent für einen Schweizer Food Truck.
    
    Verfügbare Produkte:
    ${productList}
    
    Extrahiere aus der Bestellung:
    - Produkte mit Menge
    - Modifikationen (ohne Zwiebeln, extra Käse, etc.)
    - Spezielle Wünsche (max 200 Zeichen)
    
    Schweizer Spezialitäten:
    - "es Stück" = ein Stück = 1
    - "zwöi" = zwei = 2
    - "drü" = drei = 3
    - "Pommes Frites" = Pommes
    - "Glace" = Eis
    - "ohni" = ohne
    - "mit" = mit
    - "extra" = extra
    
    Antworte im JSON Format:
    {
      "items": [
        {
          "product": "Exakter Produktname aus der Liste",
          "productId": "product_id",
          "quantity": 1,
          "modifications": ["ohne Zwiebeln"],
          "confidence": 0.95
        }
      ],
      "specialRequests": "Spezielle Wünsche hier",
      "language": "${language}",
      "ambiguities": ["Liste von unklaren Teilen"]
    }`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcription }
      ],
      temperature: 0.3, // Low temperature for accuracy
      response_format: { type: 'json_object' }
    });

    return JSON.parse(completion.choices[0].message.content!);
  }

  /**
   * Calculate dynamic pricing
   */
  async calculateDynamicPrice(params: DynamicPricingParams): Promise<DynamicPricingResult> {
    try {
      const prompt = `Analysiere folgende Faktoren für dynamische Preisgestaltung:
      
      Produkt: ${params.productId}
      Basispreis: CHF ${params.basePrice}
      
      Kontext:
      - Aktuelle Uhrzeit: ${params.context.currentTime}
      - Wochentag: ${params.context.dayOfWeek}
      - Auslastung: ${params.context.currentCapacity}%
      - Wetter: ${JSON.stringify(params.context.weather)}
      - Events in der Nähe: ${params.context.nearbyEvents?.join(', ')}
      - Historische Verkaufsdaten: ${JSON.stringify(params.context.historicalSales)}
      
      Regeln:
      1. Maximale Preisänderung: ±20%
      2. Psychologische Preise nutzen (.90, .50)
      3. Niemals auf volle Franken runden
      4. "Nur" vor Preisen bei Angeboten verwenden
      5. Rush Hour (12-13 Uhr werktags): +10-15%
      6. Schlechtes Wetter: -5% auf kalte Speisen
      7. Events in der Nähe: +15-20%
      8. Hohe Auslastung (>80%): +10%
      9. Niedrige Auslastung (<20%): -10%
      
      Gib zurück (JSON):
      {
        "recommendedPrice": 15.90,
        "reasoning": "Rush Hour + Event in der Nähe",
        "displayPrice": "Nur 15.90",
        "changePercentage": 10,
        "priceLevel": "premium",
        "suggestedUntil": "2024-08-01T14:00:00Z"
      }`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.5,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0].message.content!);

      // Log pricing decision
      await this.logPricingDecision(params.truckId, params.productId, result);

      return {
        originalPrice: params.basePrice,
        recommendedPrice: result.recommendedPrice,
        displayPrice: result.displayPrice,
        changePercentage: result.changePercentage,
        reasoning: result.reasoning,
        priceLevel: result.priceLevel,
        validUntil: new Date(result.suggestedUntil),
        autoApply: true // Feature flag würde das steuern
      };
    } catch (error) {
      logger.error('Failed to calculate dynamic price', { params, error });
      throw error;
    }
  }

  /**
   * Chat with customer for questions
   */
  async chatWithCustomer(params: ChatParams): Promise<ChatResponse> {
    try {
      const systemPrompt = `Du bist ein freundlicher Food Truck Assistent für ${params.context.truckName}.
      
      Du KANNST:
      - Fragen zu Allergenen beantworten (${this.ALLERGENS.join(', ')})
      - Ernährungsberatung geben
      - Produktempfehlungen machen basierend auf Präferenzen
      - Über Inhaltsstoffe informieren
      - Beschwerden entgegennehmen und weiterleiten
      
      Du KANNST NICHT:
      - Smalltalk über das Wetter führen
      - Persönliche Gespräche führen
      - Über andere Themen als Essen sprechen
      - Preise ändern oder Rabatte gewähren
      
      Verfügbare Produkte:
      ${params.context.products.map(p => 
        `${p.name[params.context.language]}: ${p.description[params.context.language]} 
         (Allergene: ${p.allergens.join(', ')})`
      ).join('\n')}
      
      Antworte kurz, präzise und freundlich auf ${params.context.language}.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: params.message }
        ],
        temperature: 0.7,
        max_tokens: 300
      });

      const response = completion.choices[0].message.content!;

      // Check if this is a complaint
      const isComplaint = await this.detectComplaint(params.message, response);
      
      if (isComplaint) {
        await this.createComplaintTicket(params.truckId, params.message, response);
      }

      // Check for allergen questions
      const allergenInfo = this.extractAllergenQuestions(params.message, params.context.products);

      return {
        message: response,
        isComplaint,
        allergenInfo,
        suggestedProducts: await this.getSuggestedProducts(params.message, params.context.products),
        confidence: 0.95
      };
    } catch (error) {
      logger.error('Failed to process chat', { params, error });
      throw error;
    }
  }

  /**
   * Generate predictions (inventory, rush hour, etc.)
   */
  async generatePredictions(params: PredictionParams): Promise<PredictionResult> {
    try {
      const historicalData = await this.getHistoricalData(
        params.truckId,
        params.historicalDays
      );

      const prompt = `Analysiere die Verkaufsdaten und erstelle Vorhersagen für einen Food Truck.
      
      Historische Daten (${params.historicalDays} Tage):
      ${JSON.stringify(historicalData, null, 2)}
      
      Erstelle Vorhersagen für: ${params.type}
      
      ${this.getPredictionPrompt(params.type)}
      
      Antworte im JSON Format.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.5,
        response_format: { type: 'json_object' }
      });

      const predictions = JSON.parse(completion.choices[0].message.content!);

      // Save predictions
      await this.savePredictions(params.truckId, params.type, predictions);

      return {
        type: params.type,
        predictions,
        confidence: this.calculatePredictionConfidence(historicalData),
        generatedAt: new Date(),
        basedOnDays: params.historicalDays
      };
    } catch (error) {
      logger.error('Failed to generate predictions', { params, error });
      throw error;
    }
  }

  /**
   * Get prediction-specific prompt
   */
  private getPredictionPrompt(type: string): string {
    switch (type) {
      case 'inventory':
        return `Für Inventar-Vorhersage:
        {
          "tomorrow": {
            "pommes": { "amount": "50", "unit": "kg", "reasoning": "Basierend auf Durchschnitt + 10% für Freitag" },
            "burgerPatties": { "amount": "200", "unit": "Stück", "reasoning": "..." },
            "drinks": { "cola": 100, "water": 80, "juice": 40 }
          },
          "nextWeek": {
            "totalExpected": 2500,
            "topProducts": ["Burger", "Pommes", "Cola"],
            "stockingSuggestions": ["Extra Burger-Brötchen für Event am Samstag"]
          }
        }`;

      case 'rushHour':
        return `Für Rush-Hour Vorhersage:
        {
          "patterns": [
            { "timeSlot": "12:00-13:00", "avgOrders": 45, "confidence": 0.92 },
            { "timeSlot": "18:00-19:00", "avgOrders": 35, "confidence": 0.88 }
          ],
          "tomorrow": {
            "expectedPeaks": ["12:15", "18:30"],
            "maxCapacity": 55,
            "recommendations": [
              "10 Burger vorproduzieren um 11:45",
              "Zusätzliche Person von 12-13 Uhr"
            ]
          },
          "weekPattern": {
            "monday": { "factor": 0.8, "peaks": ["12:00-13:00"] },
            "friday": { "factor": 1.3, "peaks": ["12:00-13:30", "17:30-19:00"] }
          }
        }`;

      case 'revenue':
        return `Für Umsatz-Vorhersage:
        {
          "tomorrow": {
            "expected": 2500,
            "min": 2100,
            "max": 2900,
            "factors": ["Freitag (+20%)", "Gutes Wetter (+10%)"]
          },
          "nextWeek": {
            "expected": 15000,
            "byDay": {
              "monday": 2000,
              "tuesday": 2200,
              "wednesday": 2100,
              "thursday": 2300,
              "friday": 3200,
              "saturday": 2800,
              "sunday": 400
            }
          },
          "monthlyTrend": "increasing",
          "growthRate": 0.15
        }`;

      case 'maintenance':
        return `Für Wartungs-Vorhersage:
        {
          "upcoming": [
            {
              "equipment": "Grill",
              "dueIn": "5 Tage",
              "reason": "1000 Burger seit letzter Wartung",
              "priority": "high",
              "estimatedDowntime": "2 Stunden"
            },
            {
              "equipment": "Fritteuse",
              "dueIn": "12 Tage",
              "reason": "Öl-Wechsel fällig",
              "priority": "medium",
              "estimatedDowntime": "30 Minuten"
            }
          ],
          "recommendations": [
            "Grill-Wartung am Sonntag durchführen (wenig Betrieb)",
            "Ersatz-Frittierfett bestellen"
          ]
        }`;

      default:
        return '';
    }
  }

  /**
   * Voice feedback processing
   */
  async processVoiceFeedback(
    audioBuffer: Buffer,
    orderId: string,
    language: string
  ): Promise<any> {
    try {
      // Transcribe feedback
      const transcription = await this.transcribeAudio(audioBuffer, language);

      // Analyze sentiment and extract insights
      const analysis = await this.analyzeFeedback(transcription.text, orderId);

      // Save feedback
      await this.saveFeedback(orderId, transcription.text, analysis);

      // If negative, create ticket
      if (analysis.sentiment === 'negative') {
        await this.createComplaintTicket(
          analysis.truckId,
          transcription.text,
          'Voice feedback'
        );
      }

      return {
        transcription: transcription.text,
        sentiment: analysis.sentiment,
        insights: analysis.insights,
        actionRequired: analysis.sentiment === 'negative'
      };
    } catch (error) {
      logger.error('Failed to process voice feedback', { orderId, error });
      throw error;
    }
  }

  /**
   * Analyze feedback for sentiment and insights
   */
  private async analyzeFeedback(feedback: string, orderId: string): Promise<any> {
    const prompt = `Analysiere dieses Kunden-Feedback nach dem Essen:
    
    Feedback: "${feedback}"
    
    Bestimme:
    1. Sentiment (positive/neutral/negative)
    2. Hauptthemen (Geschmack, Service, Wartezeit, etc.)
    3. Spezifische Verbesserungsvorschläge
    4. Bewertung (1-5 Sterne)
    
    JSON Format:
    {
      "sentiment": "positive",
      "rating": 4,
      "themes": ["taste", "portion_size"],
      "insights": ["Burger war sehr gut", "Pommes könnten knuspriger sein"],
      "improvements": ["Pommes länger frittieren"],
      "quotes": ["Der beste Burger den ich je hatte"]
    }`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'system', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const analysis = JSON.parse(completion.choices[0].message.content!);
    
    // Get truck ID from order
    const order = await this.getOrder(orderId);
    analysis.truckId = order.truckId;

    return analysis;
  }

  /**
   * Helper methods
   */
  private async validateOrderItems(
    items: any[],
    truckId: string
  ): Promise<OrderItem[]> {
    const products = await this.getTruckProducts(truckId);
    const validatedItems: OrderItem[] = [];

    for (const item of items) {
      const product = products.find(p => 
        p.name.de.toLowerCase() === item.product.toLowerCase() ||
        p.id === item.productId
      );

      if (product) {
        validatedItems.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          modifiers: item.modifications || [],
          price: product.price,
          specialInstructions: item.specialInstructions
        });
      }
    }

    return validatedItems;
  }

  private calculateConfidence(items: any[]): number {
    if (items.length === 0) return 0;
    
    const totalConfidence = items.reduce((sum, item) => sum + (item.confidence || 0), 0);
    return totalConfidence / items.length;
  }

  private async getTruckProducts(truckId: string): Promise<any[]> {
    const snapshot = await this.db
      .collection(`foodtrucks/${truckId}/products`)
      .where('available', '==', true)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  private async detectComplaint(message: string, response: string): Promise<boolean> {
    const complaintKeywords = [
      'beschwerde', 'schlecht', 'kalt', 'falsch', 'fehler',
      'unzufrieden', 'enttäuscht', 'eklig', 'vergessen'
    ];

    const messageLoer = message.toLowerCase();
    return complaintKeywords.some(keyword => messageLoer.includes(keyword));
  }

  private async createComplaintTicket(
    truckId: string,
    message: string,
    response: string
  ): Promise<void> {
    const ticket = {
      id: this.generateTicketId(),
      truckId,
      type: 'complaint',
      priority: 'high',
      message,
      aiResponse: response,
      status: 'open',
      createdAt: new Date(),
      assignedTo: ['truck', 'admin'] // KI entscheidet
    };

    await this.db.collection('tickets').doc(ticket.id).set(ticket);
  }

  private extractAllergenQuestions(message: string, products: any[]): any {
    const allergenKeywords = this.ALLERGENS.map(a => a.toLowerCase());
    const messageLoer = message.toLowerCase();
    
    const mentionedAllergens = allergenKeywords.filter(allergen => 
      messageLoer.includes(allergen)
    );

    if (mentionedAllergens.length === 0) return null;

    // Find products without these allergens
    const safeProducts = products.filter(product => 
      !mentionedAllergens.some(allergen => 
        product.allergens.includes(allergen)
      )
    );

    return {
      queriedAllergens: mentionedAllergens,
      safeProducts: safeProducts.map(p => p.name),
      productsToAvoid: products
        .filter(p => mentionedAllergens.some(a => p.allergens.includes(a)))
        .map(p => p.name)
    };
  }

  private async getSuggestedProducts(message: string, products: any[]): Promise<any[]> {
    // Simple keyword matching for suggestions
    const preferences = {
      vegetarian: ['vegetarisch', 'vegi', 'fleischlos'],
      spicy: ['scharf', 'würzig', 'hot'],
      light: ['leicht', 'salat', 'gesund'],
      hearty: ['deftig', 'sättigend', 'hunger']
    };

    const messageLoer = message.toLowerCase();
    const suggestions = [];

    for (const [type, keywords] of Object.entries(preferences)) {
      if (keywords.some(keyword => messageLoer.includes(keyword))) {
        // Filter products based on type
        const filtered = products.filter(p => {
          switch (type) {
            case 'vegetarian':
              return !p.allergens.includes('meat');
            case 'spicy':
              return p.description.de.toLowerCase().includes('scharf');
            case 'light':
              return p.category === 'salads' || p.calories < 400;
            case 'hearty':
              return p.category === 'mains' && p.calories > 600;
            default:
              return false;
          }
        });
        
        suggestions.push(...filtered.slice(0, 3));
      }
    }

    return suggestions;
  }

  private async getHistoricalData(truckId: string, days: number): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const ordersSnapshot = await this.db
      .collection(`foodtrucks/${truckId}/orders`)
      .where('createdAt', '>=', startDate)
      .get();

    const orders = ordersSnapshot.docs.map(doc => doc.data());

    // Aggregate data
    const dailyStats: Record<string, any> = {};
    const productStats: Record<string, number> = {};
    
    orders.forEach(order => {
      const date = order.createdAt.toDate().toISOString().split('T')[0];
      
      if (!dailyStats[date]) {
        dailyStats[date] = {
          orders: 0,
          revenue: 0,
          items: 0
        };
      }
      
      dailyStats[date].orders++;
      dailyStats[date].revenue += order.totalAmount;
      dailyStats[date].items += order.items.length;

      // Product stats
      order.items.forEach((item: any) => {
        productStats[item.productId] = (productStats[item.productId] || 0) + item.quantity;
      });
    });

    return {
      dailyStats,
      productStats,
      totalOrders: orders.length,
      averageOrderValue: orders.reduce((sum, o) => sum + o.totalAmount, 0) / orders.length,
      peakHours: this.calculatePeakHours(orders)
    };
  }

  private calculatePeakHours(orders: any[]): any {
    const hourlyOrders: Record<number, number> = {};
    
    orders.forEach(order => {
      const hour = order.createdAt.toDate().getHours();
      hourlyOrders[hour] = (hourlyOrders[hour] || 0) + 1;
    });

    return Object.entries(hourlyOrders)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        orders: count,
        percentage: (count / orders.length * 100).toFixed(1)
      }));
  }

  private calculatePredictionConfidence(historicalData: any): number {
    // More data = higher confidence
    const dataPoints = Object.keys(historicalData.dailyStats).length;
    
    if (dataPoints >= 30) return 0.95;
    if (dataPoints >= 14) return 0.85;
    if (dataPoints >= 7) return 0.70;
    return 0.50;
  }

  private async savePredictions(
    truckId: string,
    type: string,
    predictions: any
  ): Promise<void> {
    await this.db
      .collection(`foodtrucks/${truckId}/predictions`)
      .add({
        type,
        predictions,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });
  }

  private async logPricingDecision(
    truckId: string,
    productId: string,
    decision: any
  ): Promise<void> {
    await this.db.collection('pricing_decisions').add({
      truckId,
      productId,
      decision,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  private async saveFeedback(
    orderId: string,
    transcription: string,
    analysis: any
  ): Promise<void> {
    await this.db.collection('voice_feedback').add({
      orderId,
      transcription,
      analysis,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  private async getOrder(orderId: string): Promise<any> {
    // Search across all trucks (could be optimized)
    const trucksSnapshot = await this.db.collection('foodtrucks').get();
    
    for (const truckDoc of trucksSnapshot.docs) {
      const orderDoc = await this.db
        .collection(`foodtrucks/${truckDoc.id}/orders`)
        .doc(orderId)
        .get();
      
      if (orderDoc.exists) {
        return { id: orderDoc.id, truckId: truckDoc.id, ...orderDoc.data() };
      }
    }
    
    throw new Error('Order not found');
  }

  private generateTicketId(): string {
    return `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const aiService = new AIService();
