import React, { useState, useEffect } from 'react';
import { IndianRupee, QrCode, FileText, Download, Printer, CheckCircle2, AlertCircle, Calendar, MessageSquare, Save, User as UserIcon, Send } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { logAuditActivity } from '../../lib/auditLogger';

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
    let email = '';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      email = session?.user?.email;
    } catch(e) {}

    if (!email) {
      email = localStorage.getItem('taxpro_user_email') || 'employee@taxpro.com';
    }
    
    let userObj = null;
    try {
      const { data } = await supabase.from('team_members').select('*').ilike('email', email).single();
      if (data) userObj = data;
    } catch (err) {}

    if (!userObj) {
      userObj = {
        id: `MBR-${email.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}`,
        name: localStorage.getItem('taxpro_user_fullname') || 'Staff Member',
        email: email,
        role: localStorage.getItem('taxpro_user_role') || 'Employee',
        department: localStorage.getItem('taxpro_user_department') || 'Taxation & Filing',
        status: 'Active'
      };
    }

    setCurrentUser(userObj);
    
    try {
      const upi = userObj.upi_id || localStorage.getItem(`taxpro_upi_${userObj.id}`) || localStorage.getItem(`taxpro_upi_${userObj.email}`);
      if (upi) setUpiId(upi);
      
      const allConfigs = JSON.parse(localStorage.getItem('taxpro_payroll_configs')) || {};
      if (allConfigs[userObj.id]) {
         setConfig(allConfigs[userObj.id]);
      } else if (userObj.salary) {
         setConfig({ salary: Number(String(userObj.salary).replace(/[^0-9.]/g, '')), bonus: 0 });
      }
      
      const allHistory = JSON.parse(localStorage.getItem('taxpro_payroll_history')) || [];
      setHistory(allHistory.filter(h => h.memberId === userObj.id || h.memberName === userObj.name));
    } catch (err) {}
  };

  const saveUpiConfig = async (e) => {
    if (e) e.preventDefault();
    if (!currentUser) return;
    const cleanUpi = upiId.trim();
    localStorage.setItem(`taxpro_upi_${currentUser.id}`, cleanUpi);
    if (currentUser.email) localStorage.setItem(`taxpro_upi_${currentUser.email}`, cleanUpi);

    try {
      await supabase.from('team_members').update({ upi_id: cleanUpi }).eq('id', currentUser.id);
    } catch (err) {}

    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
    if (onShowToast) onShowToast('✓ UPI ID saved! Your dynamic QR Code is ready for salary payouts.', 'success');
  };

  const getUpiQrUrl = (vpa, name, amount) => {
    if (!vpa || !vpa.trim()) return '';
    const cleanUpi = vpa.trim();
    const cleanName = (name || 'Staff Member').trim();
    const amtStr = amount && !isNaN(amount) && Number(amount) > 0 ? `&am=${Number(amount).toFixed(2)}` : '';
    const upiUri = `upi://pay?pa=${cleanUpi}&pn=${encodeURIComponent(cleanName)}${amtStr}&cu=INR&tn=${encodeURIComponent('Salary Disbursement')}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}&margin=8`;
  };

  // SEND SALARY REMINDER DIRECTLY TO ADMIN PRIVATE MESSAGE INBOX
  const handleSendReminder = async () => {
    if (isReminderSent || !currentUser) return;
    
    setIsReminderSent(true);

    try {
      // 1. Fetch Administrator and Super Admin team accounts
      let adminUsers = [];
      try {
        const { data } = await supabase
          .from('team_members')
          .select('id, name, email, role')
          .in('role', ['Admin', 'Super Admin', 'Administrator', 'Managing Partner']);
        if (data && data.length > 0) {
          adminUsers = data;
        }
      } catch (err) {}

      // Fallback admin contact if none retrieved
      if (adminUsers.length === 0) {
        adminUsers = [{
          id: 'admin-main',
          name: 'Administrator',
          email: 'admin@taxpro.com',
          role: 'Admin'
        }];
      }

      const currentMonthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const currentSalary = config.salary || 25000;
      const userUpi = upiId || 'Not configured';

      const reminderMessage = `⚡ [Salary Disbursal Due Reminder]\n` +
        `Hello Administrator,\n` +
        `This is a formal automated reminder regarding monthly salary clearance for ${currentMonthName}.\n\n` +
        `• Staff Member: ${currentUser.name}\n` +
        `• Role / Dept: ${currentUser.role || 'Staff'} • ${currentUser.department || 'Operations'}\n` +
        `• Base Monthly Salary: ₹${Number(currentSalary).toLocaleString('en-IN')}\n` +
        `• Payout UPI VPA: ${userUpi}\n\n` +
        `Please review and disburse via the Members Payment & Disbursal desk.\n` +
        `Thank you!`;

      const baseUrl = window.location.origin;

      // 2. Dispatch private chat message to all Practice Administrators
      await Promise.all(
        adminUsers.map(async (admin) => {
          if (admin.email) {
            try {
              await fetch(`${baseUrl}/api/chat/private`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sender_id: currentUser.email || 'employee@taxpro.com',
                  sender_name: currentUser.name || 'Staff Member',
                  receiver_id: admin.email,
                  receiver_name: admin.name || 'Administrator',
                  content: reminderMessage
                })
              });
            } catch(e) {
              console.warn('[Reminder send failed for admin]:', admin.email, e);
            }
          }
        })
      );

      // 3. Log security and activity audit
      logAuditActivity({
        action: 'SEND_SALARY_REMINDER',
        module: 'Our Payment & Private Chat',
        details: `Dispatched private message salary payment reminder to Administrator for "${currentUser.name}" (${currentMonthName})`,
        metadata: { employee: currentUser.name, salary: currentSalary, cycle: currentMonthName }
      });

      // 4. Trigger chat & notification update events
      window.dispatchEvent(new CustomEvent('taxpro_chat_updated'));
      window.dispatchEvent(new CustomEvent('taxpro_financial_updated'));

      if (onShowToast) {
        onShowToast(`✓ Salary payment reminder sent to Administrator Private Messages!`, 'success');
      }
    } catch (e) {
      console.error('Error sending reminder:', e);
      if (onShowToast) onShowToast('Reminder dispatched to Admin desk.', 'info');
    }
    
    setTimeout(() => {
      setIsReminderSent(false);
    }, 30000); // 30s cooldown
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
               <div className="flex items-center gap-2 mb-2">
                 <QrCode className="w-5 h-5 text-indigo-600" />
                 <h3 className="font-extrabold text-gray-900 leading-tight">Direct UPI Link & QR</h3>
               </div>
               <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                 Store your Virtual Payment Address (VPA). The system auto-generates your scannable dynamic QR code for Administrator payouts.
               </p>
               
               <form onSubmit={saveUpiConfig} className="space-y-3">
                 <div className="relative">
                   <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                     <span className="font-bold">@</span>
                   </div>
                   <input
                     type="text"
                     placeholder="e.g. employee@okaxis or 9876543210@paytm"
                     value={upiId}
                     onChange={e => setUpiId(e.target.value)}
                     className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 font-mono text-sm font-bold transition-all shadow-sm"
                   />
                 </div>

                 {/* Quick Handle Chips */}
                 <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                   <span className="text-gray-400 font-medium">Quick handles:</span>
                   {['@okaxis', '@ybl', '@oksbi', '@paytm', '@ibl', '@icici'].map((handle) => (
                     <button
                       key={handle}
                       type="button"
                       onClick={() => {
                         const prefix = upiId.split('@')[0] || (currentUser?.email ? currentUser.email.split('@')[0] : 'employee');
                         setUpiId(`${prefix}${handle}`);
                       }}
                       className="px-2 py-0.5 rounded-lg bg-gray-100 border border-gray-200 text-indigo-600 hover:bg-indigo-50 font-mono font-bold cursor-pointer transition-colors"
                     >
                       {handle}
                     </button>
                   ))}
                 </div>

                 {/* LIVE AUTO-GENERATED QR PREVIEW FOR STAFF */}
                 {upiId.trim() && (
                   <div className="bg-gradient-to-b from-indigo-50/70 to-purple-50/40 border border-indigo-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                     <span className="text-[10px] font-black text-indigo-800 uppercase tracking-wider mb-2">
                       ⚡ Your Live Payment QR Code
                     </span>
                     <div className="bg-white p-2 rounded-xl shadow-md">
                       <img 
                         src={getUpiQrUrl(upiId, currentUser?.name, config.salary || 0)} 
                         alt="Personal UPI QR" 
                         className="w-32 h-32 object-contain"
                       />
                     </div>
                     <span className="text-[10px] font-mono font-bold text-indigo-900 mt-2 break-all">
                       {upiId.trim()}
                     </span>
                     <span className="text-[9px] text-emerald-700 font-bold mt-1">
                       ✓ Ready for Salary Disbursement
                     </span>
                   </div>
                 )}

                 <button type="submit" className="w-full py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 font-black text-xs uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2 border border-indigo-200 border-b-4 active:border-b active:translate-y-[3px] cursor-pointer">
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
