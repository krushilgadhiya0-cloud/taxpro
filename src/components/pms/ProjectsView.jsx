import React, { useState, useEffect, useCallback } from 'react';
import { 
  FolderKanban, Plus, Layers, Target, CheckCircle2, X, Calendar, Search, 
  MoreVertical, Users, Check, Printer, Paperclip, Download, ArrowLeft, 
  UserCheck, ShieldCheck, Briefcase, DollarSign, Building2, UploadCloud, 
  CheckCheck, Sparkles, User, ArrowDownToLine, Tag, Clock, ArrowRight,
  CheckSquare
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { logAuditActivity } from '../../lib/auditLogger';
import { requireFirmSetup } from '../../lib/firmGatekeeper';

export default function ProjectsView({ onShowToast }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectsList, setProjectsList] = useState(() => {
    try {
      const saved = localStorage.getItem('taxpro_projects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) {}
    return [];
  });

  const [availableMembers, setAvailableMembers] = useState([]);
  const [allMembersData, setAllMembersData] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [openProject, setOpenProject] = useState(null);

  // Selection state for granular task import
  const [selectedTasksForImport, setSelectedTasksForImport] = useState([]);

  // Custom Project Task logic
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('Unassigned');

  // Rich New Project Form State
  const [formData, setFormData] = useState({
    name: '',
    clientName: '',
    projectManager: '',
    assignedEmployees: [],
    category: 'Corporate Audit',
    budget: '',
    startDate: '',
    dueDate: '',
    priority: 'Medium',
    description: '',
    attachment: ''
  });

  // Fetch live team members, clients, and live projects from PostgreSQL
  const fetchLiveDbData = useCallback(async () => {
    try {
      const [memRes, projRes, clientRes] = await Promise.all([
        supabase.from('team_members').select('id, name, role, department, status').order('name', { ascending: true }),
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('id, name, trade_name').order('name', { ascending: true })
      ]);

      const currentUserName = localStorage.getItem('taxpro_user_name') || localStorage.getItem('taxpro_user_fullname') || 'Administrator';

      if (memRes.data) {
        setAllMembersData(memRes.data);
        const memberNames = memRes.data.map(m => m.name).filter(Boolean);
        const combined = Array.from(new Set([currentUserName, 'Administrator', ...memberNames]));
        setAvailableMembers(combined);
      } else {
        setAvailableMembers([currentUserName, 'Administrator']);
      }

      if (clientRes.data) {
        setClientsList(clientRes.data);
      }

      if (projRes.data) {
        const dbMapped = projRes.data.map(p => ({
          id: p.id,
          name: p.name,
          clientName: p.client_name || p.client_id || '',
          projectManager: p.manager || '',
          assignedEmployees: Array.isArray(p.team_assigned) ? p.team_assigned : [],
          category: p.category || 'General',
          budget: p.budget || '',
          description: p.description || '',
          startDate: p.start_date || '',
          dueDate: p.deadline || '',
          priority: p.priority || 'Medium',
          status: p.status || 'Active',
          tasks: Array.isArray(p.tasks) ? p.tasks : [],
          attachment: p.attachment || null
        }));

        setProjectsList(dbMapped);
        try {
          localStorage.setItem('taxpro_projects', JSON.stringify(dbMapped));
        } catch (e) {}

        // If a project is currently open in the drawer, refresh its state seamlessly
        setOpenProject(currentOpen => {
          if (!currentOpen) return null;
          const fresh = dbMapped.find(p => String(p.id) === String(currentOpen.id) || p.name === currentOpen.name);
          return fresh || currentOpen;
        });
      }
    } catch (e) {
      console.warn('[Projects DB Sync Note]:', e.message);
    }
  }, []);

  useEffect(() => {
    fetchLiveDbData();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setOpenProject(null);
        setSelectedTasksForImport([]);
      }
    };

    // Realtime Database Sync Listener
    const handleDbUpdate = () => {
      fetchLiveDbData();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('taxpro_db_updated', handleDbUpdate);
    window.addEventListener('ai_task_added', handleDbUpdate);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('taxpro_db_updated', handleDbUpdate);
      window.removeEventListener('ai_task_added', handleDbUpdate);
    };
  }, [fetchLiveDbData]);

  // Toggle Employee Selection for New Project
  const toggleEmployeeSelection = (memberName) => {
    setFormData(prev => {
      const exists = prev.assignedEmployees.includes(memberName);
      return {
        ...prev,
        assignedEmployees: exists
          ? prev.assignedEmployees.filter(m => m !== memberName)
          : [...prev.assignedEmployees, memberName]
      };
    });
  };

  // Create Project with Full Optional Details
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!formData.name) return;

    const newProjId = `PRJ-${Date.now()}`;
    const newProj = { 
      id: newProjId, 
      name: formData.name.trim(),
      clientName: formData.clientName.trim(),
      projectManager: formData.projectManager,
      assignedEmployees: formData.assignedEmployees,
      category: formData.category,
      budget: formData.budget,
      description: formData.description,
      startDate: formData.startDate,
      dueDate: formData.dueDate,
      priority: formData.priority,
      status: 'Active',
      tasks: [],
      attachment: formData.attachment || null
    };
    
    setProjectsList([newProj, ...projectsList]);
    setIsModalOpen(false);
    
    // Reset Form
    setFormData({
      name: '',
      clientName: '',
      projectManager: '',
      assignedEmployees: [],
      category: 'Corporate Audit',
      budget: '',
      startDate: '',
      dueDate: '',
      priority: 'Medium',
      description: '',
      attachment: ''
    });

    // Save to PostgreSQL projects table
    try {
      await supabase.from('projects').insert([{
        id: newProjId,
        name: newProj.name,
        client_name: newProj.clientName,
        manager: newProj.projectManager,
        team_assigned: newProj.assignedEmployees,
        category: newProj.category,
        budget: newProj.budget,
        description: newProj.description,
        start_date: newProj.startDate,
        deadline: newProj.dueDate,
        priority: newProj.priority,
        status: 'Active',
        tasks: [],
        attachment: newProj.attachment
      }]);
    } catch (err) {
      console.warn('[Project DB Insert Note]:', err.message);
    }

    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

    logAuditActivity({
      action: 'ADD_PROJECT',
      module: 'Projects',
      details: `Created new project "${newProj.name}" for client "${newProj.clientName || 'Practice General'}" (Manager: ${newProj.projectManager || 'Unassigned'})`,
      metadata: { project: newProj.name, client: newProj.clientName, manager: newProj.projectManager }
    });

    if (onShowToast) onShowToast(`✓ Project "${newProj.name}" created with assigned team!`, 'success');
  };

  // 2-Way Checkbox Synchronization: Toggling in Project updates both places!
  const toggleTaskStatus = async (projectId, taskId) => {
    let updatedTasks = [];
    let targetTask = null;

    setProjectsList(prevList => prevList.map(p => {
      if (p.id === projectId) {
        updatedTasks = p.tasks.map(t => {
          if (String(t.id) === String(taskId) || String(t.globalTaskId) === String(taskId)) {
            targetTask = { ...t, completed: !t.completed };
            return targetTask;
          }
          return t;
        });
        return {
          ...p,
          tasks: updatedTasks
        };
      }
      return p;
    }));

    if (openProject && (openProject.id === projectId || openProject.name === openProject.name)) {
      setOpenProject(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => {
          if (String(t.id) === String(taskId) || String(t.globalTaskId) === String(taskId)) {
            return { ...t, completed: !t.completed };
          }
          return t;
        })
      }));
    }

    try {
      await supabase.from('projects').update({ tasks: updatedTasks }).eq('id', String(projectId));
      
      // Update local storage
      const localProjects = JSON.parse(localStorage.getItem('taxpro_projects') || '[]');
      const updatedLocal = localProjects.map(p => p.id === projectId ? { ...p, tasks: updatedTasks } : p);
      localStorage.setItem('taxpro_projects', JSON.stringify(updatedLocal));

      // 2-Way Sync: Update global_tasks in database if task was linked or has matching title
      if (targetTask) {
        const nextStatus = targetTask.completed ? 'Completed' : 'Pending';
        if (targetTask.globalTaskId) {
          await supabase.from('global_tasks').update({ status: nextStatus }).eq('id', targetTask.globalTaskId);
        }
        if (targetTask.title) {
          await supabase.from('global_tasks').update({ status: nextStatus }).ilike('title', targetTask.title.trim());
        }

        logAuditActivity({
          action: 'UPDATE_TASK',
          module: 'Projects',
          details: `Toggled project checklist task "${targetTask.title}" to ${nextStatus} (Project: ${openProject?.name || projectId})`,
          metadata: { taskId, project: openProject?.name, completed: targetTask.completed }
        });
      }
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
  };

  // Add Task to Project (Kept within project until explicitly imported!)
  const handleCreateProjectTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !openProject) return;

    const projectTaskId = `PT-${Date.now()}`;
    const taskTitle = newTaskTitle.trim();
    const assigneeName = newTaskAssignee || 'Unassigned';

    const newTask = {
      id: projectTaskId,
      title: taskTitle,
      assignee: assigneeName,
      createdAt: new Date().toLocaleDateString(),
      completed: false,
      importedToTasks: false
    };

    const updatedTasks = [...(openProject.tasks || []), newTask];

    setProjectsList(prevList => prevList.map(p => {
      if (p.id === openProject.id) {
        return { ...p, tasks: updatedTasks };
      }
      return p;
    }));

    setOpenProject(prev => ({
      ...prev,
      tasks: updatedTasks
    }));

    setNewTaskTitle('');

    // Persist to PostgreSQL projects table
    try {
      await supabase.from('projects').update({ tasks: updatedTasks }).eq('id', String(openProject.id));
    } catch (err) {
      console.warn('[Project Update Note]:', err.message);
    }

    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
    if (onShowToast) onShowToast(`✓ Added task to checklist. Select checkbox to import when ready.`, 'info');
  };

  // Import a single task from project into the Global Tasks board
  const handleImportSingleTask = async (task) => {
    if (!openProject) return;

    const globalTaskId = task.globalTaskId || `TSK-${Math.floor(100 + Math.random() * 900)}`;
    const dueDate = openProject.dueDate || openProject.deadline || new Date().toISOString().slice(0, 10);
    const clientName = openProject.clientName || openProject.name;

    // 1. Insert/Upsert into PostgreSQL global_tasks
    try {
      await supabase.from('global_tasks').upsert([{
        id: globalTaskId,
        title: task.title,
        client: clientName,
        category: 'Project Task',
        due_date: dueDate,
        status: task.completed ? 'Completed' : 'Pending',
        priority: openProject.priority || 'Medium',
        assignee: task.assignee || 'Unassigned',
        project: openProject.name,
        attachment: null
      }]);
    } catch (err) {
      console.warn('[Import Single Task Note]:', err.message);
    }

    // 2. Mark task as imported inside openProject.tasks
    const updatedTasks = openProject.tasks.map(t => {
      if (t.id === task.id) {
        return { ...t, importedToTasks: true, globalTaskId };
      }
      return t;
    });

    setProjectsList(prev => prev.map(p => p.id === openProject.id ? { ...p, tasks: updatedTasks } : p));
    setOpenProject(prev => ({ ...prev, tasks: updatedTasks }));
    setSelectedTasksForImport(prev => prev.filter(id => id !== task.id));

    try {
      await supabase.from('projects').update({ tasks: updatedTasks }).eq('id', String(openProject.id));
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('ai_task_added'));
    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

    if (onShowToast) onShowToast(`✓ Task "${task.title}" imported into Tasks module!`, 'success');
  };

  // Granular Import Selected Tasks
  const handleImportSelectedTasks = async () => {
    if (!openProject || selectedTasksForImport.length === 0) return;

    const dueDate = openProject.dueDate || openProject.deadline || new Date().toISOString().slice(0, 10);
    const clientName = openProject.clientName || openProject.name;

    const globalPayload = [];
    const updatedTasks = openProject.tasks.map(t => {
      if (selectedTasksForImport.includes(t.id)) {
        const globalTaskId = t.globalTaskId || `TSK-${Math.floor(100 + Math.random() * 900)}`;
        globalPayload.push({
          id: globalTaskId,
          title: t.title,
          client: clientName,
          category: 'Project Task',
          due_date: dueDate,
          status: t.completed ? 'Completed' : 'Pending',
          priority: openProject.priority || 'Medium',
          assignee: t.assignee || 'Unassigned',
          project: openProject.name,
          attachment: null
        });
        return { ...t, importedToTasks: true, globalTaskId };
      }
      return t;
    });

    try {
      await supabase.from('global_tasks').upsert(globalPayload);
      await supabase.from('projects').update({ tasks: updatedTasks }).eq('id', String(openProject.id));
    } catch (err) {
      console.warn('[Import Selected Tasks Note]:', err.message);
    }

    setProjectsList(prev => prev.map(p => p.id === openProject.id ? { ...p, tasks: updatedTasks } : p));
    setOpenProject(prev => ({ ...prev, tasks: updatedTasks }));
    setSelectedTasksForImport([]);

    window.dispatchEvent(new CustomEvent('ai_task_added'));
    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

    if (onShowToast) onShowToast(`✓ Successfully imported ${globalPayload.length} selected tasks into Tasks!`, 'success');
  };

  const handleDownloadTasks = () => {
    if (!openProject) return;
    const csvRows = ['Task Description,Assignee,Status,Imported to Global,Created At'];
    openProject.tasks.forEach(t => {
      csvRows.push(`"${t.title}","${t.assignee}","${t.completed ? 'Completed' : 'Pending'}","${t.importedToTasks ? 'Yes' : 'No'}","${t.createdAt}"`);
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${openProject.name.replace(/\s+/g, '_')}_Tasks.csv`;
    link.click();
    if (onShowToast) onShowToast(`Downloaded tasks for ${openProject.name}`, 'success');
  };

  const getFilteredProjects = () => {
    let filtered = projectsList;
    if (activeFilter !== 'All') {
      filtered = filtered.filter(p => p.status === activeFilter);
    }
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.clientName && p.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.projectManager && p.projectManager.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    return filtered;
  };
  
  const filteredProjects = getFilteredProjects();

  const getFilterCounts = () => {
    const counts = { All: projectsList.length, Active: 0, 'On hold': 0, Completed: 0, Archived: 0 };
    projectsList.forEach(p => {
      if (counts[p.status] !== undefined) {
        counts[p.status]++;
      }
    });
    return counts;
  };
  const filterCounts = getFilterCounts();

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen text-gray-800 relative pb-24 flex items-center justify-center flex-col">
      
      {projectsList.length === 0 ? (
        <div className="max-w-2xl w-full flex flex-col items-center text-center mt-10">
          
          <div className="w-24 h-24 rounded-full bg-indigo-50 border-[6px] border-white shadow-sm flex items-center justify-center mb-6">
            <FolderKanban className="w-10 h-10 text-indigo-600" />
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 font-outfit mb-3">Group your tasks with Projects</h1>
          <p className="text-base text-gray-500 max-w-lg mb-10 leading-relaxed font-medium">
            Bundle related tasks, assign designated managers and employees, and optionally import project deliverables into the global Tasks register.
          </p>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 w-full max-w-md text-left mb-10">
            <div className="flex flex-col gap-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm">
                  1
                </div>
                <div className="pt-1">
                  <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-500" /> Create project with team & client
                  </h3>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm">
                  2
                </div>
                <div className="pt-1">
                  <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500" /> Add subtasks & Selectively Import
                  </h3>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm">
                  3
                </div>
                <div className="pt-1">
                  <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-500" /> 2-Way Checkbox Live Sync
                  </h3>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => {
              if (!requireFirmSetup(onShowToast)) return;
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-8 py-3.5 bg-[#0f766e] hover:bg-teal-800 text-white font-extrabold text-sm rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Create your first project
          </button>

        </div>
      ) : (
        <div className="w-full max-w-7xl h-full flex flex-col pt-4">
          
          {/* Top Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white/50 backdrop-blur-md rounded-t-2xl gap-4">
            <div className="flex items-center gap-3">
              <FolderKanban className="w-6 h-6 text-emerald-600" />
              <h1 className="text-xl font-bold text-gray-900 font-outfit">Projects</h1>
              <span className="px-2 py-0.5 rounded-full bg-gray-200 text-xs font-bold text-gray-700">{filterCounts.All}</span>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search project, manager, client..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm w-full outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <button 
                onClick={() => {
                  if (!requireFirmSetup(onShowToast)) return;
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#0f766e] text-white rounded-xl text-sm font-bold shadow-sm hover:shadow-md hover:bg-teal-800 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> New Project
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 px-4 py-3 bg-white/50 flex-wrap pb-6">
            {['All', 'Active', 'On hold', 'Completed', 'Archived'].map(filter => {
              const isActive = activeFilter === filter;
              const count = filterCounts[filter] || 0;
              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold transition-all cursor-pointer ${
                    isActive 
                      ? 'border-emerald-500 bg-white text-emerald-700 shadow-sm' 
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {filter !== 'All' && isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  {filter !== 'All' && !isActive && <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />}
                  {filter}
                  <span className="text-gray-400 font-bold ml-1">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-4 w-full">
            {filteredProjects.map((p) => {
              const completedTasks = p.tasks.filter(t => t.completed).length;
              const totalTasks = p.tasks.length;
              const progressPct = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

              return (
                <div 
                  key={p.id} 
                  onClick={() => {
                    setOpenProject(p);
                    setSelectedTasksForImport([]);
                  }}
                  className="bg-white border text-left border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col p-5 cursor-pointer hover:border-emerald-300 group"
                >
                  {/* Status Indicator */}
                  {p.status === 'Active' && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500" />
                  )}

                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${p.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider ${p.status === 'Active' ? 'text-emerald-600' : 'text-gray-500'}`}>
                        {p.status}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-bold">
                      {p.priority || 'Medium'}
                    </span>
                  </div>

                  {/* Title & Client / Category */}
                  <h3 className="font-extrabold text-gray-900 text-base leading-tight mb-1 group-hover:text-emerald-700 transition-colors">
                    {p.name}
                  </h3>
                  
                  {p.clientName && (
                    <div className="flex items-center gap-1 text-[11px] text-gray-600 font-semibold mb-1">
                      <Building2 className="w-3 h-3 text-gray-400" />
                      <span className="truncate">{p.clientName}</span>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mb-4 line-clamp-2">{p.description || 'No description provided.'}</p>

                  {/* Manager & Team Badge */}
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 mb-4 flex flex-col gap-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Manager:</span>
                      <span className="font-bold text-gray-800 flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-indigo-600" /> {p.projectManager || 'Unassigned'}
                      </span>
                    </div>
                    {p.assignedEmployees && p.assignedEmployees.length > 0 && (
                      <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
                        <span className="text-gray-500 font-medium">Team:</span>
                        <span className="font-bold text-gray-700 truncate max-w-[140px]">
                          {p.assignedEmployees.join(', ')}
                        </span>
                      </div>
                    )}
                    {p.budget && (
                      <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
                        <span className="text-gray-500 font-medium">Budget:</span>
                        <span className="font-bold text-emerald-700">{p.budget}</span>
                      </div>
                    )}
                  </div>

                  {/* Progress info */}
                  <div className="mt-auto">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-black text-gray-900 font-outfit">{progressPct}%</span>
                      <div className="flex items-center gap-1 text-xs font-bold text-gray-500">
                        <Check className="w-3.5 h-3.5 text-emerald-500" /> {completedTasks} / {totalTasks} Tasks
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mb-3 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-500 font-semibold pt-2 border-t border-gray-100">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {p.dueDate || 'No due date'}
                      </span>
                      <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                        Open Tasks <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          {filteredProjects.length === 0 && (
            <div className="py-20 text-center text-gray-500 font-bold text-sm">
              No projects found for the current search/filters.
            </div>
          )}
        </div>
      )}

      {/* CREATE NEW PROJECT MODAL */}
      {isModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
          className="modal-overlay-backdrop"
        >
          <div className="modal-content-box max-w-3xl">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-xs">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-white tracking-tight">
                    Create New Project
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Assign managers, select employees, link clients, and set deliverable milestones
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer shadow-xs"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 scrollbar-thin max-h-[75vh]">
              <form id="project-form" onSubmit={handleCreateProject} className="flex flex-col gap-5 text-xs font-semibold">
                
                {/* 1. Basic Project Identity */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                  <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-600" /> Project Core Info
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-gray-700 block mb-1">Project Title <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        required
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        placeholder="e.g. Q1 Corporate Tax Audit & Filing" 
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl outline-none focus:border-indigo-500 text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-gray-700 block mb-1">Client Association (Optional)</label>
                      <select
                        value={formData.clientName}
                        onChange={e => setFormData({...formData, clientName: e.target.value})}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl outline-none focus:border-indigo-500 text-xs cursor-pointer"
                      >
                        <option value="">-- No Client (Internal Practice) --</option>
                        {clientsList.map(c => (
                          <option key={c.id} value={c.name}>{c.name} {c.trade_name ? `(${c.trade_name})` : ''}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-gray-700 block mb-1">Department / Domain</label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl outline-none focus:border-indigo-500 text-xs cursor-pointer"
                      >
                        <option value="Corporate Audit">Corporate Audit</option>
                        <option value="Taxation & Filing">Taxation & Filing</option>
                        <option value="Financial Planning">Financial Planning</option>
                        <option value="Advisory & Legal">Advisory & Legal</option>
                        <option value="GST Compliance">GST Compliance</option>
                        <option value="MCA & Company Law">MCA & Company Law</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-gray-700 block mb-1">Priority Level</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {['Low', 'Medium', 'High', 'Urgent'].map(prio => (
                          <button
                            key={prio}
                            type="button"
                            onClick={() => setFormData({...formData, priority: prio})}
                            className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              formData.priority === prio 
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-500 shadow-2xs' 
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {prio}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Manager & Employee Allocation */}
                <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-4 flex flex-col gap-3">
                  <h4 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-indigo-600" /> Team & Personnel Allocation (Optional)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-gray-700 block mb-1">Designated Project Manager / Lead</label>
                      <select
                        value={formData.projectManager}
                        onChange={e => setFormData({...formData, projectManager: e.target.value})}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl outline-none focus:border-indigo-500 text-xs cursor-pointer"
                      >
                        <option value="">-- Select Manager --</option>
                        {allMembersData.map(m => (
                          <option key={m.id} value={m.name}>{m.name} ({m.role || 'Member'})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-gray-700 block mb-1">Estimated Budget / Fee</label>
                      <input 
                        type="text" 
                        value={formData.budget}
                        onChange={e => setFormData({...formData, budget: e.target.value})}
                        placeholder="e.g. ₹1,50,000" 
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl outline-none focus:border-indigo-500 text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-700 block mb-1.5">
                      Assign Specific Team Members / Employees: ({formData.assignedEmployees.length} selected)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2 bg-white border border-gray-200 rounded-xl scrollbar-thin">
                      {allMembersData.map(member => {
                        const isSelected = formData.assignedEmployees.includes(member.name);
                        return (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => toggleEmployeeSelection(member.name)}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-left text-[11px] transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-800 font-bold shadow-2xs' 
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            <User className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-gray-400'}`} />
                            <div className="truncate">
                              <span className="block truncate leading-tight">{member.name}</span>
                              <span className="text-[9px] text-gray-400 font-normal">{member.role || 'Employee'}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 3. Timeline, Scope & Attachments */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-gray-700 block mb-1">Start Date</label>
                        <input 
                          type="date" 
                          value={formData.startDate}
                          onChange={e => setFormData({...formData, startDate: e.target.value})}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl outline-none focus:border-indigo-500 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-gray-700 block mb-1">Due Date</label>
                        <input 
                          type="date" 
                          value={formData.dueDate}
                          onChange={e => setFormData({...formData, dueDate: e.target.value})}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl outline-none focus:border-indigo-500 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-gray-700 block mb-1">Attach Project Brief / File</label>
                      <div className="border border-dashed border-gray-300 rounded-xl p-2.5 bg-white hover:bg-gray-50 transition-colors">
                        <input 
                          type="file" 
                          onChange={e => {
                             const file = e.target.files[0];
                             if (file) setFormData({...formData, attachment: file.name});
                          }}
                          className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" 
                        />
                        {formData.attachment && (
                          <p className="text-[10px] text-emerald-700 font-bold mt-1">
                            ✓ Attached: {formData.attachment}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-700 block mb-1">Scope & Key Deliverables</label>
                    <textarea 
                      rows={4}
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      placeholder="Enter project milestones, scope of work, and review points..." 
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl outline-none focus:border-indigo-500 min-h-[110px] text-xs resize-none"
                    />
                  </div>
                </div>

              </form>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex justify-end items-center gap-3">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                form="project-form" 
                type="submit" 
                className="px-6 py-2.5 bg-[#0f766e] hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-700/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                Create Project
              </button>
            </div>

          </div>
        </div>
      )}

      {/* OPEN PROJECT TASKS MODAL & SELECTIVE IMPORT DRAWER */}
      {openProject && (
        <div 
          className="modal-overlay-backdrop" 
          onClick={() => {
            setOpenProject(null);
            setSelectedTasksForImport([]);
          }}
        >
          <div 
            className="modal-content-box max-w-2xl max-h-[92vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-emerald-50/60 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900 font-outfit">{openProject.name}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest bg-emerald-100 px-2 py-0.5 rounded">
                    {openProject.status} PROJECT
                  </span>
                  {openProject.projectManager && (
                    <span className="text-[10px] font-semibold text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded">
                      👔 Lead: <b>{openProject.projectManager}</b>
                    </span>
                  )}
                  {openProject.clientName && (
                    <span className="text-[10px] font-semibold text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded">
                      🏢 Client: <b>{openProject.clientName}</b>
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleDownloadTasks}
                  className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-xl transition-colors bg-white border border-gray-200 flex items-center gap-1 px-2.5 text-xs font-bold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button 
                  onClick={() => window.print()}
                  className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-xl transition-colors bg-white border border-gray-200 flex items-center gap-1 px-2.5 text-xs font-bold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button 
                  onClick={() => {
                    setOpenProject(null);
                    setSelectedTasksForImport([]);
                  }} 
                  className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 flex flex-col gap-6 scrollbar-thin">
              
              {/* To-Do Section Header with Granular Selection Controls */}
              <div>
                <div className="flex items-center justify-between mb-3 bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">
                      To Do Tasks ({openProject.tasks.filter(t => !t.completed).length})
                    </span>
                    {openProject.tasks.filter(t => !t.completed && !t.importedToTasks).length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const unimported = openProject.tasks.filter(t => !t.completed && !t.importedToTasks).map(t => t.id);
                          if (selectedTasksForImport.length === unimported.length) {
                            setSelectedTasksForImport([]);
                          } else {
                            setSelectedTasksForImport(unimported);
                          }
                        }}
                        className="text-teal-700 hover:text-teal-800 text-[11px] font-bold ml-2 underline cursor-pointer"
                      >
                        {selectedTasksForImport.length === openProject.tasks.filter(t => !t.completed && !t.importedToTasks).length ? 'Deselect All' : 'Select All to Import'}
                      </button>
                    )}
                  </div>

                  {selectedTasksForImport.length > 0 && (
                    <button
                      type="button"
                      onClick={handleImportSelectedTasks}
                      className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer animate-pulse"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                      Import Selected ({selectedTasksForImport.length})
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-2.5">
                  {openProject.tasks.filter(t => !t.completed).map(task => {
                    const isSelected = selectedTasksForImport.includes(task.id);
                    return (
                      <div 
                        key={task.id} 
                        className={`flex items-center justify-between gap-3 p-3.5 bg-white border rounded-xl hover:shadow-xs transition-all ${
                          isSelected ? 'border-teal-500 bg-teal-50/30' : 'border-gray-200'
                        }`}
                      >
                        {/* Task checkbox & title */}
                        <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                          <input 
                            type="checkbox" 
                            checked={false} 
                            onChange={() => toggleTaskStatus(openProject.id, task.id)}
                            className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            title="Mark task completed"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-gray-800 truncate">{task.title}</span>
                            <span className="text-[10px] text-gray-400 font-medium">Assignee: {task.assignee}</span>
                          </div>
                        </label>

                        {/* Import selection option or badge */}
                        <div className="flex items-center gap-2 shrink-0">
                          {task.importedToTasks ? (
                            <span className="px-2 py-1 rounded bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold flex items-center gap-1">
                              <CheckCheck className="w-3 h-3" /> In Tasks
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-1 text-[11px] text-gray-600 font-medium cursor-pointer bg-gray-50 hover:bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    setSelectedTasksForImport(prev => 
                                      prev.includes(task.id) ? prev.filter(id => id !== task.id) : [...prev, task.id]
                                    );
                                  }}
                                  className="w-3.5 h-3.5 rounded text-teal-600 border-gray-300 focus:ring-teal-500 cursor-pointer"
                                />
                                <span className="text-[10px]">Select</span>
                              </label>

                              <button
                                type="button"
                                onClick={() => handleImportSingleTask(task)}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Import this single task into the Tasks register"
                              >
                                <ArrowDownToLine className="w-3 h-3" /> Import
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {openProject.tasks.filter(t => !t.completed).length === 0 && (
                    <div className="p-6 text-center flex flex-col justify-center items-center h-28 border-2 border-dashed border-gray-200 rounded-xl bg-white/60">
                      <p className="text-xs font-bold text-gray-400">All tasks completed! No pending items.</p>
                    </div>
                  )}
                </div>
                
                {/* Dynamically Add Task inline form */}
                <form onSubmit={handleCreateProjectTask} className="mt-3 flex gap-2 w-full bg-white p-2 rounded-xl border border-gray-200 shadow-2xs">
                  <input 
                    type="text" 
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    placeholder="Add task to project checklist..."
                    className="flex-1 px-3 py-2 text-xs outline-none bg-transparent font-semibold text-gray-800"
                  />
                  <select 
                    value={newTaskAssignee}
                    onChange={e => setNewTaskAssignee(e.target.value)}
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none bg-gray-50 text-gray-700 font-bold max-w-[150px] truncate cursor-pointer"
                  >
                    <option value="Unassigned">-- Assignee --</option>
                    <option value={localStorage.getItem('taxpro_user_name') || 'Administrator'}>
                      ⚡ {localStorage.getItem('taxpro_user_name') || 'Administrator'} (Myself)
                    </option>
                    {availableMembers.filter(m => m !== (localStorage.getItem('taxpro_user_name') || 'Administrator')).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <button 
                    type="submit" 
                    disabled={!newTaskTitle.trim()} 
                    className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </form>
              </div>

              {/* Completed Tasks */}
              <div>
                <h3 className="text-xs font-extrabold text-gray-600 uppercase tracking-widest mb-3 flex items-center justify-between">
                  <span>Completed Tasks</span>
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    {openProject.tasks.filter(t => t.completed).length}
                  </span>
                </h3>

                <div className="flex flex-col gap-2">
                  {openProject.tasks.filter(t => t.completed).map(task => (
                    <div 
                      key={task.id} 
                      className="flex items-center justify-between gap-3 p-3 bg-white/70 border border-gray-100 rounded-xl opacity-75 hover:opacity-100 transition-opacity"
                    >
                      <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                        <input 
                          type="checkbox" 
                          checked={true}
                          onChange={() => toggleTaskStatus(openProject.id, task.id)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium text-gray-500 line-through truncate">{task.title}</span>
                          <span className="text-[10px] text-gray-400">{task.assignee}</span>
                        </div>
                      </label>

                      {task.importedToTasks && (
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500 text-[9px] font-bold shrink-0">
                          Synced
                        </span>
                      )}
                    </div>
                  ))}

                  {openProject.tasks.filter(t => t.completed).length === 0 && (
                    <div className="p-4 text-center text-xs font-bold text-gray-400 border border-dashed border-gray-200 rounded-xl h-20 flex items-center justify-center bg-white/40">
                      No tasks completed yet.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* HIDDEN PRINT TEMPLATE */}
      {openProject && (
        <div id="project-print-view" className="hidden">
          <div className="p-8 font-sans text-black bg-white w-full">
            <div className="border-b-2 border-black pb-4 mb-6">
              <h1 className="text-3xl font-black">{openProject.name} (Project Dossier)</h1>
              <p className="text-sm font-bold mt-2">
                Status: {openProject.status.toUpperCase()} | Manager: {openProject.projectManager || 'N/A'} | Client: {openProject.clientName || 'N/A'} | Due: {openProject.dueDate || 'Indefinite'}
              </p>
            </div>
            
            <h2 className="text-xl font-bold mb-4">Project Tasks Register</h2>
            <table className="w-full text-left text-sm border-collapse border border-gray-400">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-400 p-2 font-bold w-2/4">Task Description</th>
                  <th className="border border-gray-400 p-2 font-bold w-1/4">Assignee</th>
                  <th className="border border-gray-400 p-2 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {openProject.tasks.length === 0 ? (
                  <tr><td colSpan="3" className="border border-gray-400 p-4 text-center italic">No tasks created yet.</td></tr>
                ) : (
                  openProject.tasks.map(t => (
                    <tr key={t.id}>
                      <td className="border border-gray-400 p-2">{t.title}</td>
                      <td className="border border-gray-400 p-2">{t.assignee}</td>
                      <td className="border border-gray-400 p-2">{t.completed ? 'Completed' : 'Pending'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            <div className="mt-8 text-xs text-gray-500">
              Generated by TaxPro PMS on {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #project-print-view, #project-print-view * { visibility: visible; }
          #project-print-view { 
            display: block !important;
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100vw;
            min-height: 100vh;
            background: white;
          }
          @page { margin: 1cm; size: auto; }
          html, body { overflow: visible; background-color: white !important; }
        }
      `}} />

    </div>
  );
}
