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
  ServerCrash
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function SuperAdminShell({ onLogout, onShowToast }) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [stats, setStats] = useState({ totalAdmins: 0, totalWorkers: 0, activeRevenue: 0 });
  const [members, setMembers] = useState([]);
  
  useEffect(() => {
    fetchGlobalStats();
  }, []);

  const fetchGlobalStats = async () => {
    // Fetch all members worldwide from the platform
    const { data: memberData } = await supabase.from('team_members').select('*');
    if (memberData) {
      setMembers(memberData);
      
      const admins = memberData.filter(m => m.role?.toLowerCase().includes('admin') || m.role?.toLowerCase().includes('manager'));
      const workers = memberData.filter(m => !m.role?.toLowerCase().includes('admin') && !m.role?.toLowerCase().includes('manager'));
      
      setStats({
        totalAdmins: admins.length || 7, // Mock minimums if empty
        totalWorkers: workers.length || 142,
        activeRevenue: (admins.length || 7) * 499 // Rough estimation $499 per tenant standard tier
      });
    }
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
            <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-white/5 relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
            </button>
            <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-white/5">
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          
          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard title="Total Admins (Tenants)" value={stats.totalAdmins} trend="+12% MTW" icon={<Building2 className="w-5 h-5 text-indigo-400" />} />
            <MetricCard title="Global Platform Workers" value={stats.totalWorkers} trend="+34% MTW" icon={<Users className="w-5 h-5 text-emerald-400" />} />
            <MetricCard title="Monthly Recurring Rev" value={`$${stats.activeRevenue}`} trend="+8.4% MTW" icon={<CreditCard className="w-5 h-5 text-purple-400" />} />
            <MetricCard title="System Health" value="99.99%" trend="Optimal" icon={<Activity className="w-5 h-5 text-cyan-400" />} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* SaaS Payment & Subscription Ledger */}
            <div className="xl:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-purple-400" /> Subscription Ledgers
                </h3>
                <button className="text-xs font-bold text-purple-400 hover:text-purple-300">View All Invoices &rarr;</button>
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

            {/* Global Security & Activity Feed */}
            <div className="space-y-4">
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
                
                <button className="w-full mt-6 py-3 rounded-xl border border-white/10 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all text-center">
                  View Full Audit Log
                </button>
              </div>
            </div>

          </div>
          
        </div>
      </main>

    </div>
  );
}

function MetricCard({ title, value, trend, icon }) {
  return (
    <div className="bg-[#09090b] border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-purple-500/30 transition-colors cursor-pointer">
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
