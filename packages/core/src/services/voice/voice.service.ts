import { 
  SpeechRecognitionResult,
  VoiceCommand,
  VoiceContext,
  VoiceLanguage,
  VoiceResponse,
  VoiceSession,
  VoiceSettings,
  ParsedOrder
} from './voice.types';
import { voiceParser } from './voice.parser';
import { AppError } from '../../utils/errors';

class VoiceService {
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  private activeSession: VoiceSession | null = null;
  private context: VoiceContext = {
    currentStep: 'greeting',
    previousCommands: [],
    language: VoiceLanguage.DE_CH,
    confidence: 0,
  };
  
  // Swiss German specific configurations
  private swissGermanVariants = {
    zurich: ['züri', 'zürich', 'zuri'],
    bern: ['bärn', 'bern'],
    basel: ['basel', 'baasle'],
    // Add more variants as needed
  };
  
  // Language models for different Swiss regions
  private languageModels = {
    [VoiceLanguage.DE_CH]: {
      greetings: ['grüezi', 'guete tag', 'hoi', 'sali', 'hallo'],
      thanks: ['merci', 'danke', 'merci vilmal', 'danke schön'],
      yes: ['ja', 'jo', 'genau', 'sicher', 'klar'],
      no: ['nei', 'nöd', 'nein', 'sicher nöd'],
      numbers: {
        'eis': 1, 'zwei': 2, 'zwöi': 2, 'drü': 3, 'drei': 3,
        'vier': 4, 'füf': 5, 'fünf': 5, 'sächs': 6, 'sechs': 6,
        'sibe': 7, 'siebe': 7, 'acht': 8, 'nün': 9, 'neun': 9,
        'zäh': 10, 'zehn': 10,
      },
    },
    [VoiceLanguage.DE]: {
      greetings: ['guten tag', 'hallo', 'guten morgen', 'guten abend'],
      thanks: ['danke', 'vielen dank', 'danke schön'],
      yes: ['ja', 'genau', 'richtig', 'korrekt'],
      no: ['nein', 'nicht', 'falsch'],
    },
    [VoiceLanguage.FR]: {
      greetings: ['bonjour', 'bonsoir', 'salut'],
      thanks: ['merci', 'merci beaucoup'],
      yes: ['oui', 'exactement', 'correct'],
      no: ['non', 'pas'],
    },
    [VoiceLanguage.IT]: {
      greetings: ['buongiorno', 'buonasera', 'ciao', 'salve'],
      thanks: ['grazie', 'grazie mille'],
      yes: ['sì', 'esatto', 'giusto'],
      no: ['no', 'non'],
    },
    [VoiceLanguage.EN]: {
      greetings: ['hello', 'hi', 'good morning', 'good evening'],
      thanks: ['thanks', 'thank you', 'thanks a lot'],
      yes: ['yes', 'yeah', 'correct', 'right'],
      no: ['no', 'not', 'wrong'],
    },
  };
  
  constructor() {
    this.initializeSpeechAPIs();
  }
  
  /**
   * Initialize Speech APIs
   */
  private initializeSpeechAPIs(): void {
    // Check for browser support
    if (typeof window !== 'undefined') {
      // Initialize Web Speech API
      const SpeechRecognition = (window as any).SpeechRecognition || 
                               (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.configureRecognition();
      }
      
      // Initialize Speech Synthesis
      if ('speechSynthesis' in window) {
        this.synthesis = window.speechSynthesis;
      }
    }
  }
  
  /**
   * Configure speech recognition
   */
  private configureRecognition(): void {
    if (!this.recognition) return;
    
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;
    
    // Set language based on context
    this.updateRecognitionLanguage();
    
    // Event handlers
    this.recognition.onresult = this.handleRecognitionResult.bind(this);
    this.recognition.onerror = this.handleRecognitionError.bind(this);
    this.recognition.onend = this.handleRecognitionEnd.bind(this);
  }
  
  /**
   * Start voice session
   */
  async startSession(settings: VoiceSettings): Promise<VoiceSession> {
    try {
      if (!this.recognition) {
        throw new AppError(
          'Speech recognition not supported',
          'VOICE_NOT_SUPPORTED',
          400
        );
      }
      
      // Create new session
      this.activeSession = {
        id: this.generateSessionId(),
        startedAt: new Date(),
        language: settings.language,
        tenantId: settings.tenantId,
        userId: settings.userId,
        status: 'active',
        commands: [],
        currentOrder: null,
      };
      
      // Update context
      this.context = {
        currentStep: 'greeting',
        previousCommands: [],
        language: settings.language,
        confidence: 0,
      };
      
      // Configure for selected language
      this.updateRecognitionLanguage();
      
      // Start recognition
      this.recognition.start();
      
      // Greet the user
      await this.speak(this.getGreeting(settings.language));
      
      return this.activeSession;
    } catch (error) {
      console.error('Error starting voice session:', error);
      throw error;
    }
  }
  
  /**
   * Stop voice session
   */
  async stopSession(): Promise<void> {
    if (this.recognition) {
      this.recognition.stop();
    }
    
    if (this.activeSession) {
      this.activeSession.status = 'completed';
      this.activeSession.endedAt = new Date();
    }
    
    this.activeSession = null;
  }
  
  /**
   * Process voice command
   */
  async processCommand(transcript: string): Promise<VoiceResponse> {
    try {
      if (!this.activeSession) {
        throw new AppError('No active session', 'NO_ACTIVE_SESSION', 400);
      }
      
      // Parse the command
      const command: VoiceCommand = {
        id: this.generateCommandId(),
        sessionId: this.activeSession.id,
        transcript,
        intent: await this.detectIntent(transcript),
        entities: await this.extractEntities(transcript),
        confidence: this.context.confidence,
        language: this.context.language,
        timestamp: new Date(),
      };
      
      // Add to session history
      this.activeSession.commands.push(command);
      this.context.previousCommands.push(command);
      
      // Process based on intent
      const response = await this.handleIntent(command);
      
      // Speak the response
      if (response.speak) {
        await this.speak(response.text);
      }
      
      return response;
    } catch (error) {
      console.error('Error processing command:', error);
      throw error;
    }
  }
  
  /**
   * Handle speech recognition result
   */
  private async handleRecognitionResult(event: any): Promise<void> {
    const results = event.results;
    const latestResult = results[results.length - 1];
    
    if (latestResult.isFinal) {
      const transcript = latestResult[0].transcript;
      const confidence = latestResult[0].confidence || 0.5;
      
      this.context.confidence = confidence;
      
      // Process the command
      await this.processCommand(transcript);
    }
  }
  
  /**
   * Handle recognition error
   */
  private handleRecognitionError(event: any): void {
    console.error('Speech recognition error:', event.error);
    
    // Handle specific errors
    switch (event.error) {
      case 'no-speech':
        this.speak(this.getPhrase('no_speech_detected'));
        break;
      case 'not-allowed':
        this.speak(this.getPhrase('microphone_access_denied'));
        break;
      default:
        this.speak(this.getPhrase('recognition_error'));
    }
  }
  
  /**
   * Handle recognition end
   */
  private handleRecognitionEnd(): void {
    // Restart if session is still active
    if (this.activeSession && this.activeSession.status === 'active') {
      setTimeout(() => {
        if (this.recognition && this.activeSession?.status === 'active') {
          this.recognition.start();
        }
      }, 100);
    }
  }
  
  /**
   * Detect intent from transcript
   */
  private async detectIntent(transcript: string): Promise<string> {
    const normalizedText = transcript.toLowerCase().trim();
    
    // Check for greetings
    const greetings = this.languageModels[this.context.language].greetings;
    if (greetings.some(g => normalizedText.includes(g))) {
      return 'greeting';
    }
    
    // Check for order-related keywords
    const orderKeywords = {
      [VoiceLanguage.DE_CH]: ['ich möcht', 'ich hätt gern', 'bitte', 'bestelle'],
      [VoiceLanguage.DE]: ['ich möchte', 'ich hätte gern', 'bitte', 'bestellen'],
      [VoiceLanguage.FR]: ['je voudrais', 'je prends', 's\'il vous plaît'],
      [VoiceLanguage.IT]: ['vorrei', 'prendo', 'per favore'],
      [VoiceLanguage.EN]: ['i would like', 'i want', 'please', 'order'],
    };
    
    const keywords = orderKeywords[this.context.language] || orderKeywords[VoiceLanguage.DE];
    if (keywords.some(k => normalizedText.includes(k))) {
      return 'order';
    }
    
    // Check for confirmation
    const yesWords = this.languageModels[this.context.language].yes;
    if (yesWords.some(y => normalizedText.includes(y))) {
      return 'confirm';
    }
    
    // Check for negation
    const noWords = this.languageModels[this.context.language].no;
    if (noWords.some(n => normalizedText.includes(n))) {
      return 'deny';
    }
    
    // Check for quantity changes
    if (/\d+/.test(normalizedText) || this.containsNumber(normalizedText)) {
      return 'quantity';
    }
    
    // Check for completion
    if (normalizedText.includes('fertig') || normalizedText.includes('das wärs') ||
        normalizedText.includes('finished') || normalizedText.includes('that\'s all')) {
      return 'complete';
    }
    
    // Default to unknown
    return 'unknown';
  }
  
  /**
   * Extract entities from transcript
   */
  private async extractEntities(transcript: string): Promise<any> {
    const entities: any = {};
    
    // Use the voice parser for detailed parsing
    const parsed = voiceParser.parseOrder(transcript, this.context.language);
    
    if (parsed.items.length > 0) {
      entities.items = parsed.items;
    }
    
    if (parsed.modifications.length > 0) {
      entities.modifications = parsed.modifications;
    }
    
    // Extract numbers
    const numbers = this.extractNumbers(transcript);
    if (numbers.length > 0) {
      entities.quantities = numbers;
    }
    
    return entities;
  }
  
  /**
   * Handle different intents
   */
  private async handleIntent(command: VoiceCommand): Promise<VoiceResponse> {
    switch (command.intent) {
      case 'greeting':
        return this.handleGreeting();
      
      case 'order':
        return this.handleOrder(command);
      
      case 'confirm':
        return this.handleConfirmation();
      
      case 'deny':
        return this.handleDenial();
      
      case 'quantity':
        return this.handleQuantity(command);
      
      case 'complete':
        return this.handleCompletion();
      
      default:
        return this.handleUnknown();
    }
  }
  
  /**
   * Handle greeting intent
   */
  private handleGreeting(): VoiceResponse {
    this.context.currentStep = 'order';
    
    return {
      text: this.getPhrase('how_can_i_help'),
      speak: true,
      action: 'continue',
    };
  }
  
  /**
   * Handle order intent
   */
  private handleOrder(command: VoiceCommand): VoiceResponse {
    if (!command.entities.items || command.entities.items.length === 0) {
      return {
        text: this.getPhrase('didnt_understand_order'),
        speak: true,
        action: 'retry',
      };
    }
    
    // Add items to current order
    if (!this.activeSession!.currentOrder) {
      this.activeSession!.currentOrder = {
        items: [],
        total: 0,
      };
    }
    
    this.activeSession!.currentOrder.items.push(...command.entities.items);
    
    // Confirm the items
    const itemsList = command.entities.items
      .map((item: any) => `${item.quantity} ${item.name}`)
      .join(', ');
    
    this.context.currentStep = 'confirm_items';
    
    return {
      text: this.getPhrase('confirm_order', { items: itemsList }),
      speak: true,
      action: 'confirm',
      data: { items: command.entities.items },
    };
  }
  
  /**
   * Handle confirmation
   */
  private handleConfirmation(): VoiceResponse {
    switch (this.context.currentStep) {
      case 'confirm_items':
        this.context.currentStep = 'ask_more';
        return {
          text: this.getPhrase('anything_else'),
          speak: true,
          action: 'continue',
        };
      
      case 'confirm_complete':
        return {
          text: this.getPhrase('order_confirmed'),
          speak: true,
          action: 'complete',
          data: { order: this.activeSession!.currentOrder },
        };
      
      default:
        return this.handleUnknown();
    }
  }
  
  /**
   * Handle denial
   */
  private handleDenial(): VoiceResponse {
    switch (this.context.currentStep) {
      case 'confirm_items':
        // Clear the last items
        this.context.currentStep = 'order';
        return {
          text: this.getPhrase('lets_try_again'),
          speak: true,
          action: 'retry',
        };
      
      case 'ask_more':
        // Proceed to completion
        this.context.currentStep = 'confirm_complete';
        return this.summarizeOrder();
      
      default:
        return this.handleUnknown();
    }
  }
  
  /**
   * Handle quantity modification
   */
  private handleQuantity(command: VoiceCommand): VoiceResponse {
    const quantities = command.entities.quantities || [];
    
    if (quantities.length === 0) {
      return {
        text: this.getPhrase('specify_quantity'),
        speak: true,
        action: 'retry',
      };
    }
    
    // Update last item quantity
    if (this.activeSession!.currentOrder && 
        this.activeSession!.currentOrder.items.length > 0) {
      const lastItem = this.activeSession!.currentOrder.items[
        this.activeSession!.currentOrder.items.length - 1
      ];
      lastItem.quantity = quantities[0];
      
      return {
        text: this.getPhrase('quantity_updated', { 
          quantity: quantities[0], 
          item: lastItem.name 
        }),
        speak: true,
        action: 'continue',
      };
    }
    
    return this.handleUnknown();
  }
  
  /**
   * Handle order completion
   */
  private handleCompletion(): VoiceResponse {
    this.context.currentStep = 'confirm_complete';
    return this.summarizeOrder();
  }
  
  /**
   * Handle unknown intent
   */
  private handleUnknown(): VoiceResponse {
    return {
      text: this.getPhrase('didnt_understand'),
      speak: true,
      action: 'retry',
    };
  }
  
  /**
   * Summarize the current order
   */
  private summarizeOrder(): VoiceResponse {
    if (!this.activeSession!.currentOrder || 
        this.activeSession!.currentOrder.items.length === 0) {
      return {
        text: this.getPhrase('no_items_ordered'),
        speak: true,
        action: 'retry',
      };
    }
    
    const summary = this.activeSession!.currentOrder.items
      .map((item: any) => `${item.quantity} ${item.name}`)
      .join(', ');
    
    return {
      text: this.getPhrase('order_summary', { summary }),
      speak: true,
      action: 'confirm',
      data: { order: this.activeSession!.currentOrder },
    };
  }
  
  /**
   * Text-to-speech
   */
  private async speak(text: string): Promise<void> {
    if (!this.synthesis) return;
    
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set voice based on language
      const voices = this.synthesis!.getVoices();
      const voice = this.findBestVoice(voices, this.context.language);
      
      if (voice) {
        utterance.voice = voice;
      }
      
      utterance.lang = this.getLanguageCode(this.context.language);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      utterance.onend = () => resolve();
      
      this.synthesis!.speak(utterance);
    });
  }
  
  /**
   * Find best voice for language
   */
  private findBestVoice(voices: SpeechSynthesisVoice[], language: VoiceLanguage): SpeechSynthesisVoice | null {
    const langCode = this.getLanguageCode(language);
    
    // First try to find exact match
    let voice = voices.find(v => v.lang === langCode);
    
    // If not found, try to find by language prefix
    if (!voice) {
      const prefix = langCode.split('-')[0];
      voice = voices.find(v => v.lang.startsWith(prefix));
    }
    
    return voice || null;
  }
  
  /**
   * Get language code for speech APIs
   */
  private getLanguageCode(language: VoiceLanguage): string {
    const codes = {
      [VoiceLanguage.DE_CH]: 'de-CH',
      [VoiceLanguage.DE]: 'de-DE',
      [VoiceLanguage.FR]: 'fr-CH',
      [VoiceLanguage.IT]: 'it-CH',
      [VoiceLanguage.EN]: 'en-US',
    };
    
    return codes[language] || 'de-CH';
  }
  
  /**
   * Update recognition language
   */
  private updateRecognitionLanguage(): void {
    if (this.recognition) {
      this.recognition.lang = this.getLanguageCode(this.context.language);
    }
  }
  
  /**
   * Get greeting based on language
   */
  private getGreeting(language: VoiceLanguage): string {
    const greetings = {
      [VoiceLanguage.DE_CH]: 'Grüezi! Was darf ich Ihnen bringen?',
      [VoiceLanguage.DE]: 'Guten Tag! Was darf ich Ihnen bringen?',
      [VoiceLanguage.FR]: 'Bonjour! Que puis-je vous servir?',
      [VoiceLanguage.IT]: 'Buongiorno! Cosa posso servirle?',
      [VoiceLanguage.EN]: 'Hello! What can I get for you?',
    };
    
    return greetings[language] || greetings[VoiceLanguage.DE_CH];
  }
  
  /**
   * Get phrase based on key and language
   */
  private getPhrase(key: string, params?: any): string {
    const phrases: any = {
      [VoiceLanguage.DE_CH]: {
        how_can_i_help: 'Was dörf ich Ihne bringe?',
        didnt_understand: 'Entschuldigung, das han ich nöd verstande. Chönd Sie das bitte nomal säge?',
        didnt_understand_order: 'Ich ha Ihri Bestellig nöd verstande. Was möchted Sie gern?',
        confirm_order: `Sie händ ${params?.items} bestellt. Stimmt das?`,
        anything_else: 'Gern gscheh! Dörf\'s no öppis sii?',
        order_confirmed: 'Ihre Bestellig isch bestätigt. Vielen Dank!',
        lets_try_again: 'Kei Problem, probiere mers nomal. Was möchted Sie?',
        specify_quantity: 'Wieviel möchted Sie devo?',
        quantity_updated: `Guet, ${params?.quantity} ${params?.item}.`,
        no_items_ordered: 'Sie händ no nüt bestellt. Was dörf ich Ihne bringe?',
        order_summary: `Sie händ bestellt: ${params?.summary}. Isch das richtig?`,
        no_speech_detected: 'Ich ha nüt ghört. Chönd Sie bitte öppis säge?',
        microphone_access_denied: 'Ich bruche Zuegriff uf Ihres Mikrofon zum Bestellige ufneh.',
        recognition_error: 'Es het en Fehler geh. Bitte probiere Sie\'s nomal.',
      },
      // Add other languages...
    };
    
    const langPhrases = phrases[this.context.language] || phrases[VoiceLanguage.DE_CH];
    return langPhrases[key] || key;
  }
  
  /**
   * Check if transcript contains a number word
   */
  private containsNumber(transcript: string): boolean {
    const numberWords = this.languageModels[this.context.language].numbers || {};
    const normalizedText = transcript.toLowerCase();
    
    return Object.keys(numberWords).some(word => normalizedText.includes(word));
  }
  
  /**
   * Extract numbers from transcript
   */
  private extractNumbers(transcript: string): number[] {
    const numbers: number[] = [];
    const normalizedText = transcript.toLowerCase();
    
    // Extract digit numbers
    const digitMatches = normalizedText.match(/\d+/g);
    if (digitMatches) {
      numbers.push(...digitMatches.map(n => parseInt(n, 10)));
    }
    
    // Extract word numbers
    const numberWords = this.languageModels[this.context.language].numbers || {};
    for (const [word, value] of Object.entries(numberWords)) {
      if (normalizedText.includes(word)) {
        numbers.push(value as number);
      }
    }
    
    return numbers;
  }
  
  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Generate command ID
   */
  private generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get current session
   */
  getActiveSession(): VoiceSession | null {
    return this.activeSession;
  }
  
  /**
   * Get session statistics
   */
  getSessionStats(): any {
    if (!this.activeSession) return null;
    
    return {
      duration: this.activeSession.endedAt 
        ? this.activeSession.endedAt.getTime() - this.activeSession.startedAt.getTime()
        : Date.now() - this.activeSession.startedAt.getTime(),
      commandCount: this.activeSession.commands.length,
      itemCount: this.activeSession.currentOrder?.items.length || 0,
      language: this.activeSession.language,
      confidence: this.context.confidence,
    };
  }
}

// Export singleton instance
export const voiceService = new VoiceService();
