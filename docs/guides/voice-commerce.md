# 🎙️ Voice Commerce Implementation Guide

## Overview

EATECH's voice commerce feature enables customers to place orders using natural speech in Swiss German, Standard German, French, and Italian. This guide covers implementation, best practices, and troubleshooting for voice-enabled ordering.

## Architecture

```
┌─────────────────────────────────────────┐
│         User speaks command             │
│    "Ich möcht es Pizza Margherita"     │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│       Web Speech API / Native API       │
│         (Speech Recognition)            │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│        Voice Processing Service         │
│   (Language Detection & Normalization)  │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         NLP & Intent Recognition        │
│      (Extract products, quantities)     │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Order Validation                │
│    (Check availability, pricing)        │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      Response Generation                │
│   (Confirm order in user's language)    │
└─────────────────────────────────────────┘
```

## Implementation

### 1. Browser Speech Recognition

#### Setup Speech Recognition

```typescript
// packages/core/src/services/voice/speech-recognition.ts
export class SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  
  constructor() {
    this.initializeRecognition();
  }
  
  private initializeRecognition() {
    const SpeechRecognition = 
      window.SpeechRecognition || 
      window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported');
      return;
    }
    
    this.recognition = new SpeechRecognition();
    this.configureRecognition();
  }
  
  private configureRecognition() {
    if (!this.recognition) return;
    
    // Configuration for Swiss market
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;
    
    // Default to Swiss German
    this.recognition.lang = 'de-CH';
    
    this.setupEventHandlers();
  }
  
  private setupEventHandlers() {
    if (!this.recognition) return;
    
    this.recognition.onstart = () => {
      this.isListening = true;
      this.onStateChange?.(true);
    };
    
    this.recognition.onend = () => {
      this.isListening = false;
      this.onStateChange?.(false);
    };
    
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.handleError(event.error);
    };
    
    this.recognition.onresult = (event) => {
      this.processResults(event.results);
    };
  }
  
  private processResults(results: SpeechRecognitionResultList) {
    const lastResult = results[results.length - 1];
    
    // Get all alternatives with confidence scores
    const alternatives = Array.from(lastResult).map(alt => ({
      transcript: alt.transcript,
      confidence: alt.confidence,
    }));
    
    // Process the best result
    const bestResult = alternatives[0];
    
    if (lastResult.isFinal) {
      this.onFinalResult?.(bestResult, alternatives);
    } else {
      this.onInterimResult?.(bestResult);
    }
  }
  
  // Public methods
  async start(language: 'de-CH' | 'de-DE' | 'fr-CH' | 'it-CH' = 'de-CH') {
    if (!this.recognition) {
      throw new Error('Speech recognition not supported');
    }
    
    if (this.isListening) {
      return;
    }
    
    // Request microphone permission
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      throw new Error('Microphone access denied');
    }
    
    this.recognition.lang = language;
    this.recognition.start();
  }
  
  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }
  
  // Event handlers (to be set by consumer)
  onStateChange?: (isListening: boolean) => void;
  onInterimResult?: (result: SpeechResult) => void;
  onFinalResult?: (result: SpeechResult, alternatives: SpeechResult[]) => void;
  onError?: (error: string) => void;
  
  private handleError(error: string) {
    const errorMessages: Record<string, string> = {
      'no-speech': 'Keine Sprache erkannt. Bitte versuchen Sie es erneut.',
      'audio-capture': 'Mikrofon nicht verfügbar.',
      'not-allowed': 'Mikrofonzugriff verweigert.',
      'network': 'Netzwerkfehler. Bitte überprüfen Sie Ihre Verbindung.',
    };
    
    this.onError?.(errorMessages[error] || 'Ein Fehler ist aufgetreten.');
  }
}
```

### 2. Voice Command Processing

#### Natural Language Understanding

```typescript
// packages/core/src/services/voice/nlp-processor.ts
import { normalizeSwissGerman } from './swiss-german-normalizer';
import { extractEntities } from './entity-extractor';

export interface VoiceCommand {
  intent: VoiceIntent;
  entities: CommandEntity[];
  confidence: number;
  language: string;
  originalText: string;
  normalizedText: string;
}

export enum VoiceIntent {
  ORDER_ITEM = 'ORDER_ITEM',
  MODIFY_ITEM = 'MODIFY_ITEM',
  REMOVE_ITEM = 'REMOVE_ITEM',
  VIEW_CART = 'VIEW_CART',
  CHECKOUT = 'CHECKOUT',
  HELP = 'HELP',
  UNKNOWN = 'UNKNOWN',
}

export interface CommandEntity {
  type: 'product' | 'quantity' | 'modifier' | 'action';
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export class NLPProcessor {
  private intents = new Map<RegExp, VoiceIntent>();
  
  constructor() {
    this.initializeIntents();
  }
  
  private initializeIntents() {
    // Swiss German patterns
    this.intents.set(
      /\b(ich möcht|ich hätt gern|gib mer|bring mer)\b/i,
      VoiceIntent.ORDER_ITEM
    );
    
    // Standard German patterns
    this.intents.set(
      /\b(ich möchte|ich hätte gern|bitte|bestellen)\b/i,
      VoiceIntent.ORDER_ITEM
    );
    
    // Modification patterns
    this.intents.set(
      /\b(ohne|mit extra|ändern|anpassen)\b/i,
      VoiceIntent.MODIFY_ITEM
    );
    
    // Removal patterns
    this.intents.set(
      /\b(entfernen|löschen|stornieren|weg)\b/i,
      VoiceIntent.REMOVE_ITEM
    );
    
    // Cart/Checkout patterns
    this.intents.set(
      /\b(warenkorb|zeigen|anzeigen|was hab ich)\b/i,
      VoiceIntent.VIEW_CART
    );
    
    this.intents.set(
      /\b(bezahlen|kasse|checkout|fertig|bestellen)\b/i,
      VoiceIntent.CHECKOUT
    );
  }
  
  async processCommand(
    transcript: string,
    language: string
  ): Promise<VoiceCommand> {
    // Normalize Swiss German variations
    const normalized = language === 'de-CH' 
      ? normalizeSwissGerman(transcript)
      : transcript.toLowerCase();
    
    // Detect intent
    const intent = this.detectIntent(normalized);
    
    // Extract entities
    const entities = await extractEntities(normalized, language);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(intent, entities);
    
    return {
      intent,
      entities,
      confidence,
      language,
      originalText: transcript,
      normalizedText: normalized,
    };
  }
  
  private detectIntent(text: string): VoiceIntent {
    for (const [pattern, intent] of this.intents) {
      if (pattern.test(text)) {
        return intent;
      }
    }
    return VoiceIntent.UNKNOWN;
  }
  
  private calculateConfidence(
    intent: VoiceIntent,
    entities: CommandEntity[]
  ): number {
    if (intent === VoiceIntent.UNKNOWN) return 0;
    
    // Base confidence from intent detection
    let confidence = 0.7;
    
    // Boost confidence if we found relevant entities
    if (entities.length > 0) {
      confidence += 0.1 * Math.min(entities.length, 3);
    }
    
    // Reduce confidence if no product found for order intent
    if (intent === VoiceIntent.ORDER_ITEM && 
        !entities.find(e => e.type === 'product')) {
      confidence *= 0.5;
    }
    
    return Math.min(confidence, 1);
  }
}
```

#### Swiss German Normalization

```typescript
// packages/core/src/services/voice/swiss-german-normalizer.ts
interface DialectMapping {
  pattern: RegExp;
  replacement: string;
}

const swissGermanMappings: DialectMapping[] = [
  // Common Swiss German to Standard German
  { pattern: /\bzmittag\b/gi, replacement: 'mittag' },
  { pattern: /\bznacht\b/gi, replacement: 'abendessen' },
  { pattern: /\bznüni\b/gi, replacement: 'frühstück' },
  { pattern: /\bzvieri\b/gi, replacement: 'nachmittag snack' },
  
  // Food specific
  { pattern: /\bchäs\b/gi, replacement: 'käse' },
  { pattern: /\bbröötli\b/gi, replacement: 'brötchen' },
  { pattern: /\bgipfeli\b/gi, replacement: 'croissant' },
  { pattern: /\bröschti\b/gi, replacement: 'rösti' },
  
  // Quantities
  { pattern: /\bes bitzli\b/gi, replacement: 'ein bisschen' },
  { pattern: /\be chli\b/gi, replacement: 'ein wenig' },
  { pattern: /\bvill\b/gi, replacement: 'viel' },
  
  // Common phrases
  { pattern: /\bmerci vilmal\b/gi, replacement: 'vielen dank' },
  { pattern: /\bgrüezi\b/gi, replacement: 'guten tag' },
  { pattern: /\baden\b/gi, replacement: 'tschüss' },
];

export function normalizeSwissGerman(text: string): string {
  let normalized = text.toLowerCase();
  
  // Apply mappings
  swissGermanMappings.forEach(({ pattern, replacement }) => {
    normalized = normalized.replace(pattern, replacement);
  });
  
  // Remove filler words common in Swiss German
  const fillerWords = ['jo', 'gäll', 'oder', 'weisch'];
  fillerWords.forEach(word => {
    normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
  });
  
  // Clean up extra spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

// Specific mappings for menu items
export const menuItemMappings: Record<string, string[]> = {
  'pizza margherita': [
    'margherita',
    'margarita',
    'margareta',
    'pizza mit tomaten und käse',
    'einfache pizza',
  ],
  'pizza prosciutto': [
    'prosciutto',
    'schinken pizza',
    'pizza mit schinke',
    'schinkenpizza',
  ],
  'rösti': [
    'röschti',
    'rööschti',
    'kartoffel rösti',
    'rösti mit speck',
  ],
};
```

### 3. Entity Extraction

```typescript
// packages/core/src/services/voice/entity-extractor.ts
import { menuItemMappings } from './swiss-german-normalizer';

export async function extractEntities(
  text: string,
  language: string
): Promise<CommandEntity[]> {
  const entities: CommandEntity[] = [];
  
  // Extract quantities
  const quantityPatterns = [
    { pattern: /\b(\d+)\s*(stück|mal|x)?\b/gi, type: 'quantity' },
    { pattern: /\b(ein|eine|einen|zwei|drei|vier|fünf)\b/gi, type: 'quantity' },
  ];
  
  quantityPatterns.forEach(({ pattern }) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        type: 'quantity',
        value: normalizeQuantity(match[1]),
        confidence: 0.9,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  });
  
  // Extract products
  const products = await getAvailableProducts(language);
  
  products.forEach(product => {
    // Check product name and variations
    const variations = [
      product.name.toLowerCase(),
      ...(menuItemMappings[product.name.toLowerCase()] || []),
    ];
    
    variations.forEach(variation => {
      const index = text.indexOf(variation);
      if (index !== -1) {
        entities.push({
          type: 'product',
          value: product.id,
          confidence: 0.85,
          startIndex: index,
          endIndex: index + variation.length,
        });
      }
    });
  });
  
  // Extract modifiers
  const modifierPatterns = [
    { pattern: /\bohne\s+(\w+)\b/gi, modifier: 'without' },
    { pattern: /\bmit\s+extra\s+(\w+)\b/gi, modifier: 'extra' },
    { pattern: /\bweniger\s+(\w+)\b/gi, modifier: 'less' },
    { pattern: /\bmehr\s+(\w+)\b/gi, modifier: 'more' },
  ];
  
  modifierPatterns.forEach(({ pattern, modifier }) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        type: 'modifier',
        value: `${modifier}:${match[1]}`,
        confidence: 0.8,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  });
  
  return entities;
}

function normalizeQuantity(text: string): string {
  const numberWords: Record<string, string> = {
    'ein': '1',
    'eine': '1',
    'einen': '1',
    'zwei': '2',
    'drei': '3',
    'vier': '4',
    'fünf': '5',
    'sechs': '6',
    'sieben': '7',
    'acht': '8',
    'neun': '9',
    'zehn': '10',
  };
  
  return numberWords[text.toLowerCase()] || text;
}
```

### 4. Voice Order Component

```typescript
// apps/web/src/features/voice/VoiceOrder.tsx
import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader } from 'lucide-react';
import { useSpeechRecognition } from '@eatech/core/hooks/useSpeechRecognition';
import { useVoiceCommands } from '@eatech/core/hooks/useVoiceCommands';
import { useCart } from '@eatech/core/hooks/useCart';
import styles from './VoiceOrder.module.css';

export const VoiceOrder: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const { addItem, cart } = useCart();
  const { processCommand } = useVoiceCommands();
  
  const {
    start,
    stop,
    isSupported,
    error,
  } = useSpeechRecognition({
    onStateChange: setIsListening,
    onInterimResult: (result) => {
      setTranscript(result.transcript);
    },
    onFinalResult: async (result) => {
      await handleVoiceCommand(result.transcript);
    },
    onError: (error) => {
      setFeedback(`Fehler: ${error}`);
      playErrorSound();
    },
  });
  
  const handleVoiceCommand = async (text: string) => {
    try {
      setFeedback('Verarbeite Bestellung...');
      
      const command = await processCommand(text);
      
      if (command.confidence < 0.5) {
        setFeedback('Ich habe Sie nicht verstanden. Bitte wiederholen Sie.');
        playErrorSound();
        return;
      }
      
      switch (command.intent) {
        case 'ORDER_ITEM':
          await handleOrderItem(command);
          break;
          
        case 'VIEW_CART':
          handleViewCart();
          break;
          
        case 'CHECKOUT':
          handleCheckout();
          break;
          
        default:
          setFeedback('Ich verstehe diesen Befehl nicht.');
          playErrorSound();
      }
    } catch (error) {
      console.error('Voice command error:', error);
      setFeedback('Ein Fehler ist aufgetreten.');
      playErrorSound();
    }
  };
  
  const handleOrderItem = async (command: VoiceCommand) => {
    const productEntity = command.entities.find(e => e.type === 'product');
    const quantityEntity = command.entities.find(e => e.type === 'quantity');
    
    if (!productEntity) {
      setFeedback('Ich konnte kein Produkt erkennen.');
      playErrorSound();
      return;
    }
    
    const quantity = quantityEntity ? parseInt(quantityEntity.value) : 1;
    
    try {
      await addItem(productEntity.value, quantity);
      
      // Get product name for feedback
      const product = await getProduct(productEntity.value);
      const message = quantity === 1
        ? `${product.name} wurde zum Warenkorb hinzugefügt.`
        : `${quantity}x ${product.name} wurden zum Warenkorb hinzugefügt.`;
      
      setFeedback(message);
      playSuccessSound();
      
      // Speak confirmation
      speakFeedback(message);
    } catch (error) {
      setFeedback('Produkt konnte nicht hinzugefügt werden.');
      playErrorSound();
    }
  };
  
  const handleViewCart = () => {
    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const message = itemCount === 0
      ? 'Ihr Warenkorb ist leer.'
      : `Sie haben ${itemCount} Artikel im Warenkorb.`;
    
    setFeedback(message);
    speakFeedback(message);
  };
  
  const handleCheckout = () => {
    if (cart.items.length === 0) {
      setFeedback('Ihr Warenkorb ist leer.');
      playErrorSound();
      return;
    }
    
    setFeedback('Weiterleitung zur Kasse...');
    playSuccessSound();
    
    setTimeout(() => {
      window.location.href = '/checkout';
    }, 1500);
  };
  
  const speakFeedback = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-CH';
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  };
  
  const playSuccessSound = () => {
    audioRef.current?.play();
  };
  
  const playErrorSound = () => {
    // Play error sound
  };
  
  const toggleListening = () => {
    if (isListening) {
      stop();
    } else {
      start('de-CH');
      setTranscript('');
      setFeedback(null);
    }
  };
  
  if (!isSupported) {
    return (
      <div className={styles.notSupported}>
        <p>Sprachsteuerung wird in diesem Browser nicht unterstützt.</p>
        <p>Bitte verwenden Sie Chrome oder Safari.</p>
      </div>
    );
  }
  
  return (
    <div className={styles.voiceOrder}>
      <audio ref={audioRef} src="/sounds/success.mp3" />
      
      <motion.button
        className={styles.micButton}
        onClick={toggleListening}
        whileTap={{ scale: 0.95 }}
        animate={{
          backgroundColor: isListening ? '#ff4444' : '#4CAF50',
        }}
      >
        {isListening ? <Mic size={32} /> : <MicOff size={32} />}
      </motion.button>
      
      <AnimatePresence>
        {isListening && (
          <motion.div
            className={styles.listeningIndicator}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className={styles.soundWave}>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p>Ich höre zu...</p>
          </motion.div>
        )}
      </AnimatePresence>
      
      {transcript && (
        <div className={styles.transcript}>
          <p>"{transcript}"</p>
        </div>
      )}
      
      {feedback && (
        <motion.div
          className={styles.feedback}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p>{feedback}</p>
        </motion.div>
      )}
      
      <div className={styles.examples}>
        <h4>Beispiel-Befehle:</h4>
        <ul>
          <li>"Ich möcht es Pizza Margherita"</li>
          <li>"Zwei Portione Rösti mit Speck"</li>
          <li>"Was han ich im Warenkorb?"</li>
          <li>"Ich möcht zahle"</li>
        </ul>
      </div>
    </div>
  );
};
```

### 5. Voice Feedback System

```typescript
// packages/core/src/services/voice/voice-feedback.ts
export class VoiceFeedbackService {
  private synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  
  constructor() {
    this.synth = window.speechSynthesis;
    this.loadVoices();
  }
  
  private loadVoices() {
    this.voices = this.synth.getVoices();
    
    if (this.voices.length === 0) {
      // Voices might load async
      this.synth.addEventListener('voiceschanged', () => {
        this.voices = this.synth.getVoices();
      });
    }
  }
  
  speak(
    text: string,
    options: SpeakOptions = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure utterance
      utterance.lang = options.language || 'de-CH';
      utterance.rate = options.rate || 0.9;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 1;
      
      // Try to find a suitable voice
      const voice = this.findVoice(utterance.lang);
      if (voice) {
        utterance.voice = voice;
      }
      
      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(event.error);
      
      // Cancel any ongoing speech
      this.synth.cancel();
      
      // Speak
      this.synth.speak(utterance);
    });
  }
  
  private findVoice(lang: string): SpeechSynthesisVoice | null {
    // Preferred voices for Swiss market
    const preferredVoices = {
      'de-CH': ['Google Deutsch (Schweiz)', 'Microsoft Stefan'],
      'de-DE': ['Google Deutsch', 'Microsoft Katja'],
      'fr-CH': ['Google français (Suisse)', 'Microsoft Claude'],
      'it-CH': ['Google italiano (Svizzera)', 'Microsoft Cosimo'],
    };
    
    const preferred = preferredVoices[lang] || [];
    
    // Try to find preferred voice
    for (const name of preferred) {
      const voice = this.voices.find(v => v.name.includes(name));
      if (voice) return voice;
    }
    
    // Fallback to any voice for the language
    return this.voices.find(v => v.lang.startsWith(lang.split('-')[0])) || null;
  }
  
  // Pre-defined responses
  async confirmOrder(items: OrderItem[], language = 'de-CH') {
    const responses = {
      'de-CH': `Ihre Bestellung: ${this.formatItems(items, 'de-CH')}. 
                Möchten Sie fortfahren?`,
      'fr-CH': `Votre commande: ${this.formatItems(items, 'fr-CH')}. 
                Voulez-vous continuer?`,
      'it-CH': `Il suo ordine: ${this.formatItems(items, 'it-CH')}. 
                Vuole continuare?`,
    };
    
    await this.speak(responses[language] || responses['de-CH'], { language });
  }
  
  private formatItems(items: OrderItem[], language: string): string {
    return items.map(item => {
      const quantity = item.quantity > 1 ? `${item.quantity}x ` : '';
      return `${quantity}${item.product.name[language] || item.product.name.de}`;
    }).join(', ');
  }
}
```

### 6. Multilingual Support

```typescript
// packages/core/src/services/voice/language-detector.ts
export class LanguageDetector {
  private languagePatterns = new Map<string, RegExp[]>();
  
  constructor() {
    this.initializePatterns();
  }
  
  private initializePatterns() {
    // Swiss German indicators
    this.languagePatterns.set('de-CH', [
      /\b(grüezi|merci vilmal|ade|gäll|chli|zmittag|znacht)\b/i,
      /\b(ich möcht|gib mer|was choschtet)\b/i,
    ]);
    
    // French indicators
    this.languagePatterns.set('fr-CH', [
      /\b(bonjour|merci|s'il vous plaît|je voudrais)\b/i,
      /\b(un|une|des|avec|sans)\b/i,
    ]);
    
    // Italian indicators
    this.languagePatterns.set('it-CH', [
      /\b(buongiorno|grazie|prego|vorrei)\b/i,
      /\b(uno|una|con|senza)\b/i,
    ]);
  }
  
  detectLanguage(text: string): string {
    const scores = new Map<string, number>();
    
    for (const [lang, patterns] of this.languagePatterns) {
      let score = 0;
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          score++;
        }
      }
      scores.set(lang, score);
    }
    
    // Find highest scoring language
    let bestLang = 'de-CH'; // Default
    let bestScore = 0;
    
    for (const [lang, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        bestLang = lang;
      }
    }
    
    return bestLang;
  }
}
```

### 7. Voice Analytics

```typescript
// packages/core/src/services/voice/voice-analytics.ts
export interface VoiceSession {
  id: string;
  tenantId: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  commands: VoiceCommandLog[];
  outcome: 'completed' | 'abandoned' | 'failed';
  deviceInfo: DeviceInfo;
}

export interface VoiceCommandLog {
  timestamp: Date;
  transcript: string;
  intent: string;
  confidence: number;
  success: boolean;
  processingTime: number;
  error?: string;
}

export class VoiceAnalytics {
  async logSession(session: VoiceSession) {
    await db.collection('voice_sessions').add({
      ...session,
      createdAt: new Date(),
    });
    
    // Update metrics
    await this.updateMetrics(session);
  }
  
  private async updateMetrics(session: VoiceSession) {
    const metrics = {
      totalSessions: increment(1),
      successRate: session.outcome === 'completed' ? increment(1) : increment(0),
      averageCommandsPerSession: increment(session.commands.length),
      averageConfidence: average(session.commands.map(c => c.confidence)),
      processingTime: average(session.commands.map(c => c.processingTime)),
    };
    
    await db.collection('voice_metrics')
      .doc(session.tenantId)
      .update(metrics);
  }
  
  async getInsights(tenantId: string, period: DateRange) {
    const sessions = await db.collection('voice_sessions')
      .where('tenantId', '==', tenantId)
      .where('startTime', '>=', period.start)
      .where('startTime', '<=', period.end)
      .get();
    
    return {
      totalSessions: sessions.size,
      completionRate: this.calculateCompletionRate(sessions),
      popularCommands: this.getPopularCommands(sessions),
      errorPatterns: this.analyzeErrors(sessions),
      peakHours: this.analyzePeakHours(sessions),
      deviceBreakdown: this.analyzeDevices(sessions),
    };
  }
}
```

## Best Practices

### 1. User Experience

```typescript
// Provide visual feedback
const VoiceButton: React.FC = () => {
  const [state, setState] = useState<'idle' | 'listening' | 'processing'>('idle');
  
  return (
    <button className={styles[state]}>
      {state === 'idle' && <MicOff />}
      {state === 'listening' && <Mic className={styles.pulse} />}
      {state === 'processing' && <Loader className={styles.spin} />}
    </button>
  );
};

// Show real-time transcript
<div className={styles.transcript}>
  <p className={styles.interim}>{interimTranscript}</p>
  <p className={styles.final}>{finalTranscript}</p>
</div>

// Provide examples
<div className={styles.examples}>
  <button onClick={() => fillExample("Ich möchte eine Pizza Margherita")}>
    🍕 Pizza bestellen
  </button>
</div>
```

### 2. Error Handling

```typescript
// Graceful degradation
if (!('webkitSpeechRecognition' in window)) {
  return <TextOrderFallback />;
}

// Handle permission denied
navigator.permissions.query({ name: 'microphone' }).then(result => {
  if (result.state === 'denied') {
    showMessage('Bitte erlauben Sie Mikrofonzugriff in den Browsereinstellungen');
  }
});

// Retry on network errors
const retryCommand = async (command: string, attempts = 3) => {
  for (let i = 0; i < attempts; i++) {
    try {
      return await processCommand(command);
    } catch (error) {
      if (i === attempts - 1) throw error;
      await wait(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
};
```

### 3. Accessibility

```typescript
// Keyboard navigation
<button
  onKeyDown={(e) => {
    if (e.key === 'Space' || e.key === 'Enter') {
      toggleVoiceRecognition();
    }
  }}
  aria-label="Sprachbestellung starten"
  aria-pressed={isListening}
/>

// Screen reader announcements
const announce = (message: string) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.textContent = message;
  document.body.appendChild(announcement);
  setTimeout(() => announcement.remove(), 1000);
};
```

### 4. Performance

```typescript
// Debounce processing
const processCommandDebounced = useMemo(
  () => debounce(processCommand, 500),
  []
);

// Cache product lookups
const productCache = new Map<string, Product>();

async function getProduct(id: string): Promise<Product> {
  if (productCache.has(id)) {
    return productCache.get(id)!;
  }
  
  const product = await fetchProduct(id);
  productCache.set(id, product);
  return product;
}

// Lazy load voice components
const VoiceOrder = lazy(() => import('./VoiceOrder'));
```

## Testing Voice Features

### Unit Tests

```typescript
describe('Voice Command Processing', () => {
  it('should extract product and quantity', async () => {
    const command = await processCommand('Ich möchte zwei Pizza Margherita');
    
    expect(command.intent).toBe('ORDER_ITEM');
    expect(command.entities).toContainEqual({
      type: 'product',
      value: 'pizza_margherita',
      confidence: expect.any(Number),
    });
    expect(command.entities).toContainEqual({
      type: 'quantity',
      value: '2',
      confidence: expect.any(Number),
    });
  });
  
  it('should handle Swiss German variations', async () => {
    const variations = [
      'Ich möcht es Margherita',
      'Gib mer ei Pizza',
      'Ich hätt gern e Pizza',
    ];
    
    for (const text of variations) {
      const command = await processCommand(text);
      expect(command.intent).toBe('ORDER_ITEM');
    }
  });
});
```

### Integration Tests

```typescript
describe('Voice Order Flow', () => {
  it('should complete order via voice', async () => {
    const { getByRole, getByText } = render(<VoiceOrder />);
    
    // Mock speech recognition
    mockSpeechRecognition({
      results: [
        { transcript: 'Eine Pizza Margherita', confidence: 0.95 },
      ],
    });
    
    // Start voice order
    fireEvent.click(getByRole('button', { name: /sprach/i }));
    
    // Wait for processing
    await waitFor(() => {
      expect(getByText(/wurde zum Warenkorb/i)).toBeInTheDocument();
    });
    
    // Verify cart updated
    expect(mockCart.addItem).toHaveBeenCalledWith('pizza_margherita', 1);
  });
});
```

## Troubleshooting

### Common Issues

1. **No speech detected**
   - Check microphone permissions
   - Ensure quiet environment
   - Speak clearly and not too fast

2. **Wrong language detected**
   - Manually set language preference
   - Use language-specific trigger words

3. **Products not recognized**
   - Update product name variations
   - Add phonetic spellings
   - Train on actual user transcripts

### Debug Mode

```typescript
// Enable voice debug mode
localStorage.setItem('voice_debug', 'true');

// This will:
// - Log all recognition results
// - Show confidence scores
// - Display entity extraction details
// - Save failed commands for analysis
```

## Privacy & Compliance

### Data Protection

```typescript
// Anonymize voice data
function anonymizeTranscript(transcript: string): string {
  // Remove potential PII
  const phoneRegex = /\b\d{10,}\b/g;
  const emailRegex = /\S+@\S+\.\S+/g;
  
  return transcript
    .replace(phoneRegex, '[PHONE]')
    .replace(emailRegex, '[EMAIL]');
}

// Get user consent
async function requestVoiceConsent(): Promise<boolean> {
  const consent = await showConsentDialog({
    title: 'Sprachsteuerung aktivieren',
    message: 'Wir verwenden Ihre Stimme nur zur Bestellverarbeitung. Keine Aufzeichnungen werden gespeichert.',
    privacyLink: '/privacy#voice',
  });
  
  if (consent) {
    localStorage.setItem('voice_consent', 'true');
  }
  
  return consent;
}
```

### Swiss Compliance

- Voice data processed in Switzerland
- No permanent voice recordings
- Clear consent mechanism
- Right to opt-out anytime
- Transparent data usage

---

For more implementation details, see the [API Documentation](../API.md).
