import React, { useState } from 'react';
import { User, Briefcase, Phone, Globe, ChevronRight, GraduationCap, Store, Box, Shield } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function ProfileSetupModal({ isOpen, onClose, onComplete }) {
  const [profession, setProfession] = useState('');
  const [otherProfession, setOtherProfession] = useState('');
  const [department, setDepartment] = useState('');
  const [language, setLanguage] = useState('');
  const [mobile, setMobile] = useState('');
  const [step, setStep] = useState(1);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (step === 1) {
      if (!profession) {
        alert("Please select a profession.");
        return;
      }
      const purePhone = mobile.replace(/[^0-9]/g, '');
      if (purePhone.length !== 10) {
        alert("Phone number must be exactly 10 digits!");
        return;
      }
      setStep(2);
      return;
    }
    
    // Step 2 Submission
    if (!department) {
      alert("Please select a department division you belong to.");
      return;
    }

    const purePhone = mobile.replace(/[^0-9]/g, '');
    
    // Trigger Google Translate Programmatically using the hidden widget
    if (language) {
      try {
        const combo = document.querySelector('.goog-te-combo');
        if (combo) {
          combo.value = language;
          combo.dispatchEvent(new Event('change'));
        }
      } catch(err) {}
    }

    localStorage.setItem('taxpro_profile_completed', 'true');
    localStorage.setItem('taxpro_user_department', department);
    
    // Save to Supabase User Metadata to prevent asking on other devices
    supabase.auth.updateUser({
      data: { profile_completed: true, profession: profession === 'Other' ? otherProfession : profession, department, language, mobile: purePhone }
    });

    if (onComplete) onComplete({
      profession: profession === 'Other' ? otherProfession : profession,
      department,
      language,
      mobile: purePhone
    });
    onClose();
  };

  const profOptions = [
    { id: 'Accountant', icon: Briefcase, label: 'Accountant' },
    { id: 'Business Owner', icon: Store, label: 'Business Owner' },
    { id: 'Student', icon: GraduationCap, label: 'Student' },
    { id: 'Other', icon: Box, label: 'Other' },
  ];

  const deptOptions = [
    { id: 'Tax & Compliance', label: 'Tax & Compliance', icon: Briefcase },
    { id: 'Audit & Assurance', label: 'Audit & Assurance', icon: Shield },
    { id: 'Accounting', label: 'Accounting', icon: Store },
    { id: 'Legal & Advisory', label: 'Legal & Advisory', icon: Globe },
    { id: 'IT & Tech', label: 'IT & Tech', icon: Box },
    { id: 'HR & Ops', label: 'HR & Ops', icon: User },
    { id: 'Management', label: 'Management', icon: Briefcase },
    { id: 'Other', label: 'Other', icon: Box }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md glass-panel p-8 border border-white/15 rounded-3xl shadow-2xl shadow-indigo-500/20 my-8">
        
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4">
            <User className="w-6 h-6 text-indigo-400" />
          </div>
          <h3 className="text-2xl font-extrabold text-white font-outfit">Complete Your Profile</h3>
          <p className="text-xs text-gray-400 mt-1">Please provide a few details to personalize your experience.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {step === 1 ? (
            <div className="animate-fade-in flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-2">Profession</label>
                <div className="grid grid-cols-2 gap-3">
                  {profOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = profession === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setProfession(opt.id)}
                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                          isSelected 
                            ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 scale-[1.02] shadow-sm shadow-indigo-500/30' 
                            : 'bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/[0.05] hover:border-white/20'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-[11px] font-bold">{opt.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {profession === 'Other' && (
                <div className="animate-fade-in mt-1">
                  <label className="text-xs font-semibold text-gray-300 block mb-1">Please Specify</label>
                  <input
                    type="text"
                    placeholder="Enter your profession"
                    value={otherProfession}
                    onChange={(e) => setOtherProfession(e.target.value)}
                    className="w-full glass-input px-4 py-2.5 text-xs text-white bg-white/5"
                    required={profession === 'Other'}
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Preferred Language</label>
                <div className="relative">
                  <Globe className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-400" />
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full glass-input pl-10 pr-4 py-2.5 text-xs text-white appearance-none bg-black/50"
                    required
                  >
                    <option value="" disabled className="text-gray-500 bg-gray-900">Select language...</option>
                    <option value="en" className="text-gray-200 bg-gray-900">English (Global)</option>
                    <option value="hi" className="text-gray-200 bg-gray-900">Hindi (India)</option>
                    <option value="gu" className="text-gray-200 bg-gray-900">Gujarati (India)</option>
                    <option value="mr" className="text-gray-200 bg-gray-900">Marathi (India)</option>
                    <option value="es" className="text-gray-200 bg-gray-900">Spanish (Español)</option>
                    <option value="fr" className="text-gray-200 bg-gray-900">French (Français)</option>
                    <option value="de" className="text-gray-200 bg-gray-900">German (Deutsch)</option>
                    <option value="ar" className="text-gray-200 bg-gray-900">Arabic (العربية)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Mobile Number (10 Digits)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-400" />
                  <input
                    type="tel"
                    maxLength="10"
                    placeholder="9999900000"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full glass-input pl-10 pr-4 py-2.5 text-xs text-white bg-black/50 font-mono"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
              >
                <span>Continue to Step 2</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="animate-fade-in flex flex-col gap-4">
              <div className="mb-2">
                <label className="text-sm font-bold text-white block mb-1">Select your Department</label>
                <p className="text-[10px] text-gray-400">Which division of the firm do you primarily operate in?</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-2">
                {deptOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = department === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDepartment(opt.id)}
                      className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border transition-all ${
                        isSelected 
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 scale-[1.02] shadow-sm shadow-emerald-500/30' 
                          : 'bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/[0.05] hover:border-white/20'
                      }`}
                    >
                      <Icon className="w-5 h-5 mb-0.5" />
                      <span className="text-[11px] font-bold text-center leading-tight">{opt.label}</span>
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-xs font-bold hover:bg-white/10 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                >
                  <span>Complete Setup</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </form>

      </div>
    </div>
  );
}
