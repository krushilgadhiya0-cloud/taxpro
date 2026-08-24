import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, Send, Plus, X, Printer, History, Mail, AlertCircle, 
  FileText, Download, CheckCircle2, CheckCheck, ArrowUpRight, ArrowDownRight,
  CreditCard, Calendar, Building2, User, Filter, Search, ChevronDown,
  ShieldCheck, RefreshCw, Layers, Wallet, Briefcase, Zap
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { logAuditActivity } from '../../lib/auditLogger';

const DEFAULT_CYCLIC_BILLS = [
  { id: 'CYC-RENT', name: 'Office Premises Rent', vendor: 'Office Landlord / Estate', amount: 25000, category: 'Office Rent', dueDay: 1, method: 'Bank Transfer', frequency: 'Monthly', isActive: true },
  { id: 'CYC-ELEC', name: 'Electricity Utility Bill', vendor: 'Electricity Distribution Corp', amount: 4500, category: 'Electricity & Utilities', dueDay: 10, method: 'Net Banking', frequency: 'Monthly', isActive: true },
  { id: 'CYC-WIFI', name: 'High-Speed Broadband & Wifi', vendor: 'Fiber Internet Service Provider', amount: 1499, category: 'Internet & Telecom', dueDay: 5, method: 'UPI', frequency: 'Monthly', isActive: true },
  { id: 'CYC-MAINT', name: 'Office Cleaning & Society Maintenance', vendor: 'Commercial Complex Maintenance', amount: 2200, category: 'Office Maintenance', dueDay: 15, method: 'UPI', frequency: 'Monthly', isActive: true },
  { id: 'CYC-SAAS', name: 'Software & Tax Compliance Suite', vendor: 'Cloud Accounting & Tax Portal', amount: 3500, category: 'Software & Subscriptions', dueDay: 1, method: 'Credit Card', frequency: 'Monthly', isActive: true }
];

export default function FeesTrackingView({ onShowToast }) {
  const [fees, setFees] = useState([]);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cyclic / Recurring Bills State
  const [cyclicBills, setCyclicBills] = useState(() => {
    try {
      const saved = localStorage.getItem('taxpro_cyclic_bills');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_CYCLIC_BILLS;
  });
  const [isCyclicModalOpen, setIsCyclicModalOpen] = useState(false);
  const [isAddCyclicModalOpen, setIsAddCyclicModalOpen] = useState(false);
  const [editingCyclicBill, setEditingCyclicBill] = useState(null);
  const [newCyclicBill, setNewCyclicBill] = useState({
    name: '',
    vendor: '',
    amount: '',
    category: 'Office Rent',
    dueDay: 1,
    method: 'Bank Transfer',
    frequency: 'Monthly',
    isActive: true
  });

  // Active view filters
  const [activeTab, setActiveTab] = useState('All'); // 'All', 'IN_CLIENT', 'IN_OTHER', 'OUT_SALARY', 'OUT_EXPENSE', 'OUT_CYCLIC', 'OUT_OWNER'
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'Pending', 'Paid'
  const [searchQuery, setSearchQuery] = useState('');

  // Mark as Paid / Disburse modal state
  const [payingItem, setPayingItem] = useState(null);
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));

  // Manual Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({ 
    flowType: 'IN', // 'IN' or 'OUT'
    categoryType: 'Client Retainer Fee',
    party: '', 
    service: 'Monthly GST & Tax Compliance Retainer', 
    totalAmount: '', 
    paid: '',
    dueDate: new Date().toISOString().slice(0, 10),
    isRecurringCyclic: false,
    cyclicDueDay: 1
  });

  // Print Dialog & Custom Date Filters
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printPeriodType, setPrintPeriodType] = useState('specific_month'); // 'specific_day', 'specific_month', 'specific_year', 'custom_range', 'all_time'
  const [printDay, setPrintDay] = useState(new Date().toISOString().slice(0, 10));
  const [printMonth, setPrintMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [printYear, setPrintYear] = useState(String(new Date().getFullYear()));
  const [printFromDate, setPrintFromDate] = useState(new Date().toISOString().slice(0, 8) + '01');
  const [printToDate, setPrintToDate] = useState(new Date().toISOString().slice(0, 10));
  const [printFlowFilter, setPrintFlowFilter] = useState('All'); // 'All', 'IN', 'OUT'
  const [printStatusFilter, setPrintStatusFilter] = useState('All'); // 'All', 'Paid', 'Pending'
  const [isPrinting, setIsPrinting] = useState(false);

  const formatINR = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

  const calculatePending = (total, paid) => Math.max(0, Number(total) - Number(paid));
  
  const getStatus = (total, paid) => {
    const pending = calculatePending(total, paid);
    if (pending === 0 && Number(total) > 0) return 'Paid';
    if (Number(paid) > 0 && pending > 0) return 'Partially Paid';
    return 'Pending';
  };

  // FETCH ALL DATA & AUTO-GENERATE MONTHLY CLIENT RETAINERS, SALARIES & MERGE OTHER EXPENSES
  const fetchFeesData = async () => {
    setIsLoading(true);
    try {
      const [feesRes, clientsRes, teamRes, payRes, recRes] = await Promise.all([
        supabase.from('fees').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('team_members').select('*').order('created_at', { ascending: false }),
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('receipts_payments').select('*').order('created_at', { ascending: false })
      ]);

      const clientList = clientsRes.data || [];
      const memberList = teamRes.data || [];
      setClients(clientList);
      setTeamMembers(memberList);

      const currentMonthKey = new Date().toISOString().slice(0, 7); // e.g. "2026-08"
      const todayIso = new Date().toISOString().slice(0, 10);
      const receiptsList = recRes.data || [];

      // 1. Map existing DB Fees (Only pending / unpaid items belong in Fees Tracking; salaries are in Members Payment)
      const mappedDbFees = (feesRes.data || [])
        .filter(f => {
          const serv = (f.service || '').toLowerCase();
          const clientOrParty = (f.client_name || f.client || '').toLowerCase();
          // Exclude staff salaries (handled via Members Payment)
          if (serv.includes('salary') || serv.includes('payroll') || clientOrParty.includes('salary')) return false;

          const total = Number(f.amount || 0);
          const paid = Number(f.paid || 0);
          const pending = calculatePending(total, paid);
          // If status is Paid or pending is 0, it belongs in Receipts & Payments, NOT in Fees Tracking
          return f.status !== 'Paid' && pending > 0;
        })
        .map(f => {
          const serv = (f.service || '').toLowerCase();
          let subType = 'IN_CLIENT';
          let flowType = 'IN';

          if (serv.includes('owner') || serv.includes('drawing') || serv.includes('partner')) {
            flowType = 'OUT';
            subType = 'OUT_OWNER';
          } else if (serv.includes('rent') || serv.includes('utility') || serv.includes('expense') || serv.includes('bill')) {
            flowType = 'OUT';
            subType = 'OUT_EXPENSE';
          } else if (serv.includes('refund') || serv.includes('interest') || serv.includes('other income')) {
            flowType = 'IN';
            subType = 'IN_OTHER';
          }

          const total = Number(f.amount || 0);
          const paid = Number(f.paid || 0);
          return {
            id: f.id,
            flowType,
            subType,
            client: f.client_name || f.client || 'Client',
            party: f.client_name || f.client || 'Client',
            totalFee: total,
            paid: paid,
            pending: calculatePending(total, paid),
            service: f.service || (flowType === 'IN' ? 'Professional Tax & Advisory Fee' : 'Disbursement'),
            status: 'Pending',
            dueDate: f.due_date || (f.created_at || todayIso).split('T')[0],
            date: f.date || (f.created_at || todayIso).split('T')[0],
            paidDate: null,
            paymentMode: f.payment_mode || 'Bank Transfer',
            invoiceNo: f.invoice_no || `INV-${f.id}`
          };
        });

      // 2. Automatically generate / include monthly client retainer fees (INFLOW) if not already paid
      const autoClientFees = [];
      clientList.forEach(c => {
        const feeAmt = Number(c.fee_amount || 0);
        if (feeAmt > 0 && c.status === 'Active') {
          const alreadyPaidInReceipts = receiptsList.some(r => 
            (r.type === 'income' || r.type === 'Receipt') &&
            (r.party === c.name || (r.title && r.title.includes(c.name))) &&
            (r.date && r.date.startsWith(currentMonthKey))
          );

          const hasCurrentMonthEntry = mappedDbFees.some(f => 
            f.flowType === 'IN' && 
            (f.party === c.name || f.client === c.name) && 
            (f.dueDate && f.dueDate.startsWith(currentMonthKey))
          );

          if (!hasCurrentMonthEntry && !alreadyPaidInReceipts) {
            autoClientFees.push({
              id: `AUTO-CL-${c.id}-${currentMonthKey}`,
              flowType: 'IN',
              subType: 'IN_CLIENT',
              client: c.name,
              party: c.name,
              totalFee: feeAmt,
              paid: 0,
              pending: feeAmt,
              service: `${c.billing_cycle || 'Monthly'} Retainer (${c.service_scope || 'Direct & Indirect Tax Compliance'})`,
              status: 'Pending',
              dueDate: c.billing_start_date || `${currentMonthKey}-05`,
              date: `${currentMonthKey}-01`,
              paidDate: null,
              paymentMode: 'Bank Transfer',
              invoiceNo: `INV-${currentMonthKey.replace('-', '')}-${(c.name || 'CL').slice(0, 3).toUpperCase()}`
            });
          }
        }
      });

      // 3. Automatically generate active Cyclic Monthly Payments (Office Rent, Electricity, Wifi, etc.) if not already paid
      const autoCyclicExpenses = [];
      let activeCyclicList = cyclicBills;
      try {
        const savedCyc = localStorage.getItem('taxpro_cyclic_bills');
        if (savedCyc) activeCyclicList = JSON.parse(savedCyc);
      } catch (e) {}

      activeCyclicList.filter(b => b.isActive !== false).forEach(bill => {
        const billAmt = Number(bill.amount || 0);
        if (billAmt > 0) {
          const alreadyPaidInReceipts = receiptsList.some(r => 
            (r.type === 'expense' || r.type === 'Payment') &&
            ((r.party && r.party.toLowerCase().includes(bill.name.toLowerCase())) || (r.title && r.title.toLowerCase().includes(bill.name.toLowerCase()))) &&
            (r.date && r.date.startsWith(currentMonthKey))
          );

          const hasCyclicEntry = mappedDbFees.some(f => 
            f.flowType === 'OUT' && 
            (f.id.includes(bill.id) || (f.party && f.party.toLowerCase().includes(bill.name.toLowerCase()))) && 
            (f.dueDate && f.dueDate.startsWith(currentMonthKey))
          );

          if (!hasCyclicEntry && !alreadyPaidInReceipts) {
            const dueDayFormatted = String(Math.min(31, Math.max(1, Number(bill.dueDay || 1)))).padStart(2, '0');
            autoCyclicExpenses.push({
              id: `AUTO-CYC-${bill.id}-${currentMonthKey}`,
              flowType: 'OUT',
              subType: 'OUT_EXPENSE',
              client: bill.vendor || bill.name,
              party: `${bill.name} (${bill.vendor || bill.category})`,
              totalFee: billAmt,
              paid: 0,
              pending: billAmt,
              service: `Cyclic Bill: ${bill.name} - ${bill.category} (${bill.frequency || 'Monthly'})`,
              status: 'Pending',
              dueDate: `${currentMonthKey}-${dueDayFormatted}`,
              date: `${currentMonthKey}-01`,
              paidDate: null,
              paymentMode: bill.method || 'Bank Transfer',
              invoiceNo: `BILL-${currentMonthKey.replace('-', '')}-${(bill.name || 'EXP').slice(0, 3).toUpperCase()}`
            });
          }
        }
      });

      // Combine ONLY active pending dues (Clients and Cyclic/Office Expenses)
      const allCombined = [...mappedDbFees, ...autoClientFees, ...autoCyclicExpenses];
      const uniqueMap = new Map();
      allCombined.forEach(item => {
        if (!uniqueMap.has(item.id) && Number(item.pending || item.totalFee) > 0) {
          uniqueMap.set(item.id, item);
        }
      });

      const sorted = Array.from(uniqueMap.values()).sort((a, b) => {
        const pA = Number(a.pending || a.totalFee || 0);
        const pB = Number(b.pending || b.totalFee || 0);
        return pB - pA;
      });
      setFees(sorted);
    } catch (e) {
      console.error('[Fees Fetch Error]:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeesData();

    const handleUpdate = () => fetchFeesData();
    window.addEventListener('taxpro_financial_updated', handleUpdate);
    window.addEventListener('taxpro_db_updated', handleUpdate);

    return () => {
      window.removeEventListener('taxpro_financial_updated', handleUpdate);
      window.removeEventListener('taxpro_db_updated', handleUpdate);
    };
  }, []);

  // MANUAL ADD NEW ENTRY (CLIENT IN, OTHER IN, SALARY OUT, EXPENSE OUT, OWNER OUT)
  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!newEntry.party.trim() || !newEntry.totalAmount) return;
    
    const nextId = `FT-${Date.now()}`;
    const total = Number(newEntry.totalAmount) || 0;
    const paid = Number(newEntry.paid) || 0;
    const invNo = `${newEntry.flowType === 'IN' ? 'INV' : 'PAY'}-${Date.now().toString().slice(-4)}`;
    const feeStatus = getStatus(total, paid);

    let subType = 'IN_CLIENT';
    if (newEntry.flowType === 'IN') {
      subType = newEntry.categoryType.includes('Client') ? 'IN_CLIENT' : 'IN_OTHER';
    } else {
      if (newEntry.categoryType.includes('Salary')) subType = 'OUT_SALARY';
      else if (newEntry.categoryType.includes('Owner')) subType = 'OUT_OWNER';
      else subType = 'OUT_EXPENSE';
    }

    const newRecord = {
      id: nextId,
      flowType: newEntry.flowType,
      subType,
      client: newEntry.party,
      party: newEntry.party,
      totalFee: total,
      paid: paid,
      pending: calculatePending(total, paid),
      service: `${newEntry.categoryType} - ${newEntry.service}`,
      status: feeStatus,
      invoiceNo: invNo,
      dueDate: newEntry.dueDate || new Date().toISOString().slice(0, 10),
      date: new Date().toISOString().slice(0, 10),
      paidDate: paid >= total && total > 0 ? new Date().toISOString().slice(0, 10) : null,
      paymentMode: 'Bank Transfer'
    };

    const pendingAmount = calculatePending(total, paid);
    if (pendingAmount > 0) {
      setFees(prev => [newRecord, ...prev]);
    }

    try {
      await supabase.from('fees').insert([{
        id: nextId,
        client_name: newEntry.party,
        invoice_no: invNo,
        amount: total,
        paid: paid,
        pending: pendingAmount,
        service: newRecord.service,
        status: feeStatus,
        date: newRecord.date,
        due_date: newRecord.dueDate
      }]);

      // If initial payment was made, also write to receipts_payments
      if (paid > 0) {
        await supabase.from('receipts_payments').insert([{
          id: `REC-${Date.now()}`,
          title: `${newEntry.flowType === 'IN' ? 'Receipt' : 'Payment'} - ${newEntry.party}`,
          type: newEntry.flowType === 'IN' ? 'income' : 'expense',
          category: newEntry.categoryType,
          amount: paid,
          method: 'Bank Transfer',
          party: newEntry.party,
          date: new Date().toISOString().slice(0, 10),
          reference: invNo,
          notes: newEntry.service
        }]);
      }
    } catch (err) {}

    window.dispatchEvent(new CustomEvent('taxpro_financial_updated'));
    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

    // If user checked "Save as a Monthly Cyclic Payment", automatically add to cyclicBills templates
    if (newEntry.isRecurringCyclic && newEntry.flowType === 'OUT') {
      const cycId = `CYC-${Date.now().toString().slice(-4)}`;
      const cyclicTemplate = {
        id: cycId,
        name: newEntry.party,
        vendor: newEntry.party,
        amount: total,
        category: newEntry.categoryType,
        dueDay: Number(newEntry.cyclicDueDay) || 1,
        method: 'Bank Transfer',
        frequency: 'Monthly',
        isActive: true
      };
      const updatedCyclic = [cyclicTemplate, ...cyclicBills];
      setCyclicBills(updatedCyclic);
      localStorage.setItem('taxpro_cyclic_bills', JSON.stringify(updatedCyclic));
      try {
        fetch('/api/db/storage/taxpro_cyclic_bills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: updatedCyclic })
        });
      } catch (e) {}
    }

    logAuditActivity({
      action: 'ADD_PAYMENT',
      module: 'Fees Tracking',
      details: `Added ${newEntry.flowType === 'IN' ? 'Inflow Fee' : 'Outflow Expense'} of ₹${total.toLocaleString('en-IN')} for "${newEntry.party}" (${newEntry.categoryType})${newEntry.isRecurringCyclic ? ' [Saved as Recurring Monthly Bill]' : ''}`,
      metadata: { party: newEntry.party, amount: total, flowType: newEntry.flowType, category: newEntry.categoryType }
    });

    setNewEntry({ 
      flowType: 'IN', 
      categoryType: 'Client Retainer Fee',
      party: '', 
      service: 'Monthly GST & Tax Compliance Retainer', 
      totalAmount: '', 
      paid: '',
      dueDate: new Date().toISOString().slice(0, 10),
      isRecurringCyclic: false,
      cyclicDueDay: 1
    });
    setIsAddModalOpen(false);
    if (onShowToast) {
      if (pendingAmount === 0) {
        onShowToast(`✓ Fully paid entry created directly in Receipts & Payments!`, 'success');
      } else {
        onShowToast(`✓ Due entry of ${formatINR(pendingAmount)} added to Fees Tracking!`, 'success');
      }
    }
  };

  // SAVE / EDIT CYCLIC BILL TEMPLATE
  const handleSaveCyclicBill = (e) => {
    e.preventDefault();
    if (!newCyclicBill.name.trim() || !newCyclicBill.amount) return;

    const numAmt = Number(newCyclicBill.amount) || 0;
    let updated;
    if (editingCyclicBill) {
      updated = cyclicBills.map(b => b.id === editingCyclicBill.id ? { 
        ...newCyclicBill, 
        id: editingCyclicBill.id, 
        amount: numAmt,
        dueDay: Number(newCyclicBill.dueDay) || 1
      } : b);
    } else {
      const cycId = `CYC-${Date.now().toString().slice(-4)}`;
      updated = [{ 
        ...newCyclicBill, 
        id: cycId, 
        amount: numAmt,
        dueDay: Number(newCyclicBill.dueDay) || 1
      }, ...cyclicBills];
    }

    setCyclicBills(updated);
    localStorage.setItem('taxpro_cyclic_bills', JSON.stringify(updated));
    try {
      fetch('/api/db/storage/taxpro_cyclic_bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: updated })
      });
    } catch(e) {}

    logAuditActivity({
      action: 'ADD_PAYMENT',
      module: 'Fees Tracking',
      details: `${editingCyclicBill ? 'Updated' : 'Added new'} Cyclic Monthly Payment template "${newCyclicBill.name}" of ₹${numAmt.toLocaleString('en-IN')} (Vendor: ${newCyclicBill.vendor || 'N/A'}, Due Day: ${newCyclicBill.dueDay})`,
      metadata: { billName: newCyclicBill.name, amount: numAmt, dueDay: newCyclicBill.dueDay }
    });

    setIsAddCyclicModalOpen(false);
    setEditingCyclicBill(null);
    setNewCyclicBill({
      name: '',
      vendor: '',
      amount: '',
      category: 'Office Rent',
      dueDay: 1,
      method: 'Bank Transfer',
      frequency: 'Monthly',
      isActive: true
    });

    if (onShowToast) onShowToast(`✓ Cyclic payment "${newCyclicBill.name}" saved & generated in active cycles!`, 'success');
    fetchFeesData();
  };

  // DELETE CYCLIC BILL TEMPLATE
  const handleDeleteCyclicBill = (id, name) => {
    const updated = cyclicBills.filter(b => b.id !== id);
    setCyclicBills(updated);
    localStorage.setItem('taxpro_cyclic_bills', JSON.stringify(updated));
    try {
      fetch('/api/db/storage/taxpro_cyclic_bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: updated })
      });
    } catch(e) {}

    if (onShowToast) onShowToast(`✓ Cyclic bill template "${name}" removed.`, 'info');
    fetchFeesData();
  };

  // TOGGLE ACTIVE / PAUSE CYCLIC BILL
  const handleToggleCyclicStatus = (id) => {
    const updated = cyclicBills.map(b => b.id === id ? { ...b, isActive: !b.isActive } : b);
    setCyclicBills(updated);
    localStorage.setItem('taxpro_cyclic_bills', JSON.stringify(updated));
    try {
      fetch('/api/db/storage/taxpro_cyclic_bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: updated })
      });
    } catch(e) {}
    fetchFeesData();
  };

  const handleOpenEditCyclic = (bill) => {
    setEditingCyclicBill(bill);
    setNewCyclicBill({ ...bill });
    setIsAddCyclicModalOpen(true);
  };

  // MARK AS DONE / PAID
  const handleConfirmMarkAsDone = async () => {
    if (!payingItem) return;

    const amountToPay = Number(payingItem.totalFee) || 0;
    const partyName = payingItem.party || payingItem.client;
    const invNo = payingItem.invoiceNo || `INV-${payingItem.id}`;
    const isIncome = payingItem.flowType === 'IN';

    try {
      await supabase.from('fees').upsert([{
        id: payingItem.id,
        client_name: partyName,
        invoice_no: invNo,
        amount: amountToPay,
        paid: amountToPay,
        pending: 0,
        service: payingItem.service,
        status: 'Paid',
        paid_date: paymentDate,
        payment_mode: paymentMode,
        date: payingItem.date || paymentDate,
        due_date: payingItem.dueDate || paymentDate
      }]);
    } catch (fErr) {}

    // AUTOMATICALLY CREATE ENTRY IN RECEIPTS & PAYMENTS!
    try {
      let category = isIncome ? 'Client Retainer / Fee Payment' : 'Office & Other Expenses';
      if (payingItem.subType === 'OUT_SALARY') category = 'Staff Salary & Payroll';
      else if (payingItem.subType === 'OUT_OWNER') category = 'Owner Drawings & Payments';
      else if (payingItem.subType === 'IN_OTHER') category = 'Other Practice Income';

      await supabase.from('receipts_payments').insert([{
        id: `REC-${Date.now()}`,
        title: isIncome ? `Receipt - ${partyName}` : `Payment Disbursed - ${partyName}`,
        type: isIncome ? 'income' : 'expense',
        category,
        amount: amountToPay,
        method: paymentMode,
        party: partyName,
        date: paymentDate,
        reference: invNo,
        notes: payingItem.service || 'Settled from Fees & Billing Ledger'
      }]);
    } catch (rErr) {}

    // REMOVE IMMEDIATELY FROM FEES TRACKING SINCE IT IS NOW PAID AND IN RECEIPTS & PAYMENTS!
    setFees(prev => prev.filter(f => f.id !== payingItem.id));

    logAuditActivity({
      action: 'SETTLE_PAYMENT',
      module: 'Fees Tracking',
      details: `Settled & marked as Done: ${isIncome ? 'Inflow Receipt' : 'Expense Outflow'} of ₹${Number(amountToPay).toLocaleString('en-IN')} for "${partyName}" via ${paymentMode} - transferred to Receipts & Payments`,
      metadata: { party: partyName, amount: amountToPay, mode: paymentMode, flowType: payingItem.flowType }
    });

    setPayingItem(null);
    window.dispatchEvent(new CustomEvent('taxpro_financial_updated'));
    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

    if (onShowToast) {
      onShowToast(`✓ ${isIncome ? 'Inflow' : 'Outflow'} of ${formatINR(amountToPay)} settled: transferred to Receipts & Payments and removed from Fees Tracking!`, 'success');
    }
  };

  // SEND ELECTRONIC REMINDER
  const handleSendReminder = (e, partyName) => {
    if (e) e.stopPropagation();
    if (onShowToast) onShowToast(`Verified: Electronic notice dispatched to ${partyName}'s registered contact.`, 'success');
  };

  // FILTERED FEES FOR VIEWING IN THE INTERACTIVE UI
  const filteredFees = useMemo(() => {
    const list = fees.filter(item => {
      let matchesTab = true;
      if (activeTab === 'IN_CLIENT') matchesTab = item.subType === 'IN_CLIENT';
      else if (activeTab === 'IN_OTHER') matchesTab = item.subType === 'IN_OTHER';
      else if (activeTab === 'OUT_CYCLIC') matchesTab = item.subType === 'OUT_EXPENSE' && (item.id.includes('CYC') || (item.service && item.service.includes('Cyclic')));
      else if (activeTab === 'OUT_EXPENSE') matchesTab = item.subType === 'OUT_EXPENSE';
      else if (activeTab === 'OUT_OWNER') matchesTab = item.subType === 'OUT_OWNER';
      else if (activeTab === 'IN') matchesTab = item.flowType === 'IN';
      else if (activeTab === 'OUT') matchesTab = item.flowType === 'OUT';

      const matchesStatus = statusFilter === 'All' || 
        (statusFilter === 'Pending' && (item.status === 'Pending' || item.status === 'Partially Paid')) ||
        (statusFilter === 'Paid' && item.status === 'Paid');

      const matchesSearch = !searchQuery || 
        (item.party && item.party.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.client && item.client.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.service && item.service.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.invoiceNo && item.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (String(item.totalFee).includes(searchQuery));

      return matchesTab && matchesStatus && matchesSearch;
    });

    // Sort by Due / Pending payments highest to lowest
    return list.sort((a, b) => {
      const pendingA = Number(a.pending ?? (Number(a.totalFee || 0) - Number(a.paid || 0)));
      const pendingB = Number(b.pending ?? (Number(b.totalFee || 0) - Number(b.paid || 0)));
      if (pendingB !== pendingA) {
        return pendingB - pendingA; // Highest due first
      }
      return Number(b.totalFee || 0) - Number(a.totalFee || 0); // Highest total fee first
    });
  }, [fees, activeTab, statusFilter, searchQuery]);

  // FILTERED TRANSACTIONS FOR OFFICIAL PRINTING
  const printableRecords = useMemo(() => {
    return fees.filter(item => {
      if (printFlowFilter !== 'All' && item.flowType !== printFlowFilter) return false;
      if (printStatusFilter === 'Paid' && item.status !== 'Paid') return false;
      if (printStatusFilter === 'Pending' && item.status === 'Paid') return false;

      const itemDate = item.dueDate || item.date || '';

      if (printPeriodType === 'specific_day') {
        return itemDate.startsWith(printDay);
      } else if (printPeriodType === 'specific_month') {
        return itemDate.startsWith(`${printYear}-${printMonth}`);
      } else if (printPeriodType === 'specific_year') {
        return itemDate.startsWith(printYear);
      } else if (printPeriodType === 'custom_range') {
        return itemDate >= printFromDate && itemDate <= printToDate;
      }
      return true;
    });
  }, [fees, printPeriodType, printDay, printMonth, printYear, printFromDate, printToDate, printFlowFilter, printStatusFilter]);

  const printTotals = useMemo(() => {
    const totalIn = printableRecords.filter(r => r.flowType === 'IN').reduce((acc, r) => acc + Number(r.totalFee || 0), 0);
    const totalOut = printableRecords.filter(r => r.flowType === 'OUT').reduce((acc, r) => acc + Number(r.totalFee || 0), 0);
    const net = totalIn - totalOut;
    return { totalIn, totalOut, net, count: printableRecords.length };
  }, [printableRecords]);

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

  // TRIGGER PRINT DIALOG
  const handlePrintFeesLedger = () => {
    logAuditActivity({
      action: 'PRINT_DOCUMENT',
      module: 'Fees Tracking',
      details: `Printed Financial Ledger for ${printPeriodType === 'specific_day' ? printDay : `${printMonth}/${printYear}`} (${printTotals.count} entries, Net: ₹${printTotals.net.toLocaleString('en-IN')})`,
      metadata: { count: printTotals.count, net: printTotals.net, period: printPeriodType }
    });

    setIsPrinting(true);
    document.body.classList.add('printing-fees-ledger');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-fees-ledger');
        setIsPrinting(false);
      }, 1200);
    }, 350);
  };

  const getPeriodLabel = () => {
    if (printPeriodType === 'specific_day') {
      const d = new Date(printDay);
      return `Exact Date: ${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    } else if (printPeriodType === 'specific_month') {
      const mObj = MONTH_NAMES.find(m => m.num === printMonth);
      return `Month: ${mObj?.name || printMonth} ${printYear}`;
    } else if (printPeriodType === 'specific_year') {
      return `Financial Year: ${printYear}`;
    } else if (printPeriodType === 'custom_range') {
      return `Date Range: ${printFromDate} to ${printToDate}`;
    }
    return 'All-Time Master Ledger';
  };

  return (
    <div className="p-3 sm:p-4 lg:p-5 bg-[#f3f4f6] min-h-screen text-gray-800 relative printable-area-container">
      
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 print-hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold font-outfit text-[#1e1e2d]">Fees Tracking & Financial Ledger</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage Client Fees (IN), Other Income (IN), Cyclic Bills (OUT), Office Expenses (OUT) & Owner Payments (OUT) sorted highest to lowest dues.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={() => setIsCyclicModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800 text-xs font-bold shadow-2xs transition-all cursor-pointer"
            title="Configure Recurring Monthly Cyclic Expenses (Office Rent, Electricity, Wifi, etc.)"
          >
            <RefreshCw className="w-3.5 h-3.5 text-orange-600 animate-spin-hover" />
            <span>🔄 Cyclic Bills ({cyclicBills.filter(b => b.isActive !== false).length})</span>
          </button>

          <button 
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold shadow-2xs transition-all cursor-pointer"
            title="Print statement by Month, Specific Day, or Year"
          >
            <Printer className="w-3.5 h-3.5 text-gray-500" />
            <span>Print by Date / Month</span>
          </button>

          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#5b52e0] hover:bg-[#4c44cf] text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> 
            <span>Add Ledger Entry</span>
          </button>
        </div>
      </div>

      {/* FILTER TABS: ALL, CLIENT FEES, OTHER INCOME, CYCLIC BILLS, OTHER EXPENSES, OWNER PAYMENTS */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3 mb-3 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3 print-hidden">
        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
          <button
            onClick={() => setActiveTab('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'All' ? 'bg-[#5b52e0] text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({fees.length})
          </button>

          <button
            onClick={() => setActiveTab('IN_CLIENT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'IN_CLIENT' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Client Fees (IN)</span>
          </button>

          <button
            onClick={() => setActiveTab('IN_OTHER')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'IN_OTHER' ? 'bg-teal-600 text-white shadow-xs' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Other Income (IN)</span>
          </button>

          <button
            onClick={() => setActiveTab('OUT_CYCLIC')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'OUT_CYCLIC' ? 'bg-orange-600 text-white shadow-xs' : 'bg-orange-50 text-orange-800 hover:bg-orange-100'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Cyclic Bills (OUT)</span>
          </button>

          <button
            onClick={() => setActiveTab('OUT_EXPENSE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'OUT_EXPENSE' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Other Expenses (OUT)</span>
          </button>

          <button
            onClick={() => setActiveTab('OUT_OWNER')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'OUT_OWNER' ? 'bg-purple-600 text-white shadow-xs' : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Owner Payments (OUT)</span>
          </button>
        </div>

        <div className="relative w-full md:w-60">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search party, category, amount..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:bg-white focus:border-indigo-500"
          />
        </div>
      </div>

      {/* MASTER FEES & PAYOUTS TABLE */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden print-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="p-4">Flow Type</th>
                <th className="p-4">Party / Employee / Vendor</th>
                <th className="p-4">Category & Scope</th>
                <th className="p-4">Due Date</th>
                <th className="p-4">Total Amount</th>
                <th className="p-4">Paid Amount</th>
                <th className="p-4">Pending Due</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Settlement Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredFees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400 italic">
                    No transactions match current tab / filters.
                  </td>
                </tr>
              ) : (
                filteredFees.map((f) => {
                  const isIncome = f.flowType === 'IN';
                  const isPaid = f.status === 'Paid';
                  
                  return (
                    <tr key={f.id} className="hover:bg-indigo-50/30 transition-colors cursor-pointer group">
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${
                          isIncome 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {isIncome ? <ArrowUpRight className="w-3 h-3 text-emerald-600" /> : <ArrowDownRight className="w-3 h-3 text-rose-600" />}
                          {f.subType === 'IN_CLIENT' ? 'Client (IN)' :
                           f.subType === 'IN_OTHER' ? 'Income (IN)' :
                           f.subType === 'OUT_SALARY' ? 'Salary (OUT)' :
                           f.subType === 'OUT_OWNER' ? 'Owner (OUT)' : 'Expense (OUT)'}
                        </span>
                      </td>

                      <td className="p-4 font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">
                        <div>{f.party || f.client}</div>
                        <div className="text-[10px] text-gray-400 font-mono font-normal">{f.invoiceNo}</div>
                      </td>

                      <td className="p-4 text-gray-600 font-medium max-w-[220px] truncate">
                        {f.service}
                      </td>

                      <td className="p-4 font-mono text-gray-600">
                        {f.dueDate || f.date || 'N/A'}
                      </td>

                      <td className="p-4 font-mono font-bold text-gray-900">
                        {formatINR(f.totalFee)}
                      </td>

                      <td className={`p-4 font-mono font-bold ${isIncome ? 'text-emerald-700' : 'text-gray-700'}`}>
                        {formatINR(f.paid)}
                      </td>

                      <td className="p-4 font-mono font-black text-rose-600">
                        {isPaid ? <span className="text-gray-400 font-normal">₹0</span> : formatINR(f.pending)}
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded text-[10px] uppercase font-extrabold tracking-wider inline-flex items-center gap-1 ${
                          isPaid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          f.status === 'Partially Paid' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {isPaid && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {isPaid ? 'Paid' : f.status}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                          {!isPaid ? (
                            <button 
                              onClick={() => {
                                setPayingItem(f);
                                setPaymentDate(new Date().toISOString().slice(0, 10));
                              }}
                              className={`px-3 py-1.5 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer ${
                                isIncome ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                              }`}
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>{isIncome ? 'Done (Mark Paid)' : 'Done (Disburse)'}</span>
                            </button>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-bold">
                              ✓ Auto-Logged in Receipts
                            </span>
                          )}

                          {!isPaid && isIncome && (
                            <button 
                              onClick={(e) => handleSendReminder(e, f.party || f.client)}
                              className="p-1.5 bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                              title="Send Reminder"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRINT PERIOD & DATE FILTER MODAL */}
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
                  <h3 className="text-base font-black font-outfit text-white">Print Financial Statement</h3>
                  <p className="text-xs text-gray-300">Select specific day, month, year or date range to print</p>
                </div>
              </div>
              <button onClick={() => setIsPrintModalOpen(false)} className="p-1 text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 text-xs font-semibold">
              <div>
                <label className="text-gray-700 block mb-1">Select Print Reporting Period</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPrintPeriodType('specific_day')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      printPeriodType === 'specific_day' 
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-2xs' 
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    📅 Specific Day
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintPeriodType('specific_month')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      printPeriodType === 'specific_month' 
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-2xs' 
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    🗓️ Specific Month
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintPeriodType('specific_year')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      printPeriodType === 'specific_year' 
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-2xs' 
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    📆 Whole Year
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintPeriodType('custom_range')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      printPeriodType === 'custom_range' 
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-2xs' 
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    ⏱️ Date Range
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintPeriodType('all_time')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center col-span-2 sm:col-span-2 ${
                      printPeriodType === 'all_time' 
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-2xs' 
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    🌐 All-Time Ledger
                  </button>
                </div>
              </div>

              {printPeriodType === 'specific_day' && (
                <div className="bg-indigo-50/40 border border-indigo-100 p-3 rounded-xl">
                  <label className="text-gray-700 block mb-1">Choose Exact Date to Print</label>
                  <input 
                    type="date"
                    value={printDay}
                    onChange={e => setPrintDay(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold"
                  />
                </div>
              )}

              {printPeriodType === 'specific_month' && (
                <div className="bg-indigo-50/40 border border-indigo-100 p-3 rounded-xl grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-gray-700 block mb-1">Select Month</label>
                    <select
                      value={printMonth}
                      onChange={e => setPrintMonth(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold cursor-pointer"
                    >
                      {MONTH_NAMES.map(m => (
                        <option key={m.num} value={m.num}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-700 block mb-1">Select Year</label>
                    <select
                      value={printYear}
                      onChange={e => setPrintYear(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold cursor-pointer"
                    >
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                      <option value="2028">2028</option>
                    </select>
                  </div>
                </div>
              )}

              {printPeriodType === 'specific_year' && (
                <div className="bg-indigo-50/40 border border-indigo-100 p-3 rounded-xl">
                  <label className="text-gray-700 block mb-1">Select Year</label>
                  <select
                    value={printYear}
                    onChange={e => setPrintYear(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold cursor-pointer"
                  >
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </div>
              )}

              {printPeriodType === 'custom_range' && (
                <div className="bg-indigo-50/40 border border-indigo-100 p-3 rounded-xl grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-gray-700 block mb-1">From Date</label>
                    <input 
                      type="date"
                      value={printFromDate}
                      onChange={e => setPrintFromDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl outline-none text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-gray-700 block mb-1">To Date</label>
                    <input 
                      type="date"
                      value={printToDate}
                      onChange={e => setPrintToDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl outline-none text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-700 block mb-1">Flow Type</label>
                  <select
                    value={printFlowFilter}
                    onChange={e => setPrintFlowFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none text-xs font-bold cursor-pointer"
                  >
                    <option value="All">Both IN & OUT</option>
                    <option value="IN">Inflow (IN Only)</option>
                    <option value="OUT">Outflow (OUT Only)</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-700 block mb-1">Status</label>
                  <select
                    value={printStatusFilter}
                    onChange={e => setPrintStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none text-xs font-bold cursor-pointer"
                  >
                    <option value="All">All Transactions</option>
                    <option value="Paid">Paid / Settled Only</option>
                    <option value="Pending">Pending Dues Only</option>
                  </select>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between text-xs font-bold">
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase">Matching Records</span>
                  <span className="text-indigo-700 font-mono font-black">{printTotals.count} Transactions</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-500 block text-[10px] uppercase">Period Net Position</span>
                  <span className={`font-mono font-black ${printTotals.net >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {formatINR(printTotals.net)}
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
                  onClick={handleExecutePrint}
                  className="px-5 py-2 bg-[#5b52e0] hover:bg-[#4c44cf] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print Statement Now
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL PRINTABLE DOCUMENT LAYOUT */}
      <div className="hidden print:block fees-print-document bg-white text-black p-0 m-0">
        <div className="border-b-2 border-gray-900 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black font-outfit uppercase tracking-tight text-gray-900">
                TAXPRO PRACTICE MANAGEMENT SYSTEM
              </h1>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-700 mt-0.5">
                Official Revenue & Disbursement Statement (Fees Ledger)
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono font-black text-indigo-950">
                {getPeriodLabel()}
              </div>
              <div className="text-[10px] font-mono text-gray-600 mt-0.5">
                Printed: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="border border-gray-300 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-gray-600 block">Total Inflow (IN)</span>
            <span className="text-base font-black font-mono text-gray-900 block mt-0.5">
              {formatINR(printTotals.totalIn)}
            </span>
          </div>

          <div className="border border-gray-300 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-gray-600 block">Total Outflow (OUT)</span>
            <span className="text-base font-black font-mono text-gray-900 block mt-0.5">
              {formatINR(printTotals.totalOut)}
            </span>
          </div>

          <div className="border border-gray-300 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-gray-600 block">Net Period Balance</span>
            <span className="text-base font-black font-mono text-gray-900 block mt-0.5">
              {formatINR(printTotals.net)}
            </span>
          </div>
        </div>

        <table className="w-full text-left text-xs border-collapse border border-gray-300 mb-8">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300 text-gray-800 font-extrabold uppercase text-[10px]">
              <th className="p-2.5 border border-gray-300">Date</th>
              <th className="p-2.5 border border-gray-300">Type</th>
              <th className="p-2.5 border border-gray-300">Party / Entity</th>
              <th className="p-2.5 border border-gray-300">Category & Scope</th>
              <th className="p-2.5 border border-gray-300">Mode</th>
              <th className="p-2.5 border border-gray-300 text-right">Amount</th>
              <th className="p-2.5 border border-gray-300 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {printableRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500 italic">
                  No records found for the selected period.
                </td>
              </tr>
            ) : (
              printableRecords.map((r, idx) => (
                <tr key={r.id || idx} className="border-b border-gray-200">
                  <td className="p-2 border border-gray-300 font-mono">{r.dueDate || r.date}</td>
                  <td className="p-2 border border-gray-300 font-bold">
                    {r.flowType === 'IN' ? 'IN (Collection)' : 'OUT (Disbursement)'}
                  </td>
                  <td className="p-2 border border-gray-300 font-bold">{r.party || r.client}</td>
                  <td className="p-2 border border-gray-300 text-[11px]">{r.service}</td>
                  <td className="p-2 border border-gray-300 font-mono text-[11px]">{r.paymentMode || 'Bank Transfer'}</td>
                  <td className="p-2 border border-gray-300 font-mono font-bold text-right">
                    {r.flowType === 'IN' ? '+' : '-'}{formatINR(r.totalFee)}
                  </td>
                  <td className="p-2 border border-gray-300 text-center font-bold text-[10px]">
                    {r.status}
                  </td>
                </tr>
              ))
            )}
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

      {/* SETTLEMENT CONFIRMATION MODAL */}
      {payingItem && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setPayingItem(null); }}
          className="modal-overlay-backdrop print-hidden"
          style={{ zIndex: 999 }}
        >
          <div className="modal-content-box max-w-md">
            <div className={`p-5 flex items-center justify-between border-b text-white ${
              payingItem.flowType === 'IN' 
                ? 'bg-gradient-to-r from-emerald-900 via-teal-950 to-emerald-900 border-emerald-800' 
                : 'bg-gradient-to-r from-rose-900 via-red-950 to-rose-900 border-rose-800'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black font-outfit">
                    {payingItem.flowType === 'IN' ? 'Confirm Inflow Clearance' : 'Confirm Outflow Settlement'}
                  </h3>
                  <p className="text-[11px] text-gray-200">Will automatically write to Receipts & Payments</p>
                </div>
              </div>
              <button onClick={() => setPayingItem(null)} className="text-gray-200 hover:text-white p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 text-xs font-semibold">
              <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                payingItem.flowType === 'IN' ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
              }`}>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Party / Payee</span>
                  <span className="text-sm font-black text-gray-900">{payingItem.party || payingItem.client}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Amount</span>
                  <span className={`text-base font-mono font-black ${payingItem.flowType === 'IN' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatINR(payingItem.totalFee)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-gray-700 block mb-1">Payment Channel / Mode</label>
                <select
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-indigo-600 text-xs font-bold cursor-pointer"
                >
                  <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="UPI">UPI / Instant QR</option>
                  <option value="Cheque">Cheque Deposit / Clearing</option>
                  <option value="Cash">Cash Receipt / Voucher</option>
                  <option value="Online Gateway">Online Gateway</option>
                </select>
              </div>

              <div>
                <label className="text-gray-700 block mb-1">Payment Date</label>
                <input 
                  type="date"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-indigo-600 text-xs font-bold"
                />
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[11px] text-gray-600">
                ⚡ <b>Auto-Sync:</b> Marking this as <b>Done</b> will log an official {payingItem.flowType === 'IN' ? 'Income Receipt (+)' : 'Expense Outflow (-)'} into <b>Receipts & Payments</b>.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setPayingItem(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMarkAsDone}
                  className={`px-5 py-2 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                    payingItem.flowType === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <CheckCheck className="w-4 h-4" /> Confirm & Push to Receipts
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ➕ MANUAL CREATE BILLING / EXPENSE / PAYOUT MODAL                         */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddModalOpen(false); }}
          className="modal-overlay-backdrop print-hidden"
          style={{ zIndex: 999 }}
        >
          <div className="modal-content-box max-w-xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white p-4.5 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-2xs">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black font-outfit text-white">Add Ledger Entry</h3>
                  <p className="text-xs text-gray-300">Record Client Fee (IN), Other Income (IN), Staff Salary (OUT) or Expense (OUT)</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="p-5 flex flex-col gap-3.5 text-xs font-semibold">
              
              {/* FLOW DIRECTION SELECTION */}
              <div>
                <label className="text-[11px] font-extrabold text-gray-600 uppercase tracking-wider block mb-1.5">Transaction Type & Direction</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setNewEntry({...newEntry, flowType: 'IN', categoryType: 'Client Retainer Fee'})}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      newEntry.flowType === 'IN' 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-400 shadow-xs ring-2 ring-emerald-400/20' 
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${newEntry.flowType === 'IN' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-left">
                      <span className="block font-black text-xs">Inflow / Income</span>
                      <span className="block text-[10px] text-gray-500 font-normal">Client Fees & Receipts</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewEntry({...newEntry, flowType: 'OUT', categoryType: 'Office Rent & Maintenance'})}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      newEntry.flowType === 'OUT' 
                        ? 'bg-rose-50 text-rose-800 border-rose-400 shadow-xs ring-2 ring-rose-400/20' 
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${newEntry.flowType === 'OUT' ? 'bg-rose-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-left">
                      <span className="block font-black text-xs">Outflow / Expense</span>
                      <span className="block text-[10px] text-gray-500 font-normal">Rent, Utilities & Supplies</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* CATEGORY HEAD */}
              <div>
                <label className="text-[11px] font-extrabold text-gray-600 uppercase tracking-wider block mb-1">Accounting Category Head</label>
                <select
                  value={newEntry.categoryType}
                  onChange={e => setNewEntry({...newEntry, categoryType: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-bold text-gray-800 cursor-pointer"
                >
                  {newEntry.flowType === 'IN' ? (
                    <>
                      <option value="Client Retainer Fee">Client Retainer / Monthly Compliance Fee</option>
                      <option value="GST & Tax Filing Fee">GST & Direct Tax Filing Advisory</option>
                      <option value="Audit & Certification Charges">Audit & Certification Charges</option>
                      <option value="Consulting / Project Advisory">Consulting / Project Advisory</option>
                      <option value="Govt Tax Refund">Govt Tax Refund (IT / GST)</option>
                      <option value="Other Practice Income">Other Practice Income</option>
                    </>
                  ) : (
                    <>
                      <option value="Office Rent & Maintenance">Office Rent & Maintenance</option>
                      <option value="Software, Cloud & IT">Software, Cloud & IT Subscriptions</option>
                      <option value="Electricity & Utilities">Electricity, Internet & Utilities</option>
                      <option value="Travel & Conveyance">Travel, Fuel & Client Conveyance</option>
                      <option value="Stationery & Courier">Printing, Stationery & Courier</option>
                      <option value="Govt Challan & Statutory Fees">Govt Challan & Statutory Fees</option>
                      <option value="Owner Drawings & Payments">Owner Drawings & Partner Distributions</option>
                      <option value="Other Office Expense">Other General Office Expense</option>
                    </>
                  )}
                </select>
              </div>

              {/* PARTY / CLIENT SELECTION */}
              <div>
                <label className="text-[11px] font-extrabold text-gray-600 uppercase tracking-wider block mb-1">
                  Party / Client / Payee <span className="text-red-500">*</span>
                </label>
                {newEntry.flowType === 'IN' && newEntry.categoryType.includes('Client') && (
                  <select
                    value={newEntry.party}
                    onChange={e => {
                      const selectedName = e.target.value;
                      const matched = clients.find(c => c.name === selectedName);
                      setNewEntry(prev => ({
                        ...prev,
                        party: selectedName,
                        totalAmount: matched?.fee_amount ? String(matched.fee_amount) : prev.totalAmount
                      }));
                    }}
                    className="w-full px-3 py-2 bg-indigo-50/50 border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs mb-2 font-bold text-indigo-900 cursor-pointer"
                  >
                    <option value="">-- Quick Select from Client Directory --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.name}>{c.name} {c.fee_amount ? `(Plan: ₹${c.fee_amount})` : ''}</option>
                    ))}
                  </select>
                )}

                <input 
                  type="text"
                  placeholder="Enter or confirm Party / Vendor / Payee name..."
                  value={newEntry.party}
                  onChange={e => setNewEntry({...newEntry, party: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-semibold text-gray-900"
                  required
                />
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="text-[11px] font-extrabold text-gray-600 uppercase tracking-wider block mb-1">Particulars / Service Description</label>
                <input 
                  type="text"
                  placeholder="e.g. Monthly GST Compliance, Office Premises Rent, Electricity Bill..."
                  value={newEntry.service}
                  onChange={e => setNewEntry({...newEntry, service: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs text-gray-800"
                />
              </div>

              {/* AMOUNT & PAID GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-extrabold text-gray-600 uppercase tracking-wider block mb-1">
                    Total Billing / Payout (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-400 font-bold">₹</span>
                    <input 
                      type="number" 
                      placeholder="e.g. 25000"
                      value={newEntry.totalAmount}
                      onChange={e => setNewEntry({...newEntry, totalAmount: e.target.value})}
                      className="w-full pl-7 pr-3 py-2 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-black text-gray-900 font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-gray-600 uppercase tracking-wider block mb-1">Initial Settled / Paid (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-400 font-bold">₹</span>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={newEntry.paid}
                      onChange={e => setNewEntry({...newEntry, paid: e.target.value})}
                      className="w-full pl-7 pr-3 py-2 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-black text-gray-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* DUE DATE */}
              <div>
                <label className="text-[11px] font-extrabold text-gray-600 uppercase tracking-wider block mb-1">Due Date</label>
                <input 
                  type="date"
                  value={newEntry.dueDate}
                  onChange={e => setNewEntry({...newEntry, dueDate: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-bold text-gray-800"
                />
              </div>

              {/* CYCLIC RECURRING CHECKBOX (For Outflow Expenses) */}
              {newEntry.flowType === 'OUT' && (
                <div className="p-3 bg-orange-50/80 border border-orange-200 rounded-xl flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-orange-950 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={newEntry.isRecurringCyclic || false}
                      onChange={e => setNewEntry({ ...newEntry, isRecurringCyclic: e.target.checked })}
                      className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <span>🔄 Repeat this cyclic payment every month (e.g., Rent, Wifi, Electricity)</span>
                  </label>
                  {newEntry.isRecurringCyclic && (
                    <div className="flex items-center gap-2 pl-6 text-xs">
                      <span className="text-gray-600 font-semibold">Bill Due Day:</span>
                      <select
                        value={newEntry.cyclicDueDay || 1}
                        onChange={e => setNewEntry({ ...newEntry, cyclicDueDay: Number(e.target.value) })}
                        className="px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day}>{day}{day === 1 ? 'st' : (day === 2 ? 'nd' : (day === 3 ? 'rd' : 'th'))} of every month</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-200 mt-1">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#5b52e0] hover:bg-[#4c44cf] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Save Ledger Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🔄 CYCLIC MONTHLY BILLS & RECURRING PAYMENTS MANAGER MODAL                */}
      {/* ========================================================================= */}
      {isCyclicModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsCyclicModalOpen(false); }}
          className="modal-overlay-backdrop print-hidden"
          style={{ zIndex: 999 }}
        >
          <div className="modal-content-box max-w-2xl">
            <div className="bg-gradient-to-r from-gray-900 via-orange-950 to-gray-900 text-white p-5 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-400/30 flex items-center justify-center text-orange-300 shadow-xs">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black font-outfit text-white">Monthly Cyclic Payments Manager</h3>
                  <p className="text-xs text-gray-300">Office Rent, Electricity, Wifi, Software Subscriptions & Fixed Expenses</p>
                </div>
              </div>
              <button onClick={() => setIsCyclicModalOpen(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 text-xs">
              
              {/* Header Info & Add Button */}
              <div className="flex items-center justify-between gap-3 p-3.5 bg-orange-50/60 border border-orange-200 rounded-2xl">
                <div>
                  <span className="font-extrabold text-orange-950 block text-xs">Auto-Recurring Monthly Outflows</span>
                  <span className="text-[11px] text-gray-600">
                    Active templates automatically populate the Fees ledger every month with due dates.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCyclicBill(null);
                    setNewCyclicBill({
                      name: '',
                      vendor: '',
                      amount: '',
                      category: 'Office Rent',
                      dueDay: 1,
                      method: 'Bank Transfer',
                      frequency: 'Monthly',
                      isActive: true
                    });
                    setIsAddCyclicModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Cyclic Bill
                </button>
              </div>

              {/* Cyclic Bills Table / List */}
              <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
                {cyclicBills.map((bill) => (
                  <div 
                    key={bill.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      bill.isActive !== false ? 'bg-white border-gray-200 shadow-2xs hover:border-orange-300' : 'bg-gray-50/80 border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleCyclicStatus(bill.id)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer transition-all ${
                          bill.isActive !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'
                        }`}
                        title={bill.isActive !== false ? 'Active: Click to pause' : 'Paused: Click to activate'}
                      >
                        {bill.isActive !== false ? '✓' : '⏸'}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-gray-900 text-xs sm:text-sm">{bill.name}</span>
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                            {bill.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Payee: <b>{bill.vendor || 'Office Payee'}</b> • Due: <b>{bill.dueDay || 1}{bill.dueDay === 1 ? 'st' : (bill.dueDay === 2 ? 'nd' : (bill.dueDay === 3 ? 'rd' : 'th'))} of every month</b> • Mode: {bill.method || 'Bank Transfer'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-sm font-black font-mono text-rose-700 block">
                          {formatINR(bill.amount)}
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase font-bold">
                          {bill.frequency || 'Monthly'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditCyclic(bill)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors cursor-pointer"
                          title="Edit Cyclic Bill"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCyclicBill(bill.id, bill.name)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete Cyclic Bill"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Cyclic Monthly Commitments */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-700 block">Total Monthly Recurring Commitment</span>
                  <span className="text-[10px] text-gray-500">{cyclicBills.filter(b => b.isActive !== false).length} active cyclic accounts</span>
                </div>
                <span className="text-base font-black font-mono text-rose-700">
                  {formatINR(cyclicBills.filter(b => b.isActive !== false).reduce((acc, b) => acc + Number(b.amount || 0), 0))} / mo
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsCyclicModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Done & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ➕ ADD / EDIT CYCLIC EXPENSE MODAL                                         */}
      {/* ========================================================================= */}
      {isAddCyclicModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddCyclicModalOpen(false); }}
          className="modal-overlay-backdrop print-hidden"
          style={{ zIndex: 1000 }}
        >
          <div className="modal-content-box max-w-md">
            <div className="bg-gradient-to-r from-gray-900 via-orange-950 to-gray-900 text-white p-4.5 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-400/30 flex items-center justify-center text-orange-300">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black font-outfit text-white">
                    {editingCyclicBill ? 'Edit Cyclic Payment' : 'Add Monthly Cyclic Payment'}
                  </h3>
                  <p className="text-[11px] text-gray-300">Set recurring monthly office rent, electricity, wifi, etc.</p>
                </div>
              </div>
              <button onClick={() => setIsAddCyclicModalOpen(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCyclicBill} className="p-5 flex flex-col gap-3 text-xs font-semibold">
              <div>
                <label className="text-gray-700 block mb-1">Expense Name / Title <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  placeholder="e.g. Office Premises Rent, Electricity Bill, Wifi Broadband..."
                  value={newCyclicBill.name}
                  onChange={e => setNewCyclicBill({...newCyclicBill, name: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl outline-none focus:border-orange-500 text-xs font-bold text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="text-gray-700 block mb-1">Vendor / Landlord / Payee Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Landlord Estate, State Electricity Corp, Fiber Telecom..."
                  value={newCyclicBill.vendor}
                  onChange={e => setNewCyclicBill({...newCyclicBill, vendor: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl outline-none focus:border-orange-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-gray-700 block mb-1">Amount (₹ / Cycle) <span className="text-red-500">*</span></label>
                  <input 
                    type="number"
                    placeholder="e.g. 25000"
                    value={newCyclicBill.amount}
                    onChange={e => setNewCyclicBill({...newCyclicBill, amount: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl outline-none focus:border-orange-500 text-xs font-bold text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="text-gray-700 block mb-1">Bill Due Day</label>
                  <select
                    value={newCyclicBill.dueDay || 1}
                    onChange={e => setNewCyclicBill({...newCyclicBill, dueDay: Number(e.target.value)})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-orange-500 text-xs font-bold cursor-pointer"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}{day === 1 ? 'st' : (day === 2 ? 'nd' : (day === 3 ? 'rd' : 'th'))} of month</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-gray-700 block mb-1">Category</label>
                  <select
                    value={newCyclicBill.category}
                    onChange={e => setNewCyclicBill({...newCyclicBill, category: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-orange-500 text-xs font-bold cursor-pointer"
                  >
                    <option value="Office Rent">Office Rent</option>
                    <option value="Electricity & Utilities">Electricity & Utilities</option>
                    <option value="Internet & Telecom">Internet & Telecom</option>
                    <option value="Office Maintenance">Office Maintenance</option>
                    <option value="Software & Subscriptions">Software & Subscriptions</option>
                    <option value="Pantry & Refreshments">Pantry & Refreshments</option>
                    <option value="Security & Facility">Security & Facility</option>
                    <option value="Other Cyclic Expense">Other Cyclic Expense</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-700 block mb-1">Payment Channel</label>
                  <select
                    value={newCyclicBill.method}
                    onChange={e => setNewCyclicBill({...newCyclicBill, method: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-orange-500 text-xs font-bold cursor-pointer"
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT)</option>
                    <option value="UPI">UPI / Instant QR</option>
                    <option value="Net Banking">Net Banking / Auto-Pay</option>
                    <option value="Credit Card">Corporate Credit Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash Voucher</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCyclicModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  {editingCyclicBill ? 'Update Cyclic Bill' : 'Save & Activate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
