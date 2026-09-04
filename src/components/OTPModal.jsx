import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle, 
  Check, 
  Sparkles,
  Smartphone,
  Lock,
  Mail
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function OTPModal({ isOpen, onClose, onSuccessRedirect, email }) {
  // 4 Boxes State
  const [otp, setOtp] = useState(['', '', '', '']);
  
  // Animation Stage: 'input' | 'curling' | 'spinning' | 'screwing' | 'verdict_success' | 'verdict_error'
  const [stage, setStage] = useState('input');
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const activeEmail = (email || 'krushilgadhiya0@gmail.com').trim().toLowerCase();
  const inputRefs = useRef([]);

  // Send real OTP via smtplib on modal open
  useEffect(() => {
    if (isOpen) {
      resetState();
      dispatchSmtpOtp();
      setTimeout(() => inputRefs.current[0]?.focus(), 250);
    }
  }, [isOpen, email]);

  // Dispatch OTP via backend smtplib pipeline
  const dispatchSmtpOtp = async () => {
    setIsSendingOtp(true);
    try {
      let smtpConfig = null;
      try {
        const raw = localStorage.getItem('taxpro_smtp');
        if (raw) smtpConfig = JSON.parse(raw);
      } catch (e) {}

      const baseUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || '';
      let data = null;
      try {
        const res = await fetch(`${baseUrl}/api/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: activeEmail,
            smtpConfig
          })
        });
        const text = await res.text().catch(() => '');
        if (text && !text.trim().startsWith('<')) {
          data = JSON.parse(text);
        }
      } catch (fetchErr) {}

      if (data && data.success) {
        console.log(`[OTP Security] ✓ Sended real OTP to ${activeEmail}`);
      } else if (data && data.error) {
        setErrorMessage(data.error);
      }
    } catch (err) {
      console.warn('OTP dispatch note:', err.message);
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Timer countdown logic
  useEffect(() => {
    let timer;
    if (isOpen && countdown > 0 && !canResend) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, countdown, canResend]);

  if (!isOpen) return null;

  // Handle Input change
  const handleChange = (index, value) => {
    if (stage !== 'input') return;
    
    // Only accept numeric characters
    const cleanValue = value.replace(/[^0-9]/g, '');

    const newOtp = [...otp];
    newOtp[index] = cleanValue.substring(cleanValue.length - 1);
    setOtp(newOtp);

    // Auto move next input
    if (cleanValue && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if 4th digit entered -> Trigger Orbital Curl Animation!
    const fullCode = newOtp.join('');
    if (fullCode.length === 4) {
      triggerOrbitalVerification(fullCode);
    }
  };

  // Handle Backspace
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  // Handle Paste
  const handlePaste = (e) => {
    e.preventDefault();
    if (stage !== 'input') return;
    
    const pasteData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 4);
    if (pasteData.length > 0) {
      const newOtp = ['', '', '', ''];
      for (let i = 0; i < pasteData.length; i++) {
        newOtp[i] = pasteData[i] || '';
      }
      setOtp(newOtp);
      const lastIndex = Math.min(pasteData.length - 1, 3);
      inputRefs.current[lastIndex]?.focus();

      if (pasteData.length === 4) {
        triggerOrbitalVerification(pasteData);
      }
    }
  };

  // =========================================================================
  // FAST, RELIABLE & INTUITIVE OTP VERIFICATION PIPELINE
  // =========================================================================
  const triggerOrbitalVerification = async (code) => {
    if (!code || code.length < 4) {
      setErrorMessage('Please enter all 4 digits.');
      return;
    }

    setStage('curling');

    // 1. Strict Server Verification against Real Sended OTP
    let isSuccess = false;

    try {
      const baseUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: activeEmail,
          otp: code
        })
      });

      const data = await res.json().catch(() => null);

      if (data && data.success && data.verified) {
        isSuccess = true;
      } else {
        setErrorMessage(data?.error || 'Invalid 4-digit verification code. Please check your email and try again.');
        isSuccess = false;
      }
    } catch (e) {
      setErrorMessage('Verification failed. Please ensure the server is online and try again.');
      isSuccess = false;
    }

    if (isSuccess) {
      setStage('verdict_success');
      if (window.confetti) {
        window.confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      }
      setTimeout(() => {
        if (onSuccessRedirect) onSuccessRedirect();
        onClose();
        resetState();
      }, 500);
    } else {
      setStage('verdict_error');
      setTimeout(() => {
        setStage('input');
        setOtp(['', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }, 900);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setCountdown(60);
    setCanResend(false);
    setOtp(['', '', '', '']);
    setStage('input');
    setErrorMessage('');

    await dispatchSmtpOtp();
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  };

  const resetState = () => {
    setOtp(['', '', '', '']);
    setStage('input');
    setErrorMessage('');
    setCountdown(60);
    setCanResend(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-fade-in font-sans">
      
      {/* Modal Container Card */}
      <div className={`relative w-full max-w-sm glass-panel p-8 border border-white/15 rounded-3xl shadow-2xl text-center transition-all duration-500 overflow-hidden ${
        stage === 'verdict_success' ? 'border-emerald-400/80 shadow-emerald-500/30' : (stage === 'verdict_error' ? 'border-red-500/80 shadow-red-500/30' : 'shadow-cyan-500/20')
      }`}>
        
        {/* Subtle Ambient Glow */}
        <div className={`absolute -top-24 -right-24 w-52 h-52 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
          stage === 'verdict_success' ? 'bg-emerald-500/30' : (stage === 'verdict_error' ? 'bg-red-500/30' : 'bg-cyan-500/15')
        }`} />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand / Header */}
        <div className="mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono mb-3">
            <Mail className="w-3 h-3 text-cyan-400" />
            <span>PYTHON SMTPLIB DISPATCHED</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white font-outfit tracking-tight">
            Security Verification
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            4-digit code dispatched to <span className="text-white font-mono font-bold">{activeEmail}</span>
          </p>
        </div>

        {/* ========================================================= */}
        {/* THE 4 BOXES -> ORBITAL RING -> ONE TILE CONTAINER */}
        {/* ========================================================= */}
        <div className="otp-stage-container my-6">

          {/* STAGE 0: HORIZONTAL 4 BOXES (INPUT MODE) */}
          {stage === 'input' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="flex items-center justify-center gap-3">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    className={`otp-box-modern ${digit ? 'filled' : ''}`}
                    placeholder="•"
                    autoComplete="off"
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => triggerOrbitalVerification(otp.join(''))}
                disabled={otp.join('').length < 4}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40"
              >
                <span>Verify Code & Enter Workspace</span>
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STAGE 1, 2, 3: ORBITAL HUB (CURLING, SPINNING, SCREWING DOWN) */}
          {(stage === 'curling' || stage === 'spinning' || stage === 'screwing') && (
            <div className={`orbital-hub ${stage === 'spinning' ? 'spinning' : ''} ${stage === 'screwing' ? 'screwing-down' : ''}`}>
              
              {/* Dashed Pure Light Orbit Track Ring */}
              <div className="orbital-ring-track" />

              {/* 4 Curled Boxes on Orbit */}
              {otp.map((digit, idx) => (
                <div 
                  key={idx} 
                  className={`orbital-item orbital-item-${idx}`}
                >
                  <span>{digit}</span>
                </div>
              ))}

              {/* Central Light Spark */}
              <div className="w-3 h-3 rounded-full bg-white shadow-lg shadow-white animate-ping" />

            </div>
          )}

          {/* STAGE 4: ONE VERIFIED TILE (VERDICT ARRIVAL) */}
          {(stage === 'verdict_success' || stage === 'verdict_error') && (
            <div className={`verified-tile ${stage === 'verdict_success' ? 'verdict-success' : 'verdict-error'}`}>
              {stage === 'verdict_success' ? (
                <div className="w-10 h-10 rounded-full bg-emerald-400/20 border border-emerald-400 flex items-center justify-center">
                  <Check className="w-6 h-6 text-emerald-400 stroke-[3]" />
                </div>
              ) : (
                <AlertCircle className="w-7 h-7 text-red-500" />
              )}
            </div>
          )}

        </div>

        {/* Dynamic Status / Verdict Message */}
        <div className="min-h-[36px] flex items-center justify-center">
          {stage === 'input' && (
            <span className="text-xs text-gray-400 flex items-center gap-1.5 justify-center">
              {isSendingOtp ? (
                <span className="text-cyan-400 font-mono flex items-center gap-1 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Dispathing via smtplib...
                </span>
              ) : (
                <span>Type the last digit to initiate orbital verification</span>
              )}
            </span>
          )}

          {(stage === 'curling' || stage === 'spinning' || stage === 'screwing') && (
            <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span>Verifying smtplib Token Orbit...</span>
            </span>
          )}

          {stage === 'verdict_success' && (
            <span className="text-xs font-black font-outfit text-emerald-400 tracking-wide flex items-center gap-1.5 animate-fade-in">
              <span>✓ SMTPLIB AUTHORIZATION VERIFIED</span>
            </span>
          )}

          {stage === 'verdict_error' && (
            <span className="text-xs font-bold text-red-400 flex items-center gap-1 animate-shake">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              <span>{errorMessage || 'Incorrect Code. Resetting...'}</span>
            </span>
          )}
        </div>

        {/* Resend OTP Section */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-gray-400">
            <span>Didn't receive?</span>
            {countdown > 0 ? (
              <span className="font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                {countdown}s
              </span>
            ) : null}
          </div>

          <button
            onClick={handleResend}
            disabled={!canResend || stage !== 'input' || isSendingOtp}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
              canResend && stage === 'input'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 hover:bg-cyan-500/30 hover:scale-105 cursor-pointer shadow-md shadow-cyan-500/20'
                : 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed'
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${canResend ? 'animate-spin' : ''}`} />
            <span>Resend via SMTP</span>
          </button>
        </div>

        {/* Security Info */}
        <div className="mt-4 text-[10px] text-gray-500 font-mono">
          <span>Protected by Python smtplib TLS Transmission</span>
        </div>

      </div>

    </div>
  );
}
