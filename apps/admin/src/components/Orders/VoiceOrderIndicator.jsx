// apps/admin/src/components/Orders/VoiceOrderIndicator.jsx
// Voice Order Indicator Component - Shows when an order was placed via voice
// Version: 1.0.0

import React from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import styles from './VoiceOrderIndicator.module.css';

export const VoiceOrderIndicator = ({
  isVoiceOrder,
  orderNumber,
  language = 'de',
  confidence = null,
  isActive = false,
  size = 'medium'
}) => {
  if (!isVoiceOrder) return null;

  // Language-specific voice indicator
  const getLanguageClass = () => {
    switch (language) {
      case 'de-CH': return styles.swiss;
      case 'fr': return styles.french;
      case 'it': return styles.italian;
      case 'en': return styles.english;
      default: return '';
    }
  };

  // Confidence level styling
  const getConfidenceClass = () => {
    if (!confidence) return '';
    if (confidence >= 0.9) return styles.high;
    if (confidence >= 0.7) return styles.medium;
    return styles.low;
  };

  return (
    <div
      className={`
        ${styles.voiceIndicator}
        ${getLanguageClass()}
        ${isActive ? styles.active : ''}
        ${styles[size] || ''}
      `}
      title={`Sprachbestellung${confidence ? ` (${Math.round(confidence * 100)}% Sicherheit)` : ''}`}
    >
      <Mic className={styles.icon} />

      {isActive && (
        <div className={styles.voiceWaves}>
          <span className={styles.wave}></span>
          <span className={styles.wave}></span>
          <span className={styles.wave}></span>
          <span className={styles.wave}></span>
          <span className={styles.wave}></span>
        </div>
      )}

      <span className={styles.text}>
        {language === 'de-CH' ? 'Sproochbstellig' : 'Sprachbestellung'}
      </span>

      {orderNumber && (
        <span className={styles.orderNumber}>#{orderNumber}</span>
      )}

      {confidence !== null && (
        <span className={`${styles.confidence} ${getConfidenceClass()}`}>
          {Math.round(confidence * 100)}%
        </span>
      )}
    </div>
  );
};

// Voice Button Component
export const VoiceButton = ({
  onClick,
  isListening = false,
  disabled = false,
  size = 'medium',
  showTooltip = true
}) => {
  const [showRipple, setShowRipple] = React.useState(false);

  const handleClick = (e) => {
    if (disabled) return;

    // Ripple effect
    setShowRipple(true);
    setTimeout(() => setShowRipple(false), 600);

    onClick?.(e);
  };

  return (
    <button
      className={`
        ${styles.voiceButton}
        ${isListening ? styles.listening : ''}
        ${styles[size] || ''}
      `}
      onClick={handleClick}
      disabled={disabled}
      aria-label={isListening ? 'Stop listening' : 'Start voice input'}
      title={showTooltip ? (isListening ? 'Aufnahme stoppen' : 'Sprachbefehl starten') : undefined}
    >
      {isListening ? (
        <MicOff className={styles.icon} />
      ) : (
        <Mic className={styles.icon} />
      )}

      {showRipple && <span className={styles.ripple} />}
    </button>
  );
};

// Voice Status Component
export const VoiceStatus = ({
  isActive,
  isListening,
  transcript = '',
  error = null
}) => {
  if (!isActive && !transcript && !error) return null;

  return (
    <div className={`${styles.voiceStatus} ${isActive ? styles.active : ''}`}>
      {isListening && (
        <>
          <Mic className={styles.icon} />
          <span>Ich höre zu...</span>
        </>
      )}

      {transcript && !isListening && (
        <>
          <Volume2 className={styles.icon} />
          <span>Verstanden: "{transcript}"</span>
        </>
      )}

      {error && (
        <>
          <MicOff className={styles.icon} />
          <span className={styles.error}>{error}</span>
        </>
      )}
    </div>
  );
};

// Voice Transcript Display
export const VoiceTranscript = ({
  transcript,
  isListening,
  confidence = null,
  placeholder = 'Sprechen Sie jetzt...'
}) => {
  return (
    <div className={`${styles.transcript} ${isListening ? styles.listening : ''}`}>
      {transcript ? (
        <>
          <span className={styles.transcriptText}>{transcript}</span>
          {confidence !== null && (
            <span className={`${styles.confidence} ${
              confidence > 0.8 ? styles.high :
              confidence > 0.6 ? styles.medium :
              styles.low
            }`}>
              {Math.round(confidence * 100)}%
            </span>
          )}
        </>
      ) : (
        <span className={styles.transcriptPlaceholder}>
          {isListening ? placeholder : 'Klicken Sie auf das Mikrofon'}
        </span>
      )}
    </div>
  );
};

// Compound Component Export
const VoiceComponents = {
  Indicator: VoiceOrderIndicator,
  Button: VoiceButton,
  Status: VoiceStatus,
  Transcript: VoiceTranscript
};

export default VoiceComponents;
