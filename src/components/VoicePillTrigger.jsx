import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Mic, 
  MicOff, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  Zap,
  GripVertical
} from 'lucide-react';
import soundFX from '../lib/audioFX';
import { executeVoiceIntent } from '../lib/intentParser';

export default function VoicePillTrigger({ onOpenAI, isAIAssistantOpen }) {
  // Voice AI Active Toggle State
  const [isActive, setIsActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [statusText, setStatusText] = useState('Idle');
  const [isListeningWakeWord, setIsListeningWakeWord] = useState(false);

  // Movable / Draggable Position State
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem('taxpro_voice_button_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch (e) {}
    return { x: null, y: null };
  });

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initialPosX: 0, initialPosY: 0, hasMoved: false });
  const pillRef = useRef(null);

  const recognitionRef = useRef(null);
  const wakeRecognitionRef = useRef(null);
  const isMountedRef = useRef(true);
  const autoResetTimerRef = useRef(null);

  // Natural TTS Voice Synthesizer with Audio Resumption
  const speakText = (text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const cleanText = text.replace(/[*_#`~$\\↗]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Siri') || v.name.includes('David') || v.name.includes('Zira')) && v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        clearTimeout(autoResetTimerRef.current);
        autoResetTimerRef.current = setTimeout(() => {
          if (isMountedRef.current && isActive) {
            turnOffVoice();
          }
        }, 4000);
      };
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      setIsSpeaking(false);
    }
  };

  // Turn Voice AI ON (1st Click / Wake Word / Ctrl+M)
  const turnOnVoice = (initialCommand = '') => {
    setIsActive(true);
    setStatusText('Listening...');
    setLiveTranscript('');
    clearTimeout(autoResetTimerRef.current);

    // 1. Signature Sound Wave Release Chime
    soundFX.playActivationChime();

    // 2. Stop wake word listener temporarily
    stopWakeWordListener();

    // 3. Process immediate command or start active speech recognition
    if (initialCommand && initialCommand.trim().length > 1) {
      setLiveTranscript(initialCommand.trim());
      processCommand(initialCommand.trim());
    } else {
      startListening();
    }
  };

  // Turn Voice AI OFF (2nd Click / Deactivation)
  const turnOffVoice = () => {
    setIsActive(false);
    setIsProcessing(false);
    setIsSpeaking(false);
    setStatusText('Idle');
    setLiveTranscript('');
    clearTimeout(autoResetTimerRef.current);

    // 1. Play Deactivation Tone
    soundFX.playDeactivationTone();

    // 2. Cancel Speech Synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // 3. Stop Active Speech Recognition
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

  // Toggle Handler: 1st Click = ON, 2nd Click = OFF
  const handleToggleVoice = () => {
    if (isActive) {
      turnOffVoice();
    } else {
      turnOnVoice();
    }
  };

  // Active Speech Recognition
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatusText('Speech not supported');
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      let speechTimeout = null;

      recognition.onstart = () => {
        setStatusText('Listening...');
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');

        setLiveTranscript(transcript);

        if (speechTimeout) clearTimeout(speechTimeout);

        if (event.results[0].isFinal) {
          try { recognition.stop(); } catch (e) {}
          processCommand(transcript);
        } else {
          // Debounce fallback if final event is delayed
          speechTimeout = setTimeout(() => {
            if (transcript.trim().length > 1) {
              try { recognition.stop(); } catch (e) {}
              processCommand(transcript);
            }
          }, 1800);
        }
      };

      recognition.onerror = (event) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setStatusText('Click mic to speak');
        }
      };

      recognition.onend = () => {
        if (speechTimeout) clearTimeout(speechTimeout);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setStatusText('Microphone ready');
    }
  };

  // Process Voice Command
  const processCommand = async (commandText) => {
    if (!commandText || !commandText.trim()) return;
    setIsProcessing(true);
    setStatusText('Executing...');

    const lower = commandText.toLowerCase().trim();

    // 1. Fast Local Intent Execution
    try {
      const localIntent = await executeVoiceIntent(commandText);
      if (localIntent && localIntent.success) {
        soundFX.playSuccessTone();
        setIsProcessing(false);
        setStatusText(localIntent.message || 'Done');
        speakText(localIntent.message || 'Command executed.');
        return;
      }
    } catch (e) {}

    // Direct Voice Routing
    if (lower.includes('attendance') || lower.includes('punch in') || lower.includes('punch out')) {
      window.dispatchEvent(new CustomEvent('ai_navigate', { detail: 'Attendance' }));
      soundFX.playSuccessTone();
      const msg = 'Opened Attendance Register.';
      setStatusText(msg);
      speakText(msg);
      setIsProcessing(false);
      return;
    }

    if (lower.includes('print') || lower.includes('download pdf')) {
      soundFX.playSuccessTone();
      const msg = 'Printing page.';
      setStatusText(msg);
      speakText(msg);
      setIsProcessing(false);
      setTimeout(() => window.print(), 600);
      return;
    }

    if (lower.includes('lock screen') || lower.includes('privacy mode') || lower.includes('lock workspace')) {
      soundFX.playSuccessTone();
      const msg = 'Workspace locked.';
      setStatusText(msg);
      speakText(msg);
      setIsProcessing(false);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('taxpro_lock_screen'));
      }, 300);
      return;
    }

    if (lower.includes('client') || lower.includes('customer')) {
      window.dispatchEvent(new CustomEvent('ai_navigate', { detail: 'Clients' }));
      soundFX.playSuccessTone();
      const msg = 'Navigated to Clients.';
      setStatusText(msg);
      speakText(msg);
      setIsProcessing(false);
      return;
    }

    if (lower.includes('task') || lower.includes('todo') || lower.includes('to do')) {
      window.dispatchEvent(new CustomEvent('ai_navigate', { detail: 'Tasks' }));
      soundFX.playSuccessTone();
      const msg = 'Opened Tasks.';
      setStatusText(msg);
      speakText(msg);
      setIsProcessing(false);
      return;
    }

    if (lower.includes('fee') || lower.includes('invoice') || lower.includes('payment') || lower.includes('receipt')) {
      const target = lower.includes('fee') ? 'Fees Tracking' : 'Receipts & Payments';
      window.dispatchEvent(new CustomEvent('ai_navigate', { detail: target }));
      soundFX.playSuccessTone();
      const msg = `Opened ${target}.`;
      setStatusText(msg);
      speakText(msg);
      setIsProcessing(false);
      return;
    }

    if (lower.includes('calendar') || lower.includes('timesheet') || lower.includes('schedule')) {
      window.dispatchEvent(new CustomEvent('ai_navigate', { detail: 'Calendar' }));
      soundFX.playSuccessTone();
      const msg = 'Opened Calendar.';
      setStatusText(msg);
      speakText(msg);
      setIsProcessing(false);
      return;
    }

    // 2. Server-side AI brain fallback
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: commandText,
          conversationHistory: [],
          screenContext: { activeItem: localStorage.getItem('taxpro_active_nav') || 'Dashboard' },
          userEmail: localStorage.getItem('taxpro_user_email') || 'admin@taxpro.com'
        })
      });

      const data = await res.json();
      const reply = data.voiceResponse || data.textResponse || 'Command processed.';
      
      soundFX.playSuccessTone();
      setStatusText(reply.length > 30 ? reply.substring(0, 30) + '...' : reply);
      speakText(reply);

      if (data.uiAction) {
        window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
        if (data.uiAction.type === 'navigate' && data.uiAction.target) {
          window.dispatchEvent(new CustomEvent('ai_navigate', { detail: data.uiAction.target }));
        }
      }
    } catch (e) {
      soundFX.playSuccessTone();
      const fallback = `Processed "${commandText}".`;
      setStatusText(fallback);
      speakText(fallback);
    } finally {
      setIsProcessing(false);
    }
  };

  // Passive Background Wake Word ("Hey TaxPro") Listener
  const startWakeWordListener = () => {
    if (isActive || isAIAssistantOpen || !isMountedRef.current) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      if (wakeRecognitionRef.current) {
        try { wakeRecognitionRef.current.abort(); } catch (e) {}
      }

      const wakeRec = new SpeechRecognition();
      wakeRec.lang = 'en-US';
      wakeRec.interimResults = false;
      wakeRec.continuous = false;
      wakeRec.maxAlternatives = 1;

      wakeRec.onstart = () => {
        if (isMountedRef.current) setIsListeningWakeWord(true);
      };

      wakeRec.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim();
        const wakeRegex = /^(hey taxpro|hey tax pro|hey text pro|hey textpro|text pro|textpro|taxpro|tax pro|hello taxpro|hello text pro|ok taxpro|ok text pro|siri|gemini)\s*/i;

        if (wakeRegex.test(transcript)) {
          const command = transcript.replace(wakeRegex, '').trim();
          turnOnVoice(command);
        }
      };

      wakeRec.onerror = () => {};

      wakeRec.onend = () => {
        if (isMountedRef.current && !isActive && !isAIAssistantOpen) {
          setTimeout(startWakeWordListener, 400);
        } else {
          if (isMountedRef.current) setIsListeningWakeWord(false);
        }
      };

      wakeRecognitionRef.current = wakeRec;
      wakeRec.start();
    } catch (e) {}
  };

  const stopWakeWordListener = () => {
    if (wakeRecognitionRef.current) {
      try {
        wakeRecognitionRef.current.onresult = null;
        wakeRecognitionRef.current.onerror = null;
        wakeRecognitionRef.current.onend = null;
        wakeRecognitionRef.current.abort();
      } catch (e) {}
      wakeRecognitionRef.current = null;
    }
    setIsListeningWakeWord(false);
  };

  // Setup Global Listeners
  useEffect(() => {
    isMountedRef.current = true;

    const handleVoiceStartEvent = () => turnOnVoice();
    const handleVoiceCommandEvent = (e) => turnOnVoice(e.detail || '');

    window.addEventListener('taxpro_start_voice', handleVoiceStartEvent);
    window.addEventListener('taxpro_start_voice_command', handleVoiceCommandEvent);

    const handleFirstGesture = () => {
      startWakeWordListener();
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };

    window.addEventListener('pointerdown', handleFirstGesture);
    window.addEventListener('keydown', handleFirstGesture);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('taxpro_start_voice', handleVoiceStartEvent);
      window.removeEventListener('taxpro_start_voice_command', handleVoiceCommandEvent);
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
      stopWakeWordListener();
    };
  }, [isActive, isAIAssistantOpen]);

  // DRAG & MOVE POINTER HANDLERS
  const handlePointerDown = (e) => {
    // Only left click / primary touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const rect = pillRef.current?.getBoundingClientRect();
    if (!rect) return;

    isDraggingRef.current = true;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: position.x !== null ? position.x : rect.left,
      initialPosY: position.y !== null ? position.y : rect.top,
      hasMoved: false
    };

    // Global move and up listeners during drag
    const onMove = (moveEvt) => {
      if (!isDraggingRef.current) return;
      const deltaX = moveEvt.clientX - dragStartRef.current.startX;
      const deltaY = moveEvt.clientY - dragStartRef.current.startY;

      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        dragStartRef.current.hasMoved = true;
      }

      if (dragStartRef.current.hasMoved) {
        const maxX = Math.max(10, window.innerWidth - 240);
        const maxY = Math.max(10, window.innerHeight - 70);
        const newX = Math.max(10, Math.min(maxX, dragStartRef.current.initialPosX + deltaX));
        const newY = Math.max(10, Math.min(maxY, dragStartRef.current.initialPosY + deltaY));
        setPosition({ x: newX, y: newY });
      }
    };

    const onUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);

      if (dragStartRef.current.hasMoved && position.x !== null) {
        localStorage.setItem('taxpro_voice_button_pos', JSON.stringify(position));
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handlePillClick = (e) => {
    if (dragStartRef.current.hasMoved) {
      dragStartRef.current.hasMoved = false;
      return;
    }
    handleToggleVoice(e);
  };

  if (isAIAssistantOpen) return null;

  const isCustomPosition = position.x !== null && position.y !== null;
  const containerStyle = isCustomPosition
    ? { left: `${position.x}px`, top: `${position.y}px`, bottom: 'auto', right: 'auto' }
    : {};

  return (
    <div 
      ref={pillRef}
      style={containerStyle}
      onPointerDown={handlePointerDown}
      className={`fixed ${isCustomPosition ? '' : 'bottom-6 right-6'} z-40 flex items-center gap-3 select-none touch-none`}
    >
      
      {/* MOVABLE CLICK-TO-TOGGLE VOICE AI PILL (Drag anywhere on screen, click to turn ON/OFF) */}
      <button
        type="button"
        onClick={handlePillClick}
        className={`group relative flex items-center gap-2.5 px-3.5 py-3 rounded-full border shadow-2xl backdrop-blur-2xl transition-shadow duration-300 active:scale-95 cursor-grab active:cursor-grabbing ${
          isActive 
            ? 'bg-[#090b14]/95 border-cyan-400 shadow-cyan-500/50 ring-2 ring-cyan-400/40' 
            : 'bg-black/90 border-cyan-500/40 text-white shadow-cyan-500/20 hover:border-cyan-400'
        }`}
        title={isActive ? "Click to Turn Voice AI OFF (Drag to move)" : "Click to Turn Voice AI ON (Drag to move anywhere)"}
      >
        {/* Dynamic Glowing Ambient Halo */}
        <div className={`absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 blur-md transition-opacity duration-300 pointer-events-none ${
          isActive ? 'opacity-90 animate-pulse' : 'opacity-30 group-hover:opacity-60'
        }`} />

        {/* Outer Sound Wave Radar Ping Animation (Active State) */}
        {isActive && (
          <span className="absolute -inset-2 rounded-full border-2 border-cyan-400/60 animate-ping pointer-events-none" />
        )}

        {/* Inner Content Layout */}
        <div className="relative flex items-center gap-2 z-10">
          
          {/* Tactile Drag Grip Indicator */}
          <div className="text-gray-500 group-hover:text-cyan-400 transition-colors -ml-1 cursor-grab">
            <GripVertical className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
          </div>

          {/* Animated Glowing Orb Core */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 shrink-0 ${
            isActive 
              ? 'bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-500 rotate-12 scale-110 shadow-cyan-400/50' 
              : 'bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 group-hover:rotate-12 shadow-cyan-500/30'
          }`}>
            <Bot className="w-4.5 h-4.5 text-white" />
          </div>

          {/* Voice AI Title & Active Animation / Transcript */}
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-bold font-outfit tracking-wide ${isActive ? 'text-cyan-300' : 'text-white'}`}>
                Voice AI
              </span>
              <span className={`w-2 h-2 rounded-full transition-all ${
                isActive 
                  ? 'bg-cyan-400 animate-ping' 
                  : isListeningWakeWord 
                  ? 'bg-emerald-400' 
                  : 'bg-cyan-500/60'
              }`} />
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                isActive 
                  ? 'bg-cyan-400 text-black border-cyan-300 font-extrabold' 
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
              }`}>
                {isActive ? 'ON' : 'OFF'}
              </span>
            </div>

            {/* Sub-label: Live sound status or wake word tip */}
            <span className="text-[9px] font-mono -mt-0.5 truncate max-w-[125px] text-cyan-200/90">
              {isActive 
                ? (liveTranscript || statusText) 
                : '"Hey TaxPro"'}
            </span>
          </div>

          {/* Dynamic 4-Bar Equalizer Sound Wave Animation (When Active) */}
          {isActive ? (
            <div className="flex items-center gap-1 h-5 px-1 bg-cyan-950/60 border border-cyan-400/30 rounded-lg shrink-0">
              {[60, 100, 75, 90].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-cyan-400 to-indigo-400 rounded-full animate-bounce"
                  style={{
                    height: `${h}%`,
                    animationDuration: `${300 + i * 120}ms`,
                    animationDelay: `${i * 90}ms`
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="pl-1 border-l border-white/10 flex items-center shrink-0">
              <Mic className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
          )}

        </div>
      </button>

    </div>
  );
}
