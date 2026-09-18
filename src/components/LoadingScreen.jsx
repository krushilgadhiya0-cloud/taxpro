import React, { useState, useEffect } from 'react';
import { ShieldCheck, Sparkles, Building2, CheckCircle2, Lock } from 'lucide-react';

export default function LoadingScreen({ onFinished, targetRole, firmName }) {
  const [phase, setPhase] = useState(0); // 0: initializing, 1: syncing, 2: ready
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Stage 1: Security & Session Handshake
    const t1 = setTimeout(() => {
      setPhase(1);
    }, 280);

    // Stage 2: Workspace & Database Sync
    const t2 = setTimeout(() => {
      setPhase(2);
    }, 600);

    // Stage 3: Smooth Exit
    const t3 = setTimeout(() => {
      setIsExiting(true);
    }, 850);

    // Stage 4: Unmount callback
    const t4 = setTimeout(() => {
      if (onFinished) onFinished();
    }, 1150);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onFinished]);

  const displayRole = targetRole || (typeof window !== 'undefined' ? localStorage.getItem('taxpro_user_role') : null);
  const displayFirm = firmName || (typeof window !== 'undefined' ? localStorage.getItem('taxpro_firm_name') : null) || 'TaxPro Advisory Practice';

  const getRoleBadge = () => {
    if (!displayRole) return null;
    const r = displayRole.toLowerCase();
    if (r.includes('super')) {
      return { label: 'Super Admin', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    }
    if (r.includes('admin') || r.includes('owner')) {
      return { label: 'Administrator', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
    }
    if (r.includes('manager')) {
      return { label: 'Practice Manager', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
    }
    return { label: 'Staff Member', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
  };

  const badge = getRoleBadge();

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0d14] text-white transition-all duration-300 ${
        isExiting ? 'opacity-0 scale-[1.01] pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{ willChange: 'opacity, transform' }}
    >
      {/* Ambient Radial Mesh Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-gradient-to-tr from-indigo-600/15 via-sky-500/10 to-emerald-500/15 rounded-full blur-[110px] animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#0a0d14]/70 to-[#0a0d14]" />
      </div>

      {/* Main Glass Card */}
      <div className="relative z-10 flex flex-col items-center px-8 py-10 max-w-sm w-full mx-4 rounded-3xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl shadow-2xl">
        
        {/* Animated Brand Emblem */}
        <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
          {/* Subtle Rotating Ring */}
          <div
            className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-emerald-400 p-[1.5px] opacity-70"
            style={{
              animation: 'spin 12s linear infinite',
            }}
          >
            <div className="w-full h-full bg-[#0d121f] rounded-2xl" />
          </div>

          {/* Central Icon */}
          <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 flex items-center justify-center shadow-inner">
            <Building2 className="w-8 h-8 text-cyan-400 transition-transform duration-500" />
          </div>

          {/* Status Indicator Dot */}
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0a0d14] p-0.5 z-20 flex items-center justify-center">
            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${phase === 2 ? 'bg-emerald-500' : 'bg-cyan-500'} transition-colors duration-300`}>
              <CheckCircle2 className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
        </div>

        {/* Brand Titles */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="text-2xl font-black tracking-tight font-outfit text-white">
              TAXPRO
            </h1>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 border border-cyan-400/30 text-cyan-300">
              Enterprise
            </span>
          </div>

          <p className="text-xs text-slate-400 font-medium tracking-wide">
            Practice Management & Ledger Platform
          </p>
        </div>

        {/* Optional Role & Firm Info */}
        {(badge || displayFirm) && (
          <div className="mt-5 w-full pt-4 border-t border-white/[0.06] flex flex-col items-center gap-1.5 text-center">
            {badge && (
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
                {badge.label}
              </span>
            )}
            <span className="text-[11px] text-slate-400 font-medium truncate max-w-[240px]">
              🏢 {displayFirm}
            </span>
          </div>
        )}

        {/* Smooth GPU Accelerated Progress Bar */}
        <div className="mt-6 w-full">
          <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 transition-all duration-300">
              {phase === 0 && (
                <>
                  <Lock className="w-3 h-3 text-cyan-400 animate-pulse" />
                  <span>Securing session keys...</span>
                </>
              )}
              {phase === 1 && (
                <>
                  <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
                  <span>Syncing practice ledger...</span>
                </>
              )}
              {phase === 2 && (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Workspace synchronized</span>
                </>
              )}
            </span>
            <span className="text-cyan-400/90 font-bold">
              {phase === 0 ? '35%' : phase === 1 ? '75%' : '100%'}
            </span>
          </div>

          {/* Hardware-accelerated track */}
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden relative">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-emerald-400 transition-all shadow-sm shadow-cyan-500/50"
              style={{
                width: phase === 0 ? '35%' : phase === 1 ? '75%' : '100%',
                transition: 'width 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </div>
        </div>

        {/* Footer Security Badge */}
        <div className="mt-6 flex items-center gap-1.5 text-[10px] text-slate-500 font-mono tracking-wider">
          <ShieldCheck className="w-3 h-3 text-emerald-400/70" />
          <span>Real-Time Multi-Role Practice Security</span>
        </div>

      </div>
    </div>
  );
}
