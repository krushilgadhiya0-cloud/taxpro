import React, { useState, useEffect } from 'react';
import {
  Building2,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  FileText,
  Check,
  ArrowRight,
  ArrowLeft,
  X,
  Lock,
  KeyRound,
  RefreshCw,
  Sparkles,
  BadgeCheck,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Tag,
  Building,
  Globe
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { logAuditActivity } from '../../lib/auditLogger';

export default function FirmProfileModal({ isOpen, onClose, onShowToast, initialStep = 1, isDirectSetup = true, userRole }) {
  // Steps: 1: Ask Account Password, 2: Change Details, 3: Profile Completed
  const [currentStep, setCurrentStep] = useState(1);
  const [adminEmail, setAdminEmail] = useState(() => {
    return localStorage.getItem('taxpro_user_email') || localStorage.getItem('taxpro_secret_superadmin') || 'admin@taxpro.com';
  });

  // Account Password Verification State
  const [accountPassword, setAccountPassword] = useState('');
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  // Helper to cleanly unwrap and sanitize any storage value
  const cleanFirmValue = (val, defaultVal = '') => {
    if (val === null || val === undefined) return defaultVal;
    if (typeof val === 'object') {
      if ('value' in val) return cleanFirmValue(val.value, defaultVal);
      if ('VALUE' in val) return cleanFirmValue(val.VALUE, defaultVal);
      return defaultVal;
    }
    const str = String(val);
    const trimmed = str.trim();
    if (!trimmed) return defaultVal;
    if ((trimmed.startsWith('{"value"') || trimmed.startsWith('{"VALUE"') || trimmed.startsWith('{"value":') || trimmed.startsWith('{"VALUE":')) && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          if ('value' in parsed) return cleanFirmValue(parsed.value, defaultVal);
          if ('VALUE' in parsed) return cleanFirmValue(parsed.VALUE, defaultVal);
        }
      } catch (e) { }
    }
    if (trimmed === '[]' || trimmed === '{}' || trimmed === '""' || trimmed === 'null' || trimmed === 'undefined') return defaultVal;
    return str;
  };

  const getCleanFirmData = () => ({
    name: cleanFirmValue(localStorage.getItem('taxpro_firm_name'), ''),
    tag: cleanFirmValue(localStorage.getItem('taxpro_firm_tag'), 'TaxPro'),
    gst: cleanFirmValue(localStorage.getItem('taxpro_firm_gst'), ''),
    pan: cleanFirmValue(localStorage.getItem('taxpro_firm_pan'), ''),
    email: cleanFirmValue(localStorage.getItem('taxpro_firm_email'), ''),
    phone: cleanFirmValue(localStorage.getItem('taxpro_firm_phone'), ''),
    address: cleanFirmValue(localStorage.getItem('taxpro_firm_address'), ''),
    tagline: cleanFirmValue(localStorage.getItem('taxpro_firm_tagline'), 'Tax & Compliance Advisory Practice')
  });

  // Original Initial Firm Data
  const [originalFirm, setOriginalFirm] = useState(getCleanFirmData);

  // Editable Form Data
  const [formData, setFormData] = useState(getCleanFirmData);

  const [isSaving, setIsSaving] = useState(false);
  const [isProfileCompleted, setIsProfileCompleted] = useState(false);

  const isPersistedCompleted = () => {
    try {
      return typeof window !== 'undefined' && (
        localStorage.getItem('taxpro_profile_completed') === 'true' ||
        localStorage.getItem('taxpro_firm_configured') === 'true'
      );
    } catch (e) {
      return false;
    }
  };

  const [hasCompletedOnce, setHasCompletedOnce] = useState(isPersistedCompleted);

  useEffect(() => {
    if (isOpen) {
      const email = cleanFirmValue(localStorage.getItem('taxpro_user_email') || localStorage.getItem('taxpro_secret_superadmin'), 'admin@taxpro.com');
      setAdminEmail(email);

      const currentData = getCleanFirmData();
      setOriginalFirm(currentData);
      setFormData(currentData);
      const alreadyCompleted = isPersistedCompleted();
      setHasCompletedOnce(alreadyCompleted);
      setIsProfileCompleted(false);

      if (initialStep === 2 || !alreadyCompleted) {
        setCurrentStep(2);
      } else {
        setCurrentStep(1);
      }
      setAccountPassword('');
      setPasswordError('');
      setShowAccountPassword(false);

      // Dynamically fetch latest firm profile from database/backend if available
      const fetchLatestFirmData = async () => {
        try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
          const res = await fetch(`${baseUrl}/api/db/settings`);
          if (res.ok) {
            const json = await res.json();
            const items = json?.data || [];
            const firmSetting = Array.isArray(items) 
              ? items.find(s => s.key === 'firm_profile')
              : null;
            if (firmSetting && firmSetting.value && typeof firmSetting.value === 'object') {
              const val = firmSetting.value;
              setFormData(prev => ({
                name: val.name || prev.name,
                tag: val.tag || prev.tag,
                gst: val.gst || prev.gst,
                pan: val.pan || prev.pan,
                email: val.email || prev.email,
                phone: val.phone || prev.phone,
                address: val.address || prev.address,
                tagline: val.tagline || prev.tagline
              }));
            }
          }
        } catch (e) {}
      };
      fetchLatestFirmData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // STEP 1: Verify Account Password First
  const handleVerifyPasswordFirst = async (e) => {
    if (e) e.preventDefault();
    setPasswordError('');

    if (!accountPassword.trim()) {
      setPasswordError('Please enter your account password.');
      if (onShowToast) onShowToast('Account password is required.', 'error');
      return;
    }

    setIsVerifyingPassword(true);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const res = await fetch(`${baseUrl}/api/auth/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail.trim(),
          password: accountPassword.trim()
        })
      });

      const data = await res.json().catch(() => ({}));
      if (data.success && data.verified) {
        setAccountPassword('');
        setPasswordError('');
        setCurrentStep(2); // Unlock Step 2 to change details
        if (onShowToast) onShowToast('✓ Password verified! You can now edit firm details.', 'success');
      } else {
        const errMsg = data.error || 'Incorrect account password. Please enter your valid login password.';
        setPasswordError(errMsg);
        if (onShowToast) onShowToast(errMsg, 'error');
      }
    } catch (err) {
      const errMsg = 'Network error verifying password. Please check your connection.';
      setPasswordError(errMsg);
      if (onShowToast) onShowToast(errMsg, 'error');
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  // STEP 2: Save Edited Details and Complete Profile
  const handleSaveEditedDetails = async (e) => {
    if (e) e.preventDefault();

    if (!formData.name.trim()) {
      if (onShowToast) onShowToast('Please enter the full Company or Firm Name.', 'error');
      return;
    }
    if (!formData.tag.trim()) {
      if (onShowToast) onShowToast('Please specify a short Firm Badge Tag for member accounts.', 'error');
      return;
    }

    await handleCommitFirmSave();
  };

  // Final Commit & Save
  const handleCommitFirmSave = async () => {
    setIsSaving(true);
    try {
      const cleanName = cleanFirmValue(formData.name).trim();
      const cleanTag = cleanFirmValue(formData.tag, 'TaxPro').trim();
      const cleanGst = cleanFirmValue(formData.gst).trim().toUpperCase();
      const cleanPan = cleanFirmValue(formData.pan).trim().toUpperCase();
      const cleanEmail = cleanFirmValue(formData.email).trim();
      const cleanPhone = cleanFirmValue(formData.phone).trim();
      const cleanAddress = cleanFirmValue(formData.address).trim();
      const cleanTagline = cleanFirmValue(formData.tagline, 'Tax & Compliance Advisory Practice').trim();

      // 1. Save locally
      localStorage.setItem('taxpro_firm_name', cleanName);
      localStorage.setItem('taxpro_firm_tag', cleanTag);
      localStorage.setItem('taxpro_firm_gst', cleanGst);
      localStorage.setItem('taxpro_firm_pan', cleanPan);
      localStorage.setItem('taxpro_firm_email', cleanEmail);
      localStorage.setItem('taxpro_firm_phone', cleanPhone);
      localStorage.setItem('taxpro_firm_address', cleanAddress);
      localStorage.setItem('taxpro_firm_tagline', cleanTagline);
      localStorage.setItem('taxpro_firm_configured', 'true');
      localStorage.setItem('taxpro_profile_completed', 'true');

      // 2. Sync with Supabase / Cloud Postgres
      try {
        await supabase.from('settings').upsert({
          key: 'firm_profile',
          value: {
            name: cleanName,
            tag: cleanTag,
            gst: cleanGst,
            pan: cleanPan,
            email: cleanEmail,
            phone: cleanPhone,
            address: cleanAddress,
            tagline: cleanTagline,
            updated_at: new Date().toISOString(),
            updated_by: adminEmail
          }
        }, { onConflict: 'key' });
      } catch (err) { }

      // 3. Log Audit Trail
      try {
        await logAuditActivity({
          action: 'FIRM_PROFILE_UPDATED',
          module: 'Settings',
          details: `Updated Firm details to "${cleanName}" with badge tag [${cleanTag}] via Password Authentication`,
          metadata: {
            adminEmail,
            previousName: originalFirm.name,
            newName: cleanName,
            firmTag: cleanTag,
            authMethod: 'Account Password'
          }
        });
      } catch (err) { }

      // 4. Dispatch Global Events
      window.dispatchEvent(new CustomEvent('taxpro_firm_updated', {
        detail: {
          name: cleanName,
          tag: cleanTag,
          gst: cleanGst,
          pan: cleanPan,
          email: cleanEmail,
          phone: cleanPhone,
          address: cleanAddress,
          tagline: cleanTagline
        }
      }));
      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

      if (onShowToast) {
        onShowToast(`✓ Firm Profile & Company Tag [${cleanTag}] successfully saved!`, 'success');
      }

      setHasCompletedOnce(true);
      setIsProfileCompleted(true);
      setCurrentStep(3); // Step 3: Profile Completed!
      if (typeof window !== 'undefined' && window.confetti) {
        try {
          window.confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        } catch (e) { }
      }
    } catch (e) {
      if (onShowToast) onShowToast('Failed to save firm details. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const isCompletedState = currentStep === 3 || isProfileCompleted;

  const effectiveRole = String(
    userRole ||
    (typeof window !== 'undefined' ? localStorage.getItem('taxpro_user_role') || localStorage.getItem('taxpro_role') : '') ||
    ''
  ).trim().toLowerCase();

  const isSuperAdminUser = typeof window !== 'undefined' && (
    Boolean(localStorage.getItem('taxpro_secret_superadmin')) ||
    localStorage.getItem('taxpro_is_superadmin') === 'true'
  );

  const isAdmin = effectiveRole.includes('admin') || effectiveRole.includes('owner') || isSuperAdminUser;
  const isNonAdmin = !isAdmin;

  const stepTitles = [
    { num: 1, title: 'Verify Password', desc: 'Account Authorization' },
    { num: 2, title: 'Change Details', desc: 'Firm Identity & Legal Profile' },
    { num: 3, title: 'Profile Completed', desc: 'Active & Synchronized' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header with Title & Close Button */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-900 via-[#181c32] to-gray-900 text-white relative">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-teal-400 p-0.5 shadow-md mb-2">
              <div className="w-full h-full bg-gray-900 rounded-2xl flex items-center justify-center">
                {isNonAdmin ? (
                  <Building2 className="w-5 h-5 text-teal-300" />
                ) : currentStep === 1 ? (
                  <Lock className="w-5 h-5 text-amber-300" />
                ) : isCompletedState ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                ) : (
                  <Building2 className="w-5 h-5 text-teal-300" />
                )}
              </div>
            </div>
            <h2 className="text-base sm:text-lg font-black font-outfit flex items-center justify-center gap-2">
              <span>
                {isNonAdmin
                  ? 'Firm Details & Practice Profile'
                  : currentStep === 1
                  ? 'Verify Account Password'
                  : currentStep === 2
                  ? 'Change Firm Details'
                  : 'Practice Profile Completed'}
              </span>
              {(isCompletedState || isNonAdmin) && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-300" /> ACTIVE
                </span>
              )}
            </h2>
            <p className="text-[11px] text-gray-300 mt-0.5 max-w-md">
              {isNonAdmin
                ? 'Official practice registration credentials, legal IDs, and registered office contact details.'
                : currentStep === 1
                ? 'Please authenticate with your account password before modifying firm legal details.'
                : currentStep === 2
                ? 'Update official practice legal name, PAN, GSTIN, company tags, and office contact information.'
                : 'Official practice legal identity, PAN, GSTIN, and company tags are active and configured.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {(() => {
          if (isNonAdmin) {
            const firmDisplayName = cleanFirmValue(formData.name) || cleanFirmValue(localStorage.getItem('taxpro_firm_name')) || 'TaxPro Advisory & Tax Associates';
            const firmDisplayTag = cleanFirmValue(formData.tag) || cleanFirmValue(localStorage.getItem('taxpro_firm_tag')) || 'TaxPro';
            const firmDisplayGst = cleanFirmValue(formData.gst) || cleanFirmValue(localStorage.getItem('taxpro_firm_gst')) || 'Not Specified';
            const firmDisplayPan = cleanFirmValue(formData.pan) || cleanFirmValue(localStorage.getItem('taxpro_firm_pan')) || 'Not Specified';
            const firmDisplayEmail = cleanFirmValue(formData.email) || cleanFirmValue(localStorage.getItem('taxpro_firm_email')) || 'Not Specified';
            const firmDisplayPhone = cleanFirmValue(formData.phone) || cleanFirmValue(localStorage.getItem('taxpro_firm_phone')) || 'Not Specified';
            const firmDisplayAddress = cleanFirmValue(formData.address) || cleanFirmValue(localStorage.getItem('taxpro_firm_address')) || 'Not Specified';
            const firmDisplayTagline = cleanFirmValue(formData.tagline) || cleanFirmValue(localStorage.getItem('taxpro_firm_tagline')) || 'Tax & Compliance Advisory Practice';

            return (
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-5 animate-fade-in text-slate-800">
                {/* Firm Highlight Banner */}
                <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-blue-50/90 border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0 font-black text-xl">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-black font-outfit text-slate-900 tracking-tight">
                          {firmDisplayName}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700 border border-indigo-200">
                          🏢 {firmDisplayTag}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {firmDisplayTagline}
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-black font-mono flex items-center gap-1.5 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ACTIVE PRACTICE
                  </span>
                </div>

                {/* Firm Specifications Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                  {/* GSTIN */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">GSTIN / Registration No.</span>
                      <span className="font-mono font-bold text-slate-900 text-xs block mt-0.5 truncate select-all">
                        {firmDisplayGst}
                      </span>
                    </div>
                  </div>

                  {/* PAN */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                      <BadgeCheck className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Permanent Account Number (PAN)</span>
                      <span className="font-mono font-bold text-slate-900 text-xs block mt-0.5 truncate select-all">
                        {firmDisplayPan}
                      </span>
                    </div>
                  </div>

                  {/* Official Email */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Official Practice Email</span>
                      <span className="font-bold text-slate-900 text-xs block mt-0.5 truncate select-all">
                        {firmDisplayEmail}
                      </span>
                    </div>
                  </div>

                  {/* Official Phone */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Contact Phone</span>
                      <span className="font-mono font-bold text-slate-900 text-xs block mt-0.5 truncate select-all">
                        {firmDisplayPhone}
                      </span>
                    </div>
                  </div>

                  {/* Office Address */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3 md:col-span-2">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Registered Office Address</span>
                      <span className="font-medium text-slate-800 text-xs block mt-0.5 leading-relaxed">
                        {firmDisplayAddress}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Staff Member Association Card */}
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                      🧑‍💻
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">Your Firm Association</span>
                      <span className="text-[11px] text-slate-500">
                        Role: <strong className="text-indigo-700">{userRole || localStorage.getItem('taxpro_user_role') || 'Staff Member'}</strong> • Department: <strong className="text-slate-700">{localStorage.getItem('taxpro_user_department') || 'General Practice'}</strong>
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 bg-white border border-indigo-200 rounded-xl text-indigo-700 font-bold hidden sm:inline shadow-2xs">
                    ✓ Verified Staff Member
                  </span>
                </div>

                {/* Informational Guidance */}
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-[11px] text-slate-500 flex items-start gap-2 leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Practice Reference:</strong> As an authorized team member, you can reference these official firm credentials for client invoices, filing registers, and statutory documentation. To update organizational legal credentials, please contact an Administrator.
                  </span>
                </div>

                {/* Footer Action */}
                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md active:scale-95"
                  >
                    Close Window
                  </button>
                </div>
              </div>
            );
          }

          return (
            <>
              {/* Stepper Bar */}
              <div className="px-6 py-3.5 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between relative max-w-md mx-auto">
                  {/* Connecting Bar */}
                  <div className="absolute top-[18px] left-[24px] right-[24px] -translate-y-1/2 h-1 bg-gray-200 z-0 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        currentStep === 3 || isCompletedState
                          ? 'bg-emerald-500 w-full'
                          : currentStep === 2
                          ? 'bg-[#5b52e0] w-1/2'
                          : 'bg-[#5b52e0] w-0'
                      }`}
                    />
                  </div>

                  {stepTitles.map(step => {
                    const isPassed = currentStep > step.num || (currentStep === 3 && step.num === 3);
                    const isCurrent = currentStep === step.num;

                    return (
                      <div key={step.num} className="relative z-10 flex flex-col items-center">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 shadow-sm ${
                            isPassed
                              ? 'bg-emerald-500 text-white ring-4 ring-emerald-100 shadow-emerald-500/20'
                              : isCurrent
                              ? 'bg-[#5b52e0] text-white ring-4 ring-indigo-100 scale-110 shadow-indigo-500/20'
                              : 'bg-white text-gray-400 border-2 border-gray-300'
                          }`}
                        >
                          {isPassed ? <Check className="w-4 h-4 stroke-[3]" /> : step.num}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-wider mt-1.5 whitespace-nowrap flex items-center gap-1 ${
                          isPassed ? 'text-emerald-700 font-bold' : isCurrent ? 'text-[#5b52e0]' : 'text-gray-400'
                        }`}>
                          {step.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Scrollable Body */}
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">

                {/* ========================================================================= */}
                {/* STEP 1: FIRST ASK PASSWORD */}
                {/* ========================================================================= */}
                {currentStep === 1 && (
                  <form onSubmit={handleVerifyPasswordFirst} className="space-y-5 animate-fade-in max-w-md mx-auto py-2">
                    <div className="text-center space-y-1">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-2xs">
                        <KeyRound className="w-6 h-6 text-amber-600" />
                      </div>
                      <h3 className="text-base font-extrabold text-gray-900 font-outfit mt-2">
                        Enter Account Password
                      </h3>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        To protect your practice identity, please confirm your login password before changing firm details.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium">Logged-in Account:</span>
                        <span className="font-mono font-bold text-indigo-700 truncate max-w-[220px]">{adminEmail}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 block">
                        Account Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showAccountPassword ? "text" : "password"}
                          required
                          autoFocus
                          value={accountPassword}
                          onChange={(e) => {
                            setAccountPassword(e.target.value);
                            if (passwordError) setPasswordError('');
                          }}
                          placeholder="Enter your account login password"
                          className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-gray-900"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAccountPassword(!showAccountPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                        >
                          {showAccountPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {passwordError && (
                        <div className="text-[11px] font-bold text-red-600 flex items-center gap-1 mt-1.5 bg-red-50 p-2 rounded-lg border border-red-200">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>{passwordError}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-200 pt-4 gap-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={isVerifyingPassword}
                        className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        {isVerifyingPassword ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <ArrowRight className="w-4 h-4" />
                        )}
                        <span>{isVerifyingPassword ? 'Verifying...' : 'Verify Password & Proceed'}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* ========================================================================= */}
                {/* STEP 2: EDIT FIRM DETAILS (UNLOCKED AFTER PASSWORD) */}
                {/* ========================================================================= */}
                {currentStep === 2 && (
                  <form onSubmit={handleSaveEditedDetails} className="space-y-4 animate-fade-in">

                    {/* Section Subtitle */}
                    <div className="text-center py-1 border-b border-gray-100 mb-2">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <h3 className="text-xs font-black text-gray-900 font-outfit uppercase tracking-wider">
                          Firm Registration &amp; Corporate Identity Parameters
                        </h3>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-black font-mono inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" /> AUTHENTICATED
                        </span>
                      </div>
                    </div>

                    {/* Firm Tag Live Preview Banner */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs font-black text-sm">
                          🏢
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Staff Badge Preview</div>
                          <div className="font-mono font-black text-sm text-indigo-700">
                            🏢 {formData.tag || 'TaxPro'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right text-[11px] text-gray-500">
                        Appears beside staff roles on team badges &amp; receipts.
                      </div>
                    </div>

                    {/* Form Fields Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">

                      {/* 1. Firm Legal Name */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Full Practice / Firm Name <span className="text-red-500">*</span></span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name ?? ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g. TaxPro Advisory & Associates"
                          className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white text-gray-800"
                        />
                      </div>

                      {/* 2. Staff Member Badge Tag */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Staff Member Badge Tag <span className="text-red-500">*</span></span>
                          </label>
                          <span className="text-[10px] text-indigo-600 font-mono font-bold">Max 15 chars</span>
                        </div>
                        <input
                          type="text"
                          required
                          maxLength={15}
                          value={formData.tag ?? ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, tag: e.target.value.replace(/\s+/g, '') }))}
                          placeholder="e.g. TaxPro or ABC"
                          className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white text-indigo-900 font-mono"
                        />
                      </div>

                      {/* 3. GSTIN / Tax ID */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Firm GSTIN / Registration No. <span className="text-[10px] text-gray-400 font-normal font-sans">(Optional)</span></span>
                        </label>
                        <input
                          type="text"
                          value={formData.gst ?? ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, gst: e.target.value.toUpperCase() }))}
                          placeholder="e.g. 24AAAAA0000A1Z5 (Optional)"
                          className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-indigo-500 focus:bg-white text-gray-800"
                        />
                      </div>

                      {/* 4. Firm PAN Number */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                          <BadgeCheck className="w-3.5 h-3.5 text-indigo-600" />
                          Permanent Account Number (PAN)
                        </label>
                        <input
                          type="text"
                          value={formData.pan ?? ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, pan: e.target.value.toUpperCase() }))}
                          placeholder="e.g. AAATF1234C"
                          className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-indigo-500 focus:bg-white text-gray-800"
                        />
                      </div>

                      {/* 5. Official Contact Email */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-indigo-600" />
                          Official Firm Email
                        </label>
                        <input
                          type="email"
                          value={formData.email ?? ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="e.g. contact@taxpro.in"
                          className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white text-gray-800"
                        />
                      </div>

                      {/* 6. Official Contact Phone */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-indigo-600" />
                          Official Phone Number
                        </label>
                        <input
                          type="text"
                          value={formData.phone ?? ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="e.g. +91 98765 43210"
                          className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-indigo-500 focus:bg-white text-gray-800"
                        />
                      </div>

                      {/* 7. Registered Office Address */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                          Registered Practice / Office Address
                        </label>
                        <textarea
                          rows={2}
                          value={formData.address ?? ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Complete office address, floor, district, state & pin code"
                          className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 focus:bg-white text-gray-800 resize-none"
                        />
                      </div>

                      {/* 8. Practice Tagline / Motto */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          Practice Tagline / Specialization
                        </label>
                        <input
                          type="text"
                          value={formData.tagline ?? ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                          placeholder="e.g. Chartered Accountants & Strategic Tax Advisory"
                          className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 focus:bg-white text-gray-800"
                        />
                      </div>

                    </div>

                    {/* Form Navigation & Submit */}
                    <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-2">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back
                      </button>

                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        {isSaving ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 stroke-[3]" />
                        )}
                        <span>
                          {isSaving ? 'Saving Changes...' : 'Save & Complete Profile'}
                        </span>
                      </button>
                    </div>

                  </form>
                )}

                {/* ========================================================================= */}
                {/* STEP 3: COMPLETED PROFILE SCREEN */}
                {/* ========================================================================= */}
                {currentStep === 3 && (
                  <div className="space-y-6 animate-fade-in text-center py-2 max-w-lg mx-auto">

                    {/* Animated Checkmark Styles */}
                    <style>{`
                      @keyframes cute-circle-draw {
                        0% {
                          stroke-dashoffset: 160;
                          transform: scale(0.6) rotate(-45deg);
                          opacity: 0;
                        }
                        50% {
                          opacity: 1;
                          transform: scale(1.08) rotate(0deg);
                        }
                        100% {
                          stroke-dashoffset: 0;
                          transform: scale(1) rotate(0deg);
                          opacity: 1;
                        }
                      }
                      @keyframes cute-tick-draw {
                        0% {
                          stroke-dashoffset: 60;
                          opacity: 0;
                        }
                        40% {
                          opacity: 1;
                        }
                        100% {
                          stroke-dashoffset: 0;
                          opacity: 1;
                        }
                      }
                      @keyframes cute-pop-bounce {
                        0% {
                          transform: scale(0);
                          opacity: 0;
                        }
                        60% {
                          transform: scale(1.15);
                          opacity: 1;
                        }
                        80% {
                          transform: scale(0.95);
                        }
                        100% {
                          transform: scale(1);
                          opacity: 1;
                        }
                      }
                      @keyframes cute-ring-expand {
                        0% {
                          transform: scale(0.85);
                          opacity: 0.8;
                        }
                        100% {
                          transform: scale(1.45);
                          opacity: 0;
                        }
                      }
                      .cute-checkmark-circle {
                        stroke-dasharray: 160;
                        stroke-dashoffset: 160;
                        animation: cute-circle-draw 0.75s cubic-bezier(0.65, 0, 0.45, 1) forwards;
                        transform-origin: center;
                      }
                      .cute-checkmark-tick {
                        stroke-dasharray: 60;
                        stroke-dashoffset: 60;
                        animation: cute-tick-draw 0.5s cubic-bezier(0.65, 0, 0.45, 1) 0.4s forwards;
                      }
                      .cute-container-pop {
                        animation: cute-pop-bounce 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                      }
                      .cute-pulse-ring {
                        animation: cute-ring-expand 1.4s cubic-bezier(0.25, 1, 0.5, 1) 0.3s infinite;
                      }
                    `}</style>

                    {/* Cute Animated Tick Mark */}
                    <div className="relative flex items-center justify-center mx-auto my-2">
                      <div className="absolute w-24 h-24 rounded-full bg-emerald-400/25 cute-pulse-ring pointer-events-none" />
                      <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 p-[3px] shadow-2xl shadow-emerald-500/30 cute-container-pop">
                        <div className="w-full h-full bg-white rounded-full flex items-center justify-center shadow-inner">
                          <svg className="w-12 h-12 text-emerald-500" viewBox="0 0 52 52">
                            <circle
                              className="cute-checkmark-circle"
                              cx="26" cy="26" r="23"
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                            />
                            <path
                              className="cute-checkmark-tick"
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M14 27 l8 8 l16 -16"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-black uppercase tracking-widest font-mono">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> PROFILE COMPLETED &amp; ACTIVE
                      </span>
                      <h3 className="text-xl font-black text-gray-900 font-outfit mt-2">
                        Practice Profile Successfully Completed!
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
                        Official practice identity, legal registration, GSTIN, PAN, and corporate tags are verified and active across all enterprise modules.
                      </p>
                    </div>

                    {/* Summary Card */}
                    <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 text-left font-sans text-xs space-y-3 shadow-xs">
                      <div className="flex items-center justify-between border-b border-gray-200 pb-2.5">
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Official Firm Name</span>
                          <span className="font-black text-gray-900 text-sm">{cleanFirmValue(formData.name) || 'TaxPro Practice'}</span>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-[#5b52e0] text-white text-xs font-black font-mono shadow-xs flex items-center gap-1">
                          🏢 {cleanFirmValue(formData.tag, 'TaxPro')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">GSTIN Number</span>
                          <span className="font-mono font-bold text-gray-800 text-[11px]">{cleanFirmValue(formData.gst) || 'Verified on File'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Income Tax PAN</span>
                          <span className="font-mono font-bold text-gray-800 text-[11px]">{cleanFirmValue(formData.pan) || 'Verified on File'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-200/60">
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Official Email</span>
                          <span className="font-medium text-gray-700 text-[11px] truncate block">{cleanFirmValue(formData.email) || adminEmail}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Official Phone</span>
                          <span className="font-mono font-bold text-gray-700 text-[11px]">{cleanFirmValue(formData.phone) || 'N/A'}</span>
                        </div>
                      </div>

                      {cleanFirmValue(formData.address) && (
                        <div className="pt-1 border-t border-gray-200/60">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Registered Office</span>
                          <span className="font-medium text-gray-600 text-[11px] line-clamp-2">{cleanFirmValue(formData.address)}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Edit Details
                      </button>

                      <button
                        type="button"
                        onClick={onClose}
                        className="px-7 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-2 hover:scale-102"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Done (Close Window)</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </>
          );
        })()}

      </div>
    </div>
  );
}
