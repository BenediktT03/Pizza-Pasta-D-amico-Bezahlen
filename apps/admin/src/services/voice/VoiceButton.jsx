// /apps/mobile/src/components/VoiceButton.tsx

import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

// Types
interface VoiceResult {
  transcription: string;
  confidence: number;
  language: string;
  timestamp: number;
}

interface VoiceButtonProps {
  onVoiceResult: (transcription: string) => Promise<void>;
  isListening?: boolean;
  disabled?: boolean;
  size?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
  showText?: boolean;
  wakeWord?: string;
  language?: string;
  maxDuration?: number; // seconds
  minVolume?: number;
  autoStop?: boolean;
}

// Web Speech API declarations for React Native
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

// Mock Speech Recognition for React Native (uses native modules in real implementation)
class SpeechRecognition {
  continuous = true;
  interimResults = true;
  maxAlternatives = 1;
  lang = 'de-CH';

  onstart: ((event: any) => void) | null = null;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: ((event: any) => void) | null = null;
  onspeechstart: ((event: any) => void) | null = null;
  onspeechend: ((event: any) => void) | null = null;
  onnomatch: ((event: any) => void) | null = null;
  onaudiostart: ((event: any) => void) | null = null;
  onaudioend: ((event: any) => void) | null = null;
  onsoundstart: ((event: any) => void) | null = null;
  onsoundend: ((event: any) => void) | null = null;

  start() {
    // In real implementation, this would use expo-speech or react-native-voice
    console.log('Speech recognition started');
    if (this.onstart) this.onstart({});

    // Simulate speech recognition for demo
    setTimeout(() => {
      if (this.onspeechstart) this.onspeechstart({});
    }, 500);
  }

  stop() {
    console.log('Speech recognition stopped');
    if (this.onspeechend) this.onspeechend({});
    if (this.onend) this.onend({});
  }

  abort() {
    console.log('Speech recognition aborted');
    if (this.onend) this.onend({});
  }
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  onVoiceResult,
  isListening: externalListening = false,
  disabled = false,
  size = 56,
  style,
  textStyle,
  showText = false,
  wakeWord = 'Hey EATECH',
  language = 'de-CH',
  maxDuration = 30,
  minVolume = 0.1,
  autoStop = true,
}) => {
  // State
  const [isInternalListening, setIsInternalListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const animationRef = useRef(new Animated.Value(0)).current;
  const pulseAnimationRef = useRef(new Animated.Value(1)).current;
  const waveAnimationRef = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Computed values
  const isListening = externalListening || isInternalListening;
  const buttonSize = size;
  const iconSize = Math.round(buttonSize * 0.4);

  // Initialize speech recognition
  const initializeSpeechRecognition = useCallback(() => {
    if (!hasPermission) return null;

    // In real implementation, use @react-native-voice/voice or expo-speech
    const SpeechRecognitionClass = Platform.select({
      web: window.SpeechRecognition || window.webkitSpeechRecognition,
      default: SpeechRecognition, // Mock for React Native
    });

    if (!SpeechRecognitionClass) {
      console.warn('Speech recognition not supported');
      return null;
    }

    const recognition = new SpeechRecognitionClass();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.lang = language;

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setError(null);
      setIsInternalListening(true);
      startVisualFeedback();

      // Set timeout for max duration
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        stopListening();
      }, maxDuration * 1000);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      let maxConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence || 0;

        if (result.isFinal) {
          finalTranscript += transcript;
          maxConfidence = Math.max(maxConfidence, confidence);
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) {
        setTranscription(interimTranscript);
      }

      if (finalTranscript && maxConfidence > 0.3) {
        setTranscription(finalTranscript);
        setConfidence(maxConfidence);

        if (autoStop) {
          handleVoiceResult(finalTranscript.trim());
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);

      const errorMessages: { [key: string]: string } = {
        'network': 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.',
        'not-allowed': 'Mikrofon-Berechtigung verweigert.',
        'no-speech': 'Keine Sprache erkannt. Bitte sprechen Sie deutlicher.',
        'audio-capture': 'Mikrofon nicht verfügbar.',
        'service-not-allowed': 'Spracherkennung nicht verfügbar.',
        'bad-grammar': 'Spracherkennung fehlgeschlagen.',
        'language-not-supported': 'Sprache nicht unterstützt.',
      };

      const errorMessage = errorMessages[event.error] || 'Spracherkennung fehlgeschlagen.';
      setError(errorMessage);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      stopListening();
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsInternalListening(false);
      stopVisualFeedback();

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    recognition.onspeechstart = () => {
      console.log('Speech detected');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    recognition.onspeechend = () => {
      console.log('Speech ended');
    };

    return recognition;
  }, [hasPermission, language, maxDuration, autoStop]);

  // Request microphone permission
  const requestPermission = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();

      if (status === 'granted') {
        setHasPermission(true);
        return true;
      } else {
        Alert.alert(
          'Mikrofon-Berechtigung erforderlich',
          'Um die Sprachfunktion zu nutzen, benötigt die App Zugriff auf Ihr Mikrofon.',
          [
            { text: 'Abbrechen', style: 'cancel' },
            {
              text: 'Einstellungen öffnen',
              onPress: () => {
                // In real implementation, open app settings
                console.log('Open app settings');
              }
            }
          ]
        );
        return false;
      }
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      return false;
    }
  }, []);

  // Start listening
  const startListening = useCallback(async () => {
    if (disabled || isListening || isProcessing) return;

    try {
      setError(null);

      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) return;
      }

      const recognition = initializeSpeechRecognition();
      if (!recognition) {
        setError('Spracherkennung nicht verfügbar.');
        return;
      }

      recognitionRef.current = recognition;
      recognition.start();

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setError('Spracherkennung konnte nicht gestartet werden.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [disabled, isListening, isProcessing, hasPermission, requestPermission, initializeSpeechRecognition]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    setTranscription('');
    setConfidence(0);
    setIsInternalListening(false);
    stopVisualFeedback();

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Handle voice result
  const handleVoiceResult = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return;

    try {
      setIsProcessing(true);
      stopListening();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await onVoiceResult(transcript);

    } catch (error) {
      console.error('Error processing voice result:', error);
      setError('Sprachbefehl konnte nicht verarbeitet werden.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsProcessing(false);
    }
  }, [onVoiceResult, stopListening]);

  // Visual feedback animations
  const startVisualFeedback = useCallback(() => {
    // Scale animation
    Animated.timing(animationRef, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimationRef, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimationRef, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Wave animation
    const waveAnimation = Animated.loop(
      Animated.timing(waveAnimationRef, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    waveAnimation.start();

    // Simulate audio level changes
    audioLevelIntervalRef.current = setInterval(() => {
      setAudioLevel(Math.random() * 0.8 + 0.2);
    }, 100);
  }, [animationRef, pulseAnimationRef, waveAnimationRef]);

  const stopVisualFeedback = useCallback(() => {
    Animated.timing(animationRef, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    pulseAnimationRef.stopAnimation();
    waveAnimationRef.stopAnimation();

    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }

    setAudioLevel(0);
  }, [animationRef, pulseAnimationRef, waveAnimationRef]);

  // Button press handler
  const handlePress = useCallback(() => {
    if (disabled) return;

    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [disabled, isListening, startListening, stopListening]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopListening();
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
      }
    };
  }, [stopListening]);

  // Permission check on mount
  useEffect(() => {
    const checkPermission = async () => {
      const { status } = await Audio.getPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    checkPermission();
  }, []);

  // Render wave effect for listening state
  const renderWaveEffect = () => {
    if (!isListening) return null;

    const waves = Array.from({ length: 3 }, (_, index) => {
      const scale = waveAnimationRef.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.5 + index * 0.3],
      });

      const opacity = waveAnimationRef.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.6, 0.3, 0],
      });

      return (
        <Animated.View
          key={index}
          style={[
            styles.waveRing,
            {
              width: buttonSize + 20 + index * 15,
              height: buttonSize + 20 + index * 15,
              borderRadius: (buttonSize + 20 + index * 15) / 2,
              transform: [{ scale }],
              opacity,
            },
          ]}
        />
      );
    });

    return <View style={styles.waveContainer}>{waves}</View>;
  };

  // Render audio level indicator
  const renderAudioLevel = () => {
    if (!isListening) return null;

    const levelHeight = audioLevel * 20;

    return (
      <View style={styles.audioLevelContainer}>
        {Array.from({ length: 5 }, (_, index) => (
          <View
            key={index}
            style={[
              styles.audioLevelBar,
              {
                height: Math.max(2, levelHeight * (0.5 + Math.random() * 0.5)),
                opacity: audioLevel > index * 0.2 ? 1 : 0.3,
              },
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {renderWaveEffect()}

      <Animated.View
        style={[
          styles.buttonContainer,
          {
            transform: [{ scale: pulseAnimationRef }],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.voiceButton,
            {
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonSize / 2,
            },
            isListening && styles.voiceButtonListening,
            disabled && styles.voiceButtonDisabled,
            isProcessing && styles.voiceButtonProcessing,
          ]}
          onPress={handlePress}
          disabled={disabled || isProcessing}
          accessibilityLabel={
            isListening
              ? 'Spracherkennung beenden'
              : 'Spracherkennung starten'
          }
          accessibilityRole="button"
          accessibilityState={{
            disabled: disabled || isProcessing,
            selected: isListening
          }}
        >
          {isListening && Platform.OS === 'ios' && (
            <BlurView intensity={20} style={StyleSheet.absoluteFill} />
          )}

          <View style={styles.buttonContent}>
            {isProcessing ? (
              <View style={styles.processingIndicator}>
                <View style={styles.processingDots}>
                  {Array.from({ length: 3 }, (_, index) => (
                    <Animated.View
                      key={index}
                      style={[
                        styles.processingDot,
                        {
                          opacity: animationRef.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.3, 1],
                          }),
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
            ) : (
              <Ionicons
                name={isListening ? 'mic' : 'mic-outline'}
                size={iconSize}
                color={
                  disabled
                    ? '#999'
                    : isListening
                      ? 'white'
                      : '#FF6B35'
                }
              />
            )}
          </View>

          {isListening && renderAudioLevel()}
        </TouchableOpacity>
      </Animated.View>

      {showText && (
        <View style={styles.textContainer}>
          {isListening && (
            <Text style={[styles.statusText, textStyle]}>
              Hört zu...
            </Text>
          )}

          {transcription && (
            <Text style={[styles.transcriptionText, textStyle]} numberOfLines={2}>
              "{transcription}"
            </Text>
          )}

          {error && (
            <Text style={[styles.errorText, textStyle]} numberOfLines={2}>
              {error}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6B35',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  voiceButtonListening: {
    backgroundColor: '#FF6B35',
    borderColor: 'white',
  },
  voiceButtonDisabled: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ccc',
  },
  voiceButtonProcessing: {
    backgroundColor: '#3B82F6',
    borderColor: 'white',
  },
  buttonContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  processingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
  },
  audioLevelContainer: {
    position: 'absolute',
    bottom: -25,
    flexDirection: 'row',
    gap: 2,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  audioLevelBar: {
    width: 3,
    backgroundColor: 'white',
    borderRadius: 1.5,
    minHeight: 2,
  },
  textContainer: {
    marginTop: 12,
    alignItems: 'center',
    minHeight: 20,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  transcriptionText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default VoiceButton;
