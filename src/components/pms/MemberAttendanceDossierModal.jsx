import React, { useState, useMemo } from 'react';
import { 
  X, 
  Printer, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Scissors, 
  IndianRupee, 
  User, 
  Building2, 
  Smartphone, 
  Mail, 
  Award, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Download,
  CalendarCheck,
  FileText,
  Sparkles,
  QrCode,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { logAuditActivity } from '../../lib/auditLogger';
import { formatDate } from '../../lib/dateUtils';

export default function MemberAttendanceDossierModal({ 
  member, 
  isOpen, 
  onClose, 
  attendanceRecords = [], 
  payrollConfigs = {}, 
  paymentHistory = [], 
  onShowToast,
  onOpenPaymentModal
}) {
  if (!isOpen || !member) return null;

  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(String(today.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(today.getMonth() + 1).padStart(2, '0'));
  const [activeTab, setActiveTab] = useState('yearly_matrix'); // 'yearly_matrix' | 'daily_calendar'
  const [isFullScreen, setIsFullScreen] = useState(true); // Default to full-screen big page layout

  // Custom cuts from localStorage
  const customSalaryCuts = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('taxpro_attendance_custom_cuts')) || {};
    } catch(e) {
      return {};
    }
  }, []);

  const MONTH_NAMES = [
    { num: '01', name: 'January', days: 31, short: 'Jan' },
    { num: '02', name: 'February', days: 28, short: 'Feb' },
    { num: '03', name: 'March', days: 31, short: 'Mar' },
    { num: '04', name: 'April', days: 30, short: 'Apr' },
    { num: '05', name: 'May', days: 31, short: 'May' },
    { num: '06', name: 'June', days: 30, short: 'Jun' },
    { num: '07', name: 'July', days: 31, short: 'Jul' },
    { num: '08', name: 'August', days: 31, short: 'Aug' },
    { num: '09', name: 'September', days: 30, short: 'Sep' },
    { num: '10', name: 'October', days: 31, short: 'Oct' },
    { num: '11', name: 'November', days: 30, short: 'Nov' },
    { num: '12', name: 'December', days: 31, short: 'Dec' }
  ];

  // Base Salary calculation
  const cfg = payrollConfigs[member.id];
  const baseSalary = cfg?.salary 
    ? Number(cfg.salary) 
    : (member.salary ? Number(String(member.salary).replace(/[^0-9.]/g, '')) : 25000);

  // Member UPI
  const memberUpi = member.upi_id || localStorage.getItem(`taxpro_upi_${member.id}`) || localStorage.getItem(`taxpro_upi_${member.email}`) || '';

  // 12-MONTH YEARLY MATRIX CALCULATION
  // RULE: "in leave we dont cut salary" -> On Leave is APPROVED & FULLY PAID (0 Cut).
  // Only Absent (1.0x) and Half Day (0.5x) are subject to salary cuts!
  const yearlyMonthsData = useMemo(() => {
    return MONTH_NAMES.map(mObj => {
      const cycleKey = `${selectedYear}-${mObj.num}`;
      const workingDays = Math.max(22, mObj.days - 4); // ~26 working days

      // Records for this month
      const mRecords = attendanceRecords.filter(r => {
        const isMember = r.member_id === member.id || r.employee_name === member.name || r.name === member.name;
        const isMonth = r.date && r.date.startsWith(cycleKey);
        return isMember && isMonth;
      });

      let presentCount = 0;
      let halfDayCount = 0;
      let absentCount = 0;
      let onLeaveCount = 0;

      mRecords.forEach(r => {
        if (r.status === 'Present') presentCount++;
        else if (r.status === 'Half Day') halfDayCount++;
        else if (r.status === 'Absent') absentCount++;
        else if (r.status === 'On Leave') onLeaveCount++;
      });

      const loggedDays = presentCount + halfDayCount + absentCount + onLeaveCount;
      if (loggedDays < workingDays && loggedDays > 0) {
        presentCount += Math.max(0, workingDays - loggedDays);
      } else if (loggedDays === 0) {
        presentCount = workingDays;
      }

      // Unpaid Deductible Days: ONLY Absent (1.0x) and Half Day (0.5x). On Leave is ₹0 Cut (Fully Paid).
      const unpaidDeductibleDays = absentCount + (halfDayCount * 0.5);

      const dailyRate = workingDays > 0 ? (baseSalary / workingDays) : 0;
      const autoCalculatedCut = Math.round(unpaidDeductibleDays * dailyRate);

      const customKey = `${cycleKey}_${member.id}`;
      const customOverride = customSalaryCuts[customKey];
      const hasCustomCut = customOverride && customOverride.customAmount !== undefined && customOverride.customAmount !== null;
      const finalCutAmount = hasCustomCut ? Number(customOverride.customAmount) : autoCalculatedCut;

      const netPayable = Math.max(0, baseSalary - finalCutAmount);

      // Check payment status from paymentHistory
      const paidRecord = paymentHistory.find(h => 
        h.memberId === member.id && 
        h.status === 'Paid' && 
        (h.cycle === cycleKey || (h.date && h.date.startsWith(cycleKey) && (h.description || '').toLowerCase().includes('salary')))
      );

      return {
        monthNum: mObj.num,
        monthName: mObj.name,
        shortName: mObj.short,
        workingDays,
        presentCount,
        halfDayCount,
        absentCount,
        onLeaveCount,
        unpaidDeductibleDays,
        dailyRate,
        autoCalculatedCut,
        hasCustomCut,
        finalCutAmount,
        netPayable,
        isPaid: Boolean(paidRecord),
        paidRecord: paidRecord || null,
        cycleKey
      };
    });
  }, [selectedYear, attendanceRecords, member, baseSalary, customSalaryCuts, paymentHistory]);

  // Annual Totals
  const yearlyTotals = useMemo(() => {
    let totalWorkingDays = 0;
    let totalPresentDays = 0;
    let totalHalfDays = 0;
    let totalApprovedLeaves = 0;
    let totalAbsents = 0;
    let totalSalaryCuts = 0;
    let totalNetDisbursed = 0;
    let paidMonthsCount = 0;

    yearlyMonthsData.forEach(m => {
      totalWorkingDays += m.workingDays;
      totalPresentDays += m.presentCount;
      totalHalfDays += m.halfDayCount;
      totalApprovedLeaves += m.onLeaveCount;
      totalAbsents += m.absentCount;
      totalSalaryCuts += m.finalCutAmount;
      if (m.isPaid) {
        paidMonthsCount++;
        totalNetDisbursed += m.paidRecord?.amount ? Number(m.paidRecord.amount) : m.netPayable;
      }
    });

    const effectivePresent = totalPresentDays + totalApprovedLeaves + (totalHalfDays * 0.5);
    const overallRate = totalWorkingDays > 0 ? Math.min(100, Math.round((effectivePresent / totalWorkingDays) * 100)) : 100;

    return {
      totalWorkingDays,
      totalPresentDays,
      totalHalfDays,
      totalApprovedLeaves,
      totalAbsents,
      totalSalaryCuts,
      totalNetDisbursed,
      paidMonthsCount,
      overallRate
    };
  }, [yearlyMonthsData]);

  // SELECTED MONTH DAILY PUNCH CALENDAR
  const currentMonthData = MONTH_NAMES.find(m => m.num === selectedMonth) || MONTH_NAMES[7];
  const daysInSelectedMonth = currentMonthData.days;

  const monthDailyCalendar = useMemo(() => {
    const days = [];
    const yearNum = Number(selectedYear);
    const monthIndex = Number(selectedMonth) - 1;

    for (let d = 1; d <= daysInSelectedMonth; d++) {
      const dateObj = new Date(yearNum, monthIndex, d);
      const dateStr = `${selectedYear}-${selectedMonth}-${String(d).padStart(2, '0')}`;
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const isSunday = dateObj.getDay() === 0;

      // Find record for this specific day
      const rec = attendanceRecords.find(r => 
        (r.member_id === member.id || r.employee_name === member.name || r.name === member.name) &&
        r.date === dateStr
      );

      let status = rec?.status || (isSunday ? 'Holiday / Sunday' : 'Present');
      let inTime = rec?.in_time || (isSunday ? '-' : (status === 'Absent' || status === 'On Leave' ? '-' : '09:30 AM'));
      let outTime = rec?.out_time || (isSunday ? '-' : (status === 'Half Day' ? '02:00 PM' : (status === 'Absent' || status === 'On Leave' ? '-' : '06:30 PM')));

      days.push({
        dayNum: d,
        dateStr,
        dayName,
        isSunday,
        status,
        inTime,
        outTime,
        rawRecord: rec || null
      });
    }

    return days;
  }, [selectedYear, selectedMonth, daysInSelectedMonth, attendanceRecords, member]);

  // Instant 1-Click Status Override inside Member Dossier Calendar
  const handleDirectCalendarStatusChange = async (dayItem, newStatus) => {
    const targetDate = dayItem.dateStr;
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    let inTime = '09:30 AM';
    let outTime = '06:30 PM';
    if (newStatus === 'Half Day') outTime = '02:00 PM';
    else if (newStatus === 'Absent' || newStatus === 'On Leave') { inTime = '-'; outTime = '-'; }

    const recordPayload = {
      id: dayItem.rawRecord?.id || `ATT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      member_id: member.id,
      employee_name: member.name,
      date: targetDate,
      mode: 'Dossier Calendar Direct Override',
      shift: member.shift || 'General Shift',
      status: newStatus,
      logged_at: nowTimeStr,
      in_time: inTime,
      out_time: outTime,
      notes: `Updated in Member Dossier: ${newStatus}`
    };

    try {
      if (dayItem.rawRecord) {
        await supabase.from('attendance').update({
          status: newStatus,
          in_time: inTime,
          out_time: outTime,
          notes: recordPayload.notes
        }).eq('id', dayItem.rawRecord.id);
      } else {
        await supabase.from('attendance').insert([recordPayload]);
      }

      if (onShowToast) onShowToast(`✓ ${member.name} marked as "${newStatus}" on ${targetDate}`, 'success');
    } catch(e) {
      console.error(e);
    }
  };

  // PRINT DOSSIER
  const handlePrintDossier = () => {
    logAuditActivity({
      action: 'PRINT_MEMBER_DOSSIER',
      module: 'Attendance & Payroll',
      details: `Printed annual attendance & salary dossier for "${member.name}" (${selectedYear})`,
      metadata: { member: member.name, year: selectedYear }
    });

    document.body.classList.add('printing-member-record');
    if (onShowToast) onShowToast(`Preparing Official Dossier for ${member.name}...`, 'info');

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-member-record');
      }, 1200);
    }, 350);
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className={`fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col justify-start items-center overflow-y-auto ${
        isFullScreen ? 'p-0' : 'p-3 sm:p-6'
      } print:p-0 print:bg-white`}
    >
      <div className={`w-full bg-white text-slate-800 animate-page-fade flex flex-col ${
        isFullScreen 
          ? 'min-h-screen max-w-full rounded-none' 
          : 'max-w-6xl rounded-3xl shadow-2xl border border-slate-200 my-4'
      } print:m-0 print:border-none print:shadow-none print:max-w-full`}>
        
        {/* ========================================================================= */}
        {/* 1. MEMBER HERO PROFILE HEADER */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-[#111425] via-slate-900 to-indigo-950 text-white p-6 sm:p-8 relative border-b border-indigo-500/20 print:hidden">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Avatar & Core Bio */}
            <div className="flex items-center gap-5">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 text-white flex items-center justify-center font-black text-3xl font-outfit shadow-2xl border-2 border-white/20 shrink-0">
                {member.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-2xl sm:text-3xl font-black font-outfit text-white tracking-tight">{member.name}</h2>
                  <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 text-xs font-black uppercase font-mono">
                    {member.role || 'Staff Member'}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-black uppercase font-mono">
                    {member.department || 'Operations'}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-300 mt-2 flex-wrap">
                  {member.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-indigo-400" /> {member.email}
                    </span>
                  )}
                  {member.phone && (
                    <span className="flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5 text-indigo-400" /> {member.phone}
                    </span>
                  )}
                  {memberUpi && (
                    <span className="flex items-center gap-1.5 bg-emerald-950/70 text-emerald-300 px-3 py-1 rounded-xl font-mono text-xs border border-emerald-500/30">
                      <QrCode className="w-3.5 h-3.5 text-emerald-400" /> Payout UPI: <strong>{memberUpi}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Top Right Actions */}
            <div className="flex items-center gap-2 self-start lg:self-auto">
              <button
                type="button"
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{isFullScreen ? "Standard Window" : "Full Screen"}</span>
              </button>

              <button
                type="button"
                onClick={handlePrintDossier}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                title="Print Member Attendance & Salary Progress Dossier"
              >
                <Printer className="w-4 h-4 text-white" />
                <span>Print Dossier</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

          </div>

          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-7 pt-6 border-t border-white/10">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Monthly Base Salary</div>
              <div className="text-2xl font-black font-mono text-white mt-1">₹{baseSalary.toLocaleString('en-IN')}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Fixed contracted run-rate</div>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Annual Presence Score</div>
              <div className="text-2xl font-black font-mono text-emerald-400 mt-1">{yearlyTotals.overallRate}%</div>
              <div className="text-[11px] text-emerald-300/80 mt-0.5">{yearlyTotals.totalPresentDays} Full Days Present</div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
              <div className="text-[10px] font-black uppercase tracking-wider text-blue-300">Approved Paid Leaves</div>
              <div className="text-2xl font-black font-mono text-blue-400 mt-1">{yearlyTotals.totalApprovedLeaves} Days</div>
              <div className="text-[11px] text-blue-300/80 mt-0.5">✓ ₹0 Cut (Fully Paid)</div>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4">
              <div className="text-[10px] font-black uppercase tracking-wider text-rose-300">Total Unpaid Salary Cuts</div>
              <div className="text-2xl font-black font-mono text-rose-400 mt-1">-₹{yearlyTotals.totalSalaryCuts.toLocaleString('en-IN')}</div>
              <div className="text-[11px] text-rose-300/80 mt-0.5">From {yearlyTotals.totalAbsents} Absents & {yearlyTotals.totalHalfDays} Half Days</div>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 2. SUB-NAVIGATION & AUDIT YEAR SWITCHER */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          
          {/* View Mode Tabs */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab('yearly_matrix')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'yearly_matrix'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>12-Month Yearly Progress & Cuts Matrix</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('daily_calendar')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'daily_calendar'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Monthly Daily Punch Log</span>
            </button>
          </div>

          {/* Year Switcher */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500">Audit Year:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="bg-transparent font-black text-xs text-slate-900 outline-none cursor-pointer"
            >
              {['2024', '2025', '2026', '2027', '2028'].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 3. TAB 1: 12-MONTH YEARLY MATRIX TABLE */}
        {/* ========================================================================= */}
        {activeTab === 'yearly_matrix' && (
          <div className="p-4 sm:p-8 space-y-6 flex-1 print:hidden">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2 font-outfit">
                  <Scissors className="w-4 h-4 text-indigo-600" />
                  <span>Annual Month-by-Month Attendance & Salary Cut Ledger ({selectedYear})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  <b>Policy Notice:</b> Approved Leaves (`On Leave`) are 100% paid without salary cut. Deductions apply exclusively to Unexcused Absents and Half Days.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-3xl shadow-xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-black uppercase text-[10px] tracking-wider">
                    <th className="p-4">Month Cycle</th>
                    <th className="p-4 text-center">Working Days</th>
                    <th className="p-4 text-center">Full Present</th>
                    <th className="p-4 text-center">Approved Leaves (Paid)</th>
                    <th className="p-4 text-center">Half Days (0.5x Cut)</th>
                    <th className="p-4 text-center">Absents (1.0x Cut)</th>
                    <th className="p-4 text-right">Daily Rate</th>
                    <th className="p-4 text-right">Leave Salary Cut (₹)</th>
                    <th className="p-4 text-right">Net Payable Salary (₹)</th>
                    <th className="p-4 text-center">Disbursal Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {yearlyMonthsData.map(m => (
                    <tr key={m.monthNum} className="hover:bg-slate-50/80 transition-colors font-sans">
                      
                      <td className="p-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-700 font-mono font-black text-xs flex items-center justify-center border border-indigo-100">
                            {m.monthNum}
                          </span>
                          <span className="font-extrabold text-sm text-slate-900">{m.monthName} {selectedYear}</span>
                        </div>
                      </td>

                      <td className="p-4 text-center font-mono text-slate-600 font-bold text-sm">
                        {m.workingDays}
                      </td>

                      <td className="p-4 text-center font-mono font-black text-emerald-700 text-sm">
                        {m.presentCount}
                      </td>

                      <td className="p-4 text-center font-mono">
                        {m.onLeaveCount > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-black text-[11px]">
                            {m.onLeaveCount} (Paid)
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      <td className="p-4 text-center font-mono font-bold text-amber-700">
                        {m.halfDayCount > 0 ? `${m.halfDayCount} (-0.5x)` : '-'}
                      </td>

                      <td className="p-4 text-center font-mono">
                        {m.absentCount > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-black text-[11px]">
                            {m.absentCount} (-1.0x)
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      <td className="p-4 text-right font-mono text-slate-500 text-xs">
                        ₹{Math.round(m.dailyRate).toLocaleString('en-IN')}/day
                      </td>

                      <td className="p-4 text-right font-mono font-black text-sm">
                        <span className={m.finalCutAmount > 0 ? 'text-rose-600' : 'text-slate-400'}>
                          {m.finalCutAmount > 0 ? `-₹${m.finalCutAmount.toLocaleString('en-IN')}` : '₹0'}
                        </span>
                        {m.hasCustomCut && (
                          <span className="ml-1.5 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[8px] font-black uppercase font-mono">
                            Custom
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right font-mono font-black text-emerald-700 text-base">
                        ₹{m.netPayable.toLocaleString('en-IN')}
                      </td>

                      <td className="p-4 text-center">
                        {m.isPaid ? (
                          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono font-black text-[10px] inline-flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Disbursed
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono font-bold text-[10px]">
                            Pending
                          </span>
                        )}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Annual Recap Footer */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-extrabold text-base text-white">Annual Summary Totals ({selectedYear})</h4>
                <p className="text-xs text-slate-400 mt-0.5">Cumulative working presence, paid leave allowances & salary deductions.</p>
              </div>

              <div className="flex items-center gap-6 text-right">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Total Days Attended</div>
                  <div className="text-xl font-black font-mono text-emerald-400">{yearlyTotals.totalPresentDays} Days</div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Total Deductions</div>
                  <div className="text-xl font-black font-mono text-rose-400">-₹{yearlyTotals.totalSalaryCuts.toLocaleString('en-IN')}</div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Net Disbursed</div>
                  <div className="text-xl font-black font-mono text-white">₹{yearlyTotals.totalNetDisbursed.toLocaleString('en-IN')}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. TAB 2: MONTHLY CALENDAR & DAILY PUNCH LOGS */}
        {/* ========================================================================= */}
        {activeTab === 'daily_calendar' && (
          <div className="p-4 sm:p-8 space-y-6 flex-1 print:hidden">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h3 className="font-black text-base text-slate-900 font-outfit">
                  Daily Attendance Log — {currentMonthData.name} {selectedYear}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Day-by-day attendance punches with direct 1-click status override tools.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-600 ml-2">Select Month:</span>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="bg-slate-100 font-black text-xs text-slate-900 rounded-xl px-3 py-1.5 outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map(m => (
                    <option key={m.num} value={m.num}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-3xl shadow-xs max-h-[580px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 z-10">
                  <tr className="border-b border-slate-200 text-slate-700 font-black uppercase text-[10px] tracking-wider">
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Day</th>
                    <th className="p-3.5">Attendance Status</th>
                    <th className="p-3.5 font-mono">Working Hours</th>
                    <th className="p-3.5 text-center">⚡ Instant 1-Click Status Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthDailyCalendar.map(day => (
                    <tr key={day.dateStr} className={`hover:bg-slate-50 ${day.isSunday ? 'bg-slate-50/60' : ''}`}>
                      
                      <td className="p-3.5 font-mono font-black text-slate-900 text-xs">
                        {day.dateStr}
                      </td>

                      <td className="p-3.5 font-bold text-slate-600">
                        <span className={day.isSunday ? 'text-rose-600 font-black' : ''}>{day.dayName}</span>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-mono font-black border inline-flex items-center gap-1.5 ${
                          day.status === 'Present'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : day.status === 'Half Day'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : day.status === 'Absent'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : day.status === 'On Leave'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {day.status}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono text-slate-600 text-xs">
                        {day.inTime !== '-' ? `${day.inTime} – ${day.outTime}` : '-'}
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleDirectCalendarStatusChange(day, 'Present')}
                            className={`px-3 py-1 rounded-xl text-xs font-black cursor-pointer transition-all ${
                              day.status === 'Present' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-emerald-50 border border-slate-200'
                            }`}
                            title="Mark Present (1.0x Full Day)"
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDirectCalendarStatusChange(day, 'Half Day')}
                            className={`px-3 py-1 rounded-xl text-xs font-black cursor-pointer transition-all ${
                              day.status === 'Half Day' ? 'bg-amber-500 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-amber-50 border border-slate-200'
                            }`}
                            title="Mark Half Day (0.5x Cut)"
                          >
                            Half Day
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDirectCalendarStatusChange(day, 'Absent')}
                            className={`px-3 py-1 rounded-xl text-xs font-black cursor-pointer transition-all ${
                              day.status === 'Absent' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-rose-50 border border-slate-200'
                            }`}
                            title="Mark Unexcused Absent (1.0x Cut)"
                          >
                            Absent
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDirectCalendarStatusChange(day, 'On Leave')}
                            className={`px-3 py-1 rounded-xl text-xs font-black cursor-pointer transition-all ${
                              day.status === 'On Leave' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-blue-50 border border-slate-200'
                            }`}
                            title="Mark Approved Leave (0 Cut / Paid)"
                          >
                            On Leave
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. PRINTABLE OFFICIAL MEMBER ANNUAL ATTENDANCE DOSSIER */}
        {/* ========================================================================= */}
        <div className="hidden print:block bg-white text-black p-0 m-0">
          
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-black font-outfit uppercase tracking-tight text-slate-900">
                  {localStorage.getItem('taxpro_firm_name') || 'TAXPRO ADVISORY & TAX ASSOCIATES'}
                </h1>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mt-0.5">
                  Official Member Annual Attendance & Salary Deduction Progress Dossier — {selectedYear}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  GSTIN: {localStorage.getItem('taxpro_firm_gst') || '24AAAAA0000A1Z5'} • PAN: {localStorage.getItem('taxpro_firm_pan') || 'AAATF1234C'}
                </p>
              </div>

              <div className="text-right">
                <div className="text-xs font-mono font-black text-slate-900">
                  {formatDate(new Date())}
                </div>
                <div className="text-[10px] font-mono text-slate-600 mt-0.5">
                  Employee ID: {member.id}
                </div>
              </div>
            </div>
          </div>

          {/* Member Card Box */}
          <div className="grid grid-cols-2 gap-4 border border-slate-300 p-4 rounded-xl text-xs mb-6 bg-slate-50">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Staff Member</span>
              <span className="font-bold text-sm text-slate-900">{member.name}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Role / Designation</span>
              <span className="font-semibold text-slate-800">{member.role || 'Staff'} ({member.department || 'Operations'})</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Base Monthly Salary</span>
              <span className="font-mono font-bold text-slate-900">₹{baseSalary.toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Annual Attendance Score</span>
              <span className="font-mono font-bold text-slate-900">{yearlyTotals.overallRate}% ({yearlyTotals.totalPresentDays} Full Days)</span>
            </div>
          </div>

          {/* 12-Month Table */}
          <table className="w-full text-left text-xs border-collapse border border-slate-300 mb-6">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-extrabold uppercase text-[10px]">
                <th className="p-2 border border-slate-300">Month</th>
                <th className="p-2 border border-slate-300 text-center">Working Days</th>
                <th className="p-2 border border-slate-300 text-center">Present</th>
                <th className="p-2 border border-slate-300 text-center">Approved Leaves</th>
                <th className="p-2 border border-slate-300 text-center">Half Days</th>
                <th className="p-2 border border-slate-300 text-center">Absents</th>
                <th className="p-2 border border-slate-300 text-right">Deduction (₹)</th>
                <th className="p-2 border border-slate-300 text-right">Net Disbursed (₹)</th>
                <th className="p-2 border border-slate-300 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {yearlyMonthsData.map(m => (
                <tr key={m.monthNum}>
                  <td className="p-2 border border-slate-300 font-bold">{m.monthName} {selectedYear}</td>
                  <td className="p-2 border border-slate-300 text-center font-mono">{m.workingDays}</td>
                  <td className="p-2 border border-slate-300 text-center font-mono font-bold">{m.presentCount}</td>
                  <td className="p-2 border border-slate-300 text-center font-mono">{m.onLeaveCount} (Paid)</td>
                  <td className="p-2 border border-slate-300 text-center font-mono">{m.halfDayCount}</td>
                  <td className="p-2 border border-slate-300 text-center font-mono font-bold text-rose-800">{m.absentCount}</td>
                  <td className="p-2 border border-slate-300 font-mono text-right font-bold text-rose-700">
                    {m.finalCutAmount > 0 ? `-₹${m.finalCutAmount.toLocaleString('en-IN')}` : '₹0'}
                  </td>
                  <td className="p-2 border border-slate-300 font-mono text-right font-black">
                    ₹{m.netPayable.toLocaleString('en-IN')}
                  </td>
                  <td className="p-2 border border-slate-300 text-center font-mono text-[10px] font-bold">
                    {m.isPaid ? 'DISBURSED' : 'PENDING'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Annual Summary Box */}
          <div className="flex justify-end mb-8">
            <div className="border border-slate-300 p-3.5 rounded-lg w-80 text-right bg-slate-50 space-y-1 text-xs">
              <div className="flex justify-between font-bold text-slate-600">
                <span>Annual Working Days:</span>
                <span className="font-mono">{yearlyTotals.totalWorkingDays} Days</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-800">
                <span>Total Days Attended:</span>
                <span className="font-mono">{yearlyTotals.totalPresentDays} Days ({yearlyTotals.overallRate}%)</span>
              </div>
              <div className="flex justify-between font-bold text-rose-700">
                <span>Annual Salary Cuts:</span>
                <span className="font-mono">-₹{yearlyTotals.totalSalaryCuts.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-black text-slate-900 border-t border-slate-300 pt-1 text-sm">
                <span>Net Disbursed ({yearlyTotals.paidMonthsCount} Mo):</span>
                <span className="font-mono">₹{yearlyTotals.totalNetDisbursed.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Print Signatures */}
          <div className="flex justify-between items-end mt-16 pt-6 border-t-2 border-slate-400 text-[10px] text-slate-600">
            <div>
              <div className="h-10 border-b border-slate-500 w-44 mb-1"></div>
              <span className="font-bold text-slate-900">Employee Signature ({member.name})</span>
            </div>
            <div className="text-right">
              <div className="h-10 border-b border-slate-500 w-52 mb-1"></div>
              <span className="font-bold text-slate-900">Authorized Practice Signatory & Seal</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
