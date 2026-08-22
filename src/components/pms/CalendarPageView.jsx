import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Download, 
  Briefcase, 
  CheckSquare, 
  Plus, 
  RefreshCw, 
  FileSpreadsheet, 
  Filter, 
  CalendarCheck, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Trash2,
  X,
  User,
  Tag,
  CreditCard,
  Building2,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export const EXPENSE_CATEGORIES = [
  'Staff Salary & Payroll',
  'Employee Bonus & Incentives',
  'Office Rent & Lease',
  'Electricity & Power Utilities',
  'Internet, Phone & Broadband',
  'Software Licenses & Cloud (AWS/SaaS)',
  'Office Stationery, Paper & Printing',
  'Tea, Coffee, Snacks & Pantry',
  'Client Hospitality & Refreshments',
  'Travel, Taxi & Conveyance Fuel',
  'Government ROC / MCA / Tax Challans',
  'Subcontractor & Legal Consultant Fees',
  'Office Repairs, Maintenance & AMC',
  'Courier, Speed Post & Logistics',
  'Bank Charges & Gateway Processing Fees',
  'Miscellaneous Practice Expense'
];

export const INCOME_CATEGORIES = [
  'Client Retainer / Monthly Fee',
  'GST Return Filing Fee',
  'Income Tax Return (ITR) Filing',
  'Statutory & Tax Audit Fee',
  'Company / LLP Incorporation',
  'TDS & TCS Compliance Fee',
  'ROC Annual Filing Fee',
  'Tax Appeals & Litigation Representation',
  'Accounting & Bookkeeping Retainer',
  'Financial Consultancy & Advisory',
  'Miscellaneous Professional Receipts'
];

export const SUGGESTED_EXPENSE_PAYEES = [
  'Office Landlord (Premises Rent)',
  'Electricity Board (Power Utilities)',
  'Airtel / Jio Fiber (Broadband & Phone)',
  'Stationery & Print Supplies Vendor',
  'Amazon Web Services / Cloud Hosting',
  'Tally Prime / Tax Software License',
  'Pantry, Tea & Refreshments Supplier',
  'Staff Travel & Conveyance Reimbursement',
  'Outsourced Chartered Accountant / Advocate',
  'Ministry of Corporate Affairs (ROC Challan)',
  'BlueDart / India Post Courier',
  'Office Cleaning & Housekeeping Agency'
];

export default function CalendarPageView({ onShowToast }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Data states
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [taskFilter, setTaskFilter] = useState('All'); // 'All' | 'Completed' | 'Pending' | 'In Progress'

  // Modal states
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // New Transaction Form state
  const [txForm, setTxForm] = useState({
    type: 'Income', // 'Income' | 'Expense'
    party: '',
    category: 'Client Retainer / Monthly Fee',
    amount: '',
    mode: 'UPI',
    date: '',
    notes: ''
  });

  // New Task Form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    client: '',
    assignee: 'Unassigned',
    priority: 'Medium',
    due_date: '',
    category: 'General'
  });

  // Format date helper: YYYY-MM-DD
  const formatYMD = (d) => {
    if (!d) return '';
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dateObj.getTime())) return '';
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Robust date normalizer supporting timestamps, date objects, and strings
  const normalizeToYMD = (dateVal) => {
    if (!dateVal) return formatYMD(new Date());
    if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
      return dateVal;
    }
    const parsed = new Date(dateVal);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return formatYMD(new Date());
  };

  const selectedDateStr = formatYMD(selectedDate);
  const todayStr = formatYMD(today);

  // Fetch all data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tasksRes, projRes, clientsRes, memRes, feesRes, payRes] = await Promise.all([
        supabase.from('global_tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('name').order('created_at', { ascending: false }),
        supabase.from('team_members').select('name').order('created_at', { ascending: false }),
        supabase.from('fees').select('*').order('created_at', { ascending: false }),
        supabase.from('payments').select('*').order('created_at', { ascending: false })
      ]);

      if (tasksRes.data) setTasks(tasksRes.data);
      if (projRes.data) setProjects(projRes.data);
      if (clientsRes.data) setClients(clientsRes.data.map(c => c.name));
      if (memRes.data) setTeamMembers(memRes.data.map(m => m.name).filter(Boolean));

      // 1. Build Income / Fee Receipts from Supabase fees
      const dbReceipts = (feesRes.data || []).filter(f => Number(f.paid || 0) > 0).map(f => ({
        id: `REC-${f.id}`,
        type: 'Income',
        party: f.client_name || 'Client',
        category: 'Client Retainer / Monthly Fee',
        mode: 'Bank Transfer',
        amount: Number(f.paid || 0),
        date: normalizeToYMD(f.created_at || f.date),
        notes: f.invoice_no ? `Invoice: ${f.invoice_no}` : 'Automated Fee Sync'
      }));

      // 2. Build Expense Payments from Supabase payments
      const dbPayments = (payRes.data || []).map(p => ({
        id: `PAY-${p.id}`,
        type: 'Expense',
        party: p.recipient || p.category || 'Vendor / Employee',
        category: p.category || 'Office & Operations',
        mode: p.method || 'UPI',
        amount: Number(p.amount || 0),
        date: normalizeToYMD(p.created_at || p.date),
        notes: p.status ? `Status: ${p.status}` : ''
      }));

      // 3. Build Payroll Disbursements from local payroll history (Salaries / Bonuses)
      let payrollTxs = [];
      try {
        const rawPayroll = localStorage.getItem('taxpro_payroll_history');
        if (rawPayroll) {
          const parsedPayroll = JSON.parse(rawPayroll);
          payrollTxs = (parsedPayroll || [])
            .filter(item => item.status === 'Paid' && Number(item.amount || 0) > 0)
            .map(p => ({
              id: `PAYROLL-${p.id || p.memberId + '-' + (p.date || '').slice(0, 10)}`,
              type: 'Expense',
              party: `${p.memberName || 'Employee'} (Salary)`,
              category: p.description || 'Staff Salary & Payroll',
              mode: p.method === 'Pending' ? 'Bank Transfer' : (p.method || 'Bank Transfer'),
              amount: Number(p.amount || 0),
              date: normalizeToYMD(p.date),
              notes: `Payroll: ${p.description || 'Monthly Salary'}`
            }));
        }
      } catch (e) {}

      // 4. Merge with custom local transactions
      let localTxs = [];
      try {
        const rawLocal = localStorage.getItem('taxpro_calendar_transactions');
        if (rawLocal) localTxs = JSON.parse(rawLocal);
      } catch (e) {}

      const allMerged = [...localTxs, ...dbReceipts, ...dbPayments, ...payrollTxs];
      // Deduplicate by ID
      const uniqueMap = new Map();
      allMerged.forEach(item => {
        if (!uniqueMap.has(item.id)) uniqueMap.set(item.id, item);
      });

      setTransactions(Array.from(uniqueMap.values()));
    } catch (err) {
      console.warn('[CalendarPageView Fetch]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    window.addEventListener('taxpro_db_updated', fetchData);
    window.addEventListener('taxpro_financial_updated', fetchData);
    return () => {
      window.removeEventListener('taxpro_db_updated', fetchData);
      window.removeEventListener('taxpro_financial_updated', fetchData);
    };
  }, []);

  // Set default dates when selectedDate changes
  useEffect(() => {
    setTxForm(prev => ({ ...prev, date: selectedDateStr }));
    setTaskForm(prev => ({ ...prev, due_date: selectedDateStr }));
  }, [selectedDateStr]);

  // Calendar month days calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1, daysInPrevMonth - i);
      days.push({ date: d, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(currentYear, currentMonth, i);
      days.push({ date: d, isCurrentMonth: true });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      days.push({ date: d, isCurrentMonth: false });
    }

    return days;
  }, [currentMonth, currentYear]);

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
    setSelectedDate(now);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Direct Year Options (2020 through 2035)
  const yearOptions = Array.from({ length: 16 }, (_, i) => 2020 + i);

  // Income & Expenses for the Selected Date
  const selectedDayTransactions = useMemo(() => {
    return transactions.filter(t => t.date === selectedDateStr);
  }, [transactions, selectedDateStr]);

  const selectedDayIncome = useMemo(() => {
    return selectedDayTransactions
      .filter(t => t.type === 'Income')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [selectedDayTransactions]);

  const selectedDayExpense = useMemo(() => {
    return selectedDayTransactions
      .filter(t => t.type === 'Expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [selectedDayTransactions]);

  const selectedDayNet = selectedDayIncome - selectedDayExpense;

  // Monthly stats
  const monthlyStats = useMemo(() => {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const monthlyTxs = transactions.filter(t => t.date && t.date.startsWith(prefix));
    const income = monthlyTxs.filter(t => t.type === 'Income').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const expense = monthlyTxs.filter(t => t.type === 'Expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    return { income, expense, net: income - expense };
  }, [transactions, currentMonth, currentYear]);

  // Tasks for the Selected Date strictly
  const selectedDayTasks = useMemo(() => {
    return tasks.filter(t => {
      const taskDate = t.due_date || t.dueDate || t.date;
      return taskDate === selectedDateStr;
    });
  }, [tasks, selectedDateStr]);

  const filteredTasks = useMemo(() => {
    if (taskFilter === 'All') return selectedDayTasks;
    if (taskFilter === 'Completed') return selectedDayTasks.filter(t => t.status === 'Completed');
    if (taskFilter === 'In Progress') return selectedDayTasks.filter(t => t.status === 'In Progress');
    if (taskFilter === 'Pending') return selectedDayTasks.filter(t => t.status !== 'Completed' && t.status !== 'In Progress');
    return selectedDayTasks;
  }, [selectedDayTasks, taskFilter]);

  const selectedDayProjects = useMemo(() => {
    return projects.filter(p => p.deadline === selectedDateStr || p.start_date === selectedDateStr);
  }, [projects, selectedDateStr]);

  // Handle Add Income / Expense
  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!txForm.party || !txForm.amount) {
      if (onShowToast) onShowToast('Please enter party name and amount.', 'warning');
      return;
    }

    const numAmount = parseFloat(txForm.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      if (onShowToast) onShowToast('Please enter a valid positive amount.', 'warning');
      return;
    }

    const newTx = {
      id: `${txForm.type === 'Income' ? 'INC' : 'EXP'}-${Date.now()}`,
      type: txForm.type,
      party: txForm.party,
      category: txForm.category,
      amount: numAmount,
      mode: txForm.mode,
      date: txForm.date || selectedDateStr,
      notes: txForm.notes
    };

    // Update local state immediately
    const updated = [newTx, ...transactions];
    setTransactions(updated);

    // Save to local storage
    try {
      const rawLocal = localStorage.getItem('taxpro_calendar_transactions');
      const currentList = rawLocal ? JSON.parse(rawLocal) : [];
      localStorage.setItem('taxpro_calendar_transactions', JSON.stringify([newTx, ...currentList]));
    } catch (err) {}

    // Synchronize to Supabase
    try {
      if (newTx.type === 'Expense') {
        await supabase.from('payments').insert([{
          id: newTx.id,
          recipient: newTx.party,
          amount: numAmount,
          category: newTx.category,
          method: newTx.mode,
          status: 'Success'
        }]);
      } else {
        await supabase.from('fees').insert([{
          id: newTx.id,
          client_name: newTx.party,
          invoice_no: `INV-${Date.now().toString().slice(-4)}`,
          amount: numAmount,
          paid: numAmount,
          status: 'Paid'
        }]);
      }
    } catch (err) {
      console.warn('[Transaction Sync]:', err);
    }

    window.dispatchEvent(new CustomEvent('taxpro_financial_updated'));
    setIsTxModalOpen(false);
    setTxForm({
      type: 'Income',
      party: '',
      category: 'Client Retainer',
      amount: '',
      mode: 'UPI',
      date: selectedDateStr,
      notes: ''
    });

    if (onShowToast) onShowToast(`✓ ${newTx.type} entry of ₹${numAmount.toLocaleString('en-IN')} recorded!`, 'success');
  };

  // Delete transaction
  const handleDeleteTransaction = (id) => {
    const filtered = transactions.filter(t => t.id !== id);
    setTransactions(filtered);
    try {
      const rawLocal = localStorage.getItem('taxpro_calendar_transactions');
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal).filter(t => t.id !== id);
        localStorage.setItem('taxpro_calendar_transactions', JSON.stringify(parsed));
      }
    } catch (err) {}
    if (onShowToast) onShowToast('Transaction record removed.', 'info');
  };

  // Handle Add Task
  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title) {
      if (onShowToast) onShowToast('Please enter a task title.', 'warning');
      return;
    }

    const newTask = {
      id: `TSK-${Date.now()}`,
      title: taskForm.title,
      client: taskForm.client || 'Enterprise Account',
      assignee: taskForm.assignee || 'Unassigned',
      priority: taskForm.priority || 'Medium',
      due_date: taskForm.due_date || selectedDateStr,
      status: 'Pending',
      created_at: new Date().toISOString()
    };

    setTasks([newTask, ...tasks]);

    try {
      await supabase.from('global_tasks').insert([newTask]);
    } catch (err) {
      console.warn('[Task Save]:', err);
    }

    setIsTaskModalOpen(false);
    setTaskForm({
      title: '',
      client: '',
      assignee: 'Unassigned',
      priority: 'Medium',
      due_date: selectedDateStr,
      category: 'General'
    });

    if (onShowToast) onShowToast(`✓ Task "${newTask.title}" scheduled for ${newTask.due_date}!`, 'success');
  };

  // Toggle Task Status
  const handleToggleTaskStatus = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      await supabase.from('global_tasks').update({ status: newStatus }).eq('id', taskId);
    } catch (err) {}

    if (onShowToast) onShowToast(`Task marked as ${newStatus}!`, 'success');
  };

  // Download CSV
  const handleDownloadCSV = () => {
    const headers = ['Date', 'Entry Type', 'Party / Client', 'Category', 'Mode', 'Amount (INR)', 'Notes'];
    const rows = [
      headers.join(','),
      ...selectedDayTransactions.map(t => [
        `"${t.date}"`,
        `"${t.type}"`,
        `"${t.party}"`,
        `"${t.category}"`,
        `"${t.mode}"`,
        `"${t.amount}"`,
        `"${t.notes || ''}"`
      ].join(',')),
      ['', '', '', '', 'TOTAL INCOME', `"${selectedDayIncome}"`, ''].join(','),
      ['', '', '', '', 'TOTAL EXPENSES', `"${selectedDayExpense}"`, ''].join(','),
      ['', '', '', '', 'NET CASH BALANCE', `"${selectedDayNet}"`, ''].join(',')
    ];

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TaxPro_Financial_Timesheet_${selectedDateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (onShowToast) onShowToast(`Timesheet for ${selectedDateStr} downloaded successfully!`, 'success');
  };

  // Print Timesheet
  const handlePrint = () => {
    if (onShowToast) onShowToast('Preparing Daily Timesheet & Financial Statement for print...', 'info');
    setTimeout(() => window.print(), 300);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in print:p-0">
      
      {/* ==============================================================
          OFFICIAL HIGH-DENSITY PRINTABLE STATEMENT (Visible ONLY in Print)
          ============================================================== */}
      <div className="hidden print:block bg-white text-gray-900 w-full p-4">
        {/* Official Letterhead */}
        <div className="border-b-2 border-gray-900 pb-4 mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 font-outfit uppercase">TAXPRO PMS</h1>
            <p className="text-xs text-gray-700 font-bold uppercase tracking-wider">
              Workforce Daily Financial Ledger & Deliverables Timesheet
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5 font-medium">
              Statement for: {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-gray-900">
              Generated: {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <div className="text-[10px] font-mono text-gray-500">{new Date().toLocaleTimeString()}</div>
          </div>
        </div>

        {/* Financial KPI Summary */}
        <div className="grid grid-cols-3 gap-3 mb-5 border border-gray-300 rounded p-3 bg-gray-50">
          <div>
            <div className="text-[10px] uppercase font-bold text-gray-600">Total Day Income</div>
            <div className="text-base font-black font-mono text-gray-900">₹{selectedDayIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-gray-600">Total Day Expenses</div>
            <div className="text-base font-black font-mono text-gray-900">₹{selectedDayExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-gray-600">Net Daily Cashflow</div>
            <div className="text-base font-black font-mono text-gray-900">₹{selectedDayNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* Section 1: Financial Ledger Table */}
        <div className="mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1 mb-2">
            1. Income & Expense Entries ({selectedDayTransactions.length})
          </h3>
          {selectedDayTransactions.length === 0 ? (
            <div className="text-xs text-gray-500 italic py-2">No transactions recorded for this date.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 font-bold uppercase text-[10px]">
                  <th className="py-1.5 px-2 border-r border-gray-300 w-8 text-center">#</th>
                  <th className="py-1.5 px-2 border-r border-gray-300 w-20">Type</th>
                  <th className="py-1.5 px-3 border-r border-gray-300">Party / Client</th>
                  <th className="py-1.5 px-3 border-r border-gray-300">Category</th>
                  <th className="py-1.5 px-2 border-r border-gray-300 w-24">Channel</th>
                  <th className="py-1.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedDayTransactions.map((tx, i) => (
                  <tr key={tx.id || i} className="border-b border-gray-200 text-[11px]">
                    <td className="py-1.5 px-2 border-r border-gray-200 text-center font-mono text-gray-500">{i + 1}</td>
                    <td className="py-1.5 px-2 border-r border-gray-200 font-bold">{tx.type}</td>
                    <td className="py-1.5 px-3 border-r border-gray-200 font-semibold">{tx.party}</td>
                    <td className="py-1.5 px-3 border-r border-gray-200 text-gray-600">{tx.category}</td>
                    <td className="py-1.5 px-2 border-r border-gray-200 font-mono text-gray-700">{tx.mode}</td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold">
                      {tx.type === 'Income' ? '+' : '-'}₹{Number(tx.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 2: Deliverable Tasks Table */}
        <div className="mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1 mb-2">
            2. Deliverable Tasks & Compliance Deliveries ({selectedDayTasks.length})
          </h3>
          {selectedDayTasks.length === 0 ? (
            <div className="text-xs text-gray-500 italic py-2">No tasks due on this date.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 font-bold uppercase text-[10px]">
                  <th className="py-1.5 px-2 border-r border-gray-300 w-8 text-center">#</th>
                  <th className="py-1.5 px-3 border-r border-gray-300">Task Title</th>
                  <th className="py-1.5 px-3 border-r border-gray-300">Associated Client</th>
                  <th className="py-1.5 px-3 border-r border-gray-300">Assignee</th>
                  <th className="py-1.5 px-2 border-r border-gray-300 w-20 text-center">Priority</th>
                  <th className="py-1.5 px-2 text-center w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedDayTasks.map((t, i) => (
                  <tr key={t.id || i} className="border-b border-gray-200 text-[11px]">
                    <td className="py-1.5 px-2 border-r border-gray-200 text-center font-mono text-gray-500">{i + 1}</td>
                    <td className="py-1.5 px-3 border-r border-gray-200 font-bold text-gray-900">{t.title}</td>
                    <td className="py-1.5 px-3 border-r border-gray-200 text-gray-700">{t.client || 'Enterprise'}</td>
                    <td className="py-1.5 px-3 border-r border-gray-200 text-gray-700">{t.assignee || 'Unassigned'}</td>
                    <td className="py-1.5 px-2 border-r border-gray-200 text-center uppercase font-bold text-[10px]">{t.priority || 'Normal'}</td>
                    <td className="py-1.5 px-2 text-center font-bold text-[10px] uppercase">{t.status || 'Pending'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 3: Project Milestones (if any) */}
        {selectedDayProjects.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1 mb-2">
              3. Active Project Milestones ({selectedDayProjects.length})
            </h3>
            <table className="w-full text-left text-xs border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 font-bold uppercase text-[10px]">
                  <th className="py-1.5 px-3 border-r border-gray-300">Project Name</th>
                  <th className="py-1.5 px-3 border-r border-gray-300">Client Entity</th>
                  <th className="py-1.5 px-3 border-r border-gray-300">Category</th>
                  <th className="py-1.5 px-3 text-right">Progress</th>
                </tr>
              </thead>
              <tbody>
                {selectedDayProjects.map((p, i) => (
                  <tr key={p.id || i} className="border-b border-gray-200 text-[11px]">
                    <td className="py-1.5 px-3 border-r border-gray-200 font-bold">{p.name}</td>
                    <td className="py-1.5 px-3 border-r border-gray-200">{p.client}</td>
                    <td className="py-1.5 px-3 border-r border-gray-200">{p.category}</td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold">{p.progress || 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Signatory Footer */}
        <div className="mt-8 pt-4 border-t border-gray-400 flex justify-between items-end text-[10px] text-gray-600">
          <div>
            <span>TaxPro Practice Management System • Daily Operations Statement</span>
          </div>
          <div className="text-right">
            <div className="h-10 border-b border-gray-500 w-48 mb-1"></div>
            <span>Authorized Signatory & Stamp</span>
          </div>
        </div>
      </div>


      {/* ==============================================================
          INTERACTIVE SCREEN UI (Hidden when Printing)
          ============================================================== */}
      <div className="flex flex-col gap-6 print:hidden">
        
        {/* 1. TOP HEADER BANNER */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5b52e0] shadow-xs">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black font-outfit text-gray-900 tracking-tight">
                Workforce Calendar & Financial Ledger
              </h1>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Unified calendar hub, daily income/expenses breakdown, and targeted day tasks
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-all cursor-pointer shadow-2xs"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <Printer className="w-4 h-4 text-gray-600" />
              <span>Print Sheet</span>
            </button>

            <button
              onClick={handleDownloadCSV}
              className="px-4 py-2 rounded-xl bg-[#0f766e] hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-200" />
              <span>Download CSV</span>
            </button>
          </div>
        </div>

        {/* 2. MAIN 2-COLUMN WORKSPACE */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: INTERACTIVE MONTHLY CALENDAR GRID (5 COLS) */}
          <div className="xl:col-span-5 flex flex-col gap-4">
            
            {/* Calendar Box */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
              
              {/* Month & Direct Year Navigation Toolbar */}
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-2.5 mb-4 gap-2 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={prevMonth}
                    className="p-1.5 rounded-lg hover:bg-white text-gray-600 hover:text-gray-900 border border-transparent hover:border-gray-200 transition-all cursor-pointer shadow-2xs"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Direct Month Selector Dropdown */}
                  <select
                    value={currentMonth}
                    onChange={(e) => setCurrentMonth(Number(e.target.value))}
                    className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
                  >
                    {monthNames.map((name, idx) => (
                      <option key={idx} value={idx}>{name}</option>
                    ))}
                  </select>

                  {/* Direct Year Selector Dropdown */}
                  <select
                    value={currentYear}
                    onChange={(e) => setCurrentYear(Number(e.target.value))}
                    className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 outline-none focus:border-indigo-500 cursor-pointer shadow-2xs font-mono"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>

                  <button
                    onClick={nextMonth}
                    className="p-1.5 rounded-lg hover:bg-white text-gray-600 hover:text-gray-900 border border-transparent hover:border-gray-200 transition-all cursor-pointer shadow-2xs"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={goToToday}
                    className="px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[#5b52e0] text-xs font-bold border border-indigo-200 transition-all cursor-pointer shadow-2xs"
                  >
                    Today
                  </button>
                </div>
              </div>

              {/* Day Header Row */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                  <div key={d} className={`text-[11px] font-black uppercase py-1 ${i === 0 || i === 6 ? 'text-gray-400' : 'text-gray-700'}`}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar Day Cells */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((item, idx) => {
                  const dateStr = formatYMD(item.date);
                  const isSelected = dateStr === selectedDateStr;
                  const isToday = dateStr === todayStr;
                  const isCurrent = item.isCurrentMonth;
                  const dayNum = item.date.getDate();

                  const dayTxs = transactions.filter(t => t.date === dateStr);
                  const dayHasIncome = dayTxs.some(t => t.type === 'Income');
                  const dayHasExpense = dayTxs.some(t => t.type === 'Expense');
                  const dayTaskCount = tasks.filter(t => (t.due_date || t.dueDate || t.date) === dateStr).length;
                  const dayProjCount = projects.filter(p => p.deadline === dateStr).length;

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(item.date)}
                      className={`h-14 rounded-2xl flex flex-col items-center justify-between p-2 transition-all text-xs font-bold cursor-pointer relative ${
                        isSelected 
                          ? 'bg-[#5b52e0] text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-300' 
                          : (isToday 
                              ? 'bg-indigo-50 border border-indigo-200 text-[#5b52e0] hover:bg-indigo-100' 
                              : (isCurrent 
                                  ? 'bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-100' 
                                  : 'bg-transparent text-gray-300 hover:text-gray-400'))
                      }`}
                    >
                      <span className="leading-none text-sm">{dayNum}</span>

                      {/* Financial & Task Indicators */}
                      <div className="flex items-center gap-1 mt-auto">
                        {dayHasIncome && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-200' : 'bg-emerald-500'}`} title="Income Recorded" />
                        )}
                        {dayHasExpense && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-rose-200' : 'bg-rose-500'}`} title="Expense Recorded" />
                        )}
                        {dayTaskCount > 0 && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-amber-500'}`} title={`${dayTaskCount} tasks due`} />
                        )}
                        {dayProjCount > 0 && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-purple-300' : 'bg-purple-500'}`} title={`${dayProjCount} milestones`} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-500 font-medium flex-wrap">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Income</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Expense</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Tasks Due</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500" /> Milestone</span>
              </div>
            </div>

            {/* Selected Date & Monthly Summary Badge */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-[#5b52e0]" />
                <div>
                  <div className="text-xs text-gray-500 font-medium">Selected Date</div>
                  <div className="text-sm font-black text-gray-900 font-outfit">
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-gray-500 uppercase font-bold">Month Net</div>
                <div className={`text-xs font-mono font-black ${monthlyStats.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  ₹{monthlyStats.net.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: INCOME & EXPENSES + TARGETED DAY TASKS (7 COLS) */}
          <div className="xl:col-span-7 flex flex-col gap-6">
            
            {/* 1. INCOME & EXPENSES DAILY LEDGER CARD */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
              
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider font-outfit">
                      Daily Income & Expenses
                    </h3>
                    <p className="text-[11px] text-gray-500 font-medium">
                      Cashflow and fee disbursements for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsTxModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Record Entry</span>
                </button>
              </div>

              {/* 3 Metric Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Total Day Income */}
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-emerald-800 text-xs font-bold uppercase">
                    <span className="flex items-center gap-1.5"><ArrowUpRight className="w-4 h-4 text-emerald-600" /> Income</span>
                    <span className="text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded font-mono">In</span>
                  </div>
                  <div className="text-xl font-black font-mono text-emerald-900 mt-2">
                    ₹{selectedDayIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-medium mt-1">
                    {selectedDayTransactions.filter(t => t.type === 'Income').length} receipt(s)
                  </div>
                </div>

                {/* Total Day Expenses */}
                <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-rose-800 text-xs font-bold uppercase">
                    <span className="flex items-center gap-1.5"><ArrowDownRight className="w-4 h-4 text-rose-600" /> Expenses</span>
                    <span className="text-[10px] bg-rose-100 px-1.5 py-0.5 rounded font-mono">Out</span>
                  </div>
                  <div className="text-xl font-black font-mono text-rose-900 mt-2">
                    ₹{selectedDayExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-rose-700 font-medium mt-1">
                    {selectedDayTransactions.filter(t => t.type === 'Expense').length} payment(s)
                  </div>
                </div>

                {/* Net Daily Balance */}
                <div className={`border rounded-2xl p-4 flex flex-col justify-between ${
                  selectedDayNet >= 0 ? 'bg-indigo-50/70 border-indigo-200' : 'bg-amber-50/70 border-amber-200'
                }`}>
                  <div className="flex items-center justify-between text-gray-700 text-xs font-bold uppercase">
                    <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-indigo-600" /> Net Balance</span>
                    <span className="text-[10px] bg-white/80 px-1.5 py-0.5 rounded font-mono">Day</span>
                  </div>
                  <div className={`text-xl font-black font-mono mt-2 ${selectedDayNet >= 0 ? 'text-indigo-900' : 'text-amber-900'}`}>
                    ₹{selectedDayNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-gray-500 font-medium mt-1">
                    {selectedDayNet >= 0 ? '✓ Net Cash Positive' : 'Deficit / Inflow needed'}
                  </div>
                </div>
              </div>

              {/* Transactions List for the Day */}
              {selectedDayTransactions.length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-xs font-medium border border-dashed border-gray-200 rounded-2xl bg-gray-50 flex flex-col items-center justify-center gap-2">
                  <span>No income or expense entries logged for this date.</span>
                  <button
                    onClick={() => setIsTxModalOpen(true)}
                    className="text-indigo-600 font-bold hover:underline flex items-center gap-1 text-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Record first transaction
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                  {selectedDayTransactions.map((tx, idx) => (
                    <div 
                      key={tx.id || idx}
                      className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          tx.type === 'Income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {tx.type === 'Income' ? '+' : '-'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-gray-900 truncate">{tx.party}</div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                            <span>{tx.category}</span>
                            <span>•</span>
                            <span className="font-mono">{tx.mode}</span>
                            {tx.notes && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[120px]">{tx.notes}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-mono font-black ${
                          tx.type === 'Income' ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          {tx.type === 'Income' ? '+' : '-'}₹{Number(tx.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* 2. DELIVERABLE TASKS STRICTLY FOR SELECTED DATE */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider font-outfit">
                      Deliverable Tasks ({filteredTasks.length})
                    </h3>
                    <p className="text-[11px] text-gray-500 font-medium">
                      Tasks scheduled specifically for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                    {['All', 'Completed', 'In Progress', 'Pending'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setTaskFilter(f)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          taskFilter === f ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setIsTaskModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-2xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Task</span>
                  </button>
                </div>
              </div>

              {/* Task Item List */}
              {filteredTasks.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs font-medium border border-dashed border-gray-200 rounded-2xl bg-gray-50 flex flex-col items-center justify-center gap-2">
                  <span>No tasks scheduled for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.</span>
                  <button
                    onClick={() => setIsTaskModalOpen(true)}
                    className="text-amber-600 font-bold hover:underline flex items-center gap-1 text-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create task for this date
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {filteredTasks.map((t, idx) => (
                    <div 
                      key={t.id || idx} 
                      className="p-3.5 rounded-2xl bg-gray-50 hover:bg-gray-100/80 border border-gray-200 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => handleToggleTaskStatus(t.id, t.status)}
                          className="shrink-0 text-gray-400 hover:text-emerald-600 transition-colors cursor-pointer"
                          title="Toggle Completion"
                        >
                          <CheckCircle2 className={`w-5 h-5 ${t.status === 'Completed' ? 'text-emerald-600 fill-emerald-100' : ''}`} />
                        </button>
                        <div className="min-w-0">
                          <div className={`text-xs font-bold text-gray-900 truncate ${t.status === 'Completed' ? 'line-through text-gray-400' : ''}`}>
                            {t.title}
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-1">
                            <span>Assignee: <strong className="text-gray-700">{t.assignee || 'Unassigned'}</strong></span>
                            <span>•</span>
                            <span>Client: {t.client || 'Enterprise'}</span>
                            <span>•</span>
                            <span className="text-amber-700 font-bold">{t.priority || 'Normal'} Priority</span>
                          </div>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex-shrink-0 ${
                        t.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {t.status || 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. ACTIVE PROJECT MILESTONES */}
            {selectedDayProjects.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col gap-3">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <Briefcase className="w-5 h-5 text-purple-600" />
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider font-outfit">
                    Project Milestones ({selectedDayProjects.length})
                  </h3>
                </div>

                <div className="flex flex-col gap-2.5">
                  {selectedDayProjects.map((p, idx) => (
                    <div key={p.id || idx} className="p-3.5 rounded-2xl bg-purple-50/40 border border-purple-200 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-gray-900">{p.name}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">Client: {p.client || 'Corporate'} • Category: {p.category || 'Tax Audit'}</div>
                      </div>
                      <span className="text-xs font-bold text-purple-700 font-mono bg-purple-100 px-2.5 py-1 rounded-xl">
                        {p.progress || 0}% Complete
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>


      {/* ==============================================================
          RECORD INCOME / EXPENSE MODAL
          ============================================================== */}
      {isTxModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsTxModalOpen(false); }}
          className="modal-overlay-backdrop"
        >
          <div className="modal-content-box max-w-2xl">
            {/* Premium Gradient Header */}
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
                    Log client fee receipt or practice expenditure for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsTxModalOpen(false)} 
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer shadow-xs"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveTransaction} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold scrollbar-thin">
              
              {/* Type Switcher */}
              <div>
                <label className="text-gray-700 block mb-1">Transaction Nature</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTxForm({ ...txForm, type: 'Income', category: INCOME_CATEGORIES[0] })}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      txForm.type === 'Income'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-400 shadow-2xs'
                        : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Income / Receipt (Inflow)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxForm({ ...txForm, type: 'Expense', category: EXPENSE_CATEGORIES[0] })}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      txForm.type === 'Expense'
                        ? 'bg-rose-50 text-rose-700 border-rose-400 shadow-2xs'
                        : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    <span>Expense / Payment (Outflow)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Party / Client / Payee */}
                <div>
                  <label className="text-gray-700 block mb-1">
                    {txForm.type === 'Income' ? 'Client / Entity Name' : 'Payee / Vendor / Employee Name'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={txForm.type === 'Income' ? 'e.g. Acme Corp Pvt Ltd' : 'e.g. Rahul Sharma (Salary), Landlord (Rent), Airtel'}
                    value={txForm.party}
                    onChange={(e) => setTxForm({ ...txForm, party: e.target.value })}
                    list={txForm.type === 'Income' ? 'calendar-client-list' : 'calendar-payee-list'}
                    className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-300 outline-none focus:bg-white focus:border-indigo-500 text-xs"
                  />
                  {txForm.type === 'Income' ? (
                    <datalist id="calendar-client-list">
                      {clients.map((c, i) => (
                        <option key={i} value={c} />
                      ))}
                    </datalist>
                  ) : (
                    <datalist id="calendar-payee-list">
                      {teamMembers.map((m, i) => (
                        <option key={`m-${i}`} value={`${m} (Salary)`} />
                      ))}
                      {SUGGESTED_EXPENSE_PAYEES.map((p, i) => (
                        <option key={`p-${i}`} value={p} />
                      ))}
                    </datalist>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="text-gray-700 block mb-1">Amount (₹) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 25000"
                    value={txForm.amount}
                    onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                    className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-300 outline-none focus:bg-white focus:border-indigo-500 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Category & Payment Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-700 block mb-1">Category / Ledger Head</label>
                  <select
                    value={txForm.category}
                    onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                    className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-300 outline-none focus:bg-white focus:border-indigo-500 text-xs cursor-pointer"
                  >
                    {txForm.type === 'Income' ? (
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
                    value={txForm.mode}
                    onChange={(e) => setTxForm({ ...txForm, mode: e.target.value })}
                    className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-300 outline-none focus:bg-white focus:border-indigo-500 text-xs cursor-pointer"
                  >
                    <option value="UPI">UPI Instant</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="Cash">Cash Settlement</option>
                    <option value="Cheque">Cheque Deposit</option>
                    <option value="Credit Card">Corporate Card</option>
                  </select>
                </div>
              </div>

              {/* Date & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-700 block mb-1">Transaction Date</label>
                  <input
                    type="date"
                    value={txForm.date}
                    onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                    className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-300 outline-none focus:bg-white focus:border-indigo-500 text-xs"
                  />
                </div>

                <div>
                  <label className="text-gray-700 block mb-1">Reference / Note (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Invoice #2024-089 or UPI Txn Ref"
                    value={txForm.notes}
                    onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })}
                    className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-300 outline-none focus:bg-white focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>

              {/* Bottom Sticky Actions */}
              <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 mt-3 -mx-6 -mb-6">
                <button
                  type="button"
                  onClick={() => setIsTxModalOpen(false)}
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


      {/* ==============================================================
          ADD TASK MODAL (Prefilled to Selected Date)
          ============================================================== */}
      {isTaskModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsTaskModalOpen(false); }}
          className="modal-overlay-backdrop"
        >
          <div className="modal-content-box max-w-2xl">
            {/* Premium Gradient Header */}
            <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-xs">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-white tracking-tight">
                    Schedule Deliverable Task
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Assign task for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsTaskModalOpen(false)} 
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer shadow-xs"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveTask} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold scrollbar-thin">
              
              <div>
                <label className="text-gray-700 block mb-1">Task Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. File GSTR-3B for August Quarter"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-300 outline-none focus:bg-white focus:border-indigo-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-700 block mb-1">Associated Client</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp Pvt Ltd"
                    value={taskForm.client}
                    onChange={(e) => setTaskForm({ ...taskForm, client: e.target.value })}
                    list="task-client-options"
                    className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-300 outline-none focus:bg-white focus:border-indigo-500 text-xs"
                  />
                  <datalist id="task-client-options">
                    {clients.map((c, i) => (
                      <option key={i} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="text-gray-700 block mb-1">Assignee</label>
                  <select
                    value={taskForm.assignee}
                    onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })}
                    className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-300 outline-none focus:bg-white focus:border-indigo-500 text-xs cursor-pointer"
                  >
                    <option value="Unassigned">Unassigned</option>
                    {teamMembers.map((m, i) => (
                      <option key={i} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-700 block mb-1">Priority Level</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-300 outline-none focus:bg-white focus:border-indigo-500 text-xs cursor-pointer"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-700 block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-300 outline-none focus:bg-white focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>

              {/* Bottom Sticky Actions */}
              <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 mt-3 -mx-6 -mb-6">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#0f766e] hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-700/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  Create Task
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
