import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { logAuditActivity } from '../../lib/auditLogger';
import { 
  CalendarCheck, 
  CheckCircle, 
  Clock, 
  UserCheck, 
  Users, 
  Search, 
  Download, 
  Plus, 
  AlertCircle, 
  Calendar,
  Sparkles,
  RefreshCw,
  Trash2,
  CheckCircle2,
  CheckCheck,
  XCircle,
  Printer,
  ChevronLeft,
  ChevronRight,
  Sliders,
  DollarSign,
  Scissors,
  Edit3,
  Check,
  X,
  FileText,
  IndianRupee,
  Layers,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  BarChart2
} from 'lucide-react';
import MemberAttendanceDossierModal from './MemberAttendanceDossierModal';

export default function AttendancePMSView({ onShowToast }) {
  // View Mode: 'daily' | 'monthly_cuts'
  const [viewMode, setViewMode] = useState('daily');
  
  // Data States
  const [teamMembers, setTeamMembers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [payrollConfigs, setPayrollConfigs] = useState({});
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Member Dossier Modal State
  const [dossierMember, setDossierMember] = useState(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  
  // Selected Day for Daily Register (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [dailyStatusFilter, setDailyStatusFilter] = useState('ALL');

  // Selected Month & Year for Monthly Intelligence & Salary Cuts
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(String(today.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(today.getMonth() + 1).padStart(2, '0'));
  
  // Policy: Allowed Free / Paid Leaves per Month
  const [monthlyAllowedLeaves, setMonthlyAllowedLeaves] = useState(() => {
    return Number(localStorage.getItem('taxpro_allowed_monthly_leaves') || '1');
  });

  // Custom Salary Cut Overrides State (Stored by `cycleKey_memberId`)
  const [customSalaryCuts, setCustomSalaryCuts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('taxpro_attendance_custom_cuts')) || {};
    } catch(e) {
      return {};
    }
  });

  // Custom Cut Edit Modal State
  const [isCutModalOpen, setIsCutModalOpen] = useState(false);
  const [cutTargetMember, setCutTargetMember] = useState(null);
  const [customCutInput, setCustomCutInput] = useState('');
  const [cutNotesInput, setCutNotesInput] = useState('');

  // Print Document State
  const [printDocType, setPrintDocType] = useState('daily_sheet'); // 'daily_sheet' | 'monthly_cuts_register' | 'employee_slip'
  const [printEmployeeData, setPrintEmployeeData] = useState(null);

  const MONTH_NAMES = [
    { num: '01', name: 'January', days: 31 },
    { num: '02', name: 'February', days: 28 },
    { num: '03', name: 'March', days: 31 },
    { num: '04', name: 'April', days: 30 },
    { num: '05', name: 'May', days: 31 },
    { num: '06', name: 'June', days: 30 },
    { num: '07', name: 'July', days: 31 },
    { num: '08', name: 'August', days: 31 },
    { num: '09', name: 'September', days: 30 },
    { num: '10', name: 'October', days: 31 },
    { num: '11', name: 'November', days: 30 },
    { num: '12', name: 'December', days: 31 }
  ];

  // Fetch Team Members & Live Attendance Records from Database
  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [membersRes, attendanceRes] = await Promise.all([
        supabase.from('team_members').select('*').order('name', { ascending: true }),
        supabase.from('attendance').select('*')
      ]);

      if (membersRes.data) {
        setTeamMembers(membersRes.data);
      }
      if (attendanceRes.data) {
        setAttendanceRecords(attendanceRes.data);
      }

      const configs = JSON.parse(localStorage.getItem('taxpro_payroll_configs')) || {};
      setPayrollConfigs(configs);

      const history = JSON.parse(localStorage.getItem('taxpro_payroll_history')) || [];
      setPaymentHistory(history);
    } catch (err) {
      console.warn('[Attendance PMS Fetch Error]:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const handleDbUpdate = () => fetchData(true);
    window.addEventListener('taxpro_db_updated', handleDbUpdate);
    return () => window.removeEventListener('taxpro_db_updated', handleDbUpdate);
  }, []);

  // 1-CLICK DIRECT ATTENDANCE MARKING (Present, Half Day, Absent, On Leave) - Instant 0ms Latency
  const handleMarkDirectAttendance = async (member, newStatus) => {
    const targetDate = selectedDate;
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    let inTime = '09:30 AM';
    let outTime = '06:30 PM';
    let notes = `Direct Marked: ${newStatus}`;

    if (newStatus === 'Half Day') {
      outTime = '02:00 PM';
      notes = 'Half Day Shift (4 Hours)';
    } else if (newStatus === 'Absent' || newStatus === 'On Leave') {
      inTime = '-';
      outTime = '-';
      notes = newStatus === 'Absent' ? 'Unexcused Absent' : 'Approved Paid Leave';
    }

    // Check existing record
    const existingRec = attendanceRecords.find(
      r => (r.member_id === member.id || r.employee_name === member.name || r.name === member.name) &&
           (r.date === targetDate)
    );

    const recordPayload = {
      id: existingRec?.id || `ATT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      member_id: member.id,
      employee_name: member.name,
      date: targetDate,
      mode: '1-Click Direct Web',
      shift: member.shift || 'General Shift',
      status: newStatus,
      logged_at: nowTimeStr,
      in_time: inTime,
      out_time: outTime,
      notes: notes
    };

    // Instant Synchronous UI update (0ms lag)
    setAttendanceRecords(prev => {
      const filtered = prev.filter(r => !(
        (r.member_id === member.id || r.employee_name === member.name) && r.date === targetDate
      ));
      return [recordPayload, ...filtered];
    });

    if (onShowToast) onShowToast(`✓ ${member.name} marked as "${newStatus}" for ${targetDate}`, 'success');

    // Background asynchronous database persistence
    try {
      if (existingRec) {
        await supabase.from('attendance').update({
          status: newStatus,
          in_time: inTime,
          out_time: outTime,
          notes: notes,
          logged_at: nowTimeStr
        }).eq('id', existingRec.id);
      } else {
        await supabase.from('attendance').insert([recordPayload]);
      }
    } catch (e) {
      console.error('Direct attendance background sync error:', e);
    }
  };

  // Mark All Staff as Present for the active selected day
  const handleMarkAllPresent = async () => {
    const targetDate = selectedDate;
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    const newRecords = teamMembers.map(m => ({
      id: `ATT-${m.id}-${targetDate}`,
      member_id: m.id,
      employee_name: m.name,
      date: targetDate,
      mode: 'Batch Present All',
      shift: m.shift || 'General Shift',
      status: 'Present',
      logged_at: nowTimeStr,
      in_time: '09:30 AM',
      out_time: '06:30 PM',
      notes: 'Batch Marked Present All Staff'
    }));

    setAttendanceRecords(prev => {
      const filtered = prev.filter(r => r.date !== targetDate);
      return [...newRecords, ...filtered];
    });

    if (onShowToast) onShowToast(`✓ All ${teamMembers.length} team members marked Present for ${targetDate}!`, 'success');

    try {
      await supabase.from('attendance').upsert(newRecords, { onConflict: 'id' });
    } catch (e) {
      console.error('Batch attendance save error:', e);
    }
  };

  // Daily list mapping for selectedDate
  const dailyCombinedList = useMemo(() => {
    const base = teamMembers.length > 0 ? teamMembers : [];

    return base.map(member => {
      const rec = attendanceRecords.find(
        r => (r.member_id === member.id || r.employee_name === member.name || r.name === member.name) &&
             (r.date === selectedDate)
      );

      const status = rec?.status || 'Present'; // Default to Present on workday
      const inTime = rec?.in_time || rec?.logged_at || (status === 'Absent' || status === 'On Leave' ? '-' : '09:30 AM');
      const outTime = rec?.out_time || (status === 'Half Day' ? '02:00 PM' : (status === 'Absent' || status === 'On Leave' ? '-' : '06:30 PM'));

      return {
        ...member,
        status,
        inTime,
        outTime,
        rawRecord: rec || null
      };
    });
  }, [teamMembers, attendanceRecords, selectedDate]);

  // Filtered daily list
  const filteredDailyList = useMemo(() => {
    return dailyCombinedList.filter(item => {
      const matchSearch = 
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.department?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchStatus = dailyStatusFilter === 'ALL' || item.status.toUpperCase() === dailyStatusFilter.toUpperCase();

      return matchSearch && matchStatus;
    });
  }, [dailyCombinedList, searchQuery, dailyStatusFilter]);

  // Daily Stats for the selected day
  const dailyStats = useMemo(() => {
    const total = dailyCombinedList.length;
    const present = dailyCombinedList.filter(s => s.status === 'Present').length;
    const halfDay = dailyCombinedList.filter(s => s.status === 'Half Day').length;
    const absent = dailyCombinedList.filter(s => s.status === 'Absent').length;
    const onLeave = dailyCombinedList.filter(s => s.status === 'On Leave').length;
    const effectivePresent = present + onLeave + (halfDay * 0.5);
    const rate = total > 0 ? Math.round((effectivePresent / total) * 100) : 100;

    return { total, present, halfDay, absent, onLeave, effectivePresent, rate };
  }, [dailyCombinedList]);

  // =========================================================================
  // MONTHLY AGGREGATIONS & EXTRA LEAVE SALARY CUT INTELLIGENCE
  // RULE: "in leave we dont cut salary" -> Approved Leaves (On Leave) are ₹0 Cut (Fully Paid).
  // Only Absent (1.0x) and Half Day (0.5x) are subject to salary cuts!
  // =========================================================================
  const currentMonthCycleKey = `${selectedYear}-${selectedMonth}`;
  const currentMonthObj = MONTH_NAMES.find(m => m.num === selectedMonth) || MONTH_NAMES[7];

  // Standard working days in month (estimate 26 working days excluding Sundays)
  const totalMonthDays = currentMonthObj?.days || 30;
  const standardWorkingDays = Math.max(22, totalMonthDays - 4); // ~26 working days

  const monthlyStaffAuditList = useMemo(() => {
    return teamMembers.map(member => {
      // 1. Get all attendance records for this member in selected month
      const monthRecords = attendanceRecords.filter(r => {
        const isMemberMatch = r.member_id === member.id || r.employee_name === member.name || r.name === member.name;
        const isMonthMatch = (r.date && r.date.startsWith(currentMonthCycleKey));
        return isMemberMatch && isMonthMatch;
      });

      // Count statuses in this month
      let presentCount = 0;
      let halfDayCount = 0;
      let absentCount = 0;
      let onLeaveCount = 0;

      monthRecords.forEach(r => {
        if (r.status === 'Present') presentCount++;
        else if (r.status === 'Half Day') halfDayCount++;
        else if (r.status === 'Absent') absentCount++;
        else if (r.status === 'On Leave') onLeaveCount++;
      });

      // If no explicit records logged for every day, assume remaining standard days were present
      const loggedDays = presentCount + halfDayCount + absentCount + onLeaveCount;
      if (loggedDays < standardWorkingDays && loggedDays > 0) {
        presentCount += Math.max(0, standardWorkingDays - loggedDays);
      } else if (loggedDays === 0) {
        presentCount = standardWorkingDays;
      }

      // Unpaid Deductible Days: ONLY Absent (1.0x) and Half Day (0.5x). Approved Leaves (On Leave) = ₹0 Cut (Fully Paid).
      const unpaidDeductibleDays = absentCount + (halfDayCount * 0.5);

      // Base Salary calculation
      const cfg = payrollConfigs[member.id];
      const baseSalary = cfg?.salary 
        ? Number(cfg.salary) 
        : (member.salary ? Number(String(member.salary).replace(/[^0-9.]/g, '')) : 25000);

      // Daily salary rate
      const dailySalaryRate = standardWorkingDays > 0 ? (baseSalary / standardWorkingDays) : 0;

      // Auto-calculated salary deduction
      const autoCalculatedCut = Math.round(unpaidDeductibleDays * dailySalaryRate);

      // Check if Admin has set a custom override cut for this member & cycle
      const customKey = `${currentMonthCycleKey}_${member.id}`;
      const savedCustom = customSalaryCuts[customKey];
      const hasCustomCut = savedCustom && savedCustom.customAmount !== undefined && savedCustom.customAmount !== null;
      const finalCutAmount = hasCustomCut ? Number(savedCustom.customAmount) : autoCalculatedCut;

      // Final net payable salary
      const netPayableSalary = Math.max(0, baseSalary - finalCutAmount);

      return {
        member,
        baseSalary,
        dailySalaryRate,
        monthRecords,
        presentCount,
        halfDayCount,
        absentCount,
        onLeaveCount,
        unpaidDeductibleDays,
        autoCalculatedCut,
        hasCustomCut,
        finalCutAmount,
        customNotes: savedCustom?.notes || '',
        netPayableSalary
      };
    });
  }, [teamMembers, attendanceRecords, currentMonthCycleKey, standardWorkingDays, payrollConfigs, customSalaryCuts]);

  // Monthly Summary Totals
  const monthlyAggregates = useMemo(() => {
    let totalBaseSalaries = 0;
    let totalApprovedLeaves = 0;
    let totalAbsents = 0;
    let totalCuts = 0;
    let totalNetPayable = 0;

    monthlyStaffAuditList.forEach(item => {
      totalBaseSalaries += item.baseSalary;
      totalApprovedLeaves += item.onLeaveCount;
      totalAbsents += item.absentCount;
      totalCuts += item.finalCutAmount;
      totalNetPayable += item.netPayableSalary;
    });

    return {
      totalBaseSalaries,
      totalApprovedLeaves,
      totalAbsents,
      totalCuts,
      totalNetPayable,
      staffCount: monthlyStaffAuditList.length
    };
  }, [monthlyStaffAuditList]);

  // Save Custom Salary Cut Override for an Employee
  const handleSaveCustomCut = (e) => {
    if (e) e.preventDefault();
    if (!cutTargetMember) return;

    const customKey = `${currentMonthCycleKey}_${cutTargetMember.id}`;
    const cleanAmount = customCutInput === '' ? 0 : Number(customCutInput);

    const updatedCuts = {
      ...customSalaryCuts,
      [customKey]: {
        customAmount: cleanAmount,
        notes: cutNotesInput.trim(),
        updatedAt: new Date().toISOString()
      }
    };

    setCustomSalaryCuts(updatedCuts);
    localStorage.setItem('taxpro_attendance_custom_cuts', JSON.stringify(updatedCuts));

    logAuditActivity({
      action: 'UPDATE_SALARY_CUT',
      module: 'Attendance & Payroll',
      details: `Set custom leave salary cut of ₹${cleanAmount.toLocaleString('en-IN')} for "${cutTargetMember.name}" (${currentMonthObj?.name} ${selectedYear})`,
      metadata: { member: cutTargetMember.name, customAmount: cleanAmount, cycle: currentMonthCycleKey }
    });

    if (onShowToast) onShowToast(`✓ Custom salary cut of ₹${cleanAmount.toLocaleString('en-IN')} set for ${cutTargetMember.name}!`, 'success');
    setIsCutModalOpen(false);
  };

  // Reset Custom Cut to Auto Calculation
  const handleResetToAutoCut = (member) => {
    const customKey = `${currentMonthCycleKey}_${member.id}`;
    const updated = { ...customSalaryCuts };
    delete updated[customKey];
    setCustomSalaryCuts(updated);
    localStorage.setItem('taxpro_attendance_custom_cuts', JSON.stringify(updated));
    if (onShowToast) onShowToast(`Reset to automatic leave cut formula for ${member.name}.`, 'info');
  };

  // SYNC ALL CALCULATED SALARY CUTS TO PAYROLL CONFIGS (Members Payment integration)
  const handleSyncCutsToPayroll = () => {
    const currentPayrollConfigs = JSON.parse(localStorage.getItem('taxpro_payroll_configs')) || {};
    
    monthlyStaffAuditList.forEach(item => {
      const mId = item.member.id;
      currentPayrollConfigs[mId] = {
        salary: item.netPayableSalary,
        baseSalary: item.baseSalary,
        leaveDeduction: item.finalCutAmount,
        extraLeaves: item.extraLeaves,
        cycle: currentMonthCycleKey
      };
    });

    localStorage.setItem('taxpro_payroll_configs', JSON.stringify(currentPayrollConfigs));
    setPayrollConfigs(currentPayrollConfigs);

    logAuditActivity({
      action: 'SYNC_PAYROLL_CUTS',
      module: 'Attendance & Payroll',
      details: `Synced leave salary cuts (Total Deductions: ₹${monthlyAggregates.totalCuts.toLocaleString('en-IN')}) for ${currentMonthObj?.name} ${selectedYear} to Members Payment desk`,
      metadata: { cycle: currentMonthCycleKey, totalCuts: monthlyAggregates.totalCuts }
    });

    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
    window.dispatchEvent(new CustomEvent('taxpro_financial_updated'));

    if (onShowToast) onShowToast(`✓ Net salaries after leave cuts synced to Members Payment portal!`, 'success');
  };

  // PRINT HANDLERS
  const handlePrintDailySheet = () => {
    setPrintDocType('daily_sheet');
    triggerPrint(`Daily Attendance Sheet - ${selectedDate}`);
  };

  const handlePrintMonthlyCutsRegister = () => {
    setPrintDocType('monthly_cuts_register');
    triggerPrint(`Monthly Attendance & Salary Cuts Register - ${currentMonthObj?.name} ${selectedYear}`);
  };

  const handlePrintEmployeeSlip = (item) => {
    setPrintEmployeeData(item);
    setPrintDocType('employee_slip');
    triggerPrint(`Attendance & Salary Cut Voucher - ${item.member.name}`);
  };

  const triggerPrint = (title) => {
    logAuditActivity({
      action: 'PRINT_DOCUMENT',
      module: 'Attendance',
      details: `Printed ${title}`,
      metadata: { doc: title }
    });

    document.body.classList.add('printing-member-record');
    if (onShowToast) onShowToast(`Preparing ${title}...`, 'info');

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-member-record');
      }, 1200);
    }, 350);
  };

  // CSV Export
  const exportToCSV = () => {
    const headers = ['Staff Name', 'Role', 'Department', 'Date', 'Status', 'Check-In', 'Check-Out'];
    const rows = filteredDailyList.map(s => [
      `"${s.name}"`,
      `"${s.role || 'Staff'}"`,
      `"${s.department || 'General'}"`,
      `"${selectedDate}"`,
      `"${s.status}"`,
      `"${s.inTime}"`,
      `"${s.outTime}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TaxPro_Attendance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f8fafc] min-h-screen text-slate-800 font-sans printable-area-container">
      
      {/* 1. TOP HEADER & VIEW MODE SWITCHER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
              Workforce Presence & Payroll Governance
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-outfit text-slate-900 tracking-tight">
            Attendance & Salary Cut Register
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            1-Click mark daily staff presence, track monthly leave quotas, calculate extra leave salary cuts, and export printable slips.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-[#5b52e0] text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Daily Live Register</span>
            </button>

            <button
              onClick={() => setViewMode('monthly_cuts')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                viewMode === 'monthly_cuts'
                  ? 'bg-[#5b52e0] text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Monthly Leaves & Salary Cuts</span>
            </button>
          </div>

          {viewMode === 'daily' ? (
            <button
              onClick={handlePrintDailySheet}
              className="px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
              title="Print daily attendance sheet"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>Print Day Sheet</span>
            </button>
          ) : (
            <button
              onClick={handlePrintMonthlyCutsRegister}
              className="px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
              title="Print monthly attendance and salary cut register"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>Print Cuts Register</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: DAILY LIVE ATTENDANCE REGISTER */}
      {/* ========================================================================= */}
      {viewMode === 'daily' && (
        <div className="space-y-6 print:hidden">

          {/* Date Selector & Daily KPIs */}
          <div className="bg-gradient-to-r from-[#181c32] via-slate-900 to-indigo-950 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-indigo-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
              
              <div className="flex items-center gap-3">
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl px-3.5 py-2 text-white font-extrabold text-sm outline-none cursor-pointer"
                />
                {selectedDate === todayStr && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-black uppercase font-mono">
                    Today
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  title="Mark all registered staff as Present for this day"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Mark All Present</span>
                </button>
                <button
                  type="button"
                  onClick={fetchData}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Refresh data"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Daily KPI Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
                <div className="text-[10px] uppercase font-black text-gray-400">Total Staff</div>
                <div className="text-2xl font-black font-mono text-white mt-0.5">{dailyStats.total}</div>
                <div className="text-[10px] text-gray-400 mt-1">Roster workforce</div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5">
                <div className="text-[10px] uppercase font-black text-emerald-300">✅ Full Present</div>
                <div className="text-2xl font-black font-mono text-emerald-400 mt-0.5">{dailyStats.present}</div>
                <div className="text-[10px] text-emerald-300/80 mt-1">Full shift attended</div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5">
                <div className="text-[10px] uppercase font-black text-amber-300">🌓 Half Day</div>
                <div className="text-2xl font-black font-mono text-amber-400 mt-0.5">{dailyStats.halfDay}</div>
                <div className="text-[10px] text-amber-300/80 mt-1">4-Hour half shift</div>
              </div>

              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3.5">
                <div className="text-[10px] uppercase font-black text-rose-300">❌ Absent</div>
                <div className="text-2xl font-black font-mono text-rose-400 mt-0.5">{dailyStats.absent}</div>
                <div className="text-[10px] text-rose-300/80 mt-1">Unexcused absence</div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3.5 col-span-2 sm:col-span-1">
                <div className="text-[10px] uppercase font-black text-blue-300">🌴 Approved Leave</div>
                <div className="text-2xl font-black font-mono text-blue-400 mt-0.5">{dailyStats.onLeave}</div>
                <div className="text-[10px] text-blue-300/80 mt-1">Sanctioned time off</div>
              </div>
            </div>
          </div>

          {/* Daily Search & Filter Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {['ALL', 'PRESENT', 'HALF DAY', 'ABSENT', 'ON LEAVE'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setDailyStatusFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    dailyStatusFilter === tab
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff name or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* Daily Staff List with 1-Click Status Buttons */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="p-4">Employee Details</th>
                    <th className="p-4">Current Status</th>
                    <th className="p-4">Working Hours</th>
                    <th className="p-4 text-center">⚡ 1-Click Direct Attendance Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDailyList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-slate-400 italic">
                        No staff members found matching the active filter.
                      </td>
                    </tr>
                  ) : (
                    filteredDailyList.map(item => {
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          
                          {/* Member Info - Clickable for Full Dossier */}
                          <td className="p-4">
                            <div 
                              onClick={() => {
                                setDossierMember(item);
                                setIsDossierOpen(true);
                              }}
                              className="flex items-center gap-3 cursor-pointer group"
                              title="Click to view full Monthly/Yearly Attendance & Salary Dossier"
                            >
                              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm font-outfit shadow-2xs group-hover:scale-105 transition-transform">
                                {item.name.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">{item.name}</h4>
                                  <TrendingUp className="w-3.5 h-3.5 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <p className="text-[11px] text-slate-500">{item.role || 'Staff'} • {item.department || 'Operations'}</p>
                              </div>
                            </div>
                          </td>

                          {/* Current Status Badge */}
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-[11px] font-black font-mono border inline-flex items-center gap-1.5 ${
                              item.status === 'Present'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : item.status === 'Half Day'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : item.status === 'Absent'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : 'bg-blue-50 text-blue-800 border-blue-300'
                            }`}>
                              {item.status === 'Present' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                              {item.status === 'Half Day' && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                              {item.status === 'Absent' && <X className="w-3.5 h-3.5 text-rose-600" />}
                              {item.status === 'On Leave' && <Calendar className="w-3.5 h-3.5 text-blue-600" />}
                              <span>{item.status}</span>
                            </span>
                          </td>

                          {/* In / Out Times */}
                          <td className="p-4 font-mono text-slate-700 text-xs">
                            <div>In: <strong className="text-slate-900">{item.inTime}</strong></div>
                            <div className="text-[10px] text-slate-400">Out: {item.outTime}</div>
                          </td>

                          {/* 1-Click Direct Buttons + Progress Dossier Button */}
                          <td className="p-4 text-center">
                            <div className="inline-flex items-center gap-2">
                              <div className="inline-flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                                
                                {/* Present Button */}
                                <button
                                  type="button"
                                  onClick={() => handleMarkDirectAttendance(item, 'Present')}
                                  className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1 ${
                                    item.status === 'Present'
                                      ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                                      : 'bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200'
                                  }`}
                                  title="Mark full day Present (1.0 Day)"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Present</span>
                                </button>

                                {/* Half Day Button */}
                                <button
                                  type="button"
                                  onClick={() => handleMarkDirectAttendance(item, 'Half Day')}
                                  className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1 ${
                                    item.status === 'Half Day'
                                      ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300'
                                      : 'bg-white hover:bg-amber-50 text-amber-800 border border-slate-200'
                                  }`}
                                  title="Mark Half Day (0.5 Day)"
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Half Day</span>
                                </button>

                                {/* Absent Button */}
                                <button
                                  type="button"
                                  onClick={() => handleMarkDirectAttendance(item, 'Absent')}
                                  className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1 ${
                                    item.status === 'Absent'
                                      ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-300'
                                      : 'bg-white hover:bg-rose-50 text-rose-800 border border-slate-200'
                                  }`}
                                  title="Mark Absent (0 Day)"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Absent</span>
                                </button>

                                {/* On Leave Button */}
                                <button
                                  type="button"
                                  onClick={() => handleMarkDirectAttendance(item, 'On Leave')}
                                  className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1 ${
                                    item.status === 'On Leave'
                                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300'
                                      : 'bg-white hover:bg-blue-50 text-blue-800 border border-slate-200'
                                  }`}
                                  title="Mark Approved / Paid Leave"
                                >
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>On Leave</span>
                                </button>

                              </div>

                              {/* Progress Dossier Action */}
                              <button
                                type="button"
                                onClick={() => {
                                  setDossierMember(item);
                                  setIsDossierOpen(true);
                                }}
                                className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-2xs cursor-pointer transition-colors"
                                title="View Member Attendance & Salary Dossier"
                              >
                                <TrendingUp className="w-4 h-4" />
                              </button>
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

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: MONTHLY ATTENDANCE AUDIT & EXTRA LEAVE SALARY CUTS */}
      {/* ========================================================================= */}
      {viewMode === 'monthly_cuts' && (
        <div className="space-y-6 print:hidden">

          {/* Month Navigator + Policy Bar + Aggregates */}
          <div className="bg-gradient-to-r from-[#181c32] via-slate-900 to-indigo-950 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-indigo-500/20">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
              
              {/* Month Selector */}
              <div className="flex items-center gap-3">
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl px-3.5 py-2 text-white font-extrabold text-sm outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map(m => (
                    <option key={m.num} value={m.num} className="bg-slate-900 text-white font-bold">
                      {m.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(e.target.value)}
                  className="bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl px-3.5 py-2 text-white font-extrabold text-sm outline-none cursor-pointer"
                >
                  {['2024', '2025', '2026', '2027'].map(y => (
                    <option key={y} value={y} className="bg-slate-900 text-white font-bold">{y}</option>
                  ))}
                </select>

                <span className="text-xs font-mono font-bold text-indigo-300 ml-2">
                  Working Days: <strong>{standardWorkingDays} Days</strong>
                </span>
              </div>

              {/* Allowed Leaves Policy Config + Sync Action */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 text-xs font-bold">
                  <span className="text-gray-300">Free Allowed Leaves / Mo:</span>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={monthlyAllowedLeaves}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value));
                      setMonthlyAllowedLeaves(val);
                      localStorage.setItem('taxpro_allowed_monthly_leaves', String(val));
                    }}
                    className="w-12 bg-white text-slate-900 font-black px-2 py-0.5 rounded-lg text-center font-mono outline-none"
                  />
                  <span className="text-indigo-200">Day(s)</span>
                </div>

                <button
                  type="button"
                  onClick={handleSyncCutsToPayroll}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                  title="Push net salaries after leave deductions into Members Payment desk"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Sync Cuts to Payroll Desk</span>
                </button>
              </div>
            </div>

            {/* Monthly Aggregate KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="text-[10px] uppercase font-black text-gray-400">Gross Monthly Payroll</div>
                <div className="text-2xl font-black font-mono text-white mt-1">
                  ₹{monthlyAggregates.totalBaseSalaries.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">Base run-rate before deductions</div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
                <div className="text-[10px] uppercase font-black text-blue-300">Approved Paid Leaves</div>
                <div className="text-2xl font-black font-mono text-blue-400 mt-1">
                  {monthlyAggregates.totalApprovedLeaves} Days
                </div>
                <div className="text-[10px] text-blue-300/80 mt-1">✓ ₹0 Cut (100% Fully Paid)</div>
              </div>

              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4">
                <div className="text-[10px] uppercase font-black text-rose-300">Unexcused Absents</div>
                <div className="text-2xl font-black font-mono text-rose-400 mt-1">
                  {monthlyAggregates.totalAbsents} Days
                </div>
                <div className="text-[10px] text-rose-300/80 mt-1">Subject to daily rate salary cuts</div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
                <div className="text-[10px] uppercase font-black text-emerald-300">Total Deductions Outflow</div>
                <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                  -₹{monthlyAggregates.totalCuts.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-emerald-300/80 mt-1">Net Payable: ₹{monthlyAggregates.totalNetPayable.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          {/* Monthly Staff Roster & Salary Cut Table */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-rose-600" />
                  <span>Staff Leave Audit & Salary Deduction Register ({currentMonthObj?.name} {selectedYear})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  <b>Rule:</b> Approved Leaves (`On Leave`) are 100% Paid with ₹0 Cut. Deductions apply exclusively to Unexcused Absents (1.0x) and Half Days (0.5x).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="p-4">Employee</th>
                    <th className="p-4">Base Salary</th>
                    <th className="p-4 text-center">Present Days</th>
                    <th className="p-4 text-center">Approved Leaves (Paid)</th>
                    <th className="p-4 text-center">Half Days (0.5x Cut)</th>
                    <th className="p-4 text-center">Absents (1.0x Cut)</th>
                    <th className="p-4 text-right">Daily Rate</th>
                    <th className="p-4 text-right">Salary Cut (₹)</th>
                    <th className="p-4 text-right">Net Payable (₹)</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyStaffAuditList.map(item => {
                    const m = item.member;

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                        
                        {/* Member Details - Clickable for Full Dossier */}
                        <td className="p-4">
                          <div 
                            onClick={() => {
                              setDossierMember(m);
                              setIsDossierOpen(true);
                            }}
                            className="cursor-pointer group flex items-center gap-2"
                            title="Click to view full Monthly/Yearly Attendance & Salary Dossier"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">{m.name}</span>
                                <TrendingUp className="w-3.5 h-3.5 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <div className="text-[10px] text-slate-500">{m.role || 'Staff'} • {m.department || 'Operations'}</div>
                            </div>
                          </div>
                        </td>

                        {/* Base Salary */}
                        <td className="p-4 font-mono font-bold text-slate-900">
                          ₹{item.baseSalary.toLocaleString('en-IN')}
                        </td>

                        {/* Present */}
                        <td className="p-4 text-center font-mono font-bold text-emerald-700">
                          {item.presentCount}
                        </td>

                        {/* Approved Paid Leaves */}
                        <td className="p-4 text-center font-mono">
                          {item.onLeaveCount > 0 ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-black text-[11px]">
                              {item.onLeaveCount} (Paid)
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        {/* Half Days */}
                        <td className="p-4 text-center font-mono text-amber-700">
                          {item.halfDayCount > 0 ? `${item.halfDayCount} (-0.5x)` : '-'}
                        </td>

                        {/* Absent */}
                        <td className="p-4 text-center font-mono">
                          {item.absentCount > 0 ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-mono font-black text-[11px]">
                              {item.absentCount} (-1.0x)
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">0</span>
                          )}
                        </td>

                        {/* Daily Rate */}
                        <td className="p-4 text-right font-mono text-slate-600 text-[11px]">
                          ₹{Math.round(item.dailySalaryRate).toLocaleString('en-IN')}/day
                        </td>

                        {/* Salary Cut Amount */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className={`font-mono font-black text-sm ${
                              item.finalCutAmount > 0 ? 'text-rose-600' : 'text-slate-400'
                            }`}>
                              {item.finalCutAmount > 0 ? `-₹${item.finalCutAmount.toLocaleString('en-IN')}` : '₹0'}
                            </span>

                            {item.hasCustomCut && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase font-mono" title="Custom Override Active">
                                Custom
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Net Payable */}
                        <td className="p-4 text-right font-mono font-black text-sm text-emerald-700">
                          ₹{item.netPayableSalary.toLocaleString('en-IN')}
                        </td>

                        {/* Actions: Progress Dossier / Set Custom Cut / Print Slip */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setDossierMember(m);
                                setIsDossierOpen(true);
                              }}
                              className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                              title="View full Monthly/Yearly Attendance & Salary Dossier"
                            >
                              <TrendingUp className="w-3 h-3" />
                              <span>Progress</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setCutTargetMember(m);
                                setCustomCutInput(String(item.finalCutAmount));
                                setCutNotesInput(item.customNotes || '');
                                setIsCutModalOpen(true);
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                              title="Set custom salary deduction override"
                            >
                              <Edit3 className="w-3 h-3 text-slate-500" />
                              <span>Cut</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handlePrintEmployeeSlip(item)}
                              className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                              title="Print Attendance & Salary Deduction Slip"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Slip</span>
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PRINTABLE OFFICIAL DOCUMENT TEMPLATES */}
      {/* ========================================================================= */}
      <div className="hidden print:block member-print-document bg-white text-black p-0 m-0">
        
        {/* PRINT HEADER */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black font-outfit uppercase tracking-tight text-slate-900">
                {localStorage.getItem('taxpro_firm_name') || 'TAXPRO ADVISORY & TAX ASSOCIATES'}
              </h1>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mt-0.5">
                {printDocType === 'daily_sheet'
                  ? `Official Staff Daily Attendance Register — ${selectedDate}`
                  : printDocType === 'monthly_cuts_register'
                  ? `Monthly Staff Attendance & Leave Salary Cut Audit — ${currentMonthObj?.name} ${selectedYear}`
                  : `Employee Attendance & Leave Deduction Voucher`}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Practice Division • GSTIN: {localStorage.getItem('taxpro_firm_gst') || '24AAAAA0000A1Z5'} • PAN: {localStorage.getItem('taxpro_firm_pan') || 'AAATF1234C'}
              </p>
            </div>

            <div className="text-right">
              <div className="text-xs font-mono font-black text-slate-900">
                {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
              <div className="text-[10px] font-mono text-slate-600 mt-0.5">
                Certified System Register
              </div>
            </div>
          </div>
        </div>

        {/* PRINT TYPE 1: DAILY ATTENDANCE SHEET */}
        {printDocType === 'daily_sheet' && (
          <div>
            <div className="grid grid-cols-4 gap-3 border border-slate-300 p-3 rounded-lg text-xs mb-6 bg-slate-50">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Total Roster</span>
                <span className="font-bold font-mono">{dailyStats.total} Members</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Present</span>
                <span className="font-bold font-mono text-emerald-800">{dailyStats.present}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Half Day</span>
                <span className="font-bold font-mono text-amber-800">{dailyStats.halfDay}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Absent / Leave</span>
                <span className="font-bold font-mono text-rose-800">{dailyStats.absent + dailyStats.onLeave}</span>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse border border-slate-300 mb-6">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-extrabold uppercase text-[10px]">
                  <th className="p-2.5 border border-slate-300">Staff Name</th>
                  <th className="p-2.5 border border-slate-300">Designation</th>
                  <th className="p-2.5 border border-slate-300 text-center">Status</th>
                  <th className="p-2.5 border border-slate-300 font-mono">In Time</th>
                  <th className="p-2.5 border border-slate-300 font-mono">Out Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredDailyList.map((s, i) => (
                  <tr key={s.id || i}>
                    <td className="p-2 border border-slate-300 font-bold">{s.name}</td>
                    <td className="p-2 border border-slate-300">{s.role || 'Staff'} ({s.department || 'Operations'})</td>
                    <td className="p-2 border border-slate-300 text-center font-bold">{s.status}</td>
                    <td className="p-2 border border-slate-300 font-mono">{s.inTime}</td>
                    <td className="p-2 border border-slate-300 font-mono">{s.outTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PRINT TYPE 2: MONTHLY CUTS REGISTER */}
        {printDocType === 'monthly_cuts_register' && (
          <div>
            <table className="w-full text-left text-xs border-collapse border border-slate-300 mb-6">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-extrabold uppercase text-[10px]">
                  <th className="p-2 border border-slate-300">Employee Name</th>
                  <th className="p-2 border border-slate-300 text-right">Base Salary</th>
                  <th className="p-2 border border-slate-300 text-center">Present</th>
                  <th className="p-2 border border-slate-300 text-center">Half Day</th>
                  <th className="p-2 border border-slate-300 text-center">Leaves</th>
                  <th className="p-2 border border-slate-300 text-center">Extra</th>
                  <th className="p-2 border border-slate-300 text-right">Deduction</th>
                  <th className="p-2 border border-slate-300 text-right">Net Payable</th>
                </tr>
              </thead>
              <tbody>
                {monthlyStaffAuditList.map((item, i) => (
                  <tr key={item.member.id || i}>
                    <td className="p-2 border border-slate-300 font-bold">{item.member.name}</td>
                    <td className="p-2 border border-slate-300 font-mono text-right">₹{item.baseSalary.toLocaleString('en-IN')}</td>
                    <td className="p-2 border border-slate-300 text-center font-mono">{item.presentCount}</td>
                    <td className="p-2 border border-slate-300 text-center font-mono">{item.halfDayCount}</td>
                    <td className="p-2 border border-slate-300 text-center font-mono">{item.totalLeavesTaken}</td>
                    <td className="p-2 border border-slate-300 text-center font-mono font-bold text-rose-800">{item.extraLeaves}</td>
                    <td className="p-2 border border-slate-300 font-mono text-right font-bold text-rose-700">
                      {item.finalCutAmount > 0 ? `-₹${item.finalCutAmount.toLocaleString('en-IN')}` : '₹0'}
                    </td>
                    <td className="p-2 border border-slate-300 font-mono text-right font-black">
                      ₹{item.netPayableSalary.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mb-6">
              <div className="border border-slate-300 p-3 rounded-lg w-72 text-right bg-slate-50 space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Gross Payroll:</span>
                  <span className="font-mono">₹{monthlyAggregates.totalBaseSalaries.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-rose-700">
                  <span>Total Leave Cuts:</span>
                  <span className="font-mono">-₹{monthlyAggregates.totalCuts.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-300 pt-1">
                  <span>Net Disbursal:</span>
                  <span className="font-mono">₹{monthlyAggregates.totalNetPayable.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PRINT TYPE 3: INDIVIDUAL EMPLOYEE ATTENDANCE & DEDUCTION SLIP */}
        {printDocType === 'employee_slip' && printEmployeeData && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 border border-slate-300 p-4 rounded-xl text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Employee Name</span>
                <span className="font-bold text-sm text-slate-900">{printEmployeeData.member.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Role & Department</span>
                <span className="font-semibold text-slate-800">{printEmployeeData.member.role || 'Staff'} ({printEmployeeData.member.department || 'Operations'})</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Audit Period</span>
                <span className="font-mono font-bold text-slate-900">{currentMonthObj?.name} {selectedYear} ({standardWorkingDays} Working Days)</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Allowed Free Leave Quota</span>
                <span className="font-mono font-bold text-slate-900">{printEmployeeData.allowedLeaves} Day(s)</span>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-extrabold uppercase text-[10px]">
                  <th className="p-3 border border-slate-300">Attendance Component</th>
                  <th className="p-3 border border-slate-300 text-center">Recorded Metric</th>
                  <th className="p-3 border border-slate-300 text-right">Calculation / Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border border-slate-300 font-bold">Monthly Base Salary</td>
                  <td className="p-3 border border-slate-300 text-center font-mono">100% Run Rate</td>
                  <td className="p-3 border border-slate-300 font-mono font-bold text-right">₹{printEmployeeData.baseSalary.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td className="p-3 border border-slate-300">Full Days Present</td>
                  <td className="p-3 border border-slate-300 text-center font-mono font-bold">{printEmployeeData.presentCount} Days</td>
                  <td className="p-3 border border-slate-300 text-right text-slate-400 font-mono">-</td>
                </tr>
                <tr>
                  <td className="p-3 border border-slate-300">Half Days (0.5x)</td>
                  <td className="p-3 border border-slate-300 text-center font-mono">{printEmployeeData.halfDayCount} Days</td>
                  <td className="p-3 border border-slate-300 text-right text-slate-400 font-mono">-</td>
                </tr>
                <tr>
                  <td className="p-3 border border-slate-300">Total Leaves Taken</td>
                  <td className="p-3 border border-slate-300 text-center font-mono">{printEmployeeData.totalLeavesTaken} Days</td>
                  <td className="p-3 border border-slate-300 text-right text-slate-400 font-mono">-</td>
                </tr>
                <tr>
                  <td className="p-3 border border-slate-300 font-bold text-rose-800">
                    Extra Unpaid Leaves (Exceeding {printEmployeeData.allowedLeaves} Free Days)
                  </td>
                  <td className="p-3 border border-slate-300 text-center font-mono font-bold text-rose-800">
                    {printEmployeeData.extraLeaves} Extra Days
                  </td>
                  <td className="p-3 border border-slate-300 font-mono font-bold text-rose-700 text-right">
                    -₹{printEmployeeData.finalCutAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="border border-slate-300 p-3.5 rounded-lg w-72 text-right bg-slate-50">
                <span className="text-[10px] text-slate-600 uppercase font-bold block">Net Salary Payable After Leave Cuts</span>
                <span className="text-xl font-black font-mono text-slate-900 block mt-0.5">
                  ₹{printEmployeeData.netPayableSalary.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* PRINT SIGNATURE FOOTER */}
        <div className="flex justify-between items-end mt-16 pt-6 border-t-2 border-slate-400 text-[10px] text-slate-600">
          <div>
            <p className="font-bold text-slate-900">TaxPro PMS • Certified Attendance & Leave Ledger</p>
            <p>Generated automatically from live practice workforce database.</p>
          </div>
          <div className="text-right">
            <div className="h-10 border-b border-slate-500 w-52 mb-1"></div>
            <span className="font-bold text-slate-900">Authorized Signatory / Administrator</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. CUSTOM SALARY CUT OVERRIDE MODAL */}
      {/* ========================================================================= */}
      {isCutModalOpen && cutTargetMember && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsCutModalOpen(false); }}
          className="modal-overlay-backdrop print:hidden"
        >
          <div className="modal-content-box max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 animate-page-fade">
            
            <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white p-5 flex items-center justify-between border-b border-rose-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black font-outfit text-white">Adjust Leave Salary Cut</h3>
                  <p className="text-xs text-rose-200">For {cutTargetMember.name} ({currentMonthObj?.name} {selectedYear})</p>
                </div>
              </div>
              <button onClick={() => setIsCutModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomCut} className="p-6 space-y-4 text-xs font-semibold">
              <div>
                <label className="text-slate-700 block mb-1">
                  Custom Deduction Amount (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="Enter custom cut amount (e.g. 1500 or 0)"
                    value={customCutInput}
                    onChange={e => setCustomCutInput(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-black text-sm text-slate-900 outline-none focus:border-rose-600 focus:bg-white"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Set ₹0 if you want to waive leave deductions completely for this employee.
                </p>
              </div>

              <div>
                <label className="text-slate-700 block mb-1">Reason / Waiver Notes (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Approved medical leave adjustment or manual compensatory off..."
                  value={cutNotesInput}
                  onChange={e => setCutNotesInput(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-rose-600 focus:bg-white resize-none"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleResetToAutoCut(cutTargetMember)}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                >
                  Reset to Auto Formula
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCutModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer active:scale-95 transition-all"
                  >
                    Save Cut
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MEMBER ATTENDANCE & SALARY PROGRESS DOSSIER MODAL */}
      <MemberAttendanceDossierModal
        member={dossierMember}
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        attendanceRecords={attendanceRecords}
        payrollConfigs={payrollConfigs}
        paymentHistory={paymentHistory}
        onShowToast={onShowToast}
      />

    </div>
  );
}
