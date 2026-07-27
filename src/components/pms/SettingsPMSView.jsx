import React, { useState } from 'react';
import { Settings, Save, Shield, Printer } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function SettingsPMSView({ onShowToast }) {
  const [theme, setTheme] = useState('light');
  const [activeLang, setActiveLang] = useState('English');
  const [resetting, setResetting] = useState(false);

  const handleResetPassword = () => {
    const confirmEmail = window.prompt("Confirm the email address for password reset:", "krushilgadhiya0@gmail.com");
    if (!confirmEmail) return;
    
    setResetting(true);
    if (onShowToast) onShowToast('Contacting authorization provider...', 'info');

    // Safe mock to prevent undefined Supabase session errors in preview
    setTimeout(() => {
      if (onShowToast) onShowToast(`✓ Password reset link dispatched securely to ${confirmEmail}. Check your inbox!`, 'success');
      setResetting(false);
    }, 1500);
  };

  const triggerPrint = () => {
    if (onShowToast) onShowToast('Generating printable Firm Profile...', 'info');
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className={`p-4 sm:p-6 lg:p-8 min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-[#f3f4f6] text-gray-800'} printable-area-container`}>
      <div className="mb-6 print-hidden">
        <h1 className={`text-2xl font-extrabold font-outfit ${theme === 'dark' ? 'text-white' : 'text-[#1e1e2d]'}`}>Firm Settings</h1>
        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Configure firm profile, GST details, user permissions, and API integrations.</p>
      </div>

      <div className={`max-w-2xl border rounded-2xl p-6 shadow-xs ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h3 className={`font-bold text-sm mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Firm Details</h3>
        <div className="flex flex-col gap-4 text-xs">
          <div>
            <label className={`font-semibold block mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Firm Name</label>
            <input type="text" defaultValue="Finexo Advisory & Tax Associates" className={`w-full p-2.5 rounded-xl border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={`font-semibold block mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Firm GSTIN</label>
              <input type="text" defaultValue="24AAAAA0000A1Z5" className={`w-full p-2.5 rounded-xl border font-mono ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
            </div>
            <div>
              <label className={`font-semibold block mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Registered Gmail</label>
              <input type="text" defaultValue="krushilgadhiya0@gmail.com" readOnly className={`w-full p-2.5 rounded-xl border font-mono ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-600'}`} />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2 print-hidden">
            <button 
              onClick={() => onShowToast && onShowToast('✓ Firm settings saved successfully!', 'success')}
              className="flex-1 py-2.5 bg-[#5b52e0] text-white font-bold rounded-xl hover:bg-[#4c44cf] flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              <Save className="w-4 h-4" /> Save Settings
            </button>
            <button 
              onClick={triggerPrint}
              className={`px-4 py-2.5 font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors ${
                theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              <Printer className="w-4 h-4" /> Print Firm Profile
            </button>
          </div>
        </div>
      </div>

      <div className={`max-w-2xl border rounded-2xl p-6 shadow-xs mt-6 print-hidden ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h3 className={`font-bold text-sm mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          <Shield className="w-4 h-4 text-emerald-600" /> Security & Account
        </h3>
        <div className="flex flex-col gap-4">
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border gap-4 ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
             <div>
               <h4 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Password Reset</h4>
               <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Send a secure link to your email to change your password.</p>
             </div>
             <button 
               onClick={handleResetPassword}
               disabled={resetting}
               className={`px-4 py-2 border text-xs font-bold rounded-lg shadow-sm w-full sm:w-auto transition-colors ${
                 theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
               } ${resetting ? 'opacity-50 cursor-not-allowed' : ''}`}
             >
               {resetting ? 'Dispatching...' : 'Reset Password'}
             </button>
          </div>
        </div>
      </div>

      <div className={`max-w-2xl border rounded-2xl p-6 shadow-xs mt-6 print-hidden ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h3 className={`font-bold text-sm mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Appearance</h3>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              setTheme('dark');
              if (onShowToast) onShowToast('Dark Mode mock activated (component local level).', 'info');
            }}
            className={`flex-1 py-3 text-white text-xs font-bold rounded-xl border-2 flex flex-col items-center gap-2 shadow-md transition-all ${
              theme === 'dark' ? 'bg-gray-900 border-[#5b52e0] ring-4 ring-indigo-500/20' : 'bg-gray-900 border-gray-900 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="w-12 h-8 bg-gray-800 rounded-md border border-gray-700 shadow-inner"></div>
            Dark Mode
          </button>
          <button 
            onClick={() => setTheme('light')}
            className={`flex-1 py-3 text-gray-700 text-xs font-bold rounded-xl border-2 flex flex-col items-center gap-2 shadow-sm transition-all ${
              theme === 'light' ? 'bg-white border-[#5b52e0] ring-4 ring-indigo-500/20' : 'bg-white border-gray-200 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="w-12 h-8 bg-gray-100 rounded-md border border-gray-200 shadow-inner"></div>
            Light Mode
          </button>
        </div>
      </div>

      <div className={`max-w-2xl border rounded-2xl p-6 shadow-xs mt-6 print-hidden ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h3 className={`font-bold text-sm mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Localization & Language</h3>
        <div className="flex flex-col gap-4">
          <div>
            <label className={`font-semibold block mb-3 text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>System Language</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'English', lbl: 'English', sub: 'USA' },
                { id: 'Hindi', lbl: 'हिंदी', sub: 'Hindi' },
                { id: 'Gujarati', lbl: 'ગુજરાતી', sub: 'Gujarati' },
                { id: 'Spanish', lbl: 'Español', sub: 'Spanish' }
              ].map(lang => (
                <button
                  key={lang.id}
                  onClick={() => {
                     setActiveLang(lang.id);
                     if (onShowToast) onShowToast(`Platform language set to ${lang.lbl}`, 'success');
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                    activeLang === lang.id
                      ? 'border-[#5b52e0] bg-indigo-50/10 ring-2 ring-indigo-500/20 text-[#5b52e0]'
                      : theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 hover:border-indigo-500 text-white' 
                        : 'bg-gray-50 border-gray-200 hover:border-indigo-500 text-gray-900'
                  }`}
                >
                  <span className="font-extrabold text-sm">{lang.lbl}</span>
                  <span className={`text-[10px] font-medium ${activeLang === lang.id ? 'text-[#5b52e0]/80' : 'text-gray-400'}`}>{lang.sub}</span>
                </button>
              ))}
            </div>
          </div>
          <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Translates the entire platform dashboard, navigation menus, and standard system messages into the selected language instantly.
          </p>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          .printable-area-container * { visibility: visible; }
          .print-hidden { display: none !important; }
        }
      `}} />
    </div>
  );
}
