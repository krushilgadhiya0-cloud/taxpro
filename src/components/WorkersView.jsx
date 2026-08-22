import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Users, 
  Search, 
  Filter, 
  DollarSign, 
  CalendarCheck, 
  CheckCircle2, 
  Clock, 
  Send, 
  Star,
  Activity,
  Plus,
  RefreshCw
} from 'lucide-react';

export default function WorkersView({ onShowToast }) {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('team_members').select('*').order('created_at', { ascending: false });
      if (data) {
        setWorkers(data.map(m => ({
          ...m,
          dept: m.department || 'General',
          tasksCompleted: m.tasks_completed || 0
        })));
      }
    } catch (e) {
      console.warn('[Workers View Error]:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
    window.addEventListener('taxpro_db_updated', fetchWorkers);
    return () => window.removeEventListener('taxpro_db_updated', fetchWorkers);
  }, []);

  const filteredWorkers = workers.filter((w) => {
    const matchesDept = department === 'All' || w.dept === department;
    const matchesSearch = w.name.toLowerCase().includes(search.toLowerCase()) || w.role.toLowerCase().includes(search.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const handlePayWorker = (workerName, salary) => {
    onShowToast(`Dispatching ${salary} payout to ${workerName}...`, 'info');
    setTimeout(() => {
      onShowToast(`Salary payment to ${workerName} completed!`, 'success');
      if (window.confetti) {
        window.confetti({ particleCount: 70, spread: 50, origin: { y: 0.6 } });
      }
    }, 1200);
  };

  return (
    <div className="pt-24 pb-16 min-h-screen relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-white font-outfit">Worker & Payroll Roster</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              142 Active Members
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Manage personnel profiles, monthly salaries, attendance logs, and performance ratings.</p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search staff by name or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-input pl-10 pr-4 py-2 text-xs w-64"
            />
          </div>

          <div className="flex bg-white/[0.04] p-1 rounded-xl border border-white/10">
            {['All', 'Engineering', 'Finance', 'Security', 'Design'].map((d) => (
              <button
                key={d}
                onClick={() => setDepartment(d)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  department === d ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm' : 'text-gray-400 hover:text-white'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* WORKER CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWorkers.map((w) => (
          <div key={w.id} className="glass-panel p-6 glass-panel-hover relative overflow-hidden group">
            
            {/* Header with Avatar & Live Indicator */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={w.avatar}
                    alt={w.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-white/10 group-hover:border-cyan-400 transition-colors"
                  />
                  {w.online && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-outfit">{w.name}</h3>
                  <span className="text-xs text-cyan-400 font-medium">{w.role}</span>
                </div>
              </div>

              {/* Status Pill */}
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                w.status === 'Online'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : w.status === 'In Shift'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'bg-gray-500/10 text-gray-400 border border-gray-500/30'
              }`}>
                {w.status}
              </span>
            </div>

            {/* Performance Stats Row */}
            <div className="mt-5 grid grid-cols-3 gap-2 py-3 border-y border-white/10 text-center">
              <div>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Salary</span>
                <span className="text-xs font-bold text-white font-mono">{w.salary}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Attendance</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">{w.attendance}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Rating</span>
                <span className="text-xs font-bold text-yellow-400 flex items-center justify-center gap-0.5">
                  <Star className="w-3 h-3 fill-yellow-400" /> {w.rating}
                </span>
              </div>
            </div>

            {/* Tasks & Action Button */}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                <strong className="text-white">{w.tasksCompleted}</strong> Tasks Completed
              </span>

              <button
                onClick={() => handlePayWorker(w.name, w.salary)}
                className="btn-neon-emerald px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5 text-black" />
                <span>Pay Now</span>
              </button>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
