import React, { useState, useEffect } from 'react';
import { IndianRupee, Users, QrCode, Search, ChevronRight, CheckCircle2, CloudLightning, Download, Printer, User, Building, Smartphone, FileText, Send, Calendar, BadgeIndianRupee, History, AlertCircle, Gift } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function MembersPaymentView({ onShowToast }) {
  const [members, setMembers] = useState([]);
  const [payrollConfigs, setPayrollConfigs] = useState({});
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedMember, setSelectedMember] = useState(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI'); // 'UPI' or 'Cash'
  const [activePayId, setActivePayId] = useState(null);

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configForm, setConfigForm] = useState({ salary: '', bonus: '' });

  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [bonusForm, setBonusForm] = useState({ amount: '', description: '' });

  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
  const [extraForm, setExtraForm] = useState({ amount: '', description: '' });

  const [ledgerYear, setLedgerYear] = useState('All');
  const [ledgerType, setLedgerType] = useState('All');
  const [memberStatusFilter, setMemberStatusFilter] = useState('Active');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 1. Fetch team members from cloud
    const { data } = await supabase.from('team_members').select('*');
    if (data) {
       setMembers(data);
    }
    
    // 2. Load configs and history from Local Storage
    try {
       const configs = JSON.parse(localStorage.getItem('taxpro_payroll_configs')) || {};
       setPayrollConfigs(configs);
       
       let history = JSON.parse(localStorage.getItem('taxpro_payroll_history')) || [];
       let historyModified = false;
       const currentMonthKey = new Date().toISOString().substring(0, 7); // e.g. "2026-07"

        if (data) {
           data.forEach(m => {
               const c = configs[m.id];
               if (c && c.salary && Number(c.salary) > 0) {
                   const hasFound = history.some(h => 
                       h.memberId === m.id && 
                       h.description === 'Monthly Salary Disbursement' &&
                       h.date.startsWith(currentMonthKey)
                   );
                   if (!hasFound) {
                       history.push({
                           id: `DUE-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                           memberId: m.id,
                           memberName: m.name,
                           amount: Number(c.salary),
                           method: 'Pending',
                           description: 'Monthly Salary Disbursement',
                           date: new Date().toISOString(),
                           status: 'Unpaid'
                       });
                       historyModified = true;
                   }
               }
           });
       }

       if (historyModified) {
           history.sort((a,b) => new Date(b.date) - new Date(a.date));
           localStorage.setItem('taxpro_payroll_history', JSON.stringify(history));
       }
       setPaymentHistory(history);
    } catch(e) {}
  };

  const saveConfig = (memberId, configData) => {
    const updated = { ...payrollConfigs, [memberId]: configData };
    setPayrollConfigs(updated);
    localStorage.setItem('taxpro_payroll_configs', JSON.stringify(updated));
    if (onShowToast) onShowToast('Salary configuration updated successfully.', 'success');
    setIsConfigModalOpen(false);
    fetchData();
  };

  const handlePay = async () => {
    if (!payAmount || isNaN(payAmount) || Number(payAmount) <= 0) {
       if (onShowToast) onShowToast('Please enter a valid amount.', 'error');
       return;
    }

    let updatedHistory = [...paymentHistory];

    let paidItem = null;
    if (activePayId) {
        const idx = updatedHistory.findIndex(h => h.id === activePayId);
        if (idx > -1) {
            updatedHistory[idx] = {
                ...updatedHistory[idx],
                amount: Number(payAmount),
                method: payMethod,
                date: new Date().toISOString(),
                status: 'Paid'
            };
            paidItem = updatedHistory[idx];
        }
    } else {
        const newPayment = {
           id: `PAY-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
           memberId: selectedMember.id,
           memberName: selectedMember.name,
           amount: Number(payAmount),
           method: payMethod,
           description: 'Monthly Salary Disbursement',
           date: new Date().toISOString(),
           status: 'Paid'
        };
        updatedHistory = [newPayment, ...updatedHistory];
        paidItem = newPayment;
    }

    setPaymentHistory(updatedHistory);
    localStorage.setItem('taxpro_payroll_history', JSON.stringify(updatedHistory));

    // Synchronize to Supabase payments table
    try {
      if (paidItem) {
        await supabase.from('payments').insert([{
          id: paidItem.id,
          recipient: `${paidItem.memberName || selectedMember.name} (Salary)`,
          amount: Number(payAmount),
          category: paidItem.description || 'Staff Salary & Payroll',
          method: payMethod,
          status: 'Success'
        }]);
      }
    } catch (err) {}

    window.dispatchEvent(new CustomEvent('taxpro_financial_updated'));
    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
    
    if (onShowToast) onShowToast(`Payment of ₹${payAmount} marked as Paid via ${payMethod} & auto-synced with Calendar!`, 'success');
    setIsPayModalOpen(false);
    setPayAmount('');
    setActivePayId(null);
  };

  const handleCreateExtra = () => {
    if (!extraForm.amount || isNaN(extraForm.amount) || Number(extraForm.amount) <= 0) {
       if (onShowToast) onShowToast('Please enter a valid amount.', 'error');
       return;
    }
    const newHistory = {
       id: `EXTRA-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
       memberId: selectedMember.id,
       memberName: selectedMember.name,
       amount: Number(extraForm.amount),
       method: 'Pending',
       description: extraForm.description.trim() || 'Extra Payment',
       date: new Date().toISOString(),
       status: 'Unpaid'
    };
    const updated = [newHistory, ...paymentHistory];
    updated.sort((a,b) => new Date(b.date) - new Date(a.date));
    setPaymentHistory(updated);
    localStorage.setItem('taxpro_payroll_history', JSON.stringify(updated));
    if (onShowToast) onShowToast('Extra Payment Voucher created in the ledger.', 'success');
    setIsExtraModalOpen(false);
    setExtraForm({ amount: '', description: '' });
  };

  const handleCreateBonus = () => {
    if (!bonusForm.amount || isNaN(bonusForm.amount) || Number(bonusForm.amount) <= 0) {
       if (onShowToast) onShowToast('Please enter a valid bonus amount.', 'error');
       return;
    }
    const newHistory = {
       id: `BNS-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
       memberId: selectedMember.id,
       memberName: selectedMember.name,
       amount: Number(bonusForm.amount),
       method: 'Pending',
       description: bonusForm.description.trim() || 'Performance Bonus',
       date: new Date().toISOString(),
       status: 'Unpaid'
    };
    const updated = [newHistory, ...paymentHistory];
    updated.sort((a,b) => new Date(b.date) - new Date(a.date));
    setPaymentHistory(updated);
    localStorage.setItem('taxpro_payroll_history', JSON.stringify(updated));
    if (onShowToast) onShowToast(`Bonus Voucher generated for ${selectedMember.name}.`, 'success');
    setIsBonusModalOpen(false);
    setBonusForm({ amount: '', description: '' });
  };

  const triggerPrint = () => {
    let html = `
      <html><head><title>Global Financial Ledger</title>
      <style>
         body { font-family: system-ui, -apple-system, sans-serif; color: #111; padding: 20px; font-size: 13px; }
         table { width: 100%; border-collapse: collapse; margin-top: 20px; }
         th, td { border: 1px solid #ddd; padding: 10px 14px; text-align: left; }
         th { background: #f8fafc; font-weight: bold; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;}
         h2 { margin-bottom: 5px; }
         .amount { font-family: monospace; font-weight: bold; text-align: right; }
         .status-paid { color: #047857; font-weight: bold; }
         .status-unpaid { color: #dc2626; font-weight: bold; }
      </style></head><body>
      <h2>Global Transaction Ledger</h2>
      <p>Report Generated on: ${new Date().toLocaleString()}</p>
      <table>
        <tr><th>ID</th><th>Member</th><th>Date</th><th>Description</th><th>Status</th><th style="text-align: right">Amount (INR)</th></tr>
    `;
    paymentHistory.forEach(h => {
        html += `<tr>
           <td>${h.id}</td>
           <td>${h.memberName || '-'}</td>
           <td>${new Date(h.date).toLocaleString()}</td>
           <td>${h.description || '-'}</td>
           <td class="${h.status === 'Unpaid' ? 'status-unpaid' : 'status-paid'}">${h.status === 'Unpaid' ? 'PENDING' : h.method}</td>
           <td class="amount">₹${h.amount.toLocaleString()}</td>
        </tr>`;
    });
    html += `</table></body></html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
       printWindow.print();
       printWindow.close();
    }, 250);
  };

  const triggerCSV = (member) => {
     let csv = `Transaction ID,Date,Method,Status,Description,Amount (INR)\n`;
     
     const filtered = paymentHistory.filter(h => h.memberId === member.id);
     if (filtered.length === 0) {
        if (onShowToast) onShowToast('No transactions to export.', 'warning');
        return;
     }

     filtered.forEach(h => {
        csv += `${h.id},"${new Date(h.date).toLocaleString()}","${h.method}","${h.status || 'Paid'}","${h.description || ''}",${h.amount}\n`;
     });

     const blob = new Blob([csv], { type: 'text/csv' });
     const url = window.URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `Ledger_${member.name.replace(/\s+/g, '_')}.csv`;
     a.click();
     window.URL.revokeObjectURL(url);
  };

  const filteredMembers = members.filter(m => {
      const matchesSearch = m.name?.toLowerCase().includes(searchQuery.toLowerCase()) || m.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const mStatus = m.status || 'Active';
      let matchesStatus = true;
      
      if (memberStatusFilter === 'Active') {
          matchesStatus = mStatus === 'Active';
      } else if (memberStatusFilter === 'Old') {
          matchesStatus = mStatus !== 'Active' && mStatus !== 'Pending Invite';
      }
      // If 'All', matchesStatus remains true
      
      return matchesSearch && matchesStatus;
  });

  // Derived Stats
  let totalDisbursedOverall = 0;
  paymentHistory.forEach(h => totalDisbursedOverall += h.amount);

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50/50 min-h-screen text-gray-800 relative pb-24 border-t border-gray-100">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 font-outfit flex items-center gap-3">
            <span className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <IndianRupee className="w-6 h-6" />
            </span>
            Members Payment
          </h1>
          <p className="text-sm text-gray-500 mt-2">Manage employee salaries, generate UPI links, and track historical disbursements.</p>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4 flex flex-col justify-center min-w-[160px] shadow-sm">
             <div className="text-[10px] font-extrabold text-green-600 uppercase tracking-widest mb-2 flex items-center gap-1"><CloudLightning className="w-3 h-3" /> TOTAL DISBURSED</div>
             <div className="text-2xl font-black text-gray-900 leading-none truncate">₹{totalDisbursedOverall.toLocaleString('en-IN')}</div>
           </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
         <div className="flex items-center gap-3 w-full sm:flex-1 max-w-lg">
            <div className="relative flex-1">
               <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
               <input 
                 type="text" 
                 placeholder="Search members..." 
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all"
               />
            </div>
            <select 
               value={memberStatusFilter}
               onChange={e => setMemberStatusFilter(e.target.value)}
               className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-blue-500 shadow-sm transition-all"
            >
               <option value="Active">Active Team</option>
               <option value="Old">Old Members</option>
               <option value="All">All Members</option>
            </select>
         </div>
         
         <button onClick={triggerPrint} className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-xs font-bold uppercase tracking-wider w-full sm:w-auto justify-center">
           <Printer className="w-4 h-4" /> Print Ledger
         </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
         {filteredMembers.map(m => {
            const config = payrollConfigs[m.id] || { salary: 0, bonus: 0, upi: '' };
            const upiId = config.upi || localStorage.getItem(`taxpro_upi_${m.id}`); // Check globally if employee saved it
                             
            const mHistory = paymentHistory.filter(h => h.memberId === m.id);
            const totalPaid = mHistory.reduce((acc, curr) => acc + curr.amount, 0);

            return (
              <div key={m.id} className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col justify-between cursor-pointer" onClick={() => setSelectedMember(m)}>
                 
                 <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center gap-3">
                       <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black text-lg uppercase shadow-inner">
                         {m.name.charAt(0)}
                       </div>
                       <div>
                         <h3 className="font-extrabold text-gray-900 text-lg leading-tight">{m.name}</h3>
                         <div className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mt-1">{m.role || 'Employee'}</div>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-sm p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="font-semibold text-gray-500">Preset Salary</span>
                      <span className="font-black text-gray-900">₹{Number(config.salary).toLocaleString('en-IN')} / mo</span>
                    </div>
                    <div className="flex items-center justify-between text-sm p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <span className="font-semibold text-emerald-700">Total Paid</span>
                      <span className="font-black text-emerald-700">₹{totalPaid.toLocaleString('en-IN')}</span>
                    </div>
                 </div>

                 <button 
                   onClick={(e) => {
                     e.stopPropagation();
                     setSelectedMember(m);
                   }}
                   className="w-full py-3 bg-[#1e1e2d] hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-colors mt-auto flex items-center justify-center gap-2 group-hover:shadow-lg shadow-black/20"
                 >
                   View Ledger & Pay <ChevronRight className="w-4 h-4" />
                 </button>

              </div>
            )
         })}
      </div>

      {filteredMembers.length === 0 && (
         <div className="py-20 text-center">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400">No members found</h3>
         </div>
      )}

      {/* MEMBER LEDGER PROFILE MODAL */}
      {selectedMember && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedMember(null)}>
          <div 
            className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col md:flex-row transform transition-all scale-100 opacity-100 max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
             
             {/* Left Column: Context & Controls */}
             <div className="w-full md:w-1/3 bg-gray-50 border-r border-gray-200 p-6 flex flex-col overflow-y-auto custom-scrollbar-hide">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-2xl shadow-inner mb-4">
                  {selectedMember.name.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-2xl font-black text-gray-900 leading-tight">{selectedMember.name}</h2>
                <div className="text-sm font-bold text-gray-500 mb-6">{selectedMember.email}</div>
                
                {/* Configuration Viewer */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm mb-6">
                  <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                     Salary Settings
                     <button onClick={() => {
                        setIsConfigModalOpen(true);
                        setConfigForm(payrollConfigs[selectedMember.id] || { salary: '', bonus: '' });
                     }} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg shadow-sm border border-blue-100 transition-colors">
                        Set Payment
                     </button>
                  </div>
                  
                  {(() => {
                    const c = payrollConfigs[selectedMember.id] || { salary: 0, bonus: 0 };
                    const upiId = localStorage.getItem(`taxpro_upi_${selectedMember.id}`); 
                    
                    return (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm font-semibold">
                          <span className="text-gray-500">Base Salary:</span>
                          <span className="text-gray-900">₹{c.salary || '0'}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-semibold">
                          <span className="text-gray-500">Fixed Bonus:</span>
                          <span className="text-gray-900">₹{c.bonus || '0'}</span>
                        </div>
                        <div className="flex flex-col mt-2 pt-2 border-t border-gray-100">
                          <span className="text-[10px] uppercase font-bold text-gray-400 mb-1">Employee UPI ID</span>
                          {upiId ? (
                            <span className="text-xs font-mono font-bold text-green-600 bg-green-50 px-2 py-1 rounded w-fit break-all">{upiId}</span>
                          ) : (
                            <span className="text-xs italic text-gray-400">Not configured by employee</span>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>

                <div className="flex gap-3 mt-auto">
                  <button 
                    onClick={() => setIsExtraModalOpen(true)}
                    className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-[11px] uppercase tracking-widest rounded-xl shadow-lg transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <IndianRupee className="w-4 h-4" /> Extra Payment
                  </button>
                  <button 
                    onClick={() => setIsBonusModalOpen(true)}
                    className="flex-1 py-4 bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-black text-[11px] uppercase tracking-widest rounded-xl shadow-lg transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Gift className="w-4 h-4" /> Add Bonus
                  </button>
                </div>
             </div>

             {/* Right Column: Historical Ledger */}
             <div className="w-full md:w-2/3 p-6 flex flex-col bg-white overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><History className="w-5 h-5 text-gray-400" /> Transaction Ledger</h3>
                  
                  <div className="flex items-center gap-2">
                     <select 
                        value={ledgerType} 
                        onChange={e => setLedgerType(e.target.value)}
                        className="bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-lg px-2 py-1 outline-none"
                     >
                        <option value="All">All Types</option>
                        <option value="Salary">Salary/Extra</option>
                        <option value="Bonus">Bonuses</option>
                     </select>
                     
                     <select 
                        value={ledgerYear} 
                        onChange={e => setLedgerYear(e.target.value)}
                        className="bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-lg px-2 py-1 outline-none"
                     >
                        <option value="All">All Years</option>
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                     </select>
                     
                     <button onClick={() => triggerCSV(selectedMember)} className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 hover:text-gray-900">
                        <Download className="w-3 h-3" /> Export CSV
                     </button>
                  </div>
                </div>

                <div className="flex-1">
                   {(() => {
                      let rawHistory = paymentHistory.filter(h => h.memberId === selectedMember.id);
                      
                      if (ledgerYear !== 'All') {
                         rawHistory = rawHistory.filter(h => new Date(h.date).getFullYear().toString() === ledgerYear);
                      }
                      if (ledgerType === 'Bonus') {
                         rawHistory = rawHistory.filter(h => h.id.startsWith('BNS') || h.method === 'BONUS');
                      } else if (ledgerType === 'Salary') {
                         rawHistory = rawHistory.filter(h => !h.id.startsWith('BNS') && h.method !== 'BONUS');
                      }
                      
                      // Sort: Unpaid on top, then by newest date
                      const sortedHistory = [...rawHistory].sort((a,b) => {
                         if (a.status === 'Unpaid' && b.status !== 'Unpaid') return -1;
                         if (a.status !== 'Unpaid' && b.status === 'Unpaid') return 1;
                         return new Date(b.date) - new Date(a.date);
                      });

                      if (sortedHistory.length === 0) {
                         return (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 italic py-20">
                              <FileText className="w-12 h-12 mb-3 opacity-20" />
                              No logic records found.
                            </div>
                         )
                      }
                      return (
                         <div className="space-y-3">
                            {sortedHistory.map(h => (
                               <div key={h.id} className="p-4 rounded-2xl border border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                  <div className="flex items-start gap-4">
                                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${h.status === 'Unpaid' ? 'bg-rose-500 shadow-rose-500/30' : h.method === 'UPI' ? 'bg-indigo-500 shadow-indigo-500/30' : 'bg-emerald-500 shadow-emerald-500/30'} shadow-sm flex-shrink-0`}>
                                        {h.id.startsWith('BNS') ? <Gift className="w-4 h-4" /> : <IndianRupee className="w-4 h-4" />}
                                     </div>
                                     <div>
                                       <div className="text-sm font-extrabold text-gray-900 font-mono">{h.id}</div>
                                       <div className="text-[11px] font-bold text-gray-400 mt-0.5">{new Date(h.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                       
                                       {h.description && (
                                          <div className={`text-[10px] italic font-semibold px-2 py-0.5 rounded mt-1 max-w-[170px] truncate ${h.id.startsWith('BNS') ? 'text-amber-600 bg-amber-50' : 'text-blue-600 bg-blue-50'}`}>
                                             "{h.description}"
                                          </div>
                                       )}
                                     </div>
                                  </div>
                                  <div className="text-right flex flex-col items-end">
                                     <div className="text-lg font-black text-gray-900 mb-0.5">₹{h.amount.toLocaleString()}</div>
                                     <div className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-block flex items-center gap-1 mt-1 ${h.status === 'Unpaid' ? 'text-rose-600 bg-rose-50 border border-rose-200' : h.method === 'BONUS' ? 'text-amber-600 bg-amber-50 border border-amber-200' : 'text-emerald-600 bg-emerald-50 border border-emerald-200'}`}>
                                       {h.status === 'Unpaid' ? (
                                          <><AlertCircle className="w-3 h-3" /> PENDING</>
                                       ) : h.id.startsWith('BNS') || h.method === 'BONUS' ? (
                                          <><CheckCircle2 className="w-3 h-3" /> BONUS ISSUED</>
                                       ) : (
                                          <><CheckCircle2 className="w-3 h-3" /> PAID VIA {h.method}</>
                                       )}
                                     </div>
                                     
                                     {h.status === 'Unpaid' && (
                                        <button 
                                          onClick={() => {
                                            setActivePayId(h.id);
                                            setPayAmount(h.amount);
                                            setIsPayModalOpen(true);
                                          }}
                                          className="mt-2 text-[10px] font-black uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-md shadow-sm w-full transition-colors flex items-center justify-center gap-1"
                                        >
                                          <IndianRupee className="w-3 h-3" /> Pay Now
                                        </button>
                                     )}
                                  </div>
                               </div>
                            ))}
                         </div>
                      );
                   })()}
                </div>
             </div>

          </div>
        </div>
      )}

      {/* DISPATCH PAYMENT / UPI GENERATOR MODAL */}
      {isPayModalOpen && selectedMember && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) { setIsPayModalOpen(false); setPayAmount(''); setActivePayId(null); } }}
          className="modal-overlay-backdrop z-[60]"
        >
          <div className="modal-content-box max-w-md p-6 relative">
             <h3 className="text-xl font-black text-gray-900 mb-1">Issue Payment</h3>
             <p className="text-xs text-gray-500 mb-6 font-medium">To {selectedMember.name}</p>

             <div className="flex flex-col gap-5">
               <div>
                 <label className="text-xs font-bold text-gray-700 uppercase tracking-widest block mb-2">Amount Due</label>
                 <div className="relative">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400 text-lg">₹</div>
                   <input
                     type="number"
                     placeholder="0.00"
                     value={payAmount}
                     onChange={e => setPayAmount(e.target.value)}
                     className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-lg font-black text-gray-900 transition-colors"
                   />
                 </div>
               </div>

               <div>
                 <label className="text-xs font-bold text-gray-700 uppercase tracking-widest block mb-2">Payment Method</label>
                 <div className="flex gap-3">
                   <button 
                     onClick={() => setPayMethod('UPI')}
                     className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all focus:outline-none flex items-center justify-center gap-2 ${payMethod === 'UPI' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-inner' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
                   >
                     <QrCode className="w-4 h-4" /> UPI Apps
                   </button>
                   <button 
                     onClick={() => setPayMethod('Cash')}
                     className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all focus:outline-none flex items-center justify-center gap-2 ${payMethod === 'Cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-inner' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
                   >
                     <BadgeIndianRupee className="w-4 h-4" /> Cash
                   </button>
                 </div>
               </div>
               
               {/* DYNAMIC UPI QR RENDERER */}
               {payMethod === 'UPI' && (
                 <div className="bg-indigo-50/50 rounded-2xl border border-indigo-100 p-5 mt-2 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                   {(() => {
                      const empUpi = localStorage.getItem(`taxpro_upi_${selectedMember.id}`);
                      
                      if (!empUpi) {
                         return <p className="text-xs font-bold text-rose-500 uppercase p-4 italic flex gap-2 items-center"><AlertCircle className="w-4 h-4"/> No UPI ID configured by Employee.</p>
                      }
                      if (!payAmount || Number(payAmount) <= 0) {
                         return <p className="text-xs font-bold text-indigo-400 uppercase p-4 italic">Enter an amount to generate QR.</p>
                      }

                      // Create strict encoded UPI Deep Link intent
                      const upiURI = `upi://pay?pa=${empUpi}&pn=${encodeURIComponent(selectedMember.name)}&am=${payAmount}&cu=INR`;
                      
                      return (
                         <>
                           <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">Scan to Pay securely</p>
                           <div className="bg-white p-3 rounded-xl shadow-sm border border-indigo-100 transition-transform group-hover:scale-105">
                             <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiURI)}`} alt="UPI QR" className="w-40 h-40" />
                           </div>
                           
                           {/* MOBILE DEEP LINK - Crucial feature for the user */}
                           <a 
                             href={upiURI}
                             className="mt-4 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-md inline-flex items-center gap-2"
                           >
                              <Smartphone className="w-4 h-4" /> Tap here to open UPI App natively
                           </a>
                         </>
                      )
                   })()}
                 </div>
               )}

               <div className="flex gap-3 mt-4">
                 <button onClick={() => {setIsPayModalOpen(false); setPayAmount(''); setActivePayId(null);}} className="flex-1 py-3 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
                 <button onClick={handlePay} className="flex-1 py-3 text-sm font-black text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-lg shadow-green-600/30 transition-transform active:scale-95 flex items-center justify-center gap-2">
                   <CheckCircle2 className="w-4 h-4" /> Mark as Paid
                 </button>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* SALARY CONFIGURATION MODAL */}
      {isConfigModalOpen && selectedMember && (
         <div 
           onClick={(e) => { if (e.target === e.currentTarget) setIsConfigModalOpen(false); }}
           className="modal-overlay-backdrop z-[70]"
         >
           <div className="modal-content-box max-w-sm p-6 relative">
              <h3 className="text-xl font-black text-gray-900 mb-1">Set Parameters</h3>
              <p className="text-xs text-gray-500 mb-6 font-medium">For {selectedMember.name}</p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block uppercase">Monthly Salary base</label>
                  <input
                    type="number"
                    value={configForm.salary}
                    placeholder="e.g. 25000"
                    onChange={e => setConfigForm({...configForm, salary: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-semibold text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block uppercase">Fixed Monthly Bonus</label>
                  <input
                    type="number"
                    value={configForm.bonus}
                    placeholder="e.g. 5000"
                    onChange={e => setConfigForm({...configForm, bonus: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-semibold text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                 <button onClick={() => setIsConfigModalOpen(false)} className="flex-1 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl transition-colors">Cancel</button>
                 <button onClick={() => saveConfig(selectedMember.id, configForm)} className="flex-1 py-2.5 text-sm font-black text-white bg-[#1e1e2d] hover:bg-black rounded-xl shadow-md transition-colors">Save</button>
              </div>
           </div>
         </div>
      )}

      {/* EXTRA PAYMENT MODAL */}
      {isExtraModalOpen && selectedMember && (
         <div 
           onClick={(e) => { if (e.target === e.currentTarget) setIsExtraModalOpen(false); }}
           className="modal-overlay-backdrop z-[75]"
         >
           <div className="modal-content-box max-w-sm p-6 border border-blue-100 relative">
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg text-white">
                <IndianRupee className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-1">Queue Extra Payment</h3>
              <p className="text-xs text-gray-500 mb-6 font-medium">To {selectedMember.name}</p>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-widest">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">₹</span>
                    <input type="number" value={extraForm.amount} placeholder="0.00" onChange={e => setExtraForm({...extraForm, amount: e.target.value})} className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-black text-gray-900 transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-widest">Description</label>
                  <input type="text" value={extraForm.description} placeholder="e.g. Travel Stipend" onChange={e => setExtraForm({...extraForm, description: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-semibold text-sm text-gray-800 transition-colors" />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                 <button onClick={() => setIsExtraModalOpen(false)} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
                 <button onClick={handleCreateExtra} className="flex-1 py-3 text-sm font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg transition-colors">Queue Payment</button>
              </div>
           </div>
         </div>
      )}

      {/* AD-HOC BONUS DISPATCH MODAL */}
      {isBonusModalOpen && selectedMember && (
         <div 
           onClick={(e) => { if (e.target === e.currentTarget) setIsBonusModalOpen(false); }}
           className="modal-overlay-backdrop z-[75]"
         >
           <div className="modal-content-box max-w-sm p-6 border border-amber-100 relative">
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center shadow-lg text-white">
                <Gift className="w-6 h-6" />
              </div>
              
              <h3 className="text-xl font-black text-gray-900 mb-1">Queue Bonus</h3>
              <p className="text-xs text-gray-500 mb-6 font-medium">To {selectedMember.name}</p>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-widest">Bonus Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">₹</span>
                    <input type="number" value={bonusForm.amount} placeholder="0.00" onChange={e => setBonusForm({...bonusForm, amount: e.target.value})} className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-amber-400 font-black text-gray-900 transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-widest">Description (Optional)</label>
                  <input type="text" value={bonusForm.description} placeholder="e.g. Diwali Bonus" onChange={e => setBonusForm({...bonusForm, description: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-amber-400 font-semibold text-sm text-gray-800 transition-colors" />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                 <button onClick={() => setIsBonusModalOpen(false)} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
                 <button onClick={handleCreateBonus} className="flex-1 py-3 text-sm font-black text-amber-900 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-lg shadow-amber-400/30 transition-colors">Queue Bonus</button>
              </div>
           </div>
         </div>
      )}

    </div>
  );
}
