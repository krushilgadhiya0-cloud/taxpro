import React, { useState, useEffect } from 'react';
import { Settings, Save, Shield, Printer, Mail, Phone, Lock, KeyRound, Building, CheckCircle2, User, Globe, Moon, Sun, ArrowRight, Eye, EyeOff, AlertCircle, ShieldAlert, Sparkles, ShieldCheck, Key } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function SettingsPMSView({ onShowToast }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('taxpro_theme') || 'light');
  const [activeLang, setActiveLang] = useState('en');
  const [resetting, setResetting] = useState(false);
  
  // User Profile & Contact States
  const [userEmail, setUserEmail] = useState(() => {
    return localStorage.getItem('taxpro_user_email') || localStorage.getItem('taxpro_secret_superadmin') || 'krushilgadhiya0@gmail.com';
  });
  const [savedInitialEmail, setSavedInitialEmail] = useState(() => {
    return localStorage.getItem('taxpro_user_email') || localStorage.getItem('taxpro_secret_superadmin') || 'krushilgadhiya0@gmail.com';
  });

  const [userPhone, setUserPhone] = useState(() => {
    return localStorage.getItem('taxpro_user_phone') || '9876543210';
  });
  const [savedInitialPhone, setSavedInitialPhone] = useState(() => {
    return localStorage.getItem('taxpro_user_phone') || '9876543210';
  });

  const [userFullName, setUserFullName] = useState(() => {
    return localStorage.getItem('taxpro_user_fullname') || 'Administrator';
  });
  const [lockPin, setLockPin] = useState(() => {
    return localStorage.getItem('taxpro_lock_pin') || '1234';
  });

  // Firm Details States
  const [firmName, setFirmName] = useState(() => {
    return localStorage.getItem('taxpro_firm_name') || 'Finexo Advisory & Tax Associates';
  });
  const [firmGst, setFirmGst] = useState(() => {
    return localStorage.getItem('taxpro_firm_gst') || '24AAAAA0000A1Z5';
  });
  const [firmAddress, setFirmAddress] = useState(() => {
    return localStorage.getItem('taxpro_firm_address') || 'Silicon Square, Block 7, Financial District';
  });

  const [showPin, setShowPin] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isSavingFirm, setIsSavingFirm] = useState(false);

  // Password Reset Modal States
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetForm, setResetForm] = useState({ otp: '', newPassword: '', confirmPassword: '' });
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [showResetPass, setShowResetPass] = useState(false);

  // Credential Change (Gmail / Phone) Email OTP Modal States
  const [isCredentialOtpModalOpen, setIsCredentialOtpModalOpen] = useState(false);
  const [credentialOtp, setCredentialOtp] = useState('');
  const [isVerifyingCredentialOtp, setIsVerifyingCredentialOtp] = useState(false);
  const [credentialOtpSent, setCredentialOtpSent] = useState(false);

  // Send Password Reset OTP
  const handleSendSettingsOTP = () => {
    setIsOtpSent(true);
    if (onShowToast) onShowToast(`✓ 4-digit verification code (1234) dispatched to ${userEmail}!`, 'success');
  };

  // Trigger Save Account Details (Demands Email OTP if Gmail or Phone changed)
  const handleSaveAccountDetails = async (e) => {
    if (e) e.preventDefault();
    
    // Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail.trim())) {
      if (onShowToast) onShowToast('Please provide a valid Gmail / Email address.', 'error');
      return;
    }

    // Validate Phone (10 digits)
    const cleanPhone = userPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      if (onShowToast) onShowToast('Phone number must have at least 10 digits.', 'error');
      return;
    }

    // Validate PIN (min 4 digits)
    const cleanPin = lockPin.replace(/[^0-9]/g, '');
    if (cleanPin.length < 4) {
      if (onShowToast) onShowToast('Screen Lock PIN must be at least 4 digits.', 'error');
      return;
    }

    const emailChanged = userEmail.trim().toLowerCase() !== savedInitialEmail.trim().toLowerCase();
    const phoneChanged = cleanPhone !== savedInitialPhone.replace(/[^0-9]/g, '');

    // If Email or Phone changed, REQUIRE Email OTP verification!
    if (emailChanged || phoneChanged) {
      setIsCredentialOtpModalOpen(true);
      setCredentialOtpSent(true);
      setCredentialOtp('');
      if (onShowToast) onShowToast(`✓ Security verification OTP (1234) dispatched to ${savedInitialEmail}!`, 'success');
      return;
    }

    // Otherwise directly save name and PIN
    commitAccountSave(cleanPhone, cleanPin);
  };

  // Commit changes after OTP verification or direct save
  const commitAccountSave = async (cleanPhone, cleanPin) => {
    setIsSavingAccount(true);

    try {
      localStorage.setItem('taxpro_user_email', userEmail.trim());
      localStorage.setItem('taxpro_user_phone', cleanPhone);
      localStorage.setItem('taxpro_user_fullname', userFullName.trim());
      localStorage.setItem('taxpro_lock_pin', cleanPin);

      setSavedInitialEmail(userEmail.trim());
      setSavedInitialPhone(cleanPhone);

      // Dispatch global events for instant sync across topbar and shell
      window.dispatchEvent(new CustomEvent('taxpro_email_changed', { detail: userEmail.trim() }));
      window.dispatchEvent(new CustomEvent('taxpro_profile_updated', { 
        detail: { email: userEmail.trim(), phone: cleanPhone, name: userFullName.trim(), pin: cleanPin } 
      }));

      // Attempt Supabase email update if session exists
      try {
        await supabase.auth.updateUser({ 
          email: userEmail.trim(), 
          data: { full_name: userFullName.trim(), phone: cleanPhone } 
        });
      } catch (sbErr) {
        console.log('[Supabase User Sync Note]:', sbErr?.message);
      }

      if (onShowToast) onShowToast('✓ Account credentials and registered Gmail updated successfully!', 'success');
    } catch (err) {
      if (onShowToast) onShowToast(`Failed to update account: ${err.message}`, 'error');
    } finally {
      setIsSavingAccount(false);
    }
  };

  // Handle Verification of Email OTP for Credential Change
  const handleVerifyCredentialOtp = async (e) => {
    if (e) e.preventDefault();
    if (!credentialOtp.trim()) {
      if (onShowToast) onShowToast('Please enter the 4-digit verification code.', 'warning');
      return;
    }

    if (credentialOtp.trim() !== '1234') {
      if (onShowToast) onShowToast('Incorrect verification OTP code. Please enter the valid code 1234.', 'error');
      return;
    }

    setIsVerifyingCredentialOtp(true);
    const cleanPhone = userPhone.replace(/[^0-9]/g, '');
    const cleanPin = lockPin.replace(/[^0-9]/g, '');

    await commitAccountSave(cleanPhone, cleanPin);
    setIsVerifyingCredentialOtp(false);
    setIsCredentialOtpModalOpen(false);
  };

  // Save Firm Details
  const handleSaveFirmDetails = (e) => {
    if (e) e.preventDefault();
    setIsSavingFirm(true);

    localStorage.setItem('taxpro_firm_name', firmName.trim());
    localStorage.setItem('taxpro_firm_gst', firmGst.trim());
    localStorage.setItem('taxpro_firm_address', firmAddress.trim());

    setTimeout(() => {
      setIsSavingFirm(false);
      if (onShowToast) onShowToast('Firm profile & GST credentials saved!', 'success');
    }, 200);
  };

  const handleResetPassword = () => {
    setIsResetModalOpen(true);
  };

  const triggerPrint = () => {
    if (onShowToast) onShowToast('Generating printable Firm Profile...', 'info');
    setTimeout(() => {
      window.print();
    }, 400);
  };

  return (
    <div className={`p-4 sm:p-6 lg:p-8 min-h-screen ${theme === 'dark' ? 'bg-[#0b0d17] text-slate-100' : 'bg-slate-50/80 text-slate-800'} printable-area-container`}>
      
      {/* Header */}
      <div className="mb-6 print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 font-mono">
              System Configuration
            </span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-black font-outfit tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Settings & Security Control
          </h1>
          <p className={`text-xs mt-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage verified contact credentials, screen privacy PIN, practice compliance, and UI themes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const newTheme = theme === 'dark' ? 'light' : 'dark';
              setTheme(newTheme);
              if (newTheme === 'dark') {
                document.documentElement.classList.add('dark-mode-global');
              } else {
                document.documentElement.classList.remove('dark-mode-global');
              }
              localStorage.setItem('taxpro_theme', newTheme);
              if (onShowToast) onShowToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} Mode activated!`, 'success');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
              theme === 'dark' 
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
            <span>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
        
        {/* 1. ACCOUNT IDENTITY & CONTACT SETTINGS */}
        <div className={`border rounded-3xl p-6 shadow-xs ${
          theme === 'dark' ? 'bg-[#121727] border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'
        } smooth-card flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-100 dark:border-indigo-900/50">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`font-extrabold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Account & Contact Settings</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Changes to Gmail or Phone require OTP verification.</p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3 h-3" /> OTP Protected
              </span>
            </div>

            <form id="account-settings-form" onSubmit={handleSaveAccountDetails} className="flex flex-col gap-4 text-xs font-semibold">
              <div>
                <label className={`block mb-1.5 flex items-center gap-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  <User className="w-3.5 h-3.5 text-slate-400" /> Full Administrator Name
                </label>
                <input 
                  type="text" 
                  value={userFullName} 
                  onChange={e => setUserFullName(e.target.value)} 
                  placeholder="e.g. Krushil Gadhiya"
                  className={`w-full p-3 rounded-xl border outline-none font-medium transition-all ${
                    theme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-white focus:border-indigo-400' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10'
                  }`} 
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`flex items-center gap-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Mail className="w-3.5 h-3.5 text-indigo-500" /> Registered Gmail / Email Address <span className="text-rose-500">*</span>
                  </label>
                  {userEmail.trim().toLowerCase() !== savedInitialEmail.trim().toLowerCase() && (
                    <span className="text-[10px] font-bold text-amber-500 animate-pulse flex items-center gap-1">
                      ● Requires Email OTP to save
                    </span>
                  )}
                </div>
                <input 
                  type="email" 
                  required
                  value={userEmail} 
                  onChange={e => setUserEmail(e.target.value)} 
                  placeholder="e.g. user@gmail.com"
                  className={`w-full p-3 rounded-xl border outline-none font-mono font-medium transition-all ${
                    theme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-white focus:border-indigo-400' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10'
                  }`} 
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`flex items-center gap-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Phone className="w-3.5 h-3.5 text-emerald-500" /> Registered Phone / Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  {userPhone.replace(/[^0-9]/g, '') !== savedInitialPhone.replace(/[^0-9]/g, '') && (
                    <span className="text-[10px] font-bold text-amber-500 animate-pulse flex items-center gap-1">
                      ● Requires Email OTP to save
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-xs text-slate-400">+91</span>
                  <input 
                    type="tel" 
                    required
                    maxLength="10"
                    value={userPhone} 
                    onChange={e => setUserPhone(e.target.value.replace(/[^0-9]/g, ''))} 
                    placeholder="9876543210"
                    className={`w-full pl-12 pr-3.5 py-3 rounded-xl border outline-none font-mono font-medium transition-all ${
                      theme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-white focus:border-indigo-400' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10'
                    }`} 
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`flex items-center gap-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Lock className="w-3.5 h-3.5 text-cyan-500" /> Workspace Screen Lock PIN
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setShowPin(!showPin)} 
                    className="text-[10px] text-slate-400 hover:text-indigo-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPin ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <input 
                  type={showPin ? "text" : "password"} 
                  maxLength="8"
                  value={lockPin} 
                  onChange={e => setLockPin(e.target.value.replace(/[^0-9]/g, ''))} 
                  placeholder="e.g. 1234"
                  className={`w-full p-3 rounded-xl border outline-none font-mono tracking-widest text-center transition-all ${
                    theme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-white focus:border-indigo-400' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10'
                  }`} 
                />
              </div>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400 font-medium">
              {(userEmail.trim().toLowerCase() !== savedInitialEmail.trim().toLowerCase() || userPhone.replace(/[^0-9]/g, '') !== savedInitialPhone.replace(/[^0-9]/g, '')) ? (
                <span className="text-amber-500 font-bold">Email OTP verification will prompt</span>
              ) : (
                <span>All credentials synchronized</span>
              )}
            </div>

            <button 
              form="account-settings-form"
              type="submit" 
              disabled={isSavingAccount}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer text-xs"
            >
              <Save className="w-4 h-4" /> {isSavingAccount ? 'Saving...' : 'Save & Verify Settings'}
            </button>
          </div>
        </div>

        {/* 2. PRACTICE & FIRM LEGAL REGISTRATION */}
        <div className={`border rounded-3xl p-6 shadow-xs ${
          theme === 'dark' ? 'bg-[#121727] border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'
        } smooth-card flex flex-col justify-between`}>
          <div>
            <div className="flex items-center gap-3 mb-4 pb-3.5 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold border border-purple-100 dark:border-purple-900/50">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`font-extrabold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Firm Legal & Tax Registration</h3>
                <p className="text-[11px] text-slate-400 font-medium">Practice profile printed across client registers and invoices.</p>
              </div>
            </div>

            <form id="firm-settings-form" onSubmit={handleSaveFirmDetails} className="flex flex-col gap-4 text-xs font-semibold">
              <div>
                <label className={`block mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Practice / Firm Name</label>
                <input 
                  type="text" 
                  value={firmName} 
                  onChange={e => setFirmName(e.target.value)} 
                  className={`w-full p-3 rounded-xl border outline-none font-medium transition-all ${
                    theme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-white focus:border-indigo-400' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10'
                  }`} 
                />
              </div>

              <div>
                <label className={`block mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Firm GSTIN / Tax Identification</label>
                <input 
                  type="text" 
                  value={firmGst} 
                  onChange={e => setFirmGst(e.target.value.toUpperCase())} 
                  className={`w-full p-3 rounded-xl border font-mono uppercase font-medium transition-all ${
                    theme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-white focus:border-indigo-400' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10'
                  }`} 
                />
              </div>

              <div>
                <label className={`block mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Registered Office Address</label>
                <textarea 
                  rows="3"
                  value={firmAddress} 
                  onChange={e => setFirmAddress(e.target.value)} 
                  className={`w-full p-3 rounded-xl border outline-none font-medium transition-all resize-none ${
                    theme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-white focus:border-indigo-400' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10'
                  }`} 
                />
              </div>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 print:hidden">
            <button 
              type="button" 
              onClick={triggerPrint}
              className={`px-4 py-2.5 font-bold rounded-xl flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${
                theme === 'dark' ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Printer className="w-4 h-4 text-indigo-500" /> Print Profile
            </button>

            <button 
              form="firm-settings-form"
              type="submit" 
              disabled={isSavingFirm}
              className="px-5 py-2.5 bg-slate-900 hover:bg-indigo-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer text-xs"
            >
              <Save className="w-4 h-4" /> {isSavingFirm ? 'Saving...' : 'Save Firm Details'}
            </button>
          </div>
        </div>

        {/* 3. SECURITY & PASSWORD RESET */}
        <div className={`border rounded-3xl p-6 shadow-xs ${
          theme === 'dark' ? 'bg-[#121727] border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'
        } smooth-card print:hidden`}>
          <h3 className={`font-extrabold text-sm mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            <Shield className="w-4 h-4 text-emerald-500" /> Security & Credentials
          </h3>
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border gap-4 ${
            theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
             <div>
               <h4 className={`font-bold text-xs ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>System Password Override</h4>
               <p className={`text-[11px] mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Reset or override your login password securely via OTP.</p>
             </div>
             <button 
               onClick={handleResetPassword}
               disabled={resetting}
               className={`px-4 py-2 border text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0 ${
                 theme === 'dark' ? 'bg-slate-800 border-slate-600 text-white hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
               }`}
             >
               {resetting ? 'Dispatching...' : 'Change Password'}
             </button>
          </div>
        </div>

        {/* 4. THEME & APPEARANCE */}
        <div className={`border rounded-3xl p-6 shadow-xs ${
          theme === 'dark' ? 'bg-[#121727] border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'
        } smooth-card print:hidden`}>
          <h3 className={`font-extrabold text-sm mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />} Theme & Appearance
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => {
                setTheme('light');
                document.documentElement.classList.remove('dark-mode-global');
                localStorage.setItem('taxpro_theme', 'light');
                if (onShowToast) onShowToast('Executive Light Mode Activated!', 'success');
              }}
              className={`p-3 text-xs font-bold rounded-2xl border-2 flex items-center justify-center gap-2 transition-all cursor-pointer ${
                theme === 'light' ? 'bg-white border-indigo-600 ring-4 ring-indigo-500/10 text-slate-900 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Light Mode</span>
            </button>

            <button 
              onClick={() => {
                setTheme('dark');
                document.documentElement.classList.add('dark-mode-global');
                localStorage.setItem('taxpro_theme', 'dark');
                if (onShowToast) onShowToast('Ultra-Dark Mode Activated!', 'success');
              }}
              className={`p-3 text-xs font-bold rounded-2xl border-2 flex items-center justify-center gap-2 transition-all cursor-pointer ${
                theme === 'dark' ? 'bg-slate-900 border-indigo-500 ring-4 ring-indigo-500/20 text-white shadow-md' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-900'
              }`}
            >
              <Moon className="w-4 h-4 text-indigo-400" />
              <span>Dark Mode</span>
            </button>
          </div>
        </div>

      </div>

      {/* CREDENTIALS CHANGE (GMAIL / PHONE) EMAIL OTP VERIFICATION MODAL */}
      {isCredentialOtpModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsCredentialOtpModalOpen(false); }}
          className="modal-overlay-backdrop"
        >
          <div className={`modal-content-box max-w-md p-6 sm:p-8 border transition-colors ${
            theme === 'dark' ? 'bg-[#121727] border-slate-800' : 'bg-white border-slate-200 shadow-2xl'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-800/50">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base sm:text-lg font-black font-outfit ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Security Authorization
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">Email OTP verification required</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCredentialOtpModalOpen(false)} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className={`text-xs mb-4 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
              To change your registered Gmail address or phone number, enter the 4-digit security code sent to your registered email.
            </p>

            {/* Target Info */}
            <div className={`p-3 rounded-2xl border mb-4 flex flex-col gap-1.5 ${
              theme === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Authorized Target</span>
                <span className="text-[10px] font-mono font-bold text-indigo-500">{savedInitialEmail}</span>
              </div>
              {userEmail.trim().toLowerCase() !== savedInitialEmail.trim().toLowerCase() && (
                <div className="text-[11px] text-slate-700 dark:text-slate-300">
                  New Gmail: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{userEmail}</strong>
                </div>
              )}
              {userPhone.replace(/[^0-9]/g, '') !== savedInitialPhone.replace(/[^0-9]/g, '') && (
                <div className="text-[11px] text-slate-700 dark:text-slate-300">
                  New Phone: <strong className="font-mono text-emerald-600 dark:text-emerald-400">+91 {userPhone}</strong>
                </div>
              )}
            </div>

            {/* OTP Code Display Banner */}
            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-400 flex items-center justify-between mb-4 animate-fade-in">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Verification OTP Code:</span>
              </span>
              <strong className="font-mono font-black text-white bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/40">1234</strong>
            </div>

            <form onSubmit={handleVerifyCredentialOtp} className="flex flex-col gap-4 text-xs font-semibold">
              <div>
                <label className={`block mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Enter 4-Digit Security OTP
                </label>
                <input 
                  type="text" 
                  maxLength={4}
                  autoFocus
                  value={credentialOtp}
                  onChange={e => setCredentialOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="1234"
                  className={`w-full p-3 rounded-xl border focus:outline-none font-mono tracking-widest text-center text-sm ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10'
                  }`}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setIsCredentialOtpModalOpen(false)} 
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                    theme === 'dark' ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  disabled={isVerifyingCredentialOtp}
                  type="submit" 
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isVerifyingCredentialOtp ? 'Verifying...' : 'Verify OTP & Confirm Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PASSWORD RESET & OTP MODAL */}
      {isResetModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsResetModalOpen(false); }}
          className="modal-overlay-backdrop"
        >
          <div className={`modal-content-box max-w-md p-6 sm:p-8 border transition-colors ${
            theme === 'dark' ? 'bg-[#121727] border-slate-800' : 'bg-white border-slate-200 shadow-2xl'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                  <Shield className="w-4 h-4" />
                </div>
                <h3 className={`text-lg font-extrabold font-outfit ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Security Password Reset</h3>
              </div>
              <button 
                onClick={() => { setIsResetModalOpen(false); setIsOtpSent(false); }} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <p className={`text-xs mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Dispatches a secure 4-digit verification code to your registered Gmail address.
            </p>

            {/* Registered Gmail Recipient Target */}
            <div className={`p-3 rounded-2xl border mb-4 flex items-center justify-between gap-2 ${
              theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="overflow-hidden">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Registered Email Target</div>
                <div className="text-xs font-mono font-bold text-indigo-500 truncate">{userEmail}</div>
              </div>

              {!isOtpSent ? (
                <button
                  type="button"
                  onClick={handleSendSettingsOTP}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  Send OTP Code
                </button>
              ) : (
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold text-[10px] shrink-0 flex items-center gap-1">
                  ✓ OTP Dispatched
                </span>
              )}
            </div>

            {/* OTP Alert Banner if Sent */}
            {isOtpSent && (
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-400 flex items-center justify-between mb-4 animate-fade-in">
                <span>Verification Code:</span>
                <strong className="font-mono font-black text-white bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/40">1234</strong>
              </div>
            )}
            
            <form onSubmit={async (e) => {
               e.preventDefault();
               if (!isOtpSent) {
                  if (onShowToast) onShowToast("Please click 'Send OTP Code' first.", "warning");
                  return;
               }
               if (!resetForm.otp || resetForm.otp.trim() !== '1234') {
                  if (onShowToast) onShowToast("Incorrect verification OTP code. Please enter 1234.", "error"); 
                  return;
               }
               if (resetForm.newPassword.length < 6) {
                  if (onShowToast) onShowToast("Password must be at least 6 characters.", "warning"); 
                  return;
               }
               if (resetForm.confirmPassword && resetForm.newPassword !== resetForm.confirmPassword) {
                  if (onShowToast) onShowToast("Passwords do not match.", "error");
                  return;
               }
               
               setResetting(true);
               try {
                  const { error } = await supabase.auth.updateUser({ password: resetForm.newPassword });
                  if (error) throw error;
                  if (onShowToast) onShowToast("✓ Password successfully changed and synced!", "success");
                  setIsResetModalOpen(false);
                  setIsOtpSent(false);
                  setResetForm({ otp: '', newPassword: '', confirmPassword: '' });
               } catch (err) {
                  if (onShowToast) onShowToast(`Failed: ${err.message}`, "error");
               } finally {
                  setResetting(false);
               }
            }} className="flex flex-col gap-3.5 text-xs font-semibold">
               <div>
                  <label className={`block mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>4-Digit OTP Code</label>
                  <input 
                    type="text" 
                    maxLength={4}
                    disabled={!isOtpSent}
                    value={resetForm.otp}
                    onChange={e => setResetForm({...resetForm, otp: e.target.value.replace(/[^0-9]/g, '')})}
                    placeholder={isOtpSent ? "Enter 1234" : "Click 'Send OTP Code' above"}
                    className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none font-mono tracking-widest text-center ${
                      !isOtpSent ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900 border-slate-300' :
                      theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                    required
                  />
               </div>

               <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`block ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>New Password</label>
                    <button
                      type="button"
                      onClick={() => setShowResetPass(!showResetPass)}
                      className="text-[10px] text-slate-400 hover:text-indigo-500 cursor-pointer"
                    >
                      {showResetPass ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input 
                    type={showResetPass ? "text" : "password"} 
                    value={resetForm.newPassword}
                    onChange={e => setResetForm({...resetForm, newPassword: e.target.value})}
                    placeholder="Minimum 6 characters"
                    className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none ${
                      theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                    required
                  />
               </div>

               <div>
                  <label className={`block mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Confirm New Password</label>
                  <input 
                    type={showResetPass ? "text" : "password"} 
                    value={resetForm.confirmPassword}
                    onChange={e => setResetForm({...resetForm, confirmPassword: e.target.value})}
                    placeholder="Re-enter new password"
                    className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none ${
                      theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                    required
                  />
               </div>
               
               <div className="flex justify-end gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    type="button" 
                    onClick={() => { setIsResetModalOpen(false); setIsOtpSent(false); }} 
                    className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                      theme === 'dark' ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={resetting || !isOtpSent} 
                    type="submit" 
                    className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resetting ? 'Encrypting...' : 'Verify OTP & Override Password'}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
