import React from 'react';
import { FileText, Download, Activity, CheckSquare, Target, Users, BookOpen, CreditCard, FolderKanban, Lightbulb, Printer } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function ReportsPMSView({ onShowToast }) {
  const reports = [
    { 
      id: 'csv_client_master',
      title: 'Clients Master List',
      desc: 'Complete directory of all registered clients, including Active and Old archived profiles.',
      icon: <Users className="w-5 h-5 text-blue-600" />,
      tag: 'Directory',
      color: 'bg-blue-50 border-blue-200'
    },
    { 
      id: 'csv_team_roster',
      title: 'Team & Old Members List',
      desc: 'Export the complete roster of your internal team parameters, credentials, and workload caps.',
      icon: <BookOpen className="w-5 h-5 text-indigo-600" />,
      tag: 'HR',
      color: 'bg-indigo-50 border-indigo-200'
    },
    { 
      id: 'csv_fees_tracking',
      title: 'Fees & Payment Ledger',
      desc: 'Full breakdown of total billed fees, collected amounts, and pending balances across all clients.',
      icon: <CreditCard className="w-5 h-5 text-emerald-600" />,
      tag: 'Financials',
      color: 'bg-emerald-50 border-emerald-200'
    },
    { 
      id: 'csv_projects',
      title: 'Projects & Workload List',
      desc: 'Detailed spreadsheet of ongoing active projects and their associated overarching goals.',
      icon: <FolderKanban className="w-5 h-5 text-amber-600" />,
      tag: 'Management',
      color: 'bg-amber-50 border-amber-200'
    },
    { 
      id: 'csv_ideas',
      title: 'Ideas & Feedback Log',
      desc: 'Download the comprehensive list of team ideas, feedback statuses, and project conversions.',
      icon: <Lightbulb className="w-5 h-5 text-purple-600" />,
      tag: 'Innovation',
      color: 'bg-purple-50 border-purple-200'
    },
    { 
      id: 'r_not_created',
      title: 'Tasks Not Created', 
      desc: 'Identify clients for whom routine compliance tasks have missed their standard creation cycles.',
      icon: <Target className="w-5 h-5 text-red-600" />,
      tag: 'Monitoring',
      color: 'bg-red-50 border-red-200' 
    },
    { 
      id: 'r_client_wise',
      title: 'Client Wise Task Report', 
      desc: 'Deep analytics break-down of all pending, overdue, and completed tasks categorized by specific clients.',
      icon: <Activity className="w-5 h-5 text-rose-600" />,
      tag: 'Analytics',
      color: 'bg-rose-50 border-rose-200' 
    },
    { 
      id: 'r_completed',
      title: 'Consolidated Tasks List', 
      desc: 'Comprehensive historical logs showcasing firm productivity and all assigned tasks.',
      icon: <CheckSquare className="w-5 h-5 text-teal-600" />,
      tag: 'Productivity',
      color: 'bg-teal-50 border-teal-200' 
    },
  ];

  const handleDownload = async (r) => {
     try {
       if (onShowToast) onShowToast(`Fetching live database records for ${r.title}...`, 'info');
       let csvRows = [];
       csvRows.push([`TaxPro PMS Intelligence Export - ${r.title}`]);
       csvRows.push([`Generated: ${new Date().toLocaleString()}`]);
       csvRows.push([]);

       if (r.id === 'csv_client_master') {
         const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
         csvRows.push(['ID', 'Company Name', 'Trade Name', 'GSTIN', 'PAN', 'Email', 'Phone', 'Status', 'Created Date']);
         (data || []).forEach(c => {
           csvRows.push([`"${c.id}"`, `"${c.name || ''}"`, `"${c.trade_name || ''}"`, `"${c.gst || c.gstin || ''}"`, `"${c.pan || ''}"`, `"${c.email || ''}"`, `"${c.phone || ''}"`, `"${c.status || 'Active'}"`, `"${c.created_at || ''}"`]);
         });
       } else if (r.id === 'csv_team_roster') {
         const { data } = await supabase.from('team_members').select('*').order('created_at', { ascending: false });
         csvRows.push(['ID', 'Name', 'Email', 'Role', 'Department', 'Status', 'Created Date']);
         (data || []).forEach(m => {
           csvRows.push([`"${m.id}"`, `"${m.name || ''}"`, `"${m.email || ''}"`, `"${m.role || ''}"`, `"${m.department || ''}"`, `"${m.status || 'Active'}"`, `"${m.created_at || ''}"`]);
         });
       } else if (r.id === 'csv_fees_tracking') {
         const { data } = await supabase.from('fees').select('*').order('created_at', { ascending: false });
         csvRows.push(['ID', 'Client Name', 'Invoice No', 'Amount', 'Paid', 'Status', 'Created Date']);
         (data || []).forEach(f => {
           csvRows.push([`"${f.id}"`, `"${f.client_name || ''}"`, `"${f.invoice_no || ''}"`, Number(f.amount || 0), Number(f.paid || 0), `"${f.status || 'Pending'}"`, `"${f.created_at || ''}"`]);
         });
       } else if (r.id === 'csv_projects') {
         const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
         csvRows.push(['ID', 'Project Name', 'Client', 'Department', 'Status', 'Progress', 'Deadline']);
         (data || []).forEach(p => {
           csvRows.push([`"${p.id}"`, `"${p.name || ''}"`, `"${p.client || ''}"`, `"${p.department || ''}"`, `"${p.status || ''}"`, `"${p.progress || 0}%"`, `"${p.deadline || ''}"`]);
         });
       } else {
         const { data } = await supabase.from('global_tasks').select('*').order('created_at', { ascending: false });
         csvRows.push(['Task ID', 'Title', 'Client', 'Priority', 'Status', 'Due Date', 'Created Date']);
         (data || []).forEach(t => {
           csvRows.push([`"${t.id}"`, `"${t.title || ''}"`, `"${t.client || ''}"`, `"${t.priority || 'Normal'}"`, `"${t.status || 'Pending'}"`, `"${t.due_date || ''}"`, `"${t.created_at || ''}"`]);
         });
       }

       const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
       const encodedUri = encodeURI(csvContent);
       const link = document.createElement('a');
       link.setAttribute('href', encodedUri);
       link.setAttribute('download', `TaxPro_${r.title.replace(/\s+/g, '_')}_${Date.now()}.csv`);
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);

       if (onShowToast) onShowToast(`✓ Real database export complete: ${r.title} CSV generated.`, 'success');
     } catch (err) {
       if (onShowToast) onShowToast(`Failed to export ${r.title}`, 'error');
     }
  };

  const triggerPrint = (title) => {
    if (onShowToast) onShowToast(`Generating printable format for ${title}...`, 'info');
    setTimeout(() => window.print(), 500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f3f4f6] min-h-screen text-gray-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold font-outfit text-[#1e1e2d] mb-1">Firm Intelligence & Reports</h1>
          <p className="text-sm text-gray-500 font-medium">Generate and export official productivity and client analytics layers.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((r) => (
          <div key={r.id} className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all flex flex-col group">
            
            <div className="flex justify-between items-start mb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${r.color}`}>
                {r.icon}
              </div>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded border uppercase tracking-widest ${r.color} text-gray-700`}>
                {r.tag}
              </span>
            </div>

            <h3 className="text-lg font-extrabold text-gray-900 leading-tight mb-2 group-hover:text-amber-600 transition-colors">
              {r.title}
            </h3>
            
            <p className="text-xs text-gray-500 font-medium leading-relaxed mb-6 flex-1">
              {r.desc}
            </p>

            <div className="mt-auto flex gap-2">
              <button 
                onClick={() => handleDownload(r)}
                className="flex-1 py-3 bg-gray-100 hover:bg-[#5b52e0] text-gray-800 hover:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-gray-300 hover:border-[#5b52e0] transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button 
                onClick={() => triggerPrint(r.title)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-800 text-gray-800 hover:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-gray-300 hover:border-gray-800 transition-all shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
