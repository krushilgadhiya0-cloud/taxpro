import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, CheckCircle2, Mail, Users, ArrowRight, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function BulkMessagesView({ onShowToast }) {
  const [template, setTemplate] = useState('gst_reminder');
  const [message, setMessage] = useState('Dear Client,\n\nPlease provide your June GST purchase & sales data for return filing at your earliest convenience to avoid penalty.\n\nThank you!');
  
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // WhatsApp Queue State
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [queueStatus, setQueueStatus] = useState({});

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setIsLoading(true);
    const { data, error } = await import('../../lib/supabaseClient').then(m => m.supabase.from('clients').select('name, email, phone'));
    if (!error && data) {
       setClients(data);
    }
    setIsLoading(false);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (clients.length === 0) {
      if (onShowToast) onShowToast('No clients registered in the database to broadcast to.', 'warning');
      return;
    }

    // 1. Dispatch Bulk Email via Mailto BCC Protocol
    const emails = clients.map(c => c.email).filter(Boolean);
    if (emails.length > 0) {
       const bcc = emails.join(',');
       const subject = template === 'gst_reminder' ? 'URGENT: GST Return Filing Reminder' :
                       template === 'itr_notice' ? 'NOTICE: Income Tax Audit Due Date' : 'Invoice Statement Notification';
       
       const mailtoLink = `mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
       window.open(mailtoLink, '_blank');
       if (onShowToast) onShowToast(`Bulk Email Draft initialized to ${emails.length} clients!`, 'success');
    }

    // 2. Open WhatsApp Web Dispatch Queue
    setIsQueueOpen(true);
  };

  const triggerWhatsApp = (clientKey, phoneStr) => {
     if (!phoneStr) return;
     const cleanPhone = phoneStr.replace(/\D/g, ''); 
     // Add country code 91 if it's purely 10 digits (Standard Indian format assumption)
     const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
     
     window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`, '_blank');
     
     // Mark visually as dispatched
     setQueueStatus(prev => ({ ...prev, [clientKey]: true }));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f3f4f6] min-h-screen text-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold font-outfit text-[#1e1e2d]">Bulk Messaging Center</h1>
          <p className="text-xs text-gray-500 mt-1">Broadcast automated WhatsApp and Email compliance reminders to your clients.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl text-indigo-700 font-bold text-xs shadow-sm">
          <Users className="w-4 h-4" /> {isLoading ? 'Syncing...' : `${clients.length} Clients Synced`}
        </div>
      </div>

      <div className="max-w-2xl bg-white border border-gray-200 rounded-2xl p-6 shadow-xs relative">
        <form onSubmit={handleSend} className="flex flex-col gap-4 text-xs">
          <div>
            <label className="font-semibold text-gray-700 block mb-1">Select Message Template</label>
            <select 
              value={template} 
              onChange={e => setTemplate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-indigo-500"
            >
              <option value="gst_reminder">GST 3B Return Reminder</option>
              <option value="itr_notice">Income Tax Audit Due Date Notice</option>
              <option value="fee_reminder">Outstanding Fee Invoice Reminder</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-gray-700 block mb-1">Broadcast Message Body</label>
            <textarea 
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-indigo-500 text-xs"
            />
          </div>

          <button type="submit" disabled={isLoading || clients.length === 0} className="w-full py-3 bg-[#5b52e0] text-white font-bold rounded-xl hover:bg-[#4c44cf] flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
            <Send className="w-4 h-4" /> Execute Broadcast Protocol
          </button>
        </form>
      </div>

      {/* WhatsApp Dispatch Queue Overlay */}
      {isQueueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 relative backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg p-6 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
               <div>
                 <h3 className="text-lg font-black font-outfit text-gray-900 flex items-center gap-2 text-emerald-600">
                   <MessageSquare className="w-5 h-5 fill-emerald-600 text-emerald-600" /> WhatsApp Blast Queue
                 </h3>
                 <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">Manual API Bypass Mode</p>
               </div>
               <button onClick={() => setIsQueueOpen(false)} className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-4">
               {clients.map((c, i) => {
                  const hasDispatched = queueStatus[c.name + i];
                  const canSend = !!c.phone;
                  return (
                    <div key={i} className={`flex items-center justify-between p-3 border rounded-xl transition-all ${
                      hasDispatched ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-200 shadow-sm'
                    }`}>
                      <div className="flex flex-col">
                        <span className={`font-bold text-sm ${hasDispatched ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{c.name}</span>
                        <span className="text-[10px] font-mono text-gray-500 mt-0.5">{c.phone || 'No phone recorded'}</span>
                      </div>
                      
                      {canSend ? (
                        <button 
                          onClick={() => triggerWhatsApp(c.name + i, c.phone)}
                          disabled={hasDispatched}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                            hasDispatched 
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                              : 'bg-emerald-500 hover:bg-emerald-600 text-white hover:scale-105 hover:shadow-md'
                          }`}
                        >
                          {hasDispatched ? <><CheckCircle2 className="w-3.5 h-3.5"/> Sent</> : <><ArrowRight className="w-3.5 h-3.5" /> Dispatch</>}
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-500 px-2 py-1 bg-rose-50 rounded">Missing Data</span>
                      )}
                    </div>
                  );
               })}
            </div>
            
            <div className="pt-3 border-t border-gray-100 text-center">
               <p className="text-[10px] font-bold text-gray-400">Due to Meta anti-spam policies, you must dispatch each message context manually via this UI to avoid permanent ban.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
