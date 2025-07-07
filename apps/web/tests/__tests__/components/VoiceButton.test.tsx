/**
 * File: /apps/web/tests/__tests__/components/VoiceButton.test.tsx
 * EATECH V3.0 - Voice Button Component Tests
 * Swiss multilingual voice commerce testing (DE/FR/IT/EN + Schweizerdeutsch)
 */

import { useCart } from '@/features/cart/useCart';
import { VoiceButton } from '@/features/voice/VoiceButton';
import { useVoiceRecognition } from '@/features/voice/useVoiceRecognition';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Web Speech API
const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  continuous: false,
  interimResults: false,
  lang: 'de-CH',
  onstart: null,
  onend: null,
  onresult: null,
  onerror: null
};

// Mock dependencies
jest.mock('@/features/voice/useVoiceRecognition');
jest.mock('@/features/cart/useCart');
jest.mock('@/hooks/useAnalytics');

const mockUseVoiceRecognition = useVoiceRecognition as jest.MockedFunction<typeof useVoiceRecognition>;
const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;

// Mock global SpeechRecognition
Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: jest.fn().mockImplementation(() => mockSpeechRecognition)
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: jest.fn().mockImplementation(() => mockSpeechRecognition)
});

const mockVoiceActions = {
  startListening: jest.fn(),
  stopListening: jest.fn(),
  processCommand: jest.fn(),
  setLanguage: jest.fn()
};

const mockCartActions = {
  addItem: jest.fn(),
  removeItem: jest.fn(),
  clearCart: jest.fn()
};

describe('VoiceButton Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseVoiceRecognition.mockReturnValue({
      isListening: false,
      isSupported: true,
      transcript: '',
      confidence: 0,
      language: 'de-CH',
      error: null,
      lastCommand: null,
      ...mockVoiceActions
    });

    mockUseCart.mockReturnValue({
      items: [],
      total: 0,
      itemCount: 0,
      ...mockCartActions
    });

    // Mock navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: jest.fn().mockResolvedValue({})
      }
    });
  });

  describe('Rendering', () => {
    it('should render voice button when speech recognition is supported', () => {
      render(<VoiceButton />);

      const voiceButton = screen.getByRole('button', { name: /Spracheingabe/i });
      expect(voiceButton).toBeInTheDocument();
      expect(screen.getByLabelText(/Mikrofon/i)).toBeInTheDocument();
    });

    it('should not render when speech recognition is not supported', () => {
      mockUseVoiceRecognition.mockReturnValue({
        ...mockUseVoiceRecognition(),
        isSupported: false
      });

      render(<VoiceButton />);

      expect(screen.queryByRole('button', { name: /Spracheingabe/i })).not.toBeInTheDocument();
    });

    it('should show listening state correctly', () => {
      mockUseVoiceRecognition.mockReturnValue({
        ...mockUseVoiceRecognition(),
        isListening: true
      });

      render(<VoiceButton />);

      expect(screen.getByRole('button', { name: /Höre zu/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Aktiv/i)).toBeInTheDocument();
    });

    it('should display current language', () => {
      render(<VoiceButton />);

      expect(screen.getByText('DE')).toBeInTheDocument();
    });
  });

  describe('Voice Recognition Interaction', () => {
    it('should start listening when button is clicked', async () => {
      const user = userEvent.setup();
      render(<VoiceButton />);

      const voiceButton = screen.getByRole('button', { name: /Spracheingabe/i });
      await user.click(voiceButton);

      expect(mockVoiceActions.startListening).toHaveBeenCalled();
    });

    it('should stop listening when clicked while listening', async () => {
      mockUseVoiceRecognition.mockReturnValue({
        ...mockUseVoiceRecognition(),
        isListening: true
      });

      const user = userEvent.setup();
      render(<VoiceButton />);

      const voiceButton = screen.getByRole('button', { name: /Höre zu/i });
      await user.click(voiceButton);

      expect(mockVoiceActions.stopListening).toHaveBeenCalled();
    });

    it('should handle microphone permission request', async () => {
      const mockGetUserMedia = jest.fn().mockResolvedValue({});
      Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: { getUserMedia: mockGetUserMedia }
      });

      const user = userEvent.setup();
      render(<VoiceButton />);

      const voiceButton = screen.getByRole('button', { name: /Spracheingabe/i });
      await user.click(voiceButton);

      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    });
  });

  describe('Language Selection', () => {
    it('should show language dropdown when language button is clicked', async () => {
      const user = userEvent.setup();
      render(<VoiceButton />);

      const languageButton = screen.getByRole('button', { name: /Sprache wählen/i });
      await user.click(languageButton);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByText('Deutsch (Schweiz)')).toBeInTheDocument();
      expect(screen.getByText('Français (Suisse)')).toBeInTheDocument();
      expect(screen.getByText('Italiano (Svizzera)')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('Schweizerdeutsch')).toBeInTheDocument();
    });

    it('should change language when selected from dropdown', async () => {
      const user = userEvent.setup();
      render(<VoiceButton />);

      const languageButton = screen.getByRole('button', { name: /Sprache wählen/i });
      await user.click(languageButton);

      const frenchOption = screen.getByText('Français (Suisse)');
      await user.click(frenchOption);

      expect(mockVoiceActions.setLanguage).toHaveBeenCalledWith('fr-CH');
    });

    it('should update button text based on selected language', () => {
      mockUseVoiceRecognition.mockReturnValue({
        ...mockUseVoiceRecognition(),
        language: 'fr-CH'
      });

      render(<VoiceButton />);

      expect(screen.getByText('FR')).toBeInTheDocument();
    });
  });

  describe('Voice Commands Processing', () => {
    it('should display transcript while listening', () => {
      mockUseVoiceRecognition.mockReturnValue({
        ...mockUseVoiceRecognition(),
        isListening: true,
        transcript: 'Ich möchte einen Burger'
      });

      render(<VoiceButton />);

      expect(screen.getByText('Ich möchte einen Burger')).toBeInTheDocument();
    });

    it('should show confidence score for recognized speech', () => {
      mockUseVoiceRecognition.mockReturnValue({
        ...mockUseVoiceRecognition(),
        transcript: 'Ich möchte einen Burger',
        confidence: 0.87
      });

      render(<VoiceButton />);

      expect(screen.getByText('87%')).toBeInTheDocument();
    });

    it('should process voice commands correctly', async () => {
      mockUseVoiceRecognition.mockReturnValue({
        ...mockUseVoiceRecognition(),
        transcript: 'Füge einen Classic Burger hinzu',
        confidence: 0.95,
        lastCommand: {
          intent: 'add_item',
          product: 'Classic Burger',
          quantity: 1
        }
      });

      render(<VoiceButton />);

      await waitFor(() => {
        expect(mockVoiceActions.processCommand).toHaveBeenCalledWith(
          'Füge einen Classic Burger hinzu'
        );
      });
    });
  });

  describe('Swiss German Support', () => {
    it('should handle Swiss German dialect commands', () => {
      mockUseVoiceRecognition.mockReturnValue({
        ...mockUseVoiceRecognition(),
        language: 'gsw-CH', // Swiss German
        transcript: 'Ich hätt gärn en Burger',
        confidence: 0.82
      });

      render(<VoiceButton />);

      expect(screen.getByText('Ich hätt gärn en Burger')).toBeInTheDocument();
      expect(screen.getByText('82%')).toBeInTheDocument();
    });

    it('should translate Swiss German commands to standard commands', async () => {
      const swissGermanCommands = {
        'ich hätt gärn': 'ich möchte',
        'törf ich ha': 'kann ich haben',
        'chönd si mir': 'können Sie mir'
      };

      mockUseVoiceRecognition.mockReturnValue({
        ...mockUseVoiceRecognition(),
        transcript: 'Ich hätt gärn en Burger'
      });

      render(<VoiceButton />);

      await waitFor(() => {
        expect(mockVoiceActions.processCommand).toHaveBeenCalledWith(
          expect.stringContaining('ich möchte')
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when speech recognition fails', () => {
      mockUseVoiceRecognition.mockReturnValue({
        ...mockUseVoiceRecognition(),
        error: {
          type: 'network',
          message: 'Netzwerkfehler beim Spracherkennung'
        }
      });

      render(<VoiceButton />);

      expect(screen.getByText(/Netzwerkfehler/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Erneut versuchen/i })).toBeInTheDocument();
    });

    it('should handle microphone permission denied', () => {
      mockUseVoiceRecognition.mockReturnValue({
        ...mockUseVoiceRecognition(),
        error: {
          type: 'not-allowed',
          message: 'Mikrofon-Zugriff verweigert'
        }
      });

      render(<VoiceButton />);

      expect(screen.getByText(/Mikrofon-Zugriff verweigert/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Berechtigung erteilen/i })).toBeInTheDocument();
    });

    it('should show fallback when confidence is too low', () => {
      mockUseVoiceRecognition.mockReturnValue({
        ...mockUseVoiceRecognition(),
        transcript: 'murmur unclear speech',
        confidence: 0.35
      });

      render(<VoiceButton />);

      expect(screen.getByText(/Nicht verstanden/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Wiederholen/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<VoiceButton />);

      expect(screen.getByRole('button', { name: /Spracheingabe/i })).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Spracheingabe')
      );
      expect(screen.getByLabelText(/Mikrofon Status/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<VoiceButton />);

      await user.tab();
      expect(screen.getByRole('button', { name: /Spracheingabe/i })).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(mockVoiceActions.startListening).toHaveBeenCalled();
    });

    it('should announce status changes to screen readers', () => {
      mockUseVoiceRecognition.mockReturnValue({
        ...mockUseVoiceRecognition(),
        isListening: true
      });

      render(<VoiceButton />);

      expect(screen.getByLabelText(/Höre zu/i)).toHaveAttribute('aria-live', 'polite');
    });

    it('should provide alternative input methods', () => {
      render(<VoiceButton />);

      expect(screen.getByRole('button', { name: /Text eingeben/i })).toBeInTheDocument();
    });
  });

  describe('Visual Feedback', () => {
    it('should show recording animation while listening', () => {
      mockUseVoiceRecognition.mockReturnValue({
        ...mockUseVoiceRecognition(),
        isListening: true
      });

      render(<VoiceButton />);

      const recordingIndicator = screen.getByLabelText(/Aufnahme läuft/i);
      expect(recordingIndicator).toBeInTheDocument();
      expect(recordingIndicator).toHaveClass(expect.stringMatching(/pulse|animate|recording/));
    });

    it('should display waveform animation for audio visualization', () => {
      mockUseVoiceRecognition.mockReturnValue({
        ...mockUseVoiceRecognition(),
        isListening: true
      });

      render(<VoiceButton />);

      expect(screen.getByLabelText(/Audio Wellform/i)).toBeInTheDocument();
    });

    it('should show processing state after speech ends', () => {
      mockUseVoiceRecognition.mockReturnValue({
        ...mockUseVoiceRecognition(),
        isListening: false,
        transcript: 'Burger bestellen',
        confidence: 0.9
      });

      render(<VoiceButton />);

      expect(screen.getByText(/Verarbeite/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Lädt/i)).toBeInTheDocument();
    });
  });

  describe('Integration with Cart', () => {
    it('should add item to cart when voice command is processed', async () => {
      mockUseVoiceRecognition.mockReturnValue({
        ...mockUseVoiceRecognition(),
        lastCommand: {
          intent: 'add_item',
          product: 'Classic Burger',
          quantity: 2,
          modifiers: [{ name: 'Extra Käse', price: 2.50 }]
        }
      });

      render(<VoiceButton />);

      await waitFor(() => {
        expect(mockCartActions.addItem).toHaveBeenCalledWith({
          productName: 'Classic Burger',
          quantity: 2,
          modifiers: [{ name: 'Extra Käse', price: 2.50 }]
        });
      });
    });

    it('should confirm action with voice feedback', async () => {
      mockUseVoiceRecognition.mockReturnValue({
        ...mockUseVoiceRecognition(),
        lastCommand: {
          intent: 'add_item',
          product: 'Classic Burger',
          quantity: 1
        }
      });

      // Mock Speech Synthesis
      const mockSpeak = jest.fn();
      Object.defineProperty(window, 'speechSynthesis', {
        writable: true,
        value: { speak: mockSpeak }
      });

      render(<VoiceButton />);

      await waitFor(() => {
        expect(mockSpeak).toHaveBeenCalledWith(
          expect.objectContaining({
            text: expect.stringContaining('Classic Burger wurde hinzugefügt')
          })
        );
      });
    });
  });

  describe('Wake Word Detection', () => {
    it('should activate when "Hey EATECH" is detected', async () => {
      const wakeWordEvent = new CustomEvent('wakeword', {
        detail: { phrase: 'Hey EATECH', confidence: 0.92 }
      });

      render(<VoiceButton />);

      window.dispatchEvent(wakeWordEvent);

      await waitFor(() => {
        expect(mockVoiceActions.startListening).toHaveBeenCalled();
      });
    });

    it('should show wake word status', () => {
      render(<VoiceButton wakeWordEnabled={true} />);

      expect(screen.getByText(/Hey EATECH/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Wake Word aktiv/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should debounce rapid button clicks', async () => {
      const user = userEvent.setup();
      render(<VoiceButton />);

      const voiceButton = screen.getByRole('button', { name: /Spracheingabe/i });

      // Rapid clicks
      await user.click(voiceButton);
      await user.click(voiceButton);
      await user.click(voiceButton);

      // Should only call startListening once due to debouncing
      expect(mockVoiceActions.startListening).toHaveBeenCalledTimes(1);
    });

    it('should cleanup audio resources on unmount', () => {
      const { unmount } = render(<VoiceButton />);

      const cleanupSpy = jest.spyOn(mockSpeechRecognition, 'abort');

      unmount();

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });
});
