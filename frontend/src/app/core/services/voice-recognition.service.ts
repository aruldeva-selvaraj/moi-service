import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class VoiceRecognitionService {
  private recognition: any = null;
  private mediaStream: MediaStream | null = null;

  readonly isListening = signal(false);
  readonly activeField = signal<string | null>(null);

  private get SpeechRecognitionAPI(): any {
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  }

  get isSupported(): boolean {
    return !!this.SpeechRecognitionAPI;
  }

  async startListening(
    field: string,
    onResult: (transcript: string) => void,
    onError: (message: string) => void,
    lang = 'en-IN'
  ): Promise<void> {
    if (!this.isSupported) {
      onError('Voice recognition is not supported. Please use Chrome or Edge.');
      return;
    }

    this.stopListening();

    try {
      // Acquire mic with noise suppression before starting SpeechRecognition
      // so the browser shares the noise-cancelled audio pipeline
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
        },
      });
    } catch {
      onError('Microphone access denied. Please allow microphone access and try again.');
      return;
    }

    const Recognition = this.SpeechRecognitionAPI;
    this.recognition = new Recognition();
    this.recognition.lang = lang;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 3;
    this.recognition.continuous = false;

    this.recognition.onresult = (event: any) => {
      const transcript = (event.results[0][0].transcript as string).trim();
      onResult(transcript);
      this.stopListening();
    };

    this.recognition.onerror = (event: any) => {
      const msgs: Record<string, string> = {
        'no-speech': 'No speech detected. Please try again.',
        'audio-capture': 'No microphone found.',
        'not-allowed': 'Microphone permission denied.',
        'network': 'Network error during recognition.',
        'aborted': '',
      };
      const msg = msgs[event.error] ?? `Voice error: ${event.error}`;
      if (msg) onError(msg);
      this.stopListening();
    };

    this.recognition.onend = () => {
      this.isListening.set(false);
      this.activeField.set(null);
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(t => t.stop());
        this.mediaStream = null;
      }
    };

    this.activeField.set(field);
    this.isListening.set(true);
    this.recognition.start();
  }

  stopListening(): void {
    if (this.recognition) {
      try { this.recognition.abort(); } catch { /* ignore abort errors */ }
      this.recognition = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    this.isListening.set(false);
    this.activeField.set(null);
  }

  /** Extract a positive number from a spoken amount transcript like "five hundred rupees" or "1500" */
  parseAmount(transcript: string): number | null {
    const cleaned = transcript
      .toLowerCase()
      .replace(/rupees?|rs\.?|inr/gi, '')
      .replace(/,/g, '')
      .trim();

    // Direct numeric parse
    const direct = parseFloat(cleaned);
    if (!isNaN(direct) && direct > 0) return direct;

    // Extract first number sequence from the string
    const match = cleaned.match(/\d+(\.\d+)?/);
    if (match) {
      const extracted = parseFloat(match[0]);
      if (!isNaN(extracted) && extracted > 0) return extracted;
    }

    return null;
  }
}
