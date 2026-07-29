import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Waves } from 'lucide-react';
import { executeVoiceIntent } from '../lib/intentParser';

export default function VoiceAIEngine({ onShowToast }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const shouldContinueListening = useRef(false);

  useEffect(() => {
    // Only initialize WebSpeech if supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
       console.warn("Voice AI not supported in this browser.");
       return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    // We want final statements not partial gibberish
    recognition.interimResults = false; 
    recognition.maxAlternatives = 1;

    recognition.onresult = async (event) => {
      const resultTranscript = event.results[event.results.length - 1][0].transcript;
      setTranscript(resultTranscript);
      
      try {
        const result = await executeVoiceIntent(resultTranscript);
        if (result.success && onShowToast) {
          onShowToast(`🤖 Voice AI: ${result.message}`, 'success');
        } else if (!result.success && onShowToast) {
          onShowToast(`🤖 Voice Fallback: ${result.message}`, 'error');
        }
      } catch (err) {
        console.error("Voice execution failed:", err);
      }
    };

    recognition.onerror = (event) => {
      // no-speech just means they paused. Let it restart natively below.
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error);
        if (onShowToast) onShowToast(`Microphone signal disrupted: ${event.error}`, 'error');
      }
    };

    // The heart of the "Continuous Listening" loop
    recognition.onend = () => {
      if (shouldContinueListening.current) {
        try {
          recognition.start();
        } catch (e) {
          console.error("Error restarting listener:", e);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

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
      // Turn OFF
      shouldContinueListening.current = false;
      setIsListening(false);
      recognitionRef.current.abort();
      if (onShowToast) onShowToast("Voice AI deactivated.", "info");
    } else {
      // Turn ON
      shouldContinueListening.current = true;
      setIsListening(true);
      setTranscript('');
      try {
        recognitionRef.current.start();
        if (onShowToast) onShowToast("Next-Level Voice AI online. Speak commands clearly.", "success");
      } catch (e) {
        console.error(e);
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
