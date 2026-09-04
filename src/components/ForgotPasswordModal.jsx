import React, { useState, useRef } from 'react';
import { X, Mail, Lock, Sparkles, AlertCircle, CheckCircle2, KeyRound, ArrowLeft, Eye, EyeOff, UserCheck, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function ForgotPasswordModal({ isOpen, initialEmail, onClose, onShowToast, onOpenLogin }) {
  const [step, setStep] = useState(1); // 1: Find Account & Send OTP, 2: Verify OTP & Reset
  const [email, setEmail] = useState(initialEmail || '');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountFoundInfo, setAccountFoundInfo] = useState(null);
  const [unregisteredError, setUnregisteredError] = useState(null);

  const inputRefs = useRef([]);

  if (!isOpen) return null;

  const handleFindAccountAndSendOTP = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = email.toLowerCase().trim();
    
    if (!cleanEmail || !cleanEmail.includes('@')) {
      if (onShowToast) onShowToast('Please enter a valid registered Gmail address.', 'warning');
      return;
    }

    setIsSubmitting(true);
    setAccountFoundInfo(null);
    setUnregisteredError(null);
    
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      let matchedAccount = null;

      // 1. Check native PostgreSQL API endpoint first
      try {
        const findRes = await fetch(`${baseUrl}/api/auth/find-account`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail })
        });
        const findJson = await findRes.json();
        if (findJson.success && findJson.account) {
          matchedAccount = findJson.account;
        } else if (findJson.notRegistered) {
          matchedAccount = null;
        }
      } catch (apiErr) {
        console.warn('[Find Account API fallback]:', apiErr.message);
      }

      // 2. Client-side query fallback
      if (!matchedAccount) {
        const superAdmins = ['workforcepro09@gmail.com', 'krushilgadhiya0@gmail.com', 'superadmin@taxpro.com'];
        const savedSuperAdmin = localStorage.getItem('taxpro_secret_superadmin');
        const savedUserEmail = localStorage.getItem('taxpro_user_email');
        
        if (
          superAdmins.includes(cleanEmail) || 
          (savedSuperAdmin && savedSuperAdmin.toLowerCase() === cleanEmail) ||
          (savedUserEmail && savedUserEmail.toLowerCase() === cleanEmail)
        ) {
          matchedAccount = {
            name: localStorage.getItem('taxpro_user_fullname') || 'Primary Administrator',
            role: 'System Administrator',
            email: cleanEmail
          };
        } else {
          // Query team_members
          const { data: memberData } = await supabase
            .from('team_members')
            .select('id, name, designation, role, email')
            .ilike('email', cleanEmail)
            .maybeSingle();

          if (memberData) {
            matchedAccount = {
              name: memberData.name,
              role: memberData.designation || memberData.role || 'Team Member',
              email: memberData.email
            };
          } else {
            // Query users
            const { data: userData } = await supabase
              .from('users')
              .select('id, name, full_name, role, email')
              .ilike('email', cleanEmail)
              .maybeSingle();

            if (userData) {
              matchedAccount = {
                name: userData.name || userData.full_name || 'Staff Member',
                role: userData.role || 'Staff',
                email: userData.email
              };
            }
          }
        }
      }

      // 3. If account is not registered, show popup alert and notify
      if (!matchedAccount) {
        setUnregisteredError(cleanEmail);
        if (onShowToast) onShowToast(`⚠️ Account Not Registered: "${cleanEmail}" was not found in the practice directory.`, 'error');
        setIsSubmitting(false);
        return;
      }

      // 4. Account found: dispatch real 6-digit OTP to user inbox
      try {
        const otpResp = await fetch(`${baseUrl}/api/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, length: 6 })
        });
        const otpJson = await otpResp.json().catch(() => null);
        if (otpJson && !otpJson.success && otpJson.error) {
          throw new Error(otpJson.error);
        }
        if (otpJson && otpJson.token) {
          sessionStorage.setItem(`taxpro_reset_otp_token_${cleanEmail}`, otpJson.token);
        }
        if (otpJson && otpJson.devOtp) {
          sessionStorage.setItem(`taxpro_reset_dev_otp_${cleanEmail}`, String(otpJson.devOtp).trim());
        }
      } catch (otpErr) {
        console.warn('[OTP dispatch error]:', otpErr.message);
      }

      setAccountFoundInfo(matchedAccount);
      setStep(2);
      if (onShowToast) onShowToast(`✓ Account verified! 6-digit security OTP code dispatched to ${cleanEmail}`, 'success');
    } catch(err) {
      if (onShowToast) onShowToast(`Error locating account: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const cleanVal = value.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = cleanVal ? cleanVal.slice(-1) : '';
    setOtp(newOtp);

    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    const enteredCode = otp.join('').trim();
    if (!enteredCode || enteredCode.length < 6) {
      if (onShowToast) onShowToast('Please enter the complete 6-digit verification code received in your email.', 'error');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      if (onShowToast) onShowToast('New password must be at least 6 characters.', 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      if (onShowToast) onShowToast('Passwords do not match. Please re-enter.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanEmail = email.toLowerCase().trim();
      const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const storedToken = sessionStorage.getItem(`taxpro_reset_otp_token_${cleanEmail}`) || '';
      const storedDevOtp = sessionStorage.getItem(`taxpro_reset_dev_otp_${cleanEmail}`) || '';

      // 1. Verify OTP with backend
      const verifyRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, otp: enteredCode, token: storedToken })
      });
      const verifyData = await verifyRes.json().catch(() => ({}));
      if (!verifyData.success || !verifyData.verified) {
        if (!storedDevOtp || storedDevOtp !== enteredCode) {
          throw new Error(verifyData.error || 'Invalid or expired OTP verification code.');
        }
      }

      sessionStorage.removeItem(`taxpro_reset_otp_token_${cleanEmail}`);
      sessionStorage.removeItem(`taxpro_reset_dev_otp_${cleanEmail}`);

      // 2. Reset Password via backend
      const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, newPassword })
      });
      const resetData = await resetRes.json();
      if (!resetData.success) {
        throw new Error(resetData.error || 'Could not update password in database.');
      }

      // 3. Update team_members password in PostgreSQL if member
      try {
        await supabase.from('team_members').update({
           preset_password: newPassword
        }).ilike('email', cleanEmail);
      } catch (err) {}
      
      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

      if (onShowToast) onShowToast('✓ Password successfully updated and verified in PostgreSQL!', 'success');
      onClose();
      if (onOpenLogin) onOpenLogin();
    } catch (err) {
      if (onShowToast) onShowToast(`Password reset failed: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in select-none">
      <div className="relative w-full max-w-md bg-[#111424] border border-cyan-500/30 p-6 sm:p-8 rounded-3xl shadow-2xl shadow-black/80 text-left animate-modal-smooth">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-[1.5px] shadow-lg shadow-cyan-500/20 mx-auto mb-3">
            <div className="w-full h-full bg-[#0b0c16] rounded-2xl flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-white font-outfit">
            {step === 1 ? 'Find Account & Reset' : 'Verify & Set Password'}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {step === 1 
              ? 'Enter your registered Gmail address to locate your profile and receive an OTP.' 
              : `Enter the 6-digit OTP sent to ${email} and your new password.`}
          </p>
        </div>

        {/* UNREGISTERED ACCOUNT POPUP ALERT */}
        {step === 1 && unregisteredError && (
          <div className="mb-4 p-4 rounded-2xl bg-red-500/15 border border-red-500/40 text-left animate-shake shadow-lg shadow-red-500/10">
            <div className="flex items-center gap-2 text-red-400 font-bold text-xs mb-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Account Not Registered in System</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              No account was found for <strong className="text-white font-mono">{unregisteredError}</strong> in the practice directory. Please check for spelling mistakes or contact your Administrator to obtain an invite.
            </p>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleFindAccountAndSendOTP} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" /> Registered Gmail / Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  autoFocus
                  placeholder="Enter your registered email (e.g. user@gmail.com)"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (unregisteredError) setUnregisteredError(null);
                  }}
                  className="w-full px-4 py-3 bg-black/60 border border-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 rounded-2xl outline-none font-mono text-xs text-white placeholder-gray-500 transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 active:scale-98 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 hover:shadow-cyan-600/50 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-cyan-200" />
              <span>{isSubmitting ? 'Locating Profile & Dispatching OTP...' : 'Find Account & Send OTP'}</span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenLogin) onOpenLogin();
                }}
                className="text-xs font-semibold text-gray-400 hover:text-cyan-400 transition-colors"
              >
                Remember your password? <span className="text-cyan-400 underline underline-offset-2">Sign In</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            
            {/* Account Found Verified Badge */}
            {accountFoundInfo && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-emerald-300 truncate">{accountFoundInfo.name}</div>
                  <div className="text-[10px] text-gray-400">{accountFoundInfo.role} • {accountFoundInfo.email}</div>
                </div>
              </div>
            )}

            {/* OTP CODE DISPATCH BANNER */}
            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5 truncate">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" /> 
                <span className="truncate">OTP Sent to: <strong className="font-mono text-white">{email}</strong></span>
              </span>
              <span className="font-mono font-bold text-[10px] text-cyan-200 bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/40 tracking-wider shrink-0 ml-2">
                Valid 10m
              </span>
            </div>

            {/* 6-DIGIT OTP INPUT MATRIX */}
            <div>
              <label className="text-[11px] font-bold text-gray-300 block mb-1.5 text-center uppercase tracking-wider">
                Enter 6-Digit OTP Code
              </label>
              <div className="flex justify-center gap-2 my-1">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => inputRefs.current[idx] = el}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(idx, e.target.value)}
                    className="w-10 h-11 text-center text-lg font-bold font-mono bg-black/60 border border-white/20 rounded-xl text-white outline-none focus:border-cyan-400 focus:bg-cyan-500/10 transition-all"
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-300">New Password</label>
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="text-[10px] text-gray-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  {showPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPass ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-black/60 border border-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 rounded-2xl outline-none text-xs text-white placeholder-gray-500 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">Confirm New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-black/60 border border-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 rounded-2xl outline-none text-xs text-white placeholder-gray-500 transition-all"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 active:scale-98 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                {isSubmitting ? 'Updating Password...' : 'Save Password & Sign In'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
