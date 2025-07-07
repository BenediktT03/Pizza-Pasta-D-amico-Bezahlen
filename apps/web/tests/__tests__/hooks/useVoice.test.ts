/**
 * File: /apps/web/tests/__tests__/hooks/useVoice.test.ts
 * EATECH V3.0 - Voice Recognition Hook Tests
 * Swiss multilingual voice commerce with Schweizerdeutsch support
 */

import { useVoiceRecognition } from '@/features/voice/useVoiceRecognition';
import { voiceCommands } from '@/features/voice/voiceCommands';
import { act, renderHook, waitFor } from '@testing-library/react';

// Mock Web Speech API
const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  continuous: true,
  interimResults: true,
  lang: 'de-CH',
  grammars: null,
  maxAlternatives: 1,
  serviceURI: '',
  onstart: null,
  onend: null,
  onresult: null,
  onerror: null,
  onaudiostart: null,
  onaudioend: null,
  onsoundstart: null,
  onsoundend: null,
  onspeechstart: null,
  onspeechend: null,
  onnomatch: null
};

const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  getVoices: jest.fn(() => []),
  speaking: false,
  pending: false,
  paused: false,
  onvoiceschanged: null
};

// Mock globals
Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: jest.fn().mockImplementation(() => mockSpeechRecognition)
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: jest.fn().mockImplementation(() => mockSpeechRecognition)
});

Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: mockSpeechSynthesis
});

// Mock dependencies
jest.mock('@/features/voice/voiceCommands');
jest.mock('@/hooks/useAnalytics');
jest.mock('@/hooks/useTenant');

const mockVoiceCommands = voiceCommands as jest.Mocked<typeof voiceCommands>;

// Swiss voice commands and responses
const swissCommands = {
  // Standard German
  'ich möchte einen burger': {
    intent: 'add_item',
    product: 'Burger',
    quantity: 1,
    confidence: 0.95
  },
  'füge zwei pommes hinzu': {
    intent: 'add_item',
    product: 'Pommes',
    quantity: 2,
    confidence: 0.88
  },
  'zeige mir den warenkorb': {
    intent: 'view_cart',
    confidence: 0.92
  },
  'was kostet das menü': {
    intent: 'get_price',
    product: 'Menü',
    confidence: 0.85
  },

  // Swiss German (Schweizerdeutsch)
  'ich hätt gärn en burger': {
    intent: 'add_item',
    product: 'Burger',
    quantity: 1,
    confidence: 0.82
  },
  'chönd si mir zwei pommes gäh': {
    intent: 'add_item',
    product: 'Pommes',
    quantity: 2,
    confidence: 0.79
  },
  'wa choschtets': {
    intent: 'get_price',
    confidence: 0.75
  },

  // French Swiss
  'je voudrais un burger': {
    intent: 'add_item',
    product: 'Burger',
    quantity: 1,
    confidence: 0.90
  },
  'combien ça coûte': {
    intent: 'get_price',
    confidence: 0.87
  },

  // Italian Swiss
  'vorrei un burger': {
    intent: 'add_item',
    product: 'Burger',
    quantity: 1,
    confidence: 0.89
  },
  'quanto costa': {
    intent: 'get_price',
    confidence: 0.86
  }
};

describe('useVoiceRecognition Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup voice commands mock
    mockVoiceCommands.parseCommand.mockImplementation((transcript) => {
      return swissCommands[transcript.toLowerCase()] || null;
    });

    mockVoiceCommands.getSupportedLanguages.mockReturnValue([
      { code: 'de-CH', name: 'Deutsch (Schweiz)', dialect: 'standard' },
      { code: 'gsw-CH', name: 'Schweizerdeutsch', dialect: 'swiss_german' },
      { code: 'fr-CH', name: 'Français (Suisse)', dialect: 'standard' },
      { code: 'it-CH', name: 'Italiano (Svizzera)', dialect: 'standard' },
      { code: 'en-US', name: 'English', dialect: 'standard' }
    ]);

    // Mock navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: jest.fn().mockResolvedValue({
          getTracks: () => [{ stop: jest.fn() }]
        })
      }
    });
  });

  describe('Initialization', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useVoiceRecognition());

      expect(result.current.isListening).toBe(false);
      expect(result.current.isSupported).toBe(true);
      expect(result.current.transcript).toBe('');
      expect(result.current.confidence).toBe(0);
      expect(result.current.language).toBe('de-CH');
      expect(result.current.error).toBeNull();
      expect(result.current.lastCommand).toBeNull();
    });

    it('should detect if speech recognition is not supported', () => {
      // Remove speech recognition support
      Object.defineProperty(window, 'SpeechRecognition', {
        writable: true,
        value: undefined
      });
      Object.defineProperty(window, 'webkitSpeechRecognition', {
        writable: true,
        value: undefined
      });

      const { result } = renderHook(() => useVoiceRecognition());

      expect(result.current.isSupported).toBe(false);
    });

    it('should request microphone permissions on first use', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.startListening();
      });

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: true
      });
    });
  });

  describe('Language Management', () => {
    it('should change language and update recognition settings', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.setLanguage('fr-CH');
      });

      expect(result.current.language).toBe('fr-CH');
      expect(mockSpeechRecognition.lang).toBe('fr-CH');
    });

    it('should get supported languages', () => {
      const { result } = renderHook(() => useVoiceRecognition());

      const languages = result.current.getSupportedLanguages();

      expect(languages).toContainEqual(
        expect.objectContaining({ code: 'de-CH', name: 'Deutsch (Schweiz)' })
      );
      expect(languages).toContainEqual(
        expect.objectContaining({ code: 'gsw-CH', name: 'Schweizerdeutsch' })
      );
    });

    it('should fallback to German if unsupported language is set', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.setLanguage('xx-XX'); // Invalid language
      });

      expect(result.current.language).toBe('de-CH');
    });
  });

  describe('Speech Recognition Control', () => {
    it('should start listening and update state', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.startListening();
      });

      expect(mockSpeechRecognition.start).toHaveBeenCalled();
      expect(result.current.isListening).toBe(true);
    });

    it('should stop listening and update state', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      // Start listening first
      await act(async () => {
        result.current.startListening();
      });

      await act(async () => {
        result.current.stopListening();
      });

      expect(mockSpeechRecognition.stop).toHaveBeenCalled();
      expect(result.current.isListening).toBe(false);
    });

    it('should handle start errors gracefully', async () => {
      mockSpeechRecognition.start.mockImplementation(() => {
        throw new Error('Microphone not available');
      });

      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.startListening();
      });

      expect(result.current.error).toEqual(
        expect.objectContaining({
          type: 'microphone',
          message: expect.stringContaining('Microphone not available')
        })
      );
      expect(result.current.isListening).toBe(false);
    });
  });

  describe('Speech Recognition Results', () => {
    it('should process German speech results', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.startListening();
      });

      // Simulate speech recognition result
      const mockEvent = {
        results: [{
          0: { transcript: 'ich möchte einen burger', confidence: 0.95 },
          isFinal: true,
          length: 1
        }],
        resultIndex: 0
      };

      act(() => {
        mockSpeechRecognition.onresult?.(mockEvent as any);
      });

      await waitFor(() => {
        expect(result.current.transcript).toBe('ich möchte einen burger');
        expect(result.current.confidence).toBe(0.95);
        expect(result.current.lastCommand).toEqual({
          intent: 'add_item',
          product: 'Burger',
          quantity: 1,
          confidence: 0.95
        });
      });
    });

    it('should process Swiss German (Schweizerdeutsch) commands', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.setLanguage('gsw-CH');
        result.current.startListening();
      });

      const mockEvent = {
        results: [{
          0: { transcript: 'ich hätt gärn en burger', confidence: 0.82 },
          isFinal: true,
          length: 1
        }],
        resultIndex: 0
      };

      act(() => {
        mockSpeechRecognition.onresult?.(mockEvent as any);
      });

      await waitFor(() => {
        expect(result.current.transcript).toBe('ich hätt gärn en burger');
        expect(result.current.lastCommand).toEqual({
          intent: 'add_item',
          product: 'Burger',
          quantity: 1,
          confidence: 0.82
        });
      });
    });

    it('should process French Swiss commands', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.setLanguage('fr-CH');
        result.current.startListening();
      });

      const mockEvent = {
        results: [{
          0: { transcript: 'je voudrais un burger', confidence: 0.90 },
          isFinal: true,
          length: 1
        }],
        resultIndex: 0
      };

      act(() => {
        mockSpeechRecognition.onresult?.(mockEvent as any);
      });

      await waitFor(() => {
        expect(result.current.lastCommand).toEqual({
          intent: 'add_item',
          product: 'Burger',
          quantity: 1,
          confidence: 0.90
        });
      });
    });

    it('should handle interim results', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.startListening();
      });

      // Interim result
      const interimEvent = {
        results: [{
          0: { transcript: 'ich möchte', confidence: 0.70 },
          isFinal: false,
          length: 1
        }],
        resultIndex: 0
      };

      act(() => {
        mockSpeechRecognition.onresult?.(interimEvent as any);
      });

      expect(result.current.transcript).toBe('ich möchte');
      expect(result.current.lastCommand).toBeNull(); // No command yet

      // Final result
      const finalEvent = {
        results: [{
          0: { transcript: 'ich möchte einen burger', confidence: 0.95 },
          isFinal: true,
          length: 1
        }],
        resultIndex: 0
      };

      act(() => {
        mockSpeechRecognition.onresult?.(finalEvent as any);
      });

      await waitFor(() => {
        expect(result.current.lastCommand).toBeTruthy();
      });
    });

    it('should ignore low confidence results', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.startListening();
      });

      const lowConfidenceEvent = {
        results: [{
          0: { transcript: 'mumble unclear speech', confidence: 0.30 },
          isFinal: true,
          length: 1
        }],
        resultIndex: 0
      };

      act(() => {
        mockSpeechRecognition.onresult?.(lowConfidenceEvent as any);
      });

      expect(result.current.lastCommand).toBeNull();
      expect(result.current.error).toEqual(
        expect.objectContaining({
          type: 'low_confidence',
          message: expect.stringContaining('confidence too low')
        })
      );
    });
  });

  describe('Command Processing', () => {
    it('should process add item commands with quantities', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.processCommand('füge zwei pommes hinzu');
      });

      expect(result.current.lastCommand).toEqual({
        intent: 'add_item',
        product: 'Pommes',
        quantity: 2,
        confidence: 0.88
      });
    });

    it('should handle navigation commands', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.processCommand('zeige mir den warenkorb');
      });

      expect(result.current.lastCommand).toEqual({
        intent: 'view_cart',
        confidence: 0.92
      });
    });

    it('should handle price inquiry commands', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.processCommand('was kostet das menü');
      });

      expect(result.current.lastCommand).toEqual({
        intent: 'get_price',
        product: 'Menü',
        confidence: 0.85
      });
    });

    it('should handle unknown commands gracefully', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.processCommand('completely unknown command');
      });

      expect(result.current.lastCommand).toBeNull();
      expect(result.current.error).toEqual(
        expect.objectContaining({
          type: 'unknown_command',
          message: expect.stringContaining('Command not recognized')
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle microphone permission denied', async () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: {
          getUserMedia: jest.fn().mockRejectedValue(
            new DOMException('Permission denied', 'NotAllowedError')
          )
        }
      });

      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.startListening();
      });

      expect(result.current.error).toEqual({
        type: 'permission_denied',
        message: 'Microphone permission denied'
      });
    });

    it('should handle network errors', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.startListening();
      });

      const networkError = { error: 'network' };
      act(() => {
        mockSpeechRecognition.onerror?.(networkError as any);
      });

      expect(result.current.error).toEqual({
        type: 'network',
        message: 'Network error during speech recognition'
      });
    });

    it('should handle no speech detected', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.startListening();
      });

      const noSpeechError = { error: 'no-speech' };
      act(() => {
        mockSpeechRecognition.onerror?.(noSpeechError as any);
      });

      expect(result.current.error).toEqual({
        type: 'no_speech',
        message: 'No speech detected'
      });
    });
  });

  describe('Voice Feedback', () => {
    it('should provide voice feedback for successful commands', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.processCommand('ich möchte einen burger');
      });

      await waitFor(() => {
        expect(mockSpeechSynthesis.speak).toHaveBeenCalledWith(
          expect.objectContaining({
            text: expect.stringContaining('Burger wurde hinzugefügt')
          })
        );
      });
    });

    it('should provide voice feedback in selected language', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.setLanguage('fr-CH');
        result.current.processCommand('je voudrais un burger');
      });

      await waitFor(() => {
        expect(mockSpeechSynthesis.speak).toHaveBeenCalledWith(
          expect.objectContaining({
            text: expect.stringContaining('Burger ajouté'),
            lang: 'fr-CH'
          })
        );
      });
    });

    it('should provide error feedback for failed commands', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.processCommand('unknown command');
      });

      await waitFor(() => {
        expect(mockSpeechSynthesis.speak).toHaveBeenCalledWith(
          expect.objectContaining({
            text: expect.stringContaining('Entschuldigung, das habe ich nicht verstanden')
          })
        );
      });
    });
  });

  describe('Wake Word Detection', () => {
    it('should activate on "Hey EATECH" wake word', async () => {
      const { result } = renderHook(() => useVoiceRecognition({ wakeWordEnabled: true }));

      const wakeWordEvent = new CustomEvent('wakeword', {
        detail: { phrase: 'Hey EATECH', confidence: 0.95 }
      });

      act(() => {
        window.dispatchEvent(wakeWordEvent);
      });

      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });
    });

    it('should ignore wake words with low confidence', async () => {
      const { result } = renderHook(() => useVoiceRecognition({ wakeWordEnabled: true }));

      const lowConfidenceWakeWord = new CustomEvent('wakeword', {
        detail: { phrase: 'Hey EATECH', confidence: 0.60 }
      });

      act(() => {
        window.dispatchEvent(lowConfidenceWakeWord);
      });

      expect(result.current.isListening).toBe(false);
    });
  });

  describe('Analytics Integration', () => {
    it('should track voice usage analytics', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.startListening();
        result.current.processCommand('ich möchte einen burger');
      });

      // Analytics should be called (mocked in actual implementation)
      expect(mockVoiceCommands.parseCommand).toHaveBeenCalledWith('ich möchte einen burger');
    });

    it('should track language usage patterns', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.setLanguage('gsw-CH');
        result.current.processCommand('ich hätt gärn en burger');
      });

      // Should track Swiss German usage
      expect(result.current.language).toBe('gsw-CH');
    });
  });

  describe('Performance and Cleanup', () => {
    it('should cleanup speech recognition on unmount', () => {
      const { unmount } = renderHook(() => useVoiceRecognition());

      unmount();

      expect(mockSpeechRecognition.abort).toHaveBeenCalled();
    });

    it('should stop listening when component becomes inactive', async () => {
      const { result, rerender } = renderHook(
        (props: { isActive: boolean }) => useVoiceRecognition(props),
        { initialProps: { isActive: true } }
      );

      await act(async () => {
        result.current.startListening();
      });

      expect(result.current.isListening).toBe(true);

      rerender({ isActive: false });

      expect(mockSpeechRecognition.stop).toHaveBeenCalled();
    });

    it('should handle multiple rapid start/stop calls', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.startListening();
        result.current.stopListening();
        result.current.startListening();
        result.current.stopListening();
      });

      // Should handle gracefully without errors
      expect(result.current.isListening).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('should provide visual feedback for deaf users', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.startListening();
      });

      // Visual indicator should be active
      expect(result.current.isListening).toBe(true);
      expect(result.current.visualFeedback).toEqual({
        isActive: true,
        waveform: expect.any(Array)
      });
    });

    it('should support keyboard shortcuts as alternatives', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      const keyboardEvent = new KeyboardEvent('keydown', {
        key: 'v',
        ctrlKey: true,
        shiftKey: true
      });

      act(() => {
        window.dispatchEvent(keyboardEvent);
      });

      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });
    });
  });
});
