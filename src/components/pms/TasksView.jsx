import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calendar, CheckCircle2, Clock, AlertCircle, User, MoreVertical, X, Paperclip } from 'lucide-react';
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-gray-200 shadow-2xl relative">
            <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-lg font-bold font-outfit text-gray-900 mb-4">Create New Task</h3>
            <form onSubmit={handleAddTask} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Task Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. GSTR-3B Return Filing"
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Client Name</label>
                <select 
                  value={newTask.client}
                  onChange={e => setNewTask({...newTask, client: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-indigo-500 bg-white"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-indigo-500 bg-white"
                >
                  <option value="">-- No Project (Standalone) --</option>
                  <option value="Q1 Marketing rollout">Q1 Marketing rollout</option>
                  <option value="GST Audit 2026-27">GST Audit 2026-27</option>
                  <option value="Compliance Catchup">Compliance Catchup</option>
                  <option value="Client Onboarding">Client Onboarding</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Category</label>
                  <select 
                    value={newTask.category}
                    onChange={e => setNewTask({...newTask, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-indigo-500"
                  >
                    <option value="GST">GST</option>
                    <option value="Income Tax">Income Tax</option>
                    <option value="MCA">MCA</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Due Date</label>
                  <input 
                    type="date"
                    value={newTask.dueDate}
                    onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <label className="font-extrabold text-sm text-gray-900 block mb-3 text-center">Assign Team Member</label>
                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto overflow-y-auto max-h-48 p-1">
                  {teamMembers.length > 0 ? teamMembers.map(member => (
                    <button
                      key={member}
                      type="button"
                      onClick={() => setNewTask({...newTask, assignee: member})}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                        newTask.assignee === member 
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm ring-1 ring-indigo-500' 
                          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <User className={`w-5 h-5 ${newTask.assignee === member ? 'text-indigo-600' : 'text-gray-400'}`} />
                      <span className="text-[10px] font-bold text-center leading-tight truncate w-full">{member}</span>
                    </button>
                  )) : (
                    <div className="col-span-2 text-center text-xs text-gray-400 font-bold py-4">No team members available.</div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <label className="flex items-center gap-1.5 px-4 py-2 hover:bg-gray-100 border border-dashed border-gray-300 rounded-xl text-gray-600 transition-colors cursor-pointer justify-center">
                  <Paperclip className="w-4 h-4" /> 
                  <span className="text-xs font-bold truncate max-w-[200px]">
                    {newTask.attachment ? newTask.attachment : 'Attach File (Optional)'}
                  </span>
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={e => {
                       const file = e.target.files[0];
                       if (file) setNewTask({...newTask, attachment: file.name});
                    }}
                  />
                </label>
              </div>

              <div className="mt-2 text-right">
                <button type="submit" className="px-6 py-2.5 rounded-xl bg-[#5b52e0] hover:bg-[#4c44cf] text-white font-bold text-sm shadow-md transition-colors w-full">
                  Save New Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
