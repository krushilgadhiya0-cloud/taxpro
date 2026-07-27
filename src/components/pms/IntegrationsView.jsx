import React, { useState, useEffect } from 'react';
import { Calendar, Mail, MessageCircle, Check, Info, Settings, X, Loader2 } from 'lucide-react';

export default function IntegrationsView({ onShowToast }) {
  const [activeModal, setActiveModal] = useState(null); // 'google', 'whatsapp', 'smtp'
  const [isTesting, setIsTesting] = useState(false);

  // States for configs
  const [smtpConfig, setSmtpConfig] = useState({ host: '', port: '587', user: '', pass: '', sender_email: '', target_email: '' });
  const [whatsappConfig, setWhatsappConfig] = useState({ block_token: '', phone_id: '', target_phone: '' });
  const [googleConfig, setGoogleConfig] = useState({ client_id: '', client_secret: '', refresh_token: '' });
  
  // Status definitions
  const [status, setStatus] = useState({ google: false, whatsapp: false, smtp: false });

  // Load from LocalStorage
  useEffect(() => {
    const s = localStorage.getItem('taxpro_smtp');
    const w = localStorage.getItem('taxpro_wa');
    const g = localStorage.getItem('taxpro_gc');
    if (s) { setSmtpConfig(JSON.parse(s)); setStatus(prev => ({...prev, smtp: true})); }
    if (w) { setWhatsappConfig(JSON.parse(w)); setStatus(prev => ({...prev, whatsapp: true})); }
    if (g) { setGoogleConfig(JSON.parse(g)); setStatus(prev => ({...prev, google: true})); }
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
    } else if (type === 'google') {
      payload = googleConfig;
      endpoint = '/api/integrations/test-calendar';
    }

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Server rejected the request.');
      }
      
      if(onShowToast) onShowToast(data.message, 'success');
      
      // Save locally
      if (type === 'smtp') { localStorage.setItem('taxpro_smtp', JSON.stringify(smtpConfig)); }
      if (type === 'whatsapp') { localStorage.setItem('taxpro_wa', JSON.stringify(whatsappConfig)); }
      if (type === 'google') { localStorage.setItem('taxpro_gc', JSON.stringify(googleConfig)); }

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
        <p className="text-sm text-gray-500 mt-1">Manage active system connections, external messaging nodes, and calendar synchronizations.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        
        {/* Google Calendar Card */}
        <div className="bg-white border border-gray-200 rounded-[20px] p-6 shadow-sm flex flex-col gap-5">
           <div className="flex justify-between items-start">
              <div className="flex gap-4 items-center">
                 <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-md flex-shrink-0">
                    <Calendar className="w-6 h-6 text-white" />
                 </div>
                 <div>
                    <h3 className="font-bold text-gray-900 text-lg">Google Calendar</h3>
                    <p className="text-gray-500 text-xs mt-0.5">Sync tasks with due dates to your calendar</p>
                 </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 ${status.google ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-100 text-gray-500 border-transparent'}`}>
                 {status.google && <Check className="w-3 h-3" />} {status.google ? 'Active' : 'Unlinked'}
              </div>
           </div>

           <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex gap-3 mt-1 items-start">
              <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-500 font-medium">Configure Google Cloud API OAuth credentials to sync deadlines instantly to the cloud.</p>
           </div>

           <div className="mt-auto pt-4">
              <button onClick={() => setActiveModal('google')} className="px-5 py-2.5 bg-[#1e1e2d] hover:bg-black text-white font-bold text-sm rounded-xl transition-colors">
                 {status.google ? 'Reconfigure Calendar' : 'Connect Calendar'}
              </button>
           </div>
        </div>

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
              <button onClick={() => setActiveModal('whatsapp')} className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors">
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
              <button onClick={() => setActiveModal('smtp')} className="w-full py-3 bg-[#1e1e2d] hover:bg-black text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors">
                 <Settings className="w-4 h-4" /> Setup Custom SMTP
              </button>
           </div>
        </div>

      </div>

      {/* Configuration Modals */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl relative animate-fade-in max-h-[90vh] overflow-y-auto">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-black">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-extrabold font-outfit mb-4">
               {activeModal === 'smtp' && 'SMTP Configuration'}
               {activeModal === 'whatsapp' && 'Meta Graph Config'}
               {activeModal === 'google' && 'Google OAuth Credentials'}
            </h3>
            
            <div className="flex flex-col gap-4 text-sm mt-6">
              
              {/* SMTP FORM */}
              {activeModal === 'smtp' && (
                <>
                   <div>
                     <label className="text-xs font-bold text-gray-500 mb-1 block">SMTP Host</label>
                     <input value={smtpConfig.host} onChange={e => setSmtpConfig({...smtpConfig, host: e.target.value})} type="text" className="w-full border rounded-xl px-3 py-2 outline-none" placeholder="smtp.gmail.com" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-xs font-bold text-gray-500 mb-1 block">Port</label>
                       <input value={smtpConfig.port} onChange={e => setSmtpConfig({...smtpConfig, port: e.target.value})} type="text" className="w-full border rounded-xl px-3 py-2 outline-none" placeholder="587" />
                     </div>
                     <div>
                       <label className="text-xs font-bold text-gray-500 mb-1 block">Username</label>
                       <input value={smtpConfig.user} onChange={e => setSmtpConfig({...smtpConfig, user: e.target.value})} type="text" className="w-full border rounded-xl px-3 py-2 outline-none" />
                     </div>
                   </div>
                   <div>
                     <label className="text-xs font-bold text-gray-500 mb-1 block">App Password / Secret</label>
                     <input value={smtpConfig.pass} onChange={e => setSmtpConfig({...smtpConfig, pass: e.target.value})} type="password" className="w-full border rounded-xl px-3 py-2 outline-none" />
                   </div>
                   <div>
                     <label className="text-xs font-bold text-gray-500 mb-1 block">Sender Email (From)</label>
                     <input value={smtpConfig.sender_email} onChange={e => setSmtpConfig({...smtpConfig, sender_email: e.target.value})} type="text" className="w-full border rounded-xl px-3 py-2 outline-none" placeholder="hello@firm.com" />
                   </div>
                   <div>
                     <label className="text-xs font-bold text-gray-500 mb-1 block">Test Email Address (To)</label>
                     <input value={smtpConfig.target_email} onChange={e => setSmtpConfig({...smtpConfig, target_email: e.target.value})} type="text" className="w-full border rounded-xl px-3 py-2 outline-none" />
                   </div>
                </>
              )}

              {/* WHATSAPP FORM */}
              {activeModal === 'whatsapp' && (
                <>
                   <div>
                     <label className="text-xs font-bold text-gray-500 mb-1 block">Meta Graph Permanent Access Token</label>
                     <textarea value={whatsappConfig.block_token} onChange={e => setWhatsappConfig({...whatsappConfig, block_token: e.target.value})} rows={3} className="w-full border rounded-xl px-3 py-2 outline-none font-mono text-xs" />
                   </div>
                   <div>
                     <label className="text-xs font-bold text-gray-500 mb-1 block">Business Phone Number ID</label>
                     <input value={whatsappConfig.phone_id} onChange={e => setWhatsappConfig({...whatsappConfig, phone_id: e.target.value})} type="text" className="w-full border rounded-xl px-3 py-2 outline-none font-mono" />
                   </div>
                   <div>
                     <label className="text-xs font-bold text-gray-500 mb-1 block">Test Recipient Phone (+Code)</label>
                     <input value={whatsappConfig.target_phone} onChange={e => setWhatsappConfig({...whatsappConfig, target_phone: e.target.value})} type="text" className="w-full border rounded-xl px-3 py-2 outline-none font-mono" placeholder="919876543210" />
                   </div>
                   <p className="text-[10px] text-emerald-600 bg-emerald-50 p-2 rounded-lg mt-2">
                     Testing the connection will dispatch a live WhatsApp template ping directly to the recipient phone you provide above. Standard Meta messaging charges may strictly apply natively!
                   </p>
                </>
              )}

              {/* GOOGLE CALENDAR FORM */}
              {activeModal === 'google' && (
                <>
                   <div>
                     <label className="text-xs font-bold text-gray-500 mb-1 block">GCP OAuth Client ID</label>
                     <input value={googleConfig.client_id} onChange={e => setGoogleConfig({...googleConfig, client_id: e.target.value})} type="text" className="w-full border rounded-xl px-3 py-2 outline-none font-mono" />
                   </div>
                   <div>
                     <label className="text-xs font-bold text-gray-500 mb-1 block">GCP Client Secret</label>
                     <input value={googleConfig.client_secret} onChange={e => setGoogleConfig({...googleConfig, client_secret: e.target.value})} type="password" className="w-full border rounded-xl px-3 py-2 outline-none font-mono" />
                   </div>
                   <div>
                     <label className="text-xs font-bold text-gray-500 mb-1 block">Authorized Refresh Token</label>
                     <input value={googleConfig.refresh_token} onChange={e => setGoogleConfig({...googleConfig, refresh_token: e.target.value})} type="password" className="w-full border rounded-xl px-3 py-2 outline-none font-mono" />
                   </div>
                   <p className="text-[10px] text-yellow-600 bg-yellow-50 p-2 rounded-lg mt-2">
                     Acquire these credentials via the Google Cloud Developer Console. Testing the connection will silently place a 1-hour dummy event block on the system calendar linked to this token.
                   </p>
                </>
              )}

              <button 
                onClick={() => handleTestAndSave(activeModal)}
                disabled={isTesting}
                className="mt-2 w-full py-3 bg-[#5b52e0] hover:bg-indigo-600 text-white font-bold text-sm rounded-xl flex items-center justify-center shadow-lg transition-all"
              >
                {isTesting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save & Send Test Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
