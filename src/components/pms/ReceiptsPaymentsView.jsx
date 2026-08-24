import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, ArrowUpRight, ArrowDownRight, Plus, X, Trash2, Printer, Search, Calendar, Filter, Undo2, RotateCcw, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { logAuditActivity } from '../../lib/auditLogger';
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

  const [clientFilter, setClientFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Live Screen Date/Period Filters (Day, Month, Year, Custom Range)
  const [viewPeriodType, setViewPeriodType] = useState('all_time'); // 'all_time', 'specific_day', 'specific_month', 'specific_year', 'custom_range'
  const [viewDay, setViewDay] = useState(new Date().toISOString().slice(0, 10));
  const [viewMonth, setViewMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [viewYear, setViewYear] = useState(String(new Date().getFullYear()));
  const [viewFromDate, setViewFromDate] = useState(new Date().toISOString().slice(0, 8) + '01');
  const [viewToDate, setViewToDate] = useState(new Date().toISOString().slice(0, 10));
  const [flowTypeFilter, setFlowTypeFilter] = useState('All'); // 'All', 'Receipt', 'Payment'

  // Print Period Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printPeriodType, setPrintPeriodType] = useState('specific_month'); // 'specific_day', 'specific_month', 'specific_year', 'custom_range', 'all_time'
  const [printDay, setPrintDay] = useState(new Date().toISOString().slice(0, 10));
  const [printMonth, setPrintMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [printYear, setPrintYear] = useState(String(new Date().getFullYear()));
  const [printFromDate, setPrintFromDate] = useState(new Date().toISOString().slice(0, 8) + '01');
  const [printToDate, setPrintToDate] = useState(new Date().toISOString().slice(0, 10));
  const [printFlowFilter, setPrintFlowFilter] = useState('All'); // 'All', 'Receipt', 'Payment'

  const fetchLedgerData = async () => {
    try {
      const [payRes, feeRes, cliRes, memRes, recRes] = await Promise.all([
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('fees').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('name').order('created_at', { ascending: false }),
        supabase.from('team_members').select('name').order('created_at', { ascending: false }),
        supabase.from('receipts_payments').select('*').order('created_at', { ascending: false })
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

      const dbReceipts = (feeRes.data || []).filter(f => Number(f.paid || 0) > 0).map(f => {
        const isExpense = (f.invoice_no || '').startsWith('PAY') || 
                          (f.service || '').toUpperCase().includes('OUT_') || 
                          (f.service || '').toLowerCase().includes('expense') || 
                          (f.service || '').toLowerCase().includes('salary') ||
                          (f.service || '').toLowerCase().includes('rent');
        return {
          id: `FEE-${f.id}`,
          type: isExpense ? 'Payment' : 'Receipt',
          client: f.client_name || (isExpense ? 'Vendor / Payee' : 'Client'),
          category: f.service || (isExpense ? 'Office & Operations Expense' : 'Client Retainer / Monthly Fee'),
          mode: f.payment_mode || 'Bank Transfer',
          amount: `₹${parseFloat(f.paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          date: (f.paid_date || f.date || f.created_at || new Date().toISOString()).split('T')[0]
        };
      });

      const directReceipts = (recRes.data || []).map(r => ({
        id: r.id,
        type: (r.type === 'income' || r.type === 'Receipt') ? 'Receipt' : 'Payment',
        client: r.party || r.title || 'Client',
        category: r.category || 'Client Retainer / Fee Payment',
        mode: r.method || 'Bank Transfer',
        amount: `₹${parseFloat(r.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        date: r.date || (r.created_at || new Date().toISOString()).split('T')[0]
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

      const allMerged = [...directReceipts, ...localTxs, ...localPayroll, ...dbReceipts, ...dbPayments];
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

  const filteredLedgerEntries = useMemo(() => {
    return entries.filter(item => {
      const matchesClient = clientFilter === 'All' || item.client === clientFilter;
      const matchesFlow = flowTypeFilter === 'All' || item.type === flowTypeFilter;
      const matchesSearch = !searchTerm || 
        (item.client && item.client.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.mode && item.mode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.amount && item.amount.toLowerCase().includes(searchTerm.toLowerCase()));

      const d = item.date || '';
      let matchesPeriod = true;
      if (viewPeriodType === 'specific_day') {
        matchesPeriod = d.startsWith(viewDay);
      } else if (viewPeriodType === 'specific_month') {
        matchesPeriod = d.startsWith(`${viewYear}-${viewMonth}`);
      } else if (viewPeriodType === 'specific_year') {
        matchesPeriod = d.startsWith(viewYear);
      } else if (viewPeriodType === 'custom_range') {
        matchesPeriod = d >= viewFromDate && d <= viewToDate;
      }

      return matchesClient && matchesFlow && matchesSearch && matchesPeriod;
    });
  }, [entries, clientFilter, flowTypeFilter, searchTerm, viewPeriodType, viewDay, viewMonth, viewYear, viewFromDate, viewToDate]);

  const totalInflow = filteredLedgerEntries.filter(e => e.type === 'Receipt').reduce((acc, e) => acc + (parseFloat(String(e.amount).replace(/[^0-9.]/g, '')) || 0), 0);
  const totalOutflow = filteredLedgerEntries.filter(e => e.type === 'Payment').reduce((acc, e) => acc + (parseFloat(String(e.amount).replace(/[^0-9.]/g, '')) || 0), 0);
  const netPosition = totalInflow - totalOutflow;

  // UNDO PAYMENT AND RETURN RECORD BACK TO FEES TRACKING AS PENDING
  const handleUndoReturnToFees = async (entry) => {
    if (!entry) return;

    const rawAmt = parseFloat(String(entry.amount).replace(/[^0-9.]/g, '')) || 0;
    const isConfirmed = window.confirm(
      `Are you sure you want to send this transaction of ₹${rawAmt.toLocaleString('en-IN')} for "${entry.client}" back to Fees Tracking as Pending?`
    );
    if (!isConfirmed) return;

    const entryId = entry.id;

    // 1. Remove from local entries state
    setEntries(prev => prev.filter(e => e.id !== entryId));

    // 2. Remove from receipts_payments / payments table
    try {
      await supabase.from('receipts_payments').delete().eq('id', entryId);
      await supabase.from('payments').delete().eq('id', entryId);
    } catch (e) {}

    // 3. Revert in fees table to Pending:
    try {
      let targetFeeId = entryId.startsWith('REC-') ? entryId.replace('REC-', '') : entryId;
      
      const { data: matchedFee } = await supabase.from('fees').select('*').eq('id', targetFeeId).single();
      if (matchedFee) {
        await supabase.from('fees').update({
          paid: 0,
          pending: matchedFee.amount,
          status: 'Pending',
          paid_date: null
        }).eq('id', matchedFee.id);
      } else {
        const { data: feesByClient } = await supabase.from('fees')
          .select('*')
          .eq('client_name', entry.client)
          .eq('status', 'Paid')
          .order('created_at', { ascending: false })
          .limit(1);

        if (feesByClient && feesByClient.length > 0) {
          await supabase.from('fees').update({
            paid: 0,
            pending: feesByClient[0].amount,
            status: 'Pending',
            paid_date: null
          }).eq('id', feesByClient[0].id);
        }
      }
    } catch (err) {}

    // Also remove from calendar transactions if present
    try {
      const rawLocal = localStorage.getItem('taxpro_calendar_transactions');
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal).filter(t => t.id !== entryId);
        localStorage.setItem('taxpro_calendar_transactions', JSON.stringify(parsed));
      }
    } catch (e) {}

    // 4. Log Audit Activity
    logAuditActivity({
      action: 'UNDO_PAYMENT',
      module: 'Receipts & Payments',
      details: `Undid ${entry.type} of ₹${rawAmt.toLocaleString('en-IN')} for "${entry.client}" and returned record to Fees Tracking as Pending`,
      metadata: { party: entry.client, amount: rawAmt, type: entry.type }
    });

    window.dispatchEvent(new CustomEvent('taxpro_financial_updated'));
    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

    if (onShowToast) {
      onShowToast(`✓ ${entry.type} of ₹${rawAmt.toLocaleString('en-IN')} undone and returned to Fees Tracking as Pending!`, 'success');
    }
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!newEntry.client || !newEntry.amount) {
      onShowToast && onShowToast('Please fill out Party / Client and Amount fields', 'warning');
      return;
    }
    
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

    logAuditActivity({
      action: 'ADD_PAYMENT',
      module: 'Receipts & Payments',
      details: `Recorded ${entryData.type}: ₹${numAmt.toLocaleString('en-IN')} for "${entryData.client}" (${entryData.category}) via ${entryData.mode}`,
      metadata: { party: entryData.client, amount: numAmt, type: entryData.type, category: entryData.category }
    });

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

  const MONTH_NAMES = [
    { num: '01', name: 'January' },
    { num: '02', name: 'February' },
    { num: '03', name: 'March' },
    { num: '04', name: 'April' },
    { num: '05', name: 'May' },
    { num: '06', name: 'June' },
    { num: '07', name: 'July' },
    { num: '08', name: 'August' },
    { num: '09', name: 'September' },
    { num: '10', name: 'October' },
    { num: '11', name: 'November' },
    { num: '12', name: 'December' }
  ];

  // PRINT FILTERED ENTRIES
  const printableEntries = useMemo(() => {
    return entries.filter(item => {
      if (printFlowFilter !== 'All' && item.type !== printFlowFilter) return false;
      const d = item.date || '';

      if (printPeriodType === 'specific_day') {
        return d.startsWith(printDay);
      } else if (printPeriodType === 'specific_month') {
        return d.startsWith(`${printYear}-${printMonth}`);
      } else if (printPeriodType === 'specific_year') {
        return d.startsWith(printYear);
      } else if (printPeriodType === 'custom_range') {
        return d >= printFromDate && d <= printToDate;
      }
      return true;
    });
  }, [entries, printPeriodType, printDay, printMonth, printYear, printFromDate, printToDate, printFlowFilter]);

  const printSummary = useMemo(() => {
    const totalIn = printableEntries.filter(e => e.type === 'Receipt').reduce((acc, e) => acc + (parseFloat(String(e.amount).replace(/[^0-9.]/g, '')) || 0), 0);
    const totalOut = printableEntries.filter(e => e.type === 'Payment').reduce((acc, e) => acc + (parseFloat(String(e.amount).replace(/[^0-9.]/g, '')) || 0), 0);
    return { totalIn, totalOut, net: totalIn - totalOut, count: printableEntries.length };
  }, [printableEntries]);

  const handlePrintLedger = () => {
    logAuditActivity({
      action: 'PRINT_DOCUMENT',
      module: 'Receipts & Payments',
      details: `Printed Receipts & Payments Ledger for ${printPeriodType === 'specific_day' ? printDay : `${printMonth}/${printYear}`} (${printSummary.count} entries, Net: ₹${printSummary.net.toLocaleString('en-IN')})`,
      metadata: { count: printSummary.count, net: printSummary.net, period: printPeriodType }
    });

    document.body.classList.add('printing-fees-ledger');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-fees-ledger');
      }, 1200);
    }, 350);
  };

  return (
    <div className="p-3 sm:p-4 lg:p-5 bg-[#f3f4f6] min-h-screen text-gray-800 relative printable-area-container">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5 print-hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold font-outfit text-[#1e1e2d]">Receipts & Payments</h1>
          <p className="text-xs text-gray-500 mt-0.5">Financial cash flow, fee receipts, and firm expenditure ledger.</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {entries.length > 0 && (
            <button 
              onClick={() => { if(window.confirm('Are you sure you want to completely wipe the ledger?')) { setEntries([]); if(onShowToast) onShowToast('Ledger cleared entirely.', 'info'); } }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              Clear Ledger
            </button>
          )}
          <button 
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold shadow-2xs transition-all cursor-pointer"
            title="Print Financial Ledger by Period"
          >
            <Printer className="w-4 h-4 text-gray-500" />
            <span>Print by Date / Month</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/25 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Record Entry
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3.5 print-hidden">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Total Inflow (Receipts)</div>
            <div className="text-xl font-black text-emerald-600 font-mono mt-0.5">
              ₹{totalInflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Total Outflow (Expenses)</div>
            <div className="text-xl font-black text-rose-600 font-mono mt-0.5">
              ₹{totalOutflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Net Cash Position</div>
            <div className="text-xl font-black text-indigo-600 font-mono mt-0.5">
              ₹{netPosition.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Interactive Day, Month & Year Period Filter Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3 mb-3.5 shadow-2xs flex flex-col gap-2.5 print-hidden">
        
        {/* Row 1: Period Selection Pills & Date Controls */}
        <div className="flex items-center justify-between gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Period:
            </span>

            <button
              onClick={() => setViewPeriodType('all_time')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewPeriodType === 'all_time' ? 'bg-[#5b52e0] text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Time
            </button>

            <button
              onClick={() => setViewPeriodType('specific_day')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewPeriodType === 'specific_day' ? 'bg-[#5b52e0] text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Specific Day
            </button>

            <button
              onClick={() => setViewPeriodType('specific_month')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewPeriodType === 'specific_month' ? 'bg-[#5b52e0] text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Specific Month
            </button>

            <button
              onClick={() => setViewPeriodType('specific_year')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewPeriodType === 'specific_year' ? 'bg-[#5b52e0] text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Whole Year
            </button>

            <button
              onClick={() => setViewPeriodType('custom_range')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewPeriodType === 'custom_range' ? 'bg-[#5b52e0] text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Date Range
            </button>
          </div>

          {/* Flow Type Filter */}
          <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-xl text-xs font-bold">
            <button
              onClick={() => setFlowTypeFilter('All')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${flowTypeFilter === 'All' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'}`}
            >
              All Types
            </button>
            <button
              onClick={() => setFlowTypeFilter('Receipt')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${flowTypeFilter === 'Receipt' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-gray-500'}`}
            >
              Receipts (IN)
            </button>
            <button
              onClick={() => setFlowTypeFilter('Payment')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${flowTypeFilter === 'Payment' ? 'bg-rose-600 text-white shadow-2xs' : 'text-gray-500'}`}
            >
              Payments (OUT)
            </button>
          </div>
        </div>

        {/* Row 2: Period Parameter Inputs & Search / Party Filter */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2 border-t border-gray-100">
          
          {/* Active Period Inputs */}
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            {viewPeriodType === 'specific_day' && (
              <div className="flex items-center gap-1.5 bg-indigo-50/70 border border-indigo-200 px-2.5 py-1 rounded-xl">
                <span className="text-[11px] font-bold text-indigo-900">Select Date:</span>
                <input 
                  type="date"
                  value={viewDay}
                  onChange={e => setViewDay(e.target.value)}
                  className="bg-white border border-gray-300 px-2 py-0.5 rounded-lg text-xs font-bold text-gray-800 outline-none"
                />
              </div>
            )}

            {viewPeriodType === 'specific_month' && (
              <div className="flex items-center gap-1.5 bg-indigo-50/70 border border-indigo-200 px-2.5 py-1 rounded-xl">
                <span className="text-[11px] font-bold text-indigo-900">Month:</span>
                <select
                  value={viewMonth}
                  onChange={e => setViewMonth(e.target.value)}
                  className="bg-white border border-gray-300 px-2 py-0.5 rounded-lg text-xs font-bold text-gray-800 outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map(m => (
                    <option key={m.num} value={m.num}>{m.name}</option>
                  ))}
                </select>
                <span className="text-[11px] font-bold text-indigo-900">Year:</span>
                <select
                  value={viewYear}
                  onChange={e => setViewYear(e.target.value)}
                  className="bg-white border border-gray-300 px-2 py-0.5 rounded-lg text-xs font-bold text-gray-800 outline-none cursor-pointer"
                >
                  {['2024', '2025', '2026', '2027'].map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            )}

            {viewPeriodType === 'specific_year' && (
              <div className="flex items-center gap-1.5 bg-indigo-50/70 border border-indigo-200 px-2.5 py-1 rounded-xl">
                <span className="text-[11px] font-bold text-indigo-900">Year:</span>
                <select
                  value={viewYear}
                  onChange={e => setViewYear(e.target.value)}
                  className="bg-white border border-gray-300 px-2.5 py-0.5 rounded-lg text-xs font-bold text-gray-800 outline-none cursor-pointer"
                >
                  {['2024', '2025', '2026', '2027'].map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            )}

            {viewPeriodType === 'custom_range' && (
              <div className="flex items-center gap-1.5 bg-indigo-50/70 border border-indigo-200 px-2.5 py-1 rounded-xl flex-wrap">
                <span className="text-[11px] font-bold text-indigo-900">From:</span>
                <input 
                  type="date"
                  value={viewFromDate}
                  onChange={e => setViewFromDate(e.target.value)}
                  className="bg-white border border-gray-300 px-1.5 py-0.5 rounded-lg text-xs font-bold text-gray-800 outline-none"
                />
                <span className="text-[11px] font-bold text-indigo-900">To:</span>
                <input 
                  type="date"
                  value={viewToDate}
                  onChange={e => setViewToDate(e.target.value)}
                  className="bg-white border border-gray-300 px-1.5 py-0.5 rounded-lg text-xs font-bold text-gray-800 outline-none"
                />
              </div>
            )}

            {/* Client / Payee dropdown */}
            <div className="flex items-center gap-1">
              <select
                value={clientFilter}
                onChange={e => setClientFilter(e.target.value)}
                className="px-2.5 py-1 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="All">All Clients & Payees</option>
                {clients.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {clientFilter !== 'All' && (
                <button
                  onClick={() => setClientFilter('All')}
                  className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold underline cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Search box */}
          <div className="w-full md:w-56">
            <input 
              type="text" 
              placeholder="Search party, category, mode..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:bg-white focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden print-hidden">
        <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="font-bold text-xs sm:text-sm text-gray-900">Live Transaction Book ({filteredLedgerEntries.length})</h3>
          <span className="text-[11px] text-gray-400 font-medium">Real-time sync active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-400 uppercase text-[10px]">
                <th className="py-2.5 px-3.5">Date</th>
                <th className="py-2.5 px-3.5">Type</th>
                <th className="py-2.5 px-3.5">Party / Description</th>
                <th className="py-2.5 px-3.5">Category</th>
                <th className="py-2.5 px-3.5">Channel</th>
                <th className="py-2.5 px-3.5 text-right">Amount</th>
                <th className="py-2.5 px-3.5 text-center">Action / Undo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLedgerEntries.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-400 italic text-xs">No transactions match current period/filters.</td>
                </tr>
              ) : (
                filteredLedgerEntries.map((e, idx) => (
                  <tr key={e.id || idx} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono text-gray-500">{e.date}</td>
                    <td className="py-2.5 px-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        e.type === 'Receipt' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {e.type === 'Receipt' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {e.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-semibold text-gray-900">{e.client}</td>
                    <td className="py-2.5 px-3.5 text-gray-600">{e.category || (e.type === 'Receipt' ? 'Client Fee' : 'Office Expense')}</td>
                    <td className="py-2.5 px-3.5 font-mono text-gray-700">{e.mode || 'UPI'}</td>
                    <td className={`py-2.5 px-3.5 text-right font-mono font-bold ${e.type === 'Receipt' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {e.type === 'Receipt' ? '+' : '-'}{e.amount}
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button 
                          onClick={() => handleUndoReturnToFees(e)} 
                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-900 border border-amber-200 transition-all cursor-pointer inline-flex items-center justify-center shadow-2xs hover:scale-105"
                          title={`Undo & Send back to Fees Tracking (${e.client} - ${e.amount})`}
                        >
                          <Undo2 className="w-3.5 h-3.5 text-amber-600" />
                        </button>
                        <button 
                          onClick={() => handleDelete(e.id)} 
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRINT PERIOD MODAL */}
      {isPrintModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsPrintModalOpen(false); }}
          className="modal-overlay-backdrop print-hidden"
          style={{ zIndex: 999 }}
        >
          <div className="modal-content-box max-w-xl">
            <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white p-5 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-xs">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black font-outfit text-white">Print Receipts & Payments Ledger</h3>
                  <p className="text-xs text-gray-300">Filter by exact Day, Month, Year or Date Range</p>
                </div>
              </div>
              <button onClick={() => setIsPrintModalOpen(false)} className="p-1 text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 text-xs font-semibold">
              <div>
                <label className="text-gray-700 block mb-1">Select Reporting Period</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPrintPeriodType('specific_day')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      printPeriodType === 'specific_day' ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    📅 Specific Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintPeriodType('specific_month')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      printPeriodType === 'specific_month' ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    🗓️ Specific Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintPeriodType('specific_year')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      printPeriodType === 'specific_year' ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    📆 Whole Year
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintPeriodType('custom_range')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      printPeriodType === 'custom_range' ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    ⏱️ Date Range
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintPeriodType('all_time')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center col-span-2 ${
                      printPeriodType === 'all_time' ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    🌐 All-Time
                  </button>
                </div>
              </div>

              {printPeriodType === 'specific_day' && (
                <div className="bg-indigo-50/40 border border-indigo-100 p-3 rounded-xl">
                  <label className="text-gray-700 block mb-1">Choose Exact Date</label>
                  <input 
                    type="date"
                    value={printDay}
                    onChange={e => setPrintDay(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl outline-none font-bold text-xs"
                  />
                </div>
              )}

              {printPeriodType === 'specific_month' && (
                <div className="bg-indigo-50/40 border border-indigo-100 p-3 rounded-xl grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-gray-700 block mb-1">Month</label>
                    <select
                      value={printMonth}
                      onChange={e => setPrintMonth(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl outline-none font-bold text-xs"
                    >
                      {MONTH_NAMES.map(m => (
                        <option key={m.num} value={m.num}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-700 block mb-1">Year</label>
                    <select
                      value={printYear}
                      onChange={e => setPrintYear(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl outline-none font-bold text-xs"
                    >
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between text-xs font-bold">
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase">Matching Entries</span>
                  <span className="text-indigo-700 font-mono font-black">{printSummary.count} Transactions</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-500 block text-[10px] uppercase">Net Flow</span>
                  <span className={`font-mono font-black ${printSummary.net >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    ₹{printSummary.net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePrintLedger}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print Statement
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE LETTERHEAD DOCUMENT */}
      <div className="hidden print:block fees-print-document bg-white text-black p-0 m-0">
        <div className="border-b-2 border-gray-900 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black font-outfit uppercase tracking-tight text-gray-900">
                TAXPRO PRACTICE MANAGEMENT SYSTEM
              </h1>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-700 mt-0.5">
                Official Receipts & Payments Statement
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono font-black text-indigo-950">
                Period: {printPeriodType === 'specific_day' ? printDay : `${printMonth}/${printYear}`}
              </div>
              <div className="text-[10px] font-mono text-gray-600 mt-0.5">
                Printed: {new Date().toLocaleDateString('en-IN')}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="border border-gray-300 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-gray-600 block">Total Receipts (IN)</span>
            <span className="text-base font-black font-mono text-gray-900 block mt-0.5">
              ₹{printSummary.totalIn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="border border-gray-300 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-gray-600 block">Total Payments (OUT)</span>
            <span className="text-base font-black font-mono text-gray-900 block mt-0.5">
              ₹{printSummary.totalOut.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="border border-gray-300 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-gray-600 block">Net Position</span>
            <span className="text-base font-black font-mono text-gray-900 block mt-0.5">
              ₹{printSummary.net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <table className="w-full text-left text-xs border-collapse border border-gray-300 mb-8">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300 text-gray-800 font-extrabold uppercase text-[10px]">
              <th className="p-2.5 border border-gray-300">Date</th>
              <th className="p-2.5 border border-gray-300">Type</th>
              <th className="p-2.5 border border-gray-300">Party / Client</th>
              <th className="p-2.5 border border-gray-300">Category</th>
              <th className="p-2.5 border border-gray-300">Mode</th>
              <th className="p-2.5 border border-gray-300 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {printableEntries.map((r, idx) => (
              <tr key={r.id || idx} className="border-b border-gray-200">
                <td className="p-2 border border-gray-300 font-mono">{r.date}</td>
                <td className="p-2 border border-gray-300 font-bold">{r.type}</td>
                <td className="p-2 border border-gray-300 font-bold">{r.client}</td>
                <td className="p-2 border border-gray-300">{r.category}</td>
                <td className="p-2 border border-gray-300 font-mono">{r.mode}</td>
                <td className="p-2 border border-gray-300 font-mono font-bold text-right">{r.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-end mt-12 pt-6 border-t-2 border-gray-400 text-[10px] text-gray-600">
          <div>
            <p className="font-bold text-gray-900">TaxPro PMS • Accounting & Practice Ledger Statement</p>
          </div>
          <div className="text-right">
            <div className="h-10 border-b border-gray-500 w-52 mb-1"></div>
            <span className="font-bold text-gray-900">Authorized Signatory</span>
          </div>
        </div>
      </div>

      {/* RECORD MANUAL MODAL */}
      {isModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
          className="modal-overlay-backdrop print-hidden"
        >
          <div className="modal-content-box max-w-2xl">
            <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-xs">
                  <DollarSign className="w-5 h-5" />
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
                    className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:border-indigo-500 font-semibold bg-gray-50" 
                    placeholder={newEntry.type === 'Receipt' ? "e.g. Acme Corp" : "e.g. Rahul Sharma (Staff)"} 
                  />
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

      {/* Undo Toast */}
      {pendingDelete && (
        <div className="fixed bottom-6 right-6 bg-[#1e1e2d] border border-gray-700 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-6 z-50 animate-slide-up print-hidden">
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
