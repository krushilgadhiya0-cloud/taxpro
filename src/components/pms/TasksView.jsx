import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Filter, Calendar, CheckCircle2, Clock, AlertCircle, User, 
  MoreVertical, X, Paperclip, ArrowLeft, Printer, CheckSquare, FolderKanban,
  ArrowDownToLine, CheckCheck, Sparkles, FolderDown, Building2, Coffee, RotateCcw,
  History, ShieldCheck, Archive, ExternalLink
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { invalidateQueryCache } from '../../lib/postgresClient';
import { logAuditActivity } from '../../lib/auditLogger';
import { requireFirmSetup } from '../../lib/firmGatekeeper';
import { printHtml } from '../../lib/printHelper';
import { formatDate } from '../../lib/dateUtils';
import TaskHistoryModal from './TaskHistoryModal';

export default function TasksView({ onShowToast }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Task History & Mode states
  const [myTaskMode, setMyTaskMode] = useState('all'); // 'all' | 'active' | 'history'
  const [myTasksScope, setMyTasksScope] = useState('mine'); // 'mine' | 'all'
  const [historyPeriod, setHistoryPeriod] = useState('all'); // 'all' | '7days' | '30days' | 'month' | 'specific_date' | 'specific_month'
  const [specificDate, setSpecificDate] = useState(''); // 'YYYY-MM-DD'
  const [specificMonth, setSpecificMonth] = useState('2026-08'); // 'YYYY-MM'
  const [selectedTaskForHistory, setSelectedTaskForHistory] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentUserName = localStorage.getItem('taxpro_user_name') || localStorage.getItem('taxpro_user_fullname') || '';
  const currentUserEmail = localStorage.getItem('taxpro_user_email') || '';

  // Import from project modal state
  const [selectedProjectForImport, setSelectedProjectForImport] = useState('');
  const [selectedTasksToImport, setSelectedTasksToImport] = useState([]);

  const fetchData = async () => {
    setIsLoading(true);
    const [tasksRes, clientsRes, membersRes, projectsRes] = await Promise.all([
      supabase.from('global_tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name, trade_name').order('name', { ascending: true }),
      supabase.from('team_members').select('name').order('name', { ascending: true }),
      supabase.from('projects').select('*').order('created_at', { ascending: false })
    ]);

    if (!tasksRes.error && tasksRes.data) {
       const mapped = tasksRes.data.map(t => ({
         ...t,
         dueDate: t.due_date
       }));
       setTasks(mapped);
    }
    
    if (!clientsRes.error && Array.isArray(clientsRes.data) && clientsRes.data.length > 0) {
       setClients(clientsRes.data);
    } else {
       try {
         const cached = localStorage.getItem('taxpro_cached_clients');
         if (cached) setClients(JSON.parse(cached));
       } catch (e) {}
    }

    if (!membersRes.error && membersRes.data) {
       const names = membersRes.data.map(m => m.name).filter(n => n && n.trim() !== '');
       const combined = Array.from(new Set([currentUserName || 'Administrator', 'Administrator', ...names]));
       setTeamMembers(combined);
    } else {
       setTeamMembers([currentUserName || 'Administrator', 'Administrator']);
    }

    if (!projectsRes.error && projectsRes.data) {
       setProjects(projectsRes.data);
       if (!selectedProjectForImport && projectsRes.data.length > 0) {
         setSelectedProjectForImport(projectsRes.data[0].id);
       }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
    
    // Live Voice AI & DB Sync Listener
    const handleAIUpdate = () => {
       fetchData();
    };
    const handleOpenAddTask = () => setIsAddModalOpen(true);
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setIsImportModalOpen(false);
      }
    };
    const handleFilterChange = (e) => {
      if (e.detail?.filter) {
        setActiveFilter(e.detail.filter);
      }
    };

    window.addEventListener('ai_task_added', handleAIUpdate);
    window.addEventListener('taxpro_db_updated', handleAIUpdate);
    window.addEventListener('ai_open_add_task', handleOpenAddTask);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('taxpro_task_filter_changed', handleFilterChange);
    
    return () => {
      window.removeEventListener('ai_task_added', handleAIUpdate);
      window.removeEventListener('taxpro_db_updated', handleAIUpdate);
      window.removeEventListener('ai_open_add_task', handleOpenAddTask);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('taxpro_task_filter_changed', handleFilterChange);
    };
  }, []);

  const [newTask, setNewTask] = useState({
    title: '',
    client: '',
    category: 'GST',
    dueDate: '',
    priority: 'Medium',
    assignee: currentUserName,
    project: ''
  });

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.title || !newTask.client) return;

    const taskId = `TSK-${Math.floor(100 + Math.random() * 900)}`;
    const finalDueDate = newTask.dueDate || new Date().toISOString().slice(0, 10);
    const finalAssignee = newTask.assignee || 'Unassigned';
    const finalProject = newTask.project || 'None';

    const { data: dbData, error: dbError } = await supabase.from('global_tasks').insert([{
      id: taskId,
      title: newTask.title,
      client: newTask.client,
      category: newTask.category,
      due_date: finalDueDate,
      status: 'Pending',
      priority: newTask.priority,
      assignee: finalAssignee,
      project: finalProject,
      attachment: newTask.attachment || null
    }]).select();

    if (dbError) {
       if (onShowToast) onShowToast(`Failed to create task: ${dbError.message}`, 'error');
       return;
    }

    const insertedTask = dbData[0];
    const taskObj = {
      ...insertedTask,
      dueDate: insertedTask.due_date
    };

    setTasks([taskObj, ...tasks]);
    setIsAddModalOpen(false);
    setNewTask({ title: '', client: '', category: 'GST', dueDate: '', priority: 'Medium', assignee: currentUserName, project: '' });
    
    logAuditActivity({
      action: 'ADD_TASK',
      module: 'Tasks',
      details: `Created deliverable task "${taskObj.title}" for client "${taskObj.client}" (Priority: ${taskObj.priority || 'Medium'}, Due: ${taskObj.dueDate})`,
      metadata: { taskId: taskObj.id, title: taskObj.title, client: taskObj.client, priority: taskObj.priority }
    });

    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
    if (onShowToast) onShowToast('✓ New task safely persisted in cloud database!', 'success');
  };

  const updateTaskStatus = async (id, targetStatus) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const nextStatus = targetStatus || (task.status === 'Completed' ? 'Pending' : 'Completed');
    const isCompleted = nextStatus === 'Completed';

    // 1. Optimistic local update
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        return { 
          ...t, 
          status: nextStatus,
          completed_at: isCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        };
      }
      return t;
    }));

    // 2. Update global_tasks in PostgreSQL database with cache invalidation
    try {
      invalidateQueryCache('global_tasks');
      const { error } = await supabase.from('global_tasks').update({ 
        status: nextStatus,
        completed_at: isCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }).eq('id', id);
      if (error) {
        if (onShowToast) onShowToast(`Failed to update status: ${error.message}`, 'error');
        return;
      }
    } catch (dbErr) {}

    // 3. Two-Way Sync: Update any linked Project checklist item in database and localStorage!
    try {
      invalidateQueryCache('projects');
      const { data: dbProjects } = await supabase.from('projects').select('*');
      const allProjects = (dbProjects && dbProjects.length > 0) ? dbProjects : (projects || []);

      for (const proj of allProjects) {
        if (Array.isArray(proj.tasks) && proj.tasks.length > 0) {
          let projectModified = false;
          const updatedTasks = proj.tasks.map(pt => {
            const matchesId = String(pt.id) === String(id) || String(pt.globalTaskId) === String(id);
            const matchesTitle = pt.title && task.title && pt.title.trim().toLowerCase() === task.title.trim().toLowerCase();
            
            if (matchesId || matchesTitle) {
              projectModified = true;
              return {
                ...pt,
                completed: isCompleted,
                globalTaskId: id
              };
            }
            return pt;
          });

          if (projectModified) {
            // Update in PostgreSQL
            await supabase.from('projects').update({ tasks: updatedTasks }).eq('id', proj.id);
            
            // Update local state
            setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, tasks: updatedTasks } : p));
            
            // Update local storage
            try {
              const localProjects = JSON.parse(localStorage.getItem('taxpro_projects') || '[]');
              const updatedLocal = localProjects.map(p => p.id === proj.id ? { ...p, tasks: updatedTasks } : p);
              localStorage.setItem('taxpro_projects', JSON.stringify(updatedLocal));
            } catch (e) {}
          }
        }
      }
    } catch (syncErr) {
      console.warn('[Project Sync Warning]:', syncErr);
    }

    // 4. Log Audit Activity
    try {
      logAuditActivity({
        action: 'UPDATE_TASK',
        module: 'Tasks',
        details: `Updated task "${task.title}" to ${nextStatus}${task.project && task.project !== 'None' ? ` (Project: ${task.project})` : ''}`,
        metadata: { taskId: id, title: task.title, status: nextStatus, project: task.project }
      });
    } catch (e) {}

    // 5. Notify all other views
    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
    window.dispatchEvent(new CustomEvent('taxpro_tasks_updated'));
    if (onShowToast) onShowToast(`✓ Task updated to ${nextStatus}!`, 'success');
  };

  const toggleStatus = (id) => updateTaskStatus(id);

  // Handle Importing tasks from a selected project
  const handleExecuteImportFromProject = async () => {
    const proj = projects.find(p => String(p.id) === String(selectedProjectForImport));
    if (!proj || !Array.isArray(proj.tasks) || selectedTasksToImport.length === 0) {
      if (onShowToast) onShowToast('Please select at least one task to import.', 'error');
      return;
    }

    const tasksToProcess = proj.tasks.filter(t => selectedTasksToImport.includes(t.id));
    const dueDate = proj.deadline || proj.start_date || new Date().toISOString().slice(0, 10);
    const clientName = proj.client_name || proj.client_id || proj.name;

    const globalInserts = [];
    const updatedProjTasks = proj.tasks.map(t => {
      if (selectedTasksToImport.includes(t.id)) {
        const globalTaskId = t.globalTaskId || `TSK-${Math.floor(100 + Math.random() * 900)}`;
        globalInserts.push({
          id: globalTaskId,
          title: t.title,
          client: clientName,
          category: 'Project Task',
          due_date: dueDate,
          status: t.completed ? 'Completed' : 'Pending',
          priority: proj.priority || 'Medium',
          assignee: t.assignee || 'Unassigned',
          project: proj.name,
          attachment: null
        });
        return { ...t, importedToTasks: true, globalTaskId };
      }
      return t;
    });

    try {
      await supabase.from('global_tasks').upsert(globalInserts);
      await supabase.from('projects').update({ tasks: updatedProjTasks }).eq('id', proj.id);
    } catch (e) {
      console.warn('[Import Execution Note]:', e.message);
    }

    setIsImportModalOpen(false);
    setSelectedTasksToImport([]);
    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
    window.dispatchEvent(new CustomEvent('ai_task_added'));
    fetchData();

    logAuditActivity({
      action: 'IMPORT_TASKS',
      module: 'Tasks',
      details: `Imported ${globalInserts.length} tasks from project "${proj.name}" into global tasks board`,
      metadata: { projectId: proj.id, projectName: proj.name, count: globalInserts.length }
    });

    if (onShowToast) onShowToast(`✓ Successfully imported ${globalInserts.length} tasks from ${proj.name}!`, 'success');
  };

  // Helper to test if task belongs to current user
  const isAssignedToMe = (t) => {
    const a = (t.assignee || '').toLowerCase().trim();
    const u = (currentUserName || '').toLowerCase().trim();
    const em = (currentUserEmail || '').toLowerCase().trim();
    return (
      (em && a.includes(em)) ||
      (u && (a === u || (u !== 'administrator' && u !== 'my workspace' && (a.includes(u) || u.includes(a))))) ||
      a === 'me'
    );
  };

  // Metrics for My Tasks & History
  const myTasksAll = useMemo(() => tasks.filter(isAssignedToMe), [tasks, currentUserName, currentUserEmail]);
  const myCompletedTasks = useMemo(() => myTasksAll.filter(t => (t.status || '').toLowerCase() === 'completed'), [myTasksAll]);
  const myActiveTasks = useMemo(() => myTasksAll.filter(t => (t.status || '').toLowerCase() !== 'completed'), [myTasksAll]);
  const allTeamCompleted = useMemo(() => tasks.filter(t => (t.status || '').toLowerCase() === 'completed'), [tasks]);

  const myOnTimeCount = useMemo(() => {
    return myCompletedTasks.filter(t => {
      if (!t.due_date) return true;
      const compDate = (t.completed_at || t.updated_at || '').slice(0, 10);
      return compDate && compDate <= t.due_date;
    }).length;
  }, [myCompletedTasks]);
  const myOnTimeRate = myCompletedTasks.length > 0 ? Math.round((myOnTimeCount / myCompletedTasks.length) * 100) : 100;

  // Helper to test date / month matches for history period
  const matchesHistoryPeriod = (t) => {
    const comp = t.completed_at || t.updated_at || t.due_date || t.dueDate || '';
    const taskDate = comp.slice(0, 10);
    const taskMonth = comp.slice(0, 7);

    if (historyPeriod === '7days') {
      if (!comp) return true;
      const diff = Date.now() - new Date(comp).getTime();
      return diff <= 7 * 24 * 60 * 60 * 1000;
    }
    if (historyPeriod === '30days') {
      if (!comp) return true;
      const diff = Date.now() - new Date(comp).getTime();
      return diff <= 30 * 24 * 60 * 60 * 1000;
    }
    if (historyPeriod === 'month') {
      if (!comp) return true;
      const currentMonth = new Date().toISOString().slice(0, 7);
      return taskMonth === currentMonth;
    }
    if (historyPeriod === 'specific_date') {
      if (!specificDate) return true;
      return taskDate === specificDate;
    }
    if (historyPeriod === 'specific_month') {
      if (!specificMonth) return true;
      return taskMonth === specificMonth;
    }
    return true; // 'all'
  };

  const filteredTasks = tasks.filter(t => {
    let matchesFilter = false;
    const isDone = (t.status || '').toLowerCase() === 'completed';

    if (activeFilter === 'All') {
      matchesFilter = true;
    } else if (activeFilter === 'My Tasks') {
      const assigned = isAssignedToMe(t);
      // If user toggled to 'all' in My Tasks, or if user has 0 assigned tasks and is in history, include all
      const shouldInclude = (myTasksScope === 'all' || (myTasksAll.length === 0 && myTaskMode === 'history'))
        ? true
        : assigned;

      if (!shouldInclude) return false;

      if (myTaskMode === 'active') {
        matchesFilter = !isDone;
      } else if (myTaskMode === 'history') {
        if (!isDone) return false;
        matchesFilter = matchesHistoryPeriod(t);
      } else {
        matchesFilter = true;
      }
    } else if (activeFilter === 'Task History') {
      if (!isDone) return false;
      const assigned = isAssignedToMe(t);
      if (myTasksScope === 'mine' && myCompletedTasks.length > 0 && !assigned) return false;
      matchesFilter = matchesHistoryPeriod(t);
    } else if (activeFilter === 'Project Tasks') {
      matchesFilter = (t.category === 'Project Task' || (t.project && t.project !== 'None'));
    } else {
      matchesFilter = t.status === activeFilter || t.category === activeFilter;
    }

    const matchesSearch = (t.title && t.title.toLowerCase().includes(searchQuery.toLowerCase())) || 
                          (t.client && t.client.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (t.project && t.project.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (t.id && t.id.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const handlePrintTasks = () => {
    const list = filteredTasks.length > 0 ? filteredTasks : tasks;
    if (list.length === 0) {
      if (onShowToast) onShowToast('No tasks available to print.', 'warning');
      return;
    }

    const rows = list.map((t, idx) => `
      <tr>
        <td style="font-family: monospace; color: #64748b; text-align: center;">${idx + 1}</td>
        <td>
          <strong style="color: #0f172a; font-size: 11px;">${t.title || 'Untitled Task'}</strong>
          ${t.project && t.project !== 'None' ? `<div style="font-size: 9px; color: #0f766e; margin-top: 2px;">Project: ${t.project}</div>` : ''}
        </td>
        <td>${t.client || 'Internal Practice'}</td>
        <td><span class="badge-blue">${t.category || 'General'}</span></td>
        <td style="font-family: monospace;">${formatDate(t.dueDate || t.due_date)}</td>
        <td><strong>${t.assignee || 'Unassigned'}</strong></td>
        <td><span class="badge-teal">${t.priority || 'Medium'}</span></td>
        <td>
          <span class="status-pill ${
            t.status === 'Completed' ? 'status-completed' :
            t.status === 'In Progress' ? 'status-progress' :
            t.status === 'Overdue' ? 'status-overdue' : 'status-pending'
          }">
            ${t.status || 'Pending'}
          </span>
        </td>
      </tr>
    `).join('');

    const body = `
      <div style="margin-bottom: 12px; font-weight: 800; font-size: 13px; color: #1e293b;">
        Compliance & Workflow Tasks Register (${list.length} Records)
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 35px; text-align: center;">#</th>
            <th>Task & Scope</th>
            <th>Client Name</th>
            <th>Category</th>
            <th>Due Date</th>
            <th>Assignee</th>
            <th>Priority</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    printHtml('Tasks Register', body);
    
    logAuditActivity({
      action: 'PRINT_DOCUMENT',
      module: 'Tasks',
      details: `Generated printable compliance & workflow tasks register (${list.length} tasks)`,
      metadata: { count: list.length }
    });

    if (onShowToast) onShowToast('🖨️ Generating printable task register...', 'info');
  };

  const currentImportProject = projects.find(p => String(p.id) === String(selectedProjectForImport));

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f3f4f6] min-h-screen text-gray-800">
      
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold font-outfit text-[#1e1e2d]">Task Management</h1>
          <p className="text-xs text-gray-500 mt-1">Track, assign, and manage all firm compliance, client, and project tasks.</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button 
            type="button"
            onClick={() => { window.location.hash = '#/task-history'; }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="Open Task History page"
          >
            <History className="w-4 h-4 text-indigo-600" />
            <span>Task History ({allTeamCompleted.length}) ↗</span>
          </button>

          <button 
            type="button"
            onClick={handlePrintTasks}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
            title="Print Task Register"
          >
            <Printer className="w-4 h-4 text-gray-500" />
            <span>Print Tasks</span>
          </button>

          <button 
            onClick={() => {
              if (!requireFirmSetup(onShowToast)) return;
              setIsImportModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="Import tasks from existing Projects"
          >
            <ArrowDownToLine className="w-4 h-4 text-teal-700" />
            <span>Import from Project</span>
          </button>

          <button 
            onClick={() => {
              if (!requireFirmSetup(onShowToast)) return;
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5b52e0] hover:bg-[#4c44cf] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Task</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Status Filter Chips */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {['All', 'My Tasks', 'Task History', 'Project Tasks', 'Pending', 'In Progress', 'Completed', 'Overdue', 'GST', 'Income Tax', 'MCA'].map((f) => (
            <button
              key={f}
              onClick={() => {
                if (f === 'Task History') {
                  window.location.hash = '#/task-history';
                  return;
                }
                setActiveFilter(f);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFilter === f 
                  ? 'bg-[#5b52e0] text-white shadow-xs' 
                  : (f === 'My Tasks') ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800' 
                  : (f === 'Task History') ? 'bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-800 border border-purple-200'
                  : (f === 'Project Tasks') ? 'bg-teal-50 text-teal-700 hover:bg-teal-100 hover:text-teal-800 border border-teal-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'Task History' && <History className="w-3.5 h-3.5" />}
              <span>{f}</span>
              {f === 'My Tasks' && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeFilter === f ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'}`}>
                  {myTasksAll.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search tasks, projects, clients..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:bg-white focus:border-indigo-500"
          />
        </div>
      </div>

      {/* SUB-MODE CONTROLS WHEN 'MY TASKS' IS ACTIVE */}
      {activeFilter === 'My Tasks' && (
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Team vs Mine Scope Selector */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-indigo-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setMyTasksScope('mine')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  myTasksScope === 'mine'
                    ? 'bg-[#5b52e0] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                👤 My Tasks ({myTasksAll.length})
              </button>
              <button
                type="button"
                onClick={() => setMyTasksScope('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  myTasksScope === 'all'
                    ? 'bg-[#5b52e0] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="View all team deliverables"
              >
                <FolderKanban className="w-3.5 h-3.5" />
                <span>All Team ({myTaskMode === 'history' ? allTeamCompleted.length : tasks.length})</span>
              </button>
            </div>

            {/* Task Sub-Mode (All, Active, History) */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-indigo-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setMyTaskMode('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  myTaskMode === 'all'
                    ? 'bg-indigo-900 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Tasks
              </button>
              <button
                type="button"
                onClick={() => setMyTaskMode('active')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  myTaskMode === 'active'
                    ? 'bg-indigo-900 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Active Work</span>
              </button>
              <button
                type="button"
                onClick={() => { window.location.hash = '#/task-history'; }}
                className="px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 text-gray-600 hover:text-indigo-700"
                title="Open dedicated Task History page"
              >
                <History className="w-3 h-3 text-indigo-500" />
                <span>Task History ({allTeamCompleted.length}) ↗</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-indigo-800 shrink-0">
            <span>On-Time Deliveries:</span>
            <span className="font-mono font-bold bg-white px-2 py-0.5 rounded-lg border border-indigo-200 text-indigo-900">
              {myOnTimeRate}%
            </span>
          </div>
        </div>
      )}

      {/* Tasks Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-wider">
                <th className="p-4">Task Details</th>
                <th className="p-4">Client / Scope</th>
                <th className="p-4">Category</th>
                <th className="p-4">Due Date</th>
                <th className="p-4">Assignee</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                    No matching tasks found.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-4 font-semibold text-gray-900">
                      <div className="flex flex-col">
                        <span className={t.status === 'Completed' ? 'line-through text-gray-400' : 'text-gray-900'}>
                          {t.title}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-gray-400 font-mono">{t.id} • {t.priority} Priority</span>
                          {t.project && t.project !== 'None' && (
                            <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 text-[9px] font-bold inline-flex items-center gap-1">
                              <FolderKanban className="w-2.5 h-2.5" /> {t.project}
                            </span>
                          )}
                        </div>
                        {t.attachment && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 max-w-fit cursor-pointer hover:bg-indigo-100" onClick={() => onShowToast && onShowToast(`Initializing secure download for ${t.attachment}...`, 'info')}>
                            <Paperclip className="w-3 h-3" /> <span className="truncate max-w-[120px] font-bold">{t.attachment}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 font-medium">{t.client}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        t.category === 'Project Task'
                          ? 'bg-teal-50 text-teal-700 border border-teal-200'
                          : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                      }`}>
                        {t.category}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 font-mono">{formatDate(t.dueDate)}</td>
                    <td className="p-4 text-gray-600 font-medium">{t.assignee}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                          t.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          t.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          t.status === 'Overdue' ? 'bg-red-50 text-red-700 border border-red-200' :
                          'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {t.status === 'Completed' && <CheckCircle2 className="w-3 h-3" />}
                          {t.status === 'In Progress' && <Clock className="w-3 h-3" />}
                          {t.status === 'Overdue' && <AlertCircle className="w-3 h-3" />}
                          {t.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* Task History & Timeline Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTaskForHistory(t);
                            setIsHistoryModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                          title="View Task History Timeline & Compliance Logs"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">History</span>
                        </button>

                        {t.status === 'Completed' ? (
                          <span className="px-3 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>✓ Completed</span>
                          </span>
                        ) : (
                          <>
                            {t.status !== 'In Progress' && (
                              <button
                                type="button"
                                onClick={() => updateTaskStatus(t.id, 'In Progress')}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                                title="Set In Progress"
                              >
                                ⚡ In Progress
                              </button>
                            )}
                            {t.status !== 'Pending' && (
                              <button
                                type="button"
                                onClick={() => updateTaskStatus(t.id, 'Pending')}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                                title="Set Pending"
                              >
                                ⏳ Pending
                              </button>
                            )}
                            <button 
                              type="button"
                              onClick={() => updateTaskStatus(t.id, 'Completed')}
                              className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                              title="Mark Completed"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>✓ Mark Done</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD TASK / WORK ITEM MODAL */}
      {isAddModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddModalOpen(false); }}
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-modal-smooth">
            
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-slate-900 tracking-tight">
                    Create New Work Item & Task
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Assign a workflow deliverable to client, project, and team member
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2-Column Responsive Form Body */}
            <form onSubmit={handleAddTask} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold overscroll-contain chat-custom-scrollbar">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Column 1: Task Details & Scope */}
                <div className="flex flex-col gap-3.5">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Task Title <span className="text-rose-500">*</span></label>
                    <input 
                      type="text" 
                      placeholder="e.g. GSTR-3B Return Filing"
                      value={newTask.title}
                      onChange={e => setNewTask({...newTask, title: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs shadow-2xs font-semibold text-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Client Name <span className="text-rose-500">*</span></label>
                    <select 
                      value={clients.some(c => c.name === newTask.client) ? newTask.client : ''}
                      onChange={e => {
                        if (e.target.value) setNewTask({...newTask, client: e.target.value});
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs cursor-pointer mb-1.5 shadow-2xs font-semibold text-slate-800"
                    >
                      <option value="">-- Choose from Client Directory ({clients.length} Clients) --</option>
                      {clients.map((c, idx) => (
                        <option key={idx} value={c.name}>{c.name} {c.trade_name ? `(${c.trade_name})` : ''}</option>
                      ))}
                    </select>
                    <input 
                      type="text"
                      placeholder="Or enter custom client name..."
                      value={newTask.client}
                      onChange={e => setNewTask({...newTask, client: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs font-semibold text-slate-900 shadow-2xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Assign to Project (Optional)</label>
                    <select 
                      value={newTask.project}
                      onChange={e => setNewTask({...newTask, project: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs cursor-pointer shadow-2xs"
                    >
                      <option value="">-- No Project (Standalone) --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Category</label>
                      <select 
                        value={newTask.category}
                        onChange={e => setNewTask({...newTask, category: e.target.value})}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs cursor-pointer shadow-2xs"
                      >
                        <option value="GST">GST</option>
                        <option value="Income Tax">Income Tax</option>
                        <option value="MCA">MCA</option>
                        <option value="Audit">Audit</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Due Date</label>
                      <input 
                        type="date"
                        value={newTask.dueDate}
                        onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs shadow-2xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Column 2: Assignment & Attachments */}
                <div className="flex flex-col gap-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700 block">Assign Team Member</label>
                      <button
                        type="button"
                        onClick={() => setNewTask({...newTask, assignee: currentUserName})}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                      >
                        ⚡ Assign to Me ({currentUserName.split(' ')[0]})
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2.5 max-h-48 overflow-y-auto chat-custom-scrollbar shadow-2xs">
                      {teamMembers.length > 0 ? teamMembers.map(member => {
                        const isSelf = member === currentUserName || (currentUserName.includes('Admin') && member.includes('Admin'));
                        return (
                          <button
                            key={member}
                            type="button"
                            onClick={() => setNewTask({...newTask, assignee: member})}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                              newTask.assignee === member 
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs font-bold ring-2 ring-indigo-500/20' 
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <User className={`w-3.5 h-3.5 shrink-0 ${newTask.assignee === member ? 'text-indigo-600' : 'text-slate-400'}`} />
                            <span className="text-[11px] truncate leading-tight">
                              {member} {isSelf && <span className="text-[9px] text-indigo-600 font-bold">(Myself)</span>}
                            </span>
                          </button>
                        );
                      }) : (
                        <div className="col-span-2 text-center text-xs text-slate-400 py-3">No team members available.</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Attachment (Optional)</label>
                    <div className="border border-dashed border-slate-300 rounded-2xl p-3 bg-slate-50 hover:bg-slate-100 transition-colors shadow-2xs">
                      <input 
                        type="file" 
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) setNewTask({...newTask, attachment: file.name});
                        }} 
                        className="block w-full text-xs text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" 
                      />
                      {newTask.attachment && (
                        <p className="text-[11px] text-emerald-700 font-bold mt-1">
                          ✓ Attached: {newTask.attachment}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom Sticky Actions */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 -mx-6 -mb-6 mt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT PROJECT TASKS MODAL */}
      {isImportModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsImportModalOpen(false); }}
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-modal-smooth">
            
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shadow-2xs">
                  <FolderDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-slate-900 tracking-tight">
                    Import Project Deliverables
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select tasks from active projects to import directly into the global Task register
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsImportModalOpen(false)} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4 text-xs font-semibold overscroll-contain chat-custom-scrollbar">
              
              <div>
                <label className="text-slate-700 block mb-1">Select Source Project</label>
                <select
                  value={selectedProjectForImport}
                  onChange={e => {
                    setSelectedProjectForImport(e.target.value);
                    setSelectedTasksToImport([]);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-teal-600 text-xs cursor-pointer shadow-2xs font-semibold text-slate-800"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({Array.isArray(p.tasks) ? p.tasks.length : 0} tasks)
                    </option>
                  ))}
                </select>
              </div>

              {currentImportProject && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Available Subtasks in Project:
                    </span>
                    {Array.isArray(currentImportProject.tasks) && currentImportProject.tasks.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const allIds = currentImportProject.tasks.map(t => t.id);
                          if (selectedTasksToImport.length === allIds.length) {
                            setSelectedTasksToImport([]);
                          } else {
                            setSelectedTasksToImport(allIds);
                          }
                        }}
                        className="text-teal-700 text-[11px] font-bold hover:underline cursor-pointer"
                      >
                        {selectedTasksToImport.length === currentImportProject.tasks.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto shadow-2xs">
                    {Array.isArray(currentImportProject.tasks) && currentImportProject.tasks.length > 0 ? (
                      currentImportProject.tasks.map(task => {
                        const isChecked = selectedTasksToImport.includes(task.id);
                        return (
                          <label 
                            key={task.id} 
                            className={`flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-colors ${isChecked ? 'bg-teal-50/50' : 'bg-white'}`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setSelectedTasksToImport(prev => 
                                    prev.includes(task.id) ? prev.filter(id => id !== task.id) : [...prev, task.id]
                                  );
                                }}
                                className="w-4 h-4 rounded text-teal-600 border-slate-300 focus:ring-teal-500 cursor-pointer"
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-slate-800 truncate">{task.title}</span>
                                <span className="text-[10px] text-slate-400">Assignee: {task.assignee}</span>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-2">
                              {task.importedToTasks ? (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-bold">
                                  Already Imported
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[9px] font-bold border border-teal-200">
                                  Ready to Import
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400 italic">
                        No subtasks found inside this project. Open the project to add checklist tasks first.
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                {selectedTasksToImport.length} task(s) selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedTasksToImport.length === 0}
                  onClick={handleExecuteImportFromProject}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  Import {selectedTasksToImport.length} Tasks
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TASK HISTORY & COMPLIANCE TIMELINE MODAL */}
      <TaskHistoryModal
        task={selectedTaskForHistory}
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedTaskForHistory(null);
        }}
        onUpdateStatus={(id, status) => updateTaskStatus(id, status)}
        onShowToast={onShowToast}
      />

    </div>
  );
}
