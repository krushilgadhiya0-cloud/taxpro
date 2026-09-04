import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  Clock, 
  Bell, 
  ChevronRight, 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  UserCheck, 
  ListTodo, 
  Receipt, 
  UserPlus, 
  MessageSquare, 
  CalendarCheck, 
  Timer, 
  Settings, 
  FileText, 
  DollarSign,
  RefreshCw,
  Filter,
  Lock,
  X,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  FolderKanban,
  Briefcase,
  Check,
  Sparkles,
  TrendingUp,
  Plus,
  ArrowRight,
  Flame
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { invalidateQueryCache } from '../lib/postgresClient';
import soundFX from '../lib/audioFX';
import { logAuditActivity } from '../lib/auditLogger';

export default function DashboardView({ onOpenOTP, onTriggerAI, onNavigateItem, onShowToast }) {
  const [activeSidebarItem, setActiveSidebarItem] = useState('Dashboard');
  const [activeSubTab, setActiveSubTab] = useState('Tasks');
  const [activeCategory, setActiveCategory] = useState('All');
  const [tasksFilterTab, setTasksFilterTab] = useState('All'); // 'All' | 'My' | 'Pending' | 'Completed'

  // Applied Active Filter States
  const [dateRangeFilter, setDateRangeFilter] = useState('All Time');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');

  // Temporary Filter States (inside Drawer)
  const [tempDateRange, setTempDateRange] = useState('All Time');
  const [tempCustomStartDate, setTempCustomStartDate] = useState('');
  const [tempCustomEndDate, setTempCustomEndDate] = useState('');
  const [tempSelectedDepts, setTempSelectedDepts] = useState([]);
  const [tempSelectedAssignee, setTempSelectedAssignee] = useState('All');
  const [tempSelectedStatus, setTempSelectedStatus] = useState('All');
  const [tempSelectedPriority, setTempSelectedPriority] = useState('All');

  const [currentTime, setCurrentTime] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [taskDetailType, setTaskDetailType] = useState(null);
  const [userDepartment, setUserDepartment] = useState('');
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const dept = localStorage.getItem('taxpro_user_department');
    if (dept) setUserDepartment(dept);

    try {
      invalidateQueryCache('global_tasks');
      invalidateQueryCache('team_members');
      invalidateQueryCache('projects');

      const [tasksRes, membersRes, deptsRes, projRes] = await Promise.all([
         supabase.from('global_tasks').select('*'),
         supabase.from('team_members').select('*'),
         supabase.from('departments').select('*'),
         supabase.from('projects').select('*').order('created_at', { ascending: false })
      ]);
      
      if (tasksRes.data) {
         setTasks(tasksRes.data.map(t => ({
           ...t,
           dueDate: t.due_date || t.dueDate
         })));
      }
      
      if (membersRes.data) setTeamMembers(membersRes.data);
      if (deptsRes.data) setDepartmentsList(deptsRes.data);

      if (projRes.data && projRes.data.length > 0) {
        setProjects(projRes.data.map(p => ({
          id: p.id,
          name: p.name,
          clientName: p.client_name || p.client_id || '',
          projectManager: p.manager || '',
          category: p.category || 'General',
          dueDate: p.deadline || p.due_date || '',
          status: p.status || 'Active',
          createdAt: p.created_at || ''
        })));
      } else {
        const localProj = localStorage.getItem('taxpro_projects');
        if (localProj) {
          try {
            const parsed = JSON.parse(localProj);
            if (Array.isArray(parsed)) {
              setProjects(parsed.map(p => ({
                id: p.id,
                name: p.name || p.title,
                clientName: p.clientName || p.client_name || '',
                projectManager: p.projectManager || p.manager || '',
                category: p.category || 'General',
                dueDate: p.dueDate || p.deadline || '',
                status: p.status || 'Active',
                createdAt: p.createdAt || p.created_at || ''
              })));
            }
          } catch(e) {}
        }
      }
      
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadData();
    setCurrentTime(new Date().toLocaleString());

    let realtimeChannel = null;
    if (supabase && typeof supabase.channel === 'function') {
      try {
        realtimeChannel = supabase.channel('dashboard-realtime')
          .on('postgres_changes', { event: '*', schema: 'public' }, () => {
             loadData();
             setCurrentTime(new Date().toLocaleString());
          })
          .subscribe();
      } catch (e) {}
    }

    const handleSync = () => {
      loadData();
      setCurrentTime(new Date().toLocaleString());
    };

    const handleScreenChange = (e) => {
      if (!e.detail || e.detail === 'Dashboard') {
        loadData();
        setCurrentTime(new Date().toLocaleString());
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadData();
        setCurrentTime(new Date().toLocaleString());
      }
    };

    window.addEventListener('taxpro_db_updated', handleSync);
    window.addEventListener('taxpro_tasks_updated', handleSync);
    window.addEventListener('taxpro_workforce_synced', handleSync);
    window.addEventListener('taxpro_screen_changed', handleScreenChange);
    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleVisibility);

    const intervalId = window.setInterval(loadData, 15000);
    
    return () => {
      if (realtimeChannel && supabase && typeof supabase.removeChannel === 'function') {
        try {
          supabase.removeChannel(realtimeChannel);
        } catch(e) {}
      }
      window.removeEventListener('taxpro_db_updated', handleSync);
      window.removeEventListener('taxpro_tasks_updated', handleSync);
      window.removeEventListener('taxpro_workforce_synced', handleSync);
      window.removeEventListener('taxpro_screen_changed', handleScreenChange);
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(intervalId);
    };
  }, [loadData]);

  // Available Dynamic Department List
  const availableDepartments = useMemo(() => {
    const defaultDepts = [
      'Audit & Assurance',
      'Tax Compliance',
      'GST & Direct Tax',
      'Corporate Law & Advisory',
      'Accounting & Payroll',
      'General'
    ];
    const fromList = departmentsList.map(d => d.name || d.department_name).filter(Boolean);
    const fromMembers = teamMembers.map(m => m.department).filter(Boolean);
    const fromTasks = tasks.map(t => t.department).filter(Boolean);
    return Array.from(new Set([...fromList, ...fromMembers, ...fromTasks, ...defaultDepts]));
  }, [departmentsList, teamMembers, tasks]);

  // Comprehensive Filter Check Functions
  const filterTaskByDate = (t, range, start, end) => {
    if (range === 'All Time') return true;
    const rawDate = t.dueDate || t.due_date || t.created_at;
    if (!rawDate) return true;
    
    const taskDate = new Date(rawDate);
    if (isNaN(taskDate.getTime())) return true;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDay = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());

    if (range === 'Today') {
      return taskDay.getTime() === today.getTime();
    }
    if (range === 'This Week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return taskDay >= startOfWeek && taskDay <= endOfWeek;
    }
    if (range === 'This Month') {
      return taskDate.getFullYear() === now.getFullYear() && taskDate.getMonth() === now.getMonth();
    }
    if (range === 'This Quarter') {
      const currentMonth = now.getMonth() + 1;
      const q = Math.ceil(currentMonth / 3);
      const qStart = (q - 1) * 3 + 1;
      const qEnd = q * 3;
      return taskDate.getFullYear() === now.getFullYear() && (taskDate.getMonth() + 1) >= qStart && (taskDate.getMonth() + 1) <= qEnd;
    }
    if (range === 'Last Quarter') {
      const currentMonth = now.getMonth() + 1;
      let lastQ = Math.ceil(currentMonth / 3) - 1;
      let y = now.getFullYear();
      if (lastQ === 0) { lastQ = 4; y = y - 1; }
      const qStart = (lastQ - 1) * 3 + 1;
      const qEnd = lastQ * 3;
      return taskDate.getFullYear() === y && (taskDate.getMonth() + 1) >= qStart && (taskDate.getMonth() + 1) <= qEnd;
    }
    if (range === 'Year to Date') {
      return taskDate.getFullYear() === now.getFullYear();
    }
    if (range === 'Custom Range') {
      if (start) {
        const startDate = new Date(start);
        if (taskDay < startDate) return false;
      }
      if (end) {
        const endDate = new Date(end);
        if (taskDay > endDate) return false;
      }
      return true;
    }
    return true;
  };

  const filterTaskByDept = (t, depts) => {
    if (!depts || depts.length === 0) return true;
    const assigneeObj = teamMembers.find(m => m.name === t.assignee);
    const tDept = t.department || (assigneeObj && assigneeObj.department) || 'General';
    return depts.includes(tDept) || depts.some(d => tDept.toLowerCase() === d.toLowerCase());
  };

  const filterTaskByAssignee = (t, assignee) => {
    if (!assignee || assignee === 'All') return true;
    if (assignee === 'Unassigned') return !t.assignee || t.assignee === 'None' || t.assignee === 'Unassigned';
    return t.assignee === assignee;
  };

  const filterTaskByStatus = (t, status) => {
    if (!status || status === 'All') return true;
    if (status === 'Pending') return t.status !== 'Completed';
    if (status === 'In Progress') return t.status === 'In Progress' || t.status === 'Working';
    if (status === 'Completed') return t.status === 'Completed';
    if (status === 'Overdue') {
      if (t.status === 'Completed' || !t.dueDate) return false;
      return new Date(t.dueDate) < new Date();
    }
    return t.status === status;
  };

  const filterTaskByPriority = (t, priority) => {
    if (!priority || priority === 'All') return true;
    return (t.priority || '').toLowerCase() === priority.toLowerCase();
  };

  // Scope-Filtered Tasks (for overall KPI calculation without status filter bias)
  const scopeTasks = useMemo(() => {
    return tasks.filter(t => {
      return (
        filterTaskByDate(t, dateRangeFilter, customStartDate, customEndDate) &&
        filterTaskByDept(t, selectedDepts) &&
        filterTaskByAssignee(t, selectedAssignee) &&
        filterTaskByPriority(t, selectedPriority)
      );
    });
  }, [tasks, dateRangeFilter, customStartDate, customEndDate, selectedDepts, selectedAssignee, selectedPriority, teamMembers]);

  // Active Multi-Layer Filtered Tasks (including status filter)
  const activeFilteredTasks = useMemo(() => {
    return scopeTasks.filter(t => filterTaskByStatus(t, selectedStatus));
  }, [scopeTasks, selectedStatus]);

  const currentUserEmail = (localStorage.getItem('taxpro_user_email') || 'admin@taxpro.com').toLowerCase().trim();
  const currentUserName = localStorage.getItem('taxpro_user_name') || localStorage.getItem('taxpro_user_fullname') || 'Administrator';

  // Toggle Task Completion Directly From Dashboard & Sync Everywhere
  const handleToggleTaskStatus = async (task, e) => {
    if (e) e.stopPropagation();
    const isCurrentlyDone = task.status === 'Completed';
    const nextStatus = isCurrentlyDone ? 'In Progress' : 'Completed';
    
    try {
      if (nextStatus === 'Completed') soundFX?.playSuccess?.();
      else soundFX?.playClick?.();
    } catch(err) {}

    const updatedTask = {
      ...task,
      status: nextStatus,
      completed_at: nextStatus === 'Completed' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };

    // 1. Optimistic Local Update
    setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));

    // 2. Persist to PostgreSQL Database
    try {
      invalidateQueryCache('global_tasks');
      await supabase.from('global_tasks').update({
        status: nextStatus,
        completed_at: nextStatus === 'Completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }).eq('id', task.id);
    } catch (err) {
      console.warn('[Dashboard Task Status Update Error]:', err);
    }

    // 3. Update any linked project in PostgreSQL
    if (task.project && task.project !== 'None') {
      try {
        const proj = projects.find(p => p.name === task.project || String(p.id) === String(task.project_id));
        if (proj && Array.isArray(proj.tasks)) {
          const updatedProjTasks = proj.tasks.map(pt => {
            if (pt.title === task.title || pt.id === task.id || pt.globalTaskId === task.id) {
              return { ...pt, completed: nextStatus === 'Completed' };
            }
            return pt;
          });
          await supabase.from('projects').update({ tasks: updatedProjTasks }).eq('id', proj.id);
        }
      } catch (projErr) {}
    }

    // 4. Log Audit Activity
    try {
      logAuditActivity({
        action: 'UPDATE_TASK_STATUS',
        module: 'Practice Dashboard',
        details: `${currentUserName} updated task "${task.title}" status to ${nextStatus}`,
        metadata: { taskId: task.id, title: task.title, status: nextStatus }
      });
    } catch(err) {}

    // 5. Broadcast to all open views & tabs
    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
    window.dispatchEvent(new CustomEvent('taxpro_tasks_updated'));

    if (onShowToast) {
      if (nextStatus === 'Completed') {
        onShowToast(`🎉 Awesome! "${task.title}" marked as Completed!`, 'success');
      } else {
        onShowToast(`Task "${task.title}" status changed to ${nextStatus}.`, 'info');
      }
    }
  };

  // Task Status & Workload Metrics (Calculated from scopeTasks for accurate live status totals)
  const taskStatusMetrics = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const total = scopeTasks.length;
    let myTasks = 0;
    let pending = 0;
    let completed = 0;
    let inProgress = 0;
    let overdue = 0;

    scopeTasks.forEach(t => {
      const assigneeStr = (t.assignee || t.assigned_to || '').toLowerCase().trim();
      const cleanEmail = (currentUserEmail || '').toLowerCase().trim();
      const cleanName = (currentUserName || '').toLowerCase().trim();

      const isMyTask = (
        (cleanEmail && (assigneeStr === cleanEmail || assigneeStr.includes(cleanEmail))) ||
        (cleanName && cleanName !== 'administrator' && cleanName !== 'my workspace' && (assigneeStr === cleanName || assigneeStr.includes(cleanName) || cleanName.includes(assigneeStr))) ||
        assigneeStr === 'me'
      );
      if (isMyTask) {
        myTasks++;
      }

      const st = (t.status || 'Pending').toLowerCase();
      if (st === 'completed') {
        completed++;
      } else if (st === 'in progress' || st === 'working' || st === 'under review') {
        inProgress++;
      } else {
        pending++;
      }

      // Overdue check (only for non-completed tasks)
      if (st !== 'completed' && t.dueDate) {
        const dDate = new Date(t.dueDate);
        if (!isNaN(dDate.getTime())) {
          const targetDate = new Date(dDate.getFullYear(), dDate.getMonth(), dDate.getDate());
          if (targetDate.getTime() < today.getTime()) {
            overdue++;
          }
        }
      }
    });

    const pendingPercent = total > 0 ? Math.round((pending / total) * 100) : 0;
    const completedPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const inProgressPercent = total > 0 ? Math.round((inProgress / total) * 100) : 0;
    const overduePercent = total > 0 ? Math.round((overdue / total) * 100) : 0;

    return {
      myTasks,
      total,
      pending,
      completed,
      inProgress,
      overdue,
      pendingPercent,
      completedPercent,
      inProgressPercent,
      overduePercent
    };
  }, [scopeTasks, currentUserEmail, currentUserName]);

  const taskDashboardCards = [
    {
      key: 'myTasks',
      title: 'My Tasks',
      count: taskStatusMetrics.myTasks,
      subtitle: 'Assigned to me',
      borderColor: 'border-indigo-200',
      bgColor: 'bg-indigo-50/50',
      textColor: 'text-indigo-600',
      subTextColor: 'text-indigo-500'
    },
    {
      key: 'totalTasks',
      title: 'Total Tasks',
      count: taskStatusMetrics.total,
      subtitle: 'All assigned tasks',
      borderColor: 'border-blue-200',
      bgColor: 'bg-blue-50/50',
      textColor: 'text-blue-600',
      subTextColor: 'text-blue-500'
    },
    {
      key: 'pending',
      title: 'Pending',
      count: taskStatusMetrics.pending,
      subtitle: `${taskStatusMetrics.pendingPercent}% of total`,
      borderColor: 'border-amber-200',
      bgColor: 'bg-amber-50/50',
      textColor: 'text-amber-600',
      subTextColor: 'text-amber-700'
    },
    {
      key: 'completed',
      title: 'Completed',
      count: taskStatusMetrics.completed,
      subtitle: `${taskStatusMetrics.completedPercent}% of total`,
      borderColor: 'border-emerald-200',
      bgColor: 'bg-emerald-50/50',
      textColor: 'text-emerald-600',
      subTextColor: 'text-emerald-700'
    },
    {
      key: 'inProgress',
      title: 'In Progress',
      count: taskStatusMetrics.inProgress,
      subtitle: `${taskStatusMetrics.inProgressPercent}% of total`,
      borderColor: 'border-purple-200',
      bgColor: 'bg-purple-50/50',
      textColor: 'text-purple-600',
      subTextColor: 'text-purple-700'
    },
    {
      key: 'overdue',
      title: 'Overdue',
      count: taskStatusMetrics.overdue,
      subtitle: `${taskStatusMetrics.overduePercent}% of total`,
      borderColor: 'border-rose-200',
      bgColor: 'bg-rose-50/50',
      textColor: 'text-rose-600',
      subTextColor: 'text-rose-700'
    }
  ];

  const handleCardClick = (cardKey) => {
    if (cardKey === 'myTasks') {
      if (onNavigateItem) {
        onNavigateItem('My Work');
      } else {
        window.dispatchEvent(new CustomEvent('taxpro_navigate_tab', { detail: { tab: 'My Work' } }));
      }
    } else if (cardKey === 'totalTasks') {
      if (onNavigateItem) {
        onNavigateItem('Tasks');
      } else {
        window.dispatchEvent(new CustomEvent('taxpro_navigate_tab', { detail: { tab: 'Tasks', filter: 'All' } }));
      }
      window.dispatchEvent(new CustomEvent('taxpro_task_filter_changed', { detail: { filter: 'All' } }));
    } else if (cardKey === 'pending') {
      if (onNavigateItem) {
        onNavigateItem('Tasks');
      } else {
        window.dispatchEvent(new CustomEvent('taxpro_navigate_tab', { detail: { tab: 'Tasks', filter: 'Pending' } }));
      }
      window.dispatchEvent(new CustomEvent('taxpro_task_filter_changed', { detail: { filter: 'Pending' } }));
    } else if (cardKey === 'completed') {
      if (onNavigateItem) {
        onNavigateItem('Tasks');
      } else {
        window.dispatchEvent(new CustomEvent('taxpro_navigate_tab', { detail: { tab: 'Tasks', filter: 'Completed' } }));
      }
      window.dispatchEvent(new CustomEvent('taxpro_task_filter_changed', { detail: { filter: 'Completed' } }));
    } else if (cardKey === 'inProgress') {
      if (onNavigateItem) {
        onNavigateItem('Tasks');
      } else {
        window.dispatchEvent(new CustomEvent('taxpro_navigate_tab', { detail: { tab: 'Tasks', filter: 'In Progress' } }));
      }
      window.dispatchEvent(new CustomEvent('taxpro_task_filter_changed', { detail: { filter: 'In Progress' } }));
    } else if (cardKey === 'overdue') {
      if (onNavigateItem) {
        onNavigateItem('Tasks');
      } else {
        window.dispatchEvent(new CustomEvent('taxpro_navigate_tab', { detail: { tab: 'Tasks', filter: 'Overdue' } }));
      }
      window.dispatchEvent(new CustomEvent('taxpro_task_filter_changed', { detail: { filter: 'Overdue' } }));
    }
  };

  const openFilterDrawer = () => {
    setTempDateRange(dateRangeFilter);
    setTempCustomStartDate(customStartDate);
    setTempCustomEndDate(customEndDate);
    setTempSelectedDepts([...selectedDepts]);
    setTempSelectedAssignee(selectedAssignee);
    setTempSelectedStatus(selectedStatus);
    setTempSelectedPriority(selectedPriority);
    setIsFilterOpen(true);
  };

  const applyFilters = () => {
    setDateRangeFilter(tempDateRange);
    setCustomStartDate(tempCustomStartDate);
    setCustomEndDate(tempCustomEndDate);
    setSelectedDepts(tempSelectedDepts);
    setSelectedAssignee(tempSelectedAssignee);
    setSelectedStatus(tempSelectedStatus);
    setSelectedPriority(tempSelectedPriority);
    setIsFilterOpen(false);
  };

  const resetFilters = () => {
    setTempDateRange('All Time');
    setTempCustomStartDate('');
    setTempCustomEndDate('');
    setTempSelectedDepts([]);
    setTempSelectedAssignee('All');
    setTempSelectedStatus('All');
    setTempSelectedPriority('All');
    
    setDateRangeFilter('All Time');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedDepts([]);
    setSelectedAssignee('All');
    setSelectedStatus('All');
    setSelectedPriority('All');
    setIsFilterOpen(false);
  };

  const activeFilterCount = (
    (dateRangeFilter !== 'All Time' ? 1 : 0) +
    (selectedDepts.length > 0 ? 1 : 0) +
    (selectedAssignee !== 'All' ? 1 : 0) +
    (selectedStatus !== 'All' ? 1 : 0) +
    (selectedPriority !== 'All' ? 1 : 0)
  );
  const unassignedTasks = useMemo(() => {
    return activeFilteredTasks.filter(t => !t.assignee || t.assignee === 'None' || t.assignee === 'Unassigned').length;
  }, [activeFilteredTasks]);

  const totalTasks = activeFilteredTasks.length;
  const assignedTasks = totalTasks - unassignedTasks;
  
  const userWiseSummary = useMemo(() => {
    const summary = {};
    activeFilteredTasks.forEach(t => {
       const assignee = t.assignee || 'Unassigned';
       if (!summary[assignee]) summary[assignee] = 0;
       summary[assignee]++;
    });
    return summary;
  }, [activeFilteredTasks]);

  // Direct Interactive Dashboard Task Stream
  const displayedStreamTasks = useMemo(() => {
    const cleanEmail = (currentUserEmail || '').toLowerCase().trim();
    const cleanName = (currentUserName || '').toLowerCase().trim();

    return tasks.filter(t => {
      if (tasksFilterTab === 'My') {
        const a = (t.assignee || '').toLowerCase().trim();
        return (
          (cleanEmail && (a === cleanEmail || a.includes(cleanEmail))) ||
          (cleanName && cleanName !== 'administrator' && cleanName !== 'my workspace' && (a === cleanName || a.includes(cleanName) || cleanName.includes(a))) ||
          a === 'me'
        );
      }
      if (tasksFilterTab === 'Pending') return t.status !== 'Completed';
      if (tasksFilterTab === 'Completed') return t.status === 'Completed';
      return true;
    });
  }, [tasks, tasksFilterTab, currentUserEmail, currentUserName]);

  const recentProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
       const da = new Date(a.createdAt || a.dueDate || 0);
       const db = new Date(b.createdAt || b.dueDate || 0);
       return db - da;
    }).slice(0, 5);
  }, [projects]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      soundFX?.playPop?.();
    } catch(e) {}
    await loadData();
    setCurrentTime(new Date().toLocaleString());
    setTimeout(() => {
      setIsRefreshing(false);
      if (onShowToast) onShowToast('✓ Dashboard synchronized with PostgreSQL live database!', 'success');
    }, 400);
  };

  return (
    <div className="flex-1 bg-[#f3f4f6] text-gray-800 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      <div className="flex flex-1 relative">

        {/* MAIN DASHBOARD CONTENT VIEW */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#f3f4f6]">
          
          {/* PURPLE DASHBOARD HEADER BANNER */}
          <div className="w-full rounded-2xl bg-gradient-to-r from-[#5b52e0] via-[#7c3aed] to-[#9333ea] p-6 shadow-md text-white mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full bg-white/20 text-white font-mono border border-white/30 flex items-center gap-1 shadow-2xs">
                  🏢 {localStorage.getItem('taxpro_firm_tag') || 'TaxPro'}
                </span>
                <span className="text-xs text-indigo-100 font-bold truncate max-w-xs">
                  {localStorage.getItem('taxpro_firm_name') || 'TaxPro Advisory & Tax Associates'}
                </span>
              </div>
              <h1 className="text-3xl font-extrabold font-outfit tracking-tight">Practice Dashboard</h1>
              <p className="text-xs text-indigo-100 mt-1">TaxPro PMS Real-Time Tax & Compliance Overview</p>
            </div>

            {/* Actions: Firm Profile & Last Refreshed */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('taxpro_open_firm_modal', { detail: { isDirectSetup: false } }));
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-xs font-bold text-white transition-all cursor-pointer shadow-xs active:scale-95"
                title="Manage Firm Identity & Member Badges via OTP"
              >
                <span>🏢 Firm Profile</span>
              </button>

              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/20 border border-white/20 backdrop-blur-md text-xs font-medium">
                <span>Last Refreshed: {currentTime}</span>
                <button 
                  onClick={handleManualRefresh}
                  className={`hover:rotate-180 transition-transform duration-500 cursor-pointer ${isRefreshing ? 'animate-spin' : ''}`}
                  title="Refresh Metrics"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* METRICS ROW WITH FILTER BUTTON */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 shadow-xs flex flex-wrap items-center gap-4 sm:gap-6">
            
            {/* Metric 1: Workspaces */}
            <div 
              onClick={() => {
                if (onNavigateItem) onNavigateItem('Settings');
                else window.dispatchEvent(new CustomEvent('taxpro_navigate_tab', { detail: { tab: 'Settings' } }));
              }}
              className="flex items-center gap-3.5 px-3 py-2 rounded-xl hover:bg-teal-50/50 hover:border-teal-200 border border-transparent transition-all cursor-pointer group active:scale-95"
              title="Click to open Workspace & Firm Settings"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 group-hover:bg-teal-100 flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black text-teal-600 leading-none group-hover:scale-105 transition-transform font-outfit">1</span>
                <span className="text-xs font-bold text-gray-700 group-hover:text-teal-700 mt-1 uppercase tracking-wide flex items-center gap-1">
                  Workspaces <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-teal-600" />
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[120px]">
                  1 Admin {userDepartment ? `• ${userDepartment}` : ''}
                </span>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="h-10 w-px bg-gray-100 hidden sm:block"></div>

            {/* Metric 2: Departments */}
            <div 
              onClick={() => {
                if (onNavigateItem) onNavigateItem('Departments');
                else window.dispatchEvent(new CustomEvent('taxpro_navigate_tab', { detail: { tab: 'Departments' } }));
              }}
              className="flex items-center gap-3.5 px-3 py-2 rounded-xl hover:bg-sky-50/60 hover:border-sky-200 border border-transparent transition-all cursor-pointer group active:scale-95"
              title="Click to open Departments Management"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-50 group-hover:bg-sky-100 flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black text-sky-500 leading-none group-hover:scale-105 transition-transform font-outfit">{departmentsList.length || 5}</span>
                <span className="text-xs font-bold text-gray-700 group-hover:text-sky-600 mt-1 uppercase tracking-wide flex items-center gap-1">
                  Departments <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-sky-500" />
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5">Click to view all</span>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="h-10 w-px bg-gray-100 hidden sm:block"></div>

            {/* Metric 3: Members */}
            <div 
              onClick={() => {
                if (onNavigateItem) onNavigateItem('Team Members');
                else window.dispatchEvent(new CustomEvent('taxpro_navigate_tab', { detail: { tab: 'Team Members' } }));
              }}
              className="flex items-center gap-3.5 px-3 py-2 rounded-xl hover:bg-emerald-50/60 hover:border-emerald-200 border border-transparent transition-all cursor-pointer group active:scale-95"
              title="Click to open Team Members & Staff Directory"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black text-emerald-500 leading-none group-hover:scale-105 transition-transform font-outfit">{teamMembers.length}</span>
                <span className="text-xs font-bold text-gray-700 group-hover:text-emerald-600 mt-1 uppercase tracking-wide flex items-center gap-1">
                  Members <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500" />
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5">Click to manage staff</span>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="h-10 w-px bg-gray-100 hidden sm:block"></div>

            {/* Metric 4: Managers */}
            <div 
              onClick={() => {
                if (onNavigateItem) onNavigateItem('Team Members', 'Managers');
                else window.dispatchEvent(new CustomEvent('taxpro_navigate_tab', { detail: { tab: 'Team Members', sub: 'Managers' } }));
              }}
              className="flex items-center gap-3.5 px-3 py-2 rounded-xl hover:bg-amber-50/60 hover:border-amber-200 border border-transparent transition-all cursor-pointer group active:scale-95"
              title="Click to view Practice Managers in Team Directory"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black text-amber-500 leading-none group-hover:scale-105 transition-transform font-outfit">
                  {teamMembers.filter(m => m.role === 'Manager' || m.role === 'Administrator' || m.role?.toLowerCase().includes('manager')).length}
                </span>
                <span className="text-xs font-bold text-gray-700 group-hover:text-amber-600 mt-1 uppercase tracking-wide flex items-center gap-1">
                  Managers <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-amber-500" />
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5">Click to view managers</span>
              </div>
            </div>
            
            {/* Filter Toggle Button */}
            <div className="flex-1 flex justify-end relative">
               <button 
                 onClick={openFilterDrawer}
                 className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-xs font-bold border cursor-pointer ${
                   activeFilterCount > 0 
                     ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-300' 
                     : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'
                 }`}
               >
                 <Filter className="w-4 h-4" /> 
                 <span>Filter Options</span>
                 {activeFilterCount > 0 && (
                   <span className="bg-white text-indigo-700 px-1.5 py-0.5 rounded-full text-[10px] font-black">
                     {activeFilterCount}
                   </span>
                 )}
               </button>
            </div>

          </div>

          {/* ACTIVE FILTER CHIPS ROW */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-6 p-3 bg-indigo-50/60 border border-indigo-200 rounded-2xl animate-fade-in text-xs font-medium">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5 mr-1">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Active Filters:
              </span>

              {dateRangeFilter !== 'All Time' && (
                <span className="bg-white border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs font-bold">
                  <span>Date: {dateRangeFilter === 'Custom Range' ? `${customStartDate || 'Start'} to ${customEndDate || 'End'}` : dateRangeFilter}</span>
                  <button 
                    onClick={() => { setDateRangeFilter('All Time'); setCustomStartDate(''); setCustomEndDate(''); }}
                    className="hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}

              {selectedDepts.length > 0 && (
                <span className="bg-white border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs font-bold">
                  <span>Depts: {selectedDepts.join(', ')}</span>
                  <button 
                    onClick={() => setSelectedDepts([])}
                    className="hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}

              {selectedAssignee !== 'All' && (
                <span className="bg-white border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs font-bold">
                  <span>Assignee: {selectedAssignee}</span>
                  <button 
                    onClick={() => setSelectedAssignee('All')}
                    className="hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}

              {selectedStatus !== 'All' && (
                <span className="bg-white border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs font-bold">
                  <span>Status: {selectedStatus}</span>
                  <button 
                    onClick={() => setSelectedStatus('All')}
                    className="hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}

              {selectedPriority !== 'All' && (
                <span className="bg-white border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs font-bold">
                  <span>Priority: {selectedPriority}</span>
                  <button 
                    onClick={() => setSelectedPriority('All')}
                    className="hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}

              <button 
                onClick={resetFilters}
                className="ml-auto text-xs font-bold text-red-600 hover:text-red-700 underline underline-offset-2 cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Clear All Filters
              </button>
            </div>
          )}

          {/* SLIDE-IN FILTER DRAWER */}
          {isFilterOpen && (
            <>
              <div 
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity" 
                onClick={() => setIsFilterOpen(false)}
              ></div>
              
              <div className="fixed top-0 right-0 h-full w-full max-w-sm sm:max-w-md bg-white shadow-2xl z-50 flex flex-col transform transition-transform animate-slide-in-right overflow-y-auto border-l border-gray-200">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center shadow-xs">
                      <Filter className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-gray-900 font-outfit leading-tight">Dashboard Filters</h3>
                      <p className="text-[11px] text-gray-400 font-semibold">Customize data scope & metrics</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsFilterOpen(false)} 
                    className="p-2 text-gray-400 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Drawer Body */}
                <div className="p-6 flex-1 space-y-6">
                  
                  {/* 1. Date Range Filter */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-widest flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Date Range
                    </label>
                    <select 
                      value={tempDateRange}
                      onChange={(e) => setTempDateRange(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    >
                      <option value="All Time">All Time</option>
                      <option value="Today">Today</option>
                      <option value="This Week">This Week</option>
                      <option value="This Month">This Month</option>
                      <option value="This Quarter">This Quarter</option>
                      <option value="Last Quarter">Last Quarter</option>
                      <option value="Year to Date">Year to Date</option>
                      <option value="Custom Range">Custom Date Range</option>
                    </select>

                    {tempDateRange === 'Custom Range' && (
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100">
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 block mb-1">From Date</label>
                          <input 
                            type="date"
                            value={tempCustomStartDate}
                            onChange={(e) => setTempCustomStartDate(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 text-xs font-mono font-semibold text-gray-800 outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 block mb-1">To Date</label>
                          <input 
                            type="date"
                            value={tempCustomEndDate}
                            onChange={(e) => setTempCustomEndDate(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 text-xs font-mono font-semibold text-gray-800 outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Department Scope */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-500" /> Department Scope
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setTempSelectedDepts([...availableDepartments])}
                          className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-gray-300">•</span>
                        <button
                          type="button"
                          onClick={() => setTempSelectedDepts([])}
                          className="text-[10px] font-bold text-gray-500 hover:text-red-600 cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 border border-gray-100 rounded-xl p-2 bg-gray-50/50 scrollbar-thin">
                      {availableDepartments.map((dept) => (
                        <label 
                          key={dept}
                          className="flex items-center gap-2.5 text-xs font-semibold text-gray-700 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200"
                        >
                          <input 
                            type="checkbox"
                            checked={tempSelectedDepts.includes(dept)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTempSelectedDepts([...tempSelectedDepts, dept]);
                              } else {
                                setTempSelectedDepts(tempSelectedDepts.filter(d => d !== dept));
                              }
                            }}
                            className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500"
                          />
                          <span className="truncate">{dept}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 3. Assignee Filter */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-widest flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-500" /> Assignee / Member
                    </label>
                    <select 
                      value={tempSelectedAssignee}
                      onChange={(e) => setTempSelectedAssignee(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="All">All Team Members</option>
                      <option value="Unassigned">Unassigned Tasks Only</option>
                      {teamMembers.map((m) => (
                        <option key={m.id || m.name} value={m.name}>{m.name} ({m.department || 'General'})</option>
                      ))}
                    </select>
                  </div>

                  {/* 4. Task Status Filter */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-widest flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> Task Status
                    </label>
                    <select 
                      value={tempSelectedStatus}
                      onChange={(e) => setTempSelectedStatus(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Pending">Pending / In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Overdue">Overdue Tasks</option>
                    </select>
                  </div>

                  {/* 5. Priority Filter */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-widest flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-indigo-500" /> Priority Level
                    </label>
                    <select 
                      value={tempSelectedPriority}
                      onChange={(e) => setTempSelectedPriority(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="All">All Priorities</option>
                      <option value="High">High Priority</option>
                      <option value="Medium">Medium Priority</option>
                      <option value="Low">Low Priority</option>
                    </select>
                  </div>

                </div>
                
                {/* Drawer Footer Actions */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 sticky bottom-0 flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={resetFilters}
                    className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset All
                  </button>
                  <button 
                    type="button"
                    onClick={applyFilters}
                    className="flex-1 py-3 bg-[#5b52e0] hover:bg-[#4c44cf] text-white rounded-xl text-xs font-extrabold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Apply Filters
                  </button>
                </div>

              </div>
            </>
          )}

          {/* 6 MODERN METRIC CARDS (My Tasks, Total Tasks, Pending, Completed, In Progress, Overdue) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 mb-6">
            {taskDashboardCards.map((card) => (
              <div 
                key={card.key}
                onClick={() => handleCardClick(card.key)}
                className={`bg-white p-4 sm:p-5 rounded-2xl border-2 ${card.borderColor} ${card.bgColor} flex flex-col justify-between text-center shadow-xs hover:shadow-lg hover:-translate-y-1 active:scale-95 transition-all duration-200 cursor-pointer group`}
                title={`Click to filter or open ${card.title}`}
              >
                <span className="text-xs font-bold text-gray-700 leading-tight uppercase tracking-wider group-hover:text-indigo-600 transition-colors">
                  {card.title}
                </span>
                <div className={`text-3xl font-black font-outfit my-2 ${card.textColor} group-hover:scale-110 transition-transform`}>
                  {card.count}
                </div>
                <span className={`text-[11px] font-bold ${card.subTextColor}`}>
                  {card.subtitle}
                </span>
              </div>
            ))}
          </div>

          {/* REAL-TIME INTERACTIVE COMPLIANCE TASKS STREAM (1-CLICK DIRECT COMPLETION ON DASHBOARD) */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-8 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-gray-900 font-outfit">Live Compliance & Practice Tasks</h2>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ⚡ Instant Auto-Sync
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Click any checkbox to toggle completion and watch live counters update</p>
                </div>
              </div>

              {/* Quick Tab Filters */}
              <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl">
                {[
                  { id: 'All', label: 'All Tasks', count: tasks.length },
                  { id: 'My', label: 'Assigned to Me', count: taskStatusMetrics.myTasks },
                  { id: 'Pending', label: 'Pending', count: taskStatusMetrics.pending + taskStatusMetrics.inProgress },
                  { id: 'Completed', label: 'Completed', count: taskStatusMetrics.completed }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTasksFilterTab(t.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      tasksFilterTab === t.id
                        ? 'bg-white text-indigo-900 shadow-xs font-black'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    <span>{t.label}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-200/70 text-gray-700 font-mono font-bold">{t.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Overall Completion Progress Bar */}
            <div className="my-4 p-3.5 bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-emerald-50/60 rounded-xl border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-xs font-bold text-gray-800">Practice Completion Rate:</span>
                <span className="text-sm font-black text-indigo-600 font-outfit">{taskStatusMetrics.completedPercent}%</span>
                <span className="text-xs text-gray-500 font-medium">({taskStatusMetrics.completed} of {taskStatusMetrics.total} tasks completed)</span>
              </div>
              <div className="w-full sm:w-64 h-2.5 bg-gray-200 rounded-full overflow-hidden shrink-0">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500 rounded-full"
                  style={{ width: `${taskStatusMetrics.completedPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Task Item Rows */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {displayedStreamTasks.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-100">
                  <CheckCircle2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-500">No compliance tasks found in this view tab.</p>
                </div>
              ) : (
                displayedStreamTasks.slice(0, 8).map((t) => {
                  const isDone = t.status === 'Completed';
                  return (
                    <div 
                      key={t.id}
                      onClick={(e) => handleToggleTaskStatus(t, e)}
                      className={`group p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer select-none ${
                        isDone 
                          ? 'bg-emerald-50/30 border-emerald-200/70 hover:bg-emerald-50/60' 
                          : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Checkbox */}
                        <div 
                          className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all shrink-0 border ${
                            isDone 
                              ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs scale-105' 
                              : 'border-gray-300 group-hover:border-indigo-500 bg-white'
                          }`}
                        >
                          {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        <div className="min-w-0">
                          <div className={`text-xs font-bold truncate transition-all ${
                            isDone ? 'line-through text-gray-400' : 'text-gray-800 group-hover:text-indigo-600'
                          }`}>
                            {t.title}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 flex-wrap">
                            <span className="font-semibold text-gray-600">{t.client || 'General Client'}</span>
                            <span>•</span>
                            <span className="px-1.5 py-0.2 rounded bg-gray-100 font-medium text-gray-600">{t.category || 'Compliance'}</span>
                            <span>•</span>
                            <span>Assignee: <b className="text-gray-700">{t.assignee || 'Unassigned'}</b></span>
                            {t.dueDate && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-gray-500">Due: {t.dueDate}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isDone 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : t.status === 'In Progress' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isDone ? '✓ Completed' : t.status || 'Pending'}
                        </span>
                        
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          t.priority === 'High' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {t.priority || 'Medium'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Actions */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="text-gray-400 text-[11px] font-semibold">
                Showing top tasks • Click anywhere on a row or checkbox to toggle status
              </span>
              <button
                type="button"
                onClick={() => {
                  if (onNavigateItem) onNavigateItem('Tasks');
                  else window.dispatchEvent(new CustomEvent('taxpro_navigate_tab', { detail: { tab: 'Tasks' } }));
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Open Full Tasks Manager</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ALL TASK SUMMARY ROW (Based on the attached image) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            
            {/* Left Box */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-gray-900">All Task Summary - Userwise</h3>
                <span className="text-[11px] font-bold text-gray-400">Live Team Workload</span>
              </div>
              <div className="border border-gray-100 rounded-xl overflow-hidden flex-1 flex flex-col">
                <div className="grid grid-cols-2 bg-gray-50/50 p-3 text-[10px] font-extrabold text-gray-500 border-b border-gray-100 uppercase tracking-widest">
                  <span>USER / SPECIALIST</span>
                  <span className="text-right">TOTAL TASKS</span>
                </div>
                <div className="overflow-y-auto flex-1">
                  {Object.entries(userWiseSummary).length === 0 ? (
                    <div className="p-4 text-xs font-bold text-gray-500 text-center">No tasks assigned yet.</div>
                  ) : (
                    Object.entries(userWiseSummary).map(([user, count]) => (
                      <div key={user} className="grid grid-cols-2 p-3 text-xs font-bold text-gray-800 border-b border-gray-100 bg-white items-center">
                        <span className="truncate">{user}</span>
                        <span className="text-right text-[#5b52e0] font-black">{count}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="grid grid-cols-2 p-3 text-xs font-bold text-gray-800 bg-gray-50 items-center border-t border-gray-100 mt-auto">
                  <span>Total Active Tasks</span>
                  <span className="text-right text-[#5b52e0] font-black tracking-wide">{totalTasks}</span>
                </div>
              </div>
            </div>

            {/* Right stacked boxes */}
            <div className="flex flex-col gap-4">
              {/* Unassigned Tasks */}
              <button 
                onClick={() => setTaskDetailType('Unassigned')}
                className="bg-red-50/60 hover:bg-red-100/80 border border-red-200 transition-all rounded-xl py-5 px-6 flex flex-col items-center justify-center shadow-sm hover:shadow-md active:scale-[0.98] cursor-pointer"
              >
                <span className="text-4xl font-black text-red-600 mb-1 font-outfit">{unassignedTasks}</span>
                <span className="text-xs font-bold text-gray-600">Unassigned Tasks (Click to view)</span>
              </button>
              
              {/* Assigned Tasks */}
              <button 
                onClick={() => setTaskDetailType('Assigned')}
                className="bg-green-50/60 hover:bg-green-100/80 border border-green-200 transition-all rounded-xl py-5 px-6 flex flex-col items-center justify-center shadow-sm hover:shadow-md active:scale-[0.98] cursor-pointer"
              >
                <span className="text-4xl font-black text-green-600 mb-1 font-outfit">{assignedTasks}</span>
                <span className="text-xs font-bold text-gray-600">Assigned Tasks (Click to view)</span>
              </button>

              {/* Total Tasks */}
              <button 
                onClick={() => setTaskDetailType('Total')}
                className="bg-indigo-50/60 hover:bg-indigo-100/80 border border-indigo-200 transition-all rounded-xl py-5 px-6 flex flex-col items-center justify-center shadow-sm hover:shadow-md active:scale-[0.98] cursor-pointer"
              >
                <span className="text-4xl font-black text-indigo-600 mb-1 font-outfit">{totalTasks}</span>
                <span className="text-xs font-bold text-gray-600">Total Practice Tasks (Click to view)</span>
              </button>
            </div>
          </div>

          {/* LOWER DASHBOARD: RECENT PROJECTS FULL WIDTH */}
          <div className="w-full">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FolderKanban className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-extrabold text-[#1e1e2d] font-outfit">Recent Projects</h3>
                </div>
                {onNavigateItem && (
                  <button
                    onClick={() => onNavigateItem('Projects')}
                    className="text-xs font-bold text-[#5b52e0] hover:underline cursor-pointer"
                  >
                    View All Projects &rarr;
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="w-full border border-gray-200 rounded-xl overflow-hidden mt-2 flex flex-col">
                <div className="grid grid-cols-[1fr,auto] bg-gray-50 p-3 text-xs font-extrabold text-gray-500 border-b border-gray-200 uppercase">
                  <span>PROJECT & CLIENT</span>
                  <span className="text-right">DUE DATE / STATUS</span>
                </div>
                {recentProjects.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500 font-bold bg-white">
                    No Recent Projects
                  </div>
                ) : (
                  <div className="flex flex-col bg-white">
                    {recentProjects.map((p, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr,auto] p-3 border-b last:border-b-0 border-gray-100 hover:bg-gray-50 transition-colors items-center">
                        <div className="flex flex-col min-w-0 pr-4">
                          <span className="text-xs font-bold text-gray-900 truncate">{p.name}</span>
                          <span className="text-[10px] font-semibold text-gray-500 truncate">
                            {p.clientName || 'General Client'} • {p.category || 'Practice'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                            p.status === 'In Progress' ? 'bg-purple-50 text-purple-700' :
                            'bg-indigo-50 text-indigo-700'
                          }`}>
                            {p.status || 'Active'}
                          </span>
                          <span className="text-xs font-bold text-gray-600 hidden sm:inline">
                            {p.dueDate || 'No Due Date'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* INTERACTIVE TASK DETAILS MODAL OPENS ON BOX CLICK */}
      {taskDetailType && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setTaskDetailType(null)}>
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  taskDetailType === 'Unassigned' ? 'bg-red-100 text-red-600' :
                  taskDetailType === 'Assigned' ? 'bg-green-100 text-green-600' :
                  'bg-indigo-100 text-indigo-600'
                }`}>
                  <ListTodo className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900 font-outfit">{taskDetailType} Tasks Overview</h3>
                  <p className="text-[11px] text-gray-400 font-semibold">Click the check box to toggle status in real time</p>
                </div>
              </div>
              <button onClick={() => setTaskDetailType(null)} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col items-center justify-center min-h-[250px] text-center max-h-[60vh] overflow-y-auto">
              {activeFilteredTasks.filter(t => {
                if (taskDetailType === 'Unassigned') return !t.assignee || t.assignee === 'None' || t.assignee === 'Unassigned';
                if (taskDetailType === 'Assigned') return t.assignee && t.assignee !== 'None' && t.assignee !== 'Unassigned';
                return true; 
              }).length === 0 ? (
                <>
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-6 h-6 text-gray-300" />
                  </div>
                  <h4 className="text-base font-bold text-gray-700 mb-1">No {taskDetailType} Tasks Found</h4>
                  <p className="text-sm text-gray-400 font-semibold max-w-xs mx-auto">
                    No tasks match this category and your currently active dashboard filters.
                  </p>
                </>
              ) : (
                <div className="w-full flex flex-col gap-2.5">
                  {activeFilteredTasks.filter(t => {
                    if (taskDetailType === 'Unassigned') return !t.assignee || t.assignee === 'None' || t.assignee === 'Unassigned';
                    if (taskDetailType === 'Assigned') return t.assignee && t.assignee !== 'None' && t.assignee !== 'Unassigned';
                    return true;
                  }).map((t, idx) => {
                    const isDone = t.status === 'Completed';
                    return (
                      <div 
                        key={idx} 
                        onClick={(e) => handleToggleTaskStatus(t, e)}
                        className={`w-full text-left p-3.5 border rounded-xl flex justify-between items-center transition-all cursor-pointer shadow-2xs ${
                          isDone 
                            ? 'bg-emerald-50/40 border-emerald-200' 
                            : 'bg-white border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-3">
                          <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                            isDone ? 'bg-emerald-500 border-emerald-600 text-white' : 'border-gray-300 bg-white'
                          }`}>
                            {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>

                          <div className="min-w-0">
                            <div className={`text-xs font-bold truncate ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                              {t.title}
                            </div>
                            <div className="text-[10px] text-gray-500 font-medium mt-0.5 truncate">
                              {t.client || 'General Client'} • {t.assignee || 'Unassigned'} • Due: {t.dueDate || 'No Due Date'}
                            </div>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${
                          isDone ? 'bg-emerald-100 text-emerald-700 font-black' : 'bg-indigo-50 text-indigo-600'
                        }`}>
                          {isDone ? '✓ Completed' : t.status || 'Pending'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setTaskDetailType(null)}
                className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
