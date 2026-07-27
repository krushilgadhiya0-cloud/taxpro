import React, { useState, useEffect } from 'react';
import { DollarSign, ArrowUpRight, ArrowDownRight, Plus, X, Trash2 } from 'lucide-react';

export default function ReceiptsPaymentsView({ onShowToast }) {
  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem('taxpro_fin_entries');
    if (saved) return JSON.parse(saved);
    return [];
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({ type: 'Receipt', client: '', mode: 'UPI', amount: '' });

  useEffect(() => {
    localStorage.setItem('taxpro_fin_entries', JSON.stringify(entries));
  }, [entries]);

  const handleAddEntry = (e) => {
    e.preventDefault();
    if (!newEntry.client || !newEntry.amount) {
      onShowToast && onShowToast('Please fill out Client and Amount fields', 'warning');
      return;
    }
    
    // Format amount
    let amt = newEntry.amount.replace(/[^0-9.]/g, '');
    const entryData = {
      id: `${newEntry.type === 'Receipt' ? 'REC' : 'PAY'}-${Math.floor(1000 + Math.random() * 9000)}`,
      type: newEntry.type,
      client: newEntry.client,
      mode: newEntry.mode,
      amount: `₹${parseFloat(amt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      date: new Date().toISOString().split('T')[0]
    };
    
    setEntries([entryData, ...entries]);
    setIsModalOpen(false);
    setNewEntry({ type: 'Receipt', client: '', mode: 'UPI', amount: '' });
    onShowToast && onShowToast(`✓ ${entryData.type} recorded successfully!`, 'success');
  };

  const handleDelete = (id) => {
    setEntries(entries.filter(e => e.id !== id));
    onShowToast && onShowToast('Entry removed from ledger.', 'info');
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to completely clear all financial records?")) {
       setEntries([]);
       localStorage.removeItem('taxpro_fin_entries');
       onShowToast && onShowToast('All ledger entries permanently cleared.', 'success');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f3f4f6] min-h-screen text-gray-800">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold font-outfit text-[#1e1e2d]">Receipts & Payments</h1>
          <p className="text-xs text-gray-500 mt-1">Financial cash flow, fee receipts, and firm expenditure ledger.</p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {entries.length > 0 && (
             <button 
               onClick={handleClearAll}
               className="flex items-center gap-2 px-4 py-2 rounded-xl text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 text-xs font-bold transition-all"
             >
               <Trash2 className="w-4 h-4" />
               <span>Clear All</span>
             </button>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e1e2d] hover:bg-black text-white text-xs font-bold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record Entry</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase">Total Fee Receipts</span>
            <div className="text-2xl font-black text-emerald-600 font-outfit mt-1">
              ₹{entries.filter(e => e.type === 'Receipt').reduce((acc, curr) => acc + parseFloat(curr.amount.replace(/[^0-9.-]+/g,"")), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase">Total Firm Payments</span>
            <div className="text-2xl font-black text-rose-600 font-outfit mt-1">
              ₹{entries.filter(e => e.type === 'Payment').reduce((acc, curr) => acc + parseFloat(curr.amount.replace(/[^0-9.-]+/g,"")), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
            <ArrowDownRight className="w-5 h-5 text-rose-600" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-extrabold uppercase">
              <th className="p-4">Transaction ID</th>
              <th className="p-4">Type</th>
              <th className="p-4">Party / Description</th>
              <th className="p-4">Payment Mode</th>
              <th className="p-4">Date</th>
              <th className="p-4 text-right">Amount</th>
              <th className="p-4 text-center w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium">
            {entries.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="p-4 font-mono text-gray-500">{e.id}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    e.type === 'Receipt' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                  }`}>
                    {e.type}
                  </span>
                </td>
                <td className="p-4 font-bold text-gray-900">{e.client}</td>
                <td className="p-4 text-gray-600 font-semibold">{e.mode}</td>
                <td className="p-4 text-gray-500 font-mono">{e.date}</td>
                <td className={`p-4 text-right font-black font-mono text-sm ${e.type === 'Receipt' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {e.amount}
                </td>
                <td className="p-4 text-center">
                  <button onClick={() => handleDelete(e.id)} className="p-2 text-rose-200 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Record Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-fade-in">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-extrabold font-outfit mb-4">Record New Entry</h3>
            
            <form onSubmit={handleAddEntry} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Entry Type</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setNewEntry({...newEntry, type: 'Receipt'})} className={`flex-1 py-2 text-xs font-bold rounded-xl border ${newEntry.type === 'Receipt' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>Receipt (In)</button>
                  <button type="button" onClick={() => setNewEntry({...newEntry, type: 'Payment'})} className={`flex-1 py-2 text-xs font-bold rounded-xl border ${newEntry.type === 'Payment' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>Payment (Out)</button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Party / Description</label>
                <input type="text" required value={newEntry.client} onChange={e => setNewEntry({...newEntry, client: e.target.value})} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500" placeholder="e.g. Acme Corp Consulting" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Mode</label>
                  <select value={newEntry.mode} onChange={e => setNewEntry({...newEntry, mode: e.target.value})} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500">
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Amount (₹)</label>
                  <input type="number" required value={newEntry.amount} onChange={e => setNewEntry({...newEntry, amount: e.target.value})} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500" placeholder="5000" />
                </div>
              </div>

              <button type="submit" className="mt-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl">
                Save Entry
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
