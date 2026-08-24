import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight, 
  Bot, 
  Volume2, 
  RefreshCw,
  X,
  ShieldCheck
} from 'lucide-react';
import soundFX from '../lib/audioFX';

export default function AIInsightsBar({ onTriggerBriefing, onNavigate }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ai/insights');
      const data = await res.json();
      if (data.success && data.insights) {
        setInsights(data.insights);
      }
    } catch (err) {
      console.warn('[AI Insights Fetch Error]:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
    const interval = setInterval(fetchInsights, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isDismissed || insights.length === 0) return null;

  return (
    <div className="mb-6 p-4 rounded-3xl bg-gradient-to-r from-[#0c0e1a]/95 via-[#101428]/95 to-[#0c0e1a]/95 border border-cyan-500/30 shadow-xl shadow-cyan-500/10 backdrop-blur-2xl animate-fade-in relative overflow-hidden">
      
      {/* Ambient background glow */}
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Header Title & Briefing Trigger */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-emerald-400 p-[1.5px] shadow-lg shadow-cyan-500/20 flex-shrink-0">
            <div className="w-full h-full bg-[#0a0b14] rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-white font-outfit uppercase tracking-wider flex items-center gap-1.5">
                <span>TaxPro AI Proactive Insights</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </h4>
            </div>
            <p className="text-[11px] text-gray-400">
              Autonomous continuous inspection of financial ledgers
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              soundFX.playActivationChime();
              if (onTriggerBriefing) onTriggerBriefing();
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Play Daily Briefing</span>
          </button>

          <button
            onClick={fetchInsights}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 text-xs transition-all"
            title="Refresh Insights"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 text-xs transition-all"
            title="Dismiss Bar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Insights Cards Grid */}
      <div className="mt-3.5 grid grid-cols-1 md:grid-cols-3 gap-3">
        {insights.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              if (onNavigate && item.actionTarget) {
                onNavigate(item.actionTarget);
              }
            }}
            className={`p-3 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
              item.type === 'WARNING'
                ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-400'
                : (item.type === 'IMPORTANT' 
                  ? 'bg-cyan-500/10 border-cyan-500/30 hover:border-cyan-400' 
                  : 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-400')
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono font-bold mb-1">
                <span className={`px-2 py-0.5 rounded-full uppercase ${
                  item.type === 'WARNING' ? 'bg-amber-500/20 text-amber-300' : (item.type === 'IMPORTANT' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-emerald-500/20 text-emerald-300')
                }`}>
                  {item.badge}
                </span>
                <span className="text-gray-400 group-hover:text-white flex items-center gap-0.5">
                  {item.actionLabel} &rarr;
                </span>
              </div>

              <h5 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                {item.title}
              </h5>
              <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
