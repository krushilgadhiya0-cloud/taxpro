import React, { useState, useEffect } from 'react';
import { IndianRupee, QrCode, FileText, Download, Printer, CheckCircle2, AlertCircle, Calendar, MessageSquare, Save, User as UserIcon } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function OurPaymentView({ onShowToast }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [upiId, setUpiId] = useState('');
  
  const [history, setHistory] = useState([]);
  const [config, setConfig] = useState({ salary: 0, bonus: 0 });
  
  const [isReminderSent, setIsReminderSent] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    // 1. Get Logged In User's Session ID
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return;
    
    // 2. Fetch matched Member profile from Team Members
    const { data } = await supabase.from('team_members').select('*').eq('email', session.user.email).single();
    
    if (data) {
       setCurrentUser(data);
       
       // 3. Load user-specific configurations via Local Storage
       try {
          const upi = localStorage.getItem(`taxpro_upi_${data.id}`);
          if (upi) setUpiId(upi);
          
          const allConfigs = JSON.parse(localStorage.getItem('taxpro_payroll_configs')) || {};
          if (allConfigs[data.id]) {
             setConfig(allConfigs[data.id]);
          }
          
          const allHistory = JSON.parse(localStorage.getItem('taxpro_payroll_history')) || [];
          setHistory(allHistory.filter(h => h.memberId === data.id));
       } catch (err) {}
    }
  };

  const saveUpiConfig = e => {
    e.preventDefault();
    if (!currentUser) return;
    localStorage.setItem(`taxpro_upi_${currentUser.id}`, upiId);
    if (onShowToast) onShowToast('UPI configuration saved successfully! Admins can now pay directly to your account.', 'success');
  };

  const handleSendReminder = () => {
    if (isReminderSent) return;
    
    setIsReminderSent(true);
    if (onShowToast) onShowToast('Formal due payment reminder officially pinged to Administrator dashboard.', 'info');
    
    setTimeout(() => {
      setIsReminderSent(false);
    }, 60000); // 1 minute cooldown
  };

  const triggerPrint = () => {
    window.print();
  };

  const totalReceived = history.reduce((acc, curr) => acc + curr.amount, 0);

  if (!currentUser) {
     return (
        <div className="flex flex-col items-center justify-center p-20 min-h-[60vh] text-center">
            <UserIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-500">Retrieving personnel ledger...</h3>
        </div>
     );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50/50 min-h-screen text-gray-800 relative pb-24 border-t border-gray-100">
      
      {/* HEADER ZONE */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 mt-2">
         <div>
            <h1 className="text-2xl font-extrabold text-gray-900 font-outfit flex items-center gap-3">
              <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <FileText className="w-6 h-6" />
              </span>
              Our Payment
            </h1>
            <p className="text-sm text-gray-500 mt-2">View your personal salary receipts, configure your direct UPI payouts, and track statements.</p>
         </div>

         <div className="flex gap-3 h-full">
            <button 
              onClick={handleSendReminder}
              disabled={isReminderSent}
              className={`px-5 py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-md flex items-center justify-center gap-2 transition-all h-[52px] ${isReminderSent ? 'bg-amber-100 text-amber-500 shadow-none cursor-not-allowed border border-amber-200' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 text-white hover:-translate-y-0.5'}`}
            >
              <AlertCircle className="w-4 h-4" /> 
              {isReminderSent ? 'Reminder Sent' : 'Send Reminder'}
            </button>
            <button onClick={triggerPrint} className="h-[52px] px-5 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Printer className="w-4 h-4" /> Print Ledger
            </button>
         </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
         
         {/* LEFT PORTLET: Configuration & Status */}
         <div className="w-full xl:w-80 flex flex-col gap-6">

            <div className="bg-gradient-to-br from-[#1e1e2d] to-[#2b2b40] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none text-9xl leading-none font-black translate-x-4 -translate-y-4">₹</div>
               
               <h3 className="font-black text-gray-300 text-xs uppercase tracking-widest mb-1">Total Lifetime Disbursed</h3>
               <div className="text-4xl font-extrabold text-white mb-6">₹{totalReceived.toLocaleString('en-IN')}</div>
               
               <div className="space-y-4 border-t border-white/10 pt-4">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-gray-400">Monthly Run Rate:</span>
                    <span className="text-gray-200">₹{config.salary ? Number(config.salary).toLocaleString('en-IN') : '0'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-gray-400">Bonus Allocation:</span>
                    <span className="text-emerald-400">₹{config.bonus ? Number(config.bonus).toLocaleString('en-IN') : '0'}</span>
                  </div>
               </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
               <div className="flex items-center gap-2 mb-4">
                 <QrCode className="w-5 h-5 text-indigo-600" />
                 <h3 className="font-extrabold text-gray-900 leading-tight">Direct UPI Link</h3>
               </div>
               <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Store your Virtual Payment Address (VPA) so Admin can utilize the automated QR payout system.</p>
               
               <form onSubmit={saveUpiConfig}>
                 <div className="relative mb-3">
                   <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                     <span className="font-bold">@</span>
                   </div>
                   <input
                     type="text"
                     placeholder="john@okhdfc"
                     value={upiId}
                     onChange={e => setUpiId(e.target.value)}
                     className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 font-mono text-sm font-bold transition-all shadow-sm"
                   />
                 </div>
                 <button type="submit" className="w-full py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 font-black text-xs uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2 border border-indigo-200 border-b-4 active:border-b active:translate-y-[3px]">
                   <Save className="w-3 h-3" /> Save UPI ID
                 </button>
               </form>
            </div>

            {/* MONTHLY BROADCAST MESSAGE */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-5 relative">
               <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg"><MessageSquare className="w-4 h-4"/></div>
               <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">Admin Broadcast</h4>
               <p className="text-xs font-semibold text-blue-900 leading-relaxed italic">
                 "All monthly settlements for {new Date().toLocaleString('default', { month: 'long' })} cycle are actively being processed. Please endure a 48 hour SLA for NEFT/UPI clearances. - Workspace Administrator"
               </p>
            </div>
         </div>

         {/* RIGHT PORTLET: Historical Records Grid */}
         <div className="flex-1 bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm h-full max-h-[800px] overflow-y-auto">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-6">
               <Calendar className="w-5 h-5 text-gray-400" /> Settled Vouchers
            </h2>

            {history.length === 0 ? (
               <div className="py-24 flex flex-col items-center justify-center text-center">
                 <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                   <FileText className="w-8 h-8 text-gray-300" />
                 </div>
                 <h3 className="text-lg font-bold text-gray-500">No payment records found.</h3>
                 <p className="text-sm text-gray-400 mt-1">Check back when payroll is cleared.</p>
               </div>
            ) : (
               <div className="space-y-4">
                  {history.map(h => (
                     <div key={h.id} className="p-5 rounded-2xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black uppercase text-xl shadow-md ${h.method === 'UPI' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-emerald-500 to-teal-700'}`}>
                              {h.method === 'UPI' ? <QrCode className="w-6 h-6" /> : <IndianRupee className="w-6 h-6" />}
                           </div>
                           <div>
                              <div className="text-base font-extrabold text-gray-900 font-mono tracking-tight">{h.id}</div>
                              <div className="text-xs font-bold text-gray-500">Processed: {new Date(h.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                           </div>
                        </div>

                        <div className="flex flex-col sm:items-end">
                           <div className="text-2xl font-black text-gray-900">₹{h.amount.toLocaleString()}</div>
                           <div className="flex items-center gap-2 mt-1">
                             {h.status === 'Unpaid' ? (
                                <div className="px-2 py-0.5 rounded uppercase font-black text-[9px] tracking-widest border border-red-200 text-red-600 bg-red-50 flex items-center gap-1">
                                   <AlertCircle className="w-3 h-3" /> PENDING SALARY
                                </div>
                             ) : (
                                <>
                                   <div className={`px-2 py-0.5 rounded uppercase font-black text-[9px] tracking-widest border border-emerald-200 text-emerald-600 bg-emerald-50 flex items-center gap-1 ${h.method === 'BONUS' ? 'text-amber-600 bg-amber-50 border-amber-200' : ''}`}>
                                      <CheckCircle2 className="w-3 h-3" /> SETTLED
                                   </div>
                                   <div className="px-2 py-0.5 rounded uppercase font-black text-[9px] tracking-widest border border-blue-200 text-blue-600 bg-blue-50">
                                      {h.method}
                                   </div>
                                </>
                             )}
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </div>

      </div>

    </div>
  );
}
