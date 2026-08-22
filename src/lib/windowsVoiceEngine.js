// =========================================================================
// Windows Voice Engine (Win+H Grade Speech-to-Text & VAD Engine)
// Provides continuous real-time streaming, smart silence detection, 
// multi-accent phonetic normalization, and live audio volume analysis.
// =========================================================================

import soundFX from './audioFX';

export class WindowsVoiceEngine {
  constructor(options = {}) {
    this.options = {
      lang: options.lang || 'en-IN',
      silenceThresholdMs: options.silenceThresholdMs || 1500,
      continuous: true,
      interimResults: true,
      onInterim: options.onInterim || (() => {}),
      onFinal: options.onFinal || (() => {}),
      onStateChange: options.onStateChange || (() => {}),
      onAudioLevel: options.onAudioLevel || (() => {}),
      onError: options.onError || (() => {}),
      ...options
    };

    this.recognition = null;
    this.isListening = false;
    this.audioContext = null;
    this.analyser = null;
    this.microphoneStream = null;
    this.animFrameId = null;
    this.silenceTimer = null;
    this.currentTranscript = '';
    this.accumulatedFinal = '';
    this.restartAttempts = 0;
    this.maxRestarts = 10;
  }

  static isSupported() {
    return Boolean(
      typeof window !== 'undefined' && 
      (window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }

  // 1. Start Windows-Grade Listening
  async start() {
    if (this.isListening) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.options.onError(new Error('Speech recognition not supported in this browser. Please use Chrome or Edge.'));
      return;
    }

    this.isListening = true;
    this.currentTranscript = '';
    this.accumulatedFinal = '';
    this.restartAttempts = 0;
    this.options.onStateChange('LISTENING');
    soundFX.playActivationChime();

    // Initialize Web Audio volume analyser for real-time waveform
    await this.initAudioAnalyser();

    this.createAndStartRecognition();
  }

  createAndStartRecognition() {
    if (!this.isListening) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      if (this.recognition) {
        try {
          this.recognition.onresult = null;
          this.recognition.onerror = null;
          this.recognition.onend = null;
          this.recognition.abort();
        } catch (e) {}
      }

      const rec = new SpeechRecognition();
      rec.lang = this.options.lang;
      rec.continuous = this.options.continuous;
      rec.interimResults = this.options.interimResults;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        if (this.isListening) {
          this.options.onStateChange('LISTENING');
        }
      };

      rec.onresult = (event) => {
        let interimStr = '';
        let finalStr = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalStr += ' ' + trans;
          } else {
            interimStr += ' ' + trans;
          }
        }

        interimStr = interimStr.trim();
        finalStr = finalStr.trim();

        if (finalStr) {
          this.accumulatedFinal = (this.accumulatedFinal + ' ' + finalStr).trim();
        }

        const activeDisplay = (this.accumulatedFinal + ' ' + interimStr).trim();
        if (activeDisplay) {
          this.currentTranscript = activeDisplay;
          this.options.onInterim(activeDisplay);

          // Reset silence timer on every spoken word
          this.resetSilenceTimer();
        }
      };

      rec.onerror = (event) => {
        // Suppress benign errors like no-speech so engine stays alive
        if (event.error === 'no-speech') {
          return;
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.stop(false);
          this.options.onError(new Error('Microphone permission blocked. Please allow microphone access in your browser.'));
          return;
        }
        console.warn('[WindowsVoiceEngine] Warning:', event.error);
      };

      rec.onend = () => {
        if (this.isListening) {
          // If we have accumulated speech, finalize it
          if (this.currentTranscript.trim()) {
            this.finalizeCurrentSpeech();
          } else {
            // Keep alive seamlessly like Windows Voice Typing
            setTimeout(() => {
              if (this.isListening) {
                try {
                  rec.start();
                } catch (e) {
                  this.createAndStartRecognition();
                }
              }
            }, 150);
          }
        }
      };

      this.recognition = rec;
      rec.start();
    } catch (err) {
      console.warn('[WindowsVoiceEngine Start Error]:', err.message);
    }
  }

  // 2. Intelligent Voice Activity Silence Finalizer (Debounced VAD)
  resetSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

    this.silenceTimer = setTimeout(() => {
      if (this.isListening && this.currentTranscript.trim().length > 0) {
        this.finalizeCurrentSpeech();
      }
    }, this.options.silenceThresholdMs);
  }

  finalizeCurrentSpeech() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    const raw = this.currentTranscript.trim();
    this.currentTranscript = '';
    this.accumulatedFinal = '';

    if (raw.length > 0) {
      const normalized = this.normalizeTaxTranscript(raw);
      this.options.onFinal(normalized);
    }
  }

  // 3. Stop Listening
  stop(playDeactivateSound = true) {
    this.isListening = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.recognition) {
      try {
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.stop();
      } catch (e) {}
      this.recognition = null;
    }

    this.cleanupAudioAnalyser();
    this.options.onStateChange('IDLE');

    if (playDeactivateSound) {
      soundFX.playDeactivationTone();
    }
  }

  // 4. Web Audio Real-Time Waveform & Level Analyser
  async initAudioAnalyser() {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.microphoneStream = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      this.audioContext = new AudioContext();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkAudioLevel = () => {
        if (!this.isListening || !this.analyser) return;

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalizedLevel = Math.min(100, Math.round((average / 255) * 100));

        this.options.onAudioLevel(normalizedLevel);
        this.animFrameId = requestAnimationFrame(checkAudioLevel);
      };

      checkAudioLevel();
    } catch (err) {
      console.warn('[Audio Analyser Note]:', err.message);
    }
  }

  cleanupAudioAnalyser() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(t => t.stop());
      this.microphoneStream = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {}
      this.audioContext = null;
    }
    this.analyser = null;
  }

  // 5. Multi-Accent Phonetic & Tax Domain Intelligence Normalizer
  normalizeTaxTranscript(text) {
    let clean = text.trim();

    // Strip common wake words if present
    const wakeRegex = /^(hey taxpro|hey tax pro|hey text pro|hey textpro|text pro|textpro|taxpro|tax pro|hello taxpro|hello text pro|ok taxpro|ok text pro|jarvis)\s*/i;
    clean = clean.replace(wakeRegex, '').trim();

    // Phonetic replacements for Tax, GST, Legal, Corporate terms
    const replacements = [
      // Sections
      [/\b(section|sec\.?)\s*80\s*c\b/gi, 'Section 80C'],
      [/\b(section|sec\.?)\s*80\s*d\b/gi, 'Section 80D'],
      [/\b(section|sec\.?)\s*115\s*bac\b/gi, 'Section 115BAC'],
      [/\b(section|sec\.?)\s*194\s*c\b/gi, 'Section 194C'],
      [/\b(section|sec\.?)\s*194\s*j\b/gi, 'Section 194J'],
      [/\b(section|sec\.?)\s*194\s*q\b/gi, 'Section 194Q'],
      [/\b(section|sec\.?)\s*206\s*ab\b/gi, 'Section 206AB'],
      [/\b(section|sec\.?)\s*44\s*ad\b/gi, 'Section 44AD'],
      [/\b(section|sec\.?)\s*44\s*ada\b/gi, 'Section 44ADA'],
      [/\b(section|sec\.?)\s*44\s*ab\b/gi, 'Section 44AB'],
      [/\b(section|sec\.?)\s*54\s*f\b/gi, 'Section 54F'],
      [/\b(section|sec\.?)\s*139\s*(1|4|5|9)\b/gi, 'Section 139($1)'],

      // Tax Forms & Returns
      [/\bitr\s*([1-7])\b/gi, 'ITR-$1'],
      [/\bform\s*26\s*as\b/gi, 'Form 26AS'],
      [/\bform\s*16\s*a\b/gi, 'Form 16A'],
      [/\bform\s*16\b/gi, 'Form 16'],
      [/\bform\s*15\s*(g|h)\b/gi, 'Form 15$1'],
      [/\bgstr\s*([1-9][a-z]?)\b/gi, 'GSTR-$1'],
      [/\bgstr\s*3\s*b\b/gi, 'GSTR-3B'],
      [/\bgstr\s*2\s*b\b/gi, 'GSTR-2B'],
      [/\bgstr\s*2\s*a\b/gi, 'GSTR-2A'],
      [/\bgstr\s*9\s*c\b/gi, 'GSTR-9C'],

      // Identifiers
      [/\bgst\s*in\b/gi, 'GSTIN'],
      [/\bgst\s*number\b/gi, 'GSTIN'],
      [/\bpan\s*card\b/gi, 'PAN'],
      [/\btan\s*number\b/gi, 'TAN'],
      [/\bdin\s*number\b/gi, 'DIN'],

      // Currency
      [/\b(rupees|rs\.?|inr)\s*(\d+)/gi, '₹$2'],

      // Common Commands
      [/\badd\s*new\s*client\b/gi, 'Add Client'],
      [/\bcreate\s*new\s*task\b/gi, 'Add Task'],
      [/\bshow\s*all\s*clients\b/gi, 'Show Clients'],
      [/\bopen\s*receipts\b/gi, 'Open Receipts & Payments'],
      [/\bopen\s*calender\b/gi, 'Open Calendar']
    ];

    replacements.forEach(([pattern, replacement]) => {
      clean = clean.replace(pattern, replacement);
    });

    return clean;
  }
}

export default WindowsVoiceEngine;
