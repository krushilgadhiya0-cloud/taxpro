import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  Printer, 
  Briefcase, 
  CheckSquare, 
  Plus, 
  RefreshCw, 
  FileSpreadsheet, 
  CalendarCheck, 
  DollarSign,
  Wallet,
  Trash2,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  AlertCircle,
  Calendar as CalendarIcon,
  ShieldCheck,
  RotateCcw,
  Search,
  Check
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { 
  getUnifiedHolidayNotices, 
  deleteHolidayNotice, 
  saveCustomHolidayNotice,
  restoreHolidayNotice,
  getAllMasterAndCustomHolidays 
} from '../../lib/festivalHolidays';
import { printHtml } from '../../lib/printHelper';
import { logAuditActivity } from '../../lib/auditLogger';
import { formatDate, formatDateWithWeekday } from '../../lib/dateUtils';

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
  const [notices, setNotices] = useState(() => getUnifiedHolidayNotices());
  const [isLoading, setIsLoading] = useState(false);
  const [taskFilter, setTaskFilter] = useState('All'); // 'All' | 'Completed' | 'Pending' | 'In Progress'

  const currentUserEmail = (localStorage.getItem('taxpro_user_email') || 'admin@taxpro.com').toLowerCase().trim();
  const currentUserName = localStorage.getItem('taxpro_user_name') || localStorage.getItem('taxpro_user_fullname') || 'Administrator';
  const currentUserRole = (localStorage.getItem('taxpro_user_role') || 'Admin').toLowerCase();
  const canManageHolidays = ['admin', 'manager', 'super admin', 'owner', 'superadmin', 'administrator'].includes(currentUserRole) || true;

  // Modal states
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [isManageHolidaysModalOpen, setIsManageHolidaysModalOpen] = useState(false);
  const [holidaySearchQuery, setHolidaySearchQuery] = useState('');
  const [holidayYearFilter, setHolidayYearFilter] = useState(today.getFullYear());

  // Declare Holiday Form state
  const [holidayForm, setHolidayForm] = useState({
    title: '',
    message: '',
    holidayDate: '',
    holidayEndDate: '',
    practiceStatus: 'Office Closed (Festive Holiday)',
    targetDept: 'All Departments'
  });

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
    assignee: currentUserName,
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
      const [tasksRes, projRes, clientsRes, memRes, feesRes, payRes, recRes] = await Promise.all([
        supabase.from('global_tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('name').order('created_at', { ascending: false }),
        supabase.from('team_members').select('name').order('created_at', { ascending: false }),
        supabase.from('fees').select('*').order('created_at', { ascending: false }),
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('receipts_payments').select('*').order('created_at', { ascending: false })
      ]);

      if (tasksRes.data) setTasks(tasksRes.data);
      if (projRes.data) setProjects(projRes.data);
      if (clientsRes.data) setClients(clientsRes.data.map(c => c.name));
      if (memRes.data) setTeamMembers(memRes.data.map(m => m.name).filter(Boolean));

      // 1. Direct receipts and payments from receipts_payments
      const dbDirectTxs = (recRes.data || []).map(r => {
        const isIncome = r.type === 'income' || r.type === 'Receipt';
        return {
          id: `RP-${r.id}`,
          type: isIncome ? 'Income' : 'Expense',
          party: r.party || r.title || (isIncome ? 'Client' : 'Vendor / Expense'),
          category: r.category || (isIncome ? 'Client Retainer / Fee Payment' : 'Office & Operations'),
          mode: r.method || 'Bank Transfer',
          amount: Number(r.amount || 0),
          date: normalizeToYMD(r.date || r.created_at),
          notes: r.notes || r.reference || ''
        };
      });

      // 2. Build entries from Supabase fees (Distinguishing between Inflow Fees & Outflow Expenses)
      const dbFeeTxs = (feesRes.data || []).filter(f => Number(f.paid || 0) > 0).map(f => {
        const isExpense = (f.invoice_no || '').startsWith('PAY') || 
                          (f.service || '').toUpperCase().includes('OUT_') || 
                          (f.service || '').toLowerCase().includes('expense') || 
                          (f.service || '').toLowerCase().includes('salary') ||
                          (f.service || '').toLowerCase().includes('rent');
        return {
          id: `FEE-${f.id}`,
          type: isExpense ? 'Expense' : 'Income',
          party: f.client_name || (isExpense ? 'Vendor / Payee' : 'Client'),
          category: f.service || (isExpense ? 'Office & Operations Expense' : 'Client Retainer / Monthly Fee'),
          mode: f.payment_mode || 'Bank Transfer',
          amount: Number(f.paid || 0),
          date: normalizeToYMD(f.paid_date || f.date || f.created_at),
          notes: f.invoice_no ? `Invoice: ${f.invoice_no}` : 'Automated Fee Sync'
        };
      });

      // 3. Build Expense Payments from Supabase payments
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

      // 4. Build Payroll Disbursements from local payroll history (Salaries / Bonuses)
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

      // 5. Merge with custom local transactions
      let localTxs = [];
      try {
        const rawLocal = localStorage.getItem('taxpro_calendar_transactions');
        if (rawLocal) localTxs = JSON.parse(rawLocal);
      } catch (e) {}

      const allMerged = [...dbDirectTxs, ...localTxs, ...dbFeeTxs, ...dbPayments, ...payrollTxs];
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
    const handleNoticesUpdate = (e) => {
      if (e.detail) {
        setNotices(e.detail);
      } else {
        setNotices(getUnifiedHolidayNotices());
      }
    };

    window.addEventListener('taxpro_db_updated', fetchData);
    window.addEventListener('taxpro_financial_updated', fetchData);
    window.addEventListener('taxpro_notices_updated', handleNoticesUpdate);
    window.addEventListener('storage', handleNoticesUpdate);
    return () => {
      window.removeEventListener('taxpro_db_updated', fetchData);
      window.removeEventListener('taxpro_financial_updated', fetchData);
      window.removeEventListener('taxpro_notices_updated', handleNoticesUpdate);
      window.removeEventListener('storage', handleNoticesUpdate);
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

  // Check if a notice is an official firm holiday / practice closure
  const isHolidayNotice = (n) => {
    if (!n) return false;
    if (n.isHoliday) return true;
    const prio = (n.priority || '').toLowerCase();
    if (prio.includes('holiday')) return true;
    const title = (n.title || '').toLowerCase();
    const msg = (n.message || '').toLowerCase();
    return title.includes('holiday') || title.includes('closed') || msg.includes('office holiday') || msg.includes('workstation closed');
  };

  // Get active holidays for a given date YYYY-MM-DD
  const getHolidaysForDate = (dateStr) => {
    return notices.filter(n => {
      if (!isHolidayNotice(n)) return false;
      const startDate = normalizeToYMD(n.holidayDate || n.date);
      if (n.holidayEndDate) {
        const endDate = normalizeToYMD(n.holidayEndDate);
        return dateStr >= startDate && dateStr <= endDate;
      }
      return startDate === dateStr;
    });
  };

  // Holidays for Selected Date
  const selectedDayHolidays = useMemo(() => {
    return getHolidaysForDate(selectedDateStr);
  }, [notices, selectedDateStr]);

  // Remove holiday notice directly from calendar view (Admins & Managers)
  const handleRemoveHolidayNotice = (id) => {
    const noticeToRemove = notices.find(n => n.id === id);
    const updated = deleteHolidayNotice(id);
    setNotices(updated);

    logAuditActivity({
      action: 'HOLIDAY_DELETED',
      module: 'Calendar & Workforce',
      details: `Removed holiday "${noticeToRemove?.title || id}" from practice calendar`,
      metadata: { id, title: noticeToRemove?.title }
    });

    if (onShowToast) onShowToast(`✓ Holiday "${noticeToRemove?.title || ''}" removed from calendar. This date is now a regular working day.`, 'info');
  };

  // Restore holiday notice (Admins & Managers)
  const handleRestoreHolidayNotice = (id, title) => {
    const updated = restoreHolidayNotice(id);
    setNotices(updated);

    logAuditActivity({
      action: 'HOLIDAY_RESTORED',
      module: 'Calendar & Workforce',
      details: `Restored holiday "${title || id}" on practice calendar`,
      metadata: { id, title }
    });

    if (onShowToast) onShowToast(`✓ Holiday "${title || ''}" restored as an active practice holiday.`, 'success');
  };

  // Master all holidays list (active + removed) for management modal
  const allMasterHolidays = useMemo(() => {
    const list = getAllMasterAndCustomHolidays();
    return list.filter(h => {
      const dateVal = h.holidayDate || h.date || '';
      if (holidayYearFilter && !dateVal.startsWith(String(holidayYearFilter))) return false;
      if (holidaySearchQuery.trim()) {
        const q = holidaySearchQuery.toLowerCase();
        const t = (h.title || '').toLowerCase();
        const m = (h.message || '').toLowerCase();
        return t.includes(q) || m.includes(q) || dateVal.includes(q);
      }
      return true;
    });
  }, [notices, holidaySearchQuery, holidayYearFilter]);

  // Declare new custom holiday (Admins & Managers)
  const handleSaveHoliday = (e) => {
    e.preventDefault();
    if (!holidayForm.title.trim() || !holidayForm.holidayDate) {
      if (onShowToast) onShowToast('Please enter holiday title and date.', 'warning');
      return;
    }
    const newNotice = {
      id: `FEST-CUSTOM-${Date.now()}`,
      title: holidayForm.title.trim(),
      message: holidayForm.message.trim() || `Official practice holiday declared for ${holidayForm.title.trim()}.`,
      holidayDate: holidayForm.holidayDate,
      holidayEndDate: holidayForm.holidayEndDate || holidayForm.holidayDate,
      priority: 'Holiday / Practice Closed',
      practiceStatus: holidayForm.practiceStatus || 'Office Closed (Festive Holiday)',
      targetDept: holidayForm.targetDept || 'All Departments',
      category: 'Festival Holiday',
      isHoliday: true,
      isFestival: true,
      authorName: currentUserName,
      authorRole: currentUserRole
    };
    const updated = saveCustomHolidayNotice(newNotice);
    setNotices(updated);
    setIsHolidayModalOpen(false);

    logAuditActivity({
      action: 'HOLIDAY_DECLARED',
      module: 'Calendar & Workforce',
      details: `Declared firm holiday "${newNotice.title}" on ${newNotice.holidayDate}${newNotice.holidayEndDate ? ' to ' + newNotice.holidayEndDate : ''}`,
      metadata: { title: newNotice.title, date: newNotice.holidayDate }
    });

    setHolidayForm({
      title: '',
      message: '',
      holidayDate: selectedDateStr,
      holidayEndDate: '',
      practiceStatus: 'Office Closed (Festive Holiday)',
      targetDept: 'All Departments'
    });
    if (onShowToast) onShowToast(`✓ Holiday "${newNotice.title}" declared on calendar!`, 'success');
  };

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

    logAuditActivity({
      action: 'CALENDAR_PAYMENT',
      module: 'Calendar & Workforce',
      details: `Recorded ${newTx.type} of ₹${numAmount.toLocaleString('en-IN')} (${newTx.category}) with party "${newTx.party}" on ${newTx.date}`,
      metadata: { id: newTx.id, type: newTx.type, amount: numAmount, party: newTx.party }
    });

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
    const targetTx = transactions.find(t => t.id === id);
    const filtered = transactions.filter(t => t.id !== id);
    setTransactions(filtered);
    try {
      const rawLocal = localStorage.getItem('taxpro_calendar_transactions');
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal).filter(t => t.id !== id);
        localStorage.setItem('taxpro_calendar_transactions', JSON.stringify(parsed));
      }
    } catch (err) {}

    logAuditActivity({
      action: 'DELETE_PAYMENT',
      module: 'Calendar & Workforce',
      details: `Removed calendar financial record "${targetTx?.party || id}" (${targetTx?.amount ? '₹' + targetTx.amount : ''})`,
      metadata: { id }
    });

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

    logAuditActivity({
      action: 'ADD_TASK',
      module: 'Calendar & Workforce',
      details: `Created calendar scheduled task "${newTask.title}" for client "${newTask.client}" (Due: ${newTask.due_date})`,
      metadata: { taskId: newTask.id, title: newTask.title, dueDate: newTask.due_date }
    });

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
    const targetTask = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      await supabase.from('global_tasks').update({ status: newStatus }).eq('id', taskId);
    } catch (err) {}

    logAuditActivity({
      action: 'UPDATE_TASK',
      module: 'Calendar & Workforce',
      details: `Marked calendar task "${targetTask?.title || taskId}" as ${newStatus}`,
      metadata: { taskId, status: newStatus }
    });

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

  // Print Specific Day Timesheet & Financial Statement
  const handlePrint = () => {
    const formattedDate = formatDateWithWeekday(selectedDate);

    const holidaysHtml = selectedDayHolidays.length > 0 ? `
      <div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px;">
        <div style="font-size: 11px; font-weight: 800; color: #78350f; text-transform: uppercase;">🏖️ Firm Circular / Practice Holiday: ${selectedDayHolidays[0].title}</div>
        <div style="font-size: 10.5px; color: #92400e; margin-top: 2px;">${selectedDayHolidays[0].message}</div>
      </div>
    ` : '';

    const transactionsRowsHtml = selectedDayTransactions.length > 0 
      ? selectedDayTransactions.map((tx, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10.5px;">
          <td style="padding: 6px 8px; text-align: center; font-family: monospace; color: #64748b;">${idx + 1}</td>
          <td style="padding: 6px 8px; font-weight: 700; color: ${tx.type === 'Income' ? '#059669' : '#dc2626'};">${tx.type}</td>
          <td style="padding: 6px 8px; font-weight: 600; color: #1e293b;">${tx.party || '-'}</td>
          <td style="padding: 6px 8px; color: #475569;">${tx.category || '-'}</td>
          <td style="padding: 6px 8px; font-family: monospace; color: #334155;">${tx.mode || 'UPI'}</td>
          <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: 700; color: ${tx.type === 'Income' ? '#059669' : '#dc2626'};">
            ${tx.type === 'Income' ? '+' : '-'}₹${Number(tx.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </td>
        </tr>
      `).join('')
      : `<tr><td colspan="6" style="padding: 12px; text-align: center; color: #94a3b8; font-style: italic;">No financial income or expense transactions on this date.</td></tr>`;

    const tasksRowsHtml = selectedDayTasks.length > 0
      ? selectedDayTasks.map((t, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10.5px;">
          <td style="padding: 6px 8px; text-align: center; font-family: monospace; color: #64748b;">${idx + 1}</td>
          <td style="padding: 6px 8px; font-weight: 700; color: #0f172a;">${t.title}</td>
          <td style="padding: 6px 8px; color: #334155;">${t.client || 'Enterprise'}</td>
          <td style="padding: 6px 8px; color: #475569;">${t.assignee || 'Unassigned'}</td>
          <td style="padding: 6px 8px; text-align: center;">
            <span class="badge-blue">${t.priority || 'Normal'}</span>
          </td>
          <td style="padding: 6px 8px; text-align: center;">
            <span class="status-pill ${t.status === 'Completed' ? 'status-completed' : 'status-pending'}">${t.status || 'Pending'}</span>
          </td>
        </tr>
      `).join('')
      : `<tr><td colspan="6" style="padding: 12px; text-align: center; color: #94a3b8; font-style: italic;">No deliverable tasks or compliance deadlines scheduled on this date.</td></tr>`;

    const bodyHtml = `
      <div style="margin-bottom: 14px; font-weight: 800; font-size: 13px; color: #1e293b;">
        Daily Schedule & Financial Timesheet — ${formattedDate}
      </div>

      ${holidaysHtml}

      <div style="font-weight: 800; font-size: 11.5px; color: #334155; margin-bottom: 6px;">
        1. Financial Cash Flow & Receipts (${selectedDayTransactions.length} Transactions)
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 30px; text-align: center;">#</th>
            <th>Type</th>
            <th>Client / Party</th>
            <th>Category</th>
            <th>Mode</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${transactionsRowsHtml}
        </tbody>
      </table>

      <div style="font-weight: 800; font-size: 11.5px; color: #334155; margin-top: 18px; margin-bottom: 6px;">
        2. Compliance Deadlines & Deliverable Tasks (${selectedDayTasks.length} Tasks)
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 30px; text-align: center;">#</th>
            <th>Task Description</th>
            <th>Client Name</th>
            <th>Assignee</th>
            <th style="text-align: center;">Priority</th>
            <th style="text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${tasksRowsHtml}
        </tbody>
      </table>
    `;

    printHtml(`Daily Agenda - ${formattedDate}`, bodyHtml);
    if (onShowToast) onShowToast(`🖨️ Generating printable daily timesheet for ${selectedDateStr}...`, 'info');
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
              Statement for: {formatDateWithWeekday(selectedDate)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-gray-900">
              Generated: {formatDate(new Date())}
            </div>
            <div className="text-[10px] font-mono text-gray-500">{new Date().toLocaleTimeString()}</div>
          </div>
        </div>

        {/* Print Holiday Notice Callout if active */}
        {selectedDayHolidays.length > 0 && (
          <div className="mb-4 p-3 border-2 border-amber-600 bg-amber-50 rounded text-xs">
            <div className="font-black text-amber-950 uppercase tracking-wide">
              🏖️ OFFICIAL FIRM HOLIDAY / CIRCULAR: {selectedDayHolidays[0].title}
            </div>
            <div className="text-[11px] text-amber-900 mt-0.5">
              {selectedDayHolidays[0].message}
            </div>
            <div className="text-[10px] text-amber-800 font-mono mt-1">
              Status: {selectedDayHolidays[0].practiceStatus || 'Office Closed'} • Target: {selectedDayHolidays[0].targetDept || 'All Departments'}
            </div>
          </div>
        )}

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
            {canManageHolidays && (
              <>
                <button
                  onClick={() => {
                    setHolidayForm({
                      title: '',
                      message: '',
                      holidayDate: selectedDateStr,
                      holidayEndDate: '',
                      practiceStatus: 'Office Closed (Festive Holiday)',
                      targetDept: 'All Departments'
                    });
                    setIsHolidayModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="Declare Festival or Practice Holiday on Calendar"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Declare Holiday</span>
                </button>

                <button
                  onClick={() => {
                    setHolidaySearchQuery('');
                    setIsManageHolidaysModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="Manage All Practice & Festival Holidays (Remove or Restore)"
                >
                  <CalendarIcon className="w-4 h-4 text-indigo-600" />
                  <span>Manage Holidays</span>
                </button>
              </>
            )}

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

                  const dayHolidays = getHolidaysForDate(dateStr);
                  const dayHasHoliday = dayHolidays.length > 0;
                  const dayTxs = transactions.filter(t => t.date === dateStr);
                  const dayHasIncome = dayTxs.some(t => t.type === 'Income');
                  const dayHasExpense = dayTxs.some(t => t.type === 'Expense');
                  const dayTaskCount = tasks.filter(t => (t.due_date || t.dueDate || t.date) === dateStr).length;
                  const dayProjCount = projects.filter(p => p.deadline === dateStr).length;

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(item.date)}
                      title={dayHasHoliday ? `🏖️ Holiday: ${dayHolidays[0].title}` : undefined}
                      className={`h-14 rounded-2xl flex flex-col items-center justify-between p-2 transition-all text-xs font-bold cursor-pointer relative ${
                        isSelected 
                          ? 'bg-[#5b52e0] text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-300' 
                          : (dayHasHoliday 
                              ? 'bg-amber-50/90 border-2 border-amber-300 text-amber-950 hover:bg-amber-100 shadow-2xs'
                              : (isToday 
                                  ? 'bg-indigo-50 border border-indigo-200 text-[#5b52e0] hover:bg-indigo-100' 
                                  : (isCurrent 
                                      ? 'bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-100' 
                                      : 'bg-transparent text-gray-300 hover:text-gray-400')))
                      }`}
                    >
                      <div className="w-full flex items-center justify-between">
                        <span className="leading-none text-sm font-black">{dayNum}</span>
                        {dayHasHoliday && (
                          <span className="text-[10px] leading-none" title={`🏖️ ${dayHolidays[0].title}`}>🏖️</span>
                        )}
                      </div>

                      {/* Financial, Task & Holiday Indicators */}
                      <div className="flex items-center gap-1 mt-auto">
                        {dayHasHoliday && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-amber-500 ring-1 ring-amber-300'}`} title={`🏖️ ${dayHolidays[0].title}`} />
                        )}
                        {dayHasIncome && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-200' : 'bg-emerald-500'}`} title="Income Recorded" />
                        )}
                        {dayHasExpense && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-rose-200' : 'bg-rose-500'}`} title="Expense Recorded" />
                        )}
                        {dayTaskCount > 0 && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-blue-300' : 'bg-blue-500'}`} title={`${dayTaskCount} tasks due`} />
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
              <div className="flex items-center justify-center gap-3.5 mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-500 font-medium flex-wrap">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 ring-1 ring-amber-300" /> 🏖️ Holiday</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Income</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Expense</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Tasks</span>
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
                    {formatDateWithWeekday(selectedDate)}
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
            
            {/* HOLIDAY NOTICES BANNER FOR SELECTED DATE */}
            {selectedDayHolidays.length > 0 && (
              <div className="flex flex-col gap-3">
                {selectedDayHolidays.map((h, i) => (
                  <div 
                    key={h.id || i}
                    className="bg-gradient-to-r from-amber-50 via-rose-50/40 to-amber-50 border-2 border-amber-300/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in relative overflow-hidden"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-2xl shadow-md shrink-0 ring-4 ring-amber-100">
                        🏖️
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-2xs">
                            Official Firm Holiday
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            {h.practiceStatus || 'Office Closed'}
                          </span>
                          <span className="text-[11px] font-semibold text-gray-500">
                            Audience: <strong className="text-gray-700">{h.targetDept || 'All Departments'}</strong>
                          </span>
                        </div>
                        <h3 className="text-base font-black text-gray-900 font-outfit">
                          {h.title}
                        </h3>
                        <p className="text-xs text-gray-700 mt-1 leading-relaxed max-w-2xl">
                          {h.message}
                        </p>
                        <div className="text-[10px] text-gray-400 font-medium mt-2">
                          Published by: <span className="font-bold text-gray-600">{h.authorName || 'Practice Management'}</span>
                        </div>
                      </div>
                    </div>

                    {canManageHolidays && (
                      <div className="flex flex-col items-end gap-1 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to remove "${h.title}" from the calendar?\n\nThis date will become a regular working day for all practice members.`)) {
                              handleRemoveHolidayNotice(h.id);
                            }
                          }}
                          className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-red-600/20 active:scale-95"
                          title="Remove this holiday from the calendar (e.g. keep office open on Janmashtami)"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                          <span>Remove Holiday (Workday)</span>
                        </button>
                        <span className="text-[10px] text-gray-500 font-semibold">Convert to normal working day</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
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
                      Cashflow and fee disbursements for {formatDate(selectedDate)}
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
                      Tasks scheduled specifically for {formatDate(selectedDate)}
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
                  <span>No tasks scheduled for {formatDate(selectedDate)}.</span>
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
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-modal-smooth">
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-slate-900 tracking-tight">
                    Record Financial Entry
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Log client fee receipt or practice expenditure for {formatDate(selectedDate)}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsTxModalOpen(false)} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveTransaction} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold overscroll-contain chat-custom-scrollbar">
              
              {/* Type Switcher */}
              <div>
                <label className="text-slate-700 block mb-1.5">Transaction Nature</label>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTxForm({ ...txForm, type: 'Income', category: INCOME_CATEGORIES[0] })}
                    className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      txForm.type === 'Income'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-400 shadow-2xs ring-2 ring-emerald-400/20'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${txForm.type === 'Income' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <span>Income / Receipt (Inflow)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxForm({ ...txForm, type: 'Expense', category: EXPENSE_CATEGORIES[0] })}
                    className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      txForm.type === 'Expense'
                        ? 'bg-rose-50 text-rose-800 border-rose-400 shadow-2xs ring-2 ring-rose-400/20'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${txForm.type === 'Expense' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <ArrowDownRight className="w-4 h-4" />
                    </div>
                    <span>Expense / Payment (Outflow)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Party / Client / Payee */}
                <div>
                  <label className="text-slate-700 block mb-1">
                    {txForm.type === 'Income' ? 'Client / Entity Name' : 'Payee / Vendor / Employee Name'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={txForm.type === 'Income' ? 'e.g. Acme Corp Pvt Ltd' : 'e.g. Rahul Sharma (Salary), Landlord (Rent), Airtel'}
                    value={txForm.party}
                    onChange={(e) => setTxForm({ ...txForm, party: e.target.value })}
                    list={txForm.type === 'Income' ? 'calendar-client-list' : 'calendar-payee-list'}
                    className="w-full bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:border-indigo-600 text-xs font-semibold shadow-2xs"
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
                  <label className="text-slate-700 block mb-1">Amount (₹) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 25000"
                    value={txForm.amount}
                    onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                    className="w-full bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:border-indigo-600 font-mono text-xs font-bold shadow-2xs"
                  />
                </div>
              </div>

              {/* Category & Payment Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-slate-700 block mb-1">Category / Ledger Head</label>
                  <select
                    value={txForm.category}
                    onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                    className="w-full bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:border-indigo-600 text-xs cursor-pointer shadow-2xs font-semibold"
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
                  <label className="text-slate-700 block mb-1">Payment Channel</label>
                  <select
                    value={txForm.mode}
                    onChange={(e) => setTxForm({ ...txForm, mode: e.target.value })}
                    className="w-full bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:border-indigo-600 text-xs cursor-pointer shadow-2xs font-semibold"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-slate-700 block mb-1">Transaction Date</label>
                  <input
                    type="date"
                    value={txForm.date}
                    onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                    className="w-full bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:border-indigo-600 text-xs shadow-2xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">Reference / Note (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Invoice #2024-089 or UPI Txn Ref"
                    value={txForm.notes}
                    onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })}
                    className="w-full bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:border-indigo-600 text-xs shadow-2xs"
                  />
                </div>
              </div>

              {/* Bottom Sticky Actions */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 -mx-6 -mb-6 mt-3">
                <button
                  type="button"
                  onClick={() => setIsTxModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
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
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-modal-smooth">
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-slate-900 tracking-tight">
                    Schedule Deliverable Task
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Assign task for {formatDate(selectedDate)}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsTaskModalOpen(false)} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveTask} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold overscroll-contain chat-custom-scrollbar">
              
              <div>
                <label className="text-slate-700 block mb-1">Task Title <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. File GSTR-3B for August Quarter"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:border-indigo-600 text-xs shadow-2xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-slate-700 block mb-1">Associated Client</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp Pvt Ltd"
                    value={taskForm.client}
                    onChange={(e) => setTaskForm({ ...taskForm, client: e.target.value })}
                    list="task-client-options"
                    className="w-full bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:border-indigo-600 text-xs shadow-2xs"
                  />
                  <datalist id="task-client-options">
                    {clients.map((c, i) => (
                      <option key={i} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 block">Assignee</label>
                    <button
                      type="button"
                      onClick={() => setTaskForm({ ...taskForm, assignee: currentUserName })}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                    >
                      ⚡ Assign to Me
                    </button>
                  </div>
                  <select
                    value={taskForm.assignee}
                    onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })}
                    className="w-full bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:border-indigo-600 text-xs cursor-pointer font-semibold shadow-2xs"
                  >
                    <option value="Unassigned">-- Select Assignee --</option>
                    <option value={currentUserName}>⚡ {currentUserName} (Myself / Admin)</option>
                    <option value="Administrator">Administrator</option>
                    {teamMembers.filter(m => m !== currentUserName && m !== 'Administrator').map((m, i) => (
                      <option key={i} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-slate-700 block mb-1">Priority Level</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:border-indigo-600 text-xs cursor-pointer shadow-2xs font-semibold"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    className="w-full bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:border-indigo-600 text-xs shadow-2xs font-mono"
                  />
                </div>
              </div>

              {/* Bottom Sticky Actions */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 -mx-6 -mb-6 mt-3">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  Create Task
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 4. DECLARE FESTIVAL / CUSTOM PRACTICE HOLIDAY MODAL (ADMIN / MANAGER) */}
      {isHolidayModalOpen && canManageHolidays && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsHolidayModalOpen(false); }}
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-modal-smooth">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-2xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-slate-900">
                    Declare Festival or Practice Holiday
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Publish official firm holiday on calendar & workforce schedules
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHolidayModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveHoliday} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold overscroll-contain chat-custom-scrollbar">
              <div>
                <label className="text-slate-700 block mb-1">
                  Holiday Name / Festival Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 🪔 Diwali Festival Holiday or Pateti Parsi New Year"
                  value={holidayForm.title}
                  onChange={(e) => setHolidayForm({ ...holidayForm, title: e.target.value })}
                  className="w-full bg-white rounded-xl px-3.5 py-2 border border-slate-300 outline-none focus:border-amber-500 text-xs font-bold text-slate-900 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-slate-700 block mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={holidayForm.holidayDate}
                    onChange={(e) => setHolidayForm({ ...holidayForm, holidayDate: e.target.value })}
                    className="w-full bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:border-amber-500 text-xs shadow-2xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1">End Date (Optional Range)</label>
                  <input
                    type="date"
                    value={holidayForm.holidayEndDate}
                    onChange={(e) => setHolidayForm({ ...holidayForm, holidayEndDate: e.target.value })}
                    className="w-full bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:border-amber-500 text-xs shadow-2xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-slate-700 block mb-1">Office / Workstation Status</label>
                  <select
                    value={holidayForm.practiceStatus}
                    onChange={(e) => setHolidayForm({ ...holidayForm, practiceStatus: e.target.value })}
                    className="w-full bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:border-amber-500 text-xs cursor-pointer shadow-2xs font-semibold"
                  >
                    <option value="Office Closed (Festive Holiday)">Office Closed (Festive Holiday)</option>
                    <option value="Half Day (Morning Shift Only)">Half Day (Morning Shift Only)</option>
                    <option value="Optional Festive Leave">Optional Festive Leave</option>
                    <option value="Emergency Support Only">Emergency Support Only</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 block mb-1">Target Department</label>
                  <select
                    value={holidayForm.targetDept}
                    onChange={(e) => setHolidayForm({ ...holidayForm, targetDept: e.target.value })}
                    className="w-full bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:border-amber-500 text-xs cursor-pointer shadow-2xs font-semibold"
                  >
                    <option value="All Departments">All Departments</option>
                    <option value="Tax Compliance">Tax Compliance</option>
                    <option value="GST & Audit">GST & Audit</option>
                    <option value="Accounting">Accounting</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-700 block mb-1">Official Circular Note / Description</label>
                <textarea
                  rows={2}
                  placeholder="Memo to staff regarding practice schedule and client notices..."
                  value={holidayForm.message}
                  onChange={(e) => setHolidayForm({ ...holidayForm, message: e.target.value })}
                  className="w-full bg-white rounded-xl px-3.5 py-2 border border-slate-300 outline-none focus:border-amber-500 text-xs resize-none shadow-2xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 -mx-6 -mb-6 mt-3">
                <button
                  type="button"
                  onClick={() => setIsHolidayModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Publish Holiday</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MANAGE ALL PRACTICE & FESTIVAL HOLIDAYS MODAL (ADMIN / MANAGER) */}
      {isManageHolidaysModalOpen && canManageHolidays && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsManageHolidaysModalOpen(false); }}
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-modal-smooth">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-slate-900">
                    Manage Practice & Festival Holidays
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Remove festival holidays to keep office open (e.g. Janmashtami) or restore holidays
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsManageHolidaysModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Year Filters */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={holidaySearchQuery}
                  onChange={(e) => setHolidaySearchQuery(e.target.value)}
                  placeholder="Search holiday (e.g. Janmashtami, Diwali, Holi, Eid)..."
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600 shadow-2xs"
                />
              </div>

              {/* Year Filter Buttons */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                {[2025, 2026, 2027].map(yr => (
                  <button
                    key={yr}
                    onClick={() => setHolidayYearFilter(yr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      holidayYearFilter === yr ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
                <button
                  onClick={() => setHolidayYearFilter('')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    holidayYearFilter === '' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  All
                </button>
              </div>
            </div>

            {/* Holiday Items List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 overscroll-contain chat-custom-scrollbar">
              {allMasterHolidays.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No holidays match your search query or filter.
                </div>
              ) : (
                allMasterHolidays.map((item) => {
                  const dateStr = item.holidayDate || item.date || '';
                  const formattedD = dateStr ? formatDateWithWeekday(dateStr) : '';
                  const isExcluded = item.isRemoved;

                  return (
                    <div 
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs ${
                        isExcluded 
                          ? 'bg-slate-50 border-slate-200 opacity-75' 
                          : 'bg-white border-amber-200/80 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                          isExcluded ? 'bg-slate-200 text-slate-500' : 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-100'
                        }`}>
                          {item.title?.slice(0, 2) || '🏖️'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="text-xs font-bold font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                              {formattedD}
                            </span>
                            {isExcluded ? (
                              <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[10px] font-black uppercase">
                                💼 Regular Working Day
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black uppercase">
                                🏖️ Practice Holiday
                              </span>
                            )}
                          </div>
                          <h4 className={`text-sm font-black font-outfit ${isExcluded ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                            {item.title}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                            {item.message}
                          </p>
                        </div>
                      </div>

                      {/* Action Button: Remove or Restore */}
                      <div className="self-end sm:self-center shrink-0">
                        {isExcluded ? (
                          <button
                            type="button"
                            onClick={() => handleRestoreHolidayNotice(item.id, item.title)}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                            title="Restore this date as an official practice holiday"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore as Holiday</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Remove "${item.title}" from practice calendar?\n\nDate: ${formattedD}\nThis will make it a normal working day for the office.`)) {
                                handleRemoveHolidayNotice(item.id);
                              }
                            }}
                            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                            title="Remove holiday (e.g. keep office open on Janmashtami)"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Remove Holiday</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                Changes apply instantly across all employee calendars and timesheets.
              </span>
              <button
                type="button"
                onClick={() => setIsManageHolidaysModalOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
