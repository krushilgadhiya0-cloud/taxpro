import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calendar, CheckCircle2, Clock, AlertCircle, User, MoreVertical, X, Paperclip, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function TasksView({ onShowToast }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    const [tasksRes, clientsRes, membersRes] = await Promise.all([
      supabase.from('global_tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('name').order('created_at', { ascending: false }),
      supabase.from('team_members').select('name')
    ]);

    if (!tasksRes.error && tasksRes.data) {
       const mapped = tasksRes.data.map(t => ({
         ...t,
         dueDate: t.due_date
       }));
       setTasks(mapped);
    }
    
    if (!clientsRes.error && clientsRes.data) {
       setClients(clientsRes.data);
    }

    if (!membersRes.error && membersRes.data) {
       // Filter empty names and make a clean array
       const names = membersRes.data.map(m => m.name).filter(n => n && n.trim() !== '');
       setTeamMembers(names);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
    
    // Live Voice AI Listener
    const handleAIUpdate = () => {
       fetchData();
       if (onShowToast) onShowToast('Task table dynamically synced with Voice Engine.', 'info');
    };
    const handleOpenAddTask = () => setIsAddModalOpen(true);
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsAddModalOpen(false);
    };

    window.addEventListener('ai_task_added', handleAIUpdate);
    window.addEventListener('ai_open_add_task', handleOpenAddTask);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('ai_task_added', handleAIUpdate);
      window.removeEventListener('ai_open_add_task', handleOpenAddTask);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const [newTask, setNewTask] = useState({
    title: '',
    client: '',
    category: 'GST',
    dueDate: '',
    priority: 'Medium',
    assignee: 'Krushil Gadhiya',
    project: ''
  });

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.title || !newTask.client) return;

    const taskId = `TSK-${Math.floor(100 + Math.random() * 900)}`;
    const finalDueDate = newTask.dueDate || '2026-08-15';
    const finalAssignee = newTask.assignee || 'Krushil Gadhiya';
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
    setNewTask({ title: '', client: '', category: 'GST', dueDate: '', priority: 'Medium', assignee: 'Krushil Gadhiya', project: '' });
    onShowToast && onShowToast('✓ New task safely persisted in cloud database!', 'success');
  };

  const toggleStatus = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const nextStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    
    const { error } = await supabase.from('global_tasks').update({ status: nextStatus }).eq('id', id);
    if (error) {
       if (onShowToast) onShowToast(`Failed to update status: ${error.message}`, 'error');
       return;
    }

    setTasks(tasks.map(t => {
      if (t.id === id) {
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  const filteredTasks = tasks.filter(t => {
    let matchesFilter = false;
    if (activeFilter === 'All') matchesFilter = true;
    else if (activeFilter === 'My Tasks') matchesFilter = t.assignee.includes('Krushil');
    else matchesFilter = t.status === activeFilter || t.category === activeFilter;

    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f3f4f6] min-h-screen text-gray-800">
      
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold font-outfit text-[#1e1e2d]">Task Management</h1>
          <p className="text-xs text-gray-500 mt-1">Track, assign, and manage all firm compliance and client tasks.</p>
        </div>

        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5b52e0] hover:bg-[#4c44cf] text-white text-xs font-bold shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Task</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Status Filter Chips */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {['All', 'My Tasks', 'Pending', 'In Progress', 'Completed', 'Overdue', 'GST', 'Income Tax', 'MCA'].map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeFilter === f 
                  ? 'bg-[#5b52e0] text-white shadow-xs' 
                  : (f === 'My Tasks') ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search tasks or clients..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:bg-white focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-wider">
                <th className="p-4">Task Details</th>
                <th className="p-4">Client Name</th>
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
                        <span>{t.title}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{t.id} • {t.priority} Priority</span>
                        {t.attachment && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 max-w-fit cursor-pointer hover:bg-indigo-100" onClick={() => onShowToast && onShowToast(`Initializing secure download for ${t.attachment}...`, 'info')}>
                            <Paperclip className="w-3 h-3" /> <span className="truncate max-w-[120px] font-bold">{t.attachment}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 font-medium">{t.client}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200">
                        {t.category}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 font-mono">{t.dueDate}</td>
                    <td className="p-4 text-gray-600 font-medium">{t.assignee}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                        t.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                        t.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                        t.status === 'Overdue' ? 'bg-red-50 text-red-600 border border-red-200' :
                        'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      }`}>
                        {t.status === 'Completed' && <CheckCircle2 className="w-3 h-3" />}
                        {t.status === 'In Progress' && <Clock className="w-3 h-3" />}
                        {t.status === 'Overdue' && <AlertCircle className="w-3 h-3" />}
                        {t.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => toggleStatus(t.id)}
                        className="px-3 py-1 rounded-lg text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100"
                      >
                        {t.status === 'Completed' ? 'Mark Pending' : 'Mark Done'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Task Modal */}
      {isAddModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddModalOpen(false); }}
          className="modal-overlay-backdrop"
        >
          <div className="modal-content-box max-w-3xl">
            
            {/* Premium Gradient Header */}
            <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-xs">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-white tracking-tight">
                    Create New Task
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Assign a workflow deliverable to client, project, and team member
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer shadow-xs"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2-Column Responsive Form Body */}
            <form onSubmit={handleAddTask} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold scrollbar-thin">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Column 1: Task Details & Scope */}
                <div className="flex flex-col gap-3.5">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Task Title <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      placeholder="e.g. GSTR-3B Return Filing"
                      value={newTask.title}
                      onChange={e => setNewTask({...newTask, title: e.target.value})}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Client Name <span className="text-red-500">*</span></label>
                    <select 
                      value={newTask.client}
                      onChange={e => setNewTask({...newTask, client: e.target.value})}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 text-xs cursor-pointer"
                      required
                    >
                      <option value="">-- Select Client --</option>
                      {clients.map((c, idx) => (
                        <option key={idx} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Assign to Project (Optional)</label>
                    <select 
                      value={newTask.project}
                      onChange={e => setNewTask({...newTask, project: e.target.value})}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 text-xs cursor-pointer"
                    >
                      <option value="">-- No Project (Standalone) --</option>
                      <option value="Q1 Marketing rollout">Q1 Marketing rollout</option>
                      <option value="GST Audit 2026-27">GST Audit 2026-27</option>
                      <option value="Compliance Catchup">Compliance Catchup</option>
                      <option value="Client Onboarding">Client Onboarding</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-gray-700 block mb-1">Category</label>
                      <select 
                        value={newTask.category}
                        onChange={e => setNewTask({...newTask, category: e.target.value})}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 text-xs cursor-pointer"
                      >
                        <option value="GST">GST</option>
                        <option value="Income Tax">Income Tax</option>
                        <option value="MCA">MCA</option>
                        <option value="Audit">Audit</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-gray-700 block mb-1">Due Date</label>
                      <input 
                        type="date"
                        value={newTask.dueDate}
                        onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Column 2: Assignment & Attachments */}
                <div className="flex flex-col gap-3.5">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Assign Team Member</label>
                    <div className="grid grid-cols-2 gap-2 bg-gray-50 border border-gray-300 rounded-xl p-2.5 max-h-48 overflow-y-auto scrollbar-thin">
                      {teamMembers.length > 0 ? teamMembers.map(member => (
                        <button
                          key={member}
                          type="button"
                          onClick={() => setNewTask({...newTask, assignee: member})}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                            newTask.assignee === member 
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs font-bold' 
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <User className={`w-3.5 h-3.5 shrink-0 ${newTask.assignee === member ? 'text-indigo-600' : 'text-gray-400'}`} />
                          <span className="text-[11px] truncate leading-tight">{member}</span>
                        </button>
                      )) : (
                        <div className="col-span-2 text-center text-xs text-gray-400 py-3">No team members available.</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Attachment (Optional)</label>
                    <div className="border border-dashed border-gray-300 rounded-xl p-3 bg-gray-50 hover:bg-gray-100/80 transition-colors">
                      <input 
                        type="file" 
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) setNewTask({...newTask, attachment: file.name});
                        }} 
                        className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" 
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
              <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 mt-3 -mx-6 -mb-6">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-[#0f766e] hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-700/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
