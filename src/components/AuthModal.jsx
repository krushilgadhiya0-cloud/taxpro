import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  Smartphone, 
  Globe, 
  Fingerprint, 
  ScanFace, 
  CheckCircle2, 
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function AuthModal({ isOpen, mode, onClose, onSwitchMode, onOpenOTP, onShowToast, onLoginSuccess, onOpenForgotPassword }) {
  const [authTab, setAuthTab] = useState(mode || 'login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [alreadyRegisteredAlert, setAlreadyRegisteredAlert] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode) {
      setAuthTab(mode);
    }
    setAlreadyRegisteredAlert(false);
    setLoginError('');
  }, [mode, isOpen]);

  if (!isOpen) return null;

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 25;
    if (/[^A-Za-z0-9]/.test(password)) score += 25;
    return score;
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      onShowToast('Please enter a valid Gmail address.', 'warning');
      return;
    }

    setIsSubmitting(true);

    if (authTab === 'signup') {
      if (password.length < 7 || !/[A-Z]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
        onShowToast('Password does not meet strict requirements.', 'warning');
        setIsSubmitting(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('user already exists')) {
          setAlreadyRegisteredAlert(true);
        } else {
          onShowToast(`✕ Registration Failed: ${error.message}`, 'error');
        }
        setIsSubmitting(false);
        return;
      }

      // Supabase returns data.user === null if the email is already taken and confirm emails are on, but since we rely on the error, we'll check it.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setAlreadyRegisteredAlert(true);
        setIsSubmitting(false);
        return;
      }

      onShowToast('Registration successful! Please check your email for the welcome mail and verification OTP.', 'success');
      setTimeout(() => {
        onClose();
        if (onOpenOTP) onOpenOTP(cleanEmail);
      }, 2000);
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        setLoginError('✕ Incorrect Email or Password. Please try again.');
        onShowToast(`✕ Login Failed`, 'error');
        setIsSubmitting(false);
        return;
      }

      if (data.user?.user_metadata?.profile_completed) {
        localStorage.setItem('taxpro_profile_completed', 'true');
      }

      onShowToast('✓ Login successful! Redirecting to your dashboard...', 'success');
      setTimeout(() => {
        onClose();
        if (onLoginSuccess) onLoginSuccess();
      }, 1000);
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl animate-fade-in">
      <div className="relative w-full max-w-md glass-panel p-8 border border-white/15 rounded-3xl shadow-2xl shadow-cyan-500/20">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Tab Switcher */}
        <div className="flex bg-white/[0.04] p-1 rounded-2xl border border-white/10 mb-6">
          <button
            onClick={() => setAuthTab('login')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              authTab === 'login' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setAuthTab('signup')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              authTab === 'signup' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="text-2xl font-extrabold text-white font-outfit">
            {authTab === 'login' ? 'Welcome Back to TaxPro AI' : 'Start Your Free Account'}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {authTab === 'login' ? 'Sign in with your registered Gmail address' : 'Register your Gmail for instant AI financial workspace access'}
          </p>
        </div>

        {/* Already Registered Alert Banner */}
        {alreadyRegisteredAlert && (
          <div className="mb-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Gmail Address Already Registered</span>
            </div>
            <p className="text-[11px] text-gray-300">
              The Gmail address <strong className="text-white font-mono">{email}</strong> is already registered. Please sign in or reset your password.
            </p>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setAuthTab('login')}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/40"
              >
                Sign In Now
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenForgotPassword) onOpenForgotPassword(email);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40"
              >
                Forgot Password?
              </button>
            </div>
          </div>
        )}

        {/* Failed Login Error Block */}
        {authTab === 'login' && loginError && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 font-bold animate-shake">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <span>{loginError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">Registered Gmail Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" />
              <input
                type="email"
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setAlreadyRegisteredAlert(false);
                }}
                className="w-full glass-input pl-10 pr-4 py-2.5 text-xs text-white"
                required
              />
            </div>
          </div>

          <div>
            <div className="mb-1">
              <label className="text-xs font-semibold text-gray-300">Password</label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input pl-10 pr-10 py-2.5 text-xs text-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {authTab === 'login' && (
              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenForgotPassword) onOpenForgotPassword(email);
                  }}
                  className="text-[11px] font-bold text-cyan-400 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            )}
          </div>

          {/* Password strength meter and Red Line Pop up for signup */}
          {authTab === 'signup' && (
            <div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>Password Strength Requirements</span>
                <span className="font-bold text-cyan-400">{strength}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-1">
                <div
                  className="h-full bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-400 transition-all duration-300"
                  style={{ width: `${strength}%` }}
                ></div>
              </div>
              {password.length > 0 && (password.length < 7 || !/[A-Z]/.test(password) || !/[^A-Za-z0-9]/.test(password)) && (
                <div className="text-[10px] font-bold text-red-500 flex items-center gap-1 mt-1 bg-red-500/10 p-1.5 rounded-md border border-red-500/30">
                  <AlertCircle className="w-3 h-3" /> Minimum 7 chars, 1 uppercase, and 1 special character required!
                </div>
              )}
            </div>
          )}

          {/* Action CTAs */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`mt-2 btn-neon-primary py-3 text-xs font-bold shadow-lg shadow-cyan-500/20 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? 'Processing...' : (authTab === 'login' ? 'Sign In to Dashboard' : 'Create Free Account & Verify')}
          </button>

        </form>

        {/* GOOGLE SIGN IN OPTION */}
        <div className="mt-6 pt-5 border-t border-white/10 text-center">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-3">Or continue with</span>
          
          <button
            type="button"
            onClick={async () => {
              onShowToast('Redirecting to Google for authentication...', 'info');
              const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                  redirectTo: window.location.origin,
                },
              });
              if (error) {
                onShowToast(`✕ Google Login Failed: ${error.message}`, 'error');
              }
            }}
            className="w-full py-2.5 rounded-xl bg-white text-black font-bold text-xs flex items-center justify-center gap-2 hover:bg-gray-100 transition-all shadow-md"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Gmail</span>
          </button>
        </div>

        {/* Footer Link */}
        <div className="mt-6 text-center text-xs text-gray-400">
          <span>Need Gmail verification code? </span>
          <button
            onClick={() => {
              onClose();
              if (onOpenOTP) onOpenOTP(email || 'cfo@taxpro.ai');
            }}
            className="text-emerald-400 font-bold hover:underline"
          >
            Verify Gmail via OTP Ring
          </button>
        </div>

      </div>
    </div>
  );
}
