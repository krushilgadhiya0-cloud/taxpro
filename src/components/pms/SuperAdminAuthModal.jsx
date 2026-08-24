import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, KeyRound, Lock, Eye, EyeOff, X, Sparkles, ArrowRight, Loader2 } from 'lucide-react';

export default function SuperAdminAuthModal({ isOpen, onClose, onSuccess, onShowToast }) {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsVerifying(true);

    const cleanId = adminId.trim().toLowerCase();
    const cleanPass = password.trim();

    const expectedEmail = (import.meta.env.VITE_SUPERADMIN_EMAIL || 'superadmin@taxpro.com').toLowerCase();
    const expectedPass = import.meta.env.VITE_SUPERADMIN_PASSWORD || 'Krushil@2007';

    const isIdValid = cleanId === 'superadmin@taxpro.com' || cleanId === 'superadmin' || cleanId === 'workforcepro09@gmail.com' || cleanId === expectedEmail;
    const isPassValid = cleanPass === 'Krushil@2007' || cleanPass === expectedPass;

    setTimeout(() => {
      if (isIdValid && isPassValid) {
        sessionStorage.setItem('taxpro_superadmin_authenticated', 'true');
        localStorage.setItem('taxpro_secret_superadmin', 'superadmin@taxpro.com');
        localStorage.setItem('taxpro_user_email', 'superadmin@taxpro.com');
        localStorage.setItem('taxpro_user_role', 'Super Admin');
        localStorage.setItem('taxpro_workspace_mode', 'superadmin_core');
        localStorage.setItem('taxpro_profile_completed', 'true');

        if (onShowToast) onShowToast('✓ Master SuperAdmin Key Verified. Welcome to Root Console.', 'success');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMsg('✕ Access Denied: Invalid Master SuperAdmin Key ID or Password.');
        if (onShowToast) onShowToast('✕ SuperAdmin Access Denied: Incorrect credentials.', 'error');
      }
      setIsVerifying(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0f111a] border border-purple-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/50 text-white">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 p-[2px] shadow-lg shadow-purple-500/20">
            <div className="w-full h-full bg-[#0f111a] rounded-2xl flex items-center justify-center text-purple-400">
              <KeyRound className="w-7 h-7 stroke-[2.5]" />
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-black uppercase tracking-wider mb-2 font-mono">
            👑 Root Master Gate
          </div>
          <h2 className="text-xl font-black font-outfit text-white tracking-tight">SuperAdmin Security Pass</h2>
          <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
            This root controller area is strictly restricted. Enter your Master SuperAdmin ID and Passphrase.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5 font-mono uppercase tracking-wider">
              SuperAdmin Master ID
            </label>
            <input
              type="text"
              required
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              placeholder="superadmin@taxpro.com"
              className="w-full px-4 py-3 bg-white/5 border border-purple-500/30 rounded-xl text-white text-xs font-mono outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-300 font-mono uppercase tracking-wider">
                Root Security Passphrase
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showPassword ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter master password"
                className="w-full px-4 py-3 bg-white/5 border border-purple-500/30 rounded-xl text-white text-xs font-mono outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 transition-all pr-10"
              />
              <Lock className="w-4 h-4 text-purple-400/60 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-black text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Verify & Unlock SuperAdmin</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
