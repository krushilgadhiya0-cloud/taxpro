import React, { useState, useEffect, useRef } from 'react';
import { Bot, Mic, Sparkles, Activity } from 'lucide-react';
import soundFX from '../lib/audioFX';

export default function VoicePillTrigger({ onOpenAI, isAIAssistantOpen }) {
  const [isHovered, setIsHovered] = useState(false);
  const [pulsePhase, setPulsePhase] = useState(0);
  const [isListeningWakeWord, setIsListeningWakeWord] = useState(false);
  const recognitionRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    const interval = setInterval(() => {
      setPulsePhase(p => (p + 1) % 4);
    }, 2000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  // Background Wake Word Detection ("Hey TaxPro") when assistant is closed
  useEffect(() => {
    if (isAIAssistantOpen) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }
      setIsListeningWakeWord(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    let recognition = null;
    let shouldListen = true;

    const startWakeWord = () => {
      if (!shouldListen || !isMountedRef.current || isAIAssistantOpen) return;
      try {
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch (e) {}
        }

        recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.continuous = false;

        recognition.onstart = () => {
          if (isMountedRef.current) setIsListeningWakeWord(true);
        };

        recognition.onresult = (event) => {
          const transcript = event.results[event.results.length - 1][0].transcript.trim();
          const wakeRegex = /^(hey taxpro|hey tax pro|hey text pro|hey textpro|text pro|textpro|taxpro|tax pro|hello taxpro|hello text pro|ok taxpro|ok text pro|jarvis)\s*/i;

          if (wakeRegex.test(transcript)) {
            const command = transcript.replace(wakeRegex, '').trim();
            soundFX.playActivationChime();
            shouldListen = false;
            if (recognitionRef.current) {
              try { recognitionRef.current.abort(); } catch (e) {}
            }
            onOpenAI();
            setTimeout(() => {
              if (command && command.length > 1) {
                window.dispatchEvent(new CustomEvent('taxpro_start_voice_command', { detail: command }));
              } else {
                window.dispatchEvent(new CustomEvent('taxpro_start_voice'));
              }
            }, 60);
          }
        };

        recognition.onerror = () => {
          // Ignore background wake errors
        };

        recognition.onend = () => {
          if (shouldListen && isMountedRef.current && !isAIAssistantOpen) {
            setTimeout(startWakeWord, 300);
          } else {
            if (isMountedRef.current) setIsListeningWakeWord(false);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        // Recognition start error
      }
    };

    // Start background wake-word listening on first user interaction
    const handleFirstGesture = () => {
      startWakeWord();
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };

    window.addEventListener('pointerdown', handleFirstGesture);
    window.addEventListener('keydown', handleFirstGesture);

    return () => {
      shouldListen = false;
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }
    };
  }, [isAIAssistantOpen, onOpenAI]);

  if (isAIAssistantOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3 select-none">
      
      {/* Floating Holographic AI Trigger Orb */}
      <button
        onClick={() => {
          if (recognitionRef.current) {
            try {
              recognitionRef.current.onresult = null;
              recognitionRef.current.onerror = null;
              recognitionRef.current.onend = null;
              recognitionRef.current.abort();
            } catch (e) {}
            recognitionRef.current = null;
          }
          soundFX.playActivationChime();
          onOpenAI();
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('taxpro_start_voice'));
          }, 150);
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-black/90 border border-cyan-500/40 text-white shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:border-cyan-400 backdrop-blur-2xl transition-all duration-300 active:scale-95 hover:scale-105 cursor-pointer"
        title="Launch TaxPro Autonomous Voice AI"
      >
        {/* Ambient Glowing Core Ring */}
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 opacity-40 blur-md group-hover:opacity-75 transition-opacity" />

        {/* Inner Content */}
        <div className="relative flex items-center gap-2.5 z-10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/40 group-hover:rotate-12 transition-transform">
            <Bot className="w-4.5 h-4.5 text-white" />
          </div>

          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white font-outfit tracking-wide">Voice AI</span>
              <span className={`w-2 h-2 rounded-full ${isListeningWakeWord ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400'}`} />
              <span className="text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-500/30 ml-1">
                Ctrl+M
              </span>
            </div>
            <span className="text-[9px] text-cyan-300 font-mono -mt-0.5">
              "Hey TaxPro"
            </span>
          </div>

          <div className="pl-1 border-l border-white/10 flex items-center">
            <Mic className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
        </div>
      </button>

    </div>
  );
}
