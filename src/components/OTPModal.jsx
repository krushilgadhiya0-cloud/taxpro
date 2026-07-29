import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  X, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Smartphone,
  Check
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function OTPModal({ isOpen, onClose, onSuccessRedirect, email }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyingText, setVerifyingText] = useState('Verifying.');
  const [verificationStatus, setVerificationStatus] = useState('idle'); // 'idle' | 'verifying' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const activeEmail = (email || 'krushilgadhiya0@gmail.com').trim().toLowerCase();

  const inputRefs = useRef([]);

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

  // Focus first input when modal opens
  useEffect(() => {
    if (isOpen && inputRefs.current[0]) {
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    }
  }, [isOpen]);

  // Dots animation during "Verifying..."
  useEffect(() => {
    let interval;
    if (verificationStatus === 'verifying') {
      let step = 0;
      const texts = ['Verifying.', 'Verifying..', 'Verifying...'];
      interval = setInterval(() => {
        step = (step + 1) % 3;
        setVerifyingText(texts[step]);
      }, 400);
    }
    return () => clearInterval(interval);
  }, [verificationStatus]);

  if (!isOpen) return null;

  // Handle Input change
  const handleChange = (index, value) => {
    if (verificationStatus === 'verifying' || verificationStatus === 'success') return;
    
    // Only accept numeric characters
    const cleanValue = value.replace(/[^0-9]/g, '');

    const newOtp = [...otp];
    newOtp[index] = cleanValue.substring(cleanValue.length - 1);
    setOtp(newOtp);

    // Reset error on edit
    if (verificationStatus === 'error') {
      setVerificationStatus('idle');
      setErrorMessage('');
    }

    // Auto move next
    if (cleanValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if full 6 digits entered
    const fullCode = newOtp.join('');
    if (fullCode.length === 6) {
      triggerVerificationProcess(fullCode);
    }
  };

  // Handle Backspace and Arrow keys
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  // Handle Paste full OTP
  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pasteData.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pasteData[i] || '';
      }
      setOtp(newOtp);
      const lastIndex = Math.min(pasteData.length - 1, 5);
      inputRefs.current[lastIndex]?.focus();

      if (pasteData.length === 6) {
        triggerVerificationProcess(pasteData);
      }
    }
  };

  // SIGNATURE VERIFICATION PIPELINE CONNECTED TO BACKEND
  const triggerVerificationProcess = async (code) => {
    setIsVerifying(true);
    setVerificationStatus('verifying');
    setErrorMessage('');

    const { data, error } = await supabase.auth.verifyOtp({
      email: activeEmail,
      token: code,
      type: 'signup'
    });

    if (error) {
      setVerificationStatus('error');
      setErrorMessage(error.message);
      setIsVerifying(false);
    } else {
      setVerificationStatus('success');
      if (window.confetti) {
        window.confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
      setTimeout(() => {
        onSuccessRedirect();
        onClose();
        resetState();
      }, 2200);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setCountdown(60);
    setCanResend(false);
    setOtp(['', '', '', '', '', '']);
    setVerificationStatus('idle');
    setErrorMessage('');

    await supabase.auth.resend({
      type: 'signup',
      email: activeEmail
    });
    
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  };

  const resetState = () => {
    setOtp(['', '', '', '', '', '']);
    setVerificationStatus('idle');
    setErrorMessage('');
    setIsVerifying(false);
    setCountdown(60);
    setCanResend(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl animate-fade-in">
      
      {/* Modal Container Card */}
      <div className={`relative w-full max-w-md glass-panel p-8 border border-white/15 rounded-3xl shadow-2xl shadow-cyan-500/20 text-center transition-all duration-500 ${
        verificationStatus === 'error' ? 'animate-shake' : ''
      } ${
        verificationStatus === 'success' ? 'scale-105 border-emerald-400/60 shadow-emerald-500/40' : ''
      }`}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Header Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-blue-600/20 to-emerald-500/20 border border-cyan-500/40 flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/10">
          {verificationStatus === 'success' ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />
          ) : verificationStatus === 'error' ? (
            <AlertCircle className="w-8 h-8 text-red-500" />
          ) : (
            <Sparkles className="w-8 h-8 text-cyan-400 animate-pulse" />
          )}
        </div>

        {/* Heading & Subtitle */}
        <h3 className="text-2xl font-extrabold text-white font-outfit tracking-tight">
          Verify your Gmail address
        </h3>
        <p className="text-xs text-cyan-400 mt-2 font-mono font-bold bg-cyan-500/10 py-1 px-3 rounded-full border border-cyan-500/30 inline-block">
          {activeEmail}
        </p>
        <p className="text-xs text-gray-400 mt-2 font-medium">
          We sent a secure 6-digit verification code to your registered Gmail inbox
        </p>



        {/* CLEAN STATIC 6-DIGIT OTP BOX MATRIX (NO ANIMATION SPINNER) */}
        <div className="mt-6 relative inline-block">
          <div className="flex items-center justify-center gap-2.5 sm:gap-3">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                maxLength={1}
                value={digit}
                disabled={verificationStatus === 'verifying' || verificationStatus === 'success'}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                className={`otp-box ${digit ? 'filled' : ''} ${
                  verificationStatus === 'error' ? 'error' : ''
                }`}
              />
            ))}
          </div>

          {/* Spark Particle Effect Orbits */}
          {verificationStatus === 'verifying' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-cyan-400 absolute -top-1 animate-ping"></span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -bottom-1 animate-ping" style={{ animationDelay: '0.5s' }}></span>
            </div>
          )}

        </div>

        {/* VERIFYING CENTER STATUS DISPLAY */}
        <div className="min-h-[48px] mt-6 flex items-center justify-center">
          {verificationStatus === 'verifying' && (
            <div className="flex flex-col items-center gap-1.5 animate-fade-in">
              <span className="text-sm font-extrabold text-cyan-400 font-mono tracking-wider animate-pulse flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
                {verifyingText}
              </span>
              <span className="text-[10px] text-gray-400 font-medium">Securing quantum socket layer...</span>
            </div>
          )}

          {verificationStatus === 'success' && (
            <div className="flex flex-col items-center gap-2 animate-fade-in">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path className="checkmark-path" d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-sm font-extrabold text-emerald-400 tracking-wide">
                Verification Successful! Redirecting...
              </span>
            </div>
          )}

          {verificationStatus === 'error' && (
            <div className="flex flex-col items-center gap-1 animate-fade-in">
              <span className="text-xs font-bold text-red-400 flex items-center gap-1.5 px-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                {errorMessage || 'Invalid Verification Code.'}
              </span>
              <span className="text-[10px] text-gray-400">Please provide a valid code sent to your inbox.</span>
            </div>
          )}

          {verificationStatus === 'idle' && (
            <span className="text-xs text-gray-400">
              Enter 6-digit code or paste from clipboard
            </span>
          )}
        </div>

        {/* RESEND OTP SECTION WITH COUNTDOWN */}
        <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-gray-400">
            <span>Didn't receive code?</span>
            {countdown > 0 ? (
              <span className="font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                {countdown}s
              </span>
            ) : null}
          </div>

          <button
            onClick={handleResend}
            disabled={!canResend || verificationStatus === 'verifying'}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              canResend
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/50 hover:bg-cyan-500/30 hover:scale-105 shadow-md shadow-cyan-500/20 cursor-pointer'
                : 'bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${canResend ? 'animate-spin' : ''}`} />
            <span>give new code</span>
          </button>
        </div>

        {/* Security badge */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] text-gray-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Protected by AES-256 TaxPro Quantum Shield</span>
        </div>

      </div>

    </div>
  );
}
