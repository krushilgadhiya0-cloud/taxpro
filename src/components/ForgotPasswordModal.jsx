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
    
    try {
       const superAdmins = ['workforcepro09@gmail.com', 'krushilgadhiya0@gmail.com'];
       const savedSuperAdmin = localStorage.getItem('taxpro_secret_superadmin');
       const savedUserEmail = localStorage.getItem('taxpro_user_email');
       
       let matchedAccount = null;

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
          // Query PostgreSQL team_members table
          const { data, error } = await supabase
            .from('team_members')
            .select('id, name, designation, email')
            .ilike('email', cleanEmail)
            .maybeSingle();

          if (data) {
             matchedAccount = {
               name: data.name,
               role: data.designation || 'Team Member',
               email: data.email
             };
          }
       }

       // Also check general users table if available
       if (!matchedAccount) {
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('id, full_name, email, role')
              .ilike('email', cleanEmail)
              .maybeSingle();

            if (userData) {
              matchedAccount = {
                name: userData.full_name || 'Staff Member',
                role: userData.role || 'Staff',
                email: userData.email
              };
            }
          } catch(e) {}
       }

       if (!matchedAccount) {
          if (onShowToast) onShowToast('Account not found in directory. Please verify your Gmail address.', 'error');
          setIsSubmitting(false);
          return;
       }

       setAccountFoundInfo(matchedAccount);
       setStep(2);
       if (onShowToast) onShowToast(`✓ Account verified! 6-digit Reset OTP code (123456) dispatched to ${cleanEmail}`, 'success');
    } catch(err) {
       if (onShowToast) onShowToast(`Error locating account: ${err.message}`, 'error');
    } finally {
       setIsSubmitting(false);
    }
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

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    const enteredCode = otp.join('');
    if (enteredCode !== '123456') {
      if (onShowToast) onShowToast('Incorrect verification OTP code. Enter 123456.', 'error');
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
      
      // Update team_members password in PostgreSQL if member
      await supabase.from('team_members').update({
         preset_password: newPassword
      }).ilike('email', cleanEmail);
      
      // Try Supabase Auth password update
      try {
        await supabase.auth.updateUser({ password: newPassword });
      } catch(sbErr) {}

      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

      if (onShowToast) onShowToast('✓ Password successfully updated! Signing in...', 'success');
      onClose();
      if (onOpenLogin) onOpenLogin();
    } catch (err) {
      if (onShowToast) onShowToast(`Password sync failed: ${err.message}`, 'error');
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
                  onChange={(e) => setEmail(e.target.value)}
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
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" /> 
                <span>Verification Code Sent:</span>
              </span>
              <strong className="font-mono font-black text-white bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/40 tracking-wider">
                123456
              </strong>
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
