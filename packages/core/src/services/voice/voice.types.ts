// Voice Language Support
export enum VoiceLanguage {
  DE_CH = 'de-CH', // Swiss German
  DE = 'de-DE',    // Standard German
  FR = 'fr-CH',    // Swiss French
  IT = 'it-CH',    // Swiss Italian
  EN = 'en-US',    // English
}

// Voice Session
export interface VoiceSession {
  id: string;
  tenantId: string;
  userId?: string;
  startedAt: Date;
  endedAt?: Date;
  language: VoiceLanguage;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  commands: VoiceCommand[];
  currentOrder: any | null;
  metadata?: Record<string, any>;
}

// Voice Command
export interface VoiceCommand {
  id: string;
  sessionId: string;
  transcript: string;
  intent: string;
  entities: any;
  confidence: number;
  language: VoiceLanguage;
  timestamp: Date;
  alternativeTranscripts?: string[];
}

// Voice Settings
export interface VoiceSettings {
  tenantId: string;
  userId?: string;
  language: VoiceLanguage;
  dialectPreference?: string; // e.g., 'zurich', 'bern', 'basel'
  voiceGender?: 'male' | 'female' | 'neutral';
  speakingRate?: number; // 0.5 to 2.0
  pitch?: number; // 0 to 2
  volume?: number; // 0 to 1
  enableNoiseSuppression?: boolean;
  enableAutoCorrection?: boolean;
  enableContextAwareness?: boolean;
}

// Voice Context
export interface VoiceContext {
  currentStep: string;
  previousCommands: VoiceCommand[];
  language: VoiceLanguage;
  confidence: number;
  cart?: any;
  user?: any;
}

// Voice Response
export interface VoiceResponse {
  text: string;
  speak: boolean;
  action: 'continue' | 'confirm' | 'cancel' | 'complete' | 'retry';
  data?: any;
  suggestions?: string[];
  visualElements?: any[];
}

// Speech Recognition Result
export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  alternatives: Array<{
    transcript: string;
    confidence: number;
  }>;
}

// Parsed Order from Voice
export interface ParsedOrder {
  items: ParsedOrderItem[];
  modifications: OrderModification[];
  specialRequests?: string[];
  deliveryInstructions?: string;
}

export interface ParsedOrderItem {
  name: string;
  quantity: number;
  size?: string;
  modifiers?: string[];
  matched?: boolean;
  confidence?: number;
}

export interface OrderModification {
  type: 'add' | 'remove' | 'change';
  item: string;
  modifier: string;
}

// Voice Menu Item Mapping
export interface VoiceMenuMapping {
  id: string;
  productId: string;
  tenantId: string;
  language: VoiceLanguage;
  spokenNames: string[]; // Different ways to say the item
  aliases: string[]; // Alternative names
  phonetic?: string; // Phonetic representation
  commonMisspellings?: string[];
  contextualHints?: string[]; // e.g., "our famous", "bestseller"
}

// Voice Analytics
export interface VoiceAnalytics {
  sessionId: string;
  tenantId: string;
  totalDuration: number;
  commandCount: number;
  successfulCommands: number;
  failedCommands: number;
  averageConfidence: number;
  language: VoiceLanguage;
  orderCompleted: boolean;
  orderValue?: number;
  feedbackScore?: number;
  issues?: VoiceIssue[];
}

export interface VoiceIssue {
  type: 'low_confidence' | 'no_match' | 'timeout' | 'error';
  timestamp: Date;
  command?: string;
  details?: string;
}

// Voice Training Data
export interface VoiceTrainingData {
  id: string;
  tenantId: string;
  phrase: string;
  intent: string;
  entities: any;
  language: VoiceLanguage;
  dialect?: string;
  verified: boolean;
  usageCount: number;
  successRate: number;
  createdAt: Date;
  updatedAt: Date;
}

// Voice Feedback
export interface VoiceFeedback {
  sessionId: string;
  rating: number; // 1-5
  issues?: string[];
  suggestions?: string;
  wouldUseAgain: boolean;
  preferredLanguage?: VoiceLanguage;
  timestamp: Date;
}

// Swiss German Dialect Support
export interface SwissGermanDialect {
  region: string;
  name: string;
  variations: Record<string, string[]>; // standard word -> dialect variations
  numbers: Record<string, number>;
  specialCharacters?: string[];
  pronunciation?: Record<string, string>;
}

// Voice Error Types
export enum VoiceErrorType {
  NO_SPEECH_DETECTED = 'no_speech_detected',
  SPEECH_NOT_RECOGNIZED = 'speech_not_recognized',
  LOW_CONFIDENCE = 'low_confidence',
  LANGUAGE_NOT_SUPPORTED = 'language_not_supported',
  MICROPHONE_ACCESS_DENIED = 'microphone_access_denied',
  NETWORK_ERROR = 'network_error',
  PROCESSING_ERROR = 'processing_error',
  TIMEOUT = 'timeout',
}

// Voice Configuration
export interface VoiceConfiguration {
  tenantId: string;
  enabled: boolean;
  supportedLanguages: VoiceLanguage[];
  defaultLanguage: VoiceLanguage;
  dialectSupport: boolean;
  swissGermanDialects?: string[];
  
  // Recognition settings
  recognition: {
    provider: 'browser' | 'google' | 'azure' | 'custom';
    apiKey?: string;
    endpoint?: string;
    confidence: number; // minimum confidence threshold
    timeout: number; // ms
    maxAlternatives: number;
    profanityFilter: boolean;
  };
  
  // Synthesis settings
  synthesis: {
    provider: 'browser' | 'google' | 'azure' | 'elevenlabs';
    apiKey?: string;
    voiceId?: string;
    style?: string;
    emphasis?: string;
  };
  
  // Behavior settings
  behavior: {
    confirmOrders: boolean;
    allowCorrections: boolean;
    suggestItems: boolean;
    upselling: boolean;
    smallTalk: boolean;
    personalizedGreetings: boolean;
  };
  
  // Custom vocabulary
  customVocabulary?: Array<{
    phrase: string;
    soundsLike?: string[];
    ipa?: string; // International Phonetic Alphabet
    boost?: number; // recognition boost factor
  }>;
}

// Voice Intents
export enum VoiceIntent {
  GREETING = 'greeting',
  ORDER = 'order',
  ADD_ITEM = 'add_item',
  REMOVE_ITEM = 'remove_item',
  MODIFY_ITEM = 'modify_item',
  QUANTITY = 'quantity',
  CONFIRM = 'confirm',
  DENY = 'deny',
  COMPLETE = 'complete',
  CANCEL = 'cancel',
  HELP = 'help',
  REPEAT = 'repeat',
  UNKNOWN = 'unknown',
}

// Voice Entities
export interface VoiceEntities {
  items?: ParsedOrderItem[];
  quantities?: number[];
  sizes?: string[];
  modifiers?: string[];
  location?: string;
  time?: string;
  paymentMethod?: string;
  phoneNumber?: string;
  specialRequests?: string[];
}

// Voice State Machine
export enum VoiceState {
  IDLE = 'idle',
  LISTENING = 'listening',
  PROCESSING = 'processing',
  SPEAKING = 'speaking',
  WAITING_CONFIRMATION = 'waiting_confirmation',
  ERROR = 'error',
}

// Voice Prompt Templates
export interface VoicePromptTemplate {
  id: string;
  tenantId: string;
  language: VoiceLanguage;
  type: string;
  template: string;
  variables?: string[];
  conditions?: any;
  active: boolean;
}
