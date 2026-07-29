import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Waves, Sparkles, Activity } from 'lucide-react';
import { executeVoiceIntent } from '../lib/intentParser';

export default function VoiceAIEngine({ onShowToast }) {
  const [isListeningGlobally, setIsListeningGlobally] = useState(false);
  const [siriMode, setSiriMode] = useState(false);
  const [siriTranscript, setSiriTranscript] = useState('');
  const [siriResponseText, setSiriResponseText] = useState('');
  
  const recognitionRef = useRef(null);
  const shouldContinueListening = useRef(false);
  const siriTimeoutRef = useRef(null);
  const siriModeRef = useRef(false);

  const updateSiriMode = (val) => {
    siriModeRef.current = val;
    setSiriMode(val);
  };

  // Background Wake Word Detection & intent execution
  const evaluateSpeechChunk = async (rawChunk) => {
    const text = rawChunk.toLowerCase().trim();
    
    // Check for Wake Word variations
    // DO NOT USE 'g' FLAG! It makes RegExp stateful and breaks .test() preceding .replace()
    const wakeRegex = /hey taxpro|hey tax pro|hi taxpro|hi tax pro|hello taxpro|hello tax pro|hey text pro|hey tech pro|taxpro|tax pro|hey tax|hi tax/i;
    const hasWakeWord = wakeRegex.test(text);

    if (hasWakeWord && !siriModeRef.current) {
      updateSiriMode(true);
      setSiriResponseText('');
      
      // Cleanly slice out the wake word to intercept immediate commands
      const remainingCommand = text.replace(wakeRegex, '').trim();
      
      setSiriTranscript(remainingCommand || 'Listening to your command...');
      
      if (remainingCommand.length > 3) {
         await handleSiriCommandExecution(remainingCommand);
      }
      return;
    }
    
    // If Siri GUI is already active, process the chunk as a command directly
    if (siriModeRef.current) {
       const pristineCommand = text.replace(wakeRegex, '').trim();
       if (pristineCommand) {
         setSiriTranscript(pristineCommand);
         await handleSiriCommandExecution(pristineCommand);
       }
    }
  };

  const speakSiriResponse = (text) => {
     if (!window.speechSynthesis) return;
     window.speechSynthesis.cancel(); // Interrupt any ongoing speech
     
     const utterance = new SpeechSynthesisUtterance(text);
     
     // Attempt to dynamically fetch a premium feminine OS-level voice
     const availableVoices = window.speechSynthesis.getVoices();
     const siriVoice = availableVoices.find(v => 
        v.name.includes('Female') || 
        v.name.includes('Samantha') || 
        v.name.includes('Zira') || 
        v.name.includes('Karen') || 
        v.name.includes('Victoria')
     );
     
     if (siriVoice) utterance.voice = siriVoice;
     
     utterance.rate = 1.05; 
     utterance.pitch = 1.1;
     
     window.speechSynthesis.speak(utterance);
  };

  const handleSiriCommandExecution = async (commandText) => {
     try {
       setSiriResponseText("Processing command...");
       const result = await executeVoiceIntent(commandText);
       
       setSiriResponseText(result.message);
       speakSiriResponse(result.message);
       
       if (result.success && onShowToast) {
         onShowToast(`🤖 Voice AI: ${result.message}`, 'success');
       }
       
       // JARVIS MODE: Clear conversational text after reading, but keep Engine awake for 60 seconds of idle time
       if (siriTimeoutRef.current) clearTimeout(siriTimeoutRef.current);
       
       const readTime = Math.max(3500, result.message.length * 60);
       
       // 1. Wipe the text once she's done speaking
       setTimeout(() => {
          if (siriModeRef.current) {
            setSiriResponseText('');
            setSiriTranscript('Awaiting instructions...');
          }
       }, readTime);
       
       // 2. Shut off completely if 60 seconds pass without ANY command
       siriTimeoutRef.current = setTimeout(() => {
          updateSiriMode(false);
          setSiriTranscript('');
          setSiriResponseText('');
       }, 60000);

     } catch (err) {
       console.error("Siri execution failed:", err);
       setSiriResponseText("System encountered an error processing your command.");
       
       if (siriTimeoutRef.current) clearTimeout(siriTimeoutRef.current);
       siriTimeoutRef.current = setTimeout(() => updateSiriMode(false), 60000);
     }
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
       console.warn("Voice AI not supported in this browser.");
       return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    // We want burst results to immediately parse sentences 
    recognition.interimResults = false; 
    recognition.maxAlternatives = 1;
    // Use continuous=true so the browser maintains connection
    recognition.continuous = true; 

    recognition.onresult = (event) => {
      const resultTranscript = event.results[event.results.length - 1][0].transcript;
      evaluateSpeechChunk(resultTranscript);
    };

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
           shouldContinueListening.current = false;
           setIsListeningGlobally(false);
           console.warn('Microphone access blocked by browser.');
        }
      }
    };

    // The immortal daemon loop
    recognition.onend = () => {
      if (shouldContinueListening.current && recognitionRef.current) {
        setTimeout(() => {
           try {
             recognitionRef.current.start();
           } catch (e) {}
        }, 150);
      } else {
        setIsListeningGlobally(false);
      }
    };

    recognitionRef.current = recognition;

    // Start background listening daemon automatically on mount
    shouldContinueListening.current = true;
    setIsListeningGlobally(true);
    try {
      recognition.start();
      console.log("Hey TaxPro Daemon initialized.");
    } catch(e) {
      setIsListeningGlobally(false);
    }

    return () => {
      shouldContinueListening.current = false;
      if (siriTimeoutRef.current) clearTimeout(siriTimeoutRef.current);
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, [onShowToast]);

  const toggleWakeWordDaemon = () => {
    if (!recognitionRef.current) return;

    if (isListeningGlobally) {
      // Turn OFF
      shouldContinueListening.current = false;
      setIsListeningGlobally(false);
      recognitionRef.current.abort();
    } else {
      // Turn ON
      shouldContinueListening.current = true;
      setIsListeningGlobally(true);
      try {
        recognitionRef.current.start();
      } catch (e) {}
    }
  };

  return (
    <>
      {/* BACKGROUND DAEMON TOGGLE (Small Indicator Bottom Right) */}
      <div className="fixed bottom-[5.5rem] right-6 z-[60] flex items-center justify-end gap-3 group animate-in slide-in-from-bottom flex-col items-end">
        <button 
          onClick={toggleWakeWordDaemon}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 transition-all hover:scale-110 duration-300 ${
             isListeningGlobally 
              ? 'bg-[#121212]/80 backdrop-blur-md border-[#00F0FF]/30 text-[#00F0FF]' 
              : 'bg-[#121212] border-white/10 text-gray-500 hover:text-white'
          }`}
          title={isListeningGlobally ? 'Disable "Hey TaxPro" Wake Word' : 'Enable "Hey TaxPro" Wake Word'}
        >
          {isListeningGlobally ? <Activity className="w-5 h-5 animate-pulse" /> : <MicOff className="w-4 h-4" />}
        </button>
      </div>

      {/* MASSIVE AMBIENT JARVIS-LIKE HUD */}
      {siriMode && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none pb-12 overflow-hidden transition-all duration-500 animate-fade-in">
           
           {/* NORTHERN LIGHTS HOLOGRAPHIC AURORA EFFECT */}
           <div className="absolute bottom-0 left-0 right-0 h-[45vh] overflow-hidden pointer-events-none flex justify-center items-end opacity-70">
              {/* Center Core */}
              <div className="absolute bottom-[-150px] w-full max-w-[1200px] h-[350px] rounded-[100%] bg-gradient-to-t from-emerald-400 via-cyan-500 to-transparent blur-[80px] animate-pulse"></div>
              {/* Left Plasma */}
              <div className="absolute bottom-[-100px] left-[-20%] w-[70%] h-[400px] rounded-[100%] bg-gradient-to-t from-purple-600 via-indigo-500 to-transparent blur-[100px] animate-[pulse_4s_ease-in-out_infinite]"></div>
              {/* Right Plasma */}
              <div className="absolute bottom-[-120px] right-[-20%] w-[70%] h-[400px] rounded-[100%] bg-gradient-to-t from-blue-600 via-cyan-400 to-transparent blur-[100px] animate-[pulse_5s_ease-in-out_infinite_alternate]"></div>
           </div>

           <div className="relative z-10 w-full max-w-2xl px-6 flex flex-col items-center pointer-events-auto">
             
             {/* Text Output Block */}
             <div className="w-full bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[40px] p-8 shadow-2xl shadow-cyan-500/20 text-center mb-8 transform transition-all animate-in slide-in-from-bottom-10 fade-in duration-500">
                <div className="flex items-center justify-center gap-2 text-cyan-400 text-xs font-black uppercase tracking-[0.2em] mb-4">
                   <Sparkles className="w-4 h-4" /> TaxPro J.A.R.V.I.S Active
                </div>
                
                <h2 className="text-3xl sm:text-4xl font-outfit font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 mb-2 min-h-[48px]">
                   {siriTranscript ? `"${siriTranscript}"` : "Monitoring..."}
                </h2>
                
                {siriResponseText && (
                   <p className="text-sm sm:text-base text-cyan-300 font-medium mt-4 bg-cyan-500/10 inline-block px-4 py-2 rounded-full border border-cyan-500/30 animate-fade-in">
                      {siriResponseText}
                   </p>
                )}
             </div>

             {/* Animated Siri Orb Sphere (CSS Magic) */}
             <div className="relative w-32 h-32 flex items-center justify-center">
                {/* Outer Ring */}
                <div className={`absolute inset-0 rounded-full bg-cyan-500/20 blur-xl ${!siriResponseText ? 'animate-ping' : ''}`}></div>
                {/* Energy Core */}
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 shadow-[0_0_50px_#00F0FF] ${!siriResponseText ? 'animate-pulse' : 'scale-90 opacity-70'} transition-all duration-300`}></div>
                
                <Waves className="relative z-10 w-8 h-8 text-white drop-shadow-lg" />
             </div>

           </div>
        </div>
      )}
    </>
  );
}
