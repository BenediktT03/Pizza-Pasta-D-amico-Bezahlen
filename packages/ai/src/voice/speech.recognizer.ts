/**
 * Speech Recognizer
 *
 * Mehrsprachige Spracherkennung für Schweizer Foodtrucks
 * Unterstützt DE-CH, FR-CH, IT-CH, EN-US und Schweizerdeutsch
 *
 * @author Benedikt Thomma <benedikt@thomma.ch>
 */

import { SpeechClient } from '@google-cloud/speech';
import { getFirestore } from 'firebase-admin/firestore';
import {
  LanguageDetection,
  SpeechRecognitionRequest,
  SpeechRecognitionResponse,
  VoiceProfile
} from '../types/ai.types';
import {
  detectSwissDialect,
  getCurrentSwissTime,
  normalizeSwissGerman
} from '../utils/ai.utils';

export class SpeechRecognizer {
  private speechClient: SpeechClient;
  private db: FirebaseFirestore.Firestore;
  private recognitionCache: Map<string, SpeechRecognitionResponse> = new Map();
  private voiceProfiles: Map<string, VoiceProfile> = new Map();
  private dialectModels: Map<string, any> = new Map();

  // Schweizer Sprach-Konfigurationen
  private readonly SWISS_LANGUAGES = {
    'de-CH': {
      name: 'Swiss German',
      code: 'de-CH',
      alternatives: ['de-DE'],
      dialects: ['zurich', 'bern', 'basel', 'geneva']
    },
    'fr-CH': {
      name: 'Swiss French',
      code: 'fr-CH',
      alternatives: ['fr-FR'],
      dialects: ['geneva', 'lausanne', 'neuchatel']
    },
    'it-CH': {
      name: 'Swiss Italian',
      code: 'it-CH',
      alternatives: ['it-IT'],
      dialects: ['ticino']
    },
    'en-US': {
      name: 'English',
      code: 'en-US',
      alternatives: ['en-GB'],
      dialects: []
    }
  };

  // Schweizerdeutsch Wake Words
  private readonly WAKE_WORDS = [
    'hey eatech',
    'hallo eatech',
    'grüezi eatech',
    'salut eatech',
    'ciao eatech',
    'eatech'
  ];

  constructor() {
    this.speechClient = new SpeechClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE
    });
    this.db = getFirestore();
  }

  /**
   * Initialisiert den Speech Recognizer
   */
  async initialize(): Promise<void> {
    console.log('🎤 Initializing Speech Recognizer...');

    // Lade Schweizer Dialekt-Modelle
    await this.loadSwissDialectModels();

    // Lade Voice Profiles
    await this.loadVoiceProfiles();

    // Teste Google Cloud Speech API
    await this.testSpeechAPI();

    console.log('✅ Speech Recognizer initialized');
  }

  /**
   * Erkennt Sprache aus Audio-Input
   */
  async recognizeSpeech(request: SpeechRecognitionRequest): Promise<SpeechRecognitionResponse> {
    try {
      console.log(`🎤 Recognizing speech for tenant ${request.tenantId}`);

      // Validiere Audio-Input
      this.validateAudioInput(request.audioData);

      // Pre-Processing
      const processedAudio = await this.preprocessAudio(request.audioData, request.audioFormat);

      // Sprach-Erkennung
      const detectedLanguage = await this.detectLanguage(processedAudio);

      // Wake Word Detection
      const wakeWordDetected = await this.detectWakeWord(processedAudio, detectedLanguage);

      if (!wakeWordDetected && request.requireWakeWord) {
        return this.createNoWakeWordResponse(request);
      }

      // Haupt-Spracherkennung
      const recognitionResult = await this.performSpeechRecognition(
        processedAudio,
        detectedLanguage,
        request
      );

      // Post-Processing für Schweizerdeutsch
      const processedText = await this.postProcessSwissGerman(
        recognitionResult.transcript,
        detectedLanguage
      );

      // Voice Profile Analysis
      const voiceProfile = await this.analyzeVoiceProfile(
        processedAudio,
        request.customerId
      );

      const response: SpeechRecognitionResponse = {
        tenantId: request.tenantId,
        transcript: processedText,
        originalTranscript: recognitionResult.transcript,
        confidence: recognitionResult.confidence,
        language: detectedLanguage,
        wakeWordDetected,
        voiceProfile,
        audioMetrics: {
          duration: request.duration || 0,
          sampleRate: request.sampleRate || 16000,
          channels: request.channels || 1,
          format: request.audioFormat || 'wav'
        },
        processingTime: Date.now() - request.timestamp.getTime(),
        recognizedAt: getCurrentSwissTime()
      };

      // Speichere für Qualitätsverbesserung
      await this.logRecognition(request, response);

      return response;
    } catch (error) {
      console.error(`Speech recognition failed for ${request.tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Kontinuierliche Spracherkennung (Streaming)
   */
  async startStreamingRecognition(
    request: SpeechRecognitionRequest,
    onResult: (result: Partial<SpeechRecognitionResponse>) => void,
    onEnd: (finalResult: SpeechRecognitionResponse) => void
  ): Promise<void> {
    try {
      console.log(`🎤 Starting streaming recognition for tenant ${request.tenantId}`);

      // Konfiguriere Streaming
      const streamingConfig = {
        config: {
          encoding: this.mapAudioEncoding(request.audioFormat || 'wav'),
          sampleRateHertz: request.sampleRate || 16000,
          languageCode: request.preferredLanguage || 'de-CH',
          alternativeLanguageCodes: ['de-DE', 'fr-CH', 'it-CH', 'en-US'],
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: true,
          enableWordConfidence: true,
          maxAlternatives: 3,
          speechContexts: [{
            phrases: this.getFoodtruckPhrases(request.tenantId)
          }]
        },
        interimResults: true,
        enableVoiceActivityEvents: true
      };

      // Erstelle Streaming Request
      const recognizeStream = this.speechClient.streamingRecognize(streamingConfig);

      let finalTranscript = '';
      let isListening = true;

      // Handle Streaming Results
      recognizeStream.on('data', (data) => {
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          const transcript = result.alternatives?.[0]?.transcript || '';
          const confidence = result.alternatives?.[0]?.confidence || 0;
          const isFinal = result.isFinal;

          // Interim Result
          onResult({
            transcript,
            confidence,
            isFinal,
            language: request.preferredLanguage || 'de-CH'
          });

          if (isFinal) {
            finalTranscript += transcript + ' ';
          }
        }
      });

      // Handle Stream End
      recognizeStream.on('end', async () => {
        const finalResponse = await this.createFinalStreamingResponse(
          request,
          finalTranscript.trim()
        );
        onEnd(finalResponse);
      });

      // Handle Errors
      recognizeStream.on('error', (error) => {
        console.error('Streaming recognition error:', error);
        onEnd(this.createErrorResponse(request, error));
      });

      // Write Audio Data
      if (request.audioData) {
        recognizeStream.write(request.audioData);
        recognizeStream.end();
      }

    } catch (error) {
      console.error('Failed to start streaming recognition:', error);
      throw error;
    }
  }

  /**
   * Erkennt Wake Words
   */
  private async detectWakeWord(audioData: Buffer, language: LanguageDetection): Promise<boolean> {
    try {
      // Quick Transcription für Wake Word Detection
      const quickTranscript = await this.performQuickTranscription(audioData, language.code);

      // Normalisiere Text
      const normalizedText = quickTranscript.toLowerCase().trim();

      // Prüfe Wake Words
      for (const wakeWord of this.WAKE_WORDS) {
        if (normalizedText.includes(wakeWord.toLowerCase())) {
          console.log(`🎯 Wake word detected: ${wakeWord}`);
          return true;
        }
      }

      // Prüfe Schweizerdeutsche Varianten
      const swissVariants = this.getSwissWakeWordVariants(normalizedText);
      for (const variant of swissVariants) {
        if (normalizedText.includes(variant)) {
          console.log(`🎯 Swiss variant wake word detected: ${variant}`);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Wake word detection failed:', error);
      return false;
    }
  }

  /**
   * Erkennt Sprache automatisch
   */
  private async detectLanguage(audioData: Buffer): Promise<LanguageDetection> {
    try {
      // Multi-Language Detection Request
      const request = {
        config: {
          encoding: 'WEBM_OPUS' as const,
          sampleRateHertz: 16000,
          languageCode: 'de-CH', // Primary
          alternativeLanguageCodes: ['de-DE', 'fr-CH', 'it-CH', 'en-US']
        },
        audio: {
          content: audioData.toString('base64')
        }
      };

      const [response] = await this.speechClient.recognize(request);

      if (response.results && response.results.length > 0) {
        const result = response.results[0];
        const detectedLanguage = result.languageCode || 'de-CH';
        const confidence = result.alternatives?.[0]?.confidence || 0.5;

        // Spezielle Schweizerdeutsch-Erkennung
        const dialectInfo = await this.detectSwissDialect(
          result.alternatives?.[0]?.transcript || '',
          detectedLanguage
        );

        return {
          code: detectedLanguage,
          name: this.SWISS_LANGUAGES[detectedLanguage]?.name || 'Unknown',
          confidence,
          dialect: dialectInfo.dialect,
          dialectConfidence: dialectInfo.confidence
        };
      }

      // Fallback zu Default Language
      return {
        code: 'de-CH',
        name: 'Swiss German',
        confidence: 0.5,
        dialect: 'standard',
        dialectConfidence: 0.5
      };
    } catch (error) {
      console.error('Language detection failed:', error);
      return {
        code: 'de-CH',
        name: 'Swiss German',
        confidence: 0.3,
        dialect: 'unknown',
        dialectConfidence: 0.3
      };
    }
  }

  /**
   * Führt Haupt-Spracherkennung durch
   */
  private async performSpeechRecognition(
    audioData: Buffer,
    language: LanguageDetection,
    request: SpeechRecognitionRequest
  ): Promise<{ transcript: string; confidence: number }> {
    try {
      // Erweiterte Konfiguration für bessere Erkennung
      const recognitionConfig = {
        config: {
          encoding: this.mapAudioEncoding(request.audioFormat || 'wav'),
          sampleRateHertz: request.sampleRate || 16000,
          languageCode: language.code,
          alternativeLanguageCodes: this.getAlternativeLanguages(language.code),
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: true,
          enableWordConfidence: true,
          maxAlternatives: 5,

          // Foodtruck-spezifische Speech Contexts
          speechContexts: [{
            phrases: this.getFoodtruckPhrases(request.tenantId),
            boost: 20.0
          }],

          // Schweizerdeutsch-Anpassungen
          adaptation: language.dialect === 'zurich' ? {
            phraseSets: [{
              phrases: this.getZurichDialectPhrases()
            }]
          } : undefined
        },
        audio: {
          content: audioData.toString('base64')
        }
      };

      const [response] = await this.speechClient.recognize(recognitionConfig);

      if (response.results && response.results.length > 0) {
        const result = response.results[0];
        const alternatives = result.alternatives || [];

        if (alternatives.length > 0) {
          // Wähle beste Alternative
          const bestAlternative = this.selectBestAlternative(alternatives, language);

          return {
            transcript: bestAlternative.transcript || '',
            confidence: bestAlternative.confidence || 0
          };
        }
      }

      throw new Error('No recognition results');
    } catch (error) {
      console.error('Speech recognition failed:', error);
      throw error;
    }
  }

  /**
   * Post-Processing für Schweizerdeutsch
   */
  private async postProcessSwissGerman(transcript: string, language: LanguageDetection): Promise<string> {
    if (!transcript || !language.code.startsWith('de')) {
      return transcript;
    }

    try {
      // Normalisiere Schweizerdeutsche Ausdrücke
      let processed = normalizeSwissGerman(transcript);

      // Korrigiere häufige Erkennungsfehler
      processed = this.correctCommonRecognitionErrors(processed, language.dialect);

      // Foodtruck-spezifische Korrekturen
      processed = this.correctFoodtruckTerms(processed);

      return processed;
    } catch (error) {
      console.error('Swiss German post-processing failed:', error);
      return transcript;
    }
  }

  /**
   * Analysiert Voice Profile
   */
  private async analyzeVoiceProfile(audioData: Buffer, customerId?: string): Promise<VoiceProfile> {
    try {
      // Basic Voice Characteristics
      const characteristics = await this.extractVoiceCharacteristics(audioData);

      // Wenn Customer ID vorhanden, aktualisiere Profil
      if (customerId) {
        const existingProfile = this.voiceProfiles.get(customerId);
        if (existingProfile) {
          // Update existing profile
          return this.updateVoiceProfile(existingProfile, characteristics);
        }
      }

      // Erstelle neues Profil
      return {
        id: customerId || `anonymous_${Date.now()}`,
        characteristics,
        recognitionAccuracy: 0.8,
        preferredLanguage: 'de-CH',
        dialectPreference: 'standard',
        createdAt: new Date(),
        lastUsed: new Date()
      };
    } catch (error) {
      console.error('Voice profile analysis failed:', error);
      return this.getDefaultVoiceProfile();
    }
  }

  /**
   * Health Check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test Google Cloud Speech API
      await this.testSpeechAPI();

      await this.db.collection('_health').doc('ai_speech_recognizer').set({
        lastCheck: new Date(),
        service: 'speech-recognizer',
        voiceProfilesLoaded: this.voiceProfiles.size
      });
      return true;
    } catch (error) {
      console.error('Speech Recognizer health check failed:', error);
      return false;
    }
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    this.recognitionCache.clear();
    this.voiceProfiles.clear();
    this.dialectModels.clear();
    console.log('Speech Recognizer shut down');
  }

  // Helper Methods
  private validateAudioInput(audioData: Buffer): void {
    if (!audioData || audioData.length === 0) {
      throw new Error('Invalid audio data');
    }

    if (audioData.length > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('Audio data too large');
    }
  }

  private async preprocessAudio(audioData: Buffer, format: string): Promise<Buffer> {
    // Audio preprocessing (noise reduction, normalization, etc.)
    return audioData; // Simplified
  }

  private mapAudioEncoding(format: string): any {
    const mappings = {
      'wav': 'LINEAR16',
      'webm': 'WEBM_OPUS',
      'mp3': 'MP3',
      'flac': 'FLAC'
    };
    return mappings[format] || 'LINEAR16';
  }

  private getFoodtruckPhrases(tenantId: string): string[] {
    // Foodtruck-spezifische Begriffe für bessere Erkennung
    return [
      'burger', 'pommes', 'getränk', 'cola', 'bier',
      'bestellung', 'bestellen', 'möchte', 'hätte gern',
      'mit', 'ohne', 'extra', 'sauce', 'käse',
      'zahlen', 'bezahlen', 'twint', 'karte', 'bar',
      'abholen', 'mitnehmen', 'hier essen',
      'grüezi', 'danke', 'merci', 'au revoir',
      'chuchichäschtli' // Swiss German test phrase
    ];
  }

  private getAlternativeLanguages(primaryLanguage: string): string[] {
    const alternatives = this.SWISS_LANGUAGES[primaryLanguage]?.alternatives || [];
    return alternatives.filter(lang => lang !== primaryLanguage);
  }

  private selectBestAlternative(alternatives: any[], language: LanguageDetection): any {
    // Wähle beste Alternative basierend auf Confidence und Kontext
    return alternatives.reduce((best, current) =>
      (current.confidence || 0) > (best.confidence || 0) ? current : best
    );
  }

  private correctCommonRecognitionErrors(text: string, dialect?: string): string {
    // Häufige Schweizerdeutsche Erkennungsfehler korrigieren
    const corrections = {
      'grützi': 'grüezi',
      'merci vielmal': 'merci vilmal',
      'chuchichäschtli': 'chuchichäschtli',
      'rüebli': 'rüebli'
    };

    let corrected = text;
    for (const [wrong, right] of Object.entries(corrections)) {
      corrected = corrected.replace(new RegExp(wrong, 'gi'), right);
    }

    return corrected;
  }

  private correctFoodtruckTerms(text: string): string {
    // Foodtruck-spezifische Begriffe korrigieren
    const corrections = {
      'pomfrit': 'pommes frites',
      'burker': 'burger',
      'koloa': 'cola',
      'bier': 'bier'
    };

    let corrected = text;
    for (const [wrong, right] of Object.entries(corrections)) {
      corrected = corrected.replace(new RegExp(wrong, 'gi'), right);
    }

    return corrected;
  }

  private async loadSwissDialectModels(): Promise<void> {
    // Lade Schweizer Dialekt-Modelle
  }

  private async loadVoiceProfiles(): Promise<void> {
    // Lade Voice Profiles aus DB
  }

  private async testSpeechAPI(): Promise<void> {
    // Teste Google Cloud Speech API Verbindung
  }

  private createNoWakeWordResponse(request: SpeechRecognitionRequest): SpeechRecognitionResponse {
    return {
      tenantId: request.tenantId,
      transcript: '',
      originalTranscript: '',
      confidence: 0,
      language: { code: 'de-CH', name: 'Swiss German', confidence: 0 },
      wakeWordDetected: false,
      voiceProfile: this.getDefaultVoiceProfile(),
      audioMetrics: {
        duration: 0,
        sampleRate: 16000,
        channels: 1,
        format: 'wav'
      },
      processingTime: 0,
      recognizedAt: getCurrentSwissTime()
    };
  }

  private async performQuickTranscription(audioData: Buffer, languageCode: string): Promise<string> {
    // Schnelle Transkription für Wake Word Detection
    try {
      const request = {
        config: {
          encoding: 'WEBM_OPUS' as const,
          sampleRateHertz: 16000,
          languageCode
        },
        audio: {
          content: audioData.toString('base64')
        }
      };

      const [response] = await this.speechClient.recognize(request);
      return response.results?.[0]?.alternatives?.[0]?.transcript || '';
    } catch (error) {
      return '';
    }
  }

  private getSwissWakeWordVariants(text: string): string[] {
    // Schweizerdeutsche Wake Word Varianten
    return [
      'hoi eatech',
      'sali eatech',
      'äs eatech',
      'hallo zäme eatech'
    ];
  }

  private async detectSwissDialect(transcript: string, language: string): Promise<{ dialect: string; confidence: number }> {
    return detectSwissDialect(transcript);
  }

  private getZurichDialectPhrases(): string[] {
    return [
      'grüezi mitenand',
      'chuchichäschtli',
      'rüebli',
      'müesli'
    ];
  }

  private async extractVoiceCharacteristics(audioData: Buffer): Promise<any> {
    // Extrahiere Voice Characteristics
    return {
      pitch: 'medium',
      tone: 'neutral',
      speed: 'normal'
    };
  }

  private updateVoiceProfile(existing: VoiceProfile, newCharacteristics: any): VoiceProfile {
    return {
      ...existing,
      characteristics: { ...existing.characteristics, ...newCharacteristics },
      lastUsed: new Date()
    };
  }

  private getDefaultVoiceProfile(): VoiceProfile {
    return {
      id: 'default',
      characteristics: { pitch: 'medium', tone: 'neutral', speed: 'normal' },
      recognitionAccuracy: 0.7,
      preferredLanguage: 'de-CH',
      dialectPreference: 'standard',
      createdAt: new Date(),
      lastUsed: new Date()
    };
  }

  private async createFinalStreamingResponse(request: SpeechRecognitionRequest, transcript: string): Promise<SpeechRecognitionResponse> {
    return {
      tenantId: request.tenantId,
      transcript,
      originalTranscript: transcript,
      confidence: 0.8,
      language: { code: 'de-CH', name: 'Swiss German', confidence: 0.8 },
      wakeWordDetected: true,
      voiceProfile: this.getDefaultVoiceProfile(),
      audioMetrics: {
        duration: request.duration || 0,
        sampleRate: request.sampleRate || 16000,
        channels: request.channels || 1,
        format: request.audioFormat || 'wav'
      },
      processingTime: 0,
      recognizedAt: getCurrentSwissTime()
    };
  }

  private createErrorResponse(request: SpeechRecognitionRequest, error: any): SpeechRecognitionResponse {
    return {
      tenantId: request.tenantId,
      transcript: '',
      originalTranscript: '',
      confidence: 0,
      language: { code: 'de-CH', name: 'Swiss German', confidence: 0 },
      wakeWordDetected: false,
      voiceProfile: this.getDefaultVoiceProfile(),
      audioMetrics: {
        duration: 0,
        sampleRate: 16000,
        channels: 1,
        format: 'wav'
      },
      processingTime: 0,
      recognizedAt: getCurrentSwissTime(),
      error: error.message
    };
  }

  private async logRecognition(request: SpeechRecognitionRequest, response: SpeechRecognitionResponse): Promise<void> {
    await this.db.collection('speech_recognitions').add({
      tenantId: request.tenantId,
      transcript: response.transcript,
      confidence: response.confidence,
      language: response.language.code,
      wakeWordDetected: response.wakeWordDetected,
      processingTime: response.processingTime,
      recognizedAt: new Date()
    });
  }
}
