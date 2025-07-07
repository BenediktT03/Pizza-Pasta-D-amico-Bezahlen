/**
 * EATECH - Voice Tutorial Component
 * Version: 3.9.0
 * Description: Interactive voice feature onboarding and training tutorial
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/features/voice/components/VoiceTutorial.jsx
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  Square,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Info,
  Star,
  Lightbulb,
  Target,
  Award,
  Clock,
  Zap,
  Settings,
  RefreshCw,
  X,
  Maximize2,
  Minimize2,
  HelpCircle,
  BookOpen,
  MessageSquare,
  Headphones,
  Coffee,
  ShoppingCart,
  Users,
  Smartphone
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVoiceSettings } from '../hooks/useVoiceSettings';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { useVoiceCommands } from '../hooks/useVoiceCommands';
import VoiceWaveform from './VoiceWaveform';
import styles from './VoiceTutorial.module.css';

// ============================================================================
// TUTORIAL DATA & CONSTANTS
// ============================================================================

const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Willkommen zum Voice Tutorial',
    description: 'Lernen Sie, wie Sie EATECH mit Ihrer Stimme steuern können',
    icon: MessageSquare,
    type: 'introduction',
    content: {
      text: 'Herzlich willkommen! In diesem Tutorial lernen Sie, wie Sie EATECH effektiv mit Sprachbefehlen nutzen können. Wir zeigen Ihnen alle wichtigen Funktionen und helfen Ihnen dabei, ein Voice-Commerce-Experte zu werden.',
      tips: [
        'Sprechen Sie klar und deutlich',
        'Verwenden Sie natürliche Sprache',
        'Warten Sie auf die Bestätigung',
        'Nutzen Sie die magischen Wörter'
      ]
    },
    duration: 30
  },
  {
    id: 'microphone_setup',
    title: 'Mikrofon einrichten',
    description: 'Testen und kalibrieren Sie Ihr Mikrofon',
    icon: Mic,
    type: 'interactive',
    content: {
      text: 'Zuerst müssen wir sicherstellen, dass Ihr Mikrofon richtig funktioniert. Erlauben Sie den Mikrofonzugriff und sprechen Sie den angezeigten Satz.',
      testPhrase: 'Hallo EATECH, ich möchte das Voice Tutorial starten.',
      requirements: ['Mikrofonberechtigung', 'Klare Aussprache', 'Ruhige Umgebung'],
      troubleshooting: [
        'Überprüfen Sie die Mikrofonberechtigung',
        'Stellen Sie sicher, dass das richtige Mikrofon ausgewählt ist',
        'Reduzieren Sie Hintergrundgeräusche',
        'Sprechen Sie 20-30cm vom Mikrofon entfernt'
      ]
    },
    duration: 60
  },
  {
    id: 'basic_commands',
    title: 'Grundlegende Befehle',
    description: 'Lernen Sie die wichtigsten Sprachbefehle',
    icon: Volume2,
    type: 'practice',
    content: {
      text: 'Jetzt lernen Sie die grundlegenden Sprachbefehle. Diese funktionieren in der gesamten EATECH-Anwendung.',
      commands: [
        {
          phrase: 'Hey EATECH',
          description: 'Aktiviert das Voice Interface',
          example: 'Hey EATECH, zeige mir das Menü'
        },
        {
          phrase: 'Stopp',
          description: 'Beendet die aktuelle Voice-Aktion',
          example: 'Stopp'
        },
        {
          phrase: 'Hilfe',
          description: 'Zeigt verfügbare Befehle an',
          example: 'Hey EATECH, Hilfe'
        },
        {
          phrase: 'Wiederhole',
          description: 'Wiederholt die letzte Antwort',
          example: 'Wiederhole das bitte'
        }
      ]
    },
    duration: 90
  },
  {
    id: 'restaurant_commands',
    title: 'Restaurant-Befehle',
    description: 'Spezielle Befehle für Restaurantbetrieb',
    icon: Coffee,
    type: 'practice',
    content: {
      text: 'Diese Befehle sind speziell für Restaurants und Gastronomiebetriebe entwickelt.',
      commands: [
        {
          phrase: 'Zeige Menü',
          description: 'Öffnet das aktuelle Menü',
          example: 'Hey EATECH, zeige mir das Mittagsmenü'
        },
        {
          phrase: 'Neue Bestellung',
          description: 'Startet eine neue Bestellung',
          example: 'Hey EATECH, neue Bestellung für Tisch 5'
        },
        {
          phrase: 'Tischstatus',
          description: 'Zeigt den Status aller Tische',
          example: 'Hey EATECH, wie ist der Tischstatus?'
        },
        {
          phrase: 'Reservierung',
          description: 'Verwaltet Reservierungen',
          example: 'Hey EATECH, neue Reservierung für heute Abend'
        }
      ]
    },
    duration: 120
  },
  {
    id: 'shopping_commands',
    title: 'Shopping-Befehle',
    description: 'Voice-Commerce Funktionen',
    icon: ShoppingCart,
    type: 'practice',
    content: {
      text: 'Nutzen Sie diese Befehle für Voice-Shopping und E-Commerce.',
      commands: [
        {
          phrase: 'Füge hinzu',
          description: 'Fügt Artikel zum Warenkorb hinzu',
          example: 'Hey EATECH, füge zwei Pizzen hinzu'
        },
        {
          phrase: 'Warenkorb',
          description: 'Zeigt den aktuellen Warenkorb',
          example: 'Hey EATECH, zeige meinen Warenkorb'
        },
        {
          phrase: 'Bezahlen',
          description: 'Startet den Bezahlvorgang',
          example: 'Hey EATECH, ich möchte bezahlen'
        },
        {
          phrase: 'Suche',
          description: 'Sucht nach Produkten',
          example: 'Hey EATECH, suche nach vegetarischen Gerichten'
        }
      ]
    },
    duration: 120
  },
  {
    id: 'swiss_german',
    title: 'Schweizerdeutsch',
    description: 'Spezielle Unterstützung für Schweizer Dialekte',
    icon: Star,
    type: 'practice',
    content: {
      text: 'EATECH unterstützt verschiedene Schweizer Dialekte. Probieren Sie diese Ausdrücke aus.',
      commands: [
        {
          phrase: 'Grüezi EATECH',
          description: 'Schweizer Begrüßung',
          example: 'Grüezi EATECH, was chasch mer empfähle?'
        },
        {
          phrase: 'Chuchichäschtli',
          description: 'Test für Schweizer Aussprache',
          example: 'Säg Chuchichäschtli'
        },
        {
          phrase: 'Mer wänd',
          description: 'Höfliche Bestellung',
          example: 'Mer wänd es Zürigschnätzlets bstelle'
        },
        {
          phrase: 'Wie gaht\'s?',
          description: 'Informelle Begrüßung',
          example: 'Hoi EATECH, wie gaht\'s?'
        }
      ]
    },
    duration: 90
  },
  {
    id: 'advanced_features',
    title: 'Erweiterte Funktionen',
    description: 'Profi-Features für Power-User',
    icon: Zap,
    type: 'demonstration',
    content: {
      text: 'Entdecken Sie erweiterte Voice-Features für maximale Effizienz.',
      features: [
        {
          name: 'Kontext-Befehle',
          description: 'Befehle, die sich auf vorherige Aktionen beziehen',
          example: 'Das gleiche nochmal'
        },
        {
          name: 'Batch-Operationen',
          description: 'Mehrere Aktionen in einem Befehl',
          example: 'Füge drei Kaffee und zwei Croissants hinzu'
        },
        {
          name: 'Bedingte Befehle',
          description: 'Befehle mit Wenn-Dann-Logik',
          example: 'Wenn Tisch 5 frei ist, reserviere ihn für 19 Uhr'
        },
        {
          name: 'Personalisierung',
          description: 'Angepasste Befehle für häufige Aktionen',
          example: 'Meine übliche Bestellung'
        }
      ]
    },
    duration: 180
  },
  {
    id: 'troubleshooting',
    title: 'Problemlösung',
    description: 'Was tun wenn etwas nicht funktioniert',
    icon: HelpCircle,
    type: 'information',
    content: {
      text: 'Hier sind die häufigsten Probleme und ihre Lösungen.',
      problems: [
        {
          issue: 'Voice wird nicht erkannt',
          solutions: [
            'Sprechen Sie lauter und deutlicher',
            'Überprüfen Sie die Mikrofoneinstellungen',
            'Reduzieren Sie Hintergrundgeräusche',
            'Verwenden Sie das Wake-Word "Hey EATECH"'
          ]
        },
        {
          issue: 'Falsche Befehle werden erkannt',
          solutions: [
            'Sprechen Sie langsamer',
            'Verwenden Sie die exakten Befehlsphrasen',
            'Trainieren Sie das System mit Ihrem Akzent',
            'Überprüfen Sie die Spracheinstellungen'
          ]
        },
        {
          issue: 'System reagiert nicht',
          solutions: [
            'Überprüfen Sie die Internetverbindung',
            'Laden Sie die Seite neu',
            'Überprüfen Sie die Mikrofonberechtigung',
            'Kontaktieren Sie den Support'
          ]
        }
      ]
    },
    duration: 120
  },
  {
    id: 'completion',
    title: 'Tutorial abgeschlossen!',
    description: 'Glückwunsch, Sie sind jetzt ein Voice-Experte',
    icon: Award,
    type: 'completion',
    content: {
      text: 'Herzlichen Glückwunsch! Sie haben das Voice Tutorial erfolgreich abgeschlossen.',
      achievements: [
        'Mikrofon erfolgreich konfiguriert',
        'Grundlegende Befehle gemeistert',
        'Restaurant-Funktionen gelernt',
        'Shopping-Features verstanden',
        'Schweizerdeutsch-Support getestet',
        'Erweiterte Features erkundet'
      ],
      nextSteps: [
        'Erkunden Sie die Voice-Einstellungen',
        'Personalisieren Sie Ihre Befehle',
        'Probieren Sie verschiedene Dialekte aus',
        'Nutzen Sie Voice für tägliche Aufgaben'
      ]
    },
    duration: 60
  }
];

const TUTORIAL_MODES = {
  guided: {
    name: 'Geführt',
    description: 'Schritt-für-Schritt Anleitung',
    icon: BookOpen,
    autoAdvance: true
  },
  practice: {
    name: 'Übung',
    description: 'Freies Üben mit Feedback',
    icon: Target,
    autoAdvance: false
  },
  quick: {
    name: 'Schnell',
    description: 'Kurzer Überblick',
    icon: Zap,
    autoAdvance: true
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

const VoiceTutorial = ({
  isOpen,
  onClose,
  mode = 'guided',
  startStep = 0,
  onComplete,
  className = '',
  ...props
}) => {
  // ============================================================================
  // HOOKS & STATE
  // ============================================================================
  
  const { t } = useTranslation();
  const { settings, updateSettings } = useVoiceSettings();
  const { isListening, startListening, stopListening, transcript, confidence } = useSpeechRecognition();
  const { speak, stop, isPlaying } = useTextToSpeech();
  const { processCommand } = useVoiceCommands();
  
  const [currentStep, setCurrentStep] = useState(startStep);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tutorialMode, setTutorialMode] = useState(mode);
  const [stepProgress, setStepProgress] = useState({});
  const [practiceResults, setPracticeResults] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPhrase, setCurrentPhrase] = useState('');
  const [practiceMode, setPracticeMode] = useState(false);
  const [showHints, setShowHints] = useState(true);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [startTime, setStartTime] = useState(Date.now());
  const [stepStartTime, setStepStartTime] = useState(Date.now());
  
  const progressRef = useRef(null);
  const tutorialRef = useRef(null);
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const currentStepData = TUTORIAL_STEPS[currentStep];
  const totalSteps = TUTORIAL_STEPS.length;
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;
  const tutorialModeConfig = TUTORIAL_MODES[tutorialMode];
  
  const stepElapsedTime = useMemo(() => {
    return Math.floor((Date.now() - stepStartTime) / 1000);
  }, [stepStartTime]);
  
  const totalElapsedTime = useMemo(() => {
    return Math.floor((Date.now() - startTime) / 1000);
  }, [startTime]);
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  useEffect(() => {
    if (isOpen) {
      setStartTime(Date.now());
      setStepStartTime(Date.now());
    }
  }, [isOpen]);
  
  useEffect(() => {
    setStepStartTime(Date.now());
  }, [currentStep]);
  
  useEffect(() => {
    // Auto-advance in guided mode
    if (tutorialMode === 'guided' && tutorialModeConfig.autoAdvance) {
      const timer = setTimeout(() => {
        if (currentStep < totalSteps - 1) {
          handleNextStep();
        }
      }, currentStepData.duration * 1000);
      
      return () => clearTimeout(timer);
    }
  }, [currentStep, tutorialMode, tutorialModeConfig.autoAdvance, currentStepData.duration]);
  
  useEffect(() => {
    // Process speech recognition results
    if (transcript && practiceMode) {
      handlePracticeInput(transcript);
    }
  }, [transcript, practiceMode]);
  
  useEffect(() => {
    // Handle fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleNextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(prev => prev + 1);
      setPracticeMode(false);
      setCurrentPhrase('');
    } else {
      handleComplete();
    }
  }, [currentStep, totalSteps]);
  
  const handlePrevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setPracticeMode(false);
      setCurrentPhrase('');
    }
  }, [currentStep]);
  
  const handleStepSelect = useCallback((stepIndex) => {
    setCurrentStep(stepIndex);
    setPracticeMode(false);
    setCurrentPhrase('');
  }, []);
  
  const handleComplete = useCallback(() => {
    const completionData = {
      completedAt: new Date().toISOString(),
      totalTime: totalElapsedTime,
      mode: tutorialMode,
      completedSteps: Array.from(completedSteps),
      practiceResults
    };
    
    // Update user settings
    updateSettings({
      ...settings,
      tutorialCompleted: true,
      tutorialStats: completionData
    });
    
    onComplete?.(completionData);
    onClose?.();
  }, [totalElapsedTime, tutorialMode, completedSteps, practiceResults, settings, updateSettings, onComplete, onClose]);
  
  const handlePracticeStart = useCallback(async (phrase) => {
    setCurrentPhrase(phrase);
    setPracticeMode(true);
    
    // Speak the phrase first
    await speak(`Sagen Sie: ${phrase}`);
    
    // Start listening
    setTimeout(() => {
      startListening();
    }, 1000);
  }, [speak, startListening]);
  
  const handlePracticeInput = useCallback((input) => {
    const similarity = calculateSimilarity(input.toLowerCase(), currentPhrase.toLowerCase());
    const isSuccess = similarity > 0.7 || confidence > 0.8;
    
    setPracticeResults(prev => ({
      ...prev,
      [currentStep]: {
        phrase: currentPhrase,
        input,
        similarity,
        confidence,
        success: isSuccess,
        timestamp: Date.now()
      }
    }));
    
    if (isSuccess) {
      speak('Sehr gut! Das war korrekt.');
      setTimeout(() => {
        setPracticeMode(false);
        setCurrentPhrase('');
        stopListening();
      }, 2000);
    } else {
      speak('Versuchen Sie es nochmal.');
    }
  }, [currentPhrase, currentStep, confidence, speak, stopListening]);
  
  const handlePlayStep = useCallback(async () => {
    if (isPlaying) {
      stop();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      await speak(currentStepData.content.text);
      setIsPlaying(false);
    }
  }, [isPlaying, stop, speak, currentStepData.content.text]);
  
  const handleToggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await tutorialRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }, []);
  
  const handleModeChange = useCallback((newMode) => {
    setTutorialMode(newMode);
    setPracticeMode(false);
    setCurrentPhrase('');
  }, []);
  
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  const calculateSimilarity = (str1, str2) => {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));
    
    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    const distance = matrix[len1][len2];
    return 1 - distance / Math.max(len1, len2);
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  
  const renderStepContent = () => {
    const step = currentStepData;
    const StepIcon = step.icon;
    
    switch (step.type) {
      case 'introduction':
        return (
          <div className={styles.introContent}>
            <div className={styles.stepIcon}>
              <StepIcon size={48} />
            </div>
            <p className={styles.stepText}>{step.content.text}</p>
            <div className={styles.tipsList}>
              <h4>Tipps für den Erfolg:</h4>
              <ul>
                {step.content.tips.map((tip, index) => (
                  <li key={index}>
                    <Lightbulb size={16} />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
        
      case 'interactive':
        return (
          <div className={styles.interactiveContent}>
            <div className={styles.stepIcon}>
              <StepIcon size={48} />
            </div>
            <p className={styles.stepText}>{step.content.text}</p>
            
            <div className={styles.testSection}>
              <div className={styles.testPhrase}>
                <h4>Sprechen Sie diesen Satz:</h4>
                <div className={styles.phraseCard}>
                  "{step.content.testPhrase}"
                </div>
              </div>
              
              <div className={styles.micSection}>
                <button
                  className={`${styles.micButton} ${isListening ? styles.listening : ''}`}
                  onClick={() => isListening ? stopListening() : handlePracticeStart(step.content.testPhrase)}
                >
                  {isListening ? <MicOff size={24} /> : <Mic size={24} />}
                  {isListening ? 'Aufnahme stoppen' : 'Aufnahme starten'}
                </button>
                
                {isListening && <VoiceWaveform />}
                
                {transcript && (
                  <div className={styles.transcriptResult}>
                    <h5>Erkannt:</h5>
                    <p>"{transcript}"</p>
                    <div className={styles.confidence}>
                      Vertrauen: {Math.round(confidence * 100)}%
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className={styles.troubleshooting}>
              <h4>Probleme?</h4>
              <ul>
                {step.content.troubleshooting.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        );
        
      case 'practice':
        return (
          <div className={styles.practiceContent}>
            <div className={styles.stepIcon}>
              <StepIcon size={48} />
            </div>
            <p className={styles.stepText}>{step.content.text}</p>
            
            <div className={styles.commandsList}>
              {step.content.commands.map((command, index) => (
                <div key={index} className={styles.commandCard}>
                  <div className={styles.commandHeader}>
                    <h4>"{command.phrase}"</h4>
                    <button
                      className={styles.practiceButton}
                      onClick={() => handlePracticeStart(command.phrase)}
                      disabled={practiceMode}
                    >
                      <Target size={16} />
                      Üben
                    </button>
                  </div>
                  <p className={styles.commandDescription}>{command.description}</p>
                  <div className={styles.commandExample}>
                    <strong>Beispiel:</strong> "{command.example}"
                  </div>
                  
                  {practiceResults[currentStep]?.phrase === command.phrase && (
                    <div className={`${styles.practiceResult} ${practiceResults[currentStep].success ? styles.success : styles.error}`}>
                      <CheckCircle size={16} />
                      {practiceResults[currentStep].success ? 'Erfolgreich!' : 'Versuchen Sie es nochmal'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
        
      case 'demonstration':
        return (
          <div className={styles.demonstrationContent}>
            <div className={styles.stepIcon}>
              <StepIcon size={48} />
            </div>
            <p className={styles.stepText}>{step.content.text}</p>
            
            <div className={styles.featuresList}>
              {step.content.features.map((feature, index) => (
                <div key={index} className={styles.featureCard}>
                  <h4>{feature.name}</h4>
                  <p>{feature.description}</p>
                  <div className={styles.featureExample}>
                    <strong>Beispiel:</strong> "{feature.example}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
        
      case 'information':
        return (
          <div className={styles.informationContent}>
            <div className={styles.stepIcon}>
              <StepIcon size={48} />
            </div>
            <p className={styles.stepText}>{step.content.text}</p>
            
            <div className={styles.problemsList}>
              {step.content.problems.map((problem, index) => (
                <div key={index} className={styles.problemCard}>
                  <h4>
                    <AlertCircle size={20} />
                    {problem.issue}
                  </h4>
                  <div className={styles.solutions}>
                    <h5>Lösungen:</h5>
                    <ul>
                      {problem.solutions.map((solution, idx) => (
                        <li key={idx}>{solution}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
        
      case 'completion':
        return (
          <div className={styles.completionContent}>
            <div className={styles.stepIcon}>
              <StepIcon size={64} />
            </div>
            <p className={styles.stepText}>{step.content.text}</p>
            
            <div className={styles.achievements}>
              <h4>Ihre Erfolge:</h4>
              <div className={styles.achievementsList}>
                {step.content.achievements.map((achievement, index) => (
                  <div key={index} className={styles.achievementItem}>
                    <CheckCircle size={16} />
                    {achievement}
                  </div>
                ))}
              </div>
            </div>
            
            <div className={styles.nextSteps}>
              <h4>Nächste Schritte:</h4>
              <ul>
                {step.content.nextSteps.map((nextStep, index) => (
                  <li key={index}>{nextStep}</li>
                ))}
              </ul>
            </div>
            
            <div className={styles.stats}>
              <div className={styles.statItem}>
                <Clock size={16} />
                Gesamtzeit: {formatTime(totalElapsedTime)}
              </div>
              <div className={styles.statItem}>
                <CheckCircle size={16} />
                Schritte: {completedSteps.size + 1}/{totalSteps}
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  if (!isOpen) return null;
  
  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <div 
      className={`${styles.tutorialOverlay} ${isFullscreen ? styles.fullscreen : ''} ${className}`}
      ref={tutorialRef}
      {...props}
    >
      <div className={styles.tutorialContainer}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.title}>
              Voice Tutorial
              <span className={styles.stepIndicator}>
                {currentStep + 1} / {totalSteps}
              </span>
            </h2>
            <div className={styles.modeSelector}>
              {Object.entries(TUTORIAL_MODES).map(([key, modeConfig]) => {
                const ModeIcon = modeConfig.icon;
                return (
                  <button
                    key={key}
                    className={`${styles.modeButton} ${tutorialMode === key ? styles.active : ''}`}
                    onClick={() => handleModeChange(key)}
                  >
                    <ModeIcon size={16} />
                    {modeConfig.name}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className={styles.headerRight}>
            <div className={styles.timeDisplay}>
              <Clock size={16} />
              {formatTime(stepElapsedTime)} / {formatTime(currentStepData.duration)}
            </div>
            
            <button
              className={styles.fullscreenButton}
              onClick={handleToggleFullscreen}
              title={isFullscreen ? 'Vollbild verlassen' : 'Vollbild'}
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            
            <button
              className={styles.closeButton}
              onClick={onClose}
              title="Tutorial schließen"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className={styles.progressSection}>
          <div className={styles.progressBar} ref={progressRef}>
            <div 
              className={styles.progressFill}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className={styles.stepMarkers}>
            {TUTORIAL_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = completedSteps.has(index);
              const isCurrent = index === currentStep;
              
              return (
                <button
                  key={step.id}
                  className={`${styles.stepMarker} ${isCompleted ? styles.completed : ''} ${isCurrent ? styles.current : ''}`}
                  onClick={() => handleStepSelect(index)}
                  title={step.title}
                >
                  <StepIcon size={16} />
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Step Header */}
        <div className={styles.stepHeader}>
          <h3 className={styles.stepTitle}>{currentStepData.title}</h3>
          <p className={styles.stepDescription}>{currentStepData.description}</p>
          
          <div className={styles.stepActions}>
            <button
              className={styles.playButton}
              onClick={handlePlayStep}
              disabled={isPlaying}
            >
              {isPlaying ? <Square size={16} /> : <Play size={16} />}
              {isPlaying ? 'Stopp' : 'Vorlesen'}
            </button>
            
            <button
              className={styles.hintsButton}
              onClick={() => setShowHints(!showHints)}
            >
              <Lightbulb size={16} />
              Hinweise {showHints ? 'ausblenden' : 'anzeigen'}
            </button>
          </div>
        </div>
        
        {/* Step Content */}
        <div className={styles.stepContent}>
          {renderStepContent()}
        </div>
        
        {/* Navigation */}
        <div className={styles.navigation}>
          <button
            className={styles.navButton}
            onClick={handlePrevStep}
            disabled={isFirstStep}
          >
            <ChevronLeft size={20} />
            Zurück
          </button>
          
          <div className={styles.navCenter}>
            {practiceMode && (
              <div className={styles.practiceStatus}>
                <Mic className={styles.micIcon} />
                <VoiceWaveform size="small" />
                <span>Sprechen Sie jetzt...</span>
              </div>
            )}
          </div>
          
          <button
            className={`${styles.navButton} ${styles.primary}`}
            onClick={isLastStep ? handleComplete : handleNextStep}
          >
            {isLastStep ? 'Abschließen' : 'Weiter'}
            {!isLastStep && <ChevronRight size={20} />}
            {isLastStep && <Award size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceTutorial;