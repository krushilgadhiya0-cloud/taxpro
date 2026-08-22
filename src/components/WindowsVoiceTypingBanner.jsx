import React from 'react';
import { Mic, MicOff, X, Sparkles, Volume2, Globe } from 'lucide-react';

export default function WindowsVoiceTypingBanner({ 
  isListening, 
  interimTranscript, 
  audioLevel = 0, 
  currentLang = 'en-IN',
  onToggleLang,
  onStopListening 
}) {
  if (!isListening) return null;

  // Calculate 5 waveform bar heights based on live decibels
  const barHeights = [
    Math.max(6, Math.min(28, Math.round(audioLevel * 0.28))),
    Math.max(10, Math.min(36, Math.round(audioLevel * 0.40))),
    Math.max(14, Math.min(42, Math.round(audioLevel * 0.48))),
    Math.max(10, Math.min(36, Math.round(audioLevel * 0.40))),
    Math.max(6, Math.min(28, Math.round(audioLevel * 0.28)))
  ];

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[999999] animate-bounce-in max-w-xl w-[92vw] sm:w-auto">
      <div className="bg-[#181824]/95 backdrop-blur-xl border border-indigo-500/40 rounded-full px-4 sm:px-6 py-3 shadow-2xl shadow-indigo-500/20 text-white flex items-center gap-3 sm:gap-4">
        
        {/* Animated Mic Capsule */}
        <div className="relative flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/40 relative">
            <Mic className="w-5 h-5 text-white animate-pulse" />
            <span className="absolute -inset-1 rounded-full bg-indigo-500/30 animate-ping"></span>
          </div>
        </div>

        {/* Live Audio Waveform Bars */}
        <div className="flex items-center gap-1 h-8 px-1">
          {barHeights.map((h, idx) => (
            <div 
              key={idx}
              style={{ height: `${h}px` }}
              className="w-1 bg-gradient-to-t from-indigo-400 to-cyan-300 rounded-full transition-all duration-75"
            />
          ))}
        </div>

        {/* Streaming Live Text / Prompt */}
        <div className="flex-1 min-w-[160px] sm:min-w-[240px] max-w-xs sm:max-w-md">
          {interimTranscript ? (
            <p className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
              "{interimTranscript}"
              <span className="inline-block w-1.5 h-3.5 bg-indigo-400 ml-1 animate-pulse" />
            </p>
          ) : (
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              <p className="text-xs font-semibold text-gray-300 truncate">
                Windows Voice Typing... <span className="text-indigo-400 hidden sm:inline">(Speak now)</span>
              </p>
            </div>
          )}
          <p className="text-[10px] text-gray-400 font-medium truncate">
            Win+H Grade AI VAD • Intelligent Silence Detection
          </p>
        </div>

        {/* Language Badge Toggle */}
        <button 
          onClick={onToggleLang}
          title="Toggle Language (EN-IN / EN-US)"
          className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/15 rounded-full text-[10px] font-extrabold text-indigo-300 flex items-center gap-1 transition-all cursor-pointer"
        >
          <Globe className="w-3 h-3" />
          {currentLang.toUpperCase()}
        </button>

        {/* Stop Button */}
        <button 
          onClick={onStopListening}
          title="Stop Listening (Esc)"
          className="p-1.5 hover:bg-red-500/20 hover:text-red-400 text-gray-400 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
}
