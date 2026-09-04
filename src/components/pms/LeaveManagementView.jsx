import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Plus, 
  Search, 
  Filter, 
  Coffee, 
  User, 
  Building2, 
  CheckCheck, 
  Trash2, 
  RefreshCw, 
  X, 
  CalendarCheck, 
  CheckSquare, 
  FileText, 
  Printer, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  HeartPulse,
  Sun,
  Flame,
  HelpCircle,
  Settings2,
  Sliders,
  History,
  RotateCcw
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { logAuditActivity } from '../../lib/auditLogger';
import soundFX from '../../lib/audioFX';
import { formatDate, formatDateTime } from '../../lib/dateUtils';

// Default annual leave policy quotas set by Admin
const DEFAULT_LEAVE_POLICY = {
  casualQuota: 12,
  sickQuota: 10,
  earnedQuota: 18
};

// Initial Seed Leaves to make the UI rich, interactive and immediately usable
const DEFAULT_LEAVES = [
  {
    id: 'LV-1001',
    applicantName: 'Vikram Mehta',
    applicantEmail: 'vikram.mehta@taxpro.local',
    applicantRole: 'Employee',
    department: 'Tax Audit & Compliance',
    leaveType: 'Casual Leave (CL)',
    startDate: '2026-08-28',
    endDate: '2026-08-29',
    totalDays: 2,
    reason: 'Family ceremony and out of station travel.',
    handoverTo: 'Priya Sharma',
    emergencyPhone: '+91 98765 43210',
    status: 'Pending', // 'Pending' | 'Approved' | 'Rejected'
    appliedAt: '2026-08-23T10:30:00Z',
    approvedBy: null,
    approverRole: null,
    approvedAt: null,
    overruledBy: null,
    rejectionReason: null
  },
  {
    id: 'LV-1002',
    applicantName: 'Ananya Roy',
    applicantEmail: 'ananya.roy@taxpro.local',
    applicantRole: 'Employee',
    department: 'GST & Indirect Tax',
    leaveType: 'Sick Leave (SL)',
    startDate: '2026-08-20',
    endDate: '2026-08-22',
    totalDays: 3,
    reason: 'Viral fever and prescribed medical rest.',
    handoverTo: 'Rahul Deshmukh',
    emergencyPhone: '+91 98234 56789',
    status: 'Approved',
    appliedAt: '2026-08-19T08:15:00Z',
    approvedBy: 'Vikram Mehta',
    approverRole: 'Manager',
    approvedAt: '2026-08-19T09:00:00Z',
    overruledBy: null,
    rejectionReason: null
  },
  {
    id: 'LV-1003',
    applicantName: 'Rajesh Kumar',
    applicantEmail: 'rajesh.kumar@taxpro.local',
    applicantRole: 'Employee',
    department: 'Accounting & Payroll',
    leaveType: 'Casual Leave (CL)',
    startDate: '2026-08-10',
    endDate: '2026-08-13',
    totalDays: 4,
    reason: 'Personal family vacation.',
    handoverTo: 'Neha Gupta',
    emergencyPhone: '+91 99887 76655',
    status: 'Approved',
    appliedAt: '2026-08-08T14:20:00Z',
    approvedBy: 'Administrator',
    approverRole: 'Admin',
    approvedAt: '2026-08-08T15:00:00Z',
    overruledBy: null,
    rejectionReason: null
  }
];

export default function LeaveManagementView({ userRole, onShowToast }) {
  const currentUserName = localStorage.getItem('taxpro_user_name') || localStorage.getItem('taxpro_user_fullname') || 'Administrator';
  const currentUserEmail = localStorage.getItem('taxpro_user_email') || 'admin@taxpro.local';
  const activeRole = userRole || localStorage.getItem('taxpro_user_role') || 'Admin';
  
  const isSuperAdmin = activeRole === 'Super Admin';
  const isAdmin = activeRole === 'Admin' || activeRole === 'Administrator' || isSuperAdmin;
  const isManager = activeRole === 'Manager';
  const canApproveLeaves = isAdmin || isManager;

  // Admin Policy Quotas State
  const [leavePolicy, setLeavePolicy] = useState(() => {
    try {
      const saved = localStorage.getItem('taxpro_leave_policy');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_LEAVE_POLICY;
  });
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [policyForm, setPolicyForm] = useState({ ...leavePolicy });

  // Leaves state
  const [leaves, setLeaves] = useState(() => {
    try {
      const cached = localStorage.getItem('taxpro_leave_requests');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return DEFAULT_LEAVES;
  });

  const [teamMembers, setTeamMembers] = useState([]);
  const [activeTab, setActiveTab] = useState(canApproveLeaves ? 'Pending' : 'MyLeaves'); // 'Pending' | 'Approved' | 'Rejected' | 'All' | 'MyLeaves'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [isLoading, setIsLoading] = useState(false);

  // Apply Leave Modal state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'Casual Leave (CL)',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    reason: '',
    handoverTo: '',
    emergencyPhone: ''
  });

  // Rejection reason prompt modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState(null);
  const [rejectReasonText, setRejectReasonText] = useState('');

  // Admin Overrule Decision Modal
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideTargetLeave, setOverrideTargetLeave] = useState(null);
  const [overrideDecision, setOverrideDecision] = useState('Approved'); // 'Approved' | 'Rejected'
  const [overrideNote, setOverrideNote] = useState('');

  // Fetch team members
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const { data } = await supabase.from('team_members').select('name, role, department, email');
        if (data && data.length > 0) {
          setTeamMembers(data);
        }
      } catch (e) {}
    };
    fetchMembers();

    // Listen to leaves updates
    const handleLeavesUpdated = (e) => {
      if (e.detail) {
        setLeaves(e.detail);
      } else {
        try {
          const cached = localStorage.getItem('taxpro_leave_requests');
          if (cached) setLeaves(JSON.parse(cached));
        } catch (err) {}
      }
    };
    window.addEventListener('taxpro_leaves_updated', handleLeavesUpdated);
    window.addEventListener('storage', handleLeavesUpdated);
    return () => {
      window.removeEventListener('taxpro_leaves_updated', handleLeavesUpdated);
      window.removeEventListener('storage', handleLeavesUpdated);
    };
  }, []);

  // Save leaves helper
  const saveLeaves = (updatedList) => {
    setLeaves(updatedList);
    try {
      localStorage.setItem('taxpro_leave_requests', JSON.stringify(updatedList));
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('taxpro_leaves_updated', { detail: updatedList }));
    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
  };

  // Save policy helper
  const handleSavePolicy = (e) => {
    e.preventDefault();
    const updated = {
      casualQuota: Number(policyForm.casualQuota) || 12,
      sickQuota: Number(policyForm.sickQuota) || 10,
      earnedQuota: Number(policyForm.earnedQuota) || 18
    };
    setLeavePolicy(updated);
    localStorage.setItem('taxpro_leave_policy', JSON.stringify(updated));
    setIsPolicyModalOpen(false);

    logAuditActivity({
      action: 'UPDATE_LEAVE_POLICY',
      module: 'Leaves',
      details: `Administrator updated annual leave quotas (CL: ${updated.casualQuota}, SL: ${updated.sickQuota}, EL: ${updated.earnedQuota})`,
      metadata: updated
    });

    if (onShowToast) onShowToast('✓ Annual Leave Policy Quotas updated by Administrator!', 'success');
  };

  // Calculate day difference
  const calculateDays = (start, end, type) => {
    if (!start || !end) return 1;
    if (type && type.toLowerCase().includes('half day')) return 0.5;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  };

  // DYNAMIC LEAVE BALANCES FOR LOGGED IN USER
  // If user applies for sick leave and admin/manager approves it, out of total quota the remaining number decreases!
  const userBalances = useMemo(() => {
    const cleanUser = (currentUserName || '').toLowerCase().trim();
    const cleanEmail = (currentUserEmail || '').toLowerCase().trim();

    // Approved leaves for this user
    const myApprovedLeaves = leaves.filter(l => {
      if (l.status !== 'Approved') return false;
      const applicant = (l.applicantName || '').toLowerCase().trim();
      const email = (l.applicantEmail || '').toLowerCase().trim();
      return applicant.includes(cleanUser) || cleanUser.includes(applicant) || (email && email === cleanEmail);
    });

    const approvedCL = myApprovedLeaves
      .filter(l => l.leaveType?.includes('Casual'))
      .reduce((acc, curr) => acc + Number(curr.totalDays || 0), 0);

    const approvedSL = myApprovedLeaves
      .filter(l => l.leaveType?.includes('Sick'))
      .reduce((acc, curr) => acc + Number(curr.totalDays || 0), 0);

    const approvedEL = myApprovedLeaves
      .filter(l => l.leaveType?.includes('Earned'))
      .reduce((acc, curr) => acc + Number(curr.totalDays || 0), 0);

    const remainingCL = Math.max(0, leavePolicy.casualQuota - approvedCL);
    const remainingSL = Math.max(0, leavePolicy.sickQuota - approvedSL);
    const remainingEL = Math.max(0, leavePolicy.earnedQuota - approvedEL);
    const totalAvailed = approvedCL + approvedSL + approvedEL;

    return {
      remainingCL,
      totalCL: leavePolicy.casualQuota,
      approvedCL,
      remainingSL,
      totalSL: leavePolicy.sickQuota,
      approvedSL,
      remainingEL,
      totalEL: leavePolicy.earnedQuota,
      approvedEL,
      totalAvailed
    };
  }, [leaves, currentUserName, currentUserEmail, leavePolicy]);

  // Handle Submit Leave Application
  const handleSubmitLeave = (e) => {
    e.preventDefault();
    if (!leaveForm.reason.trim()) {
      if (onShowToast) onShowToast('Please provide a reason for your leave application.', 'warning');
      return;
    }

    const calculatedDays = calculateDays(leaveForm.startDate, leaveForm.endDate, leaveForm.leaveType);
    
    const newLeave = {
      id: `LV-${Date.now()}`,
      applicantName: currentUserName,
      applicantEmail: currentUserEmail,
      applicantRole: activeRole,
      department: localStorage.getItem('taxpro_user_department') || 'Tax Practice',
      leaveType: leaveForm.leaveType,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      totalDays: calculatedDays,
      reason: leaveForm.reason.trim(),
      handoverTo: leaveForm.handoverTo || 'Team Colleague',
      emergencyPhone: leaveForm.emergencyPhone || '',
      status: 'Pending',
      appliedAt: new Date().toISOString(),
      approvedBy: null,
      approverRole: null,
      approvedAt: null,
      overruledBy: null,
      rejectionReason: null
    };

    const updated = [newLeave, ...leaves];
    saveLeaves(updated);

    try {
      soundFX.playSuccess();
    } catch (e) {}

    logAuditActivity({
      action: 'APPLY_LEAVE',
      module: 'Leaves',
      details: `${currentUserName} (${activeRole}) submitted a ${newLeave.leaveType} application for ${calculatedDays} day(s)`,
      metadata: { leaveId: newLeave.id, days: calculatedDays, type: newLeave.leaveType }
    });

    if (onShowToast) onShowToast(`✓ Leave Application (${calculatedDays} day(s)) submitted for ${canApproveLeaves ? 'review' : 'Admin/Manager Approval'}!`, 'success');
    setIsApplyModalOpen(false);
    setLeaveForm({
      leaveType: 'Casual Leave (CL)',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      reason: '',
      handoverTo: '',
      emergencyPhone: ''
    });
  };

  // 1-Click APPROVE LEAVE (By Manager or Admin)
  const handleApproveLeave = (leaveId) => {
    const leaveToApprove = leaves.find(l => l.id === leaveId);
    if (!leaveToApprove) return;

    const approverTitle = isAdmin ? 'Administrator' : 'Manager';

    const updated = leaves.map(l => {
      if (l.id === leaveId) {
        return {
          ...l,
          status: 'Approved',
          approvedBy: currentUserName,
          approverRole: activeRole,
          approvedAt: new Date().toISOString(),
          overruledBy: null,
          rejectionReason: null
        };
      }
      return l;
    });

    saveLeaves(updated);

    // Sync with local attendance records
    try {
      const start = new Date(leaveToApprove.startDate);
      const end = new Date(leaveToApprove.endDate);
      const cur = new Date(start);
      while (cur <= end) {
        const ymd = cur.toISOString().slice(0, 10);
        const attendanceKey = `taxpro_punch_${ymd}`;
        const existingPunch = JSON.parse(localStorage.getItem(attendanceKey) || 'null') || {};
        localStorage.setItem(attendanceKey, JSON.stringify({
          ...existingPunch,
          status: `On Leave: ${leaveToApprove.leaveType}`,
          shift: `Leave Approved by ${approverTitle} (${currentUserName})`,
          mode: 'Approved Leave Application',
          isPresent: false,
          hours: '0 hrs'
        }));
        cur.setDate(cur.getDate() + 1);
      }
    } catch (e) {}

    try {
      soundFX.playSuccess();
    } catch (e) {}

    logAuditActivity({
      action: 'APPROVE_LEAVE',
      module: 'Leaves',
      details: `${approverTitle} ${currentUserName} approved leave for ${leaveToApprove.applicantName} (${leaveToApprove.totalDays} day(s) - ${leaveToApprove.leaveType})`,
      metadata: { leaveId, applicant: leaveToApprove.applicantName, approverRole: activeRole }
    });

    if (onShowToast) onShowToast(`✓ Approved leave for ${leaveToApprove.applicantName}! ${leaveToApprove.leaveType} balance updated.`, 'success');
  };

  // REJECT LEAVE (By Manager or Admin)
  const handleRejectLeave = (e) => {
    e.preventDefault();
    if (!rejectTargetId) return;

    const targetLeave = leaves.find(l => l.id === rejectTargetId);
    const approverTitle = isAdmin ? 'Administrator' : 'Manager';

    const updated = leaves.map(l => {
      if (l.id === rejectTargetId) {
        return {
          ...l,
          status: 'Rejected',
          approvedBy: currentUserName,
          approverRole: activeRole,
          approvedAt: new Date().toISOString(),
          rejectionReason: rejectReasonText.trim() || 'Declined due to critical client deliverables schedule.'
        };
      }
      return l;
    });

    saveLeaves(updated);

    logAuditActivity({
      action: 'REJECT_LEAVE',
      module: 'Leaves',
      details: `${approverTitle} ${currentUserName} declined leave for ${targetLeave?.applicantName}`,
      metadata: { leaveId: rejectTargetId, reason: rejectReasonText, approverRole: activeRole }
    });

    if (onShowToast) onShowToast(`✕ Leave request for ${targetLeave?.applicantName} has been declined.`, 'info');
    setRejectModalOpen(false);
    setRejectTargetId(null);
    setRejectReasonText('');
  };

  // ADMIN OVERRULE / CHANGE MANAGER DECISION
  const handleExecuteAdminOverride = (e) => {
    e.preventDefault();
    if (!overrideTargetLeave) return;

    const newStatus = overrideDecision;
    const previousApprover = overrideTargetLeave.approvedBy ? `${overrideTargetLeave.approvedBy} (${overrideTargetLeave.approverRole || 'Manager'})` : 'Previous Decision';

    const updated = leaves.map(l => {
      if (l.id === overrideTargetLeave.id) {
        return {
          ...l,
          status: newStatus,
          overruledBy: `Administrator (${currentUserName})`,
          approvedBy: currentUserName,
          approverRole: 'Admin (Overrule)',
          approvedAt: new Date().toISOString(),
          rejectionReason: newStatus === 'Rejected' ? (overrideNote.trim() || `Overruled by Administrator ${currentUserName}`) : null
        };
      }
      return l;
    });

    saveLeaves(updated);

    // Sync with attendance if changed
    if (newStatus === 'Approved') {
      try {
        const start = new Date(overrideTargetLeave.startDate);
        const end = new Date(overrideTargetLeave.endDate);
        const cur = new Date(start);
        while (cur <= end) {
          const ymd = cur.toISOString().slice(0, 10);
          const attendanceKey = `taxpro_punch_${ymd}`;
          const existingPunch = JSON.parse(localStorage.getItem(attendanceKey) || 'null') || {};
          localStorage.setItem(attendanceKey, JSON.stringify({
            ...existingPunch,
            status: `On Leave: ${overrideTargetLeave.leaveType}`,
            shift: `Admin Overrule Approval (${currentUserName})`,
            mode: 'Admin Overrule',
            isPresent: false,
            hours: '0 hrs'
          }));
          cur.setDate(cur.getDate() + 1);
        }
      } catch (e) {}
    }

    try {
      soundFX.playSuccess();
    } catch (e) {}

    logAuditActivity({
      action: 'ADMIN_OVERRULE_LEAVE',
      module: 'Leaves',
      details: `Administrator ${currentUserName} overruled decision for ${overrideTargetLeave.applicantName} -> Changed to ${newStatus}. (Prior: ${previousApprover})`,
      metadata: { leaveId: overrideTargetLeave.id, newStatus, overrideNote }
    });

    if (onShowToast) onShowToast(`⚡ Admin Overrule: Changed decision to ${newStatus} for ${overrideTargetLeave.applicantName}!`, 'success');
    setOverrideModalOpen(false);
    setOverrideTargetLeave(null);
    setOverrideNote('');
  };

  // WITHDRAW LEAVE (ONLY FOR APPLICANT THEMSELVES IN PENDING STATE)
  const handleWithdrawLeave = (leaveId) => {
    const targetLeave = leaves.find(l => l.id === leaveId);
    if (!targetLeave) return;

    // Safety check: only applicant can withdraw, and only while pending
    const cleanUser = (currentUserName || '').toLowerCase().trim();
    const isMine = (targetLeave.applicantName || '').toLowerCase().includes(cleanUser);
    if (!isMine && !isAdmin) {
      if (onShowToast) onShowToast('You can only withdraw your own leave applications.', 'error');
      return;
    }

    const updated = leaves.filter(l => l.id !== leaveId);
    saveLeaves(updated);

    if (onShowToast) onShowToast(`Leave application withdrawn successfully.`, 'info');
  };

  // Filtered leaves calculation
  const filteredLeaves = useMemo(() => {
    return leaves.filter(l => {
      // In "My Leave Applications" tab, strictly show applicant's own leaves
      if (activeTab === 'MyLeaves') {
        const cleanUser = (currentUserName || '').toLowerCase().trim();
        const cleanEmail = (currentUserEmail || '').toLowerCase().trim();
        const isMine = 
          (l.applicantName || '').toLowerCase().includes(cleanUser) ||
          cleanUser.includes((l.applicantName || '').toLowerCase()) ||
          (l.applicantEmail && l.applicantEmail.toLowerCase() === cleanEmail);
        if (!isMine) return false;
      }

      // Status tab filters
      if (activeTab === 'Pending' && l.status !== 'Pending') return false;
      if (activeTab === 'Approved' && l.status !== 'Approved') return false;
      if (activeTab === 'Rejected' && l.status !== 'Rejected') return false;

      // Type filter
      if (filterType !== 'All' && !l.leaveType.toLowerCase().includes(filterType.toLowerCase())) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (l.applicantName || '').toLowerCase().includes(q);
        const reasonMatch = (l.reason || '').toLowerCase().includes(q);
        const deptMatch = (l.department || '').toLowerCase().includes(q);
        const typeMatch = (l.leaveType || '').toLowerCase().includes(q);
        if (!nameMatch && !reasonMatch && !deptMatch && !typeMatch) return false;
      }

      return true;
    });
  }, [leaves, activeTab, filterType, searchQuery, currentUserName, currentUserEmail]);

  // Overall metric stats
  const stats = useMemo(() => {
    const total = leaves.length;
    const pending = leaves.filter(l => l.status === 'Pending').length;
    const approved = leaves.filter(l => l.status === 'Approved').length;
    const rejected = leaves.filter(l => l.status === 'Rejected').length;
    return { total, pending, approved, rejected };
  }, [leaves]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in font-sans">
      
      {/* 1. TOP HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#181c32] via-[#202747] to-[#1e1e2d] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/20 relative overflow-hidden">
        
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/30 text-amber-300 border border-amber-500/40 uppercase tracking-wider flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5 text-amber-400" />
                {isAdmin ? 'Firm Leave Administration' : isManager ? 'Manager Time-Off & Approval Desk' : 'Employee Leave Desk'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-gray-300 border border-white/10">
                {activeRole}
              </span>
              {isAdmin && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  ⚡ Decision Authority: Administrator Can Overrule
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white font-outfit tracking-tight">
              {isAdmin ? 'Leave Applications, Quotas & Approvals Hub' : isManager ? 'Team Leave Approvals & Applications' : 'Ask Leave & My Balances'}
            </h1>
            
            <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
              {isAdmin
                ? 'Review team leave requests, grant approvals with automatic attendance deduction, adjust annual firm quotas, or overrule managerial decisions when required.'
                : isManager 
                  ? 'Approve or reject employee leave applications for your department, track approved leaves, and submit your own time-off requests.'
                  : 'Apply for official leaves, check your dynamic remaining quotas (automatically deducted upon approval), and monitor real-time review status.'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setPolicyForm({ ...leavePolicy });
                  setIsPolicyModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border border-white/15 shadow-sm"
                title="Configure standard annual leave quotas"
              >
                <Settings2 className="w-4 h-4 text-purple-300" />
                <span>Configure Quota Policy</span>
              </button>
            )}

            {!isAdmin && (
              <button
                onClick={() => setIsApplyModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-orange-500/30 hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                <span>+ Apply for Leave (Ask Leave)</span>
              </button>
            )}
          </div>

        </div>

        {/* 2. LEAVE BALANCES & KPI STATS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10 relative z-10">
          
          {/* Casual Leave Quota (Decided by Admin, dynamically reduced on approval) */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
            <div className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Casual Leave (CL)</div>
            <div className="text-xl sm:text-2xl font-black font-mono text-white mt-1">
              {userBalances.remainingCL} / {userBalances.totalCL} <span className="text-xs text-gray-400 font-sans font-normal">Days Left</span>
            </div>
            <div className="text-[10px] text-cyan-300/80 mt-1 flex items-center gap-1">
              <Sun className="w-3 h-3 text-cyan-400" /> Casual quota (Used: {userBalances.approvedCL}d)
            </div>
          </div>

          {/* Sick Leave Quota (Medical Balance decided by Admin, reduced on approval) */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
            <div className="text-[10px] font-black uppercase tracking-wider text-rose-300">Sick Leave (SL)</div>
            <div className="text-xl sm:text-2xl font-black font-mono text-white mt-1">
              {userBalances.remainingSL} / {userBalances.totalSL} <span className="text-xs text-gray-400 font-sans font-normal">Days Left</span>
            </div>
            <div className="text-[10px] text-rose-300/80 mt-1 flex items-center gap-1">
              <HeartPulse className="w-3 h-3 text-rose-400" /> Medical balance (Used: {userBalances.approvedSL}d)
            </div>
          </div>

          {/* Earned Leave Quota */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Earned Leave (EL)</div>
            <div className="text-xl sm:text-2xl font-black font-mono text-white mt-1">
              {userBalances.remainingEL} / {userBalances.totalEL} <span className="text-xs text-gray-400 font-sans font-normal">Days Left</span>
            </div>
            <div className="text-[10px] text-emerald-300/80 mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-400" /> Privilege quota (Used: {userBalances.approvedEL}d)
            </div>
          </div>

          {/* Pending Reviews / Availed Summary */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-300">
              {canApproveLeaves ? 'Pending Queue' : 'Total Leaves Availed'}
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-400 mt-1">
              {canApproveLeaves ? `${stats.pending} Requests` : `${userBalances.totalAvailed} Days Availed`}
            </div>
            <div className="text-[10px] text-amber-300/80 mt-1 flex items-center gap-1">
              <Coffee className="w-3 h-3 text-amber-400" /> {canApproveLeaves ? 'Awaiting decision' : 'Approved time-off'}
            </div>
          </div>

        </div>

      </div>

      {/* 3. FILTER TABS & SEARCH CONTROLS */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {canApproveLeaves ? (
              [
                { id: 'Pending', label: '🟡 Pending Approvals', count: stats.pending },
                { id: 'Approved', label: '🟢 Approved Leaves', count: stats.approved },
                { id: 'Rejected', label: '🔴 Rejected Leaves', count: stats.rejected },
                { id: 'MyLeaves', label: '📝 My Own Applications', count: leaves.filter(l => (l.applicantName || '').toLowerCase().includes((currentUserName || '').toLowerCase())).length },
                { id: 'All', label: '📋 All Firm Circulars', count: stats.total }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-[#5b52e0] text-white shadow-sm shadow-indigo-600/30 ring-2 ring-indigo-200'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))
            ) : (
              [
                { id: 'MyLeaves', label: '📝 My Leave Applications', count: leaves.filter(l => (l.applicantName || '').toLowerCase().includes((currentUserName || '').toLowerCase())).length },
                { id: 'All', label: '🏢 Firm Leave Circulars', count: stats.total }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-[#5b52e0] text-white shadow-sm shadow-indigo-600/30 ring-2 ring-indigo-200'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Search & Type filter */}
          <div className="flex items-center gap-2.5">
            
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Leave Types</option>
              <option value="Casual">Casual Leave (CL)</option>
              <option value="Sick">Sick Leave (SL)</option>
              <option value="Earned">Earned Leave (EL)</option>
              <option value="Half Day">Half Day</option>
            </select>

          </div>

        </div>

      </div>

      {/* 4. LEAVE APPLICATIONS CARDS & LIST */}
      {filteredLeaves.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
            🏖️
          </div>
          <h3 className="text-lg font-black text-gray-900 font-outfit">
            No leave records found under this view!
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            {activeTab === 'Pending' 
              ? 'All staff leave requests have been reviewed and decided.'
              : 'There are no leave applications matching your current filter.'}
          </p>
          <button
            onClick={() => setIsApplyModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-[#5b52e0] text-white text-xs font-bold hover:bg-indigo-600 transition-colors cursor-pointer"
          >
            + Apply for Leave Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLeaves.map((item) => {
            const isPending = item.status === 'Pending';
            const isApproved = item.status === 'Approved';
            const isRejected = item.status === 'Rejected';

            // Check if this item belongs to the currently logged in user
            const cleanUser = (currentUserName || '').toLowerCase().trim();
            const isMyApplication = (item.applicantName || '').toLowerCase().includes(cleanUser);

            // Is the viewer on "Firm Leave Circulars" tab?
            const isFirmCircularTab = activeTab === 'All';

            return (
              <div
                key={item.id}
                className={`bg-white border rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between relative hover:shadow-md ${
                  isPending 
                    ? 'border-amber-300/80 bg-amber-50/20 ring-1 ring-amber-200/50' 
                    : isApproved 
                      ? 'border-emerald-200 bg-emerald-50/10' 
                      : 'border-rose-200 bg-rose-50/10'
                }`}
              >
                <div>
                  
                  {/* Top Bar: Applicant info & Status pill */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-[#5b52e0] flex items-center justify-center font-black text-sm uppercase shadow-xs">
                        {item.applicantName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-gray-900 font-outfit">
                          {item.applicantName}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                          <span className="font-semibold text-gray-700">{item.applicantRole}</span>
                          <span>•</span>
                          <span>{item.department || 'General Practice'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isPending 
                        ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                        : isApproved 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      {isPending ? '⏳ Pending Approval' : isApproved ? '✓ Approved' : '✕ Declined'}
                    </span>
                  </div>

                  {/* Leave Details Box */}
                  <div className="p-3.5 bg-gray-50/80 border border-gray-100 rounded-xl space-y-2 text-xs">
                    
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[11px] font-extrabold">
                        {item.leaveType}
                      </span>
                      <span className="font-mono font-black text-gray-900 text-xs">
                        {item.totalDays} Day{item.totalDays > 1 ? 's' : ''} ({item.startDate === item.endDate ? formatDate(item.startDate) : `${formatDate(item.startDate)} to ${formatDate(item.endDate)}`})
                      </span>
                    </div>

                    <p className="text-xs text-gray-700 leading-relaxed font-medium">
                      "{item.reason}"
                    </p>

                    <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between text-[11px] text-gray-500 font-medium flex-wrap gap-2">
                      {item.handoverTo && (
                        <span>Handover: <strong className="text-gray-700 font-bold">{item.handoverTo}</strong></span>
                      )}
                      {item.emergencyPhone && (
                        <span>Phone: <strong className="text-gray-700 font-bold">{item.emergencyPhone}</strong></span>
                      )}
                    </div>

                  </div>

                  {/* Approval / Decision Metadata */}
                  {isApproved && item.approvedBy && (
                    <div className="mt-2.5 p-2 bg-emerald-50 rounded-lg text-[11px] text-emerald-800 flex items-center justify-between gap-1.5 border border-emerald-100 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          Approved by <strong>{item.approvedBy}</strong> ({item.approverRole || 'Manager'})
                        </span>
                      </div>
                      {item.overruledBy && (
                        <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold text-[9px]">
                          Overruled by Admin
                        </span>
                      )}
                    </div>
                  )}

                  {isRejected && item.rejectionReason && (
                    <div className="mt-2.5 p-2 bg-rose-50 rounded-lg text-[11px] text-rose-800 flex items-center justify-between gap-1.5 border border-rose-100 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>
                          Declined by <strong>{item.approvedBy || 'Management'}</strong>: <em>{item.rejectionReason}</em>
                        </span>
                      </div>
                      {item.overruledBy && (
                        <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold text-[9px]">
                          Overruled by Admin
                        </span>
                      )}
                    </div>
                  )}

                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[10px] text-gray-400 font-mono">
                    Applied: {formatDateTime(item.appliedAt)}
                  </span>

                  <div className="flex items-center gap-2 flex-wrap">
                    
                    {/* 1. APPROVAL CONTROLS (For Admin and Manager when status is Pending) */}
                    {canApproveLeaves && isPending && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectTargetId(item.id);
                            setRejectModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
                        >
                          ✕ Decline
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleApproveLeave(item.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-md shadow-emerald-600/30 cursor-pointer flex items-center gap-1.5 active:scale-95"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>✓ Approve ({isAdmin ? 'Admin' : 'Manager'})</span>
                        </button>
                      </>
                    )}

                    {/* 2. ADMIN DECISION OVERRULE (Admin can change or overrule any manager decision at any time) */}
                    {isAdmin && !isPending && (
                      <button
                        type="button"
                        onClick={() => {
                          setOverrideTargetLeave(item);
                          setOverrideDecision(item.status === 'Approved' ? 'Rejected' : 'Approved');
                          setOverrideModalOpen(true);
                        }}
                        className="px-3 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Administrator Authority: Overrule / Change Manager Decision"
                      >
                        <RotateCcw className="w-3 h-3 text-purple-600" />
                        <span>Change Decision</span>
                      </button>
                    )}

                    {/* 3. WITHDRAW BUTTON (ONLY FOR APPLICANT IN 'MY LEAVES' TAB WHILE PENDING; DISABLED IN FIRM CIRCULARS) */}
                    {isMyApplication && isPending && !isFirmCircularTab && (
                      <button
                        type="button"
                        onClick={() => handleWithdrawLeave(item.id)}
                        className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-700 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Withdraw</span>
                      </button>
                    )}

                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 5. APPLY FOR LEAVE MODAL */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => setIsApplyModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 font-outfit">
                  Apply for Leave (Ask Leave)
                </h3>
                <p className="text-xs text-gray-500">
                  Submit time-off request for review & dynamic quota deduction
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitLeave} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Leave Type *
                </label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm(prev => ({ ...prev, leaveType: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Casual Leave (CL)">🏖️ Casual Leave (CL) - {userBalances.remainingCL} / {userBalances.totalCL} Days Available</option>
                  <option value="Sick Leave (SL)">🤒 Sick Leave (SL) - {userBalances.remainingSL} / {userBalances.totalSL} Days Available (Medical)</option>
                  <option value="Earned Leave (EL)">✈️ Earned / Privilege Leave (EL) - {userBalances.remainingEL} / {userBalances.totalEL} Days Available</option>
                  <option value="Half Day (Morning)">🌗 Half Day (Morning Session)</option>
                  <option value="Half Day (Afternoon)">🌘 Half Day (Afternoon Session)</option>
                  <option value="Emergency Leave">⚡ Emergency Urgent Leave</option>
                  <option value="Maternity / Paternity Leave">👶 Maternity / Paternity Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Total days calculation banner */}
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between text-xs">
                <span className="font-medium text-gray-700">Requested Leave Duration:</span>
                <span className="font-mono font-black text-[#5b52e0] text-sm">
                  {calculateDays(leaveForm.startDate, leaveForm.endDate, leaveForm.leaveType)} Day(s)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Reason for Leave *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="State the reason for taking leave (e.g. medical illness, family ceremony, personal appointment)..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Handover Deliverables To
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Priya Sharma / Rahul"
                    value={leaveForm.handoverTo}
                    onChange={(e) => setLeaveForm(prev => ({ ...prev, handoverTo: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Emergency Phone Contact
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={leaveForm.emergencyPhone}
                    onChange={(e) => setLeaveForm(prev => ({ ...prev, emergencyPhone: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black transition-all shadow-md shadow-orange-500/30 cursor-pointer"
                >
                  Submit Application
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 6. ADMIN / MANAGER REJECTION REASON MODAL */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            
            <button
              onClick={() => setRejectModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 font-outfit">
                  Decline Leave Request
                </h3>
                <p className="text-xs text-gray-500">
                  State reason for declining ({isAdmin ? 'Admin' : 'Manager'} review)
                </p>
              </div>
            </div>

            <form onSubmit={handleRejectLeave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Reason for Declining *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Critical GST filing deadline or insufficient cover in department..."
                  value={rejectReasonText}
                  onChange={(e) => setRejectReasonText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all shadow-md shadow-rose-600/30 cursor-pointer"
                >
                  Confirm Decline
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 7. ADMIN OVERRULE DECISION MODAL */}
      {overrideModalOpen && overrideTargetLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            
            <button
              onClick={() => setOverrideModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl">
                ⚡
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 font-outfit">
                  Admin Authority: Overrule Decision
                </h3>
                <p className="text-xs text-gray-500">
                  Change the review decision for {overrideTargetLeave.applicantName}
                </p>
              </div>
            </div>

            <form onSubmit={handleExecuteAdminOverride} className="space-y-4">
              
              <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Leave ID:</span>
                  <span className="font-mono font-bold text-gray-800">{overrideTargetLeave.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Applicant:</span>
                  <span className="font-bold text-gray-900">{overrideTargetLeave.applicantName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Current Status:</span>
                  <span className="font-black text-indigo-700">{overrideTargetLeave.status}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  New Overruled Status *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOverrideDecision('Approved')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      overrideDecision === 'Approved'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    ✓ Overrule to Approved
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverrideDecision('Rejected')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      overrideDecision === 'Rejected'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    ✕ Overrule to Declined
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Admin Note / Reason for Overruling
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional note explaining the administrator overrule rationale..."
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOverrideModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-black transition-all shadow-md shadow-purple-700/30"
                >
                  Apply Admin Decision
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 8. ADMIN CONFIGURE ANNUAL LEAVE POLICY MODAL */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            
            <button
              onClick={() => setIsPolicyModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Settings2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 font-outfit">
                  Configure Annual Leave Policy
                </h3>
                <p className="text-xs text-gray-500">
                  Set firm-wide annual time-off quotas (Decided by Admin)
                </p>
              </div>
            </div>

            <form onSubmit={handleSavePolicy} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Casual Leave (CL) Total Annual Quota (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  required
                  value={policyForm.casualQuota}
                  onChange={(e) => setPolicyForm(prev => ({ ...prev, casualQuota: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-gray-400 mt-1">Default is 12 days per calendar year</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Sick Leave (SL) Total Annual Quota (Medical Balance Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  required
                  value={policyForm.sickQuota}
                  onChange={(e) => setPolicyForm(prev => ({ ...prev, sickQuota: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-gray-400 mt-1">Default is 10 days medical balance</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Earned Leave (EL) Total Annual Quota (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  required
                  value={policyForm.earnedQuota}
                  onChange={(e) => setPolicyForm(prev => ({ ...prev, earnedQuota: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-gray-400 mt-1">Default is 18 days privilege quota</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPolicyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-black transition-all shadow-md shadow-purple-700/30"
                >
                  Save Policy Quotas
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
