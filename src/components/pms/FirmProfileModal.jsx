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
  CheckCircle2,
  Tag,
  Building,
  Globe
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { logAuditActivity } from '../../lib/auditLogger';

export default function FirmProfileModal({ isOpen, onClose, onShowToast, initialStep = 3, isDirectSetup = true, userRole }) {
  // 4 Steps: 1: Enter Email, 2: Enter OTP, 3: Edit Details, 4: Confirm Changes
  const [currentStep, setCurrentStep] = useState(3);
  const [adminEmail, setAdminEmail] = useState(() => {
    return localStorage.getItem('taxpro_user_email') || localStorage.getItem('taxpro_secret_superadmin') || 'admin@taxpro.com';
  });

  // OTP Verification State
  const [enteredOtp, setEnteredOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('123456');
  const [resendTimer, setResendTimer] = useState(60);
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Original Initial Firm Data (for Before/After comparison)
  const [originalFirm, setOriginalFirm] = useState({
    name: localStorage.getItem('taxpro_firm_name') || '',
    tag: localStorage.getItem('taxpro_firm_tag') || 'TaxPro',
    gst: localStorage.getItem('taxpro_firm_gst') || '',
    pan: localStorage.getItem('taxpro_firm_pan') || '',
    email: localStorage.getItem('taxpro_firm_email') || '',
    phone: localStorage.getItem('taxpro_firm_phone') || '',
    address: localStorage.getItem('taxpro_firm_address') || '',
    tagline: localStorage.getItem('taxpro_firm_tagline') || 'Tax & Compliance Advisory Practice'
  });

  // Editable Form Data
  const [formData, setFormData] = useState({
    name: localStorage.getItem('taxpro_firm_name') || '',
    tag: localStorage.getItem('taxpro_firm_tag') || 'TaxPro',
    gst: localStorage.getItem('taxpro_firm_gst') || '',
    pan: localStorage.getItem('taxpro_firm_pan') || '',
    email: localStorage.getItem('taxpro_firm_email') || '',
    phone: localStorage.getItem('taxpro_firm_phone') || '',
    address: localStorage.getItem('taxpro_firm_address') || '',
    tagline: localStorage.getItem('taxpro_firm_tagline') || 'Tax & Compliance Advisory Practice'
  });

  const [isSaving, setIsSaving] = useState(false);
  const [authAgreement, setAuthAgreement] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const email = localStorage.getItem('taxpro_user_email') || localStorage.getItem('taxpro_secret_superadmin') || 'admin@taxpro.com';
      setAdminEmail(email);
      
      const currentData = {
        name: localStorage.getItem('taxpro_firm_name') || '',
        tag: localStorage.getItem('taxpro_firm_tag') || 'TaxPro',
        gst: localStorage.getItem('taxpro_firm_gst') || '',
        pan: localStorage.getItem('taxpro_firm_pan') || '',
        email: localStorage.getItem('taxpro_firm_email') || '',
        phone: localStorage.getItem('taxpro_firm_phone') || '',
        address: localStorage.getItem('taxpro_firm_address') || '',
        tagline: localStorage.getItem('taxpro_firm_tagline') || 'Tax & Compliance Advisory Practice'
      };
      setOriginalFirm(currentData);
      setFormData(currentData);
      setCurrentStep(3);
      setEnteredOtp('');
    }
  }, [isOpen]);

  // Resend Timer Countdown
  useEffect(() => {
    let interval;
    if (currentStep === 2 && resendTimer > 0) {
      interval = setInterval(() => setResendTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [currentStep, resendTimer]);

  if (!isOpen) return null;

  // Step 1: Send Security OTP
  const handleSendOtp = async () => {
    if (!adminEmail.trim() || !adminEmail.includes('@')) {
      if (onShowToast) onShowToast('Please enter a valid administrator email address.', 'error');
      return;
    }

    setIsOtpSending(true);
    try {
      let smtpConfig = null;
      try {
        const raw = localStorage.getItem('taxpro_smtp');
        if (raw) smtpConfig = JSON.parse(raw);
      } catch (e) {}

      const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const res = await fetch(`${baseUrl}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail.trim(), smtpConfig })
      });

      const data = await res.json();
      if (data.success) {
        setCurrentStep(2);
        setResendTimer(60);
        if (onShowToast) {
          onShowToast(`✓ Security verification OTP dispatched to ${adminEmail}!`, 'success');
        }
      } else {
        if (onShowToast) onShowToast(data.error || 'Failed to dispatch verification OTP.', 'error');
      }
    } catch (e) {
      if (onShowToast) onShowToast('Network error while dispatching security OTP.', 'error');
    } finally {
      setIsOtpSending(false);
    }
  };

  // Step 2: Verify Security OTP
  const handleVerifyOtp = async () => {
    const cleanCode = enteredOtp.trim();
    if (!cleanCode || cleanCode.length < 4) {
      if (onShowToast) onShowToast('Please enter the verification code received in your email.', 'error');
      return;
    }

    setIsVerifying(true);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const res = await fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail.trim(),
          otp: cleanCode
        })
      });

      const data = await res.json();
      if (data.success && data.verified) {
        setCurrentStep(3);
        if (onShowToast) onShowToast('✓ Administrator Identity Verified. Access to Firm Settings granted.', 'success');
      } else {
        if (onShowToast) onShowToast(data.error || 'Invalid or expired verification code.', 'error');
      }
    } catch (e) {
      if (onShowToast) onShowToast('Verification request failed. Please try again.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  // Step 3: Validate Form and Go to Confirm
  const handleProceedToConfirm = (e) => {
    if (e) e.preventDefault();

    if (!formData.name.trim()) {
      if (onShowToast) onShowToast('Please enter the full Company or Firm Name.', 'error');
      return;
    }
    if (!formData.tag.trim()) {
      if (onShowToast) onShowToast('Please specify a short Firm Badge Tag for member accounts.', 'error');
      return;
    }

    handleCommitFirmSave();
  };

  // Step 4: Final Commit & Save
  const handleCommitFirmSave = async () => {
    setIsSaving(true);
    try {
      const cleanName = formData.name.trim();
      const cleanTag = formData.tag.trim();
      const cleanGst = formData.gst.trim();
      const cleanPan = formData.pan.trim();
      const cleanEmail = formData.email.trim();
      const cleanPhone = formData.phone.trim();
      const cleanAddress = formData.address.trim();
      const cleanTagline = formData.tagline.trim();

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

      // 2. Try to sync with Supabase / Cloud Postgres
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
          details: `Updated Firm details to "${cleanName}" with badge tag [${cleanTag}]`,
          metadata: {
            adminEmail,
            previousName: originalFirm.name,
            newName: cleanName,
            firmTag: cleanTag
          }
        });
      } catch (err) { }

      // 4. Dispatch Global Events so MainPMSShell and all views re-render with new tags!
      window.dispatchEvent(new CustomEvent('taxpro_firm_updated', {
        detail: {
          name: cleanName,
          tag: cleanTag,
          gst: cleanGst,
          email: cleanEmail,
          address: cleanAddress
        }
      }));
      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

      if (onShowToast) {
        onShowToast(`✓ Firm Profile & Company Tag [${cleanTag}] successfully saved!`, 'success');
      }

      onClose();
    } catch (e) {
      if (onShowToast) onShowToast('Failed to save firm details. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const stepTitles = isDirectSetup ? [
    { num: 1, title: 'Firm Identity & Legal Details', desc: 'Company & Tag Setup' }
  ] : [
    { num: 1, title: 'Verify Email', desc: 'Admin Security Check' },
    { num: 2, title: 'Enter OTP', desc: '6-Digit Code' },
    { num: 3, title: 'Firm Identity & Legal Details', desc: 'Company & Tag Setup' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header with Title & Close Button */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-900 via-[#181c32] to-gray-900 text-white relative">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-teal-400 p-0.5 shadow-md mb-2">
              <div className="w-full h-full bg-gray-900 rounded-2xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-teal-300" />
              </div>
            </div>
            <h2 className="text-base sm:text-lg font-black font-outfit">
              Firm Identity & Legal Details
            </h2>
            <p className="text-[11px] text-gray-300 mt-0.5 max-w-md">
              Configure official practice legal name, PAN, GSTIN, company tags, and office contact info
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
          const roleStr = String(userRole || localStorage.getItem('taxpro_user_role') || 'Admin').trim().toLowerCase();
          const isAdmin = roleStr === 'admin' || roleStr === 'super admin' || roleStr.includes('admin') || roleStr.includes('owner') || isDirectSetup;
          const isNonAdmin = !isAdmin && (roleStr.includes('manager') || roleStr.includes('employee') || roleStr.includes('staff'));

          if (isNonAdmin) {
            return (
              <div className="p-8 text-center space-y-4 my-auto">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center border border-amber-400/30">
                  <Lock className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-lg font-black text-gray-900 font-outfit">
                  👑 Organization Admin Permission Required
                </h3>
                <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
                  Managers and employees do not possess authorization to alter firm legal credentials, GSTIN, PAN, and corporate identity tags. Please contact your Organization Administrator or Practice Owner.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Close Window
                  </button>
                </div>
              </div>
            );
          }

          return (
            <>
              {/* 4-STEP PROGRESS DOTS / STEPPER BAR */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between relative max-w-lg mx-auto">
                  
                  {/* Connecting Bar */}
                  <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 bg-gray-200 z-0">
                    <div 
                      className="h-full bg-[#5b52e0] transition-all duration-300" 
                      style={{ width: `${((currentStep - 1) / 3) * 100}%` }} 
                    />
                  </div>

                  {/* 4 Step Dots */}
                  {stepTitles.map(step => {
                    const isPassed = currentStep > step.num;
                    const isCurrent = currentStep === step.num;

                    return (
                      <div key={step.num} className="relative z-10 flex flex-col items-center">
                        <div 
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 shadow-sm ${
                            isPassed 
                              ? 'bg-emerald-500 text-white ring-4 ring-emerald-100' 
                              : isCurrent 
                              ? 'bg-[#5b52e0] text-white ring-4 ring-indigo-100 scale-110' 
                              : 'bg-white text-gray-400 border-2 border-gray-300'
                          }`}
                        >
                          {isPassed ? <Check className="w-4 h-4 stroke-[3]" /> : step.num}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-wider mt-1.5 whitespace-nowrap ${
                          isCurrent ? 'text-[#5b52e0]' : isPassed ? 'text-emerald-700' : 'text-gray-400'
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
                {/* STEP 1: ENTER ADMIN EMAIL */}
                {/* ========================================================================= */}
                {currentStep === 1 && (
                  <div className="space-y-6 animate-fade-in max-w-md mx-auto text-center py-4">
                    <div className="w-14 h-14 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-[#5b52e0] shadow-sm">
                <Mail className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-black text-gray-900 font-outfit">
                  Administrator Dual-Factor Authentication
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Modifying your firm's legal name, GSTIN, and company tags updates all staff badges and invoices. Confirm your admin email to request a 6-digit authorization OTP.
                </p>
              </div>

              <div className="text-left space-y-2">
                <label className="text-xs font-bold text-gray-700">Administrator Email Address:</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@taxpro.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white text-gray-800"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isOtpSending}
                className="w-full py-3 bg-[#5b52e0] hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isOtpSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>Send 6-Digit Security OTP</span>
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: ENTER OTP */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in max-w-md mx-auto text-center py-4">
              <div className="w-14 h-14 rounded-3xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto text-teal-600 shadow-sm">
                <KeyRound className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-black text-gray-900 font-outfit">
                  Enter Security Verification Code
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  We've dispatched a 6-digit one-time code to <strong className="text-gray-900">{adminEmail}</strong>.
                </p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  maxLength={6}
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full text-center text-2xl font-black font-mono tracking-widest py-3 bg-gray-50 border-2 border-indigo-200 rounded-2xl focus:outline-none focus:border-indigo-600 focus:bg-white text-indigo-900"
                />

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Protected by Python smtplib TLS</span>
                  </span>

                  <span className="text-gray-400 font-mono">
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : (
                      <button type="button" onClick={handleSendOtp} className="text-indigo-600 font-bold hover:underline cursor-pointer">
                        Resend Code
                      </button>
                    )}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-2xl transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={isVerifying || enteredOtp.length < 4}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isVerifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                    <span>Verify Code & Edit Details</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="w-full py-2 text-indigo-600 hover:text-indigo-800 font-extrabold text-xs text-center transition-colors cursor-pointer hover:underline"
                >
                  ⚡ Or Click Here to Edit Firm Details Directly &rarr;
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: EDIT FIRM / COMPANY DETAILS */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <form onSubmit={handleProceedToConfirm} className="space-y-5 animate-fade-in">
              
              {/* Centered Section Title */}
              <div className="text-center py-2.5 border-b border-gray-100 mb-3">
                <h3 className="text-sm font-black text-gray-900 font-outfit uppercase tracking-wider">
                  Firm Identity & Legal Details
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Official Practice Registration & Corporate Identity Parameters
                </p>
              </div>

              {/* Firm Tag Live Preview Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#5b52e0] text-white flex items-center justify-center font-bold shadow-sm">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">Live Member Badge Tag Preview</span>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-600 font-bold">Every Staff Account will display:</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#5b52e0] text-white text-xs font-black font-mono shadow-xs flex items-center gap-1">
                        🏢 {formData.tag || 'TaxPro'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-gray-500">
                  Visible to Admins, Managers & Employees
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Legal Company / Firm Name */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-indigo-600" />
                    Full Company / Firm Legal Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Apex Tax & Financial Advisory LLP"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white text-gray-800"
                  />
                </div>

                {/* 2. Firm Badge Tag */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    Firm Badge / Tag (Short Name) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.tag}
                    onChange={(e) => setFormData(prev => ({ ...prev, tag: e.target.value }))}
                    placeholder="e.g. Apex Advisory"
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
                    value={formData.gst}
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
                    value={formData.pan}
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
                    value={formData.email}
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
                    value={formData.phone}
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
                    value={formData.address}
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
                    value={formData.tagline}
                    onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                    placeholder="e.g. Chartered Accountants & Strategic Tax Advisory"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 focus:bg-white text-gray-800"
                  />
                </div>

              </div>

              {/* Form Navigation */}
              <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                  <span>Save Firm Identity</span>
                </button>
              </div>

            </form>
          )}

        </div>
            </>
          );
        })()}

      </div>
    </div>
  );
}
