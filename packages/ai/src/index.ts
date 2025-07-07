/**
 * EATECH V3.0 - AI Package Index
 *
 * Hauptexport für alle AI Services und Funktionalitäten
 * Schweizer Multi-Tenant Foodtruck Bestellsystem
 *
 * @author Benedikt Thomma <benedikt@thomma.ch>
 * @version 3.0.0
 * @license PROPRIETARY
 */

// Core Services
export { CompetitorMonitor } from './services/competitor.monitor';
export { ContextAnalyzer } from './services/context.analyzer';
export { DemandForecaster } from './services/demand.forecaster';
export { EmergencyHandler } from './services/emergency.handler';
export { PricingOptimizer } from './services/pricing.optimizer';

// Prediction Services
export { DemandForecaster as PredictiveDemandForecaster } from './predictions/demand.forecaster';
export { RevenueProjector } from './predictions/revenue.projector';
export { WaitTimePredictor } from './predictions/wait.predictor';

// Voice Commerce
export { IntentParser } from './voice/intent.parser';
export { ResponseGenerator } from './voice/response.generator';
export { SpeechRecognizer } from './voice/speech.recognizer';

// Types
export * from './types/ai.types';

// Utils
export * from './utils/ai.utils';

// Config
export { aiConfig, getAIConfig, updateAIConfig } from './config/ai.config';

// Middleware
export { aiMiddleware, emergencyMiddleware, voiceMiddleware } from './middleware/ai.middleware';

/**
 * AI Package Version
 */
export const AI_PACKAGE_VERSION = '3.0.0';

/**
 * AI Package Info
 */
export const AI_PACKAGE_INFO = {
  name: '@eatech/ai',
  version: AI_PACKAGE_VERSION,
  description: 'AI Services für EATECH V3.0 Schweizer Foodtruck System',
  author: 'Benedikt Thomma',
  license: 'PROPRIETARY',
  compliance: {
    fadp: true,
    gdpr: true,
    swiss: true
  },
  languages: ['de-CH', 'fr-CH', 'it-CH', 'en-US'],
  features: [
    'emergency-detection',
    'price-optimization',
    'demand-forecasting',
    'voice-commerce',
    'context-analysis',
    'predictive-analytics'
  ]
};

/**
 * Hauptklasse für AI Package Initialisierung
 */
export class EatechAI {
  private emergencyHandler: EmergencyHandler;
  private pricingOptimizer: PricingOptimizer;
  private demandForecaster: DemandForecaster;
  private competitorMonitor: CompetitorMonitor;
  private contextAnalyzer: ContextAnalyzer;
  private speechRecognizer: SpeechRecognizer;
  private intentParser: IntentParser;
  private responseGenerator: ResponseGenerator;

  constructor(config?: Partial<typeof aiConfig>) {
    // Merge config
    if (config) {
      updateAIConfig(config);
    }

    // Initialize services
    this.emergencyHandler = new EmergencyHandler();
    this.pricingOptimizer = new PricingOptimizer();
    this.demandForecaster = new DemandForecaster();
    this.competitorMonitor = new CompetitorMonitor();
    this.contextAnalyzer = new ContextAnalyzer();
    this.speechRecognizer = new SpeechRecognizer();
    this.intentParser = new IntentParser();
    this.responseGenerator = new ResponseGenerator();
  }

  /**
   * Initialisiert alle AI Services
   */
  async initialize(): Promise<void> {
    try {
      console.log('🤖 Initializing EATECH AI Package v' + AI_PACKAGE_VERSION);

      // Initialize services parallel
      await Promise.all([
        this.emergencyHandler.initialize(),
        this.pricingOptimizer.initialize(),
        this.demandForecaster.initialize(),
        this.competitorMonitor.initialize(),
        this.contextAnalyzer.initialize(),
        this.speechRecognizer.initialize(),
        this.intentParser.initialize(),
        this.responseGenerator.initialize()
      ]);

      console.log('✅ EATECH AI Package initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize AI Package:', error);
      throw new Error(`AI Package initialization failed: ${error.message}`);
    }
  }

  /**
   * Gesundheitscheck für alle AI Services
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, boolean>;
    timestamp: string;
  }> {
    const services = {
      emergencyHandler: await this.emergencyHandler.healthCheck(),
      pricingOptimizer: await this.pricingOptimizer.healthCheck(),
      demandForecaster: await this.demandForecaster.healthCheck(),
      competitorMonitor: await this.competitorMonitor.healthCheck(),
      contextAnalyzer: await this.contextAnalyzer.healthCheck(),
      speechRecognizer: await this.speechRecognizer.healthCheck(),
      intentParser: await this.intentParser.healthCheck(),
      responseGenerator: await this.responseGenerator.healthCheck()
    };

    const healthyCount = Object.values(services).filter(Boolean).length;
    const totalCount = Object.keys(services).length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === totalCount) {
      status = 'healthy';
    } else if (healthyCount >= totalCount * 0.7) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      services,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Emergency Handler Getter
   */
  get emergency(): EmergencyHandler {
    return this.emergencyHandler;
  }

  /**
   * Pricing Optimizer Getter
   */
  get pricing(): PricingOptimizer {
    return this.pricingOptimizer;
  }

  /**
   * Demand Forecaster Getter
   */
  get demand(): DemandForecaster {
    return this.demandForecaster;
  }

  /**
   * Competitor Monitor Getter
   */
  get competitor(): CompetitorMonitor {
    return this.competitorMonitor;
  }

  /**
   * Context Analyzer Getter
   */
  get context(): ContextAnalyzer {
    return this.contextAnalyzer;
  }

  /**
   * Speech Recognizer Getter
   */
  get speech(): SpeechRecognizer {
    return this.speechRecognizer;
  }

  /**
   * Intent Parser Getter
   */
  get intent(): IntentParser {
    return this.intentParser;
  }

  /**
   * Response Generator Getter
   */
  get response(): ResponseGenerator {
    return this.responseGenerator;
  }

  /**
   * Shutdown aller Services
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down EATECH AI Package...');

    await Promise.all([
      this.emergencyHandler.shutdown(),
      this.pricingOptimizer.shutdown(),
      this.demandForecaster.shutdown(),
      this.competitorMonitor.shutdown(),
      this.contextAnalyzer.shutdown(),
      this.speechRecognizer.shutdown(),
      this.intentParser.shutdown(),
      this.responseGenerator.shutdown()
    ]);

    console.log('✅ EATECH AI Package shut down successfully');
  }
}

/**
 * Default AI Instance für einfache Nutzung
 */
export const ai = new EatechAI();

/**
 * Helper function für schnelle AI Initialisierung
 */
export async function initializeAI(config?: Partial<typeof aiConfig>): Promise<EatechAI> {
  const aiInstance = new EatechAI(config);
  await aiInstance.initialize();
  return aiInstance;
}

/**
 * Swiss AI Compliance Helper
 */
export const swissAICompliance = {
  /**
   * Prüft FADP Compliance für AI Verarbeitung
   */
  checkFADPCompliance(dataTypes: string[]): boolean {
    const sensitiveData = ['personal', 'biometric', 'location', 'payment'];
    return !dataTypes.some(type => sensitiveData.includes(type));
  },

  /**
   * Anonymisiert Daten für AI Training
   */
  anonymizeForAI(data: any): any {
    // Remove or hash sensitive fields
    const anonymized = { ...data };
    delete anonymized.email;
    delete anonymized.phone;
    delete anonymized.name;
    delete anonymized.address;

    if (anonymized.customerId) {
      anonymized.customerId = this.hashId(anonymized.customerId);
    }

    return anonymized;
  },

  /**
   * Hash ID für Anonymisierung
   */
  hashId(id: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(id).digest('hex').substring(0, 16);
  }
};

export default EatechAI;
