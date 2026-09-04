import React, { useState, useMemo } from 'react';
import { 
  FileText, Download, Activity, CheckSquare, Target, Users, BookOpen, 
  CreditCard, FolderKanban, Lightbulb, Printer, Calendar, Filter, X, 
  CheckCircle2, DollarSign, Receipt, Sparkles
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { logAuditActivity } from '../../lib/auditLogger';
import { printHtml } from '../../lib/printHelper';
import { formatDate } from '../../lib/dateUtils';

export default function ReportsPMSView({ onShowToast }) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalAction, setModalAction] = useState('csv'); // 'csv' or 'print'

  // Period / Date Filters
  const [periodType, setPeriodType] = useState('specific_month'); // 'specific_day', 'specific_month', 'specific_year', 'custom_range', 'all_time'
  const [filterDay, setFilterDay] = useState(new Date().toISOString().slice(0, 10));
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 8) + '01');
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState('All');

  // Preview & Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [previewColumns, setPreviewColumns] = useState([]);
  const [isPrinting, setIsPrinting] = useState(false);

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

  const reports = [
    { 
      id: 'csv_fees_tracking',
      title: 'Fees & Payment Ledger',
      desc: 'Breakdown of client fees, billing cycles, realized collections, and pending balances.',
      icon: <CreditCard className="w-5 h-5 text-emerald-600" />,
      tag: 'Financials',
      color: 'bg-emerald-50 border-emerald-200'
    },
    { 
      id: 'csv_receipts_payments',
      title: 'Receipts & Payments Ledger',
      desc: 'Complete cash flow register of all income receipts, employee salaries, and firm expenses.',
      icon: <Receipt className="w-5 h-5 text-indigo-600" />,
      tag: 'Cash Flow',
      color: 'bg-indigo-50 border-indigo-200'
    },
    { 
      id: 'csv_payroll_register',
      title: 'Staff Payroll & Salaries',
      desc: 'Historical salary disbursements, bonus vouchers, and payroll history per staff member.',
      icon: <BookOpen className="w-5 h-5 text-purple-600" />,
      tag: 'HR & Payroll',
      color: 'bg-purple-50 border-purple-200'
    },
    { 
      id: 'csv_client_master',
      title: 'Clients Master Register',
      desc: 'Complete directory of registered clients, PAN, GSTIN, physical file numbers, and retainers.',
      icon: <Users className="w-5 h-5 text-blue-600" />,
      tag: 'Directory',
      color: 'bg-blue-50 border-blue-200'
    },
    { 
      id: 'csv_tasks_master',
      title: 'Tasks & Compliance Performance', 
      desc: 'Historical task logs, completion statuses, client compliance deadlines, and productivity.',
      icon: <CheckSquare className="w-5 h-5 text-teal-600" />,
      tag: 'Productivity',
      color: 'bg-teal-50 border-teal-200' 
    },
    { 
      id: 'csv_projects',
      title: 'Projects & Workload Register',
      desc: 'Spreadsheet of active projects, milestone deadlines, and progress analytics.',
      icon: <FolderKanban className="w-5 h-5 text-amber-600" />,
      tag: 'Management',
      color: 'bg-amber-50 border-amber-200'
    },
    { 
      id: 'csv_team_roster',
      title: 'Team Members Roster',
      desc: 'Roster of active and archived staff members, departments, roles, and credentials.',
      icon: <Users className="w-5 h-5 text-cyan-600" />,
      tag: 'HR',
      color: 'bg-cyan-50 border-cyan-200'
    },
    { 
      id: 'csv_ideas',
      title: 'Ideas & Feedback Log',
      desc: 'Log of firm innovation ideas, internal feedback statuses, and workflow improvements.',
      icon: <Lightbulb className="w-5 h-5 text-rose-600" />,
      tag: 'Innovation',
      color: 'bg-rose-50 border-rose-200'
    }
  ];

  // OPEN PERIOD FILTER DIALOG
  const handleOpenReportModal = (report, action = 'csv') => {
    setSelectedReport(report);
    setModalAction(action);
    fetchReportData(report, periodType, filterDay, filterMonth, filterYear, fromDate, toDate, statusFilter);
  };

  // FETCH & FILTER DATA BASED ON SELECTED PERIOD
  const fetchReportData = async (report, pType, pDay, pMonth, pYear, pFrom, pTo, pStatus) => {
    if (!report) return;
    setIsProcessing(true);
    try {
      let rawData = [];
      let cols = [];

      const checkDateMatch = (itemDate) => {
        if (!itemDate) return true;
        const d = String(itemDate).slice(0, 10);
        if (pType === 'specific_day') return d.startsWith(pDay);
        if (pType === 'specific_month') return d.startsWith(`${pYear}-${pMonth}`);
        if (pType === 'specific_year') return d.startsWith(pYear);
        if (pType === 'custom_range') return d >= pFrom && d <= pTo;
        return true; // all_time
      };

      if (report.id === 'csv_fees_tracking') {
        const { data } = await supabase.from('fees').select('*').order('created_at', { ascending: false });
        cols = ['ID', 'Client / Party', 'Invoice No', 'Service / Scope', 'Total Amount', 'Paid', 'Pending', 'Status', 'Date'];
        rawData = (data || []).filter(f => {
          const matchesDate = checkDateMatch(f.due_date || f.date || f.created_at);
          const matchesStatus = pStatus === 'All' || (pStatus === 'Paid' && f.status === 'Paid') || (pStatus === 'Pending' && f.status !== 'Paid');
          return matchesDate && matchesStatus;
        }).map(f => ({
          'ID': f.id,
          'Client / Party': f.client_name || f.client || 'Client',
          'Invoice No': f.invoice_no || `INV-${f.id}`,
          'Service / Scope': f.service || 'Tax Advisory Fee',
          'Total Amount': Number(f.amount || 0),
          'Paid': Number(f.paid || 0),
          'Pending': Number(f.pending || Math.max(0, Number(f.amount || 0) - Number(f.paid || 0))),
          'Status': f.status || (Number(f.paid || 0) >= Number(f.amount || 0) ? 'Paid' : 'Pending'),
          'Date': formatDate(f.due_date || f.date || f.created_at)
        }));

      } else if (report.id === 'csv_receipts_payments') {
        const { data } = await supabase.from('receipts_payments').select('*').order('created_at', { ascending: false });
        cols = ['ID', 'Type', 'Party / Entity', 'Category', 'Channel', 'Amount', 'Date', 'Reference'];
        rawData = (data || []).filter(r => {
          const matchesDate = checkDateMatch(r.date || r.created_at);
          const matchesStatus = pStatus === 'All' || (pStatus === 'Paid' ? true : false);
          return matchesDate && matchesStatus;
        }).map(r => ({
          'ID': r.id,
          'Type': r.type === 'income' || r.type === 'Receipt' ? 'Receipt (IN)' : 'Payment (OUT)',
          'Party / Entity': r.party || r.title || 'Client',
          'Category': r.category || 'Financial Entry',
          'Channel': r.method || 'Bank Transfer',
          'Amount': Number(r.amount || 0),
          'Date': formatDate(r.date || r.created_at),
          'Reference': r.reference || r.id
        }));

      } else if (report.id === 'csv_payroll_register') {
        let history = [];
        try {
          history = JSON.parse(localStorage.getItem('taxpro_payroll_history')) || [];
        } catch (e) {}
        
        const { data } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
        const dbPay = (data || []).filter(p => (p.category || '').toLowerCase().includes('salary')).map(p => ({
          id: p.id,
          memberName: p.recipient,
          description: p.category,
          method: p.method || 'Bank Transfer',
          amount: Number(p.amount || 0),
          status: 'Paid',
          date: formatDate(p.created_at)
        }));

        const merged = [...history, ...dbPay];
        cols = ['ID', 'Employee Name', 'Description', 'Channel', 'Amount', 'Status', 'Date'];
        rawData = merged.filter(p => {
          const matchesDate = checkDateMatch(p.date);
          const matchesStatus = pStatus === 'All' || (pStatus === 'Paid' && p.status === 'Paid') || (pStatus === 'Pending' && p.status !== 'Paid');
          return matchesDate && matchesStatus;
        }).map(p => ({
          'ID': p.id,
          'Employee Name': p.memberName || p.memberId || 'Staff',
          'Description': p.description || 'Monthly Salary Disbursement',
          'Channel': p.method || 'Bank Transfer',
          'Amount': Number(p.amount || 0),
          'Status': p.status || 'Paid',
          'Date': formatDate(p.date)
        }));

      } else if (report.id === 'csv_client_master') {
        const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
        cols = ['ID', 'Legal Client Name', 'Trade Name', 'GSTIN', 'PAN', 'File No', 'Phone', 'Fee Plan', 'Status', 'Registered Date'];
        rawData = (data || []).filter(c => {
          const matchesDate = checkDateMatch(c.created_at);
          const matchesStatus = pStatus === 'All' || (pStatus === 'Active' && c.status === 'Active') || (pStatus === 'Archived' && c.status !== 'Active');
          return matchesDate && matchesStatus;
        }).map(c => ({
          'ID': c.id,
          'Legal Client Name': c.name || '',
          'Trade Name': c.trade_name || c.name || '',
          'GSTIN': c.gst || c.gstin || 'N/A',
          'PAN': c.pan || 'N/A',
          'File No': c.file_no || 'N/A',
          'Phone': c.phone || 'N/A',
          'Fee Plan': c.fee_amount ? `₹${Number(c.fee_amount).toLocaleString('en-IN')} (${c.billing_cycle || 'Monthly'})` : 'None',
          'Status': c.status || 'Active',
          'Registered Date': formatDate(c.created_at)
        }));

      } else if (report.id === 'csv_tasks_master') {
        const { data } = await supabase.from('global_tasks').select('*').order('created_at', { ascending: false });
        cols = ['ID', 'Task Title', 'Client Name', 'Priority', 'Status', 'Due Date', 'Created Date'];
        rawData = (data || []).filter(t => {
          const matchesDate = checkDateMatch(t.due_date || t.created_at);
          const matchesStatus = pStatus === 'All' || (pStatus === 'Completed' && (t.status === 'Done' || t.status === 'Completed')) || (pStatus === 'Pending' && t.status !== 'Done' && t.status !== 'Completed');
          return matchesDate && matchesStatus;
        }).map(t => ({
          'ID': t.id,
          'Task Title': t.title || '',
          'Client Name': t.client || 'N/A',
          'Priority': t.priority || 'Medium',
          'Status': t.status || 'To Do',
          'Due Date': formatDate(t.due_date),
          'Created Date': formatDate(t.created_at)
        }));

      } else if (report.id === 'csv_projects') {
        const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
        cols = ['ID', 'Project Title', 'Client', 'Department', 'Progress', 'Status', 'Deadline'];
        rawData = (data || []).filter(p => {
          const matchesDate = checkDateMatch(p.deadline || p.created_at);
          return matchesDate;
        }).map(p => ({
          'ID': p.id,
          'Project Title': p.name || '',
          'Client': p.client || 'N/A',
          'Department': p.department || 'General',
          'Progress': `${p.progress || 0}%`,
          'Status': p.status || 'Active',
          'Deadline': formatDate(p.deadline)
        }));

      } else if (report.id === 'csv_team_roster') {
        const { data } = await supabase.from('team_members').select('*').order('created_at', { ascending: false });
        cols = ['ID', 'Name', 'Email', 'Role', 'Department', 'Salary', 'Status'];
        rawData = (data || []).map(m => ({
          'ID': m.id,
          'Name': m.name || '',
          'Email': m.email || '',
          'Role': m.role || 'Staff',
          'Department': m.department || 'Operations',
          'Salary': m.salary || 'N/A',
          'Status': m.status || 'Active'
        }));

      } else {
        const { data } = await supabase.from('ideas').select('*').order('created_at', { ascending: false });
        cols = ['ID', 'Title', 'Author', 'Category', 'Votes', 'Status', 'Date'];
        rawData = (data || []).map(i => ({
          'ID': i.id,
          'Title': i.title || '',
          'Author': i.author || 'Member',
          'Category': i.category || 'General',
          'Votes': i.votes || 0,
          'Status': i.status || 'Open',
          'Date': formatDate(i.created_at)
        }));
      }

      setPreviewColumns(cols);
      setPreviewData(rawData);
    } catch (e) {
      console.error('[Fetch Report Data Error]:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  // TRIGGER CSV GENERATION WITH PERIOD
  const handleDownloadCSV = () => {
    if (!selectedReport || previewData.length === 0) {
      if (onShowToast) onShowToast('No matching records found for this period to export.', 'warning');
      return;
    }

    try {
      let csvRows = [];
      csvRows.push([`TaxPro PMS Intelligence Report - ${selectedReport.title}`]);
      csvRows.push([`Reporting Scope: ${getPeriodLabel()}`]);
      csvRows.push([`Generated On: ${formatDateTime(new Date())}`]);
      csvRows.push([`Total Matching Records: ${previewData.length}`]);
      csvRows.push([]);

      // Column Headers
      csvRows.push(previewColumns.map(c => `"${c}"`));

      // Row Data
      previewData.forEach(row => {
        const rowVals = previewColumns.map(col => {
          let val = row[col] !== undefined && row[col] !== null ? String(row[col]) : '';
          val = val.replace(/"/g, '""');
          return `"${val}"`;
        });
        csvRows.push(rowVals);
      });

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.map(e => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `TaxPro_${selectedReport.id}_${formatDate(new Date())}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      logAuditActivity({
        action: 'DOWNLOAD_REPORT_CSV',
        module: 'Reports & Analytics',
        details: `Downloaded CSV for ${selectedReport.title} (${getPeriodLabel()})`,
        metadata: { reportId: selectedReport.id, rows: previewData.length, period: periodType }
      });

      if (onShowToast) onShowToast(`✓ Downloaded ${selectedReport.title} CSV!`, 'success');
      setSelectedReport(null);
    } catch (e) {
      console.error('[CSV Download Error]:', e);
      if (onShowToast) onShowToast('Failed to export CSV report.', 'error');
    }
  };

  // PRINT CURRENT REPORT VIA WINDOW.PRINT()
  const handleTriggerPrint = () => {
    if (!selectedReport || previewData.length === 0) {
      if (onShowToast) onShowToast('No matching records found for this period to print.', 'warning');
      return;
    }

    logAuditActivity({
      action: 'PRINT_REPORT_DOCUMENT',
      module: 'Reports & Analytics',
      details: `Printed formal document for ${selectedReport.title} (${getPeriodLabel()})`,
      metadata: { reportId: selectedReport.id, rows: previewData.length, period: periodType }
    });

    // Build printable HTML table
    const tableHeader = previewColumns.map(col => `<th style="border: 1px solid #cbd5e1; padding: 8px 12px; background: #f8fafc; font-size: 11px; text-transform: uppercase;">${col}</th>`).join('');
    const tableRows = previewData.map((row, idx) => {
      const cols = previewColumns.map(col => {
        let val = row[col] !== undefined && row[col] !== null ? String(row[col]) : '-';
        return `<td style="border: 1px solid #e2e8f0; padding: 6px 12px; font-size: 11.5px; ${col.includes('Amount') || col === 'Paid' || col === 'Pending' ? 'font-family: monospace; font-weight: bold;' : ''}">${val}</td>`;
      }).join('');
      return `<tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">${cols}</tr>`;
    }).join('');

    const bodyHtml = `
      <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="color: #0f172a; font-size: 13px;">${selectedReport.title}</strong>
          <div style="color: #64748b; font-size: 11px; margin-top: 2px;">Scope: ${getPeriodLabel()} • Status: ${statusFilter}</div>
        </div>
        <div style="text-align: right; font-family: monospace; font-size: 12px; color: #0284c7; font-weight: bold;">
          Total Records: ${previewData.length}
        </div>
      </div>
      <table style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead><tr>${tableHeader}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    `;

    printHtml(`Report - ${selectedReport.title}`, bodyHtml);
    if (onShowToast) onShowToast(`🖨️ Generating printable report for "${selectedReport.title}"...`, 'info');
    setSelectedReport(null);
  };

  const getPeriodLabel = () => {
    if (periodType === 'specific_day') {
      return `Date: ${formatDate(filterDay)}`;
    } else if (periodType === 'specific_month') {
      const mObj = MONTH_NAMES.find(m => m.num === filterMonth);
      return `Month: ${mObj?.name || filterMonth} ${filterYear}`;
    } else if (periodType === 'specific_year') {
      return `Financial Year: ${filterYear}`;
    } else if (periodType === 'custom_range') {
      return `Date Range: ${formatDate(fromDate)} to ${formatDate(toDate)}`;
    }
    return 'All-Time Master Database';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f3f4f6] min-h-screen text-gray-800 relative printable-area-container">
      
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print-hidden">
        <div>
          <h1 className="text-2xl font-extrabold font-outfit text-[#1e1e2d]">Firm Intelligence & Reports Hub</h1>
          <p className="text-xs text-gray-500 mt-1">
            Export CSVs or print certified statements by specific day, month, year, or custom date range.
          </p>
        </div>
      </div>

      {/* Reports Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 print-hidden">
        {reports.map((r) => (
          <div 
            key={r.id} 
            className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group hover:border-indigo-300"
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${r.color} shadow-2xs`}>
                  {r.icon}
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${r.color} text-gray-700`}>
                  {r.tag}
                </span>
              </div>

              <h3 className="text-base font-extrabold text-gray-900 group-hover:text-indigo-600 transition-colors font-outfit mb-1.5">
                {r.title}
              </h3>
              
              <p className="text-xs text-gray-500 font-medium leading-relaxed mb-6">
                {r.desc}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => handleOpenReportModal(r, 'csv')}
                className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                title={`Export ${r.title} as CSV`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => handleOpenReportModal(r, 'print')}
                className="p-2 bg-gray-50 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all cursor-pointer border border-gray-200"
                title={`Print ${r.title}`}
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* PERIOD & DATE FILTER MODAL (ASKS MONTH, DAY, YEAR BEFORE CSV / PRINT)       */}
      {/* ========================================================================= */}
      {selectedReport && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedReport(null); }}
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print-hidden"
        >
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-modal-smooth">
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  {modalAction === 'csv' ? <Download className="w-5 h-5" /> : <Printer className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-slate-900 tracking-tight">
                    {modalAction === 'csv' ? 'Export CSV' : 'Print Statement'}: {selectedReport.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select specific day, month, year or date range to generate
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedReport(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold overscroll-contain chat-custom-scrollbar">
              
              {/* PERIOD SELECTION MODE */}
              <div>
                <label className="text-slate-700 block mb-1.5">Select Reporting Period</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodType('specific_month');
                      fetchReportData(selectedReport, 'specific_month', filterDay, filterMonth, filterYear, fromDate, toDate, statusFilter);
                    }}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      periodType === 'specific_month' ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🗓️ Specific Month
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPeriodType('specific_day');
                      fetchReportData(selectedReport, 'specific_day', filterDay, filterMonth, filterYear, fromDate, toDate, statusFilter);
                    }}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      periodType === 'specific_day' ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    📅 Specific Day
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPeriodType('specific_year');
                      fetchReportData(selectedReport, 'specific_year', filterDay, filterMonth, filterYear, fromDate, toDate, statusFilter);
                    }}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      periodType === 'specific_year' ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    📆 Whole Year
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPeriodType('custom_range');
                      fetchReportData(selectedReport, 'custom_range', filterDay, filterMonth, filterYear, fromDate, toDate, statusFilter);
                    }}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      periodType === 'custom_range' ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ⏱️ Custom Range
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPeriodType('all_time');
                      fetchReportData(selectedReport, 'all_time', filterDay, filterMonth, filterYear, fromDate, toDate, statusFilter);
                    }}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center col-span-2 sm:col-span-2 ${
                      periodType === 'all_time' ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🌐 All-Time Master Database
                  </button>
                </div>
              </div>

              {/* SPECIFIC MONTH PICKER */}
              {periodType === 'specific_month' && (
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl grid grid-cols-2 gap-3 shadow-2xs">
                  <div>
                    <label className="text-slate-700 block mb-1">Select Month</label>
                    <select
                      value={filterMonth}
                      onChange={e => {
                        setFilterMonth(e.target.value);
                        fetchReportData(selectedReport, 'specific_month', filterDay, e.target.value, filterYear, fromDate, toDate, statusFilter);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none font-bold text-xs cursor-pointer shadow-2xs"
                    >
                      {MONTH_NAMES.map(m => (
                        <option key={m.num} value={m.num}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1">Select Year</label>
                    <select
                      value={filterYear}
                      onChange={e => {
                        setFilterYear(e.target.value);
                        fetchReportData(selectedReport, 'specific_month', filterDay, filterMonth, e.target.value, fromDate, toDate, statusFilter);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none font-bold text-xs cursor-pointer shadow-2xs"
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

              {/* SPECIFIC DAY PICKER */}
              {periodType === 'specific_day' && (
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl shadow-2xs">
                  <label className="text-slate-700 block mb-1">Select Exact Date</label>
                  <input 
                    type="date"
                    value={filterDay}
                    onChange={e => {
                      setFilterDay(e.target.value);
                      fetchReportData(selectedReport, 'specific_day', e.target.value, filterMonth, filterYear, fromDate, toDate, statusFilter);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none font-bold text-xs shadow-2xs"
                  />
                </div>
              )}

              {/* WHOLE YEAR PICKER */}
              {periodType === 'specific_year' && (
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl shadow-2xs">
                  <label className="text-slate-700 block mb-1">Select Financial Year</label>
                  <select
                    value={filterYear}
                    onChange={e => {
                      setFilterYear(e.target.value);
                      fetchReportData(selectedReport, 'specific_year', filterDay, filterMonth, e.target.value, fromDate, toDate, statusFilter);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none font-bold text-xs cursor-pointer shadow-2xs"
                  >
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </div>
              )}

              {/* CUSTOM DATE RANGE */}
              {periodType === 'custom_range' && (
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl grid grid-cols-2 gap-3 shadow-2xs">
                  <div>
                    <label className="text-slate-700 block mb-1">From Date</label>
                    <input 
                      type="date"
                      value={fromDate}
                      onChange={e => {
                        setFromDate(e.target.value);
                        fetchReportData(selectedReport, 'custom_range', filterDay, filterMonth, filterYear, e.target.value, toDate, statusFilter);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none text-xs font-bold shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1">To Date</label>
                    <input 
                      type="date"
                      value={toDate}
                      onChange={e => {
                        setToDate(e.target.value);
                        fetchReportData(selectedReport, 'custom_range', filterDay, filterMonth, filterYear, fromDate, e.target.value, statusFilter);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none text-xs font-bold shadow-2xs"
                    />
                  </div>
                </div>
              )}

              {/* MATCHING SUMMARY CARD */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between text-xs font-bold shadow-2xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Active Scope</span>
                  <span className="text-slate-900 font-extrabold">{getPeriodLabel()}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Matching Records</span>
                  <span className="font-mono font-black text-emerald-600 text-sm">
                    {isProcessing ? 'Counting...' : `${previewData.length} Entries`}
                  </span>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 -mx-6 -mb-6 mt-3">
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                
                {modalAction === 'csv' ? (
                  <button
                    type="button"
                    onClick={handleDownloadCSV}
                    disabled={previewData.length === 0 || isProcessing}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Download className="w-4 h-4" /> Download CSV ({previewData.length})
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePrintStatement}
                    disabled={previewData.length === 0 || isProcessing}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Printer className="w-4 h-4" /> Print Document ({previewData.length})
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OFFICIAL PRINTABLE DOCUMENT (ISOLATED DURING PRINT)                      */}
      {/* ========================================================================= */}
      {selectedReport && (
        <div className="hidden print:block reports-print-document bg-white text-black p-0 m-0">
          <div className="border-b-2 border-gray-900 pb-4 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-black font-outfit uppercase tracking-tight text-gray-900">
                  TAXPRO PRACTICE MANAGEMENT SYSTEM
                </h1>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-700 mt-0.5">
                  Official Intelligence Report • {selectedReport.title}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono font-black text-indigo-950">
                  {getPeriodLabel()}
                </div>
                <div className="text-[10px] font-mono text-gray-600 mt-0.5">
                  Generated: {formatDate(new Date())}
                </div>
                <div className="text-[10px] font-bold text-gray-700 uppercase mt-0.5">
                  Total Entries: {previewData.length}
                </div>
              </div>
            </div>
          </div>

          <table className="w-full text-left text-xs border-collapse border border-gray-300 mb-8">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 text-gray-800 font-extrabold uppercase text-[10px]">
                {previewColumns.map((col, idx) => (
                  <th key={idx} className="p-2 border border-gray-300">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.length === 0 ? (
                <tr>
                  <td colSpan={previewColumns.length} className="p-6 text-center text-gray-500 italic">
                    No records found for the selected reporting period.
                  </td>
                </tr>
              ) : (
                previewData.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-gray-200">
                    {previewColumns.map((col, cIdx) => (
                      <td key={cIdx} className="p-2 border border-gray-300 text-[11px]">
                        {row[col] !== undefined && row[col] !== null ? String(row[col]) : '-'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex justify-between items-end mt-12 pt-6 border-t-2 border-gray-400 text-[10px] text-gray-600">
            <div>
              <p className="font-bold text-gray-900">TaxPro PMS • Certified Firm Intelligence Document</p>
              <p className="text-[9px] text-gray-500">Official export valid for compliance and audit filing.</p>
            </div>
            <div className="text-right">
              <div className="h-10 border-b border-gray-500 w-52 mb-1"></div>
              <span className="font-bold text-gray-900">Authorized Signatory / Partner Stamp</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
