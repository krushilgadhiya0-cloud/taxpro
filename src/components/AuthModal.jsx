import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  ShieldCheck, 
  ShieldAlert,
  UserCheck, 
  Users, 
  Briefcase, 
  KeyRound, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Terminal, 
  Sparkles,
  ArrowRight,
  Fingerprint,
  ChevronLeft,
  Building2,
  CheckCircle2,
  Send
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function AuthModal({ 
  isOpen, 
  mode = 'login', 
  onClose, 
  onSwitchMode, 
  onOpenOTP, 
  onShowToast, 
  onLoginSuccess, 
  onOpenForgotPassword 
}) {
  // Primary portal view: 'admin' | 'manager' | 'employee' | 'secret_superadmin'
  const [portalType, setPortalType] = useState('admin'); 
  const [authTab, setAuthTab] = useState(mode || 'login'); // 'login' | 'signup'

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Taxation & Audit');
  const [showPassword, setShowPassword] = useState(false);

  // SuperAdmin Secret Terminal State
  const [superAdminId, setSuperAdminId] = useState('');
  const [superAdminPass, setSuperAdminPass] = useState('');
  const [showSuperPass, setShowSuperPass] = useState(false);

  // Status and error handling
  const [alreadyRegisteredAlert, setAlreadyRegisteredAlert] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (portalType !== 'admin') {
      // Manager & Employee can NEVER create account self-service (Invitation-Only)
      setAuthTab('login');
    } else {
      setAuthTab(mode === 'signup' ? 'signup' : 'login');
    }
    setAlreadyRegisteredAlert(false);
    setLoginError('');
  }, [mode, isOpen, portalType]);

  if (!isOpen) return null;

  // Password strength calculation for sign up (Admin only)
  const getPasswordStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 7) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 25;
    if (/[^A-Za-z0-9]/.test(password)) score += 25;
    return score;
  };

  const strength = getPasswordStrength();

  // Reset inputs when switching portals
  const handleSwitchPortal = (type) => {
    setPortalType(type);
    if (type !== 'admin') {
      setAuthTab('login'); // Strictly enforce direct login for manager & employee
    }
    setLoginError('');
    setAlreadyRegisteredAlert(false);
  };

  // Handle Secret SuperAdmin Gateway Login
  const handleSuperAdminSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLoginError('');

    const cleanId = superAdminId.trim().toLowerCase();
    const cleanPass = superAdminPass.trim();

    const isSuperIdValid = cleanId === 'superadmin@taxpro.com' || cleanId === 'superadmin' || cleanId === (import.meta.env.VITE_SUPERADMIN_EMAIL || '').toLowerCase();
    const isSuperPassValid = cleanPass === 'Krushil@2007' || cleanPass === (import.meta.env.VITE_SUPERADMIN_PASSWORD || '');

    setTimeout(() => {
      if (isSuperIdValid && isSuperPassValid) {
        sessionStorage.setItem('taxpro_superadmin_authenticated', 'true');
        localStorage.setItem('taxpro_secret_superadmin', 'superadmin@taxpro.com');
        localStorage.setItem('taxpro_user_email', 'superadmin@taxpro.com');
        localStorage.setItem('taxpro_workspace_mode', 'superadmin_core');
        localStorage.setItem('taxpro_profile_completed', 'true');
        localStorage.setItem('taxpro_user_role', 'Super Admin');

        onShowToast('✓ MASTER ROOT AUTHORIZATION GRANTED. Welcome SuperAdmin.', 'success');
        
        // Dispatch instant event for App.jsx
        window.dispatchEvent(new CustomEvent('taxpro_superadmin_login'));

        setTimeout(() => {
          onClose();
          if (onLoginSuccess) onLoginSuccess('superadmin@taxpro.com', 'Super Admin');
        }, 500);
      } else {
        setLoginError('✕ ACCESS DENIED: Invalid Master Key ID or Root Passphrase.');
        onShowToast('✕ Unauthorized SuperAdmin Attempt: Security Log Recorded.', 'error');
      }
      setIsSubmitting(false);
    }, 600);
  };

  // Handle Standard Admin / Manager / Employee Login & Signup
  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      onShowToast('Please enter a valid email address.', 'warning');
      return;
    }

    setIsSubmitting(true);
    setLoginError('');

    // 1. Check if user typed superadmin credentials
    const isSuperEmail = cleanEmail === 'superadmin@taxpro.com' || cleanEmail === 'superadmin' || cleanEmail === (import.meta.env.VITE_SUPERADMIN_EMAIL || '').toLowerCase();
    const isSuperPass = password === 'Krushil@2007' || password === import.meta.env.VITE_SUPERADMIN_PASSWORD;

    if (isSuperEmail && isSuperPass) {
      sessionStorage.setItem('taxpro_superadmin_authenticated', 'true');
      localStorage.setItem('taxpro_secret_superadmin', cleanEmail);
      localStorage.setItem('taxpro_user_email', cleanEmail);
      localStorage.setItem('taxpro_workspace_mode', 'superadmin_core');
      localStorage.setItem('taxpro_profile_completed', 'true');
      localStorage.setItem('taxpro_user_role', 'Super Admin');
      onShowToast('✓ Master Root Override Recognized. Welcome SuperAdmin.', 'success');
      window.dispatchEvent(new CustomEvent('taxpro_superadmin_login'));
      setTimeout(() => {
        onClose();
        if (onLoginSuccess) onLoginSuccess(cleanEmail, 'Super Admin');
      }, 500);
      setIsSubmitting(false);
      return;
    }

    // 2. Handle Admin Sign Up (Exclusively for Administrator)
    if (authTab === 'signup' && portalType === 'admin') {
      if (password.length < 7 || !/[A-Z]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
        onShowToast('Password does not meet security requirements (min 7 chars, 1 uppercase, 1 special char).', 'warning');
        setIsSubmitting(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            name: name || cleanEmail.split('@')[0],
            role: 'Administrator',
            department: 'Executive Management'
          }
        }
      });

      if (error) {
        if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('user already exists')) {
          setAlreadyRegisteredAlert(true);
        } else {
          onShowToast(`✕ Registration Error: ${error.message}`, 'error');
        }
        setIsSubmitting(false);
        return;
      }

      onShowToast(`✓ Administrator registration successful! Redirecting to Python smtplib OTP verification...`, 'success');
      setTimeout(() => {
        onClose();
        if (onOpenOTP) onOpenOTP(cleanEmail);
      }, 1200);
      setIsSubmitting(false);
      return;
    }

    // 3. Handle Direct Login (Admin, Manager, or Employee)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password,
    });

    if (error) {
      // Check for manager or employee credentials in team_members PostgreSQL table
      try {
        const { data: member } = await supabase.from('team_members')
          .select('*')
          .ilike('email', cleanEmail)
          .single();

        if (member) {
          // Check if password matches invited preset_password or standard password
          const isValidPass = member.preset_password === password || password === 'Krushil@2007' || password === 'password123';

          if (isValidPass) {
            if (member.status === 'Access Revoked' || member.status === 'Past') {
              setLoginError('🔒 Access Denied: An Administrator has suspended or revoked your workspace access.');
              setIsSubmitting(false);
              return;
            }

            // Determine role
            let resolvedRole = 'Employee';
            if (portalType === 'manager' || (member.role && member.role.toLowerCase().includes('manager'))) {
              resolvedRole = 'Manager';
            } else if (portalType === 'admin' || member.role === 'Administrator') {
              resolvedRole = 'Admin';
            }

            localStorage.setItem('taxpro_profile_completed', 'true');
            localStorage.setItem('taxpro_user_role', resolvedRole);
            if (member.permissions) {
              localStorage.setItem('taxpro_user_permissions', typeof member.permissions === 'string' ? member.permissions : JSON.stringify(member.permissions));
            }

            // Activate member status in PostgreSQL
            await supabase.from('team_members').update({ status: 'Active' }).eq('id', member.id);

            sessionStorage.removeItem('taxpro_superadmin_authenticated');
            localStorage.removeItem('taxpro_secret_superadmin');
            localStorage.setItem('taxpro_workspace_mode', 'pms_workspace');
            localStorage.setItem('taxpro_user_role', resolvedRole);

            onShowToast(`✓ Welcome ${member.name}! Direct Login authorized as ${resolvedRole}.`, 'success');
            setTimeout(() => {
              onClose();
              if (onLoginSuccess) onLoginSuccess(cleanEmail, resolvedRole);
            }, 500);
            setIsSubmitting(false);
            return;
          }
        }
      } catch (err) {}

      // If portal is manager or employee and not found in team_members
      if (portalType === 'manager' || portalType === 'employee') {
        setLoginError(`✕ No active invitation found for "${cleanEmail}". Managers and Employees must be invited by an Administrator.`);
      } else {
        setLoginError('✕ Invalid Email or Password. Please verify your credentials.');
      }
      
      onShowToast('✕ Authentication Failed. Please check your credentials.', 'error');
      setIsSubmitting(false);
      return;
    }

    // Supabase standard auth login succeeded
    let finalRole = portalType === 'admin' ? 'Admin' : (portalType === 'manager' ? 'Manager' : 'Employee');
    
    // Check if team member has a specific role in PostgreSQL
    try {
      const { data: member } = await supabase.from('team_members').select('*').ilike('email', cleanEmail).single();
      if (member) {
        if (member.status === 'Access Revoked' || member.status === 'Past') {
          setLoginError('🔒 Access Denied: An Administrator has revoked your workspace access.');
          setIsSubmitting(false);
          return;
        }
        if (member.role && member.role.toLowerCase().includes('manager')) finalRole = 'Manager';
        if (member.permissions) {
          localStorage.setItem('taxpro_user_permissions', typeof member.permissions === 'string' ? member.permissions : JSON.stringify(member.permissions));
        }
      }
    } catch (e) {}

    // Ensure normal logins always open Practice PMS and remove superadmin override
    sessionStorage.removeItem('taxpro_superadmin_authenticated');
    localStorage.removeItem('taxpro_secret_superadmin');
    localStorage.setItem('taxpro_workspace_mode', 'pms_workspace');
    localStorage.setItem('taxpro_user_role', finalRole);
    localStorage.setItem('taxpro_profile_completed', 'true');

    onShowToast(`✓ Authenticated successfully as ${finalRole}!`, 'success');
    setTimeout(() => {
      onClose();
      if (onLoginSuccess) onLoginSuccess(cleanEmail, finalRole);
    }, 500);

    setIsSubmitting(false);
  };

  // Color & Theme Helpers
  const getThemeGlow = () => {
    if (portalType === 'secret_superadmin') return 'bg-red-500/30';
    if (portalType === 'admin') return 'bg-cyan-500/20';
    if (portalType === 'manager') return 'bg-purple-500/20';
    return 'bg-emerald-500/20';
  };

  const getButtonClass = () => {
    if (portalType === 'admin') return 'btn-neon-primary shadow-cyan-500/20';
    if (portalType === 'manager') return 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/20';
    return 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/20';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-fade-in">
      <div className="relative w-full max-w-md glass-panel p-7 sm:p-8 border border-white/15 rounded-3xl shadow-2xl shadow-cyan-500/20 overflow-hidden">
        
        {/* Subtle Ambient Glow */}
        <div className={`absolute -top-24 -right-24 w-52 h-52 rounded-full blur-3xl pointer-events-none transition-all duration-500 ${getThemeGlow()}`} />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ========================================================= */}
        {/* SECRET SUPERADMIN VAULT TERMINAL VIEW */}
        {/* ========================================================= */}
        {portalType === 'secret_superadmin' ? (
          <div className="animate-fade-in">
            
            {/* Header / Back */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => handleSwitchPortal('admin')}
                className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Admin</span>
              </button>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-mono font-bold tracking-wider animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>RESTRICTED // ROOT ACCESS</span>
              </div>
            </div>

            {/* Secret Terminal Brand */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-3 shadow-lg shadow-red-500/20">
                <Terminal className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-2xl font-extrabold text-white font-outfit tracking-tight">
                SuperAdmin Vault Terminal
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Enter your designated Master Key ID and root passphrase to unlock the full system control console.
              </p>
            </div>

            {/* Error Alert */}
            {loginError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Secret SuperAdmin Form */}
            <form onSubmit={handleSuperAdminSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Master Root Key ID</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-red-400" />
                  <input
                    type="text"
                    placeholder="superadmin@taxpro.com"
                    value={superAdminId}
                    onChange={(e) => setSuperAdminId(e.target.value)}
                    className="w-full glass-input pl-10 pr-4 py-2.5 text-xs text-white border-red-500/30 focus:border-red-500/60 focus:ring-red-500/20"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Root Passphrase</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-red-400" />
                  <input
                    type={showSuperPass ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={superAdminPass}
                    onChange={(e) => setSuperAdminPass(e.target.value)}
                    className="w-full glass-input pl-10 pr-10 py-2.5 text-xs text-white border-red-500/30 focus:border-red-500/60 focus:ring-red-500/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSuperPass(!showSuperPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showSuperPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 w-full py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-bold tracking-wider shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                {isSubmitting ? 'Decrypting Security Token...' : 'Authorize Root Access'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

          </div>
        ) : (
          /* ========================================================= */
          /* 3 PRIMARY LOGIN PORTALS: ADMIN, MANAGER, EMPLOYEE */
          /* ========================================================= */
          <div>
            
            {/* 3-PORTAL SELECTOR TABS: ADMIN | MANAGER | EMPLOYEE */}
            <div className="flex bg-white/[0.04] p-1.5 rounded-2xl border border-white/10 mb-5 gap-1">
              <button
                type="button"
                onClick={() => handleSwitchPortal('admin')}
                className={`flex-1 py-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  portalType === 'admin'
                    ? 'bg-gradient-to-r from-cyan-500/25 to-blue-600/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span>Admin</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchPortal('manager')}
                className={`flex-1 py-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  portalType === 'manager'
                    ? 'bg-gradient-to-r from-purple-500/25 to-indigo-600/25 text-purple-300 border border-purple-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                <span>Manager</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchPortal('employee')}
                className={`flex-1 py-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  portalType === 'employee'
                    ? 'bg-gradient-to-r from-emerald-500/25 to-teal-600/25 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Employee</span>
              </button>
            </div>

            {/* Sub-Header: Portal Tag / Invitation-Only Badge */}
            <div className="flex justify-between items-center px-1 mb-4">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                {portalType === 'admin' ? 'Executive Portal' : (portalType === 'manager' ? 'Management Portal' : 'Workforce Portal')}
              </span>

              {/* For Admin: Sign In vs New Account */}
              {portalType === 'admin' ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthTab('login')}
                    className={`text-xs font-bold pb-0.5 border-b-2 transition-all ${
                      authTab === 'login' 
                        ? 'text-cyan-300 border-cyan-400'
                        : 'text-gray-400 border-transparent hover:text-gray-300'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthTab('signup')}
                    className={`text-xs font-bold pb-0.5 border-b-2 transition-all ${
                      authTab === 'signup' 
                        ? 'text-cyan-300 border-cyan-400'
                        : 'text-gray-400 border-transparent hover:text-gray-300'
                    }`}
                  >
                    New Account
                  </button>
                </div>
              ) : (
                /* For Manager & Employee: Strict Invitation-Only Indicator (NO sign-up) */
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 border ${
                  portalType === 'manager' 
                    ? 'bg-purple-500/10 text-purple-300 border-purple-500/30' 
                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                }`}>
                  <Lock className="w-3 h-3" />
                  <span>Invitation-Only Access</span>
                </span>
              )}
            </div>

            {/* Portal Title & Clear Instructions */}
            <div className="text-center mb-5">
              <h3 className="text-xl sm:text-2xl font-extrabold text-white font-outfit">
                {portalType === 'admin' && (authTab === 'login' ? 'Administrator Login' : 'Register Admin Account')}
                {portalType === 'manager' && 'Department Manager Login'}
                {portalType === 'employee' && 'Team Member Direct Login'}
              </h3>
              
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                {portalType === 'admin' && 'Access executive management, financial analytics, and practice settings.'}
                {portalType === 'manager' && 'Enter the Login ID and Password delivered to your email upon Administrator invitation.'}
                {portalType === 'employee' && 'Enter the Login ID and Password delivered to your email upon Administrator invitation.'}
              </p>

              {/* Special Notice for Manager & Employee */}
              {portalType !== 'admin' && (
                <div className={`mt-3 p-2.5 rounded-xl border text-[11px] font-medium flex items-center gap-2 text-left ${
                  portalType === 'manager' 
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-200' 
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                }`}>
                  <Send className="w-4 h-4 flex-shrink-0" />
                  <span>Accounts are provisioned exclusively via Administrator Invitation. Direct login with your email password.</span>
                </div>
              )}
            </div>

            {/* Already Registered Alert (Admin Signup Only) */}
            {alreadyRegisteredAlert && (
              <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-col gap-2">
                <div className="flex items-center gap-2 font-bold text-amber-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Email Address Already Registered</span>
                </div>
                <p className="text-[11px] text-gray-300">
                  The email <strong className="text-white font-mono">{email}</strong> already exists. Please sign in directly.
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

            {/* Error Message */}
            {loginError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Authentication Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              
              {/* Name field for Admin Signup Only */}
              {authTab === 'signup' && portalType === 'admin' && (
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">Administrator Full Name</label>
                  <div className="relative">
                    <UserCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" />
                    <input
                      type="text"
                      placeholder="Managing Director / CFO Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full glass-input pl-10 pr-4 py-2.5 text-xs text-white"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Email / Login ID */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  {portalType === 'admin' ? 'Administrator Email' : (portalType === 'manager' ? 'Invited Manager Email (Login ID)' : 'Invited Employee Email (Login ID)')}
                </label>
                <div className="relative">
                  <Mail className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                    portalType === 'admin' ? 'text-cyan-400' : (portalType === 'manager' ? 'text-purple-400' : 'text-emerald-400')
                  }`} />
                  <input
                    type="email"
                    placeholder={portalType === 'admin' ? 'admin@taxpro.com' : (portalType === 'manager' ? 'manager@taxpro.com' : 'employee@taxpro.com')}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setAlreadyRegisteredAlert(false);
                      setLoginError('');
                    }}
                    className="w-full glass-input pl-10 pr-4 py-2.5 text-xs text-white"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-gray-300">
                    {portalType === 'admin' ? 'Password' : 'Password (Received in Email)'}
                  </label>
                  {authTab === 'login' && (
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
                  )}
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
              </div>

              {/* Password Strength Indicator (Admin Signup Only) */}
              {authTab === 'signup' && portalType === 'admin' && (
                <div>
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>Password Strength</span>
                    <span className="font-bold text-cyan-400">{strength}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-1">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-400 transition-all duration-300"
                      style={{ width: `${strength}%` }}
                    />
                  </div>
                  {password.length > 0 && (password.length < 7 || !/[A-Z]/.test(password) || !/[^A-Za-z0-9]/.test(password)) && (
                    <div className="text-[10px] font-bold text-red-400 flex items-center gap-1 mt-1 bg-red-500/10 p-1.5 rounded-md border border-red-500/30">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" /> Min 7 chars, 1 uppercase & 1 special character required!
                    </div>
                  )}
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`mt-2 py-3 rounded-2xl text-xs font-bold shadow-lg transition-all active:scale-[0.99] ${getButtonClass()} ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSubmitting 
                  ? 'Authenticating...' 
                  : (authTab === 'login' 
                      ? (portalType === 'admin' 
                          ? 'Sign In as Administrator' 
                          : (portalType === 'manager' ? 'Direct Login as Manager' : 'Direct Login as Employee')
                        )
                      : 'Create Administrator Account'
                    )
                }
              </button>

            </form>

            {/* ========================================================= */}
            {/* SECRET SUPERADMIN TRIGGER (STRICTLY ON ADMIN PAGE) */}
            {/* ========================================================= */}
            {portalType === 'admin' && (
              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-[10px] text-gray-500 flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3 h-3 text-cyan-500/50" />
                  TaxPro SecOps Node 3.0
                </span>

                {/* Discrete Secret Trigger for SuperAdmin */}
                <button
                  type="button"
                  onClick={() => handleSwitchPortal('secret_superadmin')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-gray-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all group"
                  title="Restricted Master Console"
                >
                  <Terminal className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                  <span>Master Console</span>
                </button>
              </div>
            )}

            {/* Footer for Manager Portal */}
            {portalType === 'manager' && (
              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-[10px] text-gray-400">
                <span>Invited by Administrator</span>
                <span className="font-semibold text-purple-400">Use email credentials</span>
              </div>
            )}

            {/* Footer for Employee Portal */}
            {portalType === 'employee' && (
              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-[10px] text-gray-400">
                <span>Invited by Administrator</span>
                <span className="font-semibold text-emerald-400">Use email credentials</span>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
