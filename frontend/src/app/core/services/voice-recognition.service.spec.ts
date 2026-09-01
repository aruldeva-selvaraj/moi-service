import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { VoiceRecognitionService } from './voice-recognition.service';

describe('VoiceRecognitionService', () => {
  let service: VoiceRecognitionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VoiceRecognitionService);
  });

  afterEach(() => {
    service.stopListening();
    TestBed.resetTestingModule();
    // Clean up window Speech API mocks
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
  });

  it('creates the service', () => {
    expect(service).toBeTruthy();
  });

  it('isListening starts as false', () => {
    expect(service.isListening()).toBe(false);
  });

  it('activeField starts as null', () => {
    expect(service.activeField()).toBeNull();
  });

  it('isSupported returns false when no Speech API', () => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
    expect(service.isSupported).toBe(false);
  });

  it('isSupported returns true when SpeechRecognition exists', () => {
    (window as any).SpeechRecognition = class {};
    expect(service.isSupported).toBe(true);
  });

  it('isSupported returns true when webkitSpeechRecognition exists', () => {
    (window as any).webkitSpeechRecognition = class {};
    expect(service.isSupported).toBe(true);
  });

  it('stopListening resets signals even when not started', () => {
    service.stopListening();
    expect(service.isListening()).toBe(false);
    expect(service.activeField()).toBeNull();
  });

  it('startListening calls onError when not supported', async () => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
    const onError = vi.fn();
    await service.startListening('guest_name', vi.fn(), onError);
    expect(onError).toHaveBeenCalledWith(
      'Voice recognition is not supported. Please use Chrome or Edge.'
    );
    expect(service.isListening()).toBe(false);
  });

  it('startListening calls onError on mic denial', async () => {
    (window as any).SpeechRecognition = class {};
    const mockGetUserMedia = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      configurable: true,
    });
    const onError = vi.fn();
    await service.startListening('guest_name', vi.fn(), onError);
    expect(onError).toHaveBeenCalledWith(
      'Microphone access denied. Please allow microphone access and try again.'
    );
  });

  it('startListening sets isListening and activeField when successful', async () => {
    const mockStop = vi.fn();
    const mockStream = { getTracks: () => [{ stop: mockStop }] } as any;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
      configurable: true,
    });
    const mockRecognition = {
      lang: '',
      interimResults: false,
      maxAlternatives: 0,
      continuous: false,
      onresult: null as any,
      onerror: null as any,
      onend: null as any,
      start: vi.fn(),
      abort: vi.fn(),
    };
    (window as any).SpeechRecognition = vi.fn(() => mockRecognition);

    const onResult = vi.fn();
    await service.startListening('amount', onResult, vi.fn(), 'ta-IN');

    expect(service.isListening()).toBe(true);
    expect(service.activeField()).toBe('amount');
    expect(mockRecognition.start).toHaveBeenCalled();
    expect(mockRecognition.lang).toBe('ta-IN');
  });

  it('recognition.onresult calls onResult and stopListening', async () => {
    const mockStop = vi.fn();
    const mockStream = { getTracks: () => [{ stop: mockStop }] } as any;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
      configurable: true,
    });
    const mockRecognition = {
      lang: '', interimResults: false, maxAlternatives: 0, continuous: false,
      onresult: null as any, onerror: null as any, onend: null as any,
      start: vi.fn(), abort: vi.fn(),
    };
    (window as any).SpeechRecognition = vi.fn(() => mockRecognition);

    const onResult = vi.fn();
    await service.startListening('guest_name', onResult, vi.fn());

    // Simulate result event
    mockRecognition.onresult({ results: [[{ transcript: '  Five Hundred Rupees  ' }]] });
    expect(onResult).toHaveBeenCalledWith('Five Hundred Rupees');
    expect(service.isListening()).toBe(false);
  });

  it('recognition.onerror handles known error codes', async () => {
    const mockStream = { getTracks: () => [{ stop: vi.fn() }] } as any;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
      configurable: true,
    });
    const mockRecognition = {
      lang: '', interimResults: false, maxAlternatives: 0, continuous: false,
      onresult: null as any, onerror: null as any, onend: null as any,
      start: vi.fn(), abort: vi.fn(),
    };
    (window as any).SpeechRecognition = vi.fn(() => mockRecognition);
    const onError = vi.fn();
    await service.startListening('city', vi.fn(), onError);

    mockRecognition.onerror({ error: 'no-speech' });
    expect(onError).toHaveBeenCalledWith('No speech detected. Please try again.');

    mockRecognition.onerror({ error: 'audio-capture' });
    expect(onError).toHaveBeenCalledWith('No microphone found.');

    mockRecognition.onerror({ error: 'not-allowed' });
    expect(onError).toHaveBeenCalledWith('Microphone permission denied.');

    mockRecognition.onerror({ error: 'network' });
    expect(onError).toHaveBeenCalledWith('Network error during recognition.');
  });

  it('recognition.onerror with "aborted" does not call onError', async () => {
    const mockStream = { getTracks: () => [{ stop: vi.fn() }] } as any;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
      configurable: true,
    });
    const mockRecognition = {
      lang: '', interimResults: false, maxAlternatives: 0, continuous: false,
      onresult: null as any, onerror: null as any, onend: null as any,
      start: vi.fn(), abort: vi.fn(),
    };
    (window as any).SpeechRecognition = vi.fn(() => mockRecognition);
    const onError = vi.fn();
    await service.startListening('city', vi.fn(), onError);
    mockRecognition.onerror({ error: 'aborted' });
    expect(onError).not.toHaveBeenCalled();
  });

  it('recognition.onerror with unknown code calls onError with generic message', async () => {
    const mockStream = { getTracks: () => [{ stop: vi.fn() }] } as any;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
      configurable: true,
    });
    const mockRecognition = {
      lang: '', interimResults: false, maxAlternatives: 0, continuous: false,
      onresult: null as any, onerror: null as any, onend: null as any,
      start: vi.fn(), abort: vi.fn(),
    };
    (window as any).SpeechRecognition = vi.fn(() => mockRecognition);
    const onError = vi.fn();
    await service.startListening('city', vi.fn(), onError);
    mockRecognition.onerror({ error: 'service-not-allowed' });
    expect(onError).toHaveBeenCalledWith('Voice error: service-not-allowed');
  });

  it('recognition.onend resets signals and stops media tracks', async () => {
    const mockStop = vi.fn();
    const mockStream = { getTracks: () => [{ stop: mockStop }] } as any;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
      configurable: true,
    });
    const mockRecognition = {
      lang: '', interimResults: false, maxAlternatives: 0, continuous: false,
      onresult: null as any, onerror: null as any, onend: null as any,
      start: vi.fn(), abort: vi.fn(),
    };
    (window as any).SpeechRecognition = vi.fn(() => mockRecognition);
    await service.startListening('guest_name', vi.fn(), vi.fn());
    mockRecognition.onend();
    expect(service.isListening()).toBe(false);
    expect(service.activeField()).toBeNull();
    expect(mockStop).toHaveBeenCalled();
  });

  describe('parseAmount', () => {
    it('parses plain number string', () => {
      expect(service.parseAmount('1500')).toBe(1500);
    });

    it('parses number with commas', () => {
      expect(service.parseAmount('1,500')).toBe(1500);
    });

    it('strips "rupees" suffix', () => {
      expect(service.parseAmount('500 rupees')).toBe(500);
    });

    it('strips "rs." prefix', () => {
      expect(service.parseAmount('Rs. 2000')).toBe(2000);
    });

    it('strips "inr" suffix', () => {
      expect(service.parseAmount('3000 INR')).toBe(3000);
    });

    it('strips "rupee" (singular)', () => {
      expect(service.parseAmount('one thousand rupee')).toBeNull();
    });

    it('returns null for non-numeric text', () => {
      expect(service.parseAmount('hello world')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(service.parseAmount('')).toBeNull();
    });

    it('returns null for zero', () => {
      expect(service.parseAmount('0')).toBeNull();
    });

    it('returns null for negative number', () => {
      expect(service.parseAmount('-500')).toBeNull();
    });

    it('extracts first number from mixed text', () => {
      expect(service.parseAmount('pay 250 later')).toBe(250);
    });

    it('parses decimal amount', () => {
      expect(service.parseAmount('99.50')).toBe(99.5);
    });

    it('parses "rupees" case-insensitively', () => {
      expect(service.parseAmount('500 RUPEES')).toBe(500);
    });
  });
});
