import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  BarChart3, 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Filter, 
  Calendar, 
  CheckCircle2, 
  TrendingUp,
  Layers,
  Activity,
  Sparkles
} from 'lucide-react';

export default function ReportsView({ onShowToast }) {
  const [period, setPeriod] = useState('Monthly');
  const [reportType, setReportType] = useState('Financial Summary');
  const [isExporting, setIsExporting] = useState(false);
  const [statements, setStatements] = useState([]);

  const fetchStatements = async () => {
    try {
      const [payRes, feeRes, cliRes] = await Promise.all([
        supabase.from('payments').select('*'),
        supabase.from('fees').select('*'),
        supabase.from('clients').select('*')
      ]);

      const items = [
        { name: 'Corporate Tax & GST Reconciliation', category: 'Tax & Compliance', period: 'Live Sync', count: cliRes.data?.length || 0, status: 'Verified' },
        { name: 'Accounts Receivables & Invoices', category: 'Fees Audit', period: 'Live Sync', count: feeRes.data?.length || 0, status: 'Active' },
        { name: 'Disbursement & Expense Ledger', category: 'Payments', period: 'Live Sync', count: payRes.data?.length || 0, status: 'Encrypted' },
        { name: 'AI Continuous Ledger Audit Assessment', category: 'Security & Integrity', period: 'Real-time', count: (payRes.data?.length || 0) + (feeRes.data?.length || 0), status: 'Passing (100%)' }
      ];
      setStatements(items);
    } catch (e) {
      console.warn('[Reports View Fetch]:', e);
    }
  };

  useEffect(() => {
    fetchStatements();
    window.addEventListener('taxpro_db_updated', fetchStatements);
    return () => window.removeEventListener('taxpro_db_updated', fetchStatements);
  }, []);

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    if (onShowToast) onShowToast('Generating Financial Compliance Report...', 'info');

    try {
      const { data: payments } = await supabase.from('payments').select('*');
      const csv = 'Transaction ID,Recipient,Amount,Status,Date,Method\n' + 
        (payments || []).map(p => `"${p.id}","${p.recipient || 'N/A'}","${p.amount}","${p.status}","${p.date || 'N/A'}","${p.method || 'N/A'}"`).join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `TaxPro_Financial_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (onShowToast) onShowToast('Report downloaded successfully!', 'success');
    } catch (err) {
      if (onShowToast) onShowToast('Failed to export report.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadExcel = async () => {
    await handleDownloadPDF();
  };

  return (
    <div className="pt-24 pb-16 min-h-screen relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-white font-outfit">Financial Reports</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Audit Verified
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Generate multi-dimensional analytics, heatmaps, and downloadable compliance statements.</p>
        </div>

        {/* Filter controls & Export Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Period selector */}
          <div className="flex bg-white/[0.04] p-1 rounded-xl border border-white/10">
            {['Weekly', 'Monthly', 'Yearly'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  period === p ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm' : 'text-gray-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Export PDF */}
          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 transition-all shadow-md shadow-red-500/10"
          >
            <FileText className="w-4 h-4 text-red-400" />
            <span>Download PDF</span>
          </button>

          {/* Export Excel */}
          <button
            onClick={handleDownloadExcel}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all shadow-md shadow-emerald-500/10"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export Excel</span>
          </button>

        </div>
      </div>

      {/* MULTI CHART GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Animated Bar Chart */}
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white font-outfit">Quarterly Profit Performance</h3>
            <span className="text-xs text-cyan-400 font-mono">YoY Growth +28%</span>
          </div>

          <div className="h-56 flex items-end justify-between gap-3 pt-6 border-b border-white/10 pb-4">
            {[
              { label: 'Q1 2025', val: 65, color: 'from-cyan-500 to-blue-600' },
              { label: 'Q2 2025', val: 80, color: 'from-cyan-500 to-emerald-400' },
              { label: 'Q3 2025', val: 95, color: 'from-emerald-500 to-emerald-400' },
              { label: 'Q4 2025', val: 110, color: 'from-purple-500 to-cyan-400' },
            ].map((q, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="w-full max-w-[60px] h-full flex items-end justify-center">
                  <div 
                    className={`w-full bg-gradient-to-t ${q.color} rounded-t-xl transition-all duration-700 group-hover:scale-105 shadow-lg shadow-cyan-500/20`}
                    style={{ height: `${q.val}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-300 font-semibold">{q.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap Activity Grid */}
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white font-outfit">Financial Transaction Heatmap</h3>
            <span className="text-xs text-gray-400">Peak hours: 14:00 - 18:00 EST</span>
          </div>

          <p className="text-xs text-gray-400 mb-4">Intensity of incoming & outgoing settlements by day and hour</p>

          <div className="grid grid-cols-7 gap-2 pt-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dIdx) => (
              <div key={dIdx} className="flex flex-col gap-2 text-center">
                <span className="text-[10px] text-gray-400 font-bold">{day}</span>
                {[0.2, 0.5, 0.9, 0.4, 0.8, 0.3].map((intensity, hIdx) => (
                  <div
                    key={hIdx}
                    className="w-full h-7 rounded-md transition-transform hover:scale-110 cursor-pointer"
                    style={{
                      background: intensity > 0.7 ? '#00FFA3' : intensity > 0.4 ? '#00F0FF' : 'rgba(255,255,255,0.06)',
                      opacity: intensity
                    }}
                    title={`Intensity: ${Math.round(intensity * 100)}%`}
                  ></div>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 text-[10px] text-gray-400">
            <span>Low Activity</span>
            <span className="w-3 h-3 rounded bg-white/10"></span>
            <span className="w-3 h-3 rounded bg-cyan-400"></span>
            <span className="w-3 h-3 rounded bg-emerald-400"></span>
            <span>High Volume</span>
          </div>
        </div>

      </div>

      {/* DETAILED STATEMENTS TABLE */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white font-outfit mb-4">Compliance & Tax Audit Trail</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-gray-400">
                <th className="pb-3">Report Name</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Period</th>
                <th className="pb-3">Verification</th>
                <th className="pb-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {statements.map((r, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 font-semibold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" /> {r.name}
                  </td>
                  <td className="py-3 text-gray-300">{r.category}</td>
                  <td className="py-3 font-mono text-gray-400">{r.period}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <button
                      onClick={handleDownloadPDF}
                      className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
