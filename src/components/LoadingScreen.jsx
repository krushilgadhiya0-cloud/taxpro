import React, { useState, useEffect } from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';

export default function LoadingScreen({ onFinished }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => onFinished(), 300);
          return 100;
        }
        return prev + 2;
      });
    }, 25);

    return () => clearInterval(timer);
  }, [onFinished]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white animate-fade-in">
      
      {/* Glow Backdrop */}
      <div className="w-96 h-96 rounded-full bg-cyan-500/10 filter blur-[100px] absolute"></div>

      {/* Brand Mark */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* Animated Ring Logo */}
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-emerald-400 p-[2px] animate-spin" style={{ animationDuration: '4s' }}>
            <div className="w-full h-full bg-black rounded-3xl"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldCheck className="w-12 h-12 text-cyan-400 animate-pulse" />
          </div>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight font-outfit text-white">
          TAXPRO <span className="text-cyan-400">AI</span>
        </h1>
        <p className="text-xs text-gray-400 mt-1 font-medium tracking-widest uppercase">
          Quantum Financial Platform
        </p>

        {/* Progress Bar & Percentage Counter */}
        <div className="mt-8 w-64">
          <div className="flex justify-between text-xs font-mono mb-2">
            <span className="text-gray-400">Initializing Engine...</span>
            <span className="text-cyan-400 font-bold">{progress}%</span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-600 to-emerald-400 transition-all duration-75 shadow-md shadow-cyan-500/50"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-1.5 text-[10px] text-gray-500 font-mono">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>60 FPS GPU Accelerated Render</span>
        </div>

      </div>
    </div>
  );
}
