import React, { useState, useEffect } from 'react';
import { DollarSign, ArrowUpRight, ArrowDownRight, Plus, X, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, SUGGESTED_EXPENSE_PAYEES } from './CalendarPageView';

export default function ReceiptsPaymentsView({ onShowToast }) {
  const [entries, setEntries] = useState([]);
  const [payrollPayments, setPayrollPayments] = useState([]);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({ 
    type: 'Receipt', 
    client: '', 
    category: 'Client Retainer / Monthly Fee', 
    mode: 'UPI', 
    amount: '' 
  });

  const fetchLedgerData = async () => {
    try {
      const [payRes, feeRes, cliRes, memRes] = await Promise.all([
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('fees').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('name').order('created_at', { ascending: false }),
        supabase.from('team_members').select('name').order('created_at', { ascending: false })
      ]);

      if (cliRes.data) setClients(cliRes.data.map(c => c.name));
      if (memRes.data) setTeamMembers(memRes.data.map(m => m.name).filter(Boolean));

      const dbPayments = (payRes.data || []).map(p => ({
        id: p.id,
        type: 'Payment',
        client: p.recipient || p.category || 'Vendor / Employee',
        category: p.category || 'Office & Operations',
        mode: p.method || 'UPI',
        amount: `₹${parseFloat(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        date: (p.created_at || new Date().toISOString()).split('T')[0]
      }));

      const dbReceipts = (feeRes.data || []).filter(f => Number(f.paid || 0) > 0).map(f => ({
        id: `REC-${f.id}`,
        type: 'Receipt',
        client: f.client_name || 'Client',
        category: 'Client Retainer / Monthly Fee',
        mode: 'Bank Transfer',
        amount: `₹${parseFloat(f.paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        date: (f.created_at || new Date().toISOString()).split('T')[0]
      }));

      // Load local custom calendar transactions & payroll history
      let localTxs = [];
      try {
        const rawLocal = localStorage.getItem('taxpro_calendar_transactions');
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          localTxs = (parsed || []).map(t => ({
            id: t.id,
            type: t.type === 'Income' ? 'Receipt' : 'Payment',
            client: t.party,
            category: t.category,
            mode: t.mode,
            amount: `₹${parseFloat(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            date: t.date
          }));
        }
      } catch (e) {}

      let localPayroll = [];
      try {
        const rawPayroll = localStorage.getItem('taxpro_payroll_history');
        if (rawPayroll) {
          const parsedPayroll = JSON.parse(rawPayroll);
          localPayroll = (parsedPayroll || [])
            .filter(item => item.status === 'Paid' && Number(item.amount || 0) > 0)
            .map(p => ({
              id: `PAYROLL-${p.id || p.memberId}`,
              type: 'Payment',
              client: `${p.memberName || 'Employee'} (Salary)`,
              category: p.description || 'Staff Salary & Payroll',
              mode: p.method === 'Pending' ? 'Bank Transfer' : (p.method || 'Bank Transfer'),
              amount: `₹${parseFloat(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
              date: (p.date || new Date().toISOString()).split('T')[0]
            }));
        }
      } catch (e) {}

      const allMerged = [...localTxs, ...localPayroll, ...dbReceipts, ...dbPayments];
      const uniqueMap = new Map();
      allMerged.forEach(item => {
        if (!uniqueMap.has(item.id)) uniqueMap.set(item.id, item);
      });

      setEntries(Array.from(uniqueMap.values()).sort((a,b) => new Date(b.date) - new Date(a.date)));
    } catch (e) {
      console.error('[Ledger Fetch Error]:', e);
    }
  };

  useEffect(() => {
    fetchLedgerData();
    window.addEventListener('taxpro_financial_updated', fetchLedgerData);
    window.addEventListener('taxpro_db_updated', fetchLedgerData);
    return () => {
      window.removeEventListener('taxpro_financial_updated', fetchLedgerData);
      window.removeEventListener('taxpro_db_updated', fetchLedgerData);
    };
  }, []);

  const allLedgerEntries = [...entries, ...payrollPayments].sort((a,b) => new Date(b.date) - new Date(a.date));

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!newEntry.client || !newEntry.amount) {
      onShowToast && onShowToast('Please fill out Party / Client and Amount fields', 'warning');
      return;
    }
    
    // Format amount
    let amt = String(newEntry.amount).replace(/[^0-9.]/g, '');
    const numAmt = parseFloat(amt || 0);
    const entryData = {
      id: `${newEntry.type === 'Receipt' ? 'REC' : 'PAY'}-${Date.now()}`,
      type: newEntry.type,
      client: newEntry.client,
      category: newEntry.category,
      mode: newEntry.mode,
      amount: `₹${numAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      date: new Date().toISOString().split('T')[0]
    };
    
    setEntries([entryData, ...entries]);

    try {
      if (newEntry.type === 'Payment') {
        await supabase.from('payments').insert([{
          id: entryData.id,
          recipient: newEntry.client,
          amount: numAmt,
          category: newEntry.category || 'General Expense',
          method: newEntry.mode,
          status: 'Success'
        }]);
      } else {
        await supabase.from('fees').insert([{
          id: entryData.id,
          client_name: newEntry.client,
          invoice_no: `INV-${Date.now().toString().slice(-4)}`,
          amount: numAmt,
          paid: numAmt,
          status: 'Paid'
        }]);
      }
    } catch (err) {}

    // Synchronize to local calendar transactions and broadcast cross-module sync
    try {
      const rawLocal = localStorage.getItem('taxpro_calendar_transactions');
      const currentList = rawLocal ? JSON.parse(rawLocal) : [];
      const calTx = {
        id: entryData.id,
        type: newEntry.type === 'Receipt' ? 'Income' : 'Expense',
        party: newEntry.client,
        category: newEntry.category,
        amount: numAmt,
        mode: newEntry.mode,
        date: entryData.date,
        notes: `Recorded via Receipts & Payments Hub`
      };
      localStorage.setItem('taxpro_calendar_transactions', JSON.stringify([calTx, ...currentList]));
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('taxpro_financial_updated'));
    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

    setIsModalOpen(false);
    setNewEntry({ 
      type: 'Receipt', 
      client: '', 
      category: 'Client Retainer / Monthly Fee', 
      mode: 'UPI', 
      amount: '' 
    });
    onShowToast && onShowToast(`✓ ${entryData.type} recorded and auto-synchronized across Calendar & Accounting!`, 'success');
  };

  const handleDelete = (id) => {
    const entryToDelete = entries.find(e => e.id === id);
    if (!entryToDelete) return;

    setEntries(entries.filter(e => e.id !== id));
    
    try {
      const rawLocal = localStorage.getItem('taxpro_calendar_transactions');
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal).filter(t => t.id !== id);
        localStorage.setItem('taxpro_calendar_transactions', JSON.stringify(parsed));
      }
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('taxpro_financial_updated'));
    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

    if (pendingDelete && pendingDelete.timer) {
      clearTimeout(pendingDelete.timer);
    }
    
    const timerId = setTimeout(() => {
      setPendingDelete(null);
    }, 4000);
    
    setPendingDelete({ entry: entryToDelete, timer: timerId });
  };

  const handleUndo = () => {
    if (pendingDelete && pendingDelete.entry) {
      clearTimeout(pendingDelete.timer);
      const restored = [pendingDelete.entry, ...entries].sort((a,b) => new Date(b.date) - new Date(a.date));
      setEntries(restored);
      setPendingDelete(null);

      window.dispatchEvent(new CustomEvent('taxpro_financial_updated'));
      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

      if (onShowToast) onShowToast('Deletion undone successfully.', 'success');
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
              onClick={() => { if(window.confirm('Are you sure you want to completely wipe the ledger?')) { setEntries([]); if(onShowToast) onShowToast('Ledger cleared entirely.', 'info'); } }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold transition-all shadow-sm"
            >
              Clear Ledger
            </button>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/25 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Record Entry
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Inflow (Receipts)</div>
            <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
              ₹{entries.filter(e => e.type === 'Receipt').reduce((acc, e) => acc + (parseFloat(String(e.amount).replace(/[^0-9.]/g, '')) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Outflow (Expenses)</div>
            <div className="text-2xl font-black text-rose-600 font-mono mt-1">
              ₹{entries.filter(e => e.type === 'Payment').reduce((acc, e) => acc + (parseFloat(String(e.amount).replace(/[^0-9.]/g, '')) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Net Cash Position</div>
            <div className="text-2xl font-black text-indigo-600 font-mono mt-1">
              ₹{(
                entries.filter(e => e.type === 'Receipt').reduce((acc, e) => acc + (parseFloat(String(e.amount).replace(/[^0-9.]/g, '')) || 0), 0) -
                entries.filter(e => e.type === 'Payment').reduce((acc, e) => acc + (parseFloat(String(e.amount).replace(/[^0-9.]/g, '')) || 0), 0)
              ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="font-bold text-sm text-gray-900">Live Transaction Book ({allLedgerEntries.length})</h3>
          <span className="text-xs text-gray-400 font-medium">Real-time sync active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-400 uppercase text-[10px]">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Party / Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allLedgerEntries.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-gray-400">No transactions recorded yet.</td>
                </tr>
              ) : (
                allLedgerEntries.map((e, idx) => (
                  <tr key={e.id || idx} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-gray-500">{e.date}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        e.type === 'Receipt' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {e.type === 'Receipt' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {e.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900">{e.client}</td>
                    <td className="py-3 px-4 text-gray-600">{e.category || (e.type === 'Receipt' ? 'Client Fee' : 'Office Expense')}</td>
                    <td className="py-3 px-4 font-mono text-gray-700">{e.mode || 'UPI'}</td>
                    <td className={`py-3 px-4 text-right font-mono font-bold ${e.type === 'Receipt' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {e.type === 'Receipt' ? '+' : '-'}{e.amount}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button 
                        onClick={() => handleDelete(e.id)} 
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Transaction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Entry Modal */}
      {isModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
          className="modal-overlay-backdrop"
        >
          <div className="modal-content-box max-w-2xl">
            {/* Premium Gradient Header */}
            <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-xs">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-white tracking-tight">
                    Record Financial Entry
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Log fee receipts, practice expenditures & auto-sync with calendar
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer shadow-xs"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddEntry} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold scrollbar-thin">
              <div>
                <label className="text-gray-700 block mb-1">Transaction Type</label>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setNewEntry({...newEntry, type: 'Receipt', category: INCOME_CATEGORIES[0]})} 
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      newEntry.type === 'Receipt' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs' : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Receipt (Inflow)</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setNewEntry({...newEntry, type: 'Payment', category: EXPENSE_CATEGORIES[0]})} 
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      newEntry.type === 'Payment' ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-2xs' : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    <span>Payment / Expense (Outflow)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-700 block mb-1">
                    {newEntry.type === 'Receipt' ? 'Client / Entity Name' : 'Payee / Vendor / Employee Name'} <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={newEntry.client} 
                    onChange={e => setNewEntry({...newEntry, client: e.target.value})} 
                    list={newEntry.type === 'Receipt' ? 'receipt-client-list' : 'payment-payee-list'}
                    className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:border-indigo-500 bg-gray-50" 
                    placeholder={newEntry.type === 'Receipt' ? 'e.g. Acme Corp Pvt Ltd' : 'e.g. Rahul Sharma (Salary), Landlord (Rent), Airtel'} 
                  />
                  {newEntry.type === 'Receipt' ? (
                    <datalist id="receipt-client-list">
                      {clients.map((c, i) => (
                        <option key={i} value={c} />
                      ))}
                    </datalist>
                  ) : (
                    <datalist id="payment-payee-list">
                      {teamMembers.map((m, i) => (
                        <option key={`m-${i}`} value={`${m} (Salary)`} />
                      ))}
                      {SUGGESTED_EXPENSE_PAYEES.map((p, i) => (
                        <option key={`p-${i}`} value={p} />
                      ))}
                    </datalist>
                  )}
                </div>

                <div>
                  <label className="text-gray-700 block mb-1">Amount (₹) <span className="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    required 
                    value={newEntry.amount} 
                    onChange={e => setNewEntry({...newEntry, amount: e.target.value})} 
                    className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:border-indigo-500 font-mono bg-gray-50" 
                    placeholder="e.g. 15000" 
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-700 block mb-1">Category / Ledger Head</label>
                  <select 
                    value={newEntry.category} 
                    onChange={e => setNewEntry({...newEntry, category: e.target.value})} 
                    className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:border-indigo-500 cursor-pointer bg-gray-50"
                  >
                    {newEntry.type === 'Receipt' ? (
                      INCOME_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))
                    ) : (
                      EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-gray-700 block mb-1">Payment Channel</label>
                  <select 
                    value={newEntry.mode} 
                    onChange={e => setNewEntry({...newEntry, mode: e.target.value})} 
                    className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:border-indigo-500 cursor-pointer bg-gray-50"
                  >
                    <option value="UPI">UPI Instant</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="Cash">Cash Settlement</option>
                    <option value="Cheque">Cheque Deposit</option>
                    <option value="Credit Card">Corporate Card</option>
                  </select>
                </div>
              </div>

              {/* Bottom Sticky Actions */}
              <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 mt-3 -mx-6 -mb-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-[#0f766e] hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-700/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4-Second Undo Toast */}
      {pendingDelete && (
        <div className="fixed bottom-6 right-6 bg-[#1e1e2d] border border-gray-700 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-6 z-50 animate-slide-up">
          <div>
            <p className="text-sm font-bold flex items-center gap-2"><Trash2 className="w-4 h-4 text-rose-400" /> Entry Deleted</p>
          </div>
          <button 
            onClick={handleUndo} 
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs rounded-xl shadow-md transition-colors"
          >
            UNDO
          </button>
        </div>
      )}

    </div>
  );
}
