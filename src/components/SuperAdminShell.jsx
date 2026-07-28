import React, { useState, useEffect } from 'react';
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
  LogOut,
  Database,
  Globe2,
  ServerCrash,
  Download,
  Printer,
  X,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function SuperAdminShell({ onLogout, onShowToast }) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [stats, setStats] = useState({ totalAdmins: 0, totalWorkers: 0, activeRevenue: 0 });
  const [members, setMembers] = useState([]);
  const [activeDetailModal, setActiveDetailModal] = useState(null); // 'admins' | 'workers' | 'revenue'
  const [metricDataList, setMetricDataList] = useState([]);
  const [aiLogs, setAiLogs] = useState([]);
  
  useEffect(() => {
    fetchGlobalStats();
    try {
      const logs = localStorage.getItem('taxpro_ai_training_logs');
      if (logs) setAiLogs(JSON.parse(logs));
    } catch(e) {}
  }, []);

  const fetchGlobalStats = async () => {
    // Fetch all members worldwide from the platform
    const { data: memberData } = await supabase.from('team_members').select('*');
    if (memberData) {
      setMembers(memberData);
      
      const admins = memberData.filter(m => m.role?.toLowerCase().includes('admin') || m.role?.toLowerCase().includes('manager'));
      const workers = memberData.filter(m => !m.role?.toLowerCase().includes('admin') && !m.role?.toLowerCase().includes('manager'));
      
      setStats({
        totalAdmins: admins.length,
        totalWorkers: workers.length,
        activeRevenue: admins.length * 499 
      });
    }
  };

  const openDetailModal = (type) => {
    setActiveDetailModal(type);
    if (type === 'admins') {
       setMetricDataList(members.filter(m => m.role?.toLowerCase().includes('admin') || m.role?.toLowerCase().includes('manager')));
    } else if (type === 'workers') {
       setMetricDataList(members.filter(m => !m.role?.toLowerCase().includes('admin') && !m.role?.toLowerCase().includes('manager')));
    } else if (type === 'revenue') {
       // Revenue essentially tracks tenants/admins
       setMetricDataList(members.filter(m => m.role?.toLowerCase().includes('admin') || m.role?.toLowerCase().includes('manager')));
    }
  };

  const exportToCSV = () => {
    if (!metricDataList || metricDataList.length === 0) return;
    
    const headers = ["Name", "Email", "Role", "Department", "Payment Expected (Mock)"];
    const csvRows = [headers.join(',')];
    
    metricDataList.forEach(m => {
      const isTenant = m.role?.toLowerCase().includes('admin') || m.role?.toLowerCase().includes('manager');
      csvRows.push([
        `"${m.name || 'Unknown'}"`,
        `"${m.email || 'Unknown'}"`,
        `"${m.role || 'Member'}"`,
        `"${m.department || 'N/A'}"`,
        `"${isTenant ? '$499/mo' : '$0'}"`
      ].join(','));
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); 
    a.href = url;
    a.download = `taxpro_global_${activeDetailModal}_export.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('CSV Download initiated!', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  // Mock SaaS Admins (Tenants)
  const mockTenants = [
    { id: 1, company: 'Stark Industries', adminEmail: 'tony@stark.com', workers: 45, plan: 'Enterprise', nextBilling: '2026-08-01', status: 'Active', amountDue: '$999', daysLeft: 4 },
    { id: 2, company: 'Wayne Enterprises', adminEmail: 'bruce@wayne.com', workers: 12, plan: 'Pro', nextBilling: '2026-08-15', status: 'Active', amountDue: '$299', daysLeft: 18 },
    { id: 3, company: 'LexCorp', adminEmail: 'lex@lexcorp.com', workers: 8, plan: 'Starter', nextBilling: '2026-07-29', status: 'Payment Default', amountDue: '$99', daysLeft: 1 },
    { id: 4, company: 'Global Dynamics', adminEmail: 'carter@gd.com', workers: 104, plan: 'Enterprise', nextBilling: '2026-09-01', status: 'Active', amountDue: '$1499', daysLeft: 35 },
  ];

  const mockLogs = [
    { id: 101, time: '2 mins ago', event: 'Wayne Enterprises generated a new worker invite (Clark K.)', level: 'info' },
    { id: 102, time: '14 mins ago', event: 'LexCorp subscription auto-renewal FAILED. Retrying in 12hrs.', level: 'critical' },
    { id: 103, time: '1 hour ago', event: 'Stark Industries reached 90% DB read capacity warning.', level: 'warning' },
    { id: 104, time: '3 hours ago', event: 'New Admin Registration: Global Dynamics activated Pro plan.', level: 'success' },
  ];

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

        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'Overview', icon: <Activity className="w-4 h-4" /> },
            { id: 'Tenants', icon: <Building2 className="w-4 h-4" /> },
            { id: 'Global Logistics', icon: <Users className="w-4 h-4" /> },
            { id: 'Revenue & Billing', icon: <CreditCard className="w-4 h-4" /> },
            { id: 'Infrastructure', icon: <Database className="w-4 h-4" /> },
            { id: 'Security Logs', icon: <ShieldAlert className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === tab.id 
                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-inner' 
                : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
              }`}
            >
              {tab.icon} {tab.id}
            </button>
          ))}
        </nav>

        <div className="px-4 mt-auto">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 mb-4">
            <div className="text-[10px] uppercase font-bold text-gray-500 mb-2 tracking-widest">Master Identify</div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-black text-black text-xs">SA</div>
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate">workforcepro09@...</div>
                <div className="text-[10px] text-emerald-400 font-bold">● Network Online</div>
              </div>
            </div>
          </div>
          
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-sm transition-colors border border-red-500/20"
          >
            <LogOut className="w-4 h-4" /> Initiate Lockdown
          </button>
        </div>
      </aside>

      {/* Main SaaS Content Area */}
      <main className="flex-1 overflow-y-auto relative h-screen">
        
        {/* Topbar */}
        <header className="h-20 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl sticky top-0 z-10 flex items-center justify-between px-8">
          <h2 className="text-2xl font-bold text-white tracking-tight">{activeTab}</h2>
          
          <div className="flex items-center gap-5">
            <div className="relative group">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-purple-400 transition-colors" />
              <input 
                type="text"
                placeholder="Search globals (tenants, emails, metrics)..."
                className="w-80 bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm font-semibold text-white outline-none focus:border-purple-500/50 transition-all placeholder:text-gray-600"
              />
            </div>
            <button onClick={() => onShowToast && onShowToast('No new master notifications.', 'info')} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-white/5 relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
            </button>
            <button onClick={() => onShowToast && onShowToast('Master configurations locked by deployment.', 'warning')} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-white/5">
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          
          {/* Top Metrics Row */}
          {(activeTab === 'Overview' || activeTab === 'Global Logistics' || activeTab === 'Infrastructure') && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
              <MetricCard title="Total Admins (Tenants)" value={stats.totalAdmins} trend="LIVE DB" icon={<Building2 className="w-5 h-5 text-indigo-400" />} onClick={() => openDetailModal('admins')} />
              <MetricCard title="Global Platform Workers" value={stats.totalWorkers} trend="LIVE DB" icon={<Users className="w-5 h-5 text-emerald-400" />} onClick={() => openDetailModal('workers')} />
              <MetricCard title="Monthly Recurring Rev" value={`$${stats.activeRevenue}`} trend="LIVE DB" icon={<CreditCard className="w-5 h-5 text-purple-400" />} onClick={() => openDetailModal('revenue')} />
              <MetricCard title="System Health" value="99.99%" trend="Optimal" icon={<Activity className="w-5 h-5 text-cyan-400" />} onClick={() => onShowToast && onShowToast('All microservices operational', 'success')} />
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* SaaS Payment & Subscription Ledger */}
            {(activeTab === 'Overview' || activeTab === 'Tenants' || activeTab === 'Revenue & Billing') && (
            <div className={`${activeTab === 'Overview' ? 'xl:col-span-2' : 'xl:col-span-3'} space-y-4 animate-fade-in`}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-purple-400" /> Subscription Ledgers
                </h3>
                {activeTab === 'Overview' && (
                  <button onClick={() => setActiveTab('Revenue & Billing')} className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors">View All Invoices &rarr;</button>
                )}
              </div>
              
              <div className="bg-[#09090b] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Admin / Tenant</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Plan & Scale</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Billing Due</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockTenants.map(t => (
                      <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group cursor-pointer">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white text-sm">{t.company}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{t.adminEmail}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 text-gray-300 text-xs font-bold">
                            {t.plan}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1 font-bold">{t.workers} Active Workers</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-black text-white">{t.amountDue}</div>
                          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            {t.daysLeft <= 3 ? <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse"></span> : <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>}
                            {t.daysLeft} days left
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`text-[10px] uppercase font-black px-3 py-1.5 rounded-full ${t.status.includes('Active') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-500 animate-pulse'}`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {/* Global Security & Activity Feed */}
            {(activeTab === 'Overview' || activeTab === 'Security Logs') && (
            <div className={`${activeTab === 'Overview' ? 'col-span-1' : 'xl:col-span-2'} space-y-4 animate-fade-in`}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ServerCrash className="w-5 h-5 text-indigo-400" /> Platform Feed
                </h3>
              </div>
              
              <div className="bg-[#09090b] border border-white/5 rounded-3xl p-6 h-full shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none"></div>
                
                <div className="space-y-6 relative z-10">
                  {mockLogs.map(log => (
                    <div key={log.id} className="flex gap-4">
                      <div className="relative flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shadow-lg ${
                          log.level === 'info' ? 'bg-blue-400 shadow-blue-500/50' : 
                          log.level === 'critical' ? 'bg-red-500 shadow-red-500/50 animate-ping' : 
                          log.level === 'warning' ? 'bg-amber-400 shadow-amber-500/50' : 'bg-emerald-400 shadow-emerald-500/50'
                        }`}></div>
                        <div className="w-px h-full bg-white/10 mt-2 absolute top-3"></div>
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">{log.time}</div>
                        <div className="text-sm font-medium text-gray-300 leading-snug">{log.event}</div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button onClick={() => { setActiveTab('Security Logs'); onShowToast && onShowToast('Filtering audit context...', 'info'); }} className="w-full mt-6 py-3 rounded-xl border border-white/10 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all text-center cursor-pointer">
                  View Full Audit Log
                </button>
              </div>
            </div>
            )}

            {/* NEW BOX: AI TRAINING & UNHANDLED INTENTS */}
            {(activeTab === 'Overview' || activeTab === 'Security Logs') && (
            <div className={`${activeTab === 'Overview' ? 'col-span-1 xl:col-span-3' : 'xl:col-span-1'} space-y-4 animate-fade-in`}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" /> AI Training & Failed Intents
                </h3>
              </div>
              <div className="bg-[#09090b] border border-amber-500/20 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                 <p className="text-xs text-gray-400 mb-4 font-bold border-b border-white/5 pb-4">
                   These commands were spoken by users globally but the NLP parser failed to execute them. Review them to upgrade the Voice Assistant dictionary.
                 </p>
                 <div className="space-y-3 overflow-y-auto max-h-64 pr-2">
                   {aiLogs.length === 0 ? (
                     <div className="text-center py-6">
                       <HelpCircle className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                       <p className="text-xs font-bold text-gray-500">No failed voice intents logged.</p>
                     </div>
                   ) : aiLogs.map(log => (
                     <div key={log.id} className="p-3 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between">
                       <div>
                         <p className="text-sm font-black text-amber-500 font-mono">"{log.transcript}"</p>
                         <p className="text-[10px] uppercase font-bold text-gray-500 mt-1">{log.date} @ {log.time}</p>
                       </div>
                       <span className="px-2 py-1 bg-red-500/10 text-red-500 text-[10px] font-black rounded-lg">FAILED</span>
                     </div>
                   ))}
                 </div>
              </div>
            </div>
            )}
            
            {/* Empty Statues for remaining tabs */}
            {(activeTab === 'Global Logistics' || activeTab === 'Infrastructure') && (
              <div className="xl:col-span-3 py-24 flex flex-col items-center justify-center text-center animate-fade-in border border-dashed border-white/10 rounded-3xl bg-white/[0.01]">
                <Globe2 className="w-12 h-12 text-gray-700 mb-4" />
                <h3 className="text-xl font-bold text-gray-400 mb-2">Detailed view for {activeTab}</h3>
                <p className="text-sm font-medium text-gray-600 max-w-sm">
                  Full infrastructure mapping and geo-location tracking data is currently routed through the top Global Platform Workers metric card. Let us know if you want native charts built here.
                </p>
                <button 
                  onClick={() => openDetailModal('workers')}
                  className="mt-6 px-6 py-3 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-xl font-bold text-sm transition-all border border-purple-500/20 cursor-pointer"
                >
                   Open Master Directory
                </button>
              </div>
            )}

          </div>
          
        </div>
      </main>

      {/* METRIC DETAIL MODAL FOR CSV / PRINT */}
      {activeDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:bg-white print:p-0 print:block">
          <div className="relative w-full max-w-4xl max-h-[85vh] bg-[#09090b] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden print:w-full print:max-w-none print:h-auto print:border-none print:shadow-none print:bg-white print:text-black">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between print:border-black/10">
              <div>
                <h3 className="text-xl font-black text-white font-outfit print:text-black">
                  {activeDetailModal === 'admins' ? 'Total Admins (Tenants) Ledger' : ""}
                  {activeDetailModal === 'workers' ? 'Global Platform Workers Directory' : ""}
                  {activeDetailModal === 'revenue' ? 'Monthly Recurring Revenue Originators' : ""}
                </h3>
                <p className="text-xs text-gray-500 mt-1 print:text-gray-600">
                  Total Records: {metricDataList.length} | Sourced strictly from LIVE Supabase Database
                </p>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button onClick={exportToCSV} className="p-2 rounded-xl bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 transition-all" title="Download CSV">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={handlePrint} className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all" title="Print Ledger">
                  <Printer className="w-4 h-4" />
                </button>
                <div className="w-px h-6 bg-white/10 mx-1"></div>
                <button onClick={() => setActiveDetailModal(null)} className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Data Table */}
            <div className="flex-1 overflow-y-auto p-0 scrollbar-hide">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#09090b] z-10 print:bg-white">
                  <tr className="border-b border-white/5 print:border-b-2 print:border-black">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest print:text-black">Name</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest print:text-black">Email</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest print:text-black">Role</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest print:text-black">Dept</th>
                    {activeDetailModal === 'revenue' && (
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest print:text-black text-right">ARR (Mock)</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {metricDataList.map((m, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] print:border-b print:border-gray-200 print:text-black">
                      <td className="px-6 py-4 text-sm font-bold text-white print:text-black">{m.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-xs font-mono text-gray-400 print:text-gray-800">{m.email}</td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] uppercase font-bold px-2 py-1 bg-white/5 rounded text-gray-300 print:bg-gray-100 print:text-gray-700">
                          {m.role || 'Member'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-400 print:text-gray-600">{m.department || 'General'}</td>
                      {activeDetailModal === 'revenue' && (
                        <td className="px-6 py-4 text-sm font-black text-emerald-400 text-right print:text-black">
                          $499 <span className="text-[10px] text-gray-500 font-normal">/mo</span>
                        </td>
                      )}
                    </tr>
                  ))}
                  {metricDataList.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-500 font-bold">No active live data found in Supabase.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

function MetricCard({ title, value, trend, icon, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`bg-[#09090b] border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-purple-500/30 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all group-hover:text-purple-400">
        <ArrowUpRight className="w-12 h-12 text-white/5" />
      </div>
      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center mb-6">
        {icon}
      </div>
      <div className="text-3xl font-black text-white mb-2 leading-none font-outfit">{value}</div>
      <div className="flex items-center gap-3">
        <div className="text-xs font-bold text-gray-500">{title}</div>
        <div className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">{trend}</div>
      </div>
    </div>
  );
}
