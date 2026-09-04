import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Briefcase, 
  Phone, 
  MapPin, 
  ChevronRight, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  FileText, 
  Globe, 
  Lock, 
  BadgeCheck 
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const cleanFirmValue = (val, defaultVal = '') => {
  if (val === null || val === undefined) return defaultVal;
  if (typeof val === 'object') {
    if ('value' in val) return cleanFirmValue(val.value, defaultVal);
    if ('VALUE' in val) return cleanFirmValue(val.VALUE, defaultVal);
    return defaultVal;
  }
  const str = String(val).trim();
  if (!str) return defaultVal;
  if ((str.startsWith('{"value"') || str.startsWith('{"VALUE"') || str.startsWith('{"value":') || str.startsWith('{"VALUE":')) && str.endsWith('}')) {
    try {
      const parsed = JSON.parse(str);
      if (parsed && typeof parsed === 'object') {
        if ('value' in parsed) return cleanFirmValue(parsed.value, defaultVal);
        if ('VALUE' in parsed) return cleanFirmValue(parsed.VALUE, defaultVal);
      }
    } catch (e) {}
  }
  if (str === '[]' || str === '{}' || str === '""' || str === 'null' || str === 'undefined') return defaultVal;
  return str;
};

export default function ProfileSetupModal({ isOpen, onComplete }) {
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1: Practice Legal Details
  const [firmName, setFirmName] = useState(() => cleanFirmValue(localStorage.getItem('taxpro_firm_name'), ''));
  const [firmTag, setFirmTag] = useState(() => cleanFirmValue(localStorage.getItem('taxpro_firm_tag'), ''));
  const [gstin, setGstin] = useState(() => cleanFirmValue(localStorage.getItem('taxpro_firm_gst'), ''));
  const [pan, setPan] = useState(() => cleanFirmValue(localStorage.getItem('taxpro_firm_pan'), ''));
  const [phone, setPhone] = useState(() => cleanFirmValue(localStorage.getItem('taxpro_firm_phone'), ''));

  // Step 2: Practice Specialization & Address
  const [specialization, setSpecialization] = useState(() => cleanFirmValue(localStorage.getItem('taxpro_user_department'), 'Tax & Compliance'));
  const [address, setAddress] = useState(() => cleanFirmValue(localStorage.getItem('taxpro_firm_address'), ''));
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleNextStep = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!firmName.trim()) {
      setErrorMessage('Please enter your Firm / Company Legal Name.');
      return;
    }
    if (!firmTag.trim()) {
      setErrorMessage('Please enter a short Firm Tag (e.g. TaxPro, Apex, Prime).');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10) {
      setErrorMessage('Contact phone number must be exactly 10 digits.');
      return;
    }

    setStep(2);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!address.trim()) {
      setErrorMessage('Please provide your practice official office address.');
      return;
    }

    setIsSaving(true);

    try {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const cleanPan = pan.trim().toUpperCase();
      const cleanGst = gstin.trim().toUpperCase();
      const cleanFirm = firmName.trim();
      const cleanTag = firmTag.trim();

      // 1. Commit to LocalStorage
      localStorage.setItem('taxpro_setup_completed', 'true');
      localStorage.setItem('taxpro_profile_completed', 'true');
      localStorage.setItem('taxpro_firm_configured', 'true');
      localStorage.setItem('taxpro_firm_name', cleanFirm);
      localStorage.setItem('taxpro_firm_tag', cleanTag);
      localStorage.setItem('taxpro_firm_gst', cleanGst || '24AAAAA0000A1Z5');
      localStorage.setItem('taxpro_firm_pan', cleanPan || 'AAATF1234C');
      localStorage.setItem('taxpro_firm_phone', cleanPhone);
      localStorage.setItem('taxpro_firm_address', address.trim());
      localStorage.setItem('taxpro_user_department', specialization);

      // 2. Update PostgreSQL database session metadata
      try {
        const userEmail = localStorage.getItem('taxpro_user_email');
        if (userEmail) {
          await supabase.from('users').update({
            company: cleanFirm,
            department: specialization,
            status: 'Active'
          }).ilike('email', userEmail);

          await supabase.from('team_members').update({
            firm_name: cleanFirm,
            department: specialization,
            phone: cleanPhone,
            status: 'Active'
          }).ilike('email', userEmail);
        }
      } catch (err) {}

      // 3. Dispatch system-wide state update events
      window.dispatchEvent(new CustomEvent('taxpro_firm_updated'));
      window.dispatchEvent(new CustomEvent('taxpro_profile_updated'));
      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

      if (onComplete) {
        onComplete({
          firmName: cleanFirm,
          firmTag: cleanTag,
          phone: cleanPhone,
          address: address.trim(),
          specialization
        });
      }
    } catch (err) {
      setErrorMessage('Failed to save configuration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const specializationOptions = [
    { id: 'Tax & Compliance', label: 'Tax & Compliance Advisory', icon: FileText },
    { id: 'Audit & Assurance', label: 'Statutory Audit & Assurance', icon: ShieldCheck },
    { id: 'GST & Direct Tax', label: 'GST & Direct Tax Practice', icon: Building2 },
    { id: 'Accounting & Payroll', label: 'Corporate Accounting & Payroll', icon: Briefcase },
    { id: 'Corporate Law & ROC', label: 'Corporate Law & MCA ROC', icon: Globe },
    { id: 'General Management', label: 'Full Spectrum CA Practice', icon: BadgeCheck },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-fade-in select-none">
      <div className="relative w-full max-w-xl bg-[#0e101a] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-500/20 my-8 overflow-hidden">
        
        {/* Decorative Neon Backdrop Elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="text-center mb-6 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 border border-cyan-400/40 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/30">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-black uppercase tracking-widest mb-2 font-mono">
            <Sparkles className="w-3 h-3" /> Mandatory Practice Setup
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white font-outfit tracking-tight">
            Configure Your Firm Profile
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
            Please provide your official firm details to activate your practice workspace and access client dossiers, financial ledgers, and team tools.
          </p>
        </div>

        {/* Progress Tracker Steps */}
        <div className="flex items-center justify-center gap-3 mb-6 relative z-10">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${step === 1 ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300' : 'bg-white/5 border border-white/10 text-gray-400'}`}>
            <span className="w-5 h-5 rounded-full bg-cyan-500 text-black text-[10px] font-black flex items-center justify-center">1</span>
            <span>Firm Identity</span>
          </div>
          <div className="w-6 h-[2px] bg-white/10" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${step === 2 ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300' : 'bg-white/5 border border-white/10 text-gray-400'}`}>
            <span className="w-5 h-5 rounded-full bg-cyan-500 text-black text-[10px] font-black flex items-center justify-center">2</span>
            <span>Specialization & Address</span>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold text-center animate-shake relative z-10">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* STEP 1: Practice Legal Details */}
        {step === 1 ? (
          <form onSubmit={handleNextStep} className="space-y-4 relative z-10 text-xs">
            <div>
              <label className="text-gray-300 font-bold block mb-1.5">
                Firm / Company Legal Name <strong className="text-cyan-400">*</strong>
              </label>
              <input
                type="text"
                required
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                placeholder="e.g. TaxPro Advisory & Tax Associates"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 focus:bg-white/10"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-gray-300 font-bold block mb-1.5">
                  Firm Tag / Brand Short Name <strong className="text-cyan-400">*</strong>
                </label>
                <input
                  type="text"
                  required
                  value={firmTag}
                  onChange={(e) => setFirmTag(e.target.value)}
                  placeholder="e.g. TaxPro"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <label className="text-gray-300 font-bold block mb-1.5">
                  Official Phone (10 Digits) <strong className="text-cyan-400">*</strong>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="9876543210"
                    className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-mono font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-gray-300 font-bold block mb-1.5">
                  Firm GSTIN Number (Optional)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="24AAAAA0000A1Z5"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-mono font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 uppercase"
                />
              </div>

              <div>
                <label className="text-gray-300 font-bold block mb-1.5">
                  Firm PAN Number (Optional)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  placeholder="AAATF1234C"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-mono font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 uppercase"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-6 w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Next: Specialization & Address</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* STEP 2: Specialization & Address */
          <form onSubmit={handleFinalSubmit} className="space-y-4 relative z-10 text-xs">
            <div>
              <label className="text-gray-300 font-bold block mb-2">
                Select Primary Practice Specialization <strong className="text-cyan-400">*</strong>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {specializationOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = specialization === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSpecialization(opt.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md shadow-cyan-500/20'
                          : 'bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/5 hover:text-gray-200'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span className="text-[11px] font-bold truncate">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-gray-300 font-bold block mb-1.5">
                Official Business Address & City <strong className="text-cyan-400">*</strong>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <textarea
                  required
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Silicon Square, Block 7, Financial District, Surat, Gujarat - 395007"
                  className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="w-2/3 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSaving ? (
                  <span>Activating Workspace...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Setup & Enter Workspace</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
