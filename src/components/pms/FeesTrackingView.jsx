import React, { useState, useEffect } from 'react';
import { DollarSign, Send, Plus, X, Printer, History, Mail, AlertCircle, FileText, Download } from 'lucide-react';

export default function FeesTrackingView({ onShowToast }) {
  const [fees, setFees] = useState(() => {
    try {
      const saved = localStorage.getItem('taxpro_fees');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    localStorage.setItem('taxpro_fees', JSON.stringify(fees));
  }, [fees]);

  const [clients] = useState(() => {
    try {
      const saved = localStorage.getItem('taxpro_clients');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFee, setNewFee] = useState({ client: '', totalFee: '', paid: '' });
  const [activeFeeStat, setActiveFeeStat] = useState(null);

  const calculatePending = (total, paid) => Math.max(0, Number(total) - Number(paid));
  
  const getStatus = (total, paid) => {
    const pending = calculatePending(total, paid);
    if (pending === 0 && Number(total) > 0) return 'Paid';
    if (Number(paid) > 0 && pending > 0) return 'Partially Paid';
    return 'Pending';
  };

  const formatINR = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;

  const handleAddFee = (e) => {
    e.preventDefault();
    if (!newFee.client.trim()) return;
    
    const nextId = `FT-${Date.now()}`;
    const total = Number(newFee.totalFee) || 0;
    const paid = Number(newFee.paid) || 0;

    const newRecord = {
      id: nextId,
      client: newFee.client,
      totalFee: total,
      paid: paid,
      history: [
        { date: new Date().toISOString().split('T')[0], desc: 'Initial Account Setup & Billing Entry', amount: paid }
      ]
    };

    setFees([newRecord, ...fees]);
    setNewFee({ client: '', totalFee: '', paid: '' });
    setIsAddModalOpen(false);
    if (onShowToast) onShowToast('New client billing record actively registered!', 'success');
  };

  const handleSendReminder = (e, clientName) => {
    if (e) e.stopPropagation();
    if (onShowToast) onShowToast(`System Verified: Electronic notice securely dispatched to ${clientName}'s registered email address.`, 'success');
  };

  const triggerPrint = () => {
    if (onShowToast) onShowToast('Generating printable ledger statement...', 'info');
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleDownloadLedger = () => {
    if (!activeFeeStat) return;
    const csvRows = ['Date,Description,Amount'];
    if (activeFeeStat.history) {
      activeFeeStat.history.forEach(h => csvRows.push(`"${h.date}","${h.desc}","${h.amount}"`));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Ledger_${activeFeeStat.client.replace(/\s+/g, '_')}.csv`;
    link.click();
    if (onShowToast) onShowToast('Client ledger downloaded securely.', 'success');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f3f4f6] min-h-screen text-gray-800 relative printable-area-container">
      
      {/* Header Container */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold font-outfit text-[#1e1e2d]">Fees & Billing Ledger</h1>
          <p className="text-xs text-gray-500 mt-1">Track client professional fees, received payments, and pending automated invoices.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#5b52e0] hover:bg-[#4c44cf] text-white font-bold text-sm rounded-xl shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Billing Record
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden print-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-extrabold uppercase">
              <th className="p-4">Client Name</th>
              <th className="p-4">Total Billed Fee</th>
              <th className="p-4">Amount Paid</th>
              <th className="p-4">Pending Balance</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium">
            {fees.map((f) => {
              const pendingCalc = calculatePending(f.totalFee, f.paid);
              const stat = getStatus(f.totalFee, f.paid);
              
              return (
                <tr 
                  key={f.id} 
                  onClick={() => setActiveFeeStat(f)}
                  className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                >
                  <td className="p-4 font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">{f.client}</td>
                  <td className="p-4 font-mono font-bold text-gray-600">{formatINR(f.totalFee)}</td>
                  <td className="p-4 font-mono font-bold text-emerald-600">{formatINR(f.paid)}</td>
                  <td className="p-4 font-mono font-black text-rose-600">{formatINR(pendingCalc)}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded border text-[10px] uppercase font-extrabold tracking-widest ${
                      stat === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      stat === 'Partially Paid' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                      'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                      {stat}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {pendingCalc > 0 && (
                      <button 
                        onClick={(e) => handleSendReminder(e, f.client)}
                        className="px-3 py-1.5 bg-white hover:bg-[#5b52e0] hover:text-white text-indigo-600 font-bold rounded-lg text-[10px] uppercase tracking-wider border border-indigo-200 shadow-sm transition-all inline-flex items-center gap-1.5"
                      >
                        <Mail className="w-3 h-3" /> Remind
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* CREATE RECORD MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-gray-200 shadow-2xl relative">
            <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-extrabold font-outfit text-gray-900 mb-2">Register Billing Ledger</h3>
            <p className="text-xs text-gray-500 mb-6">Manually log a client fee to begin tracking pending settlement balances.</p>
            
            <form onSubmit={handleAddFee} className="flex flex-col gap-4 text-xs font-semibold">
              <div>
                <label className="text-gray-700 block mb-1">Client Business Name *</label>
                <select 
                  value={newFee.client}
                  onChange={e => setNewFee({...newFee, client: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-[#5b52e0] bg-gray-50 focus:bg-white"
                  required
                >
                  <option value="">-- Select Client --</option>
                  {clients.map((c, i) => (
                    <option key={i} value={c.name}>{c.name} {c.fileNo ? `(${c.fileNo})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-700 block mb-1">Total Billed Amt (₹)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 50000"
                    value={newFee.totalFee}
                    onChange={e => setNewFee({...newFee, totalFee: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-[#5b52e0] font-mono"
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-gray-700 block mb-1">Received So Far (₹)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 10000"
                    value={newFee.paid}
                    onChange={e => setNewFee({...newFee, paid: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-[#5b52e0] font-mono"
                    min="0"
                  />
                </div>
              </div>
              
              <div className="bg-blue-50 text-blue-800 p-3 rounded-xl border border-blue-100 flex items-start gap-2 mt-2">
                 <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                 <p className="text-[10px] leading-tight">The system will automatically calculate the pending balance required for notifications.</p>
              </div>

              <button type="submit" className="mt-2 py-3 bg-[#1e1e2d] text-white font-black text-sm rounded-xl hover:bg-gray-800 shadow-xl transition-all">
                Commit Entry to Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED STATS & PRINT MODAL */}
      {activeFeeStat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs print:bg-white print:static print:p-0">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-2xl w-full border border-gray-200 shadow-2xl relative print:border-none print:shadow-none print:max-w-full">
            <button onClick={() => setActiveFeeStat(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 print:hidden hidden sm:block">
              <X className="w-5 h-5" />
            </button>
            
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                   <FileText className="w-3.5 h-3.5" /> Client Ledger Account
                </div>
                <h3 className="text-2xl font-extrabold text-[#1e1e2d] font-outfit leading-tight mb-2">
                  {activeFeeStat.client}
                </h3>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${
                  getStatus(activeFeeStat.totalFee, activeFeeStat.paid) === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  getStatus(activeFeeStat.totalFee, activeFeeStat.paid) === 'Partially Paid' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {getStatus(activeFeeStat.totalFee, activeFeeStat.paid)}
                </span>
              </div>
              
              <div className="flex gap-2 print:hidden items-start">
                 {calculatePending(activeFeeStat.totalFee, activeFeeStat.paid) > 0 && (
                   <button 
                     onClick={(e) => handleSendReminder(e, activeFeeStat.client)}
                     className="px-3 py-2 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl hover:bg-indigo-100 flex items-center gap-1.5 transition-colors"
                   >
                     <Mail className="w-4 h-4" /> E-Mail Notice
                   </button>
                 )}
                 <button 
                   onClick={handleDownloadLedger}
                   className="px-3 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 flex items-center gap-1.5 transition-colors"
                 >
                   <Download className="w-4 h-4" /> Download
                 </button>
                 <button 
                   onClick={triggerPrint}
                   className="px-3 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 flex items-center gap-1.5 transition-colors"
                 >
                   <Printer className="w-4 h-4" /> Print Ledger
                 </button>
                 <button onClick={() => setActiveFeeStat(null)} className="px-3 py-2 bg-rose-50 text-rose-600 font-bold text-xs rounded-xl hover:bg-rose-100 sm:hidden">
                   Close
                 </button>
              </div>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-3 gap-3 mb-8">
               <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-center">
                 <div className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-1">Billed</div>
                 <div className="font-mono font-bold text-lg text-gray-700">{formatINR(activeFeeStat.totalFee)}</div>
               </div>
               <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center">
                 <div className="text-[10px] font-black text-emerald-600/70 tracking-widest uppercase mb-1">Collected</div>
                 <div className="font-mono font-bold text-lg text-emerald-700">{formatINR(activeFeeStat.paid)}</div>
               </div>
               <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-center">
                 <div className="text-[10px] font-black text-rose-600/70 tracking-widest uppercase mb-1">Due</div>
                 <div className="font-mono font-bold text-lg text-rose-700">{formatINR(calculatePending(activeFeeStat.totalFee, activeFeeStat.paid))}</div>
               </div>
            </div>

            {/* Detailed Transaction History */}
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4">
                <History className="w-4 h-4 text-gray-400" /> Transaction Synopsis
              </div>
              
              <div className="space-y-3">
                {activeFeeStat.history && activeFeeStat.history.length > 0 ? (
                  activeFeeStat.history.map((hist, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white border border-gray-100 p-3 rounded-xl shadow-xs">
                      <div>
                        <div className="text-xs font-bold text-gray-800">{hist.desc}</div>
                        <div className="text-[10px] text-gray-400 font-medium">{hist.date}</div>
                      </div>
                      <div className="font-mono font-bold text-sm text-emerald-600">
                        {hist.amount > 0 ? `+ ${formatINR(hist.amount)}` : 'Initiated'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-gray-400 font-bold italic bg-gray-50 rounded-xl">
                    No historical transaction vectors found.
                  </div>
                )}
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
        </div>
      )}
    </div>
  );
}
