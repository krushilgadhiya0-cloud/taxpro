import React, { useState, useEffect, useMemo } from 'react';
import { 
  IndianRupee, 
  Users, 
  QrCode, 
  Search, 
  ChevronRight, 
  CheckCircle2, 
  CloudLightning, 
  Download, 
  Printer, 
  User, 
  Building, 
  Smartphone, 
  FileText, 
  Send, 
  Calendar, 
  BadgeIndianRupee, 
  History, 
  AlertCircle, 
  Gift, 
  X, 
  CheckCheck, 
  Copy, 
  Check, 
  Edit3, 
  Sparkles, 
  ExternalLink,
  Filter,
  ArrowRight,
  ChevronLeft,
  DollarSign,
  CreditCard,
  Receipt,
  Layers,
  ArrowUpRight,
  Clock,
  Scissors,
  TrendingUp,
  BarChart2
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { logAuditActivity } from '../../lib/auditLogger';
import { printHtml } from '../../lib/printHelper';
import { formatDate } from '../../lib/dateUtils';
import MemberAttendanceDossierModal from './MemberAttendanceDossierModal';

export default function MembersPaymentView({ onShowToast }) {
  // Main View Mode: 'monthly_disbursal' | 'all_records' | 'member_statement'
  const [viewMode, setViewMode] = useState('monthly_disbursal');
  
  // Data States
  const [members, setMembers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [payrollConfigs, setPayrollConfigs] = useState({});
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Member Dossier Modal State
  const [dossierMember, setDossierMember] = useState(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  // Selected Month & Year for Disbursal Cycle (Default to current month/year)
  const today = new Date();
  const currentYearStr = String(today.getFullYear());
  const currentMonthNum = String(today.getMonth() + 1).padStart(2, '0');
  
  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthNum);
  const [disbursalTab, setDisbursalTab] = useState('pending'); // 'pending' | 'paid' | 'all'
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Member for Statement / Quick Action
  const [selectedMember, setSelectedMember] = useState(null);
  const [statementMember, setStatementMember] = useState(null);

  // Salary Payment Modal States
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payTargetMember, setPayTargetMember] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI'); // 'UPI' | 'Bank Transfer' | 'Cash' | 'Cheque'
  const [payCycle, setPayCycle] = useState('');
  const [upiRefNo, setUpiRefNo] = useState('');
  const [inlineUpiInput, setInlineUpiInput] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Staff UPI Config Modal
  const [isUpiModalOpen, setIsUpiModalOpen] = useState(false);
  const [upiTargetMember, setUpiTargetMember] = useState(null);
  const [memberUpiInput, setMemberUpiInput] = useState('');

  // Base Salary Config Modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configTargetMember, setConfigTargetMember] = useState(null);
  const [configForm, setConfigForm] = useState({ salary: '', bonus: '' });

  // Performance Bonus Modal
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [bonusTargetMember, setBonusTargetMember] = useState(null);
  const [bonusForm, setBonusForm] = useState({ amount: '', description: '' });

  // All Payment Records Filters
  const [recordSearch, setRecordSearch] = useState('');
  const [recordMemberFilter, setRecordMemberFilter] = useState('ALL');
  const [recordYearFilter, setRecordYearFilter] = useState('ALL');
  const [recordMonthFilter, setRecordMonthFilter] = useState('ALL');
  const [recordMethodFilter, setRecordMethodFilter] = useState('ALL');

  // Print Configuration States
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printDocType, setPrintDocType] = useState('monthly_register'); // 'monthly_register' | 'single_voucher' | 'member_statement' | 'all_records'
  const [singleVoucherData, setSingleVoucherData] = useState(null);

  const MONTH_NAMES = [
    { num: '01', name: 'January', short: 'Jan' },
    { num: '02', name: 'February', short: 'Feb' },
    { num: '03', name: 'March', short: 'Mar' },
    { num: '04', name: 'April', short: 'Apr' },
    { num: '05', name: 'May', short: 'May' },
    { num: '06', name: 'June', short: 'Jun' },
    { num: '07', name: 'July', short: 'Jul' },
    { num: '08', name: 'August', short: 'Aug' },
    { num: '09', name: 'September', short: 'Sep' },
    { num: '10', name: 'October', short: 'Oct' },
    { num: '11', name: 'November', short: 'Nov' },
    { num: '12', name: 'December', short: 'Dec' }
  ];

  // Helper to extract member's UPI ID from all layers
  const getMemberUpi = (m) => {
    if (!m) return '';
    return m.upi_id || localStorage.getItem(`taxpro_upi_${m.id}`) || localStorage.getItem(`taxpro_upi_${m.email}`) || '';
  };

  // Helper to generate dynamic UPI QR URL
  const getUpiQrUrl = (upiId, name, amount) => {
    if (!upiId || !upiId.trim()) return '';
    const cleanUpi = upiId.trim();
    const cleanName = (name || 'Staff Member').trim();
    const amtStr = amount && !isNaN(amount) && Number(amount) > 0 ? `&am=${Number(amount).toFixed(2)}` : '';
    const upiUri = `upi://pay?pa=${cleanUpi}&pn=${encodeURIComponent(cleanName)}${amtStr}&cu=INR&tn=${encodeURIComponent('Salary Disbursement')}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUri)}&margin=8`;
  };

  // Fetch Team Members & Attendance & Payroll Configs & History
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [memberRes, attendanceRes] = await Promise.all([
        supabase.from('team_members').select('*').order('name', { ascending: true }),
        supabase.from('attendance').select('*')
      ]);

      if (memberRes.data) {
        setMembers(memberRes.data);
        if (!selectedMember && memberRes.data.length > 0) {
          setSelectedMember(memberRes.data[0]);
        }
      }

      if (attendanceRes.data) {
        setAttendanceRecords(attendanceRes.data);
      }

      const configs = JSON.parse(localStorage.getItem('taxpro_payroll_configs')) || {};
      setPayrollConfigs(configs);

      const history = JSON.parse(localStorage.getItem('taxpro_payroll_history')) || [];
      setPaymentHistory(history);
    } catch (e) {
      console.warn('[Fetch Payroll Data Error]:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const handleDbUpdate = () => fetchData();
    window.addEventListener('taxpro_db_updated', handleDbUpdate);
    window.addEventListener('taxpro_upi_updated', handleDbUpdate);
    return () => {
      window.removeEventListener('taxpro_db_updated', handleDbUpdate);
      window.removeEventListener('taxpro_upi_updated', handleDbUpdate);
    };
  }, []);

  // Save base salary config
  const saveConfig = (memberId, configData) => {
    const updated = { ...payrollConfigs, [memberId]: configData };
    setPayrollConfigs(updated);
    localStorage.setItem('taxpro_payroll_configs', JSON.stringify(updated));
    if (onShowToast) onShowToast('Base salary & bonus configuration updated!', 'success');
    setIsConfigModalOpen(false);
    fetchData();
  };

  // Save UPI ID for staff
  const handleSaveMemberUpi = async (e) => {
    if (e) e.preventDefault();
    if (!upiTargetMember) return;
    const cleanUpi = memberUpiInput.trim();
    if (!cleanUpi || !cleanUpi.includes('@')) {
      if (onShowToast) onShowToast('Please provide a valid UPI ID (e.g. name@okaxis).', 'error');
      return;
    }

    localStorage.setItem(`taxpro_upi_${upiTargetMember.id}`, cleanUpi);
    if (upiTargetMember.email) localStorage.setItem(`taxpro_upi_${upiTargetMember.email}`, cleanUpi);

    try {
      await supabase.from('team_members').update({ upi_id: cleanUpi }).eq('id', upiTargetMember.id);
    } catch (err) {}

    setMembers(prev => prev.map(m => m.id === upiTargetMember.id ? { ...m, upi_id: cleanUpi } : m));
    if (selectedMember && selectedMember.id === upiTargetMember.id) {
      setSelectedMember(prev => ({ ...prev, upi_id: cleanUpi }));
    }

    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
    if (onShowToast) onShowToast(`✓ UPI ID for ${upiTargetMember.name} saved!`, 'success');
    setIsUpiModalOpen(false);
  };

  // Selected Month Cycle Key (e.g. '2026-08')
  const currentCycleKey = `${selectedYear}-${selectedMonth}`;
  const currentMonthObj = MONTH_NAMES.find(m => m.num === selectedMonth) || MONTH_NAMES[7];

  // Allowed monthly leaves policy
  const allowedMonthlyLeaves = Number(localStorage.getItem('taxpro_allowed_monthly_leaves') || '1');
  const standardWorkingDays = Math.max(22, (currentMonthObj?.days || 30) - 4); // ~26 working days

  // Custom salary cuts state from localStorage
  const customSalaryCuts = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('taxpro_attendance_custom_cuts')) || {};
    } catch(e) {
      return {};
    }
  }, []);

  // Compute Members Status & Leave Deductions for the Selected Month Cycle
  const monthlyMemberStatusList = useMemo(() => {
    return members.map(m => {
      const cfg = payrollConfigs[m.id];
      const baseSalary = cfg?.salary 
        ? Number(cfg.salary) 
        : (m.salary ? Number(String(m.salary).replace(/[^0-9.]/g, '')) : 25000);

      // Attendance records for this member in this month
      const monthRecords = attendanceRecords.filter(r => {
        const isMember = r.member_id === m.id || r.employee_name === m.name || r.name === m.name;
        const isMonth = r.date && r.date.startsWith(currentCycleKey);
        return isMember && isMonth;
      });

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

      const loggedDays = presentCount + halfDayCount + absentCount + onLeaveCount;
      if (loggedDays < standardWorkingDays && loggedDays > 0) {
        presentCount += Math.max(0, standardWorkingDays - loggedDays);
      } else if (loggedDays === 0) {
        presentCount = standardWorkingDays;
      }

      // Unpaid Deductible Days: ONLY Absent (1.0x) and Half Day (0.5x). Approved Leaves (On Leave) = ₹0 Cut (Fully Paid).
      const unpaidDeductibleDays = absentCount + (halfDayCount * 0.5);

      const dailyRate = standardWorkingDays > 0 ? (baseSalary / standardWorkingDays) : 0;
      const autoCalculatedCut = Math.round(unpaidDeductibleDays * dailyRate);

      const customKey = `${currentCycleKey}_${m.id}`;
      const customOverride = customSalaryCuts[customKey];
      const hasCustomCut = customOverride && customOverride.customAmount !== undefined && customOverride.customAmount !== null;
      const leaveDeduction = hasCustomCut ? Number(customOverride.customAmount) : autoCalculatedCut;

      const netSalary = Math.max(0, baseSalary - leaveDeduction);

      // Check if this member has a 'Paid' salary record for this cycle
      const paidRecord = paymentHistory.find(h => 
        h.memberId === m.id && 
        h.status === 'Paid' && 
        (h.cycle === currentCycleKey || (h.date && h.date.startsWith(currentCycleKey) && (h.description || '').toLowerCase().includes('salary')))
      );

      const isPaid = Boolean(paidRecord);

      return {
        member: m,
        baseSalary,
        presentCount,
        halfDayCount,
        absentCount,
        onLeaveCount,
        unpaidDeductibleDays,
        dailyRate,
        leaveDeduction,
        hasCustomCut,
        netSalary,
        isPaid,
        paidRecord: paidRecord || null,
        upiId: getMemberUpi(m)
      };
    });
  }, [members, payrollConfigs, paymentHistory, attendanceRecords, currentCycleKey, standardWorkingDays, customSalaryCuts]);

  // Filtered members for the Monthly Disbursal view
  const filteredDisbursalMembers = useMemo(() => {
    return monthlyMemberStatusList.filter(item => {
      // Tab filter: 'pending' (Unpaid only), 'paid' (Paid only), 'all'
      if (disbursalTab === 'pending' && item.isPaid) return false;
      if (disbursalTab === 'paid' && !item.isPaid) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (item.member.name || '').toLowerCase().includes(q);
        const roleMatch = (item.member.role || '').toLowerCase().includes(q);
        const deptMatch = (item.member.department || '').toLowerCase().includes(q);
        if (!nameMatch && !roleMatch && !deptMatch) return false;
      }

      return true;
    });
  }, [monthlyMemberStatusList, disbursalTab, searchQuery]);

  // Monthly Summary Totals
  const monthlyMetrics = useMemo(() => {
    let totalObligation = 0;
    let totalDisbursed = 0;
    let pendingAmount = 0;
    let totalLeaveCuts = 0;
    let paidCount = 0;
    let pendingCount = 0;

    monthlyMemberStatusList.forEach(item => {
      totalObligation += item.baseSalary;
      totalLeaveCuts += item.leaveDeduction;
      if (item.isPaid) {
        totalDisbursed += Number(item.paidRecord?.amount || item.netSalary);
        paidCount++;
      } else {
        pendingAmount += item.netSalary;
        pendingCount++;
      }
    });

    return {
      totalObligation,
      totalLeaveCuts,
      totalDisbursed,
      pendingAmount,
      paidCount,
      pendingCount,
      totalCount: monthlyMemberStatusList.length
    };
  }, [monthlyMemberStatusList]);

  // Active Pay Target Item state for modal details
  const [payTargetItem, setPayTargetItem] = useState(null);

  // Open Payment Modal for a Member
  const handleOpenPayModal = (memberItem) => {
    const m = memberItem.member;
    setPayTargetMember(m);
    setPayTargetItem(memberItem);
    setPayAmount(String(memberItem.netSalary || memberItem.baseSalary || ''));
    setPayMethod('UPI');
    setPayCycle(currentCycleKey);
    setUpiRefNo('');
    setInlineUpiInput('');
    setIsPayModalOpen(true);
  };

  // EXECUTE SALARY PAYMENT -> PERSIST, LOG & MOVE FROM PENDING TO PAID
  const handleConfirmPayout = async () => {
    if (!payAmount || isNaN(payAmount) || Number(payAmount) <= 0) {
      if (onShowToast) onShowToast('Please enter a valid disbursement amount.', 'error');
      return;
    }
    if (!payTargetMember) return;

    setIsSubmittingPay(true);
    const payNum = Number(payAmount);
    const txnRef = upiRefNo.trim() || `PAY-${Date.now().toString().slice(-6)}`;
    const effectiveUpi = inlineUpiInput.trim() || getMemberUpi(payTargetMember);

    // If inline UPI provided, save it
    if (inlineUpiInput.trim()) {
      localStorage.setItem(`taxpro_upi_${payTargetMember.id}`, inlineUpiInput.trim());
      if (payTargetMember.email) localStorage.setItem(`taxpro_upi_${payTargetMember.email}`, inlineUpiInput.trim());
      try {
        await supabase.from('team_members').update({ upi_id: inlineUpiInput.trim() }).eq('id', payTargetMember.id);
      } catch (e) {}
    }

    const monthName = currentMonthObj?.name || 'Month';
    const newPayment = {
      id: `PAY-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      memberId: payTargetMember.id,
      memberName: payTargetMember.name,
      memberRole: payTargetMember.role || 'Staff',
      memberDept: payTargetMember.department || 'Operations',
      cycle: payCycle || currentCycleKey,
      cycleName: `${monthName} ${selectedYear}`,
      amount: payNum,
      method: payMethod,
      reference: txnRef,
      description: `Monthly Salary Disbursement - ${monthName} ${selectedYear}`,
      date: new Date().toISOString(),
      status: 'Paid',
      paidBy: localStorage.getItem('taxpro_user_fullname') || 'Administrator',
      upiId: effectiveUpi
    };

    // 1. Update local storage history
    const updatedHistory = [newPayment, ...paymentHistory.filter(h => !(h.memberId === payTargetMember.id && h.cycle === (payCycle || currentCycleKey)))];
    setPaymentHistory(updatedHistory);
    localStorage.setItem('taxpro_payroll_history', JSON.stringify(updatedHistory));

    // 2. Insert into Supabase 'receipts_payments' for Ledger integration
    try {
      await supabase.from('receipts_payments').insert([{
        id: `REC-STAFF-${Date.now()}`,
        title: `Salary Disbursement - ${payTargetMember.name} (${monthName} ${selectedYear})`,
        type: 'expense',
        category: 'Staff Salary & Payroll',
        amount: payNum,
        method: payMethod,
        party: payTargetMember.name,
        date: new Date().toISOString().slice(0, 10),
        reference: txnRef,
        notes: `Salary Payout for ${monthName} ${selectedYear} via ${payMethod}. Txn Ref: ${txnRef}`
      }]);
    } catch (err) {}

    // 3. Log Audit Activity
    logAuditActivity({
      action: 'DISBURSE_SALARY',
      module: 'Members Payment',
      details: `Disbursed salary of ₹${payNum.toLocaleString('en-IN')} to "${payTargetMember.name}" for ${monthName} ${selectedYear} via ${payMethod} (Ref: ${txnRef})`,
      metadata: { member: payTargetMember.name, cycle: `${monthName} ${selectedYear}`, amount: payNum, method: payMethod, reference: txnRef }
    });

    window.dispatchEvent(new CustomEvent('taxpro_financial_updated'));
    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

    setIsSubmittingPay(false);
    setIsPayModalOpen(false);
    if (onShowToast) onShowToast(`✓ Salary of ₹${payNum.toLocaleString('en-IN')} successfully paid to ${payTargetMember.name}!`, 'success');
  };

  // Queue Performance Bonus
  const handleCreateBonus = () => {
    if (!bonusForm.amount || isNaN(bonusForm.amount) || Number(bonusForm.amount) <= 0) {
      if (onShowToast) onShowToast('Please enter a valid bonus amount.', 'error');
      return;
    }
    if (!bonusTargetMember) return;

    const bonusNum = Number(bonusForm.amount);
    const newBonusRecord = {
      id: `BNS-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      memberId: bonusTargetMember.id,
      memberName: bonusTargetMember.name,
      memberRole: bonusTargetMember.role || 'Staff',
      memberDept: bonusTargetMember.department || 'Operations',
      cycle: currentCycleKey,
      cycleName: `${currentMonthObj?.name} ${selectedYear}`,
      amount: bonusNum,
      method: 'Pending',
      description: bonusForm.description.trim() || 'Performance Bonus',
      date: new Date().toISOString(),
      status: 'Unpaid'
    };

    const updated = [newBonusRecord, ...paymentHistory];
    setPaymentHistory(updated);
    localStorage.setItem('taxpro_payroll_history', JSON.stringify(updated));

    logAuditActivity({
      action: 'ADD_BONUS',
      module: 'Members Payment',
      details: `Queued performance bonus of ₹${bonusNum.toLocaleString('en-IN')} for "${bonusTargetMember.name}" (${newBonusRecord.description})`,
      metadata: { member: bonusTargetMember.name, amount: bonusNum }
    });

    if (onShowToast) onShowToast(`Bonus voucher of ₹${bonusNum.toLocaleString('en-IN')} queued for ${bonusTargetMember.name}!`, 'success');
    setIsBonusModalOpen(false);
    setBonusForm({ amount: '', description: '' });
  };

  // Filtered All Payment Records List
  const filteredAllRecords = useMemo(() => {
    return paymentHistory.filter(h => {
      // Member filter
      if (recordMemberFilter !== 'ALL' && h.memberId !== recordMemberFilter) return false;
      
      // Year filter
      if (recordYearFilter !== 'ALL') {
        const itemYear = (h.date || '').slice(0, 4);
        if (itemYear !== recordYearFilter && !h.cycle?.startsWith(recordYearFilter)) return false;
      }

      // Month filter
      if (recordMonthFilter !== 'ALL') {
        const itemMonth = (h.date || '').slice(5, 7);
        if (itemMonth !== recordMonthFilter && !h.cycle?.endsWith(recordMonthFilter)) return false;
      }

      // Method filter
      if (recordMethodFilter !== 'ALL' && h.method !== recordMethodFilter) return false;

      // Search
      if (recordSearch.trim()) {
        const q = recordSearch.toLowerCase();
        const nameMatch = (h.memberName || '').toLowerCase().includes(q);
        const descMatch = (h.description || '').toLowerCase().includes(q);
        const refMatch = (h.reference || h.id || '').toLowerCase().includes(q);
        if (!nameMatch && !descMatch && !refMatch) return false;
      }

      return true;
    });
  }, [paymentHistory, recordMemberFilter, recordYearFilter, recordMonthFilter, recordMethodFilter, recordSearch]);

  // Total amount of filtered records
  const totalFilteredRecordsAmount = useMemo(() => {
    return filteredAllRecords.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  }, [filteredAllRecords]);

  // Open Single Payslip Print
  const handlePrintSingleVoucher = (record) => {
    setSingleVoucherData(record);
    setPrintDocType('single_voucher');
    triggerPrintExecution(`Official Salary Slip - ${record.memberName}`);
  };

  // Open Monthly Register Print
  const handlePrintMonthlyRegister = () => {
    setPrintDocType('monthly_register');
    triggerPrintExecution(`Staff Payroll Register - ${currentMonthObj?.name} ${selectedYear}`);
  };

  // Open All Records Master Ledger Print
  const handlePrintAllRecords = () => {
    setPrintDocType('all_records');
    triggerPrintExecution(`Complete Staff Payment Ledger`);
  };

  // Open Member Statement Print
  const handlePrintMemberStatement = (memberObj) => {
    setStatementMember(memberObj);
    setPrintDocType('member_statement');
    triggerPrintExecution(`Payment Statement - ${memberObj.name}`);
  };

  const triggerPrintExecution = (title) => {
    logAuditActivity({
      action: 'PRINT_DOCUMENT',
      module: 'Members Payment',
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

  // Navigate cycle helper
  const handlePrevMonth = () => {
    let m = parseInt(selectedMonth, 10) - 1;
    let y = parseInt(selectedYear, 10);
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setSelectedMonth(String(m).padStart(2, '0'));
    setSelectedYear(String(y));
  };

  const handleNextMonth = () => {
    let m = parseInt(selectedMonth, 10) + 1;
    let y = parseInt(selectedYear, 10);
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setSelectedMonth(String(m).padStart(2, '0'));
    setSelectedYear(String(y));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f3f4f6] min-h-screen text-gray-800 relative printable-area-container font-sans">
      
      {/* 1. TOP HEADER & MAIN NAVIGATION TABS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
              Staff Payroll Governance
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-outfit text-[#1e1e2d] tracking-tight">
            Members Payment & Salary Disbursements
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage monthly salary clearances, scan dynamic staff UPI QR codes, track payout archives, and print payslips.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-white p-1 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-1">
            <button
              onClick={() => setViewMode('monthly_disbursal')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                viewMode === 'monthly_disbursal'
                  ? 'bg-[#5b52e0] text-white shadow-md shadow-indigo-600/30'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Monthly Disbursal Desk</span>
            </button>

            <button
              onClick={() => setViewMode('all_records')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                viewMode === 'all_records'
                  ? 'bg-[#5b52e0] text-white shadow-md shadow-indigo-600/30'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>All Payment Records & Ledger ({paymentHistory.length})</span>
            </button>
          </div>

          {viewMode === 'monthly_disbursal' ? (
            <button
              onClick={handlePrintMonthlyRegister}
              className="px-3.5 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
              title="Print consolidated monthly payroll register"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>Print Month Register</span>
            </button>
          ) : (
            <button
              onClick={handlePrintAllRecords}
              className="px-3.5 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
              title="Print master payment records table"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>Print All Records</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: MONTHLY DISBURSAL DESK */}
      {/* ========================================================================= */}
      {viewMode === 'monthly_disbursal' && (
        <div className="space-y-6 print:hidden">

          {/* Month & Year Selection Bar + KPI Summary Row */}
          <div className="bg-gradient-to-r from-[#181c32] via-slate-900 to-indigo-950 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-indigo-500/20">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
              
              {/* Month Navigator Controls */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2">
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
                    {['2024', '2025', '2026', '2027', '2028'].map(y => (
                      <option key={y} value={y} className="bg-slate-900 text-white font-bold">
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <span className="text-xs font-mono font-bold text-indigo-300 ml-2 hidden sm:inline">
                  Salary Cycle: {currentMonthObj?.name} {selectedYear}
                </span>
              </div>

              {/* Status Quick Badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-300 font-medium">Cycle Status:</span>
                {monthlyMetrics.pendingCount === 0 && monthlyMetrics.totalCount > 0 ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black flex items-center gap-1.5 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> All Paid for {currentMonthObj?.short} {selectedYear}
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black flex items-center gap-1.5 font-mono">
                    <Clock className="w-3.5 h-3.5 text-amber-400" /> {monthlyMetrics.pendingCount} Pending Clearances
                  </span>
                )}
              </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="text-[10px] uppercase font-black tracking-wider text-gray-400">Total Monthly Payroll Due</div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">
                  ₹{monthlyMetrics.totalObligation.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">Across {monthlyMetrics.totalCount} active team members</div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
                <div className="text-[10px] uppercase font-black tracking-wider text-emerald-300">Total Disbursed This Month</div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 mt-1">
                  ₹{monthlyMetrics.totalDisbursed.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-emerald-300/80 mt-1 flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> {monthlyMetrics.paidCount} of {monthlyMetrics.totalCount} staff members paid
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
                <div className="text-[10px] uppercase font-black tracking-wider text-amber-300">Remaining Pending Payouts</div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400 mt-1">
                  ₹{monthlyMetrics.pendingAmount.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-amber-300/80 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> {monthlyMetrics.pendingCount} staff awaiting payment
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar for Monthly Members */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Filter Tabs: Pending / Paid / All */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setDisbursalTab('pending')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  disbursalTab === 'pending'
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-200'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>⚡ Pending Due ({monthlyMetrics.pendingCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setDisbursalTab('paid')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  disbursalTab === 'paid'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-200'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>✅ Paid This Month ({monthlyMetrics.paidCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setDisbursalTab('all')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  disbursalTab === 'all'
                    ? 'bg-[#5b52e0] text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-200'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>👥 All Staff ({monthlyMetrics.totalCount})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff name or role..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* Members Disbursal Grid / Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredDisbursalMembers.length === 0 ? (
              <div className="col-span-full bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400 shadow-xs">
                {disbursalTab === 'pending' ? (
                  <div className="flex flex-col items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
                    <h3 className="text-base font-black text-gray-800">No Pending Salaries for {currentMonthObj?.name} {selectedYear}</h3>
                    <p className="text-xs text-gray-500 mt-1">All staff members have been paid for this monthly cycle.</p>
                  </div>
                ) : disbursalTab === 'paid' ? (
                  <div className="flex flex-col items-center justify-center">
                    <Clock className="w-12 h-12 text-amber-500 mb-3" />
                    <h3 className="text-base font-black text-gray-800">No Salaries Disbursed Yet for {currentMonthObj?.name} {selectedYear}</h3>
                    <p className="text-xs text-gray-500 mt-1">Switch to "Pending Due" to start clearing monthly payrolls.</p>
                  </div>
                ) : (
                  <p className="text-xs italic">No team members match your search criteria.</p>
                )}
              </div>
            ) : (
              filteredDisbursalMembers.map(item => {
                const m = item.member;
                const isPaid = item.isPaid;
                const paidRec = item.paidRecord;

                return (
                  <div
                    key={m.id}
                    className={`border rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between ${
                      isPaid 
                        ? 'bg-white border-emerald-200 hover:border-emerald-300' 
                        : 'bg-white border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <div>
                      {/* Member Header - Clickable for Full Dossier */}
                      <div 
                        onClick={() => {
                          setDossierMember(m);
                          setIsDossierOpen(true);
                        }}
                        className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100 mb-3 cursor-pointer hover:bg-slate-50/80 -mx-2 px-2 py-1 rounded-xl transition-colors group"
                        title="Click to view full Monthly & Yearly Attendance & Salary Dossier"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-xs group-hover:scale-105 transition-transform ${
                            isPaid ? 'bg-emerald-600' : 'bg-indigo-600'
                          }`}>
                            {m.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-extrabold text-sm text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors">{m.name}</h3>
                              <TrendingUp className="w-3.5 h-3.5 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">{m.role || 'Staff'} • {m.department || 'Operations'}</p>
                          </div>
                        </div>

                        {/* Status Tag */}
                        {isPaid ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black font-mono flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" /> Paid
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" /> Due
                          </span>
                        )}
                      </div>

                      {/* Salary & Net Amount Breakdown */}
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200/80">
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Monthly Base</span>
                          <span className="font-mono font-black text-sm text-gray-900">
                            ₹{item.baseSalary.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className={`p-2.5 rounded-xl border ${
                          isPaid ? 'bg-emerald-50/50 border-emerald-200' : 'bg-indigo-50/40 border-indigo-100'
                        }`}>
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">
                            {isPaid ? 'Net Disbursed' : 'Payable Net'}
                          </span>
                          <span className={`font-mono font-black text-sm ${
                            isPaid ? 'text-emerald-700' : 'text-indigo-700'
                          }`}>
                            ₹{Number(isPaid ? (paidRec?.amount || item.netSalary) : item.netSalary).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Attendance Leave Deductions Breakdown */}
                      <div className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-xl mb-3">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                          <Scissors className="w-3.5 h-3.5 text-rose-500" />
                          <span>Leave Deductions:</span>
                        </div>
                        {item.leaveDeduction > 0 ? (
                          <span className="font-mono font-black text-rose-600 text-xs flex items-center gap-1">
                            -₹{item.leaveDeduction.toLocaleString('en-IN')}
                            <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[9px] font-black font-mono">
                              {item.absentCount > 0 ? `${item.absentCount}A ` : ''}{item.halfDayCount > 0 ? `${item.halfDayCount}HD` : ''}
                            </span>
                          </span>
                        ) : (
                          <span className="font-mono font-bold text-emerald-700 text-[11px] flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" /> ₹0 (Fully Paid)
                          </span>
                        )}
                      </div>

                      {/* UPI ID Info */}
                      <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 text-xs mb-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 font-mono">
                            <QrCode className="w-3 h-3 text-indigo-400" /> Staff UPI VPA
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setUpiTargetMember(m);
                              setMemberUpiInput(item.upiId || '');
                              setIsUpiModalOpen(true);
                            }}
                            className="text-[10px] text-indigo-300 hover:text-white font-bold cursor-pointer underline"
                          >
                            {item.upiId ? 'Edit' : '+ Add'}
                          </button>
                        </div>
                        <div className="font-mono font-bold text-xs truncate text-emerald-400">
                          {item.upiId || <span className="text-gray-500 font-sans italic">Not configured</span>}
                        </div>
                      </div>

                      {/* Payment Metadata if Paid */}
                      {isPaid && paidRec && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-950 mb-3 space-y-0.5">
                          <div className="font-bold flex items-center justify-between">
                            <span>Paid via: {paidRec.method || 'UPI'}</span>
                            <span className="font-mono text-[10px] text-emerald-700">{formatDate(paidRec.date)}</span>
                          </div>
                          {paidRec.reference && (
                            <div className="font-mono text-[10px] text-emerald-800 truncate">
                              Ref: {paidRec.reference}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setDossierMember(m);
                          setIsDossierOpen(true);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] border border-indigo-200 flex items-center gap-1 cursor-pointer transition-colors"
                        title="View monthly/yearly attendance calendar & salary analytics dossier"
                      >
                        <TrendingUp className="w-3 h-3 text-indigo-600" />
                        <span>📊 Progress</span>
                      </button>

                      {!isPaid ? (
                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setConfigTargetMember(m);
                              setConfigForm({
                                salary: payrollConfigs[m.id]?.salary || (m.salary ? String(m.salary).replace(/[^0-9.]/g, '') : ''),
                                bonus: payrollConfigs[m.id]?.bonus || ''
                              });
                              setIsConfigModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11px] cursor-pointer"
                            title="Configure base salary"
                          >
                            ⚙️ Base
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenPayModal(item)}
                            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>⚡ Disburse Salary</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setStatementMember(m);
                              setViewMode('all_records');
                              setRecordMemberFilter(m.id);
                            }}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11px] rounded-lg cursor-pointer flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5 text-gray-500" />
                            <span>Ledger</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePrintSingleVoucher(paidRec)}
                            className="px-3.5 py-2 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-600" />
                            <span>🖨️ Payslip</span>
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: ALL PAYMENT RECORDS & MASTER LEDGER */}
      {/* ========================================================================= */}
      {viewMode === 'all_records' && (
        <div className="space-y-6 print:hidden">
          
          {/* Master Filters Toolbar */}
          <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-600" />
                  <span>Consolidated Payment History & Records</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Complete audit log of all disbursed salaries, bonuses, vouchers, and payment transaction references.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">Filtered Total:</span>
                <span className="font-mono font-black text-base text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                  ₹{totalFilteredRecordsAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              
              {/* Search Query */}
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Search Records</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search name, ref..."
                    value={recordSearch}
                    onChange={e => setRecordSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Filter by Member */}
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Employee</label>
                <select
                  value={recordMemberFilter}
                  onChange={e => setRecordMemberFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="ALL">All Staff Members</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Filter by Year */}
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Year</label>
                <select
                  value={recordYearFilter}
                  onChange={e => setRecordYearFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="ALL">All Years</option>
                  {['2024', '2025', '2026', '2027'].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Filter by Month */}
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Month</label>
                <select
                  value={recordMonthFilter}
                  onChange={e => setRecordMonthFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="ALL">All Months</option>
                  {MONTH_NAMES.map(m => (
                    <option key={m.num} value={m.num}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Filter by Method */}
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Payment Method</label>
                <select
                  value={recordMethodFilter}
                  onChange={e => setRecordMethodFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="ALL">All Payment Methods</option>
                  <option value="UPI">UPI Instant QR</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  <option value="Cash">Cash Voucher</option>
                  <option value="Cheque">Cheque Deposit</option>
                </select>
              </div>

            </div>
          </div>

          {/* Records Table */}
          <div className="bg-white border border-gray-200 rounded-3xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="p-4">Txn ID / Ref</th>
                    <th className="p-4">Disbursement Date</th>
                    <th className="p-4">Employee / Role</th>
                    <th className="p-4">Salary Cycle</th>
                    <th className="p-4">Payment Method</th>
                    <th className="p-4 text-right">Amount (₹)</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAllRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-gray-400 italic">
                        No payment records found matching the active filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAllRecords.map(rec => (
                      <tr key={rec.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="p-4 font-mono font-bold text-gray-900">
                          <div>{rec.id}</div>
                          {rec.reference && (
                            <div className="text-[10px] text-gray-400 font-mono">Ref: {rec.reference}</div>
                          )}
                        </td>
                        <td className="p-4 font-mono text-gray-600">
                          <div>{formatDate(rec.date)}</div>
                          <div className="text-[10px] text-gray-400">{new Date(rec.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-gray-900">{rec.memberName}</div>
                          <div className="text-[10px] text-gray-500">{rec.memberRole || 'Staff'}</div>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-100 font-mono">
                            {rec.cycleName || rec.cycle || 'Monthly Cycle'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-mono font-bold text-gray-800">{rec.method || 'UPI'}</div>
                          {rec.upiId && <div className="text-[10px] text-emerald-600 font-mono truncate max-w-[140px]">{rec.upiId}</div>}
                        </td>
                        <td className="p-4 text-right font-mono font-black text-sm text-gray-900">
                          ₹{Number(rec.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black font-mono ${
                            rec.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {rec.status || 'Paid'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => handlePrintSingleVoucher(rec)}
                            className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-indigo-600 font-bold text-[11px] shadow-2xs flex items-center gap-1.5 ml-auto cursor-pointer transition-colors"
                            title="Print official payslip for this transaction"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print Slip</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PRINTABLE OFFICIAL DOCUMENT (RENDERED ONLY DURING WINDOW.PRINT()) */}
      {/* ========================================================================= */}
      <div className="hidden print:block member-print-document bg-white text-black p-0 m-0">
        
        {/* PRINT HEADER */}
        <div className="border-b-2 border-gray-900 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black font-outfit uppercase tracking-tight text-gray-900">
                {localStorage.getItem('taxpro_firm_name') || 'TAXPRO ADVISORY & TAX ASSOCIATES'}
              </h1>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-700 mt-0.5">
                {printDocType === 'single_voucher'
                  ? 'Official Employee Salary Payslip & Disbursement Receipt'
                  : printDocType === 'monthly_register'
                  ? `Consolidated Staff Payroll Register — ${currentMonthObj?.name} ${selectedYear}`
                  : `Master Staff Payment & Disbursement Ledger`}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                GSTIN: {localStorage.getItem('taxpro_firm_gst') || '24AAAAA0000A1Z5'} • PAN: {localStorage.getItem('taxpro_firm_pan') || 'AAATF1234C'}
              </p>
            </div>

            <div className="text-right">
              <div className="text-xs font-mono font-black text-gray-900">
                {formatDate(new Date())}
              </div>
              <div className="text-[10px] font-mono text-gray-600 mt-0.5">
                Verified System Slip
              </div>
            </div>
          </div>
        </div>

        {/* PRINT CONTENT: SINGLE VOUCHER */}
        {printDocType === 'single_voucher' && singleVoucherData && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 border border-gray-300 p-4 rounded-xl text-xs">
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Employee Name</span>
                <span className="font-bold text-sm text-gray-900">{singleVoucherData.memberName}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Designation / Role</span>
                <span className="font-semibold text-gray-800">{singleVoucherData.memberRole || 'Staff'} ({singleVoucherData.memberDept || 'Operations'})</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Salary Cycle Period</span>
                <span className="font-mono font-bold text-gray-900">{singleVoucherData.cycleName || singleVoucherData.cycle}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Disbursement Date & Time</span>
                <span className="font-mono text-gray-800">{formatDateTime(singleVoucherData.date)}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Payment Mode & Ref</span>
                <span className="font-mono font-bold text-gray-800">{singleVoucherData.method} • Ref: {singleVoucherData.reference || singleVoucherData.id}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Recipient UPI ID</span>
                <span className="font-mono font-bold text-emerald-800">{singleVoucherData.upiId || 'Direct Transfer'}</span>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100 text-gray-800 font-extrabold uppercase text-[10px]">
                  <th className="p-3 border border-gray-300">Earnings Description</th>
                  <th className="p-3 border border-gray-300">Payment Channel</th>
                  <th className="p-3 border border-gray-300 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border border-gray-300 font-bold">{singleVoucherData.description || 'Monthly Salary Disbursement'}</td>
                  <td className="p-3 border border-gray-300 font-mono">{singleVoucherData.method || 'UPI Instant Transfer'}</td>
                  <td className="p-3 border border-gray-300 font-mono font-black text-right text-sm">
                    ₹{Number(singleVoucherData.amount).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="border border-gray-300 p-3 rounded-lg w-64 text-right bg-gray-50">
                <span className="text-[10px] text-gray-600 uppercase font-bold block">Net Salary Paid</span>
                <span className="text-xl font-black font-mono text-gray-900 block mt-0.5">
                  ₹{Number(singleVoucherData.amount).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* PRINT CONTENT: MONTHLY REGISTER OR ALL RECORDS */}
        {(printDocType === 'monthly_register' || printDocType === 'all_records') && (
          <div>
            <table className="w-full text-left text-xs border-collapse border border-gray-300 mb-6">
              <thead>
                <tr className="bg-gray-100 text-gray-800 font-extrabold uppercase text-[10px]">
                  <th className="p-2.5 border border-gray-300">Txn Ref</th>
                  <th className="p-2.5 border border-gray-300">Date</th>
                  <th className="p-2.5 border border-gray-300">Employee Name</th>
                  <th className="p-2.5 border border-gray-300">Cycle</th>
                  <th className="p-2.5 border border-gray-300">Channel</th>
                  <th className="p-2.5 border border-gray-300 text-right">Amount (₹)</th>
                  <th className="p-2.5 border border-gray-300 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {(printDocType === 'monthly_register' 
                  ? filteredDisbursalMembers.filter(x => x.isPaid).map(x => x.paidRecord).filter(Boolean)
                  : filteredAllRecords
                ).map((r, i) => (
                  <tr key={r.id || i}>
                    <td className="p-2 border border-gray-300 font-mono text-[10px]">{r.reference || r.id}</td>
                    <td className="p-2 border border-gray-300 font-mono">{formatDate(r.date)}</td>
                    <td className="p-2 border border-gray-300 font-bold">{r.memberName}</td>
                    <td className="p-2 border border-gray-300 font-mono text-[10px]">{r.cycleName || r.cycle}</td>
                    <td className="p-2 border border-gray-300 font-mono">{r.method}</td>
                    <td className="p-2 border border-gray-300 font-mono font-bold text-right">
                      ₹{Number(r.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2 border border-gray-300 text-center font-bold text-[10px]">{r.status || 'Paid'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mb-6">
              <div className="border border-gray-300 p-3 rounded-lg w-64 text-right bg-gray-50">
                <span className="text-[10px] text-gray-600 uppercase font-bold block">Total Disbursed Outflow</span>
                <span className="text-xl font-black font-mono text-gray-900 block mt-0.5">
                  ₹{(printDocType === 'monthly_register' ? monthlyMetrics.totalDisbursed : totalFilteredRecordsAmount).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* PRINT SIGNATURE FOOTER */}
        <div className="flex justify-between items-end mt-16 pt-6 border-t-2 border-gray-400 text-[10px] text-gray-600">
          <div>
            <p className="font-bold text-gray-900">TaxPro PMS • Certified Firm Payroll Record</p>
            <p>Generated automatically from live practice ledger.</p>
          </div>
          <div className="text-right">
            <div className="h-10 border-b border-gray-500 w-52 mb-1"></div>
            <span className="font-bold text-gray-900">Authorized Signatory / Administrator</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODALS (PAYOUT, UPI LINK, BASE CONFIG, BONUS) */}
      {/* ========================================================================= */}

      {/* SALARY PAYMENT MODAL WITH DYNAMIC UPI QR */}
      {isPayModalOpen && payTargetMember && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsPayModalOpen(false); }}
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:hidden"
        >
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-modal-smooth">
            
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
                  <CheckCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-slate-900">Disburse Monthly Salary</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Recipient: <strong className="text-slate-800">{payTargetMember.name}</strong> ({currentMonthObj?.name} {selectedYear})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer p-2 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 flex flex-col gap-4 text-xs font-semibold overflow-y-auto overscroll-contain chat-custom-scrollbar flex-1">
              
              {/* Detailed Salary Breakdown Card */}
              {payTargetItem && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 shadow-2xs">
                  <div className="flex justify-between text-slate-600 font-bold">
                    <span>Base Monthly Salary:</span>
                    <span className="font-mono text-slate-900 font-black">₹{payTargetItem.baseSalary.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between text-rose-600 font-bold">
                    <span className="flex items-center gap-1">
                      <Scissors className="w-3.5 h-3.5" />
                      Attendance Salary Deductions ({payTargetItem.absentCount} Absents, {payTargetItem.halfDayCount} Half Days):
                    </span>
                    <span className="font-mono font-black">
                      {payTargetItem.leaveDeduction > 0 ? `-₹${payTargetItem.leaveDeduction.toLocaleString('en-IN')}` : '₹0'}
                    </span>
                  </div>

                  <div className="flex justify-between text-emerald-800 font-black pt-2 border-t border-slate-200 text-sm">
                    <span>Net Disbursal Amount:</span>
                    <span className="font-mono">₹{payTargetItem.netSalary.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-slate-700 block mb-1">Disbursement Amount (₹) <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-500 text-sm">₹</span>
                  <input
                    type="number"
                    required
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-emerald-600 font-mono font-black text-sm text-slate-900 shadow-2xs"
                    placeholder="Enter amount"
                    autoFocus
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="text-slate-700 block mb-1.5">Payment Method</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: 'UPI', label: '⚡ UPI Instant QR' },
                    { id: 'Bank Transfer', label: '🏦 Bank Transfer' },
                    { id: 'Cash', label: '💵 Cash Voucher' },
                    { id: 'Cheque', label: '📑 Cheque Deposit' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayMethod(m.id)}
                      className={`py-2 px-2 rounded-xl text-center font-bold text-xs border transition-all cursor-pointer flex flex-col items-center justify-center shadow-2xs ${
                        payMethod === m.id
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-black ring-2 ring-emerald-500/20'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* DYNAMIC UPI QR SECTION */}
              {payMethod === 'UPI' && (
                <div className="bg-slate-900 text-white rounded-2xl p-4 border border-emerald-500/30 flex flex-col sm:flex-row items-center gap-4 shadow-md">
                  {(getMemberUpi(payTargetMember) || inlineUpiInput) ? (
                    <div className="bg-white p-2 rounded-xl shadow-lg shrink-0 flex flex-col items-center">
                      <img 
                        src={getUpiQrUrl(getMemberUpi(payTargetMember) || inlineUpiInput, payTargetMember.name, payAmount)}
                        alt="UPI QR Code"
                        className="w-36 h-36 object-contain rounded-lg"
                      />
                      <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest mt-1 font-mono">
                        Scan via Any UPI App
                      </span>
                    </div>
                  ) : (
                    <div className="w-36 h-36 bg-slate-800 rounded-xl border border-dashed border-slate-700 flex flex-col items-center justify-center text-center p-2 shrink-0">
                      <QrCode className="w-8 h-8 text-slate-500 mb-1" />
                      <span className="text-[10px] text-slate-400">Enter UPI ID below to auto-generate QR</span>
                    </div>
                  )}

                  <div className="flex-1 w-full space-y-2.5">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recipient UPI Address</span>
                      {getMemberUpi(payTargetMember) ? (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono font-bold text-emerald-400 text-xs bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 break-all">
                            {getMemberUpi(payTargetMember)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(getMemberUpi(payTargetMember));
                              setCopiedUpi(true);
                              setTimeout(() => setCopiedUpi(false), 2000);
                              if (onShowToast) onShowToast('✓ Staff UPI ID copied!', 'info');
                            }}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer"
                            title="Copy UPI"
                          >
                            {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <div className="mt-1">
                          <input 
                            type="text"
                            placeholder="e.g. employee@okaxis or 9876543210@paytm"
                            value={inlineUpiInput}
                            onChange={e => setInlineUpiInput(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs outline-none focus:border-emerald-500"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Bank / UPI Transaction Ref / UTR # (Optional)
                      </label>
                      <input 
                        type="text"
                        placeholder="e.g. 423891028192"
                        value={upiRefNo}
                        onChange={e => setUpiRefNo(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-[11px] text-emerald-900 flex items-center gap-2 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  ⚡ <b>Auto-Sync:</b> Once confirmed, {payTargetMember.name} will be removed from <b>Pending Due</b> and saved to <b>All Payment Records</b>.
                </span>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingPay}
                onClick={handleConfirmPayout}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                <span>{isSubmittingPay ? 'Processing...' : 'Confirm & Mark as Paid'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* STAFF UPI CONFIG MODAL (Add Salary UPI) */}
      {isUpiModalOpen && upiTargetMember && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsUpiModalOpen(false); }}
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:hidden"
        >
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-modal-smooth">
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-slate-900">Add Staff Salary UPI</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Configure VPA for {upiTargetMember.name}</p>
                </div>
              </div>
              <button onClick={() => setIsUpiModalOpen(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-xl transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMemberUpi} className="p-6 space-y-4 text-xs font-semibold overflow-y-auto overscroll-contain chat-custom-scrollbar flex-1">
              <div>
                <label className="text-slate-700 block mb-1">
                  Virtual Payment Address (UPI ID) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. employee@okaxis or 9876543210@paytm"
                    value={memberUpiInput}
                    onChange={e => setMemberUpiInput(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3.5 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:border-indigo-600 shadow-2xs"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick Handle Chips */}
              <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                <span className="text-slate-500 font-medium">Quick handles:</span>
                {['@okaxis', '@ybl', '@oksbi', '@paytm', '@ibl', '@icici'].map((handle) => (
                  <button
                    key={handle}
                    type="button"
                    onClick={() => {
                      const prefix = memberUpiInput.split('@')[0] || (upiTargetMember?.email ? upiTargetMember.email.split('@')[0] : 'employee');
                      setMemberUpiInput(`${prefix}${handle}`);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-indigo-700 hover:bg-indigo-50 font-mono font-bold cursor-pointer transition-colors shadow-2xs"
                  >
                    {handle}
                  </button>
                ))}
              </div>

              {/* QR Preview */}
              {memberUpiInput.trim() && memberUpiInput.includes('@') && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center shadow-2xs">
                  <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider mb-2">
                    ⚡ Auto-Generated Salary Payment QR
                  </span>
                  <div className="bg-white p-2 rounded-xl shadow-md border border-slate-200">
                    <img 
                      src={getUpiQrUrl(memberUpiInput, upiTargetMember.name, payrollConfigs[upiTargetMember.id]?.salary || upiTargetMember.salary || 0)} 
                      alt="UPI QR" 
                      className="w-28 h-28 object-contain"
                    />
                  </div>
                  <span className="text-[11px] font-mono font-black text-slate-900 mt-2 break-all">
                    {memberUpiInput.trim()}
                  </span>
                </div>
              )}

              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setIsUpiModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 cursor-pointer transition-all active:scale-95"
                >
                  Save UPI ID
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BASE SALARY CONFIG MODAL */}
      {isConfigModalOpen && configTargetMember && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsConfigModalOpen(false); }}
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:hidden"
        >
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 p-6 my-auto animate-modal-smooth">
            <h3 className="text-base font-black text-slate-900 mb-0.5 font-outfit">Configure Base Salary</h3>
            <p className="text-xs text-slate-500 mb-4">For {configTargetMember.name}</p>

            <div className="space-y-3 text-xs font-semibold">
              <div>
                <label className="text-slate-700 block mb-1">Monthly Base Salary (₹)</label>
                <input
                  type="number"
                  value={configForm.salary}
                  placeholder="e.g. 25000"
                  onChange={e => setConfigForm({...configForm, salary: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 font-mono font-bold text-slate-900 shadow-2xs"
                />
              </div>
              <div>
                <label className="text-slate-700 block mb-1">Fixed Monthly Bonus (₹)</label>
                <input
                  type="number"
                  value={configForm.bonus}
                  placeholder="e.g. 5000"
                  onChange={e => setConfigForm({...configForm, bonus: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 font-mono font-bold text-slate-900 shadow-2xs"
                />
              </div>
            </div>

            <div className="flex gap-2.5 mt-5">
              <button 
                onClick={() => setIsConfigModalOpen(false)} 
                className="flex-1 py-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => saveConfig(configTargetMember.id, configForm)} 
                className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 cursor-pointer transition-all active:scale-95"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERFORMANCE BONUS MODAL */}
      {isBonusModalOpen && bonusTargetMember && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsBonusModalOpen(false); }}
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:hidden"
        >
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 p-6 my-auto animate-modal-smooth">
            <h3 className="text-base font-black text-slate-900 mb-0.5 font-outfit">Queue Performance Bonus</h3>
            <p className="text-xs text-slate-500 mb-4">For {bonusTargetMember.name}</p>

            <div className="space-y-3 text-xs font-semibold">
              <div>
                <label className="text-slate-700 block mb-1">Bonus Amount (₹)</label>
                <input 
                  type="number" 
                  value={bonusForm.amount} 
                  placeholder="e.g. 5000" 
                  onChange={e => setBonusForm({...bonusForm, amount: e.target.value})} 
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-amber-500 font-mono font-bold text-slate-900 shadow-2xs" 
                />
              </div>
              <div>
                <label className="text-slate-700 block mb-1">Description / Reason</label>
                <input 
                  type="text" 
                  value={bonusForm.description} 
                  placeholder="e.g. Festival / Performance Bonus" 
                  onChange={e => setBonusForm({...bonusForm, description: e.target.value})} 
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-amber-500 text-slate-900 shadow-2xs" 
                />
              </div>
            </div>

            <div className="flex gap-2.5 mt-5">
              <button 
                onClick={() => setIsBonusModalOpen(false)} 
                className="flex-1 py-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateBonus} 
                className="flex-1 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
              >
                Queue Bonus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEMBER ATTENDANCE & SALARY PROGRESS DOSSIER FULL MODAL */}
      <MemberAttendanceDossierModal
        member={dossierMember}
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        attendanceRecords={attendanceRecords}
        payrollConfigs={payrollConfigs}
        paymentHistory={paymentHistory}
        onShowToast={onShowToast}
        onOpenPaymentModal={(m) => {
          setIsDossierOpen(false);
          const targetItem = monthlyMemberStatusList.find(x => x.member.id === m.id);
          if (targetItem) handleOpenPayModal(targetItem);
        }}
      />

    </div>
  );
}
