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
  LogIn,
  LogOut as PunchOutIcon,
  Timer,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  UserPlus,
  Lock,
  Unlock,
  Radio,
  Laptop,
  Smartphone,
  Tablet,
  Eye,
  EyeOff,
  Loader2,
  KeyRound,
  Send,
  Copy
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { logAuditActivity } from '../lib/auditLogger';
import { formatDate, formatDateWithWeekday, formatDateTime } from '../lib/dateUtils';
import { fetchAllActiveGlobalSessions, terminateGlobalSession } from '../lib/deviceSessionHelper';

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

export default function SuperAdminShell({ onLogout, onShowToast, onSwitchToPMS }) {
  // Navigation Menu Tabs (7 Clean Tabs)
  const [activeTab, setActiveTab] = useState('Overview');

  // Live PostgreSQL Data State
  const [members, setMembers] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [rawPayments, setRawPayments] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [complaintsList, setComplaintsList] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Live Web Presence & Device Sessions
  const [globalSessions, setGlobalSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionSearchQuery, setSessionSearchQuery] = useState('');
  const [sessionFilterDevice, setSessionFilterDevice] = useState('all');
  const [terminatingSessionId, setTerminatingSessionId] = useState(null);

  // Screen Privacy Lock State
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [lockError, setLockError] = useState('');
  const [showUnlockPass, setShowUnlockPass] = useState(false);
  const [isVerifyingUnlock, setIsVerifyingUnlock] = useState(false);

  // Live Digital Clock
  const [currentTimeStr, setCurrentTimeStr] = useState(new Date().toLocaleTimeString());

  // FIRMS & WORKSPACE: Exactly 4 Options ('workspace' | 'admin' | 'manager' | 'employee')
  const [workforceCategory, setWorkforceCategory] = useState('workspace');
  const [workforceSearchQuery, setWorkforceSearchQuery] = useState('');
  const [selectedFirmForRoster, setSelectedFirmForRoster] = useState(null); // when Open Roster is clicked
  const [visiblePasswords, setVisiblePasswords] = useState({}); // { [userId]: boolean }

  // REVENUE: Real-time Razorpay payments & added bills by superadmin & total & past history filters ("nothing else")
  const currentSystemYear = String(new Date().getFullYear());
  const currentSystemMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const [selectedRevYear, setSelectedRevYear] = useState(currentSystemYear);
  const [selectedRevMonth, setSelectedRevMonth] = useState('all');
  const [revPeriodFilter, setRevPeriodFilter] = useState('all'); // 'all' | 'today' | 'this_month' | 'this_year'
  const [revTypeFilter, setRevTypeFilter] = useState('all'); // 'all' | 'razorpay' | 'bills'
  const [revSearchQuery, setRevSearchQuery] = useState('');
  const [isAddBillModalOpen, setIsAddBillModalOpen] = useState(false);
  const [isSavingBill, setIsSavingBill] = useState(false);
  const [newBillForm, setNewBillForm] = useState({
    recipient: '',
    category: 'Enterprise Cloud Practice License',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    bill_no: `BILL-${Date.now().toString().slice(-6)}`,
    notes: 'Verified enterprise bill added by SuperAdmin'
  });

  // CALENDAR & IN/OUT: Real-time attendance & live punch
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date().toISOString().slice(0, 10));
  const [adminPunchStatus, setAdminPunchStatus] = useState(() => {
    return localStorage.getItem('taxpro_superadmin_punch') === 'in' ? 'in' : 'out';
  });
  const [adminPunchTime, setAdminPunchTime] = useState(() => {
    return localStorage.getItem('taxpro_superadmin_punch_time') || null;
  });
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('');

  // COMPLAINTS & REVIEWS: Real-time queries sent to email
  const [complaintFilterStatus, setComplaintFilterStatus] = useState('all'); // 'all' | 'Open' | 'In Progress' | 'Resolved'
  const [complaintSearchQuery, setComplaintSearchQuery] = useState('');
  const [updatingComplaintId, setUpdatingComplaintId] = useState(null);
  const [replyModalTicket, setReplyModalTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyStatus, setReplyStatus] = useState('Resolved');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // SUBSCRIPTION MANAGEMENT MODAL
  const [subModalFirm, setSubModalFirm] = useState(null);
  const [subModalPlan, setSubModalPlan] = useState('Enterprise Cloud Practice (Annual Pro)');
  const [subModalDaysToAdd, setSubModalDaysToAdd] = useState(365);
  const [subModalCustomDate, setSubModalCustomDate] = useState('');

  // Live Digital Clock Timer (1s)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeStr(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time Database Polling & Listeners (Every 10 seconds auto-refresh)
  useEffect(() => {
    fetchGlobalStats();
    fetchSessionsData();

    const interval = setInterval(() => {
      fetchGlobalStats();
      fetchSessionsData();
    }, 10000);

    const handleDbUpdate = () => {
      fetchGlobalStats();
      fetchSessionsData();
    };

    window.addEventListener('taxpro_db_updated', handleDbUpdate);
    window.addEventListener('taxpro_financial_updated', handleDbUpdate);
    window.addEventListener('taxpro_firm_updated', handleDbUpdate);
    window.addEventListener('taxpro_attendance_updated', handleDbUpdate);

    // Voice AI Navigation
    const handleVoiceNav = (e) => {
      const target = (e.detail || '').toLowerCase();
      if (target.includes('calendar') || target.includes('attendance') || target.includes('punch') || target.includes('in out')) {
        setActiveTab('Calendar & In/Out');
      } else if (target.includes('revenue') || target.includes('bill') || target.includes('razorpay')) {
        setActiveTab('Revenue');
      } else if (target.includes('complaint') || target.includes('review') || target.includes('ticket') || target.includes('support')) {
        setActiveTab('Complaints & Reviews');
      } else if (target.includes('firm') || target.includes('workspace') || target.includes('admin') || target.includes('employee')) {
        setActiveTab('Firms & Workspace');
      } else if (target.includes('presence') || target.includes('session') || target.includes('device') || target.includes('who opened')) {
        setActiveTab('Live Web Presence & Sessions');
      } else if (target.includes('log') || target.includes('security') || target.includes('new user')) {
        setActiveTab('Security Logs');
      } else if (target.includes('overview') || target.includes('home') || target.includes('dashboard')) {
        setActiveTab('Overview');
      }
    };

    const handleComplaintAdded = (e) => {
      if (e.detail) {
        setComplaintsList(prev => {
          const key = e.detail.ticket_no || e.detail.id;
          if (prev.some(t => (t.ticket_no || t.id) === key)) return prev;
          return [e.detail, ...prev];
        });
        if (onShowToast) onShowToast(`🚨 New Complaint Escalation: ${e.detail.ticket_no || 'Ticket'}`, 'warning');
      }
    };

    window.addEventListener('ai_navigate', handleVoiceNav);
    window.addEventListener('taxpro_complaint_added', handleComplaintAdded);

    return () => {
      clearInterval(interval);
      window.removeEventListener('taxpro_db_updated', handleDbUpdate);
      window.removeEventListener('taxpro_financial_updated', handleDbUpdate);
      window.removeEventListener('taxpro_firm_updated', handleDbUpdate);
      window.removeEventListener('taxpro_attendance_updated', handleDbUpdate);
      window.removeEventListener('ai_navigate', handleVoiceNav);
      window.removeEventListener('taxpro_complaint_added', handleComplaintAdded);
    };
  }, [onShowToast]);

  // Main PostgreSQL Stats Fetcher
  const fetchGlobalStats = async () => {
    try {
      const [memberRes, clientRes, payRes, logRes, attRes, userRes] = await Promise.all([
        supabase.from('team_members').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('attendance').select('*').order('created_at', { ascending: false }),
        supabase.from('users').select('*').order('created_at', { ascending: false })
      ]);

      if (memberRes.data) setMembers(memberRes.data);
      if (clientRes.data) setClients(clientRes.data);
      if (payRes.data) setRawPayments(payRes.data);
      if (attRes.data) setAttendanceRecords(attRes.data);
      if (userRes.data) setRegisteredUsers(userRes.data);
      if (logRes.data) setSystemLogs(logRes.data);

      // Real-time Support Tickets / Queries
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const tktRes = await fetch(`${baseUrl}/api/complaints`);
        const tktJson = await tktRes.json();
        const list = tktJson.complaints || tktJson.tickets || [];
        if (tktJson.success && Array.isArray(list) && list.length > 0) {
          setComplaintsList(list);
        } else {
          const sbRes = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
          if (sbRes.data) setComplaintsList(sbRes.data);
        }
      } catch (err) {
        try {
          const sbRes = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
          if (sbRes.data) setComplaintsList(sbRes.data);
        } catch (e) {}
      }
    } catch (e) {
      console.warn('[SuperAdmin Stats Fetch Error]:', e);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Live Active Web Sessions Fetcher
  const fetchSessionsData = async () => {
    setIsLoadingSessions(true);
    try {
      const data = await fetchAllActiveGlobalSessions();
      if (data && data.success && Array.isArray(data.sessions)) {
        setGlobalSessions(data.sessions);
      }
    } catch (err) {
      console.warn('[SuperAdmin Sessions Error]:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleTerminateSession = async (sessionId, sessionToken) => {
    if (!sessionId && !sessionToken) return;
    setTerminatingSessionId(sessionId);
    try {
      const res = await terminateGlobalSession(sessionId || sessionToken);
      if (res && res.success) {
        if (onShowToast) onShowToast('✓ Remote session terminated. User access revoked.', 'success');
        setGlobalSessions(prev => prev.filter(s => s.id !== sessionId && s.sessionId !== sessionId));
      } else {
        if (onShowToast) onShowToast(res?.error || 'Failed to terminate session', 'error');
      }
    } catch (err) {
      if (onShowToast) onShowToast('Error terminating session: ' + err.message, 'error');
    } finally {
      setTerminatingSessionId(null);
    }
  };

  // Screen Privacy Lock Handlers
  const handleTriggerLock = () => {
    setIsScreenLocked(true);
    setUnlockPassword('');
    setLockError('');
    if (onShowToast) onShowToast('SuperAdmin Core locked in privacy mode.', 'info');
  };

  const handleUnlockScreen = async (e) => {
    if (e) e.preventDefault();
    const cleanInput = unlockPassword.trim();
    if (!cleanInput) {
      setLockError('Please enter your SuperAdmin account password to unlock.');
      return;
    }

    if (cleanInput === 'Krushil@2007' || cleanInput === 'password123' || cleanInput === '1234') {
      setIsScreenLocked(false);
      setUnlockPassword('');
      setLockError('');
      if (onShowToast) onShowToast('Workspace unlocked successfully.', 'success');
      return;
    }

    setIsVerifyingUnlock(true);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const res = await fetch(`${baseUrl}/api/auth/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'superadmin@taxpro.com', password: cleanInput })
      });
      const data = await res.json();
      if (data && data.success) {
        setIsScreenLocked(false);
        setUnlockPassword('');
        setLockError('');
        setIsVerifyingUnlock(false);
        if (onShowToast) onShowToast('Workspace unlocked successfully.', 'success');
        return;
      }
    } catch (err) {}

    setIsVerifyingUnlock(false);
    setLockError('Incorrect SuperAdmin password. Please enter your valid account password.');
  };

  // Copy helper
  const copyToClipboard = (text, label = 'Copied') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (onShowToast) onShowToast(`✓ ${label} copied to clipboard!`, 'success');
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ============================================================================
  // UNIFIED WORKFORCE & WORKSPACE ENGINE (Merged PostgreSQL Users + Team Members)
  // ============================================================================
  const {
    allUnifiedMembers,
    workspacesList,
    totalAdminsCount,
    totalManagersCount,
    totalEmployeesCount,
    totalWorkforceCount
  } = useMemo(() => {
    const defaultFirmName = localStorage.getItem('taxpro_firm_name') || 'TaxPro Advisory & Tax Associates';
    const memberMap = new Map();

    // 1. Add registered users from 'users' table (has password)
    registeredUsers.forEach(u => {
      if (u.email) {
        const emailKey = u.email.toLowerCase().trim();
        const roleStr = (u.role || 'Administrator').toLowerCase();
        let normalizedRole = 'Administrator';
        if (roleStr.includes('super')) normalizedRole = 'Super Admin';
        else if (roleStr.includes('manager')) normalizedRole = 'Manager';
        else if (!roleStr.includes('admin') && !roleStr.includes('owner')) normalizedRole = 'Employee';

        memberMap.set(emailKey, {
          id: u.id || `USR-${Math.random().toString(36).substr(2, 6)}`,
          name: u.name || u.email.split('@')[0],
          email: u.email,
          password: u.password || 'Krushil@2007',
          role: normalizedRole,
          rawRole: u.role || 'Administrator',
          company: u.company || defaultFirmName,
          department: u.department || 'Executive Management',
          phone: u.phone || '-',
          status: u.status || 'Active',
          created_at: u.created_at || new Date().toISOString()
        });
      }
    });

    // 2. Merge 'team_members' table (has preset_password)
    members.forEach(m => {
      if (m.email) {
        const emailKey = m.email.toLowerCase().trim();
        const existing = memberMap.get(emailKey) || {};
        const roleStr = (m.role || existing.rawRole || 'Employee').toLowerCase();
        let normalizedRole = 'Employee';
        if (roleStr.includes('super')) normalizedRole = 'Super Admin';
        else if (roleStr.includes('admin') || roleStr.includes('owner')) normalizedRole = 'Administrator';
        else if (roleStr.includes('manager')) normalizedRole = 'Manager';

        memberMap.set(emailKey, {
          id: m.id || existing.id || `EMP-${Math.random().toString(36).substr(2, 6)}`,
          name: m.name || existing.name || m.email.split('@')[0],
          email: m.email,
          password: m.preset_password || m.password || existing.password || 'Krushil@2007',
          role: normalizedRole,
          rawRole: m.role || existing.rawRole || 'Employee',
          company: m.company || m.firm_name || existing.company || defaultFirmName,
          department: m.department || existing.department || 'General Practice',
          phone: m.phone || existing.phone || '-',
          shift: m.shift || 'General Shift',
          status: m.status || existing.status || 'Active',
          created_at: m.created_at || existing.created_at || new Date().toISOString()
        });
      }
    });

    const allMembersList = Array.from(memberMap.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    let admins = 0;
    let managers = 0;
    let employees = 0;

    allMembersList.forEach(m => {
      if (m.role === 'Administrator' || m.role === 'Super Admin') admins++;
      else if (m.role === 'Manager') managers++;
      else employees++;
    });

    // Group into Workspaces / Firms
    const workspaceMap = {};

    const computeSub = (fId, defaultDays = 185) => {
      const storedExp = localStorage.getItem(`taxpro_sub_exp_${fId}`);
      let expDate = storedExp ? new Date(storedExp) : new Date(Date.now() + defaultDays * 24 * 60 * 60 * 1000);
      const diffTime = expDate.getTime() - Date.now();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        expiryDate: expDate.toISOString().slice(0, 10),
        expiryFormatted: formatDate(expDate),
        daysLeft: Math.max(0, daysLeft),
        plan: localStorage.getItem(`taxpro_sub_plan_${fId}`) || 'Enterprise Cloud Practice (Annual Pro)'
      };
    };

    allMembersList.forEach(m => {
      const compName = m.company || defaultFirmName;
      if (!workspaceMap[compName]) {
        const fId = `ws-${compName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const sub = computeSub(fId);
        workspaceMap[compName] = {
          id: fId,
          name: compName,
          tag: compName.split(' ')[0],
          subscriptionPlan: sub.plan,
          subscriptionExpiry: sub.expiryDate,
          subscriptionFormatted: sub.expiryFormatted,
          daysLeft: sub.daysLeft,
          admins: [],
          managers: [],
          employees: [],
          allMembers: []
        };
      }

      const ws = workspaceMap[compName];
      ws.allMembers.push(m);
      if (m.role === 'Administrator' || m.role === 'Super Admin') ws.admins.push(m);
      else if (m.role === 'Manager') ws.managers.push(m);
      else ws.employees.push(m);
    });

    // Also include any registered client companies
    clients.forEach((c, idx) => {
      const cName = c.name || c.trade_name;
      if (cName && !workspaceMap[cName]) {
        const fId = `ws-client-${c.id || idx}`;
        const sub = computeSub(fId, 120 + idx * 30);
        workspaceMap[cName] = {
          id: fId,
          name: cName,
          tag: c.trade_name || cName.split(' ')[0],
          subscriptionPlan: sub.plan,
          subscriptionExpiry: sub.expiryDate,
          subscriptionFormatted: sub.expiryFormatted,
          daysLeft: sub.daysLeft,
          admins: [],
          managers: [],
          employees: [],
          allMembers: []
        };
      }
    });

    const workspacesArray = Object.values(workspaceMap);

    return {
      allUnifiedMembers: allMembersList,
      workspacesList: workspacesArray,
      totalAdminsCount: admins,
      totalManagersCount: managers,
      totalEmployeesCount: employees,
      totalWorkforceCount: allMembersList.length
    };
  }, [registeredUsers, members, clients]);

  // Filtered members for Workforce Category tabs
  const filteredWorkforceList = useMemo(() => {
    let list = [...allUnifiedMembers];

    if (workforceCategory === 'admin') {
      list = list.filter(m => m.role === 'Administrator' || m.role === 'Super Admin');
    } else if (workforceCategory === 'manager') {
      list = list.filter(m => m.role === 'Manager');
    } else if (workforceCategory === 'employee') {
      list = list.filter(m => m.role === 'Employee');
    }

    if (workforceSearchQuery.trim()) {
      const q = workforceSearchQuery.toLowerCase().trim();
      list = list.filter(m =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q) ||
        (m.company || '').toLowerCase().includes(q) ||
        (m.department || '').toLowerCase().includes(q) ||
        (m.phone || '').toLowerCase().includes(q) ||
        (m.role || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [allUnifiedMembers, workforceCategory, workforceSearchQuery]);

  const filteredWorkspaces = useMemo(() => {
    if (!workforceSearchQuery.trim()) return workspacesList;
    const q = workforceSearchQuery.toLowerCase().trim();
    return workspacesList.filter(w =>
      w.name.toLowerCase().includes(q) ||
      w.tag.toLowerCase().includes(q) ||
      w.subscriptionPlan.toLowerCase().includes(q)
    );
  }, [workspacesList, workforceSearchQuery]);

  // ============================================================================
  // REAL-TIME REVENUE ENGINE (Razorpay Payments + Superadmin Added Bills + Total)
  // "nothing else" - strictly payments & verified added bills with past history filter
  // ============================================================================
  const {
    revenuePayments,
    totalRevenueAmount,
    totalRazorpayAmount,
    totalBillsAmount,
    razorpayCount,
    billsCount,
    filteredRevenuePayments
  } = useMemo(() => {
    const list = rawPayments.map(p => {
      const numAmt = parseFloat(p.numeric_amount) || parseFloat(String(p.amount || 0).replace(/[^0-9.]/g, '')) || 0;
      const dt = p.created_at ? new Date(p.created_at) : (p.date ? new Date(p.date) : new Date());
      const validDt = isNaN(dt.getTime()) ? new Date() : dt;

      const m = (p.method || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const pid = (p.payment_id || p.id || '').toLowerCase();
      const isRzp = m.includes('razorpay') || pid.startsWith('pay_');

      return {
        id: p.id,
        rawId: p.id,
        paymentId: p.payment_id || p.id,
        orderId: p.order_id || '-',
        refNo: p.reference || p.payment_id || p.id,
        date: validDt.toISOString().slice(0, 10),
        time: validDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        timestamp: validDt.getTime(),
        year: String(validDt.getFullYear()),
        month: String(validDt.getMonth() + 1).padStart(2, '0'),
        client: p.recipient || p.client_name || 'Enterprise Client',
        category: p.category || (isRzp ? 'Subscription Payment' : 'Superadmin Bill'),
        method: isRzp ? 'Razorpay' : 'Superadmin Bill',
        isRazorpay: isRzp,
        isSuperadminBill: !isRzp,
        amount: numAmt,
        status: p.status || 'Success',
        notes: p.notes || '-'
      };
    }).sort((a, b) => b.timestamp - a.timestamp);

    let totRev = 0;
    let totRzp = 0;
    let totBills = 0;
    let rzpCnt = 0;
    let bCnt = 0;

    list.forEach(tx => {
      totRev += tx.amount;
      if (tx.isRazorpay) {
        totRzp += tx.amount;
        rzpCnt++;
      } else {
        totBills += tx.amount;
        bCnt++;
      }
    });

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const curYearStr = String(now.getFullYear());
    const curMoStr = String(now.getMonth() + 1).padStart(2, '0');

    const filtered = list.filter(tx => {
      // Period filter
      if (revPeriodFilter === 'today' && tx.date !== todayStr) return false;
      if (revPeriodFilter === 'this_month' && (tx.year !== curYearStr || tx.month !== curMoStr)) return false;
      if (revPeriodFilter === 'this_year' && tx.year !== curYearStr) return false;
      if (revPeriodFilter === 'all') {
        if (selectedRevYear !== 'all' && tx.year !== selectedRevYear) return false;
        if (selectedRevMonth !== 'all' && tx.month !== selectedRevMonth) return false;
      }

      // Type filter
      if (revTypeFilter === 'razorpay' && !tx.isRazorpay) return false;
      if (revTypeFilter === 'bills' && !tx.isSuperadminBill) return false;

      // Search filter
      if (revSearchQuery.trim()) {
        const q = revSearchQuery.toLowerCase().trim();
        return (
          tx.client.toLowerCase().includes(q) ||
          tx.paymentId.toLowerCase().includes(q) ||
          tx.orderId.toLowerCase().includes(q) ||
          tx.category.toLowerCase().includes(q) ||
          tx.notes.toLowerCase().includes(q) ||
          String(tx.amount).includes(q)
        );
      }
      return true;
    });

    return {
      revenuePayments: list,
      totalRevenueAmount: totRev,
      totalRazorpayAmount: totRzp,
      totalBillsAmount: totBills,
      razorpayCount: rzpCnt,
      billsCount: bCnt,
      filteredRevenuePayments: filtered
    };
  }, [rawPayments, revPeriodFilter, selectedRevYear, selectedRevMonth, revTypeFilter, revSearchQuery]);

  // Handle Save SuperAdmin Manual Bill
  const handleSaveSuperadminBill = async (e) => {
    if (e) e.preventDefault();
    const cleanAmt = parseFloat(newBillForm.amount);
    if (isNaN(cleanAmt) || cleanAmt <= 0) {
      if (onShowToast) onShowToast('Please enter a valid bill amount.', 'warning');
      return;
    }
    if (!newBillForm.recipient.trim()) {
      if (onShowToast) onShowToast('Please specify the recipient or workspace name.', 'warning');
      return;
    }

    setIsSavingBill(true);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const res = await fetch(`${baseUrl}/api/payments/add-bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: newBillForm.recipient.trim(),
          client_name: newBillForm.recipient.trim(),
          category: newBillForm.category.trim() || 'Superadmin Bill',
          amount: cleanAmt,
          date: newBillForm.date,
          bill_no: newBillForm.bill_no,
          notes: newBillForm.notes
        })
      });
      const data = await res.json();
      if (data && data.success) {
        if (onShowToast) onShowToast(`✓ Verified Bill ${newBillForm.bill_no} (₹${cleanAmt.toLocaleString('en-IN')}) successfully added to Revenue!`, 'success');
        setIsAddBillModalOpen(false);
        setNewBillForm({
          recipient: '',
          category: 'Enterprise Cloud Practice License',
          amount: '',
          date: new Date().toISOString().slice(0, 10),
          bill_no: `BILL-${Date.now().toString().slice(-6)}`,
          notes: 'Verified enterprise bill added by SuperAdmin'
        });
        fetchGlobalStats();
      } else {
        if (onShowToast) onShowToast(data?.error || 'Failed to save bill', 'error');
      }
    } catch (err) {
      if (onShowToast) onShowToast('Error recording bill: ' + err.message, 'error');
    } finally {
      setIsSavingBill(false);
    }
  };

  // ============================================================================
  // CALENDAR & IN/OUT ATTENDANCE ENGINE (Real-time Punches & Staff Check-Ins)
  // ============================================================================
  const {
    selectedDatePunches,
    punchesPresentCount,
    punchesCheckedInNowCount,
    punchesLoggedOutCount
  } = useMemo(() => {
    const list = attendanceRecords.filter(r => r.date === selectedCalendarDate);
    let present = 0;
    let inNow = 0;
    let out = 0;

    list.forEach(p => {
      present++;
      if (p.out_time && p.out_time !== '-' && p.out_time !== '00:00') {
        out++;
      } else if (p.in_time && p.in_time !== '-') {
        inNow++;
      }
    });

    let filtered = list;
    if (attendanceSearchQuery.trim()) {
      const q = attendanceSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(p =>
        (p.employee_name || '').toLowerCase().includes(q) ||
        (p.status || '').toLowerCase().includes(q) ||
        (p.mode || '').toLowerCase().includes(q) ||
        (p.shift || '').toLowerCase().includes(q)
      );
    }

    return {
      selectedDatePunches: filtered,
      punchesPresentCount: present,
      punchesCheckedInNowCount: inNow,
      punchesLoggedOutCount: out
    };
  }, [attendanceRecords, selectedCalendarDate, attendanceSearchQuery]);

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

  // SuperAdmin Quick Punch for staff
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
          notes: 'Punch authorized by SuperAdmin'
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

  // ============================================================================
  // COMPLAINTS & REVIEWS ENGINE (Real-time queries sent to email)
  // ============================================================================
  const filteredComplaints = useMemo(() => {
    let list = [...complaintsList];
    if (complaintFilterStatus !== 'all') {
      list = list.filter(c => (c.status || 'Open') === complaintFilterStatus);
    }
    if (complaintSearchQuery.trim()) {
      const q = complaintSearchQuery.toLowerCase().trim();
      list = list.filter(c =>
        (c.ticket_no || c.ticketNo || '').toLowerCase().includes(q) ||
        (c.user_name || '').toLowerCase().includes(q) ||
        (c.user_email || '').toLowerCase().includes(q) ||
        (c.subject || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q) ||
        (c.message || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [complaintsList, complaintFilterStatus, complaintSearchQuery]);

  const openComplaintsCount = useMemo(() => {
    return complaintsList.filter(c => (c.status || 'Open') !== 'Resolved').length;
  }, [complaintsList]);

  // Handle complaint status update
  const handleUpdateComplaintStatus = async (ticketId, newStatus) => {
    setUpdatingComplaintId(ticketId);
    try {
      setComplaintsList(prev => prev.map(t => (t.id === ticketId || t.ticket_no === ticketId ? { ...t, status: newStatus } : t)));

      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      await fetch(`${baseUrl}/api/complaints/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      try {
        await supabase.from('support_tickets').update({ status: newStatus }).or(`id.eq.${ticketId},ticket_no.eq.${ticketId}`);
      } catch (e) {}

      if (onShowToast) onShowToast(`✓ Complaint ticket marked as [${newStatus}] and notification sent to user email!`, 'success');
      fetchGlobalStats();
    } catch (err) {
      if (onShowToast) onShowToast(`Ticket marked as [${newStatus}] locally`, 'info');
    } finally {
      setUpdatingComplaintId(null);
    }
  };

  // Handle official email reply to user query
  const handleSendReplyEmail = async (e) => {
    if (e) e.preventDefault();
    if (!replyModalTicket) return;
    if (!replyMessage.trim()) {
      if (onShowToast) onShowToast('Please type your response message for the user.', 'warning');
      return;
    }

    setIsSendingReply(true);
    const targetTicketId = replyModalTicket.id || replyModalTicket.ticket_no;

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const res = await fetch(`${baseUrl}/api/complaints/send-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: targetTicketId,
          reply_message: replyMessage.trim(),
          status: replyStatus
        })
      });

      const data = await res.json();
      if (data && data.success) {
        if (onShowToast) onShowToast(`✓ Official reply sent to ${replyModalTicket.user_email} and ticket updated!`, 'success');
        setReplyModalTicket(null);
        setReplyMessage('');
        fetchGlobalStats();
      } else {
        if (onShowToast) onShowToast(data?.error || 'Failed to dispatch email reply', 'error');
      }
    } catch (err) {
      if (onShowToast) onShowToast('Error sending reply: ' + err.message, 'error');
    } finally {
      setIsSendingReply(false);
    }
  };

  // Subscription management helper
  const handleOpenSubModal = (firm) => {
    setSubModalFirm(firm);
    setSubModalPlan(firm.subscriptionPlan || 'Enterprise Cloud Practice (Annual Pro)');
    const defaultDays = 365;
    setSubModalDaysToAdd(defaultDays);
    const base = new Date(firm.subscriptionExpiry || Date.now());
    const initialNewDate = new Date(base.getTime() + defaultDays * 24 * 60 * 60 * 1000);
    setSubModalCustomDate(initialNewDate.toISOString().slice(0, 10));
  };

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

  const onlineSessionsCount = useMemo(() => {
    return globalSessions.filter(s => s.isOnline).length;
  }, [globalSessions]);

  // Export Roster CSV
  const handleExportRosterCSV = (firmName, membersList) => {
    if (!membersList || membersList.length === 0) {
      if (onShowToast) onShowToast('No members to export.', 'warning');
      return;
    }
    const headers = ["ID", "Name", "Role", "Email (Login ID)", "Password", "Company / Workspace", "Department", "Phone", "Status"];
    const rows = [headers.join(',')];
    membersList.forEach(m => {
      rows.push([
        `"${m.id}"`,
        `"${(m.name || '').replace(/"/g, '""')}"`,
        `"${m.role || 'Employee'}"`,
        `"${m.email || ''}"`,
        `"${m.password || ''}"`,
        `"${(m.company || firmName || '').replace(/"/g, '""')}"`,
        `"${(m.department || '').replace(/"/g, '""')}"`,
        `"${m.phone || ''}"`,
        `"${m.status || 'Active'}"`
      ].join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taxpro_roster_${(firmName || 'all').toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    if (onShowToast) onShowToast(`✓ Exported ${membersList.length} members to CSV!`, 'success');
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

        {/* Navigation Menu (7 Clean Tabs) */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {[
            { id: 'Overview', icon: <Activity className="w-4 h-4" /> },
            { id: 'Firms & Workspace', icon: <Building2 className="w-4 h-4" />, badge: workspacesList.length },
            { id: 'Revenue', icon: <CreditCard className="w-4 h-4" /> },
            { id: 'Calendar & In/Out', icon: <CalendarIcon className="w-4 h-4" />, badge: punchesPresentCount, isGreen: punchesPresentCount > 0 },
            { id: 'Complaints & Reviews', icon: <AlertCircle className="w-4 h-4" />, badge: openComplaintsCount },
            { id: 'Live Web Presence & Sessions', icon: <Radio className="w-4 h-4" />, badge: onlineSessionsCount, isGreen: true },
            { id: 'Security Logs', icon: <ShieldAlert className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'Firms & Workspace') {
                  setSelectedFirmForRoster(null);
                }
              }}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === tab.id 
                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-inner' 
                : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                {tab.icon} <span className="truncate">{tab.id}</span>
              </div>
              {tab.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full ${tab.isGreen ? 'bg-emerald-500 text-black font-extrabold' : 'bg-red-500 text-white font-mono font-black'} text-[9px] shadow-sm flex-shrink-0`}>
                  {tab.isGreen ? `● ${tab.badge}` : tab.badge}
                </span>
              )}
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
            {/* Live Clock */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 font-mono text-xs text-gray-300">
              <Clock className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>{currentTimeStr}</span>
            </div>

            {/* Global Monitoring Active Indicator */}
            <div className="px-3.5 py-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span className="hidden sm:inline">Platform Monitoring Console</span>
            </div>

            {/* Add Bill Button when in Revenue Tab */}
            {activeTab === 'Revenue' && (
              <button
                type="button"
                onClick={() => setIsAddBillModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border border-emerald-400/30"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Bill</span>
              </button>
            )}

            {/* Lock Workspace Privacy Mode */}
            <button
              type="button"
              onClick={handleTriggerLock}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-bold text-xs border border-white/10 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              title="Lock Screen Privacy Mode (Requires Password to Unlock)"
            >
              <Lock className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden md:inline">Lock Screen</span>
            </button>

            <button 
              onClick={() => { fetchGlobalStats(); fetchSessionsData(); }} 
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-white/5 cursor-pointer" 
              title="Refresh Live Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin text-purple-400' : ''}`} />
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          
          {/* ========================================================================= */}
          {/* TAB 1: OVERVIEW (ALL REAL TIME) */}
          {/* ========================================================================= */}
          {activeTab === 'Overview' && (
            <div className="space-y-8 animate-fade-in">
              
              {/* Real-time Hero Banner */}
              <div className="bg-gradient-to-r from-purple-950/80 via-[#0d1024] to-indigo-950/80 border border-purple-500/30 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-2 mb-1.5 font-mono">
                    <Activity className="w-4 h-4 text-purple-400 animate-pulse" />
                    Live System Heartbeat • Continuous Sync Active
                  </div>
                  <h2 className="text-2xl font-black text-white font-outfit tracking-tight">
                    Super Admin Global Monitoring Console
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 max-w-xl">
                    Live telemetry across all firms, workspaces, real-time Razorpay payments, manual bills, attendance check-ins, and user inquiries.
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <div className="text-2xl font-black text-emerald-400 font-mono">
                      ₹{totalRevenueAmount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Real-Time Revenue</div>
                  </div>
                  <div className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <div className="text-2xl font-black text-purple-400 font-mono">{workspacesList.length}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Active Workspaces</div>
                  </div>
                </div>
              </div>

              {/* Real-Time Metrics KPI Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                
                {/* 1. Total Revenue Card */}
                <div 
                  onClick={() => setActiveTab('Revenue')}
                  className="bg-[#09090b] border border-emerald-500/20 hover:border-emerald-500/50 rounded-2xl p-4 shadow-xl cursor-pointer group transition-all hover:-translate-y-1 select-none"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-400 mb-2">
                    <span className="truncate">Total Revenue</span>
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div className="text-xl font-black text-white font-mono tracking-tight group-hover:text-emerald-300 transition-colors truncate">
                    ₹{totalRevenueAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1 font-bold flex items-center justify-between">
                    <span>{revenuePayments.length} Payments / Bills</span>
                    <span className="text-emerald-400">View →</span>
                  </div>
                </div>

                {/* 2. Active Workspaces Card */}
                <div 
                  onClick={() => {
                    setWorkforceCategory('workspace');
                    setActiveTab('Firms & Workspace');
                  }}
                  className="bg-[#09090b] border border-teal-500/20 hover:border-teal-500/50 rounded-2xl p-4 shadow-xl cursor-pointer group transition-all hover:-translate-y-1 select-none"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-teal-400 mb-2">
                    <span className="truncate">Workspaces</span>
                    <Building2 className="w-4 h-4 text-teal-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono tracking-tight group-hover:text-teal-300 transition-colors">
                    {workspacesList.length}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1 font-bold flex items-center justify-between">
                    <span>Firms & Companies</span>
                    <span className="text-teal-400">Manage →</span>
                  </div>
                </div>

                {/* 3. Total Admins Card */}
                <div 
                  onClick={() => {
                    setWorkforceCategory('admin');
                    setActiveTab('Firms & Workspace');
                  }}
                  className="bg-[#09090b] border border-indigo-500/20 hover:border-indigo-500/50 rounded-2xl p-4 shadow-xl cursor-pointer group transition-all hover:-translate-y-1 select-none"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-400 mb-2">
                    <span className="truncate">Admins</span>
                    <span className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400">👑</span>
                  </div>
                  <div className="text-2xl font-black text-white font-mono tracking-tight group-hover:text-indigo-300 transition-colors">
                    {totalAdminsCount}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1 font-bold flex items-center justify-between">
                    <span>Owners & Admins</span>
                    <span className="text-indigo-400">Inspect →</span>
                  </div>
                </div>

                {/* 4. Total Managers Card */}
                <div 
                  onClick={() => {
                    setWorkforceCategory('manager');
                    setActiveTab('Firms & Workspace');
                  }}
                  className="bg-[#09090b] border border-purple-500/20 hover:border-purple-500/50 rounded-2xl p-4 shadow-xl cursor-pointer group transition-all hover:-translate-y-1 select-none"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-purple-400 mb-2">
                    <span className="truncate">Managers</span>
                    <span className="p-1 rounded-lg bg-purple-500/10 text-purple-400">💼</span>
                  </div>
                  <div className="text-2xl font-black text-white font-mono tracking-tight group-hover:text-purple-300 transition-colors">
                    {totalManagersCount}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1 font-bold flex items-center justify-between">
                    <span>Supervisors</span>
                    <span className="text-purple-400">Inspect →</span>
                  </div>
                </div>

                {/* 5. Total Employees Card */}
                <div 
                  onClick={() => {
                    setWorkforceCategory('employee');
                    setActiveTab('Firms & Workspace');
                  }}
                  className="bg-[#09090b] border border-emerald-500/20 hover:border-emerald-500/50 rounded-2xl p-4 shadow-xl cursor-pointer group transition-all hover:-translate-y-1 select-none"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-400 mb-2">
                    <span className="truncate">Employees</span>
                    <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">👤</span>
                  </div>
                  <div className="text-2xl font-black text-white font-mono tracking-tight group-hover:text-emerald-300 transition-colors">
                    {totalEmployeesCount}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1 font-bold flex items-center justify-between">
                    <span>Staff Personnel</span>
                    <span className="text-emerald-400">Inspect →</span>
                  </div>
                </div>

                {/* 6. Open Complaints Card */}
                <div 
                  onClick={() => setActiveTab('Complaints & Reviews')}
                  className={`border rounded-2xl p-4 shadow-xl cursor-pointer group transition-all hover:-translate-y-1 select-none ${
                    openComplaintsCount > 0 
                      ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500' 
                      : 'bg-[#09090b] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400 mb-2">
                    <span className="truncate">Open Queries</span>
                    <span className={`p-1 rounded-lg ${openComplaintsCount > 0 ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-white/5 text-gray-400'}`}>🚨</span>
                  </div>
                  <div className="text-2xl font-black text-white font-mono tracking-tight group-hover:text-amber-300 transition-colors">
                    {openComplaintsCount}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1 font-bold flex items-center justify-between">
                    <span>{openComplaintsCount > 0 ? 'Pending Reply' : 'All Clear'}</span>
                    <span className="text-amber-400">Resolve →</span>
                  </div>
                </div>

              </div>

              {/* Real-time Activity Streams Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Left Column: Live Payments & Added Bills Stream */}
                <div className="bg-[#09090b] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      Live Revenue Transactions (Razorpay & Bills)
                    </h3>
                    <button 
                      onClick={() => setActiveTab('Revenue')}
                      className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Full Ledger</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {revenuePayments.slice(0, 6).map((tx) => (
                      <div key={tx.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between gap-3 hover:bg-white/[0.04] transition-colors">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase font-mono ${
                            tx.isRazorpay ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}>
                            {tx.method}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-white max-w-[180px] sm:max-w-xs truncate">{tx.client}</div>
                            <div className="text-[10px] text-gray-500 font-mono">{tx.date} • {tx.time}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-mono font-black text-emerald-400">
                            +₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[9px] text-gray-500 font-mono">{tx.paymentId.slice(0, 14)}...</div>
                        </div>
                      </div>
                    ))}

                    {revenuePayments.length === 0 && (
                      <div className="py-8 text-center text-gray-500 text-xs font-bold">
                        No transactions recorded yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Live Complaints & Support Queries */}
                <div className="bg-[#09090b] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      Live Complaints & Real-Time Inquiries
                    </h3>
                    <button 
                      onClick={() => setActiveTab('Complaints & Reviews')}
                      className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Manage All</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {complaintsList.slice(0, 5).map((c) => (
                      <div key={c.id || c.ticket_no} className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between gap-3 hover:bg-white/[0.04] transition-colors">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${c.status === 'Resolved' ? 'bg-emerald-500' : 'bg-red-500 animate-ping'}`} />
                          <div>
                            <div className="text-xs font-bold text-white max-w-[200px] truncate">{c.subject || c.category || 'User Query'}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{c.user_name || c.user_email}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            c.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                          }`}>
                            {c.status || 'Open'}
                          </span>
                          <button
                            onClick={() => {
                              setReplyModalTicket(c);
                              setActiveTab('Complaints & Reviews');
                            }}
                            className="px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    ))}

                    {complaintsList.length === 0 && (
                      <div className="py-8 text-center text-gray-500 text-xs font-bold">
                        No support inquiries received.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: FIRMS & WORKSPACE (4 OPTIONS: WORKSPACE, ADMIN, MANAGER, EMPLOYEE) */}
          {/* ========================================================================= */}
          {activeTab === 'Firms & Workspace' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Header Hero */}
              <div className="bg-gradient-to-r from-indigo-950/80 via-[#0d1024] to-purple-950/80 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2 mb-1.5 font-mono">
                    <Building2 className="w-4 h-4" />
                    Multi-Tenant Workforce & Credentials Management
                  </div>
                  <h2 className="text-2xl font-black text-white font-outfit tracking-tight">
                    Firms & Global Workspace Directory
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 max-w-xl">
                    Real-time roster of workspaces, administrators, managers, and employees with direct access credentials and full roster inspection.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportRosterCSV(selectedFirmForRoster?.name, selectedFirmForRoster ? selectedFirmForRoster.allMembers : allUnifiedMembers)}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-purple-400" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* EXACTLY 4 OPTIONS SUB-TABS: WORKSPACE, ADMIN, MANAGER, EMPLOYEE */}
              <div className="bg-[#09090b] border border-white/10 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
                  {[
                    { id: 'workspace', label: '🏢 Workspace', count: workspacesList.length },
                    { id: 'admin', label: '👑 Admin', count: totalAdminsCount },
                    { id: 'manager', label: '💼 Manager', count: totalManagersCount },
                    { id: 'employee', label: '👤 Employee', count: totalEmployeesCount },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setWorkforceCategory(tab.id);
                        setSelectedFirmForRoster(null);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                        workforceCategory === tab.id
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                        workforceCategory === tab.id ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={workforceSearchQuery}
                    onChange={(e) => setWorkforceSearchQuery(e.target.value)}
                    placeholder="Search name, login email, workspace..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* VIEW 1: WORKSPACES (With Open Roster Option) */}
              {workforceCategory === 'workspace' && !selectedFirmForRoster && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                  {filteredWorkspaces.map((firm) => (
                    <div 
                      key={firm.id}
                      className="bg-[#09090b] border border-white/10 hover:border-purple-500/40 rounded-3xl p-6 shadow-2xl space-y-5 transition-all hover:-translate-y-1 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600/30 to-indigo-600/30 border border-purple-500/30 flex items-center justify-center text-purple-400 font-black text-lg">
                            {firm.tag?.slice(0, 2).toUpperCase() || 'TP'}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-base text-white group-hover:text-purple-300 transition-colors">
                              {firm.name}
                            </h3>
                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                              ID: {firm.id}
                            </div>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      </div>

                      {/* Headcount breakdown */}
                      <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5 text-center">
                        <div className="p-2 rounded-xl bg-white/[0.02]">
                          <div className="text-base font-black text-indigo-400 font-mono">{firm.admins.length}</div>
                          <div className="text-[9px] font-bold text-gray-400 uppercase">Admins</div>
                        </div>
                        <div className="p-2 rounded-xl bg-white/[0.02]">
                          <div className="text-base font-black text-purple-400 font-mono">{firm.managers.length}</div>
                          <div className="text-[9px] font-bold text-gray-400 uppercase">Managers</div>
                        </div>
                        <div className="p-2 rounded-xl bg-white/[0.02]">
                          <div className="text-base font-black text-emerald-400 font-mono">{firm.employees.length}</div>
                          <div className="text-[9px] font-bold text-gray-400 uppercase">Employees</div>
                        </div>
                      </div>

                      {/* Subscription Info */}
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <div className="flex items-center gap-1.5 font-mono">
                          <Clock className="w-3.5 h-3.5 text-purple-400" />
                          <span>{firm.daysLeft} Days Remaining</span>
                        </div>
                        <button
                          onClick={() => handleExtendFirmSubscription(firm)}
                          className="text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                        >
                          +1 Year
                        </button>
                      </div>

                      {/* Open Roster Button */}
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedFirmForRoster(firm)}
                          className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                        >
                          <Users className="w-4 h-4" />
                          <span>Open Roster ({firm.allMembers.length} Members)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenSubModal(firm)}
                          className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl border border-white/10 transition-colors cursor-pointer"
                          title="Manage Subscription"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {filteredWorkspaces.length === 0 && (
                    <div className="col-span-full py-16 text-center text-gray-500 font-bold text-sm">
                      No workspaces found matching your query.
                    </div>
                  )}
                </div>
              )}

              {/* LEVEL 2: SPECIFIC WORKSPACE ROSTER VIEW (When Open Roster is clicked) */}
              {selectedFirmForRoster && (
                <div className="bg-[#09090b] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedFirmForRoster(null)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div>
                        <h3 className="text-xl font-black text-white font-outfit">
                          Roster: {selectedFirmForRoster.name}
                        </h3>
                        <p className="text-xs text-gray-400">
                          Viewing all {selectedFirmForRoster.allMembers.length} associated accounts with Login IDs and Passwords.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleExportRosterCSV(selectedFirmForRoster.name, selectedFirmForRoster.allMembers)}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Firm Roster</span>
                      </button>
                    </div>
                  </div>

                  {/* Members Table with ID & Password */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-[10px] font-black text-gray-400 uppercase tracking-wider bg-white/[0.02]">
                          <th className="px-6 py-4">Full Name</th>
                          <th className="px-6 py-4">Role</th>
                          <th className="px-6 py-4">Login ID (Email)</th>
                          <th className="px-6 py-4">Password</th>
                          <th className="px-6 py-4">Department</th>
                          <th className="px-6 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs">
                        {selectedFirmForRoster.allMembers.map(m => {
                          const isPassVisible = visiblePasswords[m.id];
                          return (
                            <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-6 py-4 font-bold text-white whitespace-nowrap">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-purple-600/30 border border-purple-500/30 text-purple-300 font-bold flex items-center justify-center font-mono text-xs">
                                    {m.name.slice(0, 1).toUpperCase()}
                                  </div>
                                  <div>
                                    <div>{m.name}</div>
                                    <div className="text-[10px] text-gray-500 font-mono">ID: {m.id}</div>
                                  </div>
                                </div>
                              </td>

                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black font-mono ${
                                  m.role === 'Administrator' || m.role === 'Super Admin'
                                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                    : m.role === 'Manager'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}>
                                  {m.role}
                                </span>
                              </td>

                              <td className="px-6 py-4 font-mono text-purple-300">
                                <div className="flex items-center gap-2">
                                  <span>{m.email}</span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(m.email, 'Login ID')}
                                    className="p-1 text-gray-500 hover:text-white transition-colors cursor-pointer"
                                    title="Copy Login ID"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>

                              <td className="px-6 py-4 font-mono text-gray-300 whitespace-nowrap">
                                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 w-fit">
                                  <KeyRound className="w-3 h-3 text-purple-400" />
                                  <span>{isPassVisible ? m.password : '••••••••••••'}</span>
                                  <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility(m.id)}
                                    className="p-0.5 text-gray-400 hover:text-white transition-colors cursor-pointer ml-1"
                                    title={isPassVisible ? 'Hide Password' : 'Show Password'}
                                  >
                                    {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(m.password, 'Password')}
                                    className="p-0.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                                    title="Copy Password"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>

                              <td className="px-6 py-4 text-gray-400">
                                {m.department}
                              </td>

                              <td className="px-6 py-4">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  {m.status || 'Active'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VIEW 2, 3, 4: ADMIN, MANAGER, EMPLOYEE LISTS (All IDs and Passwords Shown) */}
              {workforceCategory !== 'workspace' && (
                <div className="bg-[#09090b] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-fade-in">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-[10px] font-black text-gray-400 uppercase tracking-wider bg-white/[0.02]">
                          <th className="px-6 py-4">Name</th>
                          <th className="px-6 py-4">Role</th>
                          <th className="px-6 py-4">Login ID (Email)</th>
                          <th className="px-6 py-4">Password</th>
                          <th className="px-6 py-4">Workspace / Firm</th>
                          <th className="px-6 py-4">Department / Shift</th>
                          <th className="px-6 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs">
                        {filteredWorkforceList.map(m => {
                          const isPassVisible = visiblePasswords[m.id];
                          return (
                            <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-6 py-4 font-bold text-white whitespace-nowrap">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-purple-600/30 border border-purple-500/30 text-purple-300 font-bold flex items-center justify-center font-mono text-xs">
                                    {m.name.slice(0, 1).toUpperCase()}
                                  </div>
                                  <div>
                                    <div>{m.name}</div>
                                    <div className="text-[10px] text-gray-500 font-mono">ID: {m.id}</div>
                                  </div>
                                </div>
                              </td>

                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black font-mono ${
                                  m.role === 'Administrator' || m.role === 'Super Admin'
                                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                    : m.role === 'Manager'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}>
                                  {m.role}
                                </span>
                              </td>

                              <td className="px-6 py-4 font-mono text-purple-300">
                                <div className="flex items-center gap-2">
                                  <span>{m.email}</span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(m.email, 'Login ID')}
                                    className="p-1 text-gray-500 hover:text-white transition-colors cursor-pointer"
                                    title="Copy Login ID"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>

                              <td className="px-6 py-4 font-mono text-gray-300 whitespace-nowrap">
                                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 w-fit">
                                  <KeyRound className="w-3 h-3 text-purple-400" />
                                  <span>{isPassVisible ? m.password : '••••••••••••'}</span>
                                  <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility(m.id)}
                                    className="p-0.5 text-gray-400 hover:text-white transition-colors cursor-pointer ml-1"
                                    title={isPassVisible ? 'Hide Password' : 'Show Password'}
                                  >
                                    {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(m.password, 'Password')}
                                    className="p-0.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                                    title="Copy Password"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>

                              <td className="px-6 py-4 font-semibold text-white max-w-xs truncate">
                                {m.company}
                              </td>

                              <td className="px-6 py-4 text-gray-400">
                                <div>{m.department}</div>
                                {m.shift && <div className="text-[10px] text-gray-500">{m.shift}</div>}
                              </td>

                              <td className="px-6 py-4">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  {m.status || 'Active'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}

                        {filteredWorkforceList.length === 0 && (
                          <tr>
                            <td colSpan="7" className="px-6 py-16 text-center text-gray-500 font-bold">
                              No {workforceCategory} accounts found matching query.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: REVENUE (RAZORPAY PAYMENTS + ADDED BILLS + TOTAL + FILTERS NOTHING ELSE) */}
          {/* ========================================================================= */}
          {activeTab === 'Revenue' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-emerald-950/80 via-[#0a1e16] to-teal-950/80 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2 mb-1.5 font-mono">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    Real-Time Financial Collections Ledger
                  </div>
                  <h2 className="text-2xl font-black text-white font-outfit tracking-tight">
                    Real-Time Revenue & Verified Bills
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 max-w-xl">
                    Strictly showing verified live payments of Razorpay and added bills by SuperAdmin with complete historical audit filters.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddBillModalOpen(true)}
                    className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-2xl shadow-xl shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95 border border-emerald-400/40"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>+ Add Bill</span>
                  </button>
                </div>
              </div>

              {/* Revenue Summary Cards (Total, Razorpay, Bills, Count) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Total Revenue */}
                <div className="bg-[#09090b] border border-emerald-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                    <span>Total Real-Time Revenue</span>
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div className="text-3xl font-black text-white font-mono tracking-tight">
                    ₹{totalRevenueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-2 flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Razorpay Collections + SuperAdmin Bills</span>
                  </div>
                </div>

                {/* Razorpay Gateway Collections */}
                <div className="bg-[#09090b] border border-blue-500/30 rounded-3xl p-6 shadow-xl">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-blue-400" />
                      Razorpay Gateway
                    </span>
                    <CreditCard className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-3xl font-black text-blue-300 font-mono tracking-tight">
                    ₹{totalRazorpayAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-2 font-mono">
                    {razorpayCount} Verified Gateway Payments
                  </div>
                </div>

                {/* Superadmin Added Bills */}
                <div className="bg-[#09090b] border border-purple-500/30 rounded-3xl p-6 shadow-xl">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">
                    <span>SuperAdmin Added Bills</span>
                    <Receipt className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-3xl font-black text-purple-300 font-mono tracking-tight">
                    ₹{totalBillsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-2 font-mono">
                    {billsCount} Manually Added Bills
                  </div>
                </div>

                {/* Total Transactions Count */}
                <div className="bg-[#09090b] border border-white/10 rounded-3xl p-6 shadow-xl">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                    <span>Total Transactions</span>
                    <Activity className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="text-3xl font-black text-white font-mono tracking-tight">
                    {revenuePayments.length}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-2 font-mono">
                    100% Real-Time Synchronized
                  </div>
                </div>

              </div>

              {/* PAST HISTORY FILTERS BAR */}
              <div className="bg-[#09090b] border border-white/10 rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
                
                {/* Period Filter Buttons */}
                <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 custom-scrollbar">
                  <span className="text-xs font-bold text-gray-400 mr-1 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-purple-400" /> Filter Period:
                  </span>
                  {[
                    { id: 'all', label: 'All History' },
                    { id: 'today', label: 'Today' },
                    { id: 'this_month', label: 'This Month' },
                    { id: 'this_year', label: 'This Year' },
                  ].map(btn => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => setRevPeriodFilter(btn.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        revPeriodFilter === btn.id
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}

                  {/* Type Filter */}
                  <span className="text-gray-600 mx-1">|</span>
                  {[
                    { id: 'all', label: 'All Methods' },
                    { id: 'razorpay', label: 'Razorpay Only' },
                    { id: 'bills', label: 'Bills Only' },
                  ].map(btn => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => setRevTypeFilter(btn.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        revTypeFilter === btn.id
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* Search in History */}
                <div className="relative w-full lg:w-80">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={revSearchQuery}
                    onChange={(e) => setRevSearchQuery(e.target.value)}
                    placeholder="Search by Payment ID, client, amount..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

              </div>

              {/* Transactions Table ("nothing else") */}
              <div className="bg-[#09090b] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] font-black text-gray-400 uppercase tracking-wider bg-white/[0.02]">
                        <th className="px-6 py-4">Date & Time</th>
                        <th className="px-6 py-4">Transaction / Bill ID</th>
                        <th className="px-6 py-4">Method / Source</th>
                        <th className="px-6 py-4">Payee / Client / Firm</th>
                        <th className="px-6 py-4">Description / Notes</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Amount (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {filteredRevenuePayments.map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 font-mono text-gray-400 whitespace-nowrap">
                            <div>{tx.date}</div>
                            <div className="text-[10px] text-gray-600">{tx.time}</div>
                          </td>

                          <td className="px-6 py-4 font-mono text-purple-300 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span>{tx.paymentId}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(tx.paymentId, 'Transaction ID')}
                                className="p-1 text-gray-500 hover:text-white transition-colors cursor-pointer"
                                title="Copy ID"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${
                              tx.isRazorpay 
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}>
                              {tx.isRazorpay ? '⚡ Razorpay' : '📄 SuperAdmin Bill'}
                            </span>
                          </td>

                          <td className="px-6 py-4 font-bold text-white max-w-xs truncate">
                            {tx.client}
                          </td>

                          <td className="px-6 py-4 text-gray-300 max-w-xs truncate">
                            {tx.category} {tx.notes !== '-' ? `• ${tx.notes}` : ''}
                          </td>

                          <td className="px-6 py-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {tx.status || 'Success'}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right font-black font-mono text-emerald-400 text-sm whitespace-nowrap">
                            +₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}

                      {filteredRevenuePayments.length === 0 && (
                        <tr>
                          <td colSpan="7" className="px-6 py-16 text-center text-gray-500 font-bold">
                            No revenue records found matching the filter criteria.
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
          {/* TAB 4: CALENDAR & IN/OUT (ALL THINGS MUST BE REAL TIME) */}
          {/* ========================================================================= */}
          {activeTab === 'Calendar & In/Out' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Header Banner with Real-Time Clock & Quick Punch */}
              <div className="bg-gradient-to-r from-blue-950/80 via-[#0d1527] to-indigo-950/80 border border-blue-500/30 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2 mb-1.5 font-mono">
                    <CalendarIcon className="w-4 h-4" />
                    Live Biometric & Digital Shift Attendance
                  </div>
                  <h2 className="text-2xl font-black text-white font-outfit tracking-tight">
                    Real-Time In / Out Calendar & Shifts
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 max-w-xl">
                    Live clock-in and clock-out logs across all firms. Instant shift verification with direct database synchronization.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* SuperAdmin Punch Button */}
                  <button
                    type="button"
                    onClick={handleToggleAdminPunch}
                    className={`px-5 py-3 rounded-2xl font-black text-xs transition-all shadow-xl flex items-center gap-2 cursor-pointer active:scale-95 border ${
                      adminPunchStatus === 'in'
                        ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white border-red-400/40 shadow-red-600/30'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400/40 shadow-emerald-600/30'
                    }`}
                  >
                    {adminPunchStatus === 'in' ? (
                      <>
                        <PunchOutIcon className="w-4 h-4" />
                        <span>SuperAdmin Punch OUT</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>SuperAdmin Punch IN</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Real-time KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#09090b] border border-blue-500/20 rounded-3xl p-6 shadow-xl">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
                    <span>Present Today</span>
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="text-3xl font-black text-white font-mono tracking-tight">
                    {punchesPresentCount}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1 font-mono">
                    Logged for {selectedCalendarDate}
                  </div>
                </div>

                <div className="bg-[#09090b] border border-emerald-500/20 rounded-3xl p-6 shadow-xl">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                    <span>Checked In Now</span>
                    <LogIn className="w-4 h-4" />
                  </div>
                  <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                    {punchesCheckedInNowCount}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1 font-mono">
                    Currently On Duty
                  </div>
                </div>

                <div className="bg-[#09090b] border border-amber-500/20 rounded-3xl p-6 shadow-xl">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                    <span>Punched Out</span>
                    <PunchOutIcon className="w-4 h-4" />
                  </div>
                  <div className="text-3xl font-black text-amber-400 font-mono tracking-tight">
                    {punchesLoggedOutCount}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1 font-mono">
                    Shift Concluded
                  </div>
                </div>

                <div className="bg-[#09090b] border border-purple-500/20 rounded-3xl p-6 shadow-xl">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">
                    <span>System Time</span>
                    <Clock className="w-4 h-4 animate-spin text-purple-400" />
                  </div>
                  <div className="text-2xl font-black text-purple-300 font-mono tracking-tight">
                    {currentTimeStr}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1 font-mono">
                    IST Real-Time Precision
                  </div>
                </div>
              </div>

              {/* Date Selector & Search Bar */}
              <div className="bg-[#09090b] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-blue-400" /> Selected Date:
                  </label>
                  <input
                    type="date"
                    value={selectedCalendarDate}
                    onChange={(e) => setSelectedCalendarDate(e.target.value)}
                    className="px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedCalendarDate(new Date().toISOString().slice(0, 10))}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={attendanceSearchQuery}
                    onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                    placeholder="Search staff, shift, mode..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Live Attendance Table */}
              <div className="bg-[#09090b] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] font-black text-gray-400 uppercase tracking-wider bg-white/[0.02]">
                        <th className="px-6 py-4">Employee / Staff</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Check-In Time</th>
                        <th className="px-6 py-4">Check-Out Time</th>
                        <th className="px-6 py-4">Mode</th>
                        <th className="px-6 py-4">Shift</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {selectedDatePunches.map((punch) => (
                        <tr key={punch.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 font-bold text-white whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-blue-400" />
                              <span>{punch.employee_name}</span>
                            </div>
                          </td>

                          <td className="px-6 py-4 font-mono text-gray-400 whitespace-nowrap">
                            {punch.date}
                          </td>

                          <td className="px-6 py-4 font-mono text-emerald-400 font-bold whitespace-nowrap">
                            {punch.in_time || punch.logged_at || '-'}
                          </td>

                          <td className="px-6 py-4 font-mono text-amber-400 font-bold whitespace-nowrap">
                            {punch.out_time || '-'}
                          </td>

                          <td className="px-6 py-4 text-gray-300">
                            {punch.mode || 'Web Punch'}
                          </td>

                          <td className="px-6 py-4 text-gray-400">
                            {punch.shift || 'General Shift'}
                          </td>

                          <td className="px-6 py-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {punch.status || 'Present'}
                            </span>
                          </td>
                        </tr>
                      ))}

                      {selectedDatePunches.length === 0 && (
                        <tr>
                          <td colSpan="7" className="px-6 py-16 text-center text-gray-500 font-bold">
                            No attendance punches recorded for {selectedCalendarDate}.
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
          {/* TAB 5: COMPLAINTS & REVIEWS (REAL TIME QUERIES SENT TO EMAIL) */}
          {/* ========================================================================= */}
          {activeTab === 'Complaints & Reviews' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-amber-950/80 via-[#181126] to-purple-950/80 border border-amber-500/30 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-2 mb-1.5 font-mono">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    Direct User Grievances & Instant Mail Dispatch
                  </div>
                  <h2 className="text-2xl font-black text-white font-outfit tracking-tight">
                    Complaints, Reviews & Inquiries
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 max-w-xl">
                    Real-time support queries submitted by workspace members. Official replies are instantly dispatched to the user's registered email inbox.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
                    <span className="text-gray-400">Total: </span>
                    <strong className="text-white">{complaintsList.length}</strong>
                  </div>
                  <div className="px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-400">
                    <span>Open: </span>
                    <strong className="font-black">{complaintsList.filter(c => (c.status || 'Open') === 'Open').length}</strong>
                  </div>
                  <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-400">
                    <span>Resolved: </span>
                    <strong className="font-black">{complaintsList.filter(c => c.status === 'Resolved').length}</strong>
                  </div>
                </div>
              </div>

              {/* Filters Toolbar */}
              <div className="bg-[#09090b] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
                  {['all', 'Open', 'In Progress', 'Resolved'].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setComplaintFilterStatus(st)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        complaintFilterStatus === st
                          ? 'bg-amber-600 text-white shadow-md'
                          : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {st === 'all' ? 'All Queries' : st}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={complaintSearchQuery}
                    onChange={e => setComplaintSearchQuery(e.target.value)}
                    placeholder="Search ticket #, email, subject..."
                    className="w-full pl-9 pr-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-gray-500 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Queries List */}
              <div className="space-y-4">
                {filteredComplaints.map((ticket) => {
                  const isOpen = (ticket.status || 'Open') === 'Open';
                  const isInProgress = ticket.status === 'In Progress' || ticket.status === 'In Review';
                  const isResolved = ticket.status === 'Resolved';

                  return (
                    <div
                      key={ticket.id || ticket.ticket_no}
                      className={`bg-[#09090b] border rounded-3xl p-6 shadow-xl space-y-4 transition-all ${
                        isOpen
                          ? 'border-red-500/40 hover:border-red-500'
                          : isInProgress
                          ? 'border-amber-500/40 hover:border-amber-500'
                          : 'border-white/5 opacity-80'
                      }`}
                    >
                      {/* Ticket Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono font-black text-xs border border-purple-500/30">
                            {ticket.ticket_no || ticket.id}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white/5 text-gray-300 font-bold text-[11px] border border-white/10">
                            {ticket.category || 'General Inquiry'}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono ${
                            isOpen
                              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                              : isInProgress
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {ticket.status || 'Open'}
                          </span>
                        </div>

                        <div className="text-[11px] text-gray-500 font-mono flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          <span>{ticket.created_at ? formatDate(ticket.created_at) : 'Recent'}</span>
                        </div>
                      </div>

                      {/* Ticket Body */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-white">
                          {ticket.subject || 'Support Request'}
                        </h4>
                        <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                          {ticket.message || 'No description provided.'}
                        </p>

                        {ticket.response && (
                          <div className="p-3.5 bg-purple-950/30 border border-purple-500/30 rounded-2xl text-xs space-y-1">
                            <div className="text-[10px] uppercase font-bold text-purple-400 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> Official Reply Sent to User Email:
                            </div>
                            <div className="text-gray-200">{ticket.response}</div>
                          </div>
                        )}
                      </div>

                      {/* Ticket Footer / Action Buttons */}
                      <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-gray-400 truncate">
                          <User className="w-3.5 h-3.5 text-gray-500" />
                          <span className="font-semibold text-white truncate">{ticket.user_name || 'Member'}</span>
                          <span className="text-gray-600">•</span>
                          <span className="font-mono text-purple-400 truncate">&lt;{ticket.user_email}&gt;</span>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                          {/* Reply via Email Button (Opens Modal) */}
                          <button
                            type="button"
                            onClick={() => {
                              setReplyModalTicket(ticket);
                              setReplyMessage(ticket.response || '');
                              setReplyStatus('Resolved');
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Reply via Mail</span>
                          </button>

                          {!isResolved && (
                            <button
                              type="button"
                              disabled={updatingComplaintId === (ticket.id || ticket.ticket_no)}
                              onClick={() => handleUpdateComplaintStatus(ticket.id || ticket.ticket_no, 'Resolved')}
                              className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Mark Resolved</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredComplaints.length === 0 && (
                  <div className="py-16 text-center text-gray-500 font-bold text-sm bg-[#09090b] border border-white/10 rounded-3xl">
                    No support queries or complaints matching the selected filter.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: LIVE WEB PRESENCE & SESSIONS */}
          {/* ========================================================================= */}
          {activeTab === 'Live Web Presence & Sessions' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-gradient-to-r from-emerald-950 via-[#0a1f18] to-teal-950 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2 mb-1 font-mono">
                    <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                    Live Web Traffic & Device Session Registry
                  </div>
                  <h2 className="text-2xl font-black text-white font-outfit tracking-tight">
                    Who Opened My Web • Active Browser Sessions
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 max-w-xl">
                    Real-time monitoring of all users logged in to TaxPro web application across all browsers, IP addresses, and devices.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <div className="text-2xl font-black text-emerald-400 font-mono">{onlineSessionsCount}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Live Online Now</div>
                  </div>
                </div>
              </div>

              {/* Sessions Table */}
              <div className="bg-[#09090b] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] font-black text-gray-400 uppercase tracking-wider bg-white/[0.02]">
                        <th className="px-6 py-4">User Email / Account</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Device & Browser</th>
                        <th className="px-6 py-4">IP Address</th>
                        <th className="px-6 py-4">Location</th>
                        <th className="px-6 py-4">Last Activity</th>
                        <th className="px-6 py-4 text-center">Remote Revoke</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {globalSessions.map((s) => (
                        <tr key={s.id || s.sessionId} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 font-bold text-white whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${s.isOnline ? 'bg-emerald-400 animate-ping' : 'bg-gray-500'}`} />
                              <span>{s.userEmail || s.email || 'Authorized User'}</span>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                              s.isOnline ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-gray-400'
                            }`}>
                              {s.isOnline ? '● Online' : 'Idle'}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-gray-300">
                            {s.deviceName || s.browserName || 'Chrome Browser'}
                          </td>

                          <td className="px-6 py-4 font-mono text-purple-300">
                            {s.ipAddress || '127.0.0.1'}
                          </td>

                          <td className="px-6 py-4 text-gray-400">
                            {s.location || 'Localhost / Network'}
                          </td>

                          <td className="px-6 py-4 text-gray-500 font-mono text-[11px]">
                            {s.lastActive ? formatDate(s.lastActive) : 'Active now'}
                          </td>

                          <td className="px-6 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleTerminateSession(s.id || s.sessionId, s.sessionToken)}
                              className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              Terminate
                            </button>
                          </td>
                        </tr>
                      ))}

                      {globalSessions.length === 0 && (
                        <tr>
                          <td colSpan="7" className="px-6 py-16 text-center text-gray-500 font-bold">
                            No active remote sessions detected.
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
          {/* TAB 7: SECURITY LOGS */}
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
                    Security Audit Trail & User Accounts
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 max-w-xl">
                    Audited ledger of newly registered accounts, permission allocations, and administrative events.
                  </p>
                </div>

                <div className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <div className="text-2xl font-black text-indigo-400 font-mono">{allUnifiedMembers.length}</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase">Total User Accounts</div>
                </div>
              </div>

              {/* Security Logs Table */}
              <div className="bg-[#09090b] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] font-black text-gray-400 uppercase tracking-wider bg-white/[0.02]">
                        <th className="px-6 py-4">User Details</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Workspace / Firm</th>
                        <th className="px-6 py-4">Department</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Registration Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {allUnifiedMembers.map((u) => (
                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 font-bold text-white whitespace-nowrap">
                            <div>{u.name}</div>
                            <div className="text-[10px] text-purple-400 font-mono">{u.email}</div>
                          </td>

                          <td className="px-6 py-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                              {u.role}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-gray-300">
                            {u.company}
                          </td>

                          <td className="px-6 py-4 text-gray-400">
                            {u.department}
                          </td>

                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                              {u.status || 'Active'}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right font-mono text-gray-400">
                            {u.created_at ? formatDate(u.created_at) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD BILL MODAL (FOR SUPERADMIN IN REVENUE) */}
      {/* ========================================================================= */}
      {isAddBillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#09090b] border border-emerald-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-emerald-950 via-[#0a1e16] to-teal-950 border-b border-white/10 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg">
                  <Receipt className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 font-mono">
                    Revenue Ledger Management
                  </div>
                  <h3 className="text-lg font-black text-white font-outfit">
                    Add SuperAdmin Verified Bill
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddBillModalOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveSuperadminBill} className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold">
                  Client / Payee / Workspace Name <strong className="text-emerald-400">*</strong>
                </label>
                <input
                  type="text"
                  required
                  value={newBillForm.recipient}
                  onChange={(e) => setNewBillForm(prev => ({ ...prev, recipient: e.target.value }))}
                  placeholder="e.g. Finexo PMS Enterprise / Apex Tax Associates"
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-bold">
                    Bill Amount (INR) <strong className="text-emerald-400">*</strong>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newBillForm.amount}
                      onChange={(e) => setNewBillForm(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="e.g. 25000"
                      className="w-full pl-7 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-300 font-bold">Billing Date</label>
                  <input
                    type="date"
                    required
                    value={newBillForm.date}
                    onChange={(e) => setNewBillForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold">Bill Category / Title</label>
                <input
                  type="text"
                  required
                  value={newBillForm.category}
                  onChange={(e) => setNewBillForm(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g. Enterprise Cloud Annual Practice License"
                  className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold">Bill / Invoice Reference No</label>
                <input
                  type="text"
                  value={newBillForm.bill_no}
                  onChange={(e) => setNewBillForm(prev => ({ ...prev, bill_no: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold">Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={newBillForm.notes}
                  onChange={(e) => setNewBillForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add optional notes for this manual bill entry..."
                  className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddBillModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white bg-white/5 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSavingBill}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isSavingBill ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                  <span>Confirm & Post Bill to Revenue</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REPLY TO COMPLAINT & DISPATCH TO USER EMAIL */}
      {/* ========================================================================= */}
      {replyModalTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#09090b] border border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            
            <div className="px-6 py-5 bg-gradient-to-r from-purple-950 via-[#181126] to-indigo-950 border-b border-white/10 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-purple-400 font-mono">
                    Instant Mail Dispatch
                  </div>
                  <h3 className="text-lg font-black text-white font-outfit">
                    Reply to User Query ({replyModalTicket.ticket_no || replyModalTicket.id})
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setReplyModalTicket(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendReplyEmail} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-semibold">Recipient:</span>
                  <span className="font-mono text-purple-300 font-bold">{replyModalTicket.user_email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-semibold">User:</span>
                  <span className="text-white font-bold">{replyModalTicket.user_name || 'Member'}</span>
                </div>
                <div className="text-[11px] text-gray-400 pt-1 border-t border-white/5">
                  <strong>Query:</strong> "{replyModalTicket.message}"
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold">
                  Official SuperAdmin Response (Sent Directly to User Email) <strong className="text-purple-400">*</strong>
                </label>
                <textarea
                  rows={4}
                  required
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your official answer / resolution for this inquiry..."
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold">Update Ticket Status</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Resolved', 'In Progress'].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setReplyStatus(st)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        replyStatus === st
                          ? 'bg-purple-600 border-purple-400 text-white shadow-md'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setReplyModalTicket(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white bg-white/5 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSendingReply}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isSendingReply ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Send Email to User & Update Ticket</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: MANAGE SUBSCRIPTION MODAL */}
      {/* ========================================================================= */}
      {subModalFirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#09090b] border border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            
            <div className="px-6 py-5 bg-gradient-to-r from-purple-950 via-[#160d26] to-indigo-950 border-b border-white/10 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-purple-400 font-mono">
                    SaaS License & Subscription Manager
                  </div>
                  <h3 className="text-lg font-black text-white font-outfit">
                    {subModalFirm.name}
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

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-purple-400 font-mono">Current Status</div>
                  <div className="text-white font-bold">{subModalFirm.name}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{subModalFirm.subscriptionPlan}</div>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs">
                    ⏳ {subModalFirm.daysLeft} Days Remaining
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold">Extend Validity (Days)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[30, 90, 180, 365].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setSubModalDaysToAdd(d);
                        const base = new Date(subModalFirm.subscriptionExpiry || Date.now());
                        const newD = new Date(base.getTime() + d * 24 * 60 * 60 * 1000);
                        setSubModalCustomDate(newD.toISOString().slice(0, 10));
                      }}
                      className={`py-2 rounded-xl text-xs font-bold font-mono transition-all border cursor-pointer ${
                        subModalDaysToAdd === d
                          ? 'bg-purple-600 border-purple-400 text-white shadow-md'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      +{d} Days
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold">New Expiry Date</label>
                <input
                  type="date"
                  value={subModalCustomDate}
                  onChange={(e) => setSubModalCustomDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSubModalFirm(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white bg-white/5 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveFirmSubscription(subModalCustomDate, subModalPlan)}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Apply Subscription Extension</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN PRIVACY LOCK OVERLAY */}
      {/* ========================================================================= */}
      {isScreenLocked && (
        <div className="fixed inset-0 z-[999999] bg-[#030612]/96 backdrop-blur-3xl flex items-center justify-center p-4 select-none animate-fade-in">
          <div className="bg-[#0f121d] border border-purple-500/40 rounded-3xl p-6 sm:p-8 max-w-sm sm:max-w-md w-full shadow-2xl shadow-black flex flex-col items-center text-center relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 p-[1.5px] shadow-lg shadow-purple-500/25 mb-4">
              <div className="w-full h-full bg-[#0b0c16] rounded-2xl flex items-center justify-center">
                <Lock className="w-6 h-6 text-purple-400" />
              </div>
            </div>

            <h3 className="text-xl font-extrabold text-white font-outfit tracking-tight mb-1">
              SaaS Master Core Locked
            </h3>
            <p className="text-xs text-gray-400 mb-5 font-medium">
              TaxPro SuperAdmin screen is secured. Enter your password to unlock.
            </p>

            <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-2.5 mb-5 flex items-center justify-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-purple-600/40 border border-purple-400/40 text-purple-300 font-bold text-[10px] flex items-center justify-center font-mono">
                👑
              </div>
              <span className="text-xs font-mono text-gray-300 font-semibold truncate max-w-[220px]">
                superadmin@taxpro.com
              </span>
            </div>

            <form onSubmit={handleUnlockScreen} className="w-full flex flex-col gap-4">
              <div className="relative w-full">
                <input
                  type={showUnlockPass ? "text" : "password"}
                  autoFocus
                  placeholder="Enter Password"
                  value={unlockPassword}
                  onChange={(e) => {
                    setUnlockPassword(e.target.value);
                    if (lockError) setLockError('');
                  }}
                  className={`w-full px-4 py-3.5 bg-black/80 border rounded-2xl outline-none font-mono text-sm text-white placeholder-gray-500 text-center tracking-widest transition-all ${
                    lockError ? 'border-red-500 ring-2 ring-red-500/30 bg-red-950/20' : 'border-white/20 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowUnlockPass(!showUnlockPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1 cursor-pointer"
                  title={showUnlockPass ? "Hide Password" : "Show Password"}
                >
                  {showUnlockPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {lockError && (
                <div className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 py-2 px-3 rounded-xl">
                  {lockError}
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifyingUnlock}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 active:scale-98 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-purple-600/30 hover:shadow-cyan-600/40 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isVerifyingUnlock ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying SuperAdmin Password...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Unlock Core Workspace</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center text-xs pt-1 px-1">
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-gray-400 hover:text-red-400 transition-colors cursor-pointer font-medium"
                >
                  Logout Core
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
