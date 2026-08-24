import React, { useState, useEffect } from 'react';
import { Mail, MessageCircle, Check, Info, Settings, X, Loader2 } from 'lucide-react';
import { logAuditActivity } from '../../lib/auditLogger';

export default function IntegrationsView({ onShowToast }) {
  const [activeModal, setActiveModal] = useState(null); // 'whatsapp', 'smtp'
  const [isTesting, setIsTesting] = useState(false);

  // States for configs
  const [smtpConfig, setSmtpConfig] = useState({ host: '', port: '587', user: '', pass: '', sender_email: '', target_email: '' });
  const [whatsappConfig, setWhatsappConfig] = useState({ block_token: '', phone_id: '', target_phone: '' });
  
  // Status definitions
  const [status, setStatus] = useState({ whatsapp: false, smtp: false });

  // Load from SQL Backend with LocalStorage fallback
  useEffect(() => {
    const fetchSqlConfig = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const res = await fetch(`${baseUrl}/api/integrations/config`);
        const data = await res.json();
        if (data.success && data.configs) {
          if (data.configs.smtp && data.configs.smtp.config) {
            setSmtpConfig(data.configs.smtp.config);
            setStatus(prev => ({ ...prev, smtp: data.configs.smtp.isActive }));
          }
          if (data.configs.whatsapp && data.configs.whatsapp.config) {
            setWhatsappConfig(data.configs.whatsapp.config);
            setStatus(prev => ({ ...prev, whatsapp: data.configs.whatsapp.isActive }));
          }
          return;
        }
      } catch (err) {
        console.warn('[Integrations] Falling back to local storage cache:', err.message);
      }

      // Fallback
      const s = localStorage.getItem('taxpro_smtp');
      const w = localStorage.getItem('taxpro_wa');
      if (s) { setSmtpConfig(JSON.parse(s)); setStatus(prev => ({...prev, smtp: true})); }
      if (w) { setWhatsappConfig(JSON.parse(w)); setStatus(prev => ({...prev, whatsapp: true})); }
    };

    fetchSqlConfig();
  }, []);

  const handleTestAndSave = async (type) => {
    setIsTesting(true);
    let payload = {};
    let endpoint = '';
    
    if (type === 'smtp') {
      payload = smtpConfig;
      endpoint = '/api/integrations/test-smtp';
    } else if (type === 'whatsapp') {
      payload = whatsappConfig;
      endpoint = '/api/integrations/test-whatsapp';
    }

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Server rejected the request.');
      }
      
      if(onShowToast) onShowToast(data.message || `Saved to PostgreSQL SQL Database!`, 'success');
      
      // Save locally as cache
      if (type === 'smtp') { localStorage.setItem('taxpro_smtp', JSON.stringify(smtpConfig)); }
      if (type === 'whatsapp') { localStorage.setItem('taxpro_wa', JSON.stringify(whatsappConfig)); }

      logAuditActivity({
        action: 'UPDATE_INTEGRATION',
        module: 'Integrations',
        details: `Connected & verified ${type.toUpperCase()} integration node in system`,
        metadata: { integrationType: type }
      });

      setStatus(prev => ({...prev, [type]: true}));
      setActiveModal(null);
      
    } catch (error) {
       if(onShowToast) onShowToast(error.message, 'error');
    } finally {
       setIsTesting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f9fafb] min-h-screen text-gray-800 relative">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold font-outfit text-gray-900">Integrations</h1>
        <p className="text-sm text-gray-500 mt-1">Manage active system connections, custom email SMTP servers, and WhatsApp Business API messaging nodes.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        
        {/* WhatsApp Business Card */}
        <div className="bg-white border border-gray-200 rounded-[20px] p-6 shadow-sm flex flex-col gap-5">
           <div className="flex justify-between items-start">
              <div className="flex gap-4 items-center">
                 <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center shadow-md flex-shrink-0">
                    <MessageCircle className="w-6 h-6 text-white" />
                 </div>
                 <div>
                    <h3 className="font-bold text-gray-900 text-lg">WhatsApp Business</h3>
                    <p className="text-gray-500 text-xs mt-0.5">Send task alerts via your own WhatsApp channel</p>
                 </div>
              </div>
              <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 border ${status.whatsapp ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-100 text-gray-400 border-transparent'}`}>
                 {status.whatsapp && <Check className="w-3 h-3" />} {status.whatsapp ? 'Active' : 'Default'}
              </div>
           </div>

           <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex gap-3 mt-1 items-start">
              <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                 {status.whatsapp ? 'Live mapped via Graph API.' : 'Currently using default TaxPro WhatsApp channel. Add your own WhatsApp Business API credentials to send alerts from your number.'}
              </p>
           </div>

           <div className="flex flex-col gap-3 font-medium text-sm text-gray-600 mt-2">
             <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#25D366]" /> Task assignment notifications</div>
             <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#25D366]" /> Due date reminders</div>
             <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#25D366]" /> Status update alerts</div>
             <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#25D366]" /> Approval request notifications</div>
           </div>

           <div className="mt-4">
              <button onClick={() => setActiveModal('whatsapp')} className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer">
                 <Settings className="w-4 h-4" /> Setup Custom WhatsApp
              </button>
           </div>
        </div>

        {/* Email SMTP Card */}
        <div className="bg-white border border-gray-200 rounded-[20px] p-6 shadow-sm flex flex-col gap-5">
           <div className="flex justify-between items-start">
              <div className="flex gap-4 items-center">
                 <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-md flex-shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                 </div>
                 <div>
                    <h3 className="font-bold text-gray-900 text-lg">Email (SMTP)</h3>
                    <p className="text-gray-500 text-xs mt-0.5">Send task alerts via your own email server</p>
                 </div>
              </div>
              <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 border ${status.smtp ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-100 text-gray-400 border-transparent'}`}>
                 {status.smtp && <Check className="w-3 h-3" />} {status.smtp ? 'Active' : 'Default'}
              </div>
           </div>

           <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex gap-3 mt-1 items-start">
              <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                {status.smtp ? 'Rerouting messages safely via SMTP node.' : 'Currently using default TaxPro email service. Add your own SMTP server to send alerts from your domain.'}
              </p>
           </div>

           <div className="flex flex-col gap-3 font-medium text-sm text-gray-600 mt-2">
             <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#25D366]" /> Send from your own email domain</div>
             <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#25D366]" /> Custom branding in emails</div>
             <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#25D366]" /> Full delivery control</div>
           </div>

           <div className="mt-4">
              <button onClick={() => setActiveModal('smtp')} className="w-full py-3 bg-[#1e1e2d] hover:bg-black text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer">
                 <Settings className="w-4 h-4" /> Setup Custom SMTP
              </button>
           </div>
        </div>

      </div>

      {/* Configuration Modals */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          
          {/* SMTP Custom Modal */}
          {activeModal === 'smtp' && (
            <div className="bg-white border-[2.5px] border-[#44b595] rounded-3xl p-6 w-full max-w-xl shadow-2xl relative animate-fade-in">
               
               <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-4 items-center">
                     <div className="w-14 h-14 rounded-2xl bg-[#da3733] flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Mail className="w-7 h-7 text-white" />
                     </div>
                     <div>
                        <h3 className="font-extrabold text-[#202124] text-xl">Email (SMTP)</h3>
                        <p className="text-[#80868b] text-sm mt-0.5">Send task alerts via your own email server</p>
                     </div>
                  </div>
                  <div className="px-3 py-1 bg-[#e6f4ea] text-[#137333] rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                     <Check className="w-3.5 h-3.5" /> Custom
                  </div>
               </div>

               <div className="flex flex-col gap-5 mt-2">
                 <div className="flex gap-4">
                   <div className="flex-1">
                     <label className="text-sm font-bold text-[#3c4043] mb-1.5 block">SMTP Host</label>
                     <input value={smtpConfig.host} onChange={e => setSmtpConfig({...smtpConfig, host: e.target.value})} type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none text-[#3c4043] bg-white focus:border-[#44b595] transition-colors" placeholder="smtp.gmail.com" />
                   </div>
                   <div className="w-28">
                     <label className="text-sm font-bold text-[#3c4043] mb-1.5 block">Port</label>
                     <input value={smtpConfig.port} onChange={e => setSmtpConfig({...smtpConfig, port: e.target.value})} type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none text-[#3c4043] bg-white focus:border-[#44b595] transition-colors" placeholder="587" />
                   </div>
                 </div>

                 <div>
                   <label className="text-sm font-bold text-[#3c4043] mb-1.5 block">SMTP Username / Email</label>
                   <input value={smtpConfig.user} onChange={e => setSmtpConfig({...smtpConfig, user: e.target.value})} type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none text-[#3c4043] bg-white focus:border-[#44b595] transition-colors" placeholder="you@domain.com" />
                 </div>

                 <div>
                   <label className="text-sm font-bold text-[#3c4043] mb-1.5 block">SMTP Password</label>
                   <div className="relative">
                     <input value={smtpConfig.pass} onChange={e => setSmtpConfig({...smtpConfig, pass: e.target.value})} type="password" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none text-[#3c4043] bg-white focus:border-[#44b595] transition-colors pr-10" placeholder="App password" />
                     <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                     </div>
                   </div>
                 </div>

                 <div className="flex gap-4 items-end">
                   <div className="flex-1">
                     <label className="text-sm font-bold text-[#3c4043] mb-1.5 block">From Address</label>
                     <input value={smtpConfig.sender_email} onChange={e => setSmtpConfig({...smtpConfig, sender_email: e.target.value})} type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none text-[#3c4043] bg-white focus:border-[#44b595] transition-colors" placeholder="noreply@yourdomain.com" />
                   </div>
                   <div className="flex-1">
                     <label className="text-sm font-bold text-[#3c4043] mb-1.5 block">Target Verification Email</label>
                     <input value={smtpConfig.target_email || ''} onChange={e => setSmtpConfig({...smtpConfig, target_email: e.target.value})} type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none text-[#3c4043] bg-white focus:border-[#44b595] transition-colors" placeholder="Send test ping to..." />
                   </div>
                   <div className="flex items-center gap-2 mb-3 px-2">
                     <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#44b595] focus:ring-[#44b595]" />
                     <label className="text-sm font-bold text-[#3c4043]">SSL</label>
                   </div>
                 </div>
               </div>

               <div className="flex items-center gap-3 mt-8">
                 <button onClick={() => handleTestAndSave('smtp')} disabled={isTesting} className="flex-1 bg-[#6ba392] hover:bg-[#5a8c7b] text-white font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2 transition-colors cursor-pointer">
                   {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save</>}
                 </button>
                 <button onClick={() => setActiveModal(null)} className="px-6 py-3 border border-gray-200 text-[#5f6368] font-bold rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                   Cancel
                 </button>
               </div>
            </div>
          )}

          {/* WhatsApp Custom Modal */}
          {activeModal === 'whatsapp' && (
            <div className="bg-white border-[2.5px] border-[#44b595] rounded-3xl p-6 w-full max-w-xl shadow-2xl relative animate-fade-in max-h-[90vh] overflow-y-auto">
               
               <div className="flex justify-between items-start mb-6 w-full pr-6">
                  <div className="flex gap-4 items-center">
                     <div className="w-14 h-14 rounded-2xl bg-[#25d366] flex items-center justify-center flex-shrink-0 shadow-xs">
                        <MessageCircle className="w-7 h-7 text-white" />
                     </div>
                     <div>
                        <h3 className="font-extrabold text-[#202124] text-xl">WhatsApp Business</h3>
                        <p className="text-[#80868b] text-sm mt-0.5">Send task alerts via your own WhatsApp channel</p>
                     </div>
                  </div>
                  <div className="px-3 py-1 bg-[#e6f4ea] text-[#137333] rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm absolute right-6 top-6">
                     <Check className="w-3.5 h-3.5" /> Default
                  </div>
               </div>

               <div className="flex flex-col gap-5 mt-2">
                 <div>
                   <label className="text-sm font-bold text-[#3c4043] mb-1.5 flex items-center gap-2">
                     Channel Name 
                     <span className="text-[10px] font-bold text-[#5f6368] bg-[#f1f3f4] px-2 py-0.5 rounded-full flex items-center gap-1"><Info className="w-3 h-3" /> Verify first</span>
                   </label>
                   <input type="text" readOnly className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none text-[#80868b] bg-[#f8f9fa]" placeholder="Auto-filled from Meta after verification" />
                 </div>

                 <div>
                   <label className="text-sm font-bold text-[#3c4043] mb-1.5 block">Phone Number ID</label>
                   <input value={whatsappConfig.phone_id} onChange={e => setWhatsappConfig({...whatsappConfig, phone_id: e.target.value})} type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none text-[#3c4043] bg-white focus:border-[#44b595] transition-colors" placeholder="From Meta Business Suite" />
                 </div>

                 <div>
                   <label className="text-sm font-bold text-[#3c4043] mb-1.5 block">WABA ID</label>
                   <input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none text-[#3c4043] bg-white focus:border-[#44b595] transition-colors" placeholder="WhatsApp Business Account ID" />
                 </div>

                 <div>
                   <label className="text-sm font-bold text-[#3c4043] mb-1.5 block">Access Token</label>
                   <div className="relative">
                     <input value={whatsappConfig.block_token} onChange={e => setWhatsappConfig({...whatsappConfig, block_token: e.target.value})} type="password" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none text-[#3c4043] bg-white focus:border-[#44b595] transition-colors pr-10" placeholder="Permanent access token" />
                     <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                     </div>
                   </div>
                 </div>

                 <div>
                   <label className="text-sm font-bold text-[#3c4043] mb-1.5 flex items-center gap-1">API Host <span className="text-gray-400 font-medium">(optional)</span></label>
                   <input type="text" defaultValue="https://graph.facebook.com" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none text-[#3c4043] bg-white focus:border-[#44b595] transition-colors" />
                   <p className="text-xs text-[#80868b] font-medium mt-1.5 leading-relaxed">Leave blank to use Meta directly. Only change this if you have your own custom API endpoint.</p>
                 </div>

                 <div>
                   <label className="text-sm font-bold text-[#3c4043] mb-1.5 flex items-center gap-1">Meta API Version <span className="text-gray-400 font-medium">(optional)</span></label>
                   <input type="text" defaultValue="v21.0" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none text-[#3c4043] bg-white focus:border-[#44b595] transition-colors" />
                 </div>

                 <div>
                   <label className="text-sm font-bold text-[#3c4043] mb-1.5 flex items-center gap-2">
                     Target Number 
                     <span className="text-[10px] font-bold text-white bg-indigo-500 px-2 flex items-center rounded-full leading-none py-1">Required for Testing</span>
                   </label>
                   <input value={whatsappConfig.target_phone || ''} onChange={e => setWhatsappConfig({...whatsappConfig, target_phone: e.target.value})} type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none text-[#3c4043] bg-white border-dashed focus:border-[#44b595] border-indigo-200" placeholder="+1234567890 (Include country code)" />
                 </div>
               </div>

               <div className="flex items-center gap-3 mt-8">
                 <button onClick={() => handleTestAndSave('whatsapp')} disabled={isTesting} className="flex-1 bg-[#6ba392] hover:bg-[#5a8c7b] text-white font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2 transition-colors cursor-pointer">
                   {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Connect</>}
                 </button>
                 <button onClick={() => setActiveModal(null)} className="px-6 py-3 border border-gray-200 text-[#5f6368] font-bold rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                   Cancel
                 </button>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
