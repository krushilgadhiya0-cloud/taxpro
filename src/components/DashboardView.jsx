import React, { useState, useEffect, useMemo } from 'react';
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
  Briefcase
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function DashboardView({ onOpenOTP, onTriggerAI }) {
  const [activeSidebarItem, setActiveSidebarItem] = useState('Dashboard');
  const [activeSubTab, setActiveSubTab] = useState('Tasks');
  const [activeCategory, setActiveCategory] = useState('All');

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

  const loadData = async () => {
    const dept = localStorage.getItem('taxpro_user_department');
    if (dept) setUserDepartment(dept);

    try {
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
  };

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

    const handleLocalSync = () => {
      loadData();
      setCurrentTime(new Date().toLocaleString());
    };
    window.addEventListener('taxpro_db_updated', handleLocalSync);

    const intervalId = window.setInterval(loadData, 30000);
    
    return () => {
      if (realtimeChannel && supabase && typeof supabase.removeChannel === 'function') {
        try {
          supabase.removeChannel(realtimeChannel);
        } catch(e) {}
      }
      window.removeEventListener('taxpro_db_updated', handleLocalSync);
      window.clearInterval(intervalId);
    };
  }, []);

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

  // Active Multi-Layer Filtered Tasks
  const activeFilteredTasks = useMemo(() => {
    return tasks.filter(t => {
      return (
        filterTaskByDate(t, dateRangeFilter, customStartDate, customEndDate) &&
        filterTaskByDept(t, selectedDepts) &&
        filterTaskByAssignee(t, selectedAssignee) &&
        filterTaskByStatus(t, selectedStatus) &&
        filterTaskByPriority(t, selectedPriority)
      );
    });
  }, [tasks, dateRangeFilter, customStartDate, customEndDate, selectedDepts, selectedAssignee, selectedStatus, selectedPriority, teamMembers]);

  const currentUserEmail = (localStorage.getItem('taxpro_user_email') || 'admin@taxpro.com').toLowerCase().trim();
  const currentUserName = localStorage.getItem('taxpro_user_name') || localStorage.getItem('taxpro_user_fullname') || 'Administrator';

  // Task Status & Workload Metrics
  const taskStatusMetrics = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const total = activeFilteredTasks.length;
    let myTasks = 0;
    let pending = 0;
    let completed = 0;
    let inProgress = 0;
    let overdue = 0;

    activeFilteredTasks.forEach(t => {
      const assigneeStr = (t.assignee || t.assigned_to || '').toLowerCase();
      if (
        assigneeStr.includes(currentUserEmail) ||
        assigneeStr.includes(currentUserName.toLowerCase()) ||
        (currentUserName && currentUserName !== 'Administrator' && assigneeStr.includes(currentUserName.toLowerCase().split(' ')[0]))
      ) {
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
  }, [activeFilteredTasks, currentUserEmail, currentUserName]);

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

  const recentProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
       const da = new Date(a.createdAt || a.dueDate || 0);
       const db = new Date(b.createdAt || b.dueDate || 0);
       return db - da;
    }).slice(0, 5);
  }, [projects]);

  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard, hasSub: false },
    { name: 'Tasks', icon: CheckSquare, hasSub: true },
    { name: 'Clients', icon: Users, hasSub: true },
    { name: 'Contact Person', icon: UserCheck, hasSub: true },
    { name: 'To Do', icon: ListTodo, hasSub: true },
    { name: 'Receipts & Payments', icon: Receipt, hasSub: true },
    { name: 'Register in out', icon: UserPlus, hasSub: true },
    { name: 'Bulk Messages', icon: MessageSquare, hasSub: true },
    { name: 'Attendance', icon: CalendarCheck, hasSub: true },
    { name: 'Time Tracking', icon: Timer, hasSub: true },
    { name: 'Settings', icon: Settings, hasSub: true },
    { name: 'Reports', icon: FileText, hasSub: true },
    { name: 'Fees Tracking', icon: DollarSign, hasSub: true },
  ];

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
                  onClick={() => {
                    loadData();
                    setCurrentTime(new Date().toLocaleString());
                  }}
                  className="hover:rotate-180 transition-transform duration-500 cursor-pointer"
                  title="Refresh Metrics"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* METRICS ROW WITH FILTER BUTTON */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 shadow-xs flex flex-wrap items-center gap-6">
            
            {/* Metric 1 */}
            <div className="flex items-center gap-4 min-w-[120px] px-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-teal-600 leading-none">1</span>
                <span className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wide">Workspaces</span>
                <span className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[120px]">
                  1 Admin {userDepartment ? `• ${userDepartment}` : ''}
                </span>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="h-10 w-px bg-gray-100 hidden sm:block"></div>

            {/* Metric 2 */}
            <div className="flex items-center gap-4 min-w-[120px] px-2">
              <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-sky-500 leading-none">{departmentsList.length || 5}</span>
                <span className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wide">Departments</span>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="h-10 w-px bg-gray-100 hidden sm:block"></div>

            {/* Metric 3 */}
            <div className="flex items-center gap-4 min-w-[120px] px-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-emerald-500 leading-none">{teamMembers.length}</span>
                <span className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wide">Members</span>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="h-10 w-px bg-gray-100 hidden sm:block"></div>

            {/* Metric 4 */}
            <div className="flex items-center gap-4 min-w-[120px] px-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-amber-500 leading-none">
                  {teamMembers.filter(m => m.role === 'Manager' || m.role === 'Administrator' || m.role?.toLowerCase().includes('manager')).length}
                </span>
                <span className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wide">Managers</span>
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

          {/* ACTIVE FILTER CHIPS ROW (Displays when any filter is active) */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 mb-8">
            {taskDashboardCards.map((card) => (
              <div 
                key={card.key}
                className={`bg-white p-4 sm:p-5 rounded-2xl border-2 ${card.borderColor} ${card.bgColor} flex flex-col justify-between text-center shadow-xs hover:shadow-md hover:scale-105 transition-all duration-200 cursor-default`}
              >
                <span className="text-xs font-bold text-gray-700 leading-tight uppercase tracking-wider">
                  {card.title}
                </span>
                <div className={`text-3xl font-black font-outfit my-2 ${card.textColor}`}>
                  {card.count}
                </div>
                <span className={`text-[11px] font-bold ${card.subTextColor}`}>
                  {card.subtitle}
                </span>
              </div>
            ))}
          </div>

          {/* ALL TASK SUMMARY ROW (Based on the attached image) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            
            {/* Left Box */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-gray-900">All Task Summary - Userwise</h3>
                <select className="border border-gray-200 rounded-lg text-xs font-semibold p-1.5 outline-none text-gray-700 bg-gray-50 focus:ring-2 focus:ring-indigo-500/20">
                  <option>Working</option>
                </select>
              </div>
              <div className="border border-gray-100 rounded-xl overflow-hidden flex-1 flex flex-col">
                <div className="grid grid-cols-2 bg-gray-50/50 p-3 text-[10px] font-extrabold text-gray-500 border-b border-gray-100 uppercase tracking-widest">
                  <span>USER</span>
                  <span className="text-right">TOTAL TASKS</span>
                </div>
                <div className="overflow-y-auto flex-1">
                  {Object.entries(userWiseSummary).length === 0 ? (
                    <div className="p-4 text-xs font-bold text-gray-500 text-center">No tasks assigned yet.</div>
                  ) : (
                    Object.entries(userWiseSummary).map(([user, count]) => (
                      <div key={user} className="grid grid-cols-2 p-3 text-xs font-bold text-gray-800 border-b border-gray-100 bg-white items-center">
                        <span>{user}</span>
                        <span className="text-right text-[#5b52e0] font-black">{count}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="grid grid-cols-2 p-3 text-xs font-bold text-gray-800 bg-gray-50 items-center border-t border-gray-100 mt-auto">
                  <span>Total</span>
                  <span className="text-right text-[#5b52e0] font-black tracking-wide">{totalTasks}</span>
                </div>
              </div>
            </div>

            {/* Right stacked boxes */}
            <div className="flex flex-col gap-4">
              {/* Unassigned Tasks */}
              <button 
                onClick={() => setTaskDetailType('Unassigned')}
                className="bg-red-50/60 hover:bg-red-100/80 border border-red-200 transition-all rounded-xl py-5 px-6 flex flex-col items-center justify-center shadow-sm hover:shadow-md active:scale-[0.98]"
              >
                <span className="text-4xl font-black text-red-600 mb-1 font-outfit">{unassignedTasks}</span>
                <span className="text-xs font-bold text-gray-600">Unassigned Tasks</span>
              </button>
              
              {/* Assigned Tasks */}
              <button 
                onClick={() => setTaskDetailType('Assigned')}
                className="bg-green-50/60 hover:bg-green-100/80 border border-green-200 transition-all rounded-xl py-5 px-6 flex flex-col items-center justify-center shadow-sm hover:shadow-md active:scale-[0.98]"
              >
                <span className="text-4xl font-black text-green-600 mb-1 font-outfit">{assignedTasks}</span>
                <span className="text-xs font-bold text-gray-600">Assigned Tasks</span>
              </button>

              {/* Total Tasks */}
              <button 
                onClick={() => setTaskDetailType('Total')}
                className="bg-indigo-50/60 hover:bg-indigo-100/80 border border-indigo-200 transition-all rounded-xl py-5 px-6 flex flex-col items-center justify-center shadow-sm hover:shadow-md active:scale-[0.98]"
              >
                <span className="text-4xl font-black text-indigo-600 mb-1 font-outfit">{totalTasks}</span>
                <span className="text-xs font-bold text-gray-600">Total Tasks</span>
              </button>
            </div>
          </div>

          {/* TWO COLUMN LOWER DASHBOARD SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Card: Recent Projects */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FolderKanban className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-extrabold text-[#1e1e2d] font-outfit">Recent Projects</h3>
                </div>
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

            {/* Right Card: Recent Activities */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-extrabold text-[#1e1e2d] font-outfit">
                  Recent Activities
                </h3>
              </div>

              {/* Table */}
              <div className="w-full border border-gray-200 rounded-xl overflow-hidden mt-2">
                <div className="grid grid-cols-2 bg-gray-50 p-3 text-xs font-extrabold text-gray-500 border-b border-gray-200">
                  <span>ACTIVITY</span>
                  <span className="text-right">DATE LOGGED</span>
                </div>
                <div className="p-8 text-center text-xs text-gray-700 font-bold bg-white">
                  No Recent Activities
                </div>
              </div>
            </div>

          </div>

        </main>
      </div>



      {/* TASK DETAILS MODAL OPENS ON BOX CLICK */}
      {taskDetailType && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setTaskDetailType(null)}>
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200" 
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
                <h3 className="text-lg font-extrabold text-gray-900 font-outfit">{taskDetailType} Tasks Overview</h3>
              </div>
              <button onClick={() => setTaskDetailType(null)} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
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
                <div className="w-full flex flex-col gap-2">
                  {activeFilteredTasks.filter(t => {
                    if (taskDetailType === 'Unassigned') return !t.assignee || t.assignee === 'None' || t.assignee === 'Unassigned';
                    if (taskDetailType === 'Assigned') return t.assignee && t.assignee !== 'None' && t.assignee !== 'Unassigned';
                    return true;
                  }).map((t, idx) => (
                    <div key={idx} className="w-full text-left p-3 border border-gray-100 rounded-xl flex justify-between items-center bg-white shadow-xs">
                      <div>
                        <div className="text-xs font-bold text-gray-800">{t.title}</div>
                        <div className="text-[10px] text-gray-500 font-medium">
                          {t.client || 'General Client'} • {t.assignee || 'Unassigned'} • Due: {t.dueDate || 'No Due Date'}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setTaskDetailType(null)}
                className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
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
