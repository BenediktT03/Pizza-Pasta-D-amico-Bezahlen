/**
 * EATECH Voice Order Component
 * 
 * Sprachbestellungs-Feature mit:
 * - OpenAI Whisper für Transkription
 * - Schweizerdeutsch-Support
 * - GPT-4 für Intent-Erkennung
 * - Echtzeit-Feedback
 * - Korrektur-Möglichkeiten
 * - Multi-Language Support (DE/FR/IT/EN + Dialekte)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MicrophoneIcon,
  StopIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
  SpeakerWaveIcon,
  LanguageIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  MinusIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { MicrophoneIcon as MicrophoneSolid } from '@heroicons/react/24/solid';

// Core imports
import { useFeatureFlag } from '@eatech/core/hooks/useFeatureFlag';
import { useCart } from '@eatech/core/hooks/useCart';
import { formatPrice } from '@eatech/core/utils/formatters';
import { Product, VoiceOrderItem } from '@eatech/types';

// UI imports
import {
  Button,
  Card,
  Alert,
  Modal,
  Badge,
  IconButton,
  Select,
  Spinner,
  ProgressBar,
  Tooltip
} from '@eatech/ui';

// Services
import { voiceService } from '../../services/voice.service';
import { analyticsService } from '../../services/analytics.service';

// Styles
import styles from './VoiceOrder.module.css';

// Constants
const SUPPORTED_LANGUAGES = [
  { code: 'de', name: 'Deutsch', dialect: 'standard' },
  { code: 'de-CH', name: 'Schweizerdeutsch', dialect: 'swiss' },
  { code: 'fr', name: 'Français', dialect: 'standard' },
  { code: 'it', name: 'Italiano', dialect: 'standard' },
  { code: 'en', name: 'English', dialect: 'standard' }
];

const MAX_RECORDING_TIME = 60; // seconds
const MIN_RECORDING_TIME = 1; // seconds

interface VoiceOrderProps {
  truckId: string;
  products: Product[];
  onClose: () => void;
  onSuccess: (items: VoiceOrderItem[]) => void;
  embedded?: boolean;
}

export const VoiceOrder: React.FC<VoiceOrderProps> = ({
  truckId,
  products,
  onClose,
  onSuccess,
  embedded = false
}) => {
  const { t, i18n } = useTranslation();
  
  // Feature Flags
  const { enabled: swissGermanEnabled } = useFeatureFlag('voice_swiss_german');
  const { enabled: voiceFeedbackEnabled } = useFeatureFlag('voice_feedback');
  const { enabled: voiceCorrectionsEnabled } = useFeatureFlag('voice_corrections');
  const { enabled: smartSuggestionsEnabled } = useFeatureFlag('voice_smart_suggestions');
  
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState(
    i18n.language.startsWith('de') && swissGermanEnabled ? 'de-CH' : i18n.language
  );
  const [transcription, setTranscription] = useState<string>('');
  const [parsedItems, setParsedItems] = useState<VoiceOrderItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Get available languages
  const availableLanguages = SUPPORTED_LANGUAGES.filter(lang => {
    if (lang.code === 'de-CH' && !swissGermanEnabled) return false;
    return true;
  });
  
  // Initialize audio context
  useEffect(() => {
    return () => {
      // Cleanup
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  // Start recording
  const startRecording = async () => {
    try {
      setError(null);
      setTranscription('');
      setParsedItems([]);
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Setup audio visualization
      setupAudioVisualization(stream);
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= MAX_RECORDING_TIME - 1) {
            stopRecording();
            return MAX_RECORDING_TIME;
          }
          return prev + 1;
        });
      }, 1000);
      
      // Analytics
      analyticsService.trackEvent('voice_order_started', {
        language: selectedLanguage,
        dialect: availableLanguages.find(l => l.code === selectedLanguage)?.dialect
      });
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      setError(t('voice.microphoneError'));
    }
  };
  
  // Setup audio visualization
  const setupAudioVisualization = (stream: MediaStream) => {
    audioContextRef.current = new AudioContext();
    analyserRef.current = audioContextRef.current.createAnalyser();
    
    const source = audioContextRef.current.createMediaStreamSource(stream);
    source.connect(analyserRef.current);
    
    analyserRef.current.fftSize = 256;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const updateLevel = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      setAudioLevel(average / 255);
      
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };
    
    updateLevel();
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };
  
  // Process audio
  const processAudio = async (audioBlob: Blob) => {
    if (recordingTime < MIN_RECORDING_TIME) {
      setError(t('voice.recordingTooShort'));
      setRecordingTime(0);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Send to voice service
      const result = await voiceService.processVoiceOrder({
        audio: audioBlob,
        language: selectedLanguage,
        products: products,
        truckId
      });
      
      setTranscription(result.transcription);
      setParsedItems(result.items);
      
      // Analytics
      analyticsService.trackEvent('voice_order_processed', {
        language: selectedLanguage,
        transcriptionLength: result.transcription.length,
        itemsFound: result.items.length,
        confidence: result.confidence
      });
      
      if (result.items.length > 0) {
        setShowConfirmation(true);
        
        // Voice feedback
        if (voiceFeedbackEnabled) {
          speakOrderSummary(result.items);
        }
      } else {
        setError(t('voice.noItemsFound'));
      }
    } catch (err: any) {
      console.error('Voice processing error:', err);
      setError(err.message || t('voice.processingError'));
      
      analyticsService.trackEvent('voice_order_failed', {
        error: err.message,
        language: selectedLanguage
      });
    } finally {
      setIsProcessing(false);
      setRecordingTime(0);
    }
  };
  
  // Speak order summary
  const speakOrderSummary = (items: VoiceOrderItem[]) => {
    if (!('speechSynthesis' in window)) return;
    
    const utterance = new SpeechSynthesisUtterance();
    utterance.lang = selectedLanguage;
    utterance.rate = 0.9;
    
    const itemsText = items.map(item => 
      `${item.quantity} ${item.product.name[i18n.language] || item.product.name.de}`
    ).join(', ');
    
    utterance.text = t('voice.orderSummarySpeak', { items: itemsText });
    
    speechSynthesis.speak(utterance);
  };
  
  // Handle item quantity change
  const handleQuantityChange = (itemId: string, delta: number) => {
    setParsedItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(1, Math.min(99, item.quantity + delta));
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };
  
  // Handle item removal
  const handleRemoveItem = (itemId: string) => {
    setParsedItems(prev => prev.filter(item => item.id !== itemId));
  };
  
  // Handle order confirmation
  const handleConfirmOrder = () => {
    onSuccess(parsedItems);
    
    analyticsService.trackConversion('voice_order_confirmed', {
      itemCount: parsedItems.length,
      totalItems: parsedItems.reduce((sum, item) => sum + item.quantity, 0),
      language: selectedLanguage
    });
  };
  
  // Retry with new recording
  const handleRetry = () => {
    setTranscription('');
    setParsedItems([]);
    setError(null);
    setShowConfirmation(false);
    startRecording();
  };
  
  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Main content
  const content = (
    <div className={styles.voiceOrder}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          <MicrophoneIcon className="w-6 h-6" />
          {t('voice.title')}
        </h2>
        
        {/* Language selector */}
        <Select
          value={selectedLanguage}
          onChange={(value) => setSelectedLanguage(value)}
          options={availableLanguages.map(lang => ({
            value: lang.code,
            label: lang.name,
            icon: lang.dialect === 'swiss' ? '🇨🇭' : '🌐'
          }))}
          disabled={isRecording || isProcessing}
        />
      </div>
      
      {/* Instructions */}
      {!isRecording && !isProcessing && !showConfirmation && (
        <div className={styles.instructions}>
          <p>{t('voice.instructions')}</p>
          <div className={styles.examples}>
            <h4>{t('voice.examplesTitle')}</h4>
            <ul>
              {(t('voice.examples', { returnObjects: true }) as string[]).map((example, i) => (
                <li key={i}>{example}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* Recording interface */}
      {isRecording && (
        <div className={styles.recordingInterface}>
          <div className={styles.waveform}>
            <motion.div
              className={styles.audioLevel}
              animate={{ scaleY: audioLevel }}
              transition={{ duration: 0.1 }}
            />
          </div>
          
          <div className={styles.recordingStatus}>
            <Badge variant="danger" className={styles.recordingBadge}>
              <span className={styles.recordingDot} />
              {t('voice.recording')}
            </Badge>
            <span className={styles.timer}>{formatTime(recordingTime)}</span>
          </div>
          
          <p className={styles.recordingHint}>
            {t('voice.speakNow')}
          </p>
          
          <ProgressBar
            value={recordingTime}
            max={MAX_RECORDING_TIME}
            className={styles.progressBar}
          />
        </div>
      )}
      
      {/* Processing */}
      {isProcessing && (
        <div className={styles.processing}>
          <Spinner size="lg" />
          <p>{t('voice.processing')}</p>
          <p className={styles.processingHint}>
            {t('voice.processingHint')}
          </p>
        </div>
      )}
      
      {/* Transcription display */}
      {transcription && !showConfirmation && (
        <Card className={styles.transcription}>
          <h4>{t('voice.whatWeHeard')}</h4>
          <p>{transcription}</p>
        </Card>
      )}
      
      {/* Order confirmation */}
      {showConfirmation && parsedItems.length > 0 && (
        <div className={styles.confirmation}>
          <h3>{t('voice.confirmOrder')}</h3>
          
          <div className={styles.itemsList}>
            <AnimatePresence>
              {parsedItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={styles.orderItem}
                >
                  <Card className={styles.itemCard}>
                    <div className={styles.itemInfo}>
                      <h4>
                        {item.product.name[i18n.language] || item.product.name.de}
                      </h4>
                      {item.modifiers.length > 0 && (
                        <p className={styles.modifiers}>
                          {item.modifiers.join(', ')}
                        </p>
                      )}
                      {item.specialInstructions && (
                        <p className={styles.instructions}>
                          {item.specialInstructions}
                        </p>
                      )}
                    </div>
                    
                    <div className={styles.itemControls}>
                      <div className={styles.quantityControls}>
                        <IconButton
                          size="sm"
                          variant="ghost"
                          onClick={() => handleQuantityChange(item.id, -1)}
                          disabled={item.quantity <= 1}
                        >
                          <MinusIcon className="w-4 h-4" />
                        </IconButton>
                        
                        <span className={styles.quantity}>{item.quantity}</span>
                        
                        <IconButton
                          size="sm"
                          variant="ghost"
                          onClick={() => handleQuantityChange(item.id, 1)}
                          disabled={item.quantity >= 99}
                        >
                          <PlusIcon className="w-4 h-4" />
                        </IconButton>
                      </div>
                      
                      <span className={styles.price}>
                        {formatPrice(item.product.price * item.quantity)}
                      </span>
                      
                      <IconButton
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </IconButton>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          {voiceCorrectionsEnabled && (
            <Alert variant="info" size="sm" className={styles.correctionHint}>
              <PencilIcon className="w-4 h-4" />
              <span>{t('voice.correctionHint')}</span>
            </Alert>
          )}
        </div>
      )}
      
      {/* Error display */}
      {error && (
        <Alert variant="error" className={styles.error}>
          <ExclamationTriangleIcon className="w-5 h-5" />
          <span>{error}</span>
        </Alert>
      )}
      
      {/* Smart suggestions */}
      {smartSuggestionsEnabled && parsedItems.length > 0 && (
        <div className={styles.suggestions}>
          <h4>{t('voice.suggestions')}</h4>
          <div className={styles.suggestionChips}>
            {/* Suggestions would be generated based on order */}
            <Badge
              variant="secondary"
              className={styles.suggestionChip}
              onClick={() => {/* Add suggestion */}}
            >
              + {t('voice.addDrink')}
            </Badge>
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className={styles.actions}>
        {!isRecording && !isProcessing && !showConfirmation && (
          <>
            <Button
              variant="secondary"
              onClick={onClose}
              fullWidth
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={startRecording}
              startIcon={<MicrophoneIcon className="w-5 h-5" />}
              fullWidth
              size="lg"
            >
              {t('voice.startRecording')}
            </Button>
          </>
        )}
        
        {isRecording && (
          <Button
            variant="danger"
            onClick={stopRecording}
            startIcon={<StopIcon className="w-5 h-5" />}
            fullWidth
            size="lg"
          >
            {t('voice.stopRecording')}
          </Button>
        )}
        
        {showConfirmation && (
          <>
            <Button
              variant="secondary"
              onClick={handleRetry}
              startIcon={<ArrowPathIcon className="w-5 h-5" />}
              fullWidth
            >
              {t('voice.retry')}
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmOrder}
              startIcon={<CheckCircleIcon className="w-5 h-5" />}
              fullWidth
              disabled={parsedItems.length === 0}
            >
              {t('voice.confirmAndAdd')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
  
  // Render as modal or embedded
  if (embedded) {
    return content;
  }
  
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size="lg"
      className={styles.voiceModal}
    >
      {content}
    </Modal>
  );
};

// Voice Order Button Component
export const VoiceOrderButton: React.FC<{
  onClick: () => void;
  className?: string;
}> = ({ onClick, className }) => {
  const { t } = useTranslation();
  const { enabled: voiceEnabled } = useFeatureFlag('voice_ordering');
  
  if (!voiceEnabled) return null;
  
  return (
    <Tooltip content={t('voice.buttonTooltip')}>
      <Button
        variant="primary"
        size="lg"
        onClick={onClick}
        className={`${styles.voiceButton} ${className}`}
        startIcon={<MicrophoneIcon className="w-5 h-5" />}
      >
        {t('voice.buttonText')}
      </Button>
    </Tooltip>
  );
};

// Export
export default VoiceOrder;