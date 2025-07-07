// ============================================================================
// EATECH V3.0 - COMPLETE AI INTEGRATION SERVICE
// ============================================================================
// File: /apps/web/src/services/aiService.js
// Type: OpenAI Integration for Swiss Foodtruck Operations
// Features: Voice processing, Menu recommendations, Customer supporrt
// ============================================================================

import OpenAI from 'openai';

// ============================================================================
// OPENAI CLIENT INITIALIZATION
// ============================================================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID || undefined,
});

// ============================================================================
// SWISS LANGUAGE CONFIGURATIONS
// ============================================================================

const SWISS_LANGUAGE_CONFIG = {
  'de-CH': {
    name: 'Schweizerdeutsch',
    greeting: 'Grüezi! Wie chan ich Ihhne helfe?',
    orderConfirm: 'Alles klar! Das mache mer gern für Sie.',
    error: 'Entschuldigung, das han ich nöd verstande. Chönd Sie das wiederhole?'
  },
  'de-DE': {
    name: 'Deutsch',
    greeting: 'Hallo! Wie kann ich Ihnen helfen?',
    orderConfirm: 'Alles klar! Das machen wir gerne für Sie.',
    error: 'Entschuldigung, das habe ich nicht verstanden. Können Sie das wiederholen?'
  },
  'fr-CH': {
    name: 'Français Suisse',
    greeting: 'Bonjour! Comment puis-je vous aider?',
    orderConfirm: 'Très bien! Nous ferons cela avec plaisir.',
    error: 'Désolé, je n\'ai pas compris. Pouvez-vous répéter?'
  },
  'it-CH': {
    name: 'Italiano Svizzero',
    greeting: 'Buongiorno! Come posso aiutarvi?',
    orderConfirm: 'Perfetto! Lo faremo volentieri per voi.',
    error: 'Scusate, non ho capito. Potete ripetere?'
  },
  'en-US': {
    name: 'English',
    greeting: 'Hello! How can I help you?',
    orderConfirm: 'Perfect! We\'ll gladly do that for you.',
    error: 'Sorry, I didn\'t understand that. Could you repeat?'
  }
};

// ============================================================================
// AI PROMPTS TEMPLATES
// ============================================================================

const PROMPTS = {
  voiceOrder: (transcript, menuItems, language = 'de-CH') => `
Du bist ein freundlicher AI-Assistent für einen Schweizer Foodtruck.
Sprache: ${SWISS_LANGUAGE_CONFIG[language]?.name || 'Schweizerdeutsch'}

Kunde sagte: "${transcript}"

Verfügbare Produkte:
${menuItems.map(item => `- ${item.name}: CHF ${item.price}${item.description ? ` (${item.description})` : ''}`).join('\n')}

Aufgabe:
1. Erkenne den Intent (bestellen/fragen/stornieren/beschweren)
2. Identifiziere gewünschte Produkte und Mengen
3. Erkenne Spezialwünsche oder Modifikationen
4. Antworte freundlich auf ${SWISS_LANGUAGE_CONFIG[language]?.name}

Antwort als JSON:
{
  "intent": "order|question|cancel|complaint|greeting",
  "confidence": 0.0-1.0,
  "products": [
    {
      "name": "Produktname",
      "quantity": Anzahl,
      "modifications": ["Liste der Änderungen"],
      "price": Preis
    }
  ],
  "response": "Freundliche Antwort auf ${SWISS_LANGUAGE_CONFIG[language]?.name}",
  "needsClarification": false,
  "suggestedActions": ["Liste von Aktionen"]
}
`,

  menuRecommendation: (preferences, weather, timeOfDay, language = 'de-CH') => `
Du bist ein kulinarischer Berater für einen Schweizer Foodtruck.
Sprache: ${SWISS_LANGUAGE_CONFIG[language]?.name}

Kundenpräferenzen: ${JSON.stringify(preferences)}
Wetter: ${weather}
Tageszeit: ${timeOfDay}

Empfehle 3 passende Gerichte mit Begründung.
Berücksichtige Schweizer Geschmack und saisonale Faktoren.
Antworte auf ${SWISS_LANGUAGE_CONFIG[language]?.name}.
`,

  customerSupport: (issue, orderHistory, language = 'de-CH') => `
Du bist Kundenservice für einen Schweizer Foodtruck.
Sprache: ${SWISS_LANGUAGE_CONFIG[language]?.name}

Problem: ${issue}
Bestellhistorie: ${JSON.stringify(orderHistory)}

Löse das Problem professionell und kundenfreundlich.
Biete konkrete Lösungen an.
Antworte auf ${SWISS_LANGUAGE_CONFIG[language]?.name}.
`
};

// ============================================================================
// MAIN AI SERVICE CLASS
// ============================================================================

export class EatechAIService {
  constructor(options = {}) {
    this.config = {
      model: options.model || 'gpt-3.5-turbo',
      temperature: options.temperature || 0.3,
      maxTokens: options.maxTokens || 500,
      language: options.language || 'de-CH',
      ...options
    };
    
    this.requestCount = 0;
    this.errorCount = 0;
  }

  // ============================================================================
  // VOICE ORDER PROCESSING
  // ============================================================================
  
  async processVoiceOrder(transcript, menuItems, options = {}) {
    try {
      this.requestCount++;
      
      const language = options.language || this.config.language;
      const prompt = PROMPTS.voiceOrder(transcript, menuItems, language);
      
      const response = await openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: `Du bist ein hilfsreicher AI-Assistent für einen Schweizer Foodtruck. Antworte immer auf ${language}.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });

      const result = JSON.parse(response.choices[0].message.content);
      
      // Fallback if parsing fails
      if (!result.intent) {
        throw new Error('Invalid AI response format');
      }
      
      return {
        success: true,
        ...result,
        usage: response.usage,
        model: this.config.model
      };
      
    } catch (error) {
      this.errorCount++;
      console.error('AI Voice Order Processing failed:', error);
      
      return this.getErrorFallback(transcript, options.language);
    }
  }

  // ============================================================================
  // MENU RECOMMENDATIONS
  // ============================================================================
  
  async getMenuRecommendations(customerData, contextData = {}, options = {}) {
    try {
      const language = options.language || this.config.language;
      const prompt = PROMPTS.menuRecommendation(
        customerData.preferences || {},
        contextData.weather || 'sonnig',
        contextData.timeOfDay || 'Mittag',
        language
      );

      const response = await openai.chat.completions.create({
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7, // More creative for recommendations
        max_tokens: 300,
      });

      return {
        success: true,
        recommendations: response.choices[0].message.content,
        language: language,
        usage: response.usage
      };
      
    } catch (error) {
      console.error('AI Menu Recommendations failed:', error);
      
      return {
        success: false,
        recommendations: SWISS_LANGUAGE_CONFIG[language]?.error || 'Error getting recommendations',
        error: error.message
      };
    }
  }

  // ============================================================================
  // CUSTOMER SUPPORT
  // ============================================================================
  
  async handleCustomerSupport(issue, customerData = {}, options = {}) {
    try {
      const language = options.language || this.config.language;
      const prompt = PROMPTS.customerSupport(
        issue,
        customerData.orderHistory || [],
        language
      );

      const response = await openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: `Du bist ein professioneller Kundenservice-Mitarbeiter für einen Schweizer Foodtruck. Sei hilfsbereit, verständnisvoll und lösungsorientiert.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 400,
      });

      return {
        success: true,
        response: response.choices[0].message.content,
        language: language,
        usage: response.usage
      };
      
    } catch (error) {
      console.error('AI Customer Support failed:', error);
      
      return {
        success: false,
        response: SWISS_LANGUAGE_CONFIG[language]?.error || 'Service temporarily unavailable',
        error: error.message
      };
    }
  }

  // ============================================================================
  // SMART PRICING SUGGESTIONS
  // ============================================================================
  
  async suggestPricing(productData, marketData, options = {}) {
    try {
      const prompt = `
Analysiere diese Produktdaten für Schweizer Foodtruck-Preisgestaltung:

Produkt: ${JSON.stringify(productData)}
Marktdaten: ${JSON.stringify(marketData)}

Berücksichtige:
- Schweizer Kaufkraft
- Foodtruck-Overhead
- Saisonale Faktoren
- Konkurrenzpreise

Empfehle optimalen Preis in CHF mit Begründung.
`;

      const response = await openai.chat.completions.create({
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2, // Very focused for pricing
        max_tokens: 200,
      });

      return {
        success: true,
        pricingSuggestion: response.choices[0].message.content,
        usage: response.usage
      };
      
    } catch (error) {
      console.error('AI Pricing Suggestion failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  getErrorFallback(transcript, language = 'de-CH') {
    const config = SWISS_LANGUAGE_CONFIG[language] || SWISS_LANGUAGE_CONFIG['de-CH'];
    
    return {
      success: false,
      intent: 'error',
      confidence: 0,
      products: [],
      response: config.error,
      needsClarification: true,
      suggestedActions: ['repeat', 'contact_staff'],
      fallback: true
    };
  }
  
  async testConnection() {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Sag hallo auf Schweizerdeutsch' }],
        max_tokens: 20
      });
      
      return {
        success: true,
        response: response.choices[0].message.content,
        usage: response.usage
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  getStats() {
    return {
      requests: this.requestCount,
      errors: this.errorCount,
      errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
      model: this.config.model
    };
  }
  
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

// ============================================================================
// SINGLETON INSTANCE & EXPORTS
// ============================================================================

// Create default instance
export const eatechAI = new EatechAIService();

// Test function for easy verification
export const testAI = async () => {
  console.log('Testing OpenAI connection...');
  const result = await eatechAI.testConnection();
  
  if (result.success) {
    console.log('✅ AI Service connected successfully');
    console.log('Response:', result.response);
  } else {
    console.error('❌ AI Service connection failed');
    console.error('Error:', result.error);
  }
  
  return result;
};

// Export class for custom instances
export default EatechAIService;