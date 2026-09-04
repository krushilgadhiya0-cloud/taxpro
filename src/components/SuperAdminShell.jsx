import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Users, 
  CreditCard, 
  Activity, 
  ShieldAlert, 
  Settings2,
  Search,
  Bell,
  ArrowUpRight, 
  ArrowLeft,
  LogOut,
  Database,
  Globe2,
  ServerCrash,
  Download,
  Printer,
  X,
  ShieldCheck,
  HelpCircle,
  Calendar as CalendarIcon,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Receipt,
  CheckCircle2,
  Clock,
  Filter,
  ArrowUpDown,
  FileSpreadsheet,
  Check,
  Briefcase,
  UserCheck,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Tag,
  BadgeCheck,
  Layers,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Plus,
  Trash2,
  Wifi,
  Globe,
  Server,
  Zap,
  Cpu,
  Coffee,
  Coins,
  LogIn,
  LogOut as PunchOutIcon,
  Timer,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { logAuditActivity } from '../lib/auditLogger';
import { formatDate, formatDateWithWeekday } from '../lib/dateUtils';

const MONTHS_LIST = [
  { num: '01', short: 'Jan', name: 'January' },
  { num: '02', short: 'Feb', name: 'February' },
  { num: '03', short: 'Mar', name: 'March' },
  { num: '04', short: 'Apr', name: 'April' },
  { num: '05', short: 'May', name: 'May' },
  { num: '06', short: 'Jun', name: 'June' },
  { num: '07', short: 'Jul', name: 'July' },
  { num: '08', short: 'Aug', name: 'August' },
  { num: '09', short: 'Sep', name: 'September' },
  { num: '10', short: 'Oct', name: 'October' },
  { num: '11', short: 'Nov', name: 'November' },
  { num: '12', short: 'Dec', name: 'December' },
];

const EXPENSE_CATEGORIES = [
  { id: 'rent', label: 'Office Rent & Lease', icon: '🏢', defaultTitle: 'Monthly Office Rent - Silicon Square', defaultPayee: 'Silicon Square Properties Ltd.' },
  { id: 'wifi', label: 'WiFi & High-Speed Internet', icon: '📶', defaultTitle: 'Airtel Fiber Gigabit Optical Broadband', defaultPayee: 'Airtel Business Ltd.' },
  { id: 'domain', label: 'Domains & DNS Management', icon: '🌐', defaultTitle: 'Domain Registrations & Cloudflare SSL', defaultPayee: 'Cloudflare / Namecheap Inc.' },
  { id: 'hosting', label: 'Cloud Hosting & Servers', icon: '☁️', defaultTitle: 'PostgreSQL Relational DB & Vercel Hosting', defaultPayee: 'Supabase / AWS Cloud' },
  { id: 'saas_ai', label: 'Software, AI APIs & SaaS', icon: '🤖', defaultTitle: 'OpenAI API & Gemini AI Monthly Billing', defaultPayee: 'OpenAI / Google Cloud' },
  { id: 'electricity', label: 'Electricity & Power Backup', icon: '⚡', defaultTitle: 'Commercial Power & Inverter Maintenance', defaultPayee: 'Electricity Distribution Board' },
  { id: 'hardware', label: 'Hardware, Computers & Tools', icon: '💻', defaultTitle: 'Workstation Monitors & Biometric Scanners', defaultPayee: 'Tech Hardware Solutions' },
  { id: 'supplies', label: 'Office Supplies & Refreshments', icon: '☕', defaultTitle: 'Executive Pantry, Coffee & Stationery', defaultPayee: 'Office Supplies Vendor' },
  { id: 'payroll', label: 'Staff Payroll & Contractor Payouts', icon: '💼', defaultTitle: 'Consultant & Freelancer Retainer Fee', defaultPayee: 'Contractor Associate' },
  { id: 'legal', label: 'Legal, CA & Compliance Audit', icon: '⚖️', defaultTitle: 'Quarterly Statutory Audit & Legal Advisory', defaultPayee: 'Chartered Accountants Firm' },
  { id: 'other', label: 'Miscellaneous Operating Expense', icon: '🏷️', defaultTitle: 'General Operational Expenditure', defaultPayee: 'Vendor Supplier' },
];

export default function SuperAdminShell({ onLogout, onShowToast, onSwitchToPMS }) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [members, setMembers] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [rawPayments, setRawPayments] = useState([]);
  const [rawFees, setRawFees] = useState([]);
  const [rawReceipts, setRawReceipts] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [aiLogs, setAiLogs] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Revenue Analytics & History State
  const currentSystemYear = String(new Date().getFullYear());
  const currentSystemMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const [selectedRevYear, setSelectedRevYear] = useState(currentSystemYear);
  const [selectedRevMonth, setSelectedRevMonth] = useState('all');
  const [revFilterType, setRevFilterType] = useState('all');
  const [revSearchQuery, setRevSearchQuery] = useState('');

  // Latest Payments Tab Filters
  const [paymentFilterFlow, setPaymentFilterFlow] = useState('all'); // 'all' | 'receipt' | 'expense'
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');

  // Workforce & Firm Navigation State (Full-Page Hierarchy)
  const [selectedFirmForRoster, setSelectedFirmForRoster] = useState(null);
  const [workforceRoleFilter, setWorkforceRoleFilter] = useState('all');
  const [workforceSearchQuery, setWorkforceSearchQuery] = useState('');
  const [workforceDeptFilter, setWorkforceDeptFilter] = useState('all');
  const [workforceStatusFilter, setWorkforceStatusFilter] = useState('all');

  // Calendar & Attendance Punch State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date().toISOString().slice(0, 10));
  const [adminPunchStatus, setAdminPunchStatus] = useState(() => {
    return localStorage.getItem('taxpro_superadmin_punch') === 'in' ? 'in' : 'out';
  });
  const [adminPunchTime, setAdminPunchTime] = useState(() => {
    return localStorage.getItem('taxpro_superadmin_punch_time') || null;
  });
  const [currentTimeStr, setCurrentTimeStr] = useState(new Date().toLocaleTimeString());

  // Security / New Users Filter
  const [newUsersRoleFilter, setNewUsersRoleFilter] = useState('all');
  const [newUsersSearchQuery, setNewUsersSearchQuery] = useState('');

  // Subscription Management Modal State
  const [subModalFirm, setSubModalFirm] = useState(null);
  const [subModalPlan, setSubModalPlan] = useState('Enterprise Cloud Practice (Annual Pro)');
  const [subModalDaysToAdd, setSubModalDaysToAdd] = useState(365);
  const [subModalCustomDate, setSubModalCustomDate] = useState('');

  // Expense Management Modal State
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [expenseFilterCategory, setExpenseFilterCategory] = useState('all');
  const [expenseSearchQuery, setExpenseSearchQuery] = useState('');
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  const [expenseForm, setExpenseForm] = useState({
    category: 'Office Rent & Lease',
    title: 'Monthly Office Rent - Silicon Square',
    payee: 'Silicon Square Properties Ltd.',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    mode: 'Bank Transfer',
    refNo: `EXP-${Date.now().toString().slice(-6)}`,
    status: 'Paid Out',
    notes: 'Recurring monthly office lease agreement payment',
    isRecurring: true
  });

  // Live Digital Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeStr(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchGlobalStats();
    try {
      const logs = localStorage.getItem('taxpro_ai_training_logs');
      if (logs) setAiLogs(JSON.parse(logs));
    } catch (e) { }

    const handleDbUpdate = () => fetchGlobalStats();
    window.addEventListener('taxpro_db_updated', handleDbUpdate);
    window.addEventListener('taxpro_financial_updated', handleDbUpdate);
    window.addEventListener('taxpro_firm_updated', handleDbUpdate);
    window.addEventListener('taxpro_attendance_updated', handleDbUpdate);

    // Voice AI Navigation
    const handleVoiceNav = (e) => {
      const target = e.detail.toLowerCase();
      const validTabs = ['Overview', 'Firms & Workforce', 'Calendar & In/Out', 'Latest Payments', 'Operating Expenses', 'Revenue & Billing', 'Security Logs'];

      const matched = validTabs.find(t => t.toLowerCase().includes(target));
      if (matched) {
        setActiveTab(matched);
        if (onShowToast) onShowToast(`Voice Command: Master view switched to ${matched}`, 'success');
      } else if (target.includes('calendar') || target.includes('attendance') || target.includes('punch') || target.includes('login')) {
        setActiveTab('Calendar & In/Out');
      } else if (target.includes('latest payment') || target.includes('transaction')) {
        setActiveTab('Latest Payments');
      } else if (target.includes('expense') || target.includes('rent') || target.includes('wifi') || target.includes('domain')) {
        setActiveTab('Operating Expenses');
      } else if (target.includes('revenue') || target.includes('billing')) {
        setActiveTab('Revenue & Billing');
      } else if (target.includes('firm') || target.includes('workforce') || target.includes('subscription')) {
        setActiveTab('Firms & Workforce');
      } else if (target.includes('log') || target.includes('new user') || target.includes('audit')) {
        setActiveTab('Security Logs');
      } else if (target.includes('dashboard') || target.includes('home')) {
        setActiveTab('Overview');
      }
    };
    window.addEventListener('ai_navigate', handleVoiceNav);

    return () => {
      window.removeEventListener('taxpro_db_updated', handleDbUpdate);
      window.removeEventListener('taxpro_financial_updated', handleDbUpdate);
      window.removeEventListener('taxpro_firm_updated', handleDbUpdate);
      window.removeEventListener('taxpro_attendance_updated', handleDbUpdate);
      window.removeEventListener('ai_navigate', handleVoiceNav);
    };
  }, [onShowToast]);

  const fetchGlobalStats = async () => {
    setIsLoadingData(true);
    try {
      const [memberRes, clientRes, payRes, logRes, feeRes, recRes, attRes, userRes] = await Promise.all([
        supabase.from('team_members').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('fees').select('*').order('created_at', { ascending: false }),
        supabase.from('receipts_payments').select('*').order('created_at', { ascending: false }),
        supabase.from('attendance').select('*').order('created_at', { ascending: false }),
        supabase.from('users').select('*').order('created_at', { ascending: false })
      ]);

      if (memberRes.data) setMembers(memberRes.data);
      if (clientRes.data) setClients(clientRes.data);
      if (payRes.data) setRawPayments(payRes.data);
      if (feeRes.data) setRawFees(feeRes.data);
      if (recRes.data) setRawReceipts(recRes.data);
      if (attRes.data) setAttendanceRecords(attRes.data);
      if (userRes.data) setRegisteredUsers(userRes.data);

      const rawLogs = logRes.data || [];
      if (rawLogs.length > 0) {
        setSystemLogs(rawLogs);
      }
    } catch (e) {
      console.error('[SuperAdmin Stats Fetch Error]:', e);
    } finally {
      setIsLoadingData(false);
    }
  };

  // SuperAdmin IN / OUT Punch Action
  const handleToggleAdminPunch = async () => {
    const nextStatus = adminPunchStatus === 'in' ? 'out' : 'in';
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const todayStr = new Date().toISOString().slice(0, 10);

    setAdminPunchStatus(nextStatus);
    setAdminPunchTime(nowTimeStr);
    localStorage.setItem('taxpro_superadmin_punch', nextStatus);
    localStorage.setItem('taxpro_superadmin_punch_time', nowTimeStr);

    try {
      if (nextStatus === 'in') {
        await supabase.from('attendance').insert([{
          id: `ATT-ADMIN-${Date.now()}`,
          member_id: 'SUPERADMIN-ROOT',
          employee_name: 'Super Admin (Root Authority)',
          date: todayStr,
          mode: 'SuperAdmin Web Punch',
          shift: 'Executive Master Shift',
          status: 'Present',
          logged_at: nowTimeStr,
          in_time: nowTimeStr,
          out_time: '-',
          notes: 'Super Admin checked in to SaaS Console'
        }]);
        if (onShowToast) onShowToast(`🟢 SuperAdmin Checked IN successfully at ${nowTimeStr}!`, 'success');
      } else {
        await supabase.from('attendance').insert([{
          id: `ATT-ADMIN-${Date.now()}`,
          member_id: 'SUPERADMIN-ROOT',
          employee_name: 'Super Admin (Root Authority)',
          date: todayStr,
          mode: 'SuperAdmin Web Punch',
          shift: 'Executive Master Shift',
          status: 'Present',
          logged_at: nowTimeStr,
          in_time: adminPunchTime || '09:00 AM',
          out_time: nowTimeStr,
          notes: 'Super Admin punched OUT from session'
        }]);
        if (onShowToast) onShowToast(`🔴 SuperAdmin Checked OUT at ${nowTimeStr}. Shift logged.`, 'info');
      }

      await logAuditActivity({
        action: nextStatus === 'in' ? 'SUPERADMIN_PUNCH_IN' : 'SUPERADMIN_PUNCH_OUT',
        module: 'Attendance',
        details: `Super Admin executed ${nextStatus === 'in' ? 'Check-In' : 'Check-Out'} at ${nowTimeStr}`
      });

      fetchGlobalStats();
    } catch (e) {
      console.warn('Punch log err:', e);
    }
  };

  // Quick Punch for any team member from SuperAdmin
  const handleMemberQuickPunch = async (m, actionType) => {
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const todayStr = selectedCalendarDate;

    try {
      if (actionType === 'in') {
        await supabase.from('attendance').insert([{
          id: `ATT-${Date.now()}`,
          member_id: m.id,
          employee_name: m.name,
          date: todayStr,
          mode: 'Admin Authorized Check-in',
          shift: m.shift || 'General Shift',
          status: 'Present',
          logged_at: nowTimeStr,
          in_time: nowTimeStr,
          out_time: '-',
          notes: 'Punch recorded by SuperAdmin'
        }]);
        if (onShowToast) onShowToast(`✓ Check-In saved for ${m.name} at ${nowTimeStr}`, 'success');
      } else {
        await supabase.from('attendance').insert([{
          id: `ATT-${Date.now()}`,
          member_id: m.id,
          employee_name: m.name,
          date: todayStr,
          mode: 'Admin Authorized Check-out',
          shift: m.shift || 'General Shift',
          status: 'Present',
          logged_at: nowTimeStr,
          in_time: '09:30 AM',
          out_time: nowTimeStr,
          notes: 'Check-out authorized by SuperAdmin'
        }]);
        if (onShowToast) onShowToast(`✓ Check-Out logged for ${m.name} at ${nowTimeStr}`, 'info');
      }

      fetchGlobalStats();
    } catch (e) {
      if (onShowToast) onShowToast('Failed to record punch.', 'error');
    }
  };

  // Open Subscription Modal for any specific firm
  const handleOpenSubModal = (firm) => {
    setSubModalFirm(firm);
    setSubModalPlan(firm.subscriptionPlan || 'Enterprise Cloud Practice (Annual Pro)');
    const defaultDays = 180;
    setSubModalDaysToAdd(defaultDays);
    const base = new Date(firm.subscriptionExpiry || Date.now());
    const initialNewDate = new Date(base.getTime() + defaultDays * 24 * 60 * 60 * 1000);
    setSubModalCustomDate(initialNewDate.toISOString().slice(0, 10));
  };

  // Save / Extend Subscription to any specific firm
  const handleSaveFirmSubscription = async (targetExpDate, planName) => {
    if (!subModalFirm) return;
    const cleanDate = targetExpDate || subModalCustomDate || new Date().toISOString().slice(0, 10);
    const cleanPlan = planName || subModalPlan || 'Enterprise Cloud Practice (Annual Pro)';

    localStorage.setItem(`taxpro_sub_exp_${subModalFirm.id}`, cleanDate);
    localStorage.setItem(`taxpro_sub_plan_${subModalFirm.id}`, cleanPlan);

    try {
      await logAuditActivity({
        action: 'SUBSCRIPTION_GRANTED_OR_EXTENDED',
        module: 'Subscriptions',
        details: `Updated SaaS subscription for "${subModalFirm.name}" to "${cleanPlan}" (Valid till ${cleanDate})`
      });
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('taxpro_firm_updated'));
    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

    if (onShowToast) {
      onShowToast(`🎉 Subscription for "${subModalFirm.name}" updated! Plan: ${cleanPlan} till ${cleanDate}`, 'success');
    }

    setSubModalFirm(null);
    fetchGlobalStats();
  };

  // Quick 1-Click +1 Year Extension
  const handleExtendFirmSubscription = async (firm) => {
    const currentExp = new Date(firm.subscriptionExpiry || Date.now());
    const newExp = new Date(currentExp.getFullYear() + 1, currentExp.getMonth(), currentExp.getDate());
    const newExpStr = newExp.toISOString().slice(0, 10);

    localStorage.setItem(`taxpro_sub_exp_${firm.id}`, newExpStr);
    
    try {
      await logAuditActivity({
        action: 'SUBSCRIPTION_EXTENDED',
        module: 'Subscriptions',
        details: `Extended SaaS subscription for "${firm.name}" by +365 Days (New Expiry: ${newExpStr})`
      });
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('taxpro_firm_updated'));
    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

    if (onShowToast) {
      onShowToast(`🎉 Subscription for ${firm.name} extended by +1 Year! (Valid till ${formatDate(newExp)})`, 'success');
    }
    fetchGlobalStats();
  };

  // Select a preset category and auto-populate title & payee
  const handleSelectPresetCategory = (cat) => {
    setExpenseForm(prev => ({
      ...prev,
      category: cat.label,
      title: cat.defaultTitle,
      payee: cat.defaultPayee,
      refNo: `EXP-${Date.now().toString().slice(-6)}`
    }));
  };

  // Save new Operating Expense to database
  const handleSaveExpense = async (e) => {
    if (e) e.preventDefault();

    const numAmt = parseFloat(expenseForm.amount);
    if (!numAmt || numAmt <= 0) {
      if (onShowToast) onShowToast('Please enter a valid expense amount in INR.', 'error');
      return;
    }
    if (!expenseForm.title.trim()) {
      if (onShowToast) onShowToast('Please provide an expense title/description.', 'error');
      return;
    }
    if (!expenseForm.payee.trim()) {
      if (onShowToast) onShowToast('Please provide the payee / vendor name.', 'error');
      return;
    }

    setIsSavingExpense(true);
    try {
      const expDate = expenseForm.date || new Date().toISOString().slice(0, 10);
      const cleanRef = expenseForm.refNo.trim() || `EXP-${Date.now().toString().slice(-6)}`;
      const expId = `EXP-${Date.now()}`;
      const expTitle = expenseForm.title.trim();
      const expParty = expenseForm.payee.trim();
      const expNotes = expenseForm.notes ? expenseForm.notes.trim() : expTitle;

      // Object adhering to PostgreSQL receipts_payments table schema
      const newExpenseRecord = {
        id: expId,
        title: expTitle,
        type: 'expense',
        flow_type: 'Payment',
        category: expenseForm.category,
        amount: numAmt,
        method: expenseForm.mode,
        mode: expenseForm.mode,
        date: expDate,
        party: expParty,
        client_name: expParty,
        reference: cleanRef,
        ref_no: cleanRef,
        notes: expNotes,
        remarks: expNotes,
        created_at: new Date(expDate).toISOString()
      };

      // 1. Insert into receipts_payments table in PostgreSQL
      try {
        await supabase.from('receipts_payments').insert([newExpenseRecord]);
      } catch (err) {
        console.warn('PostgreSQL receipts_payments insert fallback:', err);
      }

      // 2. Also insert into payments table for cross-table sync
      try {
        await supabase.from('payments').insert([{
          id: `PAY-${Date.now().toString().slice(-6)}`,
          recipient: expParty,
          client_name: expParty,
          category: expenseForm.category,
          method: expenseForm.mode,
          amount: String(numAmt),
          numeric_amount: numAmt,
          status: 'Success',
          date: expDate,
          notes: expTitle,
          reference: cleanRef
        }]);
      } catch (err) {}

      // 3. Save to localStorage calendar transactions backup
      try {
        const storedCalendar = JSON.parse(localStorage.getItem('taxpro_calendar_transactions') || '[]');
        storedCalendar.unshift({
          id: expId,
          type: 'Payment',
          client: expParty,
          category: expenseForm.category,
          mode: expenseForm.mode,
          amount: numAmt,
          date: expDate,
          notes: expTitle
        });
        localStorage.setItem('taxpro_calendar_transactions', JSON.stringify(storedCalendar));
      } catch (e) {}

      // 4. Update immediate local state in memory
      setRawReceipts(prev => [newExpenseRecord, ...prev]);

      // 5. Log Audit Activity
      try {
        await logAuditActivity({
          action: 'OPERATING_EXPENSE_LOGGED',
          module: 'Financials',
          details: `Logged expense of ₹${numAmt.toLocaleString('en-IN')} for "${expTitle}" under ${expenseForm.category}`,
          metadata: {
            category: expenseForm.category,
            payee: expParty,
            amount: numAmt,
            refNo: cleanRef
          }
        });
      } catch (err) {}

      window.dispatchEvent(new CustomEvent('taxpro_financial_updated'));
      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

      if (onShowToast) {
        onShowToast(`✓ Operating Expense of ₹${numAmt.toLocaleString('en-IN')} recorded under [${expenseForm.category}]!`, 'success');
      }

      setIsAddExpenseModalOpen(false);
      setExpenseForm({
        category: 'Office Rent & Lease',
        title: 'Monthly Office Rent - Silicon Square',
        payee: 'Silicon Square Properties Ltd.',
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        mode: 'Bank Transfer',
        refNo: `EXP-${Date.now().toString().slice(-6)}`,
        status: 'Paid Out',
        notes: 'Recurring monthly office lease agreement payment',
        isRecurring: true
      });

      fetchGlobalStats();
    } catch (err) {
      if (onShowToast) onShowToast('Failed to record expense. Please try again.', 'error');
    } finally {
      setIsSavingExpense(false);
    }
  };

  // Delete an expense record
  const handleDeleteExpense = async (tx) => {
    if (!window.confirm(`Are you sure you want to remove expense record "${tx.client}" of ₹${tx.amount.toLocaleString('en-IN')}?`)) {
      return;
    }

    try {
      if (tx.rawId) {
        try {
          await supabase.from('receipts_payments').delete().eq('id', tx.rawId);
        } catch (e) {}
        try {
          await supabase.from('payments').delete().eq('id', tx.rawId);
        } catch (e) {}
      }

      setRawReceipts(prev => prev.filter(r => r.id !== tx.rawId && r.id !== tx.id && `EXP-${r.id}` !== tx.id && `PAY-${r.id}` !== tx.id));
      setRawPayments(prev => prev.filter(p => p.id !== tx.rawId && p.id !== tx.id));

      try {
        const stored = JSON.parse(localStorage.getItem('taxpro_calendar_transactions') || '[]');
        const updated = stored.filter(s => s.id !== tx.rawId && s.id !== tx.id);
        localStorage.setItem('taxpro_calendar_transactions', JSON.stringify(updated));
      } catch (e) {}

      window.dispatchEvent(new CustomEvent('taxpro_financial_updated'));
      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
      if (onShowToast) onShowToast('✓ Expense record removed successfully.', 'info');
      fetchGlobalStats();
    } catch (err) {
      if (onShowToast) onShowToast('Failed to delete expense.', 'error');
    }
  };

  // ============================================================================
  // WORKFORCE & FIRM/COMPANY HIERARCHICAL & SUBSCRIPTION ENGINE
  // ============================================================================
  const {
    totalAdminsCount,
    totalManagersCount,
    totalEmployeesCount,
    totalGlobalWorkforce,
    firmsList
  } = useMemo(() => {
    const defaultFirmName = localStorage.getItem('taxpro_firm_name') || 'TaxPro Advisory & Tax Associates';
    const defaultFirmTag = localStorage.getItem('taxpro_firm_tag') || 'TaxPro';
    const defaultFirmGst = localStorage.getItem('taxpro_firm_gst') || '24AAAAA0000A1Z5';
    const defaultFirmPan = localStorage.getItem('taxpro_firm_pan') || 'AAATF1234C';
    const defaultFirmEmail = localStorage.getItem('taxpro_firm_email') || 'contact@taxpro.in';
    const defaultFirmPhone = localStorage.getItem('taxpro_firm_phone') || '+91 98765 43210';
    const defaultFirmAddress = localStorage.getItem('taxpro_firm_address') || 'Silicon Square, Block 7, Financial District, Surat, Gujarat - 395007';

    let admins = 0;
    let managers = 0;
    let employees = 0;

    const firmMap = {};

    // Helper to calculate days remaining for subscription
    const computeSubscription = (firmId, defaultDays = 185) => {
      const storedExp = localStorage.getItem(`taxpro_sub_exp_${firmId}`);
      let expDate;
      if (storedExp) {
        expDate = new Date(storedExp);
      } else {
        const today = new Date();
        expDate = new Date(today.getTime() + defaultDays * 24 * 60 * 60 * 1000);
      }
      const today = new Date();
      const diffTime = expDate.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        expiryDate: expDate.toISOString().slice(0, 10),
        expiryFormatted: formatDate(expDate),
        daysLeft: Math.max(0, daysLeft),
        plan: 'Enterprise Cloud Practice (Annual Pro)',
        pctRemaining: Math.min(100, Math.max(5, Math.round((daysLeft / 365) * 100)))
      };
    };

    // 1. Initialize Default Primary Firm
    const primSub = computeSubscription('firm-primary', 240);
    firmMap[defaultFirmName] = {
      id: 'firm-primary',
      name: defaultFirmName,
      tag: defaultFirmTag,
      gst: defaultFirmGst,
      pan: defaultFirmPan,
      email: defaultFirmEmail,
      phone: defaultFirmPhone,
      address: defaultFirmAddress,
      isPrimary: true,
      subscriptionPlan: primSub.plan,
      subscriptionExpiry: primSub.expiryDate,
      subscriptionFormatted: primSub.expiryFormatted,
      daysLeft: primSub.daysLeft,
      subPct: primSub.pctRemaining,
      admins: [],
      managers: [],
      employees: [],
      allWorkers: []
    };

    // 2. Register any tenant firms from clients directory
    clients.forEach((c, idx) => {
      const cName = c.name || c.trade_name;
      if (cName && !firmMap[cName]) {
        const fId = `firm-${c.id || idx}`;
        const sub = computeSubscription(fId, 95 + (idx * 30));
        firmMap[cName] = {
          id: fId,
          name: cName,
          tag: c.trade_name || cName.split(' ')[0],
          gst: c.gst_no || c.gstin || '24AAACT1234F1Z1',
          pan: c.pan || 'AAACT1234F',
          email: c.email || 'finance@client.com',
          phone: c.phone || '+91 98765 00000',
          address: c.address || 'Commercial Hub, Financial Center',
          isPrimary: false,
          subscriptionPlan: sub.plan,
          subscriptionExpiry: sub.expiryDate,
          subscriptionFormatted: sub.expiryFormatted,
          daysLeft: sub.daysLeft,
          subPct: sub.pctRemaining,
          admins: [],
          managers: [],
          employees: [],
          allWorkers: []
        };
      }
    });

    // 3. Map all staff members to their respective firm
    members.forEach(m => {
      const roleStr = (m.role || 'Employee').toLowerCase();
      const isAdm = roleStr.includes('admin') || roleStr.includes('owner');
      const isMgr = !isAdm && roleStr.includes('manager');
      const isEmp = !isAdm && !isMgr;

      if (isAdm) admins++;
      else if (isMgr) managers++;
      else employees++;

      const fName = m.firm_name || m.firm || defaultFirmName;
      if (!firmMap[fName]) {
        const fId = `firm-${Math.random().toString(36).substr(2, 6)}`;
        const sub = computeSubscription(fId, 150);
        firmMap[fName] = {
          id: fId,
          name: fName,
          tag: fName.split(' ')[0],
          gst: '24AAACT1234F1Z1',
          pan: 'AAACT1234F',
          email: 'contact@' + fName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.in',
          phone: '+91 98765 43210',
          address: 'Financial Center, Business District',
          isPrimary: false,
          subscriptionPlan: sub.plan,
          subscriptionExpiry: sub.expiryDate,
          subscriptionFormatted: sub.expiryFormatted,
          daysLeft: sub.daysLeft,
          subPct: sub.pctRemaining,
          admins: [],
          managers: [],
          employees: [],
          allWorkers: []
        };
      }

      const fObj = firmMap[fName];
      fObj.allWorkers.push(m);
      if (isAdm) fObj.admins.push(m);
      else if (isMgr) fObj.managers.push(m);
      else fObj.employees.push(m);
    });

    const firmsArray = Object.values(firmMap);

    return {
      totalAdminsCount: admins,
      totalManagersCount: managers,
      totalEmployeesCount: employees,
      totalGlobalWorkforce: members.length,
      firmsList: firmsArray
    };
  }, [members, clients]);

  // Filtered workers for Level 2 Firm Roster
  const currentFirmWorkers = useMemo(() => {
    if (!selectedFirmForRoster) return [];
    
    const targetFirm = firmsList.find(f => f.name === selectedFirmForRoster.name) || selectedFirmForRoster;
    let list = targetFirm.allWorkers || [];

    if (workforceRoleFilter !== 'all') {
      list = list.filter(m => {
        const r = (m.role || 'Employee').toLowerCase();
        if (workforceRoleFilter === 'Admin') return r.includes('admin') || r.includes('owner');
        if (workforceRoleFilter === 'Manager') return r.includes('manager');
        if (workforceRoleFilter === 'Employee') return !r.includes('admin') && !r.includes('owner') && !r.includes('manager');
        return true;
      });
    }

    if (workforceDeptFilter !== 'all') {
      list = list.filter(m => (m.department || '').toLowerCase() === workforceDeptFilter.toLowerCase());
    }

    if (workforceStatusFilter !== 'all') {
      list = list.filter(m => (m.status || 'Active').toLowerCase() === workforceStatusFilter.toLowerCase());
    }

    if (workforceSearchQuery.trim()) {
      const q = workforceSearchQuery.toLowerCase();
      list = list.filter(m => 
        (m.name || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q) ||
        (m.phone || '').toLowerCase().includes(q) ||
        (m.role || '').toLowerCase().includes(q) ||
        (m.department || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [selectedFirmForRoster, firmsList, workforceRoleFilter, workforceDeptFilter, workforceStatusFilter, workforceSearchQuery]);

  const availableFirmDepartments = useMemo(() => {
    if (!selectedFirmForRoster) return [];
    const targetFirm = firmsList.find(f => f.name === selectedFirmForRoster.name) || selectedFirmForRoster;
    const depts = new Set((targetFirm.allWorkers || []).map(m => m.department).filter(Boolean));
    return Array.from(depts);
  }, [selectedFirmForRoster, firmsList]);

  const handleOpenFirmRoster = (firm, preFilterRole = 'all') => {
    setSelectedFirmForRoster(firm);
    setWorkforceRoleFilter(preFilterRole);
    setWorkforceSearchQuery('');
    setWorkforceDeptFilter('all');
    setWorkforceStatusFilter('all');
    setActiveTab('Firms & Workforce');
  };

  const handleOverviewWorkforceDrilldown = (roleType) => {
    setSelectedFirmForRoster(null);
    setWorkforceRoleFilter(roleType);
    setActiveTab('Firms & Workforce');
  };

  // ============================================================================
  // UNIFIED FINANCIAL REVENUE & EXPENSE ENGINE
  // ============================================================================
  const { 
    allTransactions, 
    allExpensesList,
    availableYears, 
    yearlyStatsMap, 
    currentSelectedYearStats, 
    currentMonthRealRevenue,
    currentYearRealRevenue,
    currentYearRealExpenses,
    currentMonthRealExpenses,
    filteredTransactions,
    filteredExpenses,
    filteredLatestPayments
  } = useMemo(() => {
    const list = [];
    const expensesOnly = [];

    const safeDate = (d) => {
      if (!d) return new Date();
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? new Date() : dt;
    };

    // 1. Process receipts_payments
    rawReceipts.forEach(r => {
      const dt = safeDate(r.date || r.created_at);
      const yr = String(dt.getFullYear());
      const mo = String(dt.getMonth() + 1).padStart(2, '0');
      const isOutflow = r.flow_type === 'Payment';
      const amt = Number(r.amount || 0);

      const item = {
        id: `RCP-${r.id}`,
        rawId: r.id,
        date: dt.toISOString().slice(0, 10),
        time: dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: dt.getTime(),
        year: yr,
        month: mo,
        client: r.client_name || r.name || (isOutflow ? 'Operating Vendor' : 'Client Collection'),
        type: isOutflow ? 'Operating Expense Payout' : 'Client Fee Collection',
        typeKey: isOutflow ? 'expense' : 'receipt',
        flowType: isOutflow ? 'OUTFLOW' : 'INFLOW',
        category: r.category || (isOutflow ? 'Operating Expenses' : 'General Practice'),
        amount: amt,
        isRevenue: !isOutflow,
        isExpense: isOutflow,
        mode: r.mode || 'Bank Transfer',
        refNo: r.ref_no || r.voucher_no || `RCP-${String(r.id).slice(-4)}`,
        status: 'Settled',
        remarks: r.remarks || '-'
      };

      list.push(item);
      if (isOutflow) expensesOnly.push(item);
    });

    // 2. Process fees
    rawFees.forEach(f => {
      const dt = safeDate(f.created_at || f.due_date);
      const yr = String(dt.getFullYear());
      const mo = String(dt.getMonth() + 1).padStart(2, '0');
      const amt = Number(f.amount || 0);
      const isPaid = f.status === 'Paid';

      list.push({
        id: `FEE-${f.id}`,
        rawId: f.id,
        date: dt.toISOString().slice(0, 10),
        time: dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: dt.getTime(),
        year: yr,
        month: mo,
        client: f.client_name || 'Client',
        type: 'Client Fee Invoice',
        typeKey: 'fee',
        flowType: 'INFLOW',
        category: f.service_name || f.category || 'Tax & Compliance',
        amount: amt,
        isRevenue: isPaid,
        isInvoiced: true,
        mode: isPaid ? 'Paid' : 'Pending',
        refNo: f.invoice_no || `INV-${String(f.id).slice(-4)}`,
        status: f.status || 'Pending',
        remarks: f.notes || f.remarks || '-'
      });
    });

    // 3. Process payments
    rawPayments.forEach(p => {
      const dt = safeDate(p.created_at || p.date);
      const yr = String(dt.getFullYear());
      const mo = String(dt.getMonth() + 1).padStart(2, '0');
      const amt = Number(p.amount || 0);

      const item = {
        id: `PAY-${p.id}`,
        rawId: p.id,
        date: dt.toISOString().slice(0, 10),
        time: dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: dt.getTime(),
        year: yr,
        month: mo,
        client: p.recipient || p.vendor || 'Operating Vendor',
        type: 'Firm Operating Expense',
        typeKey: 'expense',
        flowType: 'OUTFLOW',
        category: p.category || 'Office Rent & Utilities',
        amount: amt,
        isRevenue: false,
        isExpense: true,
        mode: p.method || 'Bank Transfer',
        refNo: p.ref_no || `EXP-${String(p.id).slice(-4)}`,
        status: 'Paid Out',
        remarks: p.notes || '-'
      };

      list.push(item);
      expensesOnly.push(item);
    });

    list.sort((a, b) => b.timestamp - a.timestamp);
    expensesOnly.sort((a, b) => b.timestamp - a.timestamp);

    const yearSet = new Set(list.map(t => t.year));
    const currY = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
      yearSet.add(String(currY - i));
    }
    const yearsArr = Array.from(yearSet).sort((a, b) => Number(b) - Number(a));

    const yStatsMap = {};
    yearsArr.forEach(y => {
      const monthsMap = {};
      MONTHS_LIST.forEach(m => {
        monthsMap[m.num] = {
          monthNum: m.num,
          shortName: m.short,
          fullName: m.name,
          revenue: 0,
          invoiced: 0,
          expenses: 0,
          netMargin: 0,
          count: 0,
          transactions: []
        };
      });

      yStatsMap[y] = {
        year: y,
        totalRevenue: 0,
        totalInvoiced: 0,
        totalExpenses: 0,
        netProfit: 0,
        txCount: 0,
        months: monthsMap,
        q1: 0, q2: 0, q3: 0, q4: 0,
        growthRate: 0
      };
    });

    list.forEach(tx => {
      const yObj = yStatsMap[tx.year];
      if (yObj && yObj.months[tx.month]) {
        const mObj = yObj.months[tx.month];
        mObj.count++;
        mObj.transactions.push(tx);
        yObj.txCount++;

        if (tx.isRevenue) {
          mObj.revenue += tx.amount;
          yObj.totalRevenue += tx.amount;

          const mNum = parseInt(tx.month, 10);
          if (mNum <= 3) yObj.q1 += tx.amount;
          else if (mNum <= 6) yObj.q2 += tx.amount;
          else if (mNum <= 9) yObj.q3 += tx.amount;
          else yObj.q4 += tx.amount;
        }

        if (tx.isInvoiced) {
          mObj.invoiced += tx.amount;
          yObj.totalInvoiced += tx.amount;
        }

        if (tx.isExpense) {
          mObj.expenses += tx.amount;
          yObj.totalExpenses += tx.amount;
        }

        mObj.netMargin = mObj.revenue - mObj.expenses;
        yObj.netProfit = yObj.totalRevenue - yObj.totalExpenses;
      }
    });

    yearsArr.forEach(y => {
      const prevYearStr = String(Number(y) - 1);
      const curRev = yStatsMap[y].totalRevenue;
      const prevRev = yStatsMap[prevYearStr] ? yStatsMap[prevYearStr].totalRevenue : 0;
      if (prevRev > 0) {
        yStatsMap[y].growthRate = Math.round(((curRev - prevRev) / prevRev) * 100);
      } else {
        yStatsMap[y].growthRate = curRev > 0 ? 100 : 0;
      }
    });

    const selYearStats = yStatsMap[selectedRevYear] || {
      year: selectedRevYear,
      totalRevenue: 0,
      totalInvoiced: 0,
      totalExpenses: 0,
      netProfit: 0,
      txCount: 0,
      months: {},
      q1: 0, q2: 0, q3: 0, q4: 0, growthRate: 0
    };

    const curYearObj = yStatsMap[currentSystemYear];
    const curMonthObj = curYearObj?.months[currentSystemMonth];

    const curMonthRev = curMonthObj ? curMonthObj.revenue : 0;
    const curYearRev = curYearObj ? curYearObj.totalRevenue : 0;
    const curMonthExp = curMonthObj ? curMonthObj.expenses : 0;
    const curYearExp = curYearObj ? curYearObj.totalExpenses : 0;

    const filtered = list.filter(t => {
      if (t.year !== selectedRevYear) return false;
      if (selectedRevMonth !== 'all' && t.month !== selectedRevMonth) return false;
      if (revFilterType !== 'all' && t.typeKey !== revFilterType) return false;
      if (revSearchQuery.trim()) {
        const q = revSearchQuery.toLowerCase();
        return (
          t.client.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.refNo.toLowerCase().includes(q) ||
          t.mode.toLowerCase().includes(q) ||
          t.type.toLowerCase().includes(q) ||
          String(t.amount).includes(q)
        );
      }
      return true;
    });

    const filteredExp = expensesOnly.filter(e => {
      if (e.year !== selectedRevYear) return false;
      if (selectedRevMonth !== 'all' && e.month !== selectedRevMonth) return false;
      if (expenseFilterCategory !== 'all' && !e.category.toLowerCase().includes(expenseFilterCategory.toLowerCase())) return false;
      if (expenseSearchQuery.trim()) {
        const q = expenseSearchQuery.toLowerCase();
        return (
          e.client.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.remarks.toLowerCase().includes(q) ||
          e.refNo.toLowerCase().includes(q) ||
          String(e.amount).includes(q)
        );
      }
      return true;
    });

    const latestFiltered = list.filter(t => {
      if (paymentFilterFlow === 'receipt' && !t.isRevenue) return false;
      if (paymentFilterFlow === 'expense' && !t.isExpense) return false;
      if (paymentSearchQuery.trim()) {
        const q = paymentSearchQuery.toLowerCase();
        return (
          t.client.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.refNo.toLowerCase().includes(q) ||
          t.mode.toLowerCase().includes(q) ||
          String(t.amount).includes(q)
        );
      }
      return true;
    });

    return {
      allTransactions: list,
      allExpensesList: expensesOnly,
      availableYears: yearsArr,
      yearlyStatsMap: yStatsMap,
      currentSelectedYearStats: selYearStats,
      currentMonthRealRevenue: curMonthRev,
      currentYearRealRevenue: curYearRev,
      currentMonthRealExpenses: curMonthExp,
      currentYearRealExpenses: curYearExp,
      filteredTransactions: filtered,
      filteredExpenses: filteredExp,
      filteredLatestPayments: latestFiltered
    };
  }, [rawReceipts, rawFees, rawPayments, selectedRevYear, selectedRevMonth, revFilterType, revSearchQuery, expenseFilterCategory, expenseSearchQuery, paymentFilterFlow, paymentSearchQuery]);

  const activeMonthData = selectedRevMonth !== 'all' && currentSelectedYearStats.months
    ? currentSelectedYearStats.months[selectedRevMonth]
    : null;

  const maxMonthRevInYear = useMemo(() => {
    let max = 0;
    if (currentSelectedYearStats.months) {
      Object.values(currentSelectedYearStats.months).forEach(m => {
        if (m.revenue > max) max = m.revenue;
      });
    }
    return max;
  }, [currentSelectedYearStats]);

  // ============================================================================
  // CALENDAR DAYS & DAILY CASHFLOW (IN / OUT MONEY) COMPUTATION
  // ============================================================================
  const calendarMonthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayIndex = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days = [];
    for (let i = 0; i < startDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNum: d, dateStr });
    }
    return days;
  }, [currentDate]);

  // Aggregated Inflow & Outflow Money by Date
  const dailyCashflowMap = useMemo(() => {
    const map = {};
    allTransactions.forEach(t => {
      if (!t.date) return;
      if (!map[t.date]) {
        map[t.date] = {
          date: t.date,
          inMoney: 0,
          outMoney: 0,
          count: 0,
          transactions: []
        };
      }
      map[t.date].count++;
      map[t.date].transactions.push(t);
      if (t.isRevenue) {
        map[t.date].inMoney += t.amount;
      }
      if (t.isExpense) {
        map[t.date].outMoney += t.amount;
      }
    });
    return map;
  }, [allTransactions]);

  // Specific Selected Day's In and Out Money
  const selectedDayCashflow = useMemo(() => {
    const data = dailyCashflowMap[selectedCalendarDate];
    return data || {
      date: selectedCalendarDate,
      inMoney: 0,
      outMoney: 0,
      count: 0,
      transactions: []
    };
  }, [dailyCashflowMap, selectedCalendarDate]);

  // Members active on selected calendar date
  const selectedDateAttendance = useMemo(() => {
    return members.map(m => {
      const att = attendanceRecords.find(r => 
        (r.employee_name === m.name || r.name === m.name || r.member_id === m.id) &&
        r.date === selectedCalendarDate
      );
      return {
        member: m,
        attendance: att,
        isLogged: !!att,
        inTime: att?.in_time || att?.logged_at || '-',
        outTime: att?.out_time || '-',
        status: att?.status || 'Offline / Not Logged'
      };
    });
  }, [members, attendanceRecords, selectedCalendarDate]);

  // Print Daily Audited Cashflow Statement
  const handlePrintDailyCashflow = () => {
    const formattedDate = formatDateWithWeekday(selectedCalendarDate);
    const printDate = formatDateTime(new Date());
    const firmName = localStorage.getItem('taxpro_firm_name') || 'TaxPro Advisory & Tax Associates';
    const firmGst = localStorage.getItem('taxpro_firm_gst') || '24AAAAA0000A1Z5';
    const firmPan = localStorage.getItem('taxpro_firm_pan') || 'AAATF1234C';

    const printWindow = window.open('', '_blank', 'width=950,height=850');
    if (!printWindow) {
      window.print();
      return;
    }

    const txRows = selectedDayCashflow.transactions.length > 0
      ? selectedDayCashflow.transactions.map((tx, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 8px 10px; text-align: center; font-family: monospace; color: #64748b;">${idx + 1}</td>
          <td style="padding: 8px 10px; font-weight: 700; color: ${tx.type === 'IN' ? '#059669' : '#dc2626'};">${tx.type === 'IN' ? 'INFLOW (Receipt)' : 'OUTFLOW (Expense)'}</td>
          <td style="padding: 8px 10px; font-weight: 600; color: #0f172a;">${tx.party || tx.client || 'General'}</td>
          <td style="padding: 8px 10px; color: #475569;">${tx.category || tx.type || 'Practice'}</td>
          <td style="padding: 8px 10px; font-family: monospace; color: #334155;">${tx.mode || 'Direct'}</td>
          <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: 700; color: ${tx.type === 'IN' ? '#059669' : '#dc2626'};">
            ${tx.type === 'IN' ? '+' : '-'}₹${Number(tx.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </td>
        </tr>
      `).join('')
      : `<tr><td colspan="6" style="padding: 16px; text-align: center; color: #94a3b8; font-style: italic; font-size: 12px;">No audited cashflow transactions recorded on ${selectedCalendarDate}.</td></tr>`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Audited Daily Cashflow Statement - ${selectedCalendarDate}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 12mm 15mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; background: #fff; line-height: 1.4; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-start; }
          .firm-title { font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin: 0 0 2px 0; }
          .doc-sub { font-size: 11px; font-weight: 700; color: #7c3aed; text-transform: uppercase; }
          .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
          .kpi-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; }
          .kpi-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
          .kpi-val { font-size: 16px; font-weight: 900; font-family: monospace; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #cbd5e1; }
          th { background: #f1f5f9; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #334155; padding: 8px 10px; border-bottom: 1px solid #cbd5e1; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="firm-title">${firmName}</div>
            <div class="doc-sub">SuperAdmin Master Financial & Daily Cashflow Statement</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 4px;">GSTIN: ${firmGst} | PAN: ${firmPan}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 12px; font-weight: 800; color: #0f172a; font-family: monospace;">AUDIT DATE</div>
            <div style="font-size: 13px; font-weight: 900; color: #7c3aed;">${formattedDate}</div>
            <div style="font-size: 9px; color: #64748b; margin-top: 4px; font-family: monospace;">Generated: ${printDate}</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-box">
            <div class="kpi-label">Total Inflow (Collections)</div>
            <div class="kpi-val" style="color: #059669;">+₹${selectedDayCashflow.inMoney.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Total Outflow (Disbursements)</div>
            <div class="kpi-val" style="color: #dc2626;">-₹${selectedDayCashflow.outMoney.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Net Day Margin Balance</div>
            <div class="kpi-val" style="color: ${selectedDayCashflow.netMoney >= 0 ? '#0f172a' : '#dc2626'};">₹${selectedDayCashflow.netMoney.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <div style="font-size: 12px; font-weight: 900; color: #0f172a; text-transform: uppercase; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 4px; margin: 20px 0 10px 0;">
          Verified Day Transactions (${selectedDayCashflow.count} Records)
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th style="width: 120px; text-align: left;">Cashflow Flow</th>
              <th style="text-align: left;">Party / Client</th>
              <th style="text-align: left;">Category</th>
              <th style="width: 90px; text-align: left;">Mode</th>
              <th style="width: 110px; text-align: right;">Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            ${txRows}
          </tbody>
        </table>

        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 300); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // New Users List (Sorted by newest first)
  const newUsersList = useMemo(() => {
    let localUsersArr = [];
    try {
      localUsersArr = JSON.parse(localStorage.getItem('taxpro_local_users') || '[]');
    } catch (e) {}

    const userMap = new Map();

    // 1. Add members
    members.forEach(m => {
      if (m.email) {
        userMap.set(m.email.toLowerCase(), {
          id: m.id,
          name: m.name,
          email: m.email,
          role: m.role || 'Employee',
          department: m.department || 'General',
          firm_name: m.firm_name || m.company || 'TaxPro Advisory & Tax Associates',
          status: m.status || 'Active',
          created_at: m.created_at || new Date().toISOString()
        });
      }
    });

    // 2. Merge registered users from users table
    registeredUsers.forEach(u => {
      if (u.email) {
        const cleanE = u.email.toLowerCase();
        const existing = userMap.get(cleanE) || {};
        userMap.set(cleanE, {
          id: u.id || existing.id,
          name: u.name || existing.name || u.email.split('@')[0],
          email: u.email,
          role: u.role || existing.role || 'Administrator',
          department: u.department || existing.department || 'Executive Management',
          firm_name: u.company || existing.firm_name || 'TaxPro Enterprise Client',
          status: existing.status || 'Active',
          created_at: u.created_at || existing.created_at || new Date().toISOString()
        });
      }
    });

    // 3. Merge local registered users
    localUsersArr.forEach(lu => {
      if (lu.email) {
        const cleanE = lu.email.toLowerCase();
        const existing = userMap.get(cleanE) || {};
        userMap.set(cleanE, {
          id: lu.id || existing.id,
          name: lu.name || existing.name || lu.email.split('@')[0],
          email: lu.email,
          role: lu.role || existing.role || 'Administrator',
          department: lu.department || existing.department || 'Executive Management',
          firm_name: lu.company || existing.firm_name || 'TaxPro Enterprise Client',
          status: existing.status || 'Active',
          created_at: lu.created_at || existing.created_at || new Date().toISOString()
        });
      }
    });

    let list = Array.from(userMap.values());
    list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    if (newUsersRoleFilter !== 'all') {
      list = list.filter(m => {
        const r = (m.role || 'Employee').toLowerCase();
        if (newUsersRoleFilter === 'Admin') return r.includes('admin') || r.includes('owner');
        if (newUsersRoleFilter === 'Manager') return r.includes('manager');
        if (newUsersRoleFilter === 'Employee') return !r.includes('admin') && !r.includes('owner') && !r.includes('manager');
        return true;
      });
    }
    if (newUsersSearchQuery.trim()) {
      const q = newUsersSearchQuery.toLowerCase();
      list = list.filter(m => 
        (m.name || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q) ||
        (m.firm_name || '').toLowerCase().includes(q) ||
        (m.department || '').toLowerCase().includes(q) ||
        (m.role || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [members, registeredUsers, newUsersRoleFilter, newUsersSearchQuery]);

  // Export Specific Firm Roster to CSV
  const handleExportFirmCSV = (firm) => {
    const workers = firm.allWorkers || [];
    if (workers.length === 0) {
      if (onShowToast) onShowToast('No staff records to export.', 'warning');
      return;
    }

    const headers = ["ID", "Name", "Role", "Department", "Firm", "Subscription Days Left", "Email", "Phone", "Status", "Joined Date"];
    const rows = [headers.join(',')];

    workers.forEach(w => {
      rows.push([
        `"${w.id}"`,
        `"${(w.name || '').replace(/"/g, '""')}"`,
        `"${w.role || 'Employee'}"`,
        `"${(w.department || '').replace(/"/g, '""')}"`,
        `"${(firm.name || '').replace(/"/g, '""')}"`,
        `"${firm.daysLeft} Days"`,
        `"${w.email || ''}"`,
        `"${w.phone || ''}"`,
        `"${w.status || 'Active'}"`,
        `"${w.created_at ? formatDate(w.created_at) : '-'}"`
      ].join(','));
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taxpro_firm_workers_${firm.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    if (onShowToast) onShowToast(`✓ Exported ${workers.length} staff records for ${firm.name} to CSV!`, 'success');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 selection:bg-purple-500/30 selection:text-white font-sans flex overflow-hidden">
      
      {/* Super Admin Sidebar */}
      <aside className="w-72 bg-[#09090b] border-r border-white/5 flex flex-col pt-6 pb-6 relative z-20">
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Globe2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-xl text-white tracking-tight leading-none font-outfit">SaaS Master</h1>
            <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-1">Super Admin Core</p>
          </div>
        </div>

        {/* Navigation Menu (Tenants & Infrastructure removed, Latest Payments & Calendar added) */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {[
            { id: 'Overview', icon: <Activity className="w-4 h-4" /> },
            { id: 'Firms & Workforce', icon: <Building2 className="w-4 h-4" /> },
            { id: 'Calendar & In/Out', icon: <CalendarIcon className="w-4 h-4" /> },
            { id: 'Latest Payments', icon: <CreditCard className="w-4 h-4" /> },
            { id: 'Operating Expenses', icon: <Coins className="w-4 h-4" /> },
            { id: 'Revenue & Billing', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'Security Logs', icon: <ShieldAlert className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'Firms & Workforce') {
                  setSelectedFirmForRoster(null);
                  setWorkforceRoleFilter('all');
                }
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === tab.id 
                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-inner' 
                : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
              }`}
            >
              {tab.icon} {tab.id}
            </button>
          ))}
        </nav>

        <div className="px-6 pt-4 border-t border-white/5">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Logout Core
          </button>
        </div>
      </aside>

      {/* Main SaaS Content Area */}
      <main className="flex-1 overflow-y-auto relative h-screen custom-scrollbar">
        
        {/* Topbar */}
        <header className="h-20 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl sticky top-0 z-20 flex items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white tracking-tight">{activeTab}</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-extrabold uppercase tracking-wider font-mono">
              Root Authority
            </span>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4">
            


            {/* Record Expense Button */}
            <button
              type="button"
              onClick={() => setIsAddExpenseModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border border-red-400/30"
              title="Add Operating Expense for Rent, WiFi, Domains, Servers..."
            >
              <Plus className="w-4 h-4" />
              <span>+ Record Expense</span>
            </button>

            <button onClick={() => fetchGlobalStats()} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-white/5 cursor-pointer" title="Refresh Live Data">
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          
          {/* ========================================================================= */}
          {/* TAB 1: OVERVIEW */}
          {/* ========================================================================= */}
          {activeTab === 'Overview' && (
            <>
              {/* TOP METRICS ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 animate-fade-in">
                
                {/* 1. Total Admins Card */}
                <div 
                  onClick={() => handleOverviewWorkforceDrilldown('Admin')}
                  className="bg-[#09090b] border border-indigo-500/20 hover:border-indigo-500/50 rounded-2xl p-4 shadow-xl cursor-pointer group transition-all hover:-translate-y-1 select-none"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-400 mb-2">
                    <span className="truncate">Total Admins</span>
                    <span className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400">👑</span>
                  </div>
                  <div className="text-2xl font-black text-white font-mono tracking-tight group-hover:text-indigo-300 transition-colors">
                    {totalAdminsCount}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1 font-bold flex items-center justify-between">
                    <span>Tenants / Owners</span>
                    <span className="text-indigo-400 group-hover:translate-x-0.5 transition-transform">Inspect →</span>
                  </div>
                </div>

                {/* 2. Total Managers Card */}
                <div 
                  onClick={() => handleOverviewWorkforceDrilldown('Manager')}
                  className="bg-[#09090b] border border-purple-500/20 hover:border-purple-500/50 rounded-2xl p-4 shadow-xl cursor-pointer group transition-all hover:-translate-y-1 select-none"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-purple-400 mb-2">
                    <span className="truncate">Total Managers</span>
                    <span className="p-1 rounded-lg bg-purple-500/10 text-purple-400">💼</span>
                  </div>
                  <div className="text-2xl font-black text-white font-mono tracking-tight group-hover:text-purple-300 transition-colors">
                    {totalManagersCount}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1 font-bold flex items-center justify-between">
                    <span>Supervisors</span>
                    <span className="text-purple-400 group-hover:translate-x-0.5 transition-transform">Inspect →</span>
                  </div>
                </div>

                {/* 3. Total Employees Card */}
                <div 
                  onClick={() => handleOverviewWorkforceDrilldown('Employee')}
                  className="bg-[#09090b] border border-emerald-500/20 hover:border-emerald-500/50 rounded-2xl p-4 shadow-xl cursor-pointer group transition-all hover:-translate-y-1 select-none"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-400 mb-2">
                    <span className="truncate">Total Employees</span>
                    <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">👤</span>
                  </div>
                  <div className="text-2xl font-black text-white font-mono tracking-tight group-hover:text-emerald-300 transition-colors">
                    {totalEmployeesCount}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1 font-bold flex items-center justify-between">
                    <span>Staff Personnel</span>
                    <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform">Inspect →</span>
                  </div>
                </div>

                {/* 4. Total Registered Firms / Companies */}
                <div 
                  onClick={() => {
                    setSelectedFirmForRoster(null);
                    setWorkforceRoleFilter('all');
                    setActiveTab('Firms & Workforce');
                  }}
                  className="bg-[#09090b] border border-teal-500/20 hover:border-teal-500/50 rounded-2xl p-4 shadow-xl cursor-pointer group transition-all hover:-translate-y-1 select-none"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-teal-400 mb-2">
                    <span className="truncate">Active Firms</span>
                    <Building2 className="w-4 h-4 text-teal-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono tracking-tight group-hover:text-teal-300 transition-colors">
                    {firmsList.length}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1 font-bold flex items-center justify-between">
                    <span>Companies</span>
                    <span className="text-teal-400 group-hover:translate-x-0.5 transition-transform">View Roster →</span>
                  </div>
                </div>

                {/* 5. Monthly Revenue Card */}
                <div 
                  onClick={() => setActiveTab('Revenue & Billing')}
                  className="bg-[#09090b] border border-purple-500/20 hover:border-purple-500/50 rounded-2xl p-4 shadow-xl cursor-pointer group transition-all hover:-translate-y-1 select-none"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-purple-400 mb-2">
                    <span className="truncate">Revenue ({MONTHS_LIST.find(m => m.num === currentSystemMonth)?.short})</span>
                    <CreditCard className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-xl font-black text-white font-mono tracking-tight truncate group-hover:text-purple-300 transition-colors">
                    ₹{currentMonthRealRevenue.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1 font-bold flex items-center justify-between">
                    <span>Real Collections</span>
                    <span className="text-purple-400">Audit →</span>
                  </div>
                </div>

                {/* 6. Operating Expenses Card */}
                <div 
                  onClick={() => setActiveTab('Operating Expenses')}
                  className="bg-[#09090b] border border-red-500/20 hover:border-red-500/50 rounded-2xl p-4 shadow-xl cursor-pointer group transition-all hover:-translate-y-1 select-none"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-red-400 mb-2">
                    <span className="truncate">Expenses ({MONTHS_LIST.find(m => m.num === currentSystemMonth)?.short})</span>
                    <Coins className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="text-xl font-black text-white font-mono tracking-tight truncate group-hover:text-red-300 transition-colors">
                    ₹{currentMonthRealExpenses.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-red-400 mt-1 font-bold flex items-center justify-between">
                    <span>Rent, WiFi, Domain</span>
                    <span>Manage →</span>
                  </div>
                </div>

              </div>

              {/* Real-time Revenue & Billing Summary Widget */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                <div className="xl:col-span-2 space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-purple-400" /> Real-time Revenue Ledger & Collections
                    </h3>
                    <button 
                      onClick={() => setActiveTab('Revenue & Billing')} 
                      className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>Explore Multi-Year History</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="bg-[#09090b] border border-white/5 rounded-3xl p-6 shadow-2xl space-y-6">
                    <div className="flex items-end justify-between gap-2 h-36 pt-4 px-2">
                      {MONTHS_LIST.map(m => {
                        const mData = currentSelectedYearStats.months?.[m.num];
                        const rev = mData ? mData.revenue : 0;
                        const heightPct = maxMonthRevInYear > 0 ? Math.max(8, Math.round((rev / maxMonthRevInYear) * 100)) : 8;
                        const isCurMonth = m.num === currentSystemMonth && selectedRevYear === currentSystemYear;

                        return (
                          <div 
                            key={m.num} 
                            onClick={() => {
                              setSelectedRevMonth(m.num);
                              setActiveTab('Revenue & Billing');
                            }}
                            className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"
                            title={`${m.name} ${selectedRevYear}: ₹${rev.toLocaleString('en-IN')} (${mData?.count || 0} tx)`}
                          >
                            <div className="text-[9px] font-mono text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold truncate">
                              ₹{rev > 1000 ? `${Math.round(rev/1000)}k` : rev}
                            </div>
                            <div className="w-full max-w-[28px] bg-white/5 rounded-t-lg relative flex items-end overflow-hidden h-24">
                              <div 
                                className={`w-full rounded-t-lg transition-all duration-500 ${
                                  isCurMonth 
                                    ? 'bg-gradient-to-t from-purple-600 to-indigo-400 shadow-md shadow-purple-500/30' 
                                    : rev > 0 ? 'bg-gradient-to-t from-purple-900/60 to-purple-500/80 group-hover:from-purple-600 group-hover:to-purple-400' : 'bg-white/5'
                                }`} 
                                style={{ height: `${heightPct}%` }} 
                              />
                            </div>
                            <span className={`text-[10px] font-mono font-bold ${isCurMonth ? 'text-purple-400 font-extrabold' : 'text-gray-500'}`}>
                              {m.short}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-4 text-xs text-gray-400">
                      <div className="flex items-center gap-4">
                        <span>Annual Collections: <strong className="text-white font-mono">₹{currentYearRealRevenue.toLocaleString('en-IN')}</strong></span>
                        <span>•</span>
                        <span>Annual Expenses: <strong className="text-red-400 font-mono">₹{currentYearRealExpenses.toLocaleString('en-IN')}</strong></span>
                      </div>
                      <button 
                        onClick={() => setActiveTab('Revenue & Billing')}
                        className="px-3 py-1.5 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl font-bold transition-all text-xs cursor-pointer"
                      >
                        Deep Audit View
                      </button>
                    </div>
                  </div>
                </div>

                {/* Global Security & Activity Feed */}
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <ServerCrash className="w-5 h-5 text-indigo-400" /> Platform Feed
                    </h3>
                  </div>
                  
                  <div className="bg-[#09090b] border border-white/5 rounded-3xl p-6 h-full shadow-2xl relative overflow-hidden flex flex-col justify-between">
                    <div className="space-y-4 relative z-10">
                      {systemLogs.slice(0, 5).map((log, idx) => (
                        <div key={log.id || idx} className="flex gap-3">
                          <div className="relative flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full mt-1 shadow-lg bg-emerald-400 shadow-emerald-500/50" />
                          </div>
                          <div className="flex-1 pb-1">
                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                              {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-xs font-medium text-gray-300 leading-snug">{log.details || log.action}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: FIRMS & WORKFORCE (WITH SUBSCRIPTION DAYS REMAINING TRACKER) */}
          {/* ========================================================================= */}
          {activeTab === 'Firms & Workforce' && (
            <div className="space-y-6 animate-fade-in">
              
              {!selectedFirmForRoster && (
                <div className="space-y-6">
                  
                  <div className="bg-gradient-to-r from-indigo-950 via-[#0d1024] to-purple-950 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2 mb-1 font-mono">
                        <Building2 className="w-4 h-4" />
                        Multi-Tenant Enterprise Hierarchy & Licensing
                      </div>
                      <h2 className="text-2xl font-black text-white font-outfit tracking-tight">
                        Registered Firms, Companies & Subscription Tracker
                      </h2>
                      <p className="text-xs text-gray-400 mt-1 max-w-xl">
                        Monitor organizational headcounts and real-time days remaining on SaaS subscriptions. Click any firm to inspect staff personnel or extend subscription validity.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                        <div className="text-xl font-black text-indigo-400 font-mono">{totalAdminsCount}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Admins</div>
                      </div>
                      <div className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                        <div className="text-xl font-black text-purple-400 font-mono">{totalManagersCount}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Managers</div>
                      </div>
                      <div className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                        <div className="text-xl font-black text-emerald-400 font-mono">{totalEmployeesCount}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Employees</div>
                      </div>
                      <div className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                        <div className="text-xl font-black text-white font-mono">{totalGlobalWorkforce}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Total Staff</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#09090b] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
                      {[
                        { id: 'all', label: 'All Firms & Roles', count: firmsList.length },
                        { id: 'Admin', label: '👑 Admins Only', count: totalAdminsCount },
                        { id: 'Manager', label: '💼 Managers Only', count: totalManagersCount },
                        { id: 'Employee', label: '👤 Employees Only', count: totalEmployeesCount },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setWorkforceRoleFilter(tab.id)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                            workforceRoleFilter === tab.id
                              ? 'bg-purple-600 text-white shadow-md'
                              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                            workforceRoleFilter === tab.id ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-500'
                          }`}>
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={workforceSearchQuery}
                        onChange={(e) => setWorkforceSearchQuery(e.target.value)}
                        placeholder="Search by Firm, GSTIN, city..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {/* Grid of Firms with Days Remaining Tracker */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {firmsList
                      .filter(f => {
                        if (workforceRoleFilter === 'Admin' && f.admins.length === 0) return false;
                        if (workforceRoleFilter === 'Manager' && f.managers.length === 0) return false;
                        if (workforceRoleFilter === 'Employee' && f.employees.length === 0) return false;
                        if (workforceSearchQuery.trim()) {
                          const q = workforceSearchQuery.toLowerCase();
                          return (
                            f.name.toLowerCase().includes(q) ||
                            (f.tag || '').toLowerCase().includes(q) ||
                            (f.gst || '').toLowerCase().includes(q) ||
                            (f.address || '').toLowerCase().includes(q) ||
                            (f.email || '').toLowerCase().includes(q)
                          );
                        }
                        return true;
                      })
                      .map((firm) => (
                        <div
                          key={firm.id}
                          className="bg-[#09090b] border border-white/10 hover:border-purple-500/50 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 transition-all flex flex-col justify-between gap-5 relative overflow-hidden"
                        >
                          <div>
                            {/* Top Header & Subscription Days Left Pill */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
                                  <Building2 className="w-6 h-6" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-base font-black text-white font-outfit">
                                      {firm.name}
                                    </h3>
                                    {firm.isPrimary && (
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider">
                                        Primary HQ
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-black font-mono">
                                      🏢 {firm.tag || 'TaxPro'}
                                    </span>
                                    <span className="text-xs text-gray-500 font-mono">
                                      GSTIN: {firm.gst}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Subscription Days Left Badge */}
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono inline-flex items-center gap-1.5 border shadow-sm ${
                                  firm.daysLeft > 60
                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                    : firm.daysLeft > 15
                                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                    : 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                                }`}>
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>⏳ {firm.daysLeft} Days Left</span>
                                </span>
                                <span className="text-[10px] text-gray-500 font-mono">
                                  Expires: {firm.subscriptionFormatted}
                                </span>
                              </div>
                            </div>

                            {/* Subscription Lifecycle Progress Bar */}
                            <div className="my-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold">
                                <span>{firm.subscriptionPlan}</span>
                                <span className="text-purple-400 font-mono">{firm.daysLeft} of 365 Days remaining</span>
                              </div>
                              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    firm.daysLeft > 60 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : firm.daysLeft > 15 ? 'bg-amber-400' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${firm.subPct}%` }}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-400 pt-2 border-t border-white/5 font-medium">
                              <div className="flex items-center gap-2 truncate">
                                <Mail className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                                <span className="truncate">{firm.email}</span>
                              </div>
                              <div className="flex items-center gap-2 truncate">
                                <Phone className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                                <span>{firm.phone}</span>
                              </div>
                            </div>
                          </div>

                          {/* Footer Actions */}
                          <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-gray-400">👑 {firm.admins.length}</span>
                              <span className="text-gray-400">💼 {firm.managers.length}</span>
                              <span className="text-gray-400">👤 {firm.employees.length}</span>
                              <strong className="text-white font-mono">{firm.allWorkers.length} Total</strong>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenSubModal(firm)}
                                className="px-2.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Grant Plan or Extend Days to this firm"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                <span>Extend / Give Sub</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenFirmRoster(firm, workforceRoleFilter)}
                                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <span>Open Roster</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                        </div>
                      ))}
                  </div>

                </div>
              )}

              {selectedFirmForRoster && (
                <div className="space-y-6 animate-fade-in">
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedFirmForRoster(null)}
                        className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to All Firms & Companies</span>
                      </button>

                      <div className="text-xs text-gray-500 font-mono hidden md:block">
                        Super Admin <span className="text-gray-600">/</span> Firms & Workforce <span className="text-gray-600">/</span> <strong className="text-purple-400">{selectedFirmForRoster.name}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => onSwitchToPMS && onSwitchToPMS('Team Members')}
                        className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border border-emerald-400/40"
                        title="Open Practice Workspace and Add New Member"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>+ Add New Member</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenSubModal(selectedFirmForRoster)}
                        className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border border-purple-400/40"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Manage / Extend Subscription</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportFirmCSV(selectedFirmForRoster)}
                        className="px-3.5 py-2 bg-white/5 hover:bg-purple-500/10 text-gray-300 hover:text-purple-300 border border-white/10 hover:border-purple-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-purple-400" />
                        <span>Export CSV</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#09090b] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0">
                        <Building2 className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="text-2xl font-black text-white font-outfit">
                            {selectedFirmForRoster.name}
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-black">
                            🏢 {selectedFirmForRoster.tag || 'TaxPro'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 max-w-xl">
                          Official Headquarters: {selectedFirmForRoster.address}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-2 font-mono flex-wrap">
                          <span>GSTIN: <strong className="text-gray-300">{selectedFirmForRoster.gst}</strong></span>
                          <span>•</span>
                          <span>PAN: <strong className="text-gray-300">{selectedFirmForRoster.pan}</strong></span>
                          <span>•</span>
                          <span>Subscription: <strong className="text-emerald-400 font-bold">⏳ {selectedFirmForRoster.daysLeft} Days Left</strong> (Expires {selectedFirmForRoster.subscriptionFormatted})</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-6">
                      <div className="px-4 py-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                        <div className="text-lg font-black text-indigo-400 font-mono">{selectedFirmForRoster.admins.length}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Admins</div>
                      </div>
                      <div className="px-4 py-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center">
                        <div className="text-lg font-black text-purple-400 font-mono">{selectedFirmForRoster.managers.length}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Managers</div>
                      </div>
                      <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                        <div className="text-lg font-black text-emerald-400 font-mono">{selectedFirmForRoster.employees.length}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Employees</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#09090b] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 custom-scrollbar">
                      {[
                        { id: 'all', label: 'All Workers', count: selectedFirmForRoster.allWorkers.length },
                        { id: 'Admin', label: '👑 Admins', count: selectedFirmForRoster.admins.length },
                        { id: 'Manager', label: '💼 Managers', count: selectedFirmForRoster.managers.length },
                        { id: 'Employee', label: '👤 Employees', count: selectedFirmForRoster.employees.length },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setWorkforceRoleFilter(tab.id)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                            workforceRoleFilter === tab.id
                              ? 'bg-purple-600 text-white shadow-md'
                              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                            workforceRoleFilter === tab.id ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-500'
                          }`}>
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                      {availableFirmDepartments.length > 0 && (
                        <select
                          value={workforceDeptFilter}
                          onChange={(e) => setWorkforceDeptFilter(e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-300 font-semibold focus:outline-none focus:border-purple-500 cursor-pointer"
                        >
                          <option value="all" className="bg-gray-900 text-white">All Departments</option>
                          {availableFirmDepartments.map(d => (
                            <option key={d} value={d} className="bg-gray-900 text-white">{d}</option>
                          ))}
                        </select>
                      )}

                      <div className="relative flex-1 sm:w-60">
                        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={workforceSearchQuery}
                          onChange={(e) => setWorkforceSearchQuery(e.target.value)}
                          placeholder="Search worker by name, email..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#09090b] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 text-[10px] font-black text-gray-400 uppercase tracking-wider bg-white/[0.02]">
                            <th className="px-6 py-4">Staff Member</th>
                            <th className="px-6 py-4">Role & Tag</th>
                            <th className="px-6 py-4">Department</th>
                            <th className="px-6 py-4">Contact Info</th>
                            <th className="px-6 py-4">Permissions Coverage</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Joined Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs">
                          {currentFirmWorkers.map((w, idx) => {
                            const roleStr = (w.role || 'Employee').toLowerCase();
                            const isAdm = roleStr.includes('admin') || roleStr.includes('owner');
                            const isMgr = !isAdm && roleStr.includes('manager');
                            const isRevoked = w.status === 'Access Revoked';

                            let activeMods = 16;
                            if (w.permissions && typeof w.permissions === 'object') {
                              activeMods = Object.values(w.permissions).filter(v => v === true).length;
                            } else if (isAdm) {
                              activeMods = 16;
                            } else if (isMgr) {
                              activeMods = 12;
                            } else {
                              activeMods = 8;
                            }
                            const pct = Math.round((activeMods / 16) * 100);

                            return (
                              <tr key={w.id || idx} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 ${
                                      isAdm ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                                      isMgr ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                                      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    }`}>
                                      {w.name ? w.name.charAt(0).toUpperCase() : w.email.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="truncate">
                                      <div className="font-bold text-white text-sm truncate">{w.name || 'Staff Member'}</div>
                                      <div className="text-[11px] text-gray-500 font-mono truncate">{w.email}</div>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-1 items-start">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono uppercase tracking-wider ${
                                      isAdm ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                                      isMgr ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                                      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    }`}>
                                      {isAdm ? '👑 Admin' : isMgr ? '💼 Manager' : '👤 Employee'}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded bg-white/5 text-gray-400 text-[9px] font-mono">
                                      🏢 {selectedFirmForRoster.tag || 'TaxPro'}
                                    </span>
                                  </div>
                                </td>

                                <td className="px-6 py-4 font-semibold text-gray-300">
                                  {w.department || 'General Practice'}
                                </td>

                                <td className="px-6 py-4 font-mono text-gray-400">
                                  {w.phone || '-'}
                                </td>

                                <td className="px-6 py-4">
                                  <div className="w-32">
                                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1 font-mono">
                                      <span>{activeMods} of 16</span>
                                      <span className="font-bold text-purple-400">{pct}%</span>
                                    </div>
                                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full ${pct > 75 ? 'bg-emerald-400' : pct > 40 ? 'bg-purple-400' : 'bg-amber-400'}`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>

                                <td className="px-6 py-4">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                                    isRevoked 
                                      ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isRevoked ? 'bg-red-400' : 'bg-emerald-400'}`} />
                                    {w.status || 'Active'}
                                  </span>
                                </td>

                                <td className="px-6 py-4 text-right font-mono text-gray-500 text-[11px]">
                                  {w.created_at ? formatDate(w.created_at) : 'Active'}
                                </td>
                              </tr>
                            );
                          })}

                          {currentFirmWorkers.length === 0 && (
                            <tr>
                              <td colSpan="7" className="px-6 py-16 text-center text-gray-500 font-bold">
                                No workers matched the selected filters for {selectedFirmForRoster.name}.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: FINANCIAL CALENDAR & DAILY IN/OUT CASHFLOW LEDGER */}
          {/* ========================================================================= */}
          {activeTab === 'Calendar & In/Out' && (
            <div className="space-y-6 animate-fade-in">

              {/* Full Width Interactive Month Calendar & Daily In/Out Money Tracker */}
              <div className="bg-[#09090b] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
                
                {/* Calendar Header with Year & Month Selectors */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-xl font-black text-white font-outfit flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-purple-400" />
                      {currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()} Master Financial Calendar
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Click any day below to inspect all 📥 IN Collections and 📤 OUT Expenses recorded on that date.
                    </p>
                  </div>

                  {/* Year Selector, Month Selector & Navigation Controls */}
                  <div className="flex items-center gap-2 flex-wrap">
                    
                    {/* Financial Year Selector */}
                    <select
                      value={String(currentDate.getFullYear())}
                      onChange={(e) => {
                        const newYear = Number(e.target.value);
                        const newDate = new Date(currentDate);
                        newDate.setFullYear(newYear);
                        setCurrentDate(newDate);
                      }}
                      className="bg-white/5 border border-white/10 hover:border-purple-500/50 rounded-xl px-3 py-2 text-xs font-black text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                      title="Select Financial Year"
                    >
                      {availableYears.map(y => (
                        <option key={y} value={y} className="bg-gray-900 text-white font-mono">
                          FY {y}
                        </option>
                      ))}
                    </select>

                    {/* Month Selector */}
                    <select
                      value={String(currentDate.getMonth() + 1).padStart(2, '0')}
                      onChange={(e) => {
                        const newMoIndex = parseInt(e.target.value, 10) - 1;
                        const newDate = new Date(currentDate);
                        newDate.setMonth(newMoIndex);
                        setCurrentDate(newDate);
                      }}
                      className="bg-white/5 border border-white/10 hover:border-purple-500/50 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                      title="Select Month"
                    >
                      {MONTHS_LIST.map(m => (
                        <option key={m.num} value={m.num} className="bg-gray-900 text-white">
                          {m.name}
                        </option>
                      ))}
                    </select>

                    {/* Navigation Arrows */}
                    <div className="flex items-center gap-1 border-l border-white/10 pl-2">
                      <button
                        type="button"
                        onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                        title="Previous Month"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date();
                          setCurrentDate(today);
                          setSelectedCalendarDate(today.toISOString().slice(0, 10));
                        }}
                        className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                        title="Next Month"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                </div>

                {/* Calendar Grid (Days & Live IN/OUT Money Badges) */}
                <div className="grid grid-cols-7 gap-2.5 text-center text-xs">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="py-2 text-[11px] font-black text-gray-400 uppercase tracking-wider bg-white/[0.02] rounded-xl border border-white/5">
                      {d}
                    </div>
                  ))}

                  {calendarMonthDays.map((item, idx) => {
                    if (!item) {
                      return <div key={`empty-${idx}`} className="h-24 rounded-2xl bg-white/[0.01] border border-transparent" />;
                    }

                    const isSelected = item.dateStr === selectedCalendarDate;
                    const isToday = item.dateStr === new Date().toISOString().slice(0, 10);
                    const dayFlow = dailyCashflowMap[item.dateStr];
                    const dayIn = dayFlow ? dayFlow.inMoney : 0;
                    const dayOut = dayFlow ? dayFlow.outMoney : 0;
                    const hasTransactions = dayIn > 0 || dayOut > 0;

                    return (
                      <div
                        key={item.dateStr}
                        onClick={() => setSelectedCalendarDate(item.dateStr)}
                        className={`h-24 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer transition-all border font-mono select-none ${
                          isSelected
                            ? 'bg-purple-950/60 text-white shadow-xl shadow-purple-600/30 border-purple-400 scale-[1.02] ring-1 ring-purple-400'
                            : isToday
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/40 hover:bg-purple-500/20'
                            : 'bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04] text-gray-300'
                        }`}
                      >
                        {/* Day Number & Today indicator */}
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-black ${isSelected ? 'text-purple-300' : 'text-white'}`}>{item.dayNum}</span>
                          {isToday && (
                            <span className={`text-[8px] px-1.5 py-0.2 rounded font-black uppercase ${isSelected ? 'bg-purple-500 text-white' : 'bg-purple-500/20 text-purple-300'}`}>
                              Today
                            </span>
                          )}
                        </div>

                        {/* Daily IN and OUT Money Badges */}
                        <div className="flex flex-col gap-0.5 text-left text-[10px] overflow-hidden">
                          {dayIn > 0 && (
                            <div className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold truncate flex items-center justify-between">
                              <span>IN:</span>
                              <span>+₹{dayIn >= 100000 ? `${(dayIn/100000).toFixed(1)}L` : dayIn >= 1000 ? `${Math.round(dayIn/1000)}k` : dayIn}</span>
                            </div>
                          )}
                          {dayOut > 0 && (
                            <div className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 font-bold truncate flex items-center justify-between">
                              <span>OUT:</span>
                              <span>-₹{dayOut >= 100000 ? `${(dayOut/100000).toFixed(1)}L` : dayOut >= 1000 ? `${Math.round(dayOut/1000)}k` : dayOut}</span>
                            </div>
                          )}
                          {!hasTransactions && (
                            <div className="text-[10px] text-gray-600 font-medium text-center py-1">
                              -
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ========================================================================= */}
                {/* DEDICATED CLICKED DAY CASHFLOW BREAKDOWN & IN / OUT TRANSACTIONS */}
                {/* ========================================================================= */}
                <div className="pt-4 border-t border-white/10 space-y-4">
                  
                  {/* Clicked Date Header Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                    <div>
                      <div className="text-[10px] uppercase font-black tracking-widest text-purple-400 font-mono">
                        Audited Daily Cashflow Ledger
                      </div>
                      <h4 className="text-lg font-black text-white font-outfit mt-0.5">
                        Financial Statement for {formatDateWithWeekday(selectedCalendarDate)}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-xl bg-white/5 text-gray-300 text-xs font-mono font-bold">
                        {selectedDayCashflow.count} Verified Transactions
                      </span>
                      <button
                        onClick={handlePrintDailyCashflow}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                        title="Print Audited Statement for Selected Date"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Statement</span>
                      </button>
                    </div>
                  </div>

                  {/* Day In / Out / Net Margin Summary KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    
                    {/* 1. Total IN Money */}
                    <div className="bg-[#09090b] border border-emerald-500/30 rounded-2xl p-4 relative overflow-hidden shadow-lg">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                        <span>📥 Total IN Money (Collections)</span>
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-2xl font-black text-white font-mono">
                        +₹{selectedDayCashflow.inMoney.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Client payments & service fee receipts
                      </p>
                    </div>

                    {/* 2. Total OUT Money */}
                    <div className="bg-[#09090b] border border-red-500/30 rounded-2xl p-4 relative overflow-hidden shadow-lg">
                      <div className="flex items-center justify-between text-xs font-bold text-red-400 uppercase tracking-wider mb-1">
                        <span>📤 Total OUT Money (Expenses)</span>
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      </div>
                      <div className="text-2xl font-black text-white font-mono">
                        -₹{selectedDayCashflow.outMoney.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Rent, WiFi, cloud, supplies & payouts
                      </p>
                    </div>

                    {/* 3. Net Day Balance */}
                    <div className="bg-[#09090b] border border-purple-500/30 rounded-2xl p-4 relative overflow-hidden shadow-lg">
                      <div className="flex items-center justify-between text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">
                        <span>💰 Net Day Cashflow</span>
                        <Activity className="w-4 h-4 text-purple-400" />
                      </div>
                      {(() => {
                        const net = selectedDayCashflow.inMoney - selectedDayCashflow.outMoney;
                        return (
                          <>
                            <div className={`text-2xl font-black font-mono ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {net >= 0 ? '+' : ''}₹{net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">
                              Net balance realized for this day
                            </p>
                          </>
                        );
                      })()}
                    </div>

                  </div>

                  {/* Itemized Transactions Table for this Day */}
                  <div className="bg-[#09090b] border border-white/10 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-white/10 text-[10px] font-black text-gray-400 uppercase tracking-wider bg-white/[0.02]">
                            <th className="px-5 py-3">Time</th>
                            <th className="px-5 py-3">Flow</th>
                            <th className="px-5 py-3">Party / Client / Payee</th>
                            <th className="px-5 py-3">Description & Category</th>
                            <th className="px-5 py-3">Mode</th>
                            <th className="px-5 py-3">Ref ID</th>
                            <th className="px-5 py-3 text-right">Amount (INR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {selectedDayCashflow.transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-5 py-3 font-mono text-gray-400">
                                {tx.time || '12:00 PM'}
                              </td>

                              <td className="px-5 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${
                                  tx.isRevenue 
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                }`}>
                                  {tx.isRevenue ? '📥 IN' : '📤 OUT'}
                                </span>
                              </td>

                              <td className="px-5 py-3 font-bold text-white max-w-xs truncate">
                                {tx.client}
                              </td>

                              <td className="px-5 py-3 text-gray-300">
                                <div>{tx.type}</div>
                                <div className="text-[10px] text-gray-500">{tx.category}</div>
                              </td>

                              <td className="px-5 py-3 text-gray-400 font-medium">
                                {tx.mode}
                              </td>

                              <td className="px-5 py-3 font-mono text-gray-500 text-[11px]">
                                {tx.refNo}
                              </td>

                              <td className="px-5 py-3 text-right font-black font-mono text-sm whitespace-nowrap">
                                <span className={tx.isRevenue ? 'text-emerald-400' : 'text-red-400'}>
                                  {tx.isRevenue ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </td>
                            </tr>
                          ))}

                          {selectedDayCashflow.transactions.length === 0 && (
                            <tr>
                              <td colSpan="7" className="px-6 py-12 text-center text-gray-500 font-bold">
                                No financial transactions recorded on {selectedCalendarDate}. Total IN: ₹0.00 | Total OUT: ₹0.00
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: LATEST PAYMENTS (INFLOW & OUTFLOW REAL-TIME FEED) */}
          {/* ========================================================================= */}
          {activeTab === 'Latest Payments' && (
            <div className="space-y-6 animate-fade-in">
              
              <div className="bg-gradient-to-r from-purple-950 via-[#100e26] to-indigo-950 border border-purple-500/30 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-2 mb-1 font-mono">
                    <CreditCard className="w-4 h-4" />
                    Live Multi-Tenant Financial Transaction Feed
                  </div>
                  <h2 className="text-2xl font-black text-white font-outfit tracking-tight">
                    Latest Payments & Realized Financial Ledger
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 max-w-xl">
                    Live itemized stream of all client fee receipts, retainers, vendor payments, and operational outflows across the entire SaaS infrastructure.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddExpenseModalOpen(true)}
                    className="px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-red-400" />
                    <span>+ Add Outflow Expense</span>
                  </button>
                </div>
              </div>

              {/* Filter Pills & Search */}
              <div className="bg-[#09090b] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 custom-scrollbar">
                  {[
                    { id: 'all', label: 'All Latest Payments', count: allTransactions.length },
                    { id: 'receipt', label: '📥 Collections Inflow', count: allTransactions.filter(t => t.isRevenue).length },
                    { id: 'expense', label: '📤 Outflow Expenses', count: allExpensesList.length },
                  ].map(btn => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => setPaymentFilterFlow(btn.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                        paymentFilterFlow === btn.id
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span>{btn.label}</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/10 text-white">
                        {btn.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={paymentSearchQuery}
                    onChange={(e) => setPaymentSearchQuery(e.target.value)}
                    placeholder="Search client, vendor, ref no..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

              </div>

              {/* Transactions Feed Table */}
              <div className="bg-[#09090b] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] font-black text-gray-400 uppercase tracking-wider bg-white/[0.02]">
                        <th className="px-6 py-4">Date & Time</th>
                        <th className="px-6 py-4">Flow</th>
                        <th className="px-6 py-4">Client / Vendor</th>
                        <th className="px-6 py-4">Type & Category</th>
                        <th className="px-6 py-4">Mode</th>
                        <th className="px-6 py-4">Reference</th>
                        <th className="px-6 py-4 text-right">Amount (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {filteredLatestPayments.map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 font-mono text-gray-400 whitespace-nowrap">
                            <div>{tx.date}</div>
                            <div className="text-[10px] text-gray-600">{tx.time}</div>
                          </td>

                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${
                              tx.isRevenue 
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                : 'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}>
                              {tx.isRevenue ? '📥 Inflow' : '📤 Outflow'}
                            </span>
                          </td>

                          <td className="px-6 py-4 font-bold text-white max-w-xs truncate">
                            {tx.client}
                          </td>

                          <td className="px-6 py-4 text-gray-300">
                            <div>{tx.type}</div>
                            <div className="text-[10px] text-gray-500">{tx.category}</div>
                          </td>

                          <td className="px-6 py-4 text-gray-400 font-medium">
                            {tx.mode}
                          </td>

                          <td className="px-6 py-4 font-mono text-gray-500 text-[11px]">
                            {tx.refNo}
                          </td>

                          <td className="px-6 py-4 text-right font-black font-mono text-sm whitespace-nowrap">
                            <span className={tx.isRevenue ? 'text-emerald-400' : 'text-red-400'}>
                              {tx.isRevenue ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                        </tr>
                      ))}

                      {filteredLatestPayments.length === 0 && (
                        <tr>
                          <td colSpan="7" className="px-6 py-16 text-center text-gray-500 font-bold">
                            No payment transactions found matching the filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: OPERATING EXPENSES (RENT, WIFI, DOMAINS, SERVERS) */}
          {/* ========================================================================= */}
          {activeTab === 'Operating Expenses' && (
            <div className="space-y-6 animate-fade-in">
              
              <div className="bg-gradient-to-r from-red-950 via-[#190d19] to-rose-950 border border-red-500/30 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-red-400 flex items-center gap-2 mb-1 font-mono">
                    <Coins className="w-4 h-4" />
                    Infrastructure & Operating Cost Ledger
                  </div>
                  <h2 className="text-2xl font-black text-white font-outfit tracking-tight">
                    Operating Expenses Management (Rent, WiFi, Domains, Servers)
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 max-w-xl">
                    Log and track all organizational expenditures including office rent, gigabit fiber internet, domain renewals, cloud servers, AI API billing, and staff contractor payouts.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddExpenseModalOpen(true)}
                    className="px-5 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs rounded-2xl shadow-xl shadow-red-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>+ Record New Expense</span>
                  </button>
                </div>
              </div>

              {/* Expense KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#09090b] border border-red-500/20 rounded-3xl p-5 shadow-xl">
                  <div className="flex items-center justify-between text-xs font-bold text-red-400 uppercase tracking-wider mb-2">
                    <span>Total Outflow</span>
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    ₹{(activeMonthData ? activeMonthData.expenses : currentSelectedYearStats.totalExpenses).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    {filteredExpenses.length} Expense records logged
                  </div>
                </div>

                <div className="bg-[#09090b] border border-indigo-500/20 rounded-3xl p-5 shadow-xl">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
                    <span>🏢 Office Rent</span>
                    <Building2 className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    ₹{filteredExpenses.filter(e => e.category.toLowerCase().includes('rent')).reduce((acc, c) => acc + c.amount, 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    Physical Office & Silicon Square Lease
                  </div>
                </div>

                <div className="bg-[#09090b] border border-cyan-500/20 rounded-3xl p-5 shadow-xl">
                  <div className="flex items-center justify-between text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">
                    <span>🌐 WiFi, Domains & Hosting</span>
                    <Wifi className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    ₹{filteredExpenses.filter(e => {
                      const c = e.category.toLowerCase();
                      return c.includes('wifi') || c.includes('domain') || c.includes('hosting') || c.includes('server') || c.includes('internet');
                    }).reduce((acc, c) => acc + c.amount, 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    Airtel Gigabit, Cloudflare, Supabase & AWS
                  </div>
                </div>

                <div className="bg-[#09090b] border border-purple-500/20 rounded-3xl p-5 shadow-xl">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">
                    <span>🤖 AI APIs & SaaS</span>
                    <Cpu className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    ₹{filteredExpenses.filter(e => {
                      const c = e.category.toLowerCase();
                      return c.includes('ai') || c.includes('software') || c.includes('saas') || c.includes('api');
                    }).reduce((acc, c) => acc + c.amount, 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    OpenAI, Gemini & Cloud Tools
                  </div>
                </div>
              </div>

              {/* Operating Expenses Table */}
              <div className="bg-[#09090b] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] font-black text-gray-400 uppercase tracking-wider bg-white/[0.02]">
                        <th className="px-6 py-4">Payment Date</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Expense Title & Description</th>
                        <th className="px-6 py-4">Payee / Vendor</th>
                        <th className="px-6 py-4">Payment Mode</th>
                        <th className="px-6 py-4">Reference</th>
                        <th className="px-6 py-4 text-right">Amount (INR)</th>
                        <th className="px-6 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {filteredExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 font-mono text-gray-400 whitespace-nowrap">
                            {exp.date}
                          </td>

                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-red-500/10 text-red-300 border border-red-500/20 whitespace-nowrap">
                              {exp.category}
                            </span>
                          </td>

                          <td className="px-6 py-4 font-bold text-white max-w-xs truncate">
                            {exp.remarks !== '-' ? exp.remarks : exp.client}
                          </td>

                          <td className="px-6 py-4 font-medium text-gray-300 truncate max-w-[160px]">
                            {exp.client}
                          </td>

                          <td className="px-6 py-4 text-gray-400">
                            {exp.mode}
                          </td>

                          <td className="px-6 py-4 font-mono text-gray-500 text-[11px]">
                            {exp.refNo}
                          </td>

                          <td className="px-6 py-4 text-right font-black font-mono text-red-400 text-sm whitespace-nowrap">
                            -₹{exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="px-6 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(exp)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                              title="Delete Expense Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {filteredExpenses.length === 0 && (
                        <tr>
                          <td colSpan="8" className="px-6 py-16 text-center text-gray-500 font-bold">
                            No operating expense records found for the selected category/period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: REVENUE & BILLING */}
          {/* ========================================================================= */}
          {activeTab === 'Revenue & Billing' && (
            <div className="space-y-8 animate-fade-in">
              
              <div className="bg-[#09090b] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
                <div>
                  <div className="text-[10px] uppercase font-black tracking-widest text-purple-400 mb-2 flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    Select Financial Year
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    {availableYears.map(y => {
                      const isSelected = selectedRevYear === y;
                      const yStat = yearlyStatsMap[y];
                      const rev = yStat ? yStat.totalRevenue : 0;

                      return (
                        <button
                          key={y}
                          type="button"
                          onClick={() => {
                            setSelectedRevYear(y);
                            setSelectedRevMonth('all');
                          }}
                          className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
                            isSelected 
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40' 
                              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                          }`}
                        >
                          <span>FY {y}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-500'}`}>
                            ₹{rev > 0 ? (rev >= 100000 ? `${(rev/100000).toFixed(1)}L` : `${Math.round(rev/1000)}k`) : '0'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => setIsAddExpenseModalOpen(true)}
                    className="px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-red-400" />
                    <span>+ Add Expense</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#09090b] border border-emerald-500/20 rounded-3xl p-6 relative overflow-hidden shadow-xl">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                    <span>{selectedRevMonth === 'all' ? `FY ${selectedRevYear} Revenue` : `${MONTHS_LIST.find(m => m.num === selectedRevMonth)?.name} Revenue`}</span>
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div className="text-3xl font-black text-white font-mono tracking-tight">
                    ₹{(activeMonthData ? activeMonthData.revenue : currentSelectedYearStats.totalRevenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Strictly settled & realized client payments
                  </p>
                </div>

                {/* 2. Razorpay Gateway Fees (Commission * Revenue) */}
                <div className="bg-[#09090b] border border-blue-500/20 rounded-3xl p-6 relative overflow-hidden shadow-xl">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-blue-400" />
                      Razorpay Gateway Fees (2%)
                    </span>
                    <CreditCard className="w-4 h-4 text-blue-400" />
                  </div>
                  {(() => {
                    const currentRev = activeMonthData ? activeMonthData.revenue : currentSelectedYearStats.totalRevenue;
                    const razorpayFee = currentRev * 0.02;
                    return (
                      <>
                        <div className="text-3xl font-black text-blue-400 font-mono tracking-tight">
                          ₹{razorpayFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-gray-400 mt-2 flex flex-col gap-1">
                          <p className="flex items-center gap-1.5 text-blue-300 font-medium">
                            <Activity className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                            Razorpay Commission: 2.0% × ₹{currentRev.toLocaleString('en-IN')} Revenue
                          </p>
                          <p className="text-[10px] text-gray-500 font-mono">
                            Net Settled Payout: ₹{(currentRev - razorpayFee).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="bg-[#09090b] border border-red-500/20 rounded-3xl p-6 relative overflow-hidden shadow-xl">
                  <div className="flex items-center justify-between text-xs font-bold text-red-400 uppercase tracking-wider mb-2">
                    <span>Practice Expenses</span>
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div className="text-3xl font-black text-white font-mono tracking-tight">
                    ₹{(activeMonthData ? activeMonthData.expenses : currentSelectedYearStats.totalExpenses).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-red-400" />
                    Rent, WiFi, domains, servers & salaries
                  </p>
                </div>

                <div className="bg-[#09090b] border border-purple-500/20 rounded-3xl p-6 relative overflow-hidden shadow-xl">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">
                    <span>Net Cash Flow</span>
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  {(() => {
                    const net = activeMonthData 
                      ? (activeMonthData.revenue - activeMonthData.expenses) 
                      : (currentSelectedYearStats.totalRevenue - currentSelectedYearStats.totalExpenses);
                    return (
                      <>
                        <div className={`text-3xl font-black font-mono tracking-tight ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {net >= 0 ? '+' : ''}₹{net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                          Net realized operating profit
                        </p>
                      </>
                    );
                  })()}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 7: SECURITY LOGS (DEDICATED NEW USERS ONBOARDING & ACTIVITY FEED) */}
          {/* ========================================================================= */}
          {activeTab === 'Security Logs' && (
            <div className="space-y-6 animate-fade-in">
              
              <div className="bg-gradient-to-r from-indigo-950 via-[#101026] to-purple-950 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2 mb-1 font-mono">
                    <UserCheck className="w-4 h-4" />
                    New User Registrations & Security Audit
                  </div>
                  <h2 className="text-2xl font-black text-white font-outfit tracking-tight">
                    New Users & Onboarded Personnel Roster
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 max-w-xl">
                    Audited ledger of all newly registered administrators, managers, and employees onboarded across firms.
                  </p>
                </div>

                <div className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <div className="text-2xl font-black text-indigo-400 font-mono">{members.length}</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase">Total Users Onboarded</div>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="bg-[#09090b] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 custom-scrollbar">
                  {[
                    { id: 'all', label: 'All New Users', count: members.length },
                    { id: 'Admin', label: '👑 New Admins', count: totalAdminsCount },
                    { id: 'Manager', label: '💼 New Managers', count: totalManagersCount },
                    { id: 'Employee', label: '👤 New Employees', count: totalEmployeesCount },
                  ].map(btn => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => setNewUsersRoleFilter(btn.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                        newUsersRoleFilter === btn.id
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span>{btn.label}</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/10 text-white">
                        {btn.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={newUsersSearchQuery}
                    onChange={(e) => setNewUsersSearchQuery(e.target.value)}
                    placeholder="Search new user by name, email..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

              </div>

              {/* New Users Table */}
              <div className="bg-[#09090b] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] font-black text-gray-400 uppercase tracking-wider bg-white/[0.02]">
                        <th className="px-6 py-4">User Details</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Firm / Company</th>
                        <th className="px-6 py-4">Department</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Registration Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {newUsersList.map((u, idx) => {
                        const isAdm = (u.role || '').toLowerCase().includes('admin');
                        const isMgr = (u.role || '').toLowerCase().includes('manager');

                        return (
                          <tr key={u.id || idx} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 ${
                                  isAdm ? 'bg-indigo-500/20 text-indigo-300' : isMgr ? 'bg-purple-500/20 text-purple-300' : 'bg-emerald-500/20 text-emerald-300'
                                }`}>
                                  {u.name ? u.name.charAt(0) : 'U'}
                                </div>
                                <div>
                                  <div className="font-bold text-white text-sm">{u.name || 'New User'}</div>
                                  <div className="text-[11px] text-gray-500 font-mono">{u.email}</div>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase font-mono ${
                                isAdm ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                                isMgr ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                                'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}>
                                {isAdm ? '👑 Admin' : isMgr ? '💼 Manager' : '👤 Employee'}
                              </span>
                            </td>

                            <td className="px-6 py-4 text-gray-300 font-medium">
                              🏢 {u.firm_name || 'TaxPro Associates'}
                            </td>

                            <td className="px-6 py-4 text-gray-400">
                              {u.department || 'General Practice'}
                            </td>

                            <td className="px-6 py-4">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                {u.status || 'Active'}
                              </span>
                            </td>

                            <td className="px-6 py-4 text-right font-mono text-gray-400">
                              {u.created_at ? formatDate(u.created_at) : 'Verified'}
                            </td>
                          </tr>
                        );
                      })}

                      {newUsersList.length === 0 && (
                        <tr>
                          <td colSpan="6" className="px-6 py-16 text-center text-gray-500 font-bold">
                            No users found matching the search criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* ========================================================================= */}
      {/* ADD EXPENSE MODAL (RENT, WIFI, DOMAINS, SERVERS, SAAS) */}
      {/* ========================================================================= */}
      {isAddExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl bg-[#09090b] border border-red-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            <div className="px-6 py-5 bg-gradient-to-r from-red-950 via-[#180d18] to-gray-900 border-b border-white/10 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg">
                  <Coins className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-rose-400 font-mono flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Operating Expense Logger
                  </div>
                  <h3 className="text-lg font-black text-white font-outfit">
                    Record SuperAdmin Operating Expense
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddExpenseModalOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-6 overflow-y-auto custom-scrollbar space-y-5 flex-1 text-xs">
              <div>
                <label className="block text-gray-300 font-bold mb-2">
                  1. Select Expense Category Preset (Click to auto-populate):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {EXPENSE_CATEGORIES.map(cat => {
                    const isSelected = expenseForm.category === cat.label;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectPresetCategory(cat)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                          isSelected 
                            ? 'bg-red-500/20 border-red-500 text-white shadow-md' 
                            : 'bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/5 hover:text-gray-200'
                        }`}
                      >
                        <span className="text-base">{cat.icon}</span>
                        <span className="text-[11px] font-bold truncate leading-tight">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-gray-300 font-bold flex items-center justify-between">
                    <span>Expense Amount (INR) <strong className="text-red-400">*</strong></span>
                    {expenseForm.amount && (
                      <span className="text-emerald-400 font-mono font-black text-sm">
                        ₹{parseFloat(expenseForm.amount || 0).toLocaleString('en-IN')}
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      step="any"
                      required
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="e.g. 45000"
                      className="w-full pl-8 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-black font-mono text-white focus:outline-none focus:border-red-500 focus:bg-white/10"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-gray-300 font-bold">
                    Expense Title & Purpose <strong className="text-red-400">*</strong>
                  </label>
                  <input
                    type="text"
                    required
                    value={expenseForm.title}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Monthly Office Rent - Silicon Square"
                    className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-300 font-bold">
                    Vendor / Payee / Beneficiary <strong className="text-red-400">*</strong>
                  </label>
                  <input
                    type="text"
                    required
                    value={expenseForm.payee}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, payee: e.target.value }))}
                    placeholder="e.g. Silicon Square Realty / Airtel Ltd."
                    className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-300 font-bold">
                    Payment Date <strong className="text-red-400">*</strong>
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-300 font-bold">Payment Method</label>
                  <select
                    value={expenseForm.mode}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, mode: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-gray-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="Bank Transfer">Corporate Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="UPI">UPI / Instant QR</option>
                    <option value="Debit/Credit Card">Corporate Debit / Credit Card</option>
                    <option value="Net Banking">Internet Banking</option>
                    <option value="Cheque">Bank Cheque</option>
                    <option value="Cash">Cash Voucher</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-300 font-bold">Transaction Ref / Voucher No</label>
                  <input
                    type="text"
                    value={expenseForm.refNo}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, refNo: e.target.value }))}
                    placeholder="e.g. EXP-2026-AUG-88"
                    className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-gray-300 font-bold">Invoice Notes / Tax Memo</label>
                  <textarea
                    rows={2}
                    value={expenseForm.notes}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="e.g. Monthly recurring bandwidth & static IP invoice"
                    className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSavingExpense}
                  className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {isSavingExpense ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                  <span>Confirm & Record Operating Expense</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MANAGE SUBSCRIPTION & EXTEND DAYS MODAL FOR ANY SPECIFIC FIRM */}
      {/* ========================================================================= */}
      {subModalFirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl bg-[#09090b] border border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-purple-950 via-[#160d26] to-indigo-950 border-b border-white/10 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-purple-400 font-mono flex items-center gap-1">
                    <span>SaaS License & Subscription Manager</span>
                  </div>
                  <h3 className="text-lg font-black text-white font-outfit">
                    Manage Subscription: {subModalFirm.name}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSubModalFirm(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-5 flex-1 text-xs">
              
              {/* Current Status Pill */}
              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase font-bold text-purple-400 font-mono">Current Firm Status</div>
                  <div className="text-sm font-black text-white">{subModalFirm.name}</div>
                  <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                    Plan: <strong className="text-purple-300">{subModalFirm.subscriptionPlan}</strong>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black font-mono inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>⏳ {subModalFirm.daysLeft} Days Remaining</span>
                  </span>
                  <div className="text-[10px] text-gray-400 font-mono mt-1">
                    Current Expiry: {subModalFirm.subscriptionFormatted}
                  </div>
                </div>
              </div>

              {/* 1. Select Subscription Tier */}
              <div>
                <label className="block text-gray-300 font-bold mb-2">
                  1. Grant / Change Subscription Plan Tier:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { id: 'Enterprise Cloud Practice (Annual Pro)', tag: 'RECOMMENDED', badge: '🏢 Unlimited', desc: 'Unlimited staff, all 16 modules, full multi-branch & AI assistance' },
                    { id: 'Professional Multi-User Cloud Practice', tag: 'GROWTH', badge: '👥 25 Users', desc: 'Audit suite, GST return filing, compliance & client portal' },
                    { id: 'Starter Solo CA Practice', tag: 'ESSENTIAL', badge: '👤 5 Users', desc: 'Standard tax filing, invoices, tasks & client management' },
                    { id: 'VIP Enterprise Multi-Branch Pro (Lifetime)', tag: 'VIP ENTERPRISE', badge: '👑 Dedicated DB', desc: 'Custom white-label, priority cloud node & SLA support' },
                  ].map(plan => {
                    const isSelected = subModalPlan === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSubModalPlan(plan.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-purple-950/60 border-purple-400 text-white shadow-lg ring-1 ring-purple-400'
                            : 'bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[9px] px-2 py-0.5 rounded font-black font-mono uppercase ${
                            isSelected ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-400'
                          }`}>
                            {plan.badge}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-purple-400 stroke-[3]" />}
                        </div>
                        <div className="font-black text-xs text-white">{plan.id}</div>
                        <div className="text-[10px] text-gray-500 mt-1 leading-relaxed">{plan.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Extend Validity Days / Date */}
              <div className="pt-3 border-t border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-gray-300 font-bold text-xs">
                    2. Add Days / Extend Validity:
                  </label>
                  <span className="text-[11px] text-gray-400 font-mono">
                    Current Expiry: <strong className="text-purple-300">{subModalFirm.subscriptionFormatted || subModalFirm.subscriptionExpiry}</strong>
                  </span>
                </div>

                {/* Quick Add Presets */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { days: 30, label: '+30 Days' },
                    { days: 60, label: '+60 Days' },
                    { days: 90, label: '+90 Days' },
                    { days: 180, label: '+180 Days' },
                    { days: 365, label: '+1 Year' },
                    { days: 730, label: '+2 Years' },
                  ].map(p => {
                    const isCur = subModalDaysToAdd === p.days;
                    return (
                      <button
                        key={p.days}
                        type="button"
                        onClick={() => {
                          setSubModalDaysToAdd(p.days);
                          const base = new Date(subModalFirm.subscriptionExpiry || Date.now());
                          const newD = new Date(base.getTime() + p.days * 24 * 60 * 60 * 1000);
                          setSubModalCustomDate(newD.toISOString().slice(0, 10));
                        }}
                        className={`py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer border text-center ${
                          isCur
                            ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/30'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Days Input & Date Picker */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-gray-400 font-semibold text-[11px] flex items-center justify-between">
                      <span>Or Enter Custom Days to Extend:</span>
                      <span className="text-purple-400 font-mono font-bold">+{subModalDaysToAdd} Days</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={subModalDaysToAdd}
                      onChange={(e) => {
                        const d = parseInt(e.target.value, 10) || 0;
                        setSubModalDaysToAdd(d);
                        const base = new Date(subModalFirm.subscriptionExpiry || Date.now());
                        const newD = new Date(base.getTime() + d * 24 * 60 * 60 * 1000);
                        setSubModalCustomDate(newD.toISOString().slice(0, 10));
                      }}
                      className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-purple-500"
                      placeholder="e.g. 180"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 font-semibold text-[11px]">
                      Or Set Exact Future Expiry Date:
                    </label>
                    <input
                      type="date"
                      value={subModalCustomDate}
                      onChange={(e) => {
                        setSubModalCustomDate(e.target.value);
                        const target = new Date(e.target.value);
                        const base = new Date(subModalFirm.subscriptionExpiry || Date.now());
                        const diff = Math.ceil((target.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
                        setSubModalDaysToAdd(Math.max(0, diff));
                      }}
                      className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Real-Time Extension Preview */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#0c1f18] to-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold flex-shrink-0 border border-emerald-500/30 shadow-xs">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>Preview: New Subscription Validity</span>
                    </div>
                    <div className="text-sm font-black text-white mt-0.5">
                      Expires on: <span className="text-emerald-300 font-mono">{formatDate(subModalCustomDate || Date.now())}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span className="text-lg font-black text-emerald-400">
                    +{subModalDaysToAdd} Days
                  </span>
                  <div className="text-[10px] text-gray-400">added to plan</div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-white/[0.02] border-t border-white/10 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSubModalFirm(null)}
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleSaveFirmSubscription(subModalCustomDate, subModalPlan)}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95 border border-purple-400/40"
              >
                <Sparkles className="w-4 h-4" />
                <span>Save & Apply Subscription to Firm</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
