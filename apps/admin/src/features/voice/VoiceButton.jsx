import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader } from 'lucide-react';
import styles from './VoiceButton.module.css';

export const VoiceButton = ({
  onClick,
  isListening = false,
  isProcessing = false,
  className = '',
  size = 'medium',
  showTooltip = true,
  tooltipText = 'Sprachbefehl',
  disabled = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const buttonRef = useRef(null);

  useEffect(() => {
    // Show pulse animation when listening starts
    if (isListening) {
      setShowPulse(true);
    } else {
      setShowPulse(false);
    }
  }, [isListening]);

  const handleClick = (e) => {
    if (!disabled && !isProcessing) {
      onClick?.(e);

      // Add ripple effect
      const button = buttonRef.current;
      const ripple = document.createElement('span');
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.classList.add(styles.ripple);

      button.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, 600);
    }
  };

  const getIcon = () => {
    if (isProcessing) {
      return <Loader className={styles.iconProcessing} />;
    }
    if (isListening) {
      return <Mic className={styles.iconActive} />;
    }
    return <MicOff className={styles.icon} />;
  };

  const getStatusText = () => {
    if (isProcessing) return 'Verarbeite...';
    if (isListening) return 'Sprechen Sie jetzt...';
    return tooltipText;
  };

  return (
    <div className={`${styles.container} ${className}`}>
      <button
        ref={buttonRef}
        className={`
          ${styles.button}
          ${styles[size]}
          ${isListening ? styles.listening : ''}
          ${isProcessing ? styles.processing : ''}
          ${disabled ? styles.disabled : ''}
          ${showPulse ? styles.pulse : ''}
        `}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={disabled}
        aria-label={getStatusText()}
        aria-pressed={isListening}
      >
        {getIcon()}

        {/* Pulse rings for listening state */}
        {showPulse && (
          <>
            <span className={styles.pulseRing}></span>
            <span className={`${styles.pulseRing} ${styles.pulseRing2}`}></span>
            <span className={`${styles.pulseRing} ${styles.pulseRing3}`}></span>
          </>
        )}

        {/* Sound wave animation */}
        {isListening && (
          <div className={styles.soundWaves}>
            <span className={styles.wave}></span>
            <span className={styles.wave}></span>
            <span className={styles.wave}></span>
            <span className={styles.wave}></span>
            <span className={styles.wave}></span>
          </div>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && isHovered && !isListening && !isProcessing && (
        <div className={styles.tooltip}>
          <span>{getStatusText()}</span>
          <div className={styles.tooltipArrow}></div>
        </div>
      )}

      {/* Status text for mobile or when active */}
      {(isListening || isProcessing) && (
        <div className={styles.statusText}>
          {getStatusText()}
        </div>
      )}
    </div>
  );
};

// Convenience components for different use cases
export const VoiceSearchButton = (props) => (
  <VoiceButton
    {...props}
    tooltipText="Sprachsuche"
    size="small"
  />
);

export const VoiceCommandButton = (props) => (
  <VoiceButton
    {...props}
    tooltipText="Sprachbefehl"
    size="medium"
  />
);

export const VoiceOrderButton = (props) => (
  <VoiceButton
    {...props}
    tooltipText="Bestellung per Sprache"
    size="large"
  />
);
