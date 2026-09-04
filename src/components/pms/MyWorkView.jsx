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
  Check,
  RotateCcw,
  Archive,
  History,
  Printer
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { invalidateQueryCache } from '../../lib/postgresClient';
import { logAuditActivity } from '../../lib/auditLogger';
import soundFX from '../../lib/audioFX';
import { formatDate } from '../../lib/dateUtils';
import { printHtml } from '../../lib/printHelper';
import TaskHistoryModal from './TaskHistoryModal';

export default function MyWorkView({ onShowToast, onNavigateToLeave }) {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter & Search states
  const [activeTab, setActiveTab] = useState('Active'); // 'Active' | 'InProgress' | 'Pending' | 'Urgent' | 'Overdue' | 'History' | 'All'
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | '7days' | '30days' | 'month' | 'archived' | 'specific_date' | 'specific_month'
  const [historyScope, setHistoryScope] = useState('auto'); // 'auto' | 'mine' | 'all'
  const [specificDate, setSpecificDate] = useState(''); // 'YYYY-MM-DD'
  const [specificMonth, setSpecificMonth] = useState('2026-08'); // 'YYYY-MM'
  const [selectedTaskForHistory, setSelectedTaskForHistory] = useState(null);
  const [isTaskHistoryModalOpen, setIsTaskHistoryModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Work Scope & Quick Add Task Modal
  const [workScope, setWorkScope] = useState('mine'); // 'mine' | 'all'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    client: '',
    category: 'GST Return Filing',
    due_date: new Date().toISOString().slice(0, 10),
    priority: 'High',
    status: 'In Progress',
    assignee: '',
    project: 'None',
    notes: ''
  });

  // Current logged in user details
  const currentUserName = localStorage.getItem('taxpro_user_name') || localStorage.getItem('taxpro_user_fullname') || 'Administrator';
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
        supabase.from('team_members').select('id, name, email, role, department, upi_id').order('name', { ascending: true }),
        supabase.from('projects').select('*').order('created_at', { ascending: false })
      ]);

      if (tasksRes.data) {
        setTasks(tasksRes.data.map(t => ({ ...t, dueDate: t.due_date })));
      }
      if (clientsRes.data) setClients(clientsRes.data);
      if (membersRes.data) {
        setTeamMembers(membersRes.data);
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

  // Helper to check if a task is assigned to current logged-in user
  const isAssignedToMe = (t) => {
    const cleanUser = (currentUserName || '').toLowerCase().trim();
    const cleanEmail = (currentUserEmail || '').toLowerCase().trim();
    const assignee = (t.assignee || '').toLowerCase().trim();
    if (!assignee) return false;
    return (
      assignee === cleanUser ||
      assignee === cleanEmail ||
      (cleanEmail && assignee.includes(cleanEmail)) ||
      (cleanUser && (assignee === cleanUser || assignee.includes(cleanUser) || cleanUser.includes(assignee))) ||
      assignee === 'me'
    );
  };

  const myTasks = useMemo(() => tasks.filter(isAssignedToMe), [tasks, currentUserName, currentUserEmail]);
  const allCompletedTasks = useMemo(() => tasks.filter(t => (t.status || '').toLowerCase() === 'completed'), [tasks]);
  const myCompletedTasks = useMemo(() => myTasks.filter(t => (t.status || '').toLowerCase() === 'completed'), [myTasks]);

  // If user explicitly chose 'mine' or 'all' for history, respect it.
  // In 'auto' mode: If personal completed deliverables exist, show them; otherwise automatically show all team history so the screen is never empty!
  const effectiveHistoryTasks = useMemo(() => {
    if (historyScope === 'mine') return myCompletedTasks;
    if (historyScope === 'all') return allCompletedTasks;
    return myCompletedTasks.length > 0 ? myCompletedTasks : allCompletedTasks;
  }, [historyScope, myCompletedTasks, allCompletedTasks]);

  // Scope tasks: either strictly mine or all team deliverables
  const scopedTasks = useMemo(() => {
    if (workScope === 'all') return tasks;
    return myTasks;
  }, [tasks, workScope, myTasks]);

  // Today string YYYY-MM-DD
  const todayStr = new Date().toISOString().slice(0, 10);

  // 1-Week Completion Rule: 7 days in milliseconds
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  // Helper to determine if a completed task was finished more than 1 week ago
  const isCompletedOlderThanOneWeek = (task) => {
    if ((task.status || '').toLowerCase() !== 'completed') return false;
    const compTime = task.completed_at 
      ? new Date(task.completed_at).getTime() 
      : (task.updated_at ? new Date(task.updated_at).getTime() : 0);
    if (!compTime || isNaN(compTime)) return false;
    return (Date.now() - compTime) > ONE_WEEK_MS;
  };

  // Filtered task list
  const filteredTasks = useMemo(() => {
    // 1. If viewing the 'History' tab:
    if (activeTab === 'History') {
      return effectiveHistoryTasks.filter(task => {
        // Date / period filter
        if (historyFilter === '7days') {
          const compTime = task.completed_at ? new Date(task.completed_at).getTime() : (task.updated_at ? new Date(task.updated_at).getTime() : 0);
          if (compTime && (Date.now() - compTime) > 7 * 24 * 60 * 60 * 1000) return false;
        } else if (historyFilter === '30days') {
          const compTime = task.completed_at ? new Date(task.completed_at).getTime() : (task.updated_at ? new Date(task.updated_at).getTime() : 0);
          if (compTime && (Date.now() - compTime) > 30 * 24 * 60 * 60 * 1000) return false;
        } else if (historyFilter === 'month') {
          const compStr = (task.completed_at || task.updated_at || '').slice(0, 7);
          const currentMonth = new Date().toISOString().slice(0, 7);
          if (compStr && compStr !== currentMonth) return false;
        } else if (historyFilter === 'specific_date') {
          const taskDate = (task.completed_at || task.updated_at || task.due_date || task.dueDate || '').slice(0, 10);
          if (specificDate && taskDate !== specificDate) return false;
        } else if (historyFilter === 'specific_month') {
          const taskMonth = (task.completed_at || task.updated_at || task.due_date || task.dueDate || '').slice(0, 7);
          if (specificMonth && taskMonth !== specificMonth) return false;
        } else if (historyFilter === 'archived') {
          if (!isCompletedOlderThanOneWeek(task)) return false;
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
          const assigneeMatch = (task.assignee || '').toLowerCase().includes(q);
          if (!titleMatch && !clientMatch && !projMatch && !catMatch && !assigneeMatch) return false;
        }

        return true;
      });
    }

    // 2. Active work tabs
    return scopedTasks.filter(task => {
      const isDone = (task.status || '').toLowerCase() === 'completed';
      const isArchived = isCompletedOlderThanOneWeek(task);
      if (isArchived) return false;

      // Tab filter
      if (activeTab === 'Active' && isDone) return false; // Removes completed from active tasks
      if (activeTab === 'InProgress' && task.status !== 'In Progress') return false;
      if (activeTab === 'Pending' && (isDone || task.status === 'In Progress')) return false;
      if (activeTab === 'Completed' && !isDone) return false;
      if (activeTab === 'Urgent' && (task.priority !== 'High' && task.priority !== 'Urgent')) return false;
      if (activeTab === 'Overdue') {
        const isPast = task.due_date && task.due_date < todayStr;
        if (!isPast || isDone) return false;
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
        const assigneeMatch = (task.assignee || '').toLowerCase().includes(q);
        if (!titleMatch && !clientMatch && !projMatch && !catMatch && !assigneeMatch) return false;
      }

      return true;
    });
  }, [scopedTasks, effectiveHistoryTasks, activeTab, historyFilter, specificDate, specificMonth, selectedCategory, searchQuery, todayStr]);

  // Metric stats
  const stats = useMemo(() => {
    // Current cycle tasks
    const currentCycleTasks = scopedTasks.filter(t => !isCompletedOlderThanOneWeek(t));
    const total = scopedTasks.length;
    const completed = scopedTasks.filter(t => (t.status || '').toLowerCase() === 'completed').length;
    const inProgress = currentCycleTasks.filter(t => t.status === 'In Progress').length;
    const pending = currentCycleTasks.filter(t => (t.status || '').toLowerCase() !== 'completed' && t.status !== 'In Progress').length;
    const active = inProgress + pending;
    const overdue = currentCycleTasks.filter(t => t.due_date && t.due_date < todayStr && (t.status || '').toLowerCase() !== 'completed').length;

    // History count reflects available completed deliverables
    const historyCount = effectiveHistoryTasks.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : (allCompletedTasks.length > 0 ? 100 : 0);

    return { total, active, completed, inProgress, pending, overdue, historyCount, rate };
  }, [scopedTasks, effectiveHistoryTasks, allCompletedTasks, todayStr]);

  // Set Task Status (In Progress, Completed, Pending)
  const handleSetStatus = async (task, newStatus) => {
    if (task.status === newStatus) return;

    try {
      if (newStatus === 'Completed') soundFX?.playSuccess?.();
      else soundFX?.playClick?.();
    } catch (e) {}

    const isCompleted = newStatus === 'Completed';

    // 1. Optimistic UI update
    setTasks(prev => prev.map(t => t.id === task.id ? { 
      ...t, 
      status: newStatus,
      completed_at: isCompleted ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    } : t));

    // 2. Persist to Supabase / PostgreSQL with cache invalidation
    try {
      invalidateQueryCache('global_tasks');
      await supabase.from('global_tasks').update({ 
        status: newStatus,
        completed_at: isCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }).eq('id', task.id);
    } catch (e) {
      console.warn('[Task Status Update Note]:', e);
    }

    // 3. Sync with linked project if any
    if (task.project && task.project !== 'None') {
      try {
        invalidateQueryCache('projects');
        const proj = projects.find(p => p.name === task.project || String(p.id) === String(task.project_id));
        if (proj && Array.isArray(proj.tasks)) {
          const updatedProjTasks = proj.tasks.map(pt => {
            if (pt.title === task.title || pt.id === task.id || pt.globalTaskId === task.id) {
              return { ...pt, completed: isCompleted };
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
    try {
      logAuditActivity({
        action: 'UPDATE_TASK_STATUS',
        module: 'My Work',
        details: `${currentUserName} updated task "${task.title}" status to ${newStatus}`,
        metadata: { taskId: task.id, title: task.title, status: newStatus }
      });
    } catch (e) {}

    // 5. Toast feedback & sync events
    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
    window.dispatchEvent(new CustomEvent('taxpro_tasks_updated'));
    if (onShowToast) {
      if (newStatus === 'Completed') {
        onShowToast(`🎉 Awesome! "${task.title}" marked as Completed!`, 'success');
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

  // Handle Create New Task / Deliverable
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskForm.title.trim()) {
      if (onShowToast) onShowToast('Please enter a task title.', 'warning');
      return;
    }

    const assignedTo = (newTaskForm.assignee || currentUserName || 'Me').trim();
    const finalDueDate = newTaskForm.due_date || todayStr;
    const taskId = `TSK-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const selectedClientObj = clients.find(c => c.name === newTaskForm.client);
    const selectedProjObj = projects.find(p => p.name === newTaskForm.project);

    const newTask = {
      id: taskId,
      title: newTaskForm.title.trim(),
      client: newTaskForm.client || 'Internal Practice',
      client_id: selectedClientObj ? selectedClientObj.id : null,
      category: newTaskForm.category,
      due_date: finalDueDate,
      dueDate: finalDueDate,
      priority: newTaskForm.priority,
      status: newTaskForm.status || 'In Progress',
      assignee: assignedTo,
      project: newTaskForm.project || 'None',
      project_id: selectedProjObj ? selectedProjObj.id : null,
      notes: newTaskForm.notes || '',
      description: newTaskForm.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 1. Optimistic local update
    setTasks(prev => [newTask, ...prev]);

    // 2. Cache invalidation
    invalidateQueryCache('global_tasks');

    // 3. Persist to PostgreSQL database via supabase client
    try {
      const { data: dbData, error: dbErr } = await supabase.from('global_tasks').insert([{
        id: newTask.id,
        title: newTask.title,
        client: newTask.client,
        client_id: newTask.client_id,
        category: newTask.category,
        due_date: newTask.due_date,
        priority: newTask.priority,
        status: newTask.status,
        assignee: newTask.assignee,
        project: newTask.project,
        project_id: newTask.project_id,
        notes: newTask.notes,
        description: newTask.description,
        created_at: newTask.created_at,
        updated_at: newTask.updated_at
      }]).select();

      if (dbErr) {
        console.error('[Create Task Error]:', dbErr);
        if (onShowToast) onShowToast(`Failed to save task: ${dbErr.message}`, 'error');
      } else {
        if (onShowToast) onShowToast(`✓ Work item "${newTask.title}" added and assigned to ${assignedTo}!`, 'success');
      }
    } catch (err) {
      console.error('[Create Task Error]:', err);
    }

    // 4. Sync linked project if any
    if (newTask.project && newTask.project !== 'None') {
      try {
        invalidateQueryCache('projects');
        const proj = projects.find(p => p.name === newTask.project || String(p.id) === String(newTask.project_id));
        if (proj) {
          const existingTasks = Array.isArray(proj.tasks) ? proj.tasks : [];
          const updatedProjTasks = [
            ...existingTasks,
            {
              id: newTask.id,
              globalTaskId: newTask.id,
              title: newTask.title,
              category: newTask.category,
              priority: newTask.priority,
              dueDate: newTask.due_date,
              assignee: newTask.assignee,
              completed: newTask.status === 'Completed'
            }
          ];
          await supabase.from('projects').update({ tasks: updatedProjTasks }).eq('id', proj.id);
        }
      } catch (projErr) {
        console.warn('[Project Sync Note]:', projErr);
      }
    }

    // 5. Log audit trail
    try {
      logAuditActivity({
        action: 'CREATE_TASK',
        module: 'My Work',
        details: `${currentUserName} created task "${newTask.title}" assigned to ${assignedTo}`,
        metadata: { taskId: newTask.id, title: newTask.title, assignee: assignedTo, client: newTask.client }
      });
    } catch (e) {}

    // 6. Broadcast reactive events across the entire application
    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
    window.dispatchEvent(new CustomEvent('taxpro_tasks_updated'));
    window.dispatchEvent(new CustomEvent('ai_task_added'));

    // 7. Reset form & close modal
    setIsAddModalOpen(false);
    setNewTaskForm({
      title: '',
      client: '',
      category: 'GST Return Filing',
      due_date: todayStr,
      priority: 'High',
      status: 'In Progress',
      assignee: '',
      project: 'None',
      notes: ''
    });
  };

  const handlePrintMyWorkHistory = () => {
    const list = filteredTasks.filter(t => t.status === 'Completed');
    if (list.length === 0) {
      if (onShowToast) onShowToast('No completed history tasks to print.', 'warning');
      return;
    }

    const rows = list.map((t, idx) => `
      <tr>
        <td style="font-family: monospace; color: #64748b; text-align: center;">${idx + 1}</td>
        <td><strong>${t.title}</strong></td>
        <td>${t.client || 'Internal Practice'}</td>
        <td>${t.category || 'General'}</td>
        <td style="font-family: monospace;">${formatDate(t.due_date || t.dueDate)}</td>
        <td style="font-family: monospace; color: #059669; font-weight: bold;">${formatDate(t.completed_at || t.updated_at)}</td>
        <td><strong>${t.assignee || 'Me'}</strong></td>
      </tr>
    `).join('');

    const body = `
      <div style="margin-bottom: 15px; border-bottom: 2px solid #059669; padding-bottom: 10px;">
        <h2 style="margin: 0; color: #0f172a; font-size: 16px; font-weight: 800;">PERSONAL COMPLETED DELIVERABLES & TASK HISTORY</h2>
        <div style="font-size: 11px; color: #059669; margin-top: 4px; font-weight: bold;">Member / Staff: ${currentUserName} • Total Finished Deliverables: ${list.length} Records</div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 35px; text-align: center;">#</th>
            <th>Task Title</th>
            <th>Client</th>
            <th>Category</th>
            <th>Target Due Date</th>
            <th>Completed On</th>
            <th>Assignee</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    printHtml(`Task_History_${currentUserName.replace(/\s+/g, '_')}`, body);
    if (onShowToast) onShowToast('🖨️ Generating printable task history register...', 'info');
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

          {/* Quick Actions (Add Task, Task History, Salary UPI & Ask Leave) */}
          <div className="flex items-center gap-3 flex-wrap shrink-0">
            {/* Direct Task History Page Button */}
            <button
              type="button"
              onClick={() => { window.location.hash = '#/task-history'; }}
              className="px-3.5 py-2.5 rounded-xl border font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 bg-white/10 hover:bg-white/20 text-white border-white/20"
              title="Open Task History page"
            >
              <History className="w-4 h-4 text-cyan-300" />
              <span>Task History ({stats.historyCount}) ↗</span>
            </button>

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

        {/* 2. KPI METRICS ROW - INTERACTIVE CLICKABLE TILES */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-white/10 relative z-10">
          
          <button
            type="button"
            onClick={() => setActiveTab('All')}
            className={`rounded-2xl p-3.5 flex flex-col justify-between text-left transition-all cursor-pointer border active:scale-95 group ${
              activeTab === 'All'
                ? 'bg-white/15 border-indigo-400 ring-2 ring-indigo-400/40 shadow-lg'
                : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20'
            }`}
            title="Click to view All active deliverables"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-300">Total Assigned</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <div className="text-2xl font-black font-mono text-white mt-1">{stats.total}</div>
            <div className="text-[10px] text-gray-300 mt-1 flex items-center gap-1">
              <CheckSquare className="w-3 h-3 text-indigo-400" /> Total deliverables
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('InProgress')}
            className={`rounded-2xl p-3.5 flex flex-col justify-between text-left transition-all cursor-pointer border active:scale-95 group ${
              activeTab === 'InProgress'
                ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20'
            }`}
            title="Click to view In Progress deliverables"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">In Progress</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <div className="text-2xl font-black font-mono text-amber-400 mt-1">{stats.inProgress}</div>
            <div className="text-[10px] text-amber-300/80 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" /> Active tasks
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('Overdue')}
            className={`rounded-2xl p-3.5 flex flex-col justify-between text-left transition-all cursor-pointer border active:scale-95 group ${
              activeTab === 'Overdue' || activeTab === 'Urgent'
                ? 'bg-rose-500/20 border-rose-400 ring-2 ring-rose-400/40 shadow-lg'
                : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20'
            }`}
            title="Click to view Overdue & Urgent deliverables"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-300">Overdue / Urgent</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-400 group-hover:text-rose-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <div className="text-2xl font-black font-mono text-rose-400 mt-1">{stats.overdue}</div>
            <div className="text-[10px] text-rose-300/80 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-rose-400" /> Past deadline
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('Completed')}
            className={`rounded-2xl p-3.5 flex flex-col justify-between text-left transition-all cursor-pointer border active:scale-95 group ${
              activeTab === 'Completed'
                ? 'bg-emerald-500/20 border-emerald-400 ring-2 ring-emerald-400/40 shadow-lg'
                : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20'
            }`}
            title="Click to view Completed deliverables (last 7 days)"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Completed</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 group-hover:text-emerald-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400 mt-1">{stats.completed}</div>
            <div className="text-[10px] text-emerald-300/80 mt-1 flex items-center gap-1">
              <CheckCheck className="w-3 h-3 text-emerald-400" /> Finished tasks
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('History')}
            className={`rounded-2xl p-3.5 flex flex-col justify-between text-left transition-all cursor-pointer border active:scale-95 group col-span-2 sm:col-span-1 ${
              activeTab === 'History'
                ? 'bg-cyan-500/20 border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg'
                : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20'
            }`}
            title="Click to open Task History & Archive (>1 week old)"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Efficiency & History</span>
              <span className="text-[10px] font-mono text-cyan-300/90 font-bold">{stats.historyCount} in archive</span>
            </div>
            <div className="text-2xl font-black font-mono text-cyan-400 mt-1">{stats.rate}%</div>
            <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-cyan-400 h-full rounded-full transition-all duration-500" style={{ width: `${stats.rate}%` }} />
            </div>
          </button>

        </div>

      </div>

      {/* 3. FILTER TABS & SEARCH CONTROLS */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Scope & Tab buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar flex-wrap sm:flex-nowrap">
            {/* Scope Switcher */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 shrink-0">
              <button
                type="button"
                onClick={() => setWorkScope('mine')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  workScope === 'mine'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>My Work ({tasks.filter(isAssignedToMe).length})</span>
              </button>
              <button
                type="button"
                onClick={() => setWorkScope('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  workScope === 'all'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FolderKanban className="w-3.5 h-3.5" />
                <span>All Team ({tasks.length})</span>
              </button>
            </div>

            <div className="h-6 w-[1px] bg-gray-200 hidden sm:block shrink-0" />

            {[
              { id: 'Active', label: '🚀 Active Tasks', count: stats.active },
              { id: 'InProgress', label: '⚡ In Progress', count: stats.inProgress },
              { id: 'Pending', label: '⏳ Pending', count: stats.pending },
              { id: 'Urgent', label: '🔥 Urgent', count: scopedTasks.filter(t => (t.priority === 'High' || t.priority === 'Urgent') && (t.status || '').toLowerCase() !== 'completed').length },
              { id: 'Overdue', label: '⚠️ Overdue', count: stats.overdue },
              { id: 'History', label: '📜 Task History', count: stats.historyCount, highlight: true },
              { id: 'All', label: '🎯 All Current', count: stats.total }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'History') {
                    window.location.hash = '#/task-history';
                    return;
                  }
                  setActiveTab(tab.id);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#5b52e0] text-white shadow-sm shadow-indigo-600/30 ring-2 ring-indigo-200'
                    : tab.highlight && activeTab !== tab.id
                      ? 'bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === tab.id 
                    ? 'bg-white/20 text-white' 
                    : tab.highlight 
                      ? 'bg-indigo-200 text-indigo-900 font-bold' 
                      : 'bg-gray-200 text-gray-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search and Category Filter */}
          <div className="flex items-center gap-2.5 flex-wrap">

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
      {activeTab === 'History' && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-700 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-md animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center shrink-0">
                <History className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-black text-sm font-outfit text-white tracking-tight">
                    Task History & Deliverables Compliance Archive
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                    {filteredTasks.length} Completed
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-[10px] font-mono font-bold">
                    {stats.rate}% Overall Completion Rate
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
                  Inspect completed deliverables, timeline milestones, turnaround efficiency, and tamper-evident compliance audit trails.
                </p>
                {myCompletedTasks.length === 0 && (historyScope === 'auto' || historyScope === 'all') && (
                  <div className="inline-flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-cyan-300 bg-cyan-900/40 border border-cyan-500/30 px-2 py-0.5 rounded-lg">
                    <span>👥 Showing All Team History ({allCompletedTasks.length} tasks). Personal deliverables will appear under "My History".</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
              {/* History Scope Toggle: My History vs Team History */}
              <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/15">
                <button
                  type="button"
                  onClick={() => setHistoryScope('mine')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    historyScope === 'mine' || (historyScope === 'auto' && myCompletedTasks.length > 0)
                      ? 'bg-white text-indigo-950 shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Show only tasks assigned to me"
                >
                  <span>👤 My History ({myCompletedTasks.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryScope('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    historyScope === 'all' || (historyScope === 'auto' && myCompletedTasks.length === 0)
                      ? 'bg-white text-indigo-950 shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Show all completed tasks across the practice"
                >
                  <span>👥 All Team ({allCompletedTasks.length})</span>
                </button>
              </div>

              {/* History Period Tabs */}
              <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/15 flex-wrap">
                {[
                  { id: 'all', label: 'All Time' },
                  { id: '7days', label: '7 Days' },
                  { id: '30days', label: '30 Days' },
                  { id: 'month', label: 'This Month' },
                  { id: 'specific_date', label: '📅 Date' },
                  { id: 'specific_month', label: '🗓️ Month' },
                  { id: 'archived', label: 'Archived (>1Wk)' }
                ].map(period => (
                  <button
                    key={period.id}
                    type="button"
                    onClick={() => setHistoryFilter(period.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      historyFilter === period.id
                        ? 'bg-white text-indigo-950 shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>

              {/* Print History Button */}
              <button
                type="button"
                onClick={handlePrintMyWorkHistory}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 cursor-pointer transition-all flex items-center gap-1.5"
                title="Print personal task history statement"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-300" />
                <span>Print</span>
              </button>

              {/* Back to Active Work */}
              <button
                type="button"
                onClick={() => setActiveTab('Active')}
                className="px-3.5 py-1.5 rounded-xl bg-[#5b52e0] hover:bg-indigo-600 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <CheckSquare className="w-3.5 h-3.5 text-indigo-200" />
                <span>Active Work</span>
              </button>
            </div>
          </div>

          {/* SPECIFIC DATE & SPECIFIC MONTH INPUT CONTROLS */}
          {(historyFilter === 'specific_date' || historyFilter === 'specific_month') && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
              {historyFilter === 'specific_date' && (
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs text-indigo-200 font-bold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-cyan-300" />
                    Select Specific Date:
                  </span>
                  <input
                    type="date"
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    className="px-3 py-1 bg-white text-slate-900 font-mono text-xs font-bold rounded-lg border-0 outline-none shadow-xs"
                  />
                  {/* Quick Shortcut for Database records */}
                  <button
                    type="button"
                    onClick={() => setSpecificDate('2026-08-24')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                      specificDate === '2026-08-24'
                        ? 'bg-cyan-400 text-slate-950 font-black shadow-xs'
                        : 'bg-white/10 text-slate-300 hover:bg-white/20'
                    }`}
                  >
                    24 Aug 2026 (Completed Records)
                  </button>
                  {specificDate && (
                    <button
                      type="button"
                      onClick={() => setSpecificDate('')}
                      className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-white/10"
                    >
                      Clear Date
                    </button>
                  )}
                </div>
              )}

              {historyFilter === 'specific_month' && (
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs text-indigo-200 font-bold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-cyan-300" />
                    Select Specific Month:
                  </span>
                  <input
                    type="month"
                    value={specificMonth}
                    onChange={(e) => setSpecificMonth(e.target.value)}
                    className="px-3 py-1 bg-white text-slate-900 font-mono text-xs font-bold rounded-lg border-0 outline-none shadow-xs"
                  />
                  {/* Quick Month Shortcuts */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSpecificMonth('2026-08')}
                      className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                        specificMonth === '2026-08'
                          ? 'bg-emerald-500 text-white font-black shadow-xs'
                          : 'bg-white/10 text-slate-300 hover:bg-white/20'
                      }`}
                    >
                      Aug 2026 ({allCompletedTasks.filter(t => (t.completed_at || t.updated_at || '').startsWith('2026-08')).length} Tasks)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpecificMonth('2026-09')}
                      className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                        specificMonth === '2026-09'
                          ? 'bg-emerald-500 text-white font-black shadow-xs'
                          : 'bg-white/10 text-slate-300 hover:bg-white/20'
                      }`}
                    >
                      Sep 2026 (Current)
                    </button>
                  </div>
                  {specificMonth && (
                    <button
                      type="button"
                      onClick={() => setSpecificMonth('')}
                      className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-white/10"
                    >
                      Clear Month
                    </button>
                  )}
                </div>
              )}

              <div className="text-xs font-mono text-cyan-300 font-semibold shrink-0">
                {filteredTasks.length} task(s) matching filter
              </div>
            </div>
          )}
        </div>
      )}

      {filteredTasks.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-full bg-indigo-50 text-[#5b52e0] flex items-center justify-center text-3xl mx-auto shadow-inner">
            {activeTab === 'History' ? '📜' : '🎉'}
          </div>
          <h3 className="text-lg font-black text-gray-900 font-outfit">
            {activeTab === 'History' 
              ? `No completed tasks found in "${historyScope === 'mine' ? 'My History' : 'Team History'}" for period "${historyFilter.toUpperCase()}"`
              : 'No active work items found matching this filter!'}
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            {activeTab === 'History' 
              ? 'Switch to All Team History or choose a different date filter to inspect completed firm tasks.' 
              : activeTab === 'Active' 
                ? "You're all caught up on your active deliverables! Great job." 
                : 'No tasks currently match your filter criteria.'}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {activeTab === 'History' ? (
              <>
                <button
                  type="button"
                  onClick={() => { setHistoryFilter('all'); setHistoryScope('all'); setSearchQuery(''); }}
                  className="px-4 py-2 rounded-xl bg-[#5b52e0] hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  View All Firm History ({allCompletedTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('Active'); setSearchQuery(''); }}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  Back to Active Work
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { setActiveTab('History'); }}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Check Task History ({allCompletedTasks.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setWorkScope('all'); setSearchQuery(''); }}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  Show All Team Work
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => {
            const isCompleted = task.status === 'Completed';
            const isInProgress = task.status === 'In Progress';
            const isPending = !isCompleted && !isInProgress;
            const isOverdue = task.due_date && task.due_date < todayStr && !isCompleted;
            const isDueToday = task.due_date === todayStr && !isCompleted;
            const isArchived = isCompletedOlderThanOneWeek(task);

            return (
              <div
                key={task.id}
                className={`bg-white border rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between relative group hover:shadow-md ${
                  isArchived
                    ? 'border-slate-300 bg-slate-50/50 opacity-80'
                    : isCompleted 
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
                      isArchived
                        ? 'bg-slate-200 text-slate-700 border border-slate-300'
                        : task.priority === 'Urgent' || task.priority === 'High'
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : task.priority === 'Medium'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {isArchived ? 'Archived' : (task.priority || 'Normal')}
                    </span>
                  </div>

                  {/* Task Title */}
                  <h4 className={`text-sm font-black text-gray-900 font-outfit leading-snug line-clamp-2 ${
                    isCompleted ? 'line-through text-gray-400' : ''
                  }`}>
                    {task.title}
                  </h4>

                  {/* Client, Assignee & Project Information */}
                  <div className="mt-3 space-y-1.5 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="font-semibold text-gray-800 truncate">
                        {task.client || 'Practice Management'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate text-[11px] text-indigo-700 font-medium">
                      <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">
                        Assigned: <strong className="font-bold">{task.assignee || 'Unassigned'}</strong>
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
                        {formatDate(task.due_date, 'No Date')}
                      </span>
                    </div>

                    {/* Status Pill Switcher */}
                    {!isArchived && (
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
                    )}
                  </div>

                  {/* 1-CLICK AUTOMATIC DONE BUTTON / ARCHIVE ACTIONS */}
                  <div className="flex flex-col gap-2">
                    {isCompleted ? (
                      <div className="space-y-2">
                        <div className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 ${
                          isArchived
                            ? 'bg-slate-100 text-slate-700 border border-slate-200'
                            : 'bg-emerald-100/70 text-emerald-800 border border-emerald-200'
                        }`}>
                          {isArchived ? (
                            <>
                              <Archive className="w-3.5 h-3.5 text-slate-500" />
                              <span>Archived History ({formatDate(task.completed_at || task.updated_at)})</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>✓ Completed ({formatDate(task.completed_at || task.updated_at)})</span>
                            </>
                          )}
                        </div>

                        {/* Reopen button */}
                        <button
                          type="button"
                          onClick={() => handleSetStatus(task, 'In Progress')}
                          className="w-full py-1.5 px-3 rounded-xl font-bold text-[11px] text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-indigo-200/70 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                          title="Reopen task and move to active workload"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reopen to Active Work</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleMarkAsDone(task)}
                        className="w-full py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-500/20 hover:scale-[1.02]"
                        title="Click to mark completed (kept for 1 week, then saved to history)"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                        <span>✓ Mark Completed</span>
                      </button>
                    )}

                    {/* Task History & Timeline Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTaskForHistory(task);
                        setIsTaskHistoryModalOpen(true);
                      }}
                      className="w-full py-1.5 px-3 rounded-xl font-bold text-[11px] text-indigo-700 hover:text-indigo-900 bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-200/80 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
                      title="Check complete history, timeline and compliance audit trail"
                    >
                      <History className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Task History & Audit Log</span>
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Quick History Discovery Banner on Active Work views */}
      {activeTab !== 'History' && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-700/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-sm font-outfit text-white tracking-tight flex items-center gap-2">
                <span>Task History</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[10px] font-mono font-bold">
                  {allCompletedTasks.length} Completed Tasks
                </span>
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Browse and filter past completed deliverables, timeline milestones, and turnaround duration.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { window.location.hash = '#/task-history'; }}
            className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-cyan-500/20 cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-auto active:scale-95"
          >
            <History className="w-4 h-4" />
            <span>Open Task History ({allCompletedTasks.length}) →</span>
          </button>
        </div>
      )}

      {/* 5. QUICK ADD WORK ITEM MODAL */}
      {isAddModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddModalOpen(false); }}
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-modal-smooth">
            
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-2xs">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 font-outfit tracking-tight">
                    Add Work Item & Assign Deliverable
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Assign a new deliverable to yourself or any team member
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold overscroll-contain chat-custom-scrollbar">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Task Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. File GSTR-3B for M/S ABC Traders"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Client Name
                  </label>
                  <select
                    value={newTaskForm.client}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, client: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs outline-none focus:border-indigo-600 cursor-pointer"
                  >
                    <option value="">-- Internal Practice --</option>
                    {clients.map(c => (
                      <option key={c.id || c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newTaskForm.category}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs outline-none focus:border-indigo-600 cursor-pointer"
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

              {/* Assignee & Linked Project */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-indigo-950 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Assign To Member <span className="text-rose-500">*</span></span>
                  </label>
                  <select
                    value={newTaskForm.assignee || currentUserName}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, assignee: e.target.value }))}
                    className="w-full px-3 py-2 bg-indigo-50/40 border border-indigo-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs outline-none focus:border-indigo-600 cursor-pointer"
                  >
                    <option value={currentUserName || 'Me'}>Assign to Me ({currentUserName || 'Self'})</option>
                    {teamMembers && teamMembers.length > 0 && (
                      <optgroup label="Practice Team Members">
                        {teamMembers.map((m, idx) => {
                          const mName = typeof m === 'string' ? m : m.name;
                          const mRole = m.role || 'Staff';
                          const mDept = m.department ? ` • ${m.department}` : '';
                          return (
                            <option key={m.id || m.email || idx} value={mName}>
                              {mName} ({mRole}{mDept})
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                    <option value="Unassigned">Unassigned (General Pool)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <FolderKanban className="w-3.5 h-3.5 text-purple-600" />
                    <span>Link to Project</span>
                  </label>
                  <select
                    value={newTaskForm.project}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, project: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs outline-none focus:border-indigo-600 cursor-pointer"
                  >
                    <option value="None">-- No Project (Standalone) --</option>
                    {projects.map(p => (
                      <option key={p.id || p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newTaskForm.due_date}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs outline-none focus:border-indigo-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={newTaskForm.priority}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs outline-none focus:border-indigo-600 cursor-pointer"
                  >
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={newTaskForm.status}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs outline-none focus:border-indigo-600 cursor-pointer"
                  >
                    <option value="In Progress">In Progress</option>
                    <option value="Pending">Pending</option>
                    <option value="To Do">To Do</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes & Deliverable Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="Add any specific instructions, ledger references, or checklist items..."
                  value={newTaskForm.notes}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium shadow-2xs outline-none focus:border-indigo-600 resize-none"
                />
              </div>

              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 -mx-6 -mb-6 mt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Create & Assign Work Item</span>
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
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-modal-smooth text-slate-800">
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-slate-900">
                    Salary Payout UPI Setup
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Receive direct salary disbursements & bonuses
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUpiModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveUpi} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-semibold overscroll-contain chat-custom-scrollbar">
              <div>
                <label className="text-slate-700 block mb-1">
                  Your Virtual Payment Address (UPI ID) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. yourname@okaxis, 9876543210@paytm"
                    value={upiInputVal}
                    onChange={(e) => setUpiInputVal(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3.5 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:border-indigo-600 shadow-2xs"
                    autoFocus
                  />
                </div>

                {/* Quick Handle Chips */}
                <div className="flex items-center gap-1.5 mt-2.5 flex-wrap text-[10px]">
                  <span className="text-slate-500 font-medium">Quick handles:</span>
                  {['@okaxis', '@ybl', '@oksbi', '@paytm', '@ibl', '@icici'].map((handle) => (
                    <button
                      key={handle}
                      type="button"
                      onClick={() => {
                        const prefix = upiInputVal.split('@')[0] || (currentUserEmail ? currentUserEmail.split('@')[0] : 'name');
                        setUpiInputVal(`${prefix}${handle}`);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-indigo-600 hover:bg-indigo-50 font-mono font-bold cursor-pointer transition-colors"
                    >
                      {handle}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic QR Preview */}
              {upiInputVal.trim() && upiInputVal.includes('@') && (
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex flex-col items-center justify-center text-center shadow-2xs">
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
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setIsUpiModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingUpi}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingUpi ? 'Saving...' : 'Save UPI ID'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TASK HISTORY & COMPLIANCE TIMELINE MODAL */}
      <TaskHistoryModal
        task={selectedTaskForHistory}
        isOpen={isTaskHistoryModalOpen}
        onClose={() => {
          setIsTaskHistoryModalOpen(false);
          setSelectedTaskForHistory(null);
        }}
        onUpdateStatus={(id, status) => {
          const target = tasks.find(t => t.id === id);
          if (target) handleSetStatus(target, status);
        }}
        onShowToast={onShowToast}
      />

    </div>
  );
}
