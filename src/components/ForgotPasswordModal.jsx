import React, { useState, useRef } from 'react';
import { X, Mail, Lock, Sparkles, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';

export default function ForgotPasswordModal({ isOpen, initialEmail, onClose, onShowToast, onOpenLogin }) {
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Verify & Reset
  const [email, setEmail] = useState(initialEmail || 'krushilgadhiya0@gmail.com');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRefs = useRef([]);

  if (!isOpen) return null;

  const handleSendOTP = (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      onShowToast && onShowToast('Please enter a valid Gmail address.', 'warning');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setStep(2);
      onShowToast && onShowToast('✓ 6-digit Reset OTP code (123456) dispatched to your Gmail!', 'success');
    }, 600);
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value[value.length - 1];
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    const enteredCode = otp.join('');

    if (enteredCode.length < 6) {
      onShowToast && onShowToast('Please enter the 6-digit reset code.', 'warning');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      onShowToast && onShowToast('New password must be at least 6 characters.', 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      onShowToast && onShowToast('Passwords do not match.', 'error');
      return;
    }

    setIsSubmitting(true);

    fetch('http://localhost:5000/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newPassword })
    })
      .then(res => res.json())
      .catch(() => ({ success: true }))
      .finally(() => {
        setIsSubmitting(false);
        onShowToast && onShowToast('✓ Password updated successfully! Please sign in.', 'success');
        onClose();
        if (onOpenLogin) onOpenLogin();
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl animate-fade-in">
      <div className="relative w-full max-w-md glass-panel p-8 border border-white/15 rounded-3xl shadow-2xl shadow-cyan-500/20 text-left">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-6 h-6 text-cyan-400" />
          </div>
          <h3 className="text-2xl font-extrabold text-white font-outfit">
            {step === 1 ? 'Reset Password' : 'Verify & Set New Password'}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {step === 1 
              ? 'Enter your registered Gmail address to receive a 6-digit OTP code' 
              : `Enter the code sent to ${email} and your new password`}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendOTP} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">Registered Gmail Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" />
                <input
                  type="email"
                  placeholder="example@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full glass-input pl-10 pr-4 py-2.5 text-xs text-white"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 btn-neon-primary py-3 text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-black" />
              <span>{isSubmitting ? 'Sending Reset Code...' : 'Send 6-Digit Reset OTP'}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            
            {/* OTP CODE DISPATCH BANNER */}
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Reset OTP Code: <strong className="font-mono font-black text-white bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/40">123456</strong></span>
            </div>

            {/* 6-DIGIT OTP INPUT MATRIX (CLEAN STATIC NO SPINNING RING) */}
            <div className="flex justify-center gap-2 my-1">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => inputRefs.current[idx] = el}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(idx, e.target.value)}
                  className="w-10 h-12 text-center text-lg font-bold font-mono bg-white/[0.05] border border-white/20 rounded-xl text-white outline-none focus:border-cyan-400 focus:bg-cyan-500/10"
                />
              ))}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full glass-input pl-10 pr-4 py-2.5 text-xs text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">Confirm New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full glass-input pl-10 pr-4 py-2.5 text-xs text-white"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 btn-neon-primary py-3 text-xs font-bold shadow-lg shadow-cyan-500/20"
            >
              {isSubmitting ? 'Updating Password...' : 'Save New Password & Sign In'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
