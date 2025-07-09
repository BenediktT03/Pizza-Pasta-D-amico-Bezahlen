// apps/admin/src/hooks/useVoice.js
// Voice Recognition Hook for Admin App
// Version: 1.0.0

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

// Voice Services (should be copied from web app)
import { SpeechRecognitionService } from '@/services/voice/SpeechRecognitionService';
import { TextToSpeechService } from '@/services/voice/TextToSpeechService';
import { VoiceCommandProcessor } from '@/services/voice/VoiceCommandProcessor';

// Initialize services
const speechRecognition = new SpeechRecognitionService();
const textToSpeech = new TextToSpeechService();
const commandProcessor = new VoiceCommandProcessor();

export const useVoice = (options = {}) => {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confidence, setConfidence] = useState(null);
  const [language, setLanguage] = useState(options.language || 'de-CH');

  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);

  // Admin-specific voice commands
  const adminCommands = {
    // Navigation commands
    'dashboard': () => navigate('/dashboard'),
    'bestellungen': () => navigate('/orders'),
    'produkte': () => navigate('/products'),
    'analytics': () => navigate('/analytics'),
    'einstellungen': () => navigate('/settings'),

    // Order management
    'neue bestellung': () => navigate('/orders/new'),
    'bestellung *nummer': (number) => navigate(`/orders/${number}`),
    'offene bestellungen': () => navigate('/orders?status=pending'),
    'heutige bestellungen': () => navigate('/orders?date=today'),

    // Product management
    'neues produkt': () => navigate('/products/new'),
    'produkt *name': (name) => navigate(`/products/search?q=${name}`),
    'produkte bearbeiten': () => navigate('/products?mode=edit'),

    // Quick actions
    'hilfe': () => showHelp(),
    'logout': () => handleLogout(),
    'suche *term': (term) => performSearch(term),

    // Swiss German variants
    'nöi bstellig': () => navigate('/orders/new'),
    'bstellig *nummere': (number) => navigate(`/orders/${number}`),
    'produkt *name': (name) => navigate(`/products/search?q=${name}`),
    'uslogge': () => handleLogout(),
  };

  // Initialize speech recognition
  useEffect(() => {
    const initializeRecognition = async () => {
      try {
        const isSupported = await speechRecognition.checkBrowserSupport();
        if (!isSupported) {
          setError('Spracherkennung wird von diesem Browser nicht unterstützt');
          return;
        }

        await speechRecognition.initialize({
          language,
          continuous: options.continuous || false,
          interimResults: true,
          maxAlternatives: 3
        });

        // Set up event handlers
        speechRecognition.recognition.onresult = handleResult;
        speechRecognition.recognition.onerror = handleError;
        speechRecognition.recognition.onend = handleEnd;
        speechRecognition.recognition.onstart = handleStart;

        recognitionRef.current = speechRecognition.recognition;
      } catch (err) {
        console.error('Failed to initialize speech recognition:', err);
        setError('Fehler bei der Initialisierung der Spracherkennung');
      }
    };

    initializeRecognition();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [language]);

  // Handle speech recognition results
  const handleResult = useCallback((event) => {
    const results = event.results;
    const currentResult = results[results.length - 1];

    if (currentResult.isFinal) {
      const finalTranscript = currentResult[0].transcript;
      const confidence = currentResult[0].confidence;

      setTranscript(finalTranscript);
      setConfidence(confidence);
      setInterimTranscript('');

      // Process command
      processVoiceCommand(finalTranscript);

      // Auto-stop after final result
      if (!options.continuous) {
        stopListening();
      }
    } else {
      // Update interim transcript
      const interim = currentResult[0].transcript;
      setInterimTranscript(interim);
    }
  }, [options.continuous]);

  // Process voice command
  const processVoiceCommand = async (text) => {
    setIsProcessing(true);

    try {
      // Check for admin commands first
      const command = commandProcessor.parseCommand(text, adminCommands);

      if (command) {
        // Execute command
        await command.action(...command.params);

        // Speak confirmation
        if (options.speakFeedback !== false) {
          await speak(`${command.name} wird ausgeführt`);
        }

        toast.success(`Befehl erkannt: ${command.name}`);
      } else {
        // Check if it's a general query
        const query = text.toLowerCase();

        if (query.includes('bestellung') || query.includes('order')) {
          // Handle order-related queries
          handleOrderQuery(query);
        } else if (query.includes('produkt') || query.includes('product')) {
          // Handle product-related queries
          handleProductQuery(query);
        } else {
          // Unknown command
          if (options.speakFeedback !== false) {
            await speak('Entschuldigung, ich habe den Befehl nicht verstanden');
          }
          toast.error('Unbekannter Befehl');
        }
      }
    } catch (err) {
      console.error('Error processing command:', err);
      setError('Fehler bei der Verarbeitung des Befehls');
    } finally {
      setIsProcessing(false);
    }
  };

  // Voice control methods
  const startListening = useCallback(async () => {
    if (isListening) return;

    try {
      setError(null);
      setTranscript('');
      setInterimTranscript('');
      setConfidence(null);

      await speechRecognition.start();
      setIsListening(true);

      // Set timeout for auto-stop
      if (options.timeout) {
        timeoutRef.current = setTimeout(() => {
          stopListening();
        }, options.timeout);
      }
    } catch (err) {
      console.error('Error starting recognition:', err);
      setError('Fehler beim Starten der Spracherkennung');
      setIsListening(false);
    }
  }, [isListening, options.timeout]);

  const stopListening = useCallback(() => {
    if (!isListening) return;

    try {
      speechRecognition.stop();
      setIsListening(false);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } catch (err) {
      console.error('Error stopping recognition:', err);
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Text-to-speech
  const speak = useCallback(async (text, options = {}) => {
    try {
      await textToSpeech.speak(text, {
        language: options.language || language,
        rate: options.rate || 1.0,
        pitch: options.pitch || 1.0,
        volume: options.volume || 1.0
      });
    } catch (err) {
      console.error('Error speaking:', err);
    }
  }, [language]);

  // Helper functions
  const showHelp = () => {
    const helpText = `
      Verfügbare Sprachbefehle:
      - "Dashboard" - Zum Dashboard
      - "Bestellungen" - Zur Bestellübersicht
      - "Neue Bestellung" - Neue Bestellung erstellen
      - "Bestellung [Nummer]" - Bestimmte Bestellung öffnen
      - "Produkte" - Zur Produktverwaltung
      - "Suche [Begriff]" - Nach etwas suchen
    `;

    toast.info(helpText, { duration: 10000 });
    speak('Hier sind die verfügbaren Sprachbefehle');
  };

  const handleLogout = () => {
    if (window.confirm('Möchten Sie sich wirklich abmelden?')) {
      // Implement logout logic
      navigate('/login');
    }
  };

  const performSearch = (term) => {
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  const handleOrderQuery = (query) => {
    // Extract order number if present
    const orderMatch = query.match(/\d+/);
    if (orderMatch) {
      navigate(`/orders/${orderMatch[0]}`);
    } else {
      navigate('/orders');
    }
  };

  const handleProductQuery = (query) => {
    // Extract product name if present
    const words = query.split(' ');
    const productIndex = words.findIndex(w => w === 'produkt' || w === 'product');
    if (productIndex !== -1 && words[productIndex + 1]) {
      const productName = words.slice(productIndex + 1).join(' ');
      navigate(`/products/search?q=${encodeURIComponent(productName)}`);
    } else {
      navigate('/products');
    }
  };

  // Event handlers
  const handleStart = () => {
    console.log('Speech recognition started');
  };

  const handleEnd = () => {
    setIsListening(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleError = (event) => {
    console.error('Speech recognition error:', event.error);
    setIsListening(false);

    switch (event.error) {
      case 'no-speech':
        setError('Keine Sprache erkannt');
        break;
      case 'audio-capture':
        setError('Kein Mikrofon gefunden');
        break;
      case 'not-allowed':
        setError('Mikrofonzugriff verweigert');
        break;
      default:
        setError(`Fehler: ${event.error}`);
    }
  };

  return {
    // State
    isListening,
    transcript: transcript || interimTranscript,
    finalTranscript: transcript,
    interimTranscript,
    error,
    isProcessing,
    confidence,
    language,

    // Actions
    startListening,
    stopListening,
    toggleListening,
    speak,
    setLanguage,

    // Utilities
    isSupported: speechRecognition.isSupported,
    supportedLanguages: ['de', 'de-CH', 'fr', 'it', 'en']
  };
};

// Voice command patterns for different languages
export const voicePatterns = {
  de: {
    navigation: {
      dashboard: /dashboard|übersicht|startseite/i,
      orders: /bestellungen|aufträge|orders/i,
      products: /produkte|artikel|products/i,
      analytics: /analytics|statistiken|berichte/i,
      settings: /einstellungen|settings|konfiguration/i
    },
    actions: {
      new: /neu|neue|erstellen|anlegen|hinzufügen/i,
      edit: /bearbeiten|ändern|editieren|modifizieren/i,
      delete: /löschen|entfernen|delete/i,
      search: /suche|suchen|finde|finden/i,
      open: /öffne|öffnen|zeige|zeigen|anzeigen/i
    }
  },
  'de-CH': {
    navigation: {
      dashboard: /dashboard|übersicht|startsite/i,
      orders: /bstellige|uufträg|orders/i,
      products: /produkt|artikel|products/i,
      analytics: /analytics|statistike|bricht/i,
      settings: /iistellige|settings|konfiguration/i
    },
    actions: {
      new: /nöi|nöii|erstelle|aalege|hinzuefüege/i,
      edit: /bearbeite|ändere|editiere|modifiziere/i,
      delete: /lösche|entferne|delete/i,
      search: /sueche|suechi|finde|findi/i,
      open: /öffne|öffni|zeige|zeigi|aazeige/i
    }
  }
};

export default useVoice;
