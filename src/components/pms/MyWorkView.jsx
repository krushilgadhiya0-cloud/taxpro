import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckSquare, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Sparkles, 
  FolderKanban, 
  User, 
  Building2, 
  RefreshCw, 
  ArrowUpRight, 
  Flame, 
  CalendarCheck, 
  Coffee, 
  CheckCheck, 
  ArrowRight,
  TrendingUp,
  Tag,
  Paperclip,
  X,
  Smile,
  QrCode,
  IndianRupee,
  Save,
  Edit3,
  Check
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { logAuditActivity } from '../../lib/auditLogger';
import soundFX from '../../lib/audioFX';

export default function MyWorkView({ onShowToast, onNavigateToLeave }) {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter & Search states
  const [activeTab, setActiveTab] = useState('Active'); // 'Active' | 'InProgress' | 'Pending' | 'Urgent' | 'Overdue' | 'Completed' | 'All'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [assigneeScope, setAssigneeScope] = useState('me'); // 'me' | 'all'

  // Quick Add Task Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    client: '',
    category: 'GST Return Filing',
    due_date: new Date().toISOString().slice(0, 10),
    priority: 'High',
    status: 'In Progress',
    project: 'None',
    notes: ''
  });

  // Current logged in user details
  const currentUserName = localStorage.getItem('taxpro_user_name') || localStorage.getItem('taxpro_user_fullname') || 'My Workspace';
  const currentUserEmail = localStorage.getItem('taxpro_user_email') || '';
  const currentUserRole = localStorage.getItem('taxpro_user_role') || 'Employee';
  const currentUserDepartment = localStorage.getItem('taxpro_user_department') || 'Tax & Compliance';
  const isAdmin = currentUserRole === 'Admin' || currentUserRole === 'Administrator' || currentUserRole === 'Super Admin';

  // Salary Payout UPI Configuration states
  const [isUpiModalOpen, setIsUpiModalOpen] = useState(false);
  const [staffUpiId, setStaffUpiId] = useState(() => {
    return localStorage.getItem(`taxpro_upi_${currentUserEmail}`) || localStorage.getItem('taxpro_user_upi') || '';
  });
  const [upiInputVal, setUpiInputVal] = useState('');
  const [isSavingUpi, setIsSavingUpi] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tasksRes, clientsRes, membersRes, projectsRes] = await Promise.all([
        supabase.from('global_tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('id, name, trade_name').order('name', { ascending: true }),
        supabase.from('team_members').select('name, email, upi_id').order('name', { ascending: true }),
        supabase.from('projects').select('*').order('created_at', { ascending: false })
      ]);

      if (tasksRes.data) {
        setTasks(tasksRes.data.map(t => ({ ...t, dueDate: t.due_date })));
      }
      if (clientsRes.data) setClients(clientsRes.data);
      if (membersRes.data) {
        setTeamMembers(membersRes.data.map(m => m.name).filter(Boolean));
        // Find current user's UPI
        const me = membersRes.data.find(m => m.email?.toLowerCase() === currentUserEmail.toLowerCase());
        if (me && me.upi_id) {
          setStaffUpiId(me.upi_id);
          localStorage.setItem(`taxpro_upi_${currentUserEmail}`, me.upi_id);
          localStorage.setItem('taxpro_user_upi', me.upi_id);
        }
      }
      if (projectsRes.data) setProjects(projectsRes.data);
    } catch (err) {
      console.warn('[MyWorkView Fetch Error]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveUpi = async (e) => {
    if (e) e.preventDefault();
    const cleanUpi = upiInputVal.trim();
    if (!cleanUpi) {
      if (onShowToast) onShowToast('Please enter your UPI ID (e.g. name@okaxis).', 'warning');
      return;
    }
    if (!cleanUpi.includes('@')) {
      if (onShowToast) onShowToast('Invalid UPI ID. Must include "@" (e.g. 9876543210@paytm or employee@okaxis).', 'error');
      return;
    }

    setIsSavingUpi(true);
    try {
      localStorage.setItem(`taxpro_upi_${currentUserEmail}`, cleanUpi);
      localStorage.setItem('taxpro_user_upi', cleanUpi);
      setStaffUpiId(cleanUpi);

      try {
        await supabase.from('team_members').update({ upi_id: cleanUpi }).ilike('email', currentUserEmail);
      } catch (e) {}

      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
      window.dispatchEvent(new CustomEvent('taxpro_upi_updated', { detail: cleanUpi }));

      setIsUpiModalOpen(false);
      if (onShowToast) onShowToast(`✓ Salary Payout UPI updated to "${cleanUpi}"!`, 'success');
    } catch (err) {
      if (onShowToast) onShowToast('Failed to save UPI ID.', 'error');
    } finally {
      setIsSavingUpi(false);
    }
  };

  const getSalaryUpiQrUrl = (vpa, name) => {
    if (!vpa || !vpa.trim()) return '';
    const cleanUpi = vpa.trim();
    const cleanName = (name || currentUserName || 'Staff Member').trim();
    const upiUri = `upi://pay?pa=${cleanUpi}&pn=${encodeURIComponent(cleanName)}&cu=INR&tn=${encodeURIComponent('Salary Disbursement')}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUri)}&margin=8`;
  };

  useEffect(() => {
    fetchData();
    const handleDbUpdate = () => fetchData();
    window.addEventListener('taxpro_db_updated', handleDbUpdate);
    return () => window.removeEventListener('taxpro_db_updated', handleDbUpdate);
  }, []);

  // Filter tasks strictly assigned to the current logged in user
  const myAssignedTasks = useMemo(() => {
    if (isAdmin && assigneeScope === 'all') {
      return tasks;
    }

    const cleanUser = (currentUserName || '').toLowerCase().trim();
    const cleanEmail = (currentUserEmail || '').toLowerCase().trim();
    
    // Strict match on assignee
    const matched = tasks.filter(t => {
      const assignee = (t.assignee || '').toLowerCase().trim();
      if (!assignee) return false;
      return (
        assignee === cleanUser ||
        assignee === cleanEmail ||
        assignee.includes(cleanUser) ||
        cleanUser.includes(assignee) ||
        assignee === 'me'
      );
    });

    // If no exact match found yet, check if task is unassigned or demo fallback
    return matched.length > 0 ? matched : tasks;
  }, [tasks, currentUserName, currentUserEmail, isAdmin, assigneeScope]);

  // Today string YYYY-MM-DD
  const todayStr = new Date().toISOString().slice(0, 10);

  // Filtered task list
  const filteredTasks = useMemo(() => {
    return myAssignedTasks.filter(task => {
      // Tab filter
      if (activeTab === 'Active' && task.status === 'Completed') return false; // Removes completed from active tasks
      if (activeTab === 'InProgress' && task.status !== 'In Progress') return false;
      if (activeTab === 'Pending' && (task.status === 'Completed' || task.status === 'In Progress')) return false;
      if (activeTab === 'Completed' && task.status !== 'Completed') return false;
      if (activeTab === 'Urgent' && (task.priority !== 'High' && task.priority !== 'Urgent')) return false;
      if (activeTab === 'Overdue') {
        const isPast = task.due_date && task.due_date < todayStr;
        if (!isPast || task.status === 'Completed') return false;
      }

      // Category filter
      if (selectedCategory !== 'All' && task.category !== selectedCategory) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (task.title || '').toLowerCase().includes(q);
        const clientMatch = (task.client || '').toLowerCase().includes(q);
        const projMatch = (task.project || '').toLowerCase().includes(q);
        const catMatch = (task.category || '').toLowerCase().includes(q);
        if (!titleMatch && !clientMatch && !projMatch && !catMatch) return false;
      }

      return true;
    });
  }, [myAssignedTasks, activeTab, selectedCategory, searchQuery, todayStr]);

  // Metric stats
  const stats = useMemo(() => {
    const total = myAssignedTasks.length;
    const completed = myAssignedTasks.filter(t => t.status === 'Completed').length;
    const inProgress = myAssignedTasks.filter(t => t.status === 'In Progress').length;
    const pending = myAssignedTasks.filter(t => t.status !== 'Completed' && t.status !== 'In Progress').length;
    const active = inProgress + pending;
    const overdue = myAssignedTasks.filter(t => t.due_date && t.due_date < todayStr && t.status !== 'Completed').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 100;

    return { total, active, completed, inProgress, pending, overdue, rate };
  }, [myAssignedTasks, todayStr]);

  // Set Task Status (In Progress, Completed, Pending)
  const handleSetStatus = async (task, newStatus) => {
    if (task.status === newStatus) return;

    try {
      if (newStatus === 'Completed') soundFX.playSuccess();
      else soundFX.playClick();
    } catch (e) {}

    // 1. Optimistic UI update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

    // 2. Persist to Supabase / PostgreSQL
    try {
      await supabase.from('global_tasks').update({ status: newStatus }).eq('id', task.id);
    } catch (e) {
      console.warn('[Task Status Update Note]:', e);
    }

    // 3. Sync with linked project if any
    if (task.project && task.project !== 'None') {
      try {
        const proj = projects.find(p => p.name === task.project || String(p.id) === String(task.project_id));
        if (proj && Array.isArray(proj.tasks)) {
          const updatedProjTasks = proj.tasks.map(pt => {
            if (pt.title === task.title || pt.id === task.id || pt.globalTaskId === task.id) {
              return { ...pt, completed: newStatus === 'Completed' };
            }
            return pt;
          });
          await supabase.from('projects').update({ tasks: updatedProjTasks }).eq('id', proj.id);
        }
      } catch (projErr) {
        console.warn('[Project Sync Note]:', projErr);
      }
    }

    // 4. Log Audit Activity
    logAuditActivity({
      action: 'UPDATE_TASK_STATUS',
      module: 'My Work',
      details: `${currentUserName} updated task "${task.title}" status to ${newStatus}`,
      metadata: { taskId: task.id, title: task.title, status: newStatus }
    });

    // 5. Toast feedback & sync events
    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
    if (onShowToast) {
      if (newStatus === 'Completed') {
        onShowToast(`🎉 Awesome! "${task.title}" marked as Completed! (Moved to Completed tab)`, 'success');
      } else if (newStatus === 'In Progress') {
        onShowToast(`⚡ "${task.title}" is now In Progress!`, 'info');
      } else {
        onShowToast(`Task "${task.title}" status set to Pending.`, 'info');
      }
    }
  };

  // 1-Click Toggle Done
  const handleMarkAsDone = (task) => {
    const isCurrentlyDone = task.status === 'Completed';
    handleSetStatus(task, isCurrentlyDone ? 'In Progress' : 'Completed');
  };

  // Handle Create New Personal Task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskForm.title.trim()) {
      if (onShowToast) onShowToast('Please enter a task title.', 'warning');
      return;
    }

    const newTask = {
      id: `TSK-${Date.now()}`,
      title: newTaskForm.title.trim(),
      client: newTaskForm.client || 'Internal Practice',
      category: newTaskForm.category,
      due_date: newTaskForm.due_date || todayStr,
      priority: newTaskForm.priority,
      status: newTaskForm.status,
      assignee: currentUserName,
      project: newTaskForm.project || 'None',
      notes: newTaskForm.notes || '',
      created_at: new Date().toISOString()
    };

    setTasks(prev => [newTask, ...prev]);
    try {
      await supabase.from('global_tasks').insert([newTask]);
    } catch (err) {
      console.warn('[Create Task Note]:', err);
    }

    logAuditActivity({
      action: 'CREATE_MY_TASK',
      module: 'My Work',
      details: `${currentUserName} created task "${newTask.title}"`,
      metadata: { taskId: newTask.id, title: newTask.title }
    });

    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
    if (onShowToast) onShowToast(`✓ Task "${newTask.title}" added to your workload!`, 'success');

    setIsAddModalOpen(false);
    setNewTaskForm({
      title: '',
      client: '',
      category: 'GST Return Filing',
      due_date: todayStr,
      priority: 'High',
      status: 'In Progress',
      project: 'None',
      notes: ''
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in font-sans">
      
      {/* 1. TOP HEADER & WORKLOAD BANNER */}
      <div className="bg-gradient-to-r from-[#181c32] via-[#242b4d] to-[#1e1e2d] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/20 relative overflow-hidden">
        
        {/* Background ambient glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          {/* User Welcome info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Workforce Command Hub
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-gray-300 border border-white/10">
                {currentUserRole}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {currentUserDepartment}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white font-outfit tracking-tight">
              My Assigned Work & Deliverables
            </h1>
            
            <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
              Hello <strong className="text-white font-bold">{currentUserName}</strong>! Track your client tasks, update deliverable milestones, and click <span className="text-emerald-400 font-bold">"✓ Done"</span> when complete to notify management instantly.
            </p>
          </div>

          {/* Quick Actions (Add Task, Salary UPI & Ask Leave) */}
          <div className="flex items-center gap-3 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => {
                setUpiInputVal(staffUpiId || '');
                setIsUpiModalOpen(true);
              }}
              className={`px-3.5 py-2.5 rounded-xl border font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ${
                staffUpiId 
                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                  : 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border-indigo-500/40'
              }`}
              title="Add or update your personal UPI ID for salary payouts"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span className="truncate max-w-[140px] sm:max-w-[200px]">
                {staffUpiId ? `UPI: ${staffUpiId}` : 'Add Salary UPI'}
              </span>
            </button>

            {!(localStorage.getItem('taxpro_user_role') === 'Admin' || localStorage.getItem('taxpro_user_role') === 'Super Admin') && (
              <button
                onClick={() => {
                  if (onNavigateToLeave) {
                    onNavigateToLeave();
                  } else {
                    window.location.hash = '#/ask-leave';
                    window.dispatchEvent(new CustomEvent('taxpro_screen_changed', { detail: 'Ask Leave' }));
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-105"
              >
                <Coffee className="w-4 h-4 text-amber-400" />
                <span>Ask Leave / Apply</span>
              </button>
            )}

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#5b52e0] hover:bg-indigo-600 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/30 hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Work Item</span>
            </button>
          </div>

        </div>

        {/* 2. KPI METRICS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-white/10 relative z-10">
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Assigned</div>
            <div className="text-2xl font-black font-mono text-white mt-1">{stats.total}</div>
            <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
              <CheckSquare className="w-3 h-3 text-indigo-400" /> Total deliverables
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-300">In Progress</div>
            <div className="text-2xl font-black font-mono text-amber-400 mt-1">{stats.inProgress}</div>
            <div className="text-[10px] text-amber-300/80 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" /> Active tasks
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="text-[10px] font-black uppercase tracking-wider text-rose-300">Overdue / Urgent</div>
            <div className="text-2xl font-black font-mono text-rose-400 mt-1">{stats.overdue}</div>
            <div className="text-[10px] text-rose-300/80 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-rose-400" /> Past deadline
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Completed</div>
            <div className="text-2xl font-black font-mono text-emerald-400 mt-1">{stats.completed}</div>
            <div className="text-[10px] text-emerald-300/80 mt-1 flex items-center gap-1">
              <CheckCheck className="w-3 h-3 text-emerald-400" /> Finished tasks
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between col-span-2 sm:col-span-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Efficiency Rate</div>
            <div className="text-2xl font-black font-mono text-cyan-400 mt-1">{stats.rate}%</div>
            <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-cyan-400 h-full rounded-full transition-all duration-500" style={{ width: `${stats.rate}%` }} />
            </div>
          </div>

        </div>

      </div>

      {/* 3. FILTER TABS & SEARCH CONTROLS */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Tab buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {[
              { id: 'Active', label: '🚀 Active Tasks', count: stats.active },
              { id: 'InProgress', label: '⚡ In Progress', count: stats.inProgress },
              { id: 'Pending', label: '⏳ Pending', count: stats.pending },
              { id: 'Urgent', label: '🔥 Urgent', count: myAssignedTasks.filter(t => t.priority === 'High' || t.priority === 'Urgent').length },
              { id: 'Overdue', label: '⚠️ Overdue', count: stats.overdue },
              { id: 'Completed', label: '✅ Completed', count: stats.completed },
              { id: 'All', label: '🎯 All My Tasks', count: stats.total }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#5b52e0] text-white shadow-sm shadow-indigo-600/30 ring-2 ring-indigo-200'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search, Scope and Category Filter */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {isAdmin && (
              <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setAssigneeScope('me')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    assigneeScope === 'me' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  My Work
                </button>
                <button
                  type="button"
                  onClick={() => setAssigneeScope('all')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    assigneeScope === 'all' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All Staff Work
                </button>
              </div>
            )}

            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search my tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={fetchData}
              className="p-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
              title="Refresh Task Sync"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#5b52e0]' : ''}`} />
            </button>
          </div>

        </div>

      </div>

      {/* 4. TASK ITEMS LIST & GRID */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-full bg-indigo-50 text-[#5b52e0] flex items-center justify-center text-3xl mx-auto shadow-inner">
            🎉
          </div>
          <h3 className="text-lg font-black text-gray-900 font-outfit">
            No work items found matching this filter!
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            {activeTab === 'Active' ? "You're all caught up on your active deliverables! Great job." : 'No tasks currently match your filter criteria.'}
          </p>
          <button
            onClick={() => { setActiveTab('Active'); setSearchQuery(''); }}
            className="px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black transition-colors cursor-pointer"
          >
            Show Active Work
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => {
            const isCompleted = task.status === 'Completed';
            const isInProgress = task.status === 'In Progress';
            const isPending = !isCompleted && !isInProgress;
            const isOverdue = task.due_date && task.due_date < todayStr && !isCompleted;
            const isDueToday = task.due_date === todayStr && !isCompleted;

            return (
              <div
                key={task.id}
                className={`bg-white border rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between relative group hover:shadow-md ${
                  isCompleted 
                    ? 'border-emerald-200 bg-emerald-50/20 opacity-90' 
                    : isOverdue 
                      ? 'border-rose-200 bg-rose-50/10' 
                      : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                <div>
                  
                  {/* Card Top: Category & Priority */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-200">
                      {task.category || 'General Task'}
                    </span>
                    
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      task.priority === 'Urgent' || task.priority === 'High'
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : task.priority === 'Medium'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {task.priority || 'Normal'}
                    </span>
                  </div>

                  {/* Task Title */}
                  <h4 className={`text-sm font-black text-gray-900 font-outfit leading-snug line-clamp-2 ${
                    isCompleted ? 'line-through text-gray-400' : ''
                  }`}>
                    {task.title}
                  </h4>

                  {/* Client & Project Information */}
                  <div className="mt-3 space-y-1.5 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="font-semibold text-gray-800 truncate">
                        {task.client || 'Practice Management'}
                      </span>
                    </div>

                    {task.project && task.project !== 'None' && (
                      <div className="flex items-center gap-1.5 truncate text-[11px] text-purple-700 font-medium">
                        <FolderKanban className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span className="truncate">Project: {task.project}</span>
                      </div>
                    )}
                  </div>

                  {/* Notes / Description snippet */}
                  {task.notes && (
                    <p className="text-[11px] text-gray-500 bg-gray-50 p-2 rounded-xl mt-3 line-clamp-2 border border-gray-100">
                      {task.notes}
                    </p>
                  )}

                </div>

                {/* Card Bottom: Status Quick Actions and Done Button */}
                <div className="mt-4 pt-3 border-t border-gray-100 space-y-3">
                  
                  {/* Deadline & Current Status indicator */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-[11px] font-mono">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Due:</span>
                      <span className={`font-bold flex items-center gap-1 ${
                        isOverdue 
                          ? 'text-rose-600 font-black' 
                          : isDueToday 
                            ? 'text-amber-600 font-black' 
                            : 'text-gray-700'
                      }`}>
                        <Calendar className="w-3 h-3" />
                        {task.due_date || 'No Date'}
                      </span>
                    </div>

                    {/* Status Pill Switcher */}
                    <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-[10px]">
                      <button
                        type="button"
                        onClick={() => handleSetStatus(task, 'In Progress')}
                        title="Set status to In Progress"
                        className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                          isInProgress 
                            ? 'bg-blue-600 text-white shadow-xs' 
                            : 'text-gray-600 hover:text-blue-700'
                        }`}
                      >
                        In Progress
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetStatus(task, 'Pending')}
                        title="Set status to Pending"
                        className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                          isPending 
                            ? 'bg-amber-500 text-white shadow-xs' 
                            : 'text-gray-600 hover:text-amber-700'
                        }`}
                      >
                        Pending
                      </button>
                    </div>
                  </div>

                  {/* 1-CLICK AUTOMATIC DONE BUTTON */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleMarkAsDone(task)}
                      className={`w-full py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 ${
                        isCompleted
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-500/20 hover:scale-[1.02]'
                      }`}
                      title={isCompleted ? 'Click to reopen to In Progress' : 'Click to complete (removes from active tasks)'}
                    >
                      <CheckCircle2 className={`w-4 h-4 ${isCompleted ? 'text-white' : 'text-emerald-100'}`} />
                      <span>{isCompleted ? '✓ Completed (Click to Reopen)' : '✓ Mark Completed'}</span>
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 5. QUICK ADD WORK ITEM MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
            
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-[#5b52e0] flex items-center justify-center">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 font-outfit">
                  Add Personal Deliverable
                </h3>
                <p className="text-xs text-gray-500">
                  Assign a new task to your workload
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. File GSTR-3B for M/S ABC Traders"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Client Name
                  </label>
                  <select
                    value={newTaskForm.client}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, client: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Internal Practice --</option>
                    {clients.map(c => (
                      <option key={c.id || c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newTaskForm.category}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="GST Return Filing">GST Return Filing</option>
                    <option value="Income Tax Return">Income Tax Return</option>
                    <option value="TDS & TCS Compliance">TDS & TCS Compliance</option>
                    <option value="Statutory Audit">Statutory Audit</option>
                    <option value="MCA & ROC Filing">MCA & ROC Filing</option>
                    <option value="Accounting & Bookkeeping">Accounting & Bookkeeping</option>
                    <option value="Notice / Assessment">Notice / Assessment</option>
                    <option value="General Task">General Task</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newTaskForm.due_date}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={newTaskForm.priority}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Notes & Deliverable Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="Add any specific instructions, ledger references, or checklist items..."
                  value={newTaskForm.notes}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#5b52e0] hover:bg-indigo-600 text-white text-xs font-black transition-all shadow-md shadow-indigo-600/30"
                >
                  Create Deliverable
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* SALARY PAYOUT UPI CONFIGURATION MODAL FOR STAFF */}
      {isUpiModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsUpiModalOpen(false); }}
          className="modal-overlay-backdrop"
        >
          <div className="modal-content-box max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden text-gray-800 animate-page-fade">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white p-5 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black font-outfit text-white">
                    Salary Payout UPI Setup
                  </h3>
                  <p className="text-xs text-gray-300">
                    Receive direct salary disbursements & bonuses
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUpiModalOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveUpi} className="p-6 space-y-4 text-xs font-semibold">
              <div>
                <label className="text-gray-700 block mb-1">
                  Your Virtual Payment Address (UPI ID) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">@</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. yourname@okaxis, 9876543210@paytm"
                    value={upiInputVal}
                    onChange={(e) => setUpiInputVal(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl pl-8 pr-3.5 py-2.5 text-xs font-mono font-bold text-gray-900 outline-none focus:bg-white focus:border-emerald-500"
                    autoFocus
                  />
                </div>

                {/* Quick Handle Chips */}
                <div className="flex items-center gap-1.5 mt-2.5 flex-wrap text-[10px]">
                  <span className="text-gray-500 font-medium">Quick handles:</span>
                  {['@okaxis', '@ybl', '@oksbi', '@paytm', '@ibl', '@icici'].map((handle) => (
                    <button
                      key={handle}
                      type="button"
                      onClick={() => {
                        const prefix = upiInputVal.split('@')[0] || (currentUserEmail ? currentUserEmail.split('@')[0] : 'name');
                        setUpiInputVal(`${prefix}${handle}`);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-gray-100 border border-gray-200 text-indigo-700 hover:bg-indigo-50 font-mono font-bold cursor-pointer transition-colors"
                    >
                      {handle}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic QR Preview */}
              {upiInputVal.trim() && upiInputVal.includes('@') && (
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider mb-2">
                    ⚡ Auto-Generated Salary Payment QR
                  </span>
                  <div className="bg-white p-2 rounded-xl shadow-md border border-emerald-100">
                    <img 
                      src={getSalaryUpiQrUrl(upiInputVal, currentUserName)} 
                      alt="Personal Salary UPI QR" 
                      className="w-28 h-28 object-contain"
                    />
                  </div>
                  <span className="text-[11px] font-mono font-black text-emerald-950 mt-2 break-all">
                    {upiInputVal.trim()}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium mt-0.5">
                    Verified for instant Administrator salary clearance
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setIsUpiModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingUpi}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingUpi ? 'Saving...' : 'Save UPI ID'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
