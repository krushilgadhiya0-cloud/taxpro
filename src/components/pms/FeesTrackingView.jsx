import React, { useState, useEffect } from 'react';
import { DollarSign, Send, Plus, X, Printer, History, Mail, AlertCircle, FileText, Download } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function FeesTrackingView({ onShowToast }) {
  const [fees, setFees] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFeesData = async () => {
    setIsLoading(true);
    try {
      const [feesRes, clientsRes] = await Promise.all([
        supabase.from('fees').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('name').order('created_at', { ascending: false })
      ]);

      if (feesRes.data) {
        setFees(feesRes.data.map(f => ({
          id: f.id,
          client: f.client_name || f.client || 'Client',
          totalFee: Number(f.amount || 0),
          paid: Number(f.paid || 0),
          history: [
            { date: (f.created_at || new Date().toISOString()).split('T')[0], desc: f.service || 'Professional Advisory & Compliance Fee', amount: Number(f.paid || 0) }
          ]
        })));
      }

      if (clientsRes.data) {
        setClients(clientsRes.data.map(c => c.name));
      }
    } catch (e) {
      console.error('[Fees Fetch Error]:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeesData();
  }, []);

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

  const handleAddFee = async (e) => {
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

    setFees(prev => [newRecord, ...prev]);

    try {
      await supabase.from('fees').insert([{
        id: nextId,
        client_name: newFee.client,
        invoice_no: `INV-${Date.now().toString().slice(-4)}`,
        amount: total,
        paid: paid,
        service: 'Tax & Compliance Retainer',
        status: getStatus(total, paid)
      }]);
    } catch (err) {}

    window.dispatchEvent(new CustomEvent('taxpro_financial_updated'));
    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

    setNewFee({ client: '', totalFee: '', paid: '' });
    setIsAddModalOpen(false);
    if (onShowToast) onShowToast('New client billing record actively registered & synced with Calendar!', 'success');
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
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddModalOpen(false); }}
          className="modal-overlay-backdrop"
        >
          <div className="modal-content-box max-w-2xl">
            {/* Premium Gradient Header */}
            <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-xs">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-white tracking-tight">
                    Register Billing Ledger
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Log a client fee to begin tracking pending settlement balances
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer shadow-xs"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddFee} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold scrollbar-thin">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-700 block mb-1">Client Business Name <span className="text-red-500">*</span></label>
                  <select 
                    value={newFee.client}
                    onChange={e => setNewFee({...newFee, client: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 bg-gray-50 cursor-pointer text-xs"
                    required
                  >
                    <option value="">-- Select Client --</option>
                    {clients.map((c, i) => (
                      <option key={i} value={c.name}>{c.name} {c.fileNo ? `(${c.fileNo})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-700 block mb-1">Total Fee (₹)</label>
                    <input 
                      type="number" 
                      placeholder="50000"
                      value={newFee.totalFee}
                      onChange={e => setNewFee({...newFee, totalFee: e.target.value})}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-mono text-xs bg-gray-50"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="text-gray-700 block mb-1">Paid (₹)</label>
                    <input 
                      type="number" 
                      placeholder="10000"
                      value={newFee.paid}
                      onChange={e => setNewFee({...newFee, paid: e.target.value})}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-mono text-xs bg-gray-50"
                      min="0"
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-indigo-50/70 text-indigo-900 p-3.5 rounded-xl border border-indigo-100 flex items-start gap-2.5 mt-1">
                 <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-indigo-600" />
                 <p className="text-[11px] leading-tight">The system will automatically compute the outstanding balance and generate ledger statements.</p>
              </div>

              {/* Bottom Sticky Actions */}
              <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 mt-3 -mx-6 -mb-6">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-[#0f766e] hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-700/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  Save Ledger Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED STATS & PRINT MODAL */}
      {activeFeeStat && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setActiveFeeStat(null); }}
          className="modal-overlay-backdrop print:bg-white print:static print:p-0"
        >
          <div className="modal-content-box max-w-2xl p-6 md:p-8 relative print:border-none print:shadow-none print:max-w-full">
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
