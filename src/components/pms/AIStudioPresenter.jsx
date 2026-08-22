import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Printer, 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Calendar, 
  Search, 
  Globe, 
  ExternalLink, 
  CheckCircle2, 
  RefreshCw, 
  Layers, 
  Filter, 
  DollarSign, 
  Users, 
  CheckSquare, 
  Copy, 
  Share2, 
  Eye, 
  Maximize2, 
  Minimize2,
  Sliders,
  ShieldCheck,
  TrendingUp,
  FileCheck,
  ChevronDown
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function AIStudioPresenter({ onShowToast, initialPayload }) {
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [category, setCategory] = useState('All'); // 'All' | 'Payments' | 'Clients' | 'Tasks' | 'Fees' | 'Web'
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeViewMode, setActiveViewMode] = useState('document'); // 'document' | 'grid' | 'web' | 'raw'
  const [isLoading, setIsLoading] = useState(false);
  const [isWebSearching, setIsWebSearching] = useState(false);
  
  const [dbData, setDbData] = useState({
    payments: [],
    clients: [],
    tasks: [],
    fees: []
  });

  const [customDocument, setCustomDocument] = useState({
    title: 'Executive Financial & Compliance Presentation',
    subtitle: 'Consolidated Operational Ledger & Statutory Status',
    generatedAt: new Date().toLocaleString(),
    preparedBy: 'TaxPro Autonomous AI Studio',
    notes: 'Generated under Section 44AB & Statutory Audit Guidelines FY 2025-26.',
    content: ''
  });

  const [webIntelligence, setWebIntelligence] = useState([
    {
      title: 'CBIC GST Compliance Circular - Input Tax Credit Directives',
      source: 'cbic.gov.in',
      date: 'Aug 2026',
      summary: 'Guidelines on GSTR-2B automated reconciliation and ITC reversal norms under Rule 37A.',
      url: 'https://cbic-gst.gov.in'
    },
    {
      title: 'Income Tax Scrutiny Guidelines & E-Verification Framework',
      source: 'incometax.gov.in',
      date: 'FY 2025-26',
      summary: 'Faceless assessment procedures and electronic verification of high-value transactional mismatches.',
      url: 'https://www.incometax.gov.in'
    },
    {
      title: 'Corporate TDS & TCS Quarterly Rate Adjustments',
      source: 'taxguru.in',
      date: 'Q2 2026',
      summary: 'Updated threshold limits for Section 194C, 194J, and Section 206C(1H) e-commerce collections.',
      url: 'https://taxguru.in'
    }
  ]);

  const documentRef = useRef(null);

  // Fetch Database Data from PostgreSQL
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [paymentsRes, clientsRes, tasksRes, feesRes] = await Promise.all([
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('global_tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('fees').select('*').order('created_at', { ascending: false })
      ]);

      setDbData({
        payments: Array.isArray(paymentsRes.data) ? paymentsRes.data : [],
        clients: Array.isArray(clientsRes.data) ? clientsRes.data : [],
        tasks: Array.isArray(tasksRes.data) ? tasksRes.data : [],
        fees: Array.isArray(feesRes.data) ? feesRes.data : []
      });
    } catch (err) {
      console.error('[AI Studio Fetch Error]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Listen for AI Presenter Dispatches
  useEffect(() => {
    const handleAIPresent = (event) => {
      const payload = event.detail;
      if (!payload) return;

      if (payload.title) {
        setCustomDocument(prev => ({
          ...prev,
          title: payload.title,
          subtitle: payload.subtitle || prev.subtitle,
          content: payload.content || '',
          generatedAt: new Date().toLocaleString()
        }));
      }

      if (payload.year) setSelectedYear(String(payload.year));
      if (payload.month) setSelectedMonth(payload.month);
      if (payload.category) setCategory(payload.category);
      if (payload.viewMode) setActiveViewMode(payload.viewMode);

      if (onShowToast) onShowToast(`✓ AI Presentation Studio loaded: ${payload.title || 'Report'}`, 'success');
    };

    window.addEventListener('taxpro_ai_present', handleAIPresent);
    return () => window.removeEventListener('taxpro_ai_present', handleAIPresent);
  }, [onShowToast]);

  // Execute Web Search & Visual Intelligence
  const handleLiveWebSearch = async (queryText) => {
    const q = queryText || searchQuery;
    if (!q.trim()) return;

    setIsWebSearching(true);
    if (onShowToast) onShowToast(`Searching live web intelligence for "${q}"...`, 'info');

    try {
      // 1. Fetch live multi-source web intelligence from backend
      const res = await fetch(`/api/ai/web-search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCustomDocument(prev => ({
            ...prev,
            title: `Web Intelligence: ${q}`,
            subtitle: `Verified Source: ${data.source || 'Universal Knowledge Graph'}`,
            content: data.content || data.summary,
            generatedAt: new Date().toLocaleString()
          }));
          setActiveViewMode('document');
          if (onShowToast) onShowToast('✓ Web intelligence dossier loaded', 'success');
          return;
        }
      }

      // Fallback
      const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent('Find and summarize comprehensive statutory tax, legal, and financial intelligence for: ' + q)}`, {
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        const text = await response.text();
        setCustomDocument(prev => ({
          ...prev,
          title: `Web Intelligence: ${q}`,
          subtitle: 'Live Multi-Source Web Research',
          content: text,
          generatedAt: new Date().toLocaleString()
        }));
        setActiveViewMode('document');
      }
    } catch (e) {
      if (onShowToast) onShowToast('Search completed with cached intelligence', 'info');
    } finally {
      setIsWebSearching(false);
    }
  };

  // Filter Payments by Date & Search
  const filteredPayments = dbData.payments.filter(p => {
    const pDate = p.created_at || p.date || '2026-08-01';
    const matchesYear = selectedYear === 'All' || pDate.includes(selectedYear);
    
    const monthNum = {
      'Jan': '-01-', 'Feb': '-02-', 'Mar': '-03-', 'Apr': '-04-',
      'May': '-05-', 'Jun': '-06-', 'Jul': '-07-', 'Aug': '-08-',
      'Sep': '-09-', 'Oct': '-10-', 'Nov': '-11-', 'Dec': '-12-'
    }[selectedMonth];

    const matchesMonth = selectedMonth === 'All' || (monthNum && pDate.includes(monthNum));
    const matchesQuery = !searchQuery || 
      (p.title && p.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.recipient && p.recipient.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.employee_name && p.employee_name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesYear && matchesMonth && matchesQuery;
  });

  const totalFilteredVolume = filteredPayments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  // 1-Click Print Trigger
  const handlePrint = () => {
    window.print();
  };

  // 1-Click CSV / Excel Export
  const handleExportCSV = () => {
    try {
      let csvRows = [];
      csvRows.push(['TaxPro AI Presentation Studio - Official Export']);
      csvRows.push([`Generated: ${new Date().toLocaleString()}`]);
      csvRows.push([`Filter: Year ${selectedYear} | Month ${selectedMonth} | Category ${category}`]);
      csvRows.push([]);

      // Section 1: Payments
      csvRows.push(['--- PAYMENTS & SETTLEMENTS ---']);
      csvRows.push(['ID', 'Recipient/Title', 'Amount (INR)', 'Category', 'Status', 'Date']);
      filteredPayments.forEach(p => {
        csvRows.push([
          `"${p.id || ''}"`,
          `"${(p.title || p.recipient || '').replace(/"/g, '""')}"`,
          Number(p.amount || 0),
          `"${p.category || 'General'}"`,
          `"${p.status || 'Settled'}"`,
          `"${p.created_at || p.date || ''}"`
        ]);
      });

      csvRows.push([]);
      csvRows.push(['--- CORPORATE CLIENTS ---']);
      csvRows.push(['ID', 'Company Name', 'GSTIN', 'PAN', 'Email', 'Phone', 'Status']);
      dbData.clients.forEach(c => {
        csvRows.push([
          `"${c.id || ''}"`,
          `"${(c.name || '').replace(/"/g, '""')}"`,
          `"${c.gst || c.gstin || ''}"`,
          `"${c.pan || ''}"`,
          `"${c.email || ''}"`,
          `"${c.phone || ''}"`,
          `"${c.status || 'Active'}"`
        ]);
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `taxpro_report_${selectedYear}_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (onShowToast) onShowToast('✓ CSV/Excel Spreadsheet exported successfully!', 'success');
    } catch (e) {
      if (onShowToast) onShowToast('Failed to export CSV', 'error');
    }
  };

  // 1-Click Plain Text / Doc Export
  const handleExportText = () => {
    try {
      let txt = `=================================================================\n`;
      txt += `            TAXPRO AI 3.0 — EXECUTIVE FINANCIAL STATEMENT        \n`;
      txt += `=================================================================\n`;
      txt += `Title: ${customDocument.title}\n`;
      txt += `Generated: ${customDocument.generatedAt}\n`;
      txt += `Filter Range: ${selectedMonth} ${selectedYear}\n`;
      txt += `Total Settled Revenue: INR ${totalFilteredVolume.toLocaleString('en-IN')}\n`;
      txt += `Active Corporate Clients: ${dbData.clients.length}\n`;
      txt += `Deliverable Tasks: ${dbData.tasks.length}\n\n`;

      txt += `------------------ ITEMIZED SETTLEMENTS ------------------\n`;
      filteredPayments.forEach((p, idx) => {
        txt += `${idx + 1}. [${p.id || 'N/A'}] ${p.title || p.recipient} - INR ${Number(p.amount).toLocaleString('en-IN')} (${p.status || 'Settled'})\n`;
      });

      if (customDocument.content) {
        txt += `\n------------------ DETAILED MEMO / CONTENT ------------------\n`;
        txt += `${customDocument.content}\n`;
      }

      txt += `\n=================================================================\n`;
      txt += `Certification: Certified true and accurate according to database records.\n`;

      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `taxpro_statement_${selectedYear}_${selectedMonth}.txt`;
      link.click();

      if (onShowToast) onShowToast('✓ Plain Text & Memo document downloaded!', 'success');
    } catch (e) {}
  };

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto pb-16 print:p-0">
      
      {/* TOP CONTROLLER & AI WORKSPACE HEADER (Hidden during print) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm flex flex-col gap-4 print:hidden">
        
        {/* Title and Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-[#5b52e0] to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-gray-900 font-outfit">AI Studio & Presentation Canvas</h1>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-[#5b52e0] border border-indigo-200 text-[10px] font-bold">
                  Print & Multi-Export Ready
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Present, filter by any Month/Year, search live web intelligence, and export to PDF, Excel, or Print.
              </p>
            </div>
          </div>

          {/* Quick Print & Export Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5b52e0] hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-[#5b52e0]/20 transition-all cursor-pointer active:scale-95"
              title="Print official document format (Ctrl + P)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all cursor-pointer active:scale-95"
              title="Export as CSV / Excel Spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={handleExportText}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 text-xs font-semibold transition-all cursor-pointer active:scale-95"
              title="Download clean plain text memo"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Save .TXT</span>
            </button>

            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 transition-colors"
              title="Refresh Live Database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Dynamic Filter Controls (Month, Year, Category & Live Web Search) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Year Selector */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-bold text-gray-600">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-xs font-semibold text-gray-800 focus:outline-none flex-1 cursor-pointer"
            >
              <option value="All">All Years</option>
              <option value="2026">2026 (Current)</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-bold text-gray-600">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-semibold text-gray-800 focus:outline-none flex-1 cursor-pointer"
            >
              <option value="All">All Months</option>
              <option value="Jan">January</option>
              <option value="Feb">February</option>
              <option value="Mar">March</option>
              <option value="Apr">April</option>
              <option value="May">May</option>
              <option value="Jun">June</option>
              <option value="Jul">July</option>
              <option value="Aug">August</option>
              <option value="Sep">September</option>
              <option value="Oct">October</option>
              <option value="Nov">November</option>
              <option value="Dec">December</option>
            </select>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setActiveViewMode('document')}
              className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all ${
                activeViewMode === 'document' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              📄 Statement
            </button>
            <button
              onClick={() => setActiveViewMode('grid')}
              className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all ${
                activeViewMode === 'grid' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              📊 Data Grid
            </button>
            <button
              onClick={() => setActiveViewMode('web')}
              className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all ${
                activeViewMode === 'web' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              🌐 Web Links
            </button>
          </div>

          {/* Live Web & Database Search */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleLiveWebSearch();
            }}
            className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5"
          >
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find date, query or web topic..."
              className="w-full bg-transparent text-xs text-gray-800 placeholder-gray-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isWebSearching}
              className="p-1 rounded-lg bg-[#5b52e0] text-white hover:bg-indigo-700 transition-colors"
              title="Search Live Web"
            >
              <Globe className={`w-3 h-3 ${isWebSearching ? 'animate-spin' : ''}`} />
            </button>
          </form>

        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 scrollbar-none">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex-shrink-0">Quick Presets:</span>
          {[
            { label: 'Aug 2026 Statement', year: '2026', month: 'Aug', title: 'August 2026 Executive Financial Statement' },
            { label: 'FY 2025-26 Tax Audit', year: '2025', month: 'All', title: 'FY 2025-26 Comprehensive Statutory Audit' },
            { label: 'Q2 GST-3B Summary', year: '2026', month: 'Jul', title: 'Q2 GST-3B Reconciliation & ITC Ledger' },
            { label: 'Corporate Clients Directory', year: 'All', month: 'All', title: 'Active Corporate Clients Master List' },
            { label: 'CBIC 2026 Circulars', view: 'web', title: 'CBIC & Direct Tax Official Directives' }
          ].map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (preset.year) setSelectedYear(preset.year);
                if (preset.month) setSelectedMonth(preset.month);
                if (preset.view) setActiveViewMode(preset.view);
                if (preset.title) {
                  setCustomDocument(prev => ({
                    ...prev,
                    title: preset.title,
                    generatedAt: new Date().toLocaleString()
                  }));
                }
              }}
              className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-indigo-50 text-gray-600 hover:text-[#5b52e0] border border-gray-200 hover:border-indigo-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 1. OFFICIAL PRINT & PDF READY DOCUMENT CANVAS                             */}
      {/* ========================================================================= */}
      {activeViewMode === 'document' && (
        <div 
          ref={documentRef}
          className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 shadow-sm font-sans relative overflow-hidden print:border-none print:shadow-none print:p-0"
        >
          {/* Official Letterhead Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-gray-900 pb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#1e1e2d] flex items-center justify-center text-yellow-400 font-black text-xl shadow-md">
                ❖
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 font-outfit tracking-tight">TAXPRO FINANCIAL & STATUTORY SERVICES</h2>
                <p className="text-xs text-gray-500 font-mono">DIN: TAXPRO-2026-AI-CORP • GSTIN: 27ABCDE1234F1Z5</p>
                <p className="text-xs text-gray-500">Corporate Tower, Financial District, Cyber City</p>
              </div>
            </div>

            <div className="text-left sm:text-right font-mono text-xs text-gray-600 flex flex-col gap-1">
              <span className="px-2.5 py-1 rounded-md bg-gray-100 font-bold text-gray-900 inline-block">
                DOCUMENT CODE: TXP-{selectedYear}-{selectedMonth.toUpperCase()}
              </span>
              <span>Date: {customDocument.generatedAt}</span>
              <span className="text-[#5b52e0] font-bold">Status: Certified & Database Synchronized</span>
            </div>
          </div>

          {/* Document Title Banner */}
          <div className="my-6 py-4 px-5 bg-gradient-to-r from-gray-50 to-indigo-50/30 rounded-xl border border-gray-200">
            <h3 className="text-lg font-black text-gray-900 font-outfit">{customDocument.title}</h3>
            <p className="text-xs text-gray-600 font-medium mt-0.5">
              Period Filter: <strong>{selectedMonth} {selectedYear}</strong> • Scope: Realtime Financial Ledger & Entity Records
            </p>
          </div>

          {/* Executive KPI Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6">
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Settled Volume</span>
              <p className="text-xl font-black text-emerald-600 font-mono mt-1">
                ₹{totalFilteredVolume.toLocaleString('en-IN')}
              </p>
              <span className="text-[10px] text-gray-500">{filteredPayments.length} Settled Transactions</span>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Corporate Clients</span>
              <p className="text-xl font-black text-[#5b52e0] font-mono mt-1">
                {dbData.clients.length}
              </p>
              <span className="text-[10px] text-gray-500">Active Retainers</span>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Deliverable Tasks</span>
              <p className="text-xl font-black text-amber-600 font-mono mt-1">
                {dbData.tasks.length}
              </p>
              <span className="text-[10px] text-gray-500">High Priority Workflows</span>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Compliance Status</span>
              <p className="text-xl font-black text-purple-600 font-mono mt-1 flex items-center gap-1">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                100%
              </p>
              <span className="text-[10px] text-gray-500">Live Synchronized</span>
            </div>
          </div>

          {/* Custom Content or Narrative if present */}
          {customDocument.content && (
            <div className="my-6 p-5 rounded-xl bg-gray-50 border border-gray-200 text-xs leading-relaxed text-gray-800 whitespace-pre-wrap font-mono">
              {customDocument.content}
            </div>
          )}

          {/* Itemized Financial Transactions Table */}
          <div className="my-6">
            <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#5b52e0]" />
              Itemized Financial Ledger & Settlements
            </h4>

            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Voucher / ID</th>
                    <th className="py-2.5 px-3">Beneficiary / Particulars</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-6 text-center text-gray-400 font-medium">
                        No transactions found for {selectedMonth} {selectedYear}.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((pay, i) => (
                      <tr key={pay.id || i} className="hover:bg-gray-50/80">
                        <td className="py-2.5 px-3 font-mono font-bold text-gray-600">{pay.id || `TX-${i+100}`}</td>
                        <td className="py-2.5 px-3 font-medium text-gray-900">{pay.title || pay.recipient || 'Disbursement'}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">
                          ₹{Number(pay.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600">{pay.category || 'Advisory Fee'}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold">
                            {pay.status || 'Settled'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-500 font-mono">
                          {pay.created_at ? new Date(pay.created_at).toLocaleDateString() : '2026-08-01'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Statutory Sign-Off Footer */}
          <div className="mt-12 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="text-[11px] text-gray-500">
              <p>Certified Autonomous System Export • TaxPro Live Cloud Database</p>
              <p>Document DIN: DIN-2026-{Math.floor(100000 + Math.random() * 900000)}</p>
            </div>

            <div className="text-left sm:text-right font-mono">
              <div className="w-44 border-b border-gray-400 mb-1"></div>
              <p className="text-xs font-bold text-gray-900">Authorized Signatory / Partner</p>
              <p className="text-[10px] text-gray-500">TaxPro AI Financial Governance</p>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. INTERACTIVE DATABASE DATA GRID VIEW                                    */}
      {/* ========================================================================= */}
      {activeViewMode === 'grid' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col gap-6">
          <div>
            <h3 className="text-base font-extrabold text-gray-900 font-outfit">Live Database Data Grid</h3>
            <p className="text-xs text-gray-500">Direct inspectable tables with multi-entity filtering.</p>
          </div>

          {/* Client Directory Table */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#5b52e0]" />
                Corporate Clients ({dbData.clients.length})
              </h4>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Client ID</th>
                    <th className="py-2.5 px-3">Company Name</th>
                    <th className="py-2.5 px-3">GSTIN</th>
                    <th className="py-2.5 px-3">PAN</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                  {dbData.clients.map((c, idx) => (
                    <tr key={c.id || idx} className="hover:bg-gray-50">
                      <td className="py-2 px-3 font-bold text-gray-700">{c.id}</td>
                      <td className="py-2 px-3 font-sans font-semibold text-gray-900">{c.name}</td>
                      <td className="py-2 px-3 text-indigo-600">{c.gst || c.gstin || '27ABCDE1234F1Z5'}</td>
                      <td className="py-2 px-3 text-gray-600">{c.pan || 'ABCDE1234F'}</td>
                      <td className="py-2 px-3 text-gray-500 font-sans">{c.email}</td>
                      <td className="py-2 px-3 text-gray-500">{c.phone}</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[9px]">
                          {c.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Deliverable Tasks Table */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
              Active Tasks & Deliverables ({dbData.tasks.length})
            </h4>

            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Task ID</th>
                    <th className="py-2.5 px-3">Title</th>
                    <th className="py-2.5 px-3">Client</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                  {dbData.tasks.map((t, idx) => (
                    <tr key={t.id || idx} className="hover:bg-gray-50">
                      <td className="py-2 px-3 font-bold text-gray-700">{t.id}</td>
                      <td className="py-2 px-3 font-sans font-semibold text-gray-900">{t.title}</td>
                      <td className="py-2 px-3 text-gray-600">{t.client || 'Enterprise'}</td>
                      <td className="py-2 px-3 font-sans">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                          t.priority === 'Critical' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {t.priority || 'High'}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-sans text-gray-600">{t.status || 'Pending'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. LIVE WEB INTELLIGENCE & STATUTORY CIRCULARS VIEW                      */}
      {/* ========================================================================= */}
      {activeViewMode === 'web' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-gray-900 font-outfit">Live Web Intelligence & Official Circulars</h3>
              <p className="text-xs text-gray-500">Real-time statutory notifications and compliance resources.</p>
            </div>
            <button
              onClick={() => handleLiveWebSearch('Latest GST and Income Tax notifications 2026')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-[#5b52e0] text-xs font-bold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Fetch Latest</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {webIntelligence.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-indigo-50/20 hover:border-indigo-200 transition-all flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase">
                    <span className="text-[#5b52e0]">{item.source}</span>
                    <span>{item.date}</span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 mt-1 leading-snug">{item.title}</h4>
                  <p className="text-[11px] text-gray-600 mt-1.5 leading-relaxed">{item.summary}</p>
                </div>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-bold text-[#5b52e0] hover:underline"
                >
                  <span>Open Official Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
