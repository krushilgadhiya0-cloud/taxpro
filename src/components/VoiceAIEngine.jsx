import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Waves } from 'lucide-react';
import { executeVoiceIntent } from '../lib/intentParser';

export default function VoiceAIEngine({ onShowToast }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const shouldContinueListening = useRef(false);

  const isActiveMode = useRef(false);

  useEffect(() => {
    // Only initialize WebSpeech if supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
       console.warn("Voice AI not supported in this browser.");
       return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    // We want interim results for ultra-fast wake word detection
    recognition.interimResults = true; 
    recognition.maxAlternatives = 1;

    recognition.onresult = async (event) => {
      let runTranscript = '';
      let isFinal = false;

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        runTranscript += event.results[i][0].transcript;
        if (event.results[i].isFinal) isFinal = true;
      }

      const lowerTrans = runTranscript.toLowerCase();
      const hasWakeWord = lowerTrans.includes('hi taxpro') || lowerTrans.includes('hey taxpro') || lowerTrans.includes('high taxpro');

      // 1. Wake word detected! Activate instantly.
      if (hasWakeWord && !isActiveMode.current) {
         isActiveMode.current = true;
         setIsListening(true);
      }

      // 2. If Active Mode (either via Wake Word or Manual Click)
      if (isActiveMode.current) {
         // Clean the transcript for execution by stripping the wake word
         let displayTrans = lowerTrans.replace(/hi taxpro|hey taxpro|high taxpro/g, '').trim();
         
         if (displayTrans) {
            setTranscript(displayTrans);
         }

         if (isFinal) {
           isActiveMode.current = false;
           setIsListening(false);
           
           if (displayTrans.length > 0) {
              setTranscript('');
              try {
                const result = await executeVoiceIntent(displayTrans);
                if (result.success && onShowToast) {
                  onShowToast(`🤖 Voice AI: ${result.message}`, 'success');
                } else if (!result.success && onShowToast) {
                  onShowToast(`🤖 Voice Fallback: ${result.message}`, 'warning');
                }
              } catch (err) {
                console.error("Voice execution failed:", err);
              }
           }
         }
      }
    };

    recognition.onerror = (event) => {
      // no-speech just means they paused. Let it restart natively below.
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error);
        // Only toast if it's a critical mic error, not just silence
        if (event.error === 'not-allowed' && onShowToast) {
           onShowToast(`Microphone access denied. Wake word disabled.`, 'error');
           shouldContinueListening.current = false;
        }
      }
    };

    // The heart of the "Continuous Listening" loop
    recognition.onend = () => {
      if (shouldContinueListening.current) {
        try {
          recognition.start();
        } catch (e) {
          // Ignore state collision errors
        }
      } else {
        setIsListening(false);
        isActiveMode.current = false;
      }
    };

    recognitionRef.current = recognition;

    // Auto-start background wake word listener
    shouldContinueListening.current = true;
    try {
       recognition.start();
    } catch(e) {}

    return () => {
      shouldContinueListening.current = false;
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, [onShowToast]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
       if (onShowToast) onShowToast("Microphone API blocked or unsupported.", "error");
       return;
    }

    if (isListening) {
      // Turn OFF Active Mode AND Background Loop
      shouldContinueListening.current = false;
      isActiveMode.current = false;
      setIsListening(false);
      recognitionRef.current.abort();
      if (onShowToast) onShowToast("Voice System fully deactivated.", "info");
    } else {
      // Turn ON Active Mode manually (bypass wake word)
      shouldContinueListening.current = true;
      isActiveMode.current = true;
      setIsListening(true);
      setTranscript('');
      try {
        // Just in case it was fully stopped
        recognitionRef.current.start();
      } catch (e) {
        // It might already be running in background, which is fine
      }
    }
  };

  return (
    <div className="fixed bottom-[5.5rem] right-6 z-50 flex items-center justify-end gap-3 pointer-events-none group animate-in slide-in-from-bottom flex-col items-end">
      
      {/* HUD display showing what you said if we are listening */}
      <div className={`pointer-events-auto transition-all duration-300 max-w-[200px] bg-black/80 backdrop-blur-md rounded-2xl p-3 border border-white/10 shadow-2xl ${isListening && transcript ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
         <div className="text-[9px] font-black uppercase tracking-widest text-[#00F0FF] mb-1 flex items-center gap-1.5">
           <Waves className="w-3 h-3 animate-pulse" /> Voice Parser
         </div>
         <p className="text-xs text-white leading-tight font-medium">"{transcript}"</p>
      </div>

      <button 
        onClick={toggleListening}
        className={`pointer-events-auto w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-2 transition-all hover:scale-105 duration-300 ${
           isListening 
            ? 'bg-[#00F0FF]/20 border-[#00F0FF] ring-4 ring-[#00F0FF]/30 text-[#00F0FF] animate-pulse' 
            : 'bg-[#121212] border-white/10 text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
        }`}
        title={isListening ? 'Disable Voice AI' : 'Enable Neural Voice AI'}
      >
        {isListening ? <Mic className="w-6 h-6 animate-bounce" /> : <MicOff className="w-5 h-5" />}
      </button>
    </div>
  );
}
