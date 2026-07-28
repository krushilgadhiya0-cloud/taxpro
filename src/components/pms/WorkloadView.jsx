import React, { useState, useMemo } from 'react';
import { Users, Building, Search, Flame, AlertTriangle, Scale, CarFront, Plus, Check } from 'lucide-react';

export default function WorkloadView({ onShowToast, onNavigateToPrivateChat }) {
  const [search, setSearch] = useState('');
  const [activeDept, setActiveDept] = useState('All Departments');
  const [team, setTeam] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  React.useEffect(() => {
    fetchWorkloadData();
  }, []);

  const fetchWorkloadData = async () => {
    const [membersRes, tasksRes] = await Promise.all([
      import('../../lib/supabaseClient').then(m => m.supabase.from('team_members').select('*')),
      import('../../lib/supabaseClient').then(m => m.supabase.from('global_tasks').select('*'))
    ]);

    if (!membersRes.error && membersRes.data) {
      const allTasks = tasksRes.data || [];
      const depts = [...new Set(membersRes.data.map(m => m.department).filter(Boolean))];
      setDepartments(depts);

      const computedTeam = membersRes.data.map(member => {
        const myTasks = allTasks.filter(t => t.assignee?.toLowerCase() === member.name?.toLowerCase());
        
        let pending = 0, inProg = 0, overdue = 0, high = 0, done = 0;
        const today = new Date().toISOString().split('T')[0];

        myTasks.forEach(t => {
          if (t.status === 'Completed') done++;
          else {
            if (t.status === 'In Progress') inProg++;
            else pending++; // Default Pending

            if (t.due_date && t.due_date < today) overdue++;
            if (t.priority === 'High') high++;
          }
        });

        const active = pending + inProg + overdue;
        const total = myTasks.length;
        
        let status = 'Balanced';
        if (active === 0) status = 'Free';
        else if (active > 15) status = 'Overloaded';
        else if (active > 7) status = 'Busy';

        return {
          id: member.id,
          name: member.name || 'Unknown',
          role: member.role || 'Member',
          department: member.department,
          initials: (member.name || 'Un known').substring(0,2).toUpperCase(),
          status,
          metrics: { active, pending, inProg, overdue, high },
          done,
          total
        };
      });

      setTeam(computedTeam);
    }
  };

  const filteredTeam = useMemo(() => {
    let result = team;
    if (activeDept !== 'All Departments') {
      result = result.filter(m => m.department === activeDept);
    }
    if (search) {
      result = result.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
    }
    return result;
  }, [search, activeDept, team]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'Overloaded': return { bg: 'bg-rose-50', text: 'text-rose-500', border: 'border-rose-100', icon: Flame };
      case 'Busy': return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', icon: AlertTriangle };
      case 'Balanced': return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', icon: Scale };
      case 'Free': return { bg: 'bg-indigo-50/80', text: 'text-[#6b47ed]', border: 'border-indigo-100', icon: CarFront };
      default: return { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200', icon: Check };
    }
  };

  const totalActive = team.reduce((acc, curr) => acc + curr.metrics.active, 0);
  const totalOverdue = team.reduce((acc, curr) => acc + curr.metrics.overdue, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen text-gray-800 relative pb-24">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 rounded-2xl">
            <Users className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 font-outfit">Team Workload</h1>
            <p className="text-xs text-gray-500 mt-1">See who's overloaded and who has capacity</p>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-xl font-black text-gray-900">{totalActive}</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ACTIVE</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black text-rose-500">{totalOverdue}</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">OVERDUE</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 w-full sm:w-48 shadow-sm">
          <Building className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
          <select 
            value={activeDept}
            onChange={(e) => setActiveDept(e.target.value)}
            className="w-full text-sm font-semibold text-gray-600 outline-none bg-transparent appearance-none cursor-pointer"
          >
            <option value="All Departments">All Departments</option>
            {departments.map((dept, idx) => (
              <option key={idx} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
        
        <div className="relative flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search members..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-2 text-sm text-gray-800 outline-none bg-transparent font-medium"
          />
        </div>

        <select className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-600 outline-none shadow-sm cursor-pointer w-full sm:w-auto">
          <option>Most Active</option>
          <option>Least Active</option>
          <option>A-Z</option>
        </select>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border-t-4 border-t-rose-500 rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-rose-50 flex items-center justify-center">
              <Flame className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <span className="text-xl font-black text-gray-900">{team.filter(t=>t.status === 'Overloaded').length}</span>
          </div>
          <span className="text-[10px] font-bold text-gray-500 uppercase">Overloaded</span>
        </div>

        <div className="bg-white border-t-4 border-t-amber-400 rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <span className="text-xl font-black text-gray-900">{team.filter(t=>t.status === 'Busy').length}</span>
          </div>
          <span className="text-[10px] font-bold text-gray-500 uppercase">Busy</span>
        </div>

        <div className="bg-white border-t-4 border-t-emerald-400 rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center">
              <Scale className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <span className="text-xl font-black text-gray-900">{team.filter(t=>t.status === 'Balanced').length}</span>
          </div>
          <span className="text-[10px] font-bold text-gray-500 uppercase">Balanced</span>
        </div>

        <div className="bg-white border-t-4 border-t-[#6b47ed] rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center">
              <CarFront className="w-3.5 h-3.5 text-[#6b47ed]" />
            </div>
            <span className="text-xl font-black text-gray-900">{team.filter(t=>t.status === 'Free').length}</span>
          </div>
          <span className="text-[10px] font-bold text-gray-500 uppercase">Free</span>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-4">Showing {filteredTeam.length} of {team.length} members</p>

      {/* Member Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {filteredTeam.map(member => {
          const sColors = getStatusColor(member.status);
          const Icon = sColors.icon;
          const percentDone = member.total === 0 ? 0 : Math.round((member.done / member.total) * 100);

          return (
            <div 
              key={member.id} 
              onClick={() => onNavigateToPrivateChat && onNavigateToPrivateChat(member)}
              className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] relative hover:shadow-lg hover:-translate-y-0.5 hover:border-indigo-200 transition-all cursor-pointer group"
              title={`Click to open private chat with ${member.name}`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex gap-3 items-center">
                   <div className="w-10 h-10 rounded-full bg-[#1e40af] text-white flex items-center justify-center font-bold text-sm tracking-widest shadow-inner">
                     {member.initials}
                   </div>
                   <div>
                     <h4 className="font-bold text-gray-900 text-sm truncate">{member.name}</h4>
                     <p className="text-xs text-emerald-600 font-semibold mt-0.5">{member.role}</p>
                   </div>
                </div>
                <div className={`px-3 py-1 ${sColors.bg} border ${sColors.border} ${sColors.text} text-[10px] font-bold rounded-full flex items-center gap-1.5`}>
                  <Icon className="w-3 h-3" /> {member.status}
                </div>
              </div>

              <div className="grid grid-cols-5 gap-1 text-center mb-6 border-y border-gray-50 py-3">
                 <div className="flex flex-col">
                   <span className="text-sm font-black text-gray-800">{member.metrics.active}</span>
                   <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1">Active</span>
                 </div>
                 <div className="flex flex-col">
                   <span className="text-sm font-black text-gray-800">{member.metrics.pending}</span>
                   <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1">Pending</span>
                 </div>
                 <div className="flex flex-col border-x border-gray-100">
                   <span className="text-sm font-black text-gray-800">{member.metrics.inProg}</span>
                   <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1">In Prog</span>
                 </div>
                 <div className="flex flex-col">
                   <span className={`text-sm font-black ${member.metrics.overdue > 0 ? 'text-rose-500' : 'text-gray-300'}`}>{member.metrics.overdue}</span>
                   <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1">Overdue</span>
                 </div>
                 <div className="flex flex-col border-l border-gray-100">
                   <span className={`text-sm font-black ${member.metrics.high > 0 ? 'text-amber-500' : 'text-gray-300'}`}>{member.metrics.high}</span>
                   <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1">High</span>
                 </div>
              </div>

              <div>
                 <div className="flex justify-between items-center text-[10px] font-bold mb-2">
                   <span className="text-gray-500">Done: {member.done}/{member.total}</span>
                   <span className="text-teal-600">{percentDone}%</span>
                 </div>
                 <div className="w-full bg-gray-100 rounded-full h-1.5">
                   <div className="bg-gradient-to-r from-teal-400 to-emerald-500 h-1.5 rounded-full" style={{ width: `${percentDone}%` }}></div>
                 </div>
              </div>
            </div>
          )
        })}

      </div>



    </div>
  );
}
